/**
 * Trim Tool
 *
 * Trims paths/lines at their intersection with cutting edges.
 * CAD-standard trim behavior:
 * 1. Select cutting edges (boundaries)
 * 2. Click on portions of lines to remove
 *
 * Supports:
 * - Single cutting edge trim
 * - Multiple cutting edges
 * - Trim to nearest intersection
 */

import type { Point, VectorPath, PathCommand } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
import {
  lineSegmentIntersection,
  closestPointOnSegment,
  type LineSegment,
} from '@core/geometry/intersection';

/**
 * Trim operation result
 */
export interface TrimResult {
  /** Node that was trimmed */
  readonly nodeId: NodeId;
  /** New path after trim */
  readonly newPath: VectorPath;
  /** Whether node was split into multiple pieces */
  readonly wasSplit: boolean;
  /** New node IDs if split */
  readonly newNodeIds?: NodeId[];
}

/**
 * Trimmable line data
 */
export interface TrimmableLine {
  readonly nodeId: NodeId;
  readonly segment: LineSegment;
  readonly path: VectorPath;
}

/**
 * Trim tool options
 */
export interface TrimToolOptions {
  /** Highlight distance for hover detection */
  readonly hoverDistance?: number;
  /** Maximum number of cutting edges */
  readonly maxCuttingEdges?: number;
}

const DEFAULT_OPTIONS: Required<TrimToolOptions> = {
  hoverDistance: 10,
  maxCuttingEdges: 100,
};

/**
 * Trim tool for CAD-style line trimming
 */
export class TrimTool extends BaseTool {
  readonly name = 'trim';
  cursor: ToolCursor = 'crosshair';

  private options: Required<TrimToolOptions>;
  private cuttingEdges: TrimmableLine[] = [];
  private hoveredSegment: { line: TrimmableLine; clickPoint: Point } | null = null;

  // Callbacks
  private onGetTrimmableLines?: () => TrimmableLine[];
  private onTrim?: (nodeId: NodeId, newPath: VectorPath) => TrimResult;
  private onPreviewUpdate?: () => void;
  private onCuttingEdgesChanged?: (edges: TrimmableLine[]) => void;

  constructor(options: TrimToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set callback to get trimmable lines
   */
  setOnGetTrimmableLines(callback: () => TrimmableLine[]): void {
    this.onGetTrimmableLines = callback;
  }

  /**
   * Set callback for trim operation
   */
  setOnTrim(callback: (nodeId: NodeId, newPath: VectorPath) => TrimResult): void {
    this.onTrim = callback;
  }

  /**
   * Set callback for preview updates
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Set callback for cutting edges changed
   */
  setOnCuttingEdgesChanged(callback: (edges: TrimmableLine[]) => void): void {
    this.onCuttingEdgesChanged = callback;
  }

  /**
   * Add a cutting edge
   */
  addCuttingEdge(line: TrimmableLine): void {
    if (this.cuttingEdges.length < this.options.maxCuttingEdges) {
      // Avoid duplicates
      if (!this.cuttingEdges.some(e => e.nodeId === line.nodeId)) {
        this.cuttingEdges.push(line);
        this.onCuttingEdgesChanged?.(this.cuttingEdges);
      }
    }
  }

  /**
   * Remove a cutting edge
   */
  removeCuttingEdge(nodeId: NodeId): void {
    this.cuttingEdges = this.cuttingEdges.filter(e => e.nodeId !== nodeId);
    this.onCuttingEdgesChanged?.(this.cuttingEdges);
  }

  /**
   * Clear all cutting edges
   */
  clearCuttingEdges(): void {
    this.cuttingEdges = [];
    this.onCuttingEdgesChanged?.(this.cuttingEdges);
  }

  /**
   * Get current cutting edges
   */
  getCuttingEdges(): readonly TrimmableLine[] {
    return this.cuttingEdges;
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.clearCuttingEdges();
    this.hoveredSegment = null;
  }

  override deactivate(): void {
    this.clearCuttingEdges();
    this.hoveredSegment = null;
    super.deactivate();
  }

  override onPointerDown(event: PointerEventData, _context: ToolContext): boolean {
    const clickPoint = { x: event.worldX, y: event.worldY };

    // If holding shift, add/remove cutting edge
    if (event.shiftKey && this.hoveredSegment) {
      const nodeId = this.hoveredSegment.line.nodeId;
      if (this.cuttingEdges.some(e => e.nodeId === nodeId)) {
        this.removeCuttingEdge(nodeId);
      } else {
        this.addCuttingEdge(this.hoveredSegment.line);
      }
      this.onPreviewUpdate?.();
      return true;
    }

    // Otherwise, try to trim
    if (this.hoveredSegment && this.cuttingEdges.length > 0) {
      this.performTrim(this.hoveredSegment.line, clickPoint);
      this.onPreviewUpdate?.();
      return true;
    }

    // If no cutting edges, first click adds cutting edge
    if (this.cuttingEdges.length === 0 && this.hoveredSegment) {
      this.addCuttingEdge(this.hoveredSegment.line);
      this.onPreviewUpdate?.();
      return true;
    }

    return false;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    const point = { x: event.worldX, y: event.worldY };

    // Find nearest line
    this.hoveredSegment = this.findNearestLine(point);
    this.onPreviewUpdate?.();
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape') {
      if (this.cuttingEdges.length > 0) {
        this.clearCuttingEdges();
        this.onPreviewUpdate?.();
        return true;
      }
    }

    // 'C' to clear cutting edges
    if (event.key === 'c' || event.key === 'C') {
      this.clearCuttingEdges();
      this.onPreviewUpdate?.();
      return true;
    }

    return false;
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const zoom = context.viewport.getZoom();

    ctx.save();

    // Draw cutting edges
    for (const edge of this.cuttingEdges) {
      ctx.beginPath();
      ctx.moveTo(edge.segment.start.x, edge.segment.start.y);
      ctx.lineTo(edge.segment.end.x, edge.segment.end.y);
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();

      // Draw markers at endpoints
      for (const point of [edge.segment.start, edge.segment.end]) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#FF0000';
        ctx.fill();
      }
    }

    // Draw hovered segment
    if (this.hoveredSegment) {
      const { line, clickPoint } = this.hoveredSegment;
      const isCuttingEdge = this.cuttingEdges.some(e => e.nodeId === line.nodeId);

      ctx.beginPath();
      ctx.moveTo(line.segment.start.x, line.segment.start.y);
      ctx.lineTo(line.segment.end.x, line.segment.end.y);
      ctx.strokeStyle = isCuttingEdge ? '#FF6600' : '#00FF00';
      ctx.lineWidth = 3 / zoom;
      ctx.stroke();

      // If we have cutting edges, show trim preview
      if (this.cuttingEdges.length > 0 && !isCuttingEdge) {
        const trimPreview = this.calculateTrimPreview(line, clickPoint);
        if (trimPreview) {
          // Highlight portion to be removed
          ctx.beginPath();
          ctx.moveTo(trimPreview.removeStart.x, trimPreview.removeStart.y);
          ctx.lineTo(trimPreview.removeEnd.x, trimPreview.removeEnd.y);
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.lineWidth = 4 / zoom;
          ctx.setLineDash([5 / zoom, 5 / zoom]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Draw instructions
    const fontSize = 12 / zoom;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.restore();
  }

  /**
   * Find the nearest line to a point
   */
  private findNearestLine(point: Point): { line: TrimmableLine; clickPoint: Point } | null {
    if (!this.onGetTrimmableLines) return null;

    const lines = this.onGetTrimmableLines();
    let nearest: { line: TrimmableLine; distance: number } | null = null;

    for (const line of lines) {
      const closest = closestPointOnSegment(point, line.segment);
      if (closest.distance < this.options.hoverDistance) {
        if (!nearest || closest.distance < nearest.distance) {
          nearest = { line, distance: closest.distance };
        }
      }
    }

    return nearest ? { line: nearest.line, clickPoint: point } : null;
  }

  /**
   * Calculate trim preview (what would be removed)
   */
  private calculateTrimPreview(
    line: TrimmableLine,
    clickPoint: Point
  ): { removeStart: Point; removeEnd: Point } | null {
    // Find all intersections with cutting edges
    const intersections: { point: Point; t: number }[] = [];

    for (const edge of this.cuttingEdges) {
      if (edge.nodeId === line.nodeId) continue;

      const int = lineSegmentIntersection(line.segment, edge.segment);
      if (int) {
        intersections.push({ point: int.point, t: int.t1 });
      }
    }

    if (intersections.length === 0) return null;

    // Sort by parameter
    intersections.sort((a, b) => a.t - b.t);

    // Find where click point falls
    const closestOnLine = closestPointOnSegment(clickPoint, line.segment);
    const clickT = closestOnLine.t;

    // Find the segment to remove
    let removeStart: Point;
    let removeEnd: Point;

    // Find intersections before and after click
    const before = intersections.filter(i => i.t < clickT);
    const after = intersections.filter(i => i.t > clickT);

    if (before.length > 0 && after.length > 0) {
      // Click is between two intersections - remove that section
      removeStart = before[before.length - 1]!.point;
      removeEnd = after[0]!.point;
    } else if (before.length > 0) {
      // Click is after all intersections - remove from last intersection to end
      removeStart = before[before.length - 1]!.point;
      removeEnd = line.segment.end;
    } else {
      // Click is before all intersections - remove from start to first intersection
      removeStart = line.segment.start;
      removeEnd = after[0]!.point;
    }

    return { removeStart, removeEnd };
  }

  /**
   * Perform trim operation
   */
  private performTrim(line: TrimmableLine, clickPoint: Point): void {
    if (!this.onTrim) return;

    const trimPreview = this.calculateTrimPreview(line, clickPoint);
    if (!trimPreview) return;

    // Create new path with trimmed portion removed
    const newPath = this.createTrimmedPath(line, trimPreview);
    if (newPath) {
      this.onTrim(line.nodeId, newPath);
    }
  }

  /**
   * Create a new path with the trimmed portion removed
   */
  private createTrimmedPath(
    line: TrimmableLine,
    preview: { removeStart: Point; removeEnd: Point }
  ): VectorPath | null {
    const { segment } = line;

    // Calculate parameters for removal points
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 1e-10) return null;

    const startT = Math.sqrt(
      (preview.removeStart.x - segment.start.x) ** 2 +
      (preview.removeStart.y - segment.start.y) ** 2
    ) / len;

    const endT = Math.sqrt(
      (preview.removeEnd.x - segment.start.x) ** 2 +
      (preview.removeEnd.y - segment.start.y) ** 2
    ) / len;

    // Determine what to keep
    const commands: PathCommand[] = [];

    if (startT > 0.001) {
      // Keep start portion
      commands.push({ type: 'M', x: 0, y: 0 });
      commands.push({
        type: 'L',
        x: preview.removeStart.x - segment.start.x,
        y: preview.removeStart.y - segment.start.y,
      });
    }

    if (endT < 0.999) {
      // Keep end portion
      if (commands.length === 0) {
        commands.push({
          type: 'M',
          x: preview.removeEnd.x - segment.start.x,
          y: preview.removeEnd.y - segment.start.y,
        });
      }
      commands.push({
        type: 'L',
        x: segment.end.x - segment.start.x,
        y: segment.end.y - segment.start.y,
      });
    }

    if (commands.length === 0) return null;

    return {
      windingRule: 'NONZERO',
      commands,
    };
  }
}

/**
 * Create a trim tool
 */
export function createTrimTool(options?: TrimToolOptions): TrimTool {
  return new TrimTool(options);
}
