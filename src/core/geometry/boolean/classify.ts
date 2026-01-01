/**
 * Point Classification
 *
 * Determines if points are inside, outside, or on the boundary of polygons.
 * Uses the ray casting algorithm (even-odd rule).
 */

import type { Point } from '@core/types/geometry';
import { Polygon, Vertex } from './polygon';
import { EPSILON, lineLineIntersection } from './intersection';

/**
 * Classification of a point relative to a polygon.
 */
export type PointClassification = 'inside' | 'outside' | 'on_boundary';

/**
 * Determine if a point is inside a polygon using ray casting.
 * Casts a ray from the point to infinity and counts edge crossings.
 */
export function classifyPoint(point: Point, polygon: Polygon): PointClassification {
  if (!polygon.first || polygon.count < 3) {
    return 'outside';
  }

  let crossings = 0;
  // Ray goes from point to the right (positive x direction) toward infinity
  void { x: point.x + 1e10, y: point.y }; // Ray endpoint for reference

  for (const [v1, v2] of polygon.edges()) {
    // Check if point is on edge
    if (isPointOnSegment(point, v1.point, v2.point)) {
      return 'on_boundary';
    }

    // Check ray intersection with edge
    // Ray goes from point to the right (positive x direction)
    const minY = Math.min(v1.point.y, v2.point.y);
    const maxY = Math.max(v1.point.y, v2.point.y);

    // Skip edges that don't cross the ray's y-level
    if (point.y < minY - EPSILON || point.y > maxY + EPSILON) {
      continue;
    }

    // Skip horizontal edges
    if (Math.abs(v1.point.y - v2.point.y) < EPSILON) {
      continue;
    }

    // Calculate x-coordinate of intersection
    const t = (point.y - v1.point.y) / (v2.point.y - v1.point.y);
    const intersectX = v1.point.x + t * (v2.point.x - v1.point.x);

    // Check if intersection is to the right of the point
    if (intersectX > point.x + EPSILON) {
      // Handle vertex cases to avoid double counting
      if (Math.abs(point.y - v1.point.y) < EPSILON) {
        // Ray passes through v1
        if (v2.point.y > point.y) {
          crossings++;
        }
      } else if (Math.abs(point.y - v2.point.y) < EPSILON) {
        // Ray passes through v2
        if (v1.point.y > point.y) {
          crossings++;
        }
      } else {
        crossings++;
      }
    }
  }

  return crossings % 2 === 1 ? 'inside' : 'outside';
}

/**
 * Check if a point lies on a line segment.
 */
export function isPointOnSegment(
  point: Point,
  segStart: Point,
  segEnd: Point,
  tolerance = EPSILON
): boolean {
  // Check if point is within bounding box
  const minX = Math.min(segStart.x, segEnd.x) - tolerance;
  const maxX = Math.max(segStart.x, segEnd.x) + tolerance;
  const minY = Math.min(segStart.y, segEnd.y) - tolerance;
  const maxY = Math.max(segStart.y, segEnd.y) + tolerance;

  if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) {
    return false;
  }

  // Check if point is collinear with segment
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < tolerance) {
    // Degenerate segment (point)
    return (
      Math.abs(point.x - segStart.x) < tolerance &&
      Math.abs(point.y - segStart.y) < tolerance
    );
  }

  // Distance from point to line
  const cross = Math.abs(
    (point.x - segStart.x) * dy - (point.y - segStart.y) * dx
  );
  const dist = cross / len;

  return dist < tolerance;
}

/**
 * Compute the winding number of a point relative to a polygon.
 * Positive for CCW, negative for CW.
 */
export function windingNumber(point: Point, polygon: Polygon): number {
  if (!polygon.first || polygon.count < 3) {
    return 0;
  }

  let winding = 0;

  for (const [v1, v2] of polygon.edges()) {
    if (v1.point.y <= point.y) {
      if (v2.point.y > point.y) {
        // Upward crossing
        if (isLeft(v1.point, v2.point, point) > 0) {
          winding++;
        }
      }
    } else {
      if (v2.point.y <= point.y) {
        // Downward crossing
        if (isLeft(v1.point, v2.point, point) < 0) {
          winding--;
        }
      }
    }
  }

  return winding;
}

/**
 * Determine if point C is to the left of the line from A to B.
 * Returns positive if left, negative if right, zero if on line.
 */
export function isLeft(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
}

/**
 * Determine if a polygon is simple (no self-intersections).
 */
export function isSimplePolygon(polygon: Polygon): boolean {
  if (!polygon.first || polygon.count < 3) {
    return false;
  }

  const edges: Array<[Point, Point]> = [];
  for (const [v1, v2] of polygon.edges()) {
    edges.push([v1.point, v2.point]);
  }

  // Check all non-adjacent edge pairs for intersection
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 2; j < edges.length; j++) {
      // Skip adjacent edges (they share a vertex)
      if (i === 0 && j === edges.length - 1) {
        continue;
      }

      const [a0, a1] = edges[i]!;
      const [b0, b1] = edges[j]!;

      const intersection = lineLineIntersection(a0, a1, b0, b1);
      if (intersection) {
        // Check if intersection is at an endpoint (allowed)
        const isAtEndpoint =
          (intersection.t1 < EPSILON || intersection.t1 > 1 - EPSILON) &&
          (intersection.t2 < EPSILON || intersection.t2 > 1 - EPSILON);

        if (!isAtEndpoint) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Mark intersection vertices as entry or exit points.
 * Entry means entering the other polygon, exit means leaving.
 */
export function markEntryExitPoints(
  subject: Polygon,
  clip: Polygon,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'
): void {
  // First, determine entry/exit for subject polygon
  markEntryExitForPolygon(subject, clip, operation, true);

  // Then for clip polygon
  markEntryExitForPolygon(clip, subject, operation, false);
}

function markEntryExitForPolygon(
  polygon: Polygon,
  other: Polygon,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE',
  isSubject: boolean
): void {
  if (!polygon.first) return;

  // Find first non-intersection vertex to determine initial inside/outside state
  let firstNonIntersection: Vertex | null = null;
  for (const v of polygon.vertices()) {
    if (!v.isIntersection) {
      firstNonIntersection = v;
      break;
    }
  }

  if (!firstNonIntersection) return;

  // Determine if we start inside or outside the other polygon
  let status = classifyPoint(firstNonIntersection.point, other);
  let isInside = status === 'inside';

  // Special case: if on boundary, look at adjacent point
  if (status === 'on_boundary') {
    const midpoint = getMidpoint(firstNonIntersection.point, firstNonIntersection.next!.point);
    isInside = classifyPoint(midpoint, other) === 'inside';
  }

  // Walk the polygon and mark intersections
  let current = firstNonIntersection;
  do {
    if (current.isIntersection) {
      // Determine entry/exit based on operation and current status
      current.isEntry = getEntryStatus(isInside, isSubject, operation);
      isInside = !isInside; // Toggle status at intersection
    }
    current = current.next!;
  } while (current !== firstNonIntersection);
}

/**
 * Determine if an intersection should be marked as entry based on operation.
 */
function getEntryStatus(
  isInside: boolean,
  isSubject: boolean,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'
): boolean {
  switch (operation) {
    case 'UNION':
      // For union: enter when going outside->inside of the OTHER polygon
      // We want to keep parts that are outside the other polygon
      return !isInside;

    case 'INTERSECT':
      // For intersection: enter when going outside->inside
      // We want to keep parts that are inside both polygons
      return isInside;

    case 'SUBTRACT':
      if (isSubject) {
        // Subject: keep parts outside the clip
        return !isInside;
      } else {
        // Clip: reversed logic
        return isInside;
      }

    case 'EXCLUDE':
      // For XOR: alternate
      return !isInside;

    default:
      return !isInside;
  }
}

/**
 * Get the midpoint between two points.
 */
function getMidpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}
