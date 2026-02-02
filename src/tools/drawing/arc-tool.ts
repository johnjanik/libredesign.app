/**
 * Arc Tool
 *
 * Creates arc shapes using different methods:
 * - 3-point arc (default): Click start, then end, then arc point
 * - Center-start-end: Alt+click for center mode
 *
 * Supports:
 * - Shift to constrain angles to 45°
 * - Tab to switch between modes
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
 * Arc creation mode
 */
export type ArcMode = '3-point' | 'center-start-end';

/**
 * Arc tool options
 */
export interface ArcToolOptions {
  /** Default arc mode */
  readonly mode?: ArcMode;
  /** Stroke width */
  readonly strokeWidth?: number;
  /** Stroke color */
  readonly strokeColor?: { r: number; g: number; b: number; a: number };
}

const DEFAULT_OPTIONS: Required<ArcToolOptions> = {
  mode: '3-point',
  strokeWidth: 2,
  strokeColor: { r: 0, g: 0, b: 0, a: 1 },
};

/**
 * Arc tool for creating arc segments
 */
export class ArcTool extends BaseTool {
  readonly name = 'arc';
  cursor: ToolCursor = 'crosshair';

  private options: Required<ArcToolOptions>;
  private mode: ArcMode;
  private point1: Point | null = null; // Start point (3-point) or Center (center mode)
  private point2: Point | null = null; // End point (3-point) or Start (center mode)
  private point3: Point | null = null; // Arc point (3-point) or End (center mode)
  private currentPoint: Point | null = null;
  private constrainAngle = false;
  private createdNodeId: NodeId | null = null;
  private currentSnap: SnapResult | null = null;

  // Callbacks
  private onArcComplete?: (path: VectorPath, bounds: { x: number; y: number; width: number; height: number }) => NodeId | null;
  private onPreviewUpdate?: () => void;
  private onFindSnap?: (x: number, y: number) => SnapResult | null;
  private onRenderSnap?: (ctx: CanvasRenderingContext2D, snap: SnapResult | null) => void;

  constructor(options: ArcToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.mode = this.options.mode;
  }

  /**
   * Set callback for when arc is completed.
   */
  setOnArcComplete(callback: (path: VectorPath, bounds: { x: number; y: number; width: number; height: number }) => NodeId | null): void {
    this.onArcComplete = callback;
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
  getMode(): ArcMode {
    return this.mode;
  }

  /**
   * Set arc mode.
   */
  setMode(mode: ArcMode): void {
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

  /**
   * Get current step (1, 2, or 3).
   */
  getCurrentStep(): number {
    if (!this.point1) return 1;
    if (!this.point2) return 2;
    return 3;
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
    this.constrainAngle = event.shiftKey;

    // Apply snapping (unless angle constrain is active)
    if (!this.constrainAngle && this.currentSnap) {
      point = { x: this.currentSnap.x, y: this.currentSnap.y };
    }

    // Switch to center mode if Alt is held on first click
    if (!this.point1 && event.altKey) {
      this.mode = 'center-start-end';
    }

    if (!this.point1) {
      this.point1 = point;
    } else if (!this.point2) {
      this.point2 = this.constrainAngle ? this.constrainPoint(this.point1, point) : point;
    } else {
      this.point3 = point;
      this.completeArc();
    }

    this.currentPoint = point;
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

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape') {
      this.reset();
      this.onPreviewUpdate?.();
      return true;
    }

    if (event.key === 'Tab') {
      // Toggle mode
      this.mode = this.mode === '3-point' ? 'center-start-end' : '3-point';
      this.reset();
      this.onPreviewUpdate?.();
      return true;
    }

    if (event.key === 'Shift') {
      this.constrainAngle = true;
      this.onPreviewUpdate?.();
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
    const zoom = context.viewport.getZoom();

    ctx.save();

    // Draw based on current state
    if (this.mode === '3-point') {
      this.render3PointArc(ctx, zoom);
    } else {
      this.renderCenterArc(ctx, zoom);
    }

    // Render snap indicator
    if (this.currentSnap && this.onRenderSnap) {
      this.onRenderSnap(ctx, this.currentSnap);
    }

    ctx.restore();
  }

  /**
   * Render 3-point arc preview.
   */
  private render3PointArc(ctx: CanvasRenderingContext2D, zoom: number): void {
    const pointRadius = 4 / zoom;

    // Draw first point
    if (this.point1) {
      this.drawPoint(ctx, this.point1, pointRadius, '#00FF66');

      // Draw line to second point or cursor
      const p2 = this.point2 || (this.currentPoint ?
        (this.constrainAngle ? this.constrainPoint(this.point1, this.currentPoint) : this.currentPoint) : null);

      if (p2) {
        ctx.beginPath();
        ctx.moveTo(this.point1.x, this.point1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.stroke();
        ctx.setLineDash([]);

        this.drawPoint(ctx, p2, pointRadius, this.point2 ? '#00FF66' : '#FFFFFF');
      }
    }

    // Draw arc preview when we have all 3 points (or 2 + cursor)
    if (this.point1 && this.point2 && this.currentPoint) {
      const arc = this.calculate3PointArc(this.point1, this.point2, this.currentPoint);
      if (arc) {
        ctx.beginPath();
        ctx.arc(arc.cx, arc.cy, arc.radius, arc.startAngle, arc.endAngle, arc.counterClockwise);
        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = Math.max(this.options.strokeWidth, 1 / zoom);
        ctx.stroke();

        // Draw center point
        this.drawPoint(ctx, { x: arc.cx, y: arc.cy }, pointRadius * 0.7, '#FF6600');

        // Draw arc point indicator
        this.drawPoint(ctx, this.currentPoint, pointRadius, '#FFFFFF');
      }
    }
  }

  /**
   * Render center-start-end arc preview.
   */
  private renderCenterArc(ctx: CanvasRenderingContext2D, zoom: number): void {
    const pointRadius = 4 / zoom;

    if (!this.point1) return;

    // Draw center point
    this.drawPoint(ctx, this.point1, pointRadius, '#FF6600');

    const startPoint = this.point2 || this.currentPoint;
    if (!startPoint) return;

    const radius = Math.sqrt(
      Math.pow(startPoint.x - this.point1.x, 2) + Math.pow(startPoint.y - this.point1.y, 2)
    );

    // Draw radius line
    ctx.beginPath();
    ctx.moveTo(this.point1.x, this.point1.y);
    ctx.lineTo(startPoint.x, startPoint.y);
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw start point
    this.drawPoint(ctx, startPoint, pointRadius, this.point2 ? '#00FF66' : '#FFFFFF');

    // Draw full circle preview (faint)
    ctx.beginPath();
    ctx.arc(this.point1.x, this.point1.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 102, 255, 0.3)';
    ctx.lineWidth = 1 / zoom;
    ctx.stroke();

    // Draw arc if we have end point
    if (this.point2 && this.currentPoint) {
      const startAngle = Math.atan2(this.point2.y - this.point1.y, this.point2.x - this.point1.x);
      const endAngle = Math.atan2(this.currentPoint.y - this.point1.y, this.currentPoint.x - this.point1.x);

      ctx.beginPath();
      ctx.arc(this.point1.x, this.point1.y, radius, startAngle, endAngle);
      ctx.strokeStyle = '#0066FF';
      ctx.lineWidth = Math.max(this.options.strokeWidth, 1 / zoom);
      ctx.stroke();

      // Draw end point on circle
      const endOnCircle = {
        x: this.point1.x + Math.cos(endAngle) * radius,
        y: this.point1.y + Math.sin(endAngle) * radius,
      };
      this.drawPoint(ctx, endOnCircle, pointRadius, '#FFFFFF');
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
   * Calculate arc from 3 points.
   */
  private calculate3PointArc(p1: Point, p2: Point, p3: Point): {
    cx: number;
    cy: number;
    radius: number;
    startAngle: number;
    endAngle: number;
    counterClockwise: boolean;
  } | null {
    // Find circle through 3 points using perpendicular bisectors
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;

    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

    if (Math.abs(d) < 1e-10) {
      // Points are collinear
      return null;
    }

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

    const radius = Math.sqrt(Math.pow(ax - ux, 2) + Math.pow(ay - uy, 2));

    const startAngle = Math.atan2(ay - uy, ax - ux);
    const endAngle = Math.atan2(by - uy, bx - ux);

    // Determine direction based on arc point
    const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const counterClockwise = cross > 0;

    return { cx: ux, cy: uy, radius, startAngle, endAngle, counterClockwise };
  }

  /**
   * Constrain point to 45° angles from reference.
   */
  private constrainPoint(ref: Point, point: Point): Point {
    const dx = point.x - ref.x;
    const dy = point.y - ref.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return point;

    const angle = Math.atan2(dy, dx);
    const snap = Math.PI / 4;
    const snappedAngle = Math.round(angle / snap) * snap;

    return {
      x: ref.x + Math.cos(snappedAngle) * length,
      y: ref.y + Math.sin(snappedAngle) * length,
    };
  }

  /**
   * Complete the arc and create the node.
   */
  private completeArc(): void {
    if (!this.point1 || !this.point2 || !this.point3) {
      this.reset();
      return;
    }

    let path: VectorPath;
    let bounds: { x: number; y: number; width: number; height: number };

    if (this.mode === '3-point') {
      const result = this.create3PointArcPath();
      if (!result) {
        this.reset();
        return;
      }
      path = result.path;
      bounds = result.bounds;
    } else {
      const result = this.createCenterArcPath();
      path = result.path;
      bounds = result.bounds;
    }

    if (this.onArcComplete) {
      this.createdNodeId = this.onArcComplete(path, bounds);
    }

    this.reset();
    this.onPreviewUpdate?.();
  }

  /**
   * Create path for 3-point arc.
   */
  private create3PointArcPath(): { path: VectorPath; bounds: { x: number; y: number; width: number; height: number } } | null {
    const arc = this.calculate3PointArc(this.point1!, this.point2!, this.point3!);
    if (!arc) return null;

    return this.createArcPathFromParams(arc);
  }

  /**
   * Create path for center-based arc.
   */
  private createCenterArcPath(): { path: VectorPath; bounds: { x: number; y: number; width: number; height: number } } {
    const center = this.point1!;
    const start = this.point2!;
    const endRef = this.point3!;

    const radius = Math.sqrt(Math.pow(start.x - center.x, 2) + Math.pow(start.y - center.y, 2));
    const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const endAngle = Math.atan2(endRef.y - center.y, endRef.x - center.x);

    return this.createArcPathFromParams({
      cx: center.x,
      cy: center.y,
      radius,
      startAngle,
      endAngle,
      counterClockwise: false,
    });
  }

  /**
   * Create arc path from parameters.
   */
  private createArcPathFromParams(arc: {
    cx: number;
    cy: number;
    radius: number;
    startAngle: number;
    endAngle: number;
    counterClockwise: boolean;
  }): { path: VectorPath; bounds: { x: number; y: number; width: number; height: number } } {
    const { cx, cy, radius, startAngle, endAngle, counterClockwise } = arc;

    // Calculate bounds
    const minX = cx - radius;
    const minY = cy - radius;
    const bounds = { x: minX, y: minY, width: radius * 2, height: radius * 2 };

    // Create arc using cubic bezier approximation
    const startX = cx + Math.cos(startAngle) * radius - minX;
    const startY = cy + Math.sin(startAngle) * radius - minY;

    // Calculate sweep angle
    let sweep = endAngle - startAngle;
    if (counterClockwise && sweep > 0) sweep -= Math.PI * 2;
    if (!counterClockwise && sweep < 0) sweep += Math.PI * 2;

    // Approximate arc with cubic beziers (one per 90 degrees)
    const commands: PathCommand[] = [{ type: 'M', x: startX, y: startY }];

    const segments = Math.ceil(Math.abs(sweep) / (Math.PI / 2));
    const segmentAngle = sweep / segments;

    let currentAngle = startAngle;
    for (let i = 0; i < segments; i++) {
      const nextAngle = currentAngle + segmentAngle;

      // Bezier control point calculation for arc
      const kappa = (4 / 3) * Math.tan(Math.abs(segmentAngle) / 4);

      const x1 = cx + Math.cos(currentAngle) * radius - minX;
      const y1 = cy + Math.sin(currentAngle) * radius - minY;
      const x4 = cx + Math.cos(nextAngle) * radius - minX;
      const y4 = cy + Math.sin(nextAngle) * radius - minY;

      const sign = segmentAngle > 0 ? 1 : -1;
      const x2 = x1 - kappa * radius * Math.sin(currentAngle) * sign;
      const y2 = y1 + kappa * radius * Math.cos(currentAngle) * sign;
      const x3 = x4 + kappa * radius * Math.sin(nextAngle) * sign;
      const y3 = y4 - kappa * radius * Math.cos(nextAngle) * sign;

      commands.push({ type: 'C', x1: x2, y1: y2, x2: x3, y2: y3, x: x4, y: y4 });

      currentAngle = nextAngle;
    }

    return { path: { windingRule: 'NONZERO', commands }, bounds };
  }

  /**
   * Reset the tool state.
   */
  private reset(): void {
    this.point1 = null;
    this.point2 = null;
    this.point3 = null;
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
 * Create an arc tool.
 */
export function createArcTool(options?: ArcToolOptions): ArcTool {
  return new ArcTool(options);
}
