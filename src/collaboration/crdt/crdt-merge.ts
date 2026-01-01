/**
 * CRDT Merge
 *
 * Implements conflict-free merge of operations.
 * Uses Last-Writer-Wins for properties and tombstones for deletions.
 */

import type { NodeId } from '@core/types/common';
import type {
  Operation,
  LamportTimestamp,
  InsertNodeOperation,
  DeleteNodeOperation,
  SetPropertyOperation,
  MoveNodeOperation,
  ReorderNodeOperation,
} from '../operations/operation-types';
import { compareTimestamps } from '../operations/operation-types';

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
export class CRDTState {
  private nodeStates: Map<NodeId, NodeState> = new Map();

  /**
   * Get node state.
   */
  getNodeState(nodeId: NodeId): NodeState | null {
    return this.nodeStates.get(nodeId) ?? null;
  }

  /**
   * Check if a node is deleted.
   */
  isDeleted(nodeId: NodeId): boolean {
    const state = this.nodeStates.get(nodeId);
    return state?.deleted ?? false;
  }

  /**
   * Mark a node as inserted.
   */
  insertNode(
    nodeId: NodeId,
    parentId: NodeId,
    fractionalIndex: string
  ): void {
    this.nodeStates.set(nodeId, {
      id: nodeId,
      deleted: false,
      deleteTimestamp: null,
      lastPropertyUpdate: new Map(),
      parentId,
      fractionalIndex,
    });
  }

  /**
   * Mark a node as deleted.
   */
  deleteNode(nodeId: NodeId, timestamp: LamportTimestamp): void {
    const state = this.nodeStates.get(nodeId);
    if (!state) return;

    this.nodeStates.set(nodeId, {
      ...state,
      deleted: true,
      deleteTimestamp: timestamp,
    });
  }

  /**
   * Update property timestamp.
   */
  updateProperty(
    nodeId: NodeId,
    propertyPath: string,
    timestamp: LamportTimestamp
  ): void {
    const state = this.nodeStates.get(nodeId);
    if (!state) return;

    const newMap = new Map(state.lastPropertyUpdate);
    newMap.set(propertyPath, timestamp);

    this.nodeStates.set(nodeId, {
      ...state,
      lastPropertyUpdate: newMap,
    });
  }

  /**
   * Get last property update timestamp.
   */
  getPropertyTimestamp(nodeId: NodeId, propertyPath: string): LamportTimestamp | null {
    const state = this.nodeStates.get(nodeId);
    return state?.lastPropertyUpdate.get(propertyPath) ?? null;
  }

  /**
   * Update node parent and position.
   */
  moveNode(
    nodeId: NodeId,
    newParentId: NodeId,
    fractionalIndex: string
  ): void {
    const state = this.nodeStates.get(nodeId);
    if (!state) return;

    this.nodeStates.set(nodeId, {
      ...state,
      parentId: newParentId,
      fractionalIndex,
    });
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.nodeStates.clear();
  }
}

/**
 * CRDT merge engine
 */
export class CRDTMerge {
  private state: CRDTState;

  constructor(state: CRDTState = new CRDTState()) {
    this.state = state;
  }

  /**
   * Get the CRDT state.
   */
  getState(): CRDTState {
    return this.state;
  }

  /**
   * Merge an operation into the state.
   * Returns whether the operation should be applied.
   */
  merge(operation: Operation): MergeResult {
    switch (operation.type) {
      case 'INSERT_NODE':
        return this.mergeInsert(operation);
      case 'DELETE_NODE':
        return this.mergeDelete(operation);
      case 'SET_PROPERTY':
        return this.mergeSetProperty(operation);
      case 'MOVE_NODE':
        return this.mergeMove(operation);
      case 'REORDER_NODE':
        return this.mergeReorder(operation);
      default:
        return { apply: false, reason: 'Unknown operation type', operation };
    }
  }

  /**
   * Merge INSERT_NODE operation.
   */
  private mergeInsert(operation: InsertNodeOperation): MergeResult {
    const existingState = this.state.getNodeState(operation.nodeId);

    // If node already exists
    if (existingState) {
      // If previously deleted, don't resurrect (tombstone wins)
      if (existingState.deleted) {
        return {
          apply: false,
          reason: 'Node was already deleted',
          operation,
        };
      }

      // Node already exists, skip
      return {
        apply: false,
        reason: 'Node already exists',
        operation,
      };
    }

    // Check if parent exists and is not deleted
    const parentState = this.state.getNodeState(operation.parentId);
    if (parentState?.deleted) {
      return {
        apply: false,
        reason: 'Parent node is deleted',
        operation,
      };
    }

    // Apply insert
    this.state.insertNode(operation.nodeId, operation.parentId, operation.fractionalIndex);

    return { apply: true, operation };
  }

  /**
   * Merge DELETE_NODE operation.
   */
  private mergeDelete(operation: DeleteNodeOperation): MergeResult {
    const existingState = this.state.getNodeState(operation.nodeId);

    // If node doesn't exist, still mark as deleted (for future inserts)
    if (!existingState) {
      this.state.insertNode(operation.nodeId, '' as NodeId, '');
      this.state.deleteNode(operation.nodeId, operation.timestamp);
      return { apply: true, operation };
    }

    // If already deleted, check timestamp
    if (existingState.deleted) {
      const existingTs = existingState.deleteTimestamp;
      if (existingTs && compareTimestamps(operation.timestamp, existingTs) <= 0) {
        return {
          apply: false,
          reason: 'Already deleted with later timestamp',
          operation,
        };
      }
    }

    // Apply delete
    this.state.deleteNode(operation.nodeId, operation.timestamp);

    return { apply: true, operation };
  }

  /**
   * Merge SET_PROPERTY operation.
   * Uses Last-Writer-Wins based on timestamp.
   */
  private mergeSetProperty(operation: SetPropertyOperation): MergeResult {
    const nodeState = this.state.getNodeState(operation.nodeId);

    // If node is deleted, don't apply
    if (nodeState?.deleted) {
      return {
        apply: false,
        reason: 'Node is deleted',
        operation,
      };
    }

    const propertyPath = operation.path.join('.');
    const existingTimestamp = this.state.getPropertyTimestamp(operation.nodeId, propertyPath);

    // Last-Writer-Wins
    if (existingTimestamp && compareTimestamps(operation.timestamp, existingTimestamp) <= 0) {
      return {
        apply: false,
        reason: 'Later update already applied',
        operation,
      };
    }

    // Apply update
    this.state.updateProperty(operation.nodeId, propertyPath, operation.timestamp);

    return { apply: true, operation };
  }

  /**
   * Merge MOVE_NODE operation.
   * Uses Last-Writer-Wins for parent, fractional index for position.
   */
  private mergeMove(operation: MoveNodeOperation): MergeResult {
    const nodeState = this.state.getNodeState(operation.nodeId);

    // If node is deleted, don't apply
    if (nodeState?.deleted) {
      return {
        apply: false,
        reason: 'Node is deleted',
        operation,
      };
    }

    // Check if new parent is deleted
    const newParentState = this.state.getNodeState(operation.newParentId);
    if (newParentState?.deleted) {
      return {
        apply: false,
        reason: 'New parent is deleted',
        operation,
      };
    }

    // Check for cycles (would need full tree, simplified here)
    // TODO: Implement proper cycle detection

    // Apply move
    this.state.moveNode(operation.nodeId, operation.newParentId, operation.fractionalIndex);

    return { apply: true, operation };
  }

  /**
   * Merge REORDER_NODE operation.
   * Uses fractional index for position.
   */
  private mergeReorder(operation: ReorderNodeOperation): MergeResult {
    const nodeState = this.state.getNodeState(operation.nodeId);

    // If node is deleted, don't apply
    if (nodeState?.deleted) {
      return {
        apply: false,
        reason: 'Node is deleted',
        operation,
      };
    }

    // Fractional indices naturally handle concurrent reorders
    // The final order is deterministic based on the indices
    if (nodeState) {
      this.state.moveNode(operation.nodeId, nodeState.parentId ?? operation.parentId, operation.fractionalIndex);
    }

    return { apply: true, operation };
  }

  /**
   * Merge multiple operations.
   * Operations are sorted by timestamp before merging.
   */
  mergeAll(operations: Operation[]): MergeResult[] {
    // Sort by timestamp for deterministic merge
    const sorted = [...operations].sort((a, b) =>
      compareTimestamps(a.timestamp, b.timestamp)
    );

    return sorted.map(op => this.merge(op));
  }
}

/**
 * Create a CRDT merge engine.
 */
export function createCRDTMerge(state?: CRDTState): CRDTMerge {
  return new CRDTMerge(state);
}

/**
 * Create a CRDT state.
 */
export function createCRDTState(): CRDTState {
  return new CRDTState();
}
