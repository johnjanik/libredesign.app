/**
 * Blur Effect
 *
 * Implements a two-pass separable Gaussian blur.
 * Uses a 9-tap kernel for quality blur with minimal texture samples.
 */
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { RenderTarget } from './render-target';
import type { RenderTargetPool } from './render-target-pool';
/**
 * Blur effect configuration
 */
export interface BlurEffectConfig {
    /** Blur radius in pixels */
    readonly radius: number;
    /** Number of blur passes (more = smoother but slower) */
    readonly passes?: number;
    /** Maximum allowed radius */
    readonly maxRadius?: number;
}
/**
 * Blur effect result
 */
export interface BlurResult {
    /** The blurred render target */
    readonly target: RenderTarget;
    /** Whether the source was consumed (released to pool) */
    readonly sourceConsumed: boolean;
}
/**
 * Gaussian blur effect renderer
 */
export declare class BlurEffectRenderer {
    private ctx;
    private shaders;
    private pool;
    private maxRadius;
    private quadVAO;
    private quadVBO;
    private quadTexCoordVBO;
    private ownsQuad;
    constructor(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool, options?: {
        maxRadius?: number;
        quadVAO?: WebGLVertexArrayObject;
    });
    /**
     * Set up full-screen quad for post-processing.
     */
    private setupQuad;
    /**
     * Apply Gaussian blur to a render target.
     *
     * @param source - The source render target to blur
     * @param config - Blur configuration
     * @param releaseSource - Whether to release the source target to the pool
     * @returns The blurred render target
     */
    apply(source: RenderTarget, config: BlurEffectConfig, releaseSource?: boolean): BlurResult;
    /**
     * Apply blur with a specific kernel size.
     * Adjusts passes automatically based on radius.
     */
    applyAdaptive(source: RenderTarget, radius: number, releaseSource?: boolean): BlurResult;
    /**
     * Draw the full-screen quad.
     */
    private drawQuad;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create a blur effect renderer.
 */
export declare function createBlurEffectRenderer(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool, options?: {
    maxRadius?: number;
    quadVAO?: WebGLVertexArrayObject;
}): BlurEffectRenderer;
//# sourceMappingURL=blur-effect.d.ts.map