/**
 * Network Module
 *
 * Exports for WebSocket communication and sync protocol.
 */

export {
  serializeMessage,
  deserializeMessage,
  createHelloMessage,
  createOperationMessage,
  createPresenceMessage,
  createSyncRequestMessage,
  createErrorMessage,
  // Encryption message helpers
  createKeyExchangeMessage,
  createKeyRequestMessage,
  isEncryptedMessage,
  isKeyExchangeMessage,
  isKeyRequestMessage,
  shouldEncryptMessage,
} from './message-types';
export type {
  MessageType,
  BaseMessage,
  HelloMessage,
  HelloAckMessage,
  SyncRequestMessage,
  SyncResponseMessage,
  OperationMessage,
  OperationAckMessage,
  PresenceMessage,
  ErrorMessage,
  PingMessage,
  PongMessage,
  SyncMessage,
  ClientInfo,
  ErrorCode,
  // Encryption message types
  EncryptedPayload,
  EncryptedMessage,
  EncryptedSessionKey,
  KeyExchangeMessage,
  KeyRequestMessage,
  EncryptableSyncMessage,
  PlaintextSyncMessage,
} from './message-types';

export { WebSocketAdapter, createWebSocketAdapter } from './websocket-adapter';
export type {
  WebSocketAdapterEvents,
  WebSocketAdapterConfig,
  ConnectionState,
} from './websocket-adapter';

export {
  EncryptedWebSocketAdapter,
  createEncryptedWebSocketAdapter,
} from './encrypted-websocket-adapter';
export type {
  EncryptedWebSocketAdapterConfig,
  EncryptedWebSocketAdapterEvents,
} from './encrypted-websocket-adapter';

export { SyncProtocol, createSyncProtocol } from './sync-protocol';
export type {
  SyncProtocolEvents,
  SyncProtocolConfig,
} from './sync-protocol';
