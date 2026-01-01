/**
 * Inner Shadow Effect
 *
 * Renders an inner shadow inside an element by:
 * 1. Creating an inverted offset silhouette (shape minus offset shape)
 * 2. Applying blur to the shadow
 * 3. Masking by the original shape's alpha
 * 4. Compositing on top of the original
 */
import type { RGBA } from '@core/types/color';
import type { Point } from '@core/types/geometry';
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { RenderTarget } from './render-target';
import type { RenderTargetPool } from './render-target-pool';
/**
 * Inner shadow configuration
 */
export interface InnerShadowConfig {
    /** Shadow color with alpha */
    readonly color: RGBA;
    /** Shadow offset in pixels (direction shadow comes from) */
    readonly offset: Point;
    /** Blur radius in pixels */
    readonly radius: number;
    /** Spread amount (positive expands shadow inward) */
    readonly spread: number;
}
/**
 * Inner shadow effect renderer
 */
export declare class InnerShadowEffectRenderer {
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
     * Apply inner shadow effect to a render target.
     *
     * @param source - The source render target
     * @param config - Shadow configuration
     * @param releaseSource - Whether to release the source to the pool
     * @returns The composited render target (source with inner shadow)
     */
    apply(source: RenderTarget, config: InnerShadowConfig, releaseSource?: boolean): RenderTarget;
    /**
     * Render just the inner shadow mask (without compositing with source).
     * Useful for custom compositing or previewing.
     */
    renderShadowOnly(source: RenderTarget, config: InnerShadowConfig): RenderTarget;
    /**
     * Apply multiple inner shadows (stacked).
     */
    applyMultiple(source: RenderTarget, configs: InnerShadowConfig[], releaseSource?: boolean): RenderTarget;
    /**
     * Calculate the padding needed for an inner shadow effect.
     * Note: Inner shadows don't expand beyond the element, but blur
     * may need padding for proper edge rendering.
     */
    static calculatePadding(config: InnerShadowConfig): number;
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
 * Create an inner shadow effect renderer.
 */
export declare function createInnerShadowEffectRenderer(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool, options?: {
    maxBlurRadius?: number;
}): InnerShadowEffectRenderer;
//# sourceMappingURL=inner-shadow-effect.d.ts.map