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

  rename_layer: {
    name: 'rename_layer',
    description: 'Rename a layer',
    category: 'layer_management',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        name: { type: 'string', description: 'New name for the layer' },
      },
      required: ['name'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  duplicate_layer: {
    name: 'duplicate_layer',
    description: 'Duplicate a layer',
    category: 'layer_management',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        offset: {
          type: 'object',
          description: 'Offset for the duplicate',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
          },
        },
      },
    },
    returns: {
      type: 'object',
      properties: {
        duplicateId: { type: 'string' },
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

  align_top: {
    name: 'align_top',
    description: 'Align selected layers to the top',
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

  align_center_v: {
    name: 'align_center_v',
    description: 'Align selected layers to vertical center',
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

  align_bottom: {
    name: 'align_bottom',
    description: 'Align selected layers to the bottom',
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

  look_at: {
    name: 'look_at',
    description: 'Move the AI cursor to a position for visual feedback',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate to look at' },
        y: { type: 'number', description: 'Y coordinate to look at' },
      },
      required: ['x', 'y'],
    },
    returns: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        x: { type: 'number' },
        y: { type: 'number' },
      },
    },
  },

  // =========================================================================
  // ADVANCED TIER TOOLS
  // =========================================================================

  // Advanced Selection
  select_children: {
    name: 'select_children',
    description: 'Select all children of the specified layer',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Parent layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        selectedIds: { type: 'array', items: { type: 'string' } },
        count: { type: 'number' },
      },
    },
  },

  select_parent: {
    name: 'select_parent',
    description: 'Select the parent of the current selection',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        parentId: { type: 'string' },
      },
    },
  },

  select_siblings: {
    name: 'select_siblings',
    description: 'Select all siblings of the current selection',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        selectedIds: { type: 'array', items: { type: 'string' } },
        count: { type: 'number' },
      },
    },
  },

  select_similar: {
    name: 'select_similar',
    description: 'Select layers with similar properties',
    category: 'selection',
    parameters: {
      type: 'object',
      properties: {
        property: {
          type: 'string',
          enum: ['fill', 'stroke', 'font', 'size', 'type'],
          description: 'Property to match',
        },
      },
      required: ['property'],
    },
    returns: {
      type: 'object',
      properties: {
        selectedIds: { type: 'array', items: { type: 'string' } },
        count: { type: 'number' },
      },
    },
  },

  invert_selection: {
    name: 'invert_selection',
    description: 'Invert the current selection',
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

  // Layer Organization
  rename_layers_bulk: {
    name: 'rename_layers_bulk',
    description: 'Rename multiple layers using a pattern',
    category: 'layer_management',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Name pattern with {n} for number, {name} for original name' },
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
      },
      required: ['pattern'],
    },
    returns: {
      type: 'object',
      properties: {
        renamedCount: { type: 'number' },
      },
    },
  },

  flatten_layers: {
    name: 'flatten_layers',
    description: 'Flatten selected layers into a single image',
    category: 'layer_management',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        flattenedId: { type: 'string' },
      },
    },
  },

  reorder_layers: {
    name: 'reorder_layers',
    description: 'Reorder layers within their parent',
    category: 'layer_management',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID to move' },
        position: {
          type: 'string',
          enum: ['front', 'back', 'forward', 'backward'],
          description: 'New position',
        },
      },
      required: ['position'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  // More Shapes
  create_polygon: {
    name: 'create_polygon',
    description: 'Create a regular polygon',
    category: 'creation',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
        radius: { type: 'number', description: 'Radius of the polygon', minimum: 1 },
        sides: { type: 'number', description: 'Number of sides', minimum: 3, maximum: 100 },
        fill: { ...COLOR_SCHEMA, description: 'Fill color' },
        name: { type: 'string', description: 'Layer name' },
      },
      required: ['x', 'y', 'radius', 'sides'],
    },
    returns: {
      type: 'object',
      properties: { layerId: { type: 'string' } },
    },
  },

  create_star: {
    name: 'create_star',
    description: 'Create a star shape',
    category: 'creation',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
        outerRadius: { type: 'number', description: 'Outer radius', minimum: 1 },
        innerRadius: { type: 'number', description: 'Inner radius', minimum: 0 },
        points: { type: 'number', description: 'Number of points', minimum: 3, maximum: 100 },
        fill: { ...COLOR_SCHEMA, description: 'Fill color' },
        name: { type: 'string', description: 'Layer name' },
      },
      required: ['x', 'y', 'outerRadius', 'innerRadius', 'points'],
    },
    returns: {
      type: 'object',
      properties: { layerId: { type: 'string' } },
    },
  },

  create_arrow: {
    name: 'create_arrow',
    description: 'Create an arrow shape',
    category: 'creation',
    parameters: {
      type: 'object',
      properties: {
        startX: { type: 'number', description: 'Start X position' },
        startY: { type: 'number', description: 'Start Y position' },
        endX: { type: 'number', description: 'End X position' },
        endY: { type: 'number', description: 'End Y position' },
        stroke: { ...COLOR_SCHEMA, description: 'Stroke color' },
        strokeWidth: { type: 'number', description: 'Stroke width', default: 2 },
        name: { type: 'string', description: 'Layer name' },
      },
      required: ['startX', 'startY', 'endX', 'endY'],
    },
    returns: {
      type: 'object',
      properties: { layerId: { type: 'string' } },
    },
  },

  // Advanced Styling
  set_fill_gradient: {
    name: 'set_fill_gradient',
    description: 'Set a gradient fill on a layer',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        type: {
          type: 'string',
          enum: ['linear', 'radial', 'angular', 'diamond'],
          description: 'Gradient type',
        },
        stops: {
          type: 'array',
          description: 'Color stops',
          items: {
            type: 'object',
            properties: {
              position: { type: 'number', minimum: 0, maximum: 1 },
              color: COLOR_SCHEMA,
            },
          },
        },
        angle: { type: 'number', description: 'Gradient angle in degrees (for linear)' },
      },
      required: ['type', 'stops'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  remove_fill: {
    name: 'remove_fill',
    description: 'Remove the fill from a layer',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  remove_stroke: {
    name: 'remove_stroke',
    description: 'Remove the stroke from a layer',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  swap_fill_stroke: {
    name: 'swap_fill_stroke',
    description: 'Swap fill and stroke colors',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  copy_style: {
    name: 'copy_style',
    description: 'Copy the style from a layer',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID to copy style from' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  paste_style: {
    name: 'paste_style',
    description: 'Paste previously copied style to layers',
    category: 'styling',
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

  // Effects
  add_drop_shadow: {
    name: 'add_drop_shadow',
    description: 'Add a drop shadow effect to a layer',
    category: 'effects',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        color: { ...COLOR_SCHEMA, description: 'Shadow color' },
        offsetX: { type: 'number', description: 'Horizontal offset', default: 0 },
        offsetY: { type: 'number', description: 'Vertical offset', default: 4 },
        blur: { type: 'number', description: 'Blur radius', minimum: 0, default: 8 },
        spread: { type: 'number', description: 'Spread radius', default: 0 },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  add_blur: {
    name: 'add_blur',
    description: 'Add a blur effect to a layer',
    category: 'effects',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        radius: { type: 'number', description: 'Blur radius', minimum: 0, default: 10 },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  remove_effects: {
    name: 'remove_effects',
    description: 'Remove all effects from a layer',
    category: 'effects',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_blend_mode: {
    name: 'set_blend_mode',
    description: 'Set the blend mode of a layer',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        mode: {
          type: 'string',
          enum: ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'],
          description: 'Blend mode',
        },
      },
      required: ['mode'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_individual_corners: {
    name: 'set_individual_corners',
    description: 'Set individual corner radii for a rectangle',
    category: 'styling',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        topLeft: { type: 'number', minimum: 0 },
        topRight: { type: 'number', minimum: 0 },
        bottomRight: { type: 'number', minimum: 0 },
        bottomLeft: { type: 'number', minimum: 0 },
      },
      required: ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  // Color Tools
  get_selection_colors: {
    name: 'get_selection_colors',
    description: 'Get all colors used in the selection',
    category: 'color',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        fills: { type: 'array', items: COLOR_SCHEMA },
        strokes: { type: 'array', items: COLOR_SCHEMA },
      },
    },
  },

  replace_color: {
    name: 'replace_color',
    description: 'Replace one color with another in the selection',
    category: 'color',
    parameters: {
      type: 'object',
      properties: {
        fromColor: { ...COLOR_SCHEMA, description: 'Color to replace' },
        toColor: { ...COLOR_SCHEMA, description: 'New color' },
        tolerance: { type: 'number', description: 'Color matching tolerance (0-1)', minimum: 0, maximum: 1, default: 0.1 },
      },
      required: ['fromColor', 'toColor'],
    },
    returns: {
      type: 'object',
      properties: {
        replacedCount: { type: 'number' },
      },
    },
  },

  // Typography
  set_font_family: {
    name: 'set_font_family',
    description: 'Set the font family of a text layer',
    category: 'typography',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        fontFamily: { type: 'string', description: 'Font family name' },
      },
      required: ['fontFamily'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_font_size: {
    name: 'set_font_size',
    description: 'Set the font size of a text layer',
    category: 'typography',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        size: { type: 'number', description: 'Font size in pixels', minimum: 1 },
      },
      required: ['size'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_font_weight: {
    name: 'set_font_weight',
    description: 'Set the font weight of a text layer',
    category: 'typography',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        weight: {
          type: 'string',
          enum: ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'thin', 'light', 'regular', 'medium', 'semibold', 'bold', 'extrabold', 'black'],
          description: 'Font weight',
        },
      },
      required: ['weight'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_text_alignment: {
    name: 'set_text_alignment',
    description: 'Set the text alignment of a text layer',
    category: 'typography',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        alignment: {
          type: 'string',
          enum: ['left', 'center', 'right', 'justify'],
          description: 'Text alignment',
        },
      },
      required: ['alignment'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_line_height: {
    name: 'set_line_height',
    description: 'Set the line height of a text layer',
    category: 'typography',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        lineHeight: { type: 'number', description: 'Line height value' },
        unit: { type: 'string', enum: ['pixels', 'percent', 'auto'], default: 'percent' },
      },
      required: ['lineHeight'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_letter_spacing: {
    name: 'set_letter_spacing',
    description: 'Set the letter spacing of a text layer',
    category: 'typography',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        spacing: { type: 'number', description: 'Letter spacing in pixels or percent' },
        unit: { type: 'string', enum: ['pixels', 'percent'], default: 'pixels' },
      },
      required: ['spacing'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  replace_text: {
    name: 'replace_text',
    description: 'Replace text content in text layers',
    category: 'typography',
    parameters: {
      type: 'object',
      properties: {
        find: { type: 'string', description: 'Text to find' },
        replace: { type: 'string', description: 'Replacement text' },
        matchCase: { type: 'boolean', description: 'Case-sensitive matching', default: false },
      },
      required: ['find', 'replace'],
    },
    returns: {
      type: 'object',
      properties: {
        replacedCount: { type: 'number' },
      },
    },
  },

  // Advanced Layout
  distribute_horizontal: {
    name: 'distribute_horizontal',
    description: 'Distribute selected layers horizontally with equal spacing',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
        spacing: { type: 'number', description: 'Fixed spacing (auto if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  distribute_vertical: {
    name: 'distribute_vertical',
    description: 'Distribute selected layers vertically with equal spacing',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
        spacing: { type: 'number', description: 'Fixed spacing (auto if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  tidy_up: {
    name: 'tidy_up',
    description: 'Automatically arrange selected layers in a grid',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
        columns: { type: 'number', description: 'Number of columns (auto if not provided)' },
        spacing: { type: 'number', description: 'Spacing between items', default: 10 },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  scale: {
    name: 'scale',
    description: 'Scale a layer by a factor',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        factor: { type: 'number', description: 'Scale factor (1.5 = 150%)', minimum: 0.01 },
        origin: {
          type: 'string',
          enum: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
          description: 'Scale origin point',
          default: 'center',
        },
      },
      required: ['factor'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  move_by: {
    name: 'move_by',
    description: 'Move a layer by a relative offset',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        dx: { type: 'number', description: 'Horizontal offset' },
        dy: { type: 'number', description: 'Vertical offset' },
      },
      required: ['dx', 'dy'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  flip_horizontal: {
    name: 'flip_horizontal',
    description: 'Flip a layer horizontally',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  flip_vertical: {
    name: 'flip_vertical',
    description: 'Flip a layer vertically',
    category: 'layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  // Auto Layout
  add_auto_layout: {
    name: 'add_auto_layout',
    description: 'Add auto layout to a frame',
    category: 'auto_layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Frame ID (uses selection if not provided)' },
        direction: { type: 'string', enum: ['horizontal', 'vertical'], default: 'horizontal' },
        gap: { type: 'number', description: 'Gap between items', default: 10 },
        padding: { type: 'number', description: 'Padding around content', default: 10 },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  remove_auto_layout: {
    name: 'remove_auto_layout',
    description: 'Remove auto layout from a frame',
    category: 'auto_layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Frame ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_layout_direction: {
    name: 'set_layout_direction',
    description: 'Set the direction of an auto layout frame',
    category: 'auto_layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Frame ID (uses selection if not provided)' },
        direction: { type: 'string', enum: ['horizontal', 'vertical'] },
      },
      required: ['direction'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_layout_gap: {
    name: 'set_layout_gap',
    description: 'Set the gap between items in an auto layout frame',
    category: 'auto_layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Frame ID (uses selection if not provided)' },
        gap: { type: 'number', description: 'Gap in pixels', minimum: 0 },
      },
      required: ['gap'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_layout_padding: {
    name: 'set_layout_padding',
    description: 'Set the padding of an auto layout frame',
    category: 'auto_layout',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Frame ID (uses selection if not provided)' },
        top: { type: 'number', minimum: 0 },
        right: { type: 'number', minimum: 0 },
        bottom: { type: 'number', minimum: 0 },
        left: { type: 'number', minimum: 0 },
        all: { type: 'number', description: 'Set all sides to the same value', minimum: 0 },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  // Export
  export_png: {
    name: 'export_png',
    description: 'Export a layer or frame as PNG',
    category: 'export',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        scale: { type: 'number', description: 'Export scale (1 = 1x, 2 = 2x)', minimum: 0.01, maximum: 4, default: 1 },
      },
    },
    returns: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        url: { type: 'string', description: 'Data URL of the exported image' },
      },
    },
  },

  export_svg: {
    name: 'export_svg',
    description: 'Export a layer or frame as SVG',
    category: 'export',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        svg: { type: 'string', description: 'SVG markup' },
      },
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
 * Get tool definitions for a list of tool names
 */
export function getToolDefinitions(toolNames: readonly string[]): ToolDefinition[] {
  return toolNames
    .map((name) => TOOL_DEFINITIONS[name])
    .filter((def): def is ToolDefinition => def !== undefined);
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
