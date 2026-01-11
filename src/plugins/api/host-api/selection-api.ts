/**
 * Selection API
 *
 * Host API for managing node selection.
 */

import type { SerializableValue } from '../../types/serialization';

/**
 * Selection manager interface
 */
export interface SelectionAdapter {
  /** Get currently selected node IDs */
  getSelectedIds(): string[];
  /** Set selection to specific nodes */
  setSelection(ids: string[]): void;
  /** Add nodes to selection */
  addToSelection(ids: string[]): void;
  /** Remove nodes from selection */
  removeFromSelection(ids: string[]): void;
  /** Clear all selection */
  clearSelection(): void;
  /** Check if a node is selected */
  isSelected(id: string): boolean;
}

/**
 * Create the Selection API handlers
 */
export function createSelectionAPI(adapter: SelectionAdapter) {
  return {
    /**
     * Get current selection
     */
    'selection.get': async (): Promise<string[]> => {
      return adapter.getSelectedIds();
    },

    /**
     * Set selection to specific nodes
     */
    'selection.set': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const ids = args[0];
      if (!Array.isArray(ids)) {
        throw new Error('Invalid node IDs: expected array');
      }
      if (!ids.every((id) => typeof id === 'string')) {
        throw new Error('Invalid node IDs: all items must be strings');
      }
      adapter.setSelection(ids as string[]);
    },

    /**
     * Add nodes to selection
     */
    'selection.add': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const ids = args[0];
      if (!Array.isArray(ids)) {
        throw new Error('Invalid node IDs: expected array');
      }
      if (!ids.every((id) => typeof id === 'string')) {
        throw new Error('Invalid node IDs: all items must be strings');
      }
      adapter.addToSelection(ids as string[]);
    },

    /**
     * Remove nodes from selection
     */
    'selection.remove': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const ids = args[0];
      if (!Array.isArray(ids)) {
        throw new Error('Invalid node IDs: expected array');
      }
      if (!ids.every((id) => typeof id === 'string')) {
        throw new Error('Invalid node IDs: all items must be strings');
      }
      adapter.removeFromSelection(ids as string[]);
    },

    /**
     * Clear selection
     */
    'selection.clear': async (): Promise<void> => {
      adapter.clearSelection();
    },

    /**
     * Check if a node is selected
     */
    'selection.isSelected': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<boolean> => {
      const id = args[0];
      if (typeof id !== 'string') {
        throw new Error('Invalid node ID');
      }
      return adapter.isSelected(id);
    },

    /**
     * Get selection count
     */
    'selection.count': async (): Promise<number> => {
      return adapter.getSelectedIds().length;
    },
  };
}

export type SelectionAPIHandlers = ReturnType<typeof createSelectionAPI>;
