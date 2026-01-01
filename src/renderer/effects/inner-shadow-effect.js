/**
 * Inner Shadow Effect
 *
 * Renders an inner shadow inside an element by:
 * 1. Creating an inverted offset silhouette (shape minus offset shape)
 * 2. Applying blur to the shadow
 * 3. Masking by the original shape's alpha
 * 4. Compositing on top of the original
 */
import { BlurEffectRenderer } from './blur-effect';
/**
 * Inner shadow effect renderer
 */
export class InnerShadowEffectRenderer {
    ctx;
    shaders;
    pool;
    blurRenderer;
    // Quad resources
    quadVAO = null;
    quadVBO = null;
    quadTexCoordVBO = null;
    constructor(ctx, shaders, pool, options = {}) {
        this.ctx = ctx;
        this.shaders = shaders;
        this.pool = pool;
        this.setupQuad();
        this.blurRenderer = new BlurEffectRenderer(ctx, shaders, pool, {
            maxRadius: options.maxBlurRadius ?? 64,
            quadVAO: this.quadVAO,
        });
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
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadTexCoordVBO);
        gl.bufferData(gl.ARRAY_BUFFER, QUAD_TEX_COORDS, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
        this.ctx.bindVertexArray(null);
    }
    /**
     * Apply inner shadow effect to a render target.
     *
     * @param source - The source render target
     * @param config - Shadow configuration
     * @param releaseSource - Whether to release the source to the pool
     * @returns The composited render target (source with inner shadow)
     */
    apply(source, config, releaseSource = true) {
        const gl = this.ctx.gl;
        // Step 1: Create inverted shadow silhouette
        // Inner shadow = original alpha * (1 - offset alpha)
        const shadowTarget = this.pool.acquire(source.width, source.height);
        shadowTarget.bind();
        shadowTarget.clear();
        const innerShadowShader = this.shaders.use('innerShadow');
        source.bindTexture(0);
        gl.uniform1i(innerShadowShader.uniforms.get('uTexture'), 0);
        gl.uniform2f(innerShadowShader.uniforms.get('uOffset'), config.offset.x / source.width, config.offset.y / source.height);
        gl.uniform4f(innerShadowShader.uniforms.get('uColor'), config.color.r, config.color.g, config.color.b, config.color.a);
        gl.uniform1f(innerShadowShader.uniforms.get('uSpread'), config.spread);
        this.drawQuad();
        // Step 2: Blur the shadow
        const { target: blurredShadow } = this.blurRenderer.apply(shadowTarget, { radius: config.radius }, true // Release shadowTarget
        );
        // Step 3: Composite source with inner shadow on top (masked by source alpha)
        const result = this.pool.acquire(source.width, source.height);
        result.bind();
        result.clear();
        const compShader = this.shaders.use('innerShadowComposite');
        source.bindTexture(0);
        blurredShadow.bindTexture(1);
        gl.uniform1i(compShader.uniforms.get('uSource'), 0);
        gl.uniform1i(compShader.uniforms.get('uShadow'), 1);
        this.drawQuad();
        // Cleanup
        this.pool.release(blurredShadow);
        if (releaseSource) {
            this.pool.release(source);
        }
        return result;
    }
    /**
     * Render just the inner shadow mask (without compositing with source).
     * Useful for custom compositing or previewing.
     */
    renderShadowOnly(source, config) {
        const gl = this.ctx.gl;
        // Create inverted shadow silhouette
        const shadowTarget = this.pool.acquire(source.width, source.height);
        shadowTarget.bind();
        shadowTarget.clear();
        const innerShadowShader = this.shaders.use('innerShadow');
        source.bindTexture(0);
        gl.uniform1i(innerShadowShader.uniforms.get('uTexture'), 0);
        gl.uniform2f(innerShadowShader.uniforms.get('uOffset'), config.offset.x / source.width, config.offset.y / source.height);
        gl.uniform4f(innerShadowShader.uniforms.get('uColor'), config.color.r, config.color.g, config.color.b, config.color.a);
        gl.uniform1f(innerShadowShader.uniforms.get('uSpread'), config.spread);
        this.drawQuad();
        // Blur the shadow
        const { target: blurredShadow } = this.blurRenderer.apply(shadowTarget, { radius: config.radius }, true);
        return blurredShadow;
    }
    /**
     * Apply multiple inner shadows (stacked).
     */
    applyMultiple(source, configs, releaseSource = true) {
        if (configs.length === 0) {
            return source;
        }
        let current = source;
        let isFirst = true;
        for (const config of configs) {
            const shouldRelease = isFirst ? releaseSource : true;
            current = this.apply(current, config, shouldRelease);
            isFirst = false;
        }
        return current;
    }
    /**
     * Calculate the padding needed for an inner shadow effect.
     * Note: Inner shadows don't expand beyond the element, but blur
     * may need padding for proper edge rendering.
     */
    static calculatePadding(config) {
        // Inner shadows are contained within the element,
        // but we need some padding for blur quality at edges
        return Math.ceil(config.radius * 0.5);
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
        this.blurRenderer.dispose();
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
/**
 * Create an inner shadow effect renderer.
 */
export function createInnerShadowEffectRenderer(ctx, shaders, pool, options) {
    return new InnerShadowEffectRenderer(ctx, shaders, pool, options);
}
//# sourceMappingURL=inner-shadow-effect.js.map