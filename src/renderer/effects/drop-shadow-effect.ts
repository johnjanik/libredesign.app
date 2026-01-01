/**
 * Drop Shadow Effect
 *
 * Renders a drop shadow behind an element by:
 * 1. Creating an offset silhouette from the source alpha
 * 2. Applying spread to expand/contract the shadow
 * 3. Blurring the shadow
 * 4. Colorizing and compositing behind the original
 */

import type { RGBA } from '@core/types/color';
import type { Point } from '@core/types/geometry';
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { RenderTarget } from './render-target';
import type { RenderTargetPool } from './render-target-pool';
import { BlurEffectRenderer } from './blur-effect';

/**
 * Drop shadow configuration
 */
export interface DropShadowConfig {
  /** Shadow color with alpha */
  readonly color: RGBA;
  /** Shadow offset in pixels */
  readonly offset: Point;
  /** Blur radius in pixels */
  readonly radius: number;
  /** Spread amount (positive expands, negative contracts) */
  readonly spread: number;
}

/**
 * Drop shadow effect renderer
 */
export class DropShadowEffectRenderer {
  private ctx: WebGLContext;
  private shaders: ShaderManager;
  private pool: RenderTargetPool;
  private blurRenderer: BlurEffectRenderer;

  // Quad resources
  private quadVAO: WebGLVertexArrayObject | null = null;
  private quadVBO: WebGLBuffer | null = null;
  private quadTexCoordVBO: WebGLBuffer | null = null;

  constructor(
    ctx: WebGLContext,
    shaders: ShaderManager,
    pool: RenderTargetPool,
    options: { maxBlurRadius?: number } = {}
  ) {
    this.ctx = ctx;
    this.shaders = shaders;
    this.pool = pool;

    this.setupQuad();
    this.blurRenderer = new BlurEffectRenderer(ctx, shaders, pool, {
      maxRadius: options.maxBlurRadius ?? 64,
      quadVAO: this.quadVAO!,
    });
  }

  /**
   * Set up full-screen quad for post-processing.
   */
  private setupQuad(): void {
    const gl = this.ctx.gl;

    const QUAD_VERTICES = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
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
   * Apply drop shadow effect to a render target.
   *
   * @param source - The source render target
   * @param config - Shadow configuration
   * @param releaseSource - Whether to release the source to the pool
   * @returns The composited render target (shadow behind source)
   */
  apply(
    source: RenderTarget,
    config: DropShadowConfig,
    releaseSource = true
  ): RenderTarget {
    const gl = this.ctx.gl;

    // Step 1: Create shadow silhouette with offset and color
    const shadowTarget = this.pool.acquire(source.width, source.height);
    shadowTarget.bind();
    shadowTarget.clear();

    const shadowShader = this.shaders.use('shadow');
    source.bindTexture(0);
    gl.uniform1i(shadowShader.uniforms.get('uTexture')!, 0);
    gl.uniform2f(
      shadowShader.uniforms.get('uOffset')!,
      config.offset.x / source.width,
      config.offset.y / source.height
    );
    gl.uniform4f(
      shadowShader.uniforms.get('uColor')!,
      config.color.r,
      config.color.g,
      config.color.b,
      config.color.a
    );
    gl.uniform1f(shadowShader.uniforms.get('uSpread')!, config.spread);

    this.drawQuad();

    // Step 2: Blur the shadow
    const { target: blurredShadow } = this.blurRenderer.apply(
      shadowTarget,
      { radius: config.radius },
      true // Release shadowTarget
    );

    // Step 3: Composite shadow behind source
    const result = this.pool.acquire(source.width, source.height);
    result.bind();
    result.clear();

    // Enable alpha blending for compositing
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw shadow first (behind)
    const compShader = this.shaders.use('composite');
    blurredShadow.bindTexture(0);
    gl.uniform1i(compShader.uniforms.get('uTexture')!, 0);
    gl.uniform4f(compShader.uniforms.get('uDestRect')!, -1, -1, 2, 2);
    this.drawQuad();

    // Draw original on top
    source.bindTexture(0);
    gl.uniform1i(compShader.uniforms.get('uTexture')!, 0);
    this.drawQuad();

    gl.disable(gl.BLEND);

    // Cleanup
    this.pool.release(blurredShadow);
    if (releaseSource) {
      this.pool.release(source);
    }

    return result;
  }

  /**
   * Render just the shadow (without compositing with source).
   * Useful for custom compositing or shadow-only rendering.
   */
  renderShadowOnly(
    source: RenderTarget,
    config: DropShadowConfig
  ): RenderTarget {
    const gl = this.ctx.gl;

    // Create shadow silhouette
    const shadowTarget = this.pool.acquire(source.width, source.height);
    shadowTarget.bind();
    shadowTarget.clear();

    const shadowShader = this.shaders.use('shadow');
    source.bindTexture(0);
    gl.uniform1i(shadowShader.uniforms.get('uTexture')!, 0);
    gl.uniform2f(
      shadowShader.uniforms.get('uOffset')!,
      config.offset.x / source.width,
      config.offset.y / source.height
    );
    gl.uniform4f(
      shadowShader.uniforms.get('uColor')!,
      config.color.r,
      config.color.g,
      config.color.b,
      config.color.a
    );
    gl.uniform1f(shadowShader.uniforms.get('uSpread')!, config.spread);

    this.drawQuad();

    // Blur the shadow
    const { target: blurredShadow } = this.blurRenderer.apply(
      shadowTarget,
      { radius: config.radius },
      true
    );

    return blurredShadow;
  }

  /**
   * Calculate the padding needed for a shadow effect.
   */
  static calculatePadding(config: DropShadowConfig): number {
    return (
      config.radius * 2 +
      Math.abs(config.spread) +
      Math.abs(config.offset.x) +
      Math.abs(config.offset.y)
    );
  }

  /**
   * Draw the full-screen quad.
   */
  private drawQuad(): void {
    this.ctx.bindVertexArray(this.quadVAO);
    this.ctx.drawArrays(this.ctx.gl.TRIANGLE_STRIP, 0, 4);
    this.ctx.bindVertexArray(null);
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
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
 * Create a drop shadow effect renderer.
 */
export function createDropShadowEffectRenderer(
  ctx: WebGLContext,
  shaders: ShaderManager,
  pool: RenderTargetPool,
  options?: { maxBlurRadius?: number }
): DropShadowEffectRenderer {
  return new DropShadowEffectRenderer(ctx, shaders, pool, options);
}
