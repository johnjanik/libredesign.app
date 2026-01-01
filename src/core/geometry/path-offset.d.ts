/**
 * Path Offset
 *
 * Offsets vector paths inward or outward for stroke alignment.
 * Supports different join styles (miter, bevel, round).
 */
import type { VectorPath, StrokeJoin } from '@core/types/geometry';
/**
 * Offset configuration
 */
export interface OffsetConfig {
    /** Amount to offset (positive = outward, negative = inward) */
    readonly distance: number;
    /** Join style at corners */
    readonly joinStyle?: StrokeJoin;
    /** Miter limit (ratio of miter length to distance) */
    readonly miterLimit?: number;
    /** Tolerance for curve flattening */
    readonly tolerance?: number;
}
/**
 * Result of path offset operation
 */
export interface OffsetResult {
    /** Offset path(s) - may produce multiple paths due to self-intersection */
    readonly paths: VectorPath[];
    /** Whether operation succeeded */
    readonly success: boolean;
    /** Error message if failed */
    readonly error?: string;
}
/**
 * Offset a vector path by a distance.
 */
export declare function offsetPath(path: VectorPath, config: OffsetConfig): OffsetResult;
/**
 * Offset a path for stroke alignment.
 * Returns the inside or outside path based on alignment.
 */
export declare function offsetForStrokeAlignment(path: VectorPath, strokeWeight: number, alignment: 'INSIDE' | 'CENTER' | 'OUTSIDE', joinStyle?: StrokeJoin, miterLimit?: number): OffsetResult;
/**
 * Create expanded stroke outline from a path.
 * Returns the outer and inner paths that form the stroke area.
 */
export declare function createStrokeOutline(path: VectorPath, strokeWeight: number, joinStyle?: StrokeJoin, miterLimit?: number): {
    outer: OffsetResult;
    inner: OffsetResult;
};
//# sourceMappingURL=path-offset.d.ts.map