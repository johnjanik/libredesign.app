/**
 * Operation Log
 *
 * Append-only log of operations for CRDT synchronization.
 * Supports querying operations by timestamp, node, and type.
 */
import { compareTimestamps } from './operation-types';
const DEFAULT_CONFIG = {
    maxInMemory: 10000,
    enableCompression: true,
};
/**
 * Operation log for tracking document changes
 */
export class OperationLog {
    config;
    operations = [];
    operationIndex = new Map();
    nodeOperations = new Map();
    latestTimestamp = null;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Append an operation to the log.
     */
    append(operation) {
        // Check for compression opportunity
        if (this.config.enableCompression && operation.type === 'SET_PROPERTY') {
            const compressed = this.tryCompressSetProperty(operation);
            if (compressed) {
                return;
            }
        }
        const index = this.operations.length;
        this.operations.push(operation);
        this.operationIndex.set(operation.id, index);
        // Track by node
        this.trackByNode(operation);
        // Update latest timestamp
        if (!this.latestTimestamp || compareTimestamps(operation.timestamp, this.latestTimestamp) > 0) {
            this.latestTimestamp = operation.timestamp;
        }
        // Trim if over limit
        this.trimIfNeeded();
    }
    /**
     * Get an operation by ID.
     */
    getOperation(id) {
        const index = this.operationIndex.get(id);
        if (index === undefined)
            return null;
        return this.operations[index] ?? null;
    }
    /**
     * Get all operations since a timestamp.
     */
    getOperationsSince(timestamp) {
        return this.operations.filter(op => compareTimestamps(op.timestamp, timestamp) > 0);
    }
    /**
     * Get all operations for a node.
     */
    getOperationsForNode(nodeId) {
        const opIds = this.nodeOperations.get(nodeId);
        if (!opIds)
            return [];
        return Array.from(opIds)
            .map(id => this.operationIndex.get(id))
            .filter((index) => index !== undefined)
            .map(index => this.operations[index])
            .filter((op) => op !== undefined);
    }
    /**
     * Get operations by type.
     */
    getOperationsByType(type) {
        return this.operations.filter(op => op.type === type);
    }
    /**
     * Get all operations in order.
     */
    getAllOperations() {
        return [...this.operations];
    }
    /**
     * Get the latest timestamp.
     */
    getLatestTimestamp() {
        return this.latestTimestamp;
    }
    /**
     * Get operation count.
     */
    get count() {
        return this.operations.length;
    }
    /**
     * Check if an operation exists.
     */
    hasOperation(id) {
        return this.operationIndex.has(id);
    }
    /**
     * Compact the log by removing superseded operations.
     * For SET_PROPERTY, only keep the latest for each (nodeId, path) pair.
     */
    compact() {
        // Track latest SET_PROPERTY for each (nodeId, path)
        const latestSetProperty = new Map();
        for (const op of this.operations) {
            if (op.type === 'SET_PROPERTY') {
                const key = `${op.nodeId}:${op.path.join('.')}`;
                const existing = latestSetProperty.get(key);
                if (!existing || compareTimestamps(op.timestamp, existing.timestamp) > 0) {
                    latestSetProperty.set(key, op);
                }
            }
        }
        // Filter operations
        const keepSet = new Set();
        for (const op of latestSetProperty.values()) {
            keepSet.add(op.id);
        }
        this.operations = this.operations.filter(op => {
            if (op.type !== 'SET_PROPERTY')
                return true;
            return keepSet.has(op.id);
        });
        // Rebuild indices
        this.rebuildIndices();
    }
    /**
     * Clear all operations.
     */
    clear() {
        this.operations = [];
        this.operationIndex.clear();
        this.nodeOperations.clear();
        this.latestTimestamp = null;
    }
    /**
     * Export operations as JSON.
     */
    toJSON() {
        return [...this.operations];
    }
    /**
     * Import operations from JSON.
     */
    fromJSON(operations) {
        this.clear();
        for (const op of operations) {
            this.append(op);
        }
    }
    /**
     * Try to compress a SET_PROPERTY operation with the previous one.
     */
    tryCompressSetProperty(operation) {
        if (this.operations.length === 0)
            return false;
        const last = this.operations[this.operations.length - 1];
        if (!last || last.type !== 'SET_PROPERTY')
            return false;
        const lastSetProp = last;
        // Check if same node and path
        if (lastSetProp.nodeId !== operation.nodeId)
            return false;
        if (lastSetProp.path.length !== operation.path.length)
            return false;
        if (!lastSetProp.path.every((p, i) => p === operation.path[i]))
            return false;
        // Check if from same client (for local compression only)
        if (lastSetProp.timestamp.clientId !== operation.timestamp.clientId)
            return false;
        // Check if operations are close in time (within 1 second)
        const timeDiff = Math.abs(operation.timestamp.counter - lastSetProp.timestamp.counter);
        if (timeDiff > 1000)
            return false;
        // Compress by updating the last operation
        const compressed = {
            ...lastSetProp,
            timestamp: operation.timestamp,
            newValue: operation.newValue,
        };
        this.operations[this.operations.length - 1] = compressed;
        return true;
    }
    /**
     * Track operation by node.
     */
    trackByNode(operation) {
        const nodeId = this.getNodeIdFromOperation(operation);
        if (!nodeId)
            return;
        let opIds = this.nodeOperations.get(nodeId);
        if (!opIds) {
            opIds = new Set();
            this.nodeOperations.set(nodeId, opIds);
        }
        opIds.add(operation.id);
    }
    /**
     * Get node ID from operation.
     */
    getNodeIdFromOperation(operation) {
        switch (operation.type) {
            case 'INSERT_NODE':
            case 'DELETE_NODE':
            case 'SET_PROPERTY':
            case 'MOVE_NODE':
            case 'REORDER_NODE':
                return operation.nodeId;
            default:
                return null;
        }
    }
    /**
     * Rebuild indices after compaction.
     */
    rebuildIndices() {
        this.operationIndex.clear();
        this.nodeOperations.clear();
        for (let i = 0; i < this.operations.length; i++) {
            const op = this.operations[i];
            this.operationIndex.set(op.id, i);
            this.trackByNode(op);
        }
    }
    /**
     * Trim old operations if over limit.
     */
    trimIfNeeded() {
        if (this.operations.length <= this.config.maxInMemory)
            return;
        // Remove oldest operations (keep DELETE operations to prevent resurrection)
        const toKeep = this.config.maxInMemory;
        const toRemove = this.operations.length - toKeep;
        // Keep all DELETE operations
        const deleteOps = this.operations.slice(0, toRemove).filter(op => op.type === 'DELETE_NODE');
        this.operations = [...deleteOps, ...this.operations.slice(toRemove)];
        this.rebuildIndices();
    }
}
/**
 * Create an operation log.
 */
export function createOperationLog(config) {
    return new OperationLog(config);
}
//# sourceMappingURL=operation-log.js.map