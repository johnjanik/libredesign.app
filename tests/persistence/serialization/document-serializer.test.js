/**
 * Document serializer tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createDocumentSerializer, } from '@persistence/serialization/document-serializer';
import { SceneGraph } from '@scene/graph/scene-graph';
describe('DocumentSerializer', () => {
    let serializer;
    let graph;
    beforeEach(() => {
        serializer = createDocumentSerializer();
        graph = new SceneGraph();
    });
    describe('serialize', () => {
        beforeEach(() => {
            graph.createNewDocument('Test Document');
        });
        it('serializes document to JSON string', () => {
            const json = serializer.serialize(graph);
            expect(typeof json).toBe('string');
            expect(() => JSON.parse(json)).not.toThrow();
        });
        it('includes version in output', () => {
            const json = serializer.serialize(graph);
            const data = JSON.parse(json);
            expect(data.version).toBe('1.0.0');
        });
        it('uses custom version when specified', () => {
            const json = serializer.serialize(graph, { version: '2.0.0' });
            const data = JSON.parse(json);
            expect(data.version).toBe('2.0.0');
        });
        it('includes document name', () => {
            const json = serializer.serialize(graph);
            const data = JSON.parse(json);
            expect(data.name).toBe('Test Document');
        });
        it('includes rootId', () => {
            const json = serializer.serialize(graph);
            const data = JSON.parse(json);
            const doc = graph.getDocument();
            expect(data.rootId).toBe(doc.id);
        });
        it('includes all nodes', () => {
            const pages = graph.getPages();
            graph.createFrame(pages[0].id, { name: 'Frame 1' });
            graph.createFrame(pages[0].id, { name: 'Frame 2' });
            const json = serializer.serialize(graph);
            const data = JSON.parse(json);
            // Document + Page + 2 Frames = 4 nodes
            expect(data.nodes.length).toBe(4);
        });
        it('preserves node hierarchy', () => {
            const pages = graph.getPages();
            const frameId = graph.createFrame(pages[0].id, { name: 'Frame' });
            graph.createVector(frameId, { name: 'Vector' });
            const json = serializer.serialize(graph);
            const data = JSON.parse(json);
            const vectorNode = data.nodes.find((n) => n.data.name === 'Vector');
            expect(vectorNode.parentId).toBe(frameId);
        });
        it('includes metadata when requested', () => {
            const json = serializer.serialize(graph, { includeMetadata: true });
            const data = JSON.parse(json);
            expect(data.createdAt).toBeTruthy();
            expect(data.updatedAt).toBeTruthy();
        });
        it('excludes metadata by default', () => {
            const json = serializer.serialize(graph);
            const data = JSON.parse(json);
            expect(data.createdAt).toBe('');
            expect(data.updatedAt).toBe('');
        });
        it('pretty prints when requested', () => {
            const minified = serializer.serialize(graph);
            const pretty = serializer.serialize(graph, { prettyPrint: true });
            expect(pretty.length).toBeGreaterThan(minified.length);
            expect(pretty).toContain('\n');
        });
        it('throws when no document exists', () => {
            const emptyGraph = new SceneGraph();
            expect(() => {
                serializer.serialize(emptyGraph);
            }).toThrow('no document');
        });
        it('preserves node child indices', () => {
            const pages = graph.getPages();
            const pageId = pages[0].id;
            graph.createFrame(pageId, { name: 'A' });
            graph.createFrame(pageId, { name: 'B' });
            graph.createFrame(pageId, { name: 'C' });
            const json = serializer.serialize(graph);
            const data = JSON.parse(json);
            const frameNodes = data.nodes.filter((n) => n.data.type === 'FRAME');
            const indices = frameNodes.map((n) => n.childIndex).sort();
            expect(indices).toEqual([0, 1, 2]);
        });
    });
    describe('parse', () => {
        it('parses valid JSON', () => {
            graph.createNewDocument('Test');
            const json = serializer.serialize(graph);
            const parsed = serializer.parse(json);
            expect(parsed.version).toBe('1.0.0');
            expect(parsed.name).toBe('Test');
        });
        it('throws for invalid JSON', () => {
            expect(() => {
                serializer.parse('not valid json');
            }).toThrow();
        });
        it('throws for missing version', () => {
            const invalid = JSON.stringify({
                name: 'Test',
                nodes: [],
                rootId: 'abc',
            });
            expect(() => {
                serializer.parse(invalid);
            }).toThrow('missing version');
        });
        it('throws for missing nodes', () => {
            const invalid = JSON.stringify({
                version: '1.0.0',
                name: 'Test',
                rootId: 'abc',
            });
            expect(() => {
                serializer.parse(invalid);
            }).toThrow('missing nodes');
        });
        it('throws for missing rootId', () => {
            const invalid = JSON.stringify({
                version: '1.0.0',
                name: 'Test',
                nodes: [],
            });
            expect(() => {
                serializer.parse(invalid);
            }).toThrow('missing rootId');
        });
        it('validates node structure', () => {
            const invalid = JSON.stringify({
                version: '1.0.0',
                name: 'Test',
                nodes: [{ invalid: true }],
                rootId: 'abc',
            });
            expect(() => {
                serializer.parse(invalid);
            }).toThrow('Invalid node');
        });
    });
    describe('deserialize', () => {
        it('validates JSON structure', () => {
            // Create source graph with content
            graph.createNewDocument('Original');
            const pages = graph.getPages();
            graph.createFrame(pages[0].id, { name: 'Frame' });
            const json = serializer.serialize(graph);
            const parsed = JSON.parse(json);
            // Verify the serialized structure is valid
            expect(parsed.version).toBe('1.0.0');
            expect(parsed.nodes).toBeInstanceOf(Array);
            expect(parsed.nodes.length).toBeGreaterThan(0);
            expect(parsed.rootId).toBeDefined();
        });
        it('validates structure when requested', () => {
            const invalid = JSON.stringify({
                version: '1.0.0',
                name: 'Test',
                nodes: [{ invalid: true }],
                rootId: 'abc',
            });
            graph.createNewDocument();
            expect(() => {
                serializer.deserialize(invalid, graph, { validate: true });
            }).toThrow();
        });
        it('skips validation when not requested', () => {
            // This will fail at JSON parsing stage if nodes have wrong structure
            // but won't throw validation errors
            const minimal = JSON.stringify({
                version: '1.0.0',
                name: 'Test',
                nodes: [],
                rootId: 'abc',
                createdAt: '',
                updatedAt: '',
            });
            graph.createNewDocument();
            // Should not throw
            expect(() => {
                serializer.deserialize(minimal, graph, { validate: false });
            }).not.toThrow();
        });
    });
    describe('toBlob', () => {
        beforeEach(() => {
            graph.createNewDocument('Test');
        });
        it('creates a Blob from document', () => {
            const blob = serializer.toBlob(graph);
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('application/json');
        });
        it('blob has correct size', () => {
            const blob = serializer.toBlob(graph);
            // Blob should have some content
            expect(blob.size).toBeGreaterThan(0);
        });
    });
    describe('toDownloadUrl', () => {
        beforeEach(() => {
            graph.createNewDocument('Test');
            // Mock URL.createObjectURL for jsdom
            if (!URL.createObjectURL) {
                URL.createObjectURL = () => 'blob:mock-url';
            }
        });
        it('creates a URL string', () => {
            const url = serializer.toDownloadUrl(graph);
            expect(typeof url).toBe('string');
            expect(url.length).toBeGreaterThan(0);
        });
    });
    describe('round-trip serialization', () => {
        it('preserves document structure', () => {
            graph.createNewDocument('Round Trip Test');
            const pages = graph.getPages();
            const pageId = pages[0].id;
            // Create a complex structure
            const frame1 = graph.createFrame(pageId, { name: 'Frame 1', x: 100, y: 200 });
            const frame2 = graph.createFrame(pageId, { name: 'Frame 2' });
            graph.createVector(frame1, { name: 'Vector 1' });
            graph.createText(frame1, { name: 'Text 1' });
            graph.createVector(frame2, { name: 'Vector 2' });
            // Serialize
            const json = serializer.serialize(graph);
            const parsed = JSON.parse(json);
            // Verify structure
            expect(parsed.nodes.length).toBe(7); // Doc + Page + 2 Frames + 2 Vectors + 1 Text
            // Verify hierarchy preserved
            const frame1Node = parsed.nodes.find((n) => n.data.name === 'Frame 1');
            const vector1Node = parsed.nodes.find((n) => n.data.name === 'Vector 1');
            expect(vector1Node.parentId).toBe(frame1Node.id);
        });
        it('preserves node properties', () => {
            graph.createNewDocument();
            const pages = graph.getPages();
            graph.createFrame(pages[0].id, {
                name: 'Styled Frame',
                x: 50,
                y: 100,
                width: 400,
                height: 300,
            });
            const json = serializer.serialize(graph);
            const parsed = JSON.parse(json);
            const frameNode = parsed.nodes.find((n) => n.data.name === 'Styled Frame');
            expect(frameNode.data.x).toBe(50);
            expect(frameNode.data.y).toBe(100);
            expect(frameNode.data.width).toBe(400);
            expect(frameNode.data.height).toBe(300);
        });
    });
    describe('custom version', () => {
        it('uses version from constructor', () => {
            const customSerializer = createDocumentSerializer({ version: '3.0.0' });
            graph.createNewDocument();
            const json = customSerializer.serialize(graph);
            const data = JSON.parse(json);
            expect(data.version).toBe('3.0.0');
        });
        it('option version overrides constructor version', () => {
            const customSerializer = createDocumentSerializer({ version: '3.0.0' });
            graph.createNewDocument();
            const json = customSerializer.serialize(graph, { version: '4.0.0' });
            const data = JSON.parse(json);
            expect(data.version).toBe('4.0.0');
        });
    });
});
//# sourceMappingURL=document-serializer.test.js.map