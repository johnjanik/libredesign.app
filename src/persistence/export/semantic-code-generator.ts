/**
 * Semantic Code Generator
 *
 * Enhanced code generator that produces production-ready code with:
 * - Multi-file project structure
 * - LLM context as code comments
 * - TODO placeholders with context
 * - Test IDs for automation
 * - Accessibility attributes
 * - State management integration
 * - Data binding placeholders
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData, FrameNodeData, TextNodeData } from '@scene/nodes/base-node';
import {
  getSemanticMetadata,
  type SemanticMetadata,
  type LLMContextHints,
  SEMANTIC_TYPE_DEFAULTS,
} from '@core/types/semantic-schema';
import type { VariableDefinition } from '@prototype/variable-manager';

// =============================================================================
// Types
// =============================================================================

/**
 * Target platform for code generation
 */
export type ExportPlatform = 'react' | 'swiftui' | 'compose' | 'html';

/**
 * Output file from code generation
 */
export interface OutputFile {
  /** File path relative to project root */
  path: string;
  /** File content */
  content: string;
  /** File type for syntax highlighting */
  type: 'tsx' | 'ts' | 'swift' | 'kt' | 'html' | 'css' | 'json';
}

/**
 * Semantic code generator options
 */
export interface SemanticCodeGeneratorOptions {
  /** Target platform */
  platform: ExportPlatform;
  /** Component name */
  componentName: string;
  /** Include LLM context as comments */
  includeLLMContext?: boolean;
  /** Include TODO placeholders */
  includeTodos?: boolean;
  /** Include test IDs */
  includeTestIds?: boolean;
  /** Include accessibility attributes */
  includeAccessibility?: boolean;
  /** Variable definitions for state */
  variables?: VariableDefinition[];
  /** Export as multi-file project */
  multiFile?: boolean;
  /** Indentation */
  indent?: string;
}

const DEFAULT_OPTIONS: Required<Omit<SemanticCodeGeneratorOptions, 'platform' | 'componentName' | 'variables'>> = {
  includeLLMContext: true,
  includeTodos: true,
  includeTestIds: true,
  includeAccessibility: true,
  multiFile: false,
  indent: '  ',
};

/**
 * Code generation result
 */
export interface SemanticCodeResult {
  /** Primary output file */
  mainFile: OutputFile;
  /** Additional files (styles, types, tests, etc.) */
  additionalFiles: OutputFile[];
  /** Warnings during generation */
  warnings: string[];
  /** Stats about the generation */
  stats: {
    nodeCount: number;
    componentCount: number;
    stateBindingCount: number;
    dataBindingCount: number;
    todoCount: number;
  };
}

// =============================================================================
// Semantic Code Generator
// =============================================================================

/**
 * Semantic Code Generator class
 */
export class SemanticCodeGenerator {
  private sceneGraph: SceneGraph;
  private options: Required<Omit<SemanticCodeGeneratorOptions, 'variables'>> & { variables?: VariableDefinition[] };
  private warnings: string[] = [];
  private todoCount = 0;
  private stateBindingCount = 0;
  private dataBindingCount = 0;
  private processedNodes = 0;
  private componentCount = 0;

  constructor(
    sceneGraph: SceneGraph,
    options: SemanticCodeGeneratorOptions
  ) {
    this.sceneGraph = sceneGraph;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  /**
   * Generate code from nodes
   */
  generate(nodeIds: NodeId[]): SemanticCodeResult {
    this.warnings = [];
    this.todoCount = 0;
    this.stateBindingCount = 0;
    this.dataBindingCount = 0;
    this.processedNodes = 0;
    this.componentCount = 0;

    const { platform } = this.options;

    let mainFile: OutputFile;
    const additionalFiles: OutputFile[] = [];

    switch (platform) {
      case 'react':
        mainFile = this.generateReact(nodeIds);
        if (this.options.multiFile) {
          additionalFiles.push(this.generateReactTypes());
          additionalFiles.push(this.generateReactStyles());
        }
        break;

      case 'swiftui':
        mainFile = this.generateSwiftUI(nodeIds);
        if (this.options.multiFile) {
          additionalFiles.push(this.generateSwiftUIPreview());
        }
        break;

      case 'compose':
        mainFile = this.generateCompose(nodeIds);
        if (this.options.multiFile) {
          additionalFiles.push(this.generateComposePreview());
        }
        break;

      case 'html':
        mainFile = this.generateHTML(nodeIds);
        if (this.options.multiFile) {
          additionalFiles.push(this.generateHTMLStyles());
        }
        break;

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    return {
      mainFile,
      additionalFiles,
      warnings: this.warnings,
      stats: {
        nodeCount: this.processedNodes,
        componentCount: this.componentCount,
        stateBindingCount: this.stateBindingCount,
        dataBindingCount: this.dataBindingCount,
        todoCount: this.todoCount,
      },
    };
  }

  // ===========================================================================
  // React Generation
  // ===========================================================================

  private generateReact(nodeIds: NodeId[]): OutputFile {
    const { componentName, indent } = this.options;
    const lines: string[] = [];

    // File header with LLM context
    lines.push('/**');
    lines.push(` * ${componentName}`);
    lines.push(' * ');
    lines.push(' * Generated by DesignLibre Semantic Code Generator');
    lines.push(' */');
    lines.push('');

    // Imports
    const hasState = this.options.variables && this.options.variables.length > 0;
    if (hasState) {
      lines.push("import { useState } from 'react';");
    }
    lines.push('');

    // Component
    lines.push(`export function ${componentName}() {`);

    // State hooks
    if (hasState && this.options.variables) {
      for (const variable of this.options.variables) {
        if (variable.kind === 'state') {
          const tsType = this.variableTypeToTS(variable.type);
          const defaultVal = this.formatTSValue(variable.defaultValue, variable.type);
          lines.push(`${indent}const [${this.sanitizeName(variable.name)}, set${this.capitalize(this.sanitizeName(variable.name))}] = useState<${tsType}>(${defaultVal});`);
        }
      }
      lines.push('');
    }

    lines.push(`${indent}return (`);

    // Generate JSX for each node
    for (const nodeId of nodeIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node) {
        const jsx = this.nodeToReactJSX(node, 2);
        lines.push(jsx);
      }
    }

    lines.push(`${indent});`);
    lines.push('}');
    lines.push('');

    // Export
    lines.push(`export default ${componentName};`);
    lines.push('');

    return {
      path: `${componentName}.tsx`,
      content: lines.join('\n'),
      type: 'tsx',
    };
  }

  private nodeToReactJSX(node: NodeData, depth: number): string {
    this.processedNodes++;
    const indent = this.options.indent.repeat(depth);
    const semantic = this.getNodeSemanticMetadata(node);

    // Determine tag and attributes
    const { tag, attrs } = this.getReactTagAndAttrs(node, semantic);

    // Build attribute string
    const attrParts: string[] = [];

    // Test ID
    if (this.options.includeTestIds) {
      const testId = this.generateTestId(node);
      attrParts.push(`data-testid="${testId}"`);
    }

    // Accessibility
    if (this.options.includeAccessibility && semantic?.accessibility) {
      const a11y = this.generateReactA11y(semantic.accessibility);
      if (a11y) attrParts.push(a11y);
    }

    // State bindings as comments
    if (semantic?.stateBindings && semantic.stateBindings.length > 0) {
      this.stateBindingCount += semantic.stateBindings.length;
    }

    // Data bindings as comments
    if (semantic?.dataBindings && semantic.dataBindings.length > 0) {
      this.dataBindingCount += semantic.dataBindings.length;
    }

    // Other attrs
    attrParts.push(...attrs);

    const attrStr = attrParts.length > 0 ? ' ' + attrParts.join(' ') : '';

    // LLM context as comment
    let llmComment = '';
    if (this.options.includeLLMContext && semantic?.llmContext) {
      llmComment = this.generateLLMComment(semantic.llmContext, indent);
    }

    // TODO placeholders
    let todoComment = '';
    if (this.options.includeTodos && semantic?.llmContext?.todoSuggestions) {
      todoComment = this.generateTodoComments(semantic.llmContext.todoSuggestions, indent);
    }

    // Children
    const childIds = this.sceneGraph.getChildIds(node.id);

    if (node.type === 'TEXT') {
      const textNode = node as TextNodeData;
      const text = this.processTextContent(textNode.characters ?? '', semantic);
      return `${llmComment}${todoComment}${indent}<${tag}${attrStr}>${text}</${tag}>`;
    }

    if (childIds.length === 0) {
      if (tag === 'input' || tag === 'img') {
        return `${llmComment}${todoComment}${indent}<${tag}${attrStr} />`;
      }
      return `${llmComment}${todoComment}${indent}<${tag}${attrStr}></${tag}>`;
    }

    // With children
    const childrenJSX = childIds
      .map(childId => {
        const child = this.sceneGraph.getNode(childId);
        return child ? this.nodeToReactJSX(child, depth + 1) : '';
      })
      .filter(Boolean)
      .join('\n');

    return `${llmComment}${todoComment}${indent}<${tag}${attrStr}>\n${childrenJSX}\n${indent}</${tag}>`;
  }

  private getReactTagAndAttrs(node: NodeData, semantic: SemanticMetadata | null): { tag: string; attrs: string[] } {
    const attrs: string[] = [];
    let tag = 'div';

    // Use semantic type if available
    if (semantic?.semanticType) {
      const webDefaults = SEMANTIC_TYPE_DEFAULTS[semantic.semanticType]?.web;
      if (webDefaults?.htmlElement) {
        tag = webDefaults.htmlElement;
      }
    }

    // Fallback to name-based detection
    const name = node.name?.toLowerCase() ?? '';
    if (!semantic && name) {
      if (name.includes('button') || name.includes('btn')) tag = 'button';
      else if (name.includes('input') || name.includes('field')) tag = 'input';
      else if (name.includes('image') || name.includes('img')) tag = 'img';
      else if (name.includes('link')) tag = 'a';
      else if (name.includes('list')) tag = 'ul';
      else if (name.includes('item')) tag = 'li';
      else if (name.includes('nav')) tag = 'nav';
      else if (name.includes('header')) tag = 'header';
      else if (name.includes('footer')) tag = 'footer';
    }

    // Add className placeholder
    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      const classes = this.generateTailwindClasses(frameNode);
      if (classes) {
        attrs.push(`className="${classes}"`);
      }
    }

    return { tag, attrs };
  }

  private generateReactA11y(accessibility: SemanticMetadata['accessibility']): string {
    const attrs: string[] = [];

    if (accessibility.label) {
      attrs.push(`aria-label="${this.escapeString(accessibility.label)}"`);
    }
    if (accessibility.description) {
      attrs.push(`aria-description="${this.escapeString(accessibility.description)}"`);
    }
    if (accessibility.role) {
      attrs.push(`role="${accessibility.role}"`);
    }
    if (accessibility.disabled) {
      attrs.push('aria-disabled="true"');
    }
    if (accessibility.hidden) {
      attrs.push('aria-hidden="true"');
    }
    if (accessibility.focusable) {
      attrs.push('tabIndex={0}');
    }
    if (accessibility.liveRegion && accessibility.liveRegion !== 'off') {
      attrs.push(`aria-live="${accessibility.liveRegion}"`);
    }

    return attrs.join(' ');
  }

  private generateReactTypes(): OutputFile {
    const { componentName } = this.options;
    const lines: string[] = [];

    lines.push('/**');
    lines.push(` * Type definitions for ${componentName}`);
    lines.push(' */');
    lines.push('');
    lines.push(`export interface ${componentName}Props {`);
    lines.push('  // TODO: Add props based on component requirements');
    lines.push('  className?: string;');
    lines.push('}');
    lines.push('');

    return {
      path: `${componentName}.types.ts`,
      content: lines.join('\n'),
      type: 'ts',
    };
  }

  private generateReactStyles(): OutputFile {
    const { componentName } = this.options;
    const lines: string[] = [];

    lines.push('/**');
    lines.push(` * Styles for ${componentName}`);
    lines.push(' */');
    lines.push('');
    lines.push(`.${this.toKebabCase(componentName)} {`);
    lines.push('  /* TODO: Add component styles */');
    lines.push('}');
    lines.push('');

    return {
      path: `${componentName}.module.css`,
      content: lines.join('\n'),
      type: 'css',
    };
  }

  // ===========================================================================
  // SwiftUI Generation
  // ===========================================================================

  private generateSwiftUI(nodeIds: NodeId[]): OutputFile {
    const { componentName, indent } = this.options;
    const lines: string[] = [];

    // File header
    lines.push('//');
    lines.push(`// ${componentName}.swift`);
    lines.push('//');
    lines.push('// Generated by DesignLibre Semantic Code Generator');
    lines.push('//');
    lines.push('');
    lines.push('import SwiftUI');
    lines.push('');

    // View struct
    lines.push(`struct ${componentName}: View {`);

    // State properties
    if (this.options.variables) {
      for (const variable of this.options.variables) {
        if (variable.kind === 'state') {
          const swiftType = this.variableTypeToSwift(variable.type);
          const defaultVal = this.formatSwiftValue(variable.defaultValue, variable.type);
          lines.push(`${indent}@State private var ${this.sanitizeName(variable.name)}: ${swiftType} = ${defaultVal}`);
        }
      }
      lines.push('');
    }

    lines.push(`${indent}var body: some View {`);

    // Generate view hierarchy
    for (const nodeId of nodeIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node) {
        const swift = this.nodeToSwiftUI(node, 2);
        lines.push(swift);
      }
    }

    lines.push(`${indent}}`);
    lines.push('}');
    lines.push('');

    return {
      path: `${componentName}.swift`,
      content: lines.join('\n'),
      type: 'swift',
    };
  }

  private nodeToSwiftUI(node: NodeData, depth: number): string {
    this.processedNodes++;
    const indent = this.options.indent.repeat(depth);
    const semantic = this.getNodeSemanticMetadata(node);

    // Determine SwiftUI view type
    const viewType = this.getSwiftUIViewType(node, semantic);

    // Track bindings
    if (semantic?.stateBindings) this.stateBindingCount += semantic.stateBindings.length;
    if (semantic?.dataBindings) this.dataBindingCount += semantic.dataBindings.length;

    // LLM context comment
    let llmComment = '';
    if (this.options.includeLLMContext && semantic?.llmContext) {
      llmComment = this.generateSwiftComment(semantic.llmContext, indent);
    }

    // TODO comments
    let todoComment = '';
    if (this.options.includeTodos && semantic?.llmContext?.todoSuggestions) {
      todoComment = this.generateSwiftTodoComments(semantic.llmContext.todoSuggestions, indent);
    }

    const childIds = this.sceneGraph.getChildIds(node.id);

    // Text node
    if (node.type === 'TEXT') {
      const textNode = node as TextNodeData;
      const text = this.escapeSwiftString(textNode.characters ?? '');
      let result = `${llmComment}${todoComment}${indent}Text("${text}")`;

      // Add accessibility
      if (this.options.includeAccessibility && semantic?.accessibility?.label) {
        result += `\n${indent}${this.options.indent}.accessibilityLabel("${this.escapeSwiftString(semantic.accessibility.label)}")`;
      }

      return result;
    }

    // Container with children
    if (childIds.length > 0) {
      const childrenSwift = childIds
        .map(childId => {
          const child = this.sceneGraph.getNode(childId);
          return child ? this.nodeToSwiftUI(child, depth + 1) : '';
        })
        .filter(Boolean)
        .join('\n');

      let result = `${llmComment}${todoComment}${indent}${viewType} {\n${childrenSwift}\n${indent}}`;

      // Add modifiers
      if (this.options.includeAccessibility && semantic?.accessibility?.label) {
        result += `\n${indent}.accessibilityLabel("${this.escapeSwiftString(semantic.accessibility.label)}")`;
      }

      if (this.options.includeTestIds) {
        result += `\n${indent}.accessibilityIdentifier("${this.generateTestId(node)}")`;
      }

      return result;
    }

    // Leaf node
    let result = `${llmComment}${todoComment}${indent}${viewType}()`;

    if (this.options.includeAccessibility && semantic?.accessibility?.label) {
      result += `\n${indent}${this.options.indent}.accessibilityLabel("${this.escapeSwiftString(semantic.accessibility.label)}")`;
    }

    return result;
  }

  private getSwiftUIViewType(node: NodeData, semantic: SemanticMetadata | null): string {
    // Use semantic type if available
    if (semantic?.semanticType) {
      const iosDefaults = SEMANTIC_TYPE_DEFAULTS[semantic.semanticType]?.ios;
      if (iosDefaults?.swiftUIView) {
        return iosDefaults.swiftUIView;
      }
    }

    // Determine layout direction for frames
    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      if (frameNode.autoLayout?.mode === 'HORIZONTAL') {
        return 'HStack';
      }
      return 'VStack';
    }

    return 'EmptyView';
  }

  private generateSwiftUIPreview(): OutputFile {
    const { componentName } = this.options;
    const lines: string[] = [];

    lines.push('//');
    lines.push(`// ${componentName}+Preview.swift`);
    lines.push('//');
    lines.push('');
    lines.push('import SwiftUI');
    lines.push('');
    lines.push('#Preview {');
    lines.push(`    ${componentName}()`);
    lines.push('}');
    lines.push('');

    return {
      path: `${componentName}+Preview.swift`,
      content: lines.join('\n'),
      type: 'swift',
    };
  }

  // ===========================================================================
  // Compose Generation
  // ===========================================================================

  private generateCompose(nodeIds: NodeId[]): OutputFile {
    const { componentName, indent } = this.options;
    const lines: string[] = [];

    // Package and imports
    lines.push('package com.example.designlibre.ui.components');
    lines.push('');
    lines.push('import androidx.compose.foundation.layout.*');
    lines.push('import androidx.compose.material3.*');
    lines.push('import androidx.compose.runtime.*');
    lines.push('import androidx.compose.ui.Modifier');
    lines.push('import androidx.compose.ui.semantics.semantics');
    lines.push('import androidx.compose.ui.semantics.contentDescription');
    lines.push('import androidx.compose.ui.semantics.testTag');
    lines.push('');

    // Composable function
    lines.push('@Composable');
    lines.push(`fun ${componentName}() {`);

    // State
    if (this.options.variables) {
      for (const variable of this.options.variables) {
        if (variable.kind === 'state') {
          const kotlinType = this.variableTypeToKotlin(variable.type);
          const defaultVal = this.formatKotlinValue(variable.defaultValue, variable.type);
          lines.push(`${indent}var ${this.sanitizeName(variable.name)} by remember { mutableStateOf<${kotlinType}>(${defaultVal}) }`);
        }
      }
      lines.push('');
    }

    // Generate composable hierarchy
    for (const nodeId of nodeIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node) {
        const compose = this.nodeToCompose(node, 1);
        lines.push(compose);
      }
    }

    lines.push('}');
    lines.push('');

    return {
      path: `${componentName}.kt`,
      content: lines.join('\n'),
      type: 'kt',
    };
  }

  private nodeToCompose(node: NodeData, depth: number): string {
    this.processedNodes++;
    const indent = this.options.indent.repeat(depth);
    const semantic = this.getNodeSemanticMetadata(node);

    // Determine composable type
    const composable = this.getComposeType(node, semantic);

    // Track bindings
    if (semantic?.stateBindings) this.stateBindingCount += semantic.stateBindings.length;
    if (semantic?.dataBindings) this.dataBindingCount += semantic.dataBindings.length;

    // LLM context comment
    let llmComment = '';
    if (this.options.includeLLMContext && semantic?.llmContext) {
      llmComment = this.generateKotlinComment(semantic.llmContext, indent);
    }

    // Build modifier
    const modifiers: string[] = [];
    if (this.options.includeTestIds) {
      modifiers.push(`testTag("${this.generateTestId(node)}")`);
    }
    if (this.options.includeAccessibility && semantic?.accessibility?.label) {
      modifiers.push(`contentDescription = "${this.escapeKotlinString(semantic.accessibility.label)}"`);
    }

    const modifierStr = modifiers.length > 0
      ? `modifier = Modifier.semantics { ${modifiers.join('; ')} }`
      : '';

    const childIds = this.sceneGraph.getChildIds(node.id);

    // Text node
    if (node.type === 'TEXT') {
      const textNode = node as TextNodeData;
      const text = this.escapeKotlinString(textNode.characters ?? '');
      return `${llmComment}${indent}Text("${text}"${modifierStr ? ', ' + modifierStr : ''})`;
    }

    // Container with children
    if (childIds.length > 0) {
      const childrenCompose = childIds
        .map(childId => {
          const child = this.sceneGraph.getNode(childId);
          return child ? this.nodeToCompose(child, depth + 1) : '';
        })
        .filter(Boolean)
        .join('\n');

      return `${llmComment}${indent}${composable}(${modifierStr ? modifierStr : ''}) {\n${childrenCompose}\n${indent}}`;
    }

    // Leaf node
    return `${llmComment}${indent}${composable}(${modifierStr})`;
  }

  private getComposeType(node: NodeData, semantic: SemanticMetadata | null): string {
    // Use semantic type if available
    if (semantic?.semanticType) {
      const androidDefaults = SEMANTIC_TYPE_DEFAULTS[semantic.semanticType]?.android;
      if (androidDefaults?.composeType) {
        return androidDefaults.composeType;
      }
    }

    // Determine layout for frames
    if (node.type === 'FRAME') {
      const frameNode = node as FrameNodeData;
      if (frameNode.autoLayout?.mode === 'HORIZONTAL') {
        return 'Row';
      }
      return 'Column';
    }

    return 'Box';
  }

  private generateComposePreview(): OutputFile {
    const { componentName } = this.options;
    const lines: string[] = [];

    lines.push('package com.example.designlibre.ui.components');
    lines.push('');
    lines.push('import androidx.compose.ui.tooling.preview.Preview');
    lines.push('import androidx.compose.runtime.Composable');
    lines.push('');
    lines.push('@Preview(showBackground = true)');
    lines.push('@Composable');
    lines.push(`fun ${componentName}Preview() {`);
    lines.push(`    ${componentName}()`);
    lines.push('}');
    lines.push('');

    return {
      path: `${componentName}Preview.kt`,
      content: lines.join('\n'),
      type: 'kt',
    };
  }

  // ===========================================================================
  // HTML Generation
  // ===========================================================================

  private generateHTML(nodeIds: NodeId[]): OutputFile {
    const { componentName } = this.options;
    const lines: string[] = [];

    lines.push('<!DOCTYPE html>');
    lines.push(`<html lang="en">`);
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8">');
    lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    lines.push(`  <title>${componentName}</title>`);
    if (this.options.multiFile) {
      lines.push(`  <link rel="stylesheet" href="${this.toKebabCase(componentName)}.css">`);
    }
    lines.push('</head>');
    lines.push('<body>');

    // Generate HTML for each node
    for (const nodeId of nodeIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node) {
        const html = this.nodeToHTML(node, 1);
        lines.push(html);
      }
    }

    lines.push('</body>');
    lines.push('</html>');
    lines.push('');

    return {
      path: `${this.toKebabCase(componentName)}.html`,
      content: lines.join('\n'),
      type: 'html',
    };
  }

  private nodeToHTML(node: NodeData, depth: number): string {
    this.processedNodes++;
    const indent = this.options.indent.repeat(depth);
    const semantic = this.getNodeSemanticMetadata(node);

    // Determine tag
    let tag = 'div';
    if (semantic?.semanticType) {
      const webDefaults = SEMANTIC_TYPE_DEFAULTS[semantic.semanticType]?.web;
      if (webDefaults?.htmlElement) {
        tag = webDefaults.htmlElement;
      }
    }

    // Build attributes
    const attrs: string[] = [];

    if (this.options.includeTestIds) {
      attrs.push(`data-testid="${this.generateTestId(node)}"`);
    }

    if (this.options.includeAccessibility && semantic?.accessibility) {
      if (semantic.accessibility.label) {
        attrs.push(`aria-label="${this.escapeString(semantic.accessibility.label)}"`);
      }
      if (semantic.accessibility.role) {
        attrs.push(`role="${semantic.accessibility.role}"`);
      }
    }

    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

    // LLM context comment
    let llmComment = '';
    if (this.options.includeLLMContext && semantic?.llmContext) {
      llmComment = this.generateHTMLComment(semantic.llmContext, indent);
    }

    const childIds = this.sceneGraph.getChildIds(node.id);

    // Text node
    if (node.type === 'TEXT') {
      const textNode = node as TextNodeData;
      const text = this.escapeHTML(textNode.characters ?? '');
      return `${llmComment}${indent}<${tag}${attrStr}>${text}</${tag}>`;
    }

    // Container
    if (childIds.length > 0) {
      const childrenHTML = childIds
        .map(childId => {
          const child = this.sceneGraph.getNode(childId);
          return child ? this.nodeToHTML(child, depth + 1) : '';
        })
        .filter(Boolean)
        .join('\n');

      return `${llmComment}${indent}<${tag}${attrStr}>\n${childrenHTML}\n${indent}</${tag}>`;
    }

    return `${llmComment}${indent}<${tag}${attrStr}></${tag}>`;
  }

  private generateHTMLStyles(): OutputFile {
    const { componentName } = this.options;
    const lines: string[] = [];

    lines.push('/**');
    lines.push(` * Styles for ${componentName}`);
    lines.push(' */');
    lines.push('');
    lines.push('/* TODO: Add component styles */');
    lines.push('');

    return {
      path: `${this.toKebabCase(componentName)}.css`,
      content: lines.join('\n'),
      type: 'css',
    };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private getNodeSemanticMetadata(node: NodeData): SemanticMetadata | null {
    const pluginData = (node as { pluginData?: Record<string, unknown> }).pluginData;
    return getSemanticMetadata(pluginData);
  }

  private generateTestId(node: NodeData): string {
    // Use node name, sanitized
    const name = node.name || node.type;
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private generateTailwindClasses(node: FrameNodeData): string {
    const classes: string[] = [];

    // Layout
    if (node.autoLayout?.mode === 'HORIZONTAL') {
      classes.push('flex', 'flex-row');
    } else if (node.autoLayout?.mode === 'VERTICAL') {
      classes.push('flex', 'flex-col');
    }

    // Gap
    if (node.autoLayout?.itemSpacing && node.autoLayout.itemSpacing > 0) {
      classes.push(`gap-[${node.autoLayout.itemSpacing}px]`);
    }

    // Padding
    if (node.autoLayout?.paddingTop) {
      classes.push(`pt-[${node.autoLayout.paddingTop}px]`);
    }
    if (node.autoLayout?.paddingBottom) {
      classes.push(`pb-[${node.autoLayout.paddingBottom}px]`);
    }
    if (node.autoLayout?.paddingLeft) {
      classes.push(`pl-[${node.autoLayout.paddingLeft}px]`);
    }
    if (node.autoLayout?.paddingRight) {
      classes.push(`pr-[${node.autoLayout.paddingRight}px]`);
    }

    // Border radius
    if (node.cornerRadius && node.cornerRadius > 0) {
      classes.push(`rounded-[${node.cornerRadius}px]`);
    }

    return classes.join(' ');
  }

  private generateLLMComment(context: LLMContextHints, indent: string): string {
    const lines: string[] = [];
    lines.push(`${indent}{/* `);

    if (context.purpose) {
      lines.push(`${indent}   Purpose: ${context.purpose}`);
    }
    if (context.businessLogicNotes && context.businessLogicNotes.length > 0) {
      lines.push(`${indent}   Business Logic:`);
      for (const note of context.businessLogicNotes) {
        lines.push(`${indent}   - ${note}`);
      }
    }
    if (context.apiEndpoints && context.apiEndpoints.length > 0) {
      lines.push(`${indent}   API: ${context.apiEndpoints.join(', ')}`);
    }
    if (context.dataDependencies && context.dataDependencies.length > 0) {
      lines.push(`${indent}   Data: ${context.dataDependencies.join(', ')}`);
    }

    lines.push(`${indent}*/}`);
    return lines.join('\n') + '\n';
  }

  private generateTodoComments(todos: string[], indent: string): string {
    const lines: string[] = [];
    for (const todo of todos) {
      lines.push(`${indent}{/* TODO: ${todo} */}`);
      this.todoCount++;
    }
    return lines.join('\n') + '\n';
  }

  private generateSwiftComment(context: LLMContextHints, indent: string): string {
    const lines: string[] = [];

    if (context.purpose) {
      lines.push(`${indent}// Purpose: ${context.purpose}`);
    }
    if (context.businessLogicNotes && context.businessLogicNotes.length > 0) {
      lines.push(`${indent}// Business Logic:`);
      for (const note of context.businessLogicNotes) {
        lines.push(`${indent}// - ${note}`);
      }
    }

    return lines.length > 0 ? lines.join('\n') + '\n' : '';
  }

  private generateSwiftTodoComments(todos: string[], indent: string): string {
    const lines: string[] = [];
    for (const todo of todos) {
      lines.push(`${indent}// TODO: ${todo}`);
      this.todoCount++;
    }
    return lines.join('\n') + '\n';
  }

  private generateKotlinComment(context: LLMContextHints, indent: string): string {
    return this.generateSwiftComment(context, indent); // Same format
  }

  private generateHTMLComment(context: LLMContextHints, indent: string): string {
    const lines: string[] = [];

    if (context.purpose) {
      lines.push(`${indent}<!-- Purpose: ${context.purpose} -->`);
    }
    if (context.businessLogicNotes && context.businessLogicNotes.length > 0) {
      lines.push(`${indent}<!-- Business Logic:`);
      for (const note of context.businessLogicNotes) {
        lines.push(`${indent}     - ${note}`);
      }
      lines.push(`${indent}-->`);
    }

    return lines.length > 0 ? lines.join('\n') + '\n' : '';
  }

  private processTextContent(text: string, semantic: SemanticMetadata | null): string {
    // Check for data bindings
    if (semantic?.dataBindings) {
      for (const binding of semantic.dataBindings) {
        if (binding.propertyPath.includes('characters')) {
          // Replace with placeholder
          return `{/* Data: ${binding.dataSourceId}.${binding.dataPath} */}`;
        }
      }
    }
    return this.escapeJSX(text);
  }

  // Type conversion helpers
  private variableTypeToTS(type: string): string {
    switch (type) {
      case 'boolean': return 'boolean';
      case 'number': return 'number';
      case 'string': return 'string';
      case 'color': return 'string';
      default: return 'unknown';
    }
  }

  private variableTypeToSwift(type: string): string {
    switch (type) {
      case 'boolean': return 'Bool';
      case 'number': return 'Double';
      case 'string': return 'String';
      case 'color': return 'Color';
      default: return 'Any';
    }
  }

  private variableTypeToKotlin(type: string): string {
    switch (type) {
      case 'boolean': return 'Boolean';
      case 'number': return 'Double';
      case 'string': return 'String';
      case 'color': return 'Color';
      default: return 'Any';
    }
  }

  // Value formatting
  private formatTSValue(value: unknown, type: string): string {
    if (type === 'string' || type === 'color') return `'${String(value)}'`;
    return String(value);
  }

  private formatSwiftValue(value: unknown, type: string): string {
    if (type === 'string') return `"${String(value)}"`;
    if (type === 'color') return `.white`; // Placeholder
    return String(value);
  }

  private formatKotlinValue(value: unknown, type: string): string {
    if (type === 'string') return `"${String(value)}"`;
    if (type === 'color') return `Color.White`; // Placeholder
    return String(value);
  }

  // String helpers
  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '').replace(/^(\d)/, '_$1');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  private escapeString(str: string): string {
    return str.replace(/"/g, '&quot;');
  }

  private escapeJSX(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/{/g, '&#123;')
      .replace(/}/g, '&#125;');
  }

  private escapeSwiftString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private escapeKotlinString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a semantic code generator
 */
export function createSemanticCodeGenerator(
  sceneGraph: SceneGraph,
  options: SemanticCodeGeneratorOptions
): SemanticCodeGenerator {
  return new SemanticCodeGenerator(sceneGraph, options);
}

/**
 * Quick export function
 */
export function generateSemanticCode(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options: SemanticCodeGeneratorOptions
): SemanticCodeResult {
  const generator = createSemanticCodeGenerator(sceneGraph, options);
  return generator.generate(nodeIds);
}
