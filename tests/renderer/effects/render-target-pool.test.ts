/**
 * Render target pool tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RenderTargetPool, createRenderTargetPool } from '@renderer/effects/render-target-pool';
import type { WebGLContext } from '@renderer/core/webgl-context';

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
  let fbCounter = 0;
  let texCounter = 0;

  return {
    gl: gl as unknown as WebGL2RenderingContext,
    createFramebuffer: vi.fn(() => ({ _id: fbCounter++ } as unknown as WebGLFramebuffer)),
    createTexture: vi.fn(() => ({ _id: texCounter++ } as unknown as WebGLTexture)),
    bindTexture: vi.fn(),
    bindFramebuffer: vi.fn(),
    setViewport: vi.fn(),
    deleteFramebuffer: vi.fn(),
    deleteTexture: vi.fn(),
    getCanvasSize: vi.fn().mockReturnValue({ width: 800, height: 600 }),
  } as unknown as WebGLContext;
};

describe('RenderTargetPool', () => {
  let ctx: WebGLContext;
  let pool: RenderTargetPool;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = createMockContext();
    pool = new RenderTargetPool(ctx, { maxPoolSize: 8, gcTimeout: 5000 });
  });

  afterEach(() => {
    pool.dispose();
    vi.useRealTimers();
  });

  describe('acquire', () => {
    it('creates new render target when pool is empty', () => {
      const target = pool.acquire(256, 256);

      expect(target).toBeDefined();
      expect(target.width).toBe(256);
      expect(target.height).toBe(256);
      expect(ctx.createFramebuffer).toHaveBeenCalledTimes(1);
    });

    it('reuses released render targets of same size', () => {
      const target1 = pool.acquire(256, 256);
      pool.release(target1);

      const target2 = pool.acquire(256, 256);

      // Should reuse the same target
      expect(target2).toBe(target1);
      // Should not create a new one
      expect(ctx.createFramebuffer).toHaveBeenCalledTimes(1);
    });

    it('creates new target when size differs', () => {
      const target1 = pool.acquire(256, 256);
      pool.release(target1);

      const target2 = pool.acquire(512, 512);

      expect(target2).not.toBe(target1);
      expect(target2.width).toBe(512);
      expect(target2.height).toBe(512);
      expect(ctx.createFramebuffer).toHaveBeenCalledTimes(2);
    });

    it('creates new target when all same-size targets are in use', () => {
      const target1 = pool.acquire(256, 256);
      const target2 = pool.acquire(256, 256);

      expect(target2).not.toBe(target1);
      expect(ctx.createFramebuffer).toHaveBeenCalledTimes(2);
    });

    it('tracks multiple sizes independently', () => {
      const small1 = pool.acquire(128, 128);
      const large1 = pool.acquire(512, 512);

      pool.release(small1);
      pool.release(large1);

      const small2 = pool.acquire(128, 128);
      const large2 = pool.acquire(512, 512);

      expect(small2).toBe(small1);
      expect(large2).toBe(large1);
    });
  });

  describe('release', () => {
    it('marks target as available for reuse', () => {
      const target = pool.acquire(256, 256);

      pool.release(target);

      const stats = pool.getStats();
      expect(stats.inUse).toBe(0);
      expect(stats.available).toBe(1);
    });

    it('handles releasing unknown targets by disposing them', async () => {
      // Create a target outside the pool using dynamic import
      const { RenderTarget } = await import('@renderer/effects/render-target');
      const externalTarget = new RenderTarget(ctx, { width: 100, height: 100 });

      pool.release(externalTarget);

      expect(externalTarget.disposed).toBe(true);
    });

    it('ignores already disposed targets', () => {
      const target = pool.acquire(256, 256);
      target.dispose();

      // Should not throw
      expect(() => pool.release(target)).not.toThrow();
    });

    it('updates lastUsed timestamp', () => {
      const target = pool.acquire(256, 256);
      void Date.now(); // acquireTime - tracked for timestamp update

      vi.advanceTimersByTime(1000);
      pool.release(target);

      // Target should be reusable
      const reacquired = pool.acquire(256, 256);
      expect(reacquired).toBe(target);
    });
  });

  describe('getStats', () => {
    it('returns correct initial stats', () => {
      const stats = pool.getStats();

      expect(stats).toEqual({
        total: 0,
        inUse: 0,
        available: 0,
      });
    });

    it('tracks acquired targets', () => {
      pool.acquire(256, 256);
      pool.acquire(256, 256);
      pool.acquire(512, 512);

      const stats = pool.getStats();

      expect(stats.total).toBe(3);
      expect(stats.inUse).toBe(3);
      expect(stats.available).toBe(0);
    });

    it('tracks released targets', () => {
      const t1 = pool.acquire(256, 256);
      const t2 = pool.acquire(256, 256);
      pool.acquire(512, 512);

      pool.release(t1);
      pool.release(t2);

      const stats = pool.getStats();

      expect(stats.total).toBe(3);
      expect(stats.inUse).toBe(1);
      expect(stats.available).toBe(2);
    });

    it('excludes disposed targets from count', () => {
      const t1 = pool.acquire(256, 256);
      pool.acquire(256, 256);

      t1.dispose();

      const stats = pool.getStats();

      expect(stats.total).toBe(1);
    });
  });

  describe('garbage collection', () => {
    it('disposes unused targets after timeout', () => {
      const target = pool.acquire(256, 256);
      pool.release(target);

      // Advance past GC timeout
      vi.advanceTimersByTime(10000);

      expect(target.disposed).toBe(true);

      const stats = pool.getStats();
      expect(stats.total).toBe(0);
    });

    it('does not dispose targets still in use', () => {
      const target = pool.acquire(256, 256);

      // Advance past GC timeout
      vi.advanceTimersByTime(10000);

      expect(target.disposed).toBe(false);
    });

    it('does not dispose recently used targets', () => {
      const target = pool.acquire(256, 256);
      pool.release(target);

      // Advance less than GC timeout
      vi.advanceTimersByTime(2000);

      expect(target.disposed).toBe(false);
    });

    it('limits pool size by disposing oldest unused targets', () => {
      // Create more targets than maxPoolSize
      const targets: ReturnType<typeof pool.acquire>[] = [];
      for (let i = 0; i < 12; i++) {
        const t = pool.acquire(100 + i, 100 + i); // Unique sizes
        targets.push(t);
      }

      // Release all targets
      for (const t of targets) {
        pool.release(t);
        vi.advanceTimersByTime(10); // Small delay between releases
      }

      // Trigger GC
      vi.advanceTimersByTime(3000);

      const stats = pool.getStats();
      expect(stats.total).toBeLessThanOrEqual(8); // maxPoolSize
    });
  });

  describe('clear', () => {
    it('clears the render target', () => {
      const target = pool.acquire(256, 256);

      pool.clear(target, 1, 0, 0, 1);

      expect(ctx.gl.clearColor).toHaveBeenCalledWith(1, 0, 0, 1);
    });
  });

  describe('dispose', () => {
    it('disposes all targets', () => {
      const t1 = pool.acquire(256, 256);
      const t2 = pool.acquire(512, 512);
      pool.release(t1);

      pool.dispose();

      expect(t1.disposed).toBe(true);
      expect(t2.disposed).toBe(true);
    });

    it('stops garbage collection timer', () => {
      pool.dispose();

      // Advancing time should not cause issues
      expect(() => vi.advanceTimersByTime(20000)).not.toThrow();
    });

    it('clears the pool', () => {
      pool.acquire(256, 256);
      pool.dispose();

      const stats = pool.getStats();
      expect(stats.total).toBe(0);
    });
  });
});

describe('createRenderTargetPool', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a render target pool', () => {
    const ctx = createMockContext();
    const pool = createRenderTargetPool(ctx);

    expect(pool).toBeInstanceOf(RenderTargetPool);

    pool.dispose();
  });

  it('accepts configuration options', () => {
    const ctx = createMockContext();
    const pool = createRenderTargetPool(ctx, {
      maxPoolSize: 4,
      gcTimeout: 1000,
    });

    expect(pool).toBeDefined();

    pool.dispose();
  });
});
