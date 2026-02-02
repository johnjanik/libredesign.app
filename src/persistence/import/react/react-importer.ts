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
  ParsedGradient,
  GradientDirection,
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

    // Background color or gradient
    if (style.gradient && style.gradient.fromColor) {
      // Build gradient fill
      const gradientFill = this.buildGradientFill(style.gradient);
      if (gradientFill) {
        options['fills'] = [gradientFill];
      }
    } else if (style.backgroundColor) {
      const parsedColor = this.parseColor(style.backgroundColor);
      if (parsedColor) {
        // Apply background opacity if specified
        const color = style.backgroundOpacity !== undefined
          ? { ...parsedColor, a: style.backgroundOpacity }
          : parsedColor;
        options['fills'] = [{ type: 'SOLID', visible: true, color }];
      }
    }

    // Text color (for text nodes)
    if (style.color && mapping.nodeType === 'TEXT') {
      const parsedColor = this.parseColor(style.color);
      if (parsedColor) {
        // Apply text opacity if specified
        const color = style.textOpacity !== undefined
          ? { ...parsedColor, a: style.textOpacity }
          : parsedColor;
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
      const parsedBorderColor = style.borderColor ? this.parseColor(style.borderColor) : { r: 0, g: 0, b: 0, a: 1 };
      if (parsedBorderColor) {
        // Apply border opacity if specified
        const borderColor = style.borderOpacity !== undefined
          ? { ...parsedBorderColor, a: style.borderOpacity }
          : parsedBorderColor;
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
        // Gradient direction: bg-gradient-to-{direction}
        else if (value.startsWith('gradient-to-')) {
          const dir = value.slice(12) as GradientDirection;
          if (['t', 'r', 'b', 'l', 'tr', 'br', 'bl', 'tl'].includes(dir)) {
            if (!style.gradient) {
              style.gradient = { direction: dir };
            } else {
              style.gradient.direction = dir;
            }
          }
        }
        // Named color (with optional opacity modifier)
        else {
          const color = this.tailwindColorToHex(value);
          if (color) {
            style.backgroundColor = color.hex;
            if (color.opacity < 1) {
              style.backgroundOpacity = color.opacity;
            }
          }
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
        else if (['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'].includes(value)) {
          const sizes: Record<string, number> = {
            'xs': 12, 'sm': 14, 'base': 16, 'lg': 18, 'xl': 20,
            '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48,
            '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128,
          };
          const fontSize = sizes[value];
          if (fontSize !== undefined) style.fontSize = fontSize;
        }
        // Named color (with optional opacity modifier)
        else {
          const color = this.tailwindColorToHex(value);
          if (color) {
            style.color = color.hex;
            if (color.opacity < 1) {
              style.textOpacity = color.opacity;
            }
          }
        }
      }

      // ========================================
      // Gradient colors (from, via, to)
      // ========================================
      if (cls.startsWith('from-')) {
        const value = cls.slice(5);
        // Arbitrary hex: from-[#ff0000]
        if (value.startsWith('[#') && value.endsWith(']')) {
          if (!style.gradient) style.gradient = { direction: 'r' };
          style.gradient.fromColor = value.slice(1, -1);
        } else {
          const color = this.tailwindColorToHex(value);
          if (color) {
            if (!style.gradient) style.gradient = { direction: 'r' };
            style.gradient.fromColor = color.hex;
            if (color.opacity < 1) {
              style.gradient.fromOpacity = color.opacity;
            }
          }
        }
      }

      if (cls.startsWith('via-')) {
        const value = cls.slice(4);
        // Arbitrary hex: via-[#ff0000]
        if (value.startsWith('[#') && value.endsWith(']')) {
          if (!style.gradient) style.gradient = { direction: 'r' };
          style.gradient.viaColor = value.slice(1, -1);
        } else {
          const color = this.tailwindColorToHex(value);
          if (color) {
            if (!style.gradient) style.gradient = { direction: 'r' };
            style.gradient.viaColor = color.hex;
            if (color.opacity < 1) {
              style.gradient.viaOpacity = color.opacity;
            }
          }
        }
      }

      if (cls.startsWith('to-')) {
        const value = cls.slice(3);
        // Arbitrary hex: to-[#ff0000]
        if (value.startsWith('[#') && value.endsWith(']')) {
          if (!style.gradient) style.gradient = { direction: 'r' };
          style.gradient.toColor = value.slice(1, -1);
        } else {
          const color = this.tailwindColorToHex(value);
          if (color) {
            if (!style.gradient) style.gradient = { direction: 'r' };
            style.gradient.toColor = color.hex;
            if (color.opacity < 1) {
              style.gradient.toOpacity = color.opacity;
            }
          }
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

      // Named border colors (with optional opacity modifier)
      if (cls.startsWith('border-') && !cls.startsWith('border-[')) {
        const value = cls.slice(7);
        // Skip border width classes
        if (!['0', '2', '4', '8', 'b', 't', 'l', 'r', 'x', 'y'].includes(value)) {
          const color = this.tailwindColorToHex(value);
          if (color) {
            style.borderColor = color.hex;
            if (color.opacity < 1) {
              style.borderOpacity = color.opacity;
            }
            if (!style.borderWidth) style.borderWidth = 1;
          }
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
   * Convert Tailwind color to hex (with optional opacity)
   * Supports: color-shade, color-shade/opacity, color/opacity
   * Returns { hex, opacity } or null
   */
  private tailwindColorToHex(colorClass: string): { hex: string; opacity: number } | null {
    // Complete Tailwind color palette
    const tailwindColors: Record<string, string> = {
      // Base colors
      'white': '#ffffff',
      'black': '#000000',
      'transparent': '#00000000',

      // Slate
      'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0',
      'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b',
      'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b',
      'slate-900': '#0f172a', 'slate-950': '#020617',

      // Gray
      'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb',
      'gray-300': '#d1d5db', 'gray-400': '#9ca3af', 'gray-500': '#6b7280',
      'gray-600': '#4b5563', 'gray-700': '#374151', 'gray-800': '#1f2937',
      'gray-900': '#111827', 'gray-950': '#030712',

      // Zinc
      'zinc-50': '#fafafa', 'zinc-100': '#f4f4f5', 'zinc-200': '#e4e4e7',
      'zinc-300': '#d4d4d8', 'zinc-400': '#a1a1aa', 'zinc-500': '#71717a',
      'zinc-600': '#52525b', 'zinc-700': '#3f3f46', 'zinc-800': '#27272a',
      'zinc-900': '#18181b', 'zinc-950': '#09090b',

      // Neutral
      'neutral-50': '#fafafa', 'neutral-100': '#f5f5f5', 'neutral-200': '#e5e5e5',
      'neutral-300': '#d4d4d4', 'neutral-400': '#a3a3a3', 'neutral-500': '#737373',
      'neutral-600': '#525252', 'neutral-700': '#404040', 'neutral-800': '#262626',
      'neutral-900': '#171717', 'neutral-950': '#0a0a0a',

      // Stone
      'stone-50': '#fafaf9', 'stone-100': '#f5f5f4', 'stone-200': '#e7e5e4',
      'stone-300': '#d6d3d1', 'stone-400': '#a8a29e', 'stone-500': '#78716c',
      'stone-600': '#57534e', 'stone-700': '#44403c', 'stone-800': '#292524',
      'stone-900': '#1c1917', 'stone-950': '#0c0a09',

      // Red
      'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-200': '#fecaca',
      'red-300': '#fca5a5', 'red-400': '#f87171', 'red-500': '#ef4444',
      'red-600': '#dc2626', 'red-700': '#b91c1c', 'red-800': '#991b1b',
      'red-900': '#7f1d1d', 'red-950': '#450a0a',

      // Orange
      'orange-50': '#fff7ed', 'orange-100': '#ffedd5', 'orange-200': '#fed7aa',
      'orange-300': '#fdba74', 'orange-400': '#fb923c', 'orange-500': '#f97316',
      'orange-600': '#ea580c', 'orange-700': '#c2410c', 'orange-800': '#9a3412',
      'orange-900': '#7c2d12', 'orange-950': '#431407',

      // Amber
      'amber-50': '#fffbeb', 'amber-100': '#fef3c7', 'amber-200': '#fde68a',
      'amber-300': '#fcd34d', 'amber-400': '#fbbf24', 'amber-500': '#f59e0b',
      'amber-600': '#d97706', 'amber-700': '#b45309', 'amber-800': '#92400e',
      'amber-900': '#78350f', 'amber-950': '#451a03',

      // Yellow
      'yellow-50': '#fefce8', 'yellow-100': '#fef9c3', 'yellow-200': '#fef08a',
      'yellow-300': '#fde047', 'yellow-400': '#facc15', 'yellow-500': '#eab308',
      'yellow-600': '#ca8a04', 'yellow-700': '#a16207', 'yellow-800': '#854d0e',
      'yellow-900': '#713f12', 'yellow-950': '#422006',

      // Lime
      'lime-50': '#f7fee7', 'lime-100': '#ecfccb', 'lime-200': '#d9f99d',
      'lime-300': '#bef264', 'lime-400': '#a3e635', 'lime-500': '#84cc16',
      'lime-600': '#65a30d', 'lime-700': '#4d7c0f', 'lime-800': '#3f6212',
      'lime-900': '#365314', 'lime-950': '#1a2e05',

      // Green
      'green-50': '#f0fdf4', 'green-100': '#dcfce7', 'green-200': '#bbf7d0',
      'green-300': '#86efac', 'green-400': '#4ade80', 'green-500': '#22c55e',
      'green-600': '#16a34a', 'green-700': '#15803d', 'green-800': '#166534',
      'green-900': '#14532d', 'green-950': '#052e16',

      // Emerald
      'emerald-50': '#ecfdf5', 'emerald-100': '#d1fae5', 'emerald-200': '#a7f3d0',
      'emerald-300': '#6ee7b7', 'emerald-400': '#34d399', 'emerald-500': '#10b981',
      'emerald-600': '#059669', 'emerald-700': '#047857', 'emerald-800': '#065f46',
      'emerald-900': '#064e3b', 'emerald-950': '#022c22',

      // Teal
      'teal-50': '#f0fdfa', 'teal-100': '#ccfbf1', 'teal-200': '#99f6e4',
      'teal-300': '#5eead4', 'teal-400': '#2dd4bf', 'teal-500': '#14b8a6',
      'teal-600': '#0d9488', 'teal-700': '#0f766e', 'teal-800': '#115e59',
      'teal-900': '#134e4a', 'teal-950': '#042f2e',

      // Cyan
      'cyan-50': '#ecfeff', 'cyan-100': '#cffafe', 'cyan-200': '#a5f3fc',
      'cyan-300': '#67e8f9', 'cyan-400': '#22d3ee', 'cyan-500': '#06b6d4',
      'cyan-600': '#0891b2', 'cyan-700': '#0e7490', 'cyan-800': '#155e75',
      'cyan-900': '#164e63', 'cyan-950': '#083344',

      // Sky
      'sky-50': '#f0f9ff', 'sky-100': '#e0f2fe', 'sky-200': '#bae6fd',
      'sky-300': '#7dd3fc', 'sky-400': '#38bdf8', 'sky-500': '#0ea5e9',
      'sky-600': '#0284c7', 'sky-700': '#0369a1', 'sky-800': '#075985',
      'sky-900': '#0c4a6e', 'sky-950': '#082f49',

      // Blue
      'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe',
      'blue-300': '#93c5fd', 'blue-400': '#60a5fa', 'blue-500': '#3b82f6',
      'blue-600': '#2563eb', 'blue-700': '#1d4ed8', 'blue-800': '#1e40af',
      'blue-900': '#1e3a8a', 'blue-950': '#172554',

      // Indigo
      'indigo-50': '#eef2ff', 'indigo-100': '#e0e7ff', 'indigo-200': '#c7d2fe',
      'indigo-300': '#a5b4fc', 'indigo-400': '#818cf8', 'indigo-500': '#6366f1',
      'indigo-600': '#4f46e5', 'indigo-700': '#4338ca', 'indigo-800': '#3730a3',
      'indigo-900': '#312e81', 'indigo-950': '#1e1b4b',

      // Violet
      'violet-50': '#f5f3ff', 'violet-100': '#ede9fe', 'violet-200': '#ddd6fe',
      'violet-300': '#c4b5fd', 'violet-400': '#a78bfa', 'violet-500': '#8b5cf6',
      'violet-600': '#7c3aed', 'violet-700': '#6d28d9', 'violet-800': '#5b21b6',
      'violet-900': '#4c1d95', 'violet-950': '#2e1065',

      // Purple
      'purple-50': '#faf5ff', 'purple-100': '#f3e8ff', 'purple-200': '#e9d5ff',
      'purple-300': '#d8b4fe', 'purple-400': '#c084fc', 'purple-500': '#a855f7',
      'purple-600': '#9333ea', 'purple-700': '#7e22ce', 'purple-800': '#6b21a8',
      'purple-900': '#581c87', 'purple-950': '#3b0764',

      // Fuchsia
      'fuchsia-50': '#fdf4ff', 'fuchsia-100': '#fae8ff', 'fuchsia-200': '#f5d0fe',
      'fuchsia-300': '#f0abfc', 'fuchsia-400': '#e879f9', 'fuchsia-500': '#d946ef',
      'fuchsia-600': '#c026d3', 'fuchsia-700': '#a21caf', 'fuchsia-800': '#86198f',
      'fuchsia-900': '#701a75', 'fuchsia-950': '#4a044e',

      // Pink
      'pink-50': '#fdf2f8', 'pink-100': '#fce7f3', 'pink-200': '#fbcfe8',
      'pink-300': '#f9a8d4', 'pink-400': '#f472b6', 'pink-500': '#ec4899',
      'pink-600': '#db2777', 'pink-700': '#be185d', 'pink-800': '#9d174d',
      'pink-900': '#831843', 'pink-950': '#500724',

      // Rose
      'rose-50': '#fff1f2', 'rose-100': '#ffe4e6', 'rose-200': '#fecdd3',
      'rose-300': '#fda4af', 'rose-400': '#fb7185', 'rose-500': '#f43f5e',
      'rose-600': '#e11d48', 'rose-700': '#be123c', 'rose-800': '#9f1239',
      'rose-900': '#881337', 'rose-950': '#4c0519',
    };

    // Check for opacity modifier (e.g., white/20, orange-500/30)
    const opacityMatch = colorClass.match(/^(.+?)\/(\d+)$/);
    let baseColor = colorClass;
    let opacity = 1;

    if (opacityMatch) {
      baseColor = opacityMatch[1]!;
      opacity = parseInt(opacityMatch[2]!) / 100;
    }

    const hex = tailwindColors[baseColor];
    if (hex) {
      return { hex, opacity };
    }

    return null;
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

    // OKLCH color: oklch(L C H) or oklch(L C H / A)
    const oklchMatch = value.match(/oklch\s*\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/);
    if (oklchMatch) {
      const L = parseFloat(oklchMatch[1]!);
      const C = parseFloat(oklchMatch[2]!);
      const H = parseFloat(oklchMatch[3]!);
      const alpha = oklchMatch[4] ? parseFloat(oklchMatch[4]) : 1;
      return this.oklchToRgba(L, C, H, alpha);
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
   * Convert OKLCH to RGBA
   * L = lightness (0-1), C = chroma (0-0.4+), H = hue (0-360)
   */
  private oklchToRgba(L: number, C: number, H: number, alpha: number): RGBA {
    // Convert OKLCH to OKLAB
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);

    // Convert OKLAB to linear RGB
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const linearR = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const linearG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const linearB = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    // Convert linear RGB to sRGB (gamma correction)
    const toSrgb = (x: number) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      return x <= 0.0031308
        ? 12.92 * x
        : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    };

    return {
      r: Math.max(0, Math.min(1, toSrgb(linearR))),
      g: Math.max(0, Math.min(1, toSrgb(linearG))),
      b: Math.max(0, Math.min(1, toSrgb(linearB))),
      a: alpha,
    };
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
   * Build a gradient fill from parsed gradient
   */
  private buildGradientFill(gradient: ParsedGradient): Record<string, unknown> | null {
    if (!gradient.fromColor) return null;

    // Parse from color
    const fromColorParsed = this.parseColor(gradient.fromColor);
    if (!fromColorParsed) return null;
    const fromColor: RGBA = gradient.fromOpacity !== undefined
      ? { ...fromColorParsed, a: gradient.fromOpacity }
      : fromColorParsed;

    // Parse to color (default to transparent if not specified)
    let toColor: RGBA = { r: 0, g: 0, b: 0, a: 0 };
    if (gradient.toColor) {
      const parsed = this.parseColor(gradient.toColor);
      if (parsed) {
        toColor = gradient.toOpacity !== undefined
          ? { ...parsed, a: gradient.toOpacity }
          : parsed;
      }
    }

    // Build gradient stops
    const stops: Array<{ position: number; color: RGBA }> = [];
    stops.push({ position: 0, color: fromColor });

    // Add via color if present
    if (gradient.viaColor) {
      const viaColorParsed = this.parseColor(gradient.viaColor);
      if (viaColorParsed) {
        const viaColor = gradient.viaOpacity !== undefined
          ? { ...viaColorParsed, a: gradient.viaOpacity }
          : viaColorParsed;
        stops.push({ position: 0.5, color: viaColor });
      }
    }

    stops.push({ position: 1, color: toColor });

    // Calculate gradient transform based on direction
    // The transform maps from normalized coordinates [0,1] to the gradient line
    // Default identity: [[1,0,0],[0,1,0]] = horizontal left-to-right
    const transform = this.getGradientTransform(gradient.direction);

    return {
      type: 'GRADIENT_LINEAR',
      visible: true,
      opacity: 1,
      gradientStops: stops,
      gradientTransform: transform,
    };
  }

  /**
   * Get gradient transform matrix for direction
   * Transform is 2x3 matrix: [a, b, c, d, tx, ty]
   */
  private getGradientTransform(direction: GradientDirection): [number, number, number, number, number, number] {
    // Gradient transforms rotate/flip the gradient direction
    // Identity [1,0,0,1,0,0] = left to right
    // The matrix controls how the gradient is mapped onto the shape
    switch (direction) {
      case 'r': // left to right (default)
        return [1, 0, 0, 1, 0, 0];
      case 'l': // right to left
        return [-1, 0, 0, 1, 1, 0];
      case 'b': // top to bottom
        return [0, 1, -1, 0, 1, 0];
      case 't': // bottom to top
        return [0, -1, 1, 0, 0, 1];
      case 'br': // top-left to bottom-right
        return [0.7071, 0.7071, -0.7071, 0.7071, 0.5, -0.2071];
      case 'bl': // top-right to bottom-left
        return [-0.7071, 0.7071, -0.7071, -0.7071, 1.2071, 0.5];
      case 'tr': // bottom-left to top-right
        return [0.7071, -0.7071, 0.7071, 0.7071, -0.2071, 0.5];
      case 'tl': // bottom-right to top-left
        return [-0.7071, -0.7071, 0.7071, -0.7071, 0.5, 1.2071];
      default:
        return [1, 0, 0, 1, 0, 0];
    }
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
