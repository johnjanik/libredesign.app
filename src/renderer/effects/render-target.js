/**
 * Render Target (FBO wrapper)
 *
 * Wraps a WebGL framebuffer with attached color texture for off-screen rendering.
 * Used by the effects pipeline for multi-pass rendering.
 */
/**
 * Render target for off-screen rendering
 */
export class RenderTarget {
    width;
    height;
    ctx;
    _framebuffer;
    _texture;
    _disposed = false;
    constructor(ctx, config) {
        this.ctx = ctx;
        this.width = config.width;
        this.height = config.height;
        const gl = ctx.gl;
        // Create framebuffer
        this._framebuffer = ctx.createFramebuffer();
        // Create texture
        this._texture = ctx.createTexture();
        ctx.bindTexture(gl.TEXTURE_2D, this._texture);
        // Set texture parameters
        const filter = config.filter ?? gl.LINEAR;
        const wrap = config.wrap ?? gl.CLAMP_TO_EDGE;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
        // Allocate texture storage
        const format = config.format ?? gl.RGBA8;
        gl.texStorage2D(gl.TEXTURE_2D, 1, format, config.width, config.height);
        // Attach texture to framebuffer
        ctx.bindFramebuffer(this._framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._texture, 0);
        // Check framebuffer status
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            this.dispose();
            throw new Error(`Framebuffer incomplete: ${status}`);
        }
        // Unbind
        ctx.bindFramebuffer(null);
        ctx.bindTexture(gl.TEXTURE_2D, null);
    }
    /**
     * Get the WebGL framebuffer.
     */
    get framebuffer() {
        if (this._disposed) {
            throw new Error('RenderTarget has been disposed');
        }
        return this._framebuffer;
    }
    /**
     * Get the WebGL texture.
     */
    get texture() {
        if (this._disposed) {
            throw new Error('RenderTarget has been disposed');
        }
        return this._texture;
    }
    /**
     * Bind this render target for rendering.
     */
    bind() {
        if (this._disposed) {
            throw new Error('RenderTarget has been disposed');
        }
        this.ctx.bindFramebuffer(this._framebuffer);
        this.ctx.setViewport(0, 0, this.width, this.height);
    }
    /**
     * Unbind this render target (bind default framebuffer).
     */
    unbind() {
        this.ctx.bindFramebuffer(null);
    }
    /**
     * Clear this render target.
     */
    clear(r = 0, g = 0, b = 0, a = 0) {
        this.bind();
        const gl = this.ctx.gl;
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    /**
     * Bind the texture for sampling.
     */
    bindTexture(unit) {
        if (this._disposed) {
            throw new Error('RenderTarget has been disposed');
        }
        this.ctx.bindTexture(this.ctx.gl.TEXTURE_2D, this._texture, unit);
    }
    /**
     * Check if this render target has been disposed.
     */
    get disposed() {
        return this._disposed;
    }
    /**
     * Dispose of the render target.
     */
    dispose() {
        if (this._disposed)
            return;
        this.ctx.deleteFramebuffer(this._framebuffer);
        this.ctx.deleteTexture(this._texture);
        this._disposed = true;
    }
}
/**
 * Create a render target.
 */
export function createRenderTarget(ctx, config) {
    return new RenderTarget(ctx, config);
}
/**
 * Create a render target matching the canvas size.
 */
export function createCanvasSizedRenderTarget(ctx) {
    const size = ctx.getCanvasSize();
    return new RenderTarget(ctx, {
        width: size.width,
        height: size.height,
    });
}
//# sourceMappingURL=render-target.js.map