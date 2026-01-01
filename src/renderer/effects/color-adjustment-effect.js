/**
 * Color Adjustment Effect
 *
 * Applies hue, saturation, brightness, and contrast adjustments.
 * Uses GPU-accelerated HSV color space transformations.
 */
/**
 * Color adjustment effect renderer
 */
export class ColorAdjustmentEffectRenderer {
    ctx;
    shaders;
    pool;
    // Quad resources
    quadVAO = null;
    quadVBO = null;
    quadTexCoordVBO = null;
    ownsQuad = false;
    constructor(ctx, shaders, pool, options = {}) {
        this.ctx = ctx;
        this.shaders = shaders;
        this.pool = pool;
        if (options.quadVAO) {
            this.quadVAO = options.quadVAO;
        }
        else {
            this.setupQuad();
            this.ownsQuad = true;
        }
    }
    /**
     * Set up full-screen quad for post-processing.
     */
    setupQuad() {
        const gl = this.ctx.gl;
        const QUAD_VERTICES = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ]);
        const QUAD_TEX_COORDS = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1,
        ]);
        this.quadVAO = this.ctx.createVertexArray();
        this.quadVBO = this.ctx.createBuffer();
        this.quadTexCoordVBO = this.ctx.createBuffer();
        this.ctx.bindVertexArray(this.quadVAO);
        // Position attribute (location 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        // Texture coordinate attribute (location 1)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadTexCoordVBO);
        gl.bufferData(gl.ARRAY_BUFFER, QUAD_TEX_COORDS, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
        this.ctx.bindVertexArray(null);
    }
    /**
     * Check if the effect would produce any visible change.
     */
    isNoop(config) {
        const epsilon = 0.01;
        return (Math.abs(config.hue) < epsilon &&
            Math.abs(config.saturation) < epsilon &&
            Math.abs(config.brightness) < epsilon &&
            Math.abs(config.contrast) < epsilon);
    }
    /**
     * Apply color adjustment to a render target.
     *
     * @param source - The source render target
     * @param config - Color adjustment configuration
     * @param releaseSource - Whether to release the source target to the pool
     * @returns The adjusted render target
     */
    apply(source, config, releaseSource = true) {
        // Skip if no adjustment needed
        if (this.isNoop(config)) {
            return { target: source, sourceConsumed: false };
        }
        const gl = this.ctx.gl;
        // Acquire output target
        const target = this.pool.acquire(source.width, source.height);
        target.bind();
        target.clear();
        // Use color adjustment shader
        const shader = this.shaders.use('colorAdjustment');
        // Bind source texture
        source.bindTexture(0);
        gl.uniform1i(shader.uniforms.get('uTexture'), 0);
        // Set adjustment uniforms
        gl.uniform1f(shader.uniforms.get('uHue'), config.hue);
        gl.uniform1f(shader.uniforms.get('uSaturation'), config.saturation);
        gl.uniform1f(shader.uniforms.get('uBrightness'), config.brightness);
        gl.uniform1f(shader.uniforms.get('uContrast'), config.contrast);
        // Draw quad
        this.drawQuad();
        // Release source if requested
        if (releaseSource) {
            this.pool.release(source);
        }
        return {
            target,
            sourceConsumed: releaseSource,
        };
    }
    /**
     * Draw the full-screen quad.
     */
    drawQuad() {
        this.ctx.bindVertexArray(this.quadVAO);
        this.ctx.drawArrays(this.ctx.gl.TRIANGLE_STRIP, 0, 4);
        this.ctx.bindVertexArray(null);
    }
    /**
     * Dispose of resources.
     */
    dispose() {
        if (this.ownsQuad) {
            if (this.quadVAO) {
                this.ctx.deleteVertexArray(this.quadVAO);
            }
            if (this.quadVBO) {
                this.ctx.deleteBuffer(this.quadVBO);
            }
            if (this.quadTexCoordVBO) {
                this.ctx.deleteBuffer(this.quadTexCoordVBO);
            }
        }
    }
}
/**
 * Create a color adjustment effect renderer.
 */
export function createColorAdjustmentEffectRenderer(ctx, shaders, pool, options) {
    return new ColorAdjustmentEffectRenderer(ctx, shaders, pool, options);
}
//# sourceMappingURL=color-adjustment-effect.js.map