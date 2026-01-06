/**
 * Component Export
 *
 * Exports DesignLibre components as reusable, parameterized code
 * for SwiftUI and Jetpack Compose.
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { FrameNodeData, TextNodeData, NodeData } from '@scene/nodes/base-node';
import type { RGBA } from '@core/types/color';
import { formatNum } from './format-utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Property type for component parameters
 */
export type ComponentPropertyType = 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';

/**
 * Extracted component property
 */
export interface ExtractedProperty {
  name: string;
  type: ComponentPropertyType;
  defaultValue: unknown;
  options?: string[]; // For VARIANT type
}

/**
 * Extracted variant
 */
export interface ExtractedVariant {
  key: string;
  properties: Record<string, string>;
  componentId: NodeId;
}

/**
 * Extracted component definition
 */
export interface ExtractedComponent {
  id: NodeId;
  name: string;
  properties: ExtractedProperty[];
  variants: ExtractedVariant[];
  isComponentSet: boolean;
  setId?: string;
}

/**
 * Component export options
 */
export interface ComponentExportOptions {
  /** Generate property documentation (default: true) */
  includeDocumentation?: boolean;
  /** Generate preview code (default: true) */
  includePreview?: boolean;
  /** Generate usage examples (default: true) */
  includeUsageExamples?: boolean;
  /** Prefix for generated components (default: '') */
  prefix?: string;
  /** Use design tokens (default: false) */
  useTokens?: boolean;
  /** Token prefix (default: 'DesignTokens' for Swift, 'AppTokens' for Kotlin) */
  tokenPrefix?: string;
}

/**
 * Component export result
 */
export interface ComponentExportResult {
  /** Component name */
  name: string;
  /** Generated component code */
  code: string;
  /** Usage example code */
  usageExample: string;
  /** Suggested filename */
  fileName: string;
  /** File extension */
  extension: string;
  /** Platform */
  platform: 'swiftui' | 'compose';
}

// ============================================================================
// Component Detector
// ============================================================================

/**
 * Detect components in the scene graph
 */
export function detectComponents(sceneGraph: SceneGraph): ExtractedComponent[] {
  const components: ExtractedComponent[] = [];
  const doc = sceneGraph.getDocument();
  if (!doc) return components;

  // Traverse all nodes
  const nodeStack: NodeId[] = [doc.id];
  while (nodeStack.length > 0) {
    const nodeId = nodeStack.pop()!;
    const node = sceneGraph.getNode(nodeId);
    if (!node) continue;

    // Check if this is a component
    if (node.type === 'COMPONENT') {
      const component = extractComponent(sceneGraph, nodeId, node as unknown as FrameNodeData);
      if (component) {
        components.push(component);
      }
    }

    // Add children to stack
    const childIds = sceneGraph.getChildIds(nodeId);
    nodeStack.push(...childIds);
  }

  return components;
}

/**
 * Extract component definition from a node
 */
function extractComponent(
  sceneGraph: SceneGraph,
  nodeId: NodeId,
  node: FrameNodeData
): ExtractedComponent | null {
  const componentNode = node as FrameNodeData & {
    componentProperties?: Record<string, { type: ComponentPropertyType; defaultValue: unknown }>;
    variantProperties?: Record<string, string>;
    componentSetId?: string;
  };

  const properties: ExtractedProperty[] = [];

  // Extract properties from componentProperties
  if (componentNode.componentProperties) {
    for (const [name, prop] of Object.entries(componentNode.componentProperties)) {
      properties.push({
        name: sanitizeName(name),
        type: prop.type,
        defaultValue: prop.defaultValue,
      });
    }
  }

  // Infer properties from node content if none defined
  if (properties.length === 0) {
    const inferredProps = inferPropertiesFromNode(sceneGraph, nodeId);
    properties.push(...inferredProps);
  }

  // Extract variants
  const variants: ExtractedVariant[] = [];
  if (componentNode.variantProperties) {
    // Parse variant key into property values
    const variantKey = Object.entries(componentNode.variantProperties)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    variants.push({
      key: variantKey,
      properties: componentNode.variantProperties,
      componentId: nodeId,
    });
  }

  const result: ExtractedComponent = {
    id: nodeId,
    name: sanitizeName(node.name || 'Component'),
    properties,
    variants,
    isComponentSet: !!componentNode.componentSetId,
  };

  if (componentNode.componentSetId) {
    result.setId = componentNode.componentSetId;
  }

  return result;
}

/**
 * Infer properties from node content (for components without explicit properties)
 */
function inferPropertiesFromNode(sceneGraph: SceneGraph, nodeId: NodeId): ExtractedProperty[] {
  const properties: ExtractedProperty[] = [];
  const seenNames = new Set<string>();

  // Find text nodes - these often become text properties
  traverseNodes(sceneGraph, nodeId, (node) => {
    if (node.type === 'TEXT') {
      const textNode = node as TextNodeData;
      const propName = sanitizeName(node.name || 'label');
      if (!seenNames.has(propName)) {
        seenNames.add(propName);
        properties.push({
          name: propName,
          type: 'TEXT',
          defaultValue: textNode.characters || '',
        });
      }
    }
  });

  return properties;
}

/**
 * Traverse nodes recursively
 */
function traverseNodes(
  sceneGraph: SceneGraph,
  nodeId: NodeId,
  callback: (node: NodeData) => void
): void {
  const node = sceneGraph.getNode(nodeId);
  if (!node) return;

  callback(node);

  const childIds = sceneGraph.getChildIds(nodeId);
  for (const childId of childIds) {
    traverseNodes(sceneGraph, childId, callback);
  }
}

// ============================================================================
// SwiftUI Component Export
// ============================================================================

/**
 * Export component as SwiftUI View
 */
export function exportSwiftUIComponent(
  sceneGraph: SceneGraph,
  component: ExtractedComponent,
  options: ComponentExportOptions = {}
): ComponentExportResult {
  const prefix = options.prefix ?? '';
  const includeDoc = options.includeDocumentation ?? true;
  const includePreview = options.includePreview ?? true;
  const includeUsage = options.includeUsageExamples ?? true;

  const componentName = `${prefix}${capitalizeFirst(component.name)}`;
  const lines: string[] = [];

  // Imports
  lines.push('import SwiftUI');
  lines.push('');

  // Documentation
  if (includeDoc && component.properties.length > 0) {
    lines.push('/// A reusable component exported from DesignLibre.');
    lines.push('///');
    lines.push('/// ## Properties');
    for (const prop of component.properties) {
      const typeStr = getSwiftPropertyType(prop);
      lines.push(`/// - \`${prop.name}\`: ${typeStr} - ${getPropertyDescription(prop)}`);
    }
    lines.push('///');
  }

  // Struct definition
  lines.push(`struct ${componentName}: View {`);

  // Properties
  if (component.properties.length > 0) {
    lines.push('    // MARK: - Properties');
    lines.push('');
    for (const prop of component.properties) {
      const typeStr = getSwiftPropertyType(prop);
      const defaultStr = getSwiftDefaultValue(prop);
      if (defaultStr) {
        lines.push(`    var ${prop.name}: ${typeStr} = ${defaultStr}`);
      } else {
        lines.push(`    let ${prop.name}: ${typeStr}`);
      }
    }
    lines.push('');
  }

  // Action closures for interactive components
  const hasActions = component.name.toLowerCase().includes('button');
  if (hasActions) {
    lines.push('    // MARK: - Actions');
    lines.push('    var action: () -> Void = {}');
    lines.push('');
  }

  // Body
  lines.push('    // MARK: - Body');
  lines.push('    var body: some View {');
  lines.push(generateSwiftUIComponentBody(sceneGraph, component, options, 8));
  lines.push('    }');
  lines.push('}');

  // Preview
  if (includePreview) {
    lines.push('');
    lines.push('#if DEBUG');
    lines.push(`struct ${componentName}_Previews: PreviewProvider {`);
    lines.push('    static var previews: some View {');
    lines.push('        VStack(spacing: 20) {');

    if (component.variants.length > 0) {
      // Show variants
      for (const variant of component.variants.slice(0, 3)) {
        const variantProps = Object.entries(variant.properties)
          .map(([k, v]) => `.${k.toLowerCase()}("${v}")`)
          .join('');
        lines.push(`            ${componentName}()${variantProps}`);
      }
    } else {
      // Show with default props
      lines.push(`            ${componentName}()`);
    }

    lines.push('        }');
    lines.push('        .padding()');
    lines.push('    }');
    lines.push('}');
    lines.push('#endif');
  }

  // Usage example
  let usageExample = '';
  if (includeUsage) {
    usageExample = generateSwiftUIUsageExample(componentName, component);
  }

  return {
    name: componentName,
    code: lines.join('\n'),
    usageExample,
    fileName: componentName,
    extension: 'swift',
    platform: 'swiftui',
  };
}

/**
 * Generate SwiftUI component body
 */
function generateSwiftUIComponentBody(
  sceneGraph: SceneGraph,
  component: ExtractedComponent,
  options: ComponentExportOptions,
  indent: number
): string {
  const node = sceneGraph.getNode(component.id);
  if (!node) return `${' '.repeat(indent)}EmptyView()`;

  const frameNode = node as FrameNodeData;
  const spaces = ' '.repeat(indent);
  const parts: string[] = [];

  // Generate based on auto-layout
  const isHorizontal = frameNode.autoLayout?.mode === 'HORIZONTAL';
  const isVertical = frameNode.autoLayout?.mode === 'VERTICAL';
  const spacing = frameNode.autoLayout?.itemSpacing ?? 0;

  const childIds = sceneGraph.getChildIds(component.id);

  if (childIds.length === 0) {
    // Empty component - render as rectangle
    parts.push(`${spaces}Rectangle()`);
    parts.push(`${spaces}    .fill(Color.clear)`);
    parts.push(`${spaces}    .frame(width: ${formatNum(frameNode.width)}, height: ${formatNum(frameNode.height)})`);
  } else if (isHorizontal) {
    parts.push(`${spaces}HStack(spacing: ${spacing}) {`);
    parts.push(generateSwiftUIChildren(sceneGraph, childIds, component, options, indent + 4));
    parts.push(`${spaces}}`);
  } else if (isVertical) {
    parts.push(`${spaces}VStack(spacing: ${spacing}) {`);
    parts.push(generateSwiftUIChildren(sceneGraph, childIds, component, options, indent + 4));
    parts.push(`${spaces}}`);
  } else {
    parts.push(`${spaces}ZStack {`);
    parts.push(generateSwiftUIChildren(sceneGraph, childIds, component, options, indent + 4));
    parts.push(`${spaces}}`);
  }

  // Add modifiers
  const modifiers = generateSwiftUIModifiers(frameNode, options, indent);
  if (modifiers) {
    parts.push(modifiers);
  }

  return parts.join('\n');
}

/**
 * Generate SwiftUI children
 */
function generateSwiftUIChildren(
  sceneGraph: SceneGraph,
  childIds: readonly NodeId[],
  component: ExtractedComponent,
  options: ComponentExportOptions,
  indent: number
): string {
  const parts: string[] = [];
  const spaces = ' '.repeat(indent);

  for (const childId of childIds) {
    const child = sceneGraph.getNode(childId);
    if (!child) continue;

    // Check if this child maps to a property
    const matchingProp = component.properties.find(p =>
      p.name.toLowerCase() === sanitizeName(child.name || '').toLowerCase()
    );

    if (child.type === 'TEXT') {
      const textNode = child as TextNodeData;
      if (matchingProp && matchingProp.type === 'TEXT') {
        // Use property binding
        parts.push(`${spaces}Text(${matchingProp.name})`);
      } else {
        parts.push(`${spaces}Text("${escapeString(textNode.characters)}")`);
      }

      // Add text modifiers
      const fontSize = textNode.textStyles?.[0]?.fontSize ?? 16;
      const fontWeight = textNode.textStyles?.[0]?.fontWeight ?? 400;
      parts.push(`${spaces}    .font(.system(size: ${fontSize}, weight: .${swiftFontWeight(fontWeight)}))`);
    } else if (child.type === 'FRAME') {
      const frameChild = child as FrameNodeData;
      const nestedChildIds = sceneGraph.getChildIds(childId);

      if (nestedChildIds.length > 0) {
        const isH = frameChild.autoLayout?.mode === 'HORIZONTAL';
        const isV = frameChild.autoLayout?.mode === 'VERTICAL';
        const sp = frameChild.autoLayout?.itemSpacing ?? 0;

        if (isH) {
          parts.push(`${spaces}HStack(spacing: ${sp}) {`);
        } else if (isV) {
          parts.push(`${spaces}VStack(spacing: ${sp}) {`);
        } else {
          parts.push(`${spaces}ZStack {`);
        }

        parts.push(generateSwiftUIChildren(sceneGraph, nestedChildIds, component, options, indent + 4));
        parts.push(`${spaces}}`);
      } else {
        parts.push(`${spaces}Rectangle()`);
        parts.push(`${spaces}    .fill(${getSwiftUIFillColor(frameChild, options)})`);
      }

      // Frame modifiers
      if (frameChild.cornerRadius && frameChild.cornerRadius > 0) {
        parts.push(`${spaces}    .cornerRadius(${frameChild.cornerRadius})`);
      }
      parts.push(`${spaces}    .frame(width: ${formatNum(frameChild.width)}, height: ${formatNum(frameChild.height)})`);
    } else {
      // Generic rectangle for other types
      parts.push(`${spaces}Rectangle().fill(Color.clear)`);
    }
  }

  return parts.join('\n');
}

/**
 * Generate SwiftUI modifiers for a frame
 */
function generateSwiftUIModifiers(
  node: FrameNodeData,
  options: ComponentExportOptions,
  indent: number
): string {
  const spaces = ' '.repeat(indent);
  const parts: string[] = [];

  // Padding
  const pt = node.autoLayout?.paddingTop ?? 0;
  const pr = node.autoLayout?.paddingRight ?? 0;
  const pb = node.autoLayout?.paddingBottom ?? 0;
  const pl = node.autoLayout?.paddingLeft ?? 0;

  if (pt > 0 || pr > 0 || pb > 0 || pl > 0) {
    if (pt === pb && pl === pr && pt === pl) {
      parts.push(`${spaces}.padding(${pt})`);
    } else if (pt === pb && pl === pr) {
      if (pl > 0) parts.push(`${spaces}.padding(.horizontal, ${pl})`);
      if (pt > 0) parts.push(`${spaces}.padding(.vertical, ${pt})`);
    } else {
      parts.push(`${spaces}.padding(EdgeInsets(top: ${pt}, leading: ${pl}, bottom: ${pb}, trailing: ${pr}))`);
    }
  }

  // Background
  const fillColor = getSwiftUIFillColor(node, options);
  if (fillColor !== 'Color.clear') {
    parts.push(`${spaces}.background(${fillColor})`);
  }

  // Corner radius
  if (node.cornerRadius && node.cornerRadius > 0) {
    parts.push(`${spaces}.cornerRadius(${node.cornerRadius})`);
  }

  return parts.join('\n');
}

/**
 * Get SwiftUI fill color from node
 */
function getSwiftUIFillColor(node: FrameNodeData, options: ComponentExportOptions): string {
  const fill = node.fills?.find(f => f.type === 'SOLID' && f.visible !== false);
  if (!fill || fill.type !== 'SOLID') return 'Color.clear';

  if (options.useTokens) {
    const tokenName = mapColorToTokenName(fill.color);
    return `${options.tokenPrefix ?? 'DesignTokens'}.Colors.${tokenName}`;
  }

  return `Color(red: ${fill.color.r.toFixed(3)}, green: ${fill.color.g.toFixed(3)}, blue: ${fill.color.b.toFixed(3)})`;
}

/**
 * Generate SwiftUI usage example
 */
function generateSwiftUIUsageExample(componentName: string, component: ExtractedComponent): string {
  const lines: string[] = [];
  lines.push('// Basic usage');
  lines.push(`${componentName}()`);
  lines.push('');

  if (component.properties.length > 0) {
    lines.push('// With custom properties');
    const props = component.properties
      .map(p => `${p.name}: ${getSwiftExampleValue(p)}`)
      .join(', ');
    lines.push(`${componentName}(${props})`);
    lines.push('');
  }

  if (component.name.toLowerCase().includes('button')) {
    lines.push('// With action');
    lines.push(`${componentName}() {`);
    lines.push('    print("Button tapped")');
    lines.push('}');
  }

  return lines.join('\n');
}

// ============================================================================
// Compose Component Export
// ============================================================================

/**
 * Export component as Jetpack Compose Composable
 */
export function exportComposeComponent(
  sceneGraph: SceneGraph,
  component: ExtractedComponent,
  options: ComponentExportOptions = {}
): ComponentExportResult {
  const prefix = options.prefix ?? '';
  const includeDoc = options.includeDocumentation ?? true;
  const includePreview = options.includePreview ?? true;
  const includeUsage = options.includeUsageExamples ?? true;

  const componentName = `${prefix}${capitalizeFirst(component.name)}`;
  const lines: string[] = [];

  // Package (placeholder)
  lines.push('package com.designlibre.components');
  lines.push('');

  // Imports
  lines.push('import androidx.compose.foundation.background');
  lines.push('import androidx.compose.foundation.layout.*');
  lines.push('import androidx.compose.foundation.shape.RoundedCornerShape');
  lines.push('import androidx.compose.material3.Text');
  lines.push('import androidx.compose.runtime.Composable');
  lines.push('import androidx.compose.ui.Alignment');
  lines.push('import androidx.compose.ui.Modifier');
  lines.push('import androidx.compose.ui.draw.clip');
  lines.push('import androidx.compose.ui.graphics.Color');
  lines.push('import androidx.compose.ui.text.font.FontWeight');
  lines.push('import androidx.compose.ui.tooling.preview.Preview');
  lines.push('import androidx.compose.ui.unit.dp');
  lines.push('import androidx.compose.ui.unit.sp');
  lines.push('');

  // Documentation
  if (includeDoc && component.properties.length > 0) {
    lines.push('/**');
    lines.push(' * A reusable component exported from DesignLibre.');
    lines.push(' *');
    for (const prop of component.properties) {
      const typeStr = getKotlinPropertyType(prop);
      lines.push(` * @param ${prop.name} ${typeStr} - ${getPropertyDescription(prop)}`);
    }
    lines.push(' */');
  }

  // Composable function
  lines.push('@Composable');

  // Build parameter list
  const params: string[] = [];
  for (const prop of component.properties) {
    const typeStr = getKotlinPropertyType(prop);
    const defaultStr = getKotlinDefaultValue(prop);
    if (defaultStr) {
      params.push(`${prop.name}: ${typeStr} = ${defaultStr}`);
    } else {
      params.push(`${prop.name}: ${typeStr}`);
    }
  }

  // Add modifier parameter
  params.push('modifier: Modifier = Modifier');

  // Add action for buttons
  const hasActions = component.name.toLowerCase().includes('button');
  if (hasActions) {
    params.push('onClick: () -> Unit = {}');
  }

  if (params.length <= 2) {
    lines.push(`fun ${componentName}(${params.join(', ')}) {`);
  } else {
    lines.push(`fun ${componentName}(`);
    for (let i = 0; i < params.length; i++) {
      const comma = i < params.length - 1 ? ',' : '';
      lines.push(`    ${params[i]}${comma}`);
    }
    lines.push(') {');
  }

  // Body
  lines.push(generateComposeComponentBody(sceneGraph, component, options, 4));
  lines.push('}');

  // Preview
  if (includePreview) {
    lines.push('');
    lines.push('@Preview(showBackground = true)');
    lines.push('@Composable');
    lines.push(`fun ${componentName}Preview() {`);
    lines.push('    Column(');
    lines.push('        modifier = Modifier.padding(16.dp),');
    lines.push('        verticalArrangement = Arrangement.spacedBy(16.dp)');
    lines.push('    ) {');
    lines.push(`        ${componentName}()`);
    lines.push('    }');
    lines.push('}');
  }

  // Usage example
  let usageExample = '';
  if (includeUsage) {
    usageExample = generateComposeUsageExample(componentName, component);
  }

  return {
    name: componentName,
    code: lines.join('\n'),
    usageExample,
    fileName: componentName,
    extension: 'kt',
    platform: 'compose',
  };
}

/**
 * Generate Compose component body
 */
function generateComposeComponentBody(
  sceneGraph: SceneGraph,
  component: ExtractedComponent,
  options: ComponentExportOptions,
  indent: number
): string {
  const node = sceneGraph.getNode(component.id);
  if (!node) return `${' '.repeat(indent)}Box {}`;

  const frameNode = node as FrameNodeData;
  const spaces = ' '.repeat(indent);
  const parts: string[] = [];

  const isHorizontal = frameNode.autoLayout?.mode === 'HORIZONTAL';
  const isVertical = frameNode.autoLayout?.mode === 'VERTICAL';
  const spacing = frameNode.autoLayout?.itemSpacing ?? 0;
  const childIds = sceneGraph.getChildIds(component.id);

  // Build modifier
  const modifierParts = ['modifier'];
  const pt = frameNode.autoLayout?.paddingTop ?? 0;
  const pr = frameNode.autoLayout?.paddingRight ?? 0;
  const pb = frameNode.autoLayout?.paddingBottom ?? 0;
  const pl = frameNode.autoLayout?.paddingLeft ?? 0;

  if (pt > 0 || pr > 0 || pb > 0 || pl > 0) {
    if (pt === pb && pl === pr && pt === pl) {
      modifierParts.push(`.padding(${pt}.dp)`);
    } else {
      modifierParts.push(`.padding(start = ${pl}.dp, end = ${pr}.dp, top = ${pt}.dp, bottom = ${pb}.dp)`);
    }
  }

  const fillColor = getComposeFillColor(frameNode, options);
  if (fillColor !== 'Color.Transparent') {
    modifierParts.push(`.background(${fillColor})`);
  }

  if (frameNode.cornerRadius && frameNode.cornerRadius > 0) {
    modifierParts.push(`.clip(RoundedCornerShape(${frameNode.cornerRadius}.dp))`);
  }

  const modifierStr = modifierParts.join('\n' + spaces + '        ');

  if (childIds.length === 0) {
    parts.push(`${spaces}Box(`);
    parts.push(`${spaces}    modifier = ${modifierStr}`);
    parts.push(`${spaces}        .size(${formatNum(frameNode.width)}.dp, ${formatNum(frameNode.height)}.dp)`);
    parts.push(`${spaces}) {}`);
  } else if (isHorizontal) {
    parts.push(`${spaces}Row(`);
    parts.push(`${spaces}    modifier = ${modifierStr},`);
    parts.push(`${spaces}    horizontalArrangement = Arrangement.spacedBy(${spacing}.dp),`);
    parts.push(`${spaces}    verticalAlignment = Alignment.CenterVertically`);
    parts.push(`${spaces}) {`);
    parts.push(generateComposeChildren(sceneGraph, childIds, component, options, indent + 4));
    parts.push(`${spaces}}`);
  } else if (isVertical) {
    parts.push(`${spaces}Column(`);
    parts.push(`${spaces}    modifier = ${modifierStr},`);
    parts.push(`${spaces}    verticalArrangement = Arrangement.spacedBy(${spacing}.dp),`);
    parts.push(`${spaces}    horizontalAlignment = Alignment.Start`);
    parts.push(`${spaces}) {`);
    parts.push(generateComposeChildren(sceneGraph, childIds, component, options, indent + 4));
    parts.push(`${spaces}}`);
  } else {
    parts.push(`${spaces}Box(`);
    parts.push(`${spaces}    modifier = ${modifierStr}`);
    parts.push(`${spaces}) {`);
    parts.push(generateComposeChildren(sceneGraph, childIds, component, options, indent + 4));
    parts.push(`${spaces}}`);
  }

  return parts.join('\n');
}

/**
 * Generate Compose children
 */
function generateComposeChildren(
  sceneGraph: SceneGraph,
  childIds: readonly NodeId[],
  component: ExtractedComponent,
  options: ComponentExportOptions,
  indent: number
): string {
  const parts: string[] = [];
  const spaces = ' '.repeat(indent);

  for (const childId of childIds) {
    const child = sceneGraph.getNode(childId);
    if (!child) continue;

    const matchingProp = component.properties.find(p =>
      p.name.toLowerCase() === sanitizeName(child.name || '').toLowerCase()
    );

    if (child.type === 'TEXT') {
      const textNode = child as TextNodeData;
      const textContent = matchingProp && matchingProp.type === 'TEXT'
        ? matchingProp.name
        : `"${escapeString(textNode.characters)}"`;

      const fontSize = textNode.textStyles?.[0]?.fontSize ?? 16;
      const fontWeight = textNode.textStyles?.[0]?.fontWeight ?? 400;

      parts.push(`${spaces}Text(`);
      parts.push(`${spaces}    text = ${textContent},`);
      parts.push(`${spaces}    fontSize = ${fontSize}.sp,`);
      parts.push(`${spaces}    fontWeight = FontWeight.${kotlinFontWeight(fontWeight)}`);
      parts.push(`${spaces})`);
    } else if (child.type === 'FRAME') {
      const frameChild = child as FrameNodeData;
      parts.push(`${spaces}Box(`);
      parts.push(`${spaces}    modifier = Modifier`);
      parts.push(`${spaces}        .size(${formatNum(frameChild.width)}.dp, ${formatNum(frameChild.height)}.dp)`);

      const fillColor = getComposeFillColor(frameChild, options);
      if (fillColor !== 'Color.Transparent') {
        parts.push(`${spaces}        .background(${fillColor})`);
      }

      if (frameChild.cornerRadius && frameChild.cornerRadius > 0) {
        parts.push(`${spaces}        .clip(RoundedCornerShape(${frameChild.cornerRadius}.dp))`);
      }

      parts.push(`${spaces}) {}`);
    }
  }

  return parts.join('\n');
}

/**
 * Get Compose fill color from node
 */
function getComposeFillColor(node: FrameNodeData, options: ComponentExportOptions): string {
  const fill = node.fills?.find(f => f.type === 'SOLID' && f.visible !== false);
  if (!fill || fill.type !== 'SOLID') return 'Color.Transparent';

  if (options.useTokens) {
    const tokenName = mapColorToTokenName(fill.color);
    return `${options.tokenPrefix ?? 'AppTokens'}.Colors.${tokenName}`;
  }

  const hex = rgbaToComposeHex(fill.color);
  return `Color(0x${hex})`;
}

/**
 * Generate Compose usage example
 */
function generateComposeUsageExample(componentName: string, component: ExtractedComponent): string {
  const lines: string[] = [];
  lines.push('// Basic usage');
  lines.push(`${componentName}()`);
  lines.push('');

  if (component.properties.length > 0) {
    lines.push('// With custom properties');
    const props = component.properties
      .map(p => `${p.name} = ${getKotlinExampleValue(p)}`)
      .join(',\n    ');
    lines.push(`${componentName}(`);
    lines.push(`    ${props}`);
    lines.push(')');
    lines.push('');
  }

  if (component.name.toLowerCase().includes('button')) {
    lines.push('// With click handler');
    lines.push(`${componentName}(`);
    lines.push('    onClick = { /* handle click */ }');
    lines.push(')');
  }

  return lines.join('\n');
}

// ============================================================================
// Helper Functions
// ============================================================================

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^(\d)/, '_$1');
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function getSwiftPropertyType(prop: ExtractedProperty): string {
  switch (prop.type) {
    case 'BOOLEAN': return 'Bool';
    case 'TEXT': return 'String';
    case 'VARIANT': return 'String';
    default: return 'String';
  }
}

function getKotlinPropertyType(prop: ExtractedProperty): string {
  switch (prop.type) {
    case 'BOOLEAN': return 'Boolean';
    case 'TEXT': return 'String';
    case 'VARIANT': return 'String';
    default: return 'String';
  }
}

function getSwiftDefaultValue(prop: ExtractedProperty): string | null {
  if (prop.defaultValue === undefined) return null;
  switch (prop.type) {
    case 'BOOLEAN': return String(prop.defaultValue);
    case 'TEXT': return `"${escapeString(String(prop.defaultValue))}"`;
    case 'VARIANT': return `"${escapeString(String(prop.defaultValue))}"`;
    default: return null;
  }
}

function getKotlinDefaultValue(prop: ExtractedProperty): string | null {
  if (prop.defaultValue === undefined) return null;
  switch (prop.type) {
    case 'BOOLEAN': return String(prop.defaultValue);
    case 'TEXT': return `"${escapeString(String(prop.defaultValue))}"`;
    case 'VARIANT': return `"${escapeString(String(prop.defaultValue))}"`;
    default: return null;
  }
}

function getSwiftExampleValue(prop: ExtractedProperty): string {
  switch (prop.type) {
    case 'BOOLEAN': return 'true';
    case 'TEXT': return '"Custom Text"';
    case 'VARIANT': return '"default"';
    default: return '""';
  }
}

function getKotlinExampleValue(prop: ExtractedProperty): string {
  switch (prop.type) {
    case 'BOOLEAN': return 'true';
    case 'TEXT': return '"Custom Text"';
    case 'VARIANT': return '"default"';
    default: return '""';
  }
}

function getPropertyDescription(prop: ExtractedProperty): string {
  switch (prop.type) {
    case 'BOOLEAN': return 'Boolean flag';
    case 'TEXT': return 'Text content';
    case 'VARIANT': return `Variant selector${prop.options ? ` (${prop.options.join(', ')})` : ''}`;
    default: return 'Property value';
  }
}

function swiftFontWeight(weight: number): string {
  if (weight <= 100) return 'ultraLight';
  if (weight <= 200) return 'thin';
  if (weight <= 300) return 'light';
  if (weight <= 400) return 'regular';
  if (weight <= 500) return 'medium';
  if (weight <= 600) return 'semibold';
  if (weight <= 700) return 'bold';
  if (weight <= 800) return 'heavy';
  return 'black';
}

function kotlinFontWeight(weight: number): string {
  if (weight <= 100) return 'Thin';
  if (weight <= 200) return 'ExtraLight';
  if (weight <= 300) return 'Light';
  if (weight <= 400) return 'Normal';
  if (weight <= 500) return 'Medium';
  if (weight <= 600) return 'SemiBold';
  if (weight <= 700) return 'Bold';
  if (weight <= 800) return 'ExtraBold';
  return 'Black';
}

function mapColorToTokenName(color: RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  if (diff < 30) {
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luminance < 128) return 'Gray.shade700';
    return 'Gray.shade300';
  }

  let hue = 0;
  if (max === r) hue = ((g - b) / diff) % 6;
  else if (max === g) hue = (b - r) / diff + 2;
  else hue = (r - g) / diff + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  let hueName: string;
  if (hue < 15 || hue >= 345) hueName = 'Red';
  else if (hue < 45) hueName = 'Orange';
  else if (hue < 75) hueName = 'Yellow';
  else if (hue < 150) hueName = 'Green';
  else if (hue < 195) hueName = 'Cyan';
  else if (hue < 255) hueName = 'Blue';
  else if (hue < 285) hueName = 'Purple';
  else hueName = 'Pink';

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const shade = luminance < 128 ? 'shade600' : 'shade400';

  return `${hueName}.${shade}`;
}

function rgbaToComposeHex(color: RGBA): string {
  const a = Math.round(color.a * 255).toString(16).padStart(2, '0').toUpperCase();
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0').toUpperCase();
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0').toUpperCase();
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0').toUpperCase();
  return `${a}${r}${g}${b}`;
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Export all components from scene graph
 */
export function exportAllComponents(
  sceneGraph: SceneGraph,
  platform: 'swiftui' | 'compose',
  options: ComponentExportOptions = {}
): ComponentExportResult[] {
  const components = detectComponents(sceneGraph);
  const results: ComponentExportResult[] = [];

  for (const component of components) {
    if (platform === 'swiftui') {
      results.push(exportSwiftUIComponent(sceneGraph, component, options));
    } else {
      results.push(exportComposeComponent(sceneGraph, component, options));
    }
  }

  return results;
}
