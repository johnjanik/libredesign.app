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
