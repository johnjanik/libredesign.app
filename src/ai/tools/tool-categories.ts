/**
 * Tool Categories
 *
 * Prioritized tool categories for progressive loading based on LLM capability.
 */

/**
 * Tool category definition
 */
export interface ToolCategory {
  id: string;
  priority: number;
  description: string;
  tools: readonly string[];
}

/**
 * Tool categories organized by priority
 */
export const TOOL_CATEGORIES = {
  // P0: Foundational - Selection & Layer Operations
  SELECTION: {
    id: 'selection',
    priority: 0,
    description: 'Layer selection & basic operations',
    tools: [
      'select_all',
      'select_by_name',
      'select_by_type',
      'deselect_all',
      'get_selection',
      'group_layers',
      'ungroup_layers',
      'lock_layer',
      'unlock_layer',
      'hide_layer',
      'show_layer',
      'delete_selection',
    ] as const,
  },

  // P1: Basic Creation
  CREATION: {
    id: 'creation',
    priority: 1,
    description: 'Shape and element creation',
    tools: [
      'create_rectangle',
      'create_ellipse',
      'create_text',
      'create_frame',
      'create_line',
      'create_polygon',
      'create_star',
      'insert_image',
    ] as const,
  },

  // P2: Styling & Appearance
  STYLING: {
    id: 'styling',
    priority: 2,
    description: 'Colors, fills, strokes, effects',
    tools: [
      'set_fill_color',
      'set_stroke_color',
      'set_stroke_width',
      'set_opacity',
      'set_corner_radius',
      'add_drop_shadow',
      'remove_effects',
    ] as const,
  },

  // P3: Layout & Positioning
  LAYOUT: {
    id: 'layout',
    priority: 3,
    description: 'Alignment, distribution, positioning',
    tools: [
      'align_left',
      'align_center_h',
      'align_right',
      'align_top',
      'align_center_v',
      'align_bottom',
      'distribute_horizontal',
      'distribute_vertical',
      'set_position',
      'set_size',
      'rotate',
    ] as const,
  },

  // P4: Advanced Operations
  ADVANCED: {
    id: 'advanced',
    priority: 4,
    description: 'Auto-layout, components, prototyping',
    tools: [
      'add_auto_layout',
      'remove_auto_layout',
      'create_component',
      'create_instance',
      'set_constraints',
      'rename_layer',
      'duplicate_layer',
    ] as const,
  },

  // P5: Utility & AI
  UTILITY: {
    id: 'utility',
    priority: 5,
    description: 'Export, analysis, AI features',
    tools: [
      'export_png',
      'export_svg',
      'get_layer_properties',
      'get_canvas_state',
      'zoom_to_selection',
      'zoom_to_fit',
      'set_zoom',
    ] as const,
  },
} as const;

/**
 * All tool names as a union type
 */
export type ToolName = typeof TOOL_CATEGORIES[keyof typeof TOOL_CATEGORIES]['tools'][number];

/**
 * Get all tools sorted by priority
 */
export function getToolsByPriority(): string[] {
  return Object.values(TOOL_CATEGORIES)
    .sort((a, b) => a.priority - b.priority)
    .flatMap(category => [...category.tools]);
}

/**
 * Get tools available for a given capability level
 * @param level - Maximum priority level (0-5)
 */
export function getToolsForCapability(level: 0 | 1 | 2 | 3 | 4 | 5): string[] {
  return Object.values(TOOL_CATEGORIES)
    .filter(category => category.priority <= level)
    .flatMap(category => [...category.tools]);
}

/**
 * Get the category for a tool
 */
export function getToolCategory(toolName: string): ToolCategory | undefined {
  for (const category of Object.values(TOOL_CATEGORIES)) {
    if ((category.tools as readonly string[]).includes(toolName)) {
      return category;
    }
  }
  return undefined;
}

/**
 * Check if a tool is available at a given capability level
 */
export function isToolAvailable(toolName: string, level: number): boolean {
  const category = getToolCategory(toolName);
  return category !== undefined && category.priority <= level;
}
