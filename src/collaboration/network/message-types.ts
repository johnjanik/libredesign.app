/**
 * Message Types
 *
 * Defines the WebSocket protocol messages for synchronization.
 */

import type { Operation, LamportTimestamp } from '../operations/operation-types';
import type { PresenceData } from '../presence/presence-types';

/**
 * Base message interface
 */
export interface BaseMessage {
  readonly type: MessageType;
}

/**
 * Message types
 */
export type MessageType =
  | 'HELLO'
  | 'HELLO_ACK'
  | 'SYNC_REQUEST'
  | 'SYNC_RESPONSE'
  | 'OPERATION'
  | 'OPERATION_ACK'
  | 'PRESENCE'
  | 'ERROR'
  | 'PING'
  | 'PONG';

/**
 * Hello message - sent when connecting
 */
export interface HelloMessage extends BaseMessage {
  readonly type: 'HELLO';
  readonly clientId: string;
  readonly documentId: string;
  readonly userName: string;
  readonly version: string;
}

/**
 * Hello acknowledgment - sent in response to HELLO
 */
export interface HelloAckMessage extends BaseMessage {
  readonly type: 'HELLO_ACK';
  readonly clientId: string;
  readonly documentId: string;
  readonly serverVersion: string;
  readonly clients: readonly ClientInfo[];
}

/**
 * Client info in HELLO_ACK
 */
export interface ClientInfo {
  readonly clientId: string;
  readonly userName: string;
  readonly color: string;
  readonly joinedAt: number;
}

/**
 * Sync request - request operations since a timestamp
 */
export interface SyncRequestMessage extends BaseMessage {
  readonly type: 'SYNC_REQUEST';
  readonly since: LamportTimestamp | null;
}

/**
 * Sync response - contains operations since requested timestamp
 */
export interface SyncResponseMessage extends BaseMessage {
  readonly type: 'SYNC_RESPONSE';
  readonly operations: readonly Operation[];
  readonly complete: boolean;
  readonly nextCursor: LamportTimestamp | null;
}

/**
 * Operation message - broadcast an operation
 */
export interface OperationMessage extends BaseMessage {
  readonly type: 'OPERATION';
  readonly operation: Operation;
}

/**
 * Operation acknowledgment
 */
export interface OperationAckMessage extends BaseMessage {
  readonly type: 'OPERATION_ACK';
  readonly operationId: string;
  readonly timestamp: LamportTimestamp;
}

/**
 * Presence update message
 */
export interface PresenceMessage extends BaseMessage {
  readonly type: 'PRESENCE';
  readonly clientId: string;
  readonly presence: Partial<PresenceData>;
}

/**
 * Error message
 */
export interface ErrorMessage extends BaseMessage {
  readonly type: 'ERROR';
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

/**
 * Error codes
 */
export type ErrorCode =
  | 'INVALID_MESSAGE'
  | 'DOCUMENT_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

/**
 * Ping message for keepalive
 */
export interface PingMessage extends BaseMessage {
  readonly type: 'PING';
  readonly timestamp: number;
}

/**
 * Pong message for keepalive
 */
export interface PongMessage extends BaseMessage {
  readonly type: 'PONG';
  readonly timestamp: number;
}

/**
 * Union of all message types
 */
export type SyncMessage =
  | HelloMessage
  | HelloAckMessage
  | SyncRequestMessage
  | SyncResponseMessage
  | OperationMessage
  | OperationAckMessage
  | PresenceMessage
  | ErrorMessage
  | PingMessage
  | PongMessage;

/**
 * Serialize a message to JSON.
 */
export function serializeMessage(message: SyncMessage): string {
  return JSON.stringify(message);
}

/**
 * Deserialize a message from JSON.
 */
export function deserializeMessage(data: string): SyncMessage {
  return JSON.parse(data) as SyncMessage;
}

/**
 * Create a HELLO message.
 */
export function createHelloMessage(
  clientId: string,
  documentId: string,
  userName: string,
  version: string = '1.0.0'
): HelloMessage {
  return {
    type: 'HELLO',
    clientId,
    documentId,
    userName,
    version,
  };
}

/**
 * Create an OPERATION message.
 */
export function createOperationMessage(operation: Operation): OperationMessage {
  return {
    type: 'OPERATION',
    operation,
  };
}

/**
 * Create a PRESENCE message.
 */
export function createPresenceMessage(
  clientId: string,
  presence: Partial<PresenceData>
): PresenceMessage {
  return {
    type: 'PRESENCE',
    clientId,
    presence,
  };
}

/**
 * Create a SYNC_REQUEST message.
 */
export function createSyncRequestMessage(since: LamportTimestamp | null): SyncRequestMessage {
  return {
    type: 'SYNC_REQUEST',
    since,
  };
}

/**
 * Create an ERROR message.
 */
export function createErrorMessage(
  code: ErrorCode,
  message: string,
  details?: unknown
): ErrorMessage {
  return {
    type: 'ERROR',
    code,
    message,
    details,
  };
}
