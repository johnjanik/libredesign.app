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

  // =========================================================================
  // PROFESSIONAL TIER TOOLS
  // =========================================================================

  // Components
  create_component: {
    name: 'create_component',
    description: 'Create a component from the selected layers',
    category: 'components',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        name: { type: 'string', description: 'Component name' },
        description: { type: 'string', description: 'Component description' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        componentId: { type: 'string' },
      },
    },
  },

  create_component_set: {
    name: 'create_component_set',
    description: 'Create a component set from multiple component variants',
    category: 'components',
    parameters: {
      type: 'object',
      properties: {
        componentIds: { type: 'array', items: { type: 'string' }, description: 'Component IDs to combine' },
        name: { type: 'string', description: 'Component set name' },
      },
      required: ['componentIds'],
    },
    returns: {
      type: 'object',
      properties: {
        componentSetId: { type: 'string' },
      },
    },
  },

  create_instance: {
    name: 'create_instance',
    description: 'Create an instance of a component',
    category: 'components',
    parameters: {
      type: 'object',
      properties: {
        componentId: { type: 'string', description: 'Component ID to instantiate' },
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
      },
      required: ['componentId'],
    },
    returns: {
      type: 'object',
      properties: {
        instanceId: { type: 'string' },
      },
    },
  },

  detach_instance: {
    name: 'detach_instance',
    description: 'Detach an instance from its main component',
    category: 'components',
    parameters: {
      type: 'object',
      properties: {
        instanceId: { type: 'string', description: 'Instance ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        frameId: { type: 'string' },
      },
    },
  },

  reset_instance: {
    name: 'reset_instance',
    description: 'Reset instance overrides to match main component',
    category: 'components',
    parameters: {
      type: 'object',
      properties: {
        instanceId: { type: 'string', description: 'Instance ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  push_overrides_to_main: {
    name: 'push_overrides_to_main',
    description: 'Push instance overrides to the main component',
    category: 'components',
    parameters: {
      type: 'object',
      properties: {
        instanceId: { type: 'string', description: 'Instance ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  swap_component: {
    name: 'swap_component',
    description: 'Swap an instance to use a different component',
    category: 'components',
    parameters: {
      type: 'object',
      properties: {
        instanceId: { type: 'string', description: 'Instance ID (uses selection if not provided)' },
        newComponentId: { type: 'string', description: 'Component ID to swap to' },
      },
      required: ['newComponentId'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  go_to_main_component: {
    name: 'go_to_main_component',
    description: 'Navigate to the main component of an instance',
    category: 'components',
    parameters: {
      type: 'object',
      properties: {
        instanceId: { type: 'string', description: 'Instance ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        componentId: { type: 'string' },
      },
    },
  },

  list_component_instances: {
    name: 'list_component_instances',
    description: 'List all instances of a component',
    category: 'components',
    parameters: {
      type: 'object',
      properties: {
        componentId: { type: 'string', description: 'Component ID' },
      },
      required: ['componentId'],
    },
    returns: {
      type: 'object',
      properties: {
        instances: { type: 'array', items: { type: 'object' } },
        count: { type: 'number' },
      },
    },
  },

  add_component_property: {
    name: 'add_component_property',
    description: 'Add a property to a component',
    category: 'components',
    parameters: {
      type: 'object',
      properties: {
        componentId: { type: 'string', description: 'Component ID' },
        propertyName: { type: 'string', description: 'Property name' },
        propertyType: { type: 'string', enum: ['boolean', 'text', 'instance_swap', 'variant'], description: 'Property type' },
        defaultValue: { type: 'string', description: 'Default value' },
      },
      required: ['componentId', 'propertyName', 'propertyType'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_component_description: {
    name: 'set_component_description',
    description: 'Set the description of a component',
    category: 'components',
    parameters: {
      type: 'object',
      properties: {
        componentId: { type: 'string', description: 'Component ID' },
        description: { type: 'string', description: 'Component description' },
      },
      required: ['componentId', 'description'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  // Styles
  create_color_style: {
    name: 'create_color_style',
    description: 'Create a reusable color style',
    category: 'styles',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Style name' },
        color: { ...COLOR_SCHEMA, description: 'Color value' },
        description: { type: 'string', description: 'Style description' },
      },
      required: ['name', 'color'],
    },
    returns: {
      type: 'object',
      properties: {
        styleId: { type: 'string' },
      },
    },
  },

  create_text_style: {
    name: 'create_text_style',
    description: 'Create a reusable text style',
    category: 'styles',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Style name' },
        fontFamily: { type: 'string', description: 'Font family' },
        fontSize: { type: 'number', description: 'Font size' },
        fontWeight: { type: 'string', description: 'Font weight' },
        lineHeight: { type: 'number', description: 'Line height' },
        letterSpacing: { type: 'number', description: 'Letter spacing' },
      },
      required: ['name', 'fontFamily', 'fontSize'],
    },
    returns: {
      type: 'object',
      properties: {
        styleId: { type: 'string' },
      },
    },
  },

  create_effect_style: {
    name: 'create_effect_style',
    description: 'Create a reusable effect style',
    category: 'styles',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Style name' },
        effects: { type: 'array', description: 'Array of effects' },
      },
      required: ['name', 'effects'],
    },
    returns: {
      type: 'object',
      properties: {
        styleId: { type: 'string' },
      },
    },
  },

  apply_style: {
    name: 'apply_style',
    description: 'Apply a style to layers',
    category: 'styles',
    parameters: {
      type: 'object',
      properties: {
        styleId: { type: 'string', description: 'Style ID to apply' },
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
      },
      required: ['styleId'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  detach_style: {
    name: 'detach_style',
    description: 'Detach styles from layers',
    category: 'styles',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
        styleType: { type: 'string', enum: ['fill', 'stroke', 'text', 'effect', 'all'], description: 'Type of style to detach' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  list_local_styles: {
    name: 'list_local_styles',
    description: 'List all local styles in the file',
    category: 'styles',
    parameters: {
      type: 'object',
      properties: {
        styleType: { type: 'string', enum: ['color', 'text', 'effect', 'all'], description: 'Type of styles to list' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        styles: { type: 'array', items: { type: 'object' } },
        count: { type: 'number' },
      },
    },
  },

  find_unused_styles: {
    name: 'find_unused_styles',
    description: 'Find styles that are not used anywhere',
    category: 'styles',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        unusedStyles: { type: 'array', items: { type: 'object' } },
        count: { type: 'number' },
      },
    },
  },

  // Variables
  create_variable: {
    name: 'create_variable',
    description: 'Create a design variable',
    category: 'variables',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Variable name' },
        type: { type: 'string', enum: ['color', 'number', 'string', 'boolean'], description: 'Variable type' },
        value: { type: 'string', description: 'Initial value' },
        collection: { type: 'string', description: 'Variable collection name' },
      },
      required: ['name', 'type', 'value'],
    },
    returns: {
      type: 'object',
      properties: {
        variableId: { type: 'string' },
      },
    },
  },

  set_variable_value: {
    name: 'set_variable_value',
    description: 'Set the value of a variable',
    category: 'variables',
    parameters: {
      type: 'object',
      properties: {
        variableId: { type: 'string', description: 'Variable ID' },
        value: { type: 'string', description: 'New value' },
        mode: { type: 'string', description: 'Variable mode (for multi-mode variables)' },
      },
      required: ['variableId', 'value'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  bind_to_variable: {
    name: 'bind_to_variable',
    description: 'Bind a layer property to a variable',
    category: 'variables',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID' },
        property: { type: 'string', description: 'Property to bind (e.g., "fill", "width")' },
        variableId: { type: 'string', description: 'Variable ID' },
      },
      required: ['layerId', 'property', 'variableId'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  list_variables: {
    name: 'list_variables',
    description: 'List all variables in the file',
    category: 'variables',
    parameters: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Filter by collection name' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        variables: { type: 'array', items: { type: 'object' } },
        count: { type: 'number' },
      },
    },
  },

  switch_variable_mode: {
    name: 'switch_variable_mode',
    description: 'Switch the active variable mode',
    category: 'variables',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: 'Mode name to switch to' },
        collection: { type: 'string', description: 'Variable collection' },
      },
      required: ['mode'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  // Prototyping
  add_interaction: {
    name: 'add_interaction',
    description: 'Add a prototype interaction to a layer',
    category: 'prototyping',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        trigger: { type: 'string', enum: ['on_click', 'on_hover', 'on_press', 'on_drag', 'after_delay', 'mouse_enter', 'mouse_leave'], description: 'Interaction trigger' },
        action: { type: 'string', enum: ['navigate', 'open_overlay', 'close_overlay', 'back', 'scroll_to', 'open_url'], description: 'Action type' },
        destinationId: { type: 'string', description: 'Destination frame ID' },
      },
      required: ['trigger', 'action'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  remove_interactions: {
    name: 'remove_interactions',
    description: 'Remove all prototype interactions from a layer',
    category: 'prototyping',
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

  set_transition: {
    name: 'set_transition',
    description: 'Set the transition animation for an interaction',
    category: 'prototyping',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID' },
        transitionType: { type: 'string', enum: ['instant', 'dissolve', 'smart_animate', 'move_in', 'move_out', 'push', 'slide_in', 'slide_out'], description: 'Transition type' },
        duration: { type: 'number', description: 'Duration in milliseconds', default: 300 },
        easing: { type: 'string', enum: ['linear', 'ease_in', 'ease_out', 'ease_in_out', 'ease_in_back', 'ease_out_back', 'spring'], description: 'Easing function' },
      },
      required: ['transitionType'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  list_all_interactions: {
    name: 'list_all_interactions',
    description: 'List all prototype interactions in the file',
    category: 'prototyping',
    parameters: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Filter by page ID' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        interactions: { type: 'array', items: { type: 'object' } },
        count: { type: 'number' },
      },
    },
  },

  set_starting_frame: {
    name: 'set_starting_frame',
    description: 'Set the starting frame for a prototype flow',
    category: 'prototyping',
    parameters: {
      type: 'object',
      properties: {
        frameId: { type: 'string', description: 'Frame ID to set as starting point' },
      },
      required: ['frameId'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  set_device_frame: {
    name: 'set_device_frame',
    description: 'Set the device frame for prototyping',
    category: 'prototyping',
    parameters: {
      type: 'object',
      properties: {
        device: { type: 'string', enum: ['iphone_14', 'iphone_14_pro', 'iphone_se', 'android_small', 'android_large', 'ipad', 'desktop', 'none'], description: 'Device type' },
      },
      required: ['device'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  preview_prototype: {
    name: 'preview_prototype',
    description: 'Start prototype preview mode',
    category: 'prototyping',
    parameters: {
      type: 'object',
      properties: {
        frameId: { type: 'string', description: 'Starting frame ID' },
      },
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  // Code Generation
  generate_css: {
    name: 'generate_css',
    description: 'Generate CSS code for selected layers',
    category: 'code_generation',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        includeLayout: { type: 'boolean', description: 'Include layout properties', default: true },
        useVariables: { type: 'boolean', description: 'Use CSS variables', default: false },
      },
    },
    returns: {
      type: 'object',
      properties: {
        css: { type: 'string' },
      },
    },
  },

  generate_tailwind: {
    name: 'generate_tailwind',
    description: 'Generate Tailwind CSS classes for selected layers',
    category: 'code_generation',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        classes: { type: 'string' },
        html: { type: 'string' },
      },
    },
  },

  generate_swift: {
    name: 'generate_swift',
    description: 'Generate SwiftUI code for selected layers',
    category: 'code_generation',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        componentName: { type: 'string', description: 'SwiftUI view name' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        code: { type: 'string' },
      },
    },
  },

  generate_android: {
    name: 'generate_android',
    description: 'Generate Jetpack Compose code for selected layers',
    category: 'code_generation',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        componentName: { type: 'string', description: 'Composable function name' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        code: { type: 'string' },
      },
    },
  },

  generate_react: {
    name: 'generate_react',
    description: 'Generate React component code for selected layers',
    category: 'code_generation',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        componentName: { type: 'string', description: 'Component name' },
        styleFormat: { type: 'string', enum: ['inline', 'css', 'styled-components', 'tailwind'], description: 'Style format', default: 'inline' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        code: { type: 'string' },
      },
    },
  },

  generate_html: {
    name: 'generate_html',
    description: 'Generate HTML/CSS code for selected layers',
    category: 'code_generation',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        inlineStyles: { type: 'boolean', description: 'Use inline styles vs separate CSS', default: false },
      },
    },
    returns: {
      type: 'object',
      properties: {
        html: { type: 'string' },
        css: { type: 'string' },
      },
    },
  },

  copy_as_code: {
    name: 'copy_as_code',
    description: 'Copy layer properties as code to clipboard',
    category: 'code_generation',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        format: { type: 'string', enum: ['css', 'swift', 'android', 'react', 'tailwind'], description: 'Code format' },
      },
      required: ['format'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  inspect_properties: {
    name: 'inspect_properties',
    description: 'Get detailed design properties for development handoff',
    category: 'code_generation',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        geometry: { type: 'object' },
        fills: { type: 'array' },
        strokes: { type: 'array' },
        effects: { type: 'array' },
        typography: { type: 'object' },
      },
    },
  },

  export_to_json: {
    name: 'export_to_json',
    description: 'Export layer data as JSON',
    category: 'code_generation',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID (uses selection if not provided)' },
        includeChildren: { type: 'boolean', description: 'Include child layers', default: true },
      },
    },
    returns: {
      type: 'object',
      properties: {
        json: { type: 'string' },
      },
    },
  },

  // Page Management
  create_page: {
    name: 'create_page',
    description: 'Create a new page',
    category: 'page_management',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Page name' },
      },
      required: ['name'],
    },
    returns: {
      type: 'object',
      properties: {
        pageId: { type: 'string' },
      },
    },
  },

  rename_page: {
    name: 'rename_page',
    description: 'Rename a page',
    category: 'page_management',
    parameters: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Page ID (uses current page if not provided)' },
        name: { type: 'string', description: 'New page name' },
      },
      required: ['name'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  delete_page: {
    name: 'delete_page',
    description: 'Delete a page',
    category: 'page_management',
    parameters: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Page ID to delete' },
      },
      required: ['pageId'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  duplicate_page: {
    name: 'duplicate_page',
    description: 'Duplicate a page',
    category: 'page_management',
    parameters: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Page ID to duplicate (uses current page if not provided)' },
        name: { type: 'string', description: 'New page name' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        pageId: { type: 'string' },
      },
    },
  },

  go_to_page: {
    name: 'go_to_page',
    description: 'Navigate to a specific page',
    category: 'page_management',
    parameters: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Page ID to navigate to' },
      },
      required: ['pageId'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  list_pages: {
    name: 'list_pages',
    description: 'List all pages in the file',
    category: 'page_management',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        pages: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } } },
        count: { type: 'number' },
      },
    },
  },

  set_page_background: {
    name: 'set_page_background',
    description: 'Set the background color of a page',
    category: 'page_management',
    parameters: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Page ID (uses current page if not provided)' },
        color: { ...COLOR_SCHEMA, description: 'Background color' },
      },
      required: ['color'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  // File Management
  get_file_info: {
    name: 'get_file_info',
    description: 'Get information about the current file',
    category: 'file_management',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        lastModified: { type: 'string' },
        pageCount: { type: 'number' },
        layerCount: { type: 'number' },
      },
    },
  },

  get_version_history: {
    name: 'get_version_history',
    description: 'Get the version history of the file',
    category: 'file_management',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum versions to return', default: 10 },
      },
    },
    returns: {
      type: 'object',
      properties: {
        versions: { type: 'array', items: { type: 'object' } },
      },
    },
  },

  save_version: {
    name: 'save_version',
    description: 'Save a named version of the file',
    category: 'file_management',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Version name' },
        description: { type: 'string', description: 'Version description' },
      },
      required: ['name'],
    },
    returns: {
      type: 'object',
      properties: {
        versionId: { type: 'string' },
      },
    },
  },

  get_file_stats: {
    name: 'get_file_stats',
    description: 'Get statistics about the file',
    category: 'file_management',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        totalLayers: { type: 'number' },
        components: { type: 'number' },
        instances: { type: 'number' },
        styles: { type: 'number' },
        fonts: { type: 'array', items: { type: 'string' } },
      },
    },
  },

  // Collaboration
  add_comment: {
    name: 'add_comment',
    description: 'Add a comment to the design',
    category: 'collaboration',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Comment text' },
        x: { type: 'number', description: 'X position for comment pin' },
        y: { type: 'number', description: 'Y position for comment pin' },
        layerId: { type: 'string', description: 'Layer to attach comment to' },
      },
      required: ['message'],
    },
    returns: {
      type: 'object',
      properties: {
        commentId: { type: 'string' },
      },
    },
  },

  reply_to_comment: {
    name: 'reply_to_comment',
    description: 'Reply to an existing comment',
    category: 'collaboration',
    parameters: {
      type: 'object',
      properties: {
        commentId: { type: 'string', description: 'Comment ID to reply to' },
        message: { type: 'string', description: 'Reply text' },
      },
      required: ['commentId', 'message'],
    },
    returns: {
      type: 'object',
      properties: {
        replyId: { type: 'string' },
      },
    },
  },

  resolve_comment: {
    name: 'resolve_comment',
    description: 'Mark a comment as resolved',
    category: 'collaboration',
    parameters: {
      type: 'object',
      properties: {
        commentId: { type: 'string', description: 'Comment ID to resolve' },
      },
      required: ['commentId'],
    },
    returns: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  },

  list_comments: {
    name: 'list_comments',
    description: 'List all comments in the file',
    category: 'collaboration',
    parameters: {
      type: 'object',
      properties: {
        includeResolved: { type: 'boolean', description: 'Include resolved comments', default: false },
      },
    },
    returns: {
      type: 'object',
      properties: {
        comments: { type: 'array', items: { type: 'object' } },
        count: { type: 'number' },
      },
    },
  },

  // AI Tools
  generate_image: {
    name: 'generate_image',
    description: 'Generate an image using AI',
    category: 'ai',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Image generation prompt' },
        width: { type: 'number', description: 'Image width', default: 512 },
        height: { type: 'number', description: 'Image height', default: 512 },
        style: { type: 'string', enum: ['realistic', 'illustration', 'abstract', 'ui'], description: 'Image style' },
      },
      required: ['prompt'],
    },
    returns: {
      type: 'object',
      properties: {
        layerId: { type: 'string' },
        imageUrl: { type: 'string' },
      },
    },
  },

  remove_background: {
    name: 'remove_background',
    description: 'Remove the background from an image',
    category: 'ai',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Image layer ID (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        layerId: { type: 'string' },
      },
    },
  },

  generate_copy: {
    name: 'generate_copy',
    description: 'Generate text content using AI',
    category: 'ai',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['headline', 'body', 'cta', 'tagline', 'description'], description: 'Type of copy' },
        context: { type: 'string', description: 'Context for the copy' },
        length: { type: 'string', enum: ['short', 'medium', 'long'], description: 'Desired length' },
        tone: { type: 'string', enum: ['professional', 'casual', 'playful', 'formal'], description: 'Tone of voice' },
      },
      required: ['type'],
    },
    returns: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        alternatives: { type: 'array', items: { type: 'string' } },
      },
    },
  },

  rewrite_text: {
    name: 'rewrite_text',
    description: 'Rewrite text using AI',
    category: 'ai',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Text layer ID (uses selection if not provided)' },
        instruction: { type: 'string', description: 'Rewriting instruction (e.g., "make it shorter", "more formal")' },
      },
      required: ['instruction'],
    },
    returns: {
      type: 'object',
      properties: {
        newText: { type: 'string' },
        applied: { type: 'boolean' },
      },
    },
  },

  translate_text: {
    name: 'translate_text',
    description: 'Translate text to another language',
    category: 'ai',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Text layer ID (uses selection if not provided)' },
        targetLanguage: { type: 'string', description: 'Target language code (e.g., "es", "fr", "de")' },
      },
      required: ['targetLanguage'],
    },
    returns: {
      type: 'object',
      properties: {
        translatedText: { type: 'string' },
        applied: { type: 'boolean' },
      },
    },
  },

  suggest_layout: {
    name: 'suggest_layout',
    description: 'Get AI suggestions for layout improvements',
    category: 'ai',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Frame ID to analyze (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        suggestions: { type: 'array', items: { type: 'object' } },
      },
    },
  },

  auto_rename_layers: {
    name: 'auto_rename_layers',
    description: 'Automatically rename layers based on their content',
    category: 'ai',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        renamedCount: { type: 'number' },
        changes: { type: 'array', items: { type: 'object' } },
      },
    },
  },

  import_image_as_leaf: {
    name: 'import_image_as_leaf',
    description: 'Import attached images (PNG, JPEG, SVG, etc.) as separate leaves using AI vision analysis. Uses images attached to the current message. Each image becomes a frame with all detected UI elements as child nodes.',
    category: 'ai',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X position for first leaf', default: 0 },
        y: { type: 'number', description: 'Y position for first leaf', default: 0 },
        includeOriginalImage: {
          type: 'boolean',
          description: 'Include original image as faded background for reference',
          default: true,
        },
        analyzeWithVision: {
          type: 'boolean',
          description: 'Use AI vision to detect and extract UI elements',
          default: true,
        },
      },
    },
    returns: {
      type: 'object',
      properties: {
        leaves: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              leafId: { type: 'string' },
              elementCount: { type: 'number' },
              description: { type: 'string' },
              originalWidth: { type: 'number' },
              originalHeight: { type: 'number' },
            },
          },
        },
        totalElements: { type: 'number' },
        message: { type: 'string' },
      },
    },
    examples: [
      {
        description: 'Import attached screenshots as editable design leaves',
        args: { includeOriginalImage: true, analyzeWithVision: true },
        result: { leaves: [{ leafId: 'leaf-1', elementCount: 15, description: 'Mobile app screen with header and cards' }], totalElements: 15, message: 'Imported 1 image as leaf' },
      },
    ],
  },

  // Analysis & Audit
  accessibility_audit: {
    name: 'accessibility_audit',
    description: 'Run an accessibility audit on the design',
    category: 'analysis',
    parameters: {
      type: 'object',
      properties: {
        frameId: { type: 'string', description: 'Frame ID to audit (uses selection if not provided)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        issues: { type: 'array', items: { type: 'object' } },
        warnings: { type: 'array', items: { type: 'object' } },
        passed: { type: 'number' },
      },
    },
  },

  contrast_check: {
    name: 'contrast_check',
    description: 'Check color contrast ratios',
    category: 'analysis',
    parameters: {
      type: 'object',
      properties: {
        layerId: { type: 'string', description: 'Layer ID to check (uses selection if not provided)' },
        wcagLevel: { type: 'string', enum: ['AA', 'AAA'], description: 'WCAG level to check against', default: 'AA' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        ratio: { type: 'number' },
        passes: { type: 'boolean' },
        recommendation: { type: 'string' },
      },
    },
  },

  consistency_audit: {
    name: 'consistency_audit',
    description: 'Check for design inconsistencies',
    category: 'analysis',
    parameters: {
      type: 'object',
      properties: {
        checkTypes: { type: 'array', items: { type: 'string', enum: ['colors', 'fonts', 'spacing', 'sizing'] }, description: 'Types of checks to perform' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        issues: { type: 'array', items: { type: 'object' } },
        score: { type: 'number' },
      },
    },
  },

  find_detached_styles: {
    name: 'find_detached_styles',
    description: 'Find layers with detached styles',
    category: 'analysis',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        layers: { type: 'array', items: { type: 'object' } },
        count: { type: 'number' },
      },
    },
  },

  spell_check: {
    name: 'spell_check',
    description: 'Check spelling in text layers',
    category: 'analysis',
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Language code', default: 'en' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        errors: { type: 'array', items: { type: 'object' } },
        count: { type: 'number' },
      },
    },
  },

  list_fonts_used: {
    name: 'list_fonts_used',
    description: 'List all fonts used in the file',
    category: 'analysis',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        fonts: { type: 'array', items: { type: 'object' } },
        count: { type: 'number' },
      },
    },
  },

  find_missing_fonts: {
    name: 'find_missing_fonts',
    description: 'Find layers with missing fonts',
    category: 'analysis',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        missingFonts: { type: 'array', items: { type: 'string' } },
        affectedLayers: { type: 'array', items: { type: 'object' } },
      },
    },
  },

  replace_font: {
    name: 'replace_font',
    description: 'Replace one font with another throughout the file',
    category: 'analysis',
    parameters: {
      type: 'object',
      properties: {
        fromFont: { type: 'string', description: 'Font to replace' },
        toFont: { type: 'string', description: 'Replacement font' },
      },
      required: ['fromFont', 'toFont'],
    },
    returns: {
      type: 'object',
      properties: {
        replacedCount: { type: 'number' },
      },
    },
  },

  // Automation
  batch_rename: {
    name: 'batch_rename',
    description: 'Rename multiple layers using a pattern',
    category: 'automation',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
        pattern: { type: 'string', description: 'Naming pattern (use {n} for number, {name} for original)' },
        startNumber: { type: 'number', description: 'Starting number', default: 1 },
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

  batch_resize: {
    name: 'batch_resize',
    description: 'Resize multiple layers at once',
    category: 'automation',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
        width: { type: 'number', description: 'New width (optional)' },
        height: { type: 'number', description: 'New height (optional)' },
        scale: { type: 'number', description: 'Scale factor (optional)' },
      },
    },
    returns: {
      type: 'object',
      properties: {
        resizedCount: { type: 'number' },
      },
    },
  },

  batch_export: {
    name: 'batch_export',
    description: 'Export multiple layers at once',
    category: 'automation',
    parameters: {
      type: 'object',
      properties: {
        layerIds: { type: 'array', items: { type: 'string' }, description: 'Layer IDs (uses selection if not provided)' },
        format: { type: 'string', enum: ['png', 'jpg', 'svg', 'pdf'], description: 'Export format' },
        scale: { type: 'number', description: 'Export scale', default: 1 },
      },
      required: ['format'],
    },
    returns: {
      type: 'object',
      properties: {
        exportedCount: { type: 'number' },
        files: { type: 'array', items: { type: 'string' } },
      },
    },
  },

  apply_to_all: {
    name: 'apply_to_all',
    description: 'Apply a property change to all matching layers',
    category: 'automation',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'object', description: 'Criteria to match layers', properties: { type: { type: 'string' }, name: { type: 'string' }, hasStyle: { type: 'string' } } },
        changes: { type: 'object', description: 'Properties to change' },
      },
      required: ['selector', 'changes'],
    },
    returns: {
      type: 'object',
      properties: {
        appliedCount: { type: 'number' },
      },
    },
  },

  // General Utilities
  undo: {
    name: 'undo',
    description: 'Undo the last action',
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

  redo: {
    name: 'redo',
    description: 'Redo the last undone action',
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

  copy: {
    name: 'copy',
    description: 'Copy selected layers to clipboard',
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

  paste: {
    name: 'paste',
    description: 'Paste from clipboard',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        pastedIds: { type: 'array', items: { type: 'string' } },
      },
    },
  },

  paste_here: {
    name: 'paste_here',
    description: 'Paste at current cursor position',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
      },
      required: ['x', 'y'],
    },
    returns: {
      type: 'object',
      properties: {
        pastedIds: { type: 'array', items: { type: 'string' } },
      },
    },
  },

  zoom_to_100: {
    name: 'zoom_to_100',
    description: 'Set zoom to 100%',
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

  zoom_in: {
    name: 'zoom_in',
    description: 'Zoom in one step',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        newZoom: { type: 'number' },
      },
    },
  },

  zoom_out: {
    name: 'zoom_out',
    description: 'Zoom out one step',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        newZoom: { type: 'number' },
      },
    },
  },

  toggle_rulers: {
    name: 'toggle_rulers',
    description: 'Toggle rulers visibility',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        visible: { type: 'boolean' },
      },
    },
  },

  toggle_grid: {
    name: 'toggle_grid',
    description: 'Toggle grid visibility',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        visible: { type: 'boolean' },
      },
    },
  },

  toggle_guides: {
    name: 'toggle_guides',
    description: 'Toggle guides visibility',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        visible: { type: 'boolean' },
      },
    },
  },

  toggle_outlines: {
    name: 'toggle_outlines',
    description: 'Toggle outline view mode',
    category: 'utility',
    parameters: {
      type: 'object',
      properties: {},
    },
    returns: {
      type: 'object',
      properties: {
        outlineMode: { type: 'boolean' },
      },
    },
  },

  collapse_all_layers: {
    name: 'collapse_all_layers',
    description: 'Collapse all layers in the layer panel',
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

  expand_all_layers: {
    name: 'expand_all_layers',
    description: 'Expand all layers in the layer panel',
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
