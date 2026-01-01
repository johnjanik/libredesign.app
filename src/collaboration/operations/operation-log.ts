/**
 * Operation Log
 *
 * Append-only log of operations for CRDT synchronization.
 * Supports querying operations by timestamp, node, and type.
 */

import type { NodeId } from '@core/types/common';
import type {
  Operation,
  LamportTimestamp,
  SetPropertyOperation,
} from './operation-types';
import { compareTimestamps } from './operation-types';

/**
 * Operation log configuration
 */
export interface OperationLogConfig {
  /** Maximum operations to keep in memory */
  readonly maxInMemory?: number;
  /** Enable compression of consecutive SET_PROPERTY operations */
  readonly enableCompression?: boolean;
}

const DEFAULT_CONFIG: Required<OperationLogConfig> = {
  maxInMemory: 10000,
  enableCompression: true,
};

/**
 * Operation log for tracking document changes
 */
export class OperationLog {
  private config: Required<OperationLogConfig>;
  private operations: Operation[] = [];
  private operationIndex: Map<string, number> = new Map();
  private nodeOperations: Map<NodeId, Set<string>> = new Map();
  private latestTimestamp: LamportTimestamp | null = null;

  constructor(config: OperationLogConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Append an operation to the log.
   */
  append(operation: Operation): void {
    // Check for compression opportunity
    if (this.config.enableCompression && operation.type === 'SET_PROPERTY') {
      const compressed = this.tryCompressSetProperty(operation as SetPropertyOperation);
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
  getOperation(id: string): Operation | null {
    const index = this.operationIndex.get(id);
    if (index === undefined) return null;
    return this.operations[index] ?? null;
  }

  /**
   * Get all operations since a timestamp.
   */
  getOperationsSince(timestamp: LamportTimestamp): Operation[] {
    return this.operations.filter(op =>
      compareTimestamps(op.timestamp, timestamp) > 0
    );
  }

  /**
   * Get all operations for a node.
   */
  getOperationsForNode(nodeId: NodeId): Operation[] {
    const opIds = this.nodeOperations.get(nodeId);
    if (!opIds) return [];

    return Array.from(opIds)
      .map(id => this.operationIndex.get(id))
      .filter((index): index is number => index !== undefined)
      .map(index => this.operations[index])
      .filter((op): op is Operation => op !== undefined);
  }

  /**
   * Get operations by type.
   */
  getOperationsByType<T extends Operation['type']>(
    type: T
  ): Extract<Operation, { type: T }>[] {
    return this.operations.filter(op => op.type === type) as Extract<Operation, { type: T }>[];
  }

  /**
   * Get all operations in order.
   */
  getAllOperations(): Operation[] {
    return [...this.operations];
  }

  /**
   * Get the latest timestamp.
   */
  getLatestTimestamp(): LamportTimestamp | null {
    return this.latestTimestamp;
  }

  /**
   * Get operation count.
   */
  get count(): number {
    return this.operations.length;
  }

  /**
   * Check if an operation exists.
   */
  hasOperation(id: string): boolean {
    return this.operationIndex.has(id);
  }

  /**
   * Compact the log by removing superseded operations.
   * For SET_PROPERTY, only keep the latest for each (nodeId, path) pair.
   */
  compact(): void {
    // Track latest SET_PROPERTY for each (nodeId, path)
    const latestSetProperty = new Map<string, SetPropertyOperation>();

    for (const op of this.operations) {
      if (op.type === 'SET_PROPERTY') {
        const key = `${op.nodeId}:${op.path.join('.')}`;
        const existing = latestSetProperty.get(key);

        if (!existing || compareTimestamps(op.timestamp, existing.timestamp) > 0) {
          latestSetProperty.set(key, op as SetPropertyOperation);
        }
      }
    }

    // Filter operations
    const keepSet = new Set<string>();
    for (const op of latestSetProperty.values()) {
      keepSet.add(op.id);
    }

    this.operations = this.operations.filter(op => {
      if (op.type !== 'SET_PROPERTY') return true;
      return keepSet.has(op.id);
    });

    // Rebuild indices
    this.rebuildIndices();
  }

  /**
   * Clear all operations.
   */
  clear(): void {
    this.operations = [];
    this.operationIndex.clear();
    this.nodeOperations.clear();
    this.latestTimestamp = null;
  }

  /**
   * Export operations as JSON.
   */
  toJSON(): Operation[] {
    return [...this.operations];
  }

  /**
   * Import operations from JSON.
   */
  fromJSON(operations: Operation[]): void {
    this.clear();
    for (const op of operations) {
      this.append(op);
    }
  }

  /**
   * Try to compress a SET_PROPERTY operation with the previous one.
   */
  private tryCompressSetProperty(operation: SetPropertyOperation): boolean {
    if (this.operations.length === 0) return false;

    const last = this.operations[this.operations.length - 1];
    if (!last || last.type !== 'SET_PROPERTY') return false;

    const lastSetProp = last as SetPropertyOperation;

    // Check if same node and path
    if (lastSetProp.nodeId !== operation.nodeId) return false;
    if (lastSetProp.path.length !== operation.path.length) return false;
    if (!lastSetProp.path.every((p, i) => p === operation.path[i])) return false;

    // Check if from same client (for local compression only)
    if (lastSetProp.timestamp.clientId !== operation.timestamp.clientId) return false;

    // Check if operations are close in time (within 1 second)
    const timeDiff = Math.abs(operation.timestamp.counter - lastSetProp.timestamp.counter);
    if (timeDiff > 1000) return false;

    // Compress by updating the last operation
    const compressed: SetPropertyOperation = {
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
  private trackByNode(operation: Operation): void {
    const nodeId = this.getNodeIdFromOperation(operation);
    if (!nodeId) return;

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
  private getNodeIdFromOperation(operation: Operation): NodeId | null {
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
  private rebuildIndices(): void {
    this.operationIndex.clear();
    this.nodeOperations.clear();

    for (let i = 0; i < this.operations.length; i++) {
      const op = this.operations[i]!;
      this.operationIndex.set(op.id, i);
      this.trackByNode(op);
    }
  }

  /**
   * Trim old operations if over limit.
   */
  private trimIfNeeded(): void {
    if (this.operations.length <= this.config.maxInMemory) return;

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
export function createOperationLog(config?: OperationLogConfig): OperationLog {
  return new OperationLog(config);
}
