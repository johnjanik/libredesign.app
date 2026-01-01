/**
 * Noise/Grain Effect
 *
 * Applies film grain or noise effect to render targets.
 * Supports both color and monochrome noise with adjustable intensity.
 */

import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager } from '../shaders/shader-manager';
import type { RenderTarget } from './render-target';
import type { RenderTargetPool } from './render-target-pool';

/**
 * Noise effect configuration
 */
export interface NoiseEffectConfig {
  /** Noise amount (0 to 100) */
  readonly amount: number;
  /** Grain size (1 to 10) */
  readonly size: number;
  /** Whether noise is monochrome */
  readonly monochrome: boolean;
  /** Animation time (for varying noise pattern) */
  readonly time?: number;
}

/**
 * Noise effect result
 */
export interface NoiseEffectResult {
  /** The noisy render target */
  readonly target: RenderTarget;
  /** Whether the source was consumed (released to pool) */
  readonly sourceConsumed: boolean;
}

/**
 * Noise effect renderer
 */
export class NoiseEffectRenderer {
  private ctx: WebGLContext;
  private shaders: ShaderManager;
  private pool: RenderTargetPool;

  // Quad resources
  private quadVAO: WebGLVertexArrayObject | null = null;
  private quadVBO: WebGLBuffer | null = null;
  private quadTexCoordVBO: WebGLBuffer | null = null;
  private ownsQuad = false;

  // Animation state
  private animationTime = 0;

  constructor(
    ctx: WebGLContext,
    shaders: ShaderManager,
    pool: RenderTargetPool,
    options: { quadVAO?: WebGLVertexArrayObject } = {}
  ) {
    this.ctx = ctx;
    this.shaders = shaders;
    this.pool = pool;

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
   * Check if the effect would produce any visible change.
   */
  isNoop(config: NoiseEffectConfig): boolean {
    return config.amount < 0.1;
  }

  /**
   * Update animation time (call once per frame).
   */
  updateTime(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  /**
   * Apply noise effect to a render target.
   *
   * @param source - The source render target
   * @param config - Noise effect configuration
   * @param releaseSource - Whether to release the source target to the pool
   * @returns The noisy render target
   */
  apply(
    source: RenderTarget,
    config: NoiseEffectConfig,
    releaseSource = true
  ): NoiseEffectResult {
    // Skip if no noise needed
    if (this.isNoop(config)) {
      return { target: source, sourceConsumed: false };
    }

    const gl = this.ctx.gl;

    // Acquire output target
    const target = this.pool.acquire(source.width, source.height);
    target.bind();
    target.clear();

    // Use noise shader
    const shader = this.shaders.use('noise');

    // Bind source texture
    source.bindTexture(0);
    gl.uniform1i(shader.uniforms.get('uTexture')!, 0);

    // Set effect uniforms
    gl.uniform1f(shader.uniforms.get('uAmount')!, config.amount);
    gl.uniform1f(shader.uniforms.get('uSize')!, config.size);
    gl.uniform1i(shader.uniforms.get('uMonochrome')!, config.monochrome ? 1 : 0);
    gl.uniform1f(shader.uniforms.get('uTime')!, config.time ?? this.animationTime);
    gl.uniform2f(
      shader.uniforms.get('uResolution')!,
      source.width,
      source.height
    );

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
   * Apply static noise (non-animated).
   */
  applyStatic(
    source: RenderTarget,
    config: Omit<NoiseEffectConfig, 'time'>,
    releaseSource = true
  ): NoiseEffectResult {
    return this.apply(
      source,
      { ...config, time: 0 },
      releaseSource
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
 * Create a noise effect renderer.
 */
export function createNoiseEffectRenderer(
  ctx: WebGLContext,
  shaders: ShaderManager,
  pool: RenderTargetPool,
  options?: { quadVAO?: WebGLVertexArrayObject }
): NoiseEffectRenderer {
  return new NoiseEffectRenderer(ctx, shaders, pool, options);
}
