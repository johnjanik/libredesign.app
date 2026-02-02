/**
 * Fillet Tool
 *
 * Creates rounded corners at the intersection of two lines.
 * A fillet is a circular arc that smoothly connects two lines.
 *
 * Supports:
 * - Click on intersection to add fillet
 * - Adjustable radius
 * - Preview of fillet arc
 */

import type { Point, VectorPath, PathCommand } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
import {
  lineLineIntersection,
  type LineSegment,
} from '@core/geometry/intersection';

/**
 * Fillet operation result
 */
export interface FilletResult {
  /** Node IDs involved */
  readonly nodeIds: [NodeId, NodeId];
  /** New path with fillet */
  readonly newPath: VectorPath;
  /** Center of fillet arc */
  readonly arcCenter: Point;
  /** Fillet radius used */
  readonly radius: number;
}

/**
 * Line data for fillet
 */
export interface FilletableLine {
  readonly nodeId: NodeId;
  readonly segment: LineSegment;
}

/**
 * Fillet tool options
 */
export interface FilletToolOptions {
  /** Default fillet radius */
  readonly radius?: number;
  /** Minimum radius */
  readonly minRadius?: number;
  /** Maximum radius */
  readonly maxRadius?: number;
  /** Hover distance for intersection detection */
  readonly hoverDistance?: number;
}

const DEFAULT_OPTIONS: Required<FilletToolOptions> = {
  radius: 20,
  minRadius: 1,
  maxRadius: 1000,
  hoverDistance: 20,
};

/**
 * Fillet preview data
 */
interface FilletPreview {
  /** Start point of fillet arc */
  readonly arcStart: Point;
  /** End point of fillet arc */
  readonly arcEnd: Point;
  /** Center of fillet arc */
  readonly arcCenter: Point;
  /** Start angle */
  readonly startAngle: number;
  /** End angle */
  readonly endAngle: number;
  /** Intersection point */
  readonly intersection: Point;
  /** Lines being filleted */
  readonly lines: [FilletableLine, FilletableLine];
}

/**
 * Fillet tool for creating rounded corners
 */
export class FilletTool extends BaseTool {
  readonly name = 'fillet';
  cursor: ToolCursor = 'crosshair';

  private options: Required<FilletToolOptions>;
  private radius: number;
  private filletPreview: FilletPreview | null = null;

  // Callbacks
  private onGetFilletableLines?: () => FilletableLine[];
  private onFillet?: (line1: FilletableLine, line2: FilletableLine, path: VectorPath) => FilletResult;
  private onPreviewUpdate?: () => void;
  private onRadiusChanged?: (radius: number) => void;

  constructor(options: FilletToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.radius = this.options.radius;
  }

  /**
   * Set callback to get filletable lines
   */
  setOnGetFilletableLines(callback: () => FilletableLine[]): void {
    this.onGetFilletableLines = callback;
  }

  /**
   * Set callback for fillet operation
   */
  setOnFillet(callback: (line1: FilletableLine, line2: FilletableLine, path: VectorPath) => FilletResult): void {
    this.onFillet = callback;
  }

  /**
   * Set callback for preview updates
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Set callback for radius changes
   */
  setOnRadiusChanged(callback: (radius: number) => void): void {
    this.onRadiusChanged = callback;
  }

  /**
   * Get current radius
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * Set fillet radius
   */
  setRadius(radius: number): void {
    this.radius = Math.max(
      this.options.minRadius,
      Math.min(this.options.maxRadius, radius)
    );
    this.onRadiusChanged?.(this.radius);
    this.onPreviewUpdate?.();
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.filletPreview = null;
  }

  override deactivate(): void {
    this.filletPreview = null;
    super.deactivate();
  }

  override onPointerDown(_event: PointerEventData, _context: ToolContext): boolean {
    if (this.filletPreview) {
      this.performFillet(this.filletPreview);
      this.onPreviewUpdate?.();
      return true;
    }
    return false;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    const point = { x: event.worldX, y: event.worldY };

    // Find nearest intersection
    this.filletPreview = this.findFilletableIntersection(point);
    this.onPreviewUpdate?.();
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape') {
      this.filletPreview = null;
      this.onPreviewUpdate?.();
      return true;
    }

    // Adjust radius with +/-
    if (event.key === '+' || event.key === '=') {
      this.setRadius(this.radius * 1.2);
      return true;
    }
    if (event.key === '-' || event.key === '_') {
      this.setRadius(this.radius / 1.2);
      return true;
    }

    // Number keys for preset radii
    if (event.key >= '1' && event.key <= '9') {
      const presets = [5, 10, 15, 20, 25, 30, 40, 50, 100];
      const index = parseInt(event.key) - 1;
      if (presets[index] !== undefined) {
        this.setRadius(presets[index]!);
      }
      return true;
    }

    return false;
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const zoom = context.viewport.getZoom();

    ctx.save();

    if (this.filletPreview) {
      const { arcStart, arcEnd, arcCenter, startAngle, endAngle, intersection, lines } = this.filletPreview;

      // Draw the lines being filleted
      for (const line of lines) {
        ctx.beginPath();
        ctx.moveTo(line.segment.start.x, line.segment.start.y);
        ctx.lineTo(line.segment.end.x, line.segment.end.y);
        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
      }

      // Draw intersection point
      ctx.beginPath();
      ctx.arc(intersection.x, intersection.y, 5 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#FF0000';
      ctx.fill();

      // Draw fillet arc preview
      ctx.beginPath();
      ctx.arc(arcCenter.x, arcCenter.y, this.radius, startAngle, endAngle);
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3 / zoom;
      ctx.stroke();

      // Draw tangent points
      for (const point of [arcStart, arcEnd]) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#00FF00';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
      }

      // Draw arc center
      ctx.beginPath();
      ctx.arc(arcCenter.x, arcCenter.y, 3 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFF00';
      ctx.fill();

      // Draw radius line
      ctx.beginPath();
      ctx.moveTo(arcCenter.x, arcCenter.y);
      ctx.lineTo(arcStart.x, arcStart.y);
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([3 / zoom, 3 / zoom]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw radius value
      const midX = (arcCenter.x + arcStart.x) / 2;
      const midY = (arcCenter.y + arcStart.y) / 2;
      const fontSize = 12 / zoom;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`R=${this.radius.toFixed(1)}`, midX, midY - 5 / zoom);
    }

    ctx.restore();
  }

  /**
   * Find filletable intersection near point
   */
  private findFilletableIntersection(point: Point): FilletPreview | null {
    if (!this.onGetFilletableLines) return null;

    const lines = this.onGetFilletableLines();
    let bestPreview: FilletPreview | null = null;
    let bestDistance = this.options.hoverDistance;

    // Check all pairs of lines for intersections
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const line1 = lines[i]!;
        const line2 = lines[j]!;

        const intersection = lineLineIntersection(line1.segment, line2.segment);
        if (!intersection) continue;

        // Check if intersection is on both segments (or close to them)
        const t1Valid = intersection.t1 >= -0.1 && intersection.t1 <= 1.1;
        const t2Valid = intersection.t2 >= -0.1 && intersection.t2 <= 1.1;
        if (!t1Valid || !t2Valid) continue;

        // Check distance from point
        const dist = Math.sqrt(
          (point.x - intersection.point.x) ** 2 +
          (point.y - intersection.point.y) ** 2
        );

        if (dist < bestDistance) {
          const preview = this.calculateFilletPreview(line1, line2, intersection.point);
          if (preview) {
            bestPreview = preview;
            bestDistance = dist;
          }
        }
      }
    }

    return bestPreview;
  }

  /**
   * Calculate fillet preview for two intersecting lines
   */
  private calculateFilletPreview(
    line1: FilletableLine,
    line2: FilletableLine,
    intersection: Point
  ): FilletPreview | null {
    // Get direction vectors
    const dir1 = this.getLineDirection(line1.segment, intersection);
    const dir2 = this.getLineDirection(line2.segment, intersection);

    // Calculate angle between lines
    const angle = Math.acos(
      Math.max(-1, Math.min(1, dir1.x * dir2.x + dir1.y * dir2.y))
    );

    // If lines are parallel or nearly parallel, no fillet possible
    if (angle < 0.01 || angle > Math.PI - 0.01) return null;

    // Calculate the fillet
    const halfAngle = angle / 2;
    const tanHalfAngle = Math.tan(halfAngle);

    // Distance from intersection to tangent points
    const tangentDist = this.radius / tanHalfAngle;

    // Bisector direction (points toward fillet center)
    const bisectorX = dir1.x + dir2.x;
    const bisectorY = dir1.y + dir2.y;
    const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY);

    if (bisectorLen < 1e-10) return null;

    const bisectorNormX = bisectorX / bisectorLen;
    const bisectorNormY = bisectorY / bisectorLen;

    // Distance from intersection to fillet center
    const centerDist = this.radius / Math.sin(halfAngle);

    // Fillet center
    const arcCenter = {
      x: intersection.x - bisectorNormX * centerDist,
      y: intersection.y - bisectorNormY * centerDist,
    };

    // Tangent points
    const arcStart = {
      x: intersection.x - dir1.x * tangentDist,
      y: intersection.y - dir1.y * tangentDist,
    };

    const arcEnd = {
      x: intersection.x - dir2.x * tangentDist,
      y: intersection.y - dir2.y * tangentDist,
    };

    // Calculate angles for arc
    const startAngle = Math.atan2(arcStart.y - arcCenter.y, arcStart.x - arcCenter.x);
    const endAngle = Math.atan2(arcEnd.y - arcCenter.y, arcEnd.x - arcCenter.x);

    return {
      arcStart,
      arcEnd,
      arcCenter,
      startAngle,
      endAngle,
      intersection,
      lines: [line1, line2],
    };
  }

  /**
   * Get direction vector of line pointing away from intersection
   */
  private getLineDirection(segment: LineSegment, intersection: Point): { x: number; y: number } {
    // Determine which direction points away from intersection
    const toStart = {
      x: segment.start.x - intersection.x,
      y: segment.start.y - intersection.y,
    };
    const toEnd = {
      x: segment.end.x - intersection.x,
      y: segment.end.y - intersection.y,
    };

    const startDist = Math.sqrt(toStart.x * toStart.x + toStart.y * toStart.y);
    const endDist = Math.sqrt(toEnd.x * toEnd.x + toEnd.y * toEnd.y);

    // Use the endpoint farther from intersection
    const dir = startDist > endDist ? toStart : toEnd;
    const len = startDist > endDist ? startDist : endDist;

    if (len < 1e-10) return { x: 1, y: 0 };

    return { x: dir.x / len, y: dir.y / len };
  }

  /**
   * Perform fillet operation
   */
  private performFillet(preview: FilletPreview): void {
    if (!this.onFillet) return;

    const { arcStart, arcEnd, arcCenter, lines } = preview;

    // Create path with fillet arc
    // The arc is a cubic Bezier approximation
    const path = this.createFilletPath(arcStart, arcEnd, arcCenter, this.radius);

    this.onFillet(lines[0], lines[1], path);
  }

  /**
   * Create path with fillet arc (as cubic Bezier)
   */
  private createFilletPath(
    arcStart: Point,
    arcEnd: Point,
    arcCenter: Point,
    radius: number
  ): VectorPath {
    // Calculate angles
    const startAngle = Math.atan2(arcStart.y - arcCenter.y, arcStart.x - arcCenter.x);
    const endAngle = Math.atan2(arcEnd.y - arcCenter.y, arcEnd.x - arcCenter.x);

    // Normalize angle difference
    let angleDiff = endAngle - startAngle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    // Approximate arc with cubic Bezier
    // Using the standard approximation for circular arcs
    const kappa = (4 / 3) * Math.tan(angleDiff / 4);

    // Control points
    const cp1 = {
      x: arcStart.x - kappa * radius * Math.sin(startAngle),
      y: arcStart.y + kappa * radius * Math.cos(startAngle),
    };

    const cp2 = {
      x: arcEnd.x + kappa * radius * Math.sin(endAngle),
      y: arcEnd.y - kappa * radius * Math.cos(endAngle),
    };

    const commands: PathCommand[] = [
      { type: 'M', x: arcStart.x, y: arcStart.y },
      {
        type: 'C',
        x1: cp1.x,
        y1: cp1.y,
        x2: cp2.x,
        y2: cp2.y,
        x: arcEnd.x,
        y: arcEnd.y,
      },
    ];

    return {
      windingRule: 'NONZERO',
      commands,
    };
  }
}

/**
 * Create a fillet tool
 */
export function createFilletTool(options?: FilletToolOptions): FilletTool {
  return new FilletTool(options);
}
