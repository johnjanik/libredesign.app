/**
 * Construction Line Tool
 *
 * Tool for creating construction geometry:
 * - Click two points to create a construction line
 * - Hold Shift to constrain to horizontal/vertical/45°
 * - Press H for horizontal, V for vertical through click point
 */

import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import {
  type ConstructionLine,
  type ConstructionRay,
  type ConstructionStyle,
  DEFAULT_CONSTRUCTION_STYLE,
  createConstructionLineFromPoints,
  createConstructionLineFromAngle,
  createRayFromPoints,
  getVisibleSegment,
  getRayVisibleSegment,
} from '@core/types/construction';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '../base/tool';

/**
 * Construction mode
 */
export type ConstructionMode = 'line' | 'ray' | 'horizontal' | 'vertical';

/**
 * Construction line tool options
 */
export interface ConstructionLineToolOptions {
  /** Initial construction mode */
  readonly mode?: ConstructionMode;
  /** Visual style for construction geometry */
  readonly style?: ConstructionStyle;
  /** Callback when construction geometry is created */
  readonly onConstruct?: (geometry: ConstructionLine | ConstructionRay) => void;
  /** Function to generate unique IDs */
  readonly generateId?: () => NodeId;
}

/**
 * Construction Line Tool
 */
export class ConstructionLineTool extends BaseTool {
  readonly name = 'construction-line';
  cursor: ToolCursor = 'crosshair';

  private mode: ConstructionMode = 'line';
  private style: ConstructionStyle;
  private onConstruct: ((geometry: ConstructionLine | ConstructionRay) => void) | null = null;
  private generateId: () => NodeId;

  // Drawing state
  private firstPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private constrainAngle = false;

  constructor(options: ConstructionLineToolOptions = {}) {
    super();
    this.mode = options.mode ?? 'line';
    this.style = options.style ?? DEFAULT_CONSTRUCTION_STYLE;
    this.onConstruct = options.onConstruct ?? null;
    this.generateId = options.generateId ?? (() => `cline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as NodeId);
  }

  /**
   * Set construction mode
   */
  setMode(mode: ConstructionMode): void {
    this.mode = mode;
    this.reset();
  }

  /**
   * Get current mode
   */
  getMode(): ConstructionMode {
    return this.mode;
  }

  /**
   * Set visual style
   */
  setStyle(style: ConstructionStyle): void {
    this.style = style;
  }

  /**
   * Set callback for construction
   */
  setOnConstruct(callback: (geometry: ConstructionLine | ConstructionRay) => void): void {
    this.onConstruct = callback;
  }

  activate(context: ToolContext): void {
    super.activate(context);
    this.reset();
  }

  deactivate(): void {
    this.reset();
    super.deactivate();
  }

  private reset(): void {
    this.firstPoint = null;
    this.currentPoint = null;
    this.constrainAngle = false;
  }

  onPointerDown(event: PointerEventData, _context: ToolContext): boolean {
    const point: Point = { x: event.worldX, y: event.worldY };
    this.constrainAngle = event.shiftKey;

    if (this.mode === 'horizontal' || this.mode === 'vertical') {
      // Single click for horizontal/vertical lines
      const angle = this.mode === 'horizontal' ? 0 : 90;
      const line = createConstructionLineFromAngle(
        this.generateId(),
        point,
        angle,
        this.style
      );
      this.onConstruct?.(line);
      return true;
    }

    if (!this.firstPoint) {
      // First click - set start point
      this.firstPoint = point;
      this.currentPoint = point;
    } else {
      // Second click - create construction geometry
      this.finishConstruction(point);
    }

    return true;
  }

  onPointerMove(event: PointerEventData, _context: ToolContext): void {
    if (!this.firstPoint) return;

    let point: Point = { x: event.worldX, y: event.worldY };
    this.constrainAngle = event.shiftKey;

    // Apply angle constraint if shift is held
    if (this.constrainAngle) {
      point = this.constrainToAngle(this.firstPoint, point);
    }

    this.currentPoint = point;
  }

  onPointerUp(_event: PointerEventData, _context: ToolContext): void {
    // Construction completes on second click, not on mouse up
  }

  onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    // Escape to cancel
    if (event.key === 'Escape') {
      this.reset();
      return true;
    }

    // H for horizontal mode
    if (event.key === 'h' || event.key === 'H') {
      this.mode = 'horizontal';
      return true;
    }

    // V for vertical mode
    if (event.key === 'v' || event.key === 'V') {
      this.mode = 'vertical';
      return true;
    }

    // L for line mode
    if (event.key === 'l' || event.key === 'L') {
      this.mode = 'line';
      return true;
    }

    // R for ray mode
    if (event.key === 'r' || event.key === 'R') {
      this.mode = 'ray';
      return true;
    }

    return false;
  }

  onKeyUp(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Shift') {
      this.constrainAngle = false;
    }
    return false;
  }

  getCursor(_point: Point, _context: ToolContext): ToolCursor {
    return 'crosshair';
  }

  render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (!this.firstPoint || !this.currentPoint) return;

    const zoom = context.viewport.getZoom();
    const viewportBounds = context.viewport.getVisibleBounds();

    // Create temporary construction geometry for preview
    if (this.mode === 'line') {
      const line = createConstructionLineFromPoints(
        'preview' as NodeId,
        this.firstPoint,
        this.currentPoint,
        this.style
      );
      this.renderConstructionLine(ctx, line, viewportBounds, zoom);
    } else if (this.mode === 'ray') {
      const ray = createRayFromPoints(
        'preview' as NodeId,
        this.firstPoint,
        this.currentPoint,
        this.style
      );
      this.renderConstructionRay(ctx, ray, viewportBounds, zoom);
    }

    // Render first point marker
    this.renderPointMarker(ctx, this.firstPoint, zoom, '#00ffff');

    // Render angle indicator if constrained
    if (this.constrainAngle) {
      this.renderAngleIndicator(ctx, this.firstPoint, this.currentPoint, zoom);
    }
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private finishConstruction(endPoint: Point): void {
    if (!this.firstPoint) return;

    let point = endPoint;
    if (this.constrainAngle) {
      point = this.constrainToAngle(this.firstPoint, point);
    }

    const id = this.generateId();

    if (this.mode === 'line') {
      const line = createConstructionLineFromPoints(id, this.firstPoint, point, this.style);
      this.onConstruct?.(line);
    } else if (this.mode === 'ray') {
      const ray = createRayFromPoints(id, this.firstPoint, point, this.style);
      this.onConstruct?.(ray);
    }

    this.reset();
  }

  private constrainToAngle(from: Point, to: Point): Point {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return to;

    // Calculate angle and snap to nearest 15 degrees
    let angle = Math.atan2(dy, dx);
    const snapAngle = Math.PI / 12; // 15 degrees
    angle = Math.round(angle / snapAngle) * snapAngle;

    return {
      x: from.x + distance * Math.cos(angle),
      y: from.y + distance * Math.sin(angle),
    };
  }

  private renderConstructionLine(
    ctx: CanvasRenderingContext2D,
    line: ConstructionLine,
    viewportBounds: { minX: number; minY: number; maxX: number; maxY: number },
    zoom: number
  ): void {
    const segment = getVisibleSegment(line, viewportBounds);
    if (!segment) return;

    ctx.save();
    ctx.strokeStyle = line.style.color;
    ctx.lineWidth = line.style.weight / zoom;
    ctx.globalAlpha = line.style.opacity;
    this.applyLinePattern(ctx, line.style.pattern, zoom);

    ctx.beginPath();
    ctx.moveTo(segment[0].x, segment[0].y);
    ctx.lineTo(segment[1].x, segment[1].y);
    ctx.stroke();

    ctx.restore();
  }

  private renderConstructionRay(
    ctx: CanvasRenderingContext2D,
    ray: ConstructionRay,
    viewportBounds: { minX: number; minY: number; maxX: number; maxY: number },
    zoom: number
  ): void {
    const segment = getRayVisibleSegment(ray, viewportBounds);
    if (!segment) return;

    ctx.save();
    ctx.strokeStyle = ray.style.color;
    ctx.lineWidth = ray.style.weight / zoom;
    ctx.globalAlpha = ray.style.opacity;
    this.applyLinePattern(ctx, ray.style.pattern, zoom);

    ctx.beginPath();
    ctx.moveTo(segment[0].x, segment[0].y);
    ctx.lineTo(segment[1].x, segment[1].y);
    ctx.stroke();

    // Draw origin marker for ray
    this.renderPointMarker(ctx, ray.origin, zoom, ray.style.color);

    ctx.restore();
  }

  private applyLinePattern(
    ctx: CanvasRenderingContext2D,
    pattern: 'solid' | 'dashed' | 'dotted' | 'dash-dot',
    zoom: number
  ): void {
    const scale = 1 / zoom;
    switch (pattern) {
      case 'dashed':
        ctx.setLineDash([8 * scale, 4 * scale]);
        break;
      case 'dotted':
        ctx.setLineDash([2 * scale, 2 * scale]);
        break;
      case 'dash-dot':
        ctx.setLineDash([8 * scale, 3 * scale, 2 * scale, 3 * scale]);
        break;
      default:
        ctx.setLineDash([]);
    }
  }

  private renderPointMarker(
    ctx: CanvasRenderingContext2D,
    point: Point,
    zoom: number,
    color: string
  ): void {
    const size = 6 / zoom;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([]);

    // Draw X marker
    ctx.beginPath();
    ctx.moveTo(point.x - size, point.y - size);
    ctx.lineTo(point.x + size, point.y + size);
    ctx.moveTo(point.x + size, point.y - size);
    ctx.lineTo(point.x - size, point.y + size);
    ctx.stroke();

    ctx.restore();
  }

  private renderAngleIndicator(
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    zoom: number
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const snappedAngle = Math.round(angle / 15) * 15;

    ctx.save();
    ctx.fillStyle = '#00ffff';
    ctx.font = `${12 / zoom}px sans-serif`;
    ctx.fillText(`${snappedAngle}°`, from.x + 15 / zoom, from.y - 10 / zoom);
    ctx.restore();
  }
}

/**
 * Create a construction line tool instance
 */
export function createConstructionLineTool(options?: ConstructionLineToolOptions): ConstructionLineTool {
  return new ConstructionLineTool(options);
}
