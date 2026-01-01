/**
 * Effect Pipeline
 *
 * Coordinates multi-pass rendering for visual effects (blur, shadows, etc.).
 * Manages render targets and effect application.
 */
import type { NodeId } from '@core/types/common';
import type { Effect } from '@core/types/effect';
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import { RenderTarget } from './render-target';
import { RenderTargetPool } from './render-target-pool';
/**
 * Effect pipeline configuration
 */
export interface EffectPipelineConfig {
    /** Maximum blur radius in pixels */
    readonly maxBlurRadius?: number;
    /** Number of blur passes for quality */
    readonly blurPasses?: number;
}
/**
 * Effect pipeline for multi-pass rendering
 */
export declare class EffectPipeline {
    private ctx;
    private shaders;
    private pool;
    private maxBlurRadius;
    private blurPasses;
    private quadVAO;
    private quadVBO;
    private quadTexCoordVBO;
    private contextStack;
    private canvasWidth;
    private canvasHeight;
    constructor(ctx: WebGLContext, shaders: ShaderManager, config?: EffectPipelineConfig);
    /**
     * Set up full-screen quad for post-processing.
     */
    private setupQuad;
    /**
     * Update cached canvas size.
     */
    updateCanvasSize(): void;
    /**
     * Check if any effects need multi-pass rendering.
     */
    needsMultiPass(effects: Effect[]): boolean;
    /**
     * Begin rendering a node with effects.
     * Returns a render target to draw the node content into.
     */
    beginNodeEffects(nodeId: NodeId, effects: Effect[], bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): RenderTarget;
    /**
     * End node effects and apply all effects.
     * Returns the final composited render target.
     */
    endNodeEffects(): RenderTarget;
    /**
     * Composite a render target onto the main framebuffer.
     */
    compositeToScreen(target: RenderTarget, x: number, y: number, width: number, height: number): void;
    /**
     * Calculate padding needed for effects.
     */
    private calculatePadding;
    /**
     * Apply Gaussian blur effect.
     */
    private applyBlur;
    /**
     * Apply drop shadow effect.
     */
    private applyDropShadow;
    /**
     * Apply inner shadow effect.
     */
    private applyInnerShadow;
    /**
     * Apply background blur effect.
     */
    private applyBackgroundBlur;
    /**
     * Draw the full-screen quad.
     */
    private drawQuad;
    /**
     * Get the render target pool.
     */
    getPool(): RenderTargetPool;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create an effect pipeline.
 */
export declare function createEffectPipeline(ctx: WebGLContext, shaders: ShaderManager, config?: EffectPipelineConfig): EffectPipeline;
//# sourceMappingURL=effect-pipeline.d.ts.map