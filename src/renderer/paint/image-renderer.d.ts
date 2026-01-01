/**
 * Image Renderer
 *
 * Renders image fills for vector shapes.
 * Supports various scale modes: FILL, FIT, CROP, TILE.
 */
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { TextureEntry } from '../textures/texture-manager';
import type { Matrix2x3 } from '@core/types/geometry';
import type { ImageScaleMode } from '@core/types/paint';
/**
 * Image rendering configuration
 */
export interface ImageRenderConfig {
    /** The texture to render */
    readonly texture: TextureEntry;
    /** Scale mode for image fitting */
    readonly scaleMode: ImageScaleMode;
    /** Image transform matrix */
    readonly transform?: Matrix2x3;
    /** Overall opacity (0-1) */
    readonly opacity?: number;
    /** Target bounds (x, y, width, height) */
    readonly bounds: readonly [number, number, number, number];
}
/**
 * Image renderer for WebGL
 */
export declare class ImageRenderer {
    private ctx;
    private shaders;
    private quadVAO;
    private quadVBO;
    private disposed;
    constructor(ctx: WebGLContext, shaders: ShaderManager);
    /**
     * Render an image fill
     */
    render(config: ImageRenderConfig): void;
    /**
     * Render an image with custom UV coordinates
     */
    renderWithUV(texture: TextureEntry, bounds: readonly [number, number, number, number], uvBounds: readonly [number, number, number, number], transform?: Matrix2x3, opacity?: number): void;
    /**
     * Dispose resources
     */
    dispose(): void;
    private checkDisposed;
    private initQuad;
    private updateQuad;
    private calculateUVBounds;
    private setUniforms;
}
/**
 * Create an image renderer
 */
export declare function createImageRenderer(ctx: WebGLContext, shaders: ShaderManager): ImageRenderer;
//# sourceMappingURL=image-renderer.d.ts.map