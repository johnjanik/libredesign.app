/**
 * Tool Executor
 *
 * Executes AI tools against the DesignLibre runtime.
 */

import type {
  RuntimeBridge,
  ColorValue,
  RectangleOptions,
  EllipseOptions,
  TextOptions,
  FrameOptions,
  LineOptions,
} from './runtime-bridge';
import { getGlobalBridge, parseHexColor } from './runtime-bridge';
import { getToolDefinition } from './tool-registry';
import type { ToolDefinition } from './tool-registry';
import { getConfigManager } from '@ai/config/config-manager';

/**
 * Attached image from user message
 */
export interface AttachedImage {
  data: string; // base64
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
}

/**
 * Message context for tool execution (includes attached images)
 */
export interface MessageContext {
  attachedImages: AttachedImage[];
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  data: unknown;
  message: string;
  error?: string;
  duration?: number;
}

/**
 * Tool call request
 */
export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

/**
 * Execution context
 */
export interface ExecutionContext {
  selection: string[];
  timestamp: number;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Tool error
 */
export interface ToolError {
  tool: string;
  error: Error;
  severity: ErrorSeverity;
  context: ExecutionContext;
}

/**
 * Helper to get string argument
 */
function getStringArg(args: Record<string, unknown>, key: string): string | undefined {
  const val = args[key];
  return typeof val === 'string' ? val : undefined;
}

/**
 * Helper to get number argument
 */
function getNumberArg(args: Record<string, unknown>, key: string): number | undefined {
  const val = args[key];
  return typeof val === 'number' ? val : undefined;
}

/**
 * Helper to get boolean argument
 */
function getBoolArg(args: Record<string, unknown>, key: string): boolean | undefined {
  const val = args[key];
  return typeof val === 'boolean' ? val : undefined;
}

/**
 * Helper to get string array argument
 */
function getStringArrayArg(args: Record<string, unknown>, key: string): string[] | undefined {
  const val = args[key];
  return Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string') : undefined;
}

/**
 * Tool Executor
 */
export class ToolExecutor {
  private bridge: RuntimeBridge;
  private messageContext: MessageContext | null = null;

  constructor(bridge?: RuntimeBridge) {
    this.bridge = bridge ?? getGlobalBridge();
  }

  /**
   * Set the message context (attached images, etc.) for tool execution.
   * Called before executing tools that need access to message attachments.
   */
  setMessageContext(context: MessageContext | null): void {
    this.messageContext = context;
  }

  /**
   * Get the current message context
   */
  getMessageContext(): MessageContext | null {
    return this.messageContext;
  }

  /**
   * Execute a single tool
   */
  async executeTool(call: ToolCall): Promise<ToolResult> {
    const startTime = performance.now();

    // Validate tool exists
    const definition = getToolDefinition(call.tool);
    if (!definition) {
      return {
        success: false,
        data: null,
        message: `Unknown tool: ${call.tool}`,
        error: `Tool "${call.tool}" is not registered`,
        duration: performance.now() - startTime,
      };
    }

    try {
      // Execute the tool
      const result = await this.executeToolImpl(call.tool, call.args, definition);

      return {
        success: true,
        data: result,
        message: this.formatSuccessMessage(call.tool, result),
        duration: performance.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        data: null,
        message: `Failed to execute ${call.tool}`,
        error: errorMessage,
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Execute multiple tools in sequence
   */
  async executeToolChain(calls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of calls) {
      const result = await this.executeTool(call);
      results.push(result);

      // Stop on critical errors
      if (!result.success) {
        const severity = this.assessErrorSeverity(call.tool, result.error || '');
        if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Execute tool implementation
   */
  private async executeToolImpl(
    tool: string,
    args: Record<string, unknown>,
    _definition: ToolDefinition
  ): Promise<unknown> {
    // Get current selection for tools that use it as default
    const selection = await this.bridge.getSelection();

    switch (tool) {
      // =====================================================================
      // Selection Tools
      // =====================================================================

      case 'select_all': {
        const ids = await this.bridge.selectAll();
        return { selectedIds: ids, count: ids.length };
      }

      case 'select_by_name': {
        const pattern = getStringArg(args, 'pattern') ?? '';
        const ids = await this.bridge.selectByName(pattern);
        return { selectedIds: ids, count: ids.length };
      }

      case 'select_by_type': {
        const type = getStringArg(args, 'type') ?? '';
        const ids = await this.bridge.selectByType(type);
        return { selectedIds: ids, count: ids.length };
      }

      case 'deselect_all': {
        await this.bridge.clearSelection();
        return { success: true };
      }

      case 'get_selection': {
        const ids = await this.bridge.getSelection();
        const layers = [];
        for (const id of ids) {
          const props = await this.bridge.getLayerProperties(id);
          if (props) {
            layers.push({ id: props.id, name: props.name, type: props.type });
          }
        }
        return { layers, count: layers.length };
      }

      case 'group_layers': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) {
          throw new Error('No layers to group');
        }
        const groupId = await this.bridge.groupLayers(layerIds);
        return { groupId };
      }

      case 'ungroup_layers': {
        const groupId = getStringArg(args, 'groupId') ?? selection[0];
        if (!groupId) {
          throw new Error('No group selected');
        }
        const childIds = await this.bridge.ungroupLayers(groupId);
        return { childIds };
      }

      case 'lock_layer': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.lockLayer(layerId);
        return { success: true, affectedIds: [layerId] };
      }

      case 'unlock_layer': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.unlockLayer(layerId);
        return { success: true, affectedIds: [layerId] };
      }

      case 'hide_layer': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.hideLayer(layerId);
        return { success: true, affectedIds: [layerId] };
      }

      case 'show_layer': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.showLayer(layerId);
        return { success: true, affectedIds: [layerId] };
      }

      case 'delete_selection': {
        if (selection.length === 0) {
          throw new Error('No layers selected');
        }
        await this.bridge.deleteLayers(selection);
        return { deletedCount: selection.length };
      }

      // =====================================================================
      // Creation Tools
      // =====================================================================

      case 'create_rectangle': {
        const options: RectangleOptions = {
          x: getNumberArg(args, 'x') ?? 0,
          y: getNumberArg(args, 'y') ?? 0,
          width: getNumberArg(args, 'width') ?? 100,
          height: getNumberArg(args, 'height') ?? 100,
        };
        const fill = this.normalizeColor(args['fill']);
        if (fill) options.fill = fill;
        const stroke = this.normalizeColor(args['stroke']);
        if (stroke) options.stroke = stroke;
        const strokeWidth = getNumberArg(args, 'strokeWidth');
        if (strokeWidth !== undefined) options.strokeWidth = strokeWidth;
        const cornerRadius = getNumberArg(args, 'cornerRadius');
        if (cornerRadius !== undefined) options.cornerRadius = cornerRadius;
        const name = getStringArg(args, 'name');
        if (name) options.name = name;

        const layerId = await this.bridge.createRectangle(options);
        return { layerId };
      }

      case 'create_ellipse': {
        const options: EllipseOptions = {
          x: getNumberArg(args, 'x') ?? 0,
          y: getNumberArg(args, 'y') ?? 0,
          width: getNumberArg(args, 'width') ?? 100,
          height: getNumberArg(args, 'height') ?? 100,
        };
        const fill = this.normalizeColor(args['fill']);
        if (fill) options.fill = fill;
        const stroke = this.normalizeColor(args['stroke']);
        if (stroke) options.stroke = stroke;
        const strokeWidth = getNumberArg(args, 'strokeWidth');
        if (strokeWidth !== undefined) options.strokeWidth = strokeWidth;
        const name = getStringArg(args, 'name');
        if (name) options.name = name;

        const layerId = await this.bridge.createEllipse(options);
        return { layerId };
      }

      case 'create_text': {
        const options: TextOptions = {
          x: getNumberArg(args, 'x') ?? 0,
          y: getNumberArg(args, 'y') ?? 0,
          content: getStringArg(args, 'content') ?? 'Text',
        };
        const fontSize = getNumberArg(args, 'fontSize');
        if (fontSize !== undefined) options.fontSize = fontSize;
        const fontFamily = getStringArg(args, 'fontFamily');
        if (fontFamily) options.fontFamily = fontFamily;
        const fill = this.normalizeColor(args['fill']);
        if (fill) options.fill = fill;
        const name = getStringArg(args, 'name');
        if (name) options.name = name;

        const layerId = await this.bridge.createText(options);
        return { layerId };
      }

      case 'create_frame': {
        const options: FrameOptions = {
          x: getNumberArg(args, 'x') ?? 0,
          y: getNumberArg(args, 'y') ?? 0,
          width: getNumberArg(args, 'width') ?? 100,
          height: getNumberArg(args, 'height') ?? 100,
        };
        const fill = this.normalizeColor(args['fill']);
        if (fill) options.fill = fill;
        const name = getStringArg(args, 'name');
        if (name) options.name = name;

        const layerId = await this.bridge.createFrame(options);
        return { layerId };
      }

      case 'create_line': {
        const options: LineOptions = {
          startX: getNumberArg(args, 'startX') ?? 0,
          startY: getNumberArg(args, 'startY') ?? 0,
          endX: getNumberArg(args, 'endX') ?? 100,
          endY: getNumberArg(args, 'endY') ?? 100,
        };
        const stroke = this.normalizeColor(args['stroke']);
        if (stroke) options.stroke = stroke;
        const strokeWidth = getNumberArg(args, 'strokeWidth');
        if (strokeWidth !== undefined) options.strokeWidth = strokeWidth;
        const name = getStringArg(args, 'name');
        if (name) options.name = name;

        const layerId = await this.bridge.createLine(options);
        return { layerId };
      }

      // =====================================================================
      // Styling Tools
      // =====================================================================

      case 'set_fill_color': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const color = this.normalizeColor(args['color']);
        if (!color) {
          throw new Error('Color is required');
        }
        await this.bridge.setFillColor(layerId, color);
        return { success: true, affectedIds: [layerId] };
      }

      case 'set_stroke_color': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const color = this.normalizeColor(args['color']);
        if (!color) {
          throw new Error('Color is required');
        }
        await this.bridge.setStrokeColor(layerId, color);
        return { success: true, affectedIds: [layerId] };
      }

      case 'set_stroke_width': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.setStrokeWidth(layerId, getNumberArg(args, 'width') ?? 1);
        return { success: true, affectedIds: [layerId] };
      }

      case 'set_opacity': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.setOpacity(layerId, getNumberArg(args, 'opacity') ?? 1);
        return { success: true, affectedIds: [layerId] };
      }

      case 'set_corner_radius': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.setCornerRadius(layerId, getNumberArg(args, 'radius') ?? 0);
        return { success: true, affectedIds: [layerId] };
      }

      // =====================================================================
      // Layout Tools
      // =====================================================================

      case 'align_left':
      case 'align_center_h':
      case 'align_right':
      case 'align_top':
      case 'align_center_v':
      case 'align_bottom': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length < 2) {
          throw new Error('Need at least 2 layers to align');
        }
        const alignment = tool.replace('align_', '').replace('_', '-') as
          | 'left'
          | 'center-h'
          | 'right'
          | 'top'
          | 'center-v'
          | 'bottom';
        await this.bridge.alignLayers(layerIds, alignment);
        return { success: true, affectedIds: layerIds };
      }

      case 'set_position': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.setPosition(
          layerId,
          getNumberArg(args, 'x') ?? 0,
          getNumberArg(args, 'y') ?? 0
        );
        return { success: true, affectedIds: [layerId] };
      }

      case 'set_size': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.setSize(
          layerId,
          getNumberArg(args, 'width') ?? 100,
          getNumberArg(args, 'height') ?? 100
        );
        return { success: true, affectedIds: [layerId] };
      }

      case 'rotate': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.setRotation(layerId, getNumberArg(args, 'degrees') ?? 0);
        return { success: true, affectedIds: [layerId] };
      }

      case 'move_by': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const dx = getNumberArg(args, 'dx') ?? 0;
        const dy = getNumberArg(args, 'dy') ?? 0;

        // Get current position
        const props = await this.bridge.getLayerProperties(layerId);
        if (!props) {
          throw new Error('Layer not found');
        }

        // Calculate new position
        const newX = props.bounds.x + dx;
        const newY = props.bounds.y + dy;

        await this.bridge.setPosition(layerId, newX, newY);
        return { success: true, newPosition: { x: newX, y: newY }, affectedIds: [layerId] };
      }

      case 'scale': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const scaleX = getNumberArg(args, 'scaleX') ?? getNumberArg(args, 'scale') ?? 1;
        const scaleY = getNumberArg(args, 'scaleY') ?? getNumberArg(args, 'scale') ?? scaleX;

        // Get current size
        const props = await this.bridge.getLayerProperties(layerId);
        if (!props) {
          throw new Error('Layer not found');
        }

        // Calculate new size
        const newWidth = Math.round(props.bounds.width * scaleX);
        const newHeight = Math.round(props.bounds.height * scaleY);

        await this.bridge.setSize(layerId, newWidth, newHeight);
        return { success: true, newSize: { width: newWidth, height: newHeight }, affectedIds: [layerId] };
      }

      case 'rename_layer': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const name = getStringArg(args, 'name');
        if (!name) {
          throw new Error('Name is required');
        }
        await this.bridge.renameLayer(layerId, name);
        return { success: true, affectedIds: [layerId] };
      }

      case 'duplicate_layer': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const duplicateId = await this.bridge.duplicateLayer(layerId);
        // Apply offset if specified
        const offset = args.offset as { x?: number; y?: number } | undefined;
        if (offset && (offset.x || offset.y)) {
          await this.bridge.moveBy(duplicateId, offset.x ?? 0, offset.y ?? 0);
        }
        return { success: true, duplicateId, affectedIds: [duplicateId] };
      }

      // =====================================================================
      // Effects Tools
      // =====================================================================

      case 'add_drop_shadow': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const color = this.normalizeColor(args['color']);
        const offsetX = getNumberArg(args, 'offsetX');
        const offsetY = getNumberArg(args, 'offsetY');
        const radius = getNumberArg(args, 'radius');
        const spread = getNumberArg(args, 'spread');

        // Build options object with only defined values
        const shadowOptions: {
          color?: ColorValue;
          offsetX?: number;
          offsetY?: number;
          radius?: number;
          spread?: number;
        } = {};
        if (color) shadowOptions.color = color;
        if (offsetX !== undefined) shadowOptions.offsetX = offsetX;
        if (offsetY !== undefined) shadowOptions.offsetY = offsetY;
        if (radius !== undefined) shadowOptions.radius = radius;
        if (spread !== undefined) shadowOptions.spread = spread;

        await this.bridge.addDropShadow(layerId, shadowOptions);
        return { success: true, affectedIds: [layerId] };
      }

      case 'add_blur': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const radius = getNumberArg(args, 'radius') ?? 10;
        await this.bridge.addBlur(layerId, radius);
        return { success: true, affectedIds: [layerId] };
      }

      case 'remove_effects': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        await this.bridge.removeEffects(layerId);
        return { success: true, affectedIds: [layerId] };
      }

      case 'set_blend_mode': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const blendMode = getStringArg(args, 'blendMode');
        if (!blendMode) {
          throw new Error('Blend mode is required');
        }
        await this.bridge.setBlendMode(layerId, blendMode);
        return { success: true, affectedIds: [layerId] };
      }

      // =====================================================================
      // Typography Tools
      // =====================================================================

      case 'set_font_family': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const fontFamily = getStringArg(args, 'fontFamily');
        if (!fontFamily) {
          throw new Error('Font family is required');
        }
        await this.bridge.setFontFamily(layerId, fontFamily);
        return { success: true, affectedIds: [layerId] };
      }

      case 'set_font_size': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const size = getNumberArg(args, 'size');
        if (size === undefined || size < 1) {
          throw new Error('Font size is required and must be at least 1');
        }
        await this.bridge.setFontSize(layerId, size);
        return { success: true, affectedIds: [layerId] };
      }

      case 'set_font_weight': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const weightArg = args['weight'];
        let weight: number;

        // Convert weight string to number
        if (typeof weightArg === 'number') {
          weight = weightArg;
        } else if (typeof weightArg === 'string') {
          const weightMap: Record<string, number> = {
            'thin': 100, '100': 100,
            'light': 300, '200': 200, '300': 300,
            'regular': 400, '400': 400,
            'medium': 500, '500': 500,
            'semibold': 600, '600': 600,
            'bold': 700, '700': 700,
            'extrabold': 800, '800': 800,
            'black': 900, '900': 900,
          };
          weight = weightMap[weightArg.toLowerCase()] ?? 400;
        } else {
          throw new Error('Font weight is required');
        }

        await this.bridge.setFontWeight(layerId, weight);
        return { success: true, affectedIds: [layerId] };
      }

      case 'set_text_alignment': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const alignmentArg = getStringArg(args, 'alignment');
        if (!alignmentArg) {
          throw new Error('Alignment is required');
        }

        // Map lowercase to uppercase enum values
        const alignmentMap: Record<string, 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'> = {
          'left': 'LEFT',
          'center': 'CENTER',
          'right': 'RIGHT',
          'justify': 'JUSTIFIED',
          'justified': 'JUSTIFIED',
        };
        const alignment = alignmentMap[alignmentArg.toLowerCase()];
        if (!alignment) {
          throw new Error(`Invalid alignment: ${alignmentArg}`);
        }

        await this.bridge.setTextAlignment(layerId, alignment);
        return { success: true, affectedIds: [layerId] };
      }

      case 'set_line_height': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const lineHeightArg = args['lineHeight'];
        const unit = getStringArg(args, 'unit') ?? 'percent';

        let lineHeight: number | 'AUTO';
        if (unit === 'auto' || lineHeightArg === 'auto') {
          lineHeight = 'AUTO';
        } else if (typeof lineHeightArg === 'number') {
          lineHeight = lineHeightArg;
        } else {
          throw new Error('Line height is required');
        }

        await this.bridge.setLineHeight(layerId, lineHeight);
        return { success: true, affectedIds: [layerId] };
      }

      case 'set_letter_spacing': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const spacing = getNumberArg(args, 'spacing');
        if (spacing === undefined) {
          throw new Error('Letter spacing is required');
        }
        await this.bridge.setLetterSpacing(layerId, spacing);
        return { success: true, affectedIds: [layerId] };
      }

      case 'replace_text': {
        const findText = getStringArg(args, 'find');
        const replaceText = getStringArg(args, 'replace');
        if (!findText || replaceText === undefined) {
          throw new Error('Find and replace text are required');
        }

        // If a specific layer is selected, replace only in that layer
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (layerId) {
          const props = await this.bridge.getLayerProperties(layerId);
          if (props && props.type === 'TEXT') {
            // For now, we'll use setTextContent which replaces the entire text
            // A more sophisticated implementation would preserve style ranges
            await this.bridge.setTextContent(layerId, replaceText);
            return { success: true, replacedCount: 1, affectedIds: [layerId] };
          }
        }

        // TODO: Implement global find/replace across all text layers
        return { success: true, replacedCount: 0, affectedIds: [] };
      }

      // =====================================================================
      // Transform Tools (flip, distribute, tidy)
      // =====================================================================

      case 'flip_horizontal': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        await this.bridge.flipHorizontal(layerId);
        return { success: true, affectedIds: [layerId] };
      }

      case 'flip_vertical': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        await this.bridge.flipVertical(layerId);
        return { success: true, affectedIds: [layerId] };
      }

      case 'distribute_horizontal': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length < 3) throw new Error('Need at least 3 layers to distribute');
        const spacing = getNumberArg(args, 'spacing');
        await this.bridge.distributeHorizontal(layerIds, spacing);
        return { success: true, affectedIds: layerIds };
      }

      case 'distribute_vertical': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length < 3) throw new Error('Need at least 3 layers to distribute');
        const spacing = getNumberArg(args, 'spacing');
        await this.bridge.distributeVertical(layerIds, spacing);
        return { success: true, affectedIds: layerIds };
      }

      case 'tidy_up': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const columns = getNumberArg(args, 'columns');
        const spacing = getNumberArg(args, 'spacing') ?? 10;
        await this.bridge.tidyUp(layerIds, columns, spacing);
        return { success: true, affectedIds: layerIds };
      }

      // =====================================================================
      // Editing Tools
      // =====================================================================

      case 'undo': {
        await this.bridge.undo();
        return { success: true };
      }

      case 'redo': {
        await this.bridge.redo();
        return { success: true };
      }

      case 'copy': {
        if (selection.length === 0) throw new Error('No layers selected');
        await this.bridge.copyLayers(selection);
        return { success: true };
      }

      case 'paste': {
        const pastedIds = await this.bridge.paste();
        return { success: true, pastedIds };
      }

      case 'paste_here': {
        const x = getNumberArg(args, 'x');
        const y = getNumberArg(args, 'y');
        if (x === undefined || y === undefined) throw new Error('X and Y coordinates are required');
        const pastedIds = await this.bridge.pasteHere(x, y);
        return { success: true, pastedIds };
      }

      // =====================================================================
      // Code Generation Tools
      // =====================================================================

      case 'generate_css': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const includeLayout = getBoolArg(args, 'includeLayout') ?? true;
        const useVariables = getBoolArg(args, 'useVariables') ?? false;
        const css = await this.bridge.generateCSS(layerId, { includeLayout, useVariables });
        return { success: true, css };
      }

      case 'generate_tailwind': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const result = await this.bridge.generateTailwind(layerId);
        return { success: true, classes: result.classes, html: result.html };
      }

      case 'generate_swift': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const componentName = getStringArg(args, 'componentName');
        const code = await this.bridge.generateSwift(layerId, componentName);
        return { success: true, code };
      }

      case 'generate_android': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const componentName = getStringArg(args, 'componentName');
        const code = await this.bridge.generateAndroid(layerId, componentName);
        return { success: true, code };
      }

      case 'generate_react': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const componentName = getStringArg(args, 'componentName');
        const styleFormat = getStringArg(args, 'styleFormat') as 'inline' | 'css' | 'styled-components' | 'tailwind' | undefined;
        const code = await this.bridge.generateReact(layerId, componentName, styleFormat);
        return { success: true, code };
      }

      case 'generate_html': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const inlineStyles = getBoolArg(args, 'inlineStyles') ?? false;
        const result = await this.bridge.generateHTML(layerId, inlineStyles);
        return { success: true, html: result.html, css: result.css };
      }

      case 'copy_as_code': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const format = getStringArg(args, 'format');
        if (!format) throw new Error('Code format is required');

        let code: string;
        switch (format) {
          case 'css':
            code = await this.bridge.generateCSS(layerId);
            break;
          case 'swift':
            code = await this.bridge.generateSwift(layerId);
            break;
          case 'android':
            code = await this.bridge.generateAndroid(layerId);
            break;
          case 'react':
            code = await this.bridge.generateReact(layerId);
            break;
          case 'tailwind': {
            const result = await this.bridge.generateTailwind(layerId);
            code = result.classes;
            break;
          }
          default:
            throw new Error(`Unknown code format: ${format}`);
        }

        // In a browser environment, we'd copy to clipboard
        // For now, just return the code
        return { success: true, code };
      }

      // =====================================================================
      // Export Tools
      // =====================================================================

      case 'export_png': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const scale = getNumberArg(args, 'scale') ?? 1;
        const blob = await this.bridge.exportPNG(layerId, scale);
        // Convert blob to data URL for returning
        const url = URL.createObjectURL(blob);
        return { success: true, url };
      }

      case 'export_svg': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const svg = await this.bridge.exportSVG(layerId);
        return { success: true, svg };
      }

      case 'export_to_json': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const includeChildren = getBoolArg(args, 'includeChildren') ?? true;
        const json = await this.bridge.exportToJSON(layerId, includeChildren);
        return { success: true, json };
      }

      case 'batch_export': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const format = getStringArg(args, 'format') as 'png' | 'jpg' | 'svg' | 'pdf';
        if (!format) throw new Error('Export format is required');
        const scale = getNumberArg(args, 'scale') ?? 1;
        const result = await this.bridge.batchExport(layerIds, format, scale);
        return { success: true, exportedCount: result.exportedCount, files: result.files };
      }

      // =====================================================================
      // Component Tools
      // =====================================================================

      case 'create_component': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const name = getStringArg(args, 'name');
        const description = getStringArg(args, 'description');
        const componentId = await this.bridge.createComponent(layerId, name, description);
        return { success: true, componentId };
      }

      case 'create_component_set': {
        const componentIds = getStringArrayArg(args, 'componentIds');
        if (!componentIds || componentIds.length === 0) throw new Error('Component IDs are required');
        const name = getStringArg(args, 'name');
        const componentSetId = await this.bridge.createComponentSet(componentIds, name);
        return { success: true, componentSetId };
      }

      case 'create_instance': {
        const componentId = getStringArg(args, 'componentId');
        if (!componentId) throw new Error('Component ID is required');
        const x = getNumberArg(args, 'x');
        const y = getNumberArg(args, 'y');
        const instanceId = await this.bridge.createInstance(componentId, x, y);
        return { success: true, instanceId };
      }

      case 'detach_instance': {
        const instanceId = getStringArg(args, 'instanceId') ?? selection[0];
        if (!instanceId) throw new Error('No instance selected');
        const frameId = await this.bridge.detachInstance(instanceId);
        return { success: true, frameId };
      }

      case 'reset_instance': {
        const instanceId = getStringArg(args, 'instanceId') ?? selection[0];
        if (!instanceId) throw new Error('No instance selected');
        await this.bridge.resetInstance(instanceId);
        return { success: true };
      }

      case 'push_overrides_to_main': {
        const instanceId = getStringArg(args, 'instanceId') ?? selection[0];
        if (!instanceId) throw new Error('No instance selected');
        await this.bridge.pushOverridesToMain(instanceId);
        return { success: true };
      }

      case 'swap_component': {
        const instanceId = getStringArg(args, 'instanceId') ?? selection[0];
        if (!instanceId) throw new Error('No instance selected');
        const newComponentId = getStringArg(args, 'newComponentId');
        if (!newComponentId) throw new Error('New component ID is required');
        await this.bridge.swapComponent(instanceId, newComponentId);
        return { success: true };
      }

      case 'go_to_main_component': {
        const instanceId = getStringArg(args, 'instanceId') ?? selection[0];
        if (!instanceId) throw new Error('No instance selected');
        const componentId = await this.bridge.goToMainComponent(instanceId);
        return { success: true, componentId };
      }

      case 'list_component_instances': {
        const componentId = getStringArg(args, 'componentId');
        if (!componentId) throw new Error('Component ID is required');
        const instances = await this.bridge.listComponentInstances(componentId);
        return { success: true, instances, count: instances.length };
      }

      case 'add_component_property': {
        const componentId = getStringArg(args, 'componentId');
        if (!componentId) throw new Error('Component ID is required');
        const propertyName = getStringArg(args, 'propertyName');
        if (!propertyName) throw new Error('Property name is required');
        const propertyType = getStringArg(args, 'propertyType');
        if (!propertyType) throw new Error('Property type is required');
        const defaultValue = getStringArg(args, 'defaultValue');
        await this.bridge.addComponentProperty(componentId, propertyName, propertyType, defaultValue);
        return { success: true };
      }

      case 'set_component_description': {
        const componentId = getStringArg(args, 'componentId');
        if (!componentId) throw new Error('Component ID is required');
        const description = getStringArg(args, 'description');
        if (!description) throw new Error('Description is required');
        await this.bridge.setComponentDescription(componentId, description);
        return { success: true };
      }

      // =====================================================================
      // Style Tools
      // =====================================================================

      case 'create_color_style': {
        const name = getStringArg(args, 'name');
        if (!name) throw new Error('Style name is required');
        const colorHex = getStringArg(args, 'color');
        if (!colorHex) throw new Error('Color is required');
        const color = parseHexColor(colorHex);
        const description = getStringArg(args, 'description');
        const styleId = await this.bridge.createColorStyle(name, color, description);
        return { success: true, styleId };
      }

      case 'create_text_style': {
        const name = getStringArg(args, 'name');
        if (!name) throw new Error('Style name is required');
        const fontFamily = getStringArg(args, 'fontFamily') ?? 'Inter';
        const fontSize = getNumberArg(args, 'fontSize') ?? 14;
        const fontWeight = getStringArg(args, 'fontWeight');
        const lineHeight = getNumberArg(args, 'lineHeight');
        const letterSpacing = getNumberArg(args, 'letterSpacing');
        const styleId = await this.bridge.createTextStyle(name, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing);
        return { success: true, styleId };
      }

      case 'create_effect_style': {
        const name = getStringArg(args, 'name');
        if (!name) throw new Error('Style name is required');
        const effects = args['effects'] as unknown[];
        if (!effects || !Array.isArray(effects)) throw new Error('Effects array is required');
        const styleId = await this.bridge.createEffectStyle(name, effects);
        return { success: true, styleId };
      }

      case 'apply_style': {
        const styleId = getStringArg(args, 'styleId');
        if (!styleId) throw new Error('Style ID is required');
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        await this.bridge.applyStyle(styleId, layerIds);
        return { success: true, affectedIds: layerIds };
      }

      case 'detach_style': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const styleType = getStringArg(args, 'styleType') as 'fill' | 'stroke' | 'text' | 'effect' | 'all' | undefined;
        await this.bridge.detachStyle(layerIds, styleType);
        return { success: true, affectedIds: layerIds };
      }

      case 'list_local_styles': {
        const styleType = getStringArg(args, 'styleType') as 'color' | 'text' | 'effect' | 'all' | undefined;
        const styles = await this.bridge.listLocalStyles(styleType);
        return { success: true, styles, count: styles.length };
      }

      case 'find_unused_styles': {
        const unusedStyles = await this.bridge.findUnusedStyles();
        return { success: true, styles: unusedStyles, count: unusedStyles.length };
      }

      // =====================================================================
      // Fill & Stroke Tools
      // =====================================================================

      case 'set_fill_gradient': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const gradientType = getStringArg(args, 'type') as 'linear' | 'radial' | 'angular' | 'diamond';
        if (!gradientType) throw new Error('Gradient type is required');
        const stops = args['stops'] as Array<{ position: number; color: string }>;
        if (!stops || !Array.isArray(stops)) throw new Error('Gradient stops are required');

        // Convert color strings to ColorValue objects
        const colorStops = stops.map(stop => ({
          position: stop.position,
          color: parseHexColor(typeof stop.color === 'string' ? stop.color : (stop.color as { hex?: string }).hex ?? '#000000'),
        }));

        const angle = getNumberArg(args, 'angle');
        await this.bridge.setFillGradient(layerId, gradientType, colorStops, angle);
        return { success: true };
      }

      case 'remove_fill': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        await this.bridge.removeFill(layerId);
        return { success: true };
      }

      case 'remove_stroke': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        await this.bridge.removeStroke(layerId);
        return { success: true };
      }

      case 'swap_fill_stroke': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        await this.bridge.swapFillStroke(layerId);
        return { success: true };
      }

      case 'copy_style': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        await this.bridge.copyStyle(layerId);
        return { success: true };
      }

      case 'paste_style': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        await this.bridge.pasteStyle(layerIds);
        return { success: true, affectedIds: layerIds };
      }

      // =====================================================================
      // Prototyping Tools
      // =====================================================================

      case 'add_interaction': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const trigger = getStringArg(args, 'trigger') as 'on_click' | 'on_hover' | 'on_press' | 'on_drag' | 'after_delay' | 'mouse_enter' | 'mouse_leave';
        if (!trigger) throw new Error('Trigger is required');
        const action = getStringArg(args, 'action') as 'navigate' | 'open_overlay' | 'close_overlay' | 'back' | 'scroll_to' | 'open_url';
        if (!action) throw new Error('Action is required');
        const destinationId = getStringArg(args, 'destinationId');
        const interactionId = await this.bridge.addInteraction(layerId, trigger, action, destinationId);
        return { success: true, interactionId };
      }

      case 'remove_interactions': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        await this.bridge.removeInteractions(layerId);
        return { success: true };
      }

      case 'set_transition': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const transitionType = getStringArg(args, 'transitionType') as 'instant' | 'dissolve' | 'smart_animate' | 'move_in' | 'move_out' | 'push' | 'slide_in' | 'slide_out';
        if (!transitionType) throw new Error('Transition type is required');
        const duration = getNumberArg(args, 'duration');
        const easing = getStringArg(args, 'easing') as 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'ease_in_back' | 'ease_out_back' | 'spring' | undefined;
        await this.bridge.setTransition(layerId, transitionType, duration, easing);
        return { success: true };
      }

      case 'list_all_interactions': {
        const pageId = getStringArg(args, 'pageId');
        const result = await this.bridge.listAllInteractions(pageId);
        return { success: true, interactions: result.interactions, count: result.count };
      }

      case 'set_starting_frame': {
        const frameId = getStringArg(args, 'frameId');
        if (!frameId) throw new Error('Frame ID is required');
        await this.bridge.setStartingFrame(frameId);
        return { success: true };
      }

      case 'set_device_frame': {
        const device = getStringArg(args, 'device') as 'iphone_14' | 'iphone_14_pro' | 'iphone_se' | 'android_small' | 'android_large' | 'ipad' | 'desktop' | 'none';
        if (!device) throw new Error('Device is required');
        await this.bridge.setDeviceFrame(device);
        return { success: true };
      }

      case 'preview_prototype': {
        const frameId = getStringArg(args, 'frameId');
        await this.bridge.previewPrototype(frameId);
        return { success: true };
      }

      // =====================================================================
      // Auto-Layout Tools
      // =====================================================================

      case 'add_auto_layout': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const direction = (getStringArg(args, 'direction') ?? 'horizontal') as 'horizontal' | 'vertical';
        const gap = getNumberArg(args, 'gap') ?? 10;
        const padding = getNumberArg(args, 'padding') ?? 10;
        await this.bridge.addAutoLayout(layerId, direction, gap, padding);
        return { success: true };
      }

      case 'remove_auto_layout': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        await this.bridge.removeAutoLayout(layerId);
        return { success: true };
      }

      case 'set_layout_direction': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const direction = getStringArg(args, 'direction') as 'horizontal' | 'vertical';
        if (!direction) throw new Error('Direction is required');
        await this.bridge.setLayoutDirection(layerId, direction);
        return { success: true };
      }

      case 'set_layout_gap': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const gap = getNumberArg(args, 'gap');
        if (gap === undefined) throw new Error('Gap is required');
        await this.bridge.setLayoutGap(layerId, gap);
        return { success: true };
      }

      case 'set_layout_padding': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const padding: { top?: number; right?: number; bottom?: number; left?: number; all?: number } = {};
        const all = getNumberArg(args, 'all');
        if (all !== undefined) {
          padding.all = all;
        } else {
          const top = getNumberArg(args, 'top');
          const right = getNumberArg(args, 'right');
          const bottom = getNumberArg(args, 'bottom');
          const left = getNumberArg(args, 'left');
          if (top !== undefined) padding.top = top;
          if (right !== undefined) padding.right = right;
          if (bottom !== undefined) padding.bottom = bottom;
          if (left !== undefined) padding.left = left;
        }
        await this.bridge.setLayoutPadding(layerId, padding);
        return { success: true };
      }

      // =====================================================================
      // Variable Tools
      // =====================================================================

      case 'create_variable': {
        const name = getStringArg(args, 'name');
        if (!name) throw new Error('Variable name is required');
        const type = (getStringArg(args, 'type') ?? 'string') as 'boolean' | 'number' | 'string' | 'color';

        // Get default value based on type
        let defaultValue: boolean | number | string;
        const rawDefault = args['defaultValue'];
        if (type === 'boolean') {
          defaultValue = rawDefault === true || rawDefault === 'true';
        } else if (type === 'number') {
          defaultValue = typeof rawDefault === 'number' ? rawDefault : Number(rawDefault) || 0;
        } else {
          defaultValue = rawDefault !== undefined ? String(rawDefault) : (type === 'color' ? '#000000' : '');
        }

        const options: { group?: string; description?: string; scope?: 'document' | 'page' | 'component' } = {};
        const group = getStringArg(args, 'group');
        if (group) options.group = group;
        const description = getStringArg(args, 'description');
        if (description) options.description = description;
        const scope = getStringArg(args, 'scope') as 'document' | 'page' | 'component' | undefined;
        if (scope) options.scope = scope;

        const variableId = await this.bridge.createVariable(name, type, defaultValue, options);
        return { success: true, variableId, name, type };
      }

      case 'set_variable_value': {
        const variableId = getStringArg(args, 'variableId');
        if (!variableId) throw new Error('Variable ID is required');
        const value = args['value'];
        if (value === undefined) throw new Error('Value is required');
        await this.bridge.setVariableValue(variableId, value as boolean | number | string);
        return { success: true };
      }

      case 'bind_to_variable': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const propertyName = getStringArg(args, 'propertyName');
        if (!propertyName) throw new Error('Property name is required');
        const variableId = getStringArg(args, 'variableId');
        if (!variableId) throw new Error('Variable ID is required');
        await this.bridge.bindToVariable(layerId, propertyName, variableId);
        return { success: true };
      }

      case 'list_variables': {
        const type = getStringArg(args, 'type') as 'boolean' | 'number' | 'string' | 'color' | 'all' | undefined;
        const group = getStringArg(args, 'group');
        const options: { type?: 'boolean' | 'number' | 'string' | 'color' | 'all'; group?: string } = {};
        if (type) options.type = type;
        if (group) options.group = group;
        const variables = await this.bridge.listVariables(options);
        return { success: true, variables, count: variables.length };
      }

      case 'switch_variable_mode': {
        const modeId = getStringArg(args, 'modeId');
        if (!modeId) throw new Error('Mode ID is required');
        await this.bridge.switchVariableMode(modeId);
        return { success: true };
      }

      // =====================================================================
      // AI-Powered Tools
      // =====================================================================

      case 'generate_image': {
        const prompt = getStringArg(args, 'prompt');
        if (!prompt) throw new Error('Prompt is required');
        const options: {
          width?: number;
          height?: number;
          style?: 'realistic' | 'artistic' | 'illustration' | 'icon';
        } = {};
        const width = getNumberArg(args, 'width');
        if (width) options.width = width;
        const height = getNumberArg(args, 'height');
        if (height) options.height = height;
        const style = getStringArg(args, 'style') as 'realistic' | 'artistic' | 'illustration' | 'icon' | undefined;
        if (style) options.style = style;
        const result = await this.bridge.generateImage(prompt, options);
        return { success: true, ...result };
      }

      case 'remove_background': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        await this.bridge.removeBackground(layerId);
        return { success: true, layerId };
      }

      case 'generate_copy': {
        const context = getStringArg(args, 'context');
        if (!context) throw new Error('Context is required');
        const options: {
          type?: 'headline' | 'body' | 'cta' | 'tagline';
          tone?: 'professional' | 'casual' | 'playful' | 'urgent';
          maxLength?: number;
        } = {};
        const type = getStringArg(args, 'type') as 'headline' | 'body' | 'cta' | 'tagline' | undefined;
        if (type) options.type = type;
        const tone = getStringArg(args, 'tone') as 'professional' | 'casual' | 'playful' | 'urgent' | undefined;
        if (tone) options.tone = tone;
        const maxLength = getNumberArg(args, 'maxLength');
        if (maxLength) options.maxLength = maxLength;
        const result = await this.bridge.generateCopy(context, options);
        return { success: true, ...result };
      }

      case 'rewrite_text': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const options: {
          tone?: 'formal' | 'casual' | 'friendly' | 'professional';
          action?: 'shorten' | 'expand' | 'simplify' | 'rephrase';
        } = {};
        const tone = getStringArg(args, 'tone') as 'formal' | 'casual' | 'friendly' | 'professional' | undefined;
        if (tone) options.tone = tone;
        const action = getStringArg(args, 'action') as 'shorten' | 'expand' | 'simplify' | 'rephrase' | undefined;
        if (action) options.action = action;
        const result = await this.bridge.rewriteText(layerId, options);
        return { success: true, layerId, ...result };
      }

      case 'translate_text': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const targetLanguage = getStringArg(args, 'targetLanguage');
        if (!targetLanguage) throw new Error('Target language is required');
        const result = await this.bridge.translateText(layerId, targetLanguage);
        return { success: true, layerId, ...result };
      }

      case 'suggest_layout': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const result = await this.bridge.suggestLayout(layerIds);
        return { success: true, ...result };
      }

      case 'auto_rename_layers': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const result = await this.bridge.autoRenameLayers(layerIds);
        return { success: true, ...result };
      }

      // =====================================================================
      // Selection Tools
      // =====================================================================

      case 'select_children': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const childIds = await this.bridge.selectChildren(layerId);
        return { success: true, selectedIds: childIds, count: childIds.length };
      }

      case 'select_parent': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const parentId = await this.bridge.selectParent(layerId);
        return { success: true, parentId };
      }

      case 'select_siblings': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const siblingIds = await this.bridge.selectSiblings(layerId);
        return { success: true, selectedIds: siblingIds, count: siblingIds.length };
      }

      case 'select_similar': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const matchProperties = getStringArrayArg(args, 'matchProperties') as ('type' | 'fill' | 'stroke' | 'font' | 'size')[] | undefined;
        const similarIds = await this.bridge.selectSimilar(layerId, matchProperties);
        return { success: true, selectedIds: similarIds, count: similarIds.length };
      }

      case 'invert_selection': {
        const invertedIds = await this.bridge.invertSelection();
        return { success: true, selectedIds: invertedIds, count: invertedIds.length };
      }

      // =====================================================================
      // Layer Management Tools (Additional)
      // =====================================================================

      case 'rename_layers_bulk': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const pattern = getStringArg(args, 'pattern');
        if (!pattern) throw new Error('Pattern is required');
        const changes = await this.bridge.renameLayersBulk(layerIds, pattern);
        return { success: true, changes, count: changes.length };
      }

      case 'flatten_layers': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const flattenedId = await this.bridge.flattenLayers(layerIds);
        return { success: true, flattenedId };
      }

      case 'reorder_layers': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const direction = getStringArg(args, 'direction') as 'up' | 'down' | 'top' | 'bottom';
        if (!direction) throw new Error('Direction is required');
        await this.bridge.reorderLayers(layerIds, direction);
        return { success: true };
      }

      // =====================================================================
      // Shape Creation Tools
      // =====================================================================

      case 'create_polygon': {
        const x = getNumberArg(args, 'x') ?? 0;
        const y = getNumberArg(args, 'y') ?? 0;
        const radius = getNumberArg(args, 'radius') ?? 50;
        const sides = getNumberArg(args, 'sides') ?? 6;
        const options: { fill?: ColorValue; stroke?: ColorValue; name?: string } = {};
        const fill = args['fill'] as ColorValue | undefined;
        if (fill) options.fill = fill;
        const stroke = args['stroke'] as ColorValue | undefined;
        if (stroke) options.stroke = stroke;
        const name = getStringArg(args, 'name');
        if (name) options.name = name;
        const polygonId = await this.bridge.createPolygon(x, y, radius, sides, options);
        return { success: true, polygonId };
      }

      case 'create_star': {
        const x = getNumberArg(args, 'x') ?? 0;
        const y = getNumberArg(args, 'y') ?? 0;
        const outerRadius = getNumberArg(args, 'outerRadius') ?? 50;
        const innerRadius = getNumberArg(args, 'innerRadius') ?? 25;
        const points = getNumberArg(args, 'points') ?? 5;
        const options: { fill?: ColorValue; stroke?: ColorValue; name?: string } = {};
        const fill = args['fill'] as ColorValue | undefined;
        if (fill) options.fill = fill;
        const stroke = args['stroke'] as ColorValue | undefined;
        if (stroke) options.stroke = stroke;
        const name = getStringArg(args, 'name');
        if (name) options.name = name;
        const starId = await this.bridge.createStar(x, y, outerRadius, innerRadius, points, options);
        return { success: true, starId };
      }

      case 'create_arrow': {
        const startX = getNumberArg(args, 'startX') ?? 0;
        const startY = getNumberArg(args, 'startY') ?? 0;
        const endX = getNumberArg(args, 'endX') ?? 100;
        const endY = getNumberArg(args, 'endY') ?? 0;
        const options: { stroke?: ColorValue; strokeWidth?: number; headSize?: number; name?: string } = {};
        const stroke = args['stroke'] as ColorValue | undefined;
        if (stroke) options.stroke = stroke;
        const strokeWidth = getNumberArg(args, 'strokeWidth');
        if (strokeWidth) options.strokeWidth = strokeWidth;
        const headSize = getNumberArg(args, 'headSize');
        if (headSize) options.headSize = headSize;
        const name = getStringArg(args, 'name');
        if (name) options.name = name;
        const arrowId = await this.bridge.createArrow(startX, startY, endX, endY, options);
        return { success: true, arrowId };
      }

      // =====================================================================
      // Appearance Tools
      // =====================================================================

      case 'set_individual_corners': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const corners: { topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number } = {};
        const topLeft = getNumberArg(args, 'topLeft');
        if (topLeft !== undefined) corners.topLeft = topLeft;
        const topRight = getNumberArg(args, 'topRight');
        if (topRight !== undefined) corners.topRight = topRight;
        const bottomRight = getNumberArg(args, 'bottomRight');
        if (bottomRight !== undefined) corners.bottomRight = bottomRight;
        const bottomLeft = getNumberArg(args, 'bottomLeft');
        if (bottomLeft !== undefined) corners.bottomLeft = bottomLeft;
        await this.bridge.setIndividualCorners(layerId, corners);
        return { success: true };
      }

      case 'get_selection_colors': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const colors = await this.bridge.getSelectionColors(layerIds);
        return { success: true, colors };
      }

      case 'replace_color': {
        const oldColor = args['oldColor'] as ColorValue;
        if (!oldColor) throw new Error('Old color is required');
        const newColor = args['newColor'] as ColorValue;
        if (!newColor) throw new Error('New color is required');
        const scope = getStringArg(args, 'scope') as 'selection' | 'page' | 'document' | undefined;
        const replacedCount = await this.bridge.replaceColor(oldColor, newColor, { scope });
        return { success: true, replacedCount };
      }

      // =====================================================================
      // Viewport Tools
      // =====================================================================

      case 'zoom_to_100': {
        await this.bridge.zoomTo100();
        return { success: true };
      }

      case 'zoom_in': {
        await this.bridge.zoomIn();
        return { success: true };
      }

      case 'zoom_out': {
        await this.bridge.zoomOut();
        return { success: true };
      }

      // =====================================================================
      // Query Tools
      // =====================================================================

      case 'inspect_properties': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const properties = await this.bridge.inspectProperties(layerId);
        return { success: true, properties };
      }

      // =====================================================================
      // Page Management Tools
      // =====================================================================

      case 'create_page': {
        const name = getStringArg(args, 'name');
        const pageId = await this.bridge.createPage(name);
        return { success: true, pageId };
      }

      case 'rename_page': {
        const pageId = getStringArg(args, 'pageId');
        if (!pageId) throw new Error('Page ID is required');
        const name = getStringArg(args, 'name');
        if (!name) throw new Error('Name is required');
        await this.bridge.renamePage(pageId, name);
        return { success: true };
      }

      case 'delete_page': {
        const pageId = getStringArg(args, 'pageId');
        if (!pageId) throw new Error('Page ID is required');
        await this.bridge.deletePage(pageId);
        return { success: true };
      }

      case 'duplicate_page': {
        const pageId = getStringArg(args, 'pageId');
        if (!pageId) throw new Error('Page ID is required');
        const name = getStringArg(args, 'name');
        const newPageId = await this.bridge.duplicatePage(pageId, name);
        return { success: true, pageId: newPageId };
      }

      case 'go_to_page': {
        const pageId = getStringArg(args, 'pageId');
        if (!pageId) throw new Error('Page ID is required');
        await this.bridge.goToPage(pageId);
        return { success: true };
      }

      case 'list_pages': {
        const pages = await this.bridge.listPages();
        return { success: true, pages };
      }

      case 'set_page_background': {
        const pageId = getStringArg(args, 'pageId');
        if (!pageId) throw new Error('Page ID is required');
        const color = args['color'] as ColorValue;
        if (!color) throw new Error('Color is required');
        await this.bridge.setPageBackground(pageId, color);
        return { success: true };
      }

      // =====================================================================
      // File Tools
      // =====================================================================

      case 'get_file_info': {
        const info = await this.bridge.getFileInfo();
        return { success: true, ...info };
      }

      case 'get_version_history': {
        const versions = await this.bridge.getVersionHistory();
        return { success: true, versions };
      }

      case 'save_version': {
        const description = getStringArg(args, 'description');
        if (!description) throw new Error('Description is required');
        const versionId = await this.bridge.saveVersion(description);
        return { success: true, versionId };
      }

      case 'get_file_stats': {
        const stats = await this.bridge.getFileStats();
        return { success: true, ...stats };
      }

      // =====================================================================
      // Collaboration Tools
      // =====================================================================

      case 'add_comment': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) throw new Error('No layer selected');
        const text = getStringArg(args, 'text');
        if (!text) throw new Error('Comment text is required');
        const x = getNumberArg(args, 'x');
        const y = getNumberArg(args, 'y');
        const commentId = await this.bridge.addComment(layerId, text, x, y);
        return { success: true, commentId };
      }

      case 'reply_to_comment': {
        const commentId = getStringArg(args, 'commentId');
        if (!commentId) throw new Error('Comment ID is required');
        const text = getStringArg(args, 'text');
        if (!text) throw new Error('Reply text is required');
        const replyId = await this.bridge.replyToComment(commentId, text);
        return { success: true, replyId };
      }

      case 'resolve_comment': {
        const commentId = getStringArg(args, 'commentId');
        if (!commentId) throw new Error('Comment ID is required');
        await this.bridge.resolveComment(commentId);
        return { success: true };
      }

      case 'list_comments': {
        const resolved = getBoolArg(args, 'resolved');
        const layerId = getStringArg(args, 'layerId');
        const options: { resolved?: boolean; layerId?: string } = {};
        if (resolved !== undefined) options.resolved = resolved;
        if (layerId) options.layerId = layerId;
        const comments = await this.bridge.listComments(options);
        return { success: true, comments, count: comments.length };
      }

      // =====================================================================
      // Analysis Tools
      // =====================================================================

      case 'accessibility_audit': {
        const layerIds = getStringArrayArg(args, 'layerIds');
        const issues = await this.bridge.accessibilityAudit(layerIds);
        return { success: true, issues, count: issues.length };
      }

      case 'contrast_check': {
        const layerIds = getStringArrayArg(args, 'layerIds');
        const results = await this.bridge.contrastCheck(layerIds);
        return { success: true, results, count: results.length };
      }

      case 'consistency_audit': {
        const issues = await this.bridge.consistencyAudit();
        return { success: true, issues, count: issues.length };
      }

      case 'find_detached_styles': {
        // Reuse findUnusedStyles for now
        const styles = await this.bridge.findUnusedStyles();
        return { success: true, styles };
      }

      case 'spell_check': {
        // Stub - would integrate with spell checking library
        return { success: true, issues: [], message: 'Spell check not yet implemented' };
      }

      case 'list_fonts_used': {
        const fonts = await this.bridge.listFontsUsed();
        return { success: true, fonts };
      }

      case 'find_missing_fonts': {
        const missingFonts = await this.bridge.findMissingFonts();
        return { success: true, missingFonts };
      }

      case 'replace_font': {
        const oldFont = getStringArg(args, 'oldFont');
        if (!oldFont) throw new Error('Old font is required');
        const newFont = getStringArg(args, 'newFont');
        if (!newFont) throw new Error('New font is required');
        const replacedCount = await this.bridge.replaceFont(oldFont, newFont);
        return { success: true, replacedCount };
      }

      // =====================================================================
      // Batch Tools
      // =====================================================================

      case 'batch_rename': {
        // Alias for rename_layers_bulk
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const pattern = getStringArg(args, 'pattern');
        if (!pattern) throw new Error('Pattern is required');
        const changes = await this.bridge.renameLayersBulk(layerIds, pattern);
        return { success: true, changes, count: changes.length };
      }

      case 'batch_resize': {
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const width = getNumberArg(args, 'width');
        const height = getNumberArg(args, 'height');
        const scale = getNumberArg(args, 'scale');
        for (const layerId of layerIds) {
          if (scale) {
            await this.bridge.scaleLayers([layerId], scale, scale);
          } else if (width !== undefined || height !== undefined) {
            await this.bridge.resizeLayer(layerId, width, height);
          }
        }
        return { success: true, affectedIds: layerIds };
      }

      case 'apply_to_all': {
        // Apply a property change to all selected layers
        const layerIds = getStringArrayArg(args, 'layerIds') ?? selection;
        if (layerIds.length === 0) throw new Error('No layers selected');
        const property = getStringArg(args, 'property');
        if (!property) throw new Error('Property is required');
        const value = args['value'];
        if (value === undefined) throw new Error('Value is required');
        for (const layerId of layerIds) {
          await this.bridge.setLayerProperty(layerId, property, value);
        }
        return { success: true, affectedIds: layerIds };
      }

      // =====================================================================
      // UI Toggle Tools
      // =====================================================================

      case 'toggle_rulers': {
        const visible = await this.bridge.toggleRulers();
        return { success: true, visible };
      }

      case 'toggle_grid': {
        const visible = await this.bridge.toggleGrid();
        return { success: true, visible };
      }

      case 'toggle_guides': {
        const visible = await this.bridge.toggleGuides();
        return { success: true, visible };
      }

      case 'toggle_outlines': {
        const visible = await this.bridge.toggleOutlines();
        return { success: true, visible };
      }

      case 'collapse_all_layers': {
        await this.bridge.collapseAllLayers();
        return { success: true };
      }

      case 'expand_all_layers': {
        await this.bridge.expandAllLayers();
        return { success: true };
      }

      // =====================================================================
      // Utility Tools
      // =====================================================================

      case 'get_layer_properties': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        const props = await this.bridge.getLayerProperties(layerId);
        return props;
      }

      case 'get_canvas_state': {
        return await this.bridge.getCanvasState();
      }

      case 'zoom_to_selection': {
        await this.bridge.zoomToSelection();
        return { success: true };
      }

      case 'zoom_to_fit': {
        await this.bridge.zoomToFit();
        return { success: true };
      }

      case 'set_zoom': {
        await this.bridge.setZoom(getNumberArg(args, 'level') ?? 1);
        return { success: true };
      }

      case 'look_at': {
        // Look_at is a visual feedback tool - just return the coordinates
        // The AI controller handles cursor movement separately
        const x = getNumberArg(args, 'x') ?? 0;
        const y = getNumberArg(args, 'y') ?? 0;
        return { success: true, x, y };
      }

      // =====================================================================
      // AI Image Import Tools
      // =====================================================================

      case 'import_image_as_leaf': {
        // Get attached images from message context
        const context = this.messageContext;
        if (!context || context.attachedImages.length === 0) {
          throw new Error('No images attached to the message. Please attach an image to import.');
        }

        const startX = getNumberArg(args, 'x') ?? 0;
        const startY = getNumberArg(args, 'y') ?? 0;
        // includeOriginalImage is accepted but not yet implemented (requires image fill support)
        const _includeOriginalImage = args['includeOriginalImage'] !== false;
        void _includeOriginalImage; // Reserved for future use
        const analyzeWithVision = args['analyzeWithVision'] !== false;

        // Get Ollama config for vision model
        const config = getConfigManager().getProviderConfig('ollama');
        const endpoint = config.endpoint ?? 'http://localhost:11434';
        const visionModel = config.visionModel ?? 'llava:latest';

        const leaves: Array<{
          leafId: string;
          elementCount: number;
          description: string;
          originalWidth: number;
          originalHeight: number;
        }> = [];

        let offsetY = startY;

        for (const image of context.attachedImages) {
          // Analyze image with vision if enabled
          let width = 400;
          let height = 300;
          let description = 'Imported image';
          let elements: Array<{
            type: string;
            name: string;
            x: number;
            y: number;
            width: number;
            height: number;
          }> = [];

          if (analyzeWithVision) {
            try {
              const analysisResult = await this.analyzeImageWithVision(
                endpoint,
                visionModel,
                image.data
              );
              width = analysisResult.width;
              height = analysisResult.height;
              description = analysisResult.description;
              elements = analysisResult.elements;
            } catch (error) {
              console.warn('Vision analysis failed:', error);
            }
          }

          // Create leaf frame
          const leafId = await this.bridge.createFrame({
            x: startX,
            y: offsetY,
            width,
            height,
            name: `Imported ${leaves.length + 1}`,
          });

          // Create child elements from vision analysis
          let elementCount = 0;
          for (const el of elements) {
            if (el.type === 'TEXT') {
              await this.bridge.createText({
                x: startX + el.x,
                y: offsetY + el.y,
                content: el.name,
                fontSize: 14,
              });
            } else {
              await this.bridge.createFrame({
                x: startX + el.x,
                y: offsetY + el.y,
                width: el.width,
                height: el.height,
                name: el.name,
              });
            }
            elementCount++;
          }

          leaves.push({
            leafId,
            elementCount,
            description,
            originalWidth: width,
            originalHeight: height,
          });

          // Stack vertically with spacing
          offsetY += height + 40;
        }

        return {
          leaves,
          totalImported: leaves.length,
        };
      }

      default:
        throw new Error(`Tool implementation not found: ${tool}`);
    }
  }

  /**
   * Normalize color input to ColorValue
   */
  private normalizeColor(color: unknown): ColorValue | undefined {
    if (!color) return undefined;

    console.log('[ToolExecutor] normalizeColor input:', JSON.stringify(color));

    // Already a ColorValue object
    if (typeof color === 'object' && 'r' in (color as object)) {
      const c = color as ColorValue;
      // Check if values are in 0-255 range and normalize to 0-1
      const r = c.r > 1 ? c.r / 255 : c.r;
      const g = c.g > 1 ? c.g / 255 : c.g;
      const b = c.b > 1 ? c.b / 255 : c.b;
      const result = { r, g, b, a: c.a ?? 1 };
      console.log('[ToolExecutor] normalizeColor output:', JSON.stringify(result));
      return result;
    }

    // Hex string
    if (typeof color === 'string') {
      const result = parseHexColor(color);
      console.log('[ToolExecutor] normalizeColor (hex) output:', JSON.stringify(result));
      return result;
    }

    console.warn('[ToolExecutor] normalizeColor: unrecognized format', color);
    return undefined;
  }

  /**
   * Format success message
   */
  private formatSuccessMessage(tool: string, result: unknown): string {
    const r = result as Record<string, unknown>;

    switch (tool) {
      case 'select_all':
      case 'select_by_name':
      case 'select_by_type':
        return `Selected ${r['count']} layer(s)`;

      case 'create_rectangle':
      case 'create_ellipse':
      case 'create_text':
      case 'create_frame':
      case 'create_line':
        return `Created layer: ${r['layerId']}`;

      case 'group_layers':
        return `Created group: ${r['groupId']}`;

      case 'delete_selection':
        return `Deleted ${r['deletedCount']} layer(s)`;

      default:
        return `${tool} completed successfully`;
    }
  }

  /**
   * Assess error severity
   */
  private assessErrorSeverity(tool: string, errorMessage: string): ErrorSeverity {
    const msg = errorMessage.toLowerCase();

    // Critical errors
    if (msg.includes('runtime not') || msg.includes('not initialized')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity - selection required
    if (msg.includes('no layer selected') && tool.startsWith('set_')) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity
    if (msg.includes('not found') || msg.includes('invalid')) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity - cosmetic
    if (tool.includes('style') || tool.includes('effect')) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Analyze image using Ollama vision model
   */
  private async analyzeImageWithVision(
    endpoint: string,
    model: string,
    imageBase64: string
  ): Promise<{
    width: number;
    height: number;
    description: string;
    elements: Array<{
      type: string;
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  }> {
    const VISION_PROMPT = `Analyze this UI screenshot and extract all visual elements. Return a JSON object with:
{
  "width": <estimated image width>,
  "height": <estimated image height>,
  "description": "<brief description>",
  "elements": [
    {"type": "FRAME"|"TEXT", "name": "<name>", "x": <x>, "y": <y>, "width": <w>, "height": <h>}
  ]
}
Identify buttons, cards, text, images, navigation. Return ONLY JSON.`;

    try {
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: VISION_PROMPT,
              images: [imageBase64],
            },
          ],
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 4096,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Vision analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.message?.content ?? '';

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { width: 400, height: 300, description: 'Imported image', elements: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        width: parsed.width ?? 400,
        height: parsed.height ?? 300,
        description: parsed.description ?? 'Imported image',
        elements: (parsed.elements ?? []).map((el: Record<string, unknown>) => ({
          type: el['type'] ?? 'FRAME',
          name: String(el['name'] ?? 'Element'),
          x: Number(el['x'] ?? 0),
          y: Number(el['y'] ?? 0),
          width: Number(el['width'] ?? 100),
          height: Number(el['height'] ?? 50),
        })),
      };
    } catch (error) {
      console.error('Vision analysis error:', error);
      return { width: 400, height: 300, description: 'Imported image', elements: [] };
    }
  }
}

/**
 * Create a tool executor
 */
export function createToolExecutor(bridge?: RuntimeBridge): ToolExecutor {
  return new ToolExecutor(bridge);
}
