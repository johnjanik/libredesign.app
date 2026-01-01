/**
 * Path Interpolator
 *
 * Interpolates between source and target vector paths for shape morphing.
 * Produces intermediate paths for smooth transitions.
 */
import type { VectorPath } from '@core/types/geometry';
import type { EasingFunction } from '../types/easing';
import type { PathPoint, MatchingResult } from './point-matching';
/**
 * Prepared path morph transition.
 */
export interface PathMorphTransition {
    /** Normalized source path */
    readonly sourcePath: VectorPath;
    /** Normalized target path */
    readonly targetPath: VectorPath;
    /** Source points */
    readonly sourcePoints: readonly PathPoint[];
    /** Target points (reordered for best match) */
    readonly targetPoints: readonly PathPoint[];
    /** Point matching result */
    readonly matching: MatchingResult;
    /** Whether paths are compatible */
    readonly isCompatible: boolean;
    /** Interpolate at progress (0-1) */
    interpolate(t: number): VectorPath;
}
/**
 * Options for path morphing.
 */
export interface MorphOptions {
    /** Easing function */
    readonly easing?: EasingFunction;
    /** Maximum point difference allowed */
    readonly maxPointDifference?: number;
    /** Allow open to closed path morphing */
    readonly allowOpenClosedMismatch?: boolean;
}
/**
 * Prepare a path morph transition.
 */
export declare function prepareMorph(sourcePath: VectorPath, targetPath: VectorPath, options?: MorphOptions): PathMorphTransition;
/**
 * Interpolate multiple paths (for multi-path shapes).
 */
export declare function interpolatePathArrays(sourcePaths: readonly VectorPath[], targetPaths: readonly VectorPath[], t: number, options?: MorphOptions): VectorPath[];
/**
 * Create a morph animation function for use with animation system.
 */
export declare function createMorphAnimator(sourcePaths: readonly VectorPath[], targetPaths: readonly VectorPath[], options?: MorphOptions): (t: number) => VectorPath[];
//# sourceMappingURL=path-interpolator.d.ts.map