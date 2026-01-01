/**
 * WebSocket Adapter
 *
 * Manages WebSocket connection with automatic reconnection
 * and message handling.
 */
import { EventEmitter } from '@core/events/event-emitter';
import type { SyncMessage } from './message-types';
/**
 * WebSocket adapter events
 */
export type WebSocketAdapterEvents = {
    'connected': undefined;
    'disconnected': {
        code: number;
        reason: string;
    };
    'message': {
        message: SyncMessage;
    };
    'error': {
        error: Error;
    };
    'reconnecting': {
        attempt: number;
    };
    [key: string]: unknown;
};
/**
 * WebSocket adapter configuration
 */
export interface WebSocketAdapterConfig {
    /** Server URL */
    readonly url: string;
    /** Enable automatic reconnection */
    readonly autoReconnect?: boolean;
    /** Maximum reconnection attempts */
    readonly maxReconnectAttempts?: number;
    /** Base delay for reconnection (ms) */
    readonly reconnectDelay?: number;
    /** Maximum reconnection delay (ms) */
    readonly maxReconnectDelay?: number;
    /** Ping interval (ms) */
    readonly pingInterval?: number;
    /** Connection timeout (ms) */
    readonly connectionTimeout?: number;
}
/**
 * Connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
/**
 * WebSocket adapter for collaboration
 */
export declare class WebSocketAdapter extends EventEmitter<WebSocketAdapterEvents> {
    private config;
    private socket;
    private state;
    private reconnectAttempts;
    private reconnectTimer;
    private pingTimer;
    private connectionTimer;
    private messageQueue;
    constructor(config: WebSocketAdapterConfig);
    /**
     * Get current connection state.
     */
    getState(): ConnectionState;
    /**
     * Check if connected.
     */
    isConnected(): boolean;
    /**
     * Connect to the server.
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the server.
     */
    disconnect(): void;
    /**
     * Send a message.
     */
    send(message: SyncMessage): void;
    /**
     * Setup WebSocket event handlers.
     */
    private setupSocketHandlers;
    /**
     * Schedule a reconnection attempt.
     */
    private scheduleReconnect;
    /**
     * Start ping timer.
     */
    private startPingTimer;
    /**
     * Flush queued messages.
     */
    private flushMessageQueue;
    /**
     * Clear all timers.
     */
    private clearTimers;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create a WebSocket adapter.
 */
export declare function createWebSocketAdapter(config: WebSocketAdapterConfig): WebSocketAdapter;
//# sourceMappingURL=websocket-adapter.d.ts.map