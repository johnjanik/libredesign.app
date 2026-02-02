/**
 * Extend Tool
 *
 * Extends paths/lines to meet a boundary edge.
 * CAD-standard extend behavior:
 * 1. Select boundary edges (targets)
 * 2. Click on ends of lines to extend them
 *
 * Supports:
 * - Single boundary edge
 * - Multiple boundary edges (extends to nearest)
 * - Extend from start or end of line
 */

import type { Point, VectorPath, PathCommand } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
import {
  lineLineIntersection,
  type LineSegment,
} from '@core/geometry/intersection';

/**
 * Extend operation result
 */
export interface ExtendResult {
  /** Node that was extended */
  readonly nodeId: NodeId;
  /** New path after extension */
  readonly newPath: VectorPath;
  /** Which end was extended */
  readonly extendedEnd: 'start' | 'end';
  /** New endpoint */
  readonly newEndpoint: Point;
}

/**
 * Extendable line data
 */
export interface ExtendableLine {
  readonly nodeId: NodeId;
  readonly segment: LineSegment;
  readonly path: VectorPath;
}

/**
 * Extend tool options
 */
export interface ExtendToolOptions {
  /** Hover distance for end detection */
  readonly hoverDistance?: number;
  /** Maximum extension distance (0 = unlimited) */
  readonly maxExtension?: number;
  /** Maximum number of boundary edges */
  readonly maxBoundaryEdges?: number;
}

const DEFAULT_OPTIONS: Required<ExtendToolOptions> = {
  hoverDistance: 15,
  maxExtension: 0,
  maxBoundaryEdges: 100,
};

/**
 * Extend tool for CAD-style line extension
 */
export class ExtendTool extends BaseTool {
  readonly name = 'extend';
  cursor: ToolCursor = 'crosshair';

  private options: Required<ExtendToolOptions>;
  private boundaryEdges: ExtendableLine[] = [];
  private hoveredEnd: { line: ExtendableLine; end: 'start' | 'end' } | null = null;
  private extendPreview: { from: Point; to: Point } | null = null;

  // Callbacks
  private onGetExtendableLines?: () => ExtendableLine[];
  private onExtend?: (nodeId: NodeId, newPath: VectorPath, end: 'start' | 'end') => ExtendResult;
  private onPreviewUpdate?: () => void;
  private onBoundaryEdgesChanged?: (edges: ExtendableLine[]) => void;

  constructor(options: ExtendToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set callback to get extendable lines
   */
  setOnGetExtendableLines(callback: () => ExtendableLine[]): void {
    this.onGetExtendableLines = callback;
  }

  /**
   * Set callback for extend operation
   */
  setOnExtend(callback: (nodeId: NodeId, newPath: VectorPath, end: 'start' | 'end') => ExtendResult): void {
    this.onExtend = callback;
  }

  /**
   * Set callback for preview updates
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Set callback for boundary edges changed
   */
  setOnBoundaryEdgesChanged(callback: (edges: ExtendableLine[]) => void): void {
    this.onBoundaryEdgesChanged = callback;
  }

  /**
   * Add a boundary edge
   */
  addBoundaryEdge(line: ExtendableLine): void {
    if (this.boundaryEdges.length < this.options.maxBoundaryEdges) {
      if (!this.boundaryEdges.some(e => e.nodeId === line.nodeId)) {
        this.boundaryEdges.push(line);
        this.onBoundaryEdgesChanged?.(this.boundaryEdges);
      }
    }
  }

  /**
   * Remove a boundary edge
   */
  removeBoundaryEdge(nodeId: NodeId): void {
    this.boundaryEdges = this.boundaryEdges.filter(e => e.nodeId !== nodeId);
    this.onBoundaryEdgesChanged?.(this.boundaryEdges);
  }

  /**
   * Clear all boundary edges
   */
  clearBoundaryEdges(): void {
    this.boundaryEdges = [];
    this.onBoundaryEdgesChanged?.(this.boundaryEdges);
  }

  /**
   * Get current boundary edges
   */
  getBoundaryEdges(): readonly ExtendableLine[] {
    return this.boundaryEdges;
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.clearBoundaryEdges();
    this.hoveredEnd = null;
    this.extendPreview = null;
  }

  override deactivate(): void {
    this.clearBoundaryEdges();
    this.hoveredEnd = null;
    this.extendPreview = null;
    super.deactivate();
  }

  override onPointerDown(event: PointerEventData, _context: ToolContext): boolean {
    // If holding shift, add/remove boundary edge
    if (event.shiftKey && this.hoveredEnd) {
      const nodeId = this.hoveredEnd.line.nodeId;
      if (this.boundaryEdges.some(e => e.nodeId === nodeId)) {
        this.removeBoundaryEdge(nodeId);
      } else {
        this.addBoundaryEdge(this.hoveredEnd.line);
      }
      this.onPreviewUpdate?.();
      return true;
    }

    // Try to extend
    if (this.hoveredEnd && this.boundaryEdges.length > 0 && this.extendPreview) {
      this.performExtend(this.hoveredEnd.line, this.hoveredEnd.end, this.extendPreview.to);
      this.onPreviewUpdate?.();
      return true;
    }

    // If no boundary edges, first click adds boundary edge
    if (this.boundaryEdges.length === 0 && this.hoveredEnd) {
      this.addBoundaryEdge(this.hoveredEnd.line);
      this.onPreviewUpdate?.();
      return true;
    }

    return false;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    const point = { x: event.worldX, y: event.worldY };

    // Find nearest line end
    this.hoveredEnd = this.findNearestLineEnd(point);

    // Calculate extend preview
    if (this.hoveredEnd && this.boundaryEdges.length > 0) {
      const isBoundary = this.boundaryEdges.some(e => e.nodeId === this.hoveredEnd?.line.nodeId);
      if (!isBoundary) {
        this.extendPreview = this.calculateExtendPreview(
          this.hoveredEnd.line,
          this.hoveredEnd.end
        );
      } else {
        this.extendPreview = null;
      }
    } else {
      this.extendPreview = null;
    }

    this.onPreviewUpdate?.();
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape') {
      if (this.boundaryEdges.length > 0) {
        this.clearBoundaryEdges();
        this.onPreviewUpdate?.();
        return true;
      }
    }

    // 'C' to clear boundary edges
    if (event.key === 'c' || event.key === 'C') {
      this.clearBoundaryEdges();
      this.onPreviewUpdate?.();
      return true;
    }

    return false;
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const zoom = context.viewport.getZoom();

    ctx.save();

    // Draw boundary edges
    for (const edge of this.boundaryEdges) {
      ctx.beginPath();
      ctx.moveTo(edge.segment.start.x, edge.segment.start.y);
      ctx.lineTo(edge.segment.end.x, edge.segment.end.y);
      ctx.strokeStyle = '#0066FF';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();

      // Draw markers at endpoints
      for (const point of [edge.segment.start, edge.segment.end]) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#0066FF';
        ctx.fill();
      }
    }

    // Draw hovered end
    if (this.hoveredEnd) {
      const { line, end } = this.hoveredEnd;
      const point = end === 'start' ? line.segment.start : line.segment.end;
      const isBoundary = this.boundaryEdges.some(e => e.nodeId === line.nodeId);

      // Highlight line
      ctx.beginPath();
      ctx.moveTo(line.segment.start.x, line.segment.start.y);
      ctx.lineTo(line.segment.end.x, line.segment.end.y);
      ctx.strokeStyle = isBoundary ? '#0066FF' : '#00FF00';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();

      // Highlight end point
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = isBoundary ? '#0066FF' : '#00FF00';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
    }

    // Draw extend preview
    if (this.extendPreview) {
      ctx.beginPath();
      ctx.moveTo(this.extendPreview.from.x, this.extendPreview.from.y);
      ctx.lineTo(this.extendPreview.to.x, this.extendPreview.to.y);
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw new endpoint
      ctx.beginPath();
      ctx.arc(this.extendPreview.to.x, this.extendPreview.to.y, 5 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#00FF00';
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Find the nearest line end to a point
   */
  private findNearestLineEnd(point: Point): { line: ExtendableLine; end: 'start' | 'end' } | null {
    if (!this.onGetExtendableLines) return null;

    const lines = this.onGetExtendableLines();
    let nearest: { line: ExtendableLine; end: 'start' | 'end'; distance: number } | null = null;

    for (const line of lines) {
      // Check start point
      const startDist = Math.sqrt(
        (point.x - line.segment.start.x) ** 2 +
        (point.y - line.segment.start.y) ** 2
      );

      if (startDist < this.options.hoverDistance) {
        if (!nearest || startDist < nearest.distance) {
          nearest = { line, end: 'start', distance: startDist };
        }
      }

      // Check end point
      const endDist = Math.sqrt(
        (point.x - line.segment.end.x) ** 2 +
        (point.y - line.segment.end.y) ** 2
      );

      if (endDist < this.options.hoverDistance) {
        if (!nearest || endDist < nearest.distance) {
          nearest = { line, end: 'end', distance: endDist };
        }
      }
    }

    return nearest ? { line: nearest.line, end: nearest.end } : null;
  }

  /**
   * Calculate extend preview
   */
  private calculateExtendPreview(
    line: ExtendableLine,
    end: 'start' | 'end'
  ): { from: Point; to: Point } | null {
    const from = end === 'start' ? line.segment.start : line.segment.end;

    // Find nearest intersection with boundary edges
    let nearestIntersection: Point | null = null;
    let nearestDistance = Infinity;

    for (const boundary of this.boundaryEdges) {
      if (boundary.nodeId === line.nodeId) continue;

      const intersection = lineLineIntersection(line.segment, boundary.segment);
      if (!intersection) continue;

      // Check if intersection is in the extend direction
      if (end === 'start' && intersection.t1 > 0) continue;
      if (end === 'end' && intersection.t1 < 1) continue;

      // Check if intersection is on the boundary segment
      if (intersection.t2 < -0.001 || intersection.t2 > 1.001) continue;

      // Check max extension
      const distance = Math.sqrt(
        (intersection.point.x - from.x) ** 2 +
        (intersection.point.y - from.y) ** 2
      );

      if (this.options.maxExtension > 0 && distance > this.options.maxExtension) {
        continue;
      }

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIntersection = intersection.point;
      }
    }

    if (!nearestIntersection) return null;

    return { from, to: nearestIntersection };
  }

  /**
   * Perform extend operation
   */
  private performExtend(line: ExtendableLine, end: 'start' | 'end', newEndpoint: Point): void {
    if (!this.onExtend) return;

    const newPath = this.createExtendedPath(line, end, newEndpoint);
    if (newPath) {
      this.onExtend(line.nodeId, newPath, end);
    }
  }

  /**
   * Create a new path with the extended line
   */
  private createExtendedPath(
    line: ExtendableLine,
    end: 'start' | 'end',
    newEndpoint: Point
  ): VectorPath | null {
    const { segment } = line;
    const commands: PathCommand[] = [];

    if (end === 'start') {
      // Extend from start
      commands.push({ type: 'M', x: newEndpoint.x - segment.start.x, y: newEndpoint.y - segment.start.y });
      commands.push({ type: 'L', x: segment.end.x - segment.start.x, y: segment.end.y - segment.start.y });
    } else {
      // Extend from end
      commands.push({ type: 'M', x: 0, y: 0 });
      commands.push({ type: 'L', x: newEndpoint.x - segment.start.x, y: newEndpoint.y - segment.start.y });
    }

    return {
      windingRule: 'NONZERO',
      commands,
    };
  }
}

/**
 * Create an extend tool
 */
export function createExtendTool(options?: ExtendToolOptions): ExtendTool {
  return new ExtendTool(options);
}
