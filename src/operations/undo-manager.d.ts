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
    'undo': {
        operation: Operation;
    };
    'redo': {
        operation: Operation;
    };
    'push': {
        operation: Operation;
    };
    'clear': undefined;
    'stateChanged': {
        canUndo: boolean;
        canRedo: boolean;
    };
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
export declare class UndoManager extends EventEmitter<UndoManagerEvents> {
    /** Undo stack */
    private undoStack;
    /** Redo stack */
    private redoStack;
    /** Current group being built */
    private currentGroup;
    private currentGroupId;
    private currentGroupDescription;
    /** Maximum history size */
    private maxHistory;
    /** Counter for generating group IDs */
    private groupCounter;
    constructor(options?: UndoManagerOptions);
    /**
     * Begin a new operation group.
     * All operations pushed until endGroup() will be grouped together.
     */
    beginGroup(description?: string): string;
    /**
     * End the current operation group.
     */
    endGroup(): void;
    /**
     * Execute a function within a group.
     */
    group<T>(description: string, fn: () => T): T;
    /**
     * Check if currently in a group.
     */
    isInGroup(): boolean;
    /**
     * Push an operation onto the undo stack.
     */
    push(operation: Operation, description?: string): void;
    /**
     * Push a group onto the undo stack.
     */
    private pushGroup;
    /**
     * Undo the last operation group.
     * Returns the operations that were undone (in reverse order).
     */
    undo(): Operation[] | null;
    /**
     * Redo the last undone operation group.
     * Returns the operations that were redone.
     */
    redo(): Operation[] | null;
    /**
     * Check if undo is available.
     */
    canUndo(): boolean;
    /**
     * Check if redo is available.
     */
    canRedo(): boolean;
    /**
     * Get the number of undo steps available.
     */
    get undoCount(): number;
    /**
     * Get the number of redo steps available.
     */
    get redoCount(): number;
    /**
     * Get description of the next undo operation.
     */
    getUndoDescription(): string | null;
    /**
     * Get description of the next redo operation.
     */
    getRedoDescription(): string | null;
    /**
     * Clear all undo/redo history.
     */
    clear(): void;
    /**
     * Emit state changed event.
     */
    private emitStateChanged;
    /**
     * Get the undo history (most recent first).
     */
    getUndoHistory(): readonly OperationGroup[];
    /**
     * Get the redo history (most recent first).
     */
    getRedoHistory(): readonly OperationGroup[];
    /**
     * Get all operations from the undo stack (flattened).
     */
    getAllOperations(): Operation[];
}
/**
 * Create a new undo manager.
 */
export declare function createUndoManager(options?: UndoManagerOptions): UndoManager;
//# sourceMappingURL=undo-manager.d.ts.map