/**
 * HarfBuzz WASM Loader
 *
 * Loads and initializes the HarfBuzz WebAssembly module for text shaping.
 */
/**
 * HarfBuzz loader state
 */
let hbInstance = null;
let loadPromise = null;
/**
 * Load HarfBuzz WASM module.
 */
export async function loadHarfBuzz(wasmUrl) {
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
    }
    catch (error) {
        loadPromise = null;
        throw error;
    }
}
/**
 * Internal loader function.
 */
async function doLoadHarfBuzz(wasmUrl) {
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
    }
    catch (error) {
        console.error('Failed to load HarfBuzz WASM:', error);
        throw new Error(`Failed to load HarfBuzz WASM from ${url}: ${error}`);
    }
}
/**
 * Wrap raw HarfBuzz instance with typed interface.
 */
function wrapHarfBuzzInstance(raw) {
    const hb = raw;
    return {
        // Font functions
        hb_blob_create: (data) => {
            const ptr = hb['malloc'](data.length);
            hb['HEAPU8'].set(data, ptr);
            return hb['hb_blob_create'](ptr, data.length, 2 /* HB_MEMORY_MODE_WRITABLE */, ptr, hb['free']);
        },
        hb_blob_destroy: hb['hb_blob_destroy'],
        hb_face_create: hb['hb_face_create'],
        hb_face_destroy: hb['hb_face_destroy'],
        hb_font_create: hb['hb_font_create'],
        hb_font_destroy: hb['hb_font_destroy'],
        hb_font_set_scale: hb['hb_font_set_scale'],
        // Buffer functions
        hb_buffer_create: hb['hb_buffer_create'],
        hb_buffer_destroy: hb['hb_buffer_destroy'],
        hb_buffer_add_utf8: (buffer, text, offset, length) => {
            // Convert string to UTF-8 bytes
            const encoder = new TextEncoder();
            const bytes = encoder.encode(text);
            const ptr = hb['malloc'](bytes.length);
            hb['HEAPU8'].set(bytes, ptr);
            hb['hb_buffer_add_utf8'](buffer, ptr, bytes.length, offset, length);
            hb['free'](ptr);
        },
        hb_buffer_set_direction: hb['hb_buffer_set_direction'],
        hb_buffer_set_script: hb['hb_buffer_set_script'],
        hb_buffer_set_language: hb['hb_buffer_set_language'],
        hb_buffer_guess_segment_properties: hb['hb_buffer_guess_segment_properties'],
        hb_buffer_get_length: hb['hb_buffer_get_length'],
        hb_buffer_get_glyph_infos: (buffer) => {
            const length = hb['hb_buffer_get_length'](buffer);
            const infos = [];
            const ptr = hb['hb_buffer_get_glyph_infos'](buffer, 0);
            const heap32 = hb['HEAP32'];
            for (let i = 0; i < length; i++) {
                const offset = ptr + i * 20; // sizeof(hb_glyph_info_t) = 20
                const codepoint = heap32[offset / 4];
                const cluster = heap32[offset / 4 + 2];
                infos.push({ codepoint, cluster });
            }
            return infos;
        },
        hb_buffer_get_glyph_positions: (buffer) => {
            const length = hb['hb_buffer_get_length'](buffer);
            const positions = [];
            const ptr = hb['hb_buffer_get_glyph_positions'](buffer, 0);
            const heap32 = hb['HEAP32'];
            for (let i = 0; i < length; i++) {
                const offset = ptr + i * 20; // sizeof(hb_glyph_position_t) = 20
                positions.push({
                    xAdvance: heap32[offset / 4],
                    yAdvance: heap32[offset / 4 + 1],
                    xOffset: heap32[offset / 4 + 2],
                    yOffset: heap32[offset / 4 + 3],
                });
            }
            return positions;
        },
        // Shaping
        hb_shape: hb['hb_shape'],
        // Direction constants
        HB_DIRECTION_LTR: 4,
        HB_DIRECTION_RTL: 5,
        HB_DIRECTION_TTB: 6,
        HB_DIRECTION_BTT: 7,
        // Helpers
        hb_tag_from_string: (tag) => {
            const bytes = new TextEncoder().encode(tag.padEnd(4, ' '));
            return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
        },
        hb_language_from_string: hb['hb_language_from_string'],
    };
}
/**
 * Get the current HarfBuzz instance (throws if not loaded).
 */
export function getHarfBuzz() {
    if (!hbInstance) {
        throw new Error('HarfBuzz not loaded. Call loadHarfBuzz() first.');
    }
    return hbInstance;
}
/**
 * Check if HarfBuzz is loaded.
 */
export function isHarfBuzzLoaded() {
    return hbInstance !== null;
}
/**
 * Get direction constant from string.
 */
export function getDirectionConstant(hb, direction) {
    switch (direction) {
        case 'ltr': return hb.HB_DIRECTION_LTR;
        case 'rtl': return hb.HB_DIRECTION_RTL;
        case 'ttb': return hb.HB_DIRECTION_TTB;
        case 'btt': return hb.HB_DIRECTION_BTT;
    }
}
//# sourceMappingURL=harfbuzz-loader.js.map