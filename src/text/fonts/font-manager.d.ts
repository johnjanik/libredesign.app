/**
 * Font Manager
 *
 * Manages font loading, caching, and fallback chains.
 */
import type { HarfBuzzShaper } from '../shaping/harfbuzz-shaper';
/**
 * Font weight values
 */
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
/**
 * Font style
 */
export type FontStyle = 'normal' | 'italic' | 'oblique';
/**
 * Font stretch values
 */
export type FontStretch = 'ultra-condensed' | 'extra-condensed' | 'condensed' | 'semi-condensed' | 'normal' | 'semi-expanded' | 'expanded' | 'extra-expanded' | 'ultra-expanded';
/**
 * Font descriptor for matching
 */
export interface FontDescriptor {
    readonly family: string;
    readonly weight?: FontWeight;
    readonly style?: FontStyle;
    readonly stretch?: FontStretch;
}
/**
 * Loaded font metadata
 */
export interface FontMetadata {
    readonly id: string;
    readonly family: string;
    readonly weight: FontWeight;
    readonly style: FontStyle;
    readonly stretch: FontStretch;
    readonly source: 'system' | 'custom' | 'google';
    readonly url?: string;
}
/**
 * Font load request
 */
export interface FontLoadRequest {
    readonly family: string;
    readonly weight?: FontWeight;
    readonly style?: FontStyle;
    readonly stretch?: FontStretch;
    readonly url?: string;
}
/**
 * Font Manager - handles font loading and selection
 */
export declare class FontManager {
    private shaper;
    private fonts;
    private familyFonts;
    private loadingFonts;
    private fallbackChain;
    constructor(shaper: HarfBuzzShaper);
    /**
     * Load a font from a URL.
     */
    loadFont(request: FontLoadRequest): Promise<FontMetadata>;
    /**
     * Internal font loading.
     */
    private doLoadFont;
    /**
     * Load a font from ArrayBuffer.
     */
    loadFontFromData(family: string, data: Uint8Array, weight?: FontWeight, style?: FontStyle, stretch?: FontStretch): FontMetadata;
    /**
     * Unload a font.
     */
    unloadFont(id: string): void;
    /**
     * Find the best matching font for a descriptor.
     */
    findFont(descriptor: FontDescriptor): FontMetadata | null;
    /**
     * Find a fallback font.
     */
    private findFallbackFont;
    /**
     * Calculate match score for font selection.
     */
    private calculateMatchScore;
    /**
     * Set the fallback font chain.
     */
    setFallbackChain(families: string[]): void;
    /**
     * Get the fallback font chain.
     */
    getFallbackChain(): readonly string[];
    /**
     * Build a unique font ID.
     */
    private buildFontId;
    /**
     * Get all loaded fonts.
     */
    getAllFonts(): readonly FontMetadata[];
    /**
     * Get all loaded font families.
     */
    getAllFamilies(): readonly string[];
    /**
     * Check if a font is loaded.
     */
    hasFont(id: string): boolean;
    /**
     * Check if a font family is loaded.
     */
    hasFamily(family: string): boolean;
    /**
     * Dispose of all fonts.
     */
    dispose(): void;
}
/**
 * Create a new font manager.
 */
export declare function createFontManager(shaper: HarfBuzzShaper): FontManager;
//# sourceMappingURL=font-manager.d.ts.map