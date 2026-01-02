/**
 * Scene graph tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SceneGraph } from '@scene/graph/scene-graph';
describe('SceneGraph', () => {
    let graph;
    beforeEach(() => {
        graph = new SceneGraph();
    });
    describe('createNewDocument', () => {
        it('creates a document with default name', () => {
            const docId = graph.createNewDocument();
            const doc = graph.getDocument();
            expect(doc).not.toBeNull();
            expect(doc?.type).toBe('DOCUMENT');
            expect(doc?.name).toBe('Untitled');
            expect(doc?.id).toBe(docId);
        });
        it('creates a document with custom name', () => {
            graph.createNewDocument('My Document');
            const doc = graph.getDocument();
            expect(doc?.name).toBe('My Document');
        });
        it('creates a first page automatically', () => {
            graph.createNewDocument();
            const pages = graph.getPages();
            expect(pages.length).toBe(1);
            expect(pages[0]?.type).toBe('PAGE');
            expect(pages[0]?.name).toBe('Leaf 1');
        });
        it('emits document:loaded event', () => {
            const handler = vi.fn();
            graph.on('document:loaded', handler);
            graph.createNewDocument();
            expect(handler).toHaveBeenCalled();
        });
        it('clears existing content before creating', () => {
            graph.createNewDocument('First');
            graph.createNewDocument('Second');
            const doc = graph.getDocument();
            expect(doc?.name).toBe('Second');
            expect(graph.nodeCount).toBe(2); // Document + 1 page
        });
    });
    describe('clear', () => {
        it('removes all nodes', () => {
            graph.createNewDocument();
            expect(graph.nodeCount).toBeGreaterThan(0);
            graph.clear();
            expect(graph.nodeCount).toBe(0);
            expect(graph.getDocument()).toBeNull();
        });
        it('emits document:cleared event', () => {
            const handler = vi.fn();
            graph.on('document:cleared', handler);
            graph.clear();
            expect(handler).toHaveBeenCalled();
        });
    });
    describe('node access', () => {
        beforeEach(() => {
            graph.createNewDocument();
        });
        it('getNode returns node by ID', () => {
            const doc = graph.getDocument();
            const retrieved = graph.getNode(doc.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.id).toBe(doc.id);
        });
        it('getNode returns null for non-existent ID', () => {
            const result = graph.getNode('non-existent');
            expect(result).toBeNull();
        });
        it('hasNode returns correct boolean', () => {
            const doc = graph.getDocument();
            expect(graph.hasNode(doc.id)).toBe(true);
            expect(graph.hasNode('non-existent')).toBe(false);
        });
        it('getPages returns all page nodes', () => {
            const pages = graph.getPages();
            expect(pages.length).toBe(1);
            expect(pages.every(p => p.type === 'PAGE')).toBe(true);
        });
    });
    describe('node creation', () => {
        beforeEach(() => {
            graph.createNewDocument();
        });
        it('createFrame creates a frame node', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const frameId = graph.createFrame(pageId, { name: 'Test Frame' });
            const frame = graph.getNode(frameId);
            expect(frame).not.toBeNull();
            expect(frame?.type).toBe('FRAME');
            expect(frame?.name).toBe('Test Frame');
        });
        it('createVector creates a vector node', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const vectorId = graph.createVector(pageId, { name: 'Test Vector' });
            const vector = graph.getNode(vectorId);
            expect(vector?.type).toBe('VECTOR');
        });
        it('createText creates a text node', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const textId = graph.createText(pageId, { name: 'Test Text' });
            const text = graph.getNode(textId);
            expect(text?.type).toBe('TEXT');
        });
        it('emits node:created event', () => {
            const handler = vi.fn();
            graph.on('node:created', handler);
            const pages = graph.getPages();
            graph.createFrame(pages[0].id);
            expect(handler).toHaveBeenCalledWith(expect.objectContaining({ nodeType: 'FRAME' }));
        });
        it('throws when creating document directly', () => {
            const pages = graph.getPages();
            expect(() => {
                graph.createNode('DOCUMENT', pages[0].id);
            }).toThrow('Cannot create document node directly');
        });
        it('creates node at specific position', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            graph.createFrame(pageId, { name: 'Frame 1' });
            graph.createFrame(pageId, { name: 'Frame 2' });
            graph.createNode('FRAME', pageId, 1, { name: 'Inserted' });
            const children = graph.getChildren(pageId);
            expect(children[1]?.name).toBe('Inserted');
        });
    });
    describe('node modification', () => {
        beforeEach(() => {
            graph.createNewDocument();
        });
        it('updateNode modifies node properties', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const frameId = graph.createFrame(pageId, { name: 'Original' });
            graph.updateNode(frameId, { name: 'Updated', x: 100, y: 200 });
            const frame = graph.getNode(frameId);
            expect(frame?.name).toBe('Updated');
            expect(frame.x).toBe(100);
            expect(frame.y).toBe(200);
        });
        it('updateNode emits propertyChanged events', () => {
            const handler = vi.fn();
            graph.on('node:propertyChanged', handler);
            const pages = graph.getPages();
            graph.updateNode(pages[0].id, { name: 'New Name' });
            expect(handler).toHaveBeenCalledWith(expect.objectContaining({
                nodeId: pages[0].id,
                path: ['name'],
                oldValue: 'Leaf 1',
                newValue: 'New Name',
            }));
        });
        it('setProperty sets a single property', () => {
            const pages = graph.getPages();
            graph.setProperty(pages[0].id, 'name', 'New Page Name');
            expect(graph.getNode(pages[0].id)?.name).toBe('New Page Name');
        });
        it('throws when updating non-existent node', () => {
            expect(() => {
                graph.updateNode('non-existent', { name: 'Test' });
            }).toThrow('not found');
        });
    });
    describe('node deletion', () => {
        beforeEach(() => {
            graph.createNewDocument();
        });
        it('deleteNode removes node', () => {
            const pages = graph.getPages();
            const frameId = graph.createFrame(pages[0].id);
            expect(graph.hasNode(frameId)).toBe(true);
            graph.deleteNode(frameId);
            expect(graph.hasNode(frameId)).toBe(false);
        });
        it('deleteNode removes descendants', () => {
            const pages = graph.getPages();
            const frameId = graph.createFrame(pages[0].id);
            const childId = graph.createVector(frameId);
            graph.deleteNode(frameId);
            expect(graph.hasNode(frameId)).toBe(false);
            expect(graph.hasNode(childId)).toBe(false);
        });
        it('emits node:deleted events for all deleted nodes', () => {
            const handler = vi.fn();
            graph.on('node:deleted', handler);
            const pages = graph.getPages();
            const frameId = graph.createFrame(pages[0].id);
            graph.createVector(frameId);
            graph.deleteNode(frameId);
            expect(handler).toHaveBeenCalledTimes(2); // Frame + Vector
        });
    });
    describe('node movement', () => {
        beforeEach(() => {
            graph.createNewDocument();
        });
        it('moveNode changes parent', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const frame1Id = graph.createFrame(pageId, { name: 'Frame 1' });
            const frame2Id = graph.createFrame(pageId, { name: 'Frame 2' });
            const vectorId = graph.createVector(frame1Id);
            expect(graph.getParent(vectorId)?.id).toBe(frame1Id);
            graph.moveNode(vectorId, frame2Id);
            expect(graph.getParent(vectorId)?.id).toBe(frame2Id);
        });
        it('emits node:parentChanged event', () => {
            const handler = vi.fn();
            graph.on('node:parentChanged', handler);
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const frame1Id = graph.createFrame(pageId);
            const frame2Id = graph.createFrame(pageId);
            const vectorId = graph.createVector(frame1Id);
            graph.moveNode(vectorId, frame2Id);
            expect(handler).toHaveBeenCalledWith(expect.objectContaining({
                nodeId: vectorId,
                oldParentId: frame1Id,
                newParentId: frame2Id,
            }));
        });
        it('throws when move would create cycle', () => {
            const pages = graph.getPages();
            const frameId = graph.createFrame(pages[0].id);
            const childId = graph.createFrame(frameId);
            expect(() => {
                graph.moveNode(frameId, childId);
            }).toThrow('cycle');
        });
    });
    describe('reorderNode', () => {
        beforeEach(() => {
            graph.createNewDocument();
        });
        it('emits childrenReordered event', () => {
            const handler = vi.fn();
            graph.on('node:childrenReordered', handler);
            const pages = graph.getPages();
            const pageId = pages[0].id;
            graph.createFrame(pageId, { name: 'Frame 1' });
            graph.createFrame(pageId, { name: 'Frame 2' });
            const frame3 = graph.createFrame(pageId, { name: 'Frame 3' });
            graph.reorderNode(frame3, 0);
            expect(handler).toHaveBeenCalledWith({ parentId: pageId });
        });
        it('maintains all children after reorder', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            graph.createFrame(pageId, { name: 'Frame 1' });
            graph.createFrame(pageId, { name: 'Frame 2' });
            const frame3 = graph.createFrame(pageId, { name: 'Frame 3' });
            graph.reorderNode(frame3, 0);
            const children = graph.getChildren(pageId);
            const names = children.map(c => c.name);
            expect(names).toContain('Frame 1');
            expect(names).toContain('Frame 2');
            expect(names).toContain('Frame 3');
            expect(children.length).toBe(3);
        });
    });
    describe('traversal', () => {
        beforeEach(() => {
            graph.createNewDocument();
        });
        it('traverse visits all nodes depth-first', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const frameId = graph.createFrame(pageId, { name: 'Frame' });
            graph.createVector(frameId, { name: 'Vector' });
            const visited = [];
            graph.traverse((node) => {
                visited.push(node.name);
            });
            expect(visited).toContain('Untitled'); // Document
            expect(visited).toContain('Leaf 1');
            expect(visited).toContain('Frame');
            expect(visited).toContain('Vector');
        });
        it('traverse can start from specific node', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const frameId = graph.createFrame(pageId, { name: 'Frame' });
            graph.createVector(frameId, { name: 'Vector' });
            const visited = [];
            graph.traverse((node) => {
                visited.push(node.name);
            }, frameId);
            expect(visited).not.toContain('Untitled');
            expect(visited).not.toContain('Page 1');
            expect(visited).toContain('Frame');
            expect(visited).toContain('Vector');
        });
        it('traverse can skip subtrees', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const frameId = graph.createFrame(pageId, { name: 'Frame' });
            graph.createVector(frameId, { name: 'Vector' });
            const visited = [];
            graph.traverse((node) => {
                visited.push(node.name);
                if (node.type === 'FRAME')
                    return false; // Skip frame's children
                return undefined;
            });
            expect(visited).toContain('Frame');
            expect(visited).not.toContain('Vector');
        });
    });
    describe('hierarchy queries', () => {
        beforeEach(() => {
            graph.createNewDocument();
        });
        it('getChildren returns children in order', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            graph.createFrame(pageId, { name: 'A' });
            graph.createFrame(pageId, { name: 'B' });
            graph.createFrame(pageId, { name: 'C' });
            const children = graph.getChildren(pageId);
            expect(children.map(c => c.name)).toEqual(['A', 'B', 'C']);
        });
        it('getAncestors returns ancestors from child to root', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const frameId = graph.createFrame(pageId);
            const vectorId = graph.createVector(frameId);
            const ancestors = graph.getAncestors(vectorId);
            expect(ancestors.map(a => a.type)).toEqual(['FRAME', 'PAGE', 'DOCUMENT']);
        });
        it('getDescendants returns all descendants', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const frameId = graph.createFrame(pageId);
            graph.createVector(frameId);
            graph.createText(frameId);
            const descendants = graph.getDescendants(pageId);
            expect(descendants.length).toBe(3); // Frame + Vector + Text
        });
        it('getDepth returns correct depth', () => {
            const doc = graph.getDocument();
            const pages = graph.getPages();
            const frameId = graph.createFrame(pages[0].id);
            const vectorId = graph.createVector(frameId);
            expect(graph.getDepth(doc.id)).toBe(0);
            expect(graph.getDepth(pages[0].id)).toBe(1);
            expect(graph.getDepth(frameId)).toBe(2);
            expect(graph.getDepth(vectorId)).toBe(3);
        });
        it('getCommonAncestor finds common ancestor', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            const frameId = graph.createFrame(pageId);
            const vectorId = graph.createVector(frameId);
            const textId = graph.createText(frameId);
            const common = graph.getCommonAncestor([vectorId, textId]);
            expect(common).toBe(frameId);
        });
    });
    describe('queries', () => {
        beforeEach(() => {
            graph.createNewDocument();
        });
        it('getNodesByType returns nodes of specified type', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            graph.createFrame(pageId);
            graph.createFrame(pageId);
            graph.createVector(pageId);
            const frames = graph.getNodesByType('FRAME');
            expect(frames.length).toBe(2);
            expect(frames.every(n => n.type === 'FRAME')).toBe(true);
        });
        it('findNodes returns matching nodes', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            graph.createFrame(pageId, { name: 'Target' });
            graph.createFrame(pageId, { name: 'Other' });
            const found = graph.findNodes(n => n.name === 'Target');
            expect(found.length).toBe(1);
            expect(found[0]?.name).toBe('Target');
        });
    });
    describe('versioning', () => {
        beforeEach(() => {
            graph.createNewDocument();
        });
        it('getVersion returns global version', () => {
            const v1 = graph.getVersion();
            const pages = graph.getPages();
            graph.createFrame(pages[0].id);
            const v2 = graph.getVersion();
            expect(v2).toBeGreaterThan(v1);
        });
        it('getNodeVersion returns node-specific version', () => {
            const pages = graph.getPages();
            const frameId = graph.createFrame(pages[0].id);
            const v1 = graph.getNodeVersion(frameId);
            graph.updateNode(frameId, { name: 'Updated' });
            const v2 = graph.getNodeVersion(frameId);
            expect(v2).toBeGreaterThan(v1);
        });
    });
    describe('wouldCreateCycle', () => {
        beforeEach(() => {
            graph.createNewDocument();
        });
        it('returns true when move would create cycle', () => {
            const pages = graph.getPages();
            const frameId = graph.createFrame(pages[0].id);
            const childId = graph.createFrame(frameId);
            expect(graph.wouldCreateCycle(frameId, childId)).toBe(true);
        });
        it('returns false for valid move', () => {
            const pages = graph.getPages();
            const frame1 = graph.createFrame(pages[0].id);
            const frame2 = graph.createFrame(pages[0].id);
            expect(graph.wouldCreateCycle(frame1, frame2)).toBe(false);
        });
    });
    describe('canBeChildOf', () => {
        it('returns correct parent-child validity', () => {
            expect(graph.canBeChildOf('PAGE', 'DOCUMENT')).toBe(true);
            expect(graph.canBeChildOf('FRAME', 'PAGE')).toBe(true);
            expect(graph.canBeChildOf('VECTOR', 'FRAME')).toBe(true);
            expect(graph.canBeChildOf('DOCUMENT', 'PAGE')).toBe(false);
            expect(graph.canBeChildOf('PAGE', 'FRAME')).toBe(false);
        });
    });
    describe('serialization', () => {
        it('toJSON returns serializable object', () => {
            graph.createNewDocument('Test Doc');
            const pages = graph.getPages();
            graph.createFrame(pages[0].id, { name: 'Frame' });
            const json = graph.toJSON();
            expect(json).toHaveProperty('version', '1.0.0');
            expect(json).toHaveProperty('nodes');
            expect(typeof json['nodes']).toBe('object');
        });
    });
});
//# sourceMappingURL=scene-graph.test.js.map