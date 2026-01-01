/**
 * Bezier curve utilities for DesignLibre
 */
import type { Point, AABB } from '../types/geometry';
/** Evaluate a cubic Bezier curve at parameter t */
export declare function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point;
/** Evaluate a quadratic Bezier curve at parameter t */
export declare function quadraticBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point;
/** Get the derivative (tangent) of a cubic Bezier at parameter t */
export declare function cubicBezierDerivative(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point;
/** Split a cubic Bezier at parameter t into two curves */
export declare function splitCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): {
    left: [Point, Point, Point, Point];
    right: [Point, Point, Point, Point];
};
/** Linear interpolation between two points */
export declare function lerp(a: Point, b: Point, t: number): Point;
/** Calculate approximate length of a cubic Bezier using subdivision */
export declare function cubicBezierLength(p0: Point, p1: Point, p2: Point, p3: Point, segments?: number): number;
/** Calculate distance between two points */
export declare function distance(a: Point, b: Point): number;
/** Calculate squared distance between two points */
export declare function distanceSquared(a: Point, b: Point): number;
/**
 * Find the bounding box of a cubic Bezier curve.
 * This finds the exact bounds by computing the curve's extrema.
 */
export declare function cubicBezierBounds(p0: Point, p1: Point, p2: Point, p3: Point): AABB;
/** Convert quadratic Bezier to cubic Bezier */
export declare function quadraticToCubic(p0: Point, p1: Point, p2: Point): [Point, Point, Point, Point];
/** Sample points along a cubic Bezier curve */
export declare function sampleCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, numSamples: number): Point[];
/**
 * Find the parameter t on the curve closest to a given point.
 * Uses Newton-Raphson iteration.
 */
export declare function cubicBezierNearestT(p0: Point, p1: Point, p2: Point, p3: Point, target: Point, iterations?: number): number;
//# sourceMappingURL=bezier.d.ts.map