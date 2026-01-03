/**
 * Tool Categories & Tiers
 *
 * Comprehensive tool organization with tier-based access control.
 */

/**
 * Tool tier levels
 */
export type ToolTier = 'basic' | 'essential' | 'advanced';

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
 * Tool metadata with tier information
 */
export interface ToolMeta {
  name: string;
  tier: ToolTier;
  category: string;
}

// =============================================================================
// Tool Tiers Definition
// =============================================================================

/**
 * Basic tier tools (~35) - Essential design operations
 */
export const BASIC_TOOLS = [
  // Selection
  'select_all',
  'select_by_name',
  'select_by_type',
  'deselect_all',
  'get_selection',
  // Layer Management
  'rename_layer',
  'delete_selection',
  'duplicate_layer',
  'group_layers',
  'ungroup_layers',
  'lock_layer',
  'unlock_layer',
  'hide_layer',
  'show_layer',
  // Shape Creation
  'create_rectangle',
  'create_ellipse',
  'create_line',
  'create_frame',
  'create_text',
  // Styling
  'set_fill_color',
  'set_stroke_color',
  'set_stroke_width',
  'set_opacity',
  'set_corner_radius',
  // Layout
  'align_left',
  'align_center_h',
  'align_right',
  'align_top',
  'align_center_v',
  'align_bottom',
  'set_position',
  'set_size',
  'rotate',
  // Utility
  'get_layer_properties',
  'get_canvas_state',
  'zoom_to_selection',
  'zoom_to_fit',
  'set_zoom',
  'look_at',
] as const;

/**
 * Advanced tier tools (~60) - Extended design capabilities
 */
export const ADVANCED_TOOLS = [
  // Advanced Selection
  'select_children',
  'select_parent',
  'select_siblings',
  'select_similar',
  'invert_selection',
  // Layer Organization
  'rename_layers_bulk',
  'flatten_layers',
  'move_to_page',
  'reorder_layers',
  'find_orphaned_layers',
  'find_hidden_layers',
  'find_locked_layers',
  'remove_hidden_layers',
  'sort_layers_alphabetically',
  'sort_layers_by_position',
  // More Shapes
  'create_polygon',
  'create_star',
  'create_arrow',
  'create_vector',
  'create_boolean',
  'create_slice',
  'insert_image',
  'insert_svg',
  // Advanced Styling
  'set_fill_gradient',
  'set_fill_image',
  'remove_fill',
  'set_stroke_style',
  'remove_stroke',
  'swap_fill_stroke',
  'copy_style',
  'paste_style',
  // Effects
  'add_drop_shadow',
  'add_inner_shadow',
  'add_blur',
  'add_background_blur',
  'remove_effects',
  'set_blend_mode',
  'set_individual_corners',
  // Color Tools
  'get_selection_colors',
  'replace_color',
  'convert_to_grayscale',
  'invert_colors',
  'adjust_brightness',
  'adjust_saturation',
  'generate_color_palette',
  'check_contrast_ratio',
  // Typography
  'set_font_family',
  'set_font_size',
  'set_font_weight',
  'set_font_style',
  'set_line_height',
  'set_letter_spacing',
  'set_paragraph_spacing',
  'set_text_alignment',
  'set_vertical_alignment',
  'set_text_decoration',
  'set_text_case',
  'set_text_truncation',
  'replace_text',
  'generate_lorem_ipsum',
  // Advanced Layout
  'distribute_horizontal',
  'distribute_vertical',
  'tidy_up',
  'pack_horizontal',
  'pack_vertical',
  'resize',
  'resize_to_fit',
  'scale',
  'move_by',
  'flip_horizontal',
  'flip_vertical',
  'reset_rotation',
  'match_width',
  'match_height',
  'match_size',
  // Auto Layout
  'add_auto_layout',
  'remove_auto_layout',
  'set_layout_direction',
  'set_layout_gap',
  'set_layout_padding',
  'set_layout_alignment',
  'set_layout_wrap',
  // Constraints
  'set_constraints',
  'fix_position',
  'center_constraints',
  'scale_constraints',
  'stretch_constraints',
  // Export
  'export_png',
  'export_jpg',
  'export_svg',
  'export_pdf',
  'add_export_setting',
  'remove_export_settings',
  'export_at_scale',
] as const;

/**
 * Professional tier tools (~100) - Full professional capabilities
 */
export const PROFESSIONAL_TOOLS = [
  // Components
  'create_component',
  'create_component_set',
  'create_instance',
  'detach_instance',
  'reset_instance',
  'push_overrides_to_main',
  'swap_component',
  'go_to_main_component',
  'list_component_instances',
  'add_component_property',
  'expose_nested_property',
  'set_component_description',
  'insert_from_library',
  // Styles
  'create_color_style',
  'create_text_style',
  'create_effect_style',
  'apply_style',
  'detach_style',
  'list_local_styles',
  'find_unused_styles',
  // Variables
  'create_variable',
  'set_variable_value',
  'bind_to_variable',
  'list_variables',
  'switch_variable_mode',
  // Library
  'publish_library',
  'update_library',
  'list_library_components',
  'list_library_styles',
  'import_component',
  'import_style',
  'check_library_updates',
  // Prototyping
  'add_interaction',
  'remove_interactions',
  'set_trigger',
  'set_action',
  'set_destination',
  'set_transition',
  'set_transition_duration',
  'set_transition_easing',
  'auto_wire_prototype',
  'list_all_interactions',
  'set_starting_frame',
  'set_flow_name',
  'set_flow_description',
  'set_device_frame',
  'set_prototype_background',
  'preview_prototype',
  'share_prototype',
  // Code Generation
  'generate_css',
  'generate_tailwind',
  'generate_swift',
  'generate_android',
  'generate_react',
  'generate_html',
  'copy_as_code',
  'inspect_properties',
  'export_to_json',
  'export_all_assets',
  // Page Management
  'create_page',
  'rename_page',
  'delete_page',
  'duplicate_page',
  'reorder_pages',
  'go_to_page',
  'list_pages',
  'set_page_background',
  // File Management
  'get_file_info',
  'get_version_history',
  'restore_version',
  'save_version',
  'duplicate_file',
  'move_to_project',
  'get_file_stats',
  // Collaboration
  'add_comment',
  'reply_to_comment',
  'resolve_comment',
  'delete_comment',
  'list_comments',
  'list_unresolved_comments',
  'mention_user',
  'get_active_users',
  'follow_user',
  'spotlight_selection',
  'share_file',
  'set_permissions',
  // AI Tools
  'generate_image',
  'refine_image',
  'remove_background',
  'generate_copy',
  'rewrite_text',
  'translate_text',
  'adjust_text_length',
  'adjust_text_tone',
  'generate_ui_design',
  'suggest_layout',
  'generate_avatar',
  'auto_rename_layers',
  'import_image_as_leaf',
  'infer_auto_layout',
  // Analysis & Audit
  'visual_search',
  'semantic_asset_search',
  'find_similar_designs',
  'search_file_content',
  'search_layer_names',
  'accessibility_audit',
  'contrast_check',
  'consistency_audit',
  'find_detached_styles',
  'suggest_components',
  'file_health_check',
  'spell_check',
  'count_characters',
  'list_fonts_used',
  'find_missing_fonts',
  'replace_font',
  // Automation
  'run_plugin',
  'batch_rename',
  'batch_resize',
  'batch_export',
  'apply_to_all',
  'create_workflow',
  // General Utilities
  'undo',
  'redo',
  'copy',
  'paste',
  'paste_here',
  'paste_to_replace',
  'zoom_to_100',
  'zoom_in',
  'zoom_out',
  'toggle_rulers',
  'toggle_grid',
  'toggle_guides',
  'toggle_outlines',
  'toggle_pixel_preview',
  'collapse_all_layers',
  'expand_all_layers',
] as const;

/**
 * All tools combined
 */
export const ALL_TOOLS = [
  ...BASIC_TOOLS,
  ...ADVANCED_TOOLS,
  ...PROFESSIONAL_TOOLS,
] as const;

/**
 * Tool tier configuration
 */
export const TOOL_TIERS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'Core design operations (~35 tools)',
    tools: BASIC_TOOLS,
    toolCount: BASIC_TOOLS.length,
  },
  essential: {
    id: 'essential',
    name: 'Essential',
    description: 'Extended design capabilities (~95 tools)',
    tools: [...BASIC_TOOLS, ...ADVANCED_TOOLS],
    toolCount: BASIC_TOOLS.length + ADVANCED_TOOLS.length,
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced',
    description: 'Full professional suite (~195 tools)',
    tools: ALL_TOOLS,
    toolCount: ALL_TOOLS.length,
  },
} as const;

// =============================================================================
// Tool Categories (for priority-based loading within tiers)
// =============================================================================

/**
 * Tool categories organized by priority
 */
export const TOOL_CATEGORIES = {
  SELECTION: {
    id: 'selection',
    priority: 0,
    description: 'Layer selection & basic operations',
    tools: [
      'select_all', 'select_by_name', 'select_by_type', 'deselect_all',
      'get_selection', 'select_children', 'select_parent', 'select_siblings',
      'select_similar', 'invert_selection',
    ] as const,
  },

  LAYER_MANAGEMENT: {
    id: 'layer_management',
    priority: 1,
    description: 'Layer organization and management',
    tools: [
      'rename_layer', 'rename_layers_bulk', 'delete_selection', 'duplicate_layer',
      'group_layers', 'ungroup_layers', 'flatten_layers', 'lock_layer',
      'unlock_layer', 'hide_layer', 'show_layer', 'move_to_page', 'reorder_layers',
      'find_orphaned_layers', 'find_hidden_layers', 'find_locked_layers',
      'remove_hidden_layers', 'sort_layers_alphabetically', 'sort_layers_by_position',
      'collapse_all_layers', 'expand_all_layers',
    ] as const,
  },

  CREATION: {
    id: 'creation',
    priority: 2,
    description: 'Shape and element creation',
    tools: [
      'create_rectangle', 'create_ellipse', 'create_polygon', 'create_star',
      'create_line', 'create_arrow', 'create_vector', 'create_frame',
      'create_slice', 'create_boolean', 'create_text', 'insert_image',
      'insert_svg', 'insert_gif',
    ] as const,
  },

  STYLING: {
    id: 'styling',
    priority: 3,
    description: 'Colors, fills, strokes, effects',
    tools: [
      'set_fill_color', 'set_fill_gradient', 'set_fill_image', 'remove_fill',
      'set_stroke_color', 'set_stroke_width', 'set_stroke_style', 'remove_stroke',
      'swap_fill_stroke', 'copy_style', 'paste_style', 'set_opacity',
      'set_blend_mode', 'set_corner_radius', 'set_individual_corners',
    ] as const,
  },

  EFFECTS: {
    id: 'effects',
    priority: 4,
    description: 'Visual effects',
    tools: [
      'add_drop_shadow', 'add_inner_shadow', 'add_blur', 'add_background_blur',
      'remove_effects',
    ] as const,
  },

  COLOR: {
    id: 'color',
    priority: 5,
    description: 'Color manipulation and analysis',
    tools: [
      'get_selection_colors', 'replace_color', 'convert_to_grayscale',
      'invert_colors', 'adjust_brightness', 'adjust_saturation',
      'generate_color_palette', 'check_contrast_ratio',
    ] as const,
  },

  TYPOGRAPHY: {
    id: 'typography',
    priority: 6,
    description: 'Text styling and content',
    tools: [
      'set_font_family', 'set_font_size', 'set_font_weight', 'set_font_style',
      'set_line_height', 'set_letter_spacing', 'set_paragraph_spacing',
      'set_text_alignment', 'set_vertical_alignment', 'set_text_decoration',
      'set_text_case', 'set_text_truncation', 'replace_text',
      'generate_lorem_ipsum', 'generate_realistic_content', 'rewrite_text',
      'translate_text', 'adjust_text_length', 'adjust_text_tone',
      'spell_check', 'count_characters', 'list_fonts_used',
      'find_missing_fonts', 'replace_font',
    ] as const,
  },

  LAYOUT: {
    id: 'layout',
    priority: 7,
    description: 'Alignment, distribution, positioning',
    tools: [
      'align_left', 'align_center_h', 'align_right', 'align_top',
      'align_center_v', 'align_bottom', 'distribute_horizontal',
      'distribute_vertical', 'tidy_up', 'pack_horizontal', 'pack_vertical',
      'set_position', 'move_by', 'set_size', 'resize', 'resize_to_fit',
      'scale', 'rotate', 'flip_horizontal', 'flip_vertical', 'reset_rotation',
      'match_width', 'match_height', 'match_size',
    ] as const,
  },

  AUTO_LAYOUT: {
    id: 'auto_layout',
    priority: 8,
    description: 'Auto layout configuration',
    tools: [
      'add_auto_layout', 'remove_auto_layout', 'set_layout_direction',
      'set_layout_gap', 'set_layout_padding', 'set_layout_alignment',
      'set_layout_wrap', 'infer_auto_layout',
    ] as const,
  },

  CONSTRAINTS: {
    id: 'constraints',
    priority: 9,
    description: 'Responsive constraints',
    tools: [
      'set_constraints', 'fix_position', 'center_constraints',
      'scale_constraints', 'stretch_constraints',
    ] as const,
  },

  COMPONENTS: {
    id: 'components',
    priority: 10,
    description: 'Component operations',
    tools: [
      'create_component', 'create_component_set', 'create_instance',
      'detach_instance', 'reset_instance', 'push_overrides_to_main',
      'swap_component', 'go_to_main_component', 'list_component_instances',
      'add_component_property', 'expose_nested_property',
      'set_component_description', 'insert_from_library',
    ] as const,
  },

  STYLES: {
    id: 'styles',
    priority: 11,
    description: 'Style management',
    tools: [
      'create_color_style', 'create_text_style', 'create_effect_style',
      'apply_style', 'detach_style', 'list_local_styles', 'find_unused_styles',
    ] as const,
  },

  VARIABLES: {
    id: 'variables',
    priority: 12,
    description: 'Variable management',
    tools: [
      'create_variable', 'set_variable_value', 'bind_to_variable',
      'list_variables', 'switch_variable_mode',
    ] as const,
  },

  LIBRARY: {
    id: 'library',
    priority: 13,
    description: 'Library operations',
    tools: [
      'publish_library', 'update_library', 'list_library_components',
      'list_library_styles', 'import_component', 'import_style',
      'check_library_updates',
    ] as const,
  },

  PROTOTYPING: {
    id: 'prototyping',
    priority: 14,
    description: 'Prototype interactions',
    tools: [
      'add_interaction', 'remove_interactions', 'set_trigger', 'set_action',
      'set_destination', 'set_transition', 'set_transition_duration',
      'set_transition_easing', 'auto_wire_prototype', 'list_all_interactions',
      'set_starting_frame', 'set_flow_name', 'set_flow_description',
      'set_device_frame', 'set_prototype_background', 'preview_prototype',
      'share_prototype',
    ] as const,
  },

  EXPORT: {
    id: 'export',
    priority: 15,
    description: 'Export and code generation',
    tools: [
      'export_png', 'export_jpg', 'export_svg', 'export_pdf',
      'export_all_assets', 'add_export_setting', 'remove_export_settings',
      'export_at_scale', 'export_to_json', 'generate_css', 'generate_tailwind',
      'generate_swift', 'generate_android', 'generate_react', 'generate_html',
      'copy_as_code', 'inspect_properties',
    ] as const,
  },

  PAGE_MANAGEMENT: {
    id: 'page_management',
    priority: 16,
    description: 'Page operations',
    tools: [
      'create_page', 'rename_page', 'delete_page', 'duplicate_page',
      'reorder_pages', 'go_to_page', 'list_pages', 'set_page_background',
    ] as const,
  },

  FILE_MANAGEMENT: {
    id: 'file_management',
    priority: 17,
    description: 'File operations',
    tools: [
      'get_file_info', 'get_version_history', 'restore_version', 'save_version',
      'duplicate_file', 'move_to_project', 'get_file_stats',
    ] as const,
  },

  COLLABORATION: {
    id: 'collaboration',
    priority: 18,
    description: 'Collaboration features',
    tools: [
      'add_comment', 'reply_to_comment', 'resolve_comment', 'delete_comment',
      'list_comments', 'list_unresolved_comments', 'mention_user',
      'get_active_users', 'follow_user', 'spotlight_selection',
      'share_file', 'set_permissions',
    ] as const,
  },

  AI: {
    id: 'ai',
    priority: 19,
    description: 'AI-powered tools',
    tools: [
      'generate_image', 'refine_image', 'remove_background', 'generate_copy',
      'generate_ui_design', 'suggest_layout', 'generate_avatar',
      'auto_rename_layers', 'visual_search', 'semantic_asset_search',
      'find_similar_designs', 'search_file_content', 'search_layer_names',
    ] as const,
  },

  ANALYSIS: {
    id: 'analysis',
    priority: 20,
    description: 'Analysis and audit',
    tools: [
      'accessibility_audit', 'contrast_check', 'consistency_audit',
      'find_detached_styles', 'suggest_components', 'file_health_check',
    ] as const,
  },

  AUTOMATION: {
    id: 'automation',
    priority: 21,
    description: 'Batch operations and automation',
    tools: [
      'run_plugin', 'batch_rename', 'batch_resize', 'batch_export',
      'apply_to_all', 'create_workflow',
    ] as const,
  },

  UTILITY: {
    id: 'utility',
    priority: 22,
    description: 'General utilities',
    tools: [
      'undo', 'redo', 'copy', 'paste', 'paste_here', 'paste_to_replace',
      'zoom_to_fit', 'zoom_to_100', 'zoom_in', 'zoom_out', 'set_zoom',
      'zoom_to_selection', 'look_at', 'toggle_rulers', 'toggle_grid',
      'toggle_guides', 'toggle_outlines', 'toggle_pixel_preview',
      'get_layer_properties', 'get_canvas_state',
    ] as const,
  },
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * All tool names as a union type
 */
export type ToolName = typeof ALL_TOOLS[number];

/**
 * Get tools for a specific tier
 */
export function getToolsForTier(tier: ToolTier): readonly string[] {
  return TOOL_TIERS[tier].tools;
}

/**
 * Get the tier for a tool
 */
export function getToolTier(toolName: string): ToolTier | undefined {
  if ((BASIC_TOOLS as readonly string[]).includes(toolName)) return 'basic';
  if ((ADVANCED_TOOLS as readonly string[]).includes(toolName)) return 'essential';
  if ((PROFESSIONAL_TOOLS as readonly string[]).includes(toolName)) return 'advanced';
  return undefined;
}

/**
 * Check if a tool is available in a tier
 */
export function isToolInTier(toolName: string, tier: ToolTier): boolean {
  const tools = getToolsForTier(tier);
  return (tools as readonly string[]).includes(toolName);
}

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
 * @param level - Maximum priority level (0-22)
 */
export function getToolsForCapability(level: number): string[] {
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
