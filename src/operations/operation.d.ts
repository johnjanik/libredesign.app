/**
 * CRDT-ready operation types for DesignLibre
 *
 * Operations represent atomic changes to the document that can be:
 * - Applied locally
 * - Sent to collaborators
 * - Reversed (undo)
 * - Reapplied (redo)
 */
import type { NodeId, OperationId, PropertyPath } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
/**
 * Operation type discriminator
 */
export type OperationType = 'SET_PROPERTY' | 'INSERT_NODE' | 'DELETE_NODE' | 'MOVE_NODE' | 'REORDER_CHILDREN';
/**
 * Base operation properties
 */
export interface BaseOperation {
    readonly id: OperationId;
    readonly type: OperationType;
    readonly timestamp: number;
    readonly clientId: string;
    readonly nodeId: NodeId;
}
/**
 * Set property operation - changes a property on a node
 */
export interface SetPropertyOperation extends BaseOperation {
    readonly type: 'SET_PROPERTY';
    readonly path: PropertyPath;
    readonly oldValue: unknown;
    readonly newValue: unknown;
}
/**
 * Insert node operation - adds a new node to the tree
 */
export interface InsertNodeOperation extends BaseOperation {
    readonly type: 'INSERT_NODE';
    readonly node: NodeData;
    readonly parentId: NodeId;
    readonly index: number;
}
/**
 * Delete node operation - removes a node and its descendants
 */
export interface DeleteNodeOperation extends BaseOperation {
    readonly type: 'DELETE_NODE';
    readonly deletedNodes: readonly NodeData[];
}
/**
 * Move node operation - moves a node to a new parent
 */
export interface MoveNodeOperation extends BaseOperation {
    readonly type: 'MOVE_NODE';
    readonly oldParentId: NodeId | null;
    readonly newParentId: NodeId;
    readonly oldIndex: number;
    readonly newIndex: number;
}
/**
 * Reorder children operation - changes the order of a node's children
 */
export interface ReorderChildrenOperation extends BaseOperation {
    readonly type: 'REORDER_CHILDREN';
    readonly parentId: NodeId;
    readonly oldIndex: number;
    readonly newIndex: number;
}
/**
 * Union of all operation types
 */
export type Operation = SetPropertyOperation | InsertNodeOperation | DeleteNodeOperation | MoveNodeOperation | ReorderChildrenOperation;
/**
 * Context for creating operations
 */
export interface OperationContext {
    clientId: string;
    lamportClock: number;
}
/**
 * Create a set property operation
 */
export declare function createSetPropertyOperation(ctx: OperationContext, nodeId: NodeId, path: PropertyPath, oldValue: unknown, newValue: unknown): SetPropertyOperation;
/**
 * Create an insert node operation
 */
export declare function createInsertNodeOperation(ctx: OperationContext, node: NodeData, parentId: NodeId, index: number): InsertNodeOperation;
/**
 * Create a delete node operation
 */
export declare function createDeleteNodeOperation(ctx: OperationContext, nodeId: NodeId, deletedNodes: readonly NodeData[]): DeleteNodeOperation;
/**
 * Create a move node operation
 */
export declare function createMoveNodeOperation(ctx: OperationContext, nodeId: NodeId, oldParentId: NodeId | null, newParentId: NodeId, oldIndex: number, newIndex: number): MoveNodeOperation;
/**
 * Create a reorder children operation
 */
export declare function createReorderChildrenOperation(ctx: OperationContext, nodeId: NodeId, parentId: NodeId, oldIndex: number, newIndex: number): ReorderChildrenOperation;
/**
 * Check if an operation is reversible
 */
export declare function isReversible(_op: Operation): boolean;
/**
 * Get a human-readable description of an operation
 */
export declare function describeOperation(op: Operation): string;
//# sourceMappingURL=operation.d.ts.map