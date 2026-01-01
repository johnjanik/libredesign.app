/**
 * HarfBuzz WASM Loader
 *
 * Loads and initializes the HarfBuzz WebAssembly module for text shaping.
 */
/**
 * HarfBuzz instance interface (from harfbuzzjs)
 */
export interface HarfBuzzInstance {
    hb_blob_create(data: Uint8Array): number;
    hb_blob_destroy(blob: number): void;
    hb_face_create(blob: number, index: number): number;
    hb_face_destroy(face: number): void;
    hb_font_create(face: number): number;
    hb_font_destroy(font: number): void;
    hb_font_set_scale(font: number, xScale: number, yScale: number): void;
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
    hb_shape(font: number, buffer: number, features: number, numFeatures: number): void;
    HB_DIRECTION_LTR: number;
    HB_DIRECTION_RTL: number;
    HB_DIRECTION_TTB: number;
    HB_DIRECTION_BTT: number;
    hb_tag_from_string(tag: string): number;
    hb_language_from_string(lang: string): number;
}
/**
 * Glyph info from HarfBuzz
 */
export interface GlyphInfo {
    readonly codepoint: number;
    readonly cluster: number;
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
 * Load HarfBuzz WASM module.
 */
export declare function loadHarfBuzz(wasmUrl?: string): Promise<HarfBuzzInstance>;
/**
 * Get the current HarfBuzz instance (throws if not loaded).
 */
export declare function getHarfBuzz(): HarfBuzzInstance;
/**
 * Check if HarfBuzz is loaded.
 */
export declare function isHarfBuzzLoaded(): boolean;
/**
 * Get direction constant from string.
 */
export declare function getDirectionConstant(hb: HarfBuzzInstance, direction: TextDirection): number;
//# sourceMappingURL=harfbuzz-loader.d.ts.map