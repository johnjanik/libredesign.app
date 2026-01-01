/**
 * Effect pipeline tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EffectPipeline, createEffectPipeline } from '@renderer/effects/effect-pipeline';
import type { WebGLContext } from '@renderer/core/webgl-context';
import type { ShaderManager, ShaderProgram } from '@renderer/shaders/shader-manager';
import type { Effect, DropShadowEffect, InnerShadowEffect } from '@core/types/effect';
import type { NodeId } from '@core/types/common';

// Helper to create NodeId from string (for tests only)
const nodeId = (id: string): NodeId => id as unknown as NodeId;

// Mock WebGL constants
const GL = {
  TEXTURE_2D: 0x0DE1,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_MAG_FILTER: 0x2800,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  LINEAR: 0x2601,
  CLAMP_TO_EDGE: 0x812F,
  RGBA8: 0x8058,
  FRAMEBUFFER: 0x8D40,
  COLOR_ATTACHMENT0: 0x8CE0,
  FRAMEBUFFER_COMPLETE: 0x8CD5,
  COLOR_BUFFER_BIT: 0x4000,
  TEXTURE0: 0x84C0,
  ARRAY_BUFFER: 0x8892,
  STATIC_DRAW: 0x88E4,
  FLOAT: 0x1406,
  TRIANGLE_STRIP: 0x0005,
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
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  drawArrays: vi.fn(),
  uniform1i: vi.fn(),
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform4f: vi.fn(),
});

// Create mock WebGLContext
const createMockContext = (): WebGLContext => {
  const gl = createMockGL();
  let fbCounter = 0;
  let texCounter = 0;
  let vaoCounter = 0;
  let bufferCounter = 0;

  return {
    gl: gl as unknown as WebGL2RenderingContext,
    createFramebuffer: vi.fn(() => ({ _id: fbCounter++ } as unknown as WebGLFramebuffer)),
    createTexture: vi.fn(() => ({ _id: texCounter++ } as unknown as WebGLTexture)),
    createVertexArray: vi.fn(() => ({ _id: vaoCounter++ } as unknown as WebGLVertexArrayObject)),
    createBuffer: vi.fn(() => ({ _id: bufferCounter++ } as unknown as WebGLBuffer)),
    bindTexture: vi.fn(),
    bindFramebuffer: vi.fn(),
    bindVertexArray: vi.fn(),
    setViewport: vi.fn(),
    deleteFramebuffer: vi.fn(),
    deleteTexture: vi.fn(),
    deleteVertexArray: vi.fn(),
    deleteBuffer: vi.fn(),
    drawArrays: vi.fn(),
    getCanvasSize: vi.fn().mockReturnValue({ width: 800, height: 600 }),
  } as unknown as WebGLContext;
};

// Create mock shader program
const createMockShaderProgram = (): ShaderProgram => ({
  program: {} as WebGLProgram,
  uniforms: new Map([
    ['uTexture', {} as WebGLUniformLocation],
    ['uDirection', {} as WebGLUniformLocation],
    ['uRadius', {} as WebGLUniformLocation],
    ['uDestRect', {} as WebGLUniformLocation],
    ['uOffset', {} as WebGLUniformLocation],
    ['uColor', {} as WebGLUniformLocation],
    ['uSpread', {} as WebGLUniformLocation],
    ['uSource', {} as WebGLUniformLocation],
    ['uShadow', {} as WebGLUniformLocation],
  ]),
  attributes: new Map([
    ['aPosition', 0],
    ['aTexCoord', 1],
  ]),
});

// Create mock ShaderManager
const createMockShaderManager = (): ShaderManager => ({
  use: vi.fn().mockReturnValue(createMockShaderProgram()),
} as unknown as ShaderManager);

describe('EffectPipeline', () => {
  let ctx: WebGLContext;
  let shaders: ShaderManager;
  let pipeline: EffectPipeline;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = createMockContext();
    shaders = createMockShaderManager();
    pipeline = new EffectPipeline(ctx, shaders);
  });

  afterEach(() => {
    pipeline.dispose();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('creates quad VAO and buffers', () => {
      expect(ctx.createVertexArray).toHaveBeenCalled();
      expect(ctx.createBuffer).toHaveBeenCalledTimes(2); // positions + texcoords
    });

    it('sets up vertex attributes', () => {
      expect(ctx.gl.enableVertexAttribArray).toHaveBeenCalledWith(0);
      expect(ctx.gl.enableVertexAttribArray).toHaveBeenCalledWith(1);
    });

    it('accepts configuration options', () => {
      const customPipeline = new EffectPipeline(ctx, shaders, {
        maxBlurRadius: 128,
        blurPasses: 4,
      });

      expect(customPipeline).toBeDefined();
      customPipeline.dispose();
    });
  });

  describe('needsMultiPass', () => {
    it('returns true when any effect is visible', () => {
      const effects: Effect[] = [
        { type: 'BLUR', visible: true, radius: 10 },
      ];

      expect(pipeline.needsMultiPass(effects)).toBe(true);
    });

    it('returns false when no effects are visible', () => {
      const effects: Effect[] = [
        { type: 'BLUR', visible: false, radius: 10 },
      ];

      expect(pipeline.needsMultiPass(effects)).toBe(false);
    });

    it('returns false for empty effects array', () => {
      expect(pipeline.needsMultiPass([])).toBe(false);
    });

    it('returns true if at least one effect is visible', () => {
      const effects: Effect[] = [
        { type: 'BLUR', visible: false, radius: 10 },
        { type: 'BLUR', visible: true, radius: 5 },
      ];

      expect(pipeline.needsMultiPass(effects)).toBe(true);
    });
  });

  describe('beginNodeEffects', () => {
    it('returns a render target', () => {
      const effects: Effect[] = [
        { type: 'BLUR', visible: true, radius: 10 },
      ];

      const target = pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      expect(target).toBeDefined();
      expect(target.width).toBeGreaterThanOrEqual(100);
      expect(target.height).toBeGreaterThanOrEqual(100);
    });

    it('adds padding for blur effects', () => {
      const effects: Effect[] = [
        { type: 'BLUR', visible: true, radius: 20 },
      ];

      const target = pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      // Padding should be radius * 2 on each side
      expect(target.width).toBe(Math.ceil(100 + 20 * 2 * 2));
      expect(target.height).toBe(Math.ceil(100 + 20 * 2 * 2));
    });

    it('adds padding for shadow effects', () => {
      const effects: Effect[] = [
        {
          type: 'DROP_SHADOW',
          visible: true,
          radius: 10,
          spread: 5,
          offset: { x: 10, y: 10 },
          color: { r: 0, g: 0, b: 0, a: 0.5 },
        } as DropShadowEffect,
      ];

      const target = pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      // Padding includes blur, spread, and offset
      expect(target.width).toBeGreaterThan(100);
      expect(target.height).toBeGreaterThan(100);
    });

    it('clears the render target', () => {
      const effects: Effect[] = [
        { type: 'BLUR', visible: true, radius: 5 },
      ];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      expect(ctx.gl.clearColor).toHaveBeenCalled();
      expect(ctx.gl.clear).toHaveBeenCalled();
    });

    it('limits padding to maxBlurRadius', () => {
      const limitedPipeline = new EffectPipeline(ctx, shaders, {
        maxBlurRadius: 32,
      });

      const effects: Effect[] = [
        { type: 'BLUR', visible: true, radius: 100 },
      ];

      const target = limitedPipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      // Padding should be limited
      expect(target.width).toBeLessThanOrEqual(100 + 32 * 2 + 1);

      limitedPipeline.dispose();
    });
  });

  describe('endNodeEffects', () => {
    it('returns final render target', () => {
      const effects: Effect[] = [];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      const result = pipeline.endNodeEffects();

      expect(result).toBeDefined();
    });

    it('throws when no context is active', () => {
      expect(() => pipeline.endNodeEffects()).toThrow('No effect context');
    });

    it('applies blur effect', () => {
      const effects: Effect[] = [
        { type: 'BLUR', visible: true, radius: 10 },
      ];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      pipeline.endNodeEffects();

      // Should use blur shader
      expect(shaders.use).toHaveBeenCalledWith('blur');
    });

    it('skips invisible effects', () => {
      const effects: Effect[] = [
        { type: 'BLUR', visible: false, radius: 10 },
      ];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      pipeline.endNodeEffects();

      // Blur shader should not be used
      expect(shaders.use).not.toHaveBeenCalledWith('blur');
    });

    it('applies drop shadow effect', () => {
      const effects: Effect[] = [
        {
          type: 'DROP_SHADOW',
          visible: true,
          radius: 10,
          spread: 0,
          offset: { x: 5, y: 5 },
          color: { r: 0, g: 0, b: 0, a: 0.5 },
        } as DropShadowEffect,
      ];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      pipeline.endNodeEffects();

      expect(shaders.use).toHaveBeenCalledWith('shadow');
      expect(shaders.use).toHaveBeenCalledWith('blur');
      expect(shaders.use).toHaveBeenCalledWith('composite');
    });

    it('applies inner shadow effect', () => {
      const effects: Effect[] = [
        {
          type: 'INNER_SHADOW',
          visible: true,
          radius: 5,
          spread: 0,
          offset: { x: 2, y: 2 },
          color: { r: 0, g: 0, b: 0, a: 0.3 },
        } as InnerShadowEffect,
      ];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      pipeline.endNodeEffects();

      expect(shaders.use).toHaveBeenCalledWith('innerShadow');
      expect(shaders.use).toHaveBeenCalledWith('innerShadowComposite');
    });

    it('applies multiple effects in order', () => {
      const shaderCalls: string[] = [];
      (shaders.use as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
        shaderCalls.push(name);
        return createMockShaderProgram();
      });

      const effects: Effect[] = [
        { type: 'BLUR', visible: true, radius: 5 },
        {
          type: 'DROP_SHADOW',
          visible: true,
          radius: 10,
          spread: 0,
          offset: { x: 5, y: 5 },
          color: { r: 0, g: 0, b: 0, a: 0.5 },
        } as DropShadowEffect,
      ];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      pipeline.endNodeEffects();

      // Blur should be applied first
      const blurIndex = shaderCalls.indexOf('blur');
      const shadowIndex = shaderCalls.indexOf('shadow');
      expect(blurIndex).toBeLessThan(shadowIndex);
    });
  });

  describe('compositeToScreen', () => {
    it('binds default framebuffer', () => {
      const effects: Effect[] = [];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      const target = pipeline.endNodeEffects();
      pipeline.compositeToScreen(target, 0, 0, 100, 100);

      expect(ctx.bindFramebuffer).toHaveBeenCalledWith(null);
    });

    it('uses composite shader', () => {
      const effects: Effect[] = [];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      const target = pipeline.endNodeEffects();
      pipeline.compositeToScreen(target, 0, 0, 100, 100);

      expect(shaders.use).toHaveBeenCalledWith('composite');
    });

    it('sets viewport to canvas size', () => {
      const effects: Effect[] = [];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      const target = pipeline.endNodeEffects();
      pipeline.compositeToScreen(target, 0, 0, 100, 100);

      expect(ctx.setViewport).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('releases render target back to pool', () => {
      const effects: Effect[] = [];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      const target = pipeline.endNodeEffects();
      pipeline.compositeToScreen(target, 50, 50, 100, 100);

      // Pool should have the target available
      const stats = pipeline.getPool().getStats();
      expect(stats.available).toBeGreaterThanOrEqual(1);
    });

    it('draws with destination rectangle', () => {
      const effects: Effect[] = [];

      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      const target = pipeline.endNodeEffects();
      pipeline.compositeToScreen(target, 100, 200, 50, 75);

      expect(ctx.gl.uniform4f).toHaveBeenCalled();
    });
  });

  describe('updateCanvasSize', () => {
    it('updates cached canvas dimensions', () => {
      (ctx.getCanvasSize as ReturnType<typeof vi.fn>).mockReturnValue({
        width: 1920,
        height: 1080,
      });

      pipeline.updateCanvasSize();

      // Compositing should use new size
      const effects: Effect[] = [];
      pipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );
      const target = pipeline.endNodeEffects();
      pipeline.compositeToScreen(target, 0, 0, 100, 100);

      expect(ctx.setViewport).toHaveBeenCalledWith(0, 0, 1920, 1080);
    });
  });

  describe('getPool', () => {
    it('returns the render target pool', () => {
      const pool = pipeline.getPool();

      expect(pool).toBeDefined();
      expect(typeof pool.acquire).toBe('function');
      expect(typeof pool.release).toBe('function');
    });
  });

  describe('dispose', () => {
    it('disposes the render target pool', () => {
      const pool = pipeline.getPool();
      pool.acquire(256, 256);

      pipeline.dispose();

      const stats = pool.getStats();
      expect(stats.total).toBe(0);
    });

    it('deletes quad resources', () => {
      pipeline.dispose();

      expect(ctx.deleteVertexArray).toHaveBeenCalled();
      expect(ctx.deleteBuffer).toHaveBeenCalledTimes(2);
    });
  });

  describe('nested effects', () => {
    it('supports nested effect contexts', () => {
      const effects1: Effect[] = [
        { type: 'BLUR', visible: true, radius: 5 },
      ];
      const effects2: Effect[] = [
        { type: 'BLUR', visible: true, radius: 10 },
      ];

      // Begin outer context
      void pipeline.beginNodeEffects(
        nodeId('outer'),
        effects1,
        { x: 0, y: 0, width: 200, height: 200 }
      );

      // Begin inner context
      void pipeline.beginNodeEffects(
        nodeId('inner'),
        effects2,
        { x: 50, y: 50, width: 100, height: 100 }
      );

      // End inner context
      const innerResult = pipeline.endNodeEffects();
      expect(innerResult).toBeDefined();

      // End outer context
      const outerResult = pipeline.endNodeEffects();
      expect(outerResult).toBeDefined();
    });
  });

  describe('blur passes', () => {
    it('applies multiple blur passes for quality', () => {
      const multiPassPipeline = new EffectPipeline(ctx, shaders, {
        blurPasses: 3,
      });

      const effects: Effect[] = [
        { type: 'BLUR', visible: true, radius: 30 },
      ];

      multiPassPipeline.beginNodeEffects(
        nodeId('node-1'),
        effects,
        { x: 0, y: 0, width: 100, height: 100 }
      );

      multiPassPipeline.endNodeEffects();

      // Blur shader should be called multiple times (H+V per pass)
      const blurCalls = (shaders.use as ReturnType<typeof vi.fn>).mock.calls
        .filter(call => call[0] === 'blur');
      expect(blurCalls.length).toBe(6); // 3 passes * 2 (H + V)

      multiPassPipeline.dispose();
    });
  });
});

describe('createEffectPipeline', () => {
  let ctx: WebGLContext;
  let shaders: ShaderManager;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = createMockContext();
    shaders = createMockShaderManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates an effect pipeline', () => {
    const pipeline = createEffectPipeline(ctx, shaders);

    expect(pipeline).toBeInstanceOf(EffectPipeline);

    pipeline.dispose();
  });

  it('accepts configuration', () => {
    const pipeline = createEffectPipeline(ctx, shaders, {
      maxBlurRadius: 100,
      blurPasses: 2,
    });

    expect(pipeline).toBeDefined();

    pipeline.dispose();
  });
});
