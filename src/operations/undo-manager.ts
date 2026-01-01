/**
 * Undo/Redo manager for DesignLibre
 *
 * Maintains undo and redo stacks of operations.
 * Supports grouping multiple operations into a single undoable action.
 */

import type { Operation } from './operation';
import { EventEmitter } from '@core/events/event-emitter';

/**
 * Undo manager events
 */
export type UndoManagerEvents = {
  'undo': { operation: Operation };
  'redo': { operation: Operation };
  'push': { operation: Operation };
  'clear': undefined;
  'stateChanged': { canUndo: boolean; canRedo: boolean };
  [key: string]: unknown;
};

/**
 * Operation group for batching multiple operations into one undo step
 */
export interface OperationGroup {
  readonly id: string;
  readonly description: string;
  readonly operations: readonly Operation[];
  readonly timestamp: number;
}

/**
 * Undo manager options
 */
export interface UndoManagerOptions {
  /** Maximum number of undo steps to keep */
  maxHistory?: number;
}

/**
 * Undo manager - maintains undo/redo stacks
 */
export class UndoManager extends EventEmitter<UndoManagerEvents> {
  /** Undo stack */
  private undoStack: OperationGroup[] = [];

  /** Redo stack */
  private redoStack: OperationGroup[] = [];

  /** Current group being built */
  private currentGroup: Operation[] | null = null;
  private currentGroupId: string | null = null;
  private currentGroupDescription: string | null = null;

  /** Maximum history size */
  private maxHistory: number;

  /** Counter for generating group IDs */
  private groupCounter = 0;

  constructor(options: UndoManagerOptions = {}) {
    super();
    this.maxHistory = options.maxHistory ?? 100;
  }

  // =========================================================================
  // Group Management
  // =========================================================================

  /**
   * Begin a new operation group.
   * All operations pushed until endGroup() will be grouped together.
   */
  beginGroup(description: string = 'Action'): string {
    if (this.currentGroup !== null) {
      throw new Error('Already in a group. Call endGroup() first.');
    }

    this.currentGroupId = `group_${++this.groupCounter}`;
    this.currentGroupDescription = description;
    this.currentGroup = [];

    return this.currentGroupId;
  }

  /**
   * End the current operation group.
   */
  endGroup(): void {
    if (this.currentGroup === null) {
      throw new Error('Not in a group. Call beginGroup() first.');
    }

    if (this.currentGroup.length > 0) {
      const group: OperationGroup = {
        id: this.currentGroupId!,
        description: this.currentGroupDescription!,
        operations: this.currentGroup,
        timestamp: Date.now(),
      };

      this.pushGroup(group);
    }

    this.currentGroup = null;
    this.currentGroupId = null;
    this.currentGroupDescription = null;
  }

  /**
   * Execute a function within a group.
   */
  group<T>(description: string, fn: () => T): T {
    this.beginGroup(description);
    try {
      return fn();
    } finally {
      this.endGroup();
    }
  }

  /**
   * Check if currently in a group.
   */
  isInGroup(): boolean {
    return this.currentGroup !== null;
  }

  // =========================================================================
  // Operation Management
  // =========================================================================

  /**
   * Push an operation onto the undo stack.
   */
  push(operation: Operation, description?: string): void {
    if (this.currentGroup !== null) {
      // Add to current group
      this.currentGroup.push(operation);
    } else {
      // Create single-operation group
      const group: OperationGroup = {
        id: `single_${++this.groupCounter}`,
        description: description ?? 'Action',
        operations: [operation],
        timestamp: Date.now(),
      };

      this.pushGroup(group);
    }

    this.emit('push', { operation });
  }

  /**
   * Push a group onto the undo stack.
   */
  private pushGroup(group: OperationGroup): void {
    this.undoStack.push(group);

    // Clear redo stack (new action invalidates redo history)
    this.redoStack = [];

    // Enforce max history
    while (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.emitStateChanged();
  }

  // =========================================================================
  // Undo/Redo
  // =========================================================================

  /**
   * Undo the last operation group.
   * Returns the operations that were undone (in reverse order).
   */
  undo(): Operation[] | null {
    if (!this.canUndo()) {
      return null;
    }

    const group = this.undoStack.pop()!;
    this.redoStack.push(group);

    // Return operations in reverse order (for undoing)
    const operations = [...group.operations].reverse();

    for (const op of operations) {
      this.emit('undo', { operation: op });
    }

    this.emitStateChanged();

    return operations;
  }

  /**
   * Redo the last undone operation group.
   * Returns the operations that were redone.
   */
  redo(): Operation[] | null {
    if (!this.canRedo()) {
      return null;
    }

    const group = this.redoStack.pop()!;
    this.undoStack.push(group);

    // Return operations in forward order (for redoing)
    const operations = [...group.operations];

    for (const op of operations) {
      this.emit('redo', { operation: op });
    }

    this.emitStateChanged();

    return operations;
  }

  /**
   * Check if undo is available.
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available.
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the number of undo steps available.
   */
  get undoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get the number of redo steps available.
   */
  get redoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Get description of the next undo operation.
   */
  getUndoDescription(): string | null {
    if (this.undoStack.length === 0) {
      return null;
    }
    return this.undoStack[this.undoStack.length - 1]!.description;
  }

  /**
   * Get description of the next redo operation.
   */
  getRedoDescription(): string | null {
    if (this.redoStack.length === 0) {
      return null;
    }
    return this.redoStack[this.redoStack.length - 1]!.description;
  }

  // =========================================================================
  // State Management
  // =========================================================================

  /**
   * Clear all undo/redo history.
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentGroup = null;
    this.currentGroupId = null;
    this.currentGroupDescription = null;

    this.emit('clear');
    this.emitStateChanged();
  }

  /**
   * Emit state changed event.
   */
  private emitStateChanged(): void {
    this.emit('stateChanged', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  // =========================================================================
  // History Access
  // =========================================================================

  /**
   * Get the undo history (most recent first).
   */
  getUndoHistory(): readonly OperationGroup[] {
    return [...this.undoStack].reverse();
  }

  /**
   * Get the redo history (most recent first).
   */
  getRedoHistory(): readonly OperationGroup[] {
    return [...this.redoStack].reverse();
  }

  /**
   * Get all operations from the undo stack (flattened).
   */
  getAllOperations(): Operation[] {
    return this.undoStack.flatMap((group) => group.operations);
  }
}

/**
 * Create a new undo manager.
 */
export function createUndoManager(options?: UndoManagerOptions): UndoManager {
  return new UndoManager(options);
}
