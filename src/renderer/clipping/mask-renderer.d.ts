/**
 * Mask Renderer
 *
 * Renders content with alpha masking using framebuffers.
 * Alternative to stencil clipping that supports soft edges and gradient masks.
 */
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { RenderTarget } from '../effects/render-target';
import type { RenderTargetPool } from '../effects/render-target-pool';
import type { Matrix2x3 } from '@core/types/geometry';
/**
 * Mask type
 */
export type MaskType = 'alpha' | 'luminance' | 'inverse-alpha' | 'inverse-luminance';
/**
 * Mask configuration
 */
export interface MaskConfig {
    /** Mask type */
    readonly type?: MaskType;
    /** Expand mask by this amount (pixels) */
    readonly expand?: number;
    /** Feather edge (blur radius) */
    readonly feather?: number;
    /** Mask opacity */
    readonly opacity?: number;
}
/**
 * Mask renderer for alpha-based clipping
 */
export declare class MaskRenderer {
    private ctx;
    private shaders;
    private pool;
    private maskStack;
    private quadVAO;
    private quadVBO;
    constructor(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool);
    /**
     * Set up full-screen quad for compositing.
     */
    private setupQuad;
    /**
     * Begin a mask operation.
     * Content rendered after this call will be used as the mask.
     */
    beginMask(config?: MaskConfig): void;
    /**
     * End mask definition and start rendering masked content.
     * Content rendered after this call will be masked.
     */
    endMaskBeginContent(): void;
    /**
     * End masked content and composite result.
     */
    endMask(): RenderTarget | null;
    /**
     * Apply mask to content and render to current target.
     */
    applyMask(content: RenderTarget, mask: RenderTarget, config?: MaskConfig): void;
    /**
     * Render content masked by a shape.
     */
    renderMaskedShape(content: RenderTarget, shapeVertices: Float32Array, shapeIndices: Uint16Array, transform: Matrix2x3, viewProjection: Matrix2x3, config?: MaskConfig): RenderTarget;
    /**
     * Composite content with mask.
     */
    private compositeMasked;
    /**
     * Apply feather (blur) to mask.
     */
    private applyFeather;
    /**
     * Get numeric value for mask type.
     */
    private getMaskTypeValue;
    /**
     * Set a matrix uniform.
     */
    private setMatrixUniform;
    /**
     * Get current mask depth.
     */
    getMaskDepth(): number;
    /**
     * Check if currently inside a mask.
     */
    isMasking(): boolean;
    /**
     * Cancel current mask operation without applying.
     */
    cancelMask(): void;
    /**
     * Clear all mask layers.
     */
    clearAllMasks(): void;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create a mask renderer.
 */
export declare function createMaskRenderer(ctx: WebGLContext, shaders: ShaderManager, pool: RenderTargetPool): MaskRenderer;
//# sourceMappingURL=mask-renderer.d.ts.map