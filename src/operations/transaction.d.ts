/**
 * Transaction system for batching operations
 *
 * Transactions ensure that:
 * 1. Multiple operations are grouped as a single undo step
 * 2. Events are batched and emitted together
 * 3. Rollback is possible if an operation fails
 */
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeId, PropertyPath } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
import type { Operation, OperationContext } from './operation';
import type { UndoManager } from './undo-manager';
/**
 * Transaction - groups multiple scene graph mutations
 */
export declare class Transaction {
    private sceneGraph;
    private undoManager;
    private context;
    private state;
    private operations;
    private actions;
    private _description;
    constructor(sceneGraph: SceneGraph, undoManager: UndoManager | null, context: OperationContext, description?: string);
    /**
     * Check if transaction is still pending.
     */
    isPending(): boolean;
    /**
     * Check if transaction was committed.
     */
    isCommitted(): boolean;
    /**
     * Check if transaction was rolled back.
     */
    isRolledBack(): boolean;
    /**
     * Update a node property.
     */
    updateProperty(nodeId: NodeId, path: PropertyPath, value: unknown): this;
    /**
     * Insert a new node.
     */
    insertNode(node: NodeData, parentId: NodeId, index?: number): this;
    /**
     * Delete a node.
     */
    deleteNode(nodeId: NodeId): this;
    /**
     * Move a node to a new parent.
     */
    moveNode(nodeId: NodeId, newParentId: NodeId, newIndex?: number): this;
    /**
     * Commit the transaction.
     */
    commit(): Operation[];
    /**
     * Roll back the transaction.
     */
    rollback(): void;
    private ensurePending;
    private getPropertyValue;
    private setPropertyValue;
    /**
     * Get all operations in this transaction.
     */
    getOperations(): readonly Operation[];
    /**
     * Get the transaction description.
     */
    getDescription(): string;
}
/**
 * Create a transaction.
 */
export declare function createTransaction(sceneGraph: SceneGraph, undoManager: UndoManager | null, context: OperationContext, description?: string): Transaction;
/**
 * Execute a function within a transaction.
 * Automatically commits on success, rolls back on error.
 */
export declare function withTransaction<T>(sceneGraph: SceneGraph, undoManager: UndoManager | null, context: OperationContext, description: string, fn: (tx: Transaction) => T): T;
//# sourceMappingURL=transaction.d.ts.map