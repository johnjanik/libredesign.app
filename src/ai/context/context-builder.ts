/**
 * Context Builder
 *
 * Builds context information for AI prompts from the current design state.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type { CoordinateCalibrator } from '../calibration/coordinate-calibrator';
import type { AITool } from '../providers/ai-provider';

/**
 * Built context for AI
 */
export interface AIContext {
  /** System prompt */
  systemPrompt: string;
  /** Available tools */
  tools: AITool[];
  /** Current state description */
  stateDescription: string;
}

/**
 * Context builder options
 */
export interface ContextBuilderOptions {
  /** Include full scene graph in context */
  includeSceneGraph?: boolean | undefined;
  /** Maximum nodes to include in scene description */
  maxNodes?: number | undefined;
}

/**
 * Context Builder
 */
export class ContextBuilder {
  private runtime: DesignLibreRuntime;
  private calibrator: CoordinateCalibrator;

  constructor(runtime: DesignLibreRuntime, calibrator: CoordinateCalibrator) {
    this.runtime = runtime;
    this.calibrator = calibrator;
  }

  /**
   * Build the full AI context.
   */
  build(options: ContextBuilderOptions = {}): AIContext {
    return {
      systemPrompt: this.buildSystemPrompt(options),
      tools: this.getTools(),
      stateDescription: this.buildStateDescription(options),
    };
  }

  /**
   * Build the system prompt.
   */
  buildSystemPrompt(_options: ContextBuilderOptions = {}): string {
    const calibration = this.calibrator.getCalibrationPrompt();
    const tools = this.getToolDescriptions();

    return `You are an AI design assistant for DesignLibre, a professional vector graphics editor.

${calibration}

CAPABILITIES:
- You can CREATE shapes (rectangles, ellipses, lines, text, frames)
- You can SELECT, MOVE, RESIZE, ROTATE, and DELETE elements
- You can change COLORS, OPACITY, and other style properties
- You can GROUP and UNGROUP elements
- You can control the VIEWPORT (pan, zoom)
- You can UNDO and REDO changes

AVAILABLE TOOLS:
${tools}

GUIDELINES:
1. Be precise with coordinates - the red crosshair marks (0,0)
2. When creating elements, place them in visible areas
3. Use descriptive names for created elements
4. Confirm your actions by describing what you did
5. If asked to modify something, first identify it by name or position
6. For colors, use hex codes (#ff0000) or color names (red, blue, etc.)

When you receive a screenshot, analyze it to understand:
- What elements exist and where they are positioned
- The current selection state
- The overall layout and composition

Respond naturally and execute design requests using the provided tools.`;
  }

  /**
   * Build a description of the current state.
   */
  buildStateDescription(options: ContextBuilderOptions = {}): string {
    const parts: string[] = [];

    // Viewport state
    const viewport = this.runtime.getViewport();
    if (viewport) {
      const zoom = viewport.getZoom();
      const bounds = viewport.getVisibleBounds();
      parts.push(`Viewport: ${Math.round(zoom * 100)}% zoom`);
      parts.push(`Visible area: (${Math.round(bounds.minX)}, ${Math.round(bounds.minY)}) to (${Math.round(bounds.maxX)}, ${Math.round(bounds.maxY)})`);
    }

    // Selection state
    const selection = this.runtime.getSelectionManager();
    if (selection) {
      const selectedIds = selection.getSelectedNodeIds();
      if (selectedIds.length === 0) {
        parts.push('Selection: none');
      } else {
        parts.push(`Selection: ${selectedIds.length} element(s)`);
        // Describe selected elements
        const sceneGraph = this.runtime.getSceneGraph();
        if (sceneGraph && selectedIds.length <= 5) {
          for (const id of selectedIds) {
            const node = sceneGraph.getNode(id);
            if (node) {
              const x = 'x' in node ? Math.round(node.x as number) : 0;
              const y = 'y' in node ? Math.round(node.y as number) : 0;
              parts.push(`  - "${node.name}" (${node.type}) at (${x}, ${y})`);
            }
          }
        }
      }
    }

    // Active tool
    const toolManager = this.runtime.getToolManager();
    if (toolManager) {
      const activeTool = toolManager.getActiveTool();
      parts.push(`Active tool: ${activeTool?.name ?? 'none'}`);
    }

    // Scene overview (if requested)
    if (options.includeSceneGraph) {
      const sceneDescription = this.buildSceneDescription(options.maxNodes ?? 20);
      if (sceneDescription) {
        parts.push('');
        parts.push('SCENE CONTENTS:');
        parts.push(sceneDescription);
      }
    }

    return parts.join('\n');
  }

  /**
   * Build a description of the scene graph.
   */
  buildSceneDescription(maxNodes: number): string {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!sceneGraph || !pageId) return '';

    const lines: string[] = [];
    let nodeCount = 0;

    const describeNode = (nodeId: NodeId, indent: number): void => {
      if (nodeCount >= maxNodes) return;

      const node = sceneGraph.getNode(nodeId);
      if (!node) return;

      const prefix = '  '.repeat(indent);
      const x = 'x' in node ? Math.round(node.x as number) : 0;
      const y = 'y' in node ? Math.round(node.y as number) : 0;
      const w = 'width' in node ? Math.round(node.width as number) : 0;
      const h = 'height' in node ? Math.round(node.height as number) : 0;

      lines.push(`${prefix}- ${node.id.slice(0, 8)}: "${node.name}" (${node.type}) at (${x},${y}) size ${w}x${h}`);
      nodeCount++;

      // Recurse into children
      const children = sceneGraph.getChildIds(nodeId);
      for (const childId of children) {
        describeNode(childId, indent + 1);
      }
    };

    // Start from page children
    const pageChildren = sceneGraph.getChildIds(pageId);
    for (const childId of pageChildren) {
      describeNode(childId, 0);
    }

    if (nodeCount >= maxNodes) {
      lines.push(`... and more elements (showing first ${maxNodes})`);
    }

    return lines.join('\n');
  }

  /**
   * Get tool definitions for function calling.
   */
  getTools(): AITool[] {
    return [
      {
        name: 'create_shape',
        description: 'Create a rectangle or ellipse shape on the canvas',
        parameters: {
          type: 'object',
          properties: {
            shape: {
              type: 'string',
              enum: ['rectangle', 'ellipse'],
              description: 'Type of shape to create',
            },
            x: { type: 'number', description: 'X coordinate (world units)' },
            y: { type: 'number', description: 'Y coordinate (world units)' },
            width: { type: 'number', description: 'Width in pixels' },
            height: { type: 'number', description: 'Height in pixels' },
            fill: { type: 'string', description: 'Fill color (hex or name)' },
            stroke: { type: 'string', description: 'Stroke color (hex or name)' },
            name: { type: 'string', description: 'Name for the element' },
          },
          required: ['shape', 'x', 'y', 'width', 'height'],
        },
      },
      {
        name: 'create_text',
        description: 'Create a text element on the canvas',
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X coordinate' },
            y: { type: 'number', description: 'Y coordinate' },
            text: { type: 'string', description: 'Text content' },
            fontSize: { type: 'number', description: 'Font size in pixels' },
            fill: { type: 'string', description: 'Text color' },
            name: { type: 'string', description: 'Name for the element' },
          },
          required: ['x', 'y', 'text'],
        },
      },
      {
        name: 'create_frame',
        description: 'Create a frame (container) element',
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X coordinate' },
            y: { type: 'number', description: 'Y coordinate' },
            width: { type: 'number', description: 'Width' },
            height: { type: 'number', description: 'Height' },
            fill: { type: 'string', description: 'Background color' },
            name: { type: 'string', description: 'Frame name' },
          },
          required: ['x', 'y', 'width', 'height'],
        },
      },
      {
        name: 'select',
        description: 'Select elements by their IDs',
        parameters: {
          type: 'object',
          properties: {
            nodeIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of node IDs to select',
            },
          },
          required: ['nodeIds'],
        },
      },
      {
        name: 'move',
        description: 'Move elements by an offset',
        parameters: {
          type: 'object',
          properties: {
            nodeIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of nodes to move (or empty for selection)',
            },
            dx: { type: 'number', description: 'Horizontal offset' },
            dy: { type: 'number', description: 'Vertical offset' },
          },
          required: ['dx', 'dy'],
        },
      },
      {
        name: 'update_style',
        description: 'Update the style properties of an element',
        parameters: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'ID of the node to update' },
            fill: { type: 'string', description: 'New fill color' },
            stroke: { type: 'string', description: 'New stroke color' },
            opacity: { type: 'number', description: 'Opacity (0-1)', minimum: 0, maximum: 1 },
          },
          required: ['nodeId'],
        },
      },
      {
        name: 'delete',
        description: 'Delete elements from the canvas',
        parameters: {
          type: 'object',
          properties: {
            nodeIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of nodes to delete (or empty for selection)',
            },
          },
        },
      },
      {
        name: 'zoom',
        description: 'Change the zoom level or fit content',
        parameters: {
          type: 'object',
          properties: {
            level: { type: 'number', description: 'Zoom level (1.0 = 100%)' },
            fitContent: { type: 'boolean', description: 'Zoom to fit all content' },
          },
        },
      },
      {
        name: 'look_at',
        description: 'Move the AI cursor to a position (visual feedback only)',
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X coordinate to look at' },
            y: { type: 'number', description: 'Y coordinate to look at' },
          },
          required: ['x', 'y'],
        },
      },
    ];
  }

  /**
   * Get tool descriptions as a string for the system prompt.
   */
  private getToolDescriptions(): string {
    const tools = this.getTools();
    return tools
      .map((tool) => {
        const params = Object.entries(tool.parameters.properties)
          .map(([name, prop]) => {
            const p = prop as { type: string; description?: string };
            return `    ${name}: ${p.type}${p.description ? ` - ${p.description}` : ''}`;
          })
          .join('\n');
        return `- ${tool.name}: ${tool.description}\n${params}`;
      })
      .join('\n\n');
  }
}

/**
 * Create a context builder instance.
 */
export function createContextBuilder(
  runtime: DesignLibreRuntime,
  calibrator: CoordinateCalibrator
): ContextBuilder {
  return new ContextBuilder(runtime, calibrator);
}
