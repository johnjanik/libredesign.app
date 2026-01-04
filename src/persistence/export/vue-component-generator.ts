/**
 * Vue Component Generator
 *
 * Exports DesignLibre designs as Vue 3 components with TypeScript support.
 * Supports both Composition API and Options API.
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
export interface VueDetectedProp {
  name: string;
  type: 'String' | 'Number' | 'Boolean' | 'Array' | 'Object';
  tsType: 'string' | 'number' | 'boolean' | 'string[]' | 'object';
  defaultValue: string | undefined;
  required: boolean;
  source: 'name' | 'text' | 'component';
}

/**
 * Vue component export options
 */
export interface VueExportOptions {
  /** Component name (PascalCase) */
  componentName: string;
  /** Use TypeScript */
  typescript: boolean;
  /** API style */
  apiStyle: 'composition' | 'options';
  /** Use <script setup> syntax (Composition API only) */
  scriptSetup: boolean;
  /** Styling approach */
  styling: 'tailwind' | 'scoped' | 'module' | 'inline';
  /** Include emits */
  includeEmits: boolean;
  /** Indentation */
  indent: string;
}

const DEFAULT_OPTIONS: VueExportOptions = {
  componentName: 'Component',
  typescript: true,
  apiStyle: 'composition',
  scriptSetup: true,
  styling: 'tailwind',
  includeEmits: true,
  indent: '  ',
};

/**
 * Vue component export result
 */
export interface VueExportResult {
  /** Single File Component content */
  component: string;
  /** Component file name */
  fileName: string;
  /** Detected props */
  props: VueDetectedProp[];
  /** Any warnings during generation */
  warnings: string[];
}

/**
 * Prop pattern regex - matches {propName} or {propName:defaultValue}
 */
const PROP_PATTERN = /\{(\w+)(?::([^}]*))?\}/g;

/**
 * Vue Component Generator class
 */
export class VueComponentGenerator {
  private sceneGraph: SceneGraph;
  private options: VueExportOptions;
  private detectedProps: Map<string, VueDetectedProp> = new Map();
  private detectedEmits: Set<string> = new Set();
  private warnings: string[] = [];
  private scopedStyles: string[] = [];

  constructor(sceneGraph: SceneGraph, options: Partial<VueExportOptions> = {}) {
    this.sceneGraph = sceneGraph;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate Vue component from nodes
   */
  generate(nodeIds: NodeId[]): VueExportResult {
    this.detectedProps.clear();
    this.detectedEmits.clear();
    this.warnings = [];
    this.scopedStyles = [];

    // Generate template for all nodes
    const templateParts: string[] = [];
    for (const nodeId of nodeIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node) {
        const template = this.nodeToTemplate(node, 2);
        if (template) {
          templateParts.push(template);
        }
      }
    }

    // Wrap in root element if multiple nodes
    let templateContent = templateParts.join('\n');
    if (templateParts.length > 1) {
      templateContent = `${this.options.indent.repeat(2)}<div>\n${templateContent}\n${this.options.indent.repeat(2)}</div>`;
    } else if (templateParts.length === 0) {
      templateContent = `${this.options.indent.repeat(2)}<div>TODO: Add content</div>`;
    }

    // Generate SFC
    const component = this.generateSFC(templateContent);

    const fileName = `${this.options.componentName}.vue`;

    return {
      component,
      fileName,
      props: Array.from(this.detectedProps.values()),
      warnings: this.warnings,
    };
  }

  /**
   * Convert a node to Vue template
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
   * Convert container to Vue template
   */
  private containerToTemplate(node: FrameNodeData | ComponentNodeData | InstanceNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);

    // Detect props from node name
    this.detectPropsFromName(node.name);

    // Determine element tag
    let tag = 'div';
    const name = node.name?.toLowerCase() ?? '';
    if (name.includes('button') || name.includes('btn')) {
      tag = 'button';
      this.detectedEmits.add('click');
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
      this.detectedEmits.add('submit');
    } else if (name.includes('input')) {
      tag = 'input';
      this.detectedEmits.add('input');
      this.detectedEmits.add('change');
    } else if (name.includes('list') || name.includes('menu')) {
      tag = 'ul';
    } else if (name.includes('item')) {
      tag = 'li';
    }

    // Generate attributes
    const attrs = this.generateAttributes(node);

    // Add event handlers for interactive elements
    let eventAttrs = '';
    if (tag === 'button') {
      eventAttrs = ' @click="$emit(\'click\', $event)"';
    } else if (tag === 'form') {
      eventAttrs = ' @submit.prevent="$emit(\'submit\', $event)"';
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
   * Convert text node to Vue template
   */
  private textToTemplate(node: TextNodeData, depth: number): string {
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
   * Convert image node to Vue template
   */
  private imageToTemplate(node: ImageNodeData, depth: number): string {
    const indent = this.options.indent.repeat(depth);

    // Detect props from name
    this.detectPropsFromName(node.name);

    // Check if image src should be a prop
    const srcProp = this.checkForProp(node.name, 'src') || this.checkForProp(node.name, 'image');
    const altProp = this.checkForProp(node.name, 'alt');

    const src = srcProp ? `:src="${srcProp}"` : `src="${node.imageRef || '/placeholder.svg'}"`;
    const alt = altProp ? `:alt="${altProp}"` : `alt="${this.escapeHTML(node.name || 'Image')}"`;

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
   * Convert shape node to Vue template
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
    const styling = this.generateStyling(node);
    return styling;
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
      case 'module':
        return this.generateModuleStyling(node);
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
   * Generate CSS module class binding
   */
  private generateModuleStyling(node: NodeData | SceneNodeData): string {
    const className = this.generateClassName(node.name || 'element');
    const css = this.generateCSSForNode(node);

    if (css) {
      this.scopedStyles.push(`.${className} {\n${css}\n}`);
    }

    return ` :class="$style.${className}"`;
  }

  /**
   * Generate inline :style binding
   */
  private generateInlineStyling(node: NodeData | SceneNodeData): string {
    const styles: string[] = [];
    const sceneNode = node as SceneNodeData;

    if ('width' in sceneNode && sceneNode.width !== undefined) {
      styles.push(`width: '${formatNum(sceneNode.width)}px'`);
    }
    if ('height' in sceneNode && sceneNode.height !== undefined) {
      styles.push(`height: '${formatNum(sceneNode.height)}px'`);
    }

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

    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      if (frameNode.cornerRadius && frameNode.cornerRadius > 0) {
        styles.push(`borderRadius: '${frameNode.cornerRadius}px'`);
      }
      if (frameNode.autoLayout?.mode && frameNode.autoLayout.mode !== 'NONE') {
        styles.push(`display: 'flex'`);
        styles.push(`flexDirection: '${frameNode.autoLayout.mode === 'HORIZONTAL' ? 'row' : 'column'}'`);
        if (frameNode.autoLayout.itemSpacing > 0) {
          styles.push(`gap: '${frameNode.autoLayout.itemSpacing}px'`);
        }
      }
    }

    if (styles.length === 0) {
      return '';
    }

    return ` :style="{ ${styles.join(', ')} }"`;
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
        const types = this.inferPropType(propName, defaultValue);
        this.detectedProps.set(propName, {
          name: propName,
          type: types.vueType,
          tsType: types.tsType,
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
          type: 'String',
          tsType: 'string',
          defaultValue,
          required: defaultValue === undefined,
          source: 'text',
        });
      }
      return `{{ ${propName} }}`;
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
          type: 'String',
          tsType: 'string',
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
  private inferPropType(propName: string, defaultValue?: string): { vueType: VueDetectedProp['type']; tsType: VueDetectedProp['tsType'] } {
    const lowerName = propName.toLowerCase();

    // Boolean patterns
    if (lowerName.startsWith('is') || lowerName.startsWith('has') || lowerName.startsWith('show') ||
        lowerName.startsWith('enable') || lowerName.startsWith('disable') || lowerName === 'active' ||
        lowerName === 'disabled' || lowerName === 'loading' || lowerName === 'checked') {
      return { vueType: 'Boolean', tsType: 'boolean' };
    }

    // Number patterns
    if (lowerName.includes('count') || lowerName.includes('index') || lowerName.includes('size') ||
        lowerName.includes('width') || lowerName.includes('height') || lowerName.includes('amount') ||
        lowerName.includes('price') || lowerName.includes('quantity')) {
      return { vueType: 'Number', tsType: 'number' };
    }

    // Array patterns
    if (lowerName.endsWith('s') && (lowerName.includes('item') || lowerName.includes('option') ||
        lowerName.includes('tag') || lowerName.includes('label'))) {
      return { vueType: 'Array', tsType: 'string[]' };
    }

    // Object patterns
    if (lowerName === 'data' || lowerName === 'config' || lowerName === 'options' || lowerName === 'settings') {
      return { vueType: 'Object', tsType: 'object' };
    }

    // Check default value
    if (defaultValue) {
      if (defaultValue === 'true' || defaultValue === 'false') {
        return { vueType: 'Boolean', tsType: 'boolean' };
      }
      if (!isNaN(Number(defaultValue))) {
        return { vueType: 'Number', tsType: 'number' };
      }
    }

    return { vueType: 'String', tsType: 'string' };
  }

  /**
   * Generate the Single File Component
   */
  private generateSFC(templateContent: string): string {
    const { apiStyle } = this.options;
    const lines: string[] = [];

    // Template section
    lines.push('<template>');
    lines.push(templateContent);
    lines.push('</template>');
    lines.push('');

    // Script section
    if (apiStyle === 'composition') {
      lines.push(...this.generateCompositionScript());
    } else {
      lines.push(...this.generateOptionsScript());
    }

    // Style section
    if (this.scopedStyles.length > 0 || this.options.styling === 'scoped' || this.options.styling === 'module') {
      lines.push('');
      lines.push(...this.generateStyleSection());
    }

    return lines.join('\n');
  }

  /**
   * Generate Composition API script
   */
  private generateCompositionScript(): string[] {
    const { componentName, typescript, scriptSetup, indent } = this.options;
    const props = Array.from(this.detectedProps.values());
    const emits = Array.from(this.detectedEmits);
    const lines: string[] = [];

    const lang = typescript ? ' lang="ts"' : '';

    if (scriptSetup) {
      // <script setup> syntax
      lines.push(`<script setup${lang}>`);

      // Props
      if (props.length > 0) {
        if (typescript) {
          lines.push(`interface Props {`);
          for (const prop of props) {
            const optional = !prop.required ? '?' : '';
            lines.push(`${indent}${prop.name}${optional}: ${prop.tsType};`);
          }
          lines.push(`}`);
          lines.push('');

          const defaults = props.filter(p => p.defaultValue !== undefined);
          if (defaults.length > 0) {
            lines.push(`const props = withDefaults(defineProps<Props>(), {`);
            for (const prop of defaults) {
              lines.push(`${indent}${prop.name}: ${this.formatDefaultValue(prop)},`);
            }
            lines.push(`});`);
          } else {
            lines.push(`const props = defineProps<Props>();`);
          }
        } else {
          lines.push(`const props = defineProps({`);
          for (const prop of props) {
            lines.push(`${indent}${prop.name}: {`);
            lines.push(`${indent}${indent}type: ${prop.type},`);
            lines.push(`${indent}${indent}required: ${prop.required},`);
            if (prop.defaultValue !== undefined) {
              lines.push(`${indent}${indent}default: ${this.formatDefaultValue(prop)},`);
            }
            lines.push(`${indent}},`);
          }
          lines.push(`});`);
        }
        lines.push('');
      }

      // Emits
      if (emits.length > 0 && this.options.includeEmits) {
        if (typescript) {
          lines.push(`const emit = defineEmits<{`);
          for (const event of emits) {
            lines.push(`${indent}${event}: [event: Event];`);
          }
          lines.push(`}>();`);
        } else {
          lines.push(`const emit = defineEmits([${emits.map(e => `'${e}'`).join(', ')}]);`);
        }
        lines.push('');
      }

      lines.push('</script>');
    } else {
      // Standard <script> with setup()
      lines.push(`<script${lang}>`);
      lines.push(`import { defineComponent } from 'vue';`);
      lines.push('');
      lines.push(`export default defineComponent({`);
      lines.push(`${indent}name: '${componentName}',`);

      // Props
      if (props.length > 0) {
        lines.push(`${indent}props: {`);
        for (const prop of props) {
          lines.push(`${indent}${indent}${prop.name}: {`);
          lines.push(`${indent}${indent}${indent}type: ${prop.type},`);
          lines.push(`${indent}${indent}${indent}required: ${prop.required},`);
          if (prop.defaultValue !== undefined) {
            lines.push(`${indent}${indent}${indent}default: ${this.formatDefaultValue(prop)},`);
          }
          lines.push(`${indent}${indent}},`);
        }
        lines.push(`${indent}},`);
      }

      // Emits
      if (emits.length > 0 && this.options.includeEmits) {
        lines.push(`${indent}emits: [${emits.map(e => `'${e}'`).join(', ')}],`);
      }

      lines.push(`${indent}setup(props, { emit }) {`);
      lines.push(`${indent}${indent}return {};`);
      lines.push(`${indent}},`);
      lines.push(`});`);
      lines.push('</script>');
    }

    return lines;
  }

  /**
   * Generate Options API script
   */
  private generateOptionsScript(): string[] {
    const { componentName, typescript, indent } = this.options;
    const props = Array.from(this.detectedProps.values());
    const emits = Array.from(this.detectedEmits);
    const lines: string[] = [];

    const lang = typescript ? ' lang="ts"' : '';

    lines.push(`<script${lang}>`);

    if (typescript) {
      lines.push(`import { defineComponent } from 'vue';`);

      if (props.length > 0) {
        lines.push(`import type { PropType } from 'vue';`);
      }

      lines.push('');
      lines.push(`export default defineComponent({`);
    } else {
      lines.push(`export default {`);
    }

    lines.push(`${indent}name: '${componentName}',`);

    // Props
    if (props.length > 0) {
      lines.push(`${indent}props: {`);
      for (const prop of props) {
        if (typescript && (prop.type === 'Array' || prop.type === 'Object')) {
          lines.push(`${indent}${indent}${prop.name}: {`);
          lines.push(`${indent}${indent}${indent}type: ${prop.type} as PropType<${prop.tsType}>,`);
          lines.push(`${indent}${indent}${indent}required: ${prop.required},`);
          if (prop.defaultValue !== undefined) {
            lines.push(`${indent}${indent}${indent}default: () => ${this.formatDefaultValue(prop)},`);
          }
          lines.push(`${indent}${indent}},`);
        } else {
          lines.push(`${indent}${indent}${prop.name}: {`);
          lines.push(`${indent}${indent}${indent}type: ${prop.type},`);
          lines.push(`${indent}${indent}${indent}required: ${prop.required},`);
          if (prop.defaultValue !== undefined) {
            lines.push(`${indent}${indent}${indent}default: ${this.formatDefaultValue(prop)},`);
          }
          lines.push(`${indent}${indent}},`);
        }
      }
      lines.push(`${indent}},`);
    }

    // Emits
    if (emits.length > 0 && this.options.includeEmits) {
      lines.push(`${indent}emits: [${emits.map(e => `'${e}'`).join(', ')}],`);
    }

    // Data
    lines.push(`${indent}data() {`);
    lines.push(`${indent}${indent}return {};`);
    lines.push(`${indent}},`);

    // Methods
    lines.push(`${indent}methods: {},`);

    if (typescript) {
      lines.push(`});`);
    } else {
      lines.push(`};`);
    }

    lines.push('</script>');

    return lines;
  }

  /**
   * Generate style section
   */
  private generateStyleSection(): string[] {
    const lines: string[] = [];
    const styleAttr = this.options.styling === 'module' ? ' module' : ' scoped';

    lines.push(`<style${styleAttr}>`);
    if (this.scopedStyles.length > 0) {
      lines.push(this.scopedStyles.join('\n\n'));
    }
    lines.push('</style>');

    return lines;
  }

  /**
   * Format default value for Vue props
   */
  private formatDefaultValue(prop: VueDetectedProp): string {
    if (prop.defaultValue === undefined) return 'undefined';

    switch (prop.type) {
      case 'Boolean':
        return prop.defaultValue === 'true' ? 'true' : 'false';
      case 'Number':
        return prop.defaultValue;
      case 'String':
        return `'${prop.defaultValue}'`;
      case 'Array':
        return '[]';
      case 'Object':
        return '{}';
      default:
        return `'${prop.defaultValue}'`;
    }
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
export function createVueComponentGenerator(
  sceneGraph: SceneGraph,
  options?: Partial<VueExportOptions>
): VueComponentGenerator {
  return new VueComponentGenerator(sceneGraph, options);
}

/**
 * Quick export function
 */
export function exportToVue(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options?: Partial<VueExportOptions>
): VueExportResult {
  const generator = createVueComponentGenerator(sceneGraph, options);
  return generator.generate(nodeIds);
}
