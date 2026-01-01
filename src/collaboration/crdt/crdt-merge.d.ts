/**
 * CRDT Merge
 *
 * Implements conflict-free merge of operations.
 * Uses Last-Writer-Wins for properties and tombstones for deletions.
 */
import type { NodeId } from '@core/types/common';
import type { Operation, LamportTimestamp } from '../operations/operation-types';
/**
 * Merge result for a single operation
 */
export interface MergeResult {
    /** Whether the operation should be applied */
    readonly apply: boolean;
    /** Reason if not applied */
    readonly reason?: string;
    /** Transformed operation (if modified) */
    readonly operation: Operation;
}
/**
 * Node state for tracking deletions
 */
export interface NodeState {
    readonly id: NodeId;
    readonly deleted: boolean;
    readonly deleteTimestamp: LamportTimestamp | null;
    readonly lastPropertyUpdate: Map<string, LamportTimestamp>;
    readonly parentId: NodeId | null;
    readonly fractionalIndex: string;
}
/**
 * CRDT state for merging operations
 */
export declare class CRDTState {
    private nodeStates;
    /**
     * Get node state.
     */
    getNodeState(nodeId: NodeId): NodeState | null;
    /**
     * Check if a node is deleted.
     */
    isDeleted(nodeId: NodeId): boolean;
    /**
     * Mark a node as inserted.
     */
    insertNode(nodeId: NodeId, parentId: NodeId, fractionalIndex: string): void;
    /**
     * Mark a node as deleted.
     */
    deleteNode(nodeId: NodeId, timestamp: LamportTimestamp): void;
    /**
     * Update property timestamp.
     */
    updateProperty(nodeId: NodeId, propertyPath: string, timestamp: LamportTimestamp): void;
    /**
     * Get last property update timestamp.
     */
    getPropertyTimestamp(nodeId: NodeId, propertyPath: string): LamportTimestamp | null;
    /**
     * Update node parent and position.
     */
    moveNode(nodeId: NodeId, newParentId: NodeId, fractionalIndex: string): void;
    /**
     * Clear all state.
     */
    clear(): void;
}
/**
 * CRDT merge engine
 */
export declare class CRDTMerge {
    private state;
    constructor(state?: CRDTState);
    /**
     * Get the CRDT state.
     */
    getState(): CRDTState;
    /**
     * Merge an operation into the state.
     * Returns whether the operation should be applied.
     */
    merge(operation: Operation): MergeResult;
    /**
     * Merge INSERT_NODE operation.
     */
    private mergeInsert;
    /**
     * Merge DELETE_NODE operation.
     */
    private mergeDelete;
    /**
     * Merge SET_PROPERTY operation.
     * Uses Last-Writer-Wins based on timestamp.
     */
    private mergeSetProperty;
    /**
     * Merge MOVE_NODE operation.
     * Uses Last-Writer-Wins for parent, fractional index for position.
     */
    private mergeMove;
    /**
     * Merge REORDER_NODE operation.
     * Uses fractional index for position.
     */
    private mergeReorder;
    /**
     * Merge multiple operations.
     * Operations are sorted by timestamp before merging.
     */
    mergeAll(operations: Operation[]): MergeResult[];
}
/**
 * Create a CRDT merge engine.
 */
export declare function createCRDTMerge(state?: CRDTState): CRDTMerge;
/**
 * Create a CRDT state.
 */
export declare function createCRDTState(): CRDTState;
//# sourceMappingURL=crdt-merge.d.ts.map