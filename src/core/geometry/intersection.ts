/**
 * Geometric Intersection Utilities
 *
 * Functions for finding intersections between:
 * - Line segments
 * - Lines (infinite)
 * - Line and circle
 * - Line and arc
 * - Circle and circle
 * - Line and path
 */

import type { Point, VectorPath } from '@core/types/geometry';
import { flattenCubicBezier } from './area-calculator';

/**
 * Intersection point with metadata
 */
export interface Intersection {
  /** Intersection point */
  readonly point: Point;
  /** Parameter along first entity (0-1 for segments, unbounded for lines) */
  readonly t1: number;
  /** Parameter along second entity */
  readonly t2: number;
  /** Type of intersection */
  readonly type: 'crossing' | 'touching' | 'overlap';
}

/**
 * Line segment defined by two points
 */
export interface LineSegment {
  readonly start: Point;
  readonly end: Point;
}

/**
 * Circle defined by center and radius
 */
export interface Circle {
  readonly center: Point;
  readonly radius: number;
}

/**
 * Arc defined by center, radius, and angles
 */
export interface Arc {
  readonly center: Point;
  readonly radius: number;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly counterclockwise?: boolean;
}

/** Tolerance for floating point comparisons */
const EPSILON = 1e-10;

/**
 * Check if two numbers are approximately equal
 */
function approxEqual(a: number, b: number, eps: number = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}

/**
 * Find intersection between two line segments
 * Returns null if no intersection exists
 */
export function lineSegmentIntersection(
  seg1: LineSegment,
  seg2: LineSegment
): Intersection | null {
  const x1 = seg1.start.x;
  const y1 = seg1.start.y;
  const x2 = seg1.end.x;
  const y2 = seg1.end.y;
  const x3 = seg2.start.x;
  const y3 = seg2.start.y;
  const x4 = seg2.end.x;
  const y4 = seg2.end.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  // Lines are parallel or coincident
  if (Math.abs(denom) < EPSILON) {
    return null;
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // Check if intersection is within both segments
  if (t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON) {
    const clampedT = Math.max(0, Math.min(1, t));
    return {
      point: {
        x: x1 + clampedT * (x2 - x1),
        y: y1 + clampedT * (y2 - y1),
      },
      t1: clampedT,
      t2: Math.max(0, Math.min(1, u)),
      type: 'crossing',
    };
  }

  return null;
}

/**
 * Find intersection between two infinite lines
 */
export function lineLineIntersection(
  line1: LineSegment,
  line2: LineSegment
): Intersection | null {
  const x1 = line1.start.x;
  const y1 = line1.start.y;
  const x2 = line1.end.x;
  const y2 = line1.end.y;
  const x3 = line2.start.x;
  const y3 = line2.start.y;
  const x4 = line2.end.x;
  const y4 = line2.end.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  // Lines are parallel
  if (Math.abs(denom) < EPSILON) {
    return null;
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  return {
    point: {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    },
    t1: t,
    t2: u,
    type: 'crossing',
  };
}

/**
 * Find intersections between a line and a circle
 */
export function lineCircleIntersection(
  line: LineSegment,
  circle: Circle
): Intersection[] {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const fx = line.start.x - circle.center.x;
  const fy = line.start.y - circle.center.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - circle.radius * circle.radius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < -EPSILON) {
    return [];
  }

  const intersections: Intersection[] = [];

  if (discriminant < EPSILON) {
    // Tangent
    const t = -b / (2 * a);
    intersections.push({
      point: {
        x: line.start.x + t * dx,
        y: line.start.y + t * dy,
      },
      t1: t,
      t2: 0,
      type: 'touching',
    });
  } else {
    // Two intersections
    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);

    intersections.push({
      point: {
        x: line.start.x + t1 * dx,
        y: line.start.y + t1 * dy,
      },
      t1,
      t2: 0,
      type: 'crossing',
    });

    intersections.push({
      point: {
        x: line.start.x + t2 * dx,
        y: line.start.y + t2 * dy,
      },
      t1: t2,
      t2: 0,
      type: 'crossing',
    });
  }

  return intersections;
}

/**
 * Find intersections between a line segment and a circle
 */
export function segmentCircleIntersection(
  segment: LineSegment,
  circle: Circle
): Intersection[] {
  return lineCircleIntersection(segment, circle).filter(
    int => int.t1 >= -EPSILON && int.t1 <= 1 + EPSILON
  );
}

/**
 * Find intersections between two circles
 */
export function circleCircleIntersection(
  c1: Circle,
  c2: Circle
): Intersection[] {
  const dx = c2.center.x - c1.center.x;
  const dy = c2.center.y - c1.center.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  // No intersection cases
  if (d > c1.radius + c2.radius + EPSILON) return [];
  if (d < Math.abs(c1.radius - c2.radius) - EPSILON) return [];
  if (d < EPSILON && approxEqual(c1.radius, c2.radius)) return []; // Coincident

  const a = (c1.radius * c1.radius - c2.radius * c2.radius + d * d) / (2 * d);
  const h2 = c1.radius * c1.radius - a * a;

  if (h2 < -EPSILON) return [];

  const h = Math.sqrt(Math.max(0, h2));

  // Point on line between centers
  const px = c1.center.x + (a * dx) / d;
  const py = c1.center.y + (a * dy) / d;

  const intersections: Intersection[] = [];

  if (h < EPSILON) {
    // Single intersection (tangent)
    intersections.push({
      point: { x: px, y: py },
      t1: Math.atan2(py - c1.center.y, px - c1.center.x),
      t2: Math.atan2(py - c2.center.y, px - c2.center.x),
      type: 'touching',
    });
  } else {
    // Two intersections
    const offsetX = (h * dy) / d;
    const offsetY = (h * dx) / d;

    const p1 = { x: px + offsetX, y: py - offsetY };
    const p2 = { x: px - offsetX, y: py + offsetY };

    intersections.push({
      point: p1,
      t1: Math.atan2(p1.y - c1.center.y, p1.x - c1.center.x),
      t2: Math.atan2(p1.y - c2.center.y, p1.x - c2.center.x),
      type: 'crossing',
    });

    intersections.push({
      point: p2,
      t1: Math.atan2(p2.y - c1.center.y, p2.x - c1.center.x),
      t2: Math.atan2(p2.y - c2.center.y, p2.x - c2.center.x),
      type: 'crossing',
    });
  }

  return intersections;
}

/**
 * Find intersections between a line segment and an arc
 */
export function segmentArcIntersection(
  segment: LineSegment,
  arc: Arc
): Intersection[] {
  // First find intersections with the full circle
  const circleInts = segmentCircleIntersection(segment, {
    center: arc.center,
    radius: arc.radius,
  });

  // Filter to only points on the arc
  return circleInts.filter(int => {
    const angle = Math.atan2(
      int.point.y - arc.center.y,
      int.point.x - arc.center.x
    );
    return isAngleInArc(angle, arc.startAngle, arc.endAngle, arc.counterclockwise);
  });
}

/**
 * Check if an angle is within an arc's range
 */
function isAngleInArc(
  angle: number,
  startAngle: number,
  endAngle: number,
  counterclockwise?: boolean
): boolean {
  // Normalize angles to [0, 2π)
  const normalizeAngle = (a: number): number => {
    let normalized = a % (2 * Math.PI);
    if (normalized < 0) normalized += 2 * Math.PI;
    return normalized;
  };

  const a = normalizeAngle(angle);
  const start = normalizeAngle(startAngle);
  const end = normalizeAngle(endAngle);

  if (counterclockwise) {
    // Arc goes counterclockwise from start to end
    if (start <= end) {
      return a >= start && a <= end;
    } else {
      return a >= start || a <= end;
    }
  } else {
    // Arc goes clockwise from start to end
    if (end <= start) {
      return a <= start && a >= end;
    } else {
      return a <= start || a >= end;
    }
  }
}

/**
 * Find all intersections between a segment and a path
 */
export function segmentPathIntersection(
  segment: LineSegment,
  path: VectorPath,
  curveSegments: number = 32
): Intersection[] {
  const intersections: Intersection[] = [];
  let currentX = 0;
  let currentY = 0;
  let subpathStartX = 0;
  let subpathStartY = 0;

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        currentX = cmd.x;
        currentY = cmd.y;
        subpathStartX = cmd.x;
        subpathStartY = cmd.y;
        break;

      case 'L': {
        const pathSeg: LineSegment = {
          start: { x: currentX, y: currentY },
          end: { x: cmd.x, y: cmd.y },
        };
        const int = lineSegmentIntersection(segment, pathSeg);
        if (int) intersections.push(int);
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      }

      case 'C': {
        // Flatten curve and test each segment
        const curvePoints = flattenCubicBezier(
          { x: currentX, y: currentY },
          { x: cmd.x1, y: cmd.y1 },
          { x: cmd.x2, y: cmd.y2 },
          { x: cmd.x, y: cmd.y },
          curveSegments
        );

        for (let i = 0; i < curvePoints.length - 1; i++) {
          const curveSeg: LineSegment = {
            start: curvePoints[i]!,
            end: curvePoints[i + 1]!,
          };
          const int = lineSegmentIntersection(segment, curveSeg);
          if (int) intersections.push(int);
        }

        currentX = cmd.x;
        currentY = cmd.y;
        break;
      }

      case 'Z': {
        // Close path
        if (currentX !== subpathStartX || currentY !== subpathStartY) {
          const pathSeg: LineSegment = {
            start: { x: currentX, y: currentY },
            end: { x: subpathStartX, y: subpathStartY },
          };
          const int = lineSegmentIntersection(segment, pathSeg);
          if (int) intersections.push(int);
        }
        currentX = subpathStartX;
        currentY = subpathStartY;
        break;
      }
    }
  }

  return intersections;
}

/**
 * Find closest point on a line segment to a given point
 */
export function closestPointOnSegment(
  point: Point,
  segment: LineSegment
): { point: Point; t: number; distance: number } {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < EPSILON) {
    // Degenerate segment
    return {
      point: { x: segment.start.x, y: segment.start.y },
      t: 0,
      distance: Math.sqrt(
        (point.x - segment.start.x) * (point.x - segment.start.x) +
        (point.y - segment.start.y) * (point.y - segment.start.y)
      ),
    };
  }

  let t = ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = segment.start.x + t * dx;
  const closestY = segment.start.y + t * dy;

  return {
    point: { x: closestX, y: closestY },
    t,
    distance: Math.sqrt(
      (point.x - closestX) * (point.x - closestX) +
      (point.y - closestY) * (point.y - closestY)
    ),
  };
}

/**
 * Calculate distance from point to line segment
 */
export function pointToSegmentDistance(point: Point, segment: LineSegment): number {
  return closestPointOnSegment(point, segment).distance;
}

/**
 * Extend a line segment to intersect with another segment
 * Returns the new endpoint, or null if lines are parallel
 */
export function extendToIntersection(
  toExtend: LineSegment,
  target: LineSegment,
  extendStart: boolean = false
): Point | null {
  const intersection = lineLineIntersection(toExtend, target);
  if (!intersection) return null;

  // Check if intersection is in the right direction
  if (extendStart) {
    // Extending from start - t1 should be <= 0
    if (intersection.t1 > EPSILON) return null;
  } else {
    // Extending from end - t1 should be >= 1
    if (intersection.t1 < 1 - EPSILON) return null;
  }

  // Check if intersection is on target segment
  if (intersection.t2 < -EPSILON || intersection.t2 > 1 + EPSILON) {
    return null;
  }

  return intersection.point;
}

/**
 * Trim a line segment at intersection with another segment
 * Returns the trimmed segment, or null if no intersection
 */
export function trimAtIntersection(
  toTrim: LineSegment,
  cuttingEdge: LineSegment,
  keepSide: 'start' | 'end'
): LineSegment | null {
  const intersection = lineSegmentIntersection(toTrim, cuttingEdge);
  if (!intersection) return null;

  if (keepSide === 'start') {
    return {
      start: toTrim.start,
      end: intersection.point,
    };
  } else {
    return {
      start: intersection.point,
      end: toTrim.end,
    };
  }
}
