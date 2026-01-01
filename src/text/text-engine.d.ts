/**
 * Text Engine - Main coordinator for text rendering
 *
 * Integrates HarfBuzz shaping, font management, and glyph atlas.
 */
import { type ShapingResult, type ShapingOptions } from './shaping/harfbuzz-shaper';
import { type FontDescriptor, type FontMetadata, type FontWeight, type FontStyle } from './fonts/font-manager';
import { GlyphAtlas, type AtlasGlyph } from './rendering/glyph-atlas';
import { EventEmitter } from '@core/events/event-emitter';
/**
 * Text engine events
 */
export type TextEngineEvents = {
    'initialized': undefined;
    'font:loaded': {
        font: FontMetadata;
    };
    'font:error': {
        family: string;
        error: Error;
    };
    'atlas:updated': undefined;
    [key: string]: unknown;
};
/**
 * Text layout result
 */
export interface TextLayout {
    readonly glyphs: readonly LayoutGlyph[];
    readonly width: number;
    readonly height: number;
    readonly baseline: number;
}
/**
 * Glyph with layout and atlas information
 */
export interface LayoutGlyph {
    readonly glyphId: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly atlasGlyph: AtlasGlyph | null;
}
/**
 * Text layout options
 */
export interface TextLayoutOptions {
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly fontWeight?: FontWeight;
    readonly fontStyle?: FontStyle;
    readonly lineHeight?: number;
    readonly letterSpacing?: number;
    readonly maxWidth?: number;
    readonly textAlign?: 'left' | 'center' | 'right' | 'justify';
}
/**
 * Text Engine - coordinates text shaping and rendering
 */
export declare class TextEngine extends EventEmitter<TextEngineEvents> {
    private shaper;
    private fontManager;
    private glyphAtlas;
    private initialized;
    private initPromise;
    constructor();
    /**
     * Initialize the text engine.
     */
    initialize(wasmUrl?: string): Promise<void>;
    /**
     * Internal initialization.
     */
    private doInitialize;
    /**
     * Check if initialized.
     */
    isInitialized(): boolean;
    /**
     * Load a font from URL.
     */
    loadFont(family: string, url: string, weight?: FontWeight, style?: FontStyle): Promise<FontMetadata>;
    /**
     * Load a font from data.
     */
    loadFontFromData(family: string, data: Uint8Array, weight?: FontWeight, style?: FontStyle): FontMetadata;
    /**
     * Find a font matching the descriptor.
     */
    findFont(descriptor: FontDescriptor): FontMetadata | null;
    /**
     * Shape text using HarfBuzz.
     */
    shapeText(text: string, fontId: string, options: ShapingOptions): ShapingResult;
    /**
     * Measure text width.
     */
    measureText(text: string, fontId: string, fontSize: number): number;
    /**
     * Layout text for rendering.
     */
    layoutText(text: string, options: TextLayoutOptions): TextLayout;
    /**
     * Layout multiline text with word wrapping.
     */
    layoutMultilineText(text: string, options: TextLayoutOptions): TextLayout[];
    /**
     * Get the glyph atlas.
     */
    getGlyphAtlas(): GlyphAtlas;
    /**
     * Clear the glyph atlas.
     */
    clearAtlas(): void;
    /**
     * Ensure the engine is initialized.
     */
    private ensureInitialized;
    /**
     * Dispose of all resources.
     */
    dispose(): void;
}
/**
 * Create a new text engine.
 */
export declare function createTextEngine(): TextEngine;
//# sourceMappingURL=text-engine.d.ts.map