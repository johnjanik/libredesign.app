/**
 * Texture Manager
 *
 * Manages WebGL textures for image rendering.
 * Handles texture loading, caching, and lifecycle.
 */

import type { WebGLContext } from '../core/webgl-context';

/**
 * Texture entry in the cache
 */
export interface TextureEntry {
  /** WebGL texture object */
  readonly texture: WebGLTexture;
  /** Texture width in pixels */
  readonly width: number;
  /** Texture height in pixels */
  readonly height: number;
  /** Whether this texture has premultiplied alpha */
  readonly premultipliedAlpha: boolean;
  /** Reference count for garbage collection */
  refCount: number;
  /** Last time this texture was used */
  lastUsed: number;
}

/**
 * Texture loading options
 */
export interface TextureLoadOptions {
  /** Minification filter (default: LINEAR_MIPMAP_LINEAR) */
  readonly minFilter?: number;
  /** Magnification filter (default: LINEAR) */
  readonly magFilter?: number;
  /** Horizontal wrap mode (default: CLAMP_TO_EDGE) */
  readonly wrapS?: number;
  /** Vertical wrap mode (default: CLAMP_TO_EDGE) */
  readonly wrapT?: number;
  /** Whether to generate mipmaps (default: true) */
  readonly generateMipmaps?: boolean;
  /** Whether the source has premultiplied alpha (default: false) */
  readonly premultipliedAlpha?: boolean;
  /** Flip texture vertically on upload (default: true) */
  readonly flipY?: boolean;
}

/**
 * Texture manager configuration
 */
export interface TextureManagerConfig {
  /** Maximum number of textures to keep in cache */
  readonly maxCacheSize?: number;
  /** Time in ms before unused textures are eligible for eviction */
  readonly evictionTimeout?: number;
}

const DEFAULT_MAX_CACHE_SIZE = 100;
const DEFAULT_EVICTION_TIMEOUT = 30000; // 30 seconds

/**
 * Manages WebGL textures with caching and reference counting
 */
export class TextureManager {
  private ctx: WebGLContext;
  private textures: Map<string, TextureEntry> = new Map();
  private maxCacheSize: number;
  private evictionTimeout: number;
  private disposed = false;

  constructor(ctx: WebGLContext, config: TextureManagerConfig = {}) {
    this.ctx = ctx;
    this.maxCacheSize = config.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;
    this.evictionTimeout = config.evictionTimeout ?? DEFAULT_EVICTION_TIMEOUT;
  }

  /**
   * Load a texture from an image element
   */
  loadFromImage(
    key: string,
    image: HTMLImageElement | ImageBitmap,
    options: TextureLoadOptions = {}
  ): TextureEntry {
    this.checkDisposed();

    // Return existing texture if already loaded
    const existing = this.textures.get(key);
    if (existing) {
      existing.refCount++;
      existing.lastUsed = Date.now();
      return existing;
    }

    const gl = this.ctx.gl;
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create WebGL texture');
    }

    const {
      minFilter = gl.LINEAR_MIPMAP_LINEAR,
      magFilter = gl.LINEAR,
      wrapS = gl.CLAMP_TO_EDGE,
      wrapT = gl.CLAMP_TO_EDGE,
      generateMipmaps = true,
      premultipliedAlpha = false,
      flipY = true,
    } = options;

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set flip state
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultipliedAlpha);

    // Upload image data
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image
    );

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);

    // Generate mipmaps if requested
    if (generateMipmaps && isPowerOfTwo(image.width) && isPowerOfTwo(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    } else if (minFilter === gl.LINEAR_MIPMAP_LINEAR || minFilter === gl.LINEAR_MIPMAP_NEAREST) {
      // Use linear filtering if mipmaps not available
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);

    // Reset pixel store state
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    const entry: TextureEntry = {
      texture,
      width: image.width,
      height: image.height,
      premultipliedAlpha,
      refCount: 1,
      lastUsed: Date.now(),
    };

    this.textures.set(key, entry);
    this.maybeEvict();

    return entry;
  }

  /**
   * Load a texture from raw pixel data
   */
  loadFromData(
    key: string,
    width: number,
    height: number,
    data: Uint8Array | Uint8ClampedArray | null,
    options: TextureLoadOptions = {}
  ): TextureEntry {
    this.checkDisposed();

    // Return existing texture if already loaded
    const existing = this.textures.get(key);
    if (existing) {
      existing.refCount++;
      existing.lastUsed = Date.now();
      return existing;
    }

    const gl = this.ctx.gl;
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create WebGL texture');
    }

    const {
      minFilter = gl.LINEAR,
      magFilter = gl.LINEAR,
      wrapS = gl.CLAMP_TO_EDGE,
      wrapT = gl.CLAMP_TO_EDGE,
      generateMipmaps = false,
      premultipliedAlpha = false,
    } = options;

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Upload pixel data
    if (data) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data
      );
    } else {
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
    }

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);

    // Generate mipmaps if requested
    if (generateMipmaps && isPowerOfTwo(width) && isPowerOfTwo(height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);

    const entry: TextureEntry = {
      texture,
      width,
      height,
      premultipliedAlpha,
      refCount: 1,
      lastUsed: Date.now(),
    };

    this.textures.set(key, entry);
    this.maybeEvict();

    return entry;
  }

  /**
   * Get a texture by key
   */
  getTexture(key: string): TextureEntry | null {
    const entry = this.textures.get(key);
    if (entry) {
      entry.lastUsed = Date.now();
    }
    return entry ?? null;
  }

  /**
   * Check if a texture is loaded
   */
  hasTexture(key: string): boolean {
    return this.textures.has(key);
  }

  /**
   * Acquire a reference to a texture (increment ref count)
   */
  acquire(key: string): TextureEntry | null {
    const entry = this.textures.get(key);
    if (entry) {
      entry.refCount++;
      entry.lastUsed = Date.now();
    }
    return entry ?? null;
  }

  /**
   * Release a reference to a texture (decrement ref count)
   */
  release(key: string): void {
    const entry = this.textures.get(key);
    if (entry) {
      entry.refCount = Math.max(0, entry.refCount - 1);
    }
  }

  /**
   * Force delete a texture
   */
  deleteTexture(key: string): void {
    const entry = this.textures.get(key);
    if (entry) {
      this.ctx.gl.deleteTexture(entry.texture);
      this.textures.delete(key);
    }
  }

  /**
   * Bind a texture to a texture unit
   */
  bindTexture(key: string, unit: number = 0): boolean {
    const entry = this.textures.get(key);
    if (!entry) {
      return false;
    }

    const gl = this.ctx.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, entry.texture);
    entry.lastUsed = Date.now();
    return true;
  }

  /**
   * Bind a texture entry directly to a texture unit
   */
  bindTextureEntry(entry: TextureEntry, unit: number = 0): void {
    const gl = this.ctx.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, entry.texture);
  }

  /**
   * Get cache statistics
   */
  getStats(): { count: number; maxSize: number } {
    return {
      count: this.textures.size,
      maxSize: this.maxCacheSize,
    };
  }

  /**
   * Clear all textures with zero references
   */
  clearUnused(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.textures) {
      if (entry.refCount === 0 && now - entry.lastUsed > this.evictionTimeout) {
        this.ctx.gl.deleteTexture(entry.texture);
        this.textures.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Dispose all textures and resources
   */
  dispose(): void {
    if (this.disposed) return;

    for (const entry of this.textures.values()) {
      this.ctx.gl.deleteTexture(entry.texture);
    }
    this.textures.clear();
    this.disposed = true;
  }

  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('TextureManager has been disposed');
    }
  }

  private maybeEvict(): void {
    if (this.textures.size <= this.maxCacheSize) return;

    // Find and evict textures with zero references, oldest first
    const candidates: Array<{ key: string; lastUsed: number }> = [];

    for (const [key, entry] of this.textures) {
      if (entry.refCount === 0) {
        candidates.push({ key, lastUsed: entry.lastUsed });
      }
    }

    // Sort by last used time (oldest first)
    candidates.sort((a, b) => a.lastUsed - b.lastUsed);

    // Evict until we're under the limit
    const toEvict = this.textures.size - this.maxCacheSize;
    for (let i = 0; i < Math.min(toEvict, candidates.length); i++) {
      this.deleteTexture(candidates[i]!.key);
    }
  }
}

/**
 * Check if a number is a power of two
 */
function isPowerOfTwo(value: number): boolean {
  return (value & (value - 1)) === 0 && value !== 0;
}

/**
 * Create a texture manager
 */
export function createTextureManager(
  ctx: WebGLContext,
  config?: TextureManagerConfig
): TextureManager {
  return new TextureManager(ctx, config);
}
