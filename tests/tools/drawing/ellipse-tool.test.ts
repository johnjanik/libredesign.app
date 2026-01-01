/**
 * Ellipse tool tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EllipseTool,
  createEllipseTool,
} from '@tools/drawing/ellipse-tool';
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

describe('EllipseTool', () => {
  let tool: EllipseTool;
  let context: ToolContext;

  beforeEach(() => {
    tool = createEllipseTool();
    context = createMockContext();
    tool.activate(context);
  });

  describe('initialization', () => {
    it('has correct name', () => {
      expect(tool.name).toBe('ellipse');
    });

    it('has crosshair cursor', () => {
      expect(tool.cursor).toBe('crosshair');
    });

    it('isDrawing returns false initially', () => {
      expect(tool.isDrawing()).toBe(false);
    });

    it('getPreviewBounds returns null initially', () => {
      expect(tool.getPreviewBounds()).toBeNull();
    });
  });

  describe('options', () => {
    it('accepts custom options', () => {
      const customTool = createEllipseTool({
        minSize: 5,
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

      const bounds = tool.getPreviewBounds();
      expect(bounds).not.toBeNull();
      expect(bounds?.x).toBe(100);
      expect(bounds?.y).toBe(100);
      expect(bounds?.width).toBe(100);
      expect(bounds?.height).toBe(50);
    });

    it('completes ellipse on pointer up', () => {
      const onComplete = vi.fn().mockReturnValue('node-1');
      tool.setOnEllipseComplete(onComplete);

      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerMove(createPointerEvent(100, 50), context);
      tool.onPointerUp(createPointerEvent(100, 50), context);

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          windingRule: 'NONZERO',
          commands: expect.any(Array),
        }),
        expect.objectContaining({
          x: 0,
          y: 0,
          width: 100,
          height: 50,
        })
      );
    });

    it('creates path with bezier curves', () => {
      const onComplete = vi.fn().mockReturnValue('node-1');
      tool.setOnEllipseComplete(onComplete);

      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerUp(createPointerEvent(100, 100), context);

      const path = onComplete.mock.calls[0]?.[0];
      // Ellipse should have: M, C, C, C, C, Z
      expect(path?.commands).toHaveLength(6);
      expect(path?.commands[0]?.type).toBe('M');
      expect(path?.commands[1]?.type).toBe('C');
      expect(path?.commands[5]?.type).toBe('Z');
    });

    it('does not create ellipse below minimum size', () => {
      const onComplete = vi.fn();
      tool.setOnEllipseComplete(onComplete);

      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerUp(createPointerEvent(1, 1), context);

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('resets state after drawing', () => {
      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerUp(createPointerEvent(100, 100), context);

      expect(tool.isDrawing()).toBe(false);
      expect(tool.getPreviewBounds()).toBeNull();
    });
  });

  describe('shift key (circle constraint)', () => {
    it('constrains to circle when shift is held', () => {
      tool.onPointerDown(createPointerEvent(0, 0, { shiftKey: true }), context);
      tool.onPointerMove(createPointerEvent(100, 50, { shiftKey: true }), context);

      const bounds = tool.getPreviewBounds();
      expect(bounds?.width).toBe(100);
      expect(bounds?.height).toBe(100); // Constrained to circle
    });

    it('updates constraint when shift is pressed', () => {
      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerMove(createPointerEvent(100, 50), context);

      let bounds = tool.getPreviewBounds();
      expect(bounds?.height).toBe(50);

      tool.onKeyDown(createKeyEvent('Shift'), context);
      tool.onPointerMove(createPointerEvent(100, 50, { shiftKey: true }), context);

      bounds = tool.getPreviewBounds();
      expect(bounds?.width).toBe(bounds?.height);
    });

    it('removes constraint when shift is released', () => {
      tool.onPointerDown(createPointerEvent(0, 0, { shiftKey: true }), context);
      tool.onPointerMove(createPointerEvent(100, 50, { shiftKey: true }), context);

      tool.onKeyUp(createKeyEvent('Shift'), context);
      tool.onPointerMove(createPointerEvent(100, 50), context);

      const bounds = tool.getPreviewBounds();
      expect(bounds?.height).toBe(50);
    });
  });

  describe('alt key (draw from center)', () => {
    it('draws from center when alt is held', () => {
      tool.onPointerDown(createPointerEvent(100, 100, { altKey: true }), context);
      tool.onPointerMove(createPointerEvent(150, 125, { altKey: true }), context);

      const bounds = tool.getPreviewBounds();
      // Width/height should be doubled
      expect(bounds?.width).toBe(100);
      expect(bounds?.height).toBe(50);
      // Position should be offset
      expect(bounds?.x).toBe(50);
      expect(bounds?.y).toBe(75);
    });
  });

  describe('escape key', () => {
    it('cancels drawing on escape', () => {
      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerMove(createPointerEvent(100, 100), context);

      const handled = tool.onKeyDown(createKeyEvent('Escape'), context);

      expect(handled).toBe(true);
      expect(tool.isDrawing()).toBe(false);
      expect(tool.getPreviewBounds()).toBeNull();
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
      const onComplete = vi.fn().mockReturnValue('ellipse-node-id');
      tool.setOnEllipseComplete(onComplete);

      tool.onPointerDown(createPointerEvent(0, 0), context);
      tool.onPointerUp(createPointerEvent(100, 100), context);

      expect(tool.getCreatedNodeId()).toBe('ellipse-node-id');
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
