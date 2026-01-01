/**
 * Intersection Detection
 *
 * Computes intersections between line segments and bezier curves.
 * Used by the Greiner-Hormann algorithm for boolean operations.
 */
import type { Point } from '@core/types/geometry';
/** Tolerance for floating point comparisons */
export declare const EPSILON = 1e-10;
/** Result of intersection calculation */
export interface IntersectionResult {
    /** Intersection point */
    readonly point: Point;
    /** Parameter along first segment [0, 1] */
    readonly t1: number;
    /** Parameter along second segment [0, 1] */
    readonly t2: number;
}
/**
 * Compute intersection between two line segments.
 *
 * Uses parametric line representation:
 * P = P0 + t * (P1 - P0)
 *
 * Returns null if segments don't intersect or are parallel.
 */
export declare function lineLineIntersection(a0: Point, a1: Point, b0: Point, b1: Point): IntersectionResult | null;
/**
 * Check if two points are approximately equal.
 */
export declare function pointsEqual(a: Point, b: Point, tolerance?: number): boolean;
/**
 * Evaluate a cubic bezier curve at parameter t.
 */
export declare function evaluateBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point;
/**
 * Compute the derivative of a cubic bezier at parameter t.
 */
export declare function bezierDerivative(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point;
/**
 * Compute bounding box of a cubic bezier curve.
 */
export declare function bezierBounds(p0: Point, p1: Point, p2: Point, p3: Point): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};
/**
 * Solve quadratic equation ax^2 + bx + c = 0.
 * Returns array of real roots.
 */
export declare function solveQuadratic(a: number, b: number, c: number): number[];
/**
 * Split a cubic bezier curve at parameter t using de Casteljau's algorithm.
 * Returns the control points for the two resulting curves.
 */
export declare function splitBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): {
    left: [Point, Point, Point, Point];
    right: [Point, Point, Point, Point];
};
/**
 * Flatten a cubic bezier curve to line segments.
 * Uses adaptive subdivision based on flatness.
 */
export declare function flattenBezier(p0: Point, p1: Point, p2: Point, p3: Point, tolerance?: number): Point[];
/**
 * Find intersections between a line segment and a cubic bezier curve.
 * Uses recursive subdivision.
 */
export declare function lineBezierIntersection(lineStart: Point, lineEnd: Point, p0: Point, p1: Point, p2: Point, p3: Point, tolerance?: number): IntersectionResult[];
/**
 * Find intersections between two cubic bezier curves.
 * Uses recursive subdivision with bounding box rejection.
 */
export declare function bezierBezierIntersection(a0: Point, a1: Point, a2: Point, a3: Point, b0: Point, b1: Point, b2: Point, b3: Point, tolerance?: number): IntersectionResult[];
/**
 * Compute signed area of a polygon (positive for CCW, negative for CW).
 */
export declare function signedArea(points: readonly Point[]): number;
/**
 * Check if a polygon is clockwise.
 */
export declare function isClockwise(points: readonly Point[]): boolean;
/**
 * Distance squared between two points.
 */
export declare function distanceSquared(a: Point, b: Point): number;
/**
 * Distance between two points.
 */
export declare function distance(a: Point, b: Point): number;
//# sourceMappingURL=intersection.d.ts.map