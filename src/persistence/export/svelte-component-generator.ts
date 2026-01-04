/**
 * Svelte Component Generator
 *
 * Exports DesignLibre designs as Svelte components with TypeScript support.
 * Supports both Svelte 4 (export let) and Svelte 5 (runes) syntax.
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type {
  NodeData,
  FrameNodeData,
  TextNodeData,
  ImageNodeData,
  SceneNodeData,
  ComponentNodeData,
  InstanceNodeData,
} from '@scene/nodes/base-node';
import { nodeToUtilityClasses } from './utility-class-generator';
import { formatNum } from './format-utils';

/**
 * Detected prop from node name or text content
 */
export interface SvelteDetectedProp {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'object';
  defaultValue: string | undefined;
  required: boolean;
  source: 'name' | 'text' | 'component';
}

/**
 * Detected event from interactive elements
 */
export interface SvelteDetectedEvent {
  name: string;
  type: string;
}

/**
 * Svelte component export options
 */
export interface SvelteExportOptions {
  /** Component name (PascalCase) */
  componentName: string;
  /** Use TypeScript */
  typescript: boolean;
  /** Svelte version syntax */
  svelteVersion: '4' | '5';
  /** Styling approach */
  styling: 'tailwind' | 'scoped' | 'inline';
  /** Include event dispatching */
  includeEvents: boolean;
  /** Generate component documentation */
  includeJSDoc: boolean;
  /** Indentation */
  indent: string;
}

const DEFAULT_OPTIONS: SvelteExportOptions = {
  componentName: 'Component',
  typescript: true,
  svelteVersion: '5',
  styling: 'tailwind',
  includeEvents: true,
  includeJSDoc: true,
  indent: '  ',
};

/**
 * Svelte component export result
 */
export interface SvelteExportResult {
  /** Component content */
  component: string;
  /** Component file name */
  fileName: string;
  /** Detected props */
  props: SvelteDetectedProp[];
  /** Detected events */
  events: SvelteDetectedEvent[];
  /** Any warnings during generation */
  warnings: string[];
}

/**
 * Prop pattern regex - matches {propName} or {propName:defaultValue}
 */
const PROP_PATTERN = /\{(\w+)(?::([^}]*))?\}/g;

/**
 * Svelte Component Generator class
 */
export class SvelteComponentGenerator {
  private sceneGraph: SceneGraph;
  private options: SvelteExportOptions;
  private detectedProps: Map<string, SvelteDetectedProp> = new Map();
  private detectedEvents: Map<string, SvelteDetectedEvent> = new Map();
  private warnings: string[] = [];
  private scopedStyles: string[] = [];

  constructor(sceneGraph: SceneGraph, options: Partial<SvelteExportOptions> = {}) {
    this.sceneGraph = sceneGraph;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate Svelte component from nodes
   */
  generate(nodeIds: NodeId[]): SvelteExportResult {
    this.detectedProps.clear();
    this.detectedEvents.clear();
    this.warnings = [];
    this.scopedStyles = [];

    // Generate markup for all nodes
    const markupParts: string[] = [];
    for (const nodeId of nodeIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node) {
        const markup = this.nodeToMarkup(node, 0);
        if (markup) {
          markupParts.push(markup);
        }
      }
    }

    // Wrap in root element if multiple nodes
    let markupContent = markupParts.join('\n');
    if (markupParts.length > 1) {
      markupContent = `<div>\n${markupParts.map(p => this.indentLines(p, 1)).join('\n')}\n</div>`;
    } else if (markupParts.length === 0) {
      markupContent = '<div>TODO: Add content</div>';
    }

    // Generate component
    const component = this.generateComponent(markupContent);

    const fileName = `${this.options.componentName}.svelte`;

    return {
      component,
      fileName,
      props: Array.from(this.detectedProps.values()),
      events: Array.from(this.detectedEvents.values()),
      warnings: this.warnings,
    };
  }

  /**
   * Convert a node to Svelte markup
   */
  private nodeToMarkup(node: NodeData, depth: number): string {
    // Skip invisible nodes
    if ('visible' in node && node.visible === false) {
      return '';
    }

    switch (node.type) {
      case 'FRAME':
      case 'GROUP':
      case 'COMPONENT':
      case 'INSTANCE':
        return this.containerToMarkup(node as FrameNodeData, depth);

      case 'TEXT':
        return this.textToMarkup(node as TextNodeData, depth);

      case 'IMAGE':
        return this.imageToMarkup(node as ImageNodeData, depth);

      case 'VECTOR':
        return this.shapeToMarkup(node as SceneNodeData, depth);

      case 'DOCUMENT':
      case 'PAGE':
        // Export children
        const childIds = this.sceneGraph.getChildIds(node.id);
        return childIds
          .map(childId => {
            const child = this.sceneGraph.getNode(childId);
            return child ? this.nodeToMarkup(child, depth) : '';
          })
          .filter(Boolean)
          .join('\n');

      default:
        this.warnings.push(`Unsupported node type: ${node.type}`);
        return '';
    }
  }

  /**
   * Convert container to Svelte markup
   */
  private containerToMarkup(node: FrameNodeData | ComponentNodeData | InstanceNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);

    // Detect props from node name
    this.detectPropsFromName(node.name);

    // Determine element tag
    let tag = 'div';
    const name = node.name?.toLowerCase() ?? '';
    if (name.includes('button') || name.includes('btn')) {
      tag = 'button';
      this.detectedEvents.set('click', { name: 'click', type: 'MouseEvent' });
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
      this.detectedEvents.set('submit', { name: 'submit', type: 'SubmitEvent' });
    } else if (name.includes('input')) {
      tag = 'input';
      this.detectedEvents.set('input', { name: 'input', type: 'Event' });
      this.detectedEvents.set('change', { name: 'change', type: 'Event' });
    } else if (name.includes('list') || name.includes('menu')) {
      tag = 'ul';
    } else if (name.includes('item')) {
      tag = 'li';
    }

    // Generate attributes
    const attrs = this.generateAttributes(node);

    // Add event handlers for interactive elements
    let eventAttrs = '';
    if (tag === 'button' && this.options.includeEvents) {
      eventAttrs = this.options.svelteVersion === '5'
        ? ' onclick={handleClick}'
        : ' on:click={handleClick}';
    } else if (tag === 'form' && this.options.includeEvents) {
      eventAttrs = this.options.svelteVersion === '5'
        ? ' onsubmit={handleSubmit}'
        : ' on:submit|preventDefault={handleSubmit}';
    }

    // Get children
    const childIds = this.sceneGraph.getChildIds(node.id);
    const hasChildren = childIds.length > 0;

    if (!hasChildren) {
      if (tag === 'input') {
        return `${indent}<${tag}${attrs}${eventAttrs} />`;
      }
      return `${indent}<${tag}${attrs}${eventAttrs}></${tag}>`;
    }

    // Render children
    const childrenMarkup = childIds
      .map(childId => {
        const child = this.sceneGraph.getNode(childId);
        return child ? this.nodeToMarkup(child, depth + 1) : '';
      })
      .filter(Boolean)
      .join('\n');

    return `${indent}<${tag}${attrs}${eventAttrs}>\n${childrenMarkup}\n${indent}</${tag}>`;
  }

  /**
   * Convert text node to Svelte markup
   */
  private textToMarkup(node: TextNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);

    // Detect props from text content
    const textContent = this.processTextContent(node.characters ?? '');

    // Determine tag based on context
    let tag = 'span';
    const name = node.name?.toLowerCase() ?? '';
    const firstStyle = node.textStyles?.[0];
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

    // For multi-line text, prefer <p>
    if (node.characters?.includes('\n') && tag === 'span') {
      tag = 'p';
    }

    // Generate attributes
    const attrs = this.generateAttributes(node);

    return `${indent}<${tag}${attrs}>${textContent}</${tag}>`;
  }

  /**
   * Convert image node to Svelte markup
   */
  private imageToMarkup(node: ImageNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);

    // Detect props from name
    this.detectPropsFromName(node.name);

    // Check if image src should be a prop
    const srcProp = this.checkForProp(node.name, 'src') || this.checkForProp(node.name, 'image');
    const altProp = this.checkForProp(node.name, 'alt');

    const src = srcProp ? `src={${srcProp}}` : `src="${node.imageRef || '/placeholder.svg'}"`;
    const alt = altProp ? `alt={${altProp}}` : `alt="${this.escapeHTML(node.name || 'Image')}"`;

    // Generate styling
    const styling = this.generateStyling(node);

    // Add object-fit based on scale mode
    let extraClasses = '';
    if (node.scaleMode === 'FILL') {
      extraClasses = ' object-cover';
    } else if (node.scaleMode === 'FIT') {
      extraClasses = ' object-contain';
    }

    if (this.options.styling === 'tailwind' && extraClasses) {
      const classMatch = styling.match(/class="([^"]*)"/);
      if (classMatch) {
        const newStyling = styling.replace(
          `class="${classMatch[1]}"`,
          `class="${classMatch[1]}${extraClasses}"`
        );
        return `${indent}<img ${src} ${alt}${newStyling} />`;
      }
    }

    return `${indent}<img ${src} ${alt}${styling} />`;
  }

  /**
   * Convert shape node to Svelte markup
   */
  private shapeToMarkup(node: SceneNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);
    const attrs = this.generateAttributes(node as NodeData);
    return `${indent}<div${attrs}></div>`;
  }

  /**
   * Generate element attributes
   */
  private generateAttributes(node: NodeData | SceneNodeData): string {
    return this.generateStyling(node);
  }

  /**
   * Generate styling attribute based on options
   */
  private generateStyling(node: NodeData | SceneNodeData): string {
    switch (this.options.styling) {
      case 'tailwind':
        return this.generateTailwindStyling(node);
      case 'scoped':
        return this.generateScopedStyling(node);
      case 'inline':
        return this.generateInlineStyling(node);
      default:
        return this.generateTailwindStyling(node);
    }
  }

  /**
   * Generate Tailwind class attribute
   */
  private generateTailwindStyling(node: NodeData | SceneNodeData): string {
    const classes = nodeToUtilityClasses(node as NodeData, {
      includePosition: false,
      includeDimensions: true,
      useArbitraryValues: true,
    });

    if (classes.length === 0) {
      return '';
    }

    return ` class="${classes.join(' ')}"`;
  }

  /**
   * Generate scoped CSS class
   */
  private generateScopedStyling(node: NodeData | SceneNodeData): string {
    const className = this.generateClassName(node.name || 'element');
    const css = this.generateCSSForNode(node);

    if (css) {
      this.scopedStyles.push(`.${className} {\n${css}\n}`);
    }

    return ` class="${className}"`;
  }

  /**
   * Generate inline style attribute
   */
  private generateInlineStyling(node: NodeData | SceneNodeData): string {
    const styles: string[] = [];
    const sceneNode = node as SceneNodeData;

    if ('width' in sceneNode && sceneNode.width !== undefined) {
      styles.push(`width: ${formatNum(sceneNode.width)}px`);
    }
    if ('height' in sceneNode && sceneNode.height !== undefined) {
      styles.push(`height: ${formatNum(sceneNode.height)}px`);
    }

    if ('fills' in sceneNode && sceneNode.fills?.length > 0) {
      const fill = sceneNode.fills.find(f => f.visible !== false);
      if (fill?.type === 'SOLID') {
        const { r, g, b } = fill.color;
        const a = fill.opacity ?? fill.color.a;
        if (a < 1) {
          styles.push(`background-color: rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`);
        } else {
          styles.push(`background-color: rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`);
        }
      }
    }

    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      if (frameNode.cornerRadius && frameNode.cornerRadius > 0) {
        styles.push(`border-radius: ${frameNode.cornerRadius}px`);
      }
      if (frameNode.autoLayout?.mode && frameNode.autoLayout.mode !== 'NONE') {
        styles.push(`display: flex`);
        styles.push(`flex-direction: ${frameNode.autoLayout.mode === 'HORIZONTAL' ? 'row' : 'column'}`);
        if (frameNode.autoLayout.itemSpacing > 0) {
          styles.push(`gap: ${frameNode.autoLayout.itemSpacing}px`);
        }
      }
    }

    if (styles.length === 0) {
      return '';
    }

    return ` style="${styles.join('; ')}"`;
  }

  /**
   * Generate a valid CSS class name
   */
  private generateClassName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-')
      .replace(/^(\d)/, '_$1')
      .toLowerCase()
      || 'element';
  }

  /**
   * Generate CSS for a node
   */
  private generateCSSForNode(node: NodeData | SceneNodeData): string {
    const rules: string[] = [];
    const sceneNode = node as SceneNodeData;

    if ('width' in sceneNode && sceneNode.width !== undefined) {
      rules.push(`  width: ${formatNum(sceneNode.width)}px;`);
    }
    if ('height' in sceneNode && sceneNode.height !== undefined) {
      rules.push(`  height: ${formatNum(sceneNode.height)}px;`);
    }

    if ('fills' in sceneNode && sceneNode.fills?.length > 0) {
      const fill = sceneNode.fills.find(f => f.visible !== false);
      if (fill?.type === 'SOLID') {
        const { r, g, b } = fill.color;
        rules.push(`  background-color: rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)});`);
      }
    }

    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      if (frameNode.cornerRadius && frameNode.cornerRadius > 0) {
        rules.push(`  border-radius: ${frameNode.cornerRadius}px;`);
      }
      if (frameNode.autoLayout?.mode && frameNode.autoLayout.mode !== 'NONE') {
        rules.push(`  display: flex;`);
        rules.push(`  flex-direction: ${frameNode.autoLayout.mode === 'HORIZONTAL' ? 'row' : 'column'};`);
        if (frameNode.autoLayout.itemSpacing > 0) {
          rules.push(`  gap: ${frameNode.autoLayout.itemSpacing}px;`);
        }
      }
    }

    return rules.join('\n');
  }

  /**
   * Detect props from node name pattern {propName}
   */
  private detectPropsFromName(name: string): void {
    if (!name) return;

    let match: RegExpExecArray | null;
    while ((match = PROP_PATTERN.exec(name)) !== null) {
      const propName = match[1]!;
      const defaultValue = match[2];

      if (!this.detectedProps.has(propName)) {
        this.detectedProps.set(propName, {
          name: propName,
          type: this.inferPropType(propName, defaultValue),
          defaultValue,
          required: defaultValue === undefined,
          source: 'name',
        });
      }
    }
  }

  /**
   * Process text content and detect props
   */
  private processTextContent(text: string): string {
    return text.replace(PROP_PATTERN, (_match, propName: string, defaultValue?: string) => {
      if (!this.detectedProps.has(propName)) {
        this.detectedProps.set(propName, {
          name: propName,
          type: 'string',
          defaultValue,
          required: defaultValue === undefined,
          source: 'text',
        });
      }
      return `{${propName}}`;
    });
  }

  /**
   * Check if a name contains a specific prop pattern
   */
  private checkForProp(name: string, propHint: string): string | null {
    if (!name) return null;

    const match = name.match(new RegExp(`\\{(${propHint}\\w*)(?::[^}]*)?\\}`, 'i'));
    if (match) {
      const propName = match[1]!;
      if (!this.detectedProps.has(propName)) {
        this.detectedProps.set(propName, {
          name: propName,
          type: 'string',
          defaultValue: undefined,
          required: true,
          source: 'name',
        });
      }
      return propName;
    }
    return null;
  }

  /**
   * Infer prop type from name and default value
   */
  private inferPropType(propName: string, defaultValue?: string): SvelteDetectedProp['type'] {
    const lowerName = propName.toLowerCase();

    // Boolean patterns
    if (lowerName.startsWith('is') || lowerName.startsWith('has') || lowerName.startsWith('show') ||
        lowerName.startsWith('enable') || lowerName.startsWith('disable') || lowerName === 'active' ||
        lowerName === 'disabled' || lowerName === 'loading' || lowerName === 'checked') {
      return 'boolean';
    }

    // Number patterns
    if (lowerName.includes('count') || lowerName.includes('index') || lowerName.includes('size') ||
        lowerName.includes('width') || lowerName.includes('height') || lowerName.includes('amount') ||
        lowerName.includes('price') || lowerName.includes('quantity')) {
      return 'number';
    }

    // Array patterns
    if (lowerName.endsWith('s') && (lowerName.includes('item') || lowerName.includes('option') ||
        lowerName.includes('tag') || lowerName.includes('label'))) {
      return 'string[]';
    }

    // Object patterns
    if (lowerName === 'data' || lowerName === 'config' || lowerName === 'options' || lowerName === 'settings') {
      return 'object';
    }

    // Check default value
    if (defaultValue) {
      if (defaultValue === 'true' || defaultValue === 'false') {
        return 'boolean';
      }
      if (!isNaN(Number(defaultValue))) {
        return 'number';
      }
    }

    return 'string';
  }

  /**
   * Generate the Svelte component
   */
  private generateComponent(markupContent: string): string {
    const lines: string[] = [];

    // Script section
    lines.push(...this.generateScript());

    // Markup section
    lines.push('');
    lines.push(markupContent);

    // Style section
    if (this.scopedStyles.length > 0 || this.options.styling === 'scoped') {
      lines.push('');
      lines.push(...this.generateStyleSection());
    }

    return lines.join('\n');
  }

  /**
   * Generate script section
   */
  private generateScript(): string[] {
    const { typescript, svelteVersion, indent, includeJSDoc } = this.options;
    const props = Array.from(this.detectedProps.values());
    const events = Array.from(this.detectedEvents.values());
    const lines: string[] = [];

    const lang = typescript ? ' lang="ts"' : '';

    if (svelteVersion === '5') {
      // Svelte 5 runes syntax
      lines.push(`<script${lang}>`);

      // JSDoc for component
      if (includeJSDoc && props.length > 0) {
        lines.push(`${indent}/**`);
        lines.push(`${indent} * @component ${this.options.componentName}`);
        for (const prop of props) {
          const description = prop.required ? '(required)' : `default: ${prop.defaultValue}`;
          lines.push(`${indent} * @prop {${prop.type}} ${prop.name} - ${description}`);
        }
        lines.push(`${indent} */`);
      }

      // Props interface for TypeScript
      if (typescript && props.length > 0) {
        lines.push(`${indent}interface Props {`);
        for (const prop of props) {
          const optional = !prop.required ? '?' : '';
          lines.push(`${indent}${indent}${prop.name}${optional}: ${prop.type};`);
        }
        lines.push(`${indent}}`);
        lines.push('');
      }

      // Props using $props() rune
      if (props.length > 0) {
        if (typescript) {
          lines.push(`${indent}let {`);
          for (const prop of props) {
            if (prop.defaultValue !== undefined) {
              lines.push(`${indent}${indent}${prop.name} = ${this.formatDefaultValue(prop)},`);
            } else {
              lines.push(`${indent}${indent}${prop.name},`);
            }
          }
          lines.push(`${indent}}: Props = $props();`);
        } else {
          lines.push(`${indent}let {`);
          for (const prop of props) {
            if (prop.defaultValue !== undefined) {
              lines.push(`${indent}${indent}${prop.name} = ${this.formatDefaultValue(prop)},`);
            } else {
              lines.push(`${indent}${indent}${prop.name},`);
            }
          }
          lines.push(`${indent}} = $props();`);
        }
      }

      // Event handlers
      if (events.length > 0 && this.options.includeEvents) {
        lines.push('');
        for (const event of events) {
          if (event.name === 'click') {
            if (typescript) {
              lines.push(`${indent}function handleClick(event: MouseEvent) {`);
            } else {
              lines.push(`${indent}function handleClick(event) {`);
            }
            lines.push(`${indent}${indent}// Handle click event`);
            lines.push(`${indent}}`);
          } else if (event.name === 'submit') {
            if (typescript) {
              lines.push(`${indent}function handleSubmit(event: SubmitEvent) {`);
            } else {
              lines.push(`${indent}function handleSubmit(event) {`);
            }
            lines.push(`${indent}${indent}event.preventDefault();`);
            lines.push(`${indent}${indent}// Handle submit event`);
            lines.push(`${indent}}`);
          }
        }
      }

      lines.push('</script>');
    } else {
      // Svelte 4 syntax
      lines.push(`<script${lang}>`);

      // Imports for event dispatcher if needed
      if (events.length > 0 && this.options.includeEvents) {
        lines.push(`${indent}import { createEventDispatcher } from 'svelte';`);
        lines.push('');
        if (typescript) {
          lines.push(`${indent}const dispatch = createEventDispatcher<{`);
          for (const event of events) {
            lines.push(`${indent}${indent}${event.name}: ${event.type};`);
          }
          lines.push(`${indent}}>();`);
        } else {
          lines.push(`${indent}const dispatch = createEventDispatcher();`);
        }
        lines.push('');
      }

      // JSDoc for component
      if (includeJSDoc && props.length > 0) {
        lines.push(`${indent}/**`);
        lines.push(`${indent} * @component ${this.options.componentName}`);
        for (const prop of props) {
          const description = prop.required ? '(required)' : `default: ${prop.defaultValue}`;
          lines.push(`${indent} * @prop {${prop.type}} ${prop.name} - ${description}`);
        }
        lines.push(`${indent} */`);
      }

      // Props using export let
      if (props.length > 0) {
        for (const prop of props) {
          const typeAnnotation = typescript ? `: ${prop.type}` : '';
          if (prop.defaultValue !== undefined) {
            lines.push(`${indent}export let ${prop.name}${typeAnnotation} = ${this.formatDefaultValue(prop)};`);
          } else {
            lines.push(`${indent}export let ${prop.name}${typeAnnotation};`);
          }
        }
      }

      // Event handlers
      if (events.length > 0 && this.options.includeEvents) {
        lines.push('');
        for (const event of events) {
          if (event.name === 'click') {
            if (typescript) {
              lines.push(`${indent}function handleClick(event: MouseEvent) {`);
            } else {
              lines.push(`${indent}function handleClick(event) {`);
            }
            lines.push(`${indent}${indent}dispatch('click', event);`);
            lines.push(`${indent}}`);
          } else if (event.name === 'submit') {
            if (typescript) {
              lines.push(`${indent}function handleSubmit(event: SubmitEvent) {`);
            } else {
              lines.push(`${indent}function handleSubmit(event) {`);
            }
            lines.push(`${indent}${indent}dispatch('submit', event);`);
            lines.push(`${indent}}`);
          }
        }
      }

      lines.push('</script>');
    }

    return lines;
  }

  /**
   * Generate style section
   */
  private generateStyleSection(): string[] {
    const lines: string[] = [];

    lines.push('<style>');
    if (this.scopedStyles.length > 0) {
      lines.push(this.scopedStyles.join('\n\n'));
    }
    lines.push('</style>');

    return lines;
  }

  /**
   * Format default value
   */
  private formatDefaultValue(prop: SvelteDetectedProp): string {
    if (prop.defaultValue === undefined) return 'undefined';

    switch (prop.type) {
      case 'boolean':
        return prop.defaultValue === 'true' ? 'true' : 'false';
      case 'number':
        return prop.defaultValue;
      case 'string':
        return `'${prop.defaultValue}'`;
      case 'string[]':
        return '[]';
      case 'object':
        return '{}';
      default:
        return `'${prop.defaultValue}'`;
    }
  }

  /**
   * Indent lines
   */
  private indentLines(text: string, depth: number): string {
    const indent = this.options.indent.repeat(depth);
    return text.split('\n').map(line => indent + line).join('\n');
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
export function createSvelteComponentGenerator(
  sceneGraph: SceneGraph,
  options?: Partial<SvelteExportOptions>
): SvelteComponentGenerator {
  return new SvelteComponentGenerator(sceneGraph, options);
}

/**
 * Quick export function
 */
export function exportToSvelte(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options?: Partial<SvelteExportOptions>
): SvelteExportResult {
  const generator = createSvelteComponentGenerator(sceneGraph, options);
  return generator.generate(nodeIds);
}
