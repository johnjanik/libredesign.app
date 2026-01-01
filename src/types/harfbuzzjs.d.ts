/**
 * Type declarations for harfbuzzjs
 */

declare module 'harfbuzzjs' {
  export interface HarfBuzzModule {
    // Memory
    malloc(size: number): number;
    free(ptr: number): void;
    HEAPU8: Uint8Array;
    HEAP32: Int32Array;

    // Font functions
    hb_blob_create(data: number, length: number, mode: number, userData: number, destroy: unknown): number;
    hb_blob_destroy(blob: number): void;
    hb_face_create(blob: number, index: number): number;
    hb_face_destroy(face: number): void;
    hb_font_create(face: number): number;
    hb_font_destroy(font: number): void;
    hb_font_set_scale(font: number, xScale: number, yScale: number): void;

    // Buffer functions
    hb_buffer_create(): number;
    hb_buffer_destroy(buffer: number): void;
    hb_buffer_add_utf8(buffer: number, text: number, textLength: number, itemOffset: number, itemLength: number): void;
    hb_buffer_set_direction(buffer: number, direction: number): void;
    hb_buffer_set_script(buffer: number, script: number): void;
    hb_buffer_set_language(buffer: number, language: number): void;
    hb_buffer_guess_segment_properties(buffer: number): void;
    hb_buffer_get_length(buffer: number): number;
    hb_buffer_get_glyph_infos(buffer: number, length: number): number;
    hb_buffer_get_glyph_positions(buffer: number, length: number): number;

    // Shaping
    hb_shape(font: number, buffer: number, features: number, numFeatures: number): void;

    // Helpers
    hb_language_from_string(lang: string): number;
  }

  export interface HarfBuzzOptions {
    locateFile?: (file: string) => string;
  }

  export default function init(options?: HarfBuzzOptions): Promise<HarfBuzzModule>;
}
