/**
 * Rectangle Tool
 *
 * Creates rectangular frames by click-and-drag.
 * Supports:
 * - Shift to constrain to square
 * - Alt to draw from center
 */

import type { Point, Rect } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';

/**
 * Rectangle tool options
 */
export interface RectangleToolOptions {
  /** Minimum size to create a shape (pixels) */
  readonly minSize?: number;
  /** Default corner radius */
  readonly cornerRadius?: number;
  /** Fill color */
  readonly fillColor?: { r: number; g: number; b: number; a: number };
}

const DEFAULT_OPTIONS: Required<RectangleToolOptions> = {
  minSize: 2,
  cornerRadius: 0,
  fillColor: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
};

/**
 * Rectangle tool for creating frame nodes
 */
export class RectangleTool extends BaseTool {
  readonly name = 'rectangle';
  cursor: ToolCursor = 'crosshair';

  private options: Required<RectangleToolOptions>;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private constrainSquare = false;
  private drawFromCenter = false;
  private createdNodeId: NodeId | null = null;

  // Callbacks
  private onRectComplete?: (rect: Rect, cornerRadius: number) => NodeId | null;
  private onPreviewUpdate?: () => void;

  constructor(options: RectangleToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set callback for when rectangle is completed.
   */
  setOnRectComplete(callback: (rect: Rect, cornerRadius: number) => NodeId | null): void {
    this.onRectComplete = callback;
  }

  /**
   * Set callback for preview updates.
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Check if currently drawing.
   */
  isDrawing(): boolean {
    return this.startPoint !== null;
  }

  /**
   * Get current preview rectangle.
   */
  getPreviewRect(): Rect | null {
    if (!this.startPoint || !this.currentPoint) return null;
    return this.calculateRect(this.startPoint, this.currentPoint);
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.reset();
  }

  override deactivate(): void {
    this.reset();
    super.deactivate();
  }

  override onPointerDown(event: PointerEventData, _context: ToolContext): boolean {
    this.startPoint = { x: event.worldX, y: event.worldY };
    this.currentPoint = this.startPoint;
    this.constrainSquare = event.shiftKey;
    this.drawFromCenter = event.altKey;
    return true;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    if (!this.startPoint) return;

    this.currentPoint = { x: event.worldX, y: event.worldY };
    this.constrainSquare = event.shiftKey;
    this.drawFromCenter = event.altKey;
    this.onPreviewUpdate?.();
  }

  override onPointerUp(event: PointerEventData, context: ToolContext): void {
    if (!this.startPoint) return;

    this.currentPoint = { x: event.worldX, y: event.worldY };
    this.constrainSquare = event.shiftKey;
    this.drawFromCenter = event.altKey;

    const rect = this.calculateRect(this.startPoint, this.currentPoint);

    // Check minimum size
    const minSize = this.options.minSize / context.viewport.getZoom();
    if (rect.width >= minSize && rect.height >= minSize) {
      if (this.onRectComplete) {
        this.createdNodeId = this.onRectComplete(rect, this.options.cornerRadius);
      }
    }

    this.reset();
    this.onPreviewUpdate?.();
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape' && this.startPoint) {
      this.reset();
      this.onPreviewUpdate?.();
      return true;
    }

    if (event.key === 'Shift') {
      this.constrainSquare = true;
      this.onPreviewUpdate?.();
      return true;
    }

    if (event.key === 'Alt') {
      this.drawFromCenter = true;
      this.onPreviewUpdate?.();
      return true;
    }

    return false;
  }

  override onKeyUp(event: KeyEventData, _context: ToolContext): void {
    if (event.key === 'Shift') {
      this.constrainSquare = false;
      this.onPreviewUpdate?.();
    }

    if (event.key === 'Alt') {
      this.drawFromCenter = false;
      this.onPreviewUpdate?.();
    }
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const rect = this.getPreviewRect();
    if (!rect) return;

    const viewport = context.viewport;

    ctx.save();

    // Canvas container already applies viewport transform, so we render in world coords
    // Draw preview rectangle
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);

    ctx.fillStyle = 'rgba(0, 102, 255, 0.1)';
    ctx.fill();

    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 1 / viewport.getZoom();
    ctx.stroke();

    // Draw dimensions
    const fontSize = 12 / viewport.getZoom();
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#0066FF';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.round(rect.width)} × ${Math.round(rect.height)}`,
      rect.x + rect.width / 2,
      rect.y + rect.height + fontSize * 1.5
    );

    ctx.restore();
  }

  /**
   * Calculate rectangle from two points.
   */
  private calculateRect(start: Point, end: Point): Rect {
    let x1 = start.x;
    let y1 = start.y;
    let x2 = end.x;
    let y2 = end.y;

    let width = Math.abs(x2 - x1);
    let height = Math.abs(y2 - y1);

    // Constrain to square
    if (this.constrainSquare) {
      const size = Math.max(width, height);
      width = size;
      height = size;
    }

    // Handle different drawing modes
    if (this.drawFromCenter) {
      // Draw from center
      return {
        x: x1 - width,
        y: y1 - height,
        width: width * 2,
        height: height * 2,
      };
    } else {
      // Draw from corner
      const signX = x2 >= x1 ? 1 : -1;
      const signY = y2 >= y1 ? 1 : -1;

      return {
        x: signX > 0 ? x1 : x1 - width,
        y: signY > 0 ? y1 : y1 - height,
        width,
        height,
      };
    }
  }

  /**
   * Reset the tool state.
   */
  private reset(): void {
    this.startPoint = null;
    this.currentPoint = null;
    this.constrainSquare = false;
    this.drawFromCenter = false;
  }

  /**
   * Get the ID of the last created node.
   */
  getCreatedNodeId(): NodeId | null {
    return this.createdNodeId;
  }
}

/**
 * Create a rectangle tool.
 */
export function createRectangleTool(options?: RectangleToolOptions): RectangleTool {
  return new RectangleTool(options);
}
