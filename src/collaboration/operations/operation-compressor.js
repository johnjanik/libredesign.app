/**
 * Operation Compressor
 *
 * Optimizes operation logs by compressing redundant operations.
 * Reduces storage size and network bandwidth.
 */
import { compareTimestamps } from './operation-types';
const DEFAULT_CONFIG = {
    propertyCompressionWindow: 1000, // 1 second
    maxBufferSize: 100,
    pruneDeletedNodes: true,
    combineMoves: true,
    combineReorders: true,
};
/**
 * Operation compressor for reducing operation log size
 */
export class OperationCompressor {
    config;
    buffer = [];
    propertyBuffer = new Map();
    lastFlush = Date.now();
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Add an operation to the compression buffer.
     * Returns compressed operations when buffer is flushed.
     */
    add(operation) {
        if (operation.type === 'SET_PROPERTY') {
            return this.addSetProperty(operation);
        }
        // Flush property buffer first
        const flushed = this.flushPropertyBuffer();
        // Handle other operation types
        if (operation.type === 'MOVE_NODE' && this.config.combineMoves) {
            return [...flushed, ...this.addMoveOperation(operation)];
        }
        if (operation.type === 'REORDER_NODE' && this.config.combineReorders) {
            return [...flushed, ...this.addReorderOperation(operation)];
        }
        this.buffer.push(operation);
        if (this.buffer.length >= this.config.maxBufferSize) {
            return [...flushed, ...this.flush()];
        }
        return flushed;
    }
    /**
     * Add multiple operations.
     */
    addAll(operations) {
        const result = [];
        for (const op of operations) {
            result.push(...this.add(op));
        }
        return result;
    }
    /**
     * Flush all buffered operations.
     */
    flush() {
        const propertyOps = this.flushPropertyBuffer();
        const buffered = this.buffer;
        this.buffer = [];
        this.lastFlush = Date.now();
        return [...propertyOps, ...buffered];
    }
    /**
     * Add a SET_PROPERTY operation with compression.
     */
    addSetProperty(operation) {
        const key = this.getPropertyKey(operation);
        const existing = this.propertyBuffer.get(key);
        if (existing) {
            // Check if within compression window and same client
            const timeDiff = operation.timestamp.counter - existing.timestamp.counter;
            if (timeDiff <= this.config.propertyCompressionWindow &&
                operation.timestamp.clientId === existing.timestamp.clientId) {
                // Compress: update existing with new value and timestamp
                const compressed = {
                    ...existing,
                    timestamp: operation.timestamp,
                    newValue: operation.newValue,
                };
                this.propertyBuffer.set(key, compressed);
                return [];
            }
            // Cannot compress - flush existing operation first
            const flushed = [existing];
            this.propertyBuffer.delete(key);
            this.propertyBuffer.set(key, operation);
            return flushed;
        }
        // Check if buffer should be flushed due to time
        const now = Date.now();
        if (now - this.lastFlush > this.config.propertyCompressionWindow) {
            const flushed = this.flushPropertyBuffer();
            this.propertyBuffer.set(key, operation);
            return flushed;
        }
        this.propertyBuffer.set(key, operation);
        return [];
    }
    /**
     * Add a MOVE operation with potential combination.
     */
    addMoveOperation(operation) {
        // Check if there's a pending MOVE for the same node
        const existingIndex = this.buffer.findIndex(op => op.type === 'MOVE_NODE' &&
            op.nodeId === operation.nodeId);
        if (existingIndex >= 0) {
            // Combine: use original old parent, new operation's new parent
            const existing = this.buffer[existingIndex];
            const combined = {
                ...operation,
                oldParentId: existing.oldParentId,
            };
            this.buffer[existingIndex] = combined;
            return [];
        }
        this.buffer.push(operation);
        return [];
    }
    /**
     * Add a REORDER operation with potential combination.
     */
    addReorderOperation(operation) {
        // Check if there's a pending REORDER for the same node
        const existingIndex = this.buffer.findIndex(op => op.type === 'REORDER_NODE' &&
            op.nodeId === operation.nodeId);
        if (existingIndex >= 0) {
            // Replace with newer reorder
            this.buffer[existingIndex] = operation;
            return [];
        }
        this.buffer.push(operation);
        return [];
    }
    /**
     * Flush the property buffer.
     */
    flushPropertyBuffer() {
        const operations = Array.from(this.propertyBuffer.values());
        this.propertyBuffer.clear();
        return operations;
    }
    /**
     * Get a unique key for a property operation.
     */
    getPropertyKey(operation) {
        return `${operation.nodeId}:${operation.path.join('.')}`;
    }
    /**
     * Compress an array of operations.
     * This is a static batch compression that doesn't use buffering.
     */
    static compress(operations, config = {}) {
        const fullConfig = { ...DEFAULT_CONFIG, ...config };
        const inputCount = operations.length;
        // Sort operations by timestamp
        const sorted = [...operations].sort((a, b) => compareTimestamps(a.timestamp, b.timestamp));
        // Track deleted nodes
        const deletedNodes = new Set();
        if (fullConfig.pruneDeletedNodes) {
            for (const op of sorted) {
                if (op.type === 'DELETE_NODE') {
                    deletedNodes.add(op.nodeId);
                }
            }
        }
        // Keep only latest SET_PROPERTY for each (nodeId, path)
        const latestProperties = new Map();
        // Keep only latest MOVE for each node
        const latestMoves = new Map();
        // Keep only latest REORDER for each node
        const latestReorders = new Map();
        // Process operations
        const insertOps = [];
        const deleteOps = [];
        let prunedCount = 0;
        for (const op of sorted) {
            const nodeId = 'nodeId' in op ? op.nodeId : null;
            // Skip operations for deleted nodes (except the delete itself)
            if (fullConfig.pruneDeletedNodes && nodeId && deletedNodes.has(nodeId)) {
                if (op.type !== 'DELETE_NODE') {
                    prunedCount++;
                    continue;
                }
            }
            switch (op.type) {
                case 'INSERT_NODE':
                    insertOps.push(op);
                    break;
                case 'DELETE_NODE':
                    deleteOps.push(op);
                    break;
                case 'SET_PROPERTY': {
                    const setOp = op;
                    const key = `${setOp.nodeId}:${setOp.path.join('.')}`;
                    const existing = latestProperties.get(key);
                    if (!existing || compareTimestamps(setOp.timestamp, existing.timestamp) > 0) {
                        latestProperties.set(key, setOp);
                    }
                    break;
                }
                case 'MOVE_NODE': {
                    const moveOp = op;
                    const existing = latestMoves.get(moveOp.nodeId);
                    if (fullConfig.combineMoves) {
                        if (!existing || compareTimestamps(moveOp.timestamp, existing.timestamp) > 0) {
                            // Preserve original oldParentId if combining
                            if (existing) {
                                latestMoves.set(moveOp.nodeId, {
                                    ...moveOp,
                                    oldParentId: existing.oldParentId,
                                });
                            }
                            else {
                                latestMoves.set(moveOp.nodeId, moveOp);
                            }
                        }
                    }
                    else {
                        latestMoves.set(moveOp.nodeId, moveOp);
                    }
                    break;
                }
                case 'REORDER_NODE': {
                    const reorderOp = op;
                    if (fullConfig.combineReorders) {
                        const existing = latestReorders.get(reorderOp.nodeId);
                        if (!existing || compareTimestamps(reorderOp.timestamp, existing.timestamp) > 0) {
                            latestReorders.set(reorderOp.nodeId, reorderOp);
                        }
                    }
                    else {
                        latestReorders.set(reorderOp.nodeId, reorderOp);
                    }
                    break;
                }
            }
        }
        // Combine all compressed operations
        const compressed = [
            ...insertOps,
            ...Array.from(latestProperties.values()),
            ...Array.from(latestMoves.values()),
            ...Array.from(latestReorders.values()),
            ...deleteOps,
        ];
        // Sort by timestamp
        compressed.sort((a, b) => compareTimestamps(a.timestamp, b.timestamp));
        const outputCount = compressed.length;
        const compressedCount = inputCount - outputCount - prunedCount;
        return {
            operations: compressed,
            stats: {
                inputCount,
                outputCount,
                compressedCount,
                prunedCount,
                compressionRatio: inputCount > 0 ? outputCount / inputCount : 1,
            },
        };
    }
    /**
     * Create an operation batch for network transmission.
     */
    static createBatch(operations) {
        if (operations.length === 0) {
            return {
                operations: [],
                baseTimestamp: { counter: 0, clientId: '' },
                checksum: '',
            };
        }
        // Sort operations
        const sorted = [...operations].sort((a, b) => compareTimestamps(a.timestamp, b.timestamp));
        // Use earliest timestamp as base
        const baseTimestamp = sorted[0].timestamp;
        // Generate simple checksum
        const checksum = this.generateChecksum(sorted);
        return {
            operations: sorted,
            baseTimestamp,
            checksum,
        };
    }
    /**
     * Verify a batch checksum.
     */
    static verifyBatch(batch) {
        const expected = this.generateChecksum(batch.operations);
        return expected === batch.checksum;
    }
    /**
     * Generate a simple checksum for operations.
     */
    static generateChecksum(operations) {
        // Simple hash based on operation IDs and count
        let hash = 0;
        for (const op of operations) {
            for (let i = 0; i < op.id.length; i++) {
                hash = ((hash << 5) - hash + op.id.charCodeAt(i)) | 0;
            }
        }
        return `${operations.length}-${hash.toString(36)}`;
    }
    /**
     * Estimate compressed size in bytes.
     */
    static estimateSize(operations) {
        // Rough estimation based on average operation size
        let size = 0;
        for (const op of operations) {
            // Base overhead: id, timestamp, type
            size += 60;
            switch (op.type) {
                case 'INSERT_NODE':
                    size += 100 + JSON.stringify(op.data).length;
                    break;
                case 'DELETE_NODE':
                    size += 20;
                    break;
                case 'SET_PROPERTY': {
                    const setOp = op;
                    size += 40 + JSON.stringify(setOp.newValue).length;
                    break;
                }
                case 'MOVE_NODE':
                    size += 80;
                    break;
                case 'REORDER_NODE':
                    size += 60;
                    break;
            }
        }
        return size;
    }
    /**
     * Get buffer size.
     */
    getBufferSize() {
        return this.buffer.length + this.propertyBuffer.size;
    }
    /**
     * Check if buffer has operations.
     */
    hasBufferedOperations() {
        return this.buffer.length > 0 || this.propertyBuffer.size > 0;
    }
    /**
     * Clear all buffers.
     */
    clear() {
        this.buffer = [];
        this.propertyBuffer.clear();
        this.lastFlush = Date.now();
    }
}
/**
 * Create an operation compressor.
 */
export function createOperationCompressor(config) {
    return new OperationCompressor(config);
}
//# sourceMappingURL=operation-compressor.js.map