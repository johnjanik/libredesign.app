/**
 * Point Classification
 *
 * Determines if points are inside, outside, or on the boundary of polygons.
 * Uses the ray casting algorithm (even-odd rule).
 */
import type { Point } from '@core/types/geometry';
import { Polygon } from './polygon';
/**
 * Classification of a point relative to a polygon.
 */
export type PointClassification = 'inside' | 'outside' | 'on_boundary';
/**
 * Determine if a point is inside a polygon using ray casting.
 * Casts a ray from the point to infinity and counts edge crossings.
 */
export declare function classifyPoint(point: Point, polygon: Polygon): PointClassification;
/**
 * Check if a point lies on a line segment.
 */
export declare function isPointOnSegment(point: Point, segStart: Point, segEnd: Point, tolerance?: number): boolean;
/**
 * Compute the winding number of a point relative to a polygon.
 * Positive for CCW, negative for CW.
 */
export declare function windingNumber(point: Point, polygon: Polygon): number;
/**
 * Determine if point C is to the left of the line from A to B.
 * Returns positive if left, negative if right, zero if on line.
 */
export declare function isLeft(a: Point, b: Point, c: Point): number;
/**
 * Determine if a polygon is simple (no self-intersections).
 */
export declare function isSimplePolygon(polygon: Polygon): boolean;
/**
 * Mark intersection vertices as entry or exit points.
 * Entry means entering the other polygon, exit means leaving.
 */
export declare function markEntryExitPoints(subject: Polygon, clip: Polygon, operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'): void;
//# sourceMappingURL=classify.d.ts.map