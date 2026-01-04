/**
 * Angular Component Generator
 *
 * Exports DesignLibre designs as Angular components with TypeScript.
 * Supports standalone components (Angular 14+), signals (Angular 16+),
 * and traditional NgModule-based components.
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

/**
 * Detected input (prop) from node name or text content
 */
export interface AngularDetectedInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'object';
  defaultValue: string | undefined;
  required: boolean;
  source: 'name' | 'text' | 'component';
}

/**
 * Detected output (event) from interactive elements
 */
export interface AngularDetectedOutput {
  name: string;
  type: string;
}

/**
 * Angular component export options
 */
export interface AngularExportOptions {
  /** Component name (PascalCase) */
  componentName: string;
  /** Selector prefix (e.g., 'app') */
  selectorPrefix: string;
  /** Use standalone components (Angular 14+) */
  standalone: boolean;
  /** Use signals for inputs (Angular 16+) */
  useSignals: boolean;
  /** Use OnPush change detection */
  onPush: boolean;
  /** Styling approach */
  styling: 'tailwind' | 'inline' | 'scss' | 'css';
  /** Generate separate template file */
  separateTemplate: boolean;
  /** Generate separate style file */
  separateStyles: boolean;
  /** Indentation */
  indent: string;
}

const DEFAULT_OPTIONS: AngularExportOptions = {
  componentName: 'Component',
  selectorPrefix: 'app',
  standalone: true,
  useSignals: true,
  onPush: true,
  styling: 'tailwind',
  separateTemplate: false,
  separateStyles: false,
  indent: '  ',
};

/**
 * Angular component export result
 */
export interface AngularExportResult {
  /** Main component TypeScript file */
  component: string;
  /** Component file name */
  fileName: string;
  /** Template file (if separate) */
  template: string | undefined;
  /** Template file name */
  templateFileName: string | undefined;
  /** Styles file (if separate) */
  styles: string | undefined;
  /** Styles file name */
  stylesFileName: string | undefined;
  /** Detected inputs */
  inputs: AngularDetectedInput[];
  /** Detected outputs */
  outputs: AngularDetectedOutput[];
  /** Any warnings during generation */
  warnings: string[];
}

/**
 * Prop pattern regex - matches {propName} or {propName:defaultValue}
 */
const PROP_PATTERN = /\{(\w+)(?::([^}]*))?\}/g;

/**
 * Angular Component Generator class
 */
export class AngularComponentGenerator {
  private sceneGraph: SceneGraph;
  private options: AngularExportOptions;
  private detectedInputs: Map<string, AngularDetectedInput> = new Map();
  private detectedOutputs: Map<string, AngularDetectedOutput> = new Map();
  private warnings: string[] = [];
  private scopedStyles: string[] = [];

  constructor(sceneGraph: SceneGraph, options: Partial<AngularExportOptions> = {}) {
    this.sceneGraph = sceneGraph;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate Angular component from nodes
   */
  generate(nodeIds: NodeId[]): AngularExportResult {
    this.detectedInputs.clear();
    this.detectedOutputs.clear();
    this.warnings = [];
    this.scopedStyles = [];

    // Generate template for all nodes
    const templateParts: string[] = [];
    for (const nodeId of nodeIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node) {
        const template = this.nodeToTemplate(node, 0);
        if (template) {
          templateParts.push(template);
        }
      }
    }

    // Wrap in root element if multiple nodes
    let templateContent = templateParts.join('\n');
    if (templateParts.length > 1) {
      templateContent = `<div>\n${templateParts.map(p => this.indentLines(p, 1)).join('\n')}\n</div>`;
    } else if (templateParts.length === 0) {
      templateContent = '<div>TODO: Add content</div>';
    }

    // Generate component
    const component = this.generateComponent(templateContent);

    // Generate separate files if needed
    let template: string | undefined;
    let templateFileName: string | undefined;
    let styles: string | undefined;
    let stylesFileName: string | undefined;

    const kebabName = this.toKebabCase(this.options.componentName);

    if (this.options.separateTemplate) {
      template = templateContent;
      templateFileName = `${kebabName}.component.html`;
    }

    if (this.options.separateStyles && this.scopedStyles.length > 0) {
      styles = this.scopedStyles.join('\n\n');
      const ext = this.options.styling === 'scss' ? 'scss' : 'css';
      stylesFileName = `${kebabName}.component.${ext}`;
    }

    const fileName = `${kebabName}.component.ts`;

    return {
      component,
      fileName,
      template,
      templateFileName,
      styles,
      stylesFileName,
      inputs: Array.from(this.detectedInputs.values()),
      outputs: Array.from(this.detectedOutputs.values()),
      warnings: this.warnings,
    };
  }

  /**
   * Convert a node to Angular template
   */
  private nodeToTemplate(node: NodeData, depth: number): string {
    // Skip invisible nodes
    if ('visible' in node && node.visible === false) {
      return '';
    }

    switch (node.type) {
      case 'FRAME':
      case 'GROUP':
      case 'COMPONENT':
      case 'INSTANCE':
        return this.containerToTemplate(node as FrameNodeData, depth);

      case 'TEXT':
        return this.textToTemplate(node as TextNodeData, depth);

      case 'IMAGE':
        return this.imageToTemplate(node as ImageNodeData, depth);

      case 'VECTOR':
        return this.shapeToTemplate(node as SceneNodeData, depth);

      case 'DOCUMENT':
      case 'PAGE':
        // Export children
        const childIds = this.sceneGraph.getChildIds(node.id);
        return childIds
          .map(childId => {
            const child = this.sceneGraph.getNode(childId);
            return child ? this.nodeToTemplate(child, depth) : '';
          })
          .filter(Boolean)
          .join('\n');

      default:
        this.warnings.push(`Unsupported node type: ${node.type}`);
        return '';
    }
  }

  /**
   * Convert container to Angular template
   */
  private containerToTemplate(node: FrameNodeData | ComponentNodeData | InstanceNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);

    // Detect inputs from node name
    this.detectInputsFromName(node.name);

    // Determine element tag
    let tag = 'div';
    const name = node.name?.toLowerCase() ?? '';
    if (name.includes('button') || name.includes('btn')) {
      tag = 'button';
      this.detectedOutputs.set('click', { name: 'click', type: 'MouseEvent' });
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
      this.detectedOutputs.set('submit', { name: 'submit', type: 'Event' });
    } else if (name.includes('input')) {
      tag = 'input';
      this.detectedOutputs.set('inputChange', { name: 'inputChange', type: 'Event' });
    } else if (name.includes('list') || name.includes('menu')) {
      tag = 'ul';
    } else if (name.includes('item')) {
      tag = 'li';
    }

    // Generate attributes
    const attrs = this.generateAttributes(node);

    // Add event bindings for interactive elements
    let eventAttrs = '';
    if (tag === 'button') {
      eventAttrs = ' (click)="onClick($event)"';
    } else if (tag === 'form') {
      eventAttrs = ' (ngSubmit)="onSubmit($event)"';
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
    const childrenTemplate = childIds
      .map(childId => {
        const child = this.sceneGraph.getNode(childId);
        return child ? this.nodeToTemplate(child, depth + 1) : '';
      })
      .filter(Boolean)
      .join('\n');

    return `${indent}<${tag}${attrs}${eventAttrs}>\n${childrenTemplate}\n${indent}</${tag}>`;
  }

  /**
   * Convert text node to Angular template
   */
  private textToTemplate(node: TextNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);

    // Detect inputs from text content
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
   * Convert image node to Angular template
   */
  private imageToTemplate(node: ImageNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);

    // Detect inputs from name
    this.detectInputsFromName(node.name);

    // Check if image src should be an input
    const srcInput = this.checkForInput(node.name, 'src') || this.checkForInput(node.name, 'image');
    const altInput = this.checkForInput(node.name, 'alt');

    const src = srcInput ? `[src]="${srcInput}"` : `src="${node.imageRef || '/placeholder.svg'}"`;
    const alt = altInput ? `[alt]="${altInput}"` : `alt="${this.escapeHTML(node.name || 'Image')}"`;

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
   * Convert shape node to Angular template
   */
  private shapeToTemplate(node: SceneNodeData, depth: number): string {
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
      case 'scss':
      case 'css':
        return this.generateClassStyling(node);
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
   * Generate CSS class styling
   */
  private generateClassStyling(node: NodeData | SceneNodeData): string {
    const className = this.generateClassName(node.name || 'element');
    const css = this.generateCSSForNode(node);

    if (css) {
      this.scopedStyles.push(`.${className} {\n${css}\n}`);
    }

    return ` class="${className}"`;
  }

  /**
   * Generate inline [ngStyle] binding
   */
  private generateInlineStyling(node: NodeData | SceneNodeData): string {
    const styles: string[] = [];
    const sceneNode = node as SceneNodeData;

    if ('width' in sceneNode && sceneNode.width !== undefined) {
      styles.push(`'width.px': ${sceneNode.width}`);
    }
    if ('height' in sceneNode && sceneNode.height !== undefined) {
      styles.push(`'height.px': ${sceneNode.height}`);
    }

    if ('fills' in sceneNode && sceneNode.fills?.length > 0) {
      const fill = sceneNode.fills.find(f => f.visible !== false);
      if (fill?.type === 'SOLID') {
        const { r, g, b } = fill.color;
        const a = fill.opacity ?? fill.color.a;
        if (a < 1) {
          styles.push(`'background-color': 'rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})'`);
        } else {
          styles.push(`'background-color': 'rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})'`);
        }
      }
    }

    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      if (frameNode.cornerRadius && frameNode.cornerRadius > 0) {
        styles.push(`'border-radius.px': ${frameNode.cornerRadius}`);
      }
      if (frameNode.autoLayout?.mode && frameNode.autoLayout.mode !== 'NONE') {
        styles.push(`'display': 'flex'`);
        styles.push(`'flex-direction': '${frameNode.autoLayout.mode === 'HORIZONTAL' ? 'row' : 'column'}'`);
        if (frameNode.autoLayout.itemSpacing > 0) {
          styles.push(`'gap.px': ${frameNode.autoLayout.itemSpacing}`);
        }
      }
    }

    if (styles.length === 0) {
      return '';
    }

    return ` [ngStyle]="{ ${styles.join(', ')} }"`;
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
      rules.push(`  width: ${sceneNode.width}px;`);
    }
    if ('height' in sceneNode && sceneNode.height !== undefined) {
      rules.push(`  height: ${sceneNode.height}px;`);
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
   * Detect inputs from node name pattern {propName}
   */
  private detectInputsFromName(name: string): void {
    if (!name) return;

    let match: RegExpExecArray | null;
    while ((match = PROP_PATTERN.exec(name)) !== null) {
      const inputName = match[1]!;
      const defaultValue = match[2];

      if (!this.detectedInputs.has(inputName)) {
        this.detectedInputs.set(inputName, {
          name: inputName,
          type: this.inferInputType(inputName, defaultValue),
          defaultValue,
          required: defaultValue === undefined,
          source: 'name',
        });
      }
    }
  }

  /**
   * Process text content and detect inputs
   */
  private processTextContent(text: string): string {
    return text.replace(PROP_PATTERN, (_match, inputName: string, defaultValue?: string) => {
      if (!this.detectedInputs.has(inputName)) {
        this.detectedInputs.set(inputName, {
          name: inputName,
          type: 'string',
          defaultValue,
          required: defaultValue === undefined,
          source: 'text',
        });
      }
      // Angular interpolation
      return `{{ ${inputName} }}`;
    });
  }

  /**
   * Check if a name contains a specific input pattern
   */
  private checkForInput(name: string, inputHint: string): string | null {
    if (!name) return null;

    const match = name.match(new RegExp(`\\{(${inputHint}\\w*)(?::[^}]*)?\\}`, 'i'));
    if (match) {
      const inputName = match[1]!;
      if (!this.detectedInputs.has(inputName)) {
        this.detectedInputs.set(inputName, {
          name: inputName,
          type: 'string',
          defaultValue: undefined,
          required: true,
          source: 'name',
        });
      }
      return inputName;
    }
    return null;
  }

  /**
   * Infer input type from name and default value
   */
  private inferInputType(inputName: string, defaultValue?: string): AngularDetectedInput['type'] {
    const lowerName = inputName.toLowerCase();

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
   * Generate the Angular component
   */
  private generateComponent(templateContent: string): string {
    const {
      componentName,
      selectorPrefix,
      standalone,
      useSignals,
      onPush,
      styling,
      separateTemplate,
      separateStyles,
      indent,
    } = this.options;

    const inputs = Array.from(this.detectedInputs.values());
    const outputs = Array.from(this.detectedOutputs.values());
    const kebabName = this.toKebabCase(componentName);
    const selector = `${selectorPrefix}-${kebabName}`;

    const lines: string[] = [];

    // Imports
    const coreImports: string[] = ['Component'];
    if (onPush) {
      coreImports.push('ChangeDetectionStrategy');
    }
    if (useSignals && inputs.length > 0) {
      coreImports.push('input');
    } else if (!useSignals && inputs.length > 0) {
      coreImports.push('Input');
    }
    if (outputs.length > 0) {
      coreImports.push('Output');
      coreImports.push('EventEmitter');
    }

    lines.push(`import { ${coreImports.join(', ')} } from '@angular/core';`);

    // CommonModule import for standalone
    if (standalone && this.options.styling === 'inline') {
      lines.push(`import { CommonModule } from '@angular/common';`);
    }

    lines.push('');

    // Component decorator
    lines.push('@Component({');
    lines.push(`${indent}selector: '${selector}',`);

    if (standalone) {
      if (this.options.styling === 'inline') {
        lines.push(`${indent}standalone: true,`);
        lines.push(`${indent}imports: [CommonModule],`);
      } else {
        lines.push(`${indent}standalone: true,`);
      }
    }

    // Template
    if (separateTemplate) {
      lines.push(`${indent}templateUrl: './${kebabName}.component.html',`);
    } else {
      lines.push(`${indent}template: \``);
      lines.push(this.indentLines(templateContent, 2));
      lines.push(`${indent}\`,`);
    }

    // Styles
    if (separateStyles && this.scopedStyles.length > 0) {
      const ext = styling === 'scss' ? 'scss' : 'css';
      lines.push(`${indent}styleUrls: ['./${kebabName}.component.${ext}'],`);
    } else if (this.scopedStyles.length > 0) {
      lines.push(`${indent}styles: [\``);
      lines.push(this.indentLines(this.scopedStyles.join('\n\n'), 2));
      lines.push(`${indent}\`],`);
    }

    // Change detection
    if (onPush) {
      lines.push(`${indent}changeDetection: ChangeDetectionStrategy.OnPush,`);
    }

    lines.push('})');

    // Component class
    lines.push(`export class ${componentName}Component {`);

    // Inputs
    if (inputs.length > 0) {
      if (useSignals) {
        // Angular 16+ signals syntax
        for (const inp of inputs) {
          if (inp.required) {
            lines.push(`${indent}readonly ${inp.name} = input.required<${inp.type}>();`);
          } else {
            const defaultVal = this.formatDefaultValue(inp);
            lines.push(`${indent}readonly ${inp.name} = input<${inp.type}>(${defaultVal});`);
          }
        }
      } else {
        // Traditional @Input decorator
        for (const inp of inputs) {
          const decorator = inp.required ? '@Input({ required: true })' : '@Input()';
          if (inp.defaultValue !== undefined) {
            lines.push(`${indent}${decorator} ${inp.name}: ${inp.type} = ${this.formatDefaultValue(inp)};`);
          } else {
            lines.push(`${indent}${decorator} ${inp.name}!: ${inp.type};`);
          }
        }
      }
      lines.push('');
    }

    // Outputs
    if (outputs.length > 0) {
      for (const out of outputs) {
        lines.push(`${indent}@Output() ${out.name} = new EventEmitter<${out.type}>();`);
      }
      lines.push('');
    }

    // Event handler methods
    if (outputs.some(o => o.name === 'click')) {
      lines.push(`${indent}onClick(event: MouseEvent): void {`);
      lines.push(`${indent}${indent}this.click.emit(event);`);
      lines.push(`${indent}}`);
      lines.push('');
    }

    if (outputs.some(o => o.name === 'submit')) {
      lines.push(`${indent}onSubmit(event: Event): void {`);
      lines.push(`${indent}${indent}this.submit.emit(event);`);
      lines.push(`${indent}}`);
      lines.push('');
    }

    // Remove trailing newline if any
    while (lines[lines.length - 1] === '') {
      lines.pop();
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Format default value for TypeScript
   */
  private formatDefaultValue(input: AngularDetectedInput): string {
    if (input.defaultValue === undefined) {
      switch (input.type) {
        case 'string': return "''";
        case 'number': return '0';
        case 'boolean': return 'false';
        case 'string[]': return '[]';
        case 'object': return '{}';
        default: return "''";
      }
    }

    switch (input.type) {
      case 'boolean':
        return input.defaultValue === 'true' ? 'true' : 'false';
      case 'number':
        return input.defaultValue;
      case 'string':
        return `'${input.defaultValue}'`;
      case 'string[]':
        return '[]';
      case 'object':
        return '{}';
      default:
        return `'${input.defaultValue}'`;
    }
  }

  /**
   * Convert PascalCase to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
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
export function createAngularComponentGenerator(
  sceneGraph: SceneGraph,
  options?: Partial<AngularExportOptions>
): AngularComponentGenerator {
  return new AngularComponentGenerator(sceneGraph, options);
}

/**
 * Quick export function
 */
export function exportToAngular(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options?: Partial<AngularExportOptions>
): AngularExportResult {
  const generator = createAngularComponentGenerator(sceneGraph, options);
  return generator.generate(nodeIds);
}
