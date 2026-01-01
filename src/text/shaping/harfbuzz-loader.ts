/**
 * HarfBuzz WASM Loader
 *
 * Loads and initializes the HarfBuzz WebAssembly module for text shaping.
 */

/**
 * HarfBuzz instance interface (from harfbuzzjs)
 */
export interface HarfBuzzInstance {
  // Font functions
  hb_blob_create(data: Uint8Array): number;
  hb_blob_destroy(blob: number): void;
  hb_face_create(blob: number, index: number): number;
  hb_face_destroy(face: number): void;
  hb_font_create(face: number): number;
  hb_font_destroy(font: number): void;
  hb_font_set_scale(font: number, xScale: number, yScale: number): void;

  // Buffer functions
  hb_buffer_create(): number;
  hb_buffer_destroy(buffer: number): void;
  hb_buffer_add_utf8(buffer: number, text: string, itemOffset: number, itemLength: number): void;
  hb_buffer_set_direction(buffer: number, direction: number): void;
  hb_buffer_set_script(buffer: number, script: number): void;
  hb_buffer_set_language(buffer: number, language: number): void;
  hb_buffer_guess_segment_properties(buffer: number): void;
  hb_buffer_get_length(buffer: number): number;
  hb_buffer_get_glyph_infos(buffer: number): GlyphInfo[];
  hb_buffer_get_glyph_positions(buffer: number): GlyphPosition[];

  // Shaping
  hb_shape(font: number, buffer: number, features: number, numFeatures: number): void;

  // Direction constants
  HB_DIRECTION_LTR: number;
  HB_DIRECTION_RTL: number;
  HB_DIRECTION_TTB: number;
  HB_DIRECTION_BTT: number;

  // Script helper
  hb_tag_from_string(tag: string): number;

  // Language helper
  hb_language_from_string(lang: string): number;
}

/**
 * Glyph info from HarfBuzz
 */
export interface GlyphInfo {
  readonly codepoint: number;  // Glyph ID
  readonly cluster: number;    // Character cluster index
}

/**
 * Glyph position from HarfBuzz
 */
export interface GlyphPosition {
  readonly xAdvance: number;
  readonly yAdvance: number;
  readonly xOffset: number;
  readonly yOffset: number;
}

/**
 * Text direction
 */
export type TextDirection = 'ltr' | 'rtl' | 'ttb' | 'btt';

/**
 * HarfBuzz loader state
 */
let hbInstance: HarfBuzzInstance | null = null;
let loadPromise: Promise<HarfBuzzInstance> | null = null;

/**
 * Load HarfBuzz WASM module.
 */
export async function loadHarfBuzz(wasmUrl?: string): Promise<HarfBuzzInstance> {
  // Return cached instance if already loaded
  if (hbInstance) {
    return hbInstance;
  }

  // Return existing load promise if loading
  if (loadPromise) {
    return loadPromise;
  }

  // Start loading
  loadPromise = doLoadHarfBuzz(wasmUrl);

  try {
    hbInstance = await loadPromise;
    return hbInstance;
  } catch (error) {
    loadPromise = null;
    throw error;
  }
}

/**
 * Internal loader function.
 */
async function doLoadHarfBuzz(wasmUrl?: string): Promise<HarfBuzzInstance> {
  const url = wasmUrl ?? '/wasm/harfbuzz.wasm';

  try {
    // Dynamically import harfbuzzjs
    const hb = await import('harfbuzzjs');

    // Initialize the WASM module
    const instance = await hb.default({
      locateFile: () => url,
    });

    // Wrap the raw instance with our interface
    return wrapHarfBuzzInstance(instance);
  } catch (error) {
    console.error('Failed to load HarfBuzz WASM:', error);
    throw new Error(`Failed to load HarfBuzz WASM from ${url}: ${error}`);
  }
}

/**
 * Wrap raw HarfBuzz instance with typed interface.
 */
function wrapHarfBuzzInstance(raw: unknown): HarfBuzzInstance {
  const hb = raw as Record<string, unknown>;

  return {
    // Font functions
    hb_blob_create: (data: Uint8Array) => {
      const ptr = (hb['malloc'] as (size: number) => number)(data.length);
      (hb['HEAPU8'] as Uint8Array).set(data, ptr);
      return (hb['hb_blob_create'] as Function)(ptr, data.length, 2 /* HB_MEMORY_MODE_WRITABLE */, ptr, hb['free']);
    },
    hb_blob_destroy: hb['hb_blob_destroy'] as (blob: number) => void,
    hb_face_create: hb['hb_face_create'] as (blob: number, index: number) => number,
    hb_face_destroy: hb['hb_face_destroy'] as (face: number) => void,
    hb_font_create: hb['hb_font_create'] as (face: number) => number,
    hb_font_destroy: hb['hb_font_destroy'] as (font: number) => void,
    hb_font_set_scale: hb['hb_font_set_scale'] as (font: number, x: number, y: number) => void,

    // Buffer functions
    hb_buffer_create: hb['hb_buffer_create'] as () => number,
    hb_buffer_destroy: hb['hb_buffer_destroy'] as (buffer: number) => void,
    hb_buffer_add_utf8: (buffer: number, text: string, offset: number, length: number) => {
      // Convert string to UTF-8 bytes
      const encoder = new TextEncoder();
      const bytes = encoder.encode(text);
      const ptr = (hb['malloc'] as (size: number) => number)(bytes.length);
      (hb['HEAPU8'] as Uint8Array).set(bytes, ptr);
      (hb['hb_buffer_add_utf8'] as Function)(buffer, ptr, bytes.length, offset, length);
      (hb['free'] as (ptr: number) => void)(ptr);
    },
    hb_buffer_set_direction: hb['hb_buffer_set_direction'] as (buffer: number, direction: number) => void,
    hb_buffer_set_script: hb['hb_buffer_set_script'] as (buffer: number, script: number) => void,
    hb_buffer_set_language: hb['hb_buffer_set_language'] as (buffer: number, language: number) => void,
    hb_buffer_guess_segment_properties: hb['hb_buffer_guess_segment_properties'] as (buffer: number) => void,
    hb_buffer_get_length: hb['hb_buffer_get_length'] as (buffer: number) => number,
    hb_buffer_get_glyph_infos: (buffer: number) => {
      const length = (hb['hb_buffer_get_length'] as (b: number) => number)(buffer);
      const infos: GlyphInfo[] = [];
      const ptr = (hb['hb_buffer_get_glyph_infos'] as (b: number, out: number) => number)(buffer, 0);
      const heap32 = hb['HEAP32'] as Int32Array;

      for (let i = 0; i < length; i++) {
        const offset = ptr + i * 20; // sizeof(hb_glyph_info_t) = 20
        const codepoint = heap32[offset / 4]!;
        const cluster = heap32[offset / 4 + 2]!;
        infos.push({ codepoint, cluster });
      }

      return infos;
    },
    hb_buffer_get_glyph_positions: (buffer: number) => {
      const length = (hb['hb_buffer_get_length'] as (b: number) => number)(buffer);
      const positions: GlyphPosition[] = [];
      const ptr = (hb['hb_buffer_get_glyph_positions'] as (b: number, out: number) => number)(buffer, 0);
      const heap32 = hb['HEAP32'] as Int32Array;

      for (let i = 0; i < length; i++) {
        const offset = ptr + i * 20; // sizeof(hb_glyph_position_t) = 20
        positions.push({
          xAdvance: heap32[offset / 4]!,
          yAdvance: heap32[offset / 4 + 1]!,
          xOffset: heap32[offset / 4 + 2]!,
          yOffset: heap32[offset / 4 + 3]!,
        });
      }

      return positions;
    },

    // Shaping
    hb_shape: hb['hb_shape'] as (font: number, buffer: number, features: number, numFeatures: number) => void,

    // Direction constants
    HB_DIRECTION_LTR: 4,
    HB_DIRECTION_RTL: 5,
    HB_DIRECTION_TTB: 6,
    HB_DIRECTION_BTT: 7,

    // Helpers
    hb_tag_from_string: (tag: string) => {
      const bytes = new TextEncoder().encode(tag.padEnd(4, ' '));
      return (bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!;
    },
    hb_language_from_string: hb['hb_language_from_string'] as (lang: string) => number,
  };
}

/**
 * Get the current HarfBuzz instance (throws if not loaded).
 */
export function getHarfBuzz(): HarfBuzzInstance {
  if (!hbInstance) {
    throw new Error('HarfBuzz not loaded. Call loadHarfBuzz() first.');
  }
  return hbInstance;
}

/**
 * Check if HarfBuzz is loaded.
 */
export function isHarfBuzzLoaded(): boolean {
  return hbInstance !== null;
}

/**
 * Get direction constant from string.
 */
export function getDirectionConstant(hb: HarfBuzzInstance, direction: TextDirection): number {
  switch (direction) {
    case 'ltr': return hb.HB_DIRECTION_LTR;
    case 'rtl': return hb.HB_DIRECTION_RTL;
    case 'ttb': return hb.HB_DIRECTION_TTB;
    case 'btt': return hb.HB_DIRECTION_BTT;
  }
}
