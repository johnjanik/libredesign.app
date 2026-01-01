/**
 * HarfBuzz Text Shaper
 *
 * High-level text shaping API with caching for performance.
 */
import { type TextDirection } from './harfbuzz-loader';
/**
 * Shaped glyph with position information
 */
export interface ShapedGlyph {
    readonly glyphId: number;
    readonly cluster: number;
    readonly xAdvance: number;
    readonly yAdvance: number;
    readonly xOffset: number;
    readonly yOffset: number;
}
/**
 * Result of text shaping
 */
export interface ShapingResult {
    readonly glyphs: readonly ShapedGlyph[];
    readonly width: number;
    readonly height: number;
}
/**
 * Shaping options
 */
export interface ShapingOptions {
    readonly fontSize: number;
    readonly direction?: TextDirection;
    readonly language?: string;
    readonly script?: string;
    readonly features?: readonly string[];
}
/**
 * Font handle for HarfBuzz
 */
export interface FontHandle {
    readonly id: string;
    readonly blob: number;
    readonly face: number;
    readonly font: number;
    readonly upem: number;
}
/**
 * HarfBuzz Text Shaper with caching
 */
export declare class HarfBuzzShaper {
    private hb;
    private fonts;
    private cache;
    private cacheMaxSize;
    constructor();
    /**
     * Load a font from binary data.
     */
    loadFont(id: string, data: Uint8Array): FontHandle;
    /**
     * Unload a font.
     */
    unloadFont(id: string): void;
    /**
     * Get a loaded font.
     */
    getFont(id: string): FontHandle | null;
    /**
     * Check if a font is loaded.
     */
    hasFont(id: string): boolean;
    /**
     * Shape text using a loaded font.
     */
    shape(fontId: string, text: string, options: ShapingOptions): ShapingResult;
    /**
     * Internal shaping implementation.
     */
    private doShape;
    /**
     * Build a cache key.
     */
    private buildCacheKey;
    /**
     * Add to cache with LRU eviction.
     */
    private addToCache;
    /**
     * Clear the shaping cache.
     */
    clearCache(): void;
    /**
     * Set maximum cache size.
     */
    setCacheMaxSize(size: number): void;
    /**
     * Measure text width without full shaping result.
     */
    measureWidth(fontId: string, text: string, fontSize: number): number;
    /**
     * Dispose of all resources.
     */
    dispose(): void;
}
/**
 * Create a new HarfBuzz shaper.
 */
export declare function createShaper(): HarfBuzzShaper;
//# sourceMappingURL=harfbuzz-shaper.d.ts.map