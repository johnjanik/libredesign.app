/**
 * CRDT merge tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CRDTState,
  CRDTMerge,
  createCRDTMerge,
  createCRDTState,
} from '@collaboration/crdt/crdt-merge';
import {
  createTimestamp,
  type InsertNodeOperation,
  type DeleteNodeOperation,
  type SetPropertyOperation,
  type MoveNodeOperation,
  type ReorderNodeOperation,
} from '@collaboration/operations/operation-types';
import type { NodeId } from '@core/types/common';

describe('CRDTState', () => {
  let state: CRDTState;

  beforeEach(() => {
    state = createCRDTState();
  });

  describe('insertNode', () => {
    it('tracks inserted node', () => {
      state.insertNode('node-1' as NodeId, 'parent-1' as NodeId, 'a');

      const nodeState = state.getNodeState('node-1' as NodeId);
      expect(nodeState).not.toBeNull();
      expect(nodeState?.deleted).toBe(false);
      expect(nodeState?.parentId).toBe('parent-1');
      expect(nodeState?.fractionalIndex).toBe('a');
    });
  });

  describe('deleteNode', () => {
    it('marks node as deleted', () => {
      state.insertNode('node-1' as NodeId, 'parent-1' as NodeId, 'a');
      const timestamp = createTimestamp(1, 'client-1');

      state.deleteNode('node-1' as NodeId, timestamp);

      const nodeState = state.getNodeState('node-1' as NodeId);
      expect(nodeState?.deleted).toBe(true);
      expect(nodeState?.deleteTimestamp).toEqual(timestamp);
    });
  });

  describe('isDeleted', () => {
    it('returns false for non-deleted node', () => {
      state.insertNode('node-1' as NodeId, 'parent-1' as NodeId, 'a');

      expect(state.isDeleted('node-1' as NodeId)).toBe(false);
    });

    it('returns true for deleted node', () => {
      state.insertNode('node-1' as NodeId, 'parent-1' as NodeId, 'a');
      state.deleteNode('node-1' as NodeId, createTimestamp(1, 'client-1'));

      expect(state.isDeleted('node-1' as NodeId)).toBe(true);
    });

    it('returns false for unknown node', () => {
      expect(state.isDeleted('unknown' as NodeId)).toBe(false);
    });
  });

  describe('updateProperty', () => {
    it('tracks property update timestamp', () => {
      state.insertNode('node-1' as NodeId, 'parent-1' as NodeId, 'a');
      const timestamp = createTimestamp(5, 'client-1');

      state.updateProperty('node-1' as NodeId, 'name', timestamp);

      expect(state.getPropertyTimestamp('node-1' as NodeId, 'name')).toEqual(timestamp);
    });
  });

  describe('moveNode', () => {
    it('updates node parent and position', () => {
      state.insertNode('node-1' as NodeId, 'parent-1' as NodeId, 'a');

      state.moveNode('node-1' as NodeId, 'parent-2' as NodeId, 'b');

      const nodeState = state.getNodeState('node-1' as NodeId);
      expect(nodeState?.parentId).toBe('parent-2');
      expect(nodeState?.fractionalIndex).toBe('b');
    });
  });
});

describe('CRDTMerge', () => {
  let merge: CRDTMerge;

  const createInsertOp = (
    counter: number,
    nodeId: string,
    parentId: string = 'parent-1'
  ): InsertNodeOperation => ({
    id: `op-${counter}`,
    type: 'INSERT_NODE',
    timestamp: createTimestamp(counter, 'client-1'),
    nodeId: nodeId as NodeId,
    nodeType: 'FRAME',
    parentId: parentId as NodeId,
    fractionalIndex: 'a',
    data: { name: 'Test' },
  });

  const createDeleteOp = (
    counter: number,
    nodeId: string,
    clientId: string = 'client-1'
  ): DeleteNodeOperation => ({
    id: `op-${counter}`,
    type: 'DELETE_NODE',
    timestamp: createTimestamp(counter, clientId),
    nodeId: nodeId as NodeId,
  });

  const createSetPropertyOp = (
    counter: number,
    nodeId: string,
    path: string[] = ['name'],
    clientId: string = 'client-1'
  ): SetPropertyOperation => ({
    id: `op-${counter}`,
    type: 'SET_PROPERTY',
    timestamp: createTimestamp(counter, clientId),
    nodeId: nodeId as NodeId,
    path,
    oldValue: 'old',
    newValue: 'new',
  });

  const createMoveOp = (
    counter: number,
    nodeId: string,
    oldParentId: string,
    newParentId: string
  ): MoveNodeOperation => ({
    id: `op-${counter}`,
    type: 'MOVE_NODE',
    timestamp: createTimestamp(counter, 'client-1'),
    nodeId: nodeId as NodeId,
    oldParentId: oldParentId as NodeId,
    newParentId: newParentId as NodeId,
    fractionalIndex: 'b',
  });

  const createReorderOp = (
    counter: number,
    nodeId: string,
    parentId: string
  ): ReorderNodeOperation => ({
    id: `op-${counter}`,
    type: 'REORDER_NODE',
    timestamp: createTimestamp(counter, 'client-1'),
    nodeId: nodeId as NodeId,
    parentId: parentId as NodeId,
    fractionalIndex: 'c',
  });

  beforeEach(() => {
    merge = createCRDTMerge();
  });

  describe('INSERT_NODE', () => {
    it('applies insert for new node', () => {
      const op = createInsertOp(1, 'node-1');

      const result = merge.merge(op);

      expect(result.apply).toBe(true);
      expect(merge.getState().getNodeState('node-1' as NodeId)).not.toBeNull();
    });

    it('rejects insert for existing node', () => {
      const op1 = createInsertOp(1, 'node-1');
      const op2 = createInsertOp(2, 'node-1');

      merge.merge(op1);
      const result = merge.merge(op2);

      expect(result.apply).toBe(false);
      expect(result.reason).toContain('already exists');
    });

    it('rejects insert for deleted node (tombstone)', () => {
      const insertOp = createInsertOp(1, 'node-1');
      const deleteOp = createDeleteOp(2, 'node-1');
      const reinsertOp = createInsertOp(3, 'node-1');

      merge.merge(insertOp);
      merge.merge(deleteOp);
      const result = merge.merge(reinsertOp);

      expect(result.apply).toBe(false);
      expect(result.reason).toContain('deleted');
    });

    it('rejects insert when parent is deleted', () => {
      merge.merge(createInsertOp(1, 'parent-1'));
      merge.merge(createDeleteOp(2, 'parent-1'));

      const result = merge.merge(createInsertOp(3, 'child-1', 'parent-1'));

      expect(result.apply).toBe(false);
      expect(result.reason).toContain('Parent');
    });
  });

  describe('DELETE_NODE', () => {
    it('applies delete for existing node', () => {
      merge.merge(createInsertOp(1, 'node-1'));

      const result = merge.merge(createDeleteOp(2, 'node-1'));

      expect(result.apply).toBe(true);
      expect(merge.getState().isDeleted('node-1' as NodeId)).toBe(true);
    });

    it('applies delete for unknown node (tombstone for future inserts)', () => {
      const result = merge.merge(createDeleteOp(1, 'unknown-node'));

      expect(result.apply).toBe(true);
      expect(merge.getState().isDeleted('unknown-node' as NodeId)).toBe(true);
    });

    it('rejects delete with older timestamp', () => {
      merge.merge(createInsertOp(1, 'node-1'));
      merge.merge(createDeleteOp(10, 'node-1'));

      const result = merge.merge(createDeleteOp(5, 'node-1'));

      expect(result.apply).toBe(false);
    });
  });

  describe('SET_PROPERTY', () => {
    it('applies property update for existing node', () => {
      merge.merge(createInsertOp(1, 'node-1'));

      const result = merge.merge(createSetPropertyOp(2, 'node-1'));

      expect(result.apply).toBe(true);
    });

    it('rejects property update for deleted node', () => {
      merge.merge(createInsertOp(1, 'node-1'));
      merge.merge(createDeleteOp(2, 'node-1'));

      const result = merge.merge(createSetPropertyOp(3, 'node-1'));

      expect(result.apply).toBe(false);
      expect(result.reason).toContain('deleted');
    });

    it('uses Last-Writer-Wins for concurrent updates', () => {
      merge.merge(createInsertOp(1, 'node-1'));

      // First update
      merge.merge(createSetPropertyOp(5, 'node-1', ['name'], 'client-1'));

      // Earlier update should be rejected
      const result = merge.merge(createSetPropertyOp(3, 'node-1', ['name'], 'client-2'));

      expect(result.apply).toBe(false);
      expect(result.reason).toContain('Later update');
    });

    it('accepts update with later timestamp', () => {
      merge.merge(createInsertOp(1, 'node-1'));
      merge.merge(createSetPropertyOp(5, 'node-1', ['name'], 'client-1'));

      const result = merge.merge(createSetPropertyOp(10, 'node-1', ['name'], 'client-2'));

      expect(result.apply).toBe(true);
    });

    it('allows updates to different properties', () => {
      merge.merge(createInsertOp(1, 'node-1'));
      merge.merge(createSetPropertyOp(5, 'node-1', ['name']));

      const result = merge.merge(createSetPropertyOp(3, 'node-1', ['x']));

      expect(result.apply).toBe(true);
    });
  });

  describe('MOVE_NODE', () => {
    it('applies move for existing node', () => {
      merge.merge(createInsertOp(1, 'node-1'));
      merge.merge(createInsertOp(2, 'parent-2'));

      const result = merge.merge(createMoveOp(3, 'node-1', 'parent-1', 'parent-2'));

      expect(result.apply).toBe(true);
    });

    it('rejects move for deleted node', () => {
      merge.merge(createInsertOp(1, 'node-1'));
      merge.merge(createDeleteOp(2, 'node-1'));

      const result = merge.merge(createMoveOp(3, 'node-1', 'parent-1', 'parent-2'));

      expect(result.apply).toBe(false);
    });

    it('rejects move to deleted parent', () => {
      merge.merge(createInsertOp(1, 'node-1'));
      merge.merge(createInsertOp(2, 'parent-2'));
      merge.merge(createDeleteOp(3, 'parent-2'));

      const result = merge.merge(createMoveOp(4, 'node-1', 'parent-1', 'parent-2'));

      expect(result.apply).toBe(false);
      expect(result.reason).toContain('deleted');
    });
  });

  describe('REORDER_NODE', () => {
    it('applies reorder for existing node', () => {
      merge.merge(createInsertOp(1, 'node-1'));

      const result = merge.merge(createReorderOp(2, 'node-1', 'parent-1'));

      expect(result.apply).toBe(true);
    });

    it('rejects reorder for deleted node', () => {
      merge.merge(createInsertOp(1, 'node-1'));
      merge.merge(createDeleteOp(2, 'node-1'));

      const result = merge.merge(createReorderOp(3, 'node-1', 'parent-1'));

      expect(result.apply).toBe(false);
    });
  });

  describe('mergeAll', () => {
    it('merges operations in timestamp order', () => {
      const ops = [
        createInsertOp(3, 'node-3'),
        createInsertOp(1, 'node-1'),
        createInsertOp(2, 'node-2'),
      ];

      const results = merge.mergeAll(ops);

      expect(results.length).toBe(3);
      expect(results.every(r => r.apply)).toBe(true);
    });

    it('handles interleaved insert and delete', () => {
      const ops = [
        createInsertOp(1, 'node-1'),
        createDeleteOp(2, 'node-1'),
        createSetPropertyOp(3, 'node-1'), // Should fail - node deleted
      ];

      const results = merge.mergeAll(ops);

      expect(results[0]?.apply).toBe(true); // insert
      expect(results[1]?.apply).toBe(true); // delete
      expect(results[2]?.apply).toBe(false); // set property on deleted
    });

    it('returns results for each operation', () => {
      const ops = [
        createInsertOp(1, 'node-1'),
        createInsertOp(2, 'node-2'),
      ];

      const results = merge.mergeAll(ops);

      expect(results.length).toBe(2);
    });
  });

  describe('concurrent scenarios', () => {
    it('handles concurrent inserts to same parent', () => {
      merge.merge(createInsertOp(1, 'parent'));

      const insert1: InsertNodeOperation = {
        ...createInsertOp(2, 'child-1', 'parent'),
        timestamp: createTimestamp(2, 'client-1'),
      };
      const insert2: InsertNodeOperation = {
        ...createInsertOp(3, 'child-2', 'parent'),
        timestamp: createTimestamp(2, 'client-2'),
      };

      const result1 = merge.merge(insert1);
      const result2 = merge.merge(insert2);

      expect(result1.apply).toBe(true);
      expect(result2.apply).toBe(true);
    });

    it('handles concurrent updates to different properties', () => {
      merge.merge(createInsertOp(1, 'node-1'));

      const setProp1 = createSetPropertyOp(2, 'node-1', ['name'], 'client-1');
      const setProp2 = createSetPropertyOp(2, 'node-1', ['x'], 'client-2');

      const result1 = merge.merge(setProp1);
      const result2 = merge.merge(setProp2);

      expect(result1.apply).toBe(true);
      expect(result2.apply).toBe(true);
    });

    it('delete wins over concurrent edit', () => {
      merge.merge(createInsertOp(1, 'node-1'));

      // Concurrent delete and edit
      merge.merge(createDeleteOp(2, 'node-1', 'client-1'));
      const result = merge.merge(createSetPropertyOp(2, 'node-1', ['name'], 'client-2'));

      expect(result.apply).toBe(false);
    });
  });
});
