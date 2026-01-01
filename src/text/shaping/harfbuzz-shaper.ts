/**
 * HarfBuzz Text Shaper
 *
 * High-level text shaping API with caching for performance.
 */

import {
  getHarfBuzz,
  getDirectionConstant,
  type HarfBuzzInstance,
  type TextDirection,
} from './harfbuzz-loader';

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
export class HarfBuzzShaper {
  private hb: HarfBuzzInstance;
  private fonts: Map<string, FontHandle> = new Map();
  private cache: Map<string, ShapingResult> = new Map();
  private cacheMaxSize = 1000;

  constructor() {
    this.hb = getHarfBuzz();
  }

  // =========================================================================
  // Font Management
  // =========================================================================

  /**
   * Load a font from binary data.
   */
  loadFont(id: string, data: Uint8Array): FontHandle {
    // Check if already loaded
    const existing = this.fonts.get(id);
    if (existing) {
      return existing;
    }

    // Create HarfBuzz font objects
    const blob = this.hb.hb_blob_create(data);
    const face = this.hb.hb_face_create(blob, 0);
    const font = this.hb.hb_font_create(face);

    // Get units per em for scaling
    // Default to 1000 if not available
    const upem = 1000;

    const handle: FontHandle = {
      id,
      blob,
      face,
      font,
      upem,
    };

    this.fonts.set(id, handle);
    return handle;
  }

  /**
   * Unload a font.
   */
  unloadFont(id: string): void {
    const handle = this.fonts.get(id);
    if (!handle) return;

    // Destroy HarfBuzz objects
    this.hb.hb_font_destroy(handle.font);
    this.hb.hb_face_destroy(handle.face);
    this.hb.hb_blob_destroy(handle.blob);

    this.fonts.delete(id);

    // Clear cache entries for this font
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${id}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get a loaded font.
   */
  getFont(id: string): FontHandle | null {
    return this.fonts.get(id) ?? null;
  }

  /**
   * Check if a font is loaded.
   */
  hasFont(id: string): boolean {
    return this.fonts.has(id);
  }

  // =========================================================================
  // Text Shaping
  // =========================================================================

  /**
   * Shape text using a loaded font.
   */
  shape(fontId: string, text: string, options: ShapingOptions): ShapingResult {
    const font = this.fonts.get(fontId);
    if (!font) {
      throw new Error(`Font ${fontId} not loaded`);
    }

    // Check cache
    const cacheKey = this.buildCacheKey(fontId, text, options);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Perform shaping
    const result = this.doShape(font, text, options);

    // Cache result
    this.addToCache(cacheKey, result);

    return result;
  }

  /**
   * Internal shaping implementation.
   */
  private doShape(font: FontHandle, text: string, options: ShapingOptions): ShapingResult {
    const { fontSize, direction = 'ltr', language, script } = options;

    // Set font scale
    const scale = Math.round((fontSize / font.upem) * 64 * font.upem);
    this.hb.hb_font_set_scale(font.font, scale, scale);

    // Create buffer
    const buffer = this.hb.hb_buffer_create();

    try {
      // Add text to buffer
      this.hb.hb_buffer_add_utf8(buffer, text, 0, text.length);

      // Set direction
      this.hb.hb_buffer_set_direction(buffer, getDirectionConstant(this.hb, direction));

      // Set script if provided
      if (script) {
        this.hb.hb_buffer_set_script(buffer, this.hb.hb_tag_from_string(script));
      }

      // Set language if provided
      if (language) {
        this.hb.hb_buffer_set_language(buffer, this.hb.hb_language_from_string(language));
      }

      // Guess segment properties for any not set
      this.hb.hb_buffer_guess_segment_properties(buffer);

      // Shape the text (no features for now)
      this.hb.hb_shape(font.font, buffer, 0, 0);

      // Get results
      const infos = this.hb.hb_buffer_get_glyph_infos(buffer);
      const positions = this.hb.hb_buffer_get_glyph_positions(buffer);

      // Convert to our format
      const glyphs: ShapedGlyph[] = [];
      let totalWidth = 0;
      let maxHeight = 0;

      const scaleFactor = fontSize / (font.upem * 64);

      for (let i = 0; i < infos.length; i++) {
        const info = infos[i]!;
        const pos = positions[i]!;

        const xAdvance = pos.xAdvance * scaleFactor;
        const yAdvance = pos.yAdvance * scaleFactor;
        const xOffset = pos.xOffset * scaleFactor;
        const yOffset = pos.yOffset * scaleFactor;

        glyphs.push({
          glyphId: info.codepoint,
          cluster: info.cluster,
          xAdvance,
          yAdvance,
          xOffset,
          yOffset,
        });

        totalWidth += xAdvance;
        maxHeight = Math.max(maxHeight, fontSize + yOffset);
      }

      return {
        glyphs,
        width: totalWidth,
        height: maxHeight || fontSize,
      };
    } finally {
      // Clean up buffer
      this.hb.hb_buffer_destroy(buffer);
    }
  }

  // =========================================================================
  // Caching
  // =========================================================================

  /**
   * Build a cache key.
   */
  private buildCacheKey(fontId: string, text: string, options: ShapingOptions): string {
    const optStr = JSON.stringify({
      fontSize: options.fontSize,
      direction: options.direction ?? 'ltr',
      language: options.language,
      script: options.script,
      features: options.features,
    });
    return `${fontId}:${text}:${optStr}`;
  }

  /**
   * Add to cache with LRU eviction.
   */
  private addToCache(key: string, result: ShapingResult): void {
    // Simple FIFO eviction if cache is full
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, result);
  }

  /**
   * Clear the shaping cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set maximum cache size.
   */
  setCacheMaxSize(size: number): void {
    this.cacheMaxSize = size;
    // Evict if necessary
    while (this.cache.size > this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /**
   * Measure text width without full shaping result.
   */
  measureWidth(fontId: string, text: string, fontSize: number): number {
    const result = this.shape(fontId, text, { fontSize });
    return result.width;
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    // Unload all fonts
    for (const id of this.fonts.keys()) {
      this.unloadFont(id);
    }

    this.cache.clear();
  }
}

/**
 * Create a new HarfBuzz shaper.
 */
export function createShaper(): HarfBuzzShaper {
  return new HarfBuzzShaper();
}
