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
import { generateOperationId } from '@core/utils/uuid';

/**
 * Operation type discriminator
 */
export type OperationType =
  | 'SET_PROPERTY'
  | 'INSERT_NODE'
  | 'DELETE_NODE'
  | 'MOVE_NODE'
  | 'REORDER_CHILDREN';

/**
 * Base operation properties
 */
export interface BaseOperation {
  readonly id: OperationId;
  readonly type: OperationType;
  readonly timestamp: number;      // Lamport timestamp
  readonly clientId: string;       // Client that created this operation
  readonly nodeId: NodeId;         // Target node
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
  readonly deletedNodes: readonly NodeData[];  // For undo support
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
export type Operation =
  | SetPropertyOperation
  | InsertNodeOperation
  | DeleteNodeOperation
  | MoveNodeOperation
  | ReorderChildrenOperation;

// ============================================================================
// Operation Factory Functions
// ============================================================================

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
export function createSetPropertyOperation(
  ctx: OperationContext,
  nodeId: NodeId,
  path: PropertyPath,
  oldValue: unknown,
  newValue: unknown
): SetPropertyOperation {
  return {
    id: generateOperationId(ctx.lamportClock, ctx.clientId),
    type: 'SET_PROPERTY',
    timestamp: ctx.lamportClock,
    clientId: ctx.clientId,
    nodeId,
    path,
    oldValue,
    newValue,
  };
}

/**
 * Create an insert node operation
 */
export function createInsertNodeOperation(
  ctx: OperationContext,
  node: NodeData,
  parentId: NodeId,
  index: number
): InsertNodeOperation {
  return {
    id: generateOperationId(ctx.lamportClock, ctx.clientId),
    type: 'INSERT_NODE',
    timestamp: ctx.lamportClock,
    clientId: ctx.clientId,
    nodeId: node.id,
    node,
    parentId,
    index,
  };
}

/**
 * Create a delete node operation
 */
export function createDeleteNodeOperation(
  ctx: OperationContext,
  nodeId: NodeId,
  deletedNodes: readonly NodeData[]
): DeleteNodeOperation {
  return {
    id: generateOperationId(ctx.lamportClock, ctx.clientId),
    type: 'DELETE_NODE',
    timestamp: ctx.lamportClock,
    clientId: ctx.clientId,
    nodeId,
    deletedNodes,
  };
}

/**
 * Create a move node operation
 */
export function createMoveNodeOperation(
  ctx: OperationContext,
  nodeId: NodeId,
  oldParentId: NodeId | null,
  newParentId: NodeId,
  oldIndex: number,
  newIndex: number
): MoveNodeOperation {
  return {
    id: generateOperationId(ctx.lamportClock, ctx.clientId),
    type: 'MOVE_NODE',
    timestamp: ctx.lamportClock,
    clientId: ctx.clientId,
    nodeId,
    oldParentId,
    newParentId,
    oldIndex,
    newIndex,
  };
}

/**
 * Create a reorder children operation
 */
export function createReorderChildrenOperation(
  ctx: OperationContext,
  nodeId: NodeId,
  parentId: NodeId,
  oldIndex: number,
  newIndex: number
): ReorderChildrenOperation {
  return {
    id: generateOperationId(ctx.lamportClock, ctx.clientId),
    type: 'REORDER_CHILDREN',
    timestamp: ctx.lamportClock,
    clientId: ctx.clientId,
    nodeId,
    parentId,
    oldIndex,
    newIndex,
  };
}

// ============================================================================
// Operation Utilities
// ============================================================================

/**
 * Check if an operation is reversible
 */
export function isReversible(_op: Operation): boolean {
  // All operations are reversible
  return true;
}

/**
 * Get a human-readable description of an operation
 */
export function describeOperation(op: Operation): string {
  switch (op.type) {
    case 'SET_PROPERTY':
      return `Set ${op.path.join('.')} on ${op.nodeId}`;
    case 'INSERT_NODE':
      return `Insert ${op.node.type} "${op.node.name}"`;
    case 'DELETE_NODE':
      return `Delete ${op.deletedNodes.length} node(s)`;
    case 'MOVE_NODE':
      return `Move node to ${op.newParentId}`;
    case 'REORDER_CHILDREN':
      return `Reorder ${op.nodeId} from ${op.oldIndex} to ${op.newIndex}`;
  }
}
