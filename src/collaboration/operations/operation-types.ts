/**
 * Operation Types
 *
 * Defines the operations that can be performed on the document.
 * Operations are the unit of change for CRDT synchronization.
 */

import type { NodeId, NodeType, PropertyPath } from '@core/types/common';

/**
 * Lamport timestamp for ordering operations
 */
export interface LamportTimestamp {
  /** Logical clock value */
  readonly counter: number;
  /** Client ID for tie-breaking */
  readonly clientId: string;
}

/**
 * Base operation interface
 */
export interface BaseOperation {
  /** Operation ID (unique) */
  readonly id: string;
  /** Timestamp for ordering */
  readonly timestamp: LamportTimestamp;
  /** Type of operation */
  readonly type: OperationType;
}

/**
 * Operation types
 */
export type OperationType =
  | 'INSERT_NODE'
  | 'DELETE_NODE'
  | 'SET_PROPERTY'
  | 'MOVE_NODE'
  | 'REORDER_NODE';

/**
 * Insert node operation
 */
export interface InsertNodeOperation extends BaseOperation {
  readonly type: 'INSERT_NODE';
  readonly nodeId: NodeId;
  readonly nodeType: NodeType;
  readonly parentId: NodeId;
  /** Fractional index for ordering */
  readonly fractionalIndex: string;
  /** Initial node data */
  readonly data: Record<string, unknown>;
}

/**
 * Delete node operation
 */
export interface DeleteNodeOperation extends BaseOperation {
  readonly type: 'DELETE_NODE';
  readonly nodeId: NodeId;
}

/**
 * Set property operation
 */
export interface SetPropertyOperation extends BaseOperation {
  readonly type: 'SET_PROPERTY';
  readonly nodeId: NodeId;
  readonly path: PropertyPath;
  readonly oldValue: unknown;
  readonly newValue: unknown;
}

/**
 * Move node operation (change parent)
 */
export interface MoveNodeOperation extends BaseOperation {
  readonly type: 'MOVE_NODE';
  readonly nodeId: NodeId;
  readonly oldParentId: NodeId;
  readonly newParentId: NodeId;
  /** Fractional index for ordering in new parent */
  readonly fractionalIndex: string;
}

/**
 * Reorder node operation (change position within parent)
 */
export interface ReorderNodeOperation extends BaseOperation {
  readonly type: 'REORDER_NODE';
  readonly nodeId: NodeId;
  readonly parentId: NodeId;
  /** New fractional index */
  readonly fractionalIndex: string;
}

/**
 * Union of all operation types
 */
export type Operation =
  | InsertNodeOperation
  | DeleteNodeOperation
  | SetPropertyOperation
  | MoveNodeOperation
  | ReorderNodeOperation;

/**
 * Compare Lamport timestamps.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareTimestamps(a: LamportTimestamp, b: LamportTimestamp): number {
  if (a.counter !== b.counter) {
    return a.counter - b.counter;
  }
  return a.clientId.localeCompare(b.clientId);
}

/**
 * Create a new Lamport timestamp.
 */
export function createTimestamp(counter: number, clientId: string): LamportTimestamp {
  return { counter, clientId };
}

/**
 * Increment a Lamport timestamp.
 */
export function incrementTimestamp(ts: LamportTimestamp): LamportTimestamp {
  return { counter: ts.counter + 1, clientId: ts.clientId };
}

/**
 * Merge timestamps (for receiving remote operations).
 */
export function mergeTimestamps(local: LamportTimestamp, remote: LamportTimestamp): LamportTimestamp {
  return {
    counter: Math.max(local.counter, remote.counter) + 1,
    clientId: local.clientId,
  };
}

/**
 * Generate a unique operation ID.
 */
export function generateOperationId(clientId: string): string {
  return `${clientId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
