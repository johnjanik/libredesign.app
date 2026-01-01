/**
 * Token Exporter
 *
 * Export design tokens to various formats.
 */

import type { RGBA } from '@core/types/color';
import { rgbaToHex } from '@core/types/color';
import type { TokenRegistry } from './token-registry';
import type {
  AnyDesignToken,
  ColorToken,
  TypographyToken,
  SpacingToken,
  ShadowToken,
  RadiusToken,
  OpacityToken,
  ShadowValue,
} from './token-types';

/** Supported export formats */
export type TokenExportFormat =
  | 'css-variables'
  | 'scss-variables'
  | 'tailwind-config'
  | 'json-dtf'  // Design Tokens Format (W3C draft)
  | 'swift-colors'
  | 'kotlin-compose';

/** Export options */
export interface TokenExportOptions {
  /** Include comments/descriptions */
  includeComments?: boolean;
  /** Prefix for variable names */
  prefix?: string;
  /** Minify output */
  minify?: boolean;
  /** Include theme variants */
  includeThemes?: boolean;
}

/**
 * Token Exporter
 *
 * Exports design tokens to various formats.
 */
export class TokenExporter {
  constructor(private readonly registry: TokenRegistry) {}

  /**
   * Export tokens to the specified format.
   */
  export(format: TokenExportFormat, options: TokenExportOptions = {}): string {
    const tokens = this.registry.getAll();

    switch (format) {
      case 'css-variables':
        return this.exportCSSVariables(tokens, options);
      case 'scss-variables':
        return this.exportSCSSVariables(tokens, options);
      case 'tailwind-config':
        return this.exportTailwindConfig(tokens, options);
      case 'json-dtf':
        return this.exportDesignTokensFormat(tokens, options);
      case 'swift-colors':
        return this.exportSwiftColors(tokens, options);
      case 'kotlin-compose':
        return this.exportKotlinCompose(tokens, options);
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  // ===========================================================================
  // CSS Variables
  // ===========================================================================

  private exportCSSVariables(tokens: AnyDesignToken[], options: TokenExportOptions): string {
    const prefix = options.prefix ?? 'designlibre';
    const lines: string[] = [];
    const indent = options.minify ? '' : '  ';
    const newline = options.minify ? '' : '\n';

    lines.push(':root {');

    // Group tokens by type
    const byType = this.groupByType(tokens);

    // Colors
    if (byType.color.length > 0) {
      if (options.includeComments && !options.minify) {
        lines.push('  /* Colors */');
      }
      for (const token of byType.color) {
        const varName = this.toKebabCase(`${prefix}-${token.name}`);
        const value = this.rgbaToCSS(token.value);
        lines.push(`${indent}--${varName}: ${value};`);
      }
      if (!options.minify) lines.push('');
    }

    // Typography
    if (byType.typography.length > 0) {
      if (options.includeComments && !options.minify) {
        lines.push('  /* Typography */');
      }
      for (const token of byType.typography) {
        const baseName = this.toKebabCase(`${prefix}-${token.name}`);
        lines.push(`${indent}--${baseName}-font-family: "${token.value.fontFamily}";`);
        lines.push(`${indent}--${baseName}-font-size: ${token.value.fontSize}px;`);
        lines.push(`${indent}--${baseName}-font-weight: ${token.value.fontWeight};`);
        lines.push(`${indent}--${baseName}-line-height: ${this.formatLineHeight(token.value.lineHeight)};`);
        lines.push(`${indent}--${baseName}-letter-spacing: ${token.value.letterSpacing}px;`);
      }
      if (!options.minify) lines.push('');
    }

    // Spacing
    if (byType.spacing.length > 0) {
      if (options.includeComments && !options.minify) {
        lines.push('  /* Spacing */');
      }
      for (const token of byType.spacing) {
        const varName = this.toKebabCase(`${prefix}-spacing-${token.name}`);
        lines.push(`${indent}--${varName}: ${token.value}px;`);
      }
      if (!options.minify) lines.push('');
    }

    // Shadows
    if (byType.shadow.length > 0) {
      if (options.includeComments && !options.minify) {
        lines.push('  /* Shadows */');
      }
      for (const token of byType.shadow) {
        const varName = this.toKebabCase(`${prefix}-shadow-${token.name}`);
        const value = this.shadowToCSS(token.value);
        lines.push(`${indent}--${varName}: ${value};`);
      }
      if (!options.minify) lines.push('');
    }

    // Radius
    if (byType.radius.length > 0) {
      if (options.includeComments && !options.minify) {
        lines.push('  /* Border Radius */');
      }
      for (const token of byType.radius) {
        const varName = this.toKebabCase(`${prefix}-radius-${token.name}`);
        const value = this.radiusToCSS(token.value);
        lines.push(`${indent}--${varName}: ${value};`);
      }
      if (!options.minify) lines.push('');
    }

    // Opacity
    if (byType.opacity.length > 0) {
      if (options.includeComments && !options.minify) {
        lines.push('  /* Opacity */');
      }
      for (const token of byType.opacity) {
        const varName = this.toKebabCase(`${prefix}-opacity-${token.name}`);
        lines.push(`${indent}--${varName}: ${token.value};`);
      }
    }

    lines.push('}');

    // Dark theme
    if (options.includeThemes) {
      const darkColors = byType.color.filter(t => t.darkValue);
      if (darkColors.length > 0) {
        lines.push('');
        lines.push('@media (prefers-color-scheme: dark) {');
        lines.push('  :root {');
        for (const token of darkColors) {
          const varName = this.toKebabCase(`${prefix}-${token.name}`);
          const value = this.rgbaToCSS(token.darkValue!);
          lines.push(`    --${varName}: ${value};`);
        }
        lines.push('  }');
        lines.push('}');
      }
    }

    return lines.join(newline);
  }

  // ===========================================================================
  // SCSS Variables
  // ===========================================================================

  private exportSCSSVariables(tokens: AnyDesignToken[], options: TokenExportOptions): string {
    const prefix = options.prefix ?? 'designlibre';
    const lines: string[] = [];

    const byType = this.groupByType(tokens);

    // Colors
    if (byType.color.length > 0) {
      if (options.includeComments) lines.push('// Colors');
      for (const token of byType.color) {
        const varName = this.toKebabCase(`${prefix}-${token.name}`);
        const value = this.rgbaToCSS(token.value);
        lines.push(`$${varName}: ${value};`);
      }
      lines.push('');
    }

    // Typography map
    if (byType.typography.length > 0) {
      if (options.includeComments) lines.push('// Typography');
      lines.push(`$${prefix}-typography: (`);
      for (const token of byType.typography) {
        const name = this.toKebabCase(token.name);
        lines.push(`  "${name}": (`);
        lines.push(`    font-family: "${token.value.fontFamily}",`);
        lines.push(`    font-size: ${token.value.fontSize}px,`);
        lines.push(`    font-weight: ${token.value.fontWeight},`);
        lines.push(`    line-height: ${this.formatLineHeight(token.value.lineHeight)},`);
        lines.push(`    letter-spacing: ${token.value.letterSpacing}px`);
        lines.push(`  ),`);
      }
      lines.push(');');
      lines.push('');
    }

    // Spacing
    if (byType.spacing.length > 0) {
      if (options.includeComments) lines.push('// Spacing');
      for (const token of byType.spacing) {
        const varName = this.toKebabCase(`${prefix}-spacing-${token.name}`);
        lines.push(`$${varName}: ${token.value}px;`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // ===========================================================================
  // Tailwind Config
  // ===========================================================================

  private exportTailwindConfig(tokens: AnyDesignToken[], _options: TokenExportOptions): string {
    const byType = this.groupByType(tokens);

    const config: Record<string, unknown> = {
      theme: {
        extend: {},
      },
    };

    const extend = (config['theme'] as Record<string, unknown>)['extend'] as Record<string, unknown>;

    // Colors
    if (byType.color.length > 0) {
      const colors: Record<string, string> = {};
      for (const token of byType.color) {
        const name = this.toKebabCase(token.name);
        colors[name] = this.rgbaToCSS(token.value);
      }
      extend['colors'] = colors;
    }

    // Spacing
    if (byType.spacing.length > 0) {
      const spacing: Record<string, string> = {};
      for (const token of byType.spacing) {
        const name = this.toKebabCase(token.name);
        spacing[name] = `${token.value}px`;
      }
      extend['spacing'] = spacing;
    }

    // Border radius
    if (byType.radius.length > 0) {
      const borderRadius: Record<string, string> = {};
      for (const token of byType.radius) {
        const name = this.toKebabCase(token.name);
        borderRadius[name] = this.radiusToCSS(token.value);
      }
      extend['borderRadius'] = borderRadius;
    }

    // Box shadow
    if (byType.shadow.length > 0) {
      const boxShadow: Record<string, string> = {};
      for (const token of byType.shadow) {
        const name = this.toKebabCase(token.name);
        boxShadow[name] = this.shadowToCSS(token.value);
      }
      extend['boxShadow'] = boxShadow;
    }

    // Font family
    const typographyFonts = new Set<string>();
    for (const token of byType.typography) {
      typographyFonts.add(token.value.fontFamily);
    }
    if (typographyFonts.size > 0) {
      const fontFamily: Record<string, string[]> = {};
      for (const font of typographyFonts) {
        const name = this.toKebabCase(font);
        fontFamily[name] = [font, 'sans-serif'];
      }
      extend['fontFamily'] = fontFamily;
    }

    return `/** @type {import('tailwindcss').Config} */
module.exports = ${JSON.stringify(config, null, 2)}`;
  }

  // ===========================================================================
  // Design Tokens Format (W3C Draft)
  // ===========================================================================

  private exportDesignTokensFormat(tokens: AnyDesignToken[], _options: TokenExportOptions): string {
    const output: Record<string, unknown> = {};
    const byType = this.groupByType(tokens);

    // Colors
    if (byType.color.length > 0) {
      output['color'] = {};
      for (const token of byType.color) {
        const name = this.toCamelCase(token.name);
        (output['color'] as Record<string, unknown>)[name] = {
          $type: 'color',
          $value: rgbaToHex(token.value, true),
          $description: token.description,
        };
      }
    }

    // Typography
    if (byType.typography.length > 0) {
      output['typography'] = {};
      for (const token of byType.typography) {
        const name = this.toCamelCase(token.name);
        (output['typography'] as Record<string, unknown>)[name] = {
          $type: 'typography',
          $value: {
            fontFamily: token.value.fontFamily,
            fontSize: `${token.value.fontSize}px`,
            fontWeight: token.value.fontWeight,
            lineHeight: this.formatLineHeight(token.value.lineHeight),
            letterSpacing: `${token.value.letterSpacing}px`,
          },
          $description: token.description,
        };
      }
    }

    // Spacing
    if (byType.spacing.length > 0) {
      output['spacing'] = {};
      for (const token of byType.spacing) {
        const name = this.toCamelCase(token.name);
        (output['spacing'] as Record<string, unknown>)[name] = {
          $type: 'dimension',
          $value: `${token.value}px`,
          $description: token.description,
        };
      }
    }

    // Shadow
    if (byType.shadow.length > 0) {
      output['shadow'] = {};
      for (const token of byType.shadow) {
        const name = this.toCamelCase(token.name);
        (output['shadow'] as Record<string, unknown>)[name] = {
          $type: 'shadow',
          $value: {
            offsetX: `${token.value.offsetX}px`,
            offsetY: `${token.value.offsetY}px`,
            blur: `${token.value.blur}px`,
            spread: `${token.value.spread}px`,
            color: rgbaToHex(token.value.color, true),
          },
          $description: token.description,
        };
      }
    }

    return JSON.stringify(output, null, 2);
  }

  // ===========================================================================
  // Swift Colors
  // ===========================================================================

  private exportSwiftColors(tokens: AnyDesignToken[], options: TokenExportOptions): string {
    const lines: string[] = [];
    const prefix = options.prefix ?? 'DesignLibre';

    lines.push('import SwiftUI');
    lines.push('');
    lines.push(`extension Color {`);

    const colorTokens = this.groupByType(tokens).color;

    for (const token of colorTokens) {
      const name = this.toCamelCase(token.name);
      const { r, g, b, a } = token.value;

      if (options.includeComments && token.description) {
        lines.push(`    /// ${token.description}`);
      }

      lines.push(`    static let ${prefix.toLowerCase()}${this.capitalize(name)} = Color(`);
      lines.push(`        red: ${r.toFixed(3)},`);
      lines.push(`        green: ${g.toFixed(3)},`);
      lines.push(`        blue: ${b.toFixed(3)},`);
      lines.push(`        opacity: ${a.toFixed(3)}`);
      lines.push(`    )`);
      lines.push('');
    }

    lines.push('}');

    // UIColor extension
    lines.push('');
    lines.push('extension UIColor {');

    for (const token of colorTokens) {
      const name = this.toCamelCase(token.name);
      const { r, g, b, a } = token.value;

      lines.push(`    static let ${prefix.toLowerCase()}${this.capitalize(name)} = UIColor(`);
      lines.push(`        red: ${r.toFixed(3)},`);
      lines.push(`        green: ${g.toFixed(3)},`);
      lines.push(`        blue: ${b.toFixed(3)},`);
      lines.push(`        alpha: ${a.toFixed(3)}`);
      lines.push(`    )`);
      lines.push('');
    }

    lines.push('}');

    return lines.join('\n');
  }

  // ===========================================================================
  // Kotlin Compose
  // ===========================================================================

  private exportKotlinCompose(tokens: AnyDesignToken[], options: TokenExportOptions): string {
    const lines: string[] = [];
    const prefix = options.prefix ?? 'DesignLibre';

    lines.push('package com.designlibre.design');
    lines.push('');
    lines.push('import androidx.compose.ui.graphics.Color');
    lines.push('import androidx.compose.ui.unit.dp');
    lines.push('import androidx.compose.ui.unit.sp');
    lines.push('import androidx.compose.ui.text.TextStyle');
    lines.push('import androidx.compose.ui.text.font.FontWeight');
    lines.push('');

    const byType = this.groupByType(tokens);

    // Colors object
    lines.push(`object ${prefix}Colors {`);
    for (const token of byType.color) {
      const name = this.toCamelCase(token.name);
      const hex = this.rgbaToHexInt(token.value);

      if (options.includeComments && token.description) {
        lines.push(`    /** ${token.description} */`);
      }
      lines.push(`    val ${name} = Color(${hex})`);
    }
    lines.push('}');
    lines.push('');

    // Spacing object
    if (byType.spacing.length > 0) {
      lines.push(`object ${prefix}Spacing {`);
      for (const token of byType.spacing) {
        const name = this.toCamelCase(token.name);
        lines.push(`    val ${name} = ${token.value}.dp`);
      }
      lines.push('}');
      lines.push('');
    }

    // Typography object
    if (byType.typography.length > 0) {
      lines.push(`object ${prefix}Typography {`);
      for (const token of byType.typography) {
        const name = this.toCamelCase(token.name);
        const v = token.value;
        const fontWeight = this.kotlinFontWeight(v.fontWeight);

        lines.push(`    val ${name} = TextStyle(`);
        lines.push(`        fontSize = ${v.fontSize}.sp,`);
        lines.push(`        fontWeight = ${fontWeight},`);
        lines.push(`        letterSpacing = ${v.letterSpacing}.sp`);
        lines.push(`    )`);
      }
      lines.push('}');
    }

    return lines.join('\n');
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private groupByType(tokens: AnyDesignToken[]): {
    color: ColorToken[];
    typography: TypographyToken[];
    spacing: SpacingToken[];
    shadow: ShadowToken[];
    radius: RadiusToken[];
    opacity: OpacityToken[];
  } {
    const result = {
      color: [] as ColorToken[],
      typography: [] as TypographyToken[],
      spacing: [] as SpacingToken[],
      shadow: [] as ShadowToken[],
      radius: [] as RadiusToken[],
      opacity: [] as OpacityToken[],
    };

    for (const token of tokens) {
      switch (token.type) {
        case 'color':
          result.color.push(token as ColorToken);
          break;
        case 'typography':
          result.typography.push(token as TypographyToken);
          break;
        case 'spacing':
          result.spacing.push(token as SpacingToken);
          break;
        case 'shadow':
          result.shadow.push(token as ShadowToken);
          break;
        case 'radius':
          result.radius.push(token as RadiusToken);
          break;
        case 'opacity':
          result.opacity.push(token as OpacityToken);
          break;
      }
    }

    return result;
  }

  private rgbaToCSS(color: RGBA): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    if (color.a === 1) {
      return rgbaToHex(color);
    }

    return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
  }

  private rgbaToHexInt(color: RGBA): string {
    const a = Math.round(color.a * 255);
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    const hex = ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
    return `0x${hex.toString(16).toUpperCase().padStart(8, '0')}`;
  }

  private shadowToCSS(shadow: ShadowValue): string {
    const inset = shadow.inset ? 'inset ' : '';
    const color = this.rgbaToCSS(shadow.color);
    return `${inset}${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${color}`;
  }

  private radiusToCSS(value: number | readonly [number, number, number, number]): string {
    if (typeof value === 'number') {
      return `${value}px`;
    }
    return value.map(v => `${v}px`).join(' ');
  }

  private formatLineHeight(lh: number | 'auto'): string {
    if (lh === 'auto') return 'normal';
    return String(lh);
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  private toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^[A-Z]/, c => c.toLowerCase());
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private kotlinFontWeight(weight: number): string {
    const weights: Record<number, string> = {
      100: 'FontWeight.Thin',
      200: 'FontWeight.ExtraLight',
      300: 'FontWeight.Light',
      400: 'FontWeight.Normal',
      500: 'FontWeight.Medium',
      600: 'FontWeight.SemiBold',
      700: 'FontWeight.Bold',
      800: 'FontWeight.ExtraBold',
      900: 'FontWeight.Black',
    };
    return weights[weight] ?? `FontWeight(${weight})`;
  }
}

/**
 * Create a token exporter.
 */
export function createTokenExporter(registry: TokenRegistry): TokenExporter {
  return new TokenExporter(registry);
}
