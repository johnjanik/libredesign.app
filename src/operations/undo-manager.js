/**
 * Undo/Redo manager for DesignLibre
 *
 * Maintains undo and redo stacks of operations.
 * Supports grouping multiple operations into a single undoable action.
 */
import { EventEmitter } from '@core/events/event-emitter';
/**
 * Undo manager - maintains undo/redo stacks
 */
export class UndoManager extends EventEmitter {
    /** Undo stack */
    undoStack = [];
    /** Redo stack */
    redoStack = [];
    /** Current group being built */
    currentGroup = null;
    currentGroupId = null;
    currentGroupDescription = null;
    /** Maximum history size */
    maxHistory;
    /** Counter for generating group IDs */
    groupCounter = 0;
    constructor(options = {}) {
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
    beginGroup(description = 'Action') {
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
    endGroup() {
        if (this.currentGroup === null) {
            throw new Error('Not in a group. Call beginGroup() first.');
        }
        if (this.currentGroup.length > 0) {
            const group = {
                id: this.currentGroupId,
                description: this.currentGroupDescription,
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
    group(description, fn) {
        this.beginGroup(description);
        try {
            return fn();
        }
        finally {
            this.endGroup();
        }
    }
    /**
     * Check if currently in a group.
     */
    isInGroup() {
        return this.currentGroup !== null;
    }
    // =========================================================================
    // Operation Management
    // =========================================================================
    /**
     * Push an operation onto the undo stack.
     */
    push(operation, description) {
        if (this.currentGroup !== null) {
            // Add to current group
            this.currentGroup.push(operation);
        }
        else {
            // Create single-operation group
            const group = {
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
    pushGroup(group) {
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
    undo() {
        if (!this.canUndo()) {
            return null;
        }
        const group = this.undoStack.pop();
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
    redo() {
        if (!this.canRedo()) {
            return null;
        }
        const group = this.redoStack.pop();
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
    canUndo() {
        return this.undoStack.length > 0;
    }
    /**
     * Check if redo is available.
     */
    canRedo() {
        return this.redoStack.length > 0;
    }
    /**
     * Get the number of undo steps available.
     */
    get undoCount() {
        return this.undoStack.length;
    }
    /**
     * Get the number of redo steps available.
     */
    get redoCount() {
        return this.redoStack.length;
    }
    /**
     * Get description of the next undo operation.
     */
    getUndoDescription() {
        if (this.undoStack.length === 0) {
            return null;
        }
        return this.undoStack[this.undoStack.length - 1].description;
    }
    /**
     * Get description of the next redo operation.
     */
    getRedoDescription() {
        if (this.redoStack.length === 0) {
            return null;
        }
        return this.redoStack[this.redoStack.length - 1].description;
    }
    // =========================================================================
    // State Management
    // =========================================================================
    /**
     * Clear all undo/redo history.
     */
    clear() {
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
    emitStateChanged() {
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
    getUndoHistory() {
        return [...this.undoStack].reverse();
    }
    /**
     * Get the redo history (most recent first).
     */
    getRedoHistory() {
        return [...this.redoStack].reverse();
    }
    /**
     * Get all operations from the undo stack (flattened).
     */
    getAllOperations() {
        return this.undoStack.flatMap((group) => group.operations);
    }
}
/**
 * Create a new undo manager.
 */
export function createUndoManager(options) {
    return new UndoManager(options);
}
//# sourceMappingURL=undo-manager.js.map