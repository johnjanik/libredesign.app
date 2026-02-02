/**
 * Chamfer Tool
 *
 * Creates beveled corners at the intersection of two lines.
 * A chamfer is a straight line that connects two lines by cutting off the corner.
 *
 * Supports:
 * - Click on intersection to add chamfer
 * - Equal distance from intersection (45° chamfer)
 * - Asymmetric distances
 * - Angle-based chamfer
 */

import type { Point, VectorPath, PathCommand } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
import {
  lineLineIntersection,
  type LineSegment,
} from '@core/geometry/intersection';

/**
 * Chamfer operation result
 */
export interface ChamferResult {
  /** Node IDs involved */
  readonly nodeIds: [NodeId, NodeId];
  /** New path with chamfer */
  readonly newPath: VectorPath;
  /** Chamfer start point */
  readonly chamferStart: Point;
  /** Chamfer end point */
  readonly chamferEnd: Point;
}

/**
 * Line data for chamfer
 */
export interface ChamferableLine {
  readonly nodeId: NodeId;
  readonly segment: LineSegment;
}

/**
 * Chamfer mode
 */
export type ChamferMode = 'equal' | 'asymmetric' | 'angle';

/**
 * Chamfer tool options
 */
export interface ChamferToolOptions {
  /** Chamfer mode */
  readonly mode?: ChamferMode;
  /** Distance for first line (or both in equal mode) */
  readonly distance1?: number;
  /** Distance for second line (asymmetric mode) */
  readonly distance2?: number;
  /** Chamfer angle in degrees (angle mode) */
  readonly angle?: number;
  /** Minimum distance */
  readonly minDistance?: number;
  /** Maximum distance */
  readonly maxDistance?: number;
  /** Hover distance for intersection detection */
  readonly hoverDistance?: number;
}

const DEFAULT_OPTIONS: Required<ChamferToolOptions> = {
  mode: 'equal',
  distance1: 20,
  distance2: 20,
  angle: 45,
  minDistance: 1,
  maxDistance: 1000,
  hoverDistance: 20,
};

/**
 * Chamfer preview data
 */
interface ChamferPreview {
  /** Start point of chamfer line */
  readonly chamferStart: Point;
  /** End point of chamfer line */
  readonly chamferEnd: Point;
  /** Intersection point */
  readonly intersection: Point;
  /** Lines being chamfered */
  readonly lines: [ChamferableLine, ChamferableLine];
}

/**
 * Chamfer tool for creating beveled corners
 */
export class ChamferTool extends BaseTool {
  readonly name = 'chamfer';
  cursor: ToolCursor = 'crosshair';

  private options: Required<ChamferToolOptions>;
  private distance1: number;
  private distance2: number;
  private mode: ChamferMode;
  private chamferPreview: ChamferPreview | null = null;

  // Callbacks
  private onGetChamferableLines?: () => ChamferableLine[];
  private onChamfer?: (line1: ChamferableLine, line2: ChamferableLine, path: VectorPath) => ChamferResult;
  private onPreviewUpdate?: () => void;
  private onSettingsChanged?: (mode: ChamferMode, distance1: number, distance2: number) => void;

  constructor(options: ChamferToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.mode = this.options.mode;
    this.distance1 = this.options.distance1;
    this.distance2 = this.options.distance2;
  }

  /**
   * Set callback to get chamferable lines
   */
  setOnGetChamferableLines(callback: () => ChamferableLine[]): void {
    this.onGetChamferableLines = callback;
  }

  /**
   * Set callback for chamfer operation
   */
  setOnChamfer(callback: (line1: ChamferableLine, line2: ChamferableLine, path: VectorPath) => ChamferResult): void {
    this.onChamfer = callback;
  }

  /**
   * Set callback for preview updates
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Set callback for settings changes
   */
  setOnSettingsChanged(callback: (mode: ChamferMode, distance1: number, distance2: number) => void): void {
    this.onSettingsChanged = callback;
  }

  /**
   * Get current mode
   */
  getMode(): ChamferMode {
    return this.mode;
  }

  /**
   * Set chamfer mode
   */
  setMode(mode: ChamferMode): void {
    this.mode = mode;
    if (mode === 'equal') {
      this.distance2 = this.distance1;
    }
    this.onSettingsChanged?.(this.mode, this.distance1, this.distance2);
    this.onPreviewUpdate?.();
  }

  /**
   * Get current distances
   */
  getDistances(): { distance1: number; distance2: number } {
    return { distance1: this.distance1, distance2: this.distance2 };
  }

  /**
   * Set chamfer distance(s)
   */
  setDistance(distance1: number, distance2?: number): void {
    this.distance1 = Math.max(
      this.options.minDistance,
      Math.min(this.options.maxDistance, distance1)
    );

    if (this.mode === 'equal' || distance2 === undefined) {
      this.distance2 = this.distance1;
    } else {
      this.distance2 = Math.max(
        this.options.minDistance,
        Math.min(this.options.maxDistance, distance2)
      );
    }

    this.onSettingsChanged?.(this.mode, this.distance1, this.distance2);
    this.onPreviewUpdate?.();
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.chamferPreview = null;
  }

  override deactivate(): void {
    this.chamferPreview = null;
    super.deactivate();
  }

  override onPointerDown(_event: PointerEventData, _context: ToolContext): boolean {
    if (this.chamferPreview) {
      this.performChamfer(this.chamferPreview);
      this.onPreviewUpdate?.();
      return true;
    }
    return false;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    const point = { x: event.worldX, y: event.worldY };

    // Find nearest intersection
    this.chamferPreview = this.findChamferableIntersection(point);
    this.onPreviewUpdate?.();
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape') {
      this.chamferPreview = null;
      this.onPreviewUpdate?.();
      return true;
    }

    // Toggle mode with 'M'
    if (event.key === 'm' || event.key === 'M') {
      const modes: ChamferMode[] = ['equal', 'asymmetric'];
      const currentIndex = modes.indexOf(this.mode);
      this.setMode(modes[(currentIndex + 1) % modes.length]!);
      return true;
    }

    // Adjust distance with +/-
    if (event.key === '+' || event.key === '=') {
      this.setDistance(this.distance1 * 1.2);
      return true;
    }
    if (event.key === '-' || event.key === '_') {
      this.setDistance(this.distance1 / 1.2);
      return true;
    }

    // Number keys for preset distances
    if (event.key >= '1' && event.key <= '9') {
      const presets = [5, 10, 15, 20, 25, 30, 40, 50, 100];
      const index = parseInt(event.key) - 1;
      if (presets[index] !== undefined) {
        this.setDistance(presets[index]!);
      }
      return true;
    }

    return false;
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const zoom = context.viewport.getZoom();

    ctx.save();

    if (this.chamferPreview) {
      const { chamferStart, chamferEnd, intersection, lines } = this.chamferPreview;

      // Draw the lines being chamfered
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

      // Draw portion to be removed (dashed)
      ctx.beginPath();
      ctx.moveTo(chamferStart.x, chamferStart.y);
      ctx.lineTo(intersection.x, intersection.y);
      ctx.lineTo(chamferEnd.x, chamferEnd.y);
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
      ctx.lineWidth = 3 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw chamfer line preview
      ctx.beginPath();
      ctx.moveTo(chamferStart.x, chamferStart.y);
      ctx.lineTo(chamferEnd.x, chamferEnd.y);
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3 / zoom;
      ctx.stroke();

      // Draw chamfer endpoints
      for (const point of [chamferStart, chamferEnd]) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#00FF00';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
      }

      // Draw distance labels
      const fontSize = 11 / zoom;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Distance 1 label
      const mid1 = {
        x: (chamferStart.x + intersection.x) / 2,
        y: (chamferStart.y + intersection.y) / 2,
      };
      ctx.fillText(`${this.distance1.toFixed(1)}`, mid1.x, mid1.y - 8 / zoom);

      // Distance 2 label (only if asymmetric)
      if (this.mode === 'asymmetric' && this.distance1 !== this.distance2) {
        const mid2 = {
          x: (chamferEnd.x + intersection.x) / 2,
          y: (chamferEnd.y + intersection.y) / 2,
        };
        ctx.fillText(`${this.distance2.toFixed(1)}`, mid2.x, mid2.y - 8 / zoom);
      }

      // Chamfer length label
      const chamferLen = Math.sqrt(
        (chamferEnd.x - chamferStart.x) ** 2 +
        (chamferEnd.y - chamferStart.y) ** 2
      );
      const midChamfer = {
        x: (chamferStart.x + chamferEnd.x) / 2,
        y: (chamferStart.y + chamferEnd.y) / 2,
      };
      ctx.fillStyle = '#00AA00';
      ctx.fillText(`L=${chamferLen.toFixed(1)}`, midChamfer.x, midChamfer.y + 10 / zoom);
    }

    ctx.restore();
  }

  /**
   * Find chamferable intersection near point
   */
  private findChamferableIntersection(point: Point): ChamferPreview | null {
    if (!this.onGetChamferableLines) return null;

    const lines = this.onGetChamferableLines();
    let bestPreview: ChamferPreview | null = null;
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
          const preview = this.calculateChamferPreview(line1, line2, intersection.point);
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
   * Calculate chamfer preview for two intersecting lines
   */
  private calculateChamferPreview(
    line1: ChamferableLine,
    line2: ChamferableLine,
    intersection: Point
  ): ChamferPreview | null {
    // Get direction vectors pointing away from intersection
    const dir1 = this.getLineDirection(line1.segment, intersection);
    const dir2 = this.getLineDirection(line2.segment, intersection);

    // Calculate chamfer points
    const chamferStart = {
      x: intersection.x + dir1.x * this.distance1,
      y: intersection.y + dir1.y * this.distance1,
    };

    const chamferEnd = {
      x: intersection.x + dir2.x * this.distance2,
      y: intersection.y + dir2.y * this.distance2,
    };

    return {
      chamferStart,
      chamferEnd,
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
   * Perform chamfer operation
   */
  private performChamfer(preview: ChamferPreview): void {
    if (!this.onChamfer) return;

    const { chamferStart, chamferEnd, lines } = preview;

    // Create path with chamfer line
    const path = this.createChamferPath(chamferStart, chamferEnd);

    this.onChamfer(lines[0], lines[1], path);
  }

  /**
   * Create path with chamfer line
   */
  private createChamferPath(chamferStart: Point, chamferEnd: Point): VectorPath {
    const commands: PathCommand[] = [
      { type: 'M', x: chamferStart.x, y: chamferStart.y },
      { type: 'L', x: chamferEnd.x, y: chamferEnd.y },
    ];

    return {
      windingRule: 'NONZERO',
      commands,
    };
  }
}

/**
 * Create a chamfer tool
 */
export function createChamferTool(options?: ChamferToolOptions): ChamferTool {
  return new ChamferTool(options);
}
