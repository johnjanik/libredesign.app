/**
 * WebSocket Manager for real-time collaboration
 *
 * Handles:
 * - Connection establishment and authentication
 * - Automatic reconnection with exponential backoff
 * - Message serialization/deserialization
 * - Keep-alive ping/pong
 * - Connection state management
 */

import { EventEmitter } from '@core/events/event-emitter';
import type {
  ConnectionState,
  ConnectionStateChange,
  CollaborationMessage,
  AuthMessage,
  AuthResultMessage,
  PingMessage,
  CollaborationUser,
} from '../types';

// =============================================================================
// Types
// =============================================================================

export interface WebSocketManagerOptions {
  /** WebSocket server URL */
  readonly url: string;
  /** Authentication token */
  readonly authToken: string;
  /** Reconnection options */
  readonly reconnect?: {
    /** Enable automatic reconnection (default: true) */
    readonly enabled?: boolean;
    /** Initial delay in ms (default: 1000) */
    readonly initialDelay?: number;
    /** Maximum delay in ms (default: 30000) */
    readonly maxDelay?: number;
    /** Backoff multiplier (default: 2) */
    readonly multiplier?: number;
    /** Maximum reconnection attempts (default: 10) */
    readonly maxAttempts?: number;
  };
  /** Keep-alive interval in ms (default: 30000) */
  readonly pingInterval?: number;
  /** Connection timeout in ms (default: 10000) */
  readonly connectionTimeout?: number;
}

export interface WebSocketManagerEvents {
  'state:change': ConnectionStateChange;
  'message': CollaborationMessage;
  'authenticated': CollaborationUser;
  'error': { code: string; message: string };
  [key: string]: unknown;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OPTIONS = {
  reconnect: {
    enabled: true,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    maxAttempts: 10,
  },
  pingInterval: 30000,
  connectionTimeout: 10000,
} as const;

// =============================================================================
// WebSocket Manager
// =============================================================================

export class WebSocketManager extends EventEmitter<WebSocketManagerEvents> {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private user: CollaborationUser | null = null;

  // Reconnection state
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentReconnectDelay: number;

  // Keep-alive state
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private _lastPongTime = 0;
  private awaitingPong = false;

  // Connection timeout
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;

  // Message queue for offline support
  private messageQueue: CollaborationMessage[] = [];
  private messageIdCounter = 0;

  // Options
  private readonly options: Required<WebSocketManagerOptions> & {
    reconnect: Required<NonNullable<WebSocketManagerOptions['reconnect']>>;
  };

  constructor(options: WebSocketManagerOptions) {
    super();
    this.options = {
      ...options,
      reconnect: { ...DEFAULT_OPTIONS.reconnect, ...options.reconnect },
      pingInterval: options.pingInterval ?? DEFAULT_OPTIONS.pingInterval,
      connectionTimeout: options.connectionTimeout ?? DEFAULT_OPTIONS.connectionTimeout,
    };
    this.currentReconnectDelay = this.options.reconnect.initialDelay;
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get authenticated user
   */
  getUser(): CollaborationUser | null {
    return this.user;
  }

  /**
   * Check if connected and authenticated
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Get the timestamp of the last pong response
   */
  getLastPongTime(): number {
    return this._lastPongTime;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting' || this.state === 'authenticating') {
      return;
    }

    return new Promise((resolve, reject) => {
      this.setState('connecting');
      this.clearTimers();

      try {
        this.ws = new WebSocket(this.options.url);

        // Set up connection timeout
        this.connectionTimer = setTimeout(() => {
          if (this.state === 'connecting' || this.state === 'authenticating') {
            this.ws?.close();
            const error = new Error('Connection timeout');
            this.handleConnectionError(error);
            reject(error);
          }
        }, this.options.connectionTimeout);

        this.ws.onopen = () => {
          this.clearConnectionTimeout();
          this.authenticate()
            .then(() => {
              this.resetReconnectState();
              this.startPingInterval();
              this.flushMessageQueue();
              resolve();
            })
            .catch(reject);
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
        };

        this.ws.onerror = (_event) => {
          const error = new Error('WebSocket error');
          this.handleConnectionError(error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        this.handleConnectionError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.clearTimers();
    this.reconnectAttempts = this.options.reconnect.maxAttempts; // Prevent reconnection

    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnection handler
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.user = null;
    this.setState('disconnected');
  }

  /**
   * Send a message to the server
   */
  send(message: Omit<CollaborationMessage, 'timestamp' | 'messageId'>): void {
    const fullMessage: CollaborationMessage = {
      ...message,
      timestamp: Date.now(),
      messageId: this.generateMessageId(),
    } as CollaborationMessage;

    if (this.isConnected() && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      // Queue message for when we reconnect
      this.messageQueue.push(fullMessage);
    }
  }

  /**
   * Update authentication token (for token refresh)
   */
  updateAuthToken(token: string): void {
    (this.options as { authToken: string }).authToken = token;
  }

  // ===========================================================================
  // Private Methods - Connection Management
  // ===========================================================================

  private async authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.setState('authenticating');

      const authMessage: Omit<AuthMessage, 'timestamp' | 'messageId'> = {
        type: 'auth',
        token: this.options.authToken,
      };

      // Set up one-time handler for auth result
      let unsubscribe: (() => void) | null = null;

      const handleAuthResult = (message: CollaborationMessage) => {
        if (message.type === 'auth_result') {
          if (unsubscribe) unsubscribe();

          const authResult = message as AuthResultMessage;
          if (authResult.success && authResult.user) {
            this.user = authResult.user;
            this.setState('connected');
            this.emit('authenticated', authResult.user);
            resolve();
          } else {
            const error = new Error(authResult.error ?? 'Authentication failed');
            this.setState('error');
            reject(error);
          }
        }
      };

      unsubscribe = this.on('message', handleAuthResult);
      this.send(authMessage);

      // Timeout for auth response
      setTimeout(() => {
        if (unsubscribe) unsubscribe();
        if (this.state === 'authenticating') {
          reject(new Error('Authentication timeout'));
        }
      }, 5000);
    });
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;

    const previousState = this.state;
    this.state = newState;

    this.emit('state:change', {
      previousState,
      currentState: newState,
    });
  }

  private handleClose(event: CloseEvent): void {
    this.stopPingInterval();
    this.ws = null;

    // Don't reconnect on clean close or if max attempts reached
    if (event.code === 1000 || !this.options.reconnect.enabled) {
      this.setState('disconnected');
      return;
    }

    // Attempt reconnection
    if (this.reconnectAttempts < this.options.reconnect.maxAttempts) {
      this.scheduleReconnect();
    } else {
      this.setState('error');
      this.emit('error', {
        code: 'MAX_RECONNECT_ATTEMPTS',
        message: `Failed to reconnect after ${this.options.reconnect.maxAttempts} attempts`,
      });
    }
  }

  private handleConnectionError(_error: Error): void {
    this.clearConnectionTimeout();
    this.stopPingInterval();

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    // Attempt reconnection
    if (
      this.options.reconnect.enabled &&
      this.reconnectAttempts < this.options.reconnect.maxAttempts
    ) {
      this.scheduleReconnect();
    } else {
      this.setState('error');
    }
  }

  private scheduleReconnect(): void {
    this.setState('reconnecting');
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Error handled in connect()
      });
    }, this.currentReconnectDelay);

    // Exponential backoff
    this.currentReconnectDelay = Math.min(
      this.currentReconnectDelay * this.options.reconnect.multiplier,
      this.options.reconnect.maxDelay
    );
  }

  private resetReconnectState(): void {
    this.reconnectAttempts = 0;
    this.currentReconnectDelay = this.options.reconnect.initialDelay;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ===========================================================================
  // Private Methods - Message Handling
  // ===========================================================================

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as CollaborationMessage;

      // Handle pong internally
      if (message.type === 'pong') {
        this._lastPongTime = Date.now();
        this.awaitingPong = false;
        return;
      }

      // Emit message for external handlers
      this.emit('message', message);
    } catch (error) {
      console.error('[WebSocketManager] Failed to parse message:', error);
      this.emit('error', {
        code: 'PARSE_ERROR',
        message: 'Failed to parse server message',
      });
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.ws?.send(JSON.stringify(message));
    }
  }

  private generateMessageId(): string {
    return `${Date.now()}-${++this.messageIdCounter}`;
  }

  // ===========================================================================
  // Private Methods - Keep-Alive
  // ===========================================================================

  private startPingInterval(): void {
    this.stopPingInterval();
    this._lastPongTime = Date.now();

    this.pingTimer = setInterval(() => {
      if (this.awaitingPong) {
        // No pong received - connection might be dead
        console.warn('[WebSocketManager] No pong received, reconnecting...');
        this.ws?.close(4000, 'Ping timeout');
        return;
      }

      if (this.ws?.readyState === WebSocket.OPEN) {
        const pingMessage: Omit<PingMessage, 'timestamp' | 'messageId'> = {
          type: 'ping',
        };
        this.send(pingMessage);
        this.awaitingPong = true;
      }
    }, this.options.pingInterval);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.awaitingPong = false;
  }

  // ===========================================================================
  // Private Methods - Timers
  // ===========================================================================

  private clearConnectionTimeout(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearConnectionTimeout();
    this.stopPingInterval();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a WebSocket manager instance
 */
export function createWebSocketManager(options: WebSocketManagerOptions): WebSocketManager {
  return new WebSocketManager(options);
}
