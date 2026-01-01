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
export class FontHandler {
  private loadedFonts: Map<string, LoadedFont> = new Map();
  private fontFaceStyleSheet: CSSStyleSheet | null = null;

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
  async import(file: File, options: FontImportOptions = {}): Promise<LoadedFont> {
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

    const loadedFont: LoadedFont = {
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
  async importMultiple(files: File[], options: FontImportOptions = {}): Promise<LoadedFont[]> {
    return Promise.all(files.map(file => this.import(file, options)));
  }

  /**
   * Get all loaded fonts.
   */
  getLoadedFonts(): LoadedFont[] {
    return Array.from(this.loadedFonts.values());
  }

  /**
   * Get font by PostScript name.
   */
  getFont(postScriptName: string): LoadedFont | undefined {
    return this.loadedFonts.get(postScriptName);
  }

  /**
   * Get fonts by family name.
   */
  getFontsByFamily(family: string): LoadedFont[] {
    return Array.from(this.loadedFonts.values())
      .filter(font => font.metadata.family.toLowerCase() === family.toLowerCase());
  }

  /**
   * Unload a font.
   */
  unload(postScriptName: string): void {
    const font = this.loadedFonts.get(postScriptName);
    if (!font) return;

    document.fonts.delete(font.fontFace);
    URL.revokeObjectURL(font.url);
    this.loadedFonts.delete(postScriptName);
  }

  /**
   * Unload all fonts.
   */
  unloadAll(): void {
    for (const font of this.loadedFonts.values()) {
      document.fonts.delete(font.fontFace);
      URL.revokeObjectURL(font.url);
    }
    this.loadedFonts.clear();
  }

  /**
   * Create a font subset containing only specified characters.
   */
  async subset(font: LoadedFont, options: FontSubsetOptions = {}): Promise<ArrayBuffer> {
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
  async convert(font: LoadedFont, _targetFormat: FontFormat): Promise<ArrayBuffer> {
    // For a real implementation, we would use a font conversion library
    // For now, return the original data
    console.warn('Font format conversion is not fully implemented.');
    return font.data;
  }

  /**
   * Get CSS @font-face declaration for a font.
   */
  getFontFaceCSS(font: LoadedFont): string {
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
  getAvailableFamilies(): string[] {
    const families = new Set<string>();

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
  isFamilyAvailable(family: string): boolean {
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

  private detectFormat(data: ArrayBuffer): FontFormat {
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

  private getMimeType(format: FontFormat): string {
    switch (format) {
      case 'ttf': return 'font/ttf';
      case 'otf': return 'font/otf';
      case 'woff': return 'font/woff';
      case 'woff2': return 'font/woff2';
      default: return 'application/octet-stream';
    }
  }

  private getFormatName(format: FontFormat): string {
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

  private async parseMetadata(
    data: ArrayBuffer,
    format: FontFormat,
    options: FontImportOptions
  ): Promise<FontMetadata> {
    let family = 'Unknown Font';
    let fullName = 'Unknown Font';
    let postScriptName = 'UnknownFont';
    let weight: FontWeight = 400;
    let style: FontStyle = 'normal';
    let version: string | undefined;
    let copyright: string | undefined;
    let designer: string | undefined;
    let glyphCount: number | undefined;
    let unitsPerEm: number | undefined;
    let ascender: number | undefined;
    let descender: number | undefined;
    let lineGap: number | undefined;

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
    } catch {
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

  private parseSFNTMetadata(data: ArrayBuffer): {
    family: string;
    fullName: string;
    postScriptName: string;
    weight: FontWeight;
    style: FontStyle;
    version?: string | undefined;
    copyright?: string | undefined;
    designer?: string | undefined;
    glyphCount?: number | undefined;
    unitsPerEm?: number | undefined;
    ascender?: number | undefined;
    descender?: number | undefined;
    lineGap?: number | undefined;
  } {
    const view = new DataView(data);
    const numTables = view.getUint16(4);

    let family = 'Unknown';
    let fullName = 'Unknown';
    let postScriptName = 'Unknown';
    let weight: FontWeight = 400;
    let style: FontStyle = 'normal';
    let version: string | undefined;
    let copyright: string | undefined;
    let designer: string | undefined;
    let glyphCount: number | undefined;
    let unitsPerEm: number | undefined;
    let ascender: number | undefined;
    let descender: number | undefined;
    let lineGap: number | undefined;

    // Find tables
    const tables: Record<string, { offset: number; length: number }> = {};
    let offset = 12;

    for (let i = 0; i < numTables; i++) {
      const tag = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
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
      if (fsSelection & 0x0001) style = 'italic';
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

  private parseNameTable(data: ArrayBuffer, offset: number): {
    family?: string;
    fullName?: string;
    postScriptName?: string;
    version?: string;
    copyright?: string;
    designer?: string;
  } {
    const view = new DataView(data);
    view.getUint16(offset); // format (ignored)
    const count = view.getUint16(offset + 2);
    const stringOffset = view.getUint16(offset + 4);

    const result: Record<string, string> = {};

    const nameIds: Record<number, string> = {
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
      if (!key) continue;

      // Prefer Unicode (platform 0 or 3)
      if (platformId === 0 || platformId === 3) {
        const bytes = new Uint8Array(data, offset + stringOffset + strOffset, length);
        const str = this.decodeUTF16BE(bytes);
        result[key] = str;
      } else if (!result[key] && platformId === 1) {
        // Fallback to Mac Roman
        const bytes = new Uint8Array(data, offset + stringOffset + strOffset, length);
        result[key] = new TextDecoder('macintosh').decode(bytes);
      }
    }

    return result;
  }

  private decodeUTF16BE(bytes: Uint8Array): string {
    const chars: number[] = [];
    for (let i = 0; i < bytes.length; i += 2) {
      chars.push((bytes[i]! << 8) | bytes[i + 1]!);
    }
    return String.fromCharCode(...chars);
  }

  private normalizeWeight(usWeightClass: number): FontWeight {
    if (usWeightClass <= 150) return 100;
    if (usWeightClass <= 250) return 200;
    if (usWeightClass <= 350) return 300;
    if (usWeightClass <= 450) return 400;
    if (usWeightClass <= 550) return 500;
    if (usWeightClass <= 650) return 600;
    if (usWeightClass <= 750) return 700;
    if (usWeightClass <= 850) return 800;
    return 900;
  }

  // =========================================================================
  // Private Methods - CSS
  // =========================================================================

  private addFontFaceRule(metadata: FontMetadata, url: string): void {
    if (!this.fontFaceStyleSheet) return;

    const rule = `@font-face {
      font-family: '${metadata.family}';
      src: url('${url}') format('${this.getFormatName(metadata.format)}');
      font-weight: ${metadata.weight};
      font-style: ${metadata.style};
      font-display: swap;
    }`;

    try {
      this.fontFaceStyleSheet.insertRule(rule, this.fontFaceStyleSheet.cssRules.length);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Create a font handler.
 */
export function createFontHandler(): FontHandler {
  return new FontHandler();
}
