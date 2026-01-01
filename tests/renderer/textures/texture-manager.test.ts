/**
 * Texture Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TextureManager, createTextureManager } from '../../../src/renderer/textures/texture-manager';
import type { WebGLContext } from '../../../src/renderer/core/webgl-context';

// Mock WebGL constants
const GL = {
  TEXTURE_2D: 0x0DE1,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_MAG_FILTER: 0x2800,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  LINEAR: 0x2601,
  LINEAR_MIPMAP_LINEAR: 0x2703,
  CLAMP_TO_EDGE: 0x812F,
  REPEAT: 0x2901,
  RGBA8: 0x8058,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  TEXTURE0: 0x84C0,
  UNPACK_FLIP_Y_WEBGL: 0x9240,
  UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
};

// Create mock WebGL context
function createMockGL() {
  let textureId = 0;
  return {
    ...GL,
    createTexture: vi.fn(() => ({ id: ++textureId })),
    deleteTexture: vi.fn(),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texStorage2D: vi.fn(),
    texParameteri: vi.fn(),
    generateMipmap: vi.fn(),
    activeTexture: vi.fn(),
    pixelStorei: vi.fn(),
  };
}

function createMockContext(): WebGLContext {
  return {
    gl: createMockGL() as unknown as WebGL2RenderingContext,
  } as WebGLContext;
}

// Mock image
function createMockImage(width: number, height: number): HTMLImageElement {
  return {
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
  } as HTMLImageElement;
}

describe('TextureManager', () => {
  let ctx: WebGLContext;
  let manager: TextureManager;

  beforeEach(() => {
    ctx = createMockContext();
    manager = new TextureManager(ctx);
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('loadFromImage', () => {
    it('should create a texture from an image', () => {
      const image = createMockImage(256, 256);
      const entry = manager.loadFromImage('test-image', image);

      expect(entry.texture).toBeDefined();
      expect(entry.width).toBe(256);
      expect(entry.height).toBe(256);
      expect(entry.refCount).toBe(1);
      expect(ctx.gl.createTexture).toHaveBeenCalled();
      expect(ctx.gl.texImage2D).toHaveBeenCalled();
    });

    it('should return cached texture for same key', () => {
      const image = createMockImage(256, 256);
      const entry1 = manager.loadFromImage('test-image', image);
      const entry2 = manager.loadFromImage('test-image', image);

      expect(entry1.texture).toBe(entry2.texture);
      expect(entry2.refCount).toBe(2);
      expect(ctx.gl.createTexture).toHaveBeenCalledTimes(1);
    });

    it('should set texture parameters', () => {
      const image = createMockImage(256, 256);
      manager.loadFromImage('test-image', image, {
        minFilter: GL.LINEAR,
        magFilter: GL.LINEAR,
        wrapS: GL.REPEAT,
        wrapT: GL.REPEAT,
      });

      expect(ctx.gl.texParameteri).toHaveBeenCalledWith(
        GL.TEXTURE_2D,
        GL.TEXTURE_MIN_FILTER,
        GL.LINEAR
      );
      expect(ctx.gl.texParameteri).toHaveBeenCalledWith(
        GL.TEXTURE_2D,
        GL.TEXTURE_WRAP_S,
        GL.REPEAT
      );
    });

    it('should generate mipmaps for power-of-two textures', () => {
      const image = createMockImage(256, 256);
      manager.loadFromImage('test-image', image, { generateMipmaps: true });

      expect(ctx.gl.generateMipmap).toHaveBeenCalledWith(GL.TEXTURE_2D);
    });

    it('should not generate mipmaps for non-power-of-two textures', () => {
      const image = createMockImage(300, 200);
      manager.loadFromImage('test-image', image, { generateMipmaps: true });

      expect(ctx.gl.generateMipmap).not.toHaveBeenCalled();
    });

    it('should handle flip Y option', () => {
      const image = createMockImage(256, 256);
      manager.loadFromImage('test-image', image, { flipY: true });

      expect(ctx.gl.pixelStorei).toHaveBeenCalledWith(GL.UNPACK_FLIP_Y_WEBGL, true);
    });
  });

  describe('loadFromData', () => {
    it('should create a texture from pixel data', () => {
      const data = new Uint8Array(256 * 256 * 4);
      const entry = manager.loadFromData('test-data', 256, 256, data);

      expect(entry.texture).toBeDefined();
      expect(entry.width).toBe(256);
      expect(entry.height).toBe(256);
      expect(ctx.gl.texImage2D).toHaveBeenCalled();
    });

    it('should create empty texture when data is null', () => {
      const entry = manager.loadFromData('test-empty', 256, 256, null);

      expect(entry.texture).toBeDefined();
      expect(ctx.gl.texStorage2D).toHaveBeenCalled();
    });
  });

  describe('getTexture', () => {
    it('should return null for unknown key', () => {
      expect(manager.getTexture('unknown')).toBeNull();
    });

    it('should return texture entry for known key', () => {
      const image = createMockImage(256, 256);
      manager.loadFromImage('test-image', image);

      const entry = manager.getTexture('test-image');
      expect(entry).not.toBeNull();
      expect(entry!.width).toBe(256);
    });
  });

  describe('hasTexture', () => {
    it('should return false for unknown key', () => {
      expect(manager.hasTexture('unknown')).toBe(false);
    });

    it('should return true for loaded texture', () => {
      const image = createMockImage(256, 256);
      manager.loadFromImage('test-image', image);

      expect(manager.hasTexture('test-image')).toBe(true);
    });
  });

  describe('acquire/release', () => {
    it('should increment ref count on acquire', () => {
      const image = createMockImage(256, 256);
      manager.loadFromImage('test-image', image);

      const entry = manager.acquire('test-image');
      expect(entry!.refCount).toBe(2);
    });

    it('should decrement ref count on release', () => {
      const image = createMockImage(256, 256);
      const entry = manager.loadFromImage('test-image', image);

      manager.release('test-image');
      expect(entry.refCount).toBe(0);
    });

    it('should not go below zero on release', () => {
      const image = createMockImage(256, 256);
      const entry = manager.loadFromImage('test-image', image);

      manager.release('test-image');
      manager.release('test-image');
      expect(entry.refCount).toBe(0);
    });
  });

  describe('bindTexture', () => {
    it('should bind texture to specified unit', () => {
      const image = createMockImage(256, 256);
      manager.loadFromImage('test-image', image);

      const result = manager.bindTexture('test-image', 2);

      expect(result).toBe(true);
      expect(ctx.gl.activeTexture).toHaveBeenCalledWith(GL.TEXTURE0 + 2);
      expect(ctx.gl.bindTexture).toHaveBeenCalled();
    });

    it('should return false for unknown key', () => {
      const result = manager.bindTexture('unknown', 0);
      expect(result).toBe(false);
    });
  });

  describe('deleteTexture', () => {
    it('should delete texture from GL', () => {
      const image = createMockImage(256, 256);
      manager.loadFromImage('test-image', image);

      manager.deleteTexture('test-image');

      expect(ctx.gl.deleteTexture).toHaveBeenCalled();
      expect(manager.hasTexture('test-image')).toBe(false);
    });
  });

  describe('clearUnused', () => {
    it('should clear textures with zero refcount after timeout', () => {
      vi.useFakeTimers();

      const image = createMockImage(256, 256);
      manager.loadFromImage('test-image', image);
      manager.release('test-image');

      // Advance time past eviction timeout
      vi.advanceTimersByTime(35000);

      const cleared = manager.clearUnused();
      expect(cleared).toBe(1);
      expect(manager.hasTexture('test-image')).toBe(false);

      vi.useRealTimers();
    });

    it('should not clear textures with non-zero refcount', () => {
      vi.useFakeTimers();

      const image = createMockImage(256, 256);
      manager.loadFromImage('test-image', image);

      vi.advanceTimersByTime(35000);

      const cleared = manager.clearUnused();
      expect(cleared).toBe(0);
      expect(manager.hasTexture('test-image')).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      const image = createMockImage(256, 256);
      manager.loadFromImage('image1', image);
      manager.loadFromImage('image2', image);

      const stats = manager.getStats();
      expect(stats.count).toBe(2);
      expect(stats.maxSize).toBe(100);
    });
  });

  describe('dispose', () => {
    it('should delete all textures', () => {
      const image = createMockImage(256, 256);
      manager.loadFromImage('image1', image);
      manager.loadFromImage('image2', image);

      manager.dispose();

      expect(ctx.gl.deleteTexture).toHaveBeenCalledTimes(2);
    });

    it('should throw on operations after dispose', () => {
      manager.dispose();

      expect(() => {
        manager.loadFromImage('test', createMockImage(256, 256));
      }).toThrow('TextureManager has been disposed');
    });
  });
});

describe('createTextureManager', () => {
  it('should create a texture manager', () => {
    const ctx = createMockContext();
    const manager = createTextureManager(ctx);

    expect(manager).toBeInstanceOf(TextureManager);
    manager.dispose();
  });

  it('should accept configuration options', () => {
    const ctx = createMockContext();
    const manager = createTextureManager(ctx, {
      maxCacheSize: 50,
      evictionTimeout: 60000,
    });

    const stats = manager.getStats();
    expect(stats.maxSize).toBe(50);
    manager.dispose();
  });
});
