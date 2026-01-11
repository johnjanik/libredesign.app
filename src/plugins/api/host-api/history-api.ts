/**
 * History API
 *
 * Host API for undo/redo operations.
 */

import type { SerializableValue } from '../../types/serialization';

/**
 * History adapter interface
 */
export interface HistoryAdapter {
  /** Perform undo */
  undo(): boolean;
  /** Perform redo */
  redo(): boolean;
  /** Check if undo is available */
  canUndo(): boolean;
  /** Check if redo is available */
  canRedo(): boolean;
  /** Start a batch operation (groups changes into single undo) */
  startBatch(name: string): void;
  /** End a batch operation */
  endBatch(): void;
  /** Get undo stack size */
  getUndoStackSize(): number;
  /** Get redo stack size */
  getRedoStackSize(): number;
  /** Clear history */
  clearHistory(): void;
  /** Get the name of the last undoable action */
  getLastActionName(): string | null;
}

/**
 * Batch operation state per plugin
 */
interface PluginBatchState {
  isInBatch: boolean;
  batchName: string | null;
  batchStartTime: number;
}

/**
 * Create the History API handlers
 */
export function createHistoryAPI(adapter: HistoryAdapter) {
  // Track batch state per plugin to prevent cross-plugin interference
  const pluginBatches = new Map<string, PluginBatchState>();

  function getPluginBatch(pluginId: string): PluginBatchState {
    let state = pluginBatches.get(pluginId);
    if (!state) {
      state = { isInBatch: false, batchName: null, batchStartTime: 0 };
      pluginBatches.set(pluginId, state);
    }
    return state;
  }

  return {
    /**
     * Undo the last action
     */
    'history.undo': async (): Promise<boolean> => {
      return adapter.undo();
    },

    /**
     * Redo the last undone action
     */
    'history.redo': async (): Promise<boolean> => {
      return adapter.redo();
    },

    /**
     * Check if undo is available
     */
    'history.canUndo': async (): Promise<boolean> => {
      return adapter.canUndo();
    },

    /**
     * Check if redo is available
     */
    'history.canRedo': async (): Promise<boolean> => {
      return adapter.canRedo();
    },

    /**
     * Start a batch operation
     */
    'history.startBatch': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const name = args[0];
      if (typeof name !== 'string') {
        throw new Error('Batch name must be a string');
      }

      const state = getPluginBatch(pluginId);
      if (state.isInBatch) {
        throw new Error('Already in a batch operation');
      }

      state.isInBatch = true;
      state.batchName = name;
      state.batchStartTime = Date.now();

      adapter.startBatch(`[Plugin] ${name}`);
    },

    /**
     * End a batch operation
     */
    'history.endBatch': async (pluginId: string): Promise<void> => {
      const state = getPluginBatch(pluginId);
      if (!state.isInBatch) {
        throw new Error('Not in a batch operation');
      }

      state.isInBatch = false;
      state.batchName = null;
      state.batchStartTime = 0;

      adapter.endBatch();
    },

    /**
     * Get undo stack size
     */
    'history.getUndoStackSize': async (): Promise<number> => {
      return adapter.getUndoStackSize();
    },

    /**
     * Get redo stack size
     */
    'history.getRedoStackSize': async (): Promise<number> => {
      return adapter.getRedoStackSize();
    },

    /**
     * Get the name of the last undoable action
     */
    'history.getLastActionName': async (): Promise<string | null> => {
      return adapter.getLastActionName();
    },

    /**
     * Check if plugin is currently in a batch
     */
    'history.isInBatch': async (pluginId: string): Promise<boolean> => {
      const state = getPluginBatch(pluginId);
      return state.isInBatch;
    },
  };
}

export type HistoryAPIHandlers = ReturnType<typeof createHistoryAPI>;
