/**
 * Serialization Types
 *
 * Safe serialization for IPC between host and plugin sandbox.
 * Enforces depth limits, size limits, and type safety.
 */

/**
 * Serialization configuration limits
 */
export interface SerializationLimits {
  /** Maximum object nesting depth */
  readonly maxDepth: number;
  /** Maximum array length */
  readonly maxArrayLength: number;
  /** Maximum object key count */
  readonly maxObjectKeys: number;
  /** Maximum string length */
  readonly maxStringLength: number;
  /** Maximum total size in bytes */
  readonly maxTotalSize: number;
}

/**
 * Default serialization limits
 */
export const DEFAULT_SERIALIZATION_LIMITS: SerializationLimits = {
  maxDepth: 10,
  maxArrayLength: 1000,
  maxObjectKeys: 100,
  maxStringLength: 100000, // 100KB per string
  maxTotalSize: 10 * 1024 * 1024, // 10MB total
};

/**
 * Serializable primitive types
 */
export type SerializablePrimitive = string | number | boolean | null;

/**
 * Serializable value (recursive)
 */
export type SerializableValue =
  | SerializablePrimitive
  | readonly SerializableValue[]
  | { readonly [key: string]: SerializableValue };

/**
 * Serialization result
 */
export interface SerializationResult {
  /** Whether serialization succeeded */
  readonly success: boolean;
  /** Serialized data (if success) */
  readonly data?: SerializableValue;
  /** Error message (if failed) */
  readonly error?: string;
  /** Size of serialized data in bytes */
  readonly size?: number;
}

/**
 * Deserialization result
 */
export interface DeserializationResult<T> {
  /** Whether deserialization succeeded */
  readonly success: boolean;
  /** Deserialized value (if success) */
  readonly value?: T;
  /** Error message (if failed) */
  readonly error?: string;
}

/**
 * IPC message types
 */
export type IPCMessageType =
  | 'api-call' // Plugin calling host API
  | 'api-response' // Host responding to API call
  | 'event' // Host sending event to plugin
  | 'event-subscribe' // Plugin subscribing to event
  | 'event-unsubscribe' // Plugin unsubscribing from event
  | 'error' // Error message
  | 'ready' // Plugin ready signal
  | 'terminate'; // Terminate plugin signal

/**
 * Base IPC message structure
 */
export interface IPCMessage {
  /** Message type */
  readonly type: IPCMessageType;
  /** Unique message ID for correlation */
  readonly messageId: string;
  /** Plugin ID (for routing) */
  readonly pluginId: string;
  /** Timestamp */
  readonly timestamp: number;
}

/**
 * API call message from plugin to host
 */
export interface APICallMessage extends IPCMessage {
  readonly type: 'api-call';
  /** API method to call */
  readonly method: string;
  /** Method arguments */
  readonly args: readonly SerializableValue[];
  /** Capability token for authorization */
  readonly capabilityToken: string;
}

/**
 * API response message from host to plugin
 */
export interface APIResponseMessage extends IPCMessage {
  readonly type: 'api-response';
  /** Correlating request message ID */
  readonly requestId: string;
  /** Whether the call succeeded */
  readonly success: boolean;
  /** Return value (if success) */
  readonly result?: SerializableValue;
  /** Error message (if failed) */
  readonly error?: string;
  /** Error code (if failed) */
  readonly errorCode?: string;
}

/**
 * Event message from host to plugin
 */
export interface EventMessage extends IPCMessage {
  readonly type: 'event';
  /** Event name */
  readonly eventName: string;
  /** Event payload */
  readonly payload: SerializableValue;
}

/**
 * Event subscription message
 */
export interface EventSubscribeMessage extends IPCMessage {
  readonly type: 'event-subscribe';
  /** Event name to subscribe to */
  readonly eventName: string;
  /** Callback ID for correlation */
  readonly callbackId: string;
}

/**
 * Event unsubscribe message
 */
export interface EventUnsubscribeMessage extends IPCMessage {
  readonly type: 'event-unsubscribe';
  /** Listener ID to remove */
  readonly listenerId: string;
}

/**
 * Error message
 */
export interface ErrorMessage extends IPCMessage {
  readonly type: 'error';
  /** Error message */
  readonly error: string;
  /** Error code */
  readonly code: string;
  /** Is this error fatal? */
  readonly fatal: boolean;
}

/**
 * Ready signal from plugin
 */
export interface ReadyMessage extends IPCMessage {
  readonly type: 'ready';
}

/**
 * Terminate signal to plugin
 */
export interface TerminateMessage extends IPCMessage {
  readonly type: 'terminate';
  /** Reason for termination */
  readonly reason: string;
}

/**
 * Union of all IPC message types
 */
export type AnyIPCMessage =
  | APICallMessage
  | APIResponseMessage
  | EventMessage
  | EventSubscribeMessage
  | EventUnsubscribeMessage
  | ErrorMessage
  | ReadyMessage
  | TerminateMessage;

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `msg_${timestamp}_${random}`;
}

/**
 * Check if a value is a valid serializable primitive
 */
export function isSerializablePrimitive(value: unknown): value is SerializablePrimitive {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/**
 * Check if an object is a plain object (not a class instance)
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
