/**
 * Drop Shadow Effect
 *
 * Renders a drop shadow behind an element by:
 * 1. Creating an offset silhouette from the source alpha
 * 2. Applying spread to expand/contract the shadow
 * 3. Blurring the shadow
 * 4. Colorizing and compositing behind the original
 */
import type { RGBA } from '@core/types/color';
import type { Point } from '@core/types/geometry';
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { RenderTarget } from './render-target';
import type { RenderTargetPool } from './render-target-pool';
/**
 * Drop shadow configuration
 */
export interface DropShadowConfig {
    /** Shadow color with alpha */
    readonly color: RGBA;
    /** Shadow offset in pixels */
    readonly offset: Point;
    /** Blur radius in pixels */
    readonly radius: number;
    /** Spread amount (positive expands, negative contracts) */
    readonly spread: number;
}
/**
 * Drop shadow effect renderer
 */
export declare class DropShadowEffectRenderer {
    private ctx;
    private shaders;
    private pool;
    private blurRenderer;
    private quadVAO;
    private quadVBO;
    private quadTexCoordVBO;
    constructor(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool, options?: {
        maxBlurRadius?: number;
    });
    /**
     * Set up full-screen quad for post-processing.
     */
    private setupQuad;
    /**
     * Apply drop shadow effect to a render target.
     *
     * @param source - The source render target
     * @param config - Shadow configuration
     * @param releaseSource - Whether to release the source to the pool
     * @returns The composited render target (shadow behind source)
     */
    apply(source: RenderTarget, config: DropShadowConfig, releaseSource?: boolean): RenderTarget;
    /**
     * Render just the shadow (without compositing with source).
     * Useful for custom compositing or shadow-only rendering.
     */
    renderShadowOnly(source: RenderTarget, config: DropShadowConfig): RenderTarget;
    /**
     * Calculate the padding needed for a shadow effect.
     */
    static calculatePadding(config: DropShadowConfig): number;
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
 * Create a drop shadow effect renderer.
 */
export declare function createDropShadowEffectRenderer(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool, options?: {
    maxBlurRadius?: number;
}): DropShadowEffectRenderer;
//# sourceMappingURL=drop-shadow-effect.d.ts.map