/**
 * Effect Pipeline
 *
 * Coordinates multi-pass rendering for visual effects (blur, shadows, etc.).
 * Manages render targets and effect application.
 */
import { createRenderTargetPool } from './render-target-pool';
/**
 * Full-screen quad vertices for post-processing
 */
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
/**
 * Effect pipeline for multi-pass rendering
 */
export class EffectPipeline {
    ctx;
    shaders;
    pool;
    maxBlurRadius;
    blurPasses;
    // Full-screen quad resources
    quadVAO = null;
    quadVBO = null;
    quadTexCoordVBO = null;
    // Effect context stack (for nested effects)
    contextStack = [];
    // Canvas size cache
    canvasWidth = 0;
    canvasHeight = 0;
    constructor(ctx, shaders, config = {}) {
        this.ctx = ctx;
        this.shaders = shaders;
        this.pool = createRenderTargetPool(ctx);
        this.maxBlurRadius = config.maxBlurRadius ?? 64;
        this.blurPasses = config.blurPasses ?? 2;
        this.setupQuad();
        this.updateCanvasSize();
    }
    /**
     * Set up full-screen quad for post-processing.
     */
    setupQuad() {
        const gl = this.ctx.gl;
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
     * Update cached canvas size.
     */
    updateCanvasSize() {
        const size = this.ctx.getCanvasSize();
        this.canvasWidth = size.width;
        this.canvasHeight = size.height;
    }
    /**
     * Check if any effects need multi-pass rendering.
     */
    needsMultiPass(effects) {
        return effects.some(e => e.visible);
    }
    /**
     * Begin rendering a node with effects.
     * Returns a render target to draw the node content into.
     */
    beginNodeEffects(nodeId, effects, bounds) {
        // Add padding for blur/shadow expansion
        const padding = this.calculatePadding(effects);
        const paddedWidth = Math.ceil(bounds.width + padding * 2);
        const paddedHeight = Math.ceil(bounds.height + padding * 2);
        // Acquire render target
        const sourceTarget = this.pool.acquire(paddedWidth, paddedHeight);
        sourceTarget.clear();
        // Push context
        this.contextStack.push({
            nodeId,
            effects,
            sourceTarget,
            bounds: {
                x: bounds.x - padding,
                y: bounds.y - padding,
                width: paddedWidth,
                height: paddedHeight,
            },
        });
        return sourceTarget;
    }
    /**
     * End node effects and apply all effects.
     * Returns the final composited render target.
     */
    endNodeEffects() {
        const context = this.contextStack.pop();
        if (!context) {
            throw new Error('No effect context to end');
        }
        let currentTarget = context.sourceTarget;
        // Apply effects in order
        for (const effect of context.effects) {
            if (!effect.visible)
                continue;
            switch (effect.type) {
                case 'BLUR':
                    currentTarget = this.applyBlur(currentTarget, effect);
                    break;
                case 'DROP_SHADOW':
                    currentTarget = this.applyDropShadow(currentTarget, effect, context);
                    break;
                case 'INNER_SHADOW':
                    currentTarget = this.applyInnerShadow(currentTarget, effect, context);
                    break;
                case 'BACKGROUND_BLUR':
                    currentTarget = this.applyBackgroundBlur(currentTarget, effect);
                    break;
            }
        }
        return currentTarget;
    }
    /**
     * Composite a render target onto the main framebuffer.
     */
    compositeToScreen(target, x, y, width, height) {
        const gl = this.ctx.gl;
        // Bind default framebuffer
        this.ctx.bindFramebuffer(null);
        this.ctx.setViewport(0, 0, this.canvasWidth, this.canvasHeight);
        // Use composite shader
        const shader = this.shaders.use('composite');
        // Bind source texture
        target.bindTexture(0);
        gl.uniform1i(shader.uniforms.get('uTexture'), 0);
        // Set destination rectangle
        const destX = (x / this.canvasWidth) * 2 - 1;
        const destY = (y / this.canvasHeight) * 2 - 1;
        const destW = (width / this.canvasWidth) * 2;
        const destH = (height / this.canvasHeight) * 2;
        gl.uniform4f(shader.uniforms.get('uDestRect'), destX, destY, destW, destH);
        // Draw quad
        this.drawQuad();
        // Release the render target back to pool
        this.pool.release(target);
    }
    /**
     * Calculate padding needed for effects.
     */
    calculatePadding(effects) {
        let maxPadding = 0;
        for (const effect of effects) {
            if (!effect.visible)
                continue;
            switch (effect.type) {
                case 'BLUR':
                case 'BACKGROUND_BLUR':
                    maxPadding = Math.max(maxPadding, effect.radius * 2);
                    break;
                case 'DROP_SHADOW':
                case 'INNER_SHADOW':
                    const shadowPadding = effect.radius * 2 + effect.spread +
                        Math.abs(effect.offset.x) + Math.abs(effect.offset.y);
                    maxPadding = Math.max(maxPadding, shadowPadding);
                    break;
            }
        }
        return Math.min(maxPadding, this.maxBlurRadius);
    }
    /**
     * Apply Gaussian blur effect.
     */
    applyBlur(source, effect) {
        const radius = Math.min(effect.radius, this.maxBlurRadius);
        if (radius <= 0)
            return source;
        const gl = this.ctx.gl;
        let current = source;
        // Two-pass separable Gaussian blur
        for (let pass = 0; pass < this.blurPasses; pass++) {
            const actualRadius = radius / this.blurPasses;
            // Horizontal pass
            const hTarget = this.pool.acquire(current.width, current.height);
            hTarget.bind();
            hTarget.clear();
            const hShader = this.shaders.use('blur');
            current.bindTexture(0);
            gl.uniform1i(hShader.uniforms.get('uTexture'), 0);
            gl.uniform2f(hShader.uniforms.get('uDirection'), 1 / current.width, 0);
            gl.uniform1f(hShader.uniforms.get('uRadius'), actualRadius);
            this.drawQuad();
            if (current !== source) {
                this.pool.release(current);
            }
            // Vertical pass
            const vTarget = this.pool.acquire(hTarget.width, hTarget.height);
            vTarget.bind();
            vTarget.clear();
            const vShader = this.shaders.use('blur');
            hTarget.bindTexture(0);
            gl.uniform1i(vShader.uniforms.get('uTexture'), 0);
            gl.uniform2f(vShader.uniforms.get('uDirection'), 0, 1 / hTarget.height);
            gl.uniform1f(vShader.uniforms.get('uRadius'), actualRadius);
            this.drawQuad();
            this.pool.release(hTarget);
            current = vTarget;
        }
        if (source !== current) {
            this.pool.release(source);
        }
        return current;
    }
    /**
     * Apply drop shadow effect.
     */
    applyDropShadow(source, effect, _context) {
        const gl = this.ctx.gl;
        // Create shadow target
        const shadowTarget = this.pool.acquire(source.width, source.height);
        shadowTarget.bind();
        shadowTarget.clear();
        // Render shadow silhouette with offset
        const shadowShader = this.shaders.use('shadow');
        source.bindTexture(0);
        gl.uniform1i(shadowShader.uniforms.get('uTexture'), 0);
        gl.uniform2f(shadowShader.uniforms.get('uOffset'), effect.offset.x / source.width, effect.offset.y / source.height);
        gl.uniform4f(shadowShader.uniforms.get('uColor'), effect.color.r, effect.color.g, effect.color.b, effect.color.a);
        gl.uniform1f(shadowShader.uniforms.get('uSpread'), effect.spread);
        this.drawQuad();
        // Apply blur to shadow
        const blurredShadow = this.applyBlur(shadowTarget, {
            type: 'BLUR',
            visible: true,
            radius: effect.radius
        });
        // Composite shadow behind original
        const result = this.pool.acquire(source.width, source.height);
        result.bind();
        result.clear();
        // Draw shadow first
        const compShader = this.shaders.use('composite');
        blurredShadow.bindTexture(0);
        gl.uniform1i(compShader.uniforms.get('uTexture'), 0);
        gl.uniform4f(compShader.uniforms.get('uDestRect'), -1, -1, 2, 2);
        this.drawQuad();
        // Draw original on top
        source.bindTexture(0);
        gl.uniform1i(compShader.uniforms.get('uTexture'), 0);
        this.drawQuad();
        this.pool.release(blurredShadow);
        this.pool.release(source);
        return result;
    }
    /**
     * Apply inner shadow effect.
     */
    applyInnerShadow(source, effect, _context) {
        const gl = this.ctx.gl;
        // Create inverted shadow target
        const shadowTarget = this.pool.acquire(source.width, source.height);
        shadowTarget.bind();
        shadowTarget.clear();
        // Render inverted shadow silhouette
        const innerShadowShader = this.shaders.use('innerShadow');
        source.bindTexture(0);
        gl.uniform1i(innerShadowShader.uniforms.get('uTexture'), 0);
        gl.uniform2f(innerShadowShader.uniforms.get('uOffset'), effect.offset.x / source.width, effect.offset.y / source.height);
        gl.uniform4f(innerShadowShader.uniforms.get('uColor'), effect.color.r, effect.color.g, effect.color.b, effect.color.a);
        gl.uniform1f(innerShadowShader.uniforms.get('uSpread'), effect.spread);
        this.drawQuad();
        // Apply blur
        const blurredShadow = this.applyBlur(shadowTarget, {
            type: 'BLUR',
            visible: true,
            radius: effect.radius,
        });
        // Composite: original + inner shadow (masked by original alpha)
        const result = this.pool.acquire(source.width, source.height);
        result.bind();
        result.clear();
        const compShader = this.shaders.use('innerShadowComposite');
        source.bindTexture(0);
        blurredShadow.bindTexture(1);
        gl.uniform1i(compShader.uniforms.get('uSource'), 0);
        gl.uniform1i(compShader.uniforms.get('uShadow'), 1);
        this.drawQuad();
        this.pool.release(blurredShadow);
        this.pool.release(source);
        return result;
    }
    /**
     * Apply background blur effect.
     */
    applyBackgroundBlur(source, effect) {
        // Background blur requires access to what's behind the element
        // This is more complex and typically handled during scene rendering
        // For now, we just apply a regular blur
        return this.applyBlur(source, {
            type: 'BLUR',
            visible: true,
            radius: effect.radius,
        });
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
     * Get the render target pool.
     */
    getPool() {
        return this.pool;
    }
    /**
     * Dispose of resources.
     */
    dispose() {
        this.pool.dispose();
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
 * Create an effect pipeline.
 */
export function createEffectPipeline(ctx, shaders, config) {
    return new EffectPipeline(ctx, shaders, config);
}
//# sourceMappingURL=effect-pipeline.js.map