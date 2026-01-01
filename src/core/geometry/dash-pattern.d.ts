/**
 * Dash Pattern
 *
 * Converts a vector path with a dash pattern into multiple dashed segments.
 * Supports arbitrary dash patterns and dash offsets.
 */
import type { Point, VectorPath } from '@core/types/geometry';
/**
 * Configuration for dash pattern application
 */
export interface DashConfig {
    /** Array of dash and gap lengths (e.g., [10, 5] for 10px dash, 5px gap) */
    readonly pattern: readonly number[];
    /** Offset into the dash pattern */
    readonly offset?: number;
    /** Tolerance for Bezier curve flattening */
    readonly tolerance?: number;
}
/**
 * Result of applying a dash pattern to a path
 */
export interface DashResult {
    /** Array of dashed path segments */
    readonly paths: VectorPath[];
    /** Total length of the original path */
    readonly totalLength: number;
}
/**
 * Apply a dash pattern to a vector path.
 * Returns an array of path segments representing the visible dashes.
 */
export declare function applyDashPattern(path: VectorPath, config: DashConfig): DashResult;
/**
 * Calculate the total length of a path
 */
export declare function pathLength(path: VectorPath, tolerance?: number): number;
/**
 * Get a point at a specific distance along a path
 */
export declare function pointAtLength(path: VectorPath, targetLength: number, tolerance?: number): Point | null;
/**
 * Get the tangent direction at a specific distance along a path
 */
export declare function tangentAtLength(path: VectorPath, targetLength: number, tolerance?: number): Point | null;
//# sourceMappingURL=dash-pattern.d.ts.map