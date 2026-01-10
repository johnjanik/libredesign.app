/**
 * Android Code Generator
 *
 * Generate Kotlin and Java code from scene graph nodes.
 */

import type { NodeId } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData, FrameNodeData, VectorNodeData, TextNodeData } from '@scene/nodes/base-node';
import { formatNum } from './format-utils';
import { getSemanticMetadata, type SemanticMetadata } from '@core/types/semantic-schema';
import type { VariableDefinition, VariableType } from '@prototype/variable-manager';

/**
 * Android code generation options
 */
export interface AndroidCodeGeneratorOptions {
  /** Output language (default: 'kotlin') */
  language?: 'kotlin' | 'java' | undefined;
  /** Use Jetpack Compose or View system (default: 'compose' for kotlin, 'view' for java) */
  framework?: 'compose' | 'view' | undefined;
  /** Package name (default: 'com.designlibre.generated') */
  packageName?: string | undefined;
  /** Class name prefix (default: '') */
  prefix?: string | undefined;
  /** Include preview annotations (default: true, Compose only) */
  includePreview?: boolean | undefined;
  /** Generate colors.xml resource (default: true) */
  generateColorsXml?: boolean | undefined;
  /** Include comments (default: true) */
  includeComments?: boolean | undefined;
  /** Use design tokens instead of hardcoded values (default: false) */
  useTokens?: boolean | undefined;
  /** Token object name for generated references (default: 'AppTokens') */
  tokenPrefix?: string | undefined;
  /** Variable definitions for state-aware code generation */
  variables?: VariableDefinition[] | undefined;
}

/**
 * Android code generation result
 */
export interface AndroidCodeGeneratorResult {
  /** Generated code */
  readonly code: string;
  /** Colors XML content */
  readonly colorsXml: string;
  /** Dimens XML content */
  readonly dimensXml: string;
  /** File extension */
  readonly extension: string;
  /** Blob for download */
  readonly blob: Blob;
  /** Download URL */
  readonly url: string;
}

/**
 * Android Code Generator
 */
export class AndroidCodeGenerator {
  private sceneGraph: SceneGraph;
  private colorIndex = 0;
  private dimenIndex = 0;
  private extractedColors: Map<string, { name: string; rgba: RGBA }> = new Map();
  private extractedDimens: Map<number, string> = new Map();
  private useTokens = false;
  private tokenPrefix = 'AppTokens';
  private variables: VariableDefinition[] = [];
  private variableMap: Map<string, VariableDefinition> = new Map();

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  /**
   * Generate Android code for a node.
   */
  generate(nodeId: NodeId, options: AndroidCodeGeneratorOptions = {}): AndroidCodeGeneratorResult {
    const language = options.language ?? 'kotlin';
    const framework = options.framework ?? (language === 'kotlin' ? 'compose' : 'view');
    const packageName = options.packageName ?? 'com.designlibre.generated';
    const prefix = options.prefix ?? '';
    const includePreview = options.includePreview ?? true;
    const generateColorsXml = options.generateColorsXml ?? true;
    const includeComments = options.includeComments ?? true;

    // Store token options for use in helper methods
    this.useTokens = options.useTokens ?? false;
    this.tokenPrefix = options.tokenPrefix ?? 'AppTokens';

    // Store variables for state-aware code generation
    this.variables = options.variables ?? [];
    this.variableMap.clear();
    for (const v of this.variables) {
      this.variableMap.set(v.id, v);
    }

    // Reset extraction state
    this.colorIndex = 0;
    this.dimenIndex = 0;
    this.extractedColors.clear();
    this.extractedDimens.clear();

    // Extract design tokens first
    this.extractDesignTokens(nodeId);

    const node = this.sceneGraph.getNode(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    let code: string;

    if (language === 'kotlin') {
      if (framework === 'compose') {
        code = this.generateCompose(nodeId, packageName, prefix, includePreview, includeComments);
      } else {
        code = this.generateKotlinView(nodeId, packageName, prefix, includeComments);
      }
    } else {
      code = this.generateJavaView(nodeId, packageName, prefix, includeComments);
    }

    const colorsXml = generateColorsXml ? this.generateColorsXml() : '';
    const dimensXml = this.generateDimensXml();

    const ext = language === 'kotlin' ? 'kt' : 'java';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    return {
      code,
      colorsXml,
      dimensXml,
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
    options: AndroidCodeGeneratorOptions = {}
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
  // Jetpack Compose Generation
  // =========================================================================

  private generateCompose(
    nodeId: NodeId,
    packageName: string,
    prefix: string,
    includePreview: boolean,
    includeComments: boolean
  ): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const funcName = `${prefix}${this.sanitizeName(node.name || node.type)}Screen`;

    const parts: string[] = [];

    // Package and imports
    parts.push(`package ${packageName}`);
    parts.push('');

    if (includeComments) {
      parts.push('// Generated by DesignLibre');
      parts.push('// Do not modify directly');
      parts.push('');
    }

    // Collect used variables for state generation
    const usedVariableIds = this.collectUsedVariables(nodeId);
    const hasStateVariables = usedVariableIds.size > 0;

    parts.push('import androidx.compose.foundation.background');
    parts.push('import androidx.compose.foundation.layout.*');
    parts.push('import androidx.compose.foundation.shape.RoundedCornerShape');
    parts.push('import androidx.compose.material3.Text');
    parts.push('import androidx.compose.runtime.Composable');
    if (hasStateVariables) {
      parts.push('import androidx.compose.runtime.getValue');
      parts.push('import androidx.compose.runtime.mutableStateOf');
      parts.push('import androidx.compose.runtime.remember');
      parts.push('import androidx.compose.runtime.setValue');
    }
    parts.push('import androidx.compose.ui.Alignment');
    parts.push('import androidx.compose.ui.Modifier');
    parts.push('import androidx.compose.ui.draw.clip');
    parts.push('import androidx.compose.ui.draw.rotate');
    parts.push('import androidx.compose.ui.draw.shadow');
    parts.push('import androidx.compose.ui.graphics.Color');
    parts.push('import androidx.compose.ui.graphics.Path');
    parts.push('import androidx.compose.ui.graphics.drawscope.Fill');
    parts.push('import androidx.compose.ui.text.font.FontWeight');
    parts.push('import androidx.compose.ui.tooling.preview.Preview');
    parts.push('import androidx.compose.ui.unit.dp');
    parts.push('import androidx.compose.ui.unit.sp');
    parts.push('');

    // Color constants
    parts.push('// Color Palette');
    for (const [, color] of this.extractedColors) {
      const hex = this.rgbaToHex(color.rgba);
      parts.push(`private val ${color.name} = Color(0x${hex})`);
    }
    parts.push('');

    // Main composable
    parts.push('@Composable');
    parts.push(`fun ${funcName}() {`);

    // Generate state variable declarations
    if (hasStateVariables) {
      const stateDecls = this.generateComposeStateDeclarations(usedVariableIds);
      if (stateDecls) {
        parts.push(stateDecls);
        parts.push('');
      }
    }

    parts.push(this.generateComposeBody(nodeId, 4));
    parts.push('}');

    // Preview
    if (includePreview) {
      parts.push('');
      parts.push('@Preview(showBackground = true)');
      parts.push('@Composable');
      parts.push(`fun ${funcName}Preview() {`);
      parts.push(`    ${funcName}()`);
      parts.push('}');
    }

    return parts.join('\n');
  }

  private generateComposeBody(nodeId: NodeId, indent: number): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    switch (node.type) {
      case 'FRAME':
        parts.push(this.generateComposeFrame(node as FrameNodeData, nodeId, indent));
        break;
      case 'VECTOR':
        parts.push(this.generateComposeVector(node as VectorNodeData, indent));
        break;
      case 'TEXT':
        parts.push(this.generateComposeText(node as TextNodeData, indent));
        break;
      case 'GROUP':
        parts.push(this.generateComposeGroup(nodeId, indent));
        break;
      default:
        parts.push(`${spaces}Box {}`);
    }

    return parts.join('\n');
  }

  private generateComposeFrame(
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

    // Build modifier chain (includes padding)
    const modifiers = this.generateComposeModifiers(node, indent + 4);

    // Get alignment properties
    const primaryAlign = node.autoLayout?.primaryAxisAlignItems;
    const counterAlign = node.autoLayout?.counterAxisAlignItems;
    const spacing = node.autoLayout?.itemSpacing ?? 0;
    const isSpaceBetween = primaryAlign === 'SPACE_BETWEEN';

    if (hasChildren) {
      if (isHorizontal) {
        // Get arrangement and alignment for Row
        const arrangement = this.getComposeHorizontalArrangement(primaryAlign, spacing);
        const alignment = this.getComposeVerticalAlignment(counterAlign);
        parts.push(`${spaces}Row(`);
        parts.push(`${spaces}    modifier = ${modifiers},`);
        parts.push(`${spaces}    horizontalArrangement = ${arrangement},`);
        parts.push(`${spaces}    verticalAlignment = ${alignment}`);
        parts.push(`${spaces}) {`);

        // Handle SPACE_BETWEEN with weights if needed
        if (isSpaceBetween && childIds.length > 1) {
          for (let i = 0; i < childIds.length; i++) {
            parts.push(this.generateComposeBody(childIds[i]!, indent + 4));
            if (i < childIds.length - 1) {
              parts.push(`${spaces}    Spacer(modifier = Modifier.weight(1f))`);
            }
          }
        } else {
          for (const childId of childIds) {
            parts.push(this.generateComposeBody(childId, indent + 4));
          }
        }
      } else if (isVertical) {
        // Get arrangement and alignment for Column
        const arrangement = this.getComposeVerticalArrangement(primaryAlign, spacing);
        const alignment = this.getComposeHorizontalAlignment(counterAlign);
        parts.push(`${spaces}Column(`);
        parts.push(`${spaces}    modifier = ${modifiers},`);
        parts.push(`${spaces}    verticalArrangement = ${arrangement},`);
        parts.push(`${spaces}    horizontalAlignment = ${alignment}`);
        parts.push(`${spaces}) {`);

        // Handle SPACE_BETWEEN with weights if needed
        if (isSpaceBetween && childIds.length > 1) {
          for (let i = 0; i < childIds.length; i++) {
            parts.push(this.generateComposeBody(childIds[i]!, indent + 4));
            if (i < childIds.length - 1) {
              parts.push(`${spaces}    Spacer(modifier = Modifier.weight(1f))`);
            }
          }
        } else {
          for (const childId of childIds) {
            parts.push(this.generateComposeBody(childId, indent + 4));
          }
        }
      } else {
        parts.push(`${spaces}Box(`);
        parts.push(`${spaces}    modifier = ${modifiers}`);
        parts.push(`${spaces}) {`);
        for (const childId of childIds) {
          parts.push(this.generateComposeBody(childId, indent + 4));
        }
      }

      parts.push(`${spaces}}`);
    } else {
      parts.push(`${spaces}Box(`);
      parts.push(`${spaces}    modifier = ${modifiers}`);
      parts.push(`${spaces}) {}`);
    }

    return parts.join('\n');
  }

  /**
   * Get Compose horizontal arrangement for Row based on primary axis alignment.
   */
  private getComposeHorizontalArrangement(
    align: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' | undefined,
    spacing: number
  ): string {
    switch (align) {
      case 'MIN':
        return spacing > 0 ? `Arrangement.spacedBy(${spacing}.dp, Alignment.Start)` : 'Arrangement.Start';
      case 'CENTER':
        return spacing > 0 ? `Arrangement.spacedBy(${spacing}.dp, Alignment.CenterHorizontally)` : 'Arrangement.Center';
      case 'MAX':
        return spacing > 0 ? `Arrangement.spacedBy(${spacing}.dp, Alignment.End)` : 'Arrangement.End';
      case 'SPACE_BETWEEN':
        return 'Arrangement.SpaceBetween';
      default:
        return spacing > 0 ? `Arrangement.spacedBy(${spacing}.dp)` : 'Arrangement.Start';
    }
  }

  /**
   * Get Compose vertical arrangement for Column based on primary axis alignment.
   */
  private getComposeVerticalArrangement(
    align: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' | undefined,
    spacing: number
  ): string {
    switch (align) {
      case 'MIN':
        return spacing > 0 ? `Arrangement.spacedBy(${spacing}.dp, Alignment.Top)` : 'Arrangement.Top';
      case 'CENTER':
        return spacing > 0 ? `Arrangement.spacedBy(${spacing}.dp, Alignment.CenterVertically)` : 'Arrangement.Center';
      case 'MAX':
        return spacing > 0 ? `Arrangement.spacedBy(${spacing}.dp, Alignment.Bottom)` : 'Arrangement.Bottom';
      case 'SPACE_BETWEEN':
        return 'Arrangement.SpaceBetween';
      default:
        return spacing > 0 ? `Arrangement.spacedBy(${spacing}.dp)` : 'Arrangement.Top';
    }
  }

  /**
   * Get Compose vertical alignment for Row (counter axis).
   */
  private getComposeVerticalAlignment(
    align: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE' | undefined
  ): string {
    switch (align) {
      case 'MIN':
        return 'Alignment.Top';
      case 'CENTER':
        return 'Alignment.CenterVertically';
      case 'MAX':
        return 'Alignment.Bottom';
      case 'BASELINE':
        return 'Alignment.Bottom'; // Compose doesn't have baseline alignment for Row
      default:
        return 'Alignment.CenterVertically';
    }
  }

  /**
   * Get Compose horizontal alignment for Column (counter axis).
   */
  private getComposeHorizontalAlignment(
    align: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE' | undefined
  ): string {
    switch (align) {
      case 'MIN':
        return 'Alignment.Start';
      case 'CENTER':
        return 'Alignment.CenterHorizontally';
      case 'MAX':
        return 'Alignment.End';
      default:
        return 'Alignment.Start';
    }
  }

  private generateComposeVector(node: VectorNodeData, indent: number): string {
    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    const path = node.vectorPaths?.[0];
    if (!path) {
      return `${spaces}Box {}`;
    }

    parts.push(`${spaces}Canvas(`);
    parts.push(`${spaces}    modifier = Modifier.size(${formatNum(node.width)}.dp, ${formatNum(node.height)}.dp)`);
    parts.push(`${spaces}) {`);
    parts.push(`${spaces}    val path = Path().apply {`);

    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M':
          parts.push(`${spaces}        moveTo(${formatNum(cmd.x)}f, ${formatNum(cmd.y)}f)`);
          break;
        case 'L':
          parts.push(`${spaces}        lineTo(${formatNum(cmd.x)}f, ${formatNum(cmd.y)}f)`);
          break;
        case 'C':
          parts.push(`${spaces}        cubicTo(${formatNum(cmd.x1)}f, ${formatNum(cmd.y1)}f, ${formatNum(cmd.x2)}f, ${formatNum(cmd.y2)}f, ${formatNum(cmd.x)}f, ${formatNum(cmd.y)}f)`);
          break;
        case 'Z':
          parts.push(`${spaces}        close()`);
          break;
      }
    }

    parts.push(`${spaces}    }`);

    const fill = this.getFirstSolidFill(node.fills);
    if (fill) {
      const colorName = this.getColorName(fill);
      parts.push(`${spaces}    drawPath(path, color = ${colorName})`);
    }

    parts.push(`${spaces}}`);

    return parts.join('\n');
  }

  private generateComposeText(node: TextNodeData, indent: number): string {
    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    const firstStyle = node.textStyles[0];
    const fontSize = firstStyle?.fontSize ?? 16;
    const fontWeight = this.kotlinFontWeight(firstStyle?.fontWeight ?? 400);

    const fill = this.getFirstSolidFill(node.fills);
    const colorName = fill ? this.getColorName(fill) : 'Color.Black';

    parts.push(`${spaces}Text(`);
    parts.push(`${spaces}    text = "${this.escapeString(node.characters)}",`);
    parts.push(`${spaces}    fontSize = ${fontSize}.sp,`);
    parts.push(`${spaces}    fontWeight = FontWeight.${fontWeight},`);
    parts.push(`${spaces}    color = ${colorName}`);
    parts.push(`${spaces})`);

    return parts.join('\n');
  }

  private generateComposeGroup(nodeId: NodeId, indent: number): string {
    const spaces = ' '.repeat(indent);
    const parts: string[] = [];
    const childIds = this.sceneGraph.getChildIds(nodeId);

    parts.push(`${spaces}Box {`);
    for (const childId of childIds) {
      parts.push(this.generateComposeBody(childId, indent + 4));
    }
    parts.push(`${spaces}}`);

    return parts.join('\n');
  }

  private generateComposeModifiers(node: NodeData, indent: number): string {
    const parts: string[] = ['Modifier'];

    // Padding from auto-layout (before size to match design intent)
    if ('autoLayout' in node) {
      const frameNode = node as FrameNodeData;
      const pt = frameNode.autoLayout?.paddingTop ?? 0;
      const pr = frameNode.autoLayout?.paddingRight ?? 0;
      const pb = frameNode.autoLayout?.paddingBottom ?? 0;
      const pl = frameNode.autoLayout?.paddingLeft ?? 0;

      if (pt > 0 || pr > 0 || pb > 0 || pl > 0) {
        // Check for symmetric padding
        if (pt === pb && pl === pr) {
          if (pt === pl && pt > 0) {
            // All sides equal
            parts.push(`.padding(${pt}.dp)`);
          } else {
            // Horizontal and vertical padding
            if (pl > 0) parts.push(`.padding(horizontal = ${pl}.dp)`);
            if (pt > 0) parts.push(`.padding(vertical = ${pt}.dp)`);
          }
        } else {
          // Asymmetric padding
          parts.push(`.padding(start = ${pl}.dp, end = ${pr}.dp, top = ${pt}.dp, bottom = ${pb}.dp)`);
        }
      }
    }

    // Size - respect sizing modes for auto-layout frames
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
          parts.push(`.size(${formatNum(n.width)}.dp, ${formatNum(n.height)}.dp)`);
        } else if (setWidth) {
          parts.push(`.width(${formatNum(n.width)}.dp)`);
        } else if (setHeight) {
          parts.push(`.height(${formatNum(n.height)}.dp)`);
        }
        // If both AUTO, use wrapContent
        if (primaryAuto || counterAuto) {
          if (primaryAuto && isHorizontal) {
            parts.push('.wrapContentWidth()');
          } else if (primaryAuto && !isHorizontal) {
            parts.push('.wrapContentHeight()');
          }
          if (counterAuto && isHorizontal) {
            parts.push('.wrapContentHeight()');
          } else if (counterAuto && !isHorizontal) {
            parts.push('.wrapContentWidth()');
          }
        }
      } else {
        // Non-auto-layout frame - always set explicit size
        parts.push(`.size(${formatNum(n.width)}.dp, ${formatNum(n.height)}.dp)`);
      }
    }

    // Background
    if ('fills' in node) {
      const fill = this.getFirstSolidFill((node as FrameNodeData).fills);
      if (fill) {
        const colorName = this.getColorName(fill);
        parts.push(`.background(${colorName})`);
      }
    }

    // Corner radius
    if ('cornerRadius' in node) {
      const radius = (node as { cornerRadius: number }).cornerRadius;
      if (radius > 0) {
        parts.push(`.clip(RoundedCornerShape(${radius}.dp))`);
      }
    }

    // Rotation
    if ('rotation' in node) {
      const rotation = (node as { rotation: number }).rotation;
      if (rotation && rotation !== 0) {
        parts.push(`.rotate(${rotation}f)`);
      }
    }

    // Shadow
    if ('effects' in node) {
      const effects = (node as { effects: readonly unknown[] }).effects ?? [];
      for (const effect of effects) {
        const e = effect as { type: string; visible?: boolean; color?: RGBA; radius?: number };
        if (e.type === 'DROP_SHADOW' && e.visible !== false) {
          parts.push(`.shadow(elevation = ${e.radius ?? 4}.dp)`);
          break;
        }
      }
    }

    // Accessibility modifiers from semantic metadata
    const semanticsModifier = this.generateComposeSemantics(node);
    if (semanticsModifier) {
      parts.push(semanticsModifier);
    }

    return parts.join('\n' + ' '.repeat(indent));
  }

  /**
   * Generate Compose semantics modifier from semantic metadata
   */
  private generateComposeSemantics(node: NodeData): string | null {
    // Get semantic metadata from pluginData
    const pluginData = (node as { pluginData?: Record<string, unknown> }).pluginData;
    const semantic = getSemanticMetadata(pluginData);

    if (!semantic) {
      return null;
    }

    const a11y = semantic.accessibility;
    const semanticProps: string[] = [];

    // contentDescription for screen readers
    if (a11y.label) {
      semanticProps.push(`contentDescription = "${this.escapeString(a11y.label)}"`);
    }

    // Role based on semantic type
    const role = this.getComposeRole(semantic);
    if (role) {
      semanticProps.push(`role = Role.${role}`);
    }

    // stateDescription for describing current state
    if (a11y.description) {
      semanticProps.push(`stateDescription = "${this.escapeString(a11y.description)}"`);
    }

    // heading for header elements
    if (a11y.headingLevel || semantic.semanticType === 'Heading') {
      semanticProps.push('heading()');
    }

    // disabled state
    if (a11y.disabled) {
      semanticProps.push('disabled()');
    }

    if (semanticProps.length === 0) {
      return null;
    }

    // Build semantics modifier
    return `.semantics { ${semanticProps.join('; ')} }`;
  }

  /**
   * Get Compose Role based on semantic type
   */
  private getComposeRole(semantic: SemanticMetadata): string | null {
    switch (semantic.semanticType) {
      case 'Button':
      case 'IconButton':
        return 'Button';
      case 'Checkbox':
        return 'Checkbox';
      case 'RadioButton':
        return 'RadioButton';
      case 'Toggle':
        return 'Switch';
      case 'Image':
      case 'Icon':
      case 'Avatar':
        return 'Image';
      case 'TabItem':
        return 'Tab';
      case 'Slider':
        // Note: Role.Slider exists but not commonly used
        return null;
      case 'ProgressBar':
        return 'ProgressBar';
      default:
        return null;
    }
  }

  // =========================================================================
  // Kotlin View Generation
  // =========================================================================

  private generateKotlinView(
    nodeId: NodeId,
    packageName: string,
    prefix: string,
    includeComments: boolean
  ): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const className = `${prefix}${this.sanitizeName(node.name || node.type)}View`;

    const parts: string[] = [];

    parts.push(`package ${packageName}`);
    parts.push('');

    if (includeComments) {
      parts.push('// Generated by DesignLibre');
      parts.push('// Do not modify directly');
      parts.push('');
    }

    parts.push('import android.content.Context');
    parts.push('import android.graphics.Color');
    parts.push('import android.util.AttributeSet');
    parts.push('import android.view.View');
    parts.push('import android.widget.FrameLayout');
    parts.push('import android.widget.LinearLayout');
    parts.push('import android.widget.TextView');
    parts.push('');

    parts.push(`class ${className} @JvmOverloads constructor(`);
    parts.push('    context: Context,');
    parts.push('    attrs: AttributeSet? = null,');
    parts.push('    defStyleAttr: Int = 0');
    parts.push(') : FrameLayout(context, attrs, defStyleAttr) {');
    parts.push('');
    parts.push('    init {');
    parts.push('        setupView()');
    parts.push('    }');
    parts.push('');
    parts.push('    private fun setupView() {');
    parts.push(this.generateKotlinViewSetup(nodeId, 8));
    parts.push('    }');
    parts.push('}');

    return parts.join('\n');
  }

  private generateKotlinViewSetup(nodeId: NodeId, indent: number): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    // Background color
    if ('fills' in node) {
      const fill = this.getFirstSolidFill((node as FrameNodeData).fills);
      if (fill) {
        const hex = this.rgbaToHex(fill);
        parts.push(`${spaces}setBackgroundColor(Color.parseColor("#${hex}"))`);
      }
    }

    // Add children
    const childIds = this.sceneGraph.getChildIds(nodeId);
    for (let i = 0; i < childIds.length; i++) {
      const childId = childIds[i]!;
      const childNode = this.sceneGraph.getNode(childId);
      if (!childNode) continue;

      parts.push('');
      parts.push(`${spaces}// Child: ${childNode.name || childNode.type}`);
      parts.push(`${spaces}val child${i} = View(context).apply {`);
      parts.push(this.generateKotlinChildSetup(childId, indent + 4));
      parts.push(`${spaces}}`);
      parts.push(`${spaces}addView(child${i})`);
    }

    return parts.join('\n');
  }

  private generateKotlinChildSetup(nodeId: NodeId, indent: number): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    // Layout params
    if ('width' in node && 'height' in node) {
      const n = node as { x?: number; y?: number; width: number; height: number };
      const w = Math.round(n.width);
      const h = Math.round(n.height);
      parts.push(`${spaces}layoutParams = FrameLayout.LayoutParams(${w}.dpToPx(), ${h}.dpToPx())`);

      if (n.x !== undefined && n.y !== undefined) {
        parts.push(`${spaces}x = ${n.x}f`);
        parts.push(`${spaces}y = ${n.y}f`);
      }
    }

    // Background color
    if ('fills' in node) {
      const fill = this.getFirstSolidFill((node as FrameNodeData).fills);
      if (fill) {
        const hex = this.rgbaToHex(fill);
        parts.push(`${spaces}setBackgroundColor(Color.parseColor("#${hex}"))`);
      }
    }

    return parts.join('\n');
  }

  // =========================================================================
  // Java View Generation
  // =========================================================================

  private generateJavaView(
    nodeId: NodeId,
    packageName: string,
    prefix: string,
    includeComments: boolean
  ): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const className = `${prefix}${this.sanitizeName(node.name || node.type)}View`;

    const parts: string[] = [];

    parts.push(`package ${packageName};`);
    parts.push('');

    if (includeComments) {
      parts.push('// Generated by DesignLibre');
      parts.push('// Do not modify directly');
      parts.push('');
    }

    parts.push('import android.content.Context;');
    parts.push('import android.graphics.Color;');
    parts.push('import android.util.AttributeSet;');
    parts.push('import android.view.View;');
    parts.push('import android.widget.FrameLayout;');
    parts.push('import android.widget.LinearLayout;');
    parts.push('import android.widget.TextView;');
    parts.push('');

    parts.push(`public class ${className} extends FrameLayout {`);
    parts.push('');
    parts.push(`    public ${className}(Context context) {`);
    parts.push('        super(context);');
    parts.push('        init();');
    parts.push('    }');
    parts.push('');
    parts.push(`    public ${className}(Context context, AttributeSet attrs) {`);
    parts.push('        super(context, attrs);');
    parts.push('        init();');
    parts.push('    }');
    parts.push('');
    parts.push(`    public ${className}(Context context, AttributeSet attrs, int defStyleAttr) {`);
    parts.push('        super(context, attrs, defStyleAttr);');
    parts.push('        init();');
    parts.push('    }');
    parts.push('');
    parts.push('    private void init() {');
    parts.push(this.generateJavaViewSetup(nodeId, 8));
    parts.push('    }');
    parts.push('}');

    return parts.join('\n');
  }

  private generateJavaViewSetup(nodeId: NodeId, indent: number): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    // Background color
    if ('fills' in node) {
      const fill = this.getFirstSolidFill((node as FrameNodeData).fills);
      if (fill) {
        const hex = this.rgbaToHex(fill);
        parts.push(`${spaces}setBackgroundColor(Color.parseColor("#${hex}"));`);
      }
    }

    // Add children
    const childIds = this.sceneGraph.getChildIds(nodeId);
    for (let i = 0; i < childIds.length; i++) {
      const childId = childIds[i]!;
      const childNode = this.sceneGraph.getNode(childId);
      if (!childNode) continue;

      parts.push('');
      parts.push(`${spaces}// Child: ${childNode.name || childNode.type}`);
      parts.push(`${spaces}View child${i} = new View(getContext());`);
      parts.push(this.generateJavaChildSetup(childId, `child${i}`, indent));
      parts.push(`${spaces}addView(child${i});`);
    }

    return parts.join('\n');
  }

  private generateJavaChildSetup(nodeId: NodeId, varName: string, indent: number): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    const spaces = ' '.repeat(indent);
    const parts: string[] = [];

    // Layout params
    if ('width' in node && 'height' in node) {
      const n = node as { width: number; height: number };
      const w = Math.round(n.width);
      const h = Math.round(n.height);
      parts.push(`${spaces}${varName}.setLayoutParams(new FrameLayout.LayoutParams(${w}, ${h}));`);
    }

    // Background color
    if ('fills' in node) {
      const fill = this.getFirstSolidFill((node as FrameNodeData).fills);
      if (fill) {
        const hex = this.rgbaToHex(fill);
        parts.push(`${spaces}${varName}.setBackgroundColor(Color.parseColor("#${hex}"));`);
      }
    }

    return parts.join('\n');
  }

  // =========================================================================
  // Resource XML Generation
  // =========================================================================

  private generateColorsXml(): string {
    const parts: string[] = [];
    parts.push('<?xml version="1.0" encoding="utf-8"?>');
    parts.push('<resources>');

    for (const [_key, color] of this.extractedColors) {
      const hex = this.rgbaToHex(color.rgba);
      parts.push(`    <color name="${color.name}">#${hex}</color>`);
    }

    parts.push('</resources>');
    return parts.join('\n');
  }

  private generateDimensXml(): string {
    const parts: string[] = [];
    parts.push('<?xml version="1.0" encoding="utf-8"?>');
    parts.push('<resources>');

    for (const [value, name] of this.extractedDimens) {
      parts.push(`    <dimen name="${name}">${value}dp</dimen>`);
    }

    parts.push('</resources>');
    return parts.join('\n');
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private extractDesignTokens(nodeId: NodeId): void {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return;

    // Extract colors
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

    // Extract dimensions
    if ('width' in node) {
      this.registerDimen((node as { width: number }).width);
    }
    if ('height' in node) {
      this.registerDimen((node as { height: number }).height);
    }
    if ('cornerRadius' in node) {
      this.registerDimen((node as { cornerRadius: number }).cornerRadius);
    }

    const childIds = this.sceneGraph.getChildIds(nodeId);
    for (const childId of childIds) {
      this.extractDesignTokens(childId);
    }
  }

  private registerColor(color: RGBA): string {
    const key = this.colorToKey(color);
    if (!this.extractedColors.has(key)) {
      const name = `designlibre_color_${++this.colorIndex}`;
      this.extractedColors.set(key, { name, rgba: color });
    }
    return this.extractedColors.get(key)!.name;
  }

  private registerDimen(value: number): string {
    const rounded = Math.round(value);
    if (!this.extractedDimens.has(rounded)) {
      const name = `designlibre_dimen_${++this.dimenIndex}`;
      this.extractedDimens.set(rounded, name);
    }
    return this.extractedDimens.get(rounded)!;
  }

  private getColorName(color: RGBA): string {
    if (this.useTokens) {
      // Return token reference instead of extracted color name
      const tokenName = this.mapColorToToken(color);
      return `${this.tokenPrefix}.Colors.${tokenName}`;
    }
    const key = this.colorToKey(color);
    return this.extractedColors.get(key)?.name ?? 'Color.Black';
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

  private rgbaToHex(color: RGBA): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
    return `${a}${r}${g}${b}`.toUpperCase();
  }

  private getFirstSolidFill(fills: readonly { type: string; visible?: boolean; color?: RGBA }[] | undefined): RGBA | null {
    if (!fills) return null;
    const solid = fills.find(f => f.type === 'SOLID' && f.visible !== false);
    return solid?.color ?? null;
  }

  private kotlinFontWeight(weight: number): string {
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

  // ===========================================================================
  // State Generation Helpers
  // ===========================================================================

  /**
   * Collect all variable IDs used in state bindings throughout the node tree
   */
  private collectUsedVariables(nodeId: NodeId): Set<string> {
    const usedVars = new Set<string>();

    const traverse = (id: NodeId) => {
      const node = this.sceneGraph.getNode(id);
      if (!node) return;

      // Get semantic metadata
      const pluginData = (node as NodeData & { pluginData?: Record<string, unknown> }).pluginData;
      const semantic = getSemanticMetadata(pluginData);
      if (semantic?.stateBindings) {
        for (const binding of semantic.stateBindings) {
          usedVars.add(binding.variableId);
        }
      }

      // Traverse children
      const children = this.sceneGraph.getChildIds(id);
      for (const childId of children) {
        traverse(childId);
      }
    };

    traverse(nodeId);
    return usedVars;
  }

  /**
   * Generate Compose state declarations
   */
  private generateComposeStateDeclarations(usedVariableIds: Set<string>): string {
    const lines: string[] = [];

    for (const varId of usedVariableIds) {
      const variable = this.variableMap.get(varId);
      if (!variable) continue;

      const kotlinType = this.variableTypeToKotlin(variable.type);
      const defaultValue = this.formatKotlinDefaultValue(variable.defaultValue, variable.type);
      const varName = this.sanitizeVariableName(variable.name);

      lines.push(`    var ${varName} by remember { mutableStateOf<${kotlinType}>(${defaultValue}) }`);
    }

    return lines.join('\n');
  }

  /**
   * Convert variable type to Kotlin type
   */
  private variableTypeToKotlin(type: VariableType): string {
    switch (type) {
      case 'boolean': return 'Boolean';
      case 'number': return 'Double';
      case 'string': return 'String';
      case 'color': return 'Color';
      default: return 'Any';
    }
  }

  /**
   * Format a default value for Kotlin
   */
  private formatKotlinDefaultValue(value: boolean | number | string, type: VariableType): string {
    switch (type) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'number':
        return String(value);
      case 'string':
        return `"${this.escapeString(String(value))}"`;
      case 'color':
        return 'Color.White';
      default:
        return String(value);
    }
  }

  /**
   * Sanitize a variable name for Kotlin (camelCase)
   */
  private sanitizeVariableName(name: string): string {
    let result = name.replace(/[^a-zA-Z0-9]+/g, '_');
    if (result.length > 0 && result[0]) {
      result = result[0].toLowerCase() + result.slice(1);
    }
    if (/^[0-9]/.test(result)) {
      result = '_' + result;
    }
    return result || 'value';
  }
}

/**
 * Create an Android code generator.
 */
export function createAndroidCodeGenerator(sceneGraph: SceneGraph): AndroidCodeGenerator {
  return new AndroidCodeGenerator(sceneGraph);
}
