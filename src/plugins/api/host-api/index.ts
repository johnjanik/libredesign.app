/**
 * Host API Module
 *
 * Exports all host API implementations for plugin sandboxes.
 */

export {
  createDesignAPI,
  type SceneGraphAdapter,
  type DesignAPIHandlers,
} from './design-api';

// Re-export NodeQuery from types
export type { NodeQuery } from '../../types/api-types';

export {
  createSelectionAPI,
  type SelectionAdapter,
  type SelectionAPIHandlers,
} from './selection-api';

export {
  createViewportAPI,
  type ViewportAdapter,
  type ViewportAPIHandlers,
} from './viewport-api';

export {
  createHistoryAPI,
  type HistoryAdapter,
  type HistoryAPIHandlers,
} from './history-api';

export {
  createEventsAPI,
  type EventEmitterAdapter,
  type EventListener,
  type PluginEventType,
  type EventsAPIHandlers,
} from './events-api';

export {
  createStorageAPI,
  DEFAULT_STORAGE_CONFIG,
  type StorageConfig,
  type StorageAPIHandlers,
} from './storage-api';

export {
  createNetworkAPI,
  DEFAULT_NETWORK_CONFIG,
  type NetworkConfig,
  type PluginFetchOptions,
  type PluginFetchResponse,
  type NetworkAPIHandlers,
} from './network-api';

export {
  createUIAPI,
  DEFAULT_UI_CONFIG,
  type UIAdapter,
  type UIConfig,
  type PanelHandle,
  type ModalResult,
  type UIAPIHandlers,
} from './ui-api';

export {
  createConsoleAPI,
  DEFAULT_CONSOLE_CONFIG,
  type ConsoleConfig,
  type ConsoleLogLevel,
  type ConsoleLogEntry,
  type ConsoleOutputHandler,
  type ConsoleAPIHandlers,
} from './console-api';
