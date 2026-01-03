/**
 * Tool Registry
 *
 * Central registry of all AI tools with OpenAI-compatible function schemas.
 */

import type { ToolName } from './tool-categories';
import { getToolsForCapability } from './tool-categories';

/**
 * JSON Schema type for tool parameters
 */
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema & { description?: string }>;
  items?: JSONSchema;
  required?: string[];
  enum?: string[];
  description?: string;
  minimum?: number;
  maximum?: number;
  default?: unknown;
}

/**
 * OpenAI-compatible function definition
 */
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}

/**
 * Tool definition with metadata
 */
export interface ToolDefinition {
  name: ToolName | string;
  description: string;
  category: string;
  parameters: JSONSchema;
  returns: JSONSchema;
  examples?: Array<{
    description: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
}

/**
 * Color parameter schema
 */
const COLOR_SCHEMA: JSONSchema = {
  type: 'object',
  properties: {
    r: { type: 'number', description: 'Red component (0-1)', minimum: 0, maximum: 1 },
    g: { type: 'number', description: 'Green component (0-1)', minimum: 0, maximum: 1 },
    b: { type: 'number', description: 'Blue component (0-1)', minimum: 0, maximum: 1 },
    a: { type: 'number', description: 'Alpha component (0-1)', minimum: 0, maximum: 1, default: 1 },
  },
  required: ['r', 'g', 'b'],
};

/**
 * All tool definitions
 */
export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  // =========================================================================
  // P0: Selection Tools
  // =========================================================================

  select_all: {
    name: 'select_all',
    description: 'Select all layers on the current page',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        selectedIds: { type: 'array', items: { type: 'string' } },
        count: { type: 'number' },
      },
    },
  },

  select_by_name: {
    name: 'select_by_name',
    description: 'Select layers matching a name pattern (supports * wildcard)',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Name pattern to match (e.g., "Button*" matches "Button 1", "Button 2")',
        },
      },
      required: ['pattern'],
    },
    returns: {
      type: 'object',
      properties: {
        selectedIds: { type: 'array', items: { type: 'string' } },
        count: { type: 'number' },
      },
    },
  },

  select_by_type: {
    name: 'select_by_type',
    description: 'Select all layers of a specific type',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Layer type to select',
          enum: ['FRAME', 'GROUP', 'VECTOR', 'TEXT', 'IMAGE', 'COMPONENT', 'INSTANCE'],
        },
      },
      required: ['type'],
    },
    returns: {
      type: 'object',
      properties: {
        selectedIds: { type: 'array', items: { type: 'string' } },
        count: { type: 'number' },
      },
    },
  },

  deselect_all: {
    name: 'deselect_all',
    description: 'Clear the current selection',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  },

  get_selection: {
    name: 'get_selection',
    description: 'Get information about currently selected layers',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        layers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
        count: { type: 'number' },
      },
    },
  },

  group_layers: {
    name: 'group_layers',
    description: 'Group the specified layers together',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        layerIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of layers to group (uses selection if not provided)',
        },
        name: {
          type: 'string',
          description: 'Name for the new group',
          default: 'Group',
        },
      },
    },
    returns: {
      type: 'object',
      properties: {
        groupId: { type: 'string' },
      },
    },
  },

  ungroup_layers: {
    name: 'ungroup_layers',
    description: 'Ungroup a group, releasing its children',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'ID of the group to ungroup (uses selection if not provided)',
        },
      },
    },
    returns: {
      type: 'object',
      properties: {
        childIds: { type: 'array', items: { type: 'string' } },
      },
    },
  },

  lock_layer: {
    name: 'lock_layer',
    description: 'Lock a layer to prevent editing',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        layerId: {
          type: 'string',
          description: 'ID of layer to lock (uses selection if not provided)',
        },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  unlock_layer: {
    name: 'unlock_layer',
    description: 'Unlock a layer to allow editing',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        layerId: {
          type: 'string',
          description: 'ID of layer to unlock (uses selection if not provided)',
        },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  hide_layer: {
    name: 'hide_layer',
    description: 'Hide a layer from view',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        layerId: {
          type: 'string',
          description: 'ID of layer to hide (uses selection if not provided)',
        },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  show_layer: {
    name: 'show_layer',
    description: 'Show a hidden layer',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        layerId: {
          type: 'string',
          description: 'ID of layer to show (uses selection if not provided)',
        },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  delete_selection: {
    name: 'delete_selection',
    description: 'Delete currently selected layers',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number' },
      },
    },
  },

  // =========================================================================
  // P1: Creation Tools
  // =========================================================================

  create_rectangle: {
    name: 'create_rectangle',
    description: 'Create a rectangle shape',
    category: 'creation',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
        width: { type: 'number', description: 'Width', minimum: 1 },
        height: { type: 'number', description: 'Height', minimum: 1 },
        fill: { ...COLOR_SCHEMA, description: 'Fill color' },
        stroke: { ...COLOR_SCHEMA, description: 'Stroke color' },
        strokeWidth: { type: 'number', description: 'Stroke width', minimum: 0 },
        cornerRadius: { type: 'number', description: 'Corner radius', minimum: 0 },
        name: { type: 'string', description: 'Layer name' },
      },
      required: ['x', 'y', 'width', 'height'],
    },
    returns: {
      type: 'object',
      properties: {
        layerId: { type: 'string' },
      },
    },
    examples: [
      {
        description: 'Create a blue rectangle',
        args: { x: 100, y: 100, width: 200, height: 100, fill: { r: 0, g: 0.5, b: 1, a: 1 } },
        result: { layerId: 'rect_123' },
      },
    ],
  },

  create_ellipse: {
    name: 'create_ellipse',
    description: 'Create an ellipse/circle shape',
    category: 'creation',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
        width: { type: 'number', description: 'Width', minimum: 1 },
        height: { type: 'number', description: 'Height', minimum: 1 },
        fill: { ...COLOR_SCHEMA, description: 'Fill color' },
        stroke: { ...COLOR_SCHEMA, description: 'Stroke color' },
        strokeWidth: { type: 'number', description: 'Stroke width', minimum: 0 },
        name: { type: 'string', description: 'Layer name' },
      },
      required: ['x', 'y', 'width', 'height'],
    },
    returns: {
      type: 'object',
      properties: {
        layerId: { type: 'string' },
      },
    },
  },

  create_text: {
    name: 'create_text',
    description: 'Create a text layer',
    category: 'creation',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
        content: { type: 'string', description: 'Text content' },
        fontSize: { type: 'number', description: 'Font size in pixels', default: 16 },
        fontFamily: { type: 'string', description: 'Font family name', default: 'Inter' },
        fill: { ...COLOR_SCHEMA, description: 'Text color' },
        name: { type: 'string', description: 'Layer name' },
      },
      required: ['x', 'y', 'content'],
    },
    returns: {
      type: 'object',
      properties: {
        layerId: { type: 'string' },
      },
    },
  },

  create_frame: {
    name: 'create_frame',
    description: 'Create a frame (container for other layers)',
    category: 'creation',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
        width: { type: 'number', description: 'Width', minimum: 1 },
        height: { type: 'number', description: 'Height', minimum: 1 },
        fill: { ...COLOR_SCHEMA, description: 'Background color' },
        name: { type: 'string', description: 'Frame name' },
      },
      required: ['x', 'y', 'width', 'height'],
    },
    returns: {
      type: 'object',
      properties: {
        layerId: { type: 'string' },
      },
    },
  },

  create_line: {
    name: 'create_line',
    description: 'Create a line',
    category: 'creation',
    parameters: {
      type: 'object',
      properties: {
        startX: { type: 'number', description: 'Start X position' },
        startY: { type: 'number', description: 'Start Y position' },
        endX: { type: 'number', description: 'End X position' },
        endY: { type: 'number', description: 'End Y position' },
        stroke: { ...COLOR_SCHEMA, description: 'Line color' },
        strokeWidth: { type: 'number', description: 'Line width', default: 2 },
        name: { type: 'string', description: 'Layer name' },
      },
      required: ['startX', 'startY', 'endX', 'endY'],
    },
    returns: {
      type: 'object',
      properties: {
        layerId: { type: 'string' },
      },
    },
  },

  // =========================================================================
  // P2: Styling Tools
  // =========================================================================

  set_fill_color: {
    name: 'set_fill_color',
    description: 'Set the fill color of a layer',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        color: { ...COLOR_SCHEMA, description: 'Fill color' },
      },
      required: ['color'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_stroke_color: {
    name: 'set_stroke_color',
    description: 'Set the stroke color of a layer',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        color: { ...COLOR_SCHEMA, description: 'Stroke color' },
      },
      required: ['color'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_stroke_width: {
    name: 'set_stroke_width',
    description: 'Set the stroke width of a layer',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        width: { type: 'number', description: 'Stroke width in pixels', minimum: 0 },
      },
      required: ['width'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_opacity: {
    name: 'set_opacity',
    description: 'Set the opacity of a layer',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        opacity: { type: 'number', description: 'Opacity (0-1)', minimum: 0, maximum: 1 },
      },
      required: ['opacity'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_corner_radius: {
    name: 'set_corner_radius',
    description: 'Set the corner radius of a layer',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        radius: { type: 'number', description: 'Corner radius in pixels', minimum: 0 },
      },
      required: ['radius'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  // =========================================================================
  // P3: Layout Tools
  // =========================================================================

  align_left: {
    name: 'align_left',
    description: 'Align selected layers to the left',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  align_center_h: {
    name: 'align_center_h',
    description: 'Align selected layers to horizontal center',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  align_right: {
    name: 'align_right',
    description: 'Align selected layers to the right',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_position: {
    name: 'set_position',
    description: 'Set the position of a layer',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
      },
      required: ['x', 'y'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_size: {
    name: 'set_size',
    description: 'Set the size of a layer',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        width: { type: 'number', description: 'Width', minimum: 1 },
        height: { type: 'number', description: 'Height', minimum: 1 },
      },
      required: ['width', 'height'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  rotate: {
    name: 'rotate',
    description: 'Rotate a layer',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        degrees: { type: 'number', description: 'Rotation angle in degrees' },
      },
      required: ['degrees'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  // =========================================================================
  // P5: Utility Tools
  // =========================================================================

  get_layer_properties: {
    name: 'get_layer_properties',
    description: 'Get detailed properties of a layer',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string' },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        visible: { type: 'boolean' },
        locked: { type: 'boolean' },
      },
    },
  },

  get_canvas_state: {
    name: 'get_canvas_state',
    description: 'Get the current canvas state including selection and viewport',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        selection: { type: 'array' },
        viewport: { type: 'object' },
        stats: { type: 'object' },
      },
    },
  },

  zoom_to_selection: {
    name: 'zoom_to_selection',
    description: 'Zoom the viewport to fit the current selection',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  zoom_to_fit: {
    name: 'zoom_to_fit',
    description: 'Zoom the viewport to fit all content',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_zoom: {
    name: 'set_zoom',
    description: 'Set the zoom level',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {
        level: { type: 'number', description: 'Zoom level (1 = 100%)', minimum: 0.01, maximum: 100 },
      },
      required: ['level'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },
};

/**
 * Get tool definition by name
 */
export function getToolDefinition(name: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS[name];
}

/**
 * Get all tool definitions
 */
export function getAllToolDefinitions(): ToolDefinition[] {
  return Object.values(TOOL_DEFINITIONS);
}

/**
 * Get tool definitions for a capability level
 */
export function getToolDefinitionsForCapability(level: 0 | 1 | 2 | 3 | 4 | 5): ToolDefinition[] {
  const toolNames = getToolsForCapability(level);
  return toolNames
    .map(name => TOOL_DEFINITIONS[name])
    .filter((def): def is ToolDefinition => def !== undefined);
}

/**
 * Convert tool definitions to OpenAI function format
 */
export function toOpenAIFunctions(tools: ToolDefinition[]): FunctionDefinition[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

/**
 * Get OpenAI-compatible tools for a capability level
 */
export function getOpenAIToolsForCapability(level: 0 | 1 | 2 | 3 | 4 | 5): FunctionDefinition[] {
  return toOpenAIFunctions(getToolDefinitionsForCapability(level));
}
