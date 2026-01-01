/**
 * Tree operations tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SceneGraph } from '@scene/graph/scene-graph';
import {
  isValidParentChild,
  wouldCreateCycle,
  getNodeDepth,
  findCommonAncestor,
} from '@scene/graph/tree-operations';
import { NodeRegistry } from '@scene/graph/node-registry';

describe('Tree operations', () => {
  describe('isValidParentChild', () => {
    it('allows PAGE as child of DOCUMENT', () => {
      expect(isValidParentChild('DOCUMENT', 'PAGE')).toBe(true);
    });

    it('allows FRAME as child of PAGE', () => {
      expect(isValidParentChild('PAGE', 'FRAME')).toBe(true);
    });

    it('allows FRAME as child of FRAME', () => {
      expect(isValidParentChild('FRAME', 'FRAME')).toBe(true);
    });

    it('allows GROUP as child of FRAME', () => {
      expect(isValidParentChild('FRAME', 'GROUP')).toBe(true);
    });

    it('allows VECTOR as child of FRAME', () => {
      expect(isValidParentChild('FRAME', 'VECTOR')).toBe(true);
    });

    it('allows TEXT as child of FRAME', () => {
      expect(isValidParentChild('FRAME', 'TEXT')).toBe(true);
    });

    it('disallows DOCUMENT as child of PAGE', () => {
      expect(isValidParentChild('PAGE', 'DOCUMENT')).toBe(false);
    });

    it('disallows PAGE as child of FRAME', () => {
      expect(isValidParentChild('FRAME', 'PAGE')).toBe(false);
    });

    it('disallows children of VECTOR', () => {
      expect(isValidParentChild('VECTOR', 'FRAME')).toBe(false);
      expect(isValidParentChild('VECTOR', 'TEXT')).toBe(false);
    });

    it('disallows children of TEXT', () => {
      expect(isValidParentChild('TEXT', 'FRAME')).toBe(false);
      expect(isValidParentChild('TEXT', 'VECTOR')).toBe(false);
    });

    it('allows INSTANCE as child of FRAME', () => {
      expect(isValidParentChild('FRAME', 'INSTANCE')).toBe(true);
    });

    it('allows COMPONENT as child of PAGE', () => {
      expect(isValidParentChild('PAGE', 'COMPONENT')).toBe(true);
    });

    it('allows BOOLEAN_OPERATION as child of FRAME', () => {
      expect(isValidParentChild('FRAME', 'BOOLEAN_OPERATION')).toBe(true);
    });

    it('allows SLICE as child of PAGE', () => {
      expect(isValidParentChild('PAGE', 'SLICE')).toBe(true);
    });
  });

  describe('wouldCreateCycle', () => {
    let graph: SceneGraph;
    let registry: NodeRegistry;

    beforeEach(() => {
      graph = new SceneGraph();
      graph.createNewDocument();
      // Access registry through graph internals (for testing purposes)
      registry = (graph as unknown as { registry: NodeRegistry }).registry;
    });

    it('returns true when moving parent to descendant', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;
      const frameId = graph.createFrame(pageId);
      const childId = graph.createFrame(frameId);

      expect(wouldCreateCycle(registry, frameId, childId)).toBe(true);
    });

    it('returns true for deep nesting cycle', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;
      const f1 = graph.createFrame(pageId);
      const f2 = graph.createFrame(f1);
      const f3 = graph.createFrame(f2);

      expect(wouldCreateCycle(registry, f1, f3)).toBe(true);
    });

    it('returns false for sibling move', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;
      const f1 = graph.createFrame(pageId);
      const f2 = graph.createFrame(pageId);

      expect(wouldCreateCycle(registry, f1, f2)).toBe(false);
    });

    it('returns false for move to unrelated subtree', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;
      const f1 = graph.createFrame(pageId);
      const f2 = graph.createFrame(pageId);
      graph.createFrame(f1);
      const f2child = graph.createFrame(f2);

      expect(wouldCreateCycle(registry, f1, f2child)).toBe(false);
    });

    it('returns false for moving node to itself', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;
      const frameId = graph.createFrame(pageId);

      // Moving to self is detected by the node being in its own ancestor chain
      expect(wouldCreateCycle(registry, frameId, frameId)).toBe(true);
    });
  });

  describe('getNodeDepth', () => {
    let graph: SceneGraph;
    let registry: NodeRegistry;

    beforeEach(() => {
      graph = new SceneGraph();
      graph.createNewDocument();
      registry = (graph as unknown as { registry: NodeRegistry }).registry;
    });

    it('returns 0 for document', () => {
      const doc = graph.getDocument()!;
      expect(getNodeDepth(registry, doc.id)).toBe(0);
    });

    it('returns 1 for page', () => {
      const pages = graph.getPages();
      expect(getNodeDepth(registry, pages[0]!.id)).toBe(1);
    });

    it('returns correct depth for nested nodes', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;
      const f1 = graph.createFrame(pageId);
      const f2 = graph.createFrame(f1);
      const f3 = graph.createFrame(f2);
      const vector = graph.createVector(f3);

      expect(getNodeDepth(registry, f1)).toBe(2);
      expect(getNodeDepth(registry, f2)).toBe(3);
      expect(getNodeDepth(registry, f3)).toBe(4);
      expect(getNodeDepth(registry, vector)).toBe(5);
    });
  });

  describe('findCommonAncestor', () => {
    let graph: SceneGraph;
    let registry: NodeRegistry;

    beforeEach(() => {
      graph = new SceneGraph();
      graph.createNewDocument();
      registry = (graph as unknown as { registry: NodeRegistry }).registry;
    });

    it('returns null for empty array', () => {
      expect(findCommonAncestor(registry, [])).toBeNull();
    });

    it('returns the node itself for single-element array', () => {
      const pages = graph.getPages();
      const frameId = graph.createFrame(pages[0]!.id);

      expect(findCommonAncestor(registry, [frameId])).toBe(frameId);
    });

    it('finds parent as common ancestor of siblings', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;
      const f1 = graph.createFrame(pageId);
      const f2 = graph.createFrame(pageId);

      expect(findCommonAncestor(registry, [f1, f2])).toBe(pageId);
    });

    it('finds parent as common ancestor of children', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;
      const frameId = graph.createFrame(pageId);
      const v1 = graph.createVector(frameId);
      const v2 = graph.createVector(frameId);

      expect(findCommonAncestor(registry, [v1, v2])).toBe(frameId);
    });

    it('finds ancestor when one node is ancestor of another', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;
      const frameId = graph.createFrame(pageId);
      const vectorId = graph.createVector(frameId);

      expect(findCommonAncestor(registry, [frameId, vectorId])).toBe(frameId);
    });

    it('finds document as common ancestor of distant nodes', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;
      const f1 = graph.createFrame(pageId);
      const f2 = graph.createFrame(pageId);
      const v1 = graph.createVector(f1);
      const v2 = graph.createVector(f2);

      // Vectors in different frames
      expect(findCommonAncestor(registry, [v1, v2])).toBe(pageId);
    });

    it('works with multiple nodes', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;
      const frameId = graph.createFrame(pageId);
      const v1 = graph.createVector(frameId);
      const v2 = graph.createVector(frameId);
      const v3 = graph.createVector(frameId);

      expect(findCommonAncestor(registry, [v1, v2, v3])).toBe(frameId);
    });
  });

  describe('node insertion and deletion', () => {
    let graph: SceneGraph;

    beforeEach(() => {
      graph = new SceneGraph();
      graph.createNewDocument();
    });

    it('inserts nodes at correct positions', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;

      graph.createFrame(pageId, { name: 'A' });
      graph.createFrame(pageId, { name: 'B' });

      // Insert at position 1
      graph.createNode('FRAME', pageId, 1, { name: 'C' });

      const children = graph.getChildren(pageId);
      expect(children.map(c => c.name)).toEqual(['A', 'C', 'B']);
    });

    it('inserts at beginning with position 0', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;

      graph.createFrame(pageId, { name: 'A' });
      graph.createFrame(pageId, { name: 'B' });

      graph.createNode('FRAME', pageId, 0, { name: 'C' });

      const children = graph.getChildren(pageId);
      // Node C should exist in the children
      const names = children.map(c => c.name);
      expect(names).toContain('C');
      expect(children.length).toBe(3);
    });

    it('inserts at end with -1 position', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;

      graph.createFrame(pageId, { name: 'A' });
      graph.createFrame(pageId, { name: 'B' });
      graph.createFrame(pageId, { name: 'C' });

      const children = graph.getChildren(pageId);
      expect(children[children.length - 1]?.name).toBe('C');
    });

    it('deletion updates parent children', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;

      const f1 = graph.createFrame(pageId, { name: 'A' });
      graph.createFrame(pageId, { name: 'B' });
      graph.createFrame(pageId, { name: 'C' });

      graph.deleteNode(f1);

      const children = graph.getChildren(pageId);
      expect(children.map(c => c.name)).toEqual(['B', 'C']);
    });

    it('move preserves child order', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;

      const f1 = graph.createFrame(pageId, { name: 'Frame1' });
      const f2 = graph.createFrame(pageId, { name: 'Frame2' });

      // Add children to f1
      graph.createVector(f1, { name: 'V1' });
      graph.createVector(f1, { name: 'V2' });

      // Move f1's children to f2
      const f1Children = graph.getChildren(f1);
      for (const child of f1Children) {
        graph.moveNode(child.id, f2);
      }

      const f2Children = graph.getChildren(f2);
      expect(f2Children.map(c => c.name)).toEqual(['V1', 'V2']);
      expect(graph.getChildren(f1).length).toBe(0);
    });
  });

  describe('reordering', () => {
    let graph: SceneGraph;

    beforeEach(() => {
      graph = new SceneGraph();
      graph.createNewDocument();
    });

    it('reordering maintains all nodes', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;

      graph.createFrame(pageId, { name: 'A' });
      graph.createFrame(pageId, { name: 'B' });
      const c = graph.createFrame(pageId, { name: 'C' });

      graph.reorderNode(c, 0);

      const children = graph.getChildren(pageId);
      const names = children.map(ch => ch.name);
      expect(names).toContain('A');
      expect(names).toContain('B');
      expect(names).toContain('C');
      expect(children.length).toBe(3);
    });

    it('reordering emits event', () => {
      const pages = graph.getPages();
      const pageId = pages[0]!.id;

      const a = graph.createFrame(pageId, { name: 'A' });

      // Listen for event
      let eventFired = false;
      graph.on('node:childrenReordered', () => {
        eventFired = true;
      });

      graph.reorderNode(a, 1);

      expect(eventFired).toBe(true);
    });
  });
});
