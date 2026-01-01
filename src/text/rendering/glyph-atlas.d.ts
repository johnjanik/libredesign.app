/**
 * Glyph Atlas for Text Rendering
 *
 * Manages a texture atlas of SDF (Signed Distance Field) glyphs
 * for high-quality GPU text rendering.
 */
/**
 * Atlas glyph entry
 */
export interface AtlasGlyph {
    readonly glyphId: number;
    readonly fontId: string;
    readonly fontSize: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly bearingX: number;
    readonly bearingY: number;
    readonly advance: number;
}
/**
 * Glyph Atlas - manages SDF glyph textures
 */
export declare class GlyphAtlas {
    private width;
    private height;
    private padding;
    private sdfRadius;
    private data;
    private glyphs;
    private freeRegions;
    private dirty;
    private canvas;
    private ctx;
    constructor(width?: number, height?: number, options?: {
        padding?: number;
        sdfRadius?: number;
    });
    /**
     * Get a glyph from the atlas.
     */
    getGlyph(fontId: string, glyphId: number, fontSize: number): AtlasGlyph | null;
    /**
     * Check if a glyph is in the atlas.
     */
    hasGlyph(fontId: string, glyphId: number, fontSize: number): boolean;
    /**
     * Add a glyph to the atlas.
     * Returns null if there's no space.
     */
    addGlyph(fontId: string, glyphId: number, fontSize: number, glyphData: {
        width: number;
        height: number;
        bearingX: number;
        bearingY: number;
        advance: number;
        bitmap: Uint8Array;
    }): AtlasGlyph | null;
    /**
     * Render a glyph using canvas and add to atlas.
     */
    renderAndAddGlyph(fontId: string, glyphId: number, fontSize: number, char: string, fontFamily: string): AtlasGlyph | null;
    /**
     * Generate SDF from a bitmap.
     */
    private generateSDF;
    /**
     * Allocate a region in the atlas.
     */
    private allocateRegion;
    /**
     * Get the atlas texture data.
     */
    getData(): Uint8Array;
    /**
     * Get atlas dimensions.
     */
    getSize(): {
        width: number;
        height: number;
    };
    /**
     * Check if atlas has been modified.
     */
    isDirty(): boolean;
    /**
     * Clear dirty flag.
     */
    clearDirty(): void;
    /**
     * Get UV coordinates for a glyph.
     */
    getGlyphUVs(glyph: AtlasGlyph): {
        u0: number;
        v0: number;
        u1: number;
        v1: number;
    };
    /**
     * Build a cache key.
     */
    private buildKey;
    /**
     * Clear the atlas.
     */
    clear(): void;
    /**
     * Get usage statistics.
     */
    getStats(): {
        glyphCount: number;
        usedArea: number;
        totalArea: number;
    };
}
/**
 * Create a new glyph atlas.
 */
export declare function createGlyphAtlas(width?: number, height?: number, options?: {
    padding?: number;
    sdfRadius?: number;
}): GlyphAtlas;
//# sourceMappingURL=glyph-atlas.d.ts.map