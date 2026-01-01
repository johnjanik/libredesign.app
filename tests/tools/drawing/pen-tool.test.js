/**
 * Pen tool tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPenTool, } from '@tools/drawing/pen-tool';
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
describe('PenTool', () => {
    let tool;
    let context;
    beforeEach(() => {
        tool = createPenTool();
        context = createMockContext();
        tool.activate(context);
    });
    describe('initialization', () => {
        it('has correct name', () => {
            expect(tool.name).toBe('pen');
        });
        it('has crosshair cursor', () => {
            expect(tool.cursor).toBe('crosshair');
        });
        it('starts in IDLE state', () => {
            expect(tool.getState()).toBe('IDLE');
        });
        it('starts with empty path builder', () => {
            expect(tool.getPathBuilder().anchorCount).toBe(0);
        });
        it('isDrawing returns false initially', () => {
            expect(tool.isDrawing()).toBe(false);
        });
    });
    describe('options', () => {
        it('accepts custom options', () => {
            const customTool = createPenTool({
                closeThreshold: 20,
                handleThreshold: 10,
                strokeWidth: 2,
            });
            expect(customTool).toBeDefined();
        });
    });
    describe('pointer interactions', () => {
        it('transitions to PLACING_ANCHOR on pointer down', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            expect(tool.getState()).toBe('PLACING_ANCHOR');
            expect(tool.getAnchorPosition()).toEqual({ x: 100, y: 100 });
        });
        it('adds corner anchor on click (no drag)', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerUp(createPointerEvent(100, 100), context);
            expect(tool.getState()).toBe('IDLE');
            expect(tool.getPathBuilder().anchorCount).toBe(1);
            expect(tool.isDrawing()).toBe(true);
        });
        it('transitions to DRAGGING_HANDLE when dragged far enough', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerMove(createPointerEvent(120, 100), context); // 20px drag
            expect(tool.getState()).toBe('DRAGGING_HANDLE');
            expect(tool.getHandlePosition()).toEqual({ x: 120, y: 100 });
        });
        it('adds smooth anchor when dragged', () => {
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerMove(createPointerEvent(150, 100), context);
            tool.onPointerUp(createPointerEvent(150, 100), context);
            const builder = tool.getPathBuilder();
            expect(builder.anchorCount).toBe(1);
            const anchor = builder.getAnchor(0);
            expect(anchor?.handleOut).toBeDefined();
            expect(anchor?.handleIn).toBeDefined();
        });
        it('adds multiple anchors with clicks', () => {
            // First click
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(0, 0), context);
            // Second click
            tool.onPointerDown(createPointerEvent(100, 0), context);
            tool.onPointerUp(createPointerEvent(100, 0), context);
            // Third click
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerUp(createPointerEvent(100, 100), context);
            expect(tool.getPathBuilder().anchorCount).toBe(3);
        });
    });
    describe('path closing', () => {
        beforeEach(() => {
            // Add three anchors
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(0, 0), context);
            tool.onPointerDown(createPointerEvent(100, 0), context);
            tool.onPointerUp(createPointerEvent(100, 0), context);
            tool.onPointerDown(createPointerEvent(100, 100), context);
            tool.onPointerUp(createPointerEvent(100, 100), context);
        });
        it('closes path when clicking near first anchor', () => {
            const onComplete = vi.fn();
            tool.setOnPathComplete(onComplete);
            // Click near first anchor (within threshold)
            tool.onPointerDown(createPointerEvent(3, 3), context);
            expect(onComplete).toHaveBeenCalled();
            const path = onComplete.mock.calls[0]?.[0];
            expect(path?.commands.some(cmd => cmd.type === 'Z')).toBe(true);
        });
        it('closes path on Enter key', () => {
            const onComplete = vi.fn();
            tool.setOnPathComplete(onComplete);
            tool.onKeyDown(createKeyEvent('Enter'), context);
            expect(onComplete).toHaveBeenCalled();
        });
        it('does not close with Enter when fewer than 2 anchors', () => {
            const singleAnchorTool = createPenTool();
            singleAnchorTool.activate(context);
            singleAnchorTool.onPointerDown(createPointerEvent(0, 0), context);
            singleAnchorTool.onPointerUp(createPointerEvent(0, 0), context);
            const handled = singleAnchorTool.onKeyDown(createKeyEvent('Enter'), context);
            expect(handled).toBe(false);
        });
    });
    describe('keyboard interactions', () => {
        beforeEach(() => {
            // Add some anchors
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(0, 0), context);
            tool.onPointerDown(createPointerEvent(100, 0), context);
            tool.onPointerUp(createPointerEvent(100, 0), context);
        });
        it('finishes path on Escape', () => {
            const onComplete = vi.fn();
            tool.setOnPathComplete(onComplete);
            tool.onKeyDown(createKeyEvent('Escape'), context);
            expect(onComplete).toHaveBeenCalled();
            expect(tool.isDrawing()).toBe(false);
        });
        it('Escape does nothing when not drawing', () => {
            const freshTool = createPenTool();
            freshTool.activate(context);
            const handled = freshTool.onKeyDown(createKeyEvent('Escape'), context);
            expect(handled).toBe(false);
        });
        it('removes last anchor on Backspace', () => {
            expect(tool.getPathBuilder().anchorCount).toBe(2);
            tool.onKeyDown(createKeyEvent('Backspace'), context);
            expect(tool.getPathBuilder().anchorCount).toBe(1);
        });
        it('removes last anchor on Delete', () => {
            expect(tool.getPathBuilder().anchorCount).toBe(2);
            tool.onKeyDown(createKeyEvent('Delete'), context);
            expect(tool.getPathBuilder().anchorCount).toBe(1);
        });
        it('Backspace does nothing when no anchors', () => {
            const freshTool = createPenTool();
            freshTool.activate(context);
            const handled = freshTool.onKeyDown(createKeyEvent('Backspace'), context);
            expect(handled).toBe(false);
        });
    });
    describe('double click', () => {
        it('finishes path on double click', () => {
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(0, 0), context);
            tool.onPointerDown(createPointerEvent(100, 0), context);
            tool.onPointerUp(createPointerEvent(100, 0), context);
            const onComplete = vi.fn();
            tool.setOnPathComplete(onComplete);
            tool.onDoubleClick(createPointerEvent(100, 0), context);
            expect(onComplete).toHaveBeenCalled();
        });
        it('double click does nothing when not drawing', () => {
            const onComplete = vi.fn();
            tool.setOnPathComplete(onComplete);
            tool.onDoubleClick(createPointerEvent(100, 100), context);
            expect(onComplete).not.toHaveBeenCalled();
        });
    });
    describe('callbacks', () => {
        it('calls onPathComplete with built path', () => {
            const onComplete = vi.fn().mockReturnValue('node-1');
            tool.setOnPathComplete(onComplete);
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(0, 0), context);
            tool.onPointerDown(createPointerEvent(100, 0), context);
            tool.onPointerUp(createPointerEvent(100, 0), context);
            tool.onKeyDown(createKeyEvent('Escape'), context);
            expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
                windingRule: expect.any(String),
                commands: expect.any(Array),
            }));
        });
        it('calls onPreviewUpdate during interactions', () => {
            const onPreview = vi.fn();
            tool.setOnPreviewUpdate(onPreview);
            tool.onPointerDown(createPointerEvent(0, 0), context);
            expect(onPreview).not.toHaveBeenCalled(); // Not called on down
            tool.onPointerMove(createPointerEvent(50, 50), context);
            expect(onPreview).toHaveBeenCalled();
        });
        it('passes path to completion callback', () => {
            const onComplete = vi.fn().mockReturnValue('created-node-id');
            tool.setOnPathComplete(onComplete);
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(0, 0), context);
            tool.onKeyDown(createKeyEvent('Escape'), context);
            // Callback receives the built path
            expect(onComplete).toHaveBeenCalled();
            expect(onComplete.mock.calls[0]?.[0]).toMatchObject({
                windingRule: expect.any(String),
                commands: expect.any(Array),
            });
        });
    });
    describe('activate/deactivate', () => {
        it('resets state on activate', () => {
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(0, 0), context);
            tool.activate(context);
            expect(tool.getState()).toBe('IDLE');
            expect(tool.getPathBuilder().anchorCount).toBe(0);
        });
        it('finishes path on deactivate', () => {
            const onComplete = vi.fn();
            tool.setOnPathComplete(onComplete);
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(0, 0), context);
            tool.deactivate();
            expect(onComplete).toHaveBeenCalled();
        });
    });
    describe('getCursor', () => {
        it('returns crosshair by default', () => {
            expect(tool.getCursor({ x: 50, y: 50 }, context)).toBe('crosshair');
        });
        it('returns pointer when near first anchor (can close)', () => {
            tool.onPointerDown(createPointerEvent(0, 0), context);
            tool.onPointerUp(createPointerEvent(0, 0), context);
            tool.onPointerDown(createPointerEvent(100, 0), context);
            tool.onPointerUp(createPointerEvent(100, 0), context);
            // Near first anchor
            expect(tool.getCursor({ x: 5, y: 5 }, context)).toBe('pointer');
        });
    });
});
//# sourceMappingURL=pen-tool.test.js.map