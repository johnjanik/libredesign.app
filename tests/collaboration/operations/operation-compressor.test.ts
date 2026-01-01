/**
 * Operation Compressor tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OperationCompressor,
  createOperationCompressor,
} from '@collaboration/operations/operation-compressor';
import type {
  CompressionConfig,
  OperationBatch,
} from '@collaboration/operations/operation-compressor';
import type {
  Operation,
  SetPropertyOperation,
  InsertNodeOperation,
  DeleteNodeOperation,
  MoveNodeOperation,
  ReorderNodeOperation,
  LamportTimestamp,
} from '@collaboration/operations/operation-types';
import type { NodeId } from '@core/types/common';

// Helper to create operations
const nodeId = (id: string): NodeId => id as unknown as NodeId;
const timestamp = (counter: number, clientId = 'client1'): LamportTimestamp => ({
  counter,
  clientId,
});

const createSetProperty = (
  id: string,
  nid: string,
  path: string[],
  oldValue: unknown,
  newValue: unknown,
  ts: LamportTimestamp
): SetPropertyOperation => ({
  id,
  type: 'SET_PROPERTY',
  nodeId: nodeId(nid),
  path,
  oldValue,
  newValue,
  timestamp: ts,
});

const createInsertNode = (
  id: string,
  nid: string,
  parentId: string,
  ts: LamportTimestamp
): InsertNodeOperation => ({
  id,
  type: 'INSERT_NODE',
  nodeId: nodeId(nid),
  nodeType: 'FRAME',
  parentId: nodeId(parentId),
  fractionalIndex: '0.5',
  data: {},
  timestamp: ts,
});

const createDeleteNode = (
  id: string,
  nid: string,
  ts: LamportTimestamp
): DeleteNodeOperation => ({
  id,
  type: 'DELETE_NODE',
  nodeId: nodeId(nid),
  timestamp: ts,
});

const createMoveNode = (
  id: string,
  nid: string,
  oldParentId: string,
  newParentId: string,
  ts: LamportTimestamp
): MoveNodeOperation => ({
  id,
  type: 'MOVE_NODE',
  nodeId: nodeId(nid),
  oldParentId: nodeId(oldParentId),
  newParentId: nodeId(newParentId),
  fractionalIndex: '0.5',
  timestamp: ts,
});

const createReorderNode = (
  id: string,
  nid: string,
  parentId: string,
  fractionalIndex: string,
  ts: LamportTimestamp
): ReorderNodeOperation => ({
  id,
  type: 'REORDER_NODE',
  nodeId: nodeId(nid),
  parentId: nodeId(parentId),
  fractionalIndex,
  timestamp: ts,
});

describe('OperationCompressor', () => {
  let compressor: OperationCompressor;

  beforeEach(() => {
    compressor = new OperationCompressor();
  });

  describe('initialization', () => {
    it('starts with empty buffer', () => {
      expect(compressor.getBufferSize()).toBe(0);
      expect(compressor.hasBufferedOperations()).toBe(false);
    });
  });

  describe('add', () => {
    it('buffers SET_PROPERTY operations', () => {
      const op = createSetProperty('op1', 'node1', ['x'], 0, 100, timestamp(1));

      const result = compressor.add(op);

      expect(result).toHaveLength(0);
      expect(compressor.hasBufferedOperations()).toBe(true);
    });

    it('compresses consecutive SET_PROPERTY for same path', () => {
      const op1 = createSetProperty('op1', 'node1', ['x'], 0, 50, timestamp(1));
      const op2 = createSetProperty('op2', 'node1', ['x'], 50, 100, timestamp(2));

      compressor.add(op1);
      const result = compressor.add(op2);

      expect(result).toHaveLength(0);
      expect(compressor.getBufferSize()).toBe(1);

      const flushed = compressor.flush();
      expect(flushed).toHaveLength(1);
      expect((flushed[0] as SetPropertyOperation).newValue).toBe(100);
    });

    it('does not compress different paths', () => {
      const op1 = createSetProperty('op1', 'node1', ['x'], 0, 100, timestamp(1));
      const op2 = createSetProperty('op2', 'node1', ['y'], 0, 200, timestamp(2));

      compressor.add(op1);
      compressor.add(op2);

      const flushed = compressor.flush();
      expect(flushed).toHaveLength(2);
    });

    it('does not compress different nodes', () => {
      const op1 = createSetProperty('op1', 'node1', ['x'], 0, 100, timestamp(1));
      const op2 = createSetProperty('op2', 'node2', ['x'], 0, 200, timestamp(2));

      compressor.add(op1);
      compressor.add(op2);

      const flushed = compressor.flush();
      expect(flushed).toHaveLength(2);
    });

    it('does not compress operations from different clients', () => {
      const op1 = createSetProperty('op1', 'node1', ['x'], 0, 100, timestamp(1, 'client1'));
      const op2 = createSetProperty('op2', 'node1', ['x'], 100, 200, timestamp(2, 'client2'));

      compressor.add(op1);
      const flushedFromAdd = compressor.add(op2); // First op gets flushed when second can't compress

      expect(flushedFromAdd).toHaveLength(1);
      expect(flushedFromAdd[0]!.id).toBe('op1');

      const flushed = compressor.flush();
      expect(flushed).toHaveLength(1);
      expect(flushed[0]!.id).toBe('op2');
    });

    it('combines MOVE operations for same node', () => {
      const op1 = createMoveNode('op1', 'node1', 'parent1', 'parent2', timestamp(1));
      const op2 = createMoveNode('op2', 'node1', 'parent2', 'parent3', timestamp(2));

      compressor.add(op1);
      compressor.add(op2);

      const flushed = compressor.flush();
      expect(flushed).toHaveLength(1);

      const move = flushed[0] as MoveNodeOperation;
      expect(move.oldParentId).toBe(nodeId('parent1'));
      expect(move.newParentId).toBe(nodeId('parent3'));
    });

    it('combines REORDER operations for same node', () => {
      const op1 = createReorderNode('op1', 'node1', 'parent1', '0.25', timestamp(1));
      const op2 = createReorderNode('op2', 'node1', 'parent1', '0.75', timestamp(2));

      compressor.add(op1);
      compressor.add(op2);

      const flushed = compressor.flush();
      expect(flushed).toHaveLength(1);

      const reorder = flushed[0] as ReorderNodeOperation;
      expect(reorder.fractionalIndex).toBe('0.75');
    });

    it('passes through INSERT operations', () => {
      const op = createInsertNode('op1', 'node1', 'parent1', timestamp(1));

      compressor.add(op);

      // INSERT flushes property buffer and adds to regular buffer
      expect(compressor.hasBufferedOperations()).toBe(true);
    });

    it('passes through DELETE operations', () => {
      const op = createDeleteNode('op1', 'node1', timestamp(1));

      compressor.add(op);

      expect(compressor.hasBufferedOperations()).toBe(true);
    });
  });

  describe('addAll', () => {
    it('adds multiple operations', () => {
      const ops: Operation[] = [
        createSetProperty('op1', 'node1', ['x'], 0, 50, timestamp(1)),
        createSetProperty('op2', 'node1', ['x'], 50, 100, timestamp(2)),
        createSetProperty('op3', 'node1', ['y'], 0, 200, timestamp(3)),
      ];

      compressor.addAll(ops);
      const flushed = compressor.flush();

      expect(flushed).toHaveLength(2); // x compressed, y separate
    });
  });

  describe('flush', () => {
    it('returns all buffered operations', () => {
      compressor.add(createSetProperty('op1', 'node1', ['x'], 0, 100, timestamp(1)));
      compressor.add(createSetProperty('op2', 'node1', ['y'], 0, 200, timestamp(2)));

      const flushed = compressor.flush();

      expect(flushed).toHaveLength(2);
    });

    it('clears buffers', () => {
      compressor.add(createSetProperty('op1', 'node1', ['x'], 0, 100, timestamp(1)));
      compressor.flush();

      expect(compressor.hasBufferedOperations()).toBe(false);
      expect(compressor.getBufferSize()).toBe(0);
    });
  });

  describe('clear', () => {
    it('clears all buffers', () => {
      compressor.add(createSetProperty('op1', 'node1', ['x'], 0, 100, timestamp(1)));

      compressor.clear();

      expect(compressor.hasBufferedOperations()).toBe(false);
    });
  });

  describe('configuration', () => {
    it('respects maxBufferSize', () => {
      compressor = new OperationCompressor({ maxBufferSize: 2 });

      compressor.add(createInsertNode('op1', 'node1', 'parent1', timestamp(1)));
      const result = compressor.add(createInsertNode('op2', 'node2', 'parent1', timestamp(2)));

      expect(result.length).toBeGreaterThan(0);
    });

    it('can disable move combining', () => {
      compressor = new OperationCompressor({ combineMoves: false });

      compressor.add(createMoveNode('op1', 'node1', 'parent1', 'parent2', timestamp(1)));
      compressor.add(createMoveNode('op2', 'node1', 'parent2', 'parent3', timestamp(2)));

      const flushed = compressor.flush();
      expect(flushed).toHaveLength(2);
    });

    it('can disable reorder combining', () => {
      compressor = new OperationCompressor({ combineReorders: false });

      compressor.add(createReorderNode('op1', 'node1', 'parent1', '0.25', timestamp(1)));
      compressor.add(createReorderNode('op2', 'node1', 'parent1', '0.75', timestamp(2)));

      const flushed = compressor.flush();
      expect(flushed).toHaveLength(2);
    });
  });
});

describe('OperationCompressor.compress (static)', () => {
  it('compresses SET_PROPERTY operations', () => {
    const ops: Operation[] = [
      createSetProperty('op1', 'node1', ['x'], 0, 50, timestamp(1)),
      createSetProperty('op2', 'node1', ['x'], 50, 100, timestamp(2)),
      createSetProperty('op3', 'node1', ['x'], 100, 150, timestamp(3)),
    ];

    const { operations, stats } = OperationCompressor.compress(ops);

    expect(operations).toHaveLength(1);
    expect((operations[0] as SetPropertyOperation).newValue).toBe(150);
    expect(stats.compressedCount).toBe(2);
  });

  it('keeps all INSERT operations', () => {
    const ops: Operation[] = [
      createInsertNode('op1', 'node1', 'parent1', timestamp(1)),
      createInsertNode('op2', 'node2', 'parent1', timestamp(2)),
    ];

    const { operations } = OperationCompressor.compress(ops);

    expect(operations).toHaveLength(2);
  });

  it('prunes operations for deleted nodes', () => {
    const ops: Operation[] = [
      createInsertNode('op1', 'node1', 'parent1', timestamp(1)),
      createSetProperty('op2', 'node1', ['x'], 0, 100, timestamp(2)),
      createSetProperty('op3', 'node1', ['y'], 0, 200, timestamp(3)),
      createDeleteNode('op4', 'node1', timestamp(4)),
    ];

    const { operations, stats } = OperationCompressor.compress(ops);

    // Should have INSERT and DELETE, but not the SET_PROPERTY operations
    expect(operations.filter(op => op.type === 'SET_PROPERTY')).toHaveLength(0);
    expect(stats.prunedCount).toBeGreaterThan(0);
  });

  it('can disable pruning', () => {
    const ops: Operation[] = [
      createSetProperty('op1', 'node1', ['x'], 0, 100, timestamp(1)),
      createDeleteNode('op2', 'node1', timestamp(2)),
    ];

    const { operations } = OperationCompressor.compress(ops, { pruneDeletedNodes: false });

    expect(operations).toHaveLength(2);
  });

  it('combines MOVE operations', () => {
    const ops: Operation[] = [
      createMoveNode('op1', 'node1', 'parent1', 'parent2', timestamp(1)),
      createMoveNode('op2', 'node1', 'parent2', 'parent3', timestamp(2)),
    ];

    const { operations } = OperationCompressor.compress(ops);

    expect(operations).toHaveLength(1);
    const move = operations[0] as MoveNodeOperation;
    expect(move.oldParentId).toBe(nodeId('parent1'));
    expect(move.newParentId).toBe(nodeId('parent3'));
  });

  it('combines REORDER operations', () => {
    const ops: Operation[] = [
      createReorderNode('op1', 'node1', 'parent1', '0.25', timestamp(1)),
      createReorderNode('op2', 'node1', 'parent1', '0.5', timestamp(2)),
      createReorderNode('op3', 'node1', 'parent1', '0.75', timestamp(3)),
    ];

    const { operations } = OperationCompressor.compress(ops);

    expect(operations).toHaveLength(1);
    expect((operations[0] as ReorderNodeOperation).fractionalIndex).toBe('0.75');
  });

  it('returns correct compression stats', () => {
    const ops: Operation[] = [
      createSetProperty('op1', 'node1', ['x'], 0, 50, timestamp(1)),
      createSetProperty('op2', 'node1', ['x'], 50, 100, timestamp(2)),
      createInsertNode('op3', 'node2', 'parent1', timestamp(3)),
    ];

    const { stats } = OperationCompressor.compress(ops);

    expect(stats.inputCount).toBe(3);
    expect(stats.outputCount).toBe(2);
    expect(stats.compressionRatio).toBeLessThan(1);
  });

  it('sorts operations by timestamp', () => {
    const ops: Operation[] = [
      createInsertNode('op3', 'node3', 'parent1', timestamp(3)),
      createInsertNode('op1', 'node1', 'parent1', timestamp(1)),
      createInsertNode('op2', 'node2', 'parent1', timestamp(2)),
    ];

    const { operations } = OperationCompressor.compress(ops);

    expect(operations[0]!.timestamp.counter).toBe(1);
    expect(operations[1]!.timestamp.counter).toBe(2);
    expect(operations[2]!.timestamp.counter).toBe(3);
  });
});

describe('OperationCompressor.createBatch', () => {
  it('creates a batch from operations', () => {
    const ops: Operation[] = [
      createInsertNode('op1', 'node1', 'parent1', timestamp(5)),
      createInsertNode('op2', 'node2', 'parent1', timestamp(10)),
    ];

    const batch = OperationCompressor.createBatch(ops);

    expect(batch.operations).toHaveLength(2);
    expect(batch.baseTimestamp.counter).toBe(5);
    expect(batch.checksum).not.toBe('');
  });

  it('handles empty operations', () => {
    const batch = OperationCompressor.createBatch([]);

    expect(batch.operations).toHaveLength(0);
    expect(batch.checksum).toBe('');
  });

  it('sorts operations in batch', () => {
    const ops: Operation[] = [
      createInsertNode('op2', 'node2', 'parent1', timestamp(10)),
      createInsertNode('op1', 'node1', 'parent1', timestamp(5)),
    ];

    const batch = OperationCompressor.createBatch(ops);

    expect(batch.operations[0]!.timestamp.counter).toBe(5);
    expect(batch.operations[1]!.timestamp.counter).toBe(10);
  });
});

describe('OperationCompressor.verifyBatch', () => {
  it('verifies valid batch', () => {
    const ops: Operation[] = [
      createInsertNode('op1', 'node1', 'parent1', timestamp(1)),
    ];

    const batch = OperationCompressor.createBatch(ops);

    expect(OperationCompressor.verifyBatch(batch)).toBe(true);
  });

  it('rejects tampered batch', () => {
    const ops: Operation[] = [
      createInsertNode('op1', 'node1', 'parent1', timestamp(1)),
    ];

    const batch = OperationCompressor.createBatch(ops);
    const tampered: OperationBatch = {
      ...batch,
      operations: [...batch.operations, createInsertNode('op2', 'node2', 'parent1', timestamp(2))],
    };

    expect(OperationCompressor.verifyBatch(tampered)).toBe(false);
  });
});

describe('OperationCompressor.estimateSize', () => {
  it('estimates size for operations', () => {
    const ops: Operation[] = [
      createInsertNode('op1', 'node1', 'parent1', timestamp(1)),
      createSetProperty('op2', 'node1', ['x'], 0, 100, timestamp(2)),
      createDeleteNode('op3', 'node1', timestamp(3)),
    ];

    const size = OperationCompressor.estimateSize(ops);

    expect(size).toBeGreaterThan(0);
  });

  it('returns 0 for empty operations', () => {
    const size = OperationCompressor.estimateSize([]);

    expect(size).toBe(0);
  });

  it('increases with more data', () => {
    const smallOps: Operation[] = [
      createSetProperty('op1', 'node1', ['x'], 0, 100, timestamp(1)),
    ];

    const largeOps: Operation[] = [
      createSetProperty('op1', 'node1', ['x'], 0, { nested: { data: 'with lots of content'.repeat(10) } }, timestamp(1)),
    ];

    const smallSize = OperationCompressor.estimateSize(smallOps);
    const largeSize = OperationCompressor.estimateSize(largeOps);

    expect(largeSize).toBeGreaterThan(smallSize);
  });
});

describe('createOperationCompressor', () => {
  it('creates an operation compressor', () => {
    const compressor = createOperationCompressor();

    expect(compressor).toBeInstanceOf(OperationCompressor);
  });

  it('accepts configuration', () => {
    const config: CompressionConfig = {
      maxBufferSize: 50,
      pruneDeletedNodes: false,
    };

    const compressor = createOperationCompressor(config);

    expect(compressor).toBeInstanceOf(OperationCompressor);
  });
});
