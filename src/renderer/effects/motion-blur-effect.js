/**
 * Motion Blur Effect
 *
 * Applies directional motion blur along a specified angle.
 * Supports both standard and high-quality rendering modes.
 */
/**
 * Motion blur effect renderer
 */
export class MotionBlurEffectRenderer {
    ctx;
    shaders;
    pool;
    // Maximum allowed blur distance
    maxDistance;
    // Quad resources
    quadVAO = null;
    quadVBO = null;
    quadTexCoordVBO = null;
    ownsQuad = false;
    constructor(ctx, shaders, pool, options = {}) {
        this.ctx = ctx;
        this.shaders = shaders;
        this.pool = pool;
        this.maxDistance = options.maxDistance ?? 100;
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
        return config.distance < 0.5;
    }
    /**
     * Convert degrees to radians.
     */
    degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * Apply motion blur to a render target.
     *
     * @param source - The source render target
     * @param config - Motion blur configuration
     * @param releaseSource - Whether to release the source target to the pool
     * @returns The blurred render target
     */
    apply(source, config, releaseSource = true) {
        // Skip if no blur needed
        if (this.isNoop(config)) {
            return { target: source, sourceConsumed: false };
        }
        const gl = this.ctx.gl;
        const distance = Math.min(config.distance, this.maxDistance);
        const angleRadians = this.degreesToRadians(config.angle);
        // Acquire output target
        const target = this.pool.acquire(source.width, source.height);
        target.bind();
        target.clear();
        // Use motion blur shader (HQ or standard)
        const shaderName = config.highQuality ? 'motionBlurHQ' : 'motionBlur';
        const shader = this.shaders.use(shaderName);
        // Bind source texture
        source.bindTexture(0);
        gl.uniform1i(shader.uniforms.get('uTexture'), 0);
        // Set effect uniforms
        gl.uniform1f(shader.uniforms.get('uAngle'), angleRadians);
        gl.uniform1f(shader.uniforms.get('uDistance'), distance);
        gl.uniform2f(shader.uniforms.get('uResolution'), source.width, source.height);
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
     * Apply motion blur based on velocity vector.
     *
     * @param source - The source render target
     * @param velocityX - Velocity in X direction (pixels)
     * @param velocityY - Velocity in Y direction (pixels)
     * @param releaseSource - Whether to release the source target to the pool
     * @returns The blurred render target
     */
    applyFromVelocity(source, velocityX, velocityY, releaseSource = true) {
        // Calculate angle and distance from velocity
        const distance = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        const angle = Math.atan2(velocityY, velocityX) * (180 / Math.PI);
        return this.apply(source, { angle, distance }, releaseSource);
    }
    /**
     * Apply motion blur in multiple passes for larger distances.
     * Produces higher quality at the cost of performance.
     */
    applyMultiPass(source, config, passes = 2, releaseSource = true) {
        if (this.isNoop(config)) {
            return { target: source, sourceConsumed: false };
        }
        const distancePerPass = config.distance / passes;
        let current = source;
        let sourceConsumed = false;
        for (let i = 0; i < passes; i++) {
            const shouldRelease = (i === 0 && releaseSource) || i > 0;
            const result = this.apply(current, { ...config, distance: distancePerPass }, shouldRelease);
            if (result.sourceConsumed && current === source) {
                sourceConsumed = true;
            }
            current = result.target;
        }
        return {
            target: current,
            sourceConsumed,
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
 * Create a motion blur effect renderer.
 */
export function createMotionBlurEffectRenderer(ctx, shaders, pool, options) {
    return new MotionBlurEffectRenderer(ctx, shaders, pool, options);
}
//# sourceMappingURL=motion-blur-effect.js.map