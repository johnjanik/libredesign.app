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

  constructor(bridge?: RuntimeBridge) {
    this.bridge = bridge ?? getGlobalBridge();
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
        return { success: true };
      }

      case 'unlock_layer': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.unlockLayer(layerId);
        return { success: true };
      }

      case 'hide_layer': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.hideLayer(layerId);
        return { success: true };
      }

      case 'show_layer': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.showLayer(layerId);
        return { success: true };
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
        return { success: true };
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
        return { success: true };
      }

      case 'set_stroke_width': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.setStrokeWidth(layerId, getNumberArg(args, 'width') ?? 1);
        return { success: true };
      }

      case 'set_opacity': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.setOpacity(layerId, getNumberArg(args, 'opacity') ?? 1);
        return { success: true };
      }

      case 'set_corner_radius': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.setCornerRadius(layerId, getNumberArg(args, 'radius') ?? 0);
        return { success: true };
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
        return { success: true };
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
        return { success: true };
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
        return { success: true };
      }

      case 'rotate': {
        const layerId = getStringArg(args, 'layerId') ?? selection[0];
        if (!layerId) {
          throw new Error('No layer selected');
        }
        await this.bridge.setRotation(layerId, getNumberArg(args, 'degrees') ?? 0);
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

      default:
        throw new Error(`Tool implementation not found: ${tool}`);
    }
  }

  /**
   * Normalize color input to ColorValue
   */
  private normalizeColor(color: unknown): ColorValue | undefined {
    if (!color) return undefined;

    // Already a ColorValue object
    if (typeof color === 'object' && 'r' in (color as object)) {
      const c = color as ColorValue;
      return {
        r: c.r,
        g: c.g,
        b: c.b,
        a: c.a ?? 1,
      };
    }

    // Hex string
    if (typeof color === 'string') {
      return parseHexColor(color);
    }

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
}

/**
 * Create a tool executor
 */
export function createToolExecutor(bridge?: RuntimeBridge): ToolExecutor {
  return new ToolExecutor(bridge);
}
