/**
 * Font Manager
 *
 * Manages font loading, caching, and fallback chains.
 */

import type { HarfBuzzShaper, FontHandle } from '../shaping/harfbuzz-shaper';

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
export type FontStretch =
  | 'ultra-condensed'
  | 'extra-condensed'
  | 'condensed'
  | 'semi-condensed'
  | 'normal'
  | 'semi-expanded'
  | 'expanded'
  | 'extra-expanded'
  | 'ultra-expanded';

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
export class FontManager {
  private shaper: HarfBuzzShaper;
  private fonts: Map<string, FontMetadata> = new Map();
  private familyFonts: Map<string, Set<string>> = new Map();
  private loadingFonts: Map<string, Promise<FontHandle>> = new Map();
  private fallbackChain: string[] = ['sans-serif'];

  constructor(shaper: HarfBuzzShaper) {
    this.shaper = shaper;
  }

  // =========================================================================
  // Font Loading
  // =========================================================================

  /**
   * Load a font from a URL.
   */
  async loadFont(request: FontLoadRequest): Promise<FontMetadata> {
    const {
      family,
      weight = 400,
      style = 'normal',
      stretch = 'normal',
      url,
    } = request;

    const id = this.buildFontId(family, weight, style, stretch);

    // Check if already loaded
    const existing = this.fonts.get(id);
    if (existing) {
      return existing;
    }

    // Check if already loading
    const loading = this.loadingFonts.get(id);
    if (loading) {
      await loading;
      return this.fonts.get(id)!;
    }

    // Start loading
    const loadPromise = this.doLoadFont(id, family, weight, style, stretch, url);
    this.loadingFonts.set(id, loadPromise);

    try {
      await loadPromise;
      return this.fonts.get(id)!;
    } finally {
      this.loadingFonts.delete(id);
    }
  }

  /**
   * Internal font loading.
   */
  private async doLoadFont(
    id: string,
    family: string,
    weight: FontWeight,
    style: FontStyle,
    stretch: FontStretch,
    url?: string
  ): Promise<FontHandle> {
    let fontData: Uint8Array;

    if (url) {
      // Load from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load font from ${url}: ${response.status}`);
      }
      fontData = new Uint8Array(await response.arrayBuffer());
    } else {
      // Try to load system font (not supported in browser, would need fallback)
      throw new Error(`System font loading not supported. Provide a URL for ${family}`);
    }

    // Load into shaper
    const handle = this.shaper.loadFont(id, fontData);

    // Store metadata
    const metadata: FontMetadata = {
      id,
      family,
      weight,
      style,
      stretch,
      source: url ? 'custom' : 'system',
      url,
    };

    this.fonts.set(id, metadata);

    // Add to family index
    let familySet = this.familyFonts.get(family);
    if (!familySet) {
      familySet = new Set();
      this.familyFonts.set(family, familySet);
    }
    familySet.add(id);

    return handle;
  }

  /**
   * Load a font from ArrayBuffer.
   */
  loadFontFromData(
    family: string,
    data: Uint8Array,
    weight: FontWeight = 400,
    style: FontStyle = 'normal',
    stretch: FontStretch = 'normal'
  ): FontMetadata {
    const id = this.buildFontId(family, weight, style, stretch);

    // Check if already loaded
    const existing = this.fonts.get(id);
    if (existing) {
      return existing;
    }

    // Load into shaper
    this.shaper.loadFont(id, data);

    // Store metadata
    const metadata: FontMetadata = {
      id,
      family,
      weight,
      style,
      stretch,
      source: 'custom',
    };

    this.fonts.set(id, metadata);

    // Add to family index
    let familySet = this.familyFonts.get(family);
    if (!familySet) {
      familySet = new Set();
      this.familyFonts.set(family, familySet);
    }
    familySet.add(id);

    return metadata;
  }

  /**
   * Unload a font.
   */
  unloadFont(id: string): void {
    const metadata = this.fonts.get(id);
    if (!metadata) return;

    // Remove from shaper
    this.shaper.unloadFont(id);

    // Remove from family index
    const familySet = this.familyFonts.get(metadata.family);
    if (familySet) {
      familySet.delete(id);
      if (familySet.size === 0) {
        this.familyFonts.delete(metadata.family);
      }
    }

    this.fonts.delete(id);
  }

  // =========================================================================
  // Font Selection
  // =========================================================================

  /**
   * Find the best matching font for a descriptor.
   */
  findFont(descriptor: FontDescriptor): FontMetadata | null {
    const {
      family,
      weight = 400,
      style = 'normal',
      stretch = 'normal',
    } = descriptor;

    // Check exact match
    const exactId = this.buildFontId(family, weight, style, stretch);
    if (this.fonts.has(exactId)) {
      return this.fonts.get(exactId)!;
    }

    // Get all fonts for the family
    const familyFonts = this.familyFonts.get(family);
    if (!familyFonts || familyFonts.size === 0) {
      return this.findFallbackFont(descriptor);
    }

    // Find best match using CSS font matching algorithm
    let bestMatch: FontMetadata | null = null;
    let bestScore = -Infinity;

    for (const fontId of familyFonts) {
      const font = this.fonts.get(fontId)!;
      const score = this.calculateMatchScore(font, weight, style, stretch);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = font;
      }
    }

    return bestMatch;
  }

  /**
   * Find a fallback font.
   */
  private findFallbackFont(descriptor: FontDescriptor): FontMetadata | null {
    for (const fallbackFamily of this.fallbackChain) {
      const fallbackFonts = this.familyFonts.get(fallbackFamily);
      if (fallbackFonts && fallbackFonts.size > 0) {
        return this.findFont({ ...descriptor, family: fallbackFamily });
      }
    }
    return null;
  }

  /**
   * Calculate match score for font selection.
   */
  private calculateMatchScore(
    font: FontMetadata,
    targetWeight: FontWeight,
    targetStyle: FontStyle,
    targetStretch: FontStretch
  ): number {
    let score = 0;

    // Style matching (exact or close)
    if (font.style === targetStyle) {
      score += 1000;
    } else if (
      (font.style === 'italic' && targetStyle === 'oblique') ||
      (font.style === 'oblique' && targetStyle === 'italic')
    ) {
      score += 500;
    }

    // Weight matching (prefer closer weights)
    const weightDiff = Math.abs(font.weight - targetWeight);
    score -= weightDiff;

    // Stretch matching
    const stretchOrder = [
      'ultra-condensed', 'extra-condensed', 'condensed', 'semi-condensed',
      'normal', 'semi-expanded', 'expanded', 'extra-expanded', 'ultra-expanded',
    ];
    const fontStretchIndex = stretchOrder.indexOf(font.stretch);
    const targetStretchIndex = stretchOrder.indexOf(targetStretch);
    const stretchDiff = Math.abs(fontStretchIndex - targetStretchIndex);
    score -= stretchDiff * 50;

    return score;
  }

  // =========================================================================
  // Fallback Chain
  // =========================================================================

  /**
   * Set the fallback font chain.
   */
  setFallbackChain(families: string[]): void {
    this.fallbackChain = [...families];
  }

  /**
   * Get the fallback font chain.
   */
  getFallbackChain(): readonly string[] {
    return this.fallbackChain;
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /**
   * Build a unique font ID.
   */
  private buildFontId(
    family: string,
    weight: FontWeight,
    style: FontStyle,
    stretch: FontStretch
  ): string {
    return `${family}:${weight}:${style}:${stretch}`;
  }

  /**
   * Get all loaded fonts.
   */
  getAllFonts(): readonly FontMetadata[] {
    return Array.from(this.fonts.values());
  }

  /**
   * Get all loaded font families.
   */
  getAllFamilies(): readonly string[] {
    return Array.from(this.familyFonts.keys());
  }

  /**
   * Check if a font is loaded.
   */
  hasFont(id: string): boolean {
    return this.fonts.has(id);
  }

  /**
   * Check if a font family is loaded.
   */
  hasFamily(family: string): boolean {
    return this.familyFonts.has(family);
  }

  /**
   * Dispose of all fonts.
   */
  dispose(): void {
    for (const id of this.fonts.keys()) {
      this.unloadFont(id);
    }
  }
}

/**
 * Create a new font manager.
 */
export function createFontManager(shaper: HarfBuzzShaper): FontManager {
  return new FontManager(shaper);
}
