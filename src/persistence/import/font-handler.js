/**
 * Font File Handler
 *
 * Handle font file imports, parsing, and management.
 * Supports TTF, OTF, WOFF, and WOFF2 formats.
 */
/**
 * Font File Handler
 */
export class FontHandler {
    loadedFonts = new Map();
    fontFaceStyleSheet = null;
    constructor() {
        // Create stylesheet for @font-face rules
        if (typeof document !== 'undefined') {
            const style = document.createElement('style');
            document.head.appendChild(style);
            this.fontFaceStyleSheet = style.sheet;
        }
    }
    /**
     * Import a font file.
     */
    async import(file, options = {}) {
        const data = await file.arrayBuffer();
        const format = this.detectFormat(data);
        if (format === 'unknown') {
            throw new Error('Unsupported font format');
        }
        const metadata = await this.parseMetadata(data, format, options);
        const blob = new Blob([data], { type: this.getMimeType(format) });
        const url = URL.createObjectURL(blob);
        // Create FontFace
        const fontFace = new FontFace(metadata.family, `url(${url})`, {
            weight: String(metadata.weight),
            style: metadata.style,
        });
        // Load the font
        await fontFace.load();
        // Register with document
        if (options.registerFont !== false) {
            document.fonts.add(fontFace);
            this.addFontFaceRule(metadata, url);
        }
        const loadedFont = {
            metadata,
            data,
            blob,
            url,
            fontFace,
        };
        this.loadedFonts.set(metadata.postScriptName, loadedFont);
        return loadedFont;
    }
    /**
     * Import multiple font files.
     */
    async importMultiple(files, options = {}) {
        return Promise.all(files.map(file => this.import(file, options)));
    }
    /**
     * Get all loaded fonts.
     */
    getLoadedFonts() {
        return Array.from(this.loadedFonts.values());
    }
    /**
     * Get font by PostScript name.
     */
    getFont(postScriptName) {
        return this.loadedFonts.get(postScriptName);
    }
    /**
     * Get fonts by family name.
     */
    getFontsByFamily(family) {
        return Array.from(this.loadedFonts.values())
            .filter(font => font.metadata.family.toLowerCase() === family.toLowerCase());
    }
    /**
     * Unload a font.
     */
    unload(postScriptName) {
        const font = this.loadedFonts.get(postScriptName);
        if (!font)
            return;
        document.fonts.delete(font.fontFace);
        URL.revokeObjectURL(font.url);
        this.loadedFonts.delete(postScriptName);
    }
    /**
     * Unload all fonts.
     */
    unloadAll() {
        for (const font of this.loadedFonts.values()) {
            document.fonts.delete(font.fontFace);
            URL.revokeObjectURL(font.url);
        }
        this.loadedFonts.clear();
    }
    /**
     * Create a font subset containing only specified characters.
     */
    async subset(font, options = {}) {
        // Build character set
        let chars = options.characters ?? '';
        if (options.includeBasicLatin !== false) {
            // ASCII printable characters
            for (let i = 32; i < 127; i++) {
                chars += String.fromCharCode(i);
            }
        }
        if (options.includeLatinExtended) {
            // Latin Extended-A
            for (let i = 0x0100; i <= 0x017F; i++) {
                chars += String.fromCharCode(i);
            }
        }
        // For a real implementation, we would use a font subsetting library
        // For now, return the original font data
        console.warn('Font subsetting is not fully implemented. Returning original font.');
        return font.data;
    }
    /**
     * Convert font to different format.
     */
    async convert(font, _targetFormat) {
        // For a real implementation, we would use a font conversion library
        // For now, return the original data
        console.warn('Font format conversion is not fully implemented.');
        return font.data;
    }
    /**
     * Get CSS @font-face declaration for a font.
     */
    getFontFaceCSS(font) {
        return `@font-face {
  font-family: '${font.metadata.family}';
  src: url('${font.url}') format('${this.getFormatName(font.metadata.format)}');
  font-weight: ${font.metadata.weight};
  font-style: ${font.metadata.style};
  font-display: swap;
}`;
    }
    /**
     * Get all font families available in the document.
     */
    getAvailableFamilies() {
        const families = new Set();
        // From loaded fonts
        for (const font of this.loadedFonts.values()) {
            families.add(font.metadata.family);
        }
        // From document.fonts
        for (const fontFace of document.fonts.values()) {
            families.add(fontFace.family);
        }
        return Array.from(families).sort();
    }
    /**
     * Check if a font family is available.
     */
    isFamilyAvailable(family) {
        // Check loaded fonts
        for (const font of this.loadedFonts.values()) {
            if (font.metadata.family.toLowerCase() === family.toLowerCase()) {
                return true;
            }
        }
        // Check document fonts
        return document.fonts.check(`12px "${family}"`);
    }
    // =========================================================================
    // Private Methods - Format Detection
    // =========================================================================
    detectFormat(data) {
        const view = new DataView(data);
        // Check magic numbers
        const magic = view.getUint32(0);
        // WOFF
        if (magic === 0x774F4646) {
            return 'woff';
        }
        // WOFF2
        if (magic === 0x774F4632) {
            return 'woff2';
        }
        // TrueType / OpenType
        if (magic === 0x00010000 || magic === 0x74727565) {
            return 'ttf';
        }
        // OpenType with CFF
        if (magic === 0x4F54544F) {
            return 'otf';
        }
        return 'unknown';
    }
    getMimeType(format) {
        switch (format) {
            case 'ttf': return 'font/ttf';
            case 'otf': return 'font/otf';
            case 'woff': return 'font/woff';
            case 'woff2': return 'font/woff2';
            default: return 'application/octet-stream';
        }
    }
    getFormatName(format) {
        switch (format) {
            case 'ttf': return 'truetype';
            case 'otf': return 'opentype';
            case 'woff': return 'woff';
            case 'woff2': return 'woff2';
            default: return 'truetype';
        }
    }
    // =========================================================================
    // Private Methods - Metadata Parsing
    // =========================================================================
    async parseMetadata(data, format, options) {
        let family = 'Unknown Font';
        let fullName = 'Unknown Font';
        let postScriptName = 'UnknownFont';
        let weight = 400;
        let style = 'normal';
        let version;
        let copyright;
        let designer;
        let glyphCount;
        let unitsPerEm;
        let ascender;
        let descender;
        let lineGap;
        try {
            if (format === 'ttf' || format === 'otf') {
                const result = this.parseSFNTMetadata(data);
                family = result.family;
                fullName = result.fullName;
                postScriptName = result.postScriptName;
                weight = result.weight;
                style = result.style;
                version = result.version;
                copyright = result.copyright;
                designer = result.designer;
                glyphCount = result.glyphCount;
                unitsPerEm = result.unitsPerEm;
                ascender = result.ascender;
                descender = result.descender;
                lineGap = result.lineGap;
            }
            // WOFF parsing would go here
        }
        catch {
            // Use defaults
        }
        // Apply overrides
        if (options.familyOverride) {
            family = options.familyOverride;
        }
        if (options.weightOverride) {
            weight = options.weightOverride;
        }
        if (options.styleOverride) {
            style = options.styleOverride;
        }
        return {
            family,
            fullName,
            postScriptName,
            weight,
            style,
            format,
            version,
            copyright,
            designer,
            glyphCount,
            unitsPerEm,
            ascender,
            descender,
            lineGap,
        };
    }
    parseSFNTMetadata(data) {
        const view = new DataView(data);
        const numTables = view.getUint16(4);
        let family = 'Unknown';
        let fullName = 'Unknown';
        let postScriptName = 'Unknown';
        let weight = 400;
        let style = 'normal';
        let version;
        let copyright;
        let designer;
        let glyphCount;
        let unitsPerEm;
        let ascender;
        let descender;
        let lineGap;
        // Find tables
        const tables = {};
        let offset = 12;
        for (let i = 0; i < numTables; i++) {
            const tag = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
            tables[tag] = {
                offset: view.getUint32(offset + 8),
                length: view.getUint32(offset + 12),
            };
            offset += 16;
        }
        // Parse 'name' table
        if (tables['name']) {
            const names = this.parseNameTable(data, tables['name'].offset);
            family = names.family ?? family;
            fullName = names.fullName ?? fullName;
            postScriptName = names.postScriptName ?? postScriptName;
            version = names.version;
            copyright = names.copyright;
            designer = names.designer;
        }
        // Parse 'head' table
        if (tables['head']) {
            const headOffset = tables['head'].offset;
            unitsPerEm = view.getUint16(headOffset + 18);
        }
        // Parse 'hhea' table
        if (tables['hhea']) {
            const hheaOffset = tables['hhea'].offset;
            ascender = view.getInt16(hheaOffset + 4);
            descender = view.getInt16(hheaOffset + 6);
            lineGap = view.getInt16(hheaOffset + 8);
        }
        // Parse 'OS/2' table for weight and style
        if (tables['OS/2']) {
            const os2Offset = tables['OS/2'].offset;
            const usWeightClass = view.getUint16(os2Offset + 4);
            weight = this.normalizeWeight(usWeightClass);
            const fsSelection = view.getUint16(os2Offset + 62);
            if (fsSelection & 0x0001)
                style = 'italic';
        }
        // Parse 'maxp' table for glyph count
        if (tables['maxp']) {
            const maxpOffset = tables['maxp'].offset;
            glyphCount = view.getUint16(maxpOffset + 4);
        }
        return {
            family,
            fullName,
            postScriptName,
            weight,
            style,
            ...(version !== undefined && { version }),
            ...(copyright !== undefined && { copyright }),
            ...(designer !== undefined && { designer }),
            ...(glyphCount !== undefined && { glyphCount }),
            ...(unitsPerEm !== undefined && { unitsPerEm }),
            ...(ascender !== undefined && { ascender }),
            ...(descender !== undefined && { descender }),
            ...(lineGap !== undefined && { lineGap }),
        };
    }
    parseNameTable(data, offset) {
        const view = new DataView(data);
        view.getUint16(offset); // format (ignored)
        const count = view.getUint16(offset + 2);
        const stringOffset = view.getUint16(offset + 4);
        const result = {};
        const nameIds = {
            0: 'copyright',
            1: 'family',
            4: 'fullName',
            5: 'version',
            6: 'postScriptName',
            9: 'designer',
        };
        for (let i = 0; i < count; i++) {
            const recordOffset = offset + 6 + i * 12;
            const platformId = view.getUint16(recordOffset);
            view.getUint16(recordOffset + 2); // encodingId (ignored)
            const nameId = view.getUint16(recordOffset + 6);
            const length = view.getUint16(recordOffset + 8);
            const strOffset = view.getUint16(recordOffset + 10);
            const key = nameIds[nameId];
            if (!key)
                continue;
            // Prefer Unicode (platform 0 or 3)
            if (platformId === 0 || platformId === 3) {
                const bytes = new Uint8Array(data, offset + stringOffset + strOffset, length);
                const str = this.decodeUTF16BE(bytes);
                result[key] = str;
            }
            else if (!result[key] && platformId === 1) {
                // Fallback to Mac Roman
                const bytes = new Uint8Array(data, offset + stringOffset + strOffset, length);
                result[key] = new TextDecoder('macintosh').decode(bytes);
            }
        }
        return result;
    }
    decodeUTF16BE(bytes) {
        const chars = [];
        for (let i = 0; i < bytes.length; i += 2) {
            chars.push((bytes[i] << 8) | bytes[i + 1]);
        }
        return String.fromCharCode(...chars);
    }
    normalizeWeight(usWeightClass) {
        if (usWeightClass <= 150)
            return 100;
        if (usWeightClass <= 250)
            return 200;
        if (usWeightClass <= 350)
            return 300;
        if (usWeightClass <= 450)
            return 400;
        if (usWeightClass <= 550)
            return 500;
        if (usWeightClass <= 650)
            return 600;
        if (usWeightClass <= 750)
            return 700;
        if (usWeightClass <= 850)
            return 800;
        return 900;
    }
    // =========================================================================
    // Private Methods - CSS
    // =========================================================================
    addFontFaceRule(metadata, url) {
        if (!this.fontFaceStyleSheet)
            return;
        const rule = `@font-face {
      font-family: '${metadata.family}';
      src: url('${url}') format('${this.getFormatName(metadata.format)}');
      font-weight: ${metadata.weight};
      font-style: ${metadata.style};
      font-display: swap;
    }`;
        try {
            this.fontFaceStyleSheet.insertRule(rule, this.fontFaceStyleSheet.cssRules.length);
        }
        catch {
            // Ignore errors
        }
    }
}
/**
 * Create a font handler.
 */
export function createFontHandler() {
    return new FontHandler();
}
//# sourceMappingURL=font-handler.js.map