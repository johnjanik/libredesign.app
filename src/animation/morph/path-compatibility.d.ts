/**
 * Path Compatibility
 *
 * Checks if two paths are compatible for morphing and provides
 * information about how to make them compatible.
 */
import type { VectorPath, PathCommand } from '@core/types/geometry';
/**
 * Compatibility level for path morphing.
 */
export type CompatibilityLevel = 'direct' | 'subdivide' | 'incompatible';
/**
 * Result of compatibility check.
 */
export interface CompatibilityResult {
    /** Compatibility level */
    readonly level: CompatibilityLevel;
    /** Whether paths can be morphed */
    readonly canMorph: boolean;
    /** Source path point count */
    readonly sourcePoints: number;
    /** Target path point count */
    readonly targetPoints: number;
    /** Point difference */
    readonly pointDifference: number;
    /** Recommended subdivisions for source */
    readonly sourceSubdivisions: number;
    /** Recommended subdivisions for target */
    readonly targetSubdivisions: number;
    /** Reason if incompatible */
    readonly reason?: string;
}
/**
 * Options for compatibility check.
 */
export interface CompatibilityOptions {
    /** Maximum point difference allowed for subdivision (default: 50) */
    readonly maxPointDifference?: number;
    /** Whether to allow open/closed path mismatch (default: false) */
    readonly allowOpenClosedMismatch?: boolean;
}
/**
 * Check if two paths are compatible for morphing.
 */
export declare function checkCompatibility(sourcePath: VectorPath, targetPath: VectorPath, options?: CompatibilityOptions): CompatibilityResult;
/**
 * Count the number of points in a path.
 */
export declare function countPoints(path: VectorPath): number;
/**
 * Check if a path is closed.
 */
export declare function isClosedPath(path: VectorPath): boolean;
/**
 * Get the winding direction of a closed path.
 * Returns 1 for clockwise, -1 for counter-clockwise.
 */
export declare function getWindingDirection(path: VectorPath): number;
/**
 * Get command types present in a path.
 */
export declare function getCommandTypes(path: VectorPath): Set<PathCommand['type']>;
/**
 * Check if paths have compatible command types.
 * For best morphing, both should use the same curve types.
 */
export declare function hasCompatibleCommands(sourcePath: VectorPath, targetPath: VectorPath): boolean;
/**
 * Get the bounds of a path.
 */
export declare function getPathBounds(path: VectorPath): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
};
//# sourceMappingURL=path-compatibility.d.ts.map