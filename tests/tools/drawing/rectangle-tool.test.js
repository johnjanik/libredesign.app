/**
 * Rectangle tool tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRectangleTool, } from '@tools/drawing/rectangle-tool';
// Mock viewport
const createMockViewport = () => ({
    getZoom: () => 1,
    getViewProjectionMatrix: () => [1, 0, 0, 1, 0, 0],
});
// Mock context
const createMockContext = () => ({
    sceneGraph: {},
    viewport: createMockViewport(),
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
describe('RectangleTool', () => {
    let tool;
    let context;
    beforeEach(() => {
        tool = createRectangleTool();
        context = createMockContext();
        tool.activate(context);
    });
    describe('initialization', () => {
        it('has correct name', () => {
            expect(tool.name).toBe('rectangle');
        });
        it('has crosshair cursor', () => {
            expect(tool.cursor).toBe('crosshair');
        });
        it('isDrawing returns false initially', () => {
            expect(tool.isDrawing()).toBe(false);
        });
        it('getPreviewRect returns null initially', () => {
            expect(tool.getPreviewRect()).toBeNull();
        });
    });
    describe('options', () => {
        it('accepts custom options', () => {
            const customTool = createRectangleTool({
                minSize: 5,
                cornerRadius: 10,
                fillColor: { r: 1, g: 0, b: 0, a: 1 },
            });
            expect(customTool).toBeDefined();
        });
    });
    describe('drawing', () => {
        it('starts drawing on pointer down', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            expect(tool.isDrawing()).toBe(true);
        });
        it('updates preview on pointer move', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerMove(createPointerEvent(200, 150), context);
            const rect = tool.getPreviewRect();
            expect(rect).not.toBeNull();
            expect(rect?.x).toBe(100);
            expect(rect?.y).toBe(100);
            expect(rect?.width).toBe(100);
            expect(rect?.height).toBe(50);
        });
        it('completes rectangle on pointer up', () => {
            const onComplete = vi.fn().mockReturnValue('node-1');
            tool.setOnRectComplete(onComplete);
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerMove(createPointerEvent(100, 50), context);
            tool.onPointerUp(createPointerEvent(100, 50), context);
            expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
                x: 0,
                y: 0,
                width: 100,
                height: 50,
            }), 0 // default corner radius
            );
        });
        it('does not create rectangle below minimum size', () => {
            const onComplete = vi.fn();
            tool.setOnRectComplete(onComplete);
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(1, 1), context);
            expect(onComplete).not.toHaveBeenCalled();
        });
        it('resets state after drawing', () => {
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(100, 100), context);
            expect(tool.isDrawing()).toBe(false);
            expect(tool.getPreviewRect()).toBeNull();
        });
    });
    describe('direction handling', () => {
        it('handles top-left to bottom-right drag', () => {
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerMove(createPointerEvent(100, 100), context);
            const rect = tool.getPreviewRect();
            expect(rect).toEqual({ x: 0, y: 0, width: 100, height: 100 });
        });
        it('handles bottom-right to top-left drag', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerMove(createPointerEvent(0, 0), context);
            const rect = tool.getPreviewRect();
            expect(rect).toEqual({ x: 0, y: 0, width: 100, height: 100 });
        });
        it('handles top-right to bottom-left drag', () => {
            tool.onPointerDown(createPointerEvent(100, 0), context);
            tool.onPointerMove(createPointerEvent(0, 100), context);
            const rect = tool.getPreviewRect();
            expect(rect).toEqual({ x: 0, y: 0, width: 100, height: 100 });
        });
    });
    describe('shift key (square constraint)', () => {
        it('constrains to square when shift is held', () => {
            tool.onPointerDown(createPointerEvent(0, 0, { shiftKey: true }), context);
            tool.onPointerMove(createPointerEvent(100, 50, { shiftKey: true }), context);
            const rect = tool.getPreviewRect();
            expect(rect?.width).toBe(100);
            expect(rect?.height).toBe(100); // Constrained to square
        });
        it('updates constraint when shift is pressed mid-drag', () => {
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerMove(createPointerEvent(100, 50), context);
            let rect = tool.getPreviewRect();
            expect(rect?.height).toBe(50);
            tool.onKeyDown(createKeyEvent('Shift'), context);
            tool.onPointerMove(createPointerEvent(100, 50, { shiftKey: true }), context);
            rect = tool.getPreviewRect();
            expect(rect?.width).toBe(rect?.height);
        });
        it('removes constraint when shift is released', () => {
            tool.onPointerDown(createPointerEvent(0, 0, { shiftKey: true }), context);
            tool.onPointerMove(createPointerEvent(100, 50, { shiftKey: true }), context);
            tool.onKeyUp(createKeyEvent('Shift'), context);
            tool.onPointerMove(createPointerEvent(100, 50), context);
            const rect = tool.getPreviewRect();
            expect(rect?.height).toBe(50);
        });
    });
    describe('alt key (draw from center)', () => {
        it('draws from center when alt is held', () => {
            tool.onPointerDown(createPointerEvent(100, 100, { altKey: true }), context);
            tool.onPointerMove(createPointerEvent(150, 125, { altKey: true }), context);
            const rect = tool.getPreviewRect();
            // Width/height should be doubled (50*2 = 100, 25*2 = 50)
            expect(rect?.width).toBe(100);
            expect(rect?.height).toBe(50);
            // Position should be offset by half
            expect(rect?.x).toBe(50);
            expect(rect?.y).toBe(75);
        });
    });
    describe('escape key', () => {
        it('cancels drawing on escape', () => {
            const onPreview = vi.fn();
            tool.setOnPreviewUpdate(onPreview);
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerMove(createPointerEvent(100, 100), context);
            const handled = tool.onKeyDown(createKeyEvent('Escape'), context);
            expect(handled).toBe(true);
            expect(tool.isDrawing()).toBe(false);
            expect(tool.getPreviewRect()).toBeNull();
        });
        it('escape does nothing when not drawing', () => {
            const handled = tool.onKeyDown(createKeyEvent('Escape'), context);
            expect(handled).toBe(false);
        });
    });
    describe('callbacks', () => {
        it('calls onPreviewUpdate during drawing', () => {
            const onPreview = vi.fn();
            tool.setOnPreviewUpdate(onPreview);
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerMove(createPointerEvent(50, 50), context);
            expect(onPreview).toHaveBeenCalled();
        });
        it('stores created node ID', () => {
            const onComplete = vi.fn().mockReturnValue('rect-node-id');
            tool.setOnRectComplete(onComplete);
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(100, 100), context);
            expect(tool.getCreatedNodeId()).toBe('rect-node-id');
        });
    });
    describe('activate/deactivate', () => {
        it('resets state on activate', () => {
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.activate(context);
            expect(tool.isDrawing()).toBe(false);
        });
        it('resets state on deactivate', () => {
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.deactivate();
            expect(tool.isDrawing()).toBe(false);
        });
    });
});
//# sourceMappingURL=rectangle-tool.test.js.map