/**
 * Stencil clipper tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StencilClipper, createStencilClipper } from '@renderer/clipping/stencil-clipper';
import type { WebGLContext } from '@renderer/core/webgl-context';
import type { ShaderManager, ShaderProgram } from '@renderer/shaders/shader-manager';
import type { Matrix2x3 } from '@core/types/geometry';

// Mock WebGL constants
const GL = {
  ALWAYS: 0x0207,
  EQUAL: 0x0202,
  KEEP: 0x1E00,
  INCR: 0x1E02,
  DECR: 0x1E03,
  STENCIL_TEST: 0x0B90,
  STENCIL_BUFFER_BIT: 0x00000400,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  DYNAMIC_DRAW: 0x88E8,
  FLOAT: 0x1406,
  UNSIGNED_SHORT: 0x1403,
  TRIANGLES: 0x0004,
};

// Create mock WebGL2RenderingContext
const createMockGL = () => ({
  ...GL,
  enable: vi.fn(),
  disable: vi.fn(),
  stencilFunc: vi.fn(),
  stencilOp: vi.fn(),
  stencilMask: vi.fn(),
  colorMask: vi.fn(),
  clear: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  uniform4f: vi.fn(),
  uniform1f: vi.fn(),
  uniformMatrix3fv: vi.fn(),
});

// Create mock WebGLContext
const createMockContext = (): WebGLContext => {
  const gl = createMockGL();
  let vaoCounter = 0;
  let bufferCounter = 0;

  return {
    gl: gl as unknown as WebGL2RenderingContext,
    createVertexArray: vi.fn(() => ({ _id: vaoCounter++ } as unknown as WebGLVertexArrayObject)),
    createBuffer: vi.fn(() => ({ _id: bufferCounter++ } as unknown as WebGLBuffer)),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),
    deleteBuffer: vi.fn(),
    drawElements: vi.fn(),
  } as unknown as WebGLContext;
};

// Create mock shader program
const createMockShaderProgram = (): ShaderProgram => ({
  program: {} as WebGLProgram,
  uniforms: new Map([
    ['uViewProjection', {} as WebGLUniformLocation],
    ['uTransform', {} as WebGLUniformLocation],
    ['uColor', {} as WebGLUniformLocation],
    ['uOpacity', {} as WebGLUniformLocation],
  ]),
  attributes: new Map([['aPosition', 0]]),
});

// Create mock ShaderManager
const createMockShaderManager = (): ShaderManager => ({
  use: vi.fn().mockReturnValue(createMockShaderProgram()),
} as unknown as ShaderManager);

// Identity matrix
const IDENTITY: Matrix2x3 = [1, 0, 0, 1, 0, 0];

describe('StencilClipper', () => {
  let ctx: WebGLContext;
  let shaders: ShaderManager;
  let clipper: StencilClipper;

  beforeEach(() => {
    ctx = createMockContext();
    shaders = createMockShaderManager();
    clipper = new StencilClipper(ctx, shaders);
  });

  afterEach(() => {
    clipper.dispose();
  });

  describe('initialization', () => {
    it('creates VAO and buffers', () => {
      expect(ctx.createVertexArray).toHaveBeenCalled();
      expect(ctx.createBuffer).toHaveBeenCalledTimes(2); // VBO + IBO
    });

    it('sets up vertex attributes', () => {
      expect(ctx.gl.enableVertexAttribArray).toHaveBeenCalledWith(0);
      expect(ctx.gl.vertexAttribPointer).toHaveBeenCalledWith(
        0, 2, GL.FLOAT, false, 0, 0
      );
    });

    it('starts with zero clip depth', () => {
      expect(clipper.getClipDepth()).toBe(0);
      expect(clipper.isClipping()).toBe(false);
    });
  });

  describe('beginClip', () => {
    const vertices = new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    it('enables stencil test', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      expect(ctx.gl.enable).toHaveBeenCalledWith(GL.STENCIL_TEST);
    });

    it('increments stencil depth', () => {
      expect(clipper.getClipDepth()).toBe(0);

      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      expect(clipper.getClipDepth()).toBe(1);
      expect(clipper.isClipping()).toBe(true);
    });

    it('configures stencil for writing clip path', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      // Should set stencil to always pass and increment
      expect(ctx.gl.stencilFunc).toHaveBeenCalledWith(GL.ALWAYS, 1, 0xFF);
      expect(ctx.gl.stencilOp).toHaveBeenCalledWith(GL.KEEP, GL.KEEP, GL.INCR);
      expect(ctx.gl.stencilMask).toHaveBeenCalledWith(0xFF);
    });

    it('disables color writes while writing to stencil', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      expect(ctx.gl.colorMask).toHaveBeenCalledWith(false, false, false, false);
    });

    it('re-enables color writes after stencil write', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      // Last colorMask call should re-enable
      const calls = (ctx.gl.colorMask as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toEqual([true, true, true, true]);
    });

    it('uploads geometry to GPU', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      expect(ctx.gl.bindBuffer).toHaveBeenCalledWith(GL.ARRAY_BUFFER, expect.anything());
      expect(ctx.gl.bufferData).toHaveBeenCalledWith(GL.ARRAY_BUFFER, vertices, GL.DYNAMIC_DRAW);
      expect(ctx.gl.bufferData).toHaveBeenCalledWith(GL.ELEMENT_ARRAY_BUFFER, indices, GL.DYNAMIC_DRAW);
    });

    it('uses fill shader', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      expect(shaders.use).toHaveBeenCalledWith('fill');
    });

    it('sets matrix uniforms', () => {
      const transform: Matrix2x3 = [2, 0, 0, 2, 10, 20];
      const viewProjection: Matrix2x3 = [0.5, 0, 0, 0.5, 0, 0];

      clipper.beginClip(vertices, indices, transform, viewProjection);

      expect(ctx.gl.uniformMatrix3fv).toHaveBeenCalledTimes(2);
    });

    it('draws clip path', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      expect(ctx.drawElements).toHaveBeenCalledWith(
        GL.TRIANGLES,
        indices.length,
        GL.UNSIGNED_SHORT,
        0
      );
    });

    it('configures stencil for content rendering', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      // Should configure to only draw where stencil == depth
      expect(ctx.gl.stencilFunc).toHaveBeenLastCalledWith(GL.EQUAL, 1, 0xFF);
    });

    it('supports nested clips', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      expect(clipper.getClipDepth()).toBe(1);

      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      expect(clipper.getClipDepth()).toBe(2);

      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      expect(clipper.getClipDepth()).toBe(3);
    });

    it('warns when exceeding max depth', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create clipper with low max depth for testing
      for (let i = 0; i < 256; i++) {
        clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      }

      expect(warnSpy).toHaveBeenCalledWith('Maximum clip depth exceeded');

      warnSpy.mockRestore();
    });
  });

  describe('beginRectClip', () => {
    it('creates rectangle vertices', () => {
      clipper.beginRectClip(10, 20, 100, 50, IDENTITY, IDENTITY);

      expect(ctx.gl.bufferData).toHaveBeenCalledWith(
        GL.ARRAY_BUFFER,
        expect.any(Float32Array),
        GL.DYNAMIC_DRAW
      );
    });

    it('creates correct triangle indices', () => {
      clipper.beginRectClip(0, 0, 100, 100, IDENTITY, IDENTITY);

      // Should create two triangles
      const bufferDataCalls = (ctx.gl.bufferData as ReturnType<typeof vi.fn>).mock.calls;
      const indicesCall = bufferDataCalls.find(
        call => call[0] === GL.ELEMENT_ARRAY_BUFFER
      );

      expect(indicesCall).toBeDefined();
      const indices = indicesCall![1] as Uint16Array;
      expect(indices.length).toBe(6); // 2 triangles * 3 vertices
    });

    it('increments clip depth', () => {
      clipper.beginRectClip(0, 0, 100, 100, IDENTITY, IDENTITY);

      expect(clipper.getClipDepth()).toBe(1);
    });

    it('applies transform', () => {
      const transform: Matrix2x3 = [2, 0, 0, 2, 50, 50];

      clipper.beginRectClip(0, 0, 100, 100, transform, IDENTITY);

      expect(ctx.gl.uniformMatrix3fv).toHaveBeenCalled();
    });
  });

  describe('endClip', () => {
    const vertices = new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    it('decrements stencil depth', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      expect(clipper.getClipDepth()).toBe(1);

      clipper.endClip();
      expect(clipper.getClipDepth()).toBe(0);
    });

    it('warns when no clip to end', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      clipper.endClip();

      expect(warnSpy).toHaveBeenCalledWith('No clip region to end');

      warnSpy.mockRestore();
    });

    it('disables stencil test when depth reaches zero', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      clipper.endClip();

      expect(ctx.gl.disable).toHaveBeenCalledWith(GL.STENCIL_TEST);
    });

    it('updates stencil test for parent clip', () => {
      // Create nested clips
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      expect(clipper.getClipDepth()).toBe(2);

      // End inner clip
      clipper.endClip();

      expect(clipper.getClipDepth()).toBe(1);
      // Should restore stencil test for parent
      expect(ctx.gl.stencilFunc).toHaveBeenCalledWith(GL.EQUAL, 1, 0xFF);
    });

    it('disables color writes during stencil update', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      (ctx.gl.colorMask as ReturnType<typeof vi.fn>).mockClear();

      clipper.endClip();

      expect(ctx.gl.colorMask).toHaveBeenCalledWith(false, false, false, false);
    });

    it('re-enables color writes after stencil update', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      clipper.endClip();

      const calls = (ctx.gl.colorMask as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toEqual([true, true, true, true]);
    });

    it('configures stencil to decrement', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      clipper.endClip();

      expect(ctx.gl.stencilOp).toHaveBeenCalledWith(GL.KEEP, GL.KEEP, GL.DECR);
    });
  });

  describe('nested clipping', () => {
    const vertices = new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    it('tracks depth correctly through nested clips', () => {
      expect(clipper.getClipDepth()).toBe(0);

      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      expect(clipper.getClipDepth()).toBe(1);

      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      expect(clipper.getClipDepth()).toBe(2);

      clipper.endClip();
      expect(clipper.getClipDepth()).toBe(1);

      clipper.endClip();
      expect(clipper.getClipDepth()).toBe(0);
    });

    it('uses incrementing stencil values for nested clips', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      // First clip should use stencil value 1
      expect(ctx.gl.stencilFunc).toHaveBeenCalledWith(GL.ALWAYS, 1, 0xFF);

      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      // Second clip should use stencil value 2
      expect(ctx.gl.stencilFunc).toHaveBeenCalledWith(GL.ALWAYS, 2, 0xFF);
    });

    it('correctly restores parent clip stencil value', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      // Depth is now 3

      clipper.endClip();
      expect(ctx.gl.stencilFunc).toHaveBeenCalledWith(GL.EQUAL, 2, 0xFF);

      clipper.endClip();
      expect(ctx.gl.stencilFunc).toHaveBeenCalledWith(GL.EQUAL, 1, 0xFF);
    });
  });

  describe('getClipDepth', () => {
    const vertices = new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    it('returns current clip depth', () => {
      expect(clipper.getClipDepth()).toBe(0);

      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      expect(clipper.getClipDepth()).toBe(1);
    });
  });

  describe('isClipping', () => {
    const vertices = new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    it('returns false when not clipping', () => {
      expect(clipper.isClipping()).toBe(false);
    });

    it('returns true when clipping', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      expect(clipper.isClipping()).toBe(true);
    });

    it('returns false after all clips ended', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      clipper.endClip();

      expect(clipper.isClipping()).toBe(false);
    });
  });

  describe('clearAllClips', () => {
    const vertices = new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    it('clears stencil buffer', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      clipper.clearAllClips();

      expect(ctx.gl.clear).toHaveBeenCalledWith(GL.STENCIL_BUFFER_BIT);
    });

    it('resets clip depth to zero', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);
      expect(clipper.getClipDepth()).toBe(2);

      clipper.clearAllClips();

      expect(clipper.getClipDepth()).toBe(0);
    });

    it('disables stencil test', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      clipper.clearAllClips();

      expect(ctx.gl.disable).toHaveBeenCalledWith(GL.STENCIL_TEST);
    });

    it('does nothing when not clipping', () => {
      (ctx.gl.clear as ReturnType<typeof vi.fn>).mockClear();

      clipper.clearAllClips();

      expect(ctx.gl.clear).not.toHaveBeenCalled();
    });

    it('sets stencil mask before clearing', () => {
      clipper.beginClip(vertices, indices, IDENTITY, IDENTITY);

      clipper.clearAllClips();

      expect(ctx.gl.stencilMask).toHaveBeenCalledWith(0xFF);
    });
  });

  describe('dispose', () => {
    it('deletes VAO', () => {
      clipper.dispose();

      expect(ctx.deleteVertexArray).toHaveBeenCalled();
    });

    it('deletes buffers', () => {
      clipper.dispose();

      expect(ctx.deleteBuffer).toHaveBeenCalledTimes(2); // VBO + IBO
    });
  });

  describe('matrix transformation', () => {
    const vertices = new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    it('passes transform matrix to shader', () => {
      const transform: Matrix2x3 = [2, 0.5, -0.5, 2, 100, 200];

      clipper.beginClip(vertices, indices, transform, IDENTITY);

      expect(ctx.gl.uniformMatrix3fv).toHaveBeenCalled();
    });

    it('passes view projection matrix to shader', () => {
      const viewProjection: Matrix2x3 = [0.002, 0, 0, -0.002, -1, 1];

      clipper.beginClip(vertices, indices, IDENTITY, viewProjection);

      expect(ctx.gl.uniformMatrix3fv).toHaveBeenCalled();
    });

    it('converts Matrix2x3 to 3x3 matrix for WebGL', () => {
      const transform: Matrix2x3 = [1, 2, 3, 4, 5, 6];

      clipper.beginClip(vertices, indices, transform, IDENTITY);

      // Check the matrix conversion
      const matrixCalls = (ctx.gl.uniformMatrix3fv as ReturnType<typeof vi.fn>).mock.calls;
      const transformCall = matrixCalls.find(
        call => JSON.stringify(call[2]).includes('5') && JSON.stringify(call[2]).includes('6')
      );

      expect(transformCall).toBeDefined();
      // Matrix2x3 [a,b,c,d,tx,ty] becomes 3x3 [a,b,0,c,d,0,tx,ty,1]
      expect(transformCall![2]).toEqual([1, 2, 0, 3, 4, 0, 5, 6, 1]);
    });
  });
});

describe('createStencilClipper', () => {
  it('creates a stencil clipper instance', () => {
    const ctx = createMockContext();
    const shaders = createMockShaderManager();

    const clipper = createStencilClipper(ctx, shaders);

    expect(clipper).toBeInstanceOf(StencilClipper);
    expect(clipper.getClipDepth()).toBe(0);

    clipper.dispose();
  });
});
