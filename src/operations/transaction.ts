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
import {
  createSetPropertyOperation,
  createInsertNodeOperation,
  createDeleteNodeOperation,
  createMoveNodeOperation,
} from './operation';
import type { UndoManager } from './undo-manager';

/**
 * Transaction state
 */
type TransactionState = 'pending' | 'committed' | 'rolledBack';

/**
 * Recorded action for rollback support
 */
interface RecordedAction {
  type: 'update' | 'insert' | 'delete' | 'move';
  nodeId: NodeId;
  rollback: () => void;
}

/**
 * Transaction - groups multiple scene graph mutations
 */
export class Transaction {
  private state: TransactionState = 'pending';
  private operations: Operation[] = [];
  private actions: RecordedAction[] = [];
  private _description: string;

  constructor(
    private sceneGraph: SceneGraph,
    private undoManager: UndoManager | null,
    private context: OperationContext,
    description: string = 'Transaction'
  ) {
    this._description = description;

    // Begin undo group
    if (this.undoManager) {
      this.undoManager.beginGroup(description);
    }
  }

  // =========================================================================
  // State
  // =========================================================================

  /**
   * Check if transaction is still pending.
   */
  isPending(): boolean {
    return this.state === 'pending';
  }

  /**
   * Check if transaction was committed.
   */
  isCommitted(): boolean {
    return this.state === 'committed';
  }

  /**
   * Check if transaction was rolled back.
   */
  isRolledBack(): boolean {
    return this.state === 'rolledBack';
  }

  // =========================================================================
  // Operations
  // =========================================================================

  /**
   * Update a node property.
   */
  updateProperty(nodeId: NodeId, path: PropertyPath, value: unknown): this {
    this.ensurePending();

    const node = this.sceneGraph.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Get old value
    const oldValue = this.getPropertyValue(node, path);

    // Create operation
    const op = createSetPropertyOperation(
      this.context,
      nodeId,
      path,
      oldValue,
      value
    );
    this.operations.push(op);

    // Apply change
    const updates: Partial<NodeData> = {};
    this.setPropertyValue(updates, path, value);
    this.sceneGraph.updateNode(nodeId, updates);

    // Record for rollback
    this.actions.push({
      type: 'update',
      nodeId,
      rollback: () => {
        const rollbackUpdates: Partial<NodeData> = {};
        this.setPropertyValue(rollbackUpdates, path, oldValue);
        this.sceneGraph.updateNode(nodeId, rollbackUpdates);
      },
    });

    return this;
  }

  /**
   * Insert a new node.
   */
  insertNode(
    node: NodeData,
    parentId: NodeId,
    index: number = -1
  ): this {
    this.ensurePending();

    const actualIndex = index < 0
      ? this.sceneGraph.getChildIds(parentId).length
      : index;

    // Create operation
    const op = createInsertNodeOperation(
      this.context,
      node,
      parentId,
      actualIndex
    );
    this.operations.push(op);

    // Apply change (scene graph will emit events)
    this.sceneGraph.createNode(node.type, parentId, actualIndex, node as Partial<NodeData>);

    // Record for rollback
    this.actions.push({
      type: 'insert',
      nodeId: node.id,
      rollback: () => {
        this.sceneGraph.deleteNode(node.id);
      },
    });

    return this;
  }

  /**
   * Delete a node.
   */
  deleteNode(nodeId: NodeId): this {
    this.ensurePending();

    const node = this.sceneGraph.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Collect all nodes that will be deleted
    const deletedNodes = [node, ...this.sceneGraph.getDescendants(nodeId)];

    // Create operation
    const op = createDeleteNodeOperation(
      this.context,
      nodeId,
      deletedNodes
    );
    this.operations.push(op);

    const parentId = node.parentId;
    const index = parentId
      ? this.sceneGraph.getChildIds(parentId).indexOf(nodeId)
      : 0;

    // Apply change
    this.sceneGraph.deleteNode(nodeId);

    // Record for rollback (complex - need to re-insert all nodes)
    this.actions.push({
      type: 'delete',
      nodeId,
      rollback: () => {
        // Re-insert nodes in order
        for (const deletedNode of deletedNodes) {
          if (deletedNode.parentId) {
            this.sceneGraph.createNode(
              deletedNode.type,
              deletedNode.parentId,
              deletedNode.id === nodeId ? index : -1,
              deletedNode as Partial<NodeData>
            );
          }
        }
      },
    });

    return this;
  }

  /**
   * Move a node to a new parent.
   */
  moveNode(
    nodeId: NodeId,
    newParentId: NodeId,
    newIndex: number = -1
  ): this {
    this.ensurePending();

    const node = this.sceneGraph.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const oldParentId = node.parentId;
    const oldIndex = oldParentId
      ? this.sceneGraph.getChildIds(oldParentId).indexOf(nodeId)
      : 0;

    const actualNewIndex = newIndex < 0
      ? this.sceneGraph.getChildIds(newParentId).length
      : newIndex;

    // Create operation
    const op = createMoveNodeOperation(
      this.context,
      nodeId,
      oldParentId,
      newParentId,
      oldIndex,
      actualNewIndex
    );
    this.operations.push(op);

    // Apply change
    this.sceneGraph.moveNode(nodeId, newParentId, actualNewIndex);

    // Record for rollback
    this.actions.push({
      type: 'move',
      nodeId,
      rollback: () => {
        if (oldParentId) {
          this.sceneGraph.moveNode(nodeId, oldParentId, oldIndex);
        }
      },
    });

    return this;
  }

  // =========================================================================
  // Commit / Rollback
  // =========================================================================

  /**
   * Commit the transaction.
   */
  commit(): Operation[] {
    this.ensurePending();
    this.state = 'committed';

    // End undo group
    if (this.undoManager) {
      for (const op of this.operations) {
        this.undoManager.push(op);
      }
      this.undoManager.endGroup();
    }

    return this.operations;
  }

  /**
   * Roll back the transaction.
   */
  rollback(): void {
    this.ensurePending();
    this.state = 'rolledBack';

    // Rollback in reverse order
    for (let i = this.actions.length - 1; i >= 0; i--) {
      try {
        this.actions[i]!.rollback();
      } catch (error) {
        console.error('Rollback failed:', error);
      }
    }

    // Cancel undo group
    if (this.undoManager && this.undoManager.isInGroup()) {
      this.undoManager.endGroup();
      // Note: This will create an empty group or partial group
      // In a production system, we'd want to handle this more gracefully
    }
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  private ensurePending(): void {
    if (this.state !== 'pending') {
      throw new Error(`Transaction already ${this.state}`);
    }
  }

  private getPropertyValue(node: NodeData, path: PropertyPath): unknown {
    let value: unknown = node;
    for (const key of path) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[key];
    }
    return value;
  }

  private setPropertyValue(
    obj: Record<string, unknown>,
    path: PropertyPath,
    value: unknown
  ): void {
    if (path.length === 0) return;

    if (path.length === 1) {
      obj[path[0]!] = value;
      return;
    }

    // For nested paths, create nested objects
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]!;
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    current[path[path.length - 1]!] = value;
  }

  /**
   * Get all operations in this transaction.
   */
  getOperations(): readonly Operation[] {
    return this.operations;
  }

  /**
   * Get the transaction description.
   */
  getDescription(): string {
    return this._description;
  }
}

/**
 * Create a transaction.
 */
export function createTransaction(
  sceneGraph: SceneGraph,
  undoManager: UndoManager | null,
  context: OperationContext,
  description?: string
): Transaction {
  return new Transaction(sceneGraph, undoManager, context, description);
}

/**
 * Execute a function within a transaction.
 * Automatically commits on success, rolls back on error.
 */
export function withTransaction<T>(
  sceneGraph: SceneGraph,
  undoManager: UndoManager | null,
  context: OperationContext,
  description: string,
  fn: (tx: Transaction) => T
): T {
  const tx = createTransaction(sceneGraph, undoManager, context, description);

  try {
    const result = fn(tx);
    tx.commit();
    return result;
  } catch (error) {
    tx.rollback();
    throw error;
  }
}
