/**
 * Greiner-Hormann Algorithm
 *
 * Implements boolean operations (union, intersection, subtraction, exclusion)
 * on polygons using the Greiner-Hormann algorithm.
 */
import type { VectorPath } from '@core/types/geometry';
import { Polygon } from './polygon';
/**
 * Boolean operation type.
 */
export type BooleanOperation = 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
/**
 * Result of a boolean operation.
 */
export interface BooleanOperationResult {
    /** Resulting paths */
    readonly paths: VectorPath[];
    /** Whether operation succeeded */
    readonly success: boolean;
    /** Error message if failed */
    readonly error?: string;
}
/**
 * Configuration for boolean operations.
 */
export interface BooleanConfig {
    /** Tolerance for curve flattening */
    readonly flattenTolerance?: number;
    /** Tolerance for intersection detection */
    readonly intersectionTolerance?: number;
    /** Whether to handle degenerate cases */
    readonly handleDegenerates?: boolean;
}
/**
 * Compute a boolean operation between two sets of paths.
 */
export declare function computeBooleanOperation(operation: BooleanOperation, subjectPaths: VectorPath[], clipPaths: VectorPath[], config?: BooleanConfig): BooleanOperationResult;
/**
 * Find all intersections between two polygons and insert them into both.
 */
export declare function findAndInsertIntersections(subject: Polygon, clip: Polygon, tolerance?: number): void;
/**
 * Convenience functions for specific operations.
 */
export declare function union(subjectPaths: VectorPath[], clipPaths: VectorPath[], config?: BooleanConfig): BooleanOperationResult;
export declare function subtract(subjectPaths: VectorPath[], clipPaths: VectorPath[], config?: BooleanConfig): BooleanOperationResult;
export declare function intersect(subjectPaths: VectorPath[], clipPaths: VectorPath[], config?: BooleanConfig): BooleanOperationResult;
export declare function exclude(subjectPaths: VectorPath[], clipPaths: VectorPath[], config?: BooleanConfig): BooleanOperationResult;
//# sourceMappingURL=greiner-hormann.d.ts.map