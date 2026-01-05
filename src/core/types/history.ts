/**
 * History Types
 *
 * Type definitions for version history system.
 */

import type { NodeId } from './common';

/**
 * History entry for display in the history panel
 */
export interface HistoryEntry {
  /** Unique identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Timestamp when the action occurred */
  timestamp: number;
  /** Type of entry */
  type: 'action' | 'checkpoint';
  /** Whether this is the current state */
  isCurrent: boolean;
  /** Whether this entry is in the redo stack (undone) */
  isUndone: boolean;
  /** Icon to display (optional) */
  icon?: string;
}

/**
 * Named checkpoint
 */
export interface Checkpoint {
  /** Unique identifier */
  id: string;
  /** User-provided name */
  name: string;
  /** Optional description */
  description?: string;
  /** Timestamp when created */
  timestamp: number;
  /** Links to the operation group ID */
  groupId: string;
  /** Canvas thumbnail (data URL) */
  thumbnail?: string;
}

/**
 * State snapshot for time-travel
 */
export interface StateSnapshot {
  /** Serialized scene graph state */
  sceneGraphState: unknown;
  /** Currently selected nodes */
  selectionState: NodeId[];
  /** Viewport position and zoom */
  viewportState: {
    x: number;
    y: number;
    zoom: number;
  };
}

/**
 * Serialized history for persistence
 */
export interface SerializedHistory {
  /** Undo stack entries */
  undoStack: SerializedOperationGroup[];
  /** Redo stack entries */
  redoStack: SerializedOperationGroup[];
  /** Named checkpoints */
  checkpoints: Checkpoint[];
}

/**
 * Serialized operation group
 */
export interface SerializedOperationGroup {
  id: string;
  description: string;
  timestamp: number;
  operations: unknown[];
  snapshot?: StateSnapshot;
}

/**
 * History state for UI
 */
export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  undoCount: number;
  redoCount: number;
}
