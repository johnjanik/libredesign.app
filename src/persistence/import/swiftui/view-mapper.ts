/**
 * SwiftUI View Mapper
 *
 * Maps parsed SwiftUI views to DesignLibre scene graph nodes.
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
  ParsedSwiftUIView,
  ParsedModifier,
  ViewToNodeMapping,
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
// View Type Mappings
// ============================================================================

const VIEW_MAPPINGS: Record<string, ViewToNodeMapping> = {
  // Layout containers
  VStack: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  HStack: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  ZStack: { nodeType: 'FRAME', autoLayoutMode: 'NONE', hasChildren: true },
  LazyVStack: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  LazyHStack: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  ScrollView: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  List: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  Form: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  Group: { nodeType: 'GROUP', hasChildren: true },
  Section: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  NavigationStack: { nodeType: 'FRAME', autoLayoutMode: 'VERTICAL', hasChildren: true },
  NavigationView: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  TabView: { nodeType: 'FRAME', autoLayoutMode: 'NONE', hasChildren: true },
  GeometryReader: { nodeType: 'FRAME', autoLayoutMode: 'NONE', hasChildren: true },

  // Basic views
  Text: { nodeType: 'TEXT', hasChildren: false },
  Image: { nodeType: 'IMAGE', hasChildren: false },
  Rectangle: { nodeType: 'FRAME', hasChildren: false, defaultProps: { cornerRadius: 0 } },
  RoundedRectangle: { nodeType: 'FRAME', hasChildren: false },
  Circle: { nodeType: 'VECTOR', hasChildren: false },
  Ellipse: { nodeType: 'VECTOR', hasChildren: false },
  Capsule: { nodeType: 'FRAME', hasChildren: false },
  Path: { nodeType: 'VECTOR', hasChildren: false },

  // Controls
  Button: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: true },
  Toggle: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: false },
  Slider: { nodeType: 'FRAME', hasChildren: false },
  TextField: { nodeType: 'FRAME', hasChildren: false },
  TextEditor: { nodeType: 'FRAME', hasChildren: false },
  Picker: { nodeType: 'FRAME', hasChildren: true },
  DatePicker: { nodeType: 'FRAME', hasChildren: false },
  Stepper: { nodeType: 'FRAME', autoLayoutMode: 'HORIZONTAL', hasChildren: false },
  Link: { nodeType: 'FRAME', hasChildren: true },

  // Utilities
  Spacer: { nodeType: 'FRAME', hasChildren: false, defaultProps: { width: 0, height: 0 } },
  Divider: { nodeType: 'FRAME', hasChildren: false, defaultProps: { height: 1 } },
  Color: { nodeType: 'FRAME', hasChildren: false },
  ForEach: { nodeType: 'GROUP', hasChildren: true },
  EmptyView: { nodeType: 'FRAME', hasChildren: false },
};

// ============================================================================
// View Mapper Class
// ============================================================================

/**
 * Maps SwiftUI views to DesignLibre nodes
 */
export class SwiftUIViewMapper {
  private sceneGraph: SceneGraph;
  private nodeCount = 0;
  private warnings: string[] = [];
  private codeControlledCount = 0;

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  /**
   * Map a parsed SwiftUI view to a DesignLibre node
   */
  mapView(
    view: ParsedSwiftUIView,
    parentId: NodeId,
    options: { x?: number; y?: number; scale?: number; preserveMetadata?: boolean } = {}
  ): NodeId {
    const { x = 0, y = 0, scale = 1, preserveMetadata = true } = options;

    // Get mapping for this view type
    const mapping = VIEW_MAPPINGS[view.viewType];
    if (!mapping) {
      // Custom view - treat as FRAME
      this.warnings.push(`Unknown view type: ${view.viewType}`);
      return this.createCustomViewNode(view, parentId, x, y, scale, preserveMetadata);
    }

    // Create the node based on type
    const nodeId = this.createNodeForView(view, mapping, parentId, x, y, scale, preserveMetadata);

    // Process children
    if (mapping.hasChildren && view.children.length > 0) {
      let childX = 0;
      let childY = 0;
      const spacing = this.getSpacingFromView(view);

      // For ZStack, pre-calculate child sizes to enable centering
      let parentWidth = 0;
      let parentHeight = 0;
      const childSizes: { width: number; height: number }[] = [];

      if (mapping.autoLayoutMode === 'NONE' || !mapping.autoLayoutMode) {
        // Calculate each child's size from its modifiers
        for (const child of view.children) {
          const childProps = this.extractPropertiesFromModifiers(child.modifiers, scale);
          const childWidth = (childProps['width'] as number) ?? this.getDefaultWidth(child.viewType) * scale;
          const childHeight = (childProps['height'] as number) ?? this.getDefaultHeight(child.viewType) * scale;
          childSizes.push({ width: childWidth, height: childHeight });
          parentWidth = Math.max(parentWidth, childWidth);
          parentHeight = Math.max(parentHeight, childHeight);
        }
        // Add padding to parent dimensions
        const parentPadding = this.getPaddingFromView(view) * scale;
        parentWidth += parentPadding * 2;
        parentHeight += parentPadding * 2;

        // Update ZStack's size to match its content (if no explicit frame)
        const parentProps = this.extractPropertiesFromModifiers(view.modifiers, scale);
        if (parentProps['width'] === undefined && parentProps['height'] === undefined) {
          this.sceneGraph.updateNode(nodeId, { width: parentWidth, height: parentHeight });
        }
      }

      for (let i = 0; i < view.children.length; i++) {
        const child = view.children[i]!;
        // For ZStack (autoLayoutMode NONE), center children
        let offsetX = childX;
        let offsetY = childY;
        if (mapping.autoLayoutMode === 'NONE' || !mapping.autoLayoutMode) {
          const childSize = childSizes[i]!;
          const childPadding = this.getPaddingFromModifiers(child.modifiers) * scale;
          // Center the child within the parent
          offsetX = (parentWidth - childSize.width) / 2 + childPadding;
          offsetY = (parentHeight - childSize.height) / 2 + childPadding;
        }

        this.mapView(child, nodeId, { x: offsetX, y: offsetY, scale, preserveMetadata });

        // Update position for next child (simplified - actual layout handled by engine)
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
   * Create a node for a specific view type
   */
  private createNodeForView(
    view: ParsedSwiftUIView,
    mapping: ViewToNodeMapping,
    parentId: NodeId,
    x: number,
    y: number,
    scale: number,
    preserveMetadata: boolean
  ): NodeId {
    // Extract properties from modifiers
    const props = this.extractPropertiesFromModifiers(view.modifiers, scale);
    const propertySources: Record<string, PropertySource> = {};

    // Track property sources
    for (const modifier of view.modifiers) {
      for (const arg of modifier.arguments) {
        const propPath = this.getPropertyPathForModifier(modifier.name, arg.label);
        if (propPath) {
          propertySources[propPath] = arg.value.source;
          if (!arg.value.source.isEditable) {
            this.codeControlledCount++;
          }
        }
      }
    }

    // Build node options
    console.log('[DEBUG nodeOptions] viewType:', view.viewType, 'props:', JSON.stringify(props));
    const nodeOptions: NodeBuildOptions = {
      name: this.getNodeName(view),
      x: x + ((props['x'] as number) ?? 0),
      y: y + ((props['y'] as number) ?? 0),
      width: ((props['width'] as number) ?? this.getDefaultWidth(view.viewType)) * scale,
      height: ((props['height'] as number) ?? this.getDefaultHeight(view.viewType)) * scale,
      ...mapping.defaultProps,
    };
    console.log('[DEBUG nodeOptions] final:', view.viewType, 'width:', nodeOptions.width, 'height:', nodeOptions.height);

    // Add appearance properties
    if (props['fills']) {
      nodeOptions.fills = props['fills'] as SolidPaint[];
      console.log('[DEBUG] Applying fills to', view.viewType, ':', JSON.stringify(props['fills']));
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
      nodeOptions.autoLayout = this.createAutoLayout(mapping.autoLayoutMode, view, scale);
    }

    // Add text content for Text nodes
    if (view.viewType === 'Text') {
      const textContent = view.properties.get('content');
      if (textContent && typeof textContent.value === 'string') {
        nodeOptions.characters = textContent.value;
        propertySources['characters'] = textContent.source;
      }
      // Add text styling from modifiers
      nodeOptions.textStyles = [this.extractTextStyles(view.modifiers, scale)];
    }

    // Add plugin data for sync
    if (preserveMetadata) {
      const metadata: CodeSourceMetadata = {
        framework: 'swiftui',
        sourceFile: view.location.filePath,
        viewLocation: view.location,
        viewType: view.viewType,
        anchor: view.anchor,
        propertySources,
        preservedBlocks: [],
        codeHash: '',
        lastSync: Date.now(),
        version: 1,
      };
      nodeOptions.pluginData = { [CODE_SOURCE_PLUGIN_KEY]: metadata };
    }

    // Create the node
    console.log('[DEBUG createNode] type:', mapping.nodeType, 'fills:', JSON.stringify(nodeOptions.fills));
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
   * Create a node for a custom/unknown view
   */
  private createCustomViewNode(
    view: ParsedSwiftUIView,
    parentId: NodeId,
    x: number,
    y: number,
    scale: number,
    preserveMetadata: boolean
  ): NodeId {
    const props = this.extractPropertiesFromModifiers(view.modifiers, scale);

    const nodeOptions: NodeBuildOptions = {
      name: view.customViewName ?? view.viewType,
      x: x + ((props['x'] as number) ?? 0),
      y: y + ((props['y'] as number) ?? 0),
      width: ((props['width'] as number) ?? 100) * scale,
      height: ((props['height'] as number) ?? 100) * scale,
    };

    if (props['fills']) nodeOptions.fills = props['fills'] as SolidPaint[];
    if (props['opacity'] !== undefined) nodeOptions.opacity = props['opacity'] as number;

    if (preserveMetadata) {
      const metadata: CodeSourceMetadata = {
        framework: 'swiftui',
        sourceFile: view.location.filePath,
        viewLocation: view.location,
        viewType: view.viewType,
        anchor: view.anchor,
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
    for (const child of view.children) {
      this.mapView(child, nodeId, { scale, preserveMetadata });
    }

    return nodeId;
  }

  /**
   * Extract properties from modifiers
   */
  private extractPropertiesFromModifiers(
    modifiers: readonly ParsedModifier[],
    scale: number
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    console.log('[DEBUG extractProps] all modifiers:', modifiers.map(m => m.name));

    for (const modifier of modifiers) {
      console.log('[DEBUG extractProps] processing modifier:', modifier.name, 'args:', modifier.arguments.length);
      switch (modifier.name) {
        case 'frame': {
          console.log('[DEBUG frame] args:', JSON.stringify(modifier.arguments, null, 2));
          for (const arg of modifier.arguments) {
            console.log('[DEBUG frame arg]', arg.label, arg.value.type, arg.value.value);
            if (arg.label === 'width' && typeof arg.value.value === 'number') {
              props['width'] = arg.value.value;
            }
            if (arg.label === 'height' && typeof arg.value.value === 'number') {
              props['height'] = arg.value.value;
            }
            if (arg.label === 'minWidth' && typeof arg.value.value === 'number') {
              props['minWidth'] = arg.value.value;
            }
            if (arg.label === 'maxWidth' && typeof arg.value.value === 'number') {
              props['maxWidth'] = arg.value.value;
            }
          }
          break;
        }

        case 'padding': {
          const paddingValue = modifier.arguments[0]?.value;
          if (paddingValue && typeof paddingValue.value === 'number') {
            props['padding'] = paddingValue.value * scale;
          }
          break;
        }

        case 'background':
        case 'foregroundColor':
        case 'foregroundStyle':
        case 'tint':
        case 'fill': {
          console.log('[DEBUG fill/bg] modifier:', modifier.name, 'arguments:', modifier.arguments.length);
          const colorArg = modifier.arguments[0]?.value;
          console.log('[DEBUG fill/bg]', modifier.name, 'colorArg:', JSON.stringify(colorArg, null, 2));
          if (colorArg && colorArg.type === 'color') {
            if (colorArg.value) {
              // Color with resolved RGBA
              const paint = this.createSolidPaint(colorArg.value as RGBA);
              props['fills'] = [paint];
              console.log('[DEBUG] Created paint:', JSON.stringify(paint));
            } else {
              // Asset color or unresolved - use placeholder magenta
              const placeholderPaint = this.createSolidPaint({ r: 1, g: 0, b: 1, a: 0.5 });
              props['fills'] = [placeholderPaint];
              // Log for debugging
              console.warn(`Unresolved color: ${colorArg.source?.originalExpression ?? 'unknown'}`);
            }
          } else {
            console.log('[DEBUG] colorArg not a color type:', colorArg?.type, 'rawExpression:', colorArg?.rawExpression);
            // Use placeholder magenta for unparseable colors
            const placeholderPaint = this.createSolidPaint({ r: 1, g: 0, b: 1, a: 0.5 });
            props['fills'] = [placeholderPaint];
            console.warn(`Could not parse color: ${colorArg?.rawExpression ?? 'unknown'}`);
          }
          break;
        }

        case 'cornerRadius': {
          const radiusArg = modifier.arguments[0]?.value;
          if (radiusArg && typeof radiusArg.value === 'number') {
            props['cornerRadius'] = radiusArg.value;
          }
          break;
        }

        case 'opacity': {
          const opacityArg = modifier.arguments[0]?.value;
          if (opacityArg && typeof opacityArg.value === 'number') {
            props['opacity'] = opacityArg.value;
          }
          break;
        }

        case 'rotationEffect': {
          const rotationArg = modifier.arguments[0]?.value;
          // SwiftUI uses .degrees() or radians
          if (rotationArg && typeof rotationArg.value === 'number') {
            props['rotation'] = rotationArg.value;
          }
          break;
        }

        case 'offset': {
          for (const arg of modifier.arguments) {
            if (arg.label === 'x' && typeof arg.value.value === 'number') {
              props['x'] = arg.value.value * scale;
            }
            if (arg.label === 'y' && typeof arg.value.value === 'number') {
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

        case 'blur': {
          const radiusArg = modifier.arguments.find(a => a.label === 'radius' || !a.label);
          if (radiusArg && typeof radiusArg.value.value === 'number') {
            props['effects'] = [{
              type: 'LAYER_BLUR',
              visible: true,
              radius: radiusArg.value.value * scale,
            }];
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
  private parseShadowModifier(modifier: ParsedModifier, scale: number): DropShadowEffect | null {
    let color: RGBA = { r: 0, g: 0, b: 0, a: 0.33 };
    let radius = 10;
    let x = 0;
    let y = 4;

    for (const arg of modifier.arguments) {
      if (arg.label === 'color' && arg.value.type === 'color' && arg.value.value) {
        color = arg.value.value as RGBA;
      }
      if (arg.label === 'radius' && typeof arg.value.value === 'number') {
        radius = arg.value.value;
      }
      if (arg.label === 'x' && typeof arg.value.value === 'number') {
        x = arg.value.value;
      }
      if (arg.label === 'y' && typeof arg.value.value === 'number') {
        y = arg.value.value;
      }
    }

    return {
      type: 'DROP_SHADOW',
      visible: true,
      color,
      offset: { x: x * scale, y: y * scale },
      radius: radius * scale,
      spread: 0,
    };
  }

  /**
   * Extract text styles from modifiers
   */
  private extractTextStyles(modifiers: readonly ParsedModifier[], scale: number): Record<string, unknown> {
    const styles: Record<string, unknown> = {
      fontFamily: 'SF Pro',
      fontSize: 17 * scale,
      fontWeight: 400,
      fills: [this.createSolidPaint({ r: 0, g: 0, b: 0, a: 1 })],
    };

    for (const modifier of modifiers) {
      if (modifier.name === 'font') {
        const fontArg = modifier.arguments[0]?.value;
        if (fontArg?.type === 'font' && typeof fontArg.value === 'number') {
          styles['fontSize'] = fontArg.value * scale;
        }
        // Handle semantic fonts
        if (fontArg?.type === 'enum') {
          const semanticSizes: Record<string, number> = {
            largeTitle: 34, title: 28, title2: 22, title3: 20,
            headline: 17, body: 17, callout: 16, subheadline: 15,
            footnote: 13, caption: 12, caption2: 11,
          };
          const size = semanticSizes[fontArg.value as string];
          if (size) styles['fontSize'] = size * scale;
        }
      }

      if (modifier.name === 'fontWeight') {
        const weightArg = modifier.arguments[0]?.value;
        if (weightArg?.type === 'enum') {
          const weights: Record<string, number> = {
            ultraLight: 100, thin: 200, light: 300, regular: 400,
            medium: 500, semibold: 600, bold: 700, heavy: 800, black: 900,
          };
          styles['fontWeight'] = weights[weightArg.value as string] ?? 400;
        }
      }

      if (modifier.name === 'foregroundColor' || modifier.name === 'foregroundStyle') {
        const colorArg = modifier.arguments[0]?.value;
        if (colorArg?.type === 'color' && colorArg.value) {
          styles['fills'] = [this.createSolidPaint(colorArg.value as RGBA)];
        }
      }
    }

    return styles;
  }

  /**
   * Create auto layout props for a container
   */
  private createAutoLayout(
    mode: 'NONE' | 'HORIZONTAL' | 'VERTICAL',
    view: ParsedSwiftUIView,
    scale: number
  ): AutoLayoutProps {
    const spacing = this.getSpacingFromView(view) * scale;
    const padding = this.getPaddingFromView(view) * scale;

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
   * Get spacing from view properties or modifiers
   */
  private getSpacingFromView(view: ParsedSwiftUIView): number {
    const spacingProp = view.properties.get('spacing');
    if (spacingProp && typeof spacingProp.value === 'number') {
      return spacingProp.value;
    }
    return 8; // Default SwiftUI spacing
  }

  /**
   * Get padding from view modifiers
   */
  private getPaddingFromView(view: ParsedSwiftUIView): number {
    return this.getPaddingFromModifiers(view.modifiers);
  }

  /**
   * Get padding from modifiers array
   */
  private getPaddingFromModifiers(modifiers: readonly ParsedModifier[]): number {
    const paddingModifier = modifiers.find(m => m.name === 'padding');
    if (paddingModifier) {
      const arg = paddingModifier.arguments[0];
      if (arg && typeof arg.value.value === 'number') {
        return arg.value.value;
      }
    }
    return 0;
  }

  /**
   * Get property path for a modifier
   */
  private getPropertyPathForModifier(modifierName: string, argLabel?: string): string | null {
    const mappings: Record<string, Record<string, string>> = {
      frame: { width: 'width', height: 'height' },
      padding: { '': 'autoLayout.padding' },
      background: { '': 'fills[0]' },
      foregroundColor: { '': 'fills[0]' },
      cornerRadius: { '': 'cornerRadius' },
      opacity: { '': 'opacity' },
      rotationEffect: { '': 'rotation' },
      offset: { x: 'x', y: 'y' },
      shadow: { '': 'effects[0]' },
    };

    const modifierMap = mappings[modifierName];
    if (!modifierMap) return null;

    return modifierMap[argLabel ?? ''] ?? null;
  }

  /**
   * Create a solid paint
   */
  private createSolidPaint(color: RGBA): SolidPaint {
    return {
      type: 'SOLID',
      visible: true,
      // Store RGB in color, use alpha as paint opacity
      color: { r: color.r, g: color.g, b: color.b, a: 1 },
      opacity: color.a,
    };
  }

  /**
   * Get default width for a view type
   */
  private getDefaultWidth(viewType: string): number {
    const defaults: Record<string, number> = {
      Text: 100,
      Image: 100,
      Button: 120,
      TextField: 200,
      Slider: 200,
      Divider: 300,
      Spacer: 0,
    };
    return defaults[viewType] ?? 200;
  }

  /**
   * Get default height for a view type
   */
  private getDefaultHeight(viewType: string): number {
    const defaults: Record<string, number> = {
      Text: 24,
      Image: 100,
      Button: 44,
      TextField: 44,
      Slider: 44,
      Divider: 1,
      Spacer: 0,
    };
    return defaults[viewType] ?? 200;
  }

  /**
   * Get node name from view
   */
  private getNodeName(view: ParsedSwiftUIView): string {
    if (view.viewType === 'Text') {
      const content = view.properties.get('content');
      if (content && typeof content.value === 'string') {
        return content.value.slice(0, 30);
      }
    }
    return view.customViewName ?? view.viewType;
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
 * Create a view mapper instance
 */
export function createSwiftUIViewMapper(sceneGraph: SceneGraph): SwiftUIViewMapper {
  return new SwiftUIViewMapper(sceneGraph);
}
