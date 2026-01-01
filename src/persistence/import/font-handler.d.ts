/**
 * Font File Handler
 *
 * Handle font file imports, parsing, and management.
 * Supports TTF, OTF, WOFF, and WOFF2 formats.
 */
/**
 * Font format types
 */
export type FontFormat = 'ttf' | 'otf' | 'woff' | 'woff2' | 'unknown';
/**
 * Font weight values
 */
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
/**
 * Font style
 */
export type FontStyle = 'normal' | 'italic' | 'oblique';
/**
 * Font metadata
 */
export interface FontMetadata {
    readonly family: string;
    readonly fullName: string;
    readonly postScriptName: string;
    readonly weight: FontWeight;
    readonly style: FontStyle;
    readonly format: FontFormat;
    readonly version?: string | undefined;
    readonly copyright?: string | undefined;
    readonly designer?: string | undefined;
    readonly glyphCount?: number | undefined;
    readonly unitsPerEm?: number | undefined;
    readonly ascender?: number | undefined;
    readonly descender?: number | undefined;
    readonly lineGap?: number | undefined;
}
/**
 * Loaded font
 */
export interface LoadedFont {
    readonly metadata: FontMetadata;
    readonly data: ArrayBuffer;
    readonly blob: Blob;
    readonly url: string;
    readonly fontFace: FontFace;
}
/**
 * Font import options
 */
export interface FontImportOptions {
    /** Override font family name */
    familyOverride?: string | undefined;
    /** Override weight */
    weightOverride?: FontWeight | undefined;
    /** Override style */
    styleOverride?: FontStyle | undefined;
    /** Register with document fonts (default: true) */
    registerFont?: boolean | undefined;
}
/**
 * Font subset options
 */
export interface FontSubsetOptions {
    /** Characters to include in subset */
    characters?: string | undefined;
    /** Unicode ranges to include */
    unicodeRanges?: readonly string[] | undefined;
    /** Include basic Latin (default: true) */
    includeBasicLatin?: boolean | undefined;
    /** Include Latin Extended (default: false) */
    includeLatinExtended?: boolean | undefined;
    /** Output format */
    outputFormat?: FontFormat | undefined;
}
/**
 * Font File Handler
 */
export declare class FontHandler {
    private loadedFonts;
    private fontFaceStyleSheet;
    constructor();
    /**
     * Import a font file.
     */
    import(file: File, options?: FontImportOptions): Promise<LoadedFont>;
    /**
     * Import multiple font files.
     */
    importMultiple(files: File[], options?: FontImportOptions): Promise<LoadedFont[]>;
    /**
     * Get all loaded fonts.
     */
    getLoadedFonts(): LoadedFont[];
    /**
     * Get font by PostScript name.
     */
    getFont(postScriptName: string): LoadedFont | undefined;
    /**
     * Get fonts by family name.
     */
    getFontsByFamily(family: string): LoadedFont[];
    /**
     * Unload a font.
     */
    unload(postScriptName: string): void;
    /**
     * Unload all fonts.
     */
    unloadAll(): void;
    /**
     * Create a font subset containing only specified characters.
     */
    subset(font: LoadedFont, options?: FontSubsetOptions): Promise<ArrayBuffer>;
    /**
     * Convert font to different format.
     */
    convert(font: LoadedFont, _targetFormat: FontFormat): Promise<ArrayBuffer>;
    /**
     * Get CSS @font-face declaration for a font.
     */
    getFontFaceCSS(font: LoadedFont): string;
    /**
     * Get all font families available in the document.
     */
    getAvailableFamilies(): string[];
    /**
     * Check if a font family is available.
     */
    isFamilyAvailable(family: string): boolean;
    private detectFormat;
    private getMimeType;
    private getFormatName;
    private parseMetadata;
    private parseSFNTMetadata;
    private parseNameTable;
    private decodeUTF16BE;
    private normalizeWeight;
    private addFontFaceRule;
}
/**
 * Create a font handler.
 */
export declare function createFontHandler(): FontHandler;
//# sourceMappingURL=font-handler.d.ts.map