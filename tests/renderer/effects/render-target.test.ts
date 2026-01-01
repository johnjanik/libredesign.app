/**
 * Render target tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderTarget, createRenderTarget, createCanvasSizedRenderTarget } from '@renderer/effects/render-target';
import type { WebGLContext } from '@renderer/core/webgl-context';

// Mock WebGL constants
const GL = {
  TEXTURE_2D: 0x0DE1,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_MAG_FILTER: 0x2800,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  LINEAR: 0x2601,
  NEAREST: 0x2600,
  CLAMP_TO_EDGE: 0x812F,
  RGBA8: 0x8058,
  FRAMEBUFFER: 0x8D40,
  COLOR_ATTACHMENT0: 0x8CE0,
  FRAMEBUFFER_COMPLETE: 0x8CD5,
  COLOR_BUFFER_BIT: 0x4000,
  TEXTURE0: 0x84C0,
};

// Create mock WebGL2RenderingContext
const createMockGL = () => ({
  ...GL,
  texParameteri: vi.fn(),
  texStorage2D: vi.fn(),
  framebufferTexture2D: vi.fn(),
  checkFramebufferStatus: vi.fn().mockReturnValue(GL.FRAMEBUFFER_COMPLETE),
  clearColor: vi.fn(),
  clear: vi.fn(),
});

// Create mock WebGLContext
const createMockContext = (): WebGLContext => {
  const gl = createMockGL();
  const framebuffers: object[] = [];
  const textures: object[] = [];

  return {
    gl: gl as unknown as WebGL2RenderingContext,
    createFramebuffer: vi.fn(() => {
      const fb = { _id: framebuffers.length };
      framebuffers.push(fb);
      return fb as unknown as WebGLFramebuffer;
    }),
    createTexture: vi.fn(() => {
      const tex = { _id: textures.length };
      textures.push(tex);
      return tex as unknown as WebGLTexture;
    }),
    bindTexture: vi.fn(),
    bindFramebuffer: vi.fn(),
    setViewport: vi.fn(),
    deleteFramebuffer: vi.fn(),
    deleteTexture: vi.fn(),
    getCanvasSize: vi.fn().mockReturnValue({ width: 800, height: 600 }),
  } as unknown as WebGLContext;
};

describe('RenderTarget', () => {
  let ctx: WebGLContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe('initialization', () => {
    it('creates framebuffer and texture', () => {
      const target = new RenderTarget(ctx, { width: 256, height: 256 });

      expect(ctx.createFramebuffer).toHaveBeenCalled();
      expect(ctx.createTexture).toHaveBeenCalled();
      expect(target.width).toBe(256);
      expect(target.height).toBe(256);

      target.dispose();
    });

    it('sets texture parameters', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });

      expect(ctx.gl.texParameteri).toHaveBeenCalledWith(
        GL.TEXTURE_2D,
        GL.TEXTURE_MIN_FILTER,
        GL.LINEAR
      );
      expect(ctx.gl.texParameteri).toHaveBeenCalledWith(
        GL.TEXTURE_2D,
        GL.TEXTURE_MAG_FILTER,
        GL.LINEAR
      );
      expect(ctx.gl.texParameteri).toHaveBeenCalledWith(
        GL.TEXTURE_2D,
        GL.TEXTURE_WRAP_S,
        GL.CLAMP_TO_EDGE
      );
      expect(ctx.gl.texParameteri).toHaveBeenCalledWith(
        GL.TEXTURE_2D,
        GL.TEXTURE_WRAP_T,
        GL.CLAMP_TO_EDGE
      );

      target.dispose();
    });

    it('allocates texture storage', () => {
      const target = new RenderTarget(ctx, { width: 512, height: 512 });

      expect(ctx.gl.texStorage2D).toHaveBeenCalledWith(
        GL.TEXTURE_2D,
        1,
        GL.RGBA8,
        512,
        512
      );

      target.dispose();
    });

    it('attaches texture to framebuffer', () => {
      new RenderTarget(ctx, { width: 100, height: 100 });

      expect(ctx.gl.framebufferTexture2D).toHaveBeenCalledWith(
        GL.FRAMEBUFFER,
        GL.COLOR_ATTACHMENT0,
        GL.TEXTURE_2D,
        expect.anything(),
        0
      );
    });

    it('checks framebuffer completeness', () => {
      new RenderTarget(ctx, { width: 100, height: 100 });

      expect(ctx.gl.checkFramebufferStatus).toHaveBeenCalledWith(GL.FRAMEBUFFER);
    });

    it('throws if framebuffer is incomplete', () => {
      (ctx.gl.checkFramebufferStatus as ReturnType<typeof vi.fn>).mockReturnValue(0);

      expect(() => {
        new RenderTarget(ctx, { width: 100, height: 100 });
      }).toThrow('Framebuffer incomplete');
    });

    it('accepts custom filter and wrap options', () => {
      const target = new RenderTarget(ctx, {
        width: 100,
        height: 100,
        filter: GL.NEAREST,
        wrap: GL.CLAMP_TO_EDGE,
      });

      expect(ctx.gl.texParameteri).toHaveBeenCalledWith(
        GL.TEXTURE_2D,
        GL.TEXTURE_MIN_FILTER,
        GL.NEAREST
      );

      target.dispose();
    });

    it('unbinds after creation', () => {
      new RenderTarget(ctx, { width: 100, height: 100 });

      expect(ctx.bindFramebuffer).toHaveBeenLastCalledWith(null);
      expect(ctx.bindTexture).toHaveBeenLastCalledWith(GL.TEXTURE_2D, null);
    });
  });

  describe('bind/unbind', () => {
    it('binds framebuffer and sets viewport', () => {
      const target = new RenderTarget(ctx, { width: 256, height: 128 });

      target.bind();

      expect(ctx.bindFramebuffer).toHaveBeenCalledWith(target.framebuffer);
      expect(ctx.setViewport).toHaveBeenCalledWith(0, 0, 256, 128);

      target.dispose();
    });

    it('unbinds to default framebuffer', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });

      target.unbind();

      expect(ctx.bindFramebuffer).toHaveBeenLastCalledWith(null);

      target.dispose();
    });

    it('throws when binding disposed target', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });
      target.dispose();

      expect(() => target.bind()).toThrow('disposed');
    });
  });

  describe('clear', () => {
    it('clears with default color', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });

      target.clear();

      expect(ctx.gl.clearColor).toHaveBeenCalledWith(0, 0, 0, 0);
      expect(ctx.gl.clear).toHaveBeenCalledWith(GL.COLOR_BUFFER_BIT);

      target.dispose();
    });

    it('clears with custom color', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });

      target.clear(1, 0, 0, 1);

      expect(ctx.gl.clearColor).toHaveBeenCalledWith(1, 0, 0, 1);

      target.dispose();
    });
  });

  describe('texture binding', () => {
    it('binds texture to specified unit', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });

      target.bindTexture(2);

      expect(ctx.bindTexture).toHaveBeenCalledWith(
        GL.TEXTURE_2D,
        target.texture,
        2
      );

      target.dispose();
    });

    it('throws when binding texture of disposed target', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });
      target.dispose();

      expect(() => target.bindTexture(0)).toThrow('disposed');
    });
  });

  describe('accessors', () => {
    it('returns framebuffer', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });

      expect(target.framebuffer).toBeDefined();

      target.dispose();
    });

    it('returns texture', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });

      expect(target.texture).toBeDefined();

      target.dispose();
    });

    it('throws when accessing framebuffer of disposed target', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });
      target.dispose();

      expect(() => target.framebuffer).toThrow('disposed');
    });

    it('throws when accessing texture of disposed target', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });
      target.dispose();

      expect(() => target.texture).toThrow('disposed');
    });
  });

  describe('dispose', () => {
    it('deletes framebuffer and texture', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });
      const fb = target.framebuffer;
      const tex = target.texture;

      target.dispose();

      expect(ctx.deleteFramebuffer).toHaveBeenCalledWith(fb);
      expect(ctx.deleteTexture).toHaveBeenCalledWith(tex);
    });

    it('sets disposed flag', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });

      expect(target.disposed).toBe(false);

      target.dispose();

      expect(target.disposed).toBe(true);
    });

    it('can be called multiple times safely', () => {
      const target = new RenderTarget(ctx, { width: 100, height: 100 });

      target.dispose();
      target.dispose();

      // Should only delete once
      expect(ctx.deleteFramebuffer).toHaveBeenCalledTimes(1);
      expect(ctx.deleteTexture).toHaveBeenCalledTimes(1);
    });
  });
});

describe('createRenderTarget', () => {
  it('creates a render target', () => {
    const ctx = createMockContext();
    const target = createRenderTarget(ctx, { width: 200, height: 150 });

    expect(target).toBeInstanceOf(RenderTarget);
    expect(target.width).toBe(200);
    expect(target.height).toBe(150);

    target.dispose();
  });
});

describe('createCanvasSizedRenderTarget', () => {
  it('creates render target matching canvas size', () => {
    const ctx = createMockContext();
    const target = createCanvasSizedRenderTarget(ctx);

    expect(target.width).toBe(800);
    expect(target.height).toBe(600);

    target.dispose();
  });
});
