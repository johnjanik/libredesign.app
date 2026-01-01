/**
 * WebSocket Adapter
 *
 * Manages WebSocket connection with automatic reconnection
 * and message handling.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { SyncMessage } from './message-types';
import { serializeMessage, deserializeMessage } from './message-types';

/**
 * WebSocket adapter events
 */
export type WebSocketAdapterEvents = {
  'connected': undefined;
  'disconnected': { code: number; reason: string };
  'message': { message: SyncMessage };
  'error': { error: Error };
  'reconnecting': { attempt: number };
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

const DEFAULT_CONFIG: Required<Omit<WebSocketAdapterConfig, 'url'>> = {
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  pingInterval: 30000,
  connectionTimeout: 10000,
};

/**
 * Connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * WebSocket adapter for collaboration
 */
export class WebSocketAdapter extends EventEmitter<WebSocketAdapterEvents> {
  private config: Required<WebSocketAdapterConfig>;
  private socket: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: SyncMessage[] = [];

  constructor(config: WebSocketAdapterConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Connect to the server.
   */
  connect(): Promise<void> {
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
      } catch (error) {
        this.state = 'disconnected';
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
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
  send(message: SyncMessage): void {
    if (this.isConnected()) {
      this.socket!.send(serializeMessage(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  /**
   * Setup WebSocket event handlers.
   */
  private setupSocketHandlers(
    socket: WebSocket,
    onConnect: () => void,
    onError: (error: Error) => void
  ): void {
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
        const message = deserializeMessage(event.data as string);
        this.emit('message', { message });
      } catch (error) {
        this.emit('error', { error: error as Error });
      }
    };
  }

  /**
   * Schedule a reconnection attempt.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      return;
    }

    this.state = 'reconnecting';
    this.reconnectAttempts++;

    // Exponential backoff
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

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
  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'PING', timestamp: Date.now() });
      }
    }, this.config.pingInterval);
  }

  /**
   * Flush queued messages.
   */
  private flushMessageQueue(): void {
    const messages = this.messageQueue;
    this.messageQueue = [];

    for (const message of messages) {
      this.send(message);
    }
  }

  /**
   * Clear all timers.
   */
  private clearTimers(): void {
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
  dispose(): void {
    this.disconnect();
    this.clear();
  }
}

/**
 * Create a WebSocket adapter.
 */
export function createWebSocketAdapter(config: WebSocketAdapterConfig): WebSocketAdapter {
  return new WebSocketAdapter(config);
}
