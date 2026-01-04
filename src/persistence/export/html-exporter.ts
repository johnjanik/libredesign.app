/**
 * HTML Exporter
 *
 * Exports DesignLibre designs as production-ready HTML with utility classes.
 * This is the core "design is code" feature.
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData, FrameNodeData, TextNodeData, ImageNodeData, SceneNodeData } from '@scene/nodes/base-node';
import { nodeToUtilityClasses, type UtilityClassOptions } from './utility-class-generator';
import { formatNum } from './format-utils';

/**
 * HTML export options
 */
export interface HTMLExportOptions {
  /** How to include styles */
  styleMode: 'classes' | 'inline' | 'both';
  /** CSS framework for class names */
  framework: 'tailwind' | 'unocss' | 'none';
  /** Minify output */
  minify: boolean;
  /** Include DOCTYPE and html/head/body tags */
  fullDocument: boolean;
  /** Include CSS reset */
  includeReset: boolean;
  /** Include generated CSS (for arbitrary values) */
  includeGeneratedCSS: boolean;
  /** Root element tag name */
  rootTag: string;
  /** Indentation string */
  indent: string;
  /** Class generation options */
  classOptions?: UtilityClassOptions;
}

const DEFAULT_OPTIONS: HTMLExportOptions = {
  styleMode: 'classes',
  framework: 'tailwind',
  minify: false,
  fullDocument: false,
  includeReset: false,
  includeGeneratedCSS: true,
  rootTag: 'div',
  indent: '  ',
  classOptions: {
    includePosition: true,
    includeDimensions: true,
    useArbitraryValues: true,
  },
};

/**
 * HTML export result
 */
export interface HTMLExportResult {
  /** The generated HTML */
  html: string;
  /** Generated CSS for arbitrary values (if any) */
  css: string;
  /** List of utility classes used */
  classes: string[];
  /** Any warnings during export */
  warnings: string[];
}

/**
 * HTML Exporter class
 */
export class HTMLExporter {
  private sceneGraph: SceneGraph;
  private options: HTMLExportOptions;
  private usedClasses: Set<string> = new Set();
  private warnings: string[] = [];
  private arbitraryStyles: Map<string, string> = new Map();

  constructor(sceneGraph: SceneGraph, options: Partial<HTMLExportOptions> = {}) {
    this.sceneGraph = sceneGraph;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Export selected nodes as HTML
   */
  export(nodeIds: NodeId[]): HTMLExportResult {
    this.usedClasses.clear();
    this.warnings = [];
    this.arbitraryStyles.clear();

    const htmlParts: string[] = [];

    for (const nodeId of nodeIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node) {
        const html = this.nodeToHTML(node, 0);
        if (html) {
          htmlParts.push(html);
        }
      }
    }

    let html = htmlParts.join(this.options.minify ? '' : '\n\n');

    // Wrap in full document if requested
    if (this.options.fullDocument) {
      html = this.wrapInDocument(html);
    }

    // Generate CSS for arbitrary values
    const css = this.options.includeGeneratedCSS ? this.generateCSS() : '';

    return {
      html,
      css,
      classes: Array.from(this.usedClasses),
      warnings: this.warnings,
    };
  }

  /**
   * Export a single node (and its children)
   */
  exportNode(nodeId: NodeId): HTMLExportResult {
    return this.export([nodeId]);
  }

  /**
   * Export entire page
   */
  exportPage(pageId: NodeId): HTMLExportResult {
    const childIds = this.sceneGraph.getChildIds(pageId);
    return this.export(childIds);
  }

  /**
   * Convert a node to HTML
   */
  private nodeToHTML(node: NodeData, depth: number): string {
    // Skip invisible nodes
    if ('visible' in node && node.visible === false) {
      return '';
    }

    const newline = this.options.minify ? '' : '\n';

    switch (node.type) {
      case 'FRAME':
      case 'GROUP':
      case 'COMPONENT':
      case 'INSTANCE':
        return this.frameToHTML(node as FrameNodeData, depth);

      case 'TEXT':
        return this.textToHTML(node as TextNodeData, depth);

      case 'IMAGE':
        return this.imageToHTML(node as ImageNodeData, depth);

      case 'VECTOR':
        return this.shapeToHTML(node as SceneNodeData, depth);

      case 'DOCUMENT':
      case 'PAGE':
        // Export children of documents/pages
        const childIds = this.sceneGraph.getChildIds(node.id);
        return childIds
          .map(childId => {
            const child = this.sceneGraph.getNode(childId);
            return child ? this.nodeToHTML(child, depth) : '';
          })
          .filter(Boolean)
          .join(newline);

      default:
        this.warnings.push(`Unsupported node type: ${node.type}`);
        return '';
    }
  }

  /**
   * Convert frame/group to HTML
   */
  private frameToHTML(node: FrameNodeData, depth: number): string {
    const indent = this.options.minify ? '' : this.options.indent.repeat(depth);
    const newline = this.options.minify ? '' : '\n';

    // Determine semantic tag
    let tag = 'div';
    const name = node.name?.toLowerCase() ?? '';
    if (name.includes('button') || name.includes('btn')) {
      tag = 'button';
    } else if (name.includes('link') || name.includes('anchor')) {
      tag = 'a';
    } else if (name.includes('nav')) {
      tag = 'nav';
    } else if (name.includes('header')) {
      tag = 'header';
    } else if (name.includes('footer')) {
      tag = 'footer';
    } else if (name.includes('section')) {
      tag = 'section';
    } else if (name.includes('article')) {
      tag = 'article';
    } else if (name.includes('aside')) {
      tag = 'aside';
    } else if (name.includes('main')) {
      tag = 'main';
    } else if (name.includes('form')) {
      tag = 'form';
    } else if (name.includes('list') || name.includes('menu')) {
      tag = 'ul';
    } else if (name.includes('item') && depth > 0) {
      tag = 'li';
    }

    // Generate classes
    const classes = nodeToUtilityClasses(node, this.options.classOptions);
    this.trackClasses(classes);

    // Build attributes
    const attrs = this.buildAttributes(node, classes);

    // Get children
    const childIds = this.sceneGraph.getChildIds(node.id);
    const hasChildren = childIds.length > 0;

    if (!hasChildren) {
      // Self-closing or empty
      return `${indent}<${tag}${attrs}></${tag}>`;
    }

    // Render children
    const childrenHTML = childIds
      .map(childId => {
        const child = this.sceneGraph.getNode(childId);
        return child ? this.nodeToHTML(child, depth + 1) : '';
      })
      .filter(Boolean)
      .join(newline);

    return `${indent}<${tag}${attrs}>${newline}${childrenHTML}${newline}${indent}</${tag}>`;
  }

  /**
   * Convert text node to HTML
   */
  private textToHTML(node: TextNodeData, depth: number): string {
    const indent = this.options.minify ? '' : this.options.indent.repeat(depth);

    // Determine semantic tag based on name or context
    let tag = 'span';
    const name = node.name?.toLowerCase() ?? '';
    const firstStyle = node.textStyles && node.textStyles.length > 0 ? node.textStyles[0] : null;
    const fontSize = firstStyle?.fontSize ?? 14;

    if (name.includes('heading') || name.includes('title')) {
      if (fontSize >= 36) tag = 'h1';
      else if (fontSize >= 30) tag = 'h2';
      else if (fontSize >= 24) tag = 'h3';
      else if (fontSize >= 20) tag = 'h4';
      else if (fontSize >= 18) tag = 'h5';
      else tag = 'h6';
    } else if (name.includes('paragraph') || name.includes('body') || name.includes('description')) {
      tag = 'p';
    } else if (name.includes('label')) {
      tag = 'label';
    } else if (name.includes('link')) {
      tag = 'a';
    }

    // For multi-line text, prefer <p> or block-level
    if (node.characters && node.characters.includes('\n') && tag === 'span') {
      tag = 'p';
    }

    // Generate classes
    const classes = nodeToUtilityClasses(node, this.options.classOptions);
    this.trackClasses(classes);

    // Build attributes
    const attrs = this.buildAttributes(node, classes);

    // Escape HTML in text content
    const text = this.escapeHTML(node.characters ?? '');

    return `${indent}<${tag}${attrs}>${text}</${tag}>`;
  }

  /**
   * Convert image node to HTML
   */
  private imageToHTML(node: ImageNodeData, depth: number): string {
    const indent = this.options.minify ? '' : this.options.indent.repeat(depth);

    // Generate classes
    const classes = nodeToUtilityClasses(node, this.options.classOptions);
    this.trackClasses(classes);

    // Image src - use placeholder or actual reference
    const src = node.imageRef ?? 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
    const alt = node.name ?? 'Image';

    // Add object-fit based on scale mode
    if (node.scaleMode === 'FILL') {
      classes.push('object-cover');
    } else if (node.scaleMode === 'FIT') {
      classes.push('object-contain');
    }

    const classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';

    return `${indent}<img src="${src}" alt="${alt}"${classStr} />`;
  }

  /**
   * Convert shape node to HTML
   */
  private shapeToHTML(node: SceneNodeData, depth: number): string {
    const indent = this.options.minify ? '' : this.options.indent.repeat(depth);

    // Generate classes
    const classes = nodeToUtilityClasses(node as NodeData, this.options.classOptions);
    this.trackClasses(classes);

    // Build attributes
    const attrs = this.buildAttributes(node as NodeData, classes);

    return `${indent}<div${attrs}></div>`;
  }

  /**
   * Build HTML attributes string
   */
  private buildAttributes(node: NodeData, classes: string[]): string {
    const attrs: string[] = [];

    // Class attribute
    if (classes.length > 0 && this.options.styleMode !== 'inline') {
      attrs.push(`class="${classes.join(' ')}"`);
    }

    // Inline styles (if mode is 'inline' or 'both')
    if (this.options.styleMode === 'inline' || this.options.styleMode === 'both') {
      const style = this.getInlineStyles(node);
      if (style) {
        attrs.push(`style="${style}"`);
      }
    }

    return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  }

  /**
   * Generate inline styles for a node
   */
  private getInlineStyles(node: NodeData): string {
    const styles: string[] = [];
    const sceneNode = node as SceneNodeData;

    // Dimensions
    if ('width' in sceneNode && sceneNode.width !== undefined) {
      styles.push(`width: ${formatNum(sceneNode.width)}px`);
    }
    if ('height' in sceneNode && sceneNode.height !== undefined) {
      styles.push(`height: ${formatNum(sceneNode.height)}px`);
    }

    // Background color
    if ('fills' in sceneNode && sceneNode.fills && sceneNode.fills.length > 0) {
      const fill = sceneNode.fills.find(f => f.visible !== false);
      if (fill && fill.type === 'SOLID') {
        const color = fill.color;
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        const a = fill.opacity ?? color.a;
        if (a < 1) {
          styles.push(`background-color: rgba(${r}, ${g}, ${b}, ${a})`);
        } else {
          styles.push(`background-color: rgb(${r}, ${g}, ${b})`);
        }
      }
    }

    // Border
    if ('strokes' in sceneNode && sceneNode.strokes && sceneNode.strokes.length > 0) {
      const stroke = sceneNode.strokes.find(s => s.visible !== false);
      if (stroke && stroke.type === 'SOLID' && 'strokeWeight' in sceneNode) {
        const color = stroke.color;
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        styles.push(`border: ${sceneNode.strokeWeight}px solid rgb(${r}, ${g}, ${b})`);
      }
    }

    // Border radius
    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      if (frameNode.cornerRadius && frameNode.cornerRadius > 0) {
        styles.push(`border-radius: ${frameNode.cornerRadius}px`);
      }
    }

    // Opacity
    if (sceneNode.opacity !== undefined && sceneNode.opacity < 1) {
      styles.push(`opacity: ${sceneNode.opacity}`);
    }

    // Flexbox for auto layout
    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      if (frameNode.autoLayout && frameNode.autoLayout.mode !== 'NONE') {
        styles.push('display: flex');
        styles.push(`flex-direction: ${frameNode.autoLayout.mode === 'HORIZONTAL' ? 'row' : 'column'}`);
        if (frameNode.autoLayout.itemSpacing > 0) {
          styles.push(`gap: ${frameNode.autoLayout.itemSpacing}px`);
        }
        if (frameNode.autoLayout.paddingTop > 0) {
          styles.push(`padding-top: ${frameNode.autoLayout.paddingTop}px`);
        }
        if (frameNode.autoLayout.paddingRight > 0) {
          styles.push(`padding-right: ${frameNode.autoLayout.paddingRight}px`);
        }
        if (frameNode.autoLayout.paddingBottom > 0) {
          styles.push(`padding-bottom: ${frameNode.autoLayout.paddingBottom}px`);
        }
        if (frameNode.autoLayout.paddingLeft > 0) {
          styles.push(`padding-left: ${frameNode.autoLayout.paddingLeft}px`);
        }
      }
    }

    // Text styles
    if (node.type === 'TEXT') {
      const textNode = node as TextNodeData;
      const firstStyle = textNode.textStyles && textNode.textStyles.length > 0 ? textNode.textStyles[0] : null;
      if (firstStyle) {
        if (firstStyle.fontSize) {
          styles.push(`font-size: ${firstStyle.fontSize}px`);
        }
        if (firstStyle.fontWeight) {
          styles.push(`font-weight: ${firstStyle.fontWeight}`);
        }
        if (firstStyle.fontFamily) {
          styles.push(`font-family: ${firstStyle.fontFamily}`);
        }
        if (firstStyle.lineHeight && firstStyle.lineHeight !== 'AUTO') {
          styles.push(`line-height: ${firstStyle.lineHeight}px`);
        }
      }
      // Text color from fills
      if (textNode.fills && textNode.fills.length > 0) {
        const fill = textNode.fills.find(f => f.visible !== false);
        if (fill && fill.type === 'SOLID') {
          const color = fill.color;
          const r = Math.round(color.r * 255);
          const g = Math.round(color.g * 255);
          const b = Math.round(color.b * 255);
          styles.push(`color: rgb(${r}, ${g}, ${b})`);
        }
      }
    }

    return styles.join('; ');
  }

  /**
   * Track used classes
   */
  private trackClasses(classes: string[]): void {
    for (const cls of classes) {
      this.usedClasses.add(cls);

      // Track arbitrary values for CSS generation
      const arbitraryMatch = cls.match(/\[([^\]]+)\]/);
      if (arbitraryMatch) {
        this.arbitraryStyles.set(cls, arbitraryMatch[1]!);
      }
    }
  }

  /**
   * Generate CSS for arbitrary values
   */
  private generateCSS(): string {
    if (this.arbitraryStyles.size === 0) {
      return '';
    }

    const lines: string[] = ['/* Generated CSS for arbitrary values */'];

    for (const [cls, value] of this.arbitraryStyles) {
      // Parse the class to determine the CSS property
      const cssClass = cls.replace(/\[|\]/g, '\\$&'); // Escape brackets for CSS selector

      if (cls.startsWith('w-[')) {
        lines.push(`.${cssClass} { width: ${value}; }`);
      } else if (cls.startsWith('h-[')) {
        lines.push(`.${cssClass} { height: ${value}; }`);
      } else if (cls.startsWith('p-[')) {
        lines.push(`.${cssClass} { padding: ${value}; }`);
      } else if (cls.startsWith('m-[')) {
        lines.push(`.${cssClass} { margin: ${value}; }`);
      } else if (cls.startsWith('gap-[')) {
        lines.push(`.${cssClass} { gap: ${value}; }`);
      } else if (cls.startsWith('bg-[')) {
        lines.push(`.${cssClass} { background-color: ${value}; }`);
      } else if (cls.startsWith('text-[') && value.startsWith('#')) {
        lines.push(`.${cssClass} { color: ${value}; }`);
      } else if (cls.startsWith('text-[')) {
        lines.push(`.${cssClass} { font-size: ${value}; }`);
      } else if (cls.startsWith('border-[') && value.includes('px')) {
        lines.push(`.${cssClass} { border-width: ${value}; }`);
      } else if (cls.startsWith('border-[')) {
        lines.push(`.${cssClass} { border-color: ${value}; }`);
      } else if (cls.startsWith('rounded-[')) {
        lines.push(`.${cssClass} { border-radius: ${value}; }`);
      } else if (cls.startsWith('shadow-[')) {
        lines.push(`.${cssClass} { box-shadow: ${value.replace(/_/g, ' ')}; }`);
      } else if (cls.startsWith('opacity-[')) {
        lines.push(`.${cssClass} { opacity: ${value}; }`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Wrap HTML in full document
   */
  private wrapInDocument(html: string): string {
    const reset = this.options.includeReset ? `
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, sans-serif; line-height: 1.5; }
    </style>` : '';

    const css = this.options.includeGeneratedCSS && this.arbitraryStyles.size > 0 ? `
    <style>
${this.generateCSS()}
    </style>` : '';

    const tailwindCDN = this.options.framework === 'tailwind' ? `
    <script src="https://cdn.tailwindcss.com"></script>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported from DesignLibre</title>${tailwindCDN}${reset}${css}
</head>
<body>
${html}
</body>
</html>`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * Factory function
 */
export function createHTMLExporter(
  sceneGraph: SceneGraph,
  options?: Partial<HTMLExportOptions>
): HTMLExporter {
  return new HTMLExporter(sceneGraph, options);
}

/**
 * Quick export function
 */
export function exportToHTML(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options?: Partial<HTMLExportOptions>
): HTMLExportResult {
  const exporter = createHTMLExporter(sceneGraph, options);
  return exporter.export(nodeIds);
}
