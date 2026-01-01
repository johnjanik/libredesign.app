/**
 * Stencil Clipper
 *
 * Uses the stencil buffer to clip child content to parent bounds.
 * Supports nested clipping regions using stencil reference values.
 */
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { Matrix2x3 } from '@core/types/geometry';
/**
 * Stencil clipper for efficient clipping using the GPU stencil buffer
 */
export declare class StencilClipper {
    private ctx;
    private shaders;
    private stencilDepth;
    private maxStencilDepth;
    private clipVAO;
    private clipVBO;
    private clipIBO;
    constructor(ctx: WebGLContext, shaders: ShaderManager);
    /**
     * Set up WebGL resources for clip path rendering.
     */
    private setupResources;
    /**
     * Begin a clipping region.
     * Call this before rendering content that should be clipped.
     *
     * @param vertices - Vertices of the clip path (triangulated)
     * @param indices - Triangle indices
     * @param transform - World transform for the clip path
     * @param viewProjection - View-projection matrix
     */
    beginClip(vertices: Float32Array, indices: Uint16Array, transform: Matrix2x3, viewProjection: Matrix2x3): void;
    /**
     * Begin a rectangular clipping region (optimized path for frames).
     */
    beginRectClip(x: number, y: number, width: number, height: number, transform: Matrix2x3, viewProjection: Matrix2x3): void;
    /**
     * End the current clipping region.
     * Call this after rendering clipped content.
     */
    endClip(): void;
    /**
     * Draw the clip path to the stencil buffer.
     */
    private drawClipPath;
    /**
     * Set a matrix uniform.
     */
    private setMatrixUniform;
    /**
     * Get current clip depth.
     */
    getClipDepth(): number;
    /**
     * Check if currently inside a clip region.
     */
    isClipping(): boolean;
    /**
     * Clear all clip regions (reset stencil buffer).
     */
    clearAllClips(): void;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create a stencil clipper.
 */
export declare function createStencilClipper(ctx: WebGLContext, shaders: ShaderManager): StencilClipper;
//# sourceMappingURL=stencil-clipper.d.ts.map