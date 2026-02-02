/**
 * Polyline Tool
 *
 * Creates connected line segments by clicking multiple points.
 * Supports:
 * - Click to add vertices
 * - Shift to constrain to 45° angles
 * - Double-click or Enter to complete
 * - Escape to cancel
 * - Backspace to remove last point
 * - Object snapping (when snap callback provided)
 */

import type { Point, VectorPath, PathCommand } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';

/**
 * Snap result from snap callback
 */
export interface SnapResult {
  readonly x: number;
  readonly y: number;
  readonly type: string;
}

/**
 * Polyline tool options
 */
export interface PolylineToolOptions {
  /** Minimum segment length (pixels) */
  readonly minLength?: number;
  /** Stroke width */
  readonly strokeWidth?: number;
  /** Stroke color */
  readonly strokeColor?: { r: number; g: number; b: number; a: number };
  /** Whether to close the polyline (polygon) */
  readonly closed?: boolean;
}

const DEFAULT_OPTIONS: Required<PolylineToolOptions> = {
  minLength: 2,
  strokeWidth: 2,
  strokeColor: { r: 0, g: 0, b: 0, a: 1 },
  closed: false,
};

/**
 * Snap angle to nearest 45° increment
 */
function snapAngle(angle: number): number {
  const snap = Math.PI / 4; // 45 degrees
  return Math.round(angle / snap) * snap;
}

/**
 * Polyline tool for creating connected line segments
 */
export class PolylineTool extends BaseTool {
  readonly name = 'polyline';
  cursor: ToolCursor = 'crosshair';

  private options: Required<PolylineToolOptions>;
  private points: Point[] = [];
  private currentPoint: Point | null = null;
  private constrainAngle = false;
  private createdNodeId: NodeId | null = null;
  private currentSnap: SnapResult | null = null;

  // Callbacks
  private onPolylineComplete?: (path: VectorPath, points: Point[], closed: boolean) => NodeId | null;
  private onPreviewUpdate?: () => void;
  private onFindSnap?: (x: number, y: number) => SnapResult | null;
  private onRenderSnap?: (ctx: CanvasRenderingContext2D, snap: SnapResult | null) => void;

  constructor(options: PolylineToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set callback for when polyline is completed.
   */
  setOnPolylineComplete(callback: (path: VectorPath, points: Point[], closed: boolean) => NodeId | null): void {
    this.onPolylineComplete = callback;
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
    return this.points.length > 0;
  }

  /**
   * Get all points including current cursor position.
   */
  getAllPoints(): Point[] {
    if (this.currentPoint && this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1]!;
      const endPoint = this.constrainAngle
        ? this.constrainEndPoint(lastPoint, this.currentPoint)
        : this.currentPoint;
      return [...this.points, endPoint];
    }
    return [...this.points];
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.reset();
  }

  override deactivate(): void {
    this.reset();
    super.deactivate();
  }

  override onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    let point = { x: event.worldX, y: event.worldY };
    this.constrainAngle = event.shiftKey;

    // Apply snapping if available (unless angle constrain is active)
    if (!this.constrainAngle && this.currentSnap) {
      point = { x: this.currentSnap.x, y: this.currentSnap.y };
    }

    // Calculate constrained point if needed
    let finalPoint = point;
    if (this.constrainAngle && this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1]!;
      finalPoint = this.constrainEndPoint(lastPoint, point);
    }

    // Check if clicking near first point to close
    if (this.points.length >= 3) {
      const firstPoint = this.points[0]!;
      const dist = Math.sqrt(
        Math.pow(finalPoint.x - firstPoint.x, 2) + Math.pow(finalPoint.y - firstPoint.y, 2)
      );
      const closeThreshold = 10 / context.viewport.getZoom();

      if (dist < closeThreshold) {
        this.completePolyline(true);
        return true;
      }
    }

    // Add point if it meets minimum length
    if (this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1]!;
      const dist = Math.sqrt(
        Math.pow(finalPoint.x - lastPoint.x, 2) + Math.pow(finalPoint.y - lastPoint.y, 2)
      );
      const minLength = this.options.minLength / context.viewport.getZoom();

      if (dist < minLength) return true;
    }

    this.points.push(finalPoint);
    this.currentPoint = finalPoint;
    this.onPreviewUpdate?.();

    return true;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    this.currentPoint = { x: event.worldX, y: event.worldY };
    this.constrainAngle = event.shiftKey;

    // Find snap point (only when not constraining angle)
    if (!this.constrainAngle && this.onFindSnap) {
      this.currentSnap = this.onFindSnap(event.worldX, event.worldY);
    } else {
      this.currentSnap = null;
    }

    this.onPreviewUpdate?.();
  }

  override onDoubleClick(_event: PointerEventData, _context: ToolContext): void {
    if (this.points.length >= 2) {
      // Remove the point added by the second click of double-click
      if (this.points.length > 2) {
        this.points.pop();
      }
      this.completePolyline(this.options.closed);
    }
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape') {
      this.reset();
      this.onPreviewUpdate?.();
      return true;
    }

    if (event.key === 'Enter' && this.points.length >= 2) {
      this.completePolyline(this.options.closed);
      return true;
    }

    if (event.key === 'Backspace' && this.points.length > 0) {
      this.points.pop();
      this.onPreviewUpdate?.();
      return true;
    }

    if (event.key === 'Shift') {
      this.constrainAngle = true;
      this.onPreviewUpdate?.();
      return true;
    }

    // Close with 'C' key
    if (event.key === 'c' && this.points.length >= 3) {
      this.completePolyline(true);
      return true;
    }

    return false;
  }

  override onKeyUp(event: KeyEventData, _context: ToolContext): void {
    if (event.key === 'Shift') {
      this.constrainAngle = false;
      this.onPreviewUpdate?.();
    }
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const points = this.getAllPoints();
    if (points.length === 0) return;

    const viewport = context.viewport;
    const zoom = viewport.getZoom();

    ctx.save();

    // Draw completed segments
    if (points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i]!.x, points[i]!.y);
      }

      ctx.strokeStyle = '#0066FF';
      ctx.lineWidth = Math.max(this.options.strokeWidth, 1 / zoom);
      ctx.stroke();
    }

    // Draw vertices
    const pointRadius = 4 / zoom;
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2);

      // First point is highlighted for closing
      if (i === 0 && points.length >= 3) {
        ctx.fillStyle = '#00FF66';
      } else {
        ctx.fillStyle = '#FFFFFF';
      }

      ctx.fill();
      ctx.strokeStyle = '#0066FF';
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
    }

    // Draw closing indicator
    if (points.length >= 3 && this.currentPoint) {
      const firstPoint = points[0]!;
      const dist = Math.sqrt(
        Math.pow(this.currentPoint.x - firstPoint.x, 2) +
        Math.pow(this.currentPoint.y - firstPoint.y, 2)
      );
      const closeThreshold = 10 / zoom;

      if (dist < closeThreshold) {
        // Draw dashed line to first point
        ctx.beginPath();
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.moveTo(points[points.length - 1]!.x, points[points.length - 1]!.y);
        ctx.lineTo(firstPoint.x, firstPoint.y);
        ctx.strokeStyle = '#00FF66';
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw segment length for current segment
    if (points.length >= 2) {
      const p1 = points[points.length - 2]!;
      const p2 = points[points.length - 1]!;
      const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const fontSize = 12 / zoom;

      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = '#0066FF';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(length)}`, midX, midY - fontSize / 2);
    }

    // Render snap indicator
    if (this.currentSnap && this.onRenderSnap) {
      this.onRenderSnap(ctx, this.currentSnap);
    }

    ctx.restore();
  }

  /**
   * Complete the polyline and create the node.
   */
  private completePolyline(closed: boolean): void {
    if (this.points.length < 2) {
      this.reset();
      return;
    }

    const path = this.createPolylinePath(this.points, closed);

    if (this.onPolylineComplete) {
      this.createdNodeId = this.onPolylineComplete(path, [...this.points], closed);
    }

    this.reset();
    this.onPreviewUpdate?.();
  }

  /**
   * Constrain end point to 45° angles.
   */
  private constrainEndPoint(start: Point, end: Point): Point {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return end;

    const angle = Math.atan2(dy, dx);
    const snappedAngle = snapAngle(angle);

    return {
      x: start.x + Math.cos(snappedAngle) * length,
      y: start.y + Math.sin(snappedAngle) * length,
    };
  }

  /**
   * Create a polyline path from points.
   */
  private createPolylinePath(points: Point[], closed: boolean): VectorPath {
    if (points.length === 0) {
      return { windingRule: 'NONZERO', commands: [] };
    }

    // Find bounding box to normalize coordinates
    let minX = Infinity, minY = Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
    }

    const commands: PathCommand[] = [
      { type: 'M', x: points[0]!.x - minX, y: points[0]!.y - minY },
    ];

    for (let i = 1; i < points.length; i++) {
      commands.push({ type: 'L', x: points[i]!.x - minX, y: points[i]!.y - minY });
    }

    if (closed) {
      commands.push({ type: 'Z' });
    }

    return { windingRule: 'NONZERO', commands };
  }

  /**
   * Reset the tool state.
   */
  private reset(): void {
    this.points = [];
    this.currentPoint = null;
    this.constrainAngle = false;
  }

  /**
   * Get the ID of the last created node.
   */
  getCreatedNodeId(): NodeId | null {
    return this.createdNodeId;
  }
}

/**
 * Create a polyline tool.
 */
export function createPolylineTool(options?: PolylineToolOptions): PolylineTool {
  return new PolylineTool(options);
}
