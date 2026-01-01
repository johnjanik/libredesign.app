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
/**
 * Manages WebGL textures with caching and reference counting
 */
export declare class TextureManager {
    private ctx;
    private textures;
    private maxCacheSize;
    private evictionTimeout;
    private disposed;
    constructor(ctx: WebGLContext, config?: TextureManagerConfig);
    /**
     * Load a texture from an image element
     */
    loadFromImage(key: string, image: HTMLImageElement | ImageBitmap, options?: TextureLoadOptions): TextureEntry;
    /**
     * Load a texture from raw pixel data
     */
    loadFromData(key: string, width: number, height: number, data: Uint8Array | Uint8ClampedArray | null, options?: TextureLoadOptions): TextureEntry;
    /**
     * Get a texture by key
     */
    getTexture(key: string): TextureEntry | null;
    /**
     * Check if a texture is loaded
     */
    hasTexture(key: string): boolean;
    /**
     * Acquire a reference to a texture (increment ref count)
     */
    acquire(key: string): TextureEntry | null;
    /**
     * Release a reference to a texture (decrement ref count)
     */
    release(key: string): void;
    /**
     * Force delete a texture
     */
    deleteTexture(key: string): void;
    /**
     * Bind a texture to a texture unit
     */
    bindTexture(key: string, unit?: number): boolean;
    /**
     * Bind a texture entry directly to a texture unit
     */
    bindTextureEntry(entry: TextureEntry, unit?: number): void;
    /**
     * Get cache statistics
     */
    getStats(): {
        count: number;
        maxSize: number;
    };
    /**
     * Clear all textures with zero references
     */
    clearUnused(): number;
    /**
     * Dispose all textures and resources
     */
    dispose(): void;
    private checkDisposed;
    private maybeEvict;
}
/**
 * Create a texture manager
 */
export declare function createTextureManager(ctx: WebGLContext, config?: TextureManagerConfig): TextureManager;
//# sourceMappingURL=texture-manager.d.ts.map