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
} from './message-types';

export { WebSocketAdapter, createWebSocketAdapter } from './websocket-adapter';
export type {
  WebSocketAdapterEvents,
  WebSocketAdapterConfig,
  ConnectionState,
} from './websocket-adapter';

export { SyncProtocol, createSyncProtocol } from './sync-protocol';
export type {
  SyncProtocolEvents,
  SyncProtocolConfig,
} from './sync-protocol';
