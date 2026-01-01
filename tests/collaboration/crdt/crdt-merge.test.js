/**
 * CRDT merge tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createCRDTMerge, createCRDTState, } from '@collaboration/crdt/crdt-merge';
import { createTimestamp, } from '@collaboration/operations/operation-types';
describe('CRDTState', () => {
    let state;
    beforeEach(() => {
        state = createCRDTState();
    });
    describe('insertNode', () => {
        it('tracks inserted node', () => {
            state.insertNode('node-1', 'parent-1', 'a');
            const nodeState = state.getNodeState('node-1');
            expect(nodeState).not.toBeNull();
            expect(nodeState?.deleted).toBe(false);
            expect(nodeState?.parentId).toBe('parent-1');
            expect(nodeState?.fractionalIndex).toBe('a');
        });
    });
    describe('deleteNode', () => {
        it('marks node as deleted', () => {
            state.insertNode('node-1', 'parent-1', 'a');
            const timestamp = createTimestamp(1, 'client-1');
            state.deleteNode('node-1', timestamp);
            const nodeState = state.getNodeState('node-1');
            expect(nodeState?.deleted).toBe(true);
            expect(nodeState?.deleteTimestamp).toEqual(timestamp);
        });
    });
    describe('isDeleted', () => {
        it('returns false for non-deleted node', () => {
            state.insertNode('node-1', 'parent-1', 'a');
            expect(state.isDeleted('node-1')).toBe(false);
        });
        it('returns true for deleted node', () => {
            state.insertNode('node-1', 'parent-1', 'a');
            state.deleteNode('node-1', createTimestamp(1, 'client-1'));
            expect(state.isDeleted('node-1')).toBe(true);
        });
        it('returns false for unknown node', () => {
            expect(state.isDeleted('unknown')).toBe(false);
        });
    });
    describe('updateProperty', () => {
        it('tracks property update timestamp', () => {
            state.insertNode('node-1', 'parent-1', 'a');
            const timestamp = createTimestamp(5, 'client-1');
            state.updateProperty('node-1', 'name', timestamp);
            expect(state.getPropertyTimestamp('node-1', 'name')).toEqual(timestamp);
        });
    });
    describe('moveNode', () => {
        it('updates node parent and position', () => {
            state.insertNode('node-1', 'parent-1', 'a');
            state.moveNode('node-1', 'parent-2', 'b');
            const nodeState = state.getNodeState('node-1');
            expect(nodeState?.parentId).toBe('parent-2');
            expect(nodeState?.fractionalIndex).toBe('b');
        });
    });
});
describe('CRDTMerge', () => {
    let merge;
    const createInsertOp = (counter, nodeId, parentId = 'parent-1') => ({
        id: `op-${counter}`,
        type: 'INSERT_NODE',
        timestamp: createTimestamp(counter, 'client-1'),
        nodeId: nodeId,
        nodeType: 'FRAME',
        parentId: parentId,
        fractionalIndex: 'a',
        data: { name: 'Test' },
    });
    const createDeleteOp = (counter, nodeId, clientId = 'client-1') => ({
        id: `op-${counter}`,
        type: 'DELETE_NODE',
        timestamp: createTimestamp(counter, clientId),
        nodeId: nodeId,
    });
    const createSetPropertyOp = (counter, nodeId, path = ['name'], clientId = 'client-1') => ({
        id: `op-${counter}`,
        type: 'SET_PROPERTY',
        timestamp: createTimestamp(counter, clientId),
        nodeId: nodeId,
        path,
        oldValue: 'old',
        newValue: 'new',
    });
    const createMoveOp = (counter, nodeId, oldParentId, newParentId) => ({
        id: `op-${counter}`,
        type: 'MOVE_NODE',
        timestamp: createTimestamp(counter, 'client-1'),
        nodeId: nodeId,
        oldParentId: oldParentId,
        newParentId: newParentId,
        fractionalIndex: 'b',
    });
    const createReorderOp = (counter, nodeId, parentId) => ({
        id: `op-${counter}`,
        type: 'REORDER_NODE',
        timestamp: createTimestamp(counter, 'client-1'),
        nodeId: nodeId,
        parentId: parentId,
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
            expect(merge.getState().getNodeState('node-1')).not.toBeNull();
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
            expect(merge.getState().isDeleted('node-1')).toBe(true);
        });
        it('applies delete for unknown node (tombstone for future inserts)', () => {
            const result = merge.merge(createDeleteOp(1, 'unknown-node'));
            expect(result.apply).toBe(true);
            expect(merge.getState().isDeleted('unknown-node')).toBe(true);
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
            const insert1 = {
                ...createInsertOp(2, 'child-1', 'parent'),
                timestamp: createTimestamp(2, 'client-1'),
            };
            const insert2 = {
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
//# sourceMappingURL=crdt-merge.test.js.map