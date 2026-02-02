/**
 * Circle Tool
 *
 * Creates circles using different methods:
 * - Center-Radius (default): Click center, drag for radius
 * - 2-Point Diameter: Two clicks define diameter endpoints
 * - 3-Point: Three points on the circumference
 *
 * Supports:
 * - Tab to cycle through modes
 * - Shift to constrain (mode-dependent)
 * - Object snapping (when snap callback provided)
 */

import type { Point, VectorPath, PathCommand, Rect } from '@core/types/geometry';
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
 * Circle creation mode
 */
export type CircleMode = 'center-radius' | '2-point' | '3-point';

/**
 * Circle tool options
 */
export interface CircleToolOptions {
  /** Default circle mode */
  readonly mode?: CircleMode;
  /** Minimum size to create a shape (pixels) */
  readonly minSize?: number;
  /** Fill color */
  readonly fillColor?: { r: number; g: number; b: number; a: number };
}

const DEFAULT_OPTIONS: Required<CircleToolOptions> = {
  mode: 'center-radius',
  minSize: 2,
  fillColor: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
};

/**
 * Kappa constant for approximating circles with cubic beziers
 */
const KAPPA = 0.5522847498307936;

/**
 * Circle tool for creating perfect circles
 */
export class CircleTool extends BaseTool {
  readonly name = 'circle';
  cursor: ToolCursor = 'crosshair';

  private options: Required<CircleToolOptions>;
  private mode: CircleMode;
  private point1: Point | null = null;
  private point2: Point | null = null;
  private point3: Point | null = null;
  private currentPoint: Point | null = null;
  private isCircleDragging = false;
  private createdNodeId: NodeId | null = null;
  private currentSnap: SnapResult | null = null;

  // Callbacks
  private onCircleComplete?: (path: VectorPath, bounds: Rect) => NodeId | null;
  private onPreviewUpdate?: () => void;
  private onFindSnap?: (x: number, y: number) => SnapResult | null;
  private onRenderSnap?: (ctx: CanvasRenderingContext2D, snap: SnapResult | null) => void;

  constructor(options: CircleToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.mode = this.options.mode;
  }

  /**
   * Set callback for when circle is completed.
   */
  setOnCircleComplete(callback: (path: VectorPath, bounds: Rect) => NodeId | null): void {
    this.onCircleComplete = callback;
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
   * Get current mode.
   */
  getMode(): CircleMode {
    return this.mode;
  }

  /**
   * Set circle mode.
   */
  setMode(mode: CircleMode): void {
    this.mode = mode;
    this.reset();
    this.onPreviewUpdate?.();
  }

  /**
   * Check if currently drawing.
   */
  isDrawing(): boolean {
    return this.point1 !== null;
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
    let point = { x: event.worldX, y: event.worldY };

    // Apply snapping if available
    if (this.currentSnap) {
      point = { x: this.currentSnap.x, y: this.currentSnap.y };
    }

    if (this.mode === 'center-radius') {
      this.point1 = point; // Center
      this.isCircleDragging = true;
    } else if (this.mode === '2-point') {
      if (!this.point1) {
        this.point1 = point;
      } else {
        this.point2 = point;
        this.completeCircle();
      }
    } else if (this.mode === '3-point') {
      if (!this.point1) {
        this.point1 = point;
      } else if (!this.point2) {
        this.point2 = point;
      } else {
        this.point3 = point;
        this.completeCircle();
      }
    }

    this.currentPoint = point;
    this.onPreviewUpdate?.();
    return true;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    this.currentPoint = { x: event.worldX, y: event.worldY };

    // Find snap point
    if (this.onFindSnap) {
      this.currentSnap = this.onFindSnap(event.worldX, event.worldY);
    }

    this.onPreviewUpdate?.();
  }

  override onPointerUp(event: PointerEventData, context: ToolContext): void {
    if (this.mode === 'center-radius' && this.isCircleDragging && this.point1) {
      let endPoint = { x: event.worldX, y: event.worldY };

      // Apply snapping for end point
      if (this.currentSnap) {
        endPoint = { x: this.currentSnap.x, y: this.currentSnap.y };
      }

      this.currentPoint = endPoint;

      const radius = Math.sqrt(
        Math.pow(this.currentPoint.x - this.point1.x, 2) +
        Math.pow(this.currentPoint.y - this.point1.y, 2)
      );

      const minSize = this.options.minSize / context.viewport.getZoom();
      if (radius >= minSize / 2) {
        this.completeCircle();
      } else {
        this.reset();
      }

      this.isCircleDragging = false;
      this.onPreviewUpdate?.();
    }
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape') {
      this.reset();
      this.onPreviewUpdate?.();
      return true;
    }

    if (event.key === 'Tab') {
      // Cycle through modes
      const modes: CircleMode[] = ['center-radius', '2-point', '3-point'];
      const currentIndex = modes.indexOf(this.mode);
      this.mode = modes[(currentIndex + 1) % modes.length]!;
      this.reset();
      this.onPreviewUpdate?.();
      return true;
    }

    return false;
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const zoom = context.viewport.getZoom();
    const pointRadius = 4 / zoom;

    ctx.save();

    if (this.mode === 'center-radius') {
      this.renderCenterRadius(ctx, zoom, pointRadius);
    } else if (this.mode === '2-point') {
      this.render2Point(ctx, zoom, pointRadius);
    } else if (this.mode === '3-point') {
      this.render3Point(ctx, zoom, pointRadius);
    }

    // Render snap indicator
    if (this.currentSnap && this.onRenderSnap) {
      this.onRenderSnap(ctx, this.currentSnap);
    }

    ctx.restore();
  }

  /**
   * Render center-radius mode preview.
   */
  private renderCenterRadius(ctx: CanvasRenderingContext2D, zoom: number, pointRadius: number): void {
    if (!this.point1 || !this.currentPoint) return;

    const radius = Math.sqrt(
      Math.pow(this.currentPoint.x - this.point1.x, 2) +
      Math.pow(this.currentPoint.y - this.point1.y, 2)
    );

    // Draw circle
    ctx.beginPath();
    ctx.arc(this.point1.x, this.point1.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();

    // Draw center point
    this.drawPoint(ctx, this.point1, pointRadius, '#FF6600');

    // Draw radius line
    ctx.beginPath();
    ctx.moveTo(this.point1.x, this.point1.y);
    ctx.lineTo(this.currentPoint.x, this.currentPoint.y);
    ctx.strokeStyle = '#0066FF';
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.lineWidth = 1 / zoom;
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw radius value
    const midX = (this.point1.x + this.currentPoint.x) / 2;
    const midY = (this.point1.y + this.currentPoint.y) / 2;
    const fontSize = 12 / zoom;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#0066FF';
    ctx.textAlign = 'center';
    ctx.fillText(`r=${Math.round(radius)}`, midX, midY - fontSize / 2);
  }

  /**
   * Render 2-point diameter mode preview.
   */
  private render2Point(ctx: CanvasRenderingContext2D, zoom: number, pointRadius: number): void {
    if (!this.point1) return;

    const p2 = this.currentPoint || this.point1;
    const centerX = (this.point1.x + p2.x) / 2;
    const centerY = (this.point1.y + p2.y) / 2;
    const radius = Math.sqrt(
      Math.pow(p2.x - this.point1.x, 2) + Math.pow(p2.y - this.point1.y, 2)
    ) / 2;

    // Draw circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();

    // Draw diameter line
    ctx.beginPath();
    ctx.moveTo(this.point1.x, this.point1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = '#0066FF';
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.lineWidth = 1 / zoom;
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw points
    this.drawPoint(ctx, this.point1, pointRadius, '#00FF66');
    this.drawPoint(ctx, p2, pointRadius, '#FFFFFF');
    this.drawPoint(ctx, { x: centerX, y: centerY }, pointRadius * 0.7, '#FF6600');

    // Draw diameter value
    const fontSize = 12 / zoom;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#0066FF';
    ctx.textAlign = 'center';
    ctx.fillText(`d=${Math.round(radius * 2)}`, centerX, centerY - radius - fontSize);
  }

  /**
   * Render 3-point mode preview.
   */
  private render3Point(ctx: CanvasRenderingContext2D, zoom: number, pointRadius: number): void {
    // Draw placed points
    if (this.point1) {
      this.drawPoint(ctx, this.point1, pointRadius, '#00FF66');
    }
    if (this.point2) {
      this.drawPoint(ctx, this.point2, pointRadius, '#00FF66');
    }

    // Draw preview circle if we have 2 points + cursor
    if (this.point1 && this.point2 && this.currentPoint) {
      const circle = this.calculate3PointCircle(this.point1, this.point2, this.currentPoint);
      if (circle) {
        // Draw circle
        ctx.beginPath();
        ctx.arc(circle.cx, circle.cy, circle.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = 1.5 / zoom;
        ctx.stroke();

        // Draw center
        this.drawPoint(ctx, { x: circle.cx, y: circle.cy }, pointRadius * 0.7, '#FF6600');

        // Draw cursor point
        this.drawPoint(ctx, this.currentPoint, pointRadius, '#FFFFFF');
      }
    } else if (this.point1 && this.currentPoint && !this.point2) {
      // Draw line between first point and cursor
      ctx.beginPath();
      ctx.moveTo(this.point1.x, this.point1.y);
      ctx.lineTo(this.currentPoint.x, this.currentPoint.y);
      ctx.strokeStyle = '#0066FF';
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.lineWidth = 1 / zoom;
      ctx.stroke();
      ctx.setLineDash([]);

      this.drawPoint(ctx, this.currentPoint, pointRadius, '#FFFFFF');
    }
  }

  /**
   * Draw a point marker.
   */
  private drawPoint(ctx: CanvasRenderingContext2D, point: Point, radius: number, fill: string): void {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = radius * 0.4;
    ctx.stroke();
  }

  /**
   * Calculate circle through 3 points.
   */
  private calculate3PointCircle(p1: Point, p2: Point, p3: Point): { cx: number; cy: number; radius: number } | null {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;

    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

    if (Math.abs(d) < 1e-10) {
      return null; // Points are collinear
    }

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

    const radius = Math.sqrt(Math.pow(ax - ux, 2) + Math.pow(ay - uy, 2));

    return { cx: ux, cy: uy, radius };
  }

  /**
   * Complete the circle and create the node.
   */
  private completeCircle(): void {
    let center: Point;
    let radius: number;

    if (this.mode === 'center-radius') {
      if (!this.point1 || !this.currentPoint) {
        this.reset();
        return;
      }
      center = this.point1;
      radius = Math.sqrt(
        Math.pow(this.currentPoint.x - center.x, 2) +
        Math.pow(this.currentPoint.y - center.y, 2)
      );
    } else if (this.mode === '2-point') {
      if (!this.point1 || !this.point2) {
        this.reset();
        return;
      }
      center = {
        x: (this.point1.x + this.point2.x) / 2,
        y: (this.point1.y + this.point2.y) / 2,
      };
      radius = Math.sqrt(
        Math.pow(this.point2.x - this.point1.x, 2) +
        Math.pow(this.point2.y - this.point1.y, 2)
      ) / 2;
    } else {
      if (!this.point1 || !this.point2 || !this.point3) {
        this.reset();
        return;
      }
      const circle = this.calculate3PointCircle(this.point1, this.point2, this.point3);
      if (!circle) {
        this.reset();
        return;
      }
      center = { x: circle.cx, y: circle.cy };
      radius = circle.radius;
    }

    const bounds: Rect = {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    };

    const path = this.createCirclePath(radius);

    if (this.onCircleComplete) {
      this.createdNodeId = this.onCircleComplete(path, bounds);
    }

    this.reset();
    this.onPreviewUpdate?.();
  }

  /**
   * Create a circle path using cubic beziers.
   */
  private createCirclePath(radius: number): VectorPath {
    const k = KAPPA * radius;
    const d = radius * 2;

    const commands: PathCommand[] = [
      { type: 'M', x: d, y: radius },
      { type: 'C', x1: d, y1: radius + k, x2: radius + k, y2: d, x: radius, y: d },
      { type: 'C', x1: radius - k, y1: d, x2: 0, y2: radius + k, x: 0, y: radius },
      { type: 'C', x1: 0, y1: radius - k, x2: radius - k, y2: 0, x: radius, y: 0 },
      { type: 'C', x1: radius + k, y1: 0, x2: d, y2: radius - k, x: d, y: radius },
      { type: 'Z' },
    ];

    return { windingRule: 'NONZERO', commands };
  }

  /**
   * Reset the tool state.
   */
  private reset(): void {
    this.point1 = null;
    this.point2 = null;
    this.point3 = null;
    this.currentPoint = null;
    this.isCircleDragging = false;
  }

  /**
   * Get the ID of the last created node.
   */
  getCreatedNodeId(): NodeId | null {
    return this.createdNodeId;
  }
}

/**
 * Create a circle tool.
 */
export function createCircleTool(options?: CircleToolOptions): CircleTool {
  return new CircleTool(options);
}
