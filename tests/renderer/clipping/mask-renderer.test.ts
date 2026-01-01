/**
 * Mask Renderer tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaskRenderer, createMaskRenderer } from '@renderer/clipping/mask-renderer';
import type { MaskConfig, MaskType } from '@renderer/clipping/mask-renderer';

// Mock WebGL context
const createMockWebGLContext = () => ({
  gl: {
    TEXTURE_2D: 0x0DE1,
    FRAMEBUFFER: 0x8D40,
    FRAMEBUFFER_BINDING: 0x8CA6,
    COLOR_BUFFER_BIT: 0x4000,
    BLEND: 0x0BE2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    FLOAT: 0x1406,
    STATIC_DRAW: 0x88E4,
    DYNAMIC_DRAW: 0x88E8,
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    TRIANGLES: 0x0004,
    UNSIGNED_SHORT: 0x1403,
    getParameter: vi.fn().mockReturnValue(null),
    clearColor: vi.fn(),
    clear: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform4f: vi.fn(),
  },
  createVertexArray: vi.fn().mockReturnValue({}),
  deleteVertexArray: vi.fn(),
  bindVertexArray: vi.fn(),
  createBuffer: vi.fn().mockReturnValue({}),
  deleteBuffer: vi.fn(),
  createFramebuffer: vi.fn().mockReturnValue({}),
  deleteFramebuffer: vi.fn(),
  bindFramebuffer: vi.fn(),
  createTexture: vi.fn().mockReturnValue({}),
  deleteTexture: vi.fn(),
  bindTexture: vi.fn(),
  setViewport: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  getCanvasSize: vi.fn().mockReturnValue({ width: 800, height: 600 }),
});

// Mock shader manager
const createMockShaderManager = () => ({
  use: vi.fn().mockReturnValue({
    program: {},
    uniforms: new Map([
      ['uSource', {}],
      ['uMask', {}],
      ['uOpacity', {}],
      ['uMaskType', {}],
      ['uDirection', {}],
      ['uRadius', {}],
      ['uViewProjection', {}],
      ['uTransform', {}],
      ['uColor', {}],
    ]),
  }),
});

// Mock render target
const createMockRenderTarget = (width = 800, height = 600) => ({
  width,
  height,
  framebuffer: {},
  texture: {},
  bind: vi.fn(),
  unbind: vi.fn(),
  clear: vi.fn(),
  bindTexture: vi.fn(),
  dispose: vi.fn(),
  disposed: false,
});

// Mock render target pool
const createMockPool = () => {
  const pool = {
    acquire: vi.fn().mockImplementation((w, h) => createMockRenderTarget(w, h)),
    release: vi.fn(),
  };
  return pool;
};

describe('MaskRenderer', () => {
  let ctx: ReturnType<typeof createMockWebGLContext>;
  let shaders: ReturnType<typeof createMockShaderManager>;
  let pool: ReturnType<typeof createMockPool>;
  let renderer: MaskRenderer;

  beforeEach(() => {
    ctx = createMockWebGLContext();
    shaders = createMockShaderManager();
    pool = createMockPool();
    renderer = new MaskRenderer(ctx as any, shaders as any, pool as any);
  });

  describe('initialization', () => {
    it('creates quad resources', () => {
      expect(ctx.createVertexArray).toHaveBeenCalled();
      expect(ctx.createBuffer).toHaveBeenCalled();
    });

    it('starts with no masks', () => {
      expect(renderer.getMaskDepth()).toBe(0);
      expect(renderer.isMasking()).toBe(false);
    });
  });

  describe('beginMask', () => {
    it('acquires render targets', () => {
      renderer.beginMask();

      expect(pool.acquire).toHaveBeenCalledWith(800, 600);
      expect(pool.acquire).toHaveBeenCalledTimes(2); // mask + content
    });

    it('increments mask depth', () => {
      renderer.beginMask();

      expect(renderer.getMaskDepth()).toBe(1);
      expect(renderer.isMasking()).toBe(true);
    });

    it('clears mask target', () => {
      renderer.beginMask();

      expect(ctx.gl.clearColor).toHaveBeenCalledWith(0, 0, 0, 0);
      expect(ctx.gl.clear).toHaveBeenCalled();
    });

    it('supports nested masks', () => {
      renderer.beginMask();
      renderer.endMaskBeginContent();
      renderer.beginMask();

      expect(renderer.getMaskDepth()).toBe(2);
    });

    it('accepts custom configuration', () => {
      const config: MaskConfig = {
        type: 'luminance',
        opacity: 0.5,
        feather: 10,
      };

      renderer.beginMask(config);

      expect(renderer.getMaskDepth()).toBe(1);
    });
  });

  describe('endMaskBeginContent', () => {
    it('switches to content target', () => {
      renderer.beginMask();
      void pool.acquire.mock.results[0]?.value;

      renderer.endMaskBeginContent();
      const contentTarget = pool.acquire.mock.results[1]?.value;

      expect(contentTarget?.bind).toHaveBeenCalled();
    });

    it('warns if no mask layer', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderer.endMaskBeginContent();

      expect(warnSpy).toHaveBeenCalledWith('No mask layer to end');
      warnSpy.mockRestore();
    });

    it('applies feather if configured', () => {
      renderer.beginMask({ feather: 5 });
      renderer.endMaskBeginContent();

      expect(shaders.use).toHaveBeenCalledWith('blur');
    });
  });

  describe('endMask', () => {
    it('composites masked content', () => {
      renderer.beginMask();
      renderer.endMaskBeginContent();
      const result = renderer.endMask();

      expect(result).not.toBeNull();
      expect(shaders.use).toHaveBeenCalledWith('composite');
    });

    it('releases temporary targets', () => {
      renderer.beginMask();
      renderer.endMaskBeginContent();
      renderer.endMask();

      expect(pool.release).toHaveBeenCalledTimes(2);
    });

    it('decrements mask depth', () => {
      renderer.beginMask();
      renderer.endMaskBeginContent();
      renderer.endMask();

      expect(renderer.getMaskDepth()).toBe(0);
    });

    it('returns output render target', () => {
      renderer.beginMask();
      renderer.endMaskBeginContent();
      const result = renderer.endMask();

      expect(result).toBeDefined();
      expect(result?.width).toBe(800);
    });

    it('returns null if no mask layer', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = renderer.endMask();

      expect(result).toBeNull();
      warnSpy.mockRestore();
    });
  });

  describe('applyMask', () => {
    it('composites content with mask', () => {
      const content = createMockRenderTarget();
      const mask = createMockRenderTarget();

      renderer.applyMask(content as any, mask as any);

      expect(content.bindTexture).toHaveBeenCalledWith(0);
      expect(mask.bindTexture).toHaveBeenCalledWith(1);
      expect(shaders.use).toHaveBeenCalledWith('composite');
    });

    it('sets mask type uniform', () => {
      const content = createMockRenderTarget();
      const mask = createMockRenderTarget();

      renderer.applyMask(content as any, mask as any, { type: 'luminance' });

      expect(ctx.gl.uniform1i).toHaveBeenCalled();
    });

    it('sets opacity uniform', () => {
      const content = createMockRenderTarget();
      const mask = createMockRenderTarget();

      renderer.applyMask(content as any, mask as any, { opacity: 0.75 });

      expect(ctx.gl.uniform1f).toHaveBeenCalled();
    });
  });

  describe('renderMaskedShape', () => {
    it('renders shape to mask texture', () => {
      const content = createMockRenderTarget();
      const vertices = new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]);
      const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
      const transform: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
      const viewProjection: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];

      const result = renderer.renderMaskedShape(
        content as any,
        vertices,
        indices,
        transform,
        viewProjection
      );

      expect(shaders.use).toHaveBeenCalledWith('fill');
      expect(result).toBeDefined();
    });

    it('applies feather to shape mask', () => {
      const content = createMockRenderTarget();
      const vertices = new Float32Array([0, 0, 100, 0, 100, 100]);
      const indices = new Uint16Array([0, 1, 2]);
      const transform: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
      const viewProjection: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];

      renderer.renderMaskedShape(
        content as any,
        vertices,
        indices,
        transform,
        viewProjection,
        { feather: 8 }
      );

      expect(shaders.use).toHaveBeenCalledWith('blur');
    });
  });

  describe('cancelMask', () => {
    it('releases targets without compositing', () => {
      renderer.beginMask();
      renderer.cancelMask();

      expect(pool.release).toHaveBeenCalledTimes(2);
      expect(renderer.getMaskDepth()).toBe(0);
    });

    it('does nothing if no mask', () => {
      expect(() => renderer.cancelMask()).not.toThrow();
    });
  });

  describe('clearAllMasks', () => {
    it('cancels all nested masks', () => {
      renderer.beginMask();
      renderer.endMaskBeginContent();
      renderer.beginMask();
      renderer.endMaskBeginContent();

      renderer.clearAllMasks();

      expect(renderer.getMaskDepth()).toBe(0);
      expect(pool.release).toHaveBeenCalledTimes(4);
    });
  });

  describe('dispose', () => {
    it('clears all masks', () => {
      renderer.beginMask();
      renderer.dispose();

      expect(renderer.getMaskDepth()).toBe(0);
    });

    it('deletes quad resources', () => {
      renderer.dispose();

      expect(ctx.deleteVertexArray).toHaveBeenCalled();
      expect(ctx.deleteBuffer).toHaveBeenCalled();
    });
  });

  describe('mask types', () => {
    const maskTypes: MaskType[] = ['alpha', 'luminance', 'inverse-alpha', 'inverse-luminance'];

    it.each(maskTypes)('supports %s mask type', (type) => {
      const content = createMockRenderTarget();
      const mask = createMockRenderTarget();

      expect(() => {
        renderer.applyMask(content as any, mask as any, { type });
      }).not.toThrow();
    });
  });
});

describe('createMaskRenderer', () => {
  it('creates a mask renderer', () => {
    const ctx = createMockWebGLContext();
    const shaders = createMockShaderManager();
    const pool = createMockPool();

    const renderer = createMaskRenderer(ctx as any, shaders as any, pool as any);

    expect(renderer).toBeInstanceOf(MaskRenderer);
  });
});
