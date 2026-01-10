/**
 * iOS Code Generator
 *
 * Generate Swift and Objective-C code from scene graph nodes.
 */

import type { NodeId } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { VectorPath } from '@core/types/geometry';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData, FrameNodeData, VectorNodeData, TextNodeData } from '@scene/nodes/base-node';
import { formatNum } from './format-utils';
import { getSemanticMetadata, type SemanticMetadata } from '@core/types/semantic-schema';

/**
 * iOS code generation options
 */
export interface IOSCodeGeneratorOptions {
  /** Output language (default: 'swift') */
  language?: 'swift' | 'objc' | undefined;
  /** Use SwiftUI or UIKit (default: 'swiftui' for swift, 'uikit' for objc) */
  framework?: 'swiftui' | 'uikit' | undefined;
  /** Class/struct name prefix (default: '') */
  prefix?: string | undefined;
  /** Include preview provider (default: true, SwiftUI only) */
  includePreview?: boolean | undefined;
  /** Use extensions for colors (default: true) */
  useColorExtension?: boolean | undefined;
  /** Include comments (default: true) */
  includeComments?: boolean | undefined;
  /** Use design tokens instead of hardcoded values (default: false) */
  useTokens?: boolean | undefined;
  /** Token prefix for generated references (default: 'DesignTokens') */
  tokenPrefix?: string | undefined;
}

/**
 * iOS code generation result
 */
export interface IOSCodeGeneratorResult {
  /** Generated code */
  readonly code: string;
  /** Color extension code */
  readonly colorExtension: string;
  /** File extension */
  readonly extension: string;
  /** Blob for download */
  readonly blob: Blob;
  /** Download URL */
  readonly url: string;
}

/**
 * iOS Code Generator
 */
export class IOSCodeGenerator {
  private sceneGraph: SceneGraph;
  private colorIndex = 0;
  private extractedColors: Map<string, { name: string; rgba: RGBA }> = new Map();
  private useTokens = false;
  private tokenPrefix = 'DesignTokens';

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  /**
   * Generate iOS code for a node.
   */
  generate(nodeId: NodeId, options: IOSCodeGeneratorOptions = {}): IOSCodeGeneratorResult {
    const language = options.language ?? 'swift';
    const framework = options.framework ?? (language === 'swift' ? 'swiftui' : 'uikit');
    const prefix = options.prefix ?? '';
    const includePreview = options.includePreview ?? true;
    const useColorExtension = options.useColorExtension ?? true;
    const includeComments = options.includeComments ?? true;

    // Store token options for use in helper methods
    this.useTokens = options.useTokens ?? false;
    this.tokenPrefix = options.tokenPrefix ?? 'DesignTokens';

    // Reset extraction state
    this.colorIndex = 0;
    this.extractedColors.clear();

    // Extract colors first
    this.extractColors(nodeId);

    const node = this.sceneGraph.getNode(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    let code: string;
    let colorExtension: string;

    if (language === 'swift') {
      if (framework === 'swiftui') {
        code = this.generateSwiftUI(nodeId, prefix, includePreview, includeComments);
        colorExtension = useColorExtension ? this.generateSwiftColorExtension() : '';
      } else {
        code = this.generateUIKit(nodeId, prefix, includeComments);
        colorExtension = useColorExtension ? this.generateUIKitColorExtension() : '';
      }
    } else {
      code = this.generateObjC(nodeId, prefix, includeComments);
      colorExtension = useColorExtension ? this.generateObjCColorExtension() : '';
    }

    const ext = language === 'swift' ? 'swift' : 'm';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    return {
      code,
      colorExtension,
      extension: ext,
      blob,
      url,
    };
  }

  /**
   * Download the generated code.
   */
  download(
    nodeId: NodeId,
    filename?: string,
    options: IOSCodeGeneratorOptions = {}
  ): void {
    const result = this.generate(nodeId, options);
    const ext = result.extension;
    const finalFilename = filename ?? `DesignLibreView.${ext}`;

    const link = document.createElement('a');
    link.href = result.url;
    link.download = finalFilename;
    link.click();

    URL.revokeObjectURL(result.url);
  }

  // =========================================================================
  // Swift/SwiftUI Generation
  // =========================================================================

  private generateSwiftUI(
    nodeId: NodeId,
    prefix: string,
    includePreview: boolean,
    includeComments: boolean
  ): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const structName = `${prefix}${this.sanitizeName(node.name || node.type)}View`;

    const parts: string[] = [];

    // Header comment
    if (includeComments) {
      parts.push('// Generated by DesignLibre');
      parts.push('// Do not modify directly');
      parts.push('');
    }

    parts.push('import SwiftUI');
    parts.push('');

    // Main struct
    parts.push(`struct ${structName}: View {`);
    parts.push('    var body: some View {');
    parts.push(this.generateSwiftUIBody(nodeId, 8));
    parts.push('    }');
    parts.push('}');

    // Preview provider
    if (includePreview) {
      parts.push('');
      parts.push(`#Preview {`);
      parts.push(`    ${structName}()`);
      parts.push('}');
    }

    return parts.join('\n');
  }

  private generateSwiftUIBody(nodeId: NodeId, indent: number): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    switch (node.type) {
      case 'FRAME':
        parts.push(this.generateSwiftUIFrame(node as FrameNodeData, nodeId, indent));
        break;
      case 'VECTOR':
        parts.push(this.generateSwiftUIVector(node as VectorNodeData, indent));
        break;
      case 'TEXT':
        parts.push(this.generateSwiftUIText(node as TextNodeData, indent));
        break;
      case 'GROUP':
        parts.push(this.generateSwiftUIGroup(nodeId, indent));
        break;
      default:
        // Generic container
        parts.push(`${spaces}EmptyView()`);
    }

    return parts.join('\n');
  }

  private generateSwiftUIFrame(
    node: FrameNodeData,
    nodeId: NodeId,
    indent: number
  ): string {
    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    const childIds = this.sceneGraph.getChildIds(nodeId);
    const hasChildren = childIds.length > 0;

    // Determine layout
    const isHorizontal = node.autoLayout?.mode === 'HORIZONTAL';
    const isVertical = node.autoLayout?.mode === 'VERTICAL';
    const isSpaceBetween = node.autoLayout?.primaryAxisAlignItems === 'SPACE_BETWEEN';

    if (hasChildren) {
      if (isHorizontal) {
        const alignment = this.getSwiftUICounterAxisAlignment(node.autoLayout?.counterAxisAlignItems, 'horizontal');
        const spacing = isSpaceBetween ? '0' : String(node.autoLayout?.itemSpacing ?? 0);
        parts.push(`${spaces}HStack(alignment: ${alignment}, spacing: ${spacing}) {`);

        // Insert Spacer() between children for SPACE_BETWEEN
        if (isSpaceBetween) {
          for (let i = 0; i < childIds.length; i++) {
            if (i > 0) {
              parts.push(`${spaces}    Spacer()`);
            }
            parts.push(this.generateSwiftUIBody(childIds[i]!, indent + 4));
          }
        } else {
          for (const childId of childIds) {
            parts.push(this.generateSwiftUIBody(childId, indent + 4));
          }
        }
      } else if (isVertical) {
        const alignment = this.getSwiftUICounterAxisAlignment(node.autoLayout?.counterAxisAlignItems, 'vertical');
        const spacing = isSpaceBetween ? '0' : String(node.autoLayout?.itemSpacing ?? 0);
        parts.push(`${spaces}VStack(alignment: ${alignment}, spacing: ${spacing}) {`);

        // Insert Spacer() between children for SPACE_BETWEEN
        if (isSpaceBetween) {
          for (let i = 0; i < childIds.length; i++) {
            if (i > 0) {
              parts.push(`${spaces}    Spacer()`);
            }
            parts.push(this.generateSwiftUIBody(childIds[i]!, indent + 4));
          }
        } else {
          for (const childId of childIds) {
            parts.push(this.generateSwiftUIBody(childId, indent + 4));
          }
        }
      } else {
        // No auto-layout - use ZStack with absolute positioning
        // Use .topLeading alignment so positions are relative to top-left corner
        parts.push(`${spaces}ZStack(alignment: .topLeading) {`);
        for (const childId of childIds) {
          const childNode = this.sceneGraph.getNode(childId);

          // Check if child needs absolute positioning
          if (childNode && 'x' in childNode && 'y' in childNode && 'width' in childNode && 'height' in childNode) {
            const cn = childNode as { x: number; y: number; width: number; height: number };
            // Wrap child in a positioned container
            parts.push(this.generateSwiftUIBody(childId, indent + 4));
            parts.push(`${' '.repeat(indent + 4)}.offset(x: ${formatNum(cn.x)}, y: ${formatNum(cn.y)})`);
          } else {
            parts.push(this.generateSwiftUIBody(childId, indent + 4));
          }
        }
      }

      parts.push(`${spaces}}`);
    } else {
      parts.push(`${spaces}Rectangle()`);
    }

    // Apply padding from auto-layout
    const paddingModifiers = this.generateSwiftUIPadding(node, indent);
    if (paddingModifiers) {
      parts.push(paddingModifiers);
    }

    // Apply other modifiers
    const modifiers = this.generateSwiftUIModifiers(node, indent);
    if (modifiers) {
      parts.push(modifiers);
    }

    return parts.join('\n');
  }

  /**
   * Get SwiftUI alignment for counter axis
   */
  private getSwiftUICounterAxisAlignment(
    align: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE' | undefined,
    direction: 'horizontal' | 'vertical'
  ): string {
    if (direction === 'horizontal') {
      // HStack counter axis is vertical
      switch (align) {
        case 'MIN': return '.top';
        case 'CENTER': return '.center';
        case 'MAX': return '.bottom';
        case 'BASELINE': return '.firstTextBaseline';
        default: return '.center';
      }
    } else {
      // VStack counter axis is horizontal
      switch (align) {
        case 'MIN': return '.leading';
        case 'CENTER': return '.center';
        case 'MAX': return '.trailing';
        default: return '.center';
      }
    }
  }

  /**
   * Generate padding modifiers from auto-layout
   */
  private generateSwiftUIPadding(node: FrameNodeData, indent: number): string {
    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    const pt = node.autoLayout?.paddingTop ?? 0;
    const pr = node.autoLayout?.paddingRight ?? 0;
    const pb = node.autoLayout?.paddingBottom ?? 0;
    const pl = node.autoLayout?.paddingLeft ?? 0;

    // Skip if no padding
    if (pt === 0 && pr === 0 && pb === 0 && pl === 0) {
      return '';
    }

    // Check for symmetric padding patterns
    if (pt === pb && pl === pr) {
      if (pt === pl) {
        // All sides equal
        parts.push(`${spaces}.padding(${pt})`);
      } else {
        // Horizontal and vertical different
        if (pl > 0) parts.push(`${spaces}.padding(.horizontal, ${pl})`);
        if (pt > 0) parts.push(`${spaces}.padding(.vertical, ${pt})`);
      }
    } else {
      // Asymmetric - use EdgeInsets
      parts.push(`${spaces}.padding(EdgeInsets(top: ${pt}, leading: ${pl}, bottom: ${pb}, trailing: ${pr}))`);
    }

    return parts.join('\n');
  }

  private generateSwiftUIVector(node: VectorNodeData, indent: number): string {
    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    const path = node.vectorPaths?.[0];
    if (path) {
      parts.push(`${spaces}Path { path in`);
      parts.push(this.generateSwiftUIPathCommands(path, indent + 4));
      parts.push(`${spaces}}`);

      // Apply fill
      const fill = this.getFirstSolidFill(node.fills);
      if (fill) {
        const colorName = this.getColorName(fill);
        parts.push(`${spaces}.fill(Color.${colorName})`);
      }

      // Apply stroke
      const stroke = this.getFirstSolidStroke(node.strokes);
      if (stroke) {
        const colorName = this.getColorName(stroke);
        parts.push(`${spaces}.stroke(Color.${colorName}, lineWidth: ${node.strokeWeight ?? 1})`);
      }
    }

    return parts.join('\n');
  }

  private generateSwiftUIPathCommands(path: VectorPath, indent: number): string {
    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M':
          parts.push(`${spaces}path.move(to: CGPoint(x: ${cmd.x}, y: ${cmd.y}))`);
          break;
        case 'L':
          parts.push(`${spaces}path.addLine(to: CGPoint(x: ${cmd.x}, y: ${cmd.y}))`);
          break;
        case 'C':
          parts.push(`${spaces}path.addCurve(`);
          parts.push(`${spaces}    to: CGPoint(x: ${cmd.x}, y: ${cmd.y}),`);
          parts.push(`${spaces}    control1: CGPoint(x: ${cmd.x1}, y: ${cmd.y1}),`);
          parts.push(`${spaces}    control2: CGPoint(x: ${cmd.x2}, y: ${cmd.y2})`);
          parts.push(`${spaces})`);
          break;
        case 'Z':
          parts.push(`${spaces}path.closeSubpath()`);
          break;
      }
    }

    return parts.join('\n');
  }

  private generateSwiftUIText(node: TextNodeData, indent: number): string {
    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    const firstStyle = node.textStyles[0];
    const fontSize = firstStyle?.fontSize ?? 16;
    const fontWeight = this.swiftFontWeight(firstStyle?.fontWeight ?? 400);

    parts.push(`${spaces}Text("${this.escapeString(node.characters)}")`);
    parts.push(`${spaces}    .font(.system(size: ${fontSize}, weight: .${fontWeight}))`);

    // Text color
    const fill = this.getFirstSolidFill(node.fills);
    if (fill) {
      const colorName = this.getColorName(fill);
      parts.push(`${spaces}    .foregroundColor(Color.${colorName})`);
    }

    return parts.join('\n');
  }

  private generateSwiftUIGroup(nodeId: NodeId, indent: number): string {
    const spaces = ' '.repeat(indent);
    const parts: string[] = [];
    const childIds = this.sceneGraph.getChildIds(nodeId);

    parts.push(`${spaces}Group {`);
    for (const childId of childIds) {
      parts.push(this.generateSwiftUIBody(childId, indent + 4));
    }
    parts.push(`${spaces}}`);

    return parts.join('\n');
  }

  private generateSwiftUIModifiers(node: NodeData, indent: number): string {
    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    // Frame size - respect sizing modes for auto-layout frames
    if ('width' in node && 'height' in node) {
      const n = node as { width: number; height: number };
      const frameNode = node as FrameNodeData;
      const autoLayout = frameNode.autoLayout;

      if (autoLayout && autoLayout.mode !== 'NONE') {
        // Auto-layout frame - check sizing modes
        const isHorizontal = autoLayout.mode === 'HORIZONTAL';
        const primaryAuto = autoLayout.primaryAxisSizingMode === 'AUTO';
        const counterAuto = autoLayout.counterAxisSizingMode === 'AUTO';

        // Determine which dimensions to set
        const setWidth = isHorizontal ? !primaryAuto : !counterAuto;
        const setHeight = isHorizontal ? !counterAuto : !primaryAuto;

        if (setWidth && setHeight) {
          parts.push(`${spaces}.frame(width: ${formatNum(n.width)}, height: ${formatNum(n.height)})`);
        } else if (setWidth) {
          parts.push(`${spaces}.frame(width: ${formatNum(n.width)})`);
        } else if (setHeight) {
          parts.push(`${spaces}.frame(height: ${formatNum(n.height)})`);
        }
        // If both AUTO, no frame modifier needed (hug contents)
      } else {
        // Non-auto-layout frame - always set explicit size
        parts.push(`${spaces}.frame(width: ${formatNum(n.width)}, height: ${formatNum(n.height)})`);
      }
    }

    // Background
    if ('fills' in node) {
      const fill = this.getFirstSolidFill((node as FrameNodeData).fills);
      if (fill) {
        const colorName = this.getColorName(fill);
        parts.push(`${spaces}.background(Color.${colorName})`);
      }
    }

    // Corner radius
    if ('cornerRadius' in node) {
      const radius = (node as { cornerRadius: number }).cornerRadius;
      if (radius > 0) {
        parts.push(`${spaces}.cornerRadius(${radius})`);
      }
    }

    // Opacity
    if ('opacity' in node) {
      const opacity = (node as { opacity: number }).opacity;
      if (opacity !== 1) {
        parts.push(`${spaces}.opacity(${opacity})`);
      }
    }

    // Rotation
    if ('rotation' in node) {
      const rotation = (node as { rotation: number }).rotation;
      if (rotation && rotation !== 0) {
        parts.push(`${spaces}.rotationEffect(.degrees(${rotation}))`);
      }
    }

    // Shadow effects
    if ('effects' in node) {
      const effects = (node as { effects: readonly unknown[] }).effects ?? [];
      for (const effect of effects) {
        const e = effect as { type: string; visible?: boolean; color?: RGBA; offset?: { x: number; y: number }; radius?: number };
        if (e.type === 'DROP_SHADOW' && e.visible !== false && e.color) {
          const colorName = this.getColorName(e.color);
          parts.push(`${spaces}.shadow(color: Color.${colorName}, radius: ${formatNum(e.radius ?? 0)}, x: ${formatNum(e.offset?.x ?? 0)}, y: ${formatNum(e.offset?.y ?? 0)})`);
        }
      }
    }

    // Accessibility modifiers from semantic metadata
    const accessibilityModifiers = this.generateSwiftUIAccessibility(node, indent);
    if (accessibilityModifiers) {
      parts.push(accessibilityModifiers);
    }

    return parts.join('\n');
  }

  /**
   * Generate SwiftUI accessibility modifiers from semantic metadata
   */
  private generateSwiftUIAccessibility(node: NodeData, indent: number): string {
    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    // Get semantic metadata from pluginData
    const pluginData = (node as { pluginData?: Record<string, unknown> }).pluginData;
    const semantic = getSemanticMetadata(pluginData);

    if (!semantic) {
      return '';
    }

    const a11y = semantic.accessibility;

    // .accessibilityLabel for screen reader label
    if (a11y.label) {
      parts.push(`${spaces}.accessibilityLabel("${this.escapeString(a11y.label)}")`);
    }

    // .accessibilityHint for describing what happens when activated
    if (a11y.hint) {
      parts.push(`${spaces}.accessibilityHint("${this.escapeString(a11y.hint)}")`);
    }

    // .accessibilityValue for current value
    if (a11y.description) {
      parts.push(`${spaces}.accessibilityValue("${this.escapeString(a11y.description)}")`);
    }

    // Add traits based on semantic type
    const traits = this.getSwiftUIAccessibilityTraits(semantic);
    if (traits.length > 0) {
      if (traits.length === 1) {
        parts.push(`${spaces}.accessibilityAddTraits(.${traits[0]})`);
      } else {
        parts.push(`${spaces}.accessibilityAddTraits([${traits.map(t => '.' + t).join(', ')}])`);
      }
    }

    // .accessibilityHidden if hidden from accessibility tree
    if (a11y.hidden) {
      parts.push(`${spaces}.accessibilityHidden(true)`);
    }

    // Heading level
    if (a11y.headingLevel) {
      parts.push(`${spaces}.accessibilityHeading(.h${a11y.headingLevel})`);
    }

    return parts.join('\n');
  }

  /**
   * Get SwiftUI accessibility traits based on semantic type
   */
  private getSwiftUIAccessibilityTraits(semantic: SemanticMetadata): string[] {
    const traits: string[] = [];

    switch (semantic.semanticType) {
      case 'Button':
      case 'IconButton':
        traits.push('isButton');
        break;
      case 'Link':
        traits.push('isLink');
        break;
      case 'Heading':
        traits.push('isHeader');
        break;
      case 'Image':
      case 'Icon':
      case 'Avatar':
        traits.push('isImage');
        break;
      case 'TextField':
      case 'TextArea':
        // TextField has searchField trait if used for search
        break;
      case 'TabItem':
        traits.push('isSelected'); // Would be conditional in real usage
        break;
      case 'ProgressBar':
      case 'Slider':
        traits.push('updatesFrequently');
        break;
    }

    // Add traits from platform semantics if specified
    const iosTraits = semantic.platformSemantics?.ios?.accessibilityTraits;
    if (iosTraits) {
      for (const trait of iosTraits) {
        const swiftTrait = this.mapAccessibilityTraitToSwiftUI(trait);
        if (swiftTrait && !traits.includes(swiftTrait)) {
          traits.push(swiftTrait);
        }
      }
    }

    return traits;
  }

  /**
   * Map accessibility trait names to SwiftUI AccessibilityTraits
   */
  private mapAccessibilityTraitToSwiftUI(trait: string): string | null {
    const mapping: Record<string, string> = {
      'button': 'isButton',
      'link': 'isLink',
      'header': 'isHeader',
      'searchField': 'isSearchField',
      'image': 'isImage',
      'selected': 'isSelected',
      'playsSound': 'playsSound',
      'keyboardKey': 'isKeyboardKey',
      'staticText': 'isStaticText',
      'summaryElement': 'isSummaryElement',
      'notEnabled': 'isModal', // Closest equivalent
      'updatesFrequently': 'updatesFrequently',
      'startsMediaSession': 'startsMediaSession',
      'adjustable': 'allowsDirectInteraction',
      'allowsDirectInteraction': 'allowsDirectInteraction',
      'causesPageTurn': 'causesPageTurn',
      'tabBar': 'isButton', // TabBar items are buttons
    };
    return mapping[trait] ?? null;
  }

  // =========================================================================
  // UIKit Generation
  // =========================================================================

  private generateUIKit(
    nodeId: NodeId,
    prefix: string,
    includeComments: boolean
  ): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const className = `${prefix}${this.sanitizeName(node.name || node.type)}View`;

    const parts: string[] = [];

    if (includeComments) {
      parts.push('// Generated by DesignLibre');
      parts.push('// Do not modify directly');
      parts.push('');
    }

    parts.push('import UIKit');
    parts.push('');

    parts.push(`class ${className}: UIView {`);
    parts.push('');
    parts.push('    override init(frame: CGRect) {');
    parts.push('        super.init(frame: frame)');
    parts.push('        setupView()');
    parts.push('    }');
    parts.push('');
    parts.push('    required init?(coder: NSCoder) {');
    parts.push('        super.init(coder: coder)');
    parts.push('        setupView()');
    parts.push('    }');
    parts.push('');
    parts.push('    private func setupView() {');
    parts.push(this.generateUIKitSetup(nodeId, 8));
    parts.push('    }');
    parts.push('}');

    return parts.join('\n');
  }

  private generateUIKitSetup(nodeId: NodeId, indent: number): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    // Background color
    if ('fills' in node) {
      const fill = this.getFirstSolidFill((node as FrameNodeData).fills);
      if (fill) {
        const colorName = this.getColorName(fill);
        parts.push(`${spaces}backgroundColor = UIColor.${colorName}`);
      }
    }

    // Corner radius
    if ('cornerRadius' in node) {
      const radius = (node as { cornerRadius: number }).cornerRadius;
      if (radius > 0) {
        parts.push(`${spaces}layer.cornerRadius = ${radius}`);
        parts.push(`${spaces}clipsToBounds = true`);
      }
    }

    // Opacity
    if ('opacity' in node) {
      const opacity = (node as { opacity: number }).opacity;
      if (opacity !== 1) {
        parts.push(`${spaces}alpha = ${opacity}`);
      }
    }

    // Shadow
    if ('effects' in node) {
      const effects = (node as { effects: readonly unknown[] }).effects ?? [];
      for (const effect of effects) {
        const e = effect as { type: string; visible?: boolean; color?: RGBA; offset?: { x: number; y: number }; radius?: number };
        if (e.type === 'DROP_SHADOW' && e.visible !== false && e.color) {
          const colorName = this.getColorName(e.color);
          parts.push(`${spaces}layer.shadowColor = UIColor.${colorName}.cgColor`);
          parts.push(`${spaces}layer.shadowOffset = CGSize(width: ${formatNum(e.offset?.x ?? 0)}, height: ${formatNum(e.offset?.y ?? 0)})`);
          parts.push(`${spaces}layer.shadowRadius = ${formatNum(e.radius ?? 0)}`);
          parts.push(`${spaces}layer.shadowOpacity = 1.0`);
        }
      }
    }

    // Add child views
    const childIds = this.sceneGraph.getChildIds(nodeId);
    for (let i = 0; i < childIds.length; i++) {
      const childId = childIds[i]!;
      const childNode = this.sceneGraph.getNode(childId);
      if (!childNode) continue;

      parts.push('');
      parts.push(`${spaces}// Child: ${childNode.name || childNode.type}`);
      parts.push(`${spaces}let child${i} = UIView()`);
      parts.push(this.generateUIKitChildSetup(childId, `child${i}`, indent));
      parts.push(`${spaces}addSubview(child${i})`);
    }

    return parts.join('\n');
  }

  private generateUIKitChildSetup(nodeId: NodeId, varName: string, indent: number): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    // Position and size
    if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
      const n = node as { x: number; y: number; width: number; height: number };
      parts.push(`${spaces}${varName}.frame = CGRect(x: ${formatNum(n.x)}, y: ${formatNum(n.y)}, width: ${formatNum(n.width)}, height: ${formatNum(n.height)})`);
    }

    // Background color
    if ('fills' in node) {
      const fill = this.getFirstSolidFill((node as FrameNodeData).fills);
      if (fill) {
        const colorName = this.getColorName(fill);
        parts.push(`${spaces}${varName}.backgroundColor = UIColor.${colorName}`);
      }
    }

    // Corner radius
    if ('cornerRadius' in node) {
      const radius = (node as { cornerRadius: number }).cornerRadius;
      if (radius > 0) {
        parts.push(`${spaces}${varName}.layer.cornerRadius = ${radius}`);
      }
    }

    return parts.join('\n');
  }

  // =========================================================================
  // Objective-C Generation
  // =========================================================================

  private generateObjC(
    nodeId: NodeId,
    prefix: string,
    includeComments: boolean
  ): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const className = `${prefix}${this.sanitizeName(node.name || node.type)}View`;

    const parts: string[] = [];

    if (includeComments) {
      parts.push('// Generated by DesignLibre');
      parts.push('// Do not modify directly');
      parts.push('');
    }

    // Header
    parts.push('#import <UIKit/UIKit.h>');
    parts.push('');
    parts.push(`@interface ${className} : UIView`);
    parts.push('@end');
    parts.push('');

    // Implementation
    parts.push(`@implementation ${className}`);
    parts.push('');
    parts.push('- (instancetype)initWithFrame:(CGRect)frame {');
    parts.push('    self = [super initWithFrame:frame];');
    parts.push('    if (self) {');
    parts.push('        [self setupView];');
    parts.push('    }');
    parts.push('    return self;');
    parts.push('}');
    parts.push('');
    parts.push('- (instancetype)initWithCoder:(NSCoder *)coder {');
    parts.push('    self = [super initWithCoder:coder];');
    parts.push('    if (self) {');
    parts.push('        [self setupView];');
    parts.push('    }');
    parts.push('    return self;');
    parts.push('}');
    parts.push('');
    parts.push('- (void)setupView {');
    parts.push(this.generateObjCSetup(nodeId, 4));
    parts.push('}');
    parts.push('');
    parts.push('@end');

    return parts.join('\n');
  }

  private generateObjCSetup(nodeId: NodeId, indent: number): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    // Background color
    if ('fills' in node) {
      const fill = this.getFirstSolidFill((node as FrameNodeData).fills);
      if (fill) {
        parts.push(`${spaces}self.backgroundColor = [UIColor colorWithRed:${fill.r.toFixed(3)} green:${fill.g.toFixed(3)} blue:${fill.b.toFixed(3)} alpha:${fill.a.toFixed(3)}];`);
      }
    }

    // Corner radius
    if ('cornerRadius' in node) {
      const radius = (node as { cornerRadius: number }).cornerRadius;
      if (radius > 0) {
        parts.push(`${spaces}self.layer.cornerRadius = ${radius};`);
        parts.push(`${spaces}self.clipsToBounds = YES;`);
      }
    }

    // Opacity
    if ('opacity' in node) {
      const opacity = (node as { opacity: number }).opacity;
      if (opacity !== 1) {
        parts.push(`${spaces}self.alpha = ${opacity};`);
      }
    }

    return parts.join('\n');
  }

  // =========================================================================
  // Color Extension Generation
  // =========================================================================

  private generateSwiftColorExtension(): string {
    const parts: string[] = [];
    parts.push('import SwiftUI');
    parts.push('');
    parts.push('extension Color {');

    for (const [_key, color] of this.extractedColors) {
      const { r, g, b, a } = color.rgba;
      parts.push(`    static let ${color.name} = Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)}, opacity: ${a.toFixed(3)})`);
    }

    parts.push('}');
    return parts.join('\n');
  }

  private generateUIKitColorExtension(): string {
    const parts: string[] = [];
    parts.push('import UIKit');
    parts.push('');
    parts.push('extension UIColor {');

    for (const [_key, color] of this.extractedColors) {
      const { r, g, b, a } = color.rgba;
      parts.push(`    static let ${color.name} = UIColor(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)}, alpha: ${a.toFixed(3)})`);
    }

    parts.push('}');
    return parts.join('\n');
  }

  private generateObjCColorExtension(): string {
    const parts: string[] = [];
    parts.push('#import <UIKit/UIKit.h>');
    parts.push('');
    parts.push('@interface UIColor (DesignLibreColors)');

    for (const [_key, color] of this.extractedColors) {
      parts.push(`+ (UIColor *)${color.name};`);
    }

    parts.push('@end');
    parts.push('');
    parts.push('@implementation UIColor (DesignLibreColors)');

    for (const [_key, color] of this.extractedColors) {
      const { r, g, b, a } = color.rgba;
      parts.push(`+ (UIColor *)${color.name} {`);
      parts.push(`    return [UIColor colorWithRed:${r.toFixed(3)} green:${g.toFixed(3)} blue:${b.toFixed(3)} alpha:${a.toFixed(3)}];`);
      parts.push('}');
    }

    parts.push('@end');
    return parts.join('\n');
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private extractColors(nodeId: NodeId): void {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return;

    if ('fills' in node) {
      const fills = (node as FrameNodeData).fills ?? [];
      for (const fill of fills) {
        if (fill.type === 'SOLID' && fill.visible !== false && fill.color) {
          this.registerColor(fill.color);
        }
      }
    }

    if ('strokes' in node) {
      const strokes = (node as VectorNodeData).strokes ?? [];
      for (const stroke of strokes) {
        if (stroke.type === 'SOLID' && stroke.visible !== false && stroke.color) {
          this.registerColor(stroke.color);
        }
      }
    }

    if ('effects' in node) {
      const effects = (node as { effects: readonly unknown[] }).effects ?? [];
      for (const effect of effects) {
        const e = effect as { color?: RGBA };
        if (e.color) {
          this.registerColor(e.color);
        }
      }
    }

    const childIds = this.sceneGraph.getChildIds(nodeId);
    for (const childId of childIds) {
      this.extractColors(childId);
    }
  }

  private registerColor(color: RGBA): string {
    const key = this.colorToKey(color);
    if (!this.extractedColors.has(key)) {
      const name = `designLibreColor${++this.colorIndex}`;
      this.extractedColors.set(key, { name, rgba: color });
    }
    return this.extractedColors.get(key)!.name;
  }

  private getColorName(color: RGBA): string {
    if (this.useTokens) {
      // Return token reference instead of extracted color name
      const tokenName = this.mapColorToToken(color);
      return `${this.tokenPrefix}.Colors.${tokenName}`;
    }
    const key = this.colorToKey(color);
    return this.extractedColors.get(key)?.name ?? 'clear';
  }

  /**
   * Map a color to a semantic token name based on hue and luminance
   */
  private mapColorToToken(color: RGBA): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    // Check for grayscale
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    if (diff < 30) {
      // Grayscale - map to shade based on luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 26) return 'Gray.shade900';
      if (luminance < 51) return 'Gray.shade800';
      if (luminance < 77) return 'Gray.shade700';
      if (luminance < 102) return 'Gray.shade600';
      if (luminance < 128) return 'Gray.shade500';
      if (luminance < 153) return 'Gray.shade400';
      if (luminance < 179) return 'Gray.shade300';
      if (luminance < 204) return 'Gray.shade200';
      if (luminance < 230) return 'Gray.shade100';
      return 'Gray.shade50';
    }

    // Determine hue
    let hue = 0;
    if (max === r) {
      hue = ((g - b) / diff) % 6;
    } else if (max === g) {
      hue = (b - r) / diff + 2;
    } else {
      hue = (r - g) / diff + 4;
    }
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;

    // Map hue to color name
    let hueName: string;
    if (hue < 15 || hue >= 345) hueName = 'Red';
    else if (hue < 45) hueName = 'Orange';
    else if (hue < 75) hueName = 'Yellow';
    else if (hue < 150) hueName = 'Green';
    else if (hue < 195) hueName = 'Cyan';
    else if (hue < 255) hueName = 'Blue';
    else if (hue < 285) hueName = 'Purple';
    else hueName = 'Pink';

    // Determine shade based on luminance
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    let shade: string;
    if (luminance < 51) shade = 'shade900';
    else if (luminance < 77) shade = 'shade800';
    else if (luminance < 102) shade = 'shade700';
    else if (luminance < 128) shade = 'shade600';
    else if (luminance < 153) shade = 'shade500';
    else if (luminance < 179) shade = 'shade400';
    else if (luminance < 204) shade = 'shade300';
    else if (luminance < 230) shade = 'shade200';
    else shade = 'shade100';

    return `${hueName}.${shade}`;
  }

  private colorToKey(color: RGBA): string {
    return `${color.r.toFixed(3)}-${color.g.toFixed(3)}-${color.b.toFixed(3)}-${color.a.toFixed(3)}`;
  }

  private getFirstSolidFill(fills: readonly { type: string; visible?: boolean; color?: RGBA }[] | undefined): RGBA | null {
    if (!fills) return null;
    const solid = fills.find(f => f.type === 'SOLID' && f.visible !== false);
    return solid?.color ?? null;
  }

  private getFirstSolidStroke(strokes: readonly { type: string; visible?: boolean; color?: RGBA }[] | undefined): RGBA | null {
    if (!strokes) return null;
    const solid = strokes.find(s => s.type === 'SOLID' && s.visible !== false);
    return solid?.color ?? null;
  }

  private swiftFontWeight(weight: number): string {
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

  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^(\d)/, '_$1');
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }
}

/**
 * Create an iOS code generator.
 */
export function createIOSCodeGenerator(sceneGraph: SceneGraph): IOSCodeGenerator {
  return new IOSCodeGenerator(sceneGraph);
}
