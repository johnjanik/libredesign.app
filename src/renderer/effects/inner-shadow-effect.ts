/**
 * Inner Shadow Effect
 *
 * Renders an inner shadow inside an element by:
 * 1. Creating an inverted offset silhouette (shape minus offset shape)
 * 2. Applying blur to the shadow
 * 3. Masking by the original shape's alpha
 * 4. Compositing on top of the original
 */

import type { RGBA } from '@core/types/color';
import type { Point } from '@core/types/geometry';
import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { RenderTarget } from './render-target';
import type { RenderTargetPool } from './render-target-pool';
import { BlurEffectRenderer } from './blur-effect';

/**
 * Inner shadow configuration
 */
export interface InnerShadowConfig {
  /** Shadow color with alpha */
  readonly color: RGBA;
  /** Shadow offset in pixels (direction shadow comes from) */
  readonly offset: Point;
  /** Blur radius in pixels */
  readonly radius: number;
  /** Spread amount (positive expands shadow inward) */
  readonly spread: number;
}

/**
 * Inner shadow effect renderer
 */
export class InnerShadowEffectRenderer {
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
   * Apply inner shadow effect to a render target.
   *
   * @param source - The source render target
   * @param config - Shadow configuration
   * @param releaseSource - Whether to release the source to the pool
   * @returns The composited render target (source with inner shadow)
   */
  apply(
    source: RenderTarget,
    config: InnerShadowConfig,
    releaseSource = true
  ): RenderTarget {
    const gl = this.ctx.gl;

    // Step 1: Create inverted shadow silhouette
    // Inner shadow = original alpha * (1 - offset alpha)
    const shadowTarget = this.pool.acquire(source.width, source.height);
    shadowTarget.bind();
    shadowTarget.clear();

    const innerShadowShader = this.shaders.use('innerShadow');
    source.bindTexture(0);
    gl.uniform1i(innerShadowShader.uniforms.get('uTexture')!, 0);
    gl.uniform2f(
      innerShadowShader.uniforms.get('uOffset')!,
      config.offset.x / source.width,
      config.offset.y / source.height
    );
    gl.uniform4f(
      innerShadowShader.uniforms.get('uColor')!,
      config.color.r,
      config.color.g,
      config.color.b,
      config.color.a
    );
    gl.uniform1f(innerShadowShader.uniforms.get('uSpread')!, config.spread);

    this.drawQuad();

    // Step 2: Blur the shadow
    const { target: blurredShadow } = this.blurRenderer.apply(
      shadowTarget,
      { radius: config.radius },
      true // Release shadowTarget
    );

    // Step 3: Composite source with inner shadow on top (masked by source alpha)
    const result = this.pool.acquire(source.width, source.height);
    result.bind();
    result.clear();

    const compShader = this.shaders.use('innerShadowComposite');
    source.bindTexture(0);
    blurredShadow.bindTexture(1);
    gl.uniform1i(compShader.uniforms.get('uSource')!, 0);
    gl.uniform1i(compShader.uniforms.get('uShadow')!, 1);

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
  renderShadowOnly(
    source: RenderTarget,
    config: InnerShadowConfig
  ): RenderTarget {
    const gl = this.ctx.gl;

    // Create inverted shadow silhouette
    const shadowTarget = this.pool.acquire(source.width, source.height);
    shadowTarget.bind();
    shadowTarget.clear();

    const innerShadowShader = this.shaders.use('innerShadow');
    source.bindTexture(0);
    gl.uniform1i(innerShadowShader.uniforms.get('uTexture')!, 0);
    gl.uniform2f(
      innerShadowShader.uniforms.get('uOffset')!,
      config.offset.x / source.width,
      config.offset.y / source.height
    );
    gl.uniform4f(
      innerShadowShader.uniforms.get('uColor')!,
      config.color.r,
      config.color.g,
      config.color.b,
      config.color.a
    );
    gl.uniform1f(innerShadowShader.uniforms.get('uSpread')!, config.spread);

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
   * Apply multiple inner shadows (stacked).
   */
  applyMultiple(
    source: RenderTarget,
    configs: InnerShadowConfig[],
    releaseSource = true
  ): RenderTarget {
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
  static calculatePadding(config: InnerShadowConfig): number {
    // Inner shadows are contained within the element,
    // but we need some padding for blur quality at edges
    return Math.ceil(config.radius * 0.5);
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
 * Create an inner shadow effect renderer.
 */
export function createInnerShadowEffectRenderer(
  ctx: WebGLContext,
  shaders: ShaderManager,
  pool: RenderTargetPool,
  options?: { maxBlurRadius?: number }
): InnerShadowEffectRenderer {
  return new InnerShadowEffectRenderer(ctx, shaders, pool, options);
}
