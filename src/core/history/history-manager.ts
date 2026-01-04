/**
 * History Manager (Undo/Redo System)
 *
 * Implements command pattern for undoable operations.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';

/**
 * Command interface for undoable operations
 */
export interface Command {
  /** Unique command ID */
  readonly id: string;
  /** Human-readable description */
  readonly description: string;
  /** Execute the command (do/redo) */
  execute(): void;
  /** Reverse the command (undo) */
  undo(): void;
  /** Optional: merge with another command of the same type */
  merge?(other: Command): boolean;
}

/**
 * History manager events
 */
export type HistoryManagerEvents = {
  'history:push': { command: Command };
  'history:undo': { command: Command };
  'history:redo': { command: Command };
  'history:changed': { canUndo: boolean; canRedo: boolean; undoDescription: string | null; redoDescription: string | null };
  [key: string]: unknown;
};

/**
 * History Manager
 */
export class HistoryManager extends EventEmitter<HistoryManagerEvents> {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize: number;
  private isExecuting = false;
  private batchCommands: Command[] | null = null;

  constructor(maxHistorySize: number = 100) {
    super();
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Execute a command and add it to history
   */
  execute(command: Command): void {
    if (this.isExecuting) return;

    this.isExecuting = true;
    try {
      command.execute();

      // If in batch mode, add to batch
      if (this.batchCommands !== null) {
        this.batchCommands.push(command);
        return;
      }

      // Try to merge with the last command
      const lastCommand = this.undoStack[this.undoStack.length - 1];
      if (lastCommand && lastCommand.merge && lastCommand.merge(command)) {
        // Successfully merged, don't add as new command
      } else {
        this.undoStack.push(command);
      }

      // Clear redo stack
      this.redoStack = [];

      // Limit history size
      while (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
      }

      this.emit('history:push', { command });
      this.notifyChanged();
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Undo the last command
   */
  undo(): boolean {
    if (!this.canUndo() || this.isExecuting) return false;

    const command = this.undoStack.pop()!;
    this.isExecuting = true;

    try {
      command.undo();
      this.redoStack.push(command);
      this.emit('history:undo', { command });
      this.notifyChanged();
      return true;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Redo the last undone command
   */
  redo(): boolean {
    if (!this.canRedo() || this.isExecuting) return false;

    const command = this.redoStack.pop()!;
    this.isExecuting = true;

    try {
      command.execute();
      this.undoStack.push(command);
      this.emit('history:redo', { command });
      this.notifyChanged();
      return true;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get description of the next undo operation
   */
  getUndoDescription(): string | null {
    const command = this.undoStack[this.undoStack.length - 1];
    return command?.description ?? null;
  }

  /**
   * Get description of the next redo operation
   */
  getRedoDescription(): string | null {
    const command = this.redoStack[this.redoStack.length - 1];
    return command?.description ?? null;
  }

  /**
   * Get history size
   */
  getHistorySize(): { undo: number; redo: number } {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length,
    };
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyChanged();
  }

  /**
   * Start a batch operation (multiple commands as one undo step)
   */
  beginBatch(): void {
    if (this.batchCommands !== null) {
      throw new Error('Already in batch mode');
    }
    this.batchCommands = [];
  }

  /**
   * End batch operation and combine all commands
   */
  endBatch(description: string): void {
    if (this.batchCommands === null) {
      throw new Error('Not in batch mode');
    }

    const commands = this.batchCommands;
    this.batchCommands = null;

    if (commands.length === 0) return;

    // Create a composite command
    const batchCommand: Command = {
      id: `batch-${Date.now()}`,
      description,
      execute: () => {
        for (const cmd of commands) {
          cmd.execute();
        }
      },
      undo: () => {
        // Undo in reverse order
        for (let i = commands.length - 1; i >= 0; i--) {
          commands[i]!.undo();
        }
      },
    };

    this.undoStack.push(batchCommand);
    this.redoStack = [];
    this.notifyChanged();
  }

  /**
   * Cancel batch operation
   */
  cancelBatch(): void {
    if (this.batchCommands === null) return;

    // Undo all batched commands in reverse order
    for (let i = this.batchCommands.length - 1; i >= 0; i--) {
      try {
        this.batchCommands[i]!.undo();
      } catch (e) {
        console.error('Error undoing batch command:', e);
      }
    }

    this.batchCommands = null;
  }

  private notifyChanged(): void {
    this.emit('history:changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoDescription: this.getUndoDescription(),
      redoDescription: this.getRedoDescription(),
    });
  }
}

// ============================================================================
// Pre-built Commands
// ============================================================================

/**
 * Property change command
 */
export function createPropertyChangeCommand<T>(
  nodeId: NodeId,
  propertyPath: string,
  oldValue: T,
  newValue: T,
  applyFn: (nodeId: NodeId, propertyPath: string, value: T) => void
): Command {
  return {
    id: `prop-${nodeId}-${propertyPath}-${Date.now()}`,
    description: `Change ${propertyPath}`,
    execute: () => applyFn(nodeId, propertyPath, newValue),
    undo: () => applyFn(nodeId, propertyPath, oldValue),
    merge: (other: Command) => {
      // Merge consecutive property changes on the same node/property
      if (other.id.startsWith(`prop-${nodeId}-${propertyPath}-`)) {
        // Update newValue but keep oldValue from this command
        const otherTyped = other as ReturnType<typeof createPropertyChangeCommand<T>>;
        void otherTyped; // Type assertion only
        return false; // For now, don't merge - implement later if needed
      }
      return false;
    },
  };
}

/**
 * Node creation command
 */
export function createNodeCreationCommand(
  nodeId: NodeId,
  parentId: NodeId,
  nodeData: unknown,
  createFn: (nodeId: NodeId, parentId: NodeId, data: unknown) => void,
  deleteFn: (nodeId: NodeId) => void
): Command {
  return {
    id: `create-${nodeId}-${Date.now()}`,
    description: 'Create element',
    execute: () => createFn(nodeId, parentId, nodeData),
    undo: () => deleteFn(nodeId),
  };
}

/**
 * Node deletion command
 */
export function createNodeDeletionCommand(
  nodeId: NodeId,
  parentId: NodeId,
  nodeData: unknown,
  index: number,
  createFn: (nodeId: NodeId, parentId: NodeId, data: unknown, index: number) => void,
  deleteFn: (nodeId: NodeId) => void
): Command {
  return {
    id: `delete-${nodeId}-${Date.now()}`,
    description: 'Delete element',
    execute: () => deleteFn(nodeId),
    undo: () => createFn(nodeId, parentId, nodeData, index),
  };
}

/**
 * Move command
 */
export function createMoveCommand(
  nodeIds: NodeId[],
  deltaX: number,
  deltaY: number,
  moveFn: (nodeIds: NodeId[], dx: number, dy: number) => void
): Command {
  return {
    id: `move-${nodeIds.join(',')}-${Date.now()}`,
    description: `Move ${nodeIds.length} element${nodeIds.length > 1 ? 's' : ''}`,
    execute: () => moveFn(nodeIds, deltaX, deltaY),
    undo: () => moveFn(nodeIds, -deltaX, -deltaY),
  };
}

/**
 * Resize command
 */
export function createResizeCommand(
  nodeId: NodeId,
  oldBounds: { x: number; y: number; width: number; height: number },
  newBounds: { x: number; y: number; width: number; height: number },
  setBoundsFn: (nodeId: NodeId, bounds: { x: number; y: number; width: number; height: number }) => void
): Command {
  return {
    id: `resize-${nodeId}-${Date.now()}`,
    description: 'Resize element',
    execute: () => setBoundsFn(nodeId, newBounds),
    undo: () => setBoundsFn(nodeId, oldBounds),
  };
}

// Singleton instance
let historyManagerInstance: HistoryManager | null = null;

/**
 * Get the global history manager instance
 */
export function getHistoryManager(): HistoryManager {
  if (!historyManagerInstance) {
    historyManagerInstance = new HistoryManager();
  }
  return historyManagerInstance;
}

/**
 * Create a new history manager (for testing or isolated contexts)
 */
export function createHistoryManager(maxHistorySize?: number): HistoryManager {
  return new HistoryManager(maxHistorySize);
}
