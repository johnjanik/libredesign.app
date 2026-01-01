/**
 * WebSocket Adapter
 *
 * Manages WebSocket connection with automatic reconnection
 * and message handling.
 */
import { EventEmitter } from '@core/events/event-emitter';
import { serializeMessage, deserializeMessage } from './message-types';
const DEFAULT_CONFIG = {
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    pingInterval: 30000,
    connectionTimeout: 10000,
};
/**
 * WebSocket adapter for collaboration
 */
export class WebSocketAdapter extends EventEmitter {
    config;
    socket = null;
    state = 'disconnected';
    reconnectAttempts = 0;
    reconnectTimer = null;
    pingTimer = null;
    connectionTimer = null;
    messageQueue = [];
    constructor(config) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Get current connection state.
     */
    getState() {
        return this.state;
    }
    /**
     * Check if connected.
     */
    isConnected() {
        return this.state === 'connected' && this.socket?.readyState === WebSocket.OPEN;
    }
    /**
     * Connect to the server.
     */
    connect() {
        if (this.state === 'connected' || this.state === 'connecting') {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            this.state = 'connecting';
            try {
                this.socket = new WebSocket(this.config.url);
                this.setupSocketHandlers(this.socket, resolve, reject);
                // Set connection timeout
                this.connectionTimer = setTimeout(() => {
                    if (this.state === 'connecting') {
                        this.socket?.close();
                        reject(new Error('Connection timeout'));
                    }
                }, this.config.connectionTimeout);
            }
            catch (error) {
                this.state = 'disconnected';
                reject(error);
            }
        });
    }
    /**
     * Disconnect from the server.
     */
    disconnect() {
        this.clearTimers();
        this.reconnectAttempts = 0;
        if (this.socket) {
            this.socket.close(1000, 'Client disconnect');
            this.socket = null;
        }
        this.state = 'disconnected';
    }
    /**
     * Send a message.
     */
    send(message) {
        if (this.isConnected()) {
            this.socket.send(serializeMessage(message));
        }
        else {
            // Queue message for later
            this.messageQueue.push(message);
        }
    }
    /**
     * Setup WebSocket event handlers.
     */
    setupSocketHandlers(socket, onConnect, onError) {
        socket.onopen = () => {
            this.clearTimers();
            this.state = 'connected';
            this.reconnectAttempts = 0;
            // Start ping timer
            this.startPingTimer();
            // Flush message queue
            this.flushMessageQueue();
            this.emit('connected');
            onConnect();
        };
        socket.onclose = (event) => {
            this.clearTimers();
            const wasConnected = this.state === 'connected';
            this.state = 'disconnected';
            this.emit('disconnected', { code: event.code, reason: event.reason });
            // Attempt reconnection if enabled
            if (wasConnected && this.config.autoReconnect && event.code !== 1000) {
                this.scheduleReconnect();
            }
        };
        socket.onerror = () => {
            const error = new Error('WebSocket error');
            this.emit('error', { error });
            if (this.state === 'connecting') {
                onError(error);
            }
        };
        socket.onmessage = (event) => {
            try {
                const message = deserializeMessage(event.data);
                this.emit('message', { message });
            }
            catch (error) {
                this.emit('error', { error: error });
            }
        };
    }
    /**
     * Schedule a reconnection attempt.
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            return;
        }
        this.state = 'reconnecting';
        this.reconnectAttempts++;
        // Exponential backoff
        const delay = Math.min(this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.config.maxReconnectDelay);
        this.emit('reconnecting', { attempt: this.reconnectAttempts });
        this.reconnectTimer = setTimeout(() => {
            this.connect().catch(() => {
                // Will trigger another reconnect via onclose
            });
        }, delay);
    }
    /**
     * Start ping timer.
     */
    startPingTimer() {
        this.pingTimer = setInterval(() => {
            if (this.isConnected()) {
                this.send({ type: 'PING', timestamp: Date.now() });
            }
        }, this.config.pingInterval);
    }
    /**
     * Flush queued messages.
     */
    flushMessageQueue() {
        const messages = this.messageQueue;
        this.messageQueue = [];
        for (const message of messages) {
            this.send(message);
        }
    }
    /**
     * Clear all timers.
     */
    clearTimers() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }
    }
    /**
     * Dispose of resources.
     */
    dispose() {
        this.disconnect();
        this.clear();
    }
}
/**
 * Create a WebSocket adapter.
 */
export function createWebSocketAdapter(config) {
    return new WebSocketAdapter(config);
}
//# sourceMappingURL=websocket-adapter.js.map