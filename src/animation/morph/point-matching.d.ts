/**
 * Point Matching
 *
 * Matches points between source and target paths for smooth morphing.
 * Uses various heuristics to find optimal point correspondence.
 */
import type { VectorPath, PathCommand } from '@core/types/geometry';
/**
 * A point extracted from a path with its index.
 */
export interface PathPoint {
    /** X coordinate */
    readonly x: number;
    /** Y coordinate */
    readonly y: number;
    /** Index in the original path commands */
    readonly commandIndex: number;
    /** Parameter along the segment (0-1) for subdivided points */
    readonly t: number;
    /** Original command type */
    readonly commandType: PathCommand['type'];
}
/**
 * Point mapping from source to target.
 */
export interface PointMapping {
    /** Source point index */
    readonly sourceIndex: number;
    /** Target point index */
    readonly targetIndex: number;
    /** Mapping quality (0-1) */
    readonly quality: number;
}
/**
 * Result of point matching.
 */
export interface MatchingResult {
    /** Point mappings */
    readonly mappings: readonly PointMapping[];
    /** Source points (possibly reordered) */
    readonly sourcePoints: readonly PathPoint[];
    /** Target points (possibly reordered) */
    readonly targetPoints: readonly PathPoint[];
    /** Starting index rotation for source */
    readonly sourceRotation: number;
    /** Starting index rotation for target */
    readonly targetRotation: number;
    /** Whether direction was reversed */
    readonly reversed: boolean;
}
/**
 * Options for point matching.
 */
export interface MatchingOptions {
    /** Try rotating start point for better match (default: true) */
    readonly tryRotation?: boolean;
    /** Try reversing direction for better match (default: true) */
    readonly tryReverse?: boolean;
}
/**
 * Extract points from a path.
 */
export declare function extractPoints(path: VectorPath): PathPoint[];
/**
 * Match points between source and target paths.
 * Both paths should have the same number of points.
 */
export declare function matchPoints(sourcePoints: readonly PathPoint[], targetPoints: readonly PathPoint[], options?: MatchingOptions): MatchingResult;
/**
 * Subdivide a path segment to add more points.
 */
export declare function subdivideSegment(start: PathPoint, end: PathPoint, command: PathCommand, divisions: number): PathPoint[];
/**
 * Add points to a path to reach a target count.
 */
export declare function addPointsToPath(path: VectorPath, targetCount: number): VectorPath;
/**
 * Normalize paths to have the same number of points.
 */
export declare function normalizePathPoints(sourcePath: VectorPath, targetPath: VectorPath): {
    source: VectorPath;
    target: VectorPath;
};
//# sourceMappingURL=point-matching.d.ts.map