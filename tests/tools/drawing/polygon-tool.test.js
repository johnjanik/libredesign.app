/**
 * Polygon Tool tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolygonTool, createPolygonTool } from '@tools/drawing/polygon-tool';
// Mock tool context
const createMockContext = () => ({
    sceneGraph: {},
    viewport: {
        getZoom: () => 1,
        getViewProjectionMatrix: () => [1, 0, 0, 1, 0, 0],
    },
    selectedNodeIds: [],
    hoveredNodeId: null,
});
// Create pointer event
const createPointerEvent = (worldX, worldY, options = {}) => ({
    canvasX: worldX,
    canvasY: worldY,
    worldX,
    worldY,
    button: 0,
    buttons: 1,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    ...options,
});
// Create key event
const createKeyEvent = (key, options = {}) => ({
    key,
    code: `Key${key.toUpperCase()}`,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    ...options,
});
describe('PolygonTool', () => {
    let tool;
    let context;
    beforeEach(() => {
        tool = new PolygonTool();
        context = createMockContext();
    });
    describe('initialization', () => {
        it('has correct name', () => {
            expect(tool.name).toBe('polygon');
        });
        it('has crosshair cursor', () => {
            expect(tool.cursor).toBe('crosshair');
        });
        it('defaults to 6 sides', () => {
            expect(tool.getSides()).toBe(6);
        });
        it('starts not drawing', () => {
            expect(tool.isDrawing()).toBe(false);
        });
        it('has no preview polygon initially', () => {
            expect(tool.getPreviewPolygon()).toBeNull();
        });
    });
    describe('custom options', () => {
        it('accepts custom default sides', () => {
            const tool = new PolygonTool({ sides: 8 });
            expect(tool.getSides()).toBe(8);
        });
        it('accepts min/max sides', () => {
            const tool = new PolygonTool({ minSides: 5, maxSides: 10 });
            tool.setSides(3);
            expect(tool.getSides()).toBe(5);
            tool.setSides(15);
            expect(tool.getSides()).toBe(10);
        });
    });
    describe('setSides', () => {
        it('updates side count', () => {
            tool.setSides(5);
            expect(tool.getSides()).toBe(5);
        });
        it('clamps to minimum', () => {
            tool.setSides(2);
            expect(tool.getSides()).toBe(3);
        });
        it('clamps to maximum', () => {
            tool.setSides(100);
            expect(tool.getSides()).toBe(32);
        });
        it('triggers preview update', () => {
            const callback = vi.fn();
            tool.setOnPreviewUpdate(callback);
            tool.setSides(7);
            expect(callback).toHaveBeenCalled();
        });
    });
    describe('pointer events', () => {
        it('starts drawing on pointer down', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            expect(tool.isDrawing()).toBe(true);
        });
        it('updates preview on pointer move', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerMove(createPointerEvent(200, 100), context);
            const polygon = tool.getPreviewPolygon();
            expect(polygon).not.toBeNull();
            expect(polygon.radius).toBeGreaterThan(0);
        });
        it('creates polygon on pointer up', () => {
            const callback = vi.fn().mockReturnValue('node-id');
            tool.setOnPolygonComplete(callback);
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerMove(createPointerEvent(200, 100), context);
            tool.onPointerUp(createPointerEvent(200, 100), context);
            expect(callback).toHaveBeenCalled();
            expect(tool.getCreatedNodeId()).toBe('node-id');
        });
        it('respects minimum size', () => {
            const callback = vi.fn();
            tool.setOnPolygonComplete(callback);
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerUp(createPointerEvent(100.5, 100.5), context);
            expect(callback).not.toHaveBeenCalled();
        });
        it('resets after pointer up', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerUp(createPointerEvent(200, 100), context);
            expect(tool.isDrawing()).toBe(false);
            expect(tool.getPreviewPolygon()).toBeNull();
        });
    });
    describe('keyboard events', () => {
        it('cancels on Escape', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            const handled = tool.onKeyDown(createKeyEvent('Escape'), context);
            expect(handled).toBe(true);
            expect(tool.isDrawing()).toBe(false);
        });
        it('increases sides with ArrowUp', () => {
            const initial = tool.getSides();
            const handled = tool.onKeyDown(createKeyEvent('ArrowUp'), context);
            expect(handled).toBe(true);
            expect(tool.getSides()).toBe(initial + 1);
        });
        it('increases sides with ArrowRight', () => {
            const initial = tool.getSides();
            tool.onKeyDown(createKeyEvent('ArrowRight'), context);
            expect(tool.getSides()).toBe(initial + 1);
        });
        it('decreases sides with ArrowDown', () => {
            const initial = tool.getSides();
            tool.onKeyDown(createKeyEvent('ArrowDown'), context);
            expect(tool.getSides()).toBe(initial - 1);
        });
        it('decreases sides with ArrowLeft', () => {
            const initial = tool.getSides();
            tool.onKeyDown(createKeyEvent('ArrowLeft'), context);
            expect(tool.getSides()).toBe(initial - 1);
        });
        it('sets sides with number keys', () => {
            tool.onKeyDown(createKeyEvent('5'), context);
            expect(tool.getSides()).toBe(5);
            tool.onKeyDown(createKeyEvent('3'), context);
            expect(tool.getSides()).toBe(3);
        });
        it('constrains rotation with Shift', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onKeyDown(createKeyEvent('Shift', { shiftKey: true }), context);
            // Further verification would require checking actual rotation snapping
        });
        it('releases Shift constraint on key up', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onKeyDown(createKeyEvent('Shift', { shiftKey: true }), context);
            tool.onKeyUp(createKeyEvent('Shift', { shiftKey: false }), context);
            // Constraint should be released
        });
    });
    describe('draw from center (Alt)', () => {
        it('draws from center when Alt is held', () => {
            tool.onPointerDown(createPointerEvent(100, 100, { altKey: true }), context);
            tool.onPointerMove(createPointerEvent(150, 100, { altKey: true }), context);
            const polygon = tool.getPreviewPolygon();
            expect(polygon).not.toBeNull();
            expect(polygon.center.x).toBe(100);
            expect(polygon.center.y).toBe(100);
        });
        it('draws from edge by default', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerMove(createPointerEvent(200, 100), context);
            const polygon = tool.getPreviewPolygon();
            expect(polygon).not.toBeNull();
            expect(polygon.center.x).toBe(150); // Midpoint
        });
    });
    describe('polygon calculation', () => {
        it('calculates correct vertices', () => {
            tool.setSides(4); // Square
            tool.onPointerDown(createPointerEvent(0, 0, { altKey: true }), context);
            tool.onPointerMove(createPointerEvent(100, 0, { altKey: true }), context);
            const polygon = tool.getPreviewPolygon();
            expect(polygon).not.toBeNull();
            expect(polygon.vertices.length).toBe(4);
            expect(polygon.radius).toBe(100);
        });
        it('calculates correct bounding box', () => {
            tool.setSides(4);
            tool.onPointerDown(createPointerEvent(100, 100, { altKey: true }), context);
            tool.onPointerMove(createPointerEvent(200, 100), context);
            const polygon = tool.getPreviewPolygon();
            expect(polygon).not.toBeNull();
            expect(polygon.bounds.width).toBeGreaterThan(0);
            expect(polygon.bounds.height).toBeGreaterThan(0);
        });
        it('includes all vertices in bounds', () => {
            tool.setSides(6);
            tool.onPointerDown(createPointerEvent(100, 100, { altKey: true }), context);
            tool.onPointerMove(createPointerEvent(200, 100), context);
            const polygon = tool.getPreviewPolygon();
            expect(polygon).not.toBeNull();
            for (const vertex of polygon.vertices) {
                expect(vertex.x).toBeGreaterThanOrEqual(polygon.bounds.x);
                expect(vertex.x).toBeLessThanOrEqual(polygon.bounds.x + polygon.bounds.width);
                expect(vertex.y).toBeGreaterThanOrEqual(polygon.bounds.y);
                expect(vertex.y).toBeLessThanOrEqual(polygon.bounds.y + polygon.bounds.height);
            }
        });
    });
    describe('activation/deactivation', () => {
        it('resets on activation', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.activate(context);
            expect(tool.isDrawing()).toBe(false);
        });
        it('resets on deactivation', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.deactivate();
            expect(tool.isDrawing()).toBe(false);
        });
    });
    describe('render', () => {
        it('renders preview polygon', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerMove(createPointerEvent(200, 100), context);
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                setTransform: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                closePath: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                arc: vi.fn(),
                fillText: vi.fn(),
                setLineDash: vi.fn(),
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 1,
                font: '',
                textAlign: '',
            };
            tool.render(mockCtx, context);
            expect(mockCtx.beginPath).toHaveBeenCalled();
            expect(mockCtx.moveTo).toHaveBeenCalled();
            expect(mockCtx.lineTo).toHaveBeenCalled();
            expect(mockCtx.closePath).toHaveBeenCalled();
        });
        it('does not render when not drawing', () => {
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
            };
            tool.render(mockCtx, context);
            expect(mockCtx.save).not.toHaveBeenCalled();
        });
    });
    describe('static methods', () => {
        describe('generateSVGPath', () => {
            it('generates valid SVG path', () => {
                const polygon = {
                    center: { x: 100, y: 100 },
                    radius: 50,
                    sides: 3,
                    rotation: 0,
                    vertices: [
                        { x: 150, y: 100 },
                        { x: 75, y: 143.3 },
                        { x: 75, y: 56.7 },
                    ],
                    bounds: { x: 75, y: 56.7, width: 75, height: 86.6 },
                };
                const path = PolygonTool.generateSVGPath(polygon);
                expect(path).toContain('M 150 100');
                expect(path).toContain('L');
                expect(path).toContain('Z');
            });
            it('handles empty vertices', () => {
                const polygon = {
                    center: { x: 0, y: 0 },
                    radius: 0,
                    sides: 0,
                    rotation: 0,
                    vertices: [],
                    bounds: { x: 0, y: 0, width: 0, height: 0 },
                };
                const path = PolygonTool.generateSVGPath(polygon);
                expect(path).toBe('');
            });
        });
        describe('triangulate', () => {
            it('generates correct index count for triangle', () => {
                const indices = PolygonTool.triangulate(3);
                expect(indices.length).toBe(9); // 3 triangles * 3 indices
            });
            it('generates correct index count for hexagon', () => {
                const indices = PolygonTool.triangulate(6);
                expect(indices.length).toBe(18); // 6 triangles * 3 indices
            });
            it('uses center vertex for fan triangulation', () => {
                const indices = PolygonTool.triangulate(4);
                // Each triangle should include the center vertex (index 4)
                for (let i = 0; i < indices.length; i += 3) {
                    expect([indices[i], indices[i + 1], indices[i + 2]]).toContain(4);
                }
            });
        });
        describe('generateVertexBuffer', () => {
            it('includes all vertices plus center', () => {
                const polygon = {
                    center: { x: 100, y: 100 },
                    radius: 50,
                    sides: 4,
                    rotation: 0,
                    vertices: [
                        { x: 150, y: 100 },
                        { x: 100, y: 150 },
                        { x: 50, y: 100 },
                        { x: 100, y: 50 },
                    ],
                    bounds: { x: 50, y: 50, width: 100, height: 100 },
                };
                const buffer = PolygonTool.generateVertexBuffer(polygon);
                expect(buffer.length).toBe((4 + 1) * 2); // 4 perimeter + 1 center, 2 components each
            });
            it('places center at the end', () => {
                const polygon = {
                    center: { x: 100, y: 200 },
                    radius: 50,
                    sides: 3,
                    rotation: 0,
                    vertices: [
                        { x: 150, y: 200 },
                        { x: 75, y: 243.3 },
                        { x: 75, y: 156.7 },
                    ],
                    bounds: { x: 75, y: 156.7, width: 75, height: 86.6 },
                };
                const buffer = PolygonTool.generateVertexBuffer(polygon);
                // Last two values should be center coordinates
                expect(buffer[buffer.length - 2]).toBe(100);
                expect(buffer[buffer.length - 1]).toBe(200);
            });
        });
    });
});
describe('createPolygonTool', () => {
    it('creates a polygon tool', () => {
        const tool = createPolygonTool();
        expect(tool).toBeInstanceOf(PolygonTool);
        expect(tool.getSides()).toBe(6);
    });
    it('accepts options', () => {
        const tool = createPolygonTool({ sides: 5 });
        expect(tool.getSides()).toBe(5);
    });
});
//# sourceMappingURL=polygon-tool.test.js.map