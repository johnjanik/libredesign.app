/**
 * Degenerate Case Handling
 *
 * Handles special cases in boolean operations such as:
 * - Coincident edges
 * - Touching vertices
 * - Zero-area polygons
 * - Identical polygons
 */
import { Polygon } from './polygon';
/**
 * Check if the polygon pair has degenerate cases that need special handling.
 */
export declare function isDegenerateCase(subject: Polygon, clip: Polygon): boolean;
/**
 * Handle degenerate cases in boolean operations.
 */
export declare function handleDegenerateCases(subject: Polygon, clip: Polygon, operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'): Polygon[];
/**
 * Check if a polygon has zero or near-zero area.
 */
export declare function isZeroArea(polygon: Polygon): boolean;
/**
 * Check if two polygons share any vertices.
 */
export declare function hasSharedVertices(a: Polygon, b: Polygon): boolean;
/**
 * Check if two polygons have coincident (overlapping) edges.
 */
export declare function hasCoincidentEdges(a: Polygon, b: Polygon): boolean;
/**
 * Check if two polygons are identical (same vertices in same order).
 */
export declare function arePolygonsIdentical(a: Polygon, b: Polygon): boolean;
/**
 * Check if polygon A is fully inside polygon B.
 */
export declare function isPolygonFullyInside(inner: Polygon, outer: Polygon): boolean;
/**
 * Slightly perturb polygon vertices to avoid degenerate cases.
 */
export declare function perturbPolygon(polygon: Polygon, amount?: number): Polygon;
/**
 * Snap vertices that are very close together.
 */
export declare function snapNearbyVertices(subject: Polygon, clip: Polygon, tolerance?: number): void;
/**
 * Remove duplicate consecutive vertices.
 */
export declare function removeDuplicateVertices(polygon: Polygon): void;
//# sourceMappingURL=degenerate.d.ts.map