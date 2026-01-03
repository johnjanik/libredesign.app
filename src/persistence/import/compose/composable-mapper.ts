/**
 * Compose Composable Mapper
 *
 * Maps parsed Kotlin Compose composables to DesignLibre scene graph nodes.
 */

import type { NodeId, NodeType } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { SolidPaint } from '@core/types/paint';
import type { DropShadowEffect } from '@core/types/effect';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { AutoLayoutProps } from '@core/types/common';
import {
  CODE_SOURCE_PLUGIN_KEY,
  type CodeSourceMetadata,
  type PropertySource,
} from '@core/types/code-source-metadata';
import type {
  ParsedComposable,
  ParsedComposeModifier,
  ComposableToNodeMapping,
} from './types';

/**
 * Internal node options type for building node properties
 */
interface NodeBuildOptions {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: SolidPaint[];
  strokes?: SolidPaint[];
  strokeWeight?: number;
  opacity?: number;
  cornerRadius?: number;
  effects?: DropShadowEffect[];
  rotation?: number;
  autoLayout?: AutoLayoutProps;
  characters?: string;
  textStyles?: Record<string, unknown>[];
  pluginData?: Record<string, unknown>;
}

// ============================================================================
// Composable Type Mappings
// ============================================================================

const COMPOSABLE_MAPPINGS: Record<string, ComposableToNodeMapping> = {
  // Layout
  Column: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  Row: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  Box: { nodeType: 'FRAME', autoLayoutMode: 'NONE', hasChildren: true },
  LazyColumn: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  LazyRow: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  LazyVerticalGrid: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  FlowRow: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  FlowColumn: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  ConstraintLayout: { nodeType: 'FRAME', autoLayoutMode: 'NONE', hasChildren: true },

  // Foundation
  Text: { nodeType: 'TEXT', hasChildren: false },
  BasicText: { nodeType: 'TEXT', hasChildren: false },
  Image: { nodeType: 'IMAGE', hasChildren: false },
  Icon: { nodeType: 'VECTOR', hasChildren: false },
  Canvas: { nodeType: 'VECTOR', hasChildren: false },
  Spacer: { nodeType: 'FRAME', hasChildren: false, defaultProps: { width: 0, height: 0 } },
  Divider: { nodeType: 'FRAME', hasChildren: false, defaultProps: { height: 1 } },

  // Material
  Surface: { nodeType: 'FRAME', autoLayoutMode: 'NONE', hasChildren: true },
  Card: { nodeType: 'FRAME', autoLayoutMode: 'NONE', hasChildren: true },
  Button: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  TextButton: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  OutlinedButton: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  IconButton: { nodeType: 'FRAME', hasChildren: true },
  FloatingActionButton: { nodeType: 'FRAME', hasChildren: true },
  TextField: { nodeType: 'FRAME', hasChildren: false },
  OutlinedTextField: { nodeType: 'FRAME', hasChildren: false },
  Checkbox: { nodeType: 'FRAME', hasChildren: false },
  RadioButton: { nodeType: 'FRAME', hasChildren: false },
  Switch: { nodeType: 'FRAME', hasChildren: false },
  Slider: { nodeType: 'FRAME', hasChildren: false },
  CircularProgressIndicator: { nodeType: 'FRAME', hasChildren: false },
  LinearProgressIndicator: { nodeType: 'FRAME', hasChildren: false },

  // Scaffold
  Scaffold: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  TopAppBar: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  BottomAppBar: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  NavigationBar: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  NavigationRail: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  ModalBottomSheet: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  ModalDrawer: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
};

// ============================================================================
// Mapper Class
// ============================================================================

/**
 * Maps Compose composables to DesignLibre nodes
 */
export class ComposeMapper {
  private sceneGraph: SceneGraph;
  private nodeCount = 0;
  private warnings: string[] = [];
  private codeControlledCount = 0;

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  /**
   * Map a parsed composable to a DesignLibre node
   */
  mapComposable(
    composable: ParsedComposable,
    parentId: NodeId,
    options: { x?: number; y?: number; scale?: number; preserveMetadata?: boolean } = {}
  ): NodeId {
    const { x = 0, y = 0, scale = 1, preserveMetadata = true } = options;

    // Get mapping for this composable type
    const mapping = COMPOSABLE_MAPPINGS[composable.name];
    if (!mapping) {
      // Custom composable - treat as FRAME
      this.warnings.push(`Unknown composable: ${composable.name}`);
      return this.createCustomComposableNode(composable, parentId, x, y, scale, preserveMetadata);
    }

    // Create the node
    const nodeId = this.createNodeForComposable(composable, mapping, parentId, x, y, scale, preserveMetadata);

    // Process children
    if (mapping.hasChildren && composable.children.length > 0) {
      let childX = 0;
      let childY = 0;
      const spacing = this.getArrangementSpacing(composable);

      for (const child of composable.children) {
        this.mapComposable(child, nodeId, { x: childX, y: childY, scale, preserveMetadata });

        if (mapping.autoLayoutMode === 'VERTICAL') {
          childY += 50 + spacing;
        } else if (mapping.autoLayoutMode === 'HORIZONTAL') {
          childX += 100 + spacing;
        }
      }
    }

    return nodeId;
  }

  /**
   * Create a node for a composable
   */
  private createNodeForComposable(
    composable: ParsedComposable,
    mapping: ComposableToNodeMapping,
    parentId: NodeId,
    x: number,
    y: number,
    scale: number,
    preserveMetadata: boolean
  ): NodeId {
    // Extract properties from modifiers
    const props = this.extractPropertiesFromModifiers(composable.modifiers, scale);
    const propertySources: Record<string, PropertySource> = {};

    // Track property sources
    for (const modifier of composable.modifiers) {
      for (const arg of modifier.arguments) {
        const propPath = this.getPropertyPathForModifier(modifier.name, arg.name);
        if (propPath) {
          propertySources[propPath] = arg.value.source;
          if (!arg.value.source.isEditable) {
            this.codeControlledCount++;
          }
        }
      }
    }

    // Build node options
    const nodeOptions: NodeBuildOptions = {
      name: this.getNodeName(composable),
      x: x + ((props['x'] as number) ?? 0),
      y: y + ((props['y'] as number) ?? 0),
      width: ((props['width'] as number) ?? this.getDefaultWidth(composable.name)) * scale,
      height: ((props['height'] as number) ?? this.getDefaultHeight(composable.name)) * scale,
    };

    // Merge default props
    if (mapping.defaultProps) {
      Object.assign(nodeOptions, mapping.defaultProps);
    }

    // Add appearance properties
    if (props['fills']) {
      nodeOptions.fills = props['fills'] as SolidPaint[];
    }
    if (props['opacity'] !== undefined) {
      nodeOptions.opacity = props['opacity'] as number;
    }
    if (props['cornerRadius'] !== undefined) {
      nodeOptions.cornerRadius = (props['cornerRadius'] as number) * scale;
    }
    if (props['effects']) {
      nodeOptions.effects = props['effects'] as DropShadowEffect[];
    }
    if (props['rotation'] !== undefined) {
      nodeOptions.rotation = props['rotation'] as number;
    }

    // Add auto layout for containers
    if (mapping.autoLayoutMode) {
      nodeOptions.autoLayout = this.createAutoLayout(mapping.autoLayoutMode, composable, scale);
    }

    // Add text content for Text composables
    if (composable.name === 'Text' || composable.name === 'BasicText') {
      const textContent = composable.parameters.get('text');
      if (textContent && typeof textContent.value === 'string') {
        nodeOptions.characters = textContent.value;
        propertySources['characters'] = textContent.source;
      }
      nodeOptions.textStyles = [this.extractTextStyles(composable, scale)];
    }

    // Add plugin data for sync
    if (preserveMetadata) {
      const metadata: CodeSourceMetadata = {
        framework: 'compose',
        sourceFile: composable.location.filePath,
        viewLocation: composable.location,
        viewType: composable.name,
        anchor: composable.anchor,
        propertySources,
        preservedBlocks: [],
        codeHash: '',
        lastSync: Date.now(),
        version: 1,
      };
      nodeOptions.pluginData = { [CODE_SOURCE_PLUGIN_KEY]: metadata };
    }

    // Create the node
    const nodeId = this.sceneGraph.createNode(
      mapping.nodeType as NodeType,
      parentId,
      -1,
      nodeOptions as unknown as Record<string, unknown>
    );
    this.nodeCount++;

    return nodeId;
  }

  /**
   * Create a node for a custom composable
   */
  private createCustomComposableNode(
    composable: ParsedComposable,
    parentId: NodeId,
    x: number,
    y: number,
    scale: number,
    preserveMetadata: boolean
  ): NodeId {
    const props = this.extractPropertiesFromModifiers(composable.modifiers, scale);

    const nodeOptions: NodeBuildOptions = {
      name: composable.name,
      x: x + ((props['x'] as number) ?? 0),
      y: y + ((props['y'] as number) ?? 0),
      width: ((props['width'] as number) ?? 100) * scale,
      height: ((props['height'] as number) ?? 100) * scale,
    };

    if (props['fills']) nodeOptions.fills = props['fills'] as SolidPaint[];
    if (props['opacity'] !== undefined) nodeOptions.opacity = props['opacity'] as number;

    if (preserveMetadata) {
      const metadata: CodeSourceMetadata = {
        framework: 'compose',
        sourceFile: composable.location.filePath,
        viewLocation: composable.location,
        viewType: composable.name,
        anchor: composable.anchor,
        propertySources: {},
        preservedBlocks: [],
        codeHash: '',
        lastSync: Date.now(),
        version: 1,
      };
      nodeOptions.pluginData = { [CODE_SOURCE_PLUGIN_KEY]: metadata };
    }

    const nodeId = this.sceneGraph.createNode('FRAME', parentId, -1, nodeOptions as unknown as Record<string, unknown>);
    this.nodeCount++;

    // Map children
    for (const child of composable.children) {
      this.mapComposable(child, nodeId, { scale, preserveMetadata });
    }

    return nodeId;
  }

  /**
   * Extract properties from modifiers
   */
  private extractPropertiesFromModifiers(
    modifiers: readonly ParsedComposeModifier[],
    scale: number
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    for (const modifier of modifiers) {
      switch (modifier.name) {
        case 'size': {
          const sizeArg = modifier.arguments[0]?.value;
          if (sizeArg && (sizeArg.type === 'dp' || typeof sizeArg.value === 'number')) {
            const size = typeof sizeArg.value === 'number' ? sizeArg.value : 0;
            props['width'] = size;
            props['height'] = size;
          }
          break;
        }

        case 'width': {
          const widthArg = modifier.arguments[0]?.value;
          if (widthArg && (widthArg.type === 'dp' || typeof widthArg.value === 'number')) {
            props['width'] = widthArg.value;
          }
          break;
        }

        case 'height': {
          const heightArg = modifier.arguments[0]?.value;
          if (heightArg && (heightArg.type === 'dp' || typeof heightArg.value === 'number')) {
            props['height'] = heightArg.value;
          }
          break;
        }

        case 'padding': {
          // Handled in auto layout
          break;
        }

        case 'background': {
          const colorArg = modifier.arguments[0]?.value;
          if (colorArg && colorArg.type === 'color' && colorArg.value) {
            props['fills'] = [this.createSolidPaint(colorArg.value as RGBA)];
          }
          break;
        }

        case 'clip': {
          // Look for RoundedCornerShape argument
          const shapeArg = modifier.arguments[0]?.value;
          if (shapeArg && shapeArg.rawExpression.includes('RoundedCornerShape')) {
            const radiusMatch = shapeArg.rawExpression.match(/(\d+)/);
            if (radiusMatch) {
              props['cornerRadius'] = parseInt(radiusMatch[1]!, 10);
            }
          }
          break;
        }

        case 'alpha': {
          const alphaArg = modifier.arguments[0]?.value;
          if (alphaArg && typeof alphaArg.value === 'number') {
            props['opacity'] = alphaArg.value;
          }
          break;
        }

        case 'rotate': {
          const rotateArg = modifier.arguments[0]?.value;
          if (rotateArg && typeof rotateArg.value === 'number') {
            props['rotation'] = rotateArg.value;
          }
          break;
        }

        case 'offset': {
          for (const arg of modifier.arguments) {
            if (arg.name === 'x' && typeof arg.value.value === 'number') {
              props['x'] = arg.value.value * scale;
            }
            if (arg.name === 'y' && typeof arg.value.value === 'number') {
              props['y'] = arg.value.value * scale;
            }
          }
          break;
        }

        case 'shadow': {
          const effect = this.parseShadowModifier(modifier, scale);
          if (effect) {
            props['effects'] = [effect];
          }
          break;
        }

        case 'border': {
          const widthArg = modifier.arguments.find(a => !a.name || a.name === 'width');
          const colorArg = modifier.arguments.find(a => a.name === 'color');
          if (widthArg && typeof widthArg.value.value === 'number') {
            props['strokeWeight'] = widthArg.value.value * scale;
          }
          if (colorArg && colorArg.value.type === 'color' && colorArg.value.value) {
            props['strokes'] = [this.createSolidPaint(colorArg.value.value as RGBA)];
          }
          break;
        }
      }
    }

    return props;
  }

  /**
   * Parse shadow modifier to effect
   */
  private parseShadowModifier(modifier: ParsedComposeModifier, scale: number): DropShadowEffect | null {
    let elevation = 4;

    for (const arg of modifier.arguments) {
      if ((!arg.name || arg.name === 'elevation') && typeof arg.value.value === 'number') {
        elevation = arg.value.value;
      }
    }

    return {
      type: 'DROP_SHADOW',
      visible: true,
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      offset: { x: 0, y: elevation * 0.5 * scale },
      radius: elevation * scale,
      spread: 0,
    };
  }

  /**
   * Extract text styles from composable
   */
  private extractTextStyles(composable: ParsedComposable, scale: number): Record<string, unknown> {
    const styles: Record<string, unknown> = {
      fontFamily: 'Roboto',
      fontSize: 14 * scale,
      fontWeight: 400,
      fills: [this.createSolidPaint({ r: 0, g: 0, b: 0, a: 1 })],
    };

    // Check parameters for style info
    const styleParam = composable.parameters.get('style');
    if (styleParam && styleParam.rawExpression) {
      // Parse MaterialTheme.typography.* styles
      const typographyMatch = styleParam.rawExpression.match(/MaterialTheme\.typography\.(\w+)/);
      if (typographyMatch) {
        const styleName = typographyMatch[1]!;
        const typographySizes: Record<string, number> = {
          displayLarge: 57, displayMedium: 45, displaySmall: 36,
          headlineLarge: 32, headlineMedium: 28, headlineSmall: 24,
          titleLarge: 22, titleMedium: 16, titleSmall: 14,
          bodyLarge: 16, bodyMedium: 14, bodySmall: 12,
          labelLarge: 14, labelMedium: 12, labelSmall: 11,
        };
        const size = typographySizes[styleName];
        if (size) styles['fontSize'] = size * scale;
      }
    }

    // Check for color parameter
    const colorParam = composable.parameters.get('color');
    if (colorParam && colorParam.type === 'color' && colorParam.value) {
      styles['fills'] = [this.createSolidPaint(colorParam.value as RGBA)];
    }

    // Check for fontSize parameter
    const fontSizeParam = composable.parameters.get('fontSize');
    if (fontSizeParam && (fontSizeParam.type === 'sp' || typeof fontSizeParam.value === 'number')) {
      styles['fontSize'] = (fontSizeParam.value as number) * scale;
    }

    // Check for fontWeight parameter
    const fontWeightParam = composable.parameters.get('fontWeight');
    if (fontWeightParam && fontWeightParam.rawExpression) {
      const weightMatch = fontWeightParam.rawExpression.match(/FontWeight\.(\w+)/);
      if (weightMatch) {
        const weights: Record<string, number> = {
          Thin: 100, ExtraLight: 200, Light: 300, Normal: 400,
          Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800, Black: 900,
        };
        styles['fontWeight'] = weights[weightMatch[1]!] ?? 400;
      }
    }

    return styles;
  }

  /**
   * Create auto layout props
   */
  private createAutoLayout(
    mode: 'NONE' | 'HORIZONTAL' | 'VERTICAL',
    composable: ParsedComposable,
    scale: number
  ): AutoLayoutProps {
    const spacing = this.getArrangementSpacing(composable) * scale;
    const padding = this.getPaddingFromModifiers(composable.modifiers) * scale;

    return {
      mode,
      itemSpacing: spacing,
      paddingTop: padding,
      paddingRight: padding,
      paddingBottom: padding,
      paddingLeft: padding,
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'MIN',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
      wrap: false,
    };
  }

  /**
   * Get spacing from arrangement parameter
   */
  private getArrangementSpacing(composable: ParsedComposable): number {
    // Check verticalArrangement or horizontalArrangement parameter
    const arrangement = composable.parameters.get('verticalArrangement') ??
                       composable.parameters.get('horizontalArrangement');
    if (arrangement && arrangement.rawExpression) {
      const spacingMatch = arrangement.rawExpression.match(/spacedBy\((\d+)/);
      if (spacingMatch) {
        return parseInt(spacingMatch[1]!, 10);
      }
    }
    return 0;
  }

  /**
   * Get padding from modifiers
   */
  private getPaddingFromModifiers(modifiers: readonly ParsedComposeModifier[]): number {
    const paddingModifier = modifiers.find(m => m.name === 'padding');
    if (paddingModifier) {
      const allArg = paddingModifier.arguments.find(a => a.name === 'all' || !a.name);
      if (allArg && typeof allArg.value.value === 'number') {
        return allArg.value.value;
      }
    }
    return 0;
  }

  /**
   * Get property path for a modifier
   */
  private getPropertyPathForModifier(modifierName: string, argName?: string): string | null {
    const mappings: Record<string, Record<string, string>> = {
      size: { '': 'width' },
      width: { '': 'width' },
      height: { '': 'height' },
      padding: { '': 'autoLayout.padding' },
      background: { '': 'fills[0]' },
      clip: { '': 'cornerRadius' },
      alpha: { '': 'opacity' },
      rotate: { '': 'rotation' },
      offset: { x: 'x', y: 'y' },
      shadow: { '': 'effects[0]' },
    };

    const modifierMap = mappings[modifierName];
    if (!modifierMap) return null;

    return modifierMap[argName ?? ''] ?? null;
  }

  /**
   * Create solid paint
   */
  private createSolidPaint(color: RGBA): SolidPaint {
    return {
      type: 'SOLID',
      visible: true,
      color,
      opacity: 1,
    };
  }

  /**
   * Get default width for a composable
   */
  private getDefaultWidth(name: string): number {
    const defaults: Record<string, number> = {
      Text: 100,
      BasicText: 100,
      Image: 100,
      Icon: 24,
      Button: 120,
      TextField: 200,
      OutlinedTextField: 200,
      Divider: 300,
      Spacer: 0,
    };
    return defaults[name] ?? 200;
  }

  /**
   * Get default height for a composable
   */
  private getDefaultHeight(name: string): number {
    const defaults: Record<string, number> = {
      Text: 24,
      BasicText: 24,
      Image: 100,
      Icon: 24,
      Button: 40,
      TextField: 56,
      OutlinedTextField: 56,
      Divider: 1,
      Spacer: 0,
      TopAppBar: 64,
      BottomAppBar: 80,
      NavigationBar: 80,
    };
    return defaults[name] ?? 200;
  }

  /**
   * Get node name from composable
   */
  private getNodeName(composable: ParsedComposable): string {
    if (composable.name === 'Text' || composable.name === 'BasicText') {
      const textContent = composable.parameters.get('text');
      if (textContent && typeof textContent.value === 'string') {
        return textContent.value.slice(0, 30);
      }
    }
    return composable.name;
  }

  /**
   * Get mapping stats
   */
  getStats(): { nodeCount: number; warnings: string[]; codeControlledCount: number } {
    return {
      nodeCount: this.nodeCount,
      warnings: this.warnings,
      codeControlledCount: this.codeControlledCount,
    };
  }

  /**
   * Reset stats
   */
  reset(): void {
    this.nodeCount = 0;
    this.warnings = [];
    this.codeControlledCount = 0;
  }
}

/**
 * Create a Compose mapper instance
 */
export function createComposeMapper(sceneGraph: SceneGraph): ComposeMapper {
  return new ComposeMapper(sceneGraph);
}
