/**
 * Image Renderer
 *
 * Renders image fills for vector shapes.
 * Supports various scale modes: FILL, FIT, CROP, TILE.
 */

import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager, ShaderProgram } from '../shaders/shader-manager';
import type { TextureEntry } from '../textures/texture-manager';
import type { Matrix2x3 } from '@core/types/geometry';
import type { ImageScaleMode } from '@core/types/paint';

/**
 * Image rendering configuration
 */
export interface ImageRenderConfig {
  /** The texture to render */
  readonly texture: TextureEntry;
  /** Scale mode for image fitting */
  readonly scaleMode: ImageScaleMode;
  /** Image transform matrix */
  readonly transform?: Matrix2x3;
  /** Overall opacity (0-1) */
  readonly opacity?: number;
  /** Target bounds (x, y, width, height) */
  readonly bounds: readonly [number, number, number, number];
}

/**
 * UV calculation result
 */
interface UVBounds {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Identity matrix
 */
const IDENTITY_MATRIX: Matrix2x3 = [1, 0, 0, 1, 0, 0];

/**
 * Image renderer for WebGL
 */
export class ImageRenderer {
  private ctx: WebGLContext;
  private shaders: ShaderManager;
  private quadVAO: WebGLVertexArrayObject | null = null;
  private quadVBO: WebGLBuffer | null = null;
  private disposed = false;

  constructor(ctx: WebGLContext, shaders: ShaderManager) {
    this.ctx = ctx;
    this.shaders = shaders;
    this.initQuad();
  }

  /**
   * Render an image fill
   */
  render(config: ImageRenderConfig): void {
    this.checkDisposed();

    const {
      texture,
      scaleMode,
      transform = IDENTITY_MATRIX,
      opacity = 1,
      bounds,
    } = config;

    const gl = this.ctx.gl;
    const program = this.shaders.use('image');
    if (!program) {
      console.warn('Image shader not available');
      return;
    }

    // Calculate UV coordinates based on scale mode
    const uvBounds = this.calculateUVBounds(
      bounds[2],
      bounds[3],
      texture.width,
      texture.height,
      scaleMode
    );

    // Update quad vertices with bounds and UVs
    this.updateQuad(bounds, uvBounds);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture.texture);

    // Set uniforms
    this.setUniforms(program, transform, opacity, scaleMode === 'TILE');

    // Draw
    gl.bindVertexArray(this.quadVAO);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  /**
   * Render an image with custom UV coordinates
   */
  renderWithUV(
    texture: TextureEntry,
    bounds: readonly [number, number, number, number],
    uvBounds: readonly [number, number, number, number],
    transform: Matrix2x3 = IDENTITY_MATRIX,
    opacity: number = 1
  ): void {
    this.checkDisposed();

    const gl = this.ctx.gl;
    const program = this.shaders.use('image');
    if (!program) return;

    const customUV: UVBounds = {
      u0: uvBounds[0],
      v0: uvBounds[1],
      u1: uvBounds[2],
      v1: uvBounds[3],
      scaleX: 1,
      scaleY: 1,
    };

    this.updateQuad(bounds, customUV);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture.texture);

    this.setUniforms(program, transform, opacity, false);

    gl.bindVertexArray(this.quadVAO);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.disposed) return;

    const gl = this.ctx.gl;

    if (this.quadVBO) {
      gl.deleteBuffer(this.quadVBO);
      this.quadVBO = null;
    }

    if (this.quadVAO) {
      gl.deleteVertexArray(this.quadVAO);
      this.quadVAO = null;
    }

    this.disposed = true;
  }

  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('ImageRenderer has been disposed');
    }
  }

  private initQuad(): void {
    const gl = this.ctx.gl;

    this.quadVAO = gl.createVertexArray();
    if (!this.quadVAO) {
      throw new Error('Failed to create VAO');
    }

    this.quadVBO = gl.createBuffer();
    if (!this.quadVBO) {
      throw new Error('Failed to create VBO');
    }

    gl.bindVertexArray(this.quadVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);

    // Allocate space for 4 vertices (x, y, u, v) = 16 floats
    gl.bufferData(gl.ARRAY_BUFFER, 16 * 4, gl.DYNAMIC_DRAW);

    // Position attribute (location 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

    // UV attribute (location 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private updateQuad(
    bounds: readonly [number, number, number, number],
    uv: UVBounds
  ): void {
    const gl = this.ctx.gl;
    const [x, y, w, h] = bounds;

    // Vertices in triangle strip order: TL, TR, BL, BR
    // prettier-ignore
    const vertices = new Float32Array([
      x,     y,     uv.u0, uv.v0,  // Top-left
      x + w, y,     uv.u1, uv.v0,  // Top-right
      x,     y + h, uv.u0, uv.v1,  // Bottom-left
      x + w, y + h, uv.u1, uv.v1,  // Bottom-right
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private calculateUVBounds(
    boundsWidth: number,
    boundsHeight: number,
    imageWidth: number,
    imageHeight: number,
    scaleMode: ImageScaleMode
  ): UVBounds {
    const boundsAspect = boundsWidth / boundsHeight;
    const imageAspect = imageWidth / imageHeight;

    switch (scaleMode) {
      case 'FILL': {
        // Stretch image to fill bounds (1:1 UV mapping)
        return {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          scaleX: 1,
          scaleY: 1,
        };
      }

      case 'FIT': {
        // Fit image inside bounds, preserving aspect ratio
        // Center the image with letterboxing/pillarboxing
        if (boundsAspect > imageAspect) {
          // Bounds wider than image, pillarbox
          const scale = imageAspect / boundsAspect;
          const offset = (1 - scale) / 2;
          return {
            u0: -offset / scale,
            v0: 0,
            u1: 1 + offset / scale,
            v1: 1,
            scaleX: scale,
            scaleY: 1,
          };
        } else {
          // Bounds taller than image, letterbox
          const scale = boundsAspect / imageAspect;
          const offset = (1 - scale) / 2;
          return {
            u0: 0,
            v0: -offset / scale,
            u1: 1,
            v1: 1 + offset / scale,
            scaleX: 1,
            scaleY: scale,
          };
        }
      }

      case 'CROP': {
        // Crop image to fill bounds, preserving aspect ratio
        // Center the image and crop overflow
        if (boundsAspect > imageAspect) {
          // Bounds wider, crop top/bottom
          const scale = boundsAspect / imageAspect;
          const offset = (scale - 1) / 2 / scale;
          return {
            u0: 0,
            v0: offset,
            u1: 1,
            v1: 1 - offset,
            scaleX: 1,
            scaleY: 1,
          };
        } else {
          // Bounds taller, crop left/right
          const scale = imageAspect / boundsAspect;
          const offset = (scale - 1) / 2 / scale;
          return {
            u0: offset,
            v0: 0,
            u1: 1 - offset,
            v1: 1,
            scaleX: 1,
            scaleY: 1,
          };
        }
      }

      case 'TILE': {
        // Tile the image to fill bounds
        const tilesX = boundsWidth / imageWidth;
        const tilesY = boundsHeight / imageHeight;
        return {
          u0: 0,
          v0: 0,
          u1: tilesX,
          v1: tilesY,
          scaleX: tilesX,
          scaleY: tilesY,
        };
      }

      default:
        return {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          scaleX: 1,
          scaleY: 1,
        };
    }
  }

  private setUniforms(
    program: ShaderProgram,
    transform: Matrix2x3,
    opacity: number,
    tiling: boolean
  ): void {
    const gl = this.ctx.gl;

    // Texture sampler
    const uTexture = program.uniforms.get('uTexture');
    if (uTexture !== undefined) {
      gl.uniform1i(uTexture, 0);
    }

    // Opacity
    const uOpacity = program.uniforms.get('uOpacity');
    if (uOpacity !== undefined) {
      gl.uniform1f(uOpacity, opacity);
    }

    // Transform matrix
    const uTransform = program.uniforms.get('uTransform');
    if (uTransform !== undefined) {
      // Convert to 3x3 matrix for shader
      gl.uniformMatrix3fv(
        uTransform,
        false,
        new Float32Array([
          transform[0],
          transform[1],
          0,
          transform[2],
          transform[3],
          0,
          transform[4],
          transform[5],
          1,
        ])
      );
    }

    // Tiling flag (for wrap mode)
    const uTiling = program.uniforms.get('uTiling');
    if (uTiling !== undefined) {
      gl.uniform1i(uTiling, tiling ? 1 : 0);
    }
  }
}

/**
 * Create an image renderer
 */
export function createImageRenderer(
  ctx: WebGLContext,
  shaders: ShaderManager
): ImageRenderer {
  return new ImageRenderer(ctx, shaders);
}
