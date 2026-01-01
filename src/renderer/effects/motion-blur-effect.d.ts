/**
 * Motion Blur Effect
 *
 * Applies directional motion blur along a specified angle.
 * Supports both standard and high-quality rendering modes.
 */
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { RenderTarget } from './render-target';
import type { RenderTargetPool } from './render-target-pool';
/**
 * Motion blur effect configuration
 */
export interface MotionBlurConfig {
    /** Blur angle in degrees (0 = horizontal right) */
    readonly angle: number;
    /** Blur distance in pixels */
    readonly distance: number;
    /** Use high-quality mode (more samples) */
    readonly highQuality?: boolean;
}
/**
 * Motion blur effect result
 */
export interface MotionBlurResult {
    /** The blurred render target */
    readonly target: RenderTarget;
    /** Whether the source was consumed (released to pool) */
    readonly sourceConsumed: boolean;
}
/**
 * Motion blur effect renderer
 */
export declare class MotionBlurEffectRenderer {
    private ctx;
    private shaders;
    private pool;
    private maxDistance;
    private quadVAO;
    private quadVBO;
    private quadTexCoordVBO;
    private ownsQuad;
    constructor(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool, options?: {
        maxDistance?: number;
        quadVAO?: WebGLVertexArrayObject;
    });
    /**
     * Set up full-screen quad for post-processing.
     */
    private setupQuad;
    /**
     * Check if the effect would produce any visible change.
     */
    isNoop(config: MotionBlurConfig): boolean;
    /**
     * Convert degrees to radians.
     */
    private degreesToRadians;
    /**
     * Apply motion blur to a render target.
     *
     * @param source - The source render target
     * @param config - Motion blur configuration
     * @param releaseSource - Whether to release the source target to the pool
     * @returns The blurred render target
     */
    apply(source: RenderTarget, config: MotionBlurConfig, releaseSource?: boolean): MotionBlurResult;
    /**
     * Apply motion blur based on velocity vector.
     *
     * @param source - The source render target
     * @param velocityX - Velocity in X direction (pixels)
     * @param velocityY - Velocity in Y direction (pixels)
     * @param releaseSource - Whether to release the source target to the pool
     * @returns The blurred render target
     */
    applyFromVelocity(source: RenderTarget, velocityX: number, velocityY: number, releaseSource?: boolean): MotionBlurResult;
    /**
     * Apply motion blur in multiple passes for larger distances.
     * Produces higher quality at the cost of performance.
     */
    applyMultiPass(source: RenderTarget, config: MotionBlurConfig, passes?: number, releaseSource?: boolean): MotionBlurResult;
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
 * Create a motion blur effect renderer.
 */
export declare function createMotionBlurEffectRenderer(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool, options?: {
    maxDistance?: number;
    quadVAO?: WebGLVertexArrayObject;
}): MotionBlurEffectRenderer;
//# sourceMappingURL=motion-blur-effect.d.ts.map