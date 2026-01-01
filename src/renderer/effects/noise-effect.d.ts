/**
 * Noise/Grain Effect
 *
 * Applies film grain or noise effect to render targets.
 * Supports both color and monochrome noise with adjustable intensity.
 */
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { RenderTarget } from './render-target';
import type { RenderTargetPool } from './render-target-pool';
/**
 * Noise effect configuration
 */
export interface NoiseEffectConfig {
    /** Noise amount (0 to 100) */
    readonly amount: number;
    /** Grain size (1 to 10) */
    readonly size: number;
    /** Whether noise is monochrome */
    readonly monochrome: boolean;
    /** Animation time (for varying noise pattern) */
    readonly time?: number;
}
/**
 * Noise effect result
 */
export interface NoiseEffectResult {
    /** The noisy render target */
    readonly target: RenderTarget;
    /** Whether the source was consumed (released to pool) */
    readonly sourceConsumed: boolean;
}
/**
 * Noise effect renderer
 */
export declare class NoiseEffectRenderer {
    private ctx;
    private shaders;
    private pool;
    private quadVAO;
    private quadVBO;
    private quadTexCoordVBO;
    private ownsQuad;
    private animationTime;
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
    isNoop(config: NoiseEffectConfig): boolean;
    /**
     * Update animation time (call once per frame).
     */
    updateTime(deltaTime: number): void;
    /**
     * Apply noise effect to a render target.
     *
     * @param source - The source render target
     * @param config - Noise effect configuration
     * @param releaseSource - Whether to release the source target to the pool
     * @returns The noisy render target
     */
    apply(source: RenderTarget, config: NoiseEffectConfig, releaseSource?: boolean): NoiseEffectResult;
    /**
     * Apply static noise (non-animated).
     */
    applyStatic(source: RenderTarget, config: Omit<NoiseEffectConfig, 'time'>, releaseSource?: boolean): NoiseEffectResult;
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
 * Create a noise effect renderer.
 */
export declare function createNoiseEffectRenderer(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool, options?: {
    quadVAO?: WebGLVertexArrayObject;
}): NoiseEffectRenderer;
//# sourceMappingURL=noise-effect.d.ts.map