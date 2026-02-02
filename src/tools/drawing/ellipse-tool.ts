/**
 * Ellipse Tool
 *
 * Creates elliptical shapes by click-and-drag.
 * Supports:
 * - Shift to constrain to circle
 * - Alt to draw from center
 * - Object snapping (when snap callback provided)
 */

import type { Point, Rect, VectorPath, PathCommand } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';

/** Snap result from snap callback */
export interface SnapResult {
  readonly x: number;
  readonly y: number;
  readonly type: string;
}

/**
 * Ellipse tool options
 */
export interface EllipseToolOptions {
  /** Minimum size to create a shape (pixels) */
  readonly minSize?: number;
  /** Fill color */
  readonly fillColor?: { r: number; g: number; b: number; a: number };
}

const DEFAULT_OPTIONS: Required<EllipseToolOptions> = {
  minSize: 2,
  fillColor: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
};

/**
 * Kappa constant for approximating circles with cubic beziers
 * kappa = 4 * (sqrt(2) - 1) / 3
 */
const KAPPA = 0.5522847498307936;

/**
 * Ellipse tool for creating vector nodes with ellipse paths
 */
export class EllipseTool extends BaseTool {
  readonly name = 'ellipse';
  cursor: ToolCursor = 'crosshair';

  private options: Required<EllipseToolOptions>;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private constrainCircle = false;
  private drawFromCenter = false;
  private createdNodeId: NodeId | null = null;

  // Snap state
  private currentSnap: SnapResult | null = null;

  // Callbacks
  private onEllipseComplete?: (path: VectorPath, bounds: Rect) => NodeId | null;
  private onPreviewUpdate?: () => void;
  private onFindSnap?: (x: number, y: number) => SnapResult | null;
  private onRenderSnap?: (ctx: CanvasRenderingContext2D, snap: SnapResult | null) => void;

  constructor(options: EllipseToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set callback for when ellipse is completed.
   */
  setOnEllipseComplete(callback: (path: VectorPath, bounds: Rect) => NodeId | null): void {
    this.onEllipseComplete = callback;
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
   * Get current preview bounds.
   */
  getPreviewBounds(): Rect | null {
    if (!this.startPoint || !this.currentPoint) return null;
    return this.calculateBounds(this.startPoint, this.currentPoint);
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
    this.constrainCircle = event.shiftKey;
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
    this.constrainCircle = event.shiftKey;
    this.drawFromCenter = event.altKey;
    this.onPreviewUpdate?.();
  }

  override onPointerUp(event: PointerEventData, context: ToolContext): void {
    if (!this.startPoint) return;

    // Use snap point if available
    const snapPoint = this.currentSnap ?? { x: event.worldX, y: event.worldY };
    this.currentPoint = { x: snapPoint.x, y: snapPoint.y };
    this.constrainCircle = event.shiftKey;
    this.drawFromCenter = event.altKey;

    const bounds = this.calculateBounds(this.startPoint, this.currentPoint);

    // Check minimum size
    const minSize = this.options.minSize / context.viewport.getZoom();
    if (bounds.width >= minSize && bounds.height >= minSize) {
      const path = this.createEllipsePath(bounds);
      if (this.onEllipseComplete) {
        this.createdNodeId = this.onEllipseComplete(path, bounds);
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
      this.constrainCircle = true;
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
      this.constrainCircle = false;
      this.onPreviewUpdate?.();
    }

    if (event.key === 'Alt') {
      this.drawFromCenter = false;
      this.onPreviewUpdate?.();
    }
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const bounds = this.getPreviewBounds();
    if (!bounds) return;

    const viewport = context.viewport;

    ctx.save();

    // Canvas container already applies viewport transform, so we render in world coords
    // Draw preview ellipse
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

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
      `${Math.round(bounds.width)} × ${Math.round(bounds.height)}`,
      cx,
      bounds.y + bounds.height + fontSize * 1.5
    );

    ctx.restore();

    // Draw snap indicator
    if (this.currentSnap && this.onRenderSnap) {
      this.onRenderSnap(ctx, this.currentSnap);
    }
  }

  /**
   * Calculate bounds from two points.
   */
  private calculateBounds(start: Point, end: Point): Rect {
    let width = Math.abs(end.x - start.x);
    let height = Math.abs(end.y - start.y);

    // Constrain to circle
    if (this.constrainCircle) {
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

  /**
   * Create an ellipse path using cubic bezier approximation.
   */
  private createEllipsePath(bounds: Rect): VectorPath {
    const cx = bounds.width / 2;
    const cy = bounds.height / 2;
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;

    const kx = rx * KAPPA;
    const ky = ry * KAPPA;

    const commands: PathCommand[] = [
      // Start at right
      { type: 'M', x: cx + rx, y: cy },
      // Bottom right quadrant
      { type: 'C', x1: cx + rx, y1: cy + ky, x2: cx + kx, y2: cy + ry, x: cx, y: cy + ry },
      // Bottom left quadrant
      { type: 'C', x1: cx - kx, y1: cy + ry, x2: cx - rx, y2: cy + ky, x: cx - rx, y: cy },
      // Top left quadrant
      { type: 'C', x1: cx - rx, y1: cy - ky, x2: cx - kx, y2: cy - ry, x: cx, y: cy - ry },
      // Top right quadrant
      { type: 'C', x1: cx + kx, y1: cy - ry, x2: cx + rx, y2: cy - ky, x: cx + rx, y: cy },
      // Close
      { type: 'Z' },
    ];

    return {
      windingRule: 'NONZERO',
      commands,
    };
  }

  /**
   * Reset the tool state.
   */
  private reset(): void {
    this.startPoint = null;
    this.currentPoint = null;
    this.constrainCircle = false;
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
 * Create an ellipse tool.
 */
export function createEllipseTool(options?: EllipseToolOptions): EllipseTool {
  return new EllipseTool(options);
}
