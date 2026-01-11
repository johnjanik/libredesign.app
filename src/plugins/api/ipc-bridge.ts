/**
 * IPC Bridge
 *
 * Handles message passing between host and plugin sandbox.
 * Provides request/response correlation and timeout handling.
 */

import type {
  AnyIPCMessage,
  APICallMessage,
  EventSubscribeMessage,
  EventUnsubscribeMessage,
  ErrorMessage,
  SerializableValue,
} from '../types/serialization';
import { generateMessageId } from '../types/serialization';
import { serialize } from './serializer';
import type { QuickJSSandbox } from '../sandbox/quickjs-sandbox';

/**
 * Pending request state
 */
interface PendingRequest {
  readonly messageId: string;
  readonly method: string;
  readonly sentAt: number;
  readonly timeout: number;
  resolve: (value: SerializableValue) => void;
  reject: (error: Error) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

/**
 * Event listener registration
 */
interface EventListener {
  readonly listenerId: string;
  readonly eventName: string;
  readonly pluginId: string;
  readonly callbackId: string;
}

/**
 * API handler function
 */
export type APIHandler = (
  pluginId: string,
  args: readonly SerializableValue[]
) => Promise<SerializableValue>;

/**
 * IPC Bridge configuration
 */
export interface IPCBridgeConfig {
  /** Default request timeout in ms */
  readonly defaultTimeout: number;
  /** Maximum pending requests per plugin */
  readonly maxPendingRequests: number;
  /** Enable debug logging */
  readonly debug: boolean;
}

/**
 * Default IPC configuration
 */
export const DEFAULT_IPC_CONFIG: IPCBridgeConfig = {
  defaultTimeout: 30000, // 30 seconds
  maxPendingRequests: 100,
  debug: false,
};

/**
 * IPC Bridge for plugin communication
 */
export class IPCBridge {
  private config: IPCBridgeConfig;
  private sandboxes: Map<string, QuickJSSandbox> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private eventListeners: Map<string, EventListener> = new Map();
  private apiHandlers: Map<string, APIHandler> = new Map();
  private pluginPendingCounts: Map<string, number> = new Map();

  constructor(config: Partial<IPCBridgeConfig> = {}) {
    this.config = { ...DEFAULT_IPC_CONFIG, ...config };
  }

  /**
   * Register a sandbox for IPC
   */
  registerSandbox(pluginId: string, sandbox: QuickJSSandbox): void {
    this.sandboxes.set(pluginId, sandbox);
    this.pluginPendingCounts.set(pluginId, 0);

    // Expose the IPC call function to the sandbox
    sandbox.exposeHostFunction('__ipc_call__', async (...args: SerializableValue[]) => {
      const messageStr = args[0];
      if (typeof messageStr !== 'string') {
        return { success: false, error: 'Invalid message format' };
      }

      try {
        const message = JSON.parse(messageStr) as AnyIPCMessage;
        return await this.handleMessage(message);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  }

  /**
   * Unregister a sandbox
   */
  unregisterSandbox(pluginId: string): void {
    this.sandboxes.delete(pluginId);

    // Cancel pending requests for this plugin
    for (const [messageId, request] of this.pendingRequests) {
      if (this.getPluginIdFromMessageId(messageId) === pluginId) {
        clearTimeout(request.timeoutHandle);
        request.reject(new Error('Plugin unregistered'));
        this.pendingRequests.delete(messageId);
      }
    }

    // Remove event listeners for this plugin
    for (const [listenerId, listener] of this.eventListeners) {
      if (listener.pluginId === pluginId) {
        this.eventListeners.delete(listenerId);
      }
    }

    this.pluginPendingCounts.delete(pluginId);
  }

  /**
   * Register an API handler
   */
  registerHandler(method: string, handler: APIHandler): void {
    this.apiHandlers.set(method, handler);
  }

  /**
   * Unregister an API handler
   */
  unregisterHandler(method: string): void {
    this.apiHandlers.delete(method);
  }

  /**
   * Handle incoming message from sandbox
   */
  private async handleMessage(message: AnyIPCMessage): Promise<SerializableValue> {
    if (this.config.debug) {
      console.log(`[IPC] Received: ${message.type}`, message);
    }

    switch (message.type) {
      case 'api-call':
        return this.handleAPICall(message);

      case 'event-subscribe':
        return this.handleEventSubscribe(message);

      case 'event-unsubscribe':
        return this.handleEventUnsubscribe(message);

      case 'ready':
        return { success: true };

      default:
        return { success: false, error: `Unknown message type: ${message.type}` };
    }
  }

  /**
   * Handle API call from plugin
   */
  private async handleAPICall(message: APICallMessage): Promise<SerializableValue> {
    const { pluginId, method, args } = message;

    // Check pending request limit
    const pendingCount = this.pluginPendingCounts.get(pluginId) ?? 0;
    if (pendingCount >= this.config.maxPendingRequests) {
      return {
        success: false,
        error: 'Too many pending requests',
        errorCode: 'RATE_LIMIT',
      } as unknown as SerializableValue;
    }

    // Get handler
    const handler = this.apiHandlers.get(method);
    if (!handler) {
      return {
        success: false,
        error: `Unknown API method: ${method}`,
        errorCode: 'METHOD_NOT_FOUND',
      } as unknown as SerializableValue;
    }

    // Increment pending count
    this.pluginPendingCounts.set(pluginId, pendingCount + 1);

    try {
      // Execute handler
      const result = await handler(pluginId, args);

      // Serialize result
      const serialized = serialize(result);
      if (!serialized.success) {
        return {
          success: false,
          error: serialized.error ?? 'Serialization failed',
          errorCode: 'SERIALIZATION_ERROR',
        } as unknown as SerializableValue;
      }

      return {
        success: true,
        result: serialized.data ?? null,
      } as unknown as SerializableValue;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'HANDLER_ERROR',
      } as unknown as SerializableValue;
    } finally {
      // Decrement pending count
      const current = this.pluginPendingCounts.get(pluginId) ?? 1;
      this.pluginPendingCounts.set(pluginId, Math.max(0, current - 1));
    }
  }

  /**
   * Handle event subscription
   */
  private handleEventSubscribe(message: EventSubscribeMessage): SerializableValue {
    const { pluginId, eventName, callbackId } = message;

    const listenerId = `listener_${generateMessageId()}`;

    this.eventListeners.set(listenerId, {
      listenerId,
      eventName,
      pluginId,
      callbackId,
    });

    return {
      success: true,
      listenerId,
    };
  }

  /**
   * Handle event unsubscription
   */
  private handleEventUnsubscribe(message: EventUnsubscribeMessage): SerializableValue {
    const { listenerId } = message;

    const listener = this.eventListeners.get(listenerId);
    if (!listener) {
      return {
        success: false,
        error: 'Listener not found',
      };
    }

    // Check plugin owns this listener
    if (listener.pluginId !== message.pluginId) {
      return {
        success: false,
        error: 'Permission denied',
      };
    }

    this.eventListeners.delete(listenerId);

    return { success: true };
  }

  /**
   * Emit an event to subscribed plugins
   */
  async emitEvent(eventName: string, payload: SerializableValue): Promise<void> {
    const serialized = serialize(payload);
    if (!serialized.success) {
      console.error(`[IPC] Failed to serialize event payload: ${serialized.error}`);
      return;
    }

    for (const listener of this.eventListeners.values()) {
      if (listener.eventName === eventName) {
        const sandbox = this.sandboxes.get(listener.pluginId);
        if (sandbox && !sandbox.isTerminated()) {
          try {
            // Call the event handler in the sandbox
            await sandbox.callFunction('__handleEvent__', [
              listener.callbackId,
              serialized.data!,
            ]);
          } catch (error) {
            if (this.config.debug) {
              console.error(`[IPC] Event delivery failed:`, error);
            }
          }
        }
      }
    }
  }

  /**
   * Send error to plugin
   */
  sendError(pluginId: string, error: string, code: string, fatal: boolean = false): void {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox || sandbox.isTerminated()) return;

    const message: ErrorMessage = {
      type: 'error',
      messageId: generateMessageId(),
      pluginId,
      timestamp: Date.now(),
      error,
      code,
      fatal,
    };

    sandbox.callFunction('__handleError__', [JSON.stringify(message)]).catch(() => {
      // Ignore errors sending error messages
    });
  }

  /**
   * Get plugin ID from message ID (for cleanup)
   */
  private getPluginIdFromMessageId(messageId: string): string | null {
    for (const request of this.pendingRequests.values()) {
      if (request.messageId === messageId) {
        // Extract plugin ID from context
        return null; // Would need to track this
      }
    }
    return null;
  }

  /**
   * Get statistics
   */
  getStatistics(): IPCBridgeStats {
    const pluginStats: PluginIPCStats[] = [];

    for (const [pluginId, pendingCount] of this.pluginPendingCounts) {
      let eventListenerCount = 0;
      for (const listener of this.eventListeners.values()) {
        if (listener.pluginId === pluginId) eventListenerCount++;
      }

      pluginStats.push({
        pluginId,
        pendingRequests: pendingCount,
        eventListeners: eventListenerCount,
      });
    }

    return {
      registeredPlugins: this.sandboxes.size,
      totalPendingRequests: this.pendingRequests.size,
      totalEventListeners: this.eventListeners.size,
      registeredHandlers: this.apiHandlers.size,
      plugins: pluginStats,
    };
  }

  /**
   * Dispose the bridge
   */
  dispose(): void {
    // Cancel all pending requests
    for (const request of this.pendingRequests.values()) {
      clearTimeout(request.timeoutHandle);
      request.reject(new Error('Bridge disposed'));
    }

    this.pendingRequests.clear();
    this.eventListeners.clear();
    this.sandboxes.clear();
    this.apiHandlers.clear();
    this.pluginPendingCounts.clear();
  }
}

/**
 * Per-plugin IPC statistics
 */
export interface PluginIPCStats {
  readonly pluginId: string;
  readonly pendingRequests: number;
  readonly eventListeners: number;
}

/**
 * IPC Bridge statistics
 */
export interface IPCBridgeStats {
  readonly registeredPlugins: number;
  readonly totalPendingRequests: number;
  readonly totalEventListeners: number;
  readonly registeredHandlers: number;
  readonly plugins: readonly PluginIPCStats[];
}
