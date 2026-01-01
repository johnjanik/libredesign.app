/**
 * Contour Builder
 *
 * Extracts result contours by traversing intersection vertices
 * according to the Greiner-Hormann algorithm.
 */
import { Polygon } from './polygon';
/**
 * Extract result contours from marked polygons.
 */
export declare function extractContours(subject: Polygon, clip: Polygon, operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'): Polygon[];
/**
 * Alternative contour extraction using forward/backward traversal.
 * Used when the simple traversal doesn't produce correct results.
 */
export declare function extractContoursAlternative(subject: Polygon, clip: Polygon, operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'): Polygon[];
//# sourceMappingURL=contour-builder.d.ts.map