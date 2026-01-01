/**
 * Smart Animate Matcher Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { NodeData } from '../../../src/scene/nodes/base-node';
import type { NodeId } from '../../../src/core/types/common';
import { matchNodes } from '../../../src/animation/smart-animate/matcher';

// Mock scene graph
const mockSceneGraph = {
  getNode: (id: NodeId) => mockNodes.get(id),
  getChildren: (id: NodeId) => {
    const children: NodeData[] = [];
    for (const [, node] of mockNodes) {
      if ((node as { parentId?: NodeId }).parentId === id) {
        children.push(node);
      }
    }
    return children;
  },
};

let mockNodes: Map<NodeId, NodeData>;

beforeEach(() => {
  mockNodes = new Map();
});

function createMockNode(
  id: NodeId,
  type: string,
  name?: string,
  props: Record<string, unknown> = {}
): NodeData {
  const node = {
    id,
    type,
    name,
    ...props,
  } as NodeData;
  mockNodes.set(id, node);
  return node;
}

describe('matchNodes', () => {
  it('should match nodes by same ID', () => {
    const sourceNodes = [
      createMockNode('node1' as NodeId, 'RECTANGLE', 'Box', { x: 0, y: 0 }),
    ];
    const targetNodes = [
      createMockNode('node1' as NodeId, 'RECTANGLE', 'Box', { x: 100, y: 100 }),
    ];

    const result = matchNodes(sourceNodes, targetNodes, mockSceneGraph as never);

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]!.sourceId).toBe('node1');
    expect(result.matched[0]!.targetId).toBe('node1');
    expect(result.matched[0]!.confidence).toBe('exact');
    expect(result.sourceOnly).toHaveLength(0);
    expect(result.targetOnly).toHaveLength(0);
  });

  it('should match nodes by same name and type', () => {
    const sourceNodes = [
      createMockNode('source1' as NodeId, 'RECTANGLE', 'Button', { x: 0, y: 0 }),
    ];
    const targetNodes = [
      createMockNode('target1' as NodeId, 'RECTANGLE', 'Button', { x: 100, y: 100 }),
    ];

    const result = matchNodes(sourceNodes, targetNodes, mockSceneGraph as never);

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]!.sourceId).toBe('source1');
    expect(result.matched[0]!.targetId).toBe('target1');
    expect(result.matched[0]!.confidence).toBe('high');
  });

  it('should not match nodes with different types', () => {
    const sourceNodes = [
      createMockNode('source1' as NodeId, 'RECTANGLE', 'Shape', { x: 0, y: 0 }),
    ];
    const targetNodes = [
      createMockNode('target1' as NodeId, 'ELLIPSE', 'Shape', { x: 0, y: 0 }),
    ];

    const result = matchNodes(sourceNodes, targetNodes, mockSceneGraph as never);

    expect(result.matched).toHaveLength(0);
    expect(result.sourceOnly).toContain('source1');
    expect(result.targetOnly).toContain('target1');
  });

  it('should match nodes by position when no name match', () => {
    const sourceNodes = [
      createMockNode('source1' as NodeId, 'RECTANGLE', undefined, { x: 100, y: 100, width: 50, height: 50 }),
    ];
    const targetNodes = [
      createMockNode('target1' as NodeId, 'RECTANGLE', undefined, { x: 110, y: 110, width: 50, height: 50 }),
    ];

    const result = matchNodes(sourceNodes, targetNodes, mockSceneGraph as never, {
      positionTolerance: 50,
    });

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]!.confidence).toBe('medium');
  });

  it('should not match nodes too far apart', () => {
    const sourceNodes = [
      createMockNode('source1' as NodeId, 'RECTANGLE', undefined, { x: 0, y: 0 }),
    ];
    const targetNodes = [
      createMockNode('target1' as NodeId, 'RECTANGLE', undefined, { x: 500, y: 500 }),
    ];

    const result = matchNodes(sourceNodes, targetNodes, mockSceneGraph as never, {
      positionTolerance: 50,
    });

    expect(result.matched).toHaveLength(0);
  });

  it('should identify unmatched source nodes (fade out)', () => {
    const sourceNodes = [
      createMockNode('source1' as NodeId, 'RECTANGLE', 'Box1', { x: 0, y: 0 }),
      createMockNode('source2' as NodeId, 'RECTANGLE', 'Box2', { x: 100, y: 0 }),
    ];
    const targetNodes = [
      createMockNode('target1' as NodeId, 'RECTANGLE', 'Box1', { x: 0, y: 0 }),
    ];

    const result = matchNodes(sourceNodes, targetNodes, mockSceneGraph as never);

    expect(result.matched).toHaveLength(1);
    expect(result.sourceOnly).toContain('source2');
    expect(result.targetOnly).toHaveLength(0);
  });

  it('should identify unmatched target nodes (fade in)', () => {
    const sourceNodes = [
      createMockNode('source1' as NodeId, 'RECTANGLE', 'Box1', { x: 0, y: 0 }),
    ];
    const targetNodes = [
      createMockNode('target1' as NodeId, 'RECTANGLE', 'Box1', { x: 0, y: 0 }),
      createMockNode('target2' as NodeId, 'RECTANGLE', 'Box2', { x: 100, y: 0 }),
    ];

    const result = matchNodes(sourceNodes, targetNodes, mockSceneGraph as never);

    expect(result.matched).toHaveLength(1);
    expect(result.sourceOnly).toHaveLength(0);
    expect(result.targetOnly).toContain('target2');
  });

  it('should handle multiple matches with priority', () => {
    // Two rectangles with same name - should pick best match
    const sourceNodes = [
      createMockNode('source1' as NodeId, 'RECTANGLE', 'Item', { x: 0, y: 0, width: 100, height: 100 }),
      createMockNode('source2' as NodeId, 'RECTANGLE', 'Item', { x: 200, y: 0, width: 100, height: 100 }),
    ];
    const targetNodes = [
      createMockNode('target1' as NodeId, 'RECTANGLE', 'Item', { x: 0, y: 0, width: 100, height: 100 }),
      createMockNode('target2' as NodeId, 'RECTANGLE', 'Item', { x: 200, y: 0, width: 100, height: 100 }),
    ];

    const result = matchNodes(sourceNodes, targetNodes, mockSceneGraph as never);

    expect(result.matched).toHaveLength(2);
    expect(result.sourceOnly).toHaveLength(0);
    expect(result.targetOnly).toHaveLength(0);
  });

  it('should respect minimum score threshold', () => {
    const sourceNodes = [
      createMockNode('source1' as NodeId, 'RECTANGLE', undefined, { x: 0, y: 0 }),
    ];
    const targetNodes = [
      // Position close enough that position score passes the 0.3 threshold
      // Distance of 14.14 with tolerance 50 gives posScore = 1 - (14.14/50)^0.5 ≈ 0.47
      createMockNode('target1' as NodeId, 'RECTANGLE', undefined, { x: 10, y: 10 }),
    ];

    // High minScore should reject the match since position score is only ~0.28 after weighting
    const highThreshold = matchNodes(sourceNodes, targetNodes, mockSceneGraph as never, {
      minScore: 0.9,
      positionTolerance: 50,
    });

    expect(highThreshold.matched).toHaveLength(0);

    // Low minScore should accept the match
    const lowThreshold = matchNodes(sourceNodes, targetNodes, mockSceneGraph as never, {
      minScore: 0.1,
      positionTolerance: 50,
    });

    expect(lowThreshold.matched).toHaveLength(1);
  });
});
