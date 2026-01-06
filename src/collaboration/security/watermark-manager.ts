/**
 * Watermark Manager
 *
 * Applies watermarks to exported documents for:
 * - Copyright protection
 * - Tracking unauthorized sharing
 * - Viewer identification
 *
 * Supports:
 * - Text watermarks (diagonal, tiled, corner)
 * - Pattern watermarks (subtle lines, dots)
 * - Steganographic metadata (hidden data in exports)
 */

import { EventEmitter } from '@core/events/event-emitter';
import { sha256Hex } from '../encryption/crypto-utils';

// =============================================================================
// Types
// =============================================================================

export type WatermarkType = 'text' | 'pattern' | 'steganographic';
export type WatermarkPosition = 'diagonal' | 'tiled' | 'center' | 'corners' | 'bottom-right';
export type PatternStyle = 'lines' | 'dots' | 'grid' | 'crosshatch';

export interface TextWatermarkOptions {
  readonly type: 'text';
  /** Text to display */
  readonly text: string;
  /** Position/layout of watermark */
  readonly position: WatermarkPosition;
  /** Font family */
  readonly fontFamily?: string;
  /** Font size in pixels */
  readonly fontSize?: number;
  /** Text color (with alpha for transparency) */
  readonly color?: string;
  /** Rotation angle in degrees (for diagonal) */
  readonly rotation?: number;
  /** Repeat spacing for tiled watermarks */
  readonly tileSpacing?: number;
}

export interface PatternWatermarkOptions {
  readonly type: 'pattern';
  /** Pattern style */
  readonly style: PatternStyle;
  /** Pattern opacity (0-1) */
  readonly opacity?: number;
  /** Pattern color */
  readonly color?: string;
  /** Pattern size/spacing */
  readonly size?: number;
  /** Pattern stroke width */
  readonly strokeWidth?: number;
}

export interface SteganographicOptions {
  readonly type: 'steganographic';
  /** Metadata to embed */
  readonly metadata: WatermarkMetadata;
  /** Embedding strength (affects visibility vs durability) */
  readonly strength?: 'low' | 'medium' | 'high';
}

export interface WatermarkMetadata {
  /** Document ID */
  readonly documentId: string;
  /** User who exported */
  readonly exportedBy: string;
  /** Export timestamp */
  readonly exportedAt: number;
  /** Organization/team ID */
  readonly organizationId?: string;
  /** Custom tracking ID */
  readonly trackingId?: string;
  /** Version hash */
  readonly versionHash?: string;
}

export type WatermarkOptions =
  | TextWatermarkOptions
  | PatternWatermarkOptions
  | SteganographicOptions;

export interface WatermarkConfig {
  /** Whether watermarking is enabled */
  readonly enabled: boolean;
  /** Watermark configurations to apply */
  readonly watermarks: readonly WatermarkOptions[];
  /** Apply to specific export formats */
  readonly applyTo?: readonly ('svg' | 'png' | 'pdf' | 'html')[];
  /** Roles that receive watermarked exports */
  readonly forRoles?: readonly ('viewer' | 'commenter' | 'developer')[];
}

export interface WatermarkManagerEvents {
  'watermark:applied': { documentId: string; type: WatermarkType };
  'watermark:failed': { documentId: string; error: string };
  [key: string]: unknown;
}

export interface AppliedWatermark {
  readonly type: WatermarkType;
  readonly svgElement?: string;
  readonly cssStyles?: string;
  readonly metadata?: string;
}

// =============================================================================
// Watermark Manager
// =============================================================================

export class WatermarkManager extends EventEmitter<WatermarkManagerEvents> {
  private readonly config: WatermarkConfig;

  constructor(config?: Partial<WatermarkConfig>) {
    super();
    this.config = {
      enabled: config?.enabled ?? false,
      watermarks: config?.watermarks ?? [],
      applyTo: config?.applyTo ?? ['svg', 'png', 'pdf', 'html'],
      forRoles: config?.forRoles ?? ['viewer', 'commenter'],
    };
  }

  // ===========================================================================
  // Public API - Configuration
  // ===========================================================================

  /**
   * Check if watermarking is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current watermark configuration
   */
  getConfig(): WatermarkConfig {
    return this.config;
  }

  /**
   * Check if a format should be watermarked
   */
  shouldWatermark(format: 'svg' | 'png' | 'pdf' | 'html'): boolean {
    if (!this.config.enabled) return false;
    return this.config.applyTo?.includes(format) ?? false;
  }

  /**
   * Check if a role should receive watermarked exports
   */
  shouldWatermarkForRole(role: string): boolean {
    if (!this.config.enabled) return false;
    return this.config.forRoles?.includes(role as 'viewer' | 'commenter' | 'developer') ?? false;
  }

  // ===========================================================================
  // Public API - SVG Watermarking
  // ===========================================================================

  /**
   * Apply watermarks to SVG content
   */
  applySvgWatermarks(
    svgContent: string,
    documentId: string,
    metadata?: Partial<WatermarkMetadata>
  ): string {
    if (!this.config.enabled || this.config.watermarks.length === 0) {
      return svgContent;
    }

    let result = svgContent;

    for (const watermark of this.config.watermarks) {
      switch (watermark.type) {
        case 'text':
          result = this.applyTextWatermarkSvg(result, watermark);
          break;
        case 'pattern':
          result = this.applyPatternWatermarkSvg(result, watermark);
          break;
        case 'steganographic':
          result = this.applySteganographicSvg(result, {
            ...watermark.metadata,
            documentId,
            ...metadata,
          });
          break;
      }
    }

    this.emit('watermark:applied', { documentId, type: 'text' });
    return result;
  }

  /**
   * Generate SVG watermark element
   */
  generateSvgWatermark(
    width: number,
    height: number,
    options: TextWatermarkOptions
  ): string {
    const {
      text,
      position,
      fontFamily = 'Arial, sans-serif',
      fontSize = 48,
      color = 'rgba(0, 0, 0, 0.1)',
      rotation = -45,
      tileSpacing = 200,
    } = options;

    switch (position) {
      case 'diagonal':
        return this.generateDiagonalWatermark(width, height, text, fontFamily, fontSize, color, rotation);
      case 'tiled':
        return this.generateTiledWatermark(width, height, text, fontFamily, fontSize, color, rotation, tileSpacing);
      case 'center':
        return this.generateCenterWatermark(width, height, text, fontFamily, fontSize, color);
      case 'corners':
        return this.generateCornerWatermarks(width, height, text, fontFamily, fontSize * 0.5, color);
      case 'bottom-right':
        return this.generateBottomRightWatermark(width, height, text, fontFamily, fontSize * 0.5, color);
      default:
        return '';
    }
  }

  // ===========================================================================
  // Public API - HTML/CSS Watermarking
  // ===========================================================================

  /**
   * Generate CSS for HTML watermarking
   */
  generateCssWatermark(options: TextWatermarkOptions): string {
    const {
      text,
      position,
      fontFamily = 'Arial, sans-serif',
      fontSize = 48,
      color = 'rgba(0, 0, 0, 0.1)',
      rotation = -45,
    } = options;

    const escapedText = text.replace(/'/g, "\\'");

    const baseStyles = `
      .watermark-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        overflow: hidden;
      }
      .watermark-overlay::before {
        content: '${escapedText}';
        position: absolute;
        font-family: ${fontFamily};
        font-size: ${fontSize}px;
        color: ${color};
        white-space: nowrap;
        user-select: none;
    `;

    switch (position) {
      case 'diagonal':
        return `${baseStyles}
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(${rotation}deg);
        }`;
      case 'tiled':
        return `${baseStyles}
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          display: flex;
          flex-wrap: wrap;
          gap: 100px;
          transform: rotate(${rotation}deg);
        }`;
      case 'center':
        return `${baseStyles}
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }`;
      case 'bottom-right':
        return `${baseStyles}
          bottom: 20px;
          right: 20px;
          top: auto;
          left: auto;
        }`;
      default:
        return baseStyles + '}';
    }
  }

  /**
   * Generate HTML watermark overlay element
   */
  generateHtmlWatermark(options: TextWatermarkOptions): string {
    const text = options.text;
    const color = options.color ?? 'rgba(0, 0, 0, 0.1)';
    const fontSize = options.fontSize ?? 48;
    const fontFamily = options.fontFamily ?? 'system-ui, sans-serif';
    const rotation = options.rotation ?? -30;
    const position = options.position ?? 'diagonal';

    const baseStyle = `
      position: absolute;
      pointer-events: none;
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
      color: ${color};
      white-space: nowrap;
      user-select: none;
    `.trim().replace(/\s+/g, ' ');

    let positionStyle = '';
    switch (position) {
      case 'diagonal':
        positionStyle = `top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(${rotation}deg);`;
        break;
      case 'center':
        positionStyle = 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
        break;
      case 'bottom-right':
        positionStyle = 'bottom: 20px; right: 20px;';
        break;
      default:
        positionStyle = `top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(${rotation}deg);`;
    }

    return `<div class="watermark-overlay" style="${baseStyle} ${positionStyle}">${this.escapeHtml(text)}</div>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ===========================================================================
  // Public API - Steganographic Watermarking
  // ===========================================================================

  /**
   * Encode metadata as steganographic watermark for SVG
   * Uses comment-based embedding (visible in source but not rendered)
   */
  encodeMetadata(metadata: WatermarkMetadata): string {
    const payload = JSON.stringify(metadata);
    // Simple base64 encoding with marker
    const encoded = btoa(payload);
    return `<!-- DL_WM:${encoded} -->`;
  }

  /**
   * Decode steganographic metadata from SVG
   */
  decodeMetadata(svgContent: string): WatermarkMetadata | null {
    const match = svgContent.match(/<!-- DL_WM:([A-Za-z0-9+/=]+) -->/);
    if (!match) return null;

    try {
      const decoded = atob(match[1]!);
      return JSON.parse(decoded) as WatermarkMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Generate a unique tracking ID for watermark
   */
  async generateTrackingId(
    documentId: string,
    userId: string,
    timestamp: number
  ): Promise<string> {
    const data = `${documentId}:${userId}:${timestamp}`;
    const hash = await sha256Hex(data);
    return hash.substring(0, 16); // Short tracking ID
  }

  // ===========================================================================
  // Private Methods - SVG Generation
  // ===========================================================================

  private applyTextWatermarkSvg(svgContent: string, options: TextWatermarkOptions): string {
    // Extract dimensions from SVG
    const widthMatch = svgContent.match(/width="(\d+)"/);
    const heightMatch = svgContent.match(/height="(\d+)"/);
    const width = widthMatch ? parseInt(widthMatch[1]!, 10) : 800;
    const height = heightMatch ? parseInt(heightMatch[1]!, 10) : 600;

    const watermarkElement = this.generateSvgWatermark(width, height, options);

    // Insert before closing </svg> tag
    return svgContent.replace('</svg>', `${watermarkElement}</svg>`);
  }

  private applyPatternWatermarkSvg(svgContent: string, patternOptions: PatternWatermarkOptions): string {
    const patternDef = this.generatePatternDef(patternOptions);
    const patternOverlay = this.generatePatternOverlay();

    // Add pattern to defs
    let result = svgContent;
    if (svgContent.includes('<defs>')) {
      result = result.replace('<defs>', `<defs>${patternDef}`);
    } else {
      result = result.replace('<svg', `<svg><defs>${patternDef}</defs>`);
    }

    // Add overlay
    return result.replace('</svg>', `${patternOverlay}</svg>`);
  }

  private applySteganographicSvg(svgContent: string, metadata: WatermarkMetadata): string {
    const encodedMetadata = this.encodeMetadata(metadata);
    // Insert after opening <svg> tag
    return svgContent.replace(/<svg([^>]*)>/, `<svg$1>${encodedMetadata}`);
  }

  private generateDiagonalWatermark(
    width: number,
    height: number,
    text: string,
    fontFamily: string,
    fontSize: number,
    color: string,
    rotation: number
  ): string {
    const cx = width / 2;
    const cy = height / 2;
    return `
      <g class="watermark" pointer-events="none">
        <text
          x="${cx}"
          y="${cy}"
          font-family="${fontFamily}"
          font-size="${fontSize}"
          fill="${color}"
          text-anchor="middle"
          dominant-baseline="middle"
          transform="rotate(${rotation} ${cx} ${cy})"
        >${this.escapeXml(text)}</text>
      </g>
    `;
  }

  private generateTiledWatermark(
    width: number,
    height: number,
    text: string,
    fontFamily: string,
    fontSize: number,
    color: string,
    rotation: number,
    spacing: number
  ): string {
    const elements: string[] = [];
    const diagonal = Math.sqrt(width * width + height * height);
    const numX = Math.ceil(diagonal / spacing) + 2;
    const numY = Math.ceil(diagonal / spacing) + 2;
    const offsetX = -spacing;
    const offsetY = -spacing;

    for (let i = 0; i < numY; i++) {
      for (let j = 0; j < numX; j++) {
        const x = offsetX + j * spacing;
        const y = offsetY + i * spacing;
        elements.push(`
          <text
            x="${x}"
            y="${y}"
            font-family="${fontFamily}"
            font-size="${fontSize}"
            fill="${color}"
            text-anchor="middle"
            dominant-baseline="middle"
            transform="rotate(${rotation} ${x} ${y})"
          >${this.escapeXml(text)}</text>
        `);
      }
    }

    return `<g class="watermark" pointer-events="none">${elements.join('')}</g>`;
  }

  private generateCenterWatermark(
    width: number,
    height: number,
    text: string,
    fontFamily: string,
    fontSize: number,
    color: string
  ): string {
    return `
      <g class="watermark" pointer-events="none">
        <text
          x="${width / 2}"
          y="${height / 2}"
          font-family="${fontFamily}"
          font-size="${fontSize}"
          fill="${color}"
          text-anchor="middle"
          dominant-baseline="middle"
        >${this.escapeXml(text)}</text>
      </g>
    `;
  }

  private generateCornerWatermarks(
    width: number,
    height: number,
    text: string,
    fontFamily: string,
    fontSize: number,
    color: string
  ): string {
    const padding = 20;
    return `
      <g class="watermark" pointer-events="none">
        <text x="${padding}" y="${padding + fontSize}" font-family="${fontFamily}" font-size="${fontSize}" fill="${color}">${this.escapeXml(text)}</text>
        <text x="${width - padding}" y="${padding + fontSize}" font-family="${fontFamily}" font-size="${fontSize}" fill="${color}" text-anchor="end">${this.escapeXml(text)}</text>
        <text x="${padding}" y="${height - padding}" font-family="${fontFamily}" font-size="${fontSize}" fill="${color}">${this.escapeXml(text)}</text>
        <text x="${width - padding}" y="${height - padding}" font-family="${fontFamily}" font-size="${fontSize}" fill="${color}" text-anchor="end">${this.escapeXml(text)}</text>
      </g>
    `;
  }

  private generateBottomRightWatermark(
    width: number,
    height: number,
    text: string,
    fontFamily: string,
    fontSize: number,
    color: string
  ): string {
    const padding = 20;
    return `
      <g class="watermark" pointer-events="none">
        <text
          x="${width - padding}"
          y="${height - padding}"
          font-family="${fontFamily}"
          font-size="${fontSize}"
          fill="${color}"
          text-anchor="end"
        >${this.escapeXml(text)}</text>
      </g>
    `;
  }

  private generatePatternDef(options: PatternWatermarkOptions): string {
    const {
      style,
      opacity = 0.05,
      color = '#000000',
      size = 20,
      strokeWidth = 1,
    } = options;

    const id = `watermark-pattern-${style}`;

    switch (style) {
      case 'lines':
        return `
          <pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>
          </pattern>
        `;
      case 'dots':
        return `
          <pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
            <circle cx="${size / 2}" cy="${size / 2}" r="${strokeWidth}" fill="${color}" opacity="${opacity}"/>
          </pattern>
        `;
      case 'grid':
        return `
          <pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="${size}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>
            <line x1="0" y1="0" x2="${size}" y2="0" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>
          </pattern>
        `;
      case 'crosshatch':
        return `
          <pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>
            <line x1="${size}" y1="0" x2="0" y2="${size}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>
          </pattern>
        `;
      default:
        return '';
    }
  }

  private generatePatternOverlay(): string {
    return `
      <rect
        class="watermark-pattern"
        width="100%"
        height="100%"
        fill="url(#watermark-pattern-lines)"
        pointer-events="none"
      />
    `;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a watermark manager instance
 */
export function createWatermarkManager(config?: Partial<WatermarkConfig>): WatermarkManager {
  return new WatermarkManager(config);
}

// =============================================================================
// Preset Configurations
// =============================================================================

/**
 * Default watermark for viewer role
 */
export const VIEWER_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: true,
  watermarks: [
    {
      type: 'text',
      text: 'CONFIDENTIAL',
      position: 'diagonal',
      fontSize: 72,
      color: 'rgba(128, 128, 128, 0.15)',
      rotation: -45,
    },
  ],
  applyTo: ['svg', 'png', 'pdf'],
  forRoles: ['viewer'],
};

/**
 * Subtle watermark for commenter role
 */
export const COMMENTER_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: true,
  watermarks: [
    {
      type: 'text',
      text: 'DRAFT',
      position: 'bottom-right',
      fontSize: 14,
      color: 'rgba(128, 128, 128, 0.3)',
    },
    {
      type: 'steganographic',
      metadata: {
        documentId: '',
        exportedBy: '',
        exportedAt: 0,
      },
    },
  ],
  applyTo: ['svg', 'png', 'pdf', 'html'],
  forRoles: ['commenter'],
};

/**
 * Development watermark
 */
export const DEVELOPER_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: true,
  watermarks: [
    {
      type: 'steganographic',
      metadata: {
        documentId: '',
        exportedBy: '',
        exportedAt: 0,
      },
    },
  ],
  applyTo: ['svg', 'html'],
  forRoles: ['developer'],
};
