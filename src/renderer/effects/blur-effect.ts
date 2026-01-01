/**
 * Blur Effect
 *
 * Implements a two-pass separable Gaussian blur.
 * Uses a 9-tap kernel for quality blur with minimal texture samples.
 */

import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { RenderTarget } from './render-target';
import type { RenderTargetPool } from './render-target-pool';

/**
 * Blur effect configuration
 */
export interface BlurEffectConfig {
  /** Blur radius in pixels */
  readonly radius: number;
  /** Number of blur passes (more = smoother but slower) */
  readonly passes?: number;
  /** Maximum allowed radius */
  readonly maxRadius?: number;
}

/**
 * Blur effect result
 */
export interface BlurResult {
  /** The blurred render target */
  readonly target: RenderTarget;
  /** Whether the source was consumed (released to pool) */
  readonly sourceConsumed: boolean;
}

/**
 * Gaussian blur effect renderer
 */
export class BlurEffectRenderer {
  private ctx: WebGLContext;
  private shaders: ShaderManager;
  private pool: RenderTargetPool;
  private maxRadius: number;

  // Quad resources (shared with pipeline typically)
  private quadVAO: WebGLVertexArrayObject | null = null;
  private quadVBO: WebGLBuffer | null = null;
  private quadTexCoordVBO: WebGLBuffer | null = null;
  private ownsQuad = false;

  constructor(
    ctx: WebGLContext,
    shaders: ShaderManager,
    pool: RenderTargetPool,
    options: { maxRadius?: number; quadVAO?: WebGLVertexArrayObject } = {}
  ) {
    this.ctx = ctx;
    this.shaders = shaders;
    this.pool = pool;
    this.maxRadius = options.maxRadius ?? 64;

    if (options.quadVAO) {
      this.quadVAO = options.quadVAO;
    } else {
      this.setupQuad();
      this.ownsQuad = true;
    }
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
   * Apply Gaussian blur to a render target.
   *
   * @param source - The source render target to blur
   * @param config - Blur configuration
   * @param releaseSource - Whether to release the source target to the pool
   * @returns The blurred render target
   */
  apply(
    source: RenderTarget,
    config: BlurEffectConfig,
    releaseSource = true
  ): BlurResult {
    const radius = Math.min(config.radius, this.maxRadius);
    const passes = config.passes ?? 2;

    // No blur needed
    if (radius <= 0 || passes <= 0) {
      return { target: source, sourceConsumed: false };
    }

    const gl = this.ctx.gl;
    let current = source;
    let sourceWasReleased = false;

    // Two-pass separable Gaussian blur (horizontal + vertical)
    for (let pass = 0; pass < passes; pass++) {
      const actualRadius = radius / passes;

      // === Horizontal pass ===
      const hTarget = this.pool.acquire(current.width, current.height);
      hTarget.bind();
      hTarget.clear();

      const hShader = this.shaders.use('blur');
      current.bindTexture(0);
      gl.uniform1i(hShader.uniforms.get('uTexture')!, 0);
      gl.uniform2f(hShader.uniforms.get('uDirection')!, 1 / current.width, 0);
      gl.uniform1f(hShader.uniforms.get('uRadius')!, actualRadius);

      this.drawQuad();

      // Release previous target if not the original source
      if (current !== source) {
        this.pool.release(current);
      } else if (releaseSource) {
        this.pool.release(source);
        sourceWasReleased = true;
      }

      // === Vertical pass ===
      const vTarget = this.pool.acquire(hTarget.width, hTarget.height);
      vTarget.bind();
      vTarget.clear();

      const vShader = this.shaders.use('blur');
      hTarget.bindTexture(0);
      gl.uniform1i(vShader.uniforms.get('uTexture')!, 0);
      gl.uniform2f(vShader.uniforms.get('uDirection')!, 0, 1 / hTarget.height);
      gl.uniform1f(vShader.uniforms.get('uRadius')!, actualRadius);

      this.drawQuad();

      this.pool.release(hTarget);
      current = vTarget;
    }

    return {
      target: current,
      sourceConsumed: sourceWasReleased,
    };
  }

  /**
   * Apply blur with a specific kernel size.
   * Adjusts passes automatically based on radius.
   */
  applyAdaptive(
    source: RenderTarget,
    radius: number,
    releaseSource = true
  ): BlurResult {
    // Use more passes for larger radii
    const passes = radius > 32 ? 3 : radius > 16 ? 2 : 1;

    return this.apply(source, { radius, passes }, releaseSource);
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
 * Create a blur effect renderer.
 */
export function createBlurEffectRenderer(
  ctx: WebGLContext,
  shaders: ShaderManager,
  pool: RenderTargetPool,
  options?: { maxRadius?: number; quadVAO?: WebGLVertexArrayObject }
): BlurEffectRenderer {
  return new BlurEffectRenderer(ctx, shaders, pool, options);
}
