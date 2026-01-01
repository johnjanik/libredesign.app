/**
 * Boolean Operations Module
 *
 * Implements boolean operations (union, intersection, subtraction, exclusion)
 * on vector paths using the Greiner-Hormann algorithm.
 *
 * @example
 * ```typescript
 * import { union, subtract, intersect, exclude } from '@core/geometry/boolean';
 *
 * const result = union([path1], [path2]);
 * if (result.success) {
 *   console.log('Result paths:', result.paths);
 * }
 * ```
 */
export { computeBooleanOperation, union, subtract, intersect, exclude, } from './greiner-hormann';
export type { BooleanOperation, BooleanOperationResult, BooleanConfig, } from './greiner-hormann';
export { lineLineIntersection, lineBezierIntersection, bezierBezierIntersection, evaluateBezier, bezierDerivative, bezierBounds, splitBezier, flattenBezier, pointsEqual, signedArea, isClockwise, distance, distanceSquared, solveQuadratic, EPSILON, } from './intersection';
export type { IntersectionResult } from './intersection';
export { Polygon, Vertex, createPolygonFromPoints, createPolygonsFromPath, polygonToPathCommands, polygonsToVectorPath } from './polygon';
export { classifyPoint, windingNumber, isSimplePolygon, isPointOnSegment, isLeft } from './classify';
export type { PointClassification } from './classify';
export { isDegenerateCase, handleDegenerateCases, isZeroArea, hasSharedVertices, hasCoincidentEdges, arePolygonsIdentical, perturbPolygon, snapNearbyVertices, removeDuplicateVertices, } from './degenerate';
//# sourceMappingURL=index.d.ts.map