/**
 * Operation log tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OperationLog, createOperationLog } from '@collaboration/operations/operation-log';
import {
  createTimestamp,
  generateOperationId,
  type InsertNodeOperation,
  type SetPropertyOperation,
  type DeleteNodeOperation,
} from '@collaboration/operations/operation-types';
import type { NodeId } from '@core/types/common';

describe('OperationLog', () => {
  let log: OperationLog;

  const createInsertOp = (counter: number, nodeId: string = 'node-1'): InsertNodeOperation => ({
    id: generateOperationId('client-1'),
    type: 'INSERT_NODE',
    timestamp: createTimestamp(counter, 'client-1'),
    nodeId: nodeId as NodeId,
    nodeType: 'FRAME',
    parentId: 'page-1' as NodeId,
    fractionalIndex: 'a',
    data: { name: 'Test' },
  });

  const createSetPropertyOp = (
    counter: number,
    nodeId: string = 'node-1',
    path: string[] = ['name']
  ): SetPropertyOperation => ({
    id: generateOperationId('client-1'),
    type: 'SET_PROPERTY',
    timestamp: createTimestamp(counter, 'client-1'),
    nodeId: nodeId as NodeId,
    path,
    oldValue: 'old',
    newValue: 'new',
  });

  const createDeleteOp = (counter: number, nodeId: string = 'node-1'): DeleteNodeOperation => ({
    id: generateOperationId('client-1'),
    type: 'DELETE_NODE',
    timestamp: createTimestamp(counter, 'client-1'),
    nodeId: nodeId as NodeId,
  });

  beforeEach(() => {
    log = createOperationLog();
  });

  describe('append', () => {
    it('adds an operation to the log', () => {
      const op = createInsertOp(1);
      log.append(op);

      expect(log.count).toBe(1);
      expect(log.hasOperation(op.id)).toBe(true);
    });

    it('allows appending multiple operations', () => {
      log.append(createInsertOp(1, 'node-1'));
      log.append(createInsertOp(2, 'node-2'));
      log.append(createInsertOp(3, 'node-3'));

      expect(log.count).toBe(3);
    });

    it('updates latest timestamp', () => {
      log.append(createInsertOp(5));

      const latest = log.getLatestTimestamp();
      expect(latest?.counter).toBe(5);
    });
  });

  describe('getOperation', () => {
    it('retrieves operation by ID', () => {
      const op = createInsertOp(1);
      log.append(op);

      const retrieved = log.getOperation(op.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(op.id);
      expect(retrieved?.type).toBe('INSERT_NODE');
    });

    it('returns null for non-existent ID', () => {
      const result = log.getOperation('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getOperationsSince', () => {
    it('returns operations after given timestamp', () => {
      log.append(createInsertOp(1, 'node-1'));
      log.append(createInsertOp(5, 'node-2'));
      log.append(createInsertOp(10, 'node-3'));

      const since = createTimestamp(3, 'client-1');
      const ops = log.getOperationsSince(since);

      expect(ops.length).toBe(2);
      expect(ops[0]?.timestamp.counter).toBe(5);
      expect(ops[1]?.timestamp.counter).toBe(10);
    });

    it('returns empty array when no operations after timestamp', () => {
      log.append(createInsertOp(1));
      log.append(createInsertOp(2));

      const since = createTimestamp(10, 'client-1');
      const ops = log.getOperationsSince(since);

      expect(ops.length).toBe(0);
    });
  });

  describe('getOperationsForNode', () => {
    it('returns all operations for a specific node', () => {
      log.append(createInsertOp(1, 'node-1'));
      log.append(createSetPropertyOp(2, 'node-1'));
      log.append(createInsertOp(3, 'node-2'));
      log.append(createSetPropertyOp(4, 'node-1'));

      const ops = log.getOperationsForNode('node-1' as NodeId);

      expect(ops.length).toBe(3);
      expect(ops.every(op => (op as { nodeId: NodeId }).nodeId === 'node-1')).toBe(true);
    });

    it('returns empty array for unknown node', () => {
      log.append(createInsertOp(1, 'node-1'));

      const ops = log.getOperationsForNode('unknown' as NodeId);

      expect(ops.length).toBe(0);
    });
  });

  describe('getOperationsByType', () => {
    it('returns operations of specified type', () => {
      log.append(createInsertOp(1));
      log.append(createSetPropertyOp(2));
      log.append(createInsertOp(3));
      log.append(createDeleteOp(4));

      const inserts = log.getOperationsByType('INSERT_NODE');

      expect(inserts.length).toBe(2);
      expect(inserts.every(op => op.type === 'INSERT_NODE')).toBe(true);
    });
  });

  describe('getAllOperations', () => {
    it('returns all operations in order', () => {
      log.append(createInsertOp(1, 'node-1'));
      log.append(createInsertOp(2, 'node-2'));
      log.append(createInsertOp(3, 'node-3'));

      const ops = log.getAllOperations();

      expect(ops.length).toBe(3);
    });

    it('returns a copy of the operations array', () => {
      log.append(createInsertOp(1));

      const ops1 = log.getAllOperations();
      const ops2 = log.getAllOperations();

      expect(ops1).not.toBe(ops2);
    });
  });

  describe('compression', () => {
    it('compresses consecutive SET_PROPERTY operations on same path', () => {
      const log = createOperationLog({ enableCompression: true });

      // Add operations with close timestamps from same client
      const op1: SetPropertyOperation = {
        id: 'op-1',
        type: 'SET_PROPERTY',
        timestamp: createTimestamp(1, 'client-1'),
        nodeId: 'node-1' as NodeId,
        path: ['name'],
        oldValue: 'a',
        newValue: 'b',
      };

      const op2: SetPropertyOperation = {
        id: 'op-2',
        type: 'SET_PROPERTY',
        timestamp: createTimestamp(2, 'client-1'),
        nodeId: 'node-1' as NodeId,
        path: ['name'],
        oldValue: 'b',
        newValue: 'c',
      };

      log.append(op1);
      log.append(op2);

      // Should be compressed to single operation
      expect(log.count).toBe(1);

      const ops = log.getAllOperations();
      const compressed = ops[0] as SetPropertyOperation;
      expect(compressed.newValue).toBe('c');
    });

    it('does not compress operations on different paths', () => {
      const log = createOperationLog({ enableCompression: true });

      const op1: SetPropertyOperation = {
        id: 'op-1',
        type: 'SET_PROPERTY',
        timestamp: createTimestamp(1, 'client-1'),
        nodeId: 'node-1' as NodeId,
        path: ['name'],
        oldValue: 'a',
        newValue: 'b',
      };

      const op2: SetPropertyOperation = {
        id: 'op-2',
        type: 'SET_PROPERTY',
        timestamp: createTimestamp(2, 'client-1'),
        nodeId: 'node-1' as NodeId,
        path: ['x'],
        oldValue: 0,
        newValue: 100,
      };

      log.append(op1);
      log.append(op2);

      expect(log.count).toBe(2);
    });

    it('does not compress operations from different clients', () => {
      const log = createOperationLog({ enableCompression: true });

      const op1: SetPropertyOperation = {
        id: 'op-1',
        type: 'SET_PROPERTY',
        timestamp: createTimestamp(1, 'client-1'),
        nodeId: 'node-1' as NodeId,
        path: ['name'],
        oldValue: 'a',
        newValue: 'b',
      };

      const op2: SetPropertyOperation = {
        id: 'op-2',
        type: 'SET_PROPERTY',
        timestamp: createTimestamp(2, 'client-2'),
        nodeId: 'node-1' as NodeId,
        path: ['name'],
        oldValue: 'b',
        newValue: 'c',
      };

      log.append(op1);
      log.append(op2);

      expect(log.count).toBe(2);
    });
  });

  describe('compact', () => {
    it('removes superseded SET_PROPERTY operations', () => {
      // Disable compression to test compact() independently
      const uncompressedLog = createOperationLog({ enableCompression: false });

      uncompressedLog.append(createSetPropertyOp(1, 'node-1', ['name']));
      uncompressedLog.append(createSetPropertyOp(2, 'node-1', ['name']));
      uncompressedLog.append(createSetPropertyOp(3, 'node-1', ['name']));

      expect(uncompressedLog.count).toBe(3);

      uncompressedLog.compact();

      expect(uncompressedLog.count).toBe(1);
      const ops = uncompressedLog.getAllOperations();
      expect(ops[0]?.timestamp.counter).toBe(3);
    });

    it('keeps latest operation for each property path', () => {
      log.append(createSetPropertyOp(1, 'node-1', ['name']));
      log.append(createSetPropertyOp(2, 'node-1', ['x']));
      log.append(createSetPropertyOp(3, 'node-1', ['name']));
      log.append(createSetPropertyOp(4, 'node-1', ['y']));

      log.compact();

      expect(log.count).toBe(3); // Latest for name, x, and y
    });

    it('preserves non-SET_PROPERTY operations', () => {
      log.append(createInsertOp(1));
      log.append(createSetPropertyOp(2));
      log.append(createDeleteOp(3));

      log.compact();

      expect(log.count).toBe(3);
    });
  });

  describe('clear', () => {
    it('removes all operations', () => {
      log.append(createInsertOp(1));
      log.append(createInsertOp(2));
      log.append(createInsertOp(3));

      expect(log.count).toBe(3);

      log.clear();

      expect(log.count).toBe(0);
      expect(log.getLatestTimestamp()).toBeNull();
    });
  });

  describe('toJSON and fromJSON', () => {
    it('exports and imports operations', () => {
      const op1 = createInsertOp(1, 'node-1');
      const op2 = createInsertOp(2, 'node-2');
      log.append(op1);
      log.append(op2);

      const json = log.toJSON();
      expect(json.length).toBe(2);

      const newLog = createOperationLog();
      newLog.fromJSON(json);

      expect(newLog.count).toBe(2);
      expect(newLog.hasOperation(op1.id)).toBe(true);
      expect(newLog.hasOperation(op2.id)).toBe(true);
    });
  });

  describe('trimming', () => {
    it('trims old operations when over limit', () => {
      const log = createOperationLog({ maxInMemory: 5 });

      for (let i = 0; i < 10; i++) {
        log.append(createInsertOp(i, `node-${i}`));
      }

      expect(log.count).toBeLessThanOrEqual(5);
    });

    it('preserves DELETE operations when trimming', () => {
      const log = createOperationLog({ maxInMemory: 3 });

      log.append(createDeleteOp(1, 'node-deleted'));
      log.append(createInsertOp(2, 'node-1'));
      log.append(createInsertOp(3, 'node-2'));
      log.append(createInsertOp(4, 'node-3'));
      log.append(createInsertOp(5, 'node-4'));

      // DELETE should still be present
      const deleteOps = log.getOperationsByType('DELETE_NODE');
      expect(deleteOps.length).toBeGreaterThan(0);
    });
  });
});
