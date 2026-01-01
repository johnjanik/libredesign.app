/**
 * Color Adjustment Effect
 *
 * Applies hue, saturation, brightness, and contrast adjustments.
 * Uses GPU-accelerated HSV color space transformations.
 */
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { RenderTarget } from './render-target';
import type { RenderTargetPool } from './render-target-pool';
/**
 * Color adjustment effect configuration
 */
export interface ColorAdjustmentConfig {
    /** Hue rotation in degrees (-180 to 180) */
    readonly hue: number;
    /** Saturation adjustment (-100 to 100) */
    readonly saturation: number;
    /** Brightness adjustment (-100 to 100) */
    readonly brightness: number;
    /** Contrast adjustment (-100 to 100) */
    readonly contrast: number;
}
/**
 * Color adjustment effect result
 */
export interface ColorAdjustmentResult {
    /** The adjusted render target */
    readonly target: RenderTarget;
    /** Whether the source was consumed (released to pool) */
    readonly sourceConsumed: boolean;
}
/**
 * Color adjustment effect renderer
 */
export declare class ColorAdjustmentEffectRenderer {
    private ctx;
    private shaders;
    private pool;
    private quadVAO;
    private quadVBO;
    private quadTexCoordVBO;
    private ownsQuad;
    constructor(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool, options?: {
        quadVAO?: WebGLVertexArrayObject;
    });
    /**
     * Set up full-screen quad for post-processing.
     */
    private setupQuad;
    /**
     * Check if the effect would produce any visible change.
     */
    isNoop(config: ColorAdjustmentConfig): boolean;
    /**
     * Apply color adjustment to a render target.
     *
     * @param source - The source render target
     * @param config - Color adjustment configuration
     * @param releaseSource - Whether to release the source target to the pool
     * @returns The adjusted render target
     */
    apply(source: RenderTarget, config: ColorAdjustmentConfig, releaseSource?: boolean): ColorAdjustmentResult;
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
 * Create a color adjustment effect renderer.
 */
export declare function createColorAdjustmentEffectRenderer(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool, options?: {
    quadVAO?: WebGLVertexArrayObject;
}): ColorAdjustmentEffectRenderer;
//# sourceMappingURL=color-adjustment-effect.d.ts.map