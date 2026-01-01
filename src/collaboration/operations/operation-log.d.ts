/**
 * Operation Log
 *
 * Append-only log of operations for CRDT synchronization.
 * Supports querying operations by timestamp, node, and type.
 */
import type { NodeId } from '@core/types/common';
import type { Operation, LamportTimestamp } from './operation-types';
/**
 * Operation log configuration
 */
export interface OperationLogConfig {
    /** Maximum operations to keep in memory */
    readonly maxInMemory?: number;
    /** Enable compression of consecutive SET_PROPERTY operations */
    readonly enableCompression?: boolean;
}
/**
 * Operation log for tracking document changes
 */
export declare class OperationLog {
    private config;
    private operations;
    private operationIndex;
    private nodeOperations;
    private latestTimestamp;
    constructor(config?: OperationLogConfig);
    /**
     * Append an operation to the log.
     */
    append(operation: Operation): void;
    /**
     * Get an operation by ID.
     */
    getOperation(id: string): Operation | null;
    /**
     * Get all operations since a timestamp.
     */
    getOperationsSince(timestamp: LamportTimestamp): Operation[];
    /**
     * Get all operations for a node.
     */
    getOperationsForNode(nodeId: NodeId): Operation[];
    /**
     * Get operations by type.
     */
    getOperationsByType<T extends Operation['type']>(type: T): Extract<Operation, {
        type: T;
    }>[];
    /**
     * Get all operations in order.
     */
    getAllOperations(): Operation[];
    /**
     * Get the latest timestamp.
     */
    getLatestTimestamp(): LamportTimestamp | null;
    /**
     * Get operation count.
     */
    get count(): number;
    /**
     * Check if an operation exists.
     */
    hasOperation(id: string): boolean;
    /**
     * Compact the log by removing superseded operations.
     * For SET_PROPERTY, only keep the latest for each (nodeId, path) pair.
     */
    compact(): void;
    /**
     * Clear all operations.
     */
    clear(): void;
    /**
     * Export operations as JSON.
     */
    toJSON(): Operation[];
    /**
     * Import operations from JSON.
     */
    fromJSON(operations: Operation[]): void;
    /**
     * Try to compress a SET_PROPERTY operation with the previous one.
     */
    private tryCompressSetProperty;
    /**
     * Track operation by node.
     */
    private trackByNode;
    /**
     * Get node ID from operation.
     */
    private getNodeIdFromOperation;
    /**
     * Rebuild indices after compaction.
     */
    private rebuildIndices;
    /**
     * Trim old operations if over limit.
     */
    private trimIfNeeded;
}
/**
 * Create an operation log.
 */
export declare function createOperationLog(config?: OperationLogConfig): OperationLog;
//# sourceMappingURL=operation-log.d.ts.map