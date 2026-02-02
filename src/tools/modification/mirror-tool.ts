/**
 * Mirror Tool
 *
 * Mirrors selected nodes across an axis.
 * Supports:
 * - Horizontal mirror (default)
 * - Vertical mirror
 * - Custom axis (defined by two points)
 */

import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import type { FrameNodeData } from '@scene/nodes/base-node';

/**
 * Mirror axis type
 */
export type MirrorAxis = 'horizontal' | 'vertical' | 'custom';

/**
 * Mirror operation options
 */
export interface MirrorOptions {
  /** Mirror axis */
  axis: MirrorAxis;
  /** Custom axis points (required for custom axis) */
  axisPoints?: { p1: Point; p2: Point };
  /** Whether to create a copy or mirror in place */
  copy: boolean;
}

/**
 * Mirror result
 */
export interface MirrorResult {
  /** Original node IDs */
  originalIds: NodeId[];
  /** New node IDs (if copy is true) */
  newIds?: NodeId[];
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Calculate mirror point across an axis.
 */
export function mirrorPoint(point: Point, axis: MirrorAxis, center: Point, axisPoints?: { p1: Point; p2: Point }): Point {
  if (axis === 'horizontal') {
    // Mirror across horizontal axis (flip Y)
    return {
      x: point.x,
      y: 2 * center.y - point.y,
    };
  } else if (axis === 'vertical') {
    // Mirror across vertical axis (flip X)
    return {
      x: 2 * center.x - point.x,
      y: point.y,
    };
  } else if (axis === 'custom' && axisPoints) {
    // Mirror across custom axis defined by two points
    const { p1, p2 } = axisPoints;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 1e-10) return point;

    // Normalize axis direction
    const nx = dx / len;
    const ny = dy / len;

    // Vector from p1 to point
    const vx = point.x - p1.x;
    const vy = point.y - p1.y;

    // Project onto axis
    const dot = vx * nx + vy * ny;
    const projX = p1.x + dot * nx;
    const projY = p1.y + dot * ny;

    // Mirror point is 2 * projection - original
    return {
      x: 2 * projX - point.x,
      y: 2 * projY - point.y,
    };
  }

  return point;
}

/**
 * Calculate mirrored bounds for a node.
 */
export function mirrorBounds(
  node: FrameNodeData,
  axis: MirrorAxis,
  center: Point,
  axisPoints?: { p1: Point; p2: Point }
): { x: number; y: number; width: number; height: number } {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const width = node.width ?? 0;
  const height = node.height ?? 0;

  // Get all corners
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];

  // Mirror all corners
  const mirroredCorners = corners.map(c => mirrorPoint(c, axis, center, axisPoints));

  // Calculate new bounds
  const minX = Math.min(...mirroredCorners.map(c => c.x));
  const minY = Math.min(...mirroredCorners.map(c => c.y));
  const maxX = Math.max(...mirroredCorners.map(c => c.x));
  const maxY = Math.max(...mirroredCorners.map(c => c.y));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Mirror Tool class for UI interaction
 */
export class MirrorTool {
  private axis: MirrorAxis = 'vertical';
  private axisPoints: { p1: Point; p2: Point } | null = null;
  private copy: boolean = false;

  // Callback for executing mirror operation
  private onMirror?: (nodeIds: NodeId[], options: MirrorOptions) => MirrorResult;

  /**
   * Set mirror callback.
   */
  setOnMirror(callback: (nodeIds: NodeId[], options: MirrorOptions) => MirrorResult): void {
    this.onMirror = callback;
  }

  /**
   * Set mirror axis.
   */
  setAxis(axis: MirrorAxis): void {
    this.axis = axis;
  }

  /**
   * Get current axis.
   */
  getAxis(): MirrorAxis {
    return this.axis;
  }

  /**
   * Set custom axis points.
   */
  setAxisPoints(p1: Point, p2: Point): void {
    this.axisPoints = { p1, p2 };
    this.axis = 'custom';
  }

  /**
   * Set copy mode.
   */
  setCopy(copy: boolean): void {
    this.copy = copy;
  }

  /**
   * Execute mirror operation on selected nodes.
   */
  execute(nodeIds: NodeId[]): MirrorResult {
    if (!this.onMirror) {
      return { originalIds: nodeIds, success: false, error: 'No mirror callback set' };
    }

    const options: MirrorOptions = {
      axis: this.axis,
      copy: this.copy,
    };

    if (this.axisPoints) {
      options.axisPoints = this.axisPoints;
    }

    return this.onMirror(nodeIds, options);
  }

  /**
   * Mirror horizontally (flip over X axis).
   */
  mirrorHorizontal(nodeIds: NodeId[]): MirrorResult {
    this.axis = 'horizontal';
    return this.execute(nodeIds);
  }

  /**
   * Mirror vertically (flip over Y axis).
   */
  mirrorVertical(nodeIds: NodeId[]): MirrorResult {
    this.axis = 'vertical';
    return this.execute(nodeIds);
  }
}

/**
 * Create a mirror tool.
 */
export function createMirrorTool(): MirrorTool {
  return new MirrorTool();
}
