/**
 * React Component Generator
 *
 * Exports DesignLibre designs as React components with TypeScript support.
 * Converts design nodes to JSX with utility classes or inline styles.
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
import { getSemanticMetadata, type SemanticMetadata } from '@core/types/semantic-schema';
import type { VariableDefinition, VariableType } from '@prototype/variable-manager';

/**
 * Detected prop from node name or text content
 */
export interface DetectedProp {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'ReactNode' | 'string[]';
  defaultValue: string | undefined;
  required: boolean;
  source: 'name' | 'text' | 'component';
}

/**
 * React component export options
 */
export interface ReactExportOptions {
  /** Component name (PascalCase) */
  componentName: string;
  /** Use TypeScript */
  typescript: boolean;
  /** Styling approach */
  styling: 'tailwind' | 'inline' | 'css-modules' | 'styled-components';
  /** Include prop types */
  includeProps: boolean;
  /** Export as default */
  defaultExport: boolean;
  /** Use forwardRef */
  forwardRef: boolean;
  /** Include memo wrapper */
  memo: boolean;
  /** Generate Storybook story */
  includeStory: boolean;
  /** Indentation */
  indent: string;
  /** Variable definitions for state-aware code generation */
  variables?: VariableDefinition[];
}

const DEFAULT_OPTIONS: ReactExportOptions = {
  componentName: 'Component',
  typescript: true,
  styling: 'tailwind',
  includeProps: true,
  defaultExport: true,
  forwardRef: false,
  memo: false,
  includeStory: false,
  indent: '  ',
};

/**
 * React component export result
 */
export interface ReactExportResult {
  /** Main component code */
  component: string;
  /** Component file name */
  fileName: string;
  /** Detected props */
  props: DetectedProp[];
  /** CSS module content (if using css-modules) */
  cssModule: string | undefined;
  /** Storybook story (if includeStory) */
  story: string | undefined;
  /** Any warnings during generation */
  warnings: string[];
}

/**
 * Prop pattern regex - matches {propName} or {propName:defaultValue}
 */
const PROP_PATTERN = /\{(\w+)(?::([^}]*))?\}/g;

/**
 * React Component Generator class
 */
export class ReactComponentGenerator {
  private sceneGraph: SceneGraph;
  private options: ReactExportOptions;
  private detectedProps: Map<string, DetectedProp> = new Map();
  private warnings: string[] = [];
  private cssClasses: Map<string, string> = new Map();
  private variables: VariableDefinition[] = [];
  private variableMap: Map<string, VariableDefinition> = new Map();
  private usedVariableIds: Set<string> = new Set();

  constructor(sceneGraph: SceneGraph, options: Partial<ReactExportOptions> = {}) {
    this.sceneGraph = sceneGraph;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate React component from nodes
   */
  generate(nodeIds: NodeId[]): ReactExportResult {
    this.detectedProps.clear();
    this.warnings = [];
    this.cssClasses.clear();
    this.usedVariableIds.clear();

    // Store variables for state-aware code generation
    this.variables = this.options.variables ?? [];
    this.variableMap.clear();
    for (const v of this.variables) {
      this.variableMap.set(v.id, v);
    }

    // Collect used variables from all nodes
    for (const nodeId of nodeIds) {
      this.collectUsedVariables(nodeId);
    }

    // Generate JSX for all nodes
    const jsxParts: string[] = [];
    for (const nodeId of nodeIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node) {
        const jsx = this.nodeToJSX(node, 2);
        if (jsx) {
          jsxParts.push(jsx);
        }
      }
    }

    // Wrap in fragment if multiple root nodes
    let jsxContent = jsxParts.join('\n');
    if (jsxParts.length > 1) {
      jsxContent = `${this.options.indent.repeat(2)}<>\n${jsxContent}\n${this.options.indent.repeat(2)}</>`;
    }

    // Generate component code
    const component = this.generateComponentCode(jsxContent);

    // Generate CSS module if needed
    let cssModule: string | undefined;
    if (this.options.styling === 'css-modules' && this.cssClasses.size > 0) {
      cssModule = this.generateCSSModule();
    }

    // Generate story if needed
    let story: string | undefined;
    if (this.options.includeStory) {
      story = this.generateStory();
    }

    const ext = this.options.typescript ? 'tsx' : 'jsx';
    const fileName = `${this.options.componentName}.${ext}`;

    return {
      component,
      fileName,
      props: Array.from(this.detectedProps.values()),
      cssModule,
      story,
      warnings: this.warnings,
    };
  }

  /**
   * Convert a node to JSX
   */
  private nodeToJSX(node: NodeData, depth: number): string {
    // Skip invisible nodes
    if ('visible' in node && node.visible === false) {
      return '';
    }

    switch (node.type) {
      case 'FRAME':
      case 'GROUP':
      case 'COMPONENT':
      case 'INSTANCE':
        return this.containerToJSX(node as FrameNodeData, depth);

      case 'TEXT':
        return this.textToJSX(node as TextNodeData, depth);

      case 'IMAGE':
        return this.imageToJSX(node as ImageNodeData, depth);

      case 'VECTOR':
        return this.shapeToJSX(node as SceneNodeData, depth);

      case 'DOCUMENT':
      case 'PAGE':
        // Export children
        const childIds = this.sceneGraph.getChildIds(node.id);
        return childIds
          .map(childId => {
            const child = this.sceneGraph.getNode(childId);
            return child ? this.nodeToJSX(child, depth) : '';
          })
          .filter(Boolean)
          .join('\n');

      default:
        this.warnings.push(`Unsupported node type: ${node.type}`);
        return '';
    }
  }

  /**
   * Convert container (Frame/Group/Component/Instance) to JSX
   */
  private containerToJSX(node: FrameNodeData | ComponentNodeData | InstanceNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);

    // Detect props from node name
    this.detectPropsFromName(node.name);

    // Determine element tag
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
    } else if (name.includes('input')) {
      tag = 'input';
    } else if (name.includes('list') || name.includes('menu')) {
      tag = 'ul';
    } else if (name.includes('item')) {
      tag = 'li';
    }

    // Generate styling
    const styling = this.generateStyling(node);

    // Generate accessibility attributes from semantic metadata
    const accessibility = this.generateAccessibilityAttrs(node);

    // Get children
    const childIds = this.sceneGraph.getChildIds(node.id);
    const hasChildren = childIds.length > 0;

    if (!hasChildren) {
      if (tag === 'input') {
        return `${indent}<${tag}${styling}${accessibility} />`;
      }
      return `${indent}<${tag}${styling}${accessibility}></${tag}>`;
    }

    // Render children
    const childrenJSX = childIds
      .map(childId => {
        const child = this.sceneGraph.getNode(childId);
        return child ? this.nodeToJSX(child, depth + 1) : '';
      })
      .filter(Boolean)
      .join('\n');

    return `${indent}<${tag}${styling}${accessibility}>\n${childrenJSX}\n${indent}</${tag}>`;
  }

  /**
   * Convert text node to JSX
   */
  private textToJSX(node: TextNodeData, depth: number): string {
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

    // Generate styling
    const styling = this.generateStyling(node);

    // Generate accessibility attributes from semantic metadata
    const accessibility = this.generateAccessibilityAttrs(node);

    return `${indent}<${tag}${styling}${accessibility}>${textContent}</${tag}>`;
  }

  /**
   * Convert image node to JSX
   */
  private imageToJSX(node: ImageNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);

    // Detect props from name
    this.detectPropsFromName(node.name);

    // Generate styling
    const styling = this.generateStyling(node);

    // Check if image src should be a prop
    const srcProp = this.checkForProp(node.name, 'src') || this.checkForProp(node.name, 'image');
    const altProp = this.checkForProp(node.name, 'alt');

    const src = srcProp ? `{${srcProp}}` : `"${node.imageRef || '/placeholder.svg'}"`;
    const alt = altProp ? `{${altProp}}` : `"${this.escapeJSX(node.name || 'Image')}"`;

    // Add object-fit based on scale mode
    let extraClasses = '';
    if (node.scaleMode === 'FILL') {
      extraClasses = ' object-cover';
    } else if (node.scaleMode === 'FIT') {
      extraClasses = ' object-contain';
    }

    // Generate accessibility attributes from semantic metadata
    const accessibility = this.generateAccessibilityAttrs(node);

    if (this.options.styling === 'tailwind' && extraClasses) {
      // Append to className
      const classMatch = styling.match(/className="([^"]*)"/);
      if (classMatch) {
        const newStyling = styling.replace(
          `className="${classMatch[1]}"`,
          `className="${classMatch[1]}${extraClasses}"`
        );
        return `${indent}<img src=${src} alt=${alt}${newStyling}${accessibility} />`;
      }
    }

    return `${indent}<img src=${src} alt=${alt}${styling}${accessibility} />`;
  }

  /**
   * Convert shape node to JSX
   */
  private shapeToJSX(node: SceneNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);
    const styling = this.generateStyling(node);
    const accessibility = this.generateAccessibilityAttrs(node as NodeData);
    return `${indent}<div${styling}${accessibility} />`;
  }

  /**
   * Generate styling attribute based on options
   */
  private generateStyling(node: NodeData | SceneNodeData): string {
    switch (this.options.styling) {
      case 'tailwind':
        return this.generateTailwindStyling(node);
      case 'inline':
        return this.generateInlineStyling(node);
      case 'css-modules':
        return this.generateCSSModuleStyling(node);
      case 'styled-components':
        return this.generateTailwindStyling(node); // Fallback for now
      default:
        return this.generateTailwindStyling(node);
    }
  }

  /**
   * Generate Tailwind className
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

    return ` className="${classes.join(' ')}"`;
  }

  /**
   * Generate inline style object
   */
  private generateInlineStyling(node: NodeData | SceneNodeData): string {
    const styles: string[] = [];
    const sceneNode = node as SceneNodeData;

    // Dimensions
    if ('width' in sceneNode && sceneNode.width !== undefined) {
      styles.push(`width: ${formatNum(sceneNode.width)}`);
    }
    if ('height' in sceneNode && sceneNode.height !== undefined) {
      styles.push(`height: ${formatNum(sceneNode.height)}`);
    }

    // Background
    if ('fills' in sceneNode && sceneNode.fills?.length > 0) {
      const fill = sceneNode.fills.find(f => f.visible !== false);
      if (fill?.type === 'SOLID') {
        const { r, g, b } = fill.color;
        const a = fill.opacity ?? fill.color.a;
        if (a < 1) {
          styles.push(`backgroundColor: 'rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})'`);
        } else {
          styles.push(`backgroundColor: 'rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})'`);
        }
      }
    }

    // Border radius
    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      if (frameNode.cornerRadius && frameNode.cornerRadius > 0) {
        styles.push(`borderRadius: ${frameNode.cornerRadius}`);
      }
    }

    // Flexbox for auto layout
    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      if (frameNode.autoLayout?.mode && frameNode.autoLayout.mode !== 'NONE') {
        styles.push(`display: 'flex'`);
        styles.push(`flexDirection: '${frameNode.autoLayout.mode === 'HORIZONTAL' ? 'row' : 'column'}'`);
        if (frameNode.autoLayout.itemSpacing > 0) {
          styles.push(`gap: ${frameNode.autoLayout.itemSpacing}`);
        }
      }
    }

    if (styles.length === 0) {
      return '';
    }

    return ` style={{ ${styles.join(', ')} }}`;
  }

  /**
   * Generate CSS module className
   */
  private generateCSSModuleStyling(node: NodeData | SceneNodeData): string {
    // Generate a class name from node name
    const className = this.generateClassName(node.name || 'element');

    // Store CSS for this class
    const css = this.generateCSSForNode(node);
    if (css) {
      this.cssClasses.set(className, css);
    }

    return ` className={styles.${className}}`;
  }

  /**
   * Generate a valid CSS class name
   */
  private generateClassName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .replace(/^(\d)/, '_$1') // Prefix if starts with number
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
  private inferPropType(propName: string, defaultValue?: string): DetectedProp['type'] {
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

    // ReactNode patterns
    if (lowerName === 'children' || lowerName.includes('icon') || lowerName.includes('content') ||
        lowerName.includes('element')) {
      return 'ReactNode';
    }

    // Array patterns
    if (lowerName.endsWith('s') && (lowerName.includes('item') || lowerName.includes('option') ||
        lowerName.includes('tag') || lowerName.includes('label'))) {
      return 'string[]';
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
   * Collect used variables from a node's state bindings
   */
  private collectUsedVariables(nodeId: NodeId): void {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return;

    // Get semantic metadata with state bindings
    const pluginData = (node as { pluginData?: Record<string, unknown> }).pluginData;
    const semantic = getSemanticMetadata(pluginData);

    if (semantic?.stateBindings) {
      for (const binding of semantic.stateBindings) {
        if (this.variableMap.has(binding.variableId)) {
          this.usedVariableIds.add(binding.variableId);
        }
      }
    }

    // Recursively process children
    const childIds = this.sceneGraph.getChildIds(nodeId);
    for (const childId of childIds) {
      this.collectUsedVariables(childId);
    }
  }

  /**
   * Generate useState hook declarations for state variables
   */
  private generateStateHooks(indent: string): string[] {
    const lines: string[] = [];

    for (const variableId of this.usedVariableIds) {
      const variable = this.variableMap.get(variableId);
      if (!variable || variable.kind !== 'state') continue;

      const safeName = this.sanitizeVariableName(variable.name);
      const setterName = `set${safeName.charAt(0).toUpperCase()}${safeName.slice(1)}`;
      const tsType = this.options.typescript ? `<${this.variableTypeToTS(variable.type)}>` : '';
      const defaultValue = this.formatStateDefaultValue(variable.defaultValue, variable.type);

      lines.push(`${indent}const [${safeName}, ${setterName}] = useState${tsType}(${defaultValue});`);
    }

    return lines;
  }

  /**
   * Convert VariableType to TypeScript type
   */
  private variableTypeToTS(type: VariableType): string {
    switch (type) {
      case 'boolean':
        return 'boolean';
      case 'number':
        return 'number';
      case 'string':
        return 'string';
      case 'color':
        return 'string';
      default:
        return 'unknown';
    }
  }

  /**
   * Format default value for useState hook
   */
  private formatStateDefaultValue(value: boolean | number | string, type: VariableType): string {
    switch (type) {
      case 'boolean':
        return String(value);
      case 'number':
        return String(value);
      case 'string':
      case 'color':
        return `'${this.escapeJSString(String(value))}'`;
      default:
        return 'undefined';
    }
  }

  /**
   * Escape JavaScript string
   */
  private escapeJSString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  /**
   * Sanitize variable name for valid JavaScript identifier
   */
  private sanitizeVariableName(name: string): string {
    // Remove invalid characters and ensure starts with letter
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
    if (/^[0-9]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }
    // Convert to camelCase
    return sanitized.charAt(0).toLowerCase() + sanitized.slice(1);
  }

  /**
   * Generate the full component code
   */
  private generateComponentCode(jsxContent: string): string {
    const { componentName, typescript, includeProps, defaultExport, forwardRef, memo, indent } = this.options;
    const lines: string[] = [];

    // Check if we have state variables
    const hasStateVariables = this.usedVariableIds.size > 0;

    // Imports
    const reactImports: string[] = [];
    if (hasStateVariables) reactImports.push('useState');
    if (forwardRef) reactImports.push('forwardRef');
    if (memo) reactImports.push('memo');

    if (reactImports.length > 0) {
      lines.push(`import { ${reactImports.join(', ')} } from 'react';`);
    }

    if (this.options.styling === 'css-modules') {
      lines.push(`import styles from './${componentName}.module.css';`);
    }

    lines.push('');

    // Props interface
    const props = Array.from(this.detectedProps.values());
    if (typescript && includeProps && props.length > 0) {
      lines.push(`export interface ${componentName}Props {`);
      for (const prop of props) {
        const optional = !prop.required ? '?' : '';
        const tsType = this.getTSType(prop.type);
        lines.push(`${indent}${prop.name}${optional}: ${tsType};`);
      }
      lines.push('}');
      lines.push('');
    }

    // Component definition
    const propsType = typescript && includeProps && props.length > 0 ? `${componentName}Props` : '';
    const propsParam = props.length > 0 ? this.generatePropsDestructure(props) : '{}';

    if (forwardRef) {
      const refType = typescript ? '<HTMLDivElement, ' + (propsType || 'object') + '>' : '';
      lines.push(`const ${componentName} = forwardRef${refType}((${propsParam}, ref) => {`);
    } else if (memo) {
      const fnType = typescript && propsType ? `: React.FC<${propsType}>` : '';
      lines.push(`const ${componentName}${fnType} = memo((${propsParam}) => {`);
    } else {
      const fnType = typescript && propsType ? `: React.FC<${propsType}>` : '';
      lines.push(`const ${componentName}${fnType} = (${propsParam}) => {`);
    }

    // Add state hooks if we have state variables
    const stateHooks = this.generateStateHooks(indent);
    if (stateHooks.length > 0) {
      lines.push(...stateHooks);
      lines.push('');
    }

    lines.push(`${indent}return (`);
    lines.push(jsxContent || `${indent.repeat(2)}<div>TODO: Add content</div>`);
    lines.push(`${indent});`);

    if (forwardRef || memo) {
      lines.push('});');
    } else {
      lines.push('};');
    }

    lines.push('');

    // Display name for debugging
    if (forwardRef || memo) {
      lines.push(`${componentName}.displayName = '${componentName}';`);
      lines.push('');
    }

    // Export
    if (defaultExport) {
      lines.push(`export default ${componentName};`);
    } else {
      lines.push(`export { ${componentName} };`);
    }

    return lines.join('\n');
  }

  /**
   * Generate props destructuring
   */
  private generatePropsDestructure(props: DetectedProp[]): string {
    const parts: string[] = [];

    for (const prop of props) {
      if (prop.defaultValue !== undefined) {
        parts.push(`${prop.name} = ${this.formatDefaultValue(prop)}`);
      } else {
        parts.push(prop.name);
      }
    }

    return `{ ${parts.join(', ')} }`;
  }

  /**
   * Format default value for destructuring
   */
  private formatDefaultValue(prop: DetectedProp): string {
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
      case 'ReactNode':
        return 'null';
      default:
        return `'${prop.defaultValue}'`;
    }
  }

  /**
   * Get TypeScript type for prop type
   */
  private getTSType(type: DetectedProp['type']): string {
    switch (type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'ReactNode':
        return 'React.ReactNode';
      case 'string[]':
        return 'string[]';
      default:
        return 'unknown';
    }
  }

  /**
   * Generate CSS module content
   */
  private generateCSSModule(): string {
    const lines: string[] = [];

    for (const [className, css] of this.cssClasses) {
      lines.push(`.${className} {`);
      lines.push(css);
      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate Storybook story
   */
  private generateStory(): string {
    const { componentName } = this.options;
    const props = Array.from(this.detectedProps.values());

    const lines: string[] = [];

    lines.push(`import type { Meta, StoryObj } from '@storybook/react';`);
    lines.push(`import ${componentName} from './${componentName}';`);
    lines.push('');
    lines.push(`const meta: Meta<typeof ${componentName}> = {`);
    lines.push(`  title: 'Components/${componentName}',`);
    lines.push(`  component: ${componentName},`);
    lines.push(`  tags: ['autodocs'],`);

    if (props.length > 0) {
      lines.push(`  argTypes: {`);
      for (const prop of props) {
        lines.push(`    ${prop.name}: {`);
        lines.push(`      control: '${this.getStorybookControl(prop.type)}',`);
        if (prop.defaultValue !== undefined) {
          lines.push(`      defaultValue: ${this.formatDefaultValue(prop)},`);
        }
        lines.push(`    },`);
      }
      lines.push(`  },`);
    }

    lines.push(`};`);
    lines.push('');
    lines.push(`export default meta;`);
    lines.push(`type Story = StoryObj<typeof ${componentName}>;`);
    lines.push('');
    lines.push(`export const Default: Story = {`);
    if (props.length > 0) {
      lines.push(`  args: {`);
      for (const prop of props) {
        if (prop.defaultValue !== undefined || !prop.required) {
          continue;
        }
        lines.push(`    ${prop.name}: ${this.getDefaultStoryValue(prop)},`);
      }
      lines.push(`  },`);
    }
    lines.push(`};`);

    return lines.join('\n');
  }

  /**
   * Get Storybook control type
   */
  private getStorybookControl(type: DetectedProp['type']): string {
    switch (type) {
      case 'boolean':
        return 'boolean';
      case 'number':
        return 'number';
      case 'string[]':
        return 'object';
      default:
        return 'text';
    }
  }

  /**
   * Get default story value
   */
  private getDefaultStoryValue(prop: DetectedProp): string {
    switch (prop.type) {
      case 'boolean':
        return 'false';
      case 'number':
        return '0';
      case 'string[]':
        return '[]';
      case 'ReactNode':
        return 'null';
      default:
        return `'Example ${prop.name}'`;
    }
  }

  /**
   * Escape JSX special characters
   */
  private escapeJSX(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate accessibility attributes from semantic metadata
   */
  private generateAccessibilityAttrs(node: NodeData): string {
    // Get semantic metadata from pluginData
    const pluginData = (node as { pluginData?: Record<string, unknown> }).pluginData;
    const semantic = getSemanticMetadata(pluginData);

    if (!semantic) {
      return '';
    }

    const a11y = semantic.accessibility;
    const attrs: string[] = [];

    // aria-label for screen readers
    if (a11y.label) {
      attrs.push(`aria-label="${this.escapeJSX(a11y.label)}"`);
    }

    // aria-describedby or aria-description
    if (a11y.description) {
      attrs.push(`aria-description="${this.escapeJSX(a11y.description)}"`);
    }

    // role from semantic type or explicit role
    const role = a11y.role || this.getAriaRole(semantic);
    if (role) {
      attrs.push(`role="${role}"`);
    }

    // aria-hidden if hidden from accessibility tree
    if (a11y.hidden) {
      attrs.push('aria-hidden="true"');
    }

    // aria-disabled for disabled elements
    if (a11y.disabled) {
      attrs.push('aria-disabled="true"');
    }

    // tabIndex for focusable elements
    if (a11y.focusable) {
      attrs.push('tabIndex={0}');
    }

    // aria-level for headings
    if (a11y.headingLevel) {
      attrs.push(`aria-level={${a11y.headingLevel}}`);
    }

    // aria-live for live regions
    if (a11y.liveRegion && a11y.liveRegion !== 'off') {
      attrs.push(`aria-live="${a11y.liveRegion}"`);
    }

    if (attrs.length === 0) {
      return '';
    }

    return ' ' + attrs.join(' ');
  }

  /**
   * Get ARIA role based on semantic type
   */
  private getAriaRole(semantic: SemanticMetadata): string | null {
    switch (semantic.semanticType) {
      case 'Button':
      case 'IconButton':
        return 'button';
      case 'Link':
        return 'link';
      case 'Heading':
        return 'heading';
      case 'Image':
      case 'Icon':
      case 'Avatar':
        return 'img';
      case 'List':
        return 'list';
      case 'ListItem':
        return 'listitem';
      case 'NavigationBar':
        return 'navigation';
      case 'TabBar':
        return 'tablist';
      case 'TabItem':
        return 'tab';
      case 'Modal':
      case 'Sheet':
        return 'dialog';
      case 'Alert':
        return 'alertdialog';
      case 'ProgressBar':
        return 'progressbar';
      case 'Slider':
        return 'slider';
      case 'Checkbox':
        return 'checkbox';
      case 'Toggle':
        return 'switch';
      case 'RadioButton':
        return 'radio';
      case 'TextField':
      case 'TextArea':
        return 'textbox';
      case 'Divider':
        return 'separator';
      case 'Grid':
        return 'grid';
      case 'Toolbar':
        return 'toolbar';
      default:
        return null;
    }
  }
}

/**
 * Factory function
 */
export function createReactComponentGenerator(
  sceneGraph: SceneGraph,
  options?: Partial<ReactExportOptions>
): ReactComponentGenerator {
  return new ReactComponentGenerator(sceneGraph, options);
}

/**
 * Quick export function
 */
export function exportToReact(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options?: Partial<ReactExportOptions>
): ReactExportResult {
  const generator = createReactComponentGenerator(sceneGraph, options);
  return generator.generate(nodeIds);
}
