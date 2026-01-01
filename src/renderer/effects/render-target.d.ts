/**
 * Render Target (FBO wrapper)
 *
 * Wraps a WebGL framebuffer with attached color texture for off-screen rendering.
 * Used by the effects pipeline for multi-pass rendering.
 */
import type { WebGLContext } from '../core/webgl-context';
/**
 * Render target configuration
 */
export interface RenderTargetConfig {
    readonly width: number;
    readonly height: number;
    readonly format?: number;
    readonly filter?: number;
    readonly wrap?: number;
    readonly generateMipmaps?: boolean;
}
/**
 * Render target for off-screen rendering
 */
export declare class RenderTarget {
    readonly width: number;
    readonly height: number;
    private ctx;
    private _framebuffer;
    private _texture;
    private _disposed;
    constructor(ctx: WebGLContext, config: RenderTargetConfig);
    /**
     * Get the WebGL framebuffer.
     */
    get framebuffer(): WebGLFramebuffer;
    /**
     * Get the WebGL texture.
     */
    get texture(): WebGLTexture;
    /**
     * Bind this render target for rendering.
     */
    bind(): void;
    /**
     * Unbind this render target (bind default framebuffer).
     */
    unbind(): void;
    /**
     * Clear this render target.
     */
    clear(r?: number, g?: number, b?: number, a?: number): void;
    /**
     * Bind the texture for sampling.
     */
    bindTexture(unit: number): void;
    /**
     * Check if this render target has been disposed.
     */
    get disposed(): boolean;
    /**
     * Dispose of the render target.
     */
    dispose(): void;
}
/**
 * Create a render target.
 */
export declare function createRenderTarget(ctx: WebGLContext, config: RenderTargetConfig): RenderTarget;
/**
 * Create a render target matching the canvas size.
 */
export declare function createCanvasSizedRenderTarget(ctx: WebGLContext): RenderTarget;
//# sourceMappingURL=render-target.d.ts.map