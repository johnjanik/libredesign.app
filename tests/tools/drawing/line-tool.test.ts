/**
 * Line tool tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LineTool,
  createLineTool,
} from '@tools/drawing/line-tool';
import type { ToolContext, PointerEventData, KeyEventData } from '@tools/base/tool';

// Mock viewport
const createMockViewport = () => ({
  getZoom: () => 1,
  getViewProjectionMatrix: () => [1, 0, 0, 1, 0, 0] as number[],
});

// Mock context
const createMockContext = (): ToolContext => ({
  sceneGraph: {} as ToolContext['sceneGraph'],
  viewport: createMockViewport() as unknown as ToolContext['viewport'],
  selectedNodeIds: [],
  hoveredNodeId: null,
});

// Create pointer event
const createPointerEvent = (
  worldX: number,
  worldY: number,
  options: Partial<PointerEventData> = {}
): PointerEventData => ({
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
const createKeyEvent = (key: string, options: Partial<KeyEventData> = {}): KeyEventData => ({
  key,
  code: `Key${key.toUpperCase()}`,
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  repeat: false,
  ...options,
});

describe('LineTool', () => {
  let tool: LineTool;
  let context: ToolContext;

  beforeEach(() => {
    tool = createLineTool();
    context = createMockContext();
    tool.activate(context);
  });

  describe('initialization', () => {
    it('has correct name', () => {
      expect(tool.name).toBe('line');
    });

    it('has crosshair cursor', () => {
      expect(tool.cursor).toBe('crosshair');
    });

    it('isDrawing returns false initially', () => {
      expect(tool.isDrawing()).toBe(false);
    });

    it('getLinePoints returns null initially', () => {
      expect(tool.getLinePoints()).toBeNull();
    });
  });

  describe('options', () => {
    it('accepts custom options', () => {
      const customTool = createLineTool({
        minLength: 5,
        strokeWidth: 2,
        strokeColor: { r: 1, g: 0, b: 0, a: 1 },
      });

      expect(customTool).toBeDefined();
    });
  });

  describe('drawing', () => {
    it('starts drawing on pointer down', () => {
      tool.onPointerDown(createPointerEvent(100, 100), context);

      expect(tool.isDrawing()).toBe(true);
    });

    it('updates line points on pointer move', () => {
      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerMove(createPointerEvent(100, 50), context);

      const points = tool.getLinePoints();
      expect(points).not.toBeNull();
      expect(points?.start).toEqual({ x: 0, y: 0 });
      expect(points?.end).toEqual({ x: 100, y: 50 });
    });

    it('completes line on pointer up', () => {
      const onComplete = vi.fn().mockReturnValue('node-1');
      tool.setOnLineComplete(onComplete);

      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerMove(createPointerEvent(100, 0), context);
      tool.onPointerUp(createPointerEvent(100, 0), context);

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          windingRule: 'NONZERO',
          commands: expect.any(Array),
        }),
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      );
    });

    it('creates path with MoveTo and LineTo', () => {
      const onComplete = vi.fn().mockReturnValue('node-1');
      tool.setOnLineComplete(onComplete);

      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerUp(createPointerEvent(100, 50), context);

      const path = onComplete.mock.calls[0]?.[0];
      expect(path.commands).toHaveLength(2);
      expect(path.commands[0]).toEqual({ type: 'M', x: 0, y: 0 });
      expect(path.commands[1]).toEqual({ type: 'L', x: 100, y: 50 });
    });

    it('does not create line below minimum length', () => {
      const onComplete = vi.fn();
      tool.setOnLineComplete(onComplete);

      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerUp(createPointerEvent(1, 0), context);

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('resets state after drawing', () => {
      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerUp(createPointerEvent(100, 100), context);

      expect(tool.isDrawing()).toBe(false);
      expect(tool.getLinePoints()).toBeNull();
    });
  });

  describe('shift key (angle constraint)', () => {
    it('constrains to horizontal when shift is held', () => {
      tool.onPointerDown(createPointerEvent(0, 0, { shiftKey: true }), context);
      tool.onPointerMove(createPointerEvent(100, 10, { shiftKey: true }), context);

      const points = tool.getLinePoints();
      expect(points?.end.y).toBeCloseTo(0, 5); // Snapped to horizontal
    });

    it('constrains to vertical when shift is held', () => {
      tool.onPointerDown(createPointerEvent(0, 0, { shiftKey: true }), context);
      tool.onPointerMove(createPointerEvent(10, 100, { shiftKey: true }), context);

      const points = tool.getLinePoints();
      expect(points?.end.x).toBeCloseTo(0, 5); // Snapped to vertical
    });

    it('constrains to 45 degrees when shift is held', () => {
      tool.onPointerDown(createPointerEvent(0, 0, { shiftKey: true }), context);
      tool.onPointerMove(createPointerEvent(100, 90, { shiftKey: true }), context);

      const points = tool.getLinePoints();
      // At 45 degrees, x and y should be equal in magnitude
      expect(Math.abs(points!.end.x)).toBeCloseTo(Math.abs(points!.end.y), 5);
    });

    it('updates constraint when shift is pressed', () => {
      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerMove(createPointerEvent(100, 30), context);

      let points = tool.getLinePoints();
      expect(points?.end.y).toBe(30);

      tool.onKeyDown(createKeyEvent('Shift'), context);
      tool.onPointerMove(createPointerEvent(100, 30, { shiftKey: true }), context);

      points = tool.getLinePoints();
      // Should snap to nearest angle (0, 45, 90, etc.)
      expect(points?.end.y).not.toBe(30);
    });

    it('removes constraint when shift is released', () => {
      tool.onPointerDown(createPointerEvent(0, 0, { shiftKey: true }), context);
      tool.onPointerMove(createPointerEvent(100, 30, { shiftKey: true }), context);

      tool.onKeyUp(createKeyEvent('Shift'), context);
      tool.onPointerMove(createPointerEvent(100, 30), context);

      const points = tool.getLinePoints();
      expect(points?.end).toEqual({ x: 100, y: 30 });
    });

    it('applies constraint on completion', () => {
      const onComplete = vi.fn().mockReturnValue('node-1');
      tool.setOnLineComplete(onComplete);

      tool.onPointerDown(createPointerEvent(0, 0, { shiftKey: true }), context);
      tool.onPointerUp(createPointerEvent(100, 10, { shiftKey: true }), context);

      const endPoint = onComplete.mock.calls[0]?.[2];
      expect(endPoint.y).toBeCloseTo(0, 5); // Snapped to horizontal
    });
  });

  describe('escape key', () => {
    it('cancels drawing on escape', () => {
      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerMove(createPointerEvent(100, 100), context);

      const handled = tool.onKeyDown(createKeyEvent('Escape'), context);

      expect(handled).toBe(true);
      expect(tool.isDrawing()).toBe(false);
      expect(tool.getLinePoints()).toBeNull();
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
      const onComplete = vi.fn().mockReturnValue('line-node-id');
      tool.setOnLineComplete(onComplete);

      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerUp(createPointerEvent(100, 100), context);

      expect(tool.getCreatedNodeId()).toBe('line-node-id');
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

  describe('direction independence', () => {
    it('handles right-to-left drawing', () => {
      const onComplete = vi.fn().mockReturnValue('node-1');
      tool.setOnLineComplete(onComplete);

      tool.onPointerDown(createPointerEvent(100, 0), context);
      tool.onPointerUp(createPointerEvent(0, 0), context);

      expect(onComplete).toHaveBeenCalled();
      // End point is absolute coordinates
      const endPoint = onComplete.mock.calls[0]?.[2];
      expect(endPoint.x).toBe(0);
      // Path commands are relative (normalized to origin)
      const path = onComplete.mock.calls[0]?.[0];
      expect(path.commands[1].x).toBe(-100);
    });

    it('handles bottom-to-top drawing', () => {
      const onComplete = vi.fn().mockReturnValue('node-1');
      tool.setOnLineComplete(onComplete);

      tool.onPointerDown(createPointerEvent(0, 100), context);
      tool.onPointerUp(createPointerEvent(0, 0), context);

      expect(onComplete).toHaveBeenCalled();
      // End point is absolute coordinates
      const endPoint = onComplete.mock.calls[0]?.[2];
      expect(endPoint.y).toBe(0);
      // Path commands are relative (normalized to origin)
      const path = onComplete.mock.calls[0]?.[0];
      expect(path.commands[1].y).toBe(-100);
    });
  });
});
