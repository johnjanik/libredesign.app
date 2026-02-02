/**
 * Frame Tool
 *
 * Creates frame containers by click-and-drag.
 * Frames are containers that can hold other elements.
 *
 * Supports:
 * - Shift to constrain to square
 * - Alt to draw from center
 * - Object snapping (when snap callback provided)
 */

import type { Point, Rect } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';

/** Snap result from snap callback */
export interface SnapResult {
  readonly x: number;
  readonly y: number;
  readonly type: string;
}

/**
 * Frame tool for creating frame container nodes
 */
export class FrameTool extends BaseTool {
  readonly name = 'frame';
  cursor: ToolCursor = 'crosshair';

  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private constrainSquare = false;
  private drawFromCenter = false;
  private createdNodeId: NodeId | null = null;
  private minSize = 2;

  // Snap state
  private currentSnap: SnapResult | null = null;

  // Callbacks
  private onFrameComplete?: (rect: Rect) => NodeId | null;
  private onPreviewUpdate?: () => void;
  private onFindSnap?: (x: number, y: number) => SnapResult | null;
  private onRenderSnap?: (ctx: CanvasRenderingContext2D, snap: SnapResult | null) => void;

  /**
   * Set callback for when frame is completed.
   */
  setOnFrameComplete(callback: (rect: Rect) => NodeId | null): void {
    this.onFrameComplete = callback;
  }

  /**
   * Set callback for preview updates.
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Set callback for finding snap points.
   */
  setOnFindSnap(callback: (x: number, y: number) => SnapResult | null): void {
    this.onFindSnap = callback;
  }

  /**
   * Set callback for rendering snap indicators.
   */
  setOnRenderSnap(callback: (ctx: CanvasRenderingContext2D, snap: SnapResult | null) => void): void {
    this.onRenderSnap = callback;
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
    // Use snap point if available
    const snapPoint = this.currentSnap ?? { x: event.worldX, y: event.worldY };
    this.startPoint = { x: snapPoint.x, y: snapPoint.y };
    this.currentPoint = this.startPoint;
    this.constrainSquare = event.shiftKey;
    this.drawFromCenter = event.altKey;
    return true;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    // Find snap point
    if (this.onFindSnap) {
      this.currentSnap = this.onFindSnap(event.worldX, event.worldY);
    }

    if (!this.startPoint) return;

    // Use snap point if available
    const snapPoint = this.currentSnap ?? { x: event.worldX, y: event.worldY };
    this.currentPoint = { x: snapPoint.x, y: snapPoint.y };
    this.constrainSquare = event.shiftKey;
    this.drawFromCenter = event.altKey;
    this.onPreviewUpdate?.();
  }

  override onPointerUp(event: PointerEventData, context: ToolContext): void {
    if (!this.startPoint) return;

    // Use snap point if available
    const snapPoint = this.currentSnap ?? { x: event.worldX, y: event.worldY };
    this.currentPoint = { x: snapPoint.x, y: snapPoint.y };
    this.constrainSquare = event.shiftKey;
    this.drawFromCenter = event.altKey;

    const rect = this.calculateRect(this.startPoint, this.currentPoint);

    // Check minimum size
    const minSize = this.minSize / context.viewport.getZoom();
    if (rect.width >= minSize && rect.height >= minSize) {
      if (this.onFrameComplete) {
        this.createdNodeId = this.onFrameComplete(rect);
      }
    }

    this.currentSnap = null;
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

    // Draw preview frame with dashed border
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 1 / viewport.getZoom();
    ctx.setLineDash([4 / viewport.getZoom(), 4 / viewport.getZoom()]);
    ctx.stroke();

    // Draw "Frame" label
    const fontSize = 11 / viewport.getZoom();
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#0066FF';
    ctx.textAlign = 'left';
    ctx.fillText('Frame', rect.x, rect.y - fontSize * 0.5);

    // Draw dimensions
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.round(rect.width)} × ${Math.round(rect.height)}`,
      rect.x + rect.width / 2,
      rect.y + rect.height + fontSize * 1.5
    );

    ctx.restore();

    // Draw snap indicator
    if (this.currentSnap && this.onRenderSnap) {
      this.onRenderSnap(ctx, this.currentSnap);
    }
  }

  /**
   * Calculate rectangle from two points.
   */
  private calculateRect(start: Point, end: Point): Rect {
    let width = Math.abs(end.x - start.x);
    let height = Math.abs(end.y - start.y);

    // Constrain to square
    if (this.constrainSquare) {
      const size = Math.max(width, height);
      width = size;
      height = size;
    }

    // Handle different drawing modes
    if (this.drawFromCenter) {
      return {
        x: start.x - width,
        y: start.y - height,
        width: width * 2,
        height: height * 2,
      };
    } else {
      const signX = end.x >= start.x ? 1 : -1;
      const signY = end.y >= start.y ? 1 : -1;

      return {
        x: signX > 0 ? start.x : start.x - width,
        y: signY > 0 ? start.y : start.y - height,
        width,
        height,
      };
    }
  }

  private reset(): void {
    this.startPoint = null;
    this.currentPoint = null;
    this.constrainSquare = false;
    this.drawFromCenter = false;
  }

  getCreatedNodeId(): NodeId | null {
    return this.createdNodeId;
  }
}

/**
 * Create a frame tool.
 */
export function createFrameTool(): FrameTool {
  return new FrameTool();
}
