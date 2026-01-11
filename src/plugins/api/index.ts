/**
 * API Module - Public Exports
 */

export {
  serialize,
  deserialize,
  cloneDeep,
  isSerializable,
  estimateSize,
  sanitize,
} from './serializer';

export { IPCBridge, DEFAULT_IPC_CONFIG } from './ipc-bridge';
export type {
  IPCBridgeConfig,
  APIHandler,
  IPCBridgeStats,
  PluginIPCStats,
} from './ipc-bridge';

export { APIDispatcher, createDesignAPIMethods } from './api-dispatcher';
export type { APIMethodDefinition } from './api-dispatcher';

// Host API exports
export * from './host-api';
