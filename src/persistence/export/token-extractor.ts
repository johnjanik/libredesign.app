/**
 * Design Token Extractor
 *
 * Extracts design tokens from DesignLibre designs and exports them
 * in multiple formats: CSS custom properties, Tailwind config,
 * UnoCSS config, and Design Tokens Community Group (DTCG) JSON.
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type {
  NodeData,
  FrameNodeData,
  TextNodeData,
  SceneNodeData,
} from '@scene/nodes/base-node';
import type { Paint } from '@core/types/paint';
import type { Effect } from '@core/types/effect';

// ============================================================================
// Token Types
// ============================================================================

/**
 * Color token
 */
export interface ColorToken {
  name: string;
  value: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  opacity: number;
  source: string;
  category: 'fill' | 'stroke' | 'text';
}

/**
 * Spacing token
 */
export interface SpacingToken {
  name: string;
  value: number;
  source: string;
  category: 'padding' | 'gap' | 'margin';
}

/**
 * Typography token
 */
export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number | 'auto';
  letterSpacing: number;
  source: string;
}

/**
 * Shadow token
 */
export interface ShadowToken {
  name: string;
  type: 'drop' | 'inner';
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  source: string;
}

/**
 * Border radius token
 */
export interface RadiusToken {
  name: string;
  value: number;
  source: string;
}

/**
 * All extracted tokens
 */
export interface ExtractedTokens {
  colors: ColorToken[];
  spacing: SpacingToken[];
  typography: TypographyToken[];
  shadows: ShadowToken[];
  radii: RadiusToken[];
}

/**
 * Token extraction options
 */
export interface TokenExtractionOptions {
  /** Include all nodes or just selected */
  scope: 'all' | 'selected' | 'page';
  /** Deduplicate similar values */
  deduplicate: boolean;
  /** Tolerance for deduplication (e.g., colors within 5 RGB units) */
  tolerance: number;
  /** Generate semantic names */
  generateNames: boolean;
  /** Prefix for generated names */
  prefix: string;
}

const DEFAULT_OPTIONS: TokenExtractionOptions = {
  scope: 'all',
  deduplicate: true,
  tolerance: 5,
  generateNames: true,
  prefix: '',
};

/**
 * Output format type
 */
export type TokenOutputFormat = 'css' | 'tailwind' | 'unocss' | 'dtcg' | 'scss';

/**
 * Token export result
 */
export interface TokenExportResult {
  /** Extracted tokens */
  tokens: ExtractedTokens;
  /** Formatted output */
  output: string;
  /** Output format */
  format: TokenOutputFormat;
  /** File name suggestion */
  fileName: string;
}

// ============================================================================
// Token Extractor
// ============================================================================

/**
 * Design Token Extractor class
 */
export class TokenExtractor {
  private sceneGraph: SceneGraph;
  private options: TokenExtractionOptions;
  private colorMap: Map<string, ColorToken> = new Map();
  private spacingSet: Set<number> = new Set();
  private typographyMap: Map<string, TypographyToken> = new Map();
  private shadowMap: Map<string, ShadowToken> = new Map();
  private radiusSet: Set<number> = new Set();

  constructor(sceneGraph: SceneGraph, options: Partial<TokenExtractionOptions> = {}) {
    this.sceneGraph = sceneGraph;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Extract tokens from the scene graph
   */
  extract(nodeIds?: NodeId[]): ExtractedTokens {
    this.colorMap.clear();
    this.spacingSet.clear();
    this.typographyMap.clear();
    this.shadowMap.clear();
    this.radiusSet.clear();

    // Determine nodes to scan
    const nodesToScan = this.getNodesToScan(nodeIds);

    // Extract tokens from each node
    for (const node of nodesToScan) {
      this.extractFromNode(node);
    }

    // Build final token lists
    return {
      colors: this.buildColorTokens(),
      spacing: this.buildSpacingTokens(),
      typography: this.buildTypographyTokens(),
      shadows: this.buildShadowTokens(),
      radii: this.buildRadiusTokens(),
    };
  }

  /**
   * Extract and export tokens in a specific format
   */
  extractAndExport(format: TokenOutputFormat, nodeIds?: NodeId[]): TokenExportResult {
    const tokens = this.extract(nodeIds);
    const output = this.formatTokens(tokens, format);

    const fileExtensions: Record<TokenOutputFormat, string> = {
      css: 'css',
      scss: 'scss',
      tailwind: 'js',
      unocss: 'ts',
      dtcg: 'json',
    };

    const fileNames: Record<TokenOutputFormat, string> = {
      css: 'tokens',
      scss: '_tokens',
      tailwind: 'tailwind.config',
      unocss: 'uno.config',
      dtcg: 'tokens',
    };

    return {
      tokens,
      output,
      format,
      fileName: `${fileNames[format]}.${fileExtensions[format]}`,
    };
  }

  /**
   * Get nodes to scan based on scope
   */
  private getNodesToScan(nodeIds?: NodeId[]): NodeData[] {
    const nodes: NodeData[] = [];

    if (nodeIds && nodeIds.length > 0) {
      // Scan specific nodes and their descendants
      for (const nodeId of nodeIds) {
        this.collectNodesRecursive(nodeId, nodes);
      }
    } else if (this.options.scope === 'page') {
      // Scan current page
      const pages = this.sceneGraph.getPages();
      if (pages.length > 0) {
        this.collectNodesRecursive(pages[0]!.id, nodes);
      }
    } else {
      // Scan all nodes
      const doc = this.sceneGraph.getDocument();
      if (doc) {
        this.collectNodesRecursive(doc.id, nodes);
      }
    }

    return nodes;
  }

  /**
   * Recursively collect nodes
   */
  private collectNodesRecursive(nodeId: NodeId, nodes: NodeData[]): void {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return;

    nodes.push(node);

    const childIds = this.sceneGraph.getChildIds(nodeId);
    for (const childId of childIds) {
      this.collectNodesRecursive(childId, nodes);
    }
  }

  /**
   * Extract tokens from a single node
   */
  private extractFromNode(node: NodeData): void {
    const sceneNode = node as SceneNodeData;

    // Extract colors from fills
    if ('fills' in sceneNode && sceneNode.fills) {
      for (const fill of sceneNode.fills) {
        if (fill.visible !== false) {
          this.extractColorFromPaint(fill, node.name || 'unnamed', 'fill');
        }
      }
    }

    // Extract colors from strokes
    if ('strokes' in sceneNode && sceneNode.strokes) {
      for (const stroke of sceneNode.strokes) {
        if (stroke.visible !== false) {
          this.extractColorFromPaint(stroke, node.name || 'unnamed', 'stroke');
        }
      }
    }

    // Extract spacing from auto-layout
    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      if (frameNode.autoLayout) {
        const al = frameNode.autoLayout;
        if (al.itemSpacing > 0) this.spacingSet.add(al.itemSpacing);
        if (al.paddingTop > 0) this.spacingSet.add(al.paddingTop);
        if (al.paddingBottom > 0) this.spacingSet.add(al.paddingBottom);
        if (al.paddingLeft > 0) this.spacingSet.add(al.paddingLeft);
        if (al.paddingRight > 0) this.spacingSet.add(al.paddingRight);
      }

      // Extract border radius
      if (frameNode.cornerRadius && frameNode.cornerRadius > 0) {
        this.radiusSet.add(frameNode.cornerRadius);
      }
    }

    // Extract typography from text nodes
    if (node.type === 'TEXT') {
      const textNode = node as TextNodeData;
      if (textNode.textStyles && textNode.textStyles.length > 0) {
        const style = textNode.textStyles[0]!;
        this.extractTypography(style, node.name || 'text');

        // Extract text colors
        if (style.fills) {
          for (const fill of style.fills) {
            if (fill.visible !== false) {
              this.extractColorFromPaint(fill, node.name || 'text', 'text');
            }
          }
        }
      }
    }

    // Extract shadows from effects
    if ('effects' in sceneNode && sceneNode.effects) {
      for (const effect of sceneNode.effects) {
        if (effect.visible !== false) {
          this.extractShadow(effect, node.name || 'unnamed');
        }
      }
    }
  }

  /**
   * Extract color from a paint
   */
  private extractColorFromPaint(paint: Paint, source: string, category: ColorToken['category']): void {
    if (paint.type !== 'SOLID') return;

    const { r, g, b, a } = paint.color;
    const opacity = paint.opacity ?? a;
    const hex = this.rgbToHex(r, g, b);
    const key = this.options.deduplicate
      ? this.getColorKey(r, g, b, opacity)
      : `${hex}-${opacity}-${source}`;

    if (!this.colorMap.has(key)) {
      this.colorMap.set(key, {
        name: '',
        value: opacity < 1
          ? `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${opacity.toFixed(2)})`
          : hex,
        hex,
        rgb: {
          r: Math.round(r * 255),
          g: Math.round(g * 255),
          b: Math.round(b * 255),
        },
        opacity,
        source,
        category,
      });
    }
  }

  /**
   * Extract typography style
   */
  private extractTypography(style: TextNodeData['textStyles'][0], source: string): void {
    const key = `${style.fontFamily}-${style.fontSize}-${style.fontWeight}`;

    if (!this.typographyMap.has(key)) {
      // Handle lineHeight - can be number or 'AUTO'
      const lineHeight: number | 'auto' = typeof style.lineHeight === 'number'
        ? style.lineHeight
        : 'auto';

      // letterSpacing is a number
      const letterSpacing = style.letterSpacing ?? 0;

      this.typographyMap.set(key, {
        name: '',
        fontFamily: style.fontFamily || 'sans-serif',
        fontSize: style.fontSize || 16,
        fontWeight: style.fontWeight || 400,
        lineHeight,
        letterSpacing,
        source,
      });
    }
  }

  /**
   * Extract shadow effect
   */
  private extractShadow(effect: Effect, source: string): void {
    if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') return;

    const key = `${effect.type}-${effect.offset?.x ?? 0}-${effect.offset?.y ?? 0}-${effect.radius ?? 0}`;

    if (!this.shadowMap.has(key)) {
      const color = effect.color
        ? `rgba(${Math.round(effect.color.r * 255)}, ${Math.round(effect.color.g * 255)}, ${Math.round(effect.color.b * 255)}, ${(effect.color.a ?? 1).toFixed(2)})`
        : 'rgba(0, 0, 0, 0.25)';

      this.shadowMap.set(key, {
        name: '',
        type: effect.type === 'DROP_SHADOW' ? 'drop' : 'inner',
        x: effect.offset?.x ?? 0,
        y: effect.offset?.y ?? 0,
        blur: effect.radius ?? 0,
        spread: effect.spread ?? 0,
        color,
        source,
      });
    }
  }

  /**
   * Get color key for deduplication
   */
  private getColorKey(r: number, g: number, b: number, a: number): string {
    const tolerance = this.options.tolerance;
    const rRound = Math.round((r * 255) / tolerance) * tolerance;
    const gRound = Math.round((g * 255) / tolerance) * tolerance;
    const bRound = Math.round((b * 255) / tolerance) * tolerance;
    const aRound = Math.round(a * 100);
    return `${rRound}-${gRound}-${bRound}-${aRound}`;
  }

  /**
   * Convert RGB to hex
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Build color tokens with semantic names
   */
  private buildColorTokens(): ColorToken[] {
    const colors = Array.from(this.colorMap.values());

    if (this.options.generateNames) {
      // Sort by luminance and assign names
      colors.sort((a, b) => this.getLuminance(a.rgb) - this.getLuminance(b.rgb));

      // Group by hue
      const neutrals: ColorToken[] = [];
      const hueGroups: Map<string, ColorToken[]> = new Map();

      for (const color of colors) {
        const hueName = this.getHueName(color.rgb);
        if (hueName === 'gray') {
          neutrals.push(color);
        } else {
          if (!hueGroups.has(hueName)) {
            hueGroups.set(hueName, []);
          }
          hueGroups.get(hueName)!.push(color);
        }
      }

      // Assign names
      const prefix = this.options.prefix ? `${this.options.prefix}-` : '';

      // Name neutrals
      const neutralScales = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
      neutrals.forEach((color, i) => {
        const scaleIndex = Math.min(Math.floor(i / neutrals.length * neutralScales.length), neutralScales.length - 1);
        color.name = `${prefix}gray-${neutralScales[scaleIndex]}`;
      });

      // Name colored groups
      for (const [hueName, hueColors] of hueGroups) {
        hueColors.sort((a, b) => this.getLuminance(b.rgb) - this.getLuminance(a.rgb));
        const scales = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
        hueColors.forEach((color, i) => {
          const scaleIndex = Math.min(Math.floor(i / hueColors.length * scales.length), scales.length - 1);
          color.name = `${prefix}${hueName}-${scales[scaleIndex]}`;
        });
      }
    }

    return colors;
  }

  /**
   * Build spacing tokens
   */
  private buildSpacingTokens(): SpacingToken[] {
    const spacings = Array.from(this.spacingSet).sort((a, b) => a - b);
    const prefix = this.options.prefix ? `${this.options.prefix}-` : '';

    return spacings.map((value, i) => ({
      name: `${prefix}space-${i + 1}`,
      value,
      source: 'auto-layout',
      category: 'gap' as const,
    }));
  }

  /**
   * Build typography tokens
   */
  private buildTypographyTokens(): TypographyToken[] {
    const typography = Array.from(this.typographyMap.values());
    const prefix = this.options.prefix ? `${this.options.prefix}-` : '';

    // Sort by font size
    typography.sort((a, b) => a.fontSize - b.fontSize);

    // Assign names based on size
    const sizeNames = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'];
    typography.forEach((t, i) => {
      const nameIndex = Math.min(Math.floor(i / typography.length * sizeNames.length), sizeNames.length - 1);
      t.name = `${prefix}text-${sizeNames[nameIndex]}`;
    });

    return typography;
  }

  /**
   * Build shadow tokens
   */
  private buildShadowTokens(): ShadowToken[] {
    const shadows = Array.from(this.shadowMap.values());
    const prefix = this.options.prefix ? `${this.options.prefix}-` : '';

    // Sort by blur radius
    shadows.sort((a, b) => a.blur - b.blur);

    // Assign names
    const shadowNames = ['sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl'];
    shadows.forEach((s, i) => {
      const nameIndex = Math.min(Math.floor(i / shadows.length * shadowNames.length), shadowNames.length - 1);
      const suffix = shadowNames[nameIndex] === 'DEFAULT' ? '' : `-${shadowNames[nameIndex]}`;
      s.name = `${prefix}shadow${suffix}`;
    });

    return shadows;
  }

  /**
   * Build radius tokens
   */
  private buildRadiusTokens(): RadiusToken[] {
    const radii = Array.from(this.radiusSet).sort((a, b) => a - b);
    const prefix = this.options.prefix ? `${this.options.prefix}-` : '';

    const radiusNames = ['sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

    return radii.map((value, i) => {
      const nameIndex = Math.min(Math.floor(i / radii.length * radiusNames.length), radiusNames.length - 1);
      const suffix = radiusNames[nameIndex] === 'DEFAULT' ? '' : `-${radiusNames[nameIndex]}`;
      return {
        name: `${prefix}rounded${suffix}`,
        value,
        source: 'frame',
      };
    });
  }

  /**
   * Get luminance of a color
   */
  private getLuminance(rgb: { r: number; g: number; b: number }): number {
    return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  }

  /**
   * Get hue name from RGB
   */
  private getHueName(rgb: { r: number; g: number; b: number }): string {
    const { r, g, b } = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    // Check if grayscale
    if (diff < 30) {
      return 'gray';
    }

    let hue = 0;
    if (max === r) {
      hue = ((g - b) / diff) % 6;
    } else if (max === g) {
      hue = (b - r) / diff + 2;
    } else {
      hue = (r - g) / diff + 4;
    }

    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;

    // Map hue to color name
    if (hue < 15 || hue >= 345) return 'red';
    if (hue < 45) return 'orange';
    if (hue < 75) return 'yellow';
    if (hue < 150) return 'green';
    if (hue < 195) return 'cyan';
    if (hue < 255) return 'blue';
    if (hue < 285) return 'purple';
    if (hue < 345) return 'pink';
    return 'red';
  }

  /**
   * Format tokens to output string
   */
  private formatTokens(tokens: ExtractedTokens, format: TokenOutputFormat): string {
    switch (format) {
      case 'css':
        return this.formatCSS(tokens);
      case 'scss':
        return this.formatSCSS(tokens);
      case 'tailwind':
        return this.formatTailwind(tokens);
      case 'unocss':
        return this.formatUnoCSS(tokens);
      case 'dtcg':
        return this.formatDTCG(tokens);
      default:
        return this.formatCSS(tokens);
    }
  }

  /**
   * Format as CSS custom properties
   */
  private formatCSS(tokens: ExtractedTokens): string {
    const lines: string[] = [
      '/**',
      ' * Design Tokens',
      ' * Generated by DesignLibre',
      ' */',
      '',
      ':root {',
    ];

    // Colors
    if (tokens.colors.length > 0) {
      lines.push('  /* Colors */');
      for (const color of tokens.colors) {
        lines.push(`  --${color.name}: ${color.value};`);
      }
      lines.push('');
    }

    // Spacing
    if (tokens.spacing.length > 0) {
      lines.push('  /* Spacing */');
      for (const space of tokens.spacing) {
        lines.push(`  --${space.name}: ${space.value}px;`);
      }
      lines.push('');
    }

    // Typography
    if (tokens.typography.length > 0) {
      lines.push('  /* Typography */');
      for (const typo of tokens.typography) {
        lines.push(`  --${typo.name}-size: ${typo.fontSize}px;`);
        lines.push(`  --${typo.name}-weight: ${typo.fontWeight};`);
        lines.push(`  --${typo.name}-line-height: ${typo.lineHeight === 'auto' ? 'normal' : `${typo.lineHeight}px`};`);
      }
      lines.push('');
    }

    // Shadows
    if (tokens.shadows.length > 0) {
      lines.push('  /* Shadows */');
      for (const shadow of tokens.shadows) {
        const inset = shadow.type === 'inner' ? 'inset ' : '';
        lines.push(`  --${shadow.name}: ${inset}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color};`);
      }
      lines.push('');
    }

    // Border Radius
    if (tokens.radii.length > 0) {
      lines.push('  /* Border Radius */');
      for (const radius of tokens.radii) {
        lines.push(`  --${radius.name}: ${radius.value}px;`);
      }
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Format as SCSS variables
   */
  private formatSCSS(tokens: ExtractedTokens): string {
    const lines: string[] = [
      '// Design Tokens',
      '// Generated by DesignLibre',
      '',
    ];

    // Colors
    if (tokens.colors.length > 0) {
      lines.push('// Colors');
      for (const color of tokens.colors) {
        lines.push(`$${color.name}: ${color.value};`);
      }
      lines.push('');

      // Color map
      lines.push('$colors: (');
      for (const color of tokens.colors) {
        lines.push(`  "${color.name}": $${color.name},`);
      }
      lines.push(');');
      lines.push('');
    }

    // Spacing
    if (tokens.spacing.length > 0) {
      lines.push('// Spacing');
      for (const space of tokens.spacing) {
        lines.push(`$${space.name}: ${space.value}px;`);
      }
      lines.push('');

      // Spacing map
      lines.push('$spacing: (');
      for (const space of tokens.spacing) {
        const key = space.name.replace('space-', '');
        lines.push(`  ${key}: $${space.name},`);
      }
      lines.push(');');
      lines.push('');
    }

    // Typography
    if (tokens.typography.length > 0) {
      lines.push('// Typography');
      for (const typo of tokens.typography) {
        const key = typo.name.replace('text-', '');
        lines.push(`$font-size-${key}: ${typo.fontSize}px;`);
      }
      lines.push('');
    }

    // Border Radius
    if (tokens.radii.length > 0) {
      lines.push('// Border Radius');
      for (const radius of tokens.radii) {
        lines.push(`$${radius.name}: ${radius.value}px;`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format as Tailwind config
   */
  private formatTailwind(tokens: ExtractedTokens): string {
    interface TailwindExtend {
      colors?: Record<string, string | Record<string, string>>;
      spacing?: Record<string, string>;
      fontSize?: Record<string, [string, { lineHeight: string; fontWeight: string }]>;
      boxShadow?: Record<string, string>;
      borderRadius?: Record<string, string>;
    }

    const extend: TailwindExtend = {};

    // Colors
    if (tokens.colors.length > 0) {
      const colors: Record<string, string | Record<string, string>> = {};
      for (const color of tokens.colors) {
        const parts = color.name.split('-');
        if (parts.length >= 2) {
          const colorName = parts.slice(0, -1).join('-');
          const shade = parts[parts.length - 1]!;
          if (!colors[colorName]) {
            colors[colorName] = {};
          }
          (colors[colorName] as Record<string, string>)[shade] = color.value;
        } else {
          colors[color.name] = color.value;
        }
      }
      extend.colors = colors;
    }

    // Spacing
    if (tokens.spacing.length > 0) {
      const spacing: Record<string, string> = {};
      for (const space of tokens.spacing) {
        const key = space.name.replace('space-', '');
        spacing[key] = `${space.value}px`;
      }
      extend.spacing = spacing;
    }

    // Font sizes
    if (tokens.typography.length > 0) {
      const fontSize: Record<string, [string, { lineHeight: string; fontWeight: string }]> = {};
      for (const typo of tokens.typography) {
        const key = typo.name.replace('text-', '');
        fontSize[key] = [
          `${typo.fontSize}px`,
          {
            lineHeight: typo.lineHeight === 'auto' ? '1.5' : `${typo.lineHeight}px`,
            fontWeight: String(typo.fontWeight),
          },
        ];
      }
      extend.fontSize = fontSize;
    }

    // Box shadows
    if (tokens.shadows.length > 0) {
      const boxShadow: Record<string, string> = {};
      for (const shadow of tokens.shadows) {
        const key = shadow.name.replace('shadow-', '') || 'DEFAULT';
        const inset = shadow.type === 'inner' ? 'inset ' : '';
        boxShadow[key] = `${inset}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`;
      }
      extend.boxShadow = boxShadow;
    }

    // Border radius
    if (tokens.radii.length > 0) {
      const borderRadius: Record<string, string> = {};
      for (const radius of tokens.radii) {
        const key = radius.name.replace('rounded-', '') || 'DEFAULT';
        borderRadius[key] = `${radius.value}px`;
      }
      extend.borderRadius = borderRadius;
    }

    const config = {
      theme: { extend },
    };

    const lines = [
      '/** @type {import(\'tailwindcss\').Config} */',
      'module.exports = ' + JSON.stringify(config, null, 2),
    ];

    return lines.join('\n');
  }

  /**
   * Format as UnoCSS config
   */
  private formatUnoCSS(tokens: ExtractedTokens): string {
    const lines: string[] = [
      "import { defineConfig, presetUno } from 'unocss';",
      '',
      'export default defineConfig({',
      '  presets: [presetUno()],',
      '  theme: {',
    ];

    // Colors
    if (tokens.colors.length > 0) {
      lines.push('    colors: {');
      const colorGroups: Record<string, Record<string, string>> = {};
      for (const color of tokens.colors) {
        const parts = color.name.split('-');
        if (parts.length >= 2) {
          const colorName = parts.slice(0, -1).join('-');
          const shade = parts[parts.length - 1]!;
          if (!colorGroups[colorName]) {
            colorGroups[colorName] = {};
          }
          colorGroups[colorName]![shade] = color.value;
        }
      }
      for (const [name, shades] of Object.entries(colorGroups)) {
        lines.push(`      '${name}': {`);
        for (const [shade, value] of Object.entries(shades)) {
          lines.push(`        '${shade}': '${value}',`);
        }
        lines.push('      },');
      }
      lines.push('    },');
    }

    // Spacing
    if (tokens.spacing.length > 0) {
      lines.push('    spacing: {');
      for (const space of tokens.spacing) {
        const key = space.name.replace('space-', '');
        lines.push(`      '${key}': '${space.value}px',`);
      }
      lines.push('    },');
    }

    // Font sizes
    if (tokens.typography.length > 0) {
      lines.push('    fontSize: {');
      for (const typo of tokens.typography) {
        const key = typo.name.replace('text-', '');
        const lh = typo.lineHeight === 'auto' ? '1.5' : `${typo.lineHeight}px`;
        lines.push(`      '${key}': ['${typo.fontSize}px', { lineHeight: '${lh}' }],`);
      }
      lines.push('    },');
    }

    // Border radius
    if (tokens.radii.length > 0) {
      lines.push('    borderRadius: {');
      for (const radius of tokens.radii) {
        const key = radius.name.replace('rounded-', '') || 'DEFAULT';
        lines.push(`      '${key}': '${radius.value}px',`);
      }
      lines.push('    },');
    }

    // Box shadows
    if (tokens.shadows.length > 0) {
      lines.push('    boxShadow: {');
      for (const shadow of tokens.shadows) {
        const key = shadow.name.replace('shadow-', '') || 'DEFAULT';
        const inset = shadow.type === 'inner' ? 'inset ' : '';
        lines.push(`      '${key}': '${inset}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}',`);
      }
      lines.push('    },');
    }

    lines.push('  },');
    lines.push('});');

    return lines.join('\n');
  }

  /**
   * Format as Design Tokens Community Group JSON
   */
  private formatDTCG(tokens: ExtractedTokens): string {
    interface DTCGToken {
      $type: string;
      $value: unknown;
      $description?: string;
    }

    interface DTCGOutput {
      $schema: string;
      $description: string;
      color?: Record<string, Record<string, DTCGToken>>;
      spacing?: Record<string, DTCGToken>;
      typography?: Record<string, DTCGToken>;
      shadow?: Record<string, DTCGToken>;
      borderRadius?: Record<string, DTCGToken>;
    }

    const dtcg: DTCGOutput = {
      $schema: 'https://design-tokens.github.io/community-group/format/',
      $description: 'Design tokens generated by DesignLibre',
    };

    // Colors
    if (tokens.colors.length > 0) {
      const colors: Record<string, Record<string, DTCGToken>> = {};
      for (const color of tokens.colors) {
        const parts = color.name.split('-');
        const colorName = parts.slice(0, -1).join('-') || color.name;
        const shade = parts.length > 1 ? parts[parts.length - 1] : 'DEFAULT';

        if (!colors[colorName]) {
          colors[colorName] = {};
        }
        colors[colorName]![shade!] = {
          $type: 'color',
          $value: color.value,
          $description: `Source: ${color.source}`,
        };
      }
      dtcg.color = colors;
    }

    // Spacing
    if (tokens.spacing.length > 0) {
      const spacing: Record<string, DTCGToken> = {};
      for (const space of tokens.spacing) {
        const key = space.name.replace('space-', '');
        spacing[key] = {
          $type: 'dimension',
          $value: `${space.value}px`,
        };
      }
      dtcg.spacing = spacing;
    }

    // Typography
    if (tokens.typography.length > 0) {
      const typography: Record<string, DTCGToken> = {};
      for (const typo of tokens.typography) {
        const key = typo.name.replace('text-', '');
        typography[key] = {
          $type: 'typography',
          $value: {
            fontFamily: typo.fontFamily,
            fontSize: `${typo.fontSize}px`,
            fontWeight: typo.fontWeight,
            lineHeight: typo.lineHeight === 'auto' ? 1.5 : typo.lineHeight,
            letterSpacing: `${typo.letterSpacing}px`,
          },
        };
      }
      dtcg.typography = typography;
    }

    // Shadows
    if (tokens.shadows.length > 0) {
      const shadows: Record<string, DTCGToken> = {};
      for (const shadow of tokens.shadows) {
        const key = shadow.name.replace('shadow-', '') || 'default';
        shadows[key] = {
          $type: 'shadow',
          $value: {
            color: shadow.color,
            offsetX: `${shadow.x}px`,
            offsetY: `${shadow.y}px`,
            blur: `${shadow.blur}px`,
            spread: `${shadow.spread}px`,
            inset: shadow.type === 'inner',
          },
        };
      }
      dtcg.shadow = shadows;
    }

    // Border Radius
    if (tokens.radii.length > 0) {
      const radii: Record<string, DTCGToken> = {};
      for (const radius of tokens.radii) {
        const key = radius.name.replace('rounded-', '') || 'default';
        radii[key] = {
          $type: 'dimension',
          $value: `${radius.value}px`,
        };
      }
      dtcg.borderRadius = radii;
    }

    return JSON.stringify(dtcg, null, 2);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a token extractor
 */
export function createTokenExtractor(
  sceneGraph: SceneGraph,
  options?: Partial<TokenExtractionOptions>
): TokenExtractor {
  return new TokenExtractor(sceneGraph, options);
}

/**
 * Quick extraction function
 */
export function extractTokens(
  sceneGraph: SceneGraph,
  nodeIds?: NodeId[],
  options?: Partial<TokenExtractionOptions>
): ExtractedTokens {
  const extractor = createTokenExtractor(sceneGraph, options);
  return extractor.extract(nodeIds);
}

/**
 * Quick export function
 */
export function exportTokens(
  sceneGraph: SceneGraph,
  format: TokenOutputFormat,
  nodeIds?: NodeId[],
  options?: Partial<TokenExtractionOptions>
): TokenExportResult {
  const extractor = createTokenExtractor(sceneGraph, options);
  return extractor.extractAndExport(format, nodeIds);
}
