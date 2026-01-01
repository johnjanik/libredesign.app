/**
 * Path Tessellation
 *
 * Converts vector paths to triangles for GPU rendering.
 */
import type { VectorPath, Point } from '@core/types/geometry';
/**
 * Tessellation result
 */
export interface TessellationResult {
    readonly vertices: Float32Array;
    readonly indices: Uint16Array;
}
/**
 * Stroke tessellation result
 */
export interface StrokeTessellationResult {
    readonly vertices: Float32Array;
    readonly indices: Uint16Array;
}
/**
 * Tessellation options
 */
export interface TessellationOptions {
    readonly flatness?: number;
    readonly maxSegments?: number;
}
/**
 * Tessellate a fill path to triangles.
 */
export declare function tessellateFill(path: VectorPath, options?: TessellationOptions): TessellationResult;
/**
 * Tessellate a stroke path.
 */
export declare function tessellateStroke(path: VectorPath, _strokeWidth: number, options?: TessellationOptions): StrokeTessellationResult;
/**
 * Flatten a path to line segments.
 */
export declare function flattenPath(path: VectorPath, flatness?: number, maxSegments?: number): Point[];
/**
 * Create a rectangle tessellation.
 */
export declare function tessellateRect(x: number, y: number, width: number, height: number): TessellationResult;
/**
 * Create a rounded rectangle tessellation.
 */
export declare function tessellateRoundedRect(x: number, y: number, width: number, height: number, radius: number, segments?: number): TessellationResult;
//# sourceMappingURL=path-tessellation.d.ts.map