/**
 * Construction Geometry Types
 *
 * Types for construction geometry used during drafting:
 * - Construction lines (infinite in both directions)
 * - Rays (infinite in one direction)
 * - Reference points (temporary snap targets)
 */

import type { Point } from './geometry';
import type { NodeId } from './common';

/**
 * Construction line - infinite in both directions
 * Defined by a point and a direction vector (or two points)
 */
export interface ConstructionLine {
  readonly id: NodeId;
  readonly type: 'CONSTRUCTION_LINE';
  /** A point on the line */
  readonly point: Point;
  /** Direction vector (normalized) */
  readonly direction: Point;
  /** Visual style */
  readonly style: ConstructionStyle;
  /** Whether this is locked */
  readonly locked: boolean;
  /** Optional label */
  readonly label?: string;
}

/**
 * Ray - infinite in one direction (semi-infinite line)
 * Defined by origin and direction
 */
export interface ConstructionRay {
  readonly id: NodeId;
  readonly type: 'CONSTRUCTION_RAY';
  /** Origin point of the ray */
  readonly origin: Point;
  /** Direction vector (normalized) */
  readonly direction: Point;
  /** Visual style */
  readonly style: ConstructionStyle;
  /** Whether this is locked */
  readonly locked: boolean;
  /** Optional label */
  readonly label?: string;
}

/**
 * Reference point - temporary point for snapping
 */
export interface ReferencePoint {
  readonly id: NodeId;
  readonly type: 'REFERENCE_POINT';
  /** Position */
  readonly position: Point;
  /** Visual style */
  readonly style: ConstructionStyle;
  /** Whether this is locked */
  readonly locked: boolean;
  /** Optional label */
  readonly label?: string;
}

/**
 * Visual style for construction geometry
 */
export interface ConstructionStyle {
  /** Line color (default: construction line color, usually cyan/magenta) */
  readonly color: string;
  /** Line pattern: 'solid', 'dashed', 'dotted', 'dash-dot' */
  readonly pattern: 'solid' | 'dashed' | 'dotted' | 'dash-dot';
  /** Line weight in pixels */
  readonly weight: number;
  /** Opacity (0-1) */
  readonly opacity: number;
}

/**
 * Union type for all construction geometry
 */
export type ConstructionGeometry = ConstructionLine | ConstructionRay | ReferencePoint;

/**
 * Default construction style
 */
export const DEFAULT_CONSTRUCTION_STYLE: ConstructionStyle = {
  color: '#00ffff', // Cyan - typical CAD construction color
  pattern: 'dash-dot',
  weight: 1,
  opacity: 0.7,
};

/**
 * Create a construction line from two points
 */
export function createConstructionLineFromPoints(
  id: NodeId,
  point1: Point,
  point2: Point,
  style: ConstructionStyle = DEFAULT_CONSTRUCTION_STYLE
): ConstructionLine {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Normalize direction
  const direction: Point = length > 0
    ? { x: dx / length, y: dy / length }
    : { x: 1, y: 0 }; // Default horizontal if points are same

  return {
    id,
    type: 'CONSTRUCTION_LINE',
    point: point1,
    direction,
    style,
    locked: false,
  };
}

/**
 * Create a construction line from point and angle (in degrees)
 */
export function createConstructionLineFromAngle(
  id: NodeId,
  point: Point,
  angleDegrees: number,
  style: ConstructionStyle = DEFAULT_CONSTRUCTION_STYLE
): ConstructionLine {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  const direction: Point = {
    x: Math.cos(angleRadians),
    y: Math.sin(angleRadians),
  };

  return {
    id,
    type: 'CONSTRUCTION_LINE',
    point,
    direction,
    style,
    locked: false,
  };
}

/**
 * Create a horizontal construction line through a point
 */
export function createHorizontalConstructionLine(
  id: NodeId,
  point: Point,
  style: ConstructionStyle = DEFAULT_CONSTRUCTION_STYLE
): ConstructionLine {
  return {
    id,
    type: 'CONSTRUCTION_LINE',
    point,
    direction: { x: 1, y: 0 },
    style,
    locked: false,
  };
}

/**
 * Create a vertical construction line through a point
 */
export function createVerticalConstructionLine(
  id: NodeId,
  point: Point,
  style: ConstructionStyle = DEFAULT_CONSTRUCTION_STYLE
): ConstructionLine {
  return {
    id,
    type: 'CONSTRUCTION_LINE',
    point,
    direction: { x: 0, y: 1 },
    style,
    locked: false,
  };
}

/**
 * Create a ray from origin and target point
 */
export function createRayFromPoints(
  id: NodeId,
  origin: Point,
  target: Point,
  style: ConstructionStyle = DEFAULT_CONSTRUCTION_STYLE
): ConstructionRay {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  const direction: Point = length > 0
    ? { x: dx / length, y: dy / length }
    : { x: 1, y: 0 };

  return {
    id,
    type: 'CONSTRUCTION_RAY',
    origin,
    direction,
    style,
    locked: false,
  };
}

/**
 * Create a ray from origin and angle
 */
export function createRayFromAngle(
  id: NodeId,
  origin: Point,
  angleDegrees: number,
  style: ConstructionStyle = DEFAULT_CONSTRUCTION_STYLE
): ConstructionRay {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  const direction: Point = {
    x: Math.cos(angleRadians),
    y: Math.sin(angleRadians),
  };

  return {
    id,
    type: 'CONSTRUCTION_RAY',
    origin,
    direction,
    style,
    locked: false,
  };
}

/**
 * Create a reference point
 */
export function createReferencePoint(
  id: NodeId,
  position: Point,
  label?: string,
  style: ConstructionStyle = DEFAULT_CONSTRUCTION_STYLE
): ReferencePoint {
  const point: ReferencePoint = {
    id,
    type: 'REFERENCE_POINT',
    position,
    style,
    locked: false,
  };

  if (label !== undefined) {
    return { ...point, label };
  }

  return point;
}

/**
 * Calculate the closest point on a construction line to a given point
 */
export function closestPointOnConstructionLine(line: ConstructionLine, point: Point): Point {
  // Project point onto line
  const dx = point.x - line.point.x;
  const dy = point.y - line.point.y;
  const t = dx * line.direction.x + dy * line.direction.y;

  return {
    x: line.point.x + t * line.direction.x,
    y: line.point.y + t * line.direction.y,
  };
}

/**
 * Calculate the closest point on a ray to a given point
 */
export function closestPointOnRay(ray: ConstructionRay, point: Point): Point {
  const dx = point.x - ray.origin.x;
  const dy = point.y - ray.origin.y;
  const t = Math.max(0, dx * ray.direction.x + dy * ray.direction.y);

  return {
    x: ray.origin.x + t * ray.direction.x,
    y: ray.origin.y + t * ray.direction.y,
  };
}

/**
 * Calculate distance from a point to a construction line
 */
export function distanceToConstructionLine(line: ConstructionLine, point: Point): number {
  const closest = closestPointOnConstructionLine(line, point);
  const dx = point.x - closest.x;
  const dy = point.y - closest.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance from a point to a ray
 */
export function distanceToRay(ray: ConstructionRay, point: Point): number {
  const closest = closestPointOnRay(ray, point);
  const dx = point.x - closest.x;
  const dy = point.y - closest.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find intersection of two construction lines
 * Returns null if lines are parallel
 */
export function intersectConstructionLines(
  line1: ConstructionLine,
  line2: ConstructionLine
): Point | null {
  const d1 = line1.direction;
  const d2 = line2.direction;

  // Cross product to check if parallel
  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 1e-10) {
    return null; // Parallel or coincident
  }

  // Solve for intersection
  const dx = line2.point.x - line1.point.x;
  const dy = line2.point.y - line1.point.y;
  const t = (dx * d2.y - dy * d2.x) / cross;

  return {
    x: line1.point.x + t * d1.x,
    y: line1.point.y + t * d1.y,
  };
}

/**
 * Find intersection of a construction line and a ray
 * Returns null if they don't intersect
 */
export function intersectLineAndRay(
  line: ConstructionLine,
  ray: ConstructionRay
): Point | null {
  const d1 = line.direction;
  const d2 = ray.direction;

  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 1e-10) {
    return null;
  }

  const dx = ray.origin.x - line.point.x;
  const dy = ray.origin.y - line.point.y;
  const t2 = (dx * d1.y - dy * d1.x) / (-cross);

  // Ray only extends in positive direction
  if (t2 < 0) {
    return null;
  }

  return {
    x: ray.origin.x + t2 * d2.x,
    y: ray.origin.y + t2 * d2.y,
  };
}

/**
 * Get visible segment of construction line within viewport bounds
 */
export function getVisibleSegment(
  line: ConstructionLine,
  viewportBounds: { minX: number; minY: number; maxX: number; maxY: number }
): [Point, Point] | null {
  // Extended parametric clipping
  const { minX, minY, maxX, maxY } = viewportBounds;
  const { point, direction } = line;

  let tMin = -Infinity;
  let tMax = Infinity;

  // Clip against vertical bounds
  if (Math.abs(direction.x) > 1e-10) {
    const t1 = (minX - point.x) / direction.x;
    const t2 = (maxX - point.x) / direction.x;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else if (point.x < minX || point.x > maxX) {
    return null;
  }

  // Clip against horizontal bounds
  if (Math.abs(direction.y) > 1e-10) {
    const t1 = (minY - point.y) / direction.y;
    const t2 = (maxY - point.y) / direction.y;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else if (point.y < minY || point.y > maxY) {
    return null;
  }

  if (tMin > tMax) {
    return null;
  }

  return [
    { x: point.x + tMin * direction.x, y: point.y + tMin * direction.y },
    { x: point.x + tMax * direction.x, y: point.y + tMax * direction.y },
  ];
}

/**
 * Get visible segment of ray within viewport bounds
 */
export function getRayVisibleSegment(
  ray: ConstructionRay,
  viewportBounds: { minX: number; minY: number; maxX: number; maxY: number }
): [Point, Point] | null {
  const { minX, minY, maxX, maxY } = viewportBounds;
  const { origin, direction } = ray;

  let tMin = 0; // Ray starts at origin
  let tMax = Infinity;

  // Clip against vertical bounds
  if (Math.abs(direction.x) > 1e-10) {
    const t1 = (minX - origin.x) / direction.x;
    const t2 = (maxX - origin.x) / direction.x;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else if (origin.x < minX || origin.x > maxX) {
    return null;
  }

  // Clip against horizontal bounds
  if (Math.abs(direction.y) > 1e-10) {
    const t1 = (minY - origin.y) / direction.y;
    const t2 = (maxY - origin.y) / direction.y;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else if (origin.y < minY || origin.y > maxY) {
    return null;
  }

  if (tMin > tMax) {
    return null;
  }

  return [
    { x: origin.x + tMin * direction.x, y: origin.y + tMin * direction.y },
    { x: origin.x + tMax * direction.x, y: origin.y + tMax * direction.y },
  ];
}
