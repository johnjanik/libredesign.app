/**
 * React/JSX Importer
 *
 * Import React/JSX code into DesignLibre scene graph.
 */

import type { NodeId, AutoLayoutProps, AxisAlign, CounterAxisAlign } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { SceneGraph, CreateNodeOptions } from '@scene/graph/scene-graph';
import { ReactParser } from './react-parser';
import type {
  ParsedJSXElement,
  ParsedStyle,
  ReactImportOptions,
  ReactImportResult,
} from './types';

// ============================================================================
// Component to Node Mappings
// ============================================================================

type ImportNodeType = 'FRAME' | 'TEXT' | 'IMAGE';

interface ComponentMapping {
  nodeType: ImportNodeType;
  defaultProps?: Record<string, unknown>;
}

const COMPONENT_MAPPINGS: Record<string, ComponentMapping> = {
  // Container elements -> FRAME
  div: { nodeType: 'FRAME' },
  section: { nodeType: 'FRAME' },
  article: { nodeType: 'FRAME' },
  header: { nodeType: 'FRAME' },
  footer: { nodeType: 'FRAME' },
  nav: { nodeType: 'FRAME' },
  main: { nodeType: 'FRAME' },
  aside: { nodeType: 'FRAME' },
  form: { nodeType: 'FRAME' },
  ul: { nodeType: 'FRAME' },
  ol: { nodeType: 'FRAME' },
  li: { nodeType: 'FRAME' },

  // Text elements -> TEXT
  span: { nodeType: 'TEXT' },
  p: { nodeType: 'TEXT' },
  h1: { nodeType: 'TEXT', defaultProps: { fontSize: 32, fontWeight: 700 } },
  h2: { nodeType: 'TEXT', defaultProps: { fontSize: 24, fontWeight: 700 } },
  h3: { nodeType: 'TEXT', defaultProps: { fontSize: 20, fontWeight: 600 } },
  h4: { nodeType: 'TEXT', defaultProps: { fontSize: 18, fontWeight: 600 } },
  h5: { nodeType: 'TEXT', defaultProps: { fontSize: 16, fontWeight: 600 } },
  h6: { nodeType: 'TEXT', defaultProps: { fontSize: 14, fontWeight: 600 } },
  label: { nodeType: 'TEXT' },
  a: { nodeType: 'TEXT' },

  // Interactive elements -> FRAME with styling
  button: {
    nodeType: 'FRAME',
    defaultProps: {
      fills: [{ type: 'SOLID', visible: true, color: { r: 0, g: 0.478, b: 1, a: 1 } }],
      cornerRadius: 8,
    },
  },
  input: {
    nodeType: 'FRAME',
    defaultProps: {
      fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1, a: 1 } }],
      strokes: [{ type: 'SOLID', visible: true, color: { r: 0.8, g: 0.8, b: 0.8, a: 1 } }],
      strokeWeight: 1,
      cornerRadius: 4,
      width: 200,
      height: 40,
    },
  },
  textarea: {
    nodeType: 'FRAME',
    defaultProps: {
      fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1, a: 1 } }],
      strokes: [{ type: 'SOLID', visible: true, color: { r: 0.8, g: 0.8, b: 0.8, a: 1 } }],
      strokeWeight: 1,
      cornerRadius: 4,
      width: 200,
      height: 100,
    },
  },

  // Media elements
  img: { nodeType: 'IMAGE' },
  svg: { nodeType: 'FRAME' },

  // Default for unknown elements
  _default: { nodeType: 'FRAME' },
};

// ============================================================================
// React Importer Class
// ============================================================================

/**
 * Imports React/JSX code into DesignLibre scene graph
 */
export class ReactImporter {
  private sceneGraph: SceneGraph;
  private parser: ReactParser;
  private warnings: string[] = [];
  private nodeCount: number = 0;
  private componentsFound: string[] = [];

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
    this.parser = new ReactParser();
  }

  /**
   * Import React/JSX code from a string
   */
  async import(
    code: string,
    filePath: string,
    options: ReactImportOptions = {}
  ): Promise<ReactImportResult> {
    const startTime = performance.now();
    this.warnings = [];
    this.nodeCount = 0;
    this.componentsFound = [];

    const parentId = options.parentId ?? this.getDefaultParent();
    const elements = this.parser.parse(code, filePath);

    if (elements.length === 0) {
      this.warnings.push('No JSX elements found in source file');
      const rootId = this.sceneGraph.createNode('FRAME', parentId as NodeId, -1, {
        name: this.getFileName(filePath),
        x: options.x ?? 0,
        y: options.y ?? 0,
        width: 375,
        height: 812,
      } as CreateNodeOptions);

      return {
        rootId,
        nodeCount: 1,
        sourceFile: filePath,
        componentsFound: [],
        warnings: this.warnings,
        processingTime: performance.now() - startTime,
      };
    }

    // Create root container
    const rootId = this.sceneGraph.createNode('FRAME', parentId as NodeId, -1, {
      name: this.getFileName(filePath),
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: 375,
      height: 812,
      fills: [],
    } as CreateNodeOptions);
    this.nodeCount++;

    // Map each parsed element to nodes
    for (const element of elements) {
      this.mapElement(element, rootId, options.scale ?? 1);
    }

    return {
      rootId,
      nodeCount: this.nodeCount,
      sourceFile: filePath,
      componentsFound: [...new Set(this.componentsFound)],
      warnings: this.warnings,
      processingTime: performance.now() - startTime,
    };
  }

  /**
   * Map a JSX element to scene graph nodes
   */
  private mapElement(element: ParsedJSXElement, parentId: NodeId, scale: number): NodeId | null {
    let mapping = COMPONENT_MAPPINGS[element.tagName] ?? COMPONENT_MAPPINGS['_default']!;
    this.componentsFound.push(element.tagName);

    // If this would be a TEXT node but has element children, use FRAME instead
    // TEXT nodes cannot have children in the scene graph
    if (mapping.nodeType === 'TEXT' && element.children.length > 0) {
      mapping = { nodeType: 'FRAME' };
    }

    // Get style from props
    const styleProp = element.props.get('style');
    const style: ParsedStyle = styleProp?.type === 'object' ? styleProp.value as ParsedStyle : {};

    // Get className for potential Tailwind parsing (future)
    const className = element.props.get('className');
    if (className?.type === 'string') {
      this.parseTailwindClasses(className.value as string, style);
    }

    // Build node options
    const nodeOptions = this.buildNodeOptions(element, mapping, style, scale);

    // Create the node
    const nodeId = this.sceneGraph.createNode(mapping.nodeType, parentId, -1, nodeOptions);
    this.nodeCount++;

    // Handle text content for elements converted from TEXT to FRAME
    // or for elements like button that have text content
    if (mapping.nodeType === 'FRAME' && element.textContent) {
      const textId = this.sceneGraph.createNode('TEXT', nodeId, -1, {
        name: 'Text',
        characters: element.textContent,
        fontSize: 14,
        fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1, a: 1 } }],
      } as CreateNodeOptions);
      this.nodeCount++;
      void textId;
    }

    // Process children
    for (const child of element.children) {
      this.mapElement(child, nodeId, scale);
    }

    return nodeId;
  }

  /**
   * Build node options from element and style
   */
  private buildNodeOptions(
    element: ParsedJSXElement,
    mapping: ComponentMapping,
    style: ParsedStyle,
    scale: number
  ): CreateNodeOptions {
    const options: Record<string, unknown> = {
      name: element.isCustomComponent ? element.tagName : element.tagName.toUpperCase(),
      ...mapping.defaultProps,
    };

    // Size
    if (style.width !== undefined) {
      options['width'] = this.parseSize(style.width) * scale;
    }
    if (style.height !== undefined) {
      options['height'] = this.parseSize(style.height) * scale;
    }

    // Background color
    if (style.backgroundColor) {
      const color = this.parseColor(style.backgroundColor);
      if (color) {
        options['fills'] = [{ type: 'SOLID', visible: true, color }];
      }
    }

    // Text color (for text nodes)
    if (style.color && mapping.nodeType === 'TEXT') {
      const color = this.parseColor(style.color);
      if (color) {
        options['fills'] = [{ type: 'SOLID', visible: true, color }];
      }
    }

    // Font size
    if (style.fontSize !== undefined) {
      options['fontSize'] = this.parseSize(style.fontSize);
    }

    // Font weight
    if (style.fontWeight !== undefined) {
      options['fontWeight'] = typeof style.fontWeight === 'number'
        ? style.fontWeight
        : this.parseFontWeight(style.fontWeight);
    }

    // Border radius
    if (style.borderRadius !== undefined) {
      options['cornerRadius'] = this.parseSize(style.borderRadius);
    }

    // Border
    if (style.border || style.borderWidth || style.borderColor) {
      const borderColor = style.borderColor ? this.parseColor(style.borderColor) : { r: 0, g: 0, b: 0, a: 1 };
      if (borderColor) {
        options['strokes'] = [{ type: 'SOLID', visible: true, color: borderColor }];
        options['strokeWeight'] = style.borderWidth ? this.parseSize(style.borderWidth) : 1;
      }
    }

    // Padding
    if (style.padding !== undefined) {
      const padding = this.parseSize(style.padding);
      options['paddingTop'] = padding;
      options['paddingRight'] = padding;
      options['paddingBottom'] = padding;
      options['paddingLeft'] = padding;
    }
    if (style.paddingTop !== undefined) options['paddingTop'] = this.parseSize(style.paddingTop);
    if (style.paddingRight !== undefined) options['paddingRight'] = this.parseSize(style.paddingRight);
    if (style.paddingBottom !== undefined) options['paddingBottom'] = this.parseSize(style.paddingBottom);
    if (style.paddingLeft !== undefined) options['paddingLeft'] = this.parseSize(style.paddingLeft);

    // Flexbox -> Auto Layout
    if (style.display === 'flex') {
      const mode = style.flexDirection === 'column' ? 'VERTICAL' : 'HORIZONTAL';

      const autoLayout: AutoLayoutProps = {
        mode: mode as 'HORIZONTAL' | 'VERTICAL',
        itemSpacing: style.gap !== undefined ? this.parseSize(style.gap) : 0,
        paddingTop: (options['paddingTop'] as number) ?? 0,
        paddingRight: (options['paddingRight'] as number) ?? 0,
        paddingBottom: (options['paddingBottom'] as number) ?? 0,
        paddingLeft: (options['paddingLeft'] as number) ?? 0,
        primaryAxisAlignItems: (style.justifyContent
          ? this.mapJustifyContent(style.justifyContent)
          : 'MIN') as AxisAlign,
        counterAxisAlignItems: (style.alignItems
          ? this.mapAlignItems(style.alignItems)
          : 'MIN') as CounterAxisAlign,
        primaryAxisSizingMode: 'FIXED',
        counterAxisSizingMode: 'FIXED',
        wrap: style['flexWrap'] === 'wrap',
      };

      options['autoLayout'] = autoLayout;

      // Remove loose padding props (now in autoLayout)
      delete options['paddingTop'];
      delete options['paddingRight'];
      delete options['paddingBottom'];
      delete options['paddingLeft'];
    }

    // Opacity
    if (style.opacity !== undefined) {
      options['opacity'] = style.opacity;
    }

    // Shadow (as drop shadow effect)
    if (style['shadow'] && typeof style['shadow'] === 'object') {
      const shadow = style['shadow'] as { blur: number; spread: number; opacity: number };
      options['effects'] = [{
        type: 'DROP_SHADOW',
        visible: true,
        color: { r: 0, g: 0, b: 0, a: shadow.opacity },
        offset: { x: 0, y: 4 },
        radius: shadow.blur,
        spread: shadow.spread,
      }];
    }

    // Clips content (overflow hidden)
    if (style['overflow'] === 'hidden') {
      options['clipsContent'] = true;
    }

    // Handle text content for TEXT nodes
    if (mapping.nodeType === 'TEXT' && element.textContent) {
      options['characters'] = element.textContent;
    }

    return options as CreateNodeOptions;
  }

  /**
   * Parse Tailwind CSS classes (comprehensive support)
   */
  private parseTailwindClasses(className: string, style: ParsedStyle): void {
    const classes = className.split(/\s+/);

    for (const cls of classes) {
      // ========================================
      // Width
      // ========================================
      if (cls.startsWith('w-')) {
        const value = cls.slice(2);
        if (value === 'full') style.width = '100%';
        else if (value === 'screen') style.width = '100vw';
        else if (value === 'auto') style.width = 'auto';
        // Arbitrary value: w-[200px]
        else if (value.startsWith('[') && value.endsWith(']')) {
          style.width = this.parseArbitraryValue(value.slice(1, -1));
        }
        else if (!isNaN(parseInt(value))) style.width = parseInt(value) * 4;
      }

      // Max width
      if (cls.startsWith('max-w-')) {
        const value = cls.slice(6);
        const maxWidths: Record<string, number> = {
          'xs': 320, 'sm': 384, 'md': 448, 'lg': 512, 'xl': 576,
          '2xl': 672, '3xl': 768, '4xl': 896, '5xl': 1024, '6xl': 1152, '7xl': 1280,
        };
        if (maxWidths[value]) style.width = maxWidths[value];
        else if (value === 'full') style.width = '100%';
      }

      // ========================================
      // Height
      // ========================================
      if (cls.startsWith('h-')) {
        const value = cls.slice(2);
        if (value === 'full') style.height = '100%';
        else if (value === 'screen') style.height = '100vh';
        else if (value === 'auto') style.height = 'auto';
        // Arbitrary value: h-[200px]
        else if (value.startsWith('[') && value.endsWith(']')) {
          style.height = this.parseArbitraryValue(value.slice(1, -1));
        }
        else if (!isNaN(parseInt(value))) style.height = parseInt(value) * 4;
      }

      // Min height
      if (cls.startsWith('min-h-')) {
        const value = cls.slice(6);
        if (value === 'screen') style.height = '100vh';
        else if (value === 'full') style.height = '100%';
      }

      // ========================================
      // Padding
      // ========================================
      if (cls.startsWith('p-') && !cls.startsWith('px-') && !cls.startsWith('py-') &&
          !cls.startsWith('pt-') && !cls.startsWith('pb-') && !cls.startsWith('pl-') && !cls.startsWith('pr-')) {
        const value = parseInt(cls.slice(2));
        if (!isNaN(value)) style.padding = value * 4;
      }
      if (cls.startsWith('px-')) {
        const value = parseInt(cls.slice(3));
        if (!isNaN(value)) {
          style.paddingLeft = value * 4;
          style.paddingRight = value * 4;
        }
      }
      if (cls.startsWith('py-')) {
        const value = parseInt(cls.slice(3));
        if (!isNaN(value)) {
          style.paddingTop = value * 4;
          style.paddingBottom = value * 4;
        }
      }
      if (cls.startsWith('pt-')) {
        const value = parseInt(cls.slice(3));
        if (!isNaN(value)) style.paddingTop = value * 4;
      }
      if (cls.startsWith('pb-')) {
        const value = parseInt(cls.slice(3));
        if (!isNaN(value)) style.paddingBottom = value * 4;
      }
      if (cls.startsWith('pl-')) {
        const value = parseInt(cls.slice(3));
        if (!isNaN(value)) style.paddingLeft = value * 4;
      }
      if (cls.startsWith('pr-')) {
        const value = parseInt(cls.slice(3));
        if (!isNaN(value)) style.paddingRight = value * 4;
      }

      // ========================================
      // Background color (with arbitrary value support)
      // ========================================
      if (cls.startsWith('bg-')) {
        const value = cls.slice(3);
        // Arbitrary hex: bg-[#0a0a0a]
        if (value.startsWith('[#') && value.endsWith(']')) {
          style.backgroundColor = value.slice(1, -1);
        }
        // Arbitrary rgb: bg-[rgb(10,10,10)]
        else if (value.startsWith('[rgb') && value.endsWith(']')) {
          style.backgroundColor = value.slice(1, -1);
        }
        // Named color
        else {
          const color = this.tailwindColorToHex(value);
          if (color) style.backgroundColor = color;
        }
      }

      // ========================================
      // Text color (with arbitrary value support)
      // ========================================
      if (cls.startsWith('text-')) {
        const value = cls.slice(5);
        // Arbitrary hex: text-[#888]
        if (value.startsWith('[#') && value.endsWith(']')) {
          style.color = value.slice(1, -1);
        }
        // Arbitrary rgb
        else if (value.startsWith('[rgb') && value.endsWith(']')) {
          style.color = value.slice(1, -1);
        }
        // Text size classes (not colors)
        else if (['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'].includes(value)) {
          const sizes: Record<string, number> = {
            'xs': 12, 'sm': 14, 'base': 16, 'lg': 18, 'xl': 20,
            '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48,
          };
          const fontSize = sizes[value];
          if (fontSize !== undefined) style.fontSize = fontSize;
        }
        // Named color
        else {
          const color = this.tailwindColorToHex(value);
          if (color) style.color = color;
        }
      }

      // ========================================
      // Border color (with arbitrary value support)
      // ========================================
      if (cls.startsWith('border-[#') && cls.endsWith(']')) {
        style.borderColor = cls.slice(8, -1);
        if (!style.borderWidth) style.borderWidth = 1;
      }
      // Border width
      if (cls === 'border') {
        style.borderWidth = 1;
      }
      if (cls === 'border-0') style.borderWidth = 0;
      if (cls === 'border-2') style.borderWidth = 2;
      if (cls === 'border-4') style.borderWidth = 4;
      if (cls === 'border-8') style.borderWidth = 8;

      // Border direction (sets border width, color applied separately)
      if (cls === 'border-b' || cls === 'border-t' || cls === 'border-l' || cls === 'border-r') {
        style.borderWidth = 1;
      }

      // Named border colors
      if (cls.startsWith('border-') && !cls.startsWith('border-[')) {
        const value = cls.slice(7);
        const color = this.tailwindColorToHex(value);
        if (color) {
          style.borderColor = color;
          if (!style.borderWidth) style.borderWidth = 1;
        }
      }

      // ========================================
      // Border radius
      // ========================================
      if (cls === 'rounded') style.borderRadius = 4;
      if (cls === 'rounded-none') style.borderRadius = 0;
      if (cls === 'rounded-sm') style.borderRadius = 2;
      if (cls === 'rounded-md') style.borderRadius = 6;
      if (cls === 'rounded-lg') style.borderRadius = 8;
      if (cls === 'rounded-xl') style.borderRadius = 12;
      if (cls === 'rounded-2xl') style.borderRadius = 16;
      if (cls === 'rounded-3xl') style.borderRadius = 24;
      if (cls === 'rounded-full') style.borderRadius = 9999;

      // ========================================
      // Flexbox
      // ========================================
      if (cls === 'flex') style.display = 'flex';
      if (cls === 'inline-flex') style.display = 'flex';
      if (cls === 'flex-col') style.flexDirection = 'column';
      if (cls === 'flex-row') style.flexDirection = 'row';
      if (cls === 'flex-wrap') style['flexWrap'] = 'wrap';
      if (cls === 'items-center') style.alignItems = 'center';
      if (cls === 'items-start') style.alignItems = 'flex-start';
      if (cls === 'items-end') style.alignItems = 'flex-end';
      if (cls === 'items-stretch') style.alignItems = 'stretch';
      if (cls === 'justify-center') style.justifyContent = 'center';
      if (cls === 'justify-between') style.justifyContent = 'space-between';
      if (cls === 'justify-around') style.justifyContent = 'space-around';
      if (cls === 'justify-evenly') style.justifyContent = 'space-evenly';
      if (cls === 'justify-start') style.justifyContent = 'flex-start';
      if (cls === 'justify-end') style.justifyContent = 'flex-end';

      // ========================================
      // Gap and spacing
      // ========================================
      if (cls.startsWith('gap-')) {
        const value = parseInt(cls.slice(4));
        if (!isNaN(value)) style.gap = value * 4;
      }
      if (cls.startsWith('gap-x-')) {
        const value = parseInt(cls.slice(6));
        if (!isNaN(value)) style.gap = value * 4; // Horizontal gap
      }
      if (cls.startsWith('gap-y-')) {
        const value = parseInt(cls.slice(6));
        if (!isNaN(value)) style.gap = value * 4; // Vertical gap
      }
      // Space between children (treat as gap)
      if (cls.startsWith('space-y-')) {
        const value = parseInt(cls.slice(8));
        if (!isNaN(value)) {
          style.display = 'flex';
          style.flexDirection = 'column';
          style.gap = value * 4;
        }
      }
      if (cls.startsWith('space-x-')) {
        const value = parseInt(cls.slice(8));
        if (!isNaN(value)) {
          style.display = 'flex';
          style.gap = value * 4;
        }
      }

      // ========================================
      // Opacity
      // ========================================
      if (cls.startsWith('opacity-')) {
        const value = parseInt(cls.slice(8));
        if (!isNaN(value)) style.opacity = value / 100;
      }

      // ========================================
      // Overflow
      // ========================================
      if (cls === 'overflow-hidden') style['overflow'] = 'hidden';
      if (cls === 'overflow-auto') style['overflow'] = 'auto';
      if (cls === 'overflow-scroll') style['overflow'] = 'scroll';

      // ========================================
      // Shadow (map to effect)
      // ========================================
      if (cls === 'shadow-sm') style['shadow'] = { blur: 2, spread: 0, opacity: 0.05 };
      if (cls === 'shadow') style['shadow'] = { blur: 4, spread: 0, opacity: 0.1 };
      if (cls === 'shadow-md') style['shadow'] = { blur: 6, spread: 0, opacity: 0.1 };
      if (cls === 'shadow-lg') style['shadow'] = { blur: 10, spread: 0, opacity: 0.1 };
      if (cls === 'shadow-xl') style['shadow'] = { blur: 15, spread: 0, opacity: 0.1 };
      if (cls === 'shadow-2xl') style['shadow'] = { blur: 25, spread: 0, opacity: 0.25 };
      if (cls === 'shadow-none') style['shadow'] = null;

      // ========================================
      // Font weight
      // ========================================
      if (cls === 'font-thin') style.fontWeight = 100;
      if (cls === 'font-extralight') style.fontWeight = 200;
      if (cls === 'font-light') style.fontWeight = 300;
      if (cls === 'font-normal') style.fontWeight = 400;
      if (cls === 'font-medium') style.fontWeight = 500;
      if (cls === 'font-semibold') style.fontWeight = 600;
      if (cls === 'font-bold') style.fontWeight = 700;
      if (cls === 'font-extrabold') style.fontWeight = 800;
      if (cls === 'font-black') style.fontWeight = 900;
    }
  }

  /**
   * Parse arbitrary value (e.g., "200px", "10rem", "50%")
   */
  private parseArbitraryValue(value: string): number | string {
    if (value.endsWith('px')) {
      return parseInt(value);
    }
    if (value.endsWith('rem')) {
      return parseFloat(value) * 16;
    }
    if (value.endsWith('%')) {
      return value;
    }
    return parseInt(value) || value;
  }

  /**
   * Convert Tailwind color to hex
   */
  private tailwindColorToHex(colorClass: string): string | null {
    const tailwindColors: Record<string, string> = {
      'white': '#ffffff',
      'black': '#000000',
      'red-500': '#ef4444',
      'red-600': '#dc2626',
      'blue-500': '#3b82f6',
      'blue-600': '#2563eb',
      'green-500': '#22c55e',
      'green-600': '#16a34a',
      'yellow-500': '#eab308',
      'gray-100': '#f3f4f6',
      'gray-200': '#e5e7eb',
      'gray-300': '#d1d5db',
      'gray-400': '#9ca3af',
      'gray-500': '#6b7280',
      'gray-600': '#4b5563',
      'gray-700': '#374151',
      'gray-800': '#1f2937',
      'gray-900': '#111827',
    };
    return tailwindColors[colorClass] ?? null;
  }

  /**
   * Parse size value (number or string with unit)
   */
  private parseSize(value: number | string): number {
    if (typeof value === 'number') return value;
    const match = value.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%)?$/);
    if (match) {
      const num = parseFloat(match[1]!);
      const unit = match[2];
      if (unit === 'rem' || unit === 'em') return num * 16;
      return num;
    }
    return 0;
  }

  /**
   * Parse color string to RGBA
   */
  private parseColor(value: string): RGBA | null {
    // Hex color
    const hexMatch = value.match(/^#([A-Fa-f0-9]{3,8})$/);
    if (hexMatch) {
      const hex = hexMatch[1]!;
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0]! + hex[0]!, 16) / 255,
          g: parseInt(hex[1]! + hex[1]!, 16) / 255,
          b: parseInt(hex[2]! + hex[2]!, 16) / 255,
          a: 1,
        };
      }
      if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16) / 255,
          g: parseInt(hex.slice(2, 4), 16) / 255,
          b: parseInt(hex.slice(4, 6), 16) / 255,
          a: 1,
        };
      }
      if (hex.length === 8) {
        return {
          r: parseInt(hex.slice(0, 2), 16) / 255,
          g: parseInt(hex.slice(2, 4), 16) / 255,
          b: parseInt(hex.slice(4, 6), 16) / 255,
          a: parseInt(hex.slice(6, 8), 16) / 255,
        };
      }
    }

    // RGB/RGBA
    const rgbMatch = value.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]!) / 255,
        g: parseInt(rgbMatch[2]!) / 255,
        b: parseInt(rgbMatch[3]!) / 255,
        a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
      };
    }

    // Named colors
    const namedColors: Record<string, RGBA> = {
      red: { r: 1, g: 0, b: 0, a: 1 },
      green: { r: 0, g: 0.5, b: 0, a: 1 },
      blue: { r: 0, g: 0, b: 1, a: 1 },
      white: { r: 1, g: 1, b: 1, a: 1 },
      black: { r: 0, g: 0, b: 0, a: 1 },
      gray: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      transparent: { r: 0, g: 0, b: 0, a: 0 },
    };

    return namedColors[value.toLowerCase()] ?? null;
  }

  /**
   * Parse font weight string
   */
  private parseFontWeight(value: string): number {
    const weights: Record<string, number> = {
      thin: 100,
      extralight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    };
    return weights[value.toLowerCase()] ?? 400;
  }

  /**
   * Map CSS justify-content to Figma primary axis alignment
   */
  private mapJustifyContent(value: string): string {
    const map: Record<string, string> = {
      'flex-start': 'MIN',
      'flex-end': 'MAX',
      'center': 'CENTER',
      'space-between': 'SPACE_BETWEEN',
      'space-around': 'SPACE_BETWEEN',
      'space-evenly': 'SPACE_BETWEEN',
    };
    return map[value] ?? 'MIN';
  }

  /**
   * Map CSS align-items to Figma counter axis alignment
   */
  private mapAlignItems(value: string): string {
    const map: Record<string, string> = {
      'flex-start': 'MIN',
      'flex-end': 'MAX',
      'center': 'CENTER',
      'stretch': 'STRETCH',
      'baseline': 'BASELINE',
    };
    return map[value] ?? 'MIN';
  }

  /**
   * Get file name from path
   */
  private getFileName(path: string): string {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1] ?? path;
    return fileName.replace(/\.(tsx?|jsx?)$/, '');
  }

  /**
   * Get default parent node
   */
  private getDefaultParent(): string {
    const doc = this.sceneGraph.getDocument();
    if (!doc) throw new Error('No document in scene graph');
    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) throw new Error('No pages in document');
    return pageIds[0] as unknown as string;
  }
}

/**
 * Create a React importer
 */
export function createReactImporter(sceneGraph: SceneGraph): ReactImporter {
  return new ReactImporter(sceneGraph);
}
