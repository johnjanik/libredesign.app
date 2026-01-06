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
  | 'PONG'
  // Encryption-related messages
  | 'ENCRYPTED'
  | 'KEY_EXCHANGE'
  | 'KEY_REQUEST';

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

// =============================================================================
// Encryption Messages
// =============================================================================

/**
 * Encrypted data container (matches crypto-utils EncryptedData)
 */
export interface EncryptedPayload {
  readonly ciphertext: string;
  readonly iv: string;
  readonly tag?: string;
  readonly algorithm: 'AES-GCM' | 'AES-CBC';
  readonly keySize: 128 | 192 | 256;
}

/**
 * Encrypted message envelope - wraps any encrypted content
 */
export interface EncryptedMessage extends BaseMessage {
  readonly type: 'ENCRYPTED';
  /** Envelope version for compatibility */
  readonly version: 1;
  /** Document ID this message belongs to */
  readonly documentId: string;
  /** Key ID used for encryption */
  readonly keyId: string;
  /** Key version */
  readonly keyVersion: number;
  /** Sender's user ID */
  readonly senderId: string;
  /** Unique message ID (nonce for replay protection) */
  readonly messageId: string;
  /** Timestamp */
  readonly timestamp: number;
  /** Encrypted payload containing a SyncMessage */
  readonly payload: EncryptedPayload;
}

/**
 * Encrypted session key for a participant
 */
export interface EncryptedSessionKey {
  readonly recipientId: string;
  readonly encryptedKey: string;
  readonly keyId: string;
  readonly version: number;
}

/**
 * Key exchange message - distribute session keys to participants
 */
export interface KeyExchangeMessage extends BaseMessage {
  readonly type: 'KEY_EXCHANGE';
  readonly documentId: string;
  readonly senderId: string;
  /** Encrypted session keys for each participant */
  readonly encryptedKeys: readonly EncryptedSessionKey[];
  /** Key version being distributed */
  readonly keyVersion: number;
  /** Key ID */
  readonly keyId: string;
  /** Sender's public key PEM (for new participants) */
  readonly senderPublicKey?: string | undefined;
}

/**
 * Key request message - request session key when joining
 */
export interface KeyRequestMessage extends BaseMessage {
  readonly type: 'KEY_REQUEST';
  readonly documentId: string;
  readonly requesterId: string;
  /** Requester's public key PEM */
  readonly requesterPublicKey: string;
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
  | PongMessage
  | EncryptedMessage
  | KeyExchangeMessage
  | KeyRequestMessage;

/**
 * Messages that should be encrypted
 */
export type EncryptableSyncMessage =
  | SyncRequestMessage
  | SyncResponseMessage
  | OperationMessage
  | OperationAckMessage
  | PresenceMessage;

/**
 * Messages that are sent in plaintext (handshake, encryption, keepalive)
 */
export type PlaintextSyncMessage =
  | HelloMessage
  | HelloAckMessage
  | ErrorMessage
  | PingMessage
  | PongMessage
  | EncryptedMessage
  | KeyExchangeMessage
  | KeyRequestMessage;

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

// =============================================================================
// Encryption Message Helpers
// =============================================================================

/**
 * Check if a message is an encrypted envelope.
 */
export function isEncryptedMessage(message: SyncMessage): message is EncryptedMessage {
  return message.type === 'ENCRYPTED';
}

/**
 * Check if a message is a key exchange message.
 */
export function isKeyExchangeMessage(message: SyncMessage): message is KeyExchangeMessage {
  return message.type === 'KEY_EXCHANGE';
}

/**
 * Check if a message is a key request message.
 */
export function isKeyRequestMessage(message: SyncMessage): message is KeyRequestMessage {
  return message.type === 'KEY_REQUEST';
}

/**
 * Check if a message type should be encrypted.
 */
export function shouldEncryptMessage(message: SyncMessage): message is EncryptableSyncMessage {
  return (
    message.type === 'SYNC_REQUEST' ||
    message.type === 'SYNC_RESPONSE' ||
    message.type === 'OPERATION' ||
    message.type === 'OPERATION_ACK' ||
    message.type === 'PRESENCE'
  );
}

/**
 * Create a KEY_EXCHANGE message.
 */
export function createKeyExchangeMessage(
  documentId: string,
  senderId: string,
  encryptedKeys: readonly EncryptedSessionKey[],
  keyVersion: number,
  keyId: string,
  senderPublicKey?: string
): KeyExchangeMessage {
  return {
    type: 'KEY_EXCHANGE',
    documentId,
    senderId,
    encryptedKeys,
    keyVersion,
    keyId,
    senderPublicKey,
  };
}

/**
 * Create a KEY_REQUEST message.
 */
export function createKeyRequestMessage(
  documentId: string,
  requesterId: string,
  requesterPublicKey: string
): KeyRequestMessage {
  return {
    type: 'KEY_REQUEST',
    documentId,
    requesterId,
    requesterPublicKey,
  };
}
