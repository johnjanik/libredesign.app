/**
 * Mask Renderer
 *
 * Renders content with alpha masking using framebuffers.
 * Alternative to stencil clipping that supports soft edges and gradient masks.
 */

import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager, ShaderProgram } from '../shaders/shader-manager';
import type { RenderTarget } from '../effects/render-target';
import type { RenderTargetPool } from '../effects/render-target-pool';
import type { Matrix2x3 } from '@core/types/geometry';

/**
 * Mask type
 */
export type MaskType = 'alpha' | 'luminance' | 'inverse-alpha' | 'inverse-luminance';

/**
 * Mask configuration
 */
export interface MaskConfig {
  /** Mask type */
  readonly type?: MaskType;
  /** Expand mask by this amount (pixels) */
  readonly expand?: number;
  /** Feather edge (blur radius) */
  readonly feather?: number;
  /** Mask opacity */
  readonly opacity?: number;
}

const DEFAULT_CONFIG: Required<MaskConfig> = {
  type: 'alpha',
  expand: 0,
  feather: 0,
  opacity: 1,
};

/**
 * Mask layer data
 */
interface MaskLayer {
  maskTarget: RenderTarget;
  contentTarget: RenderTarget;
  config: Required<MaskConfig>;
  previousTarget: WebGLFramebuffer | null;
}

/**
 * Mask renderer for alpha-based clipping
 */
export class MaskRenderer {
  private ctx: WebGLContext;
  private shaders: ShaderManager;
  private pool: RenderTargetPool;

  // Mask stack for nested masks
  private maskStack: MaskLayer[] = [];

  // Full-screen quad for compositing
  private quadVAO: WebGLVertexArrayObject | null = null;
  private quadVBO: WebGLBuffer | null = null;

  constructor(
    ctx: WebGLContext,
    shaders: ShaderManager,
    pool: RenderTargetPool
  ) {
    this.ctx = ctx;
    this.shaders = shaders;
    this.pool = pool;
    this.setupQuad();
  }

  /**
   * Set up full-screen quad for compositing.
   */
  private setupQuad(): void {
    const gl = this.ctx.gl;

    this.quadVAO = this.ctx.createVertexArray();
    this.quadVBO = this.ctx.createBuffer();

    this.ctx.bindVertexArray(this.quadVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);

    // Full-screen quad vertices (position + uv)
    const vertices = new Float32Array([
      // x, y, u, v
      -1, -1, 0, 0,
       1, -1, 1, 0,
       1,  1, 1, 1,
      -1, -1, 0, 0,
       1,  1, 1, 1,
      -1,  1, 0, 1,
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Position attribute (location 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

    // UV attribute (location 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    this.ctx.bindVertexArray(null);
  }

  /**
   * Begin a mask operation.
   * Content rendered after this call will be used as the mask.
   */
  beginMask(config: MaskConfig = {}): void {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    const gl = this.ctx.gl;

    // Get render targets from pool
    const size = this.ctx.getCanvasSize();
    const maskTarget = this.pool.acquire(size.width, size.height);
    const contentTarget = this.pool.acquire(size.width, size.height);

    // Store current framebuffer
    const previousTarget = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;

    // Push mask layer
    this.maskStack.push({
      maskTarget,
      contentTarget,
      config: fullConfig,
      previousTarget,
    });

    // Bind mask target and clear
    maskTarget.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * End mask definition and start rendering masked content.
   * Content rendered after this call will be masked.
   */
  endMaskBeginContent(): void {
    if (this.maskStack.length === 0) {
      console.warn('No mask layer to end');
      return;
    }

    const layer = this.maskStack[this.maskStack.length - 1]!;
    const gl = this.ctx.gl;

    // Apply feather to mask if needed
    if (layer.config.feather > 0) {
      this.applyFeather(layer.maskTarget, layer.config.feather);
    }

    // Switch to content target
    layer.contentTarget.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * End masked content and composite result.
   */
  endMask(): RenderTarget | null {
    if (this.maskStack.length === 0) {
      console.warn('No mask layer to end');
      return null;
    }

    const layer = this.maskStack.pop()!;
    const gl = this.ctx.gl;

    // Create output target
    const outputTarget = this.pool.acquire(layer.contentTarget.width, layer.contentTarget.height);
    outputTarget.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Composite content with mask
    this.compositeMasked(
      layer.contentTarget,
      layer.maskTarget,
      layer.config
    );

    // Release temporary targets
    this.pool.release(layer.maskTarget);
    this.pool.release(layer.contentTarget);

    // Restore previous framebuffer
    if (layer.previousTarget) {
      this.ctx.bindFramebuffer(layer.previousTarget);
    } else {
      this.ctx.bindFramebuffer(null);
    }

    return outputTarget;
  }

  /**
   * Apply mask to content and render to current target.
   */
  applyMask(
    content: RenderTarget,
    mask: RenderTarget,
    config: MaskConfig = {}
  ): void {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    this.compositeMasked(content, mask, fullConfig);
  }

  /**
   * Render content masked by a shape.
   */
  renderMaskedShape(
    content: RenderTarget,
    shapeVertices: Float32Array,
    shapeIndices: Uint16Array,
    transform: Matrix2x3,
    viewProjection: Matrix2x3,
    config: MaskConfig = {}
  ): RenderTarget {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    const gl = this.ctx.gl;

    // Render shape to mask texture
    const maskTarget = this.pool.acquire(content.width, content.height);
    maskTarget.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw shape as white on transparent
    const shader = this.shaders.use('fill');
    this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
    this.setMatrixUniform(shader, 'uTransform', transform);
    gl.uniform4f(shader.uniforms.get('uColor')!, 1, 1, 1, 1);
    gl.uniform1f(shader.uniforms.get('uOpacity')!, 1);

    // Create temporary VAO for shape
    const shapeVAO = this.ctx.createVertexArray();
    const shapeVBO = this.ctx.createBuffer();
    const shapeIBO = this.ctx.createBuffer();

    this.ctx.bindVertexArray(shapeVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeVBO);
    gl.bufferData(gl.ARRAY_BUFFER, shapeVertices, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shapeIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, shapeIndices, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.ctx.drawElements(gl.TRIANGLES, shapeIndices.length, gl.UNSIGNED_SHORT, 0);

    // Clean up shape buffers
    this.ctx.bindVertexArray(null);
    this.ctx.deleteVertexArray(shapeVAO);
    this.ctx.deleteBuffer(shapeVBO);
    this.ctx.deleteBuffer(shapeIBO);

    // Apply feather if needed
    if (fullConfig.feather > 0) {
      this.applyFeather(maskTarget, fullConfig.feather);
    }

    // Composite masked content
    const outputTarget = this.pool.acquire(content.width, content.height);
    outputTarget.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.compositeMasked(content, maskTarget, fullConfig);

    // Release mask target
    this.pool.release(maskTarget);

    return outputTarget;
  }

  /**
   * Composite content with mask.
   */
  private compositeMasked(
    content: RenderTarget,
    mask: RenderTarget,
    config: Required<MaskConfig>
  ): void {
    const gl = this.ctx.gl;
    const shader = this.shaders.use('composite');

    // Bind textures
    content.bindTexture(0);
    mask.bindTexture(1);

    // Set uniforms
    gl.uniform1i(shader.uniforms.get('uSource')!, 0);
    gl.uniform1i(shader.uniforms.get('uMask')!, 1);
    gl.uniform1f(shader.uniforms.get('uOpacity')!, config.opacity);
    gl.uniform1i(shader.uniforms.get('uMaskType')!, this.getMaskTypeValue(config.type));

    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw full-screen quad
    this.ctx.bindVertexArray(this.quadVAO);
    this.ctx.drawArrays(gl.TRIANGLES, 0, 6);
    this.ctx.bindVertexArray(null);
  }

  /**
   * Apply feather (blur) to mask.
   */
  private applyFeather(target: RenderTarget, radius: number): void {
    // Use blur shader for feathering
    const gl = this.ctx.gl;
    const shader = this.shaders.use('blur');

    const tempTarget = this.pool.acquire(target.width, target.height);

    // Horizontal pass
    tempTarget.bind();
    target.bindTexture(0);
    gl.uniform1i(shader.uniforms.get('uSource')!, 0);
    gl.uniform2f(shader.uniforms.get('uDirection')!, radius / target.width, 0);
    gl.uniform1f(shader.uniforms.get('uRadius')!, radius);

    this.ctx.bindVertexArray(this.quadVAO);
    this.ctx.drawArrays(gl.TRIANGLES, 0, 6);

    // Vertical pass
    target.bind();
    tempTarget.bindTexture(0);
    gl.uniform2f(shader.uniforms.get('uDirection')!, 0, radius / target.height);

    this.ctx.drawArrays(gl.TRIANGLES, 0, 6);
    this.ctx.bindVertexArray(null);

    this.pool.release(tempTarget);
  }

  /**
   * Get numeric value for mask type.
   */
  private getMaskTypeValue(type: MaskType): number {
    switch (type) {
      case 'alpha': return 0;
      case 'luminance': return 1;
      case 'inverse-alpha': return 2;
      case 'inverse-luminance': return 3;
      default: return 0;
    }
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
   * Get current mask depth.
   */
  getMaskDepth(): number {
    return this.maskStack.length;
  }

  /**
   * Check if currently inside a mask.
   */
  isMasking(): boolean {
    return this.maskStack.length > 0;
  }

  /**
   * Cancel current mask operation without applying.
   */
  cancelMask(): void {
    if (this.maskStack.length === 0) return;

    const layer = this.maskStack.pop()!;

    // Release targets
    this.pool.release(layer.maskTarget);
    this.pool.release(layer.contentTarget);

    // Restore previous framebuffer
    if (layer.previousTarget) {
      this.ctx.bindFramebuffer(layer.previousTarget);
    } else {
      this.ctx.bindFramebuffer(null);
    }
  }

  /**
   * Clear all mask layers.
   */
  clearAllMasks(): void {
    while (this.maskStack.length > 0) {
      this.cancelMask();
    }
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.clearAllMasks();

    if (this.quadVAO) {
      this.ctx.deleteVertexArray(this.quadVAO);
    }
    if (this.quadVBO) {
      this.ctx.deleteBuffer(this.quadVBO);
    }
  }
}

/**
 * Create a mask renderer.
 */
export function createMaskRenderer(
  ctx: WebGLContext,
  shaders: ShaderManager,
  pool: RenderTargetPool
): MaskRenderer {
  return new MaskRenderer(ctx, shaders, pool);
}
