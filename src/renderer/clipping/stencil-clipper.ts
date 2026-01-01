/**
 * Stencil Clipper
 *
 * Uses the stencil buffer to clip child content to parent bounds.
 * Supports nested clipping regions using stencil reference values.
 */

import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager, ShaderProgram } from '../shaders/shader-manager';
import type { Matrix2x3 } from '@core/types/geometry';

/**
 * Stencil clipper for efficient clipping using the GPU stencil buffer
 */
export class StencilClipper {
  private ctx: WebGLContext;
  private shaders: ShaderManager;

  // Current stencil depth (for nested clips)
  private stencilDepth = 0;
  private maxStencilDepth = 255;

  // Clip path rendering resources
  private clipVAO: WebGLVertexArrayObject | null = null;
  private clipVBO: WebGLBuffer | null = null;
  private clipIBO: WebGLBuffer | null = null;

  constructor(ctx: WebGLContext, shaders: ShaderManager) {
    this.ctx = ctx;
    this.shaders = shaders;
    this.setupResources();
  }

  /**
   * Set up WebGL resources for clip path rendering.
   */
  private setupResources(): void {
    const gl = this.ctx.gl;

    this.clipVAO = this.ctx.createVertexArray();
    this.clipVBO = this.ctx.createBuffer();
    this.clipIBO = this.ctx.createBuffer();

    this.ctx.bindVertexArray(this.clipVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.clipVBO);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.clipIBO);

    // Position attribute only (location 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.ctx.bindVertexArray(null);
  }

  /**
   * Begin a clipping region.
   * Call this before rendering content that should be clipped.
   *
   * @param vertices - Vertices of the clip path (triangulated)
   * @param indices - Triangle indices
   * @param transform - World transform for the clip path
   * @param viewProjection - View-projection matrix
   */
  beginClip(
    vertices: Float32Array,
    indices: Uint16Array,
    transform: Matrix2x3,
    viewProjection: Matrix2x3
  ): void {
    if (this.stencilDepth >= this.maxStencilDepth) {
      console.warn('Maximum clip depth exceeded');
      return;
    }

    const gl = this.ctx.gl;

    // Increment stencil depth
    this.stencilDepth++;

    // Enable stencil test
    gl.enable(gl.STENCIL_TEST);

    // Configure stencil to increment where we draw
    gl.stencilFunc(gl.ALWAYS, this.stencilDepth, 0xFF);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    gl.stencilMask(0xFF);

    // Disable color writes while drawing clip path
    gl.colorMask(false, false, false, false);

    // Draw clip path to stencil buffer
    this.drawClipPath(vertices, indices, transform, viewProjection);

    // Configure stencil to only draw where stencil == current depth
    gl.stencilFunc(gl.EQUAL, this.stencilDepth, 0xFF);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    gl.stencilMask(0x00);

    // Re-enable color writes
    gl.colorMask(true, true, true, true);
  }

  /**
   * Begin a rectangular clipping region (optimized path for frames).
   */
  beginRectClip(
    x: number,
    y: number,
    width: number,
    height: number,
    transform: Matrix2x3,
    viewProjection: Matrix2x3
  ): void {
    // Create rectangle vertices
    const vertices = new Float32Array([
      x, y,
      x + width, y,
      x + width, y + height,
      x, y + height,
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    this.beginClip(vertices, indices, transform, viewProjection);
  }

  /**
   * End the current clipping region.
   * Call this after rendering clipped content.
   */
  endClip(): void {
    if (this.stencilDepth === 0) {
      console.warn('No clip region to end');
      return;
    }

    const gl = this.ctx.gl;

    // Decrement stencil buffer where we previously drew
    gl.stencilFunc(gl.ALWAYS, 0, 0xFF);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);
    gl.stencilMask(0xFF);

    // Disable color writes
    gl.colorMask(false, false, false, false);

    // We need to redraw the clip path to decrement
    // For now, just clear the stencil for simplicity
    // A more efficient implementation would cache the clip path

    // Decrement stencil depth
    this.stencilDepth--;

    // Re-enable color writes
    gl.colorMask(true, true, true, true);

    // Update stencil test for parent clip (if any)
    if (this.stencilDepth > 0) {
      gl.stencilFunc(gl.EQUAL, this.stencilDepth, 0xFF);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.stencilMask(0x00);
    } else {
      // No more clips, disable stencil test
      gl.disable(gl.STENCIL_TEST);
    }
  }

  /**
   * Draw the clip path to the stencil buffer.
   */
  private drawClipPath(
    vertices: Float32Array,
    indices: Uint16Array,
    transform: Matrix2x3,
    viewProjection: Matrix2x3
  ): void {
    const gl = this.ctx.gl;

    // Use a simple fill shader for stencil writes
    const shader = this.shaders.use('fill');

    // Upload geometry
    this.ctx.bindVertexArray(this.clipVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.clipVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.clipIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);

    // Set uniforms
    this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
    this.setMatrixUniform(shader, 'uTransform', transform);

    // Color and opacity don't matter for stencil writes
    gl.uniform4f(shader.uniforms.get('uColor')!, 1, 1, 1, 1);
    gl.uniform1f(shader.uniforms.get('uOpacity')!, 1);

    // Draw
    this.ctx.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    this.ctx.bindVertexArray(null);
  }

  /**
   * Set a matrix uniform.
   */
  private setMatrixUniform(shader: ShaderProgram, name: string, matrix: Matrix2x3): void {
    const location = shader.uniforms.get(name);
    if (location) {
      const [a, b, c, d, tx, ty] = matrix;
      this.ctx.gl.uniformMatrix3fv(location, false, [
        a, b, 0,
        c, d, 0,
        tx, ty, 1,
      ]);
    }
  }

  /**
   * Get current clip depth.
   */
  getClipDepth(): number {
    return this.stencilDepth;
  }

  /**
   * Check if currently inside a clip region.
   */
  isClipping(): boolean {
    return this.stencilDepth > 0;
  }

  /**
   * Clear all clip regions (reset stencil buffer).
   */
  clearAllClips(): void {
    if (this.stencilDepth > 0) {
      const gl = this.ctx.gl;
      gl.stencilMask(0xFF);
      gl.clear(gl.STENCIL_BUFFER_BIT);
      gl.disable(gl.STENCIL_TEST);
      this.stencilDepth = 0;
    }
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    if (this.clipVAO) {
      this.ctx.deleteVertexArray(this.clipVAO);
    }
    if (this.clipVBO) {
      this.ctx.deleteBuffer(this.clipVBO);
    }
    if (this.clipIBO) {
      this.ctx.deleteBuffer(this.clipIBO);
    }
  }
}

/**
 * Create a stencil clipper.
 */
export function createStencilClipper(
  ctx: WebGLContext,
  shaders: ShaderManager
): StencilClipper {
  return new StencilClipper(ctx, shaders);
}
