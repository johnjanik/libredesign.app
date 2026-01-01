/**
 * Text Engine - Main coordinator for text rendering
 *
 * Integrates HarfBuzz shaping, font management, and glyph atlas.
 */
import { loadHarfBuzz } from './shaping/harfbuzz-loader';
import { createShaper } from './shaping/harfbuzz-shaper';
import { createFontManager } from './fonts/font-manager';
import { createGlyphAtlas } from './rendering/glyph-atlas';
import { EventEmitter } from '@core/events/event-emitter';
/**
 * Text Engine - coordinates text shaping and rendering
 */
export class TextEngine extends EventEmitter {
    shaper = null;
    fontManager = null;
    glyphAtlas;
    initialized = false;
    initPromise = null;
    constructor() {
        super();
        this.glyphAtlas = createGlyphAtlas();
    }
    // =========================================================================
    // Initialization
    // =========================================================================
    /**
     * Initialize the text engine.
     */
    async initialize(wasmUrl) {
        if (this.initialized) {
            return;
        }
        if (this.initPromise) {
            return this.initPromise;
        }
        this.initPromise = this.doInitialize(wasmUrl);
        try {
            await this.initPromise;
        }
        catch (error) {
            this.initPromise = null;
            throw error;
        }
    }
    /**
     * Internal initialization.
     */
    async doInitialize(wasmUrl) {
        // Load HarfBuzz WASM
        await loadHarfBuzz(wasmUrl);
        // Create shaper and font manager
        this.shaper = createShaper();
        this.fontManager = createFontManager(this.shaper);
        this.initialized = true;
        this.emit('initialized');
    }
    /**
     * Check if initialized.
     */
    isInitialized() {
        return this.initialized;
    }
    // =========================================================================
    // Font Loading
    // =========================================================================
    /**
     * Load a font from URL.
     */
    async loadFont(family, url, weight = 400, style = 'normal') {
        this.ensureInitialized();
        try {
            const font = await this.fontManager.loadFont({
                family,
                url,
                weight,
                style,
            });
            this.emit('font:loaded', { font });
            return font;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.emit('font:error', { family, error: err });
            throw err;
        }
    }
    /**
     * Load a font from data.
     */
    loadFontFromData(family, data, weight = 400, style = 'normal') {
        this.ensureInitialized();
        const font = this.fontManager.loadFontFromData(family, data, weight, style);
        this.emit('font:loaded', { font });
        return font;
    }
    /**
     * Find a font matching the descriptor.
     */
    findFont(descriptor) {
        this.ensureInitialized();
        return this.fontManager.findFont(descriptor);
    }
    // =========================================================================
    // Text Shaping
    // =========================================================================
    /**
     * Shape text using HarfBuzz.
     */
    shapeText(text, fontId, options) {
        this.ensureInitialized();
        return this.shaper.shape(fontId, text, options);
    }
    /**
     * Measure text width.
     */
    measureText(text, fontId, fontSize) {
        this.ensureInitialized();
        return this.shaper.measureWidth(fontId, text, fontSize);
    }
    // =========================================================================
    // Text Layout
    // =========================================================================
    /**
     * Layout text for rendering.
     */
    layoutText(text, options) {
        this.ensureInitialized();
        const { fontFamily, fontSize, fontWeight = 400, fontStyle = 'normal', lineHeight = fontSize * 1.2, letterSpacing = 0, maxWidth: _maxWidth, textAlign: _textAlign = 'left', } = options;
        // Note: _maxWidth and _textAlign will be used for advanced layout features
        void _maxWidth;
        void _textAlign;
        // Find font
        const font = this.fontManager.findFont({
            family: fontFamily,
            weight: fontWeight,
            style: fontStyle,
        });
        if (!font) {
            // Return empty layout if font not found
            return { glyphs: [], width: 0, height: lineHeight, baseline: fontSize };
        }
        // Shape text
        const shaped = this.shaper.shape(font.id, text, { fontSize });
        // Layout glyphs
        const glyphs = [];
        let x = 0;
        let maxX = 0;
        for (const glyph of shaped.glyphs) {
            // Get or create atlas glyph
            let atlasGlyph = this.glyphAtlas.getGlyph(font.id, glyph.glyphId, fontSize);
            if (!atlasGlyph) {
                // Try to render the glyph
                const char = text[glyph.cluster] ?? '';
                atlasGlyph = this.glyphAtlas.renderAndAddGlyph(font.id, glyph.glyphId, fontSize, char, fontFamily);
            }
            const layoutGlyph = {
                glyphId: glyph.glyphId,
                x: x + glyph.xOffset,
                y: glyph.yOffset,
                width: atlasGlyph?.width ?? 0,
                height: atlasGlyph?.height ?? fontSize,
                atlasGlyph,
            };
            glyphs.push(layoutGlyph);
            x += glyph.xAdvance + letterSpacing;
            maxX = Math.max(maxX, x);
        }
        // Mark atlas as potentially updated
        if (this.glyphAtlas.isDirty()) {
            this.emit('atlas:updated');
        }
        return {
            glyphs,
            width: maxX,
            height: lineHeight,
            baseline: fontSize,
        };
    }
    /**
     * Layout multiline text with word wrapping.
     */
    layoutMultilineText(text, options) {
        const { maxWidth } = options;
        if (!maxWidth) {
            return [this.layoutText(text, options)];
        }
        // Split into lines
        const lines = [];
        const words = text.split(/\s+/);
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testLayout = this.layoutText(testLine, options);
            if (testLayout.width <= maxWidth) {
                currentLine = testLine;
            }
            else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        return lines.map((line) => this.layoutText(line, options));
    }
    // =========================================================================
    // Atlas Access
    // =========================================================================
    /**
     * Get the glyph atlas.
     */
    getGlyphAtlas() {
        return this.glyphAtlas;
    }
    /**
     * Clear the glyph atlas.
     */
    clearAtlas() {
        this.glyphAtlas.clear();
        this.emit('atlas:updated');
    }
    // =========================================================================
    // Utilities
    // =========================================================================
    /**
     * Ensure the engine is initialized.
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('TextEngine not initialized. Call initialize() first.');
        }
    }
    /**
     * Dispose of all resources.
     */
    dispose() {
        this.shaper?.dispose();
        this.fontManager?.dispose();
        this.glyphAtlas.clear();
        this.initialized = false;
        this.initPromise = null;
    }
}
/**
 * Create a new text engine.
 */
export function createTextEngine() {
    return new TextEngine();
}
//# sourceMappingURL=text-engine.js.map