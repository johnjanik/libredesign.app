/**
 * Network Module
 *
 * Exports for WebSocket communication and sync protocol.
 */
export { serializeMessage, deserializeMessage, createHelloMessage, createOperationMessage, createPresenceMessage, createSyncRequestMessage, createErrorMessage, } from './message-types';
export { WebSocketAdapter, createWebSocketAdapter } from './websocket-adapter';
export { SyncProtocol, createSyncProtocol } from './sync-protocol';
//# sourceMappingURL=index.js.map