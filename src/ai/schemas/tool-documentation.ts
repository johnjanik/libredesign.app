/**
 * Tool Documentation Generator
 *
 * Generates comprehensive documentation for AI model consumption.
 * Model-agnostic format that can be adapted by different providers.
 *
 * Priority tiers ensure the most important tools are documented first
 * and receive the best context in system prompts.
 */

import { TOOL_DEFINITIONS, getToolDefinition } from '../tools/tool-registry';
import type { JSONSchema } from '../tools/tool-registry';

// =============================================================================
// Types
// =============================================================================

/**
 * Detailed documentation for a single tool
 */
export interface ToolDocumentation {
  /** Tool name (snake_case) */
  name: string;
  /** Tool category */
  category: string;
  /** Full description */
  description: string;
  /** Parameter documentation */
  parameters: ParameterDoc[];
  /** Return value documentation */
  returns: ReturnDoc;
  /** Usage examples */
  examples: ExampleDoc[];
  /** Related tools */
  relatedTools: string[];
  /** Whether this tool is implemented */
  implemented: boolean;
  /** Priority tier (1 = highest) */
  tier: number;
}

/**
 * Documentation for a tool parameter
 */
export interface ParameterDoc {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Whether required */
  required: boolean;
  /** Description */
  description: string;
  /** Default value */
  default?: unknown;
  /** Value constraints (min, max, enum) */
  constraints?: string;
}

/**
 * Documentation for tool return value
 */
export interface ReturnDoc {
  /** Return description */
  description: string;
  /** Fields in returned data object */
  dataFields: Array<{ name: string; type: string; description: string }>;
}

/**
 * Usage example for a tool
 */
export interface ExampleDoc {
  /** What the example demonstrates */
  description: string;
  /** Input arguments */
  input: Record<string, unknown>;
  /** Expected result description */
  expectedResult: string;
}

// =============================================================================
// Priority Tool Lists
// =============================================================================

/**
 * Priority 1: Core 30 tools for initial AI integration
 * These tools enable basic design operations and are prioritized for documentation
 */
export const PRIORITY_1_TOOLS: string[] = [
  // Selection (5)
  'select_all',
  'select_by_name',
  'select_by_type',
  'deselect_all',
  'get_selection',

  // Creation (5)
  'create_rectangle',
  'create_ellipse',
  'create_text',
  'create_frame',
  'create_line',

  // Transform (6)
  'set_position',
  'set_size',
  'rotate',
  'align_left',
  'align_center_h',
  'align_right',

  // Style (6)
  'set_fill_color',
  'set_stroke_color',
  'set_stroke_width',
  'set_opacity',
  'set_corner_radius',
  'set_blend_mode',

  // Layer Management (4)
  'group_layers',
  'ungroup_layers',
  'delete_selection',
  'rename_layer',

  // Viewport (4)
  'zoom_to_fit',
  'zoom_to_selection',
  'set_zoom',
  'look_at',
];

/**
 * Priority 2: Extended tools for intermediate workflows
 */
export const PRIORITY_2_TOOLS: string[] = [
  // Additional selection
  'select_children',
  'select_parent',
  'invert_selection',
  'select_within_bounds',

  // Additional creation
  'create_polygon',
  'create_star',
  'create_arrow',
  'import_image',

  // Additional transform
  'flip_horizontal',
  'flip_vertical',
  'distribute_horizontal',
  'distribute_vertical',
  'align_top',
  'align_center_v',
  'align_bottom',

  // Additional style
  'set_fill_gradient',
  'add_drop_shadow',
  'add_blur',
  'remove_fill',
  'remove_stroke',
  'remove_effects',

  // Typography
  'set_font_family',
  'set_font_size',
  'set_font_weight',
  'set_text_alignment',
  'set_line_height',

  // Layer operations
  'duplicate_layer',
  'reorder_layers',
  'bring_to_front',
  'send_to_back',
  'lock_layer',
  'unlock_layer',
  'hide_layer',
  'show_layer',
];

/**
 * Priority 3: Advanced tools for professional workflows
 */
export const PRIORITY_3_TOOLS: string[] = [
  // Auto-layout
  'add_auto_layout',
  'set_layout_direction',
  'set_layout_gap',
  'set_layout_padding',
  'remove_auto_layout',

  // Components
  'create_component',
  'create_instance',
  'detach_instance',
  'get_component_properties',
  'set_instance_override',

  // Styles
  'create_color_style',
  'create_text_style',
  'create_effect_style',
  'apply_style',
  'get_styles',

  // Boolean operations
  'boolean_union',
  'boolean_subtract',
  'boolean_intersect',
  'boolean_exclude',
  'flatten_selection',

  // Export
  'export_png',
  'export_svg',
  'export_pdf',
  'generate_css',
  'generate_swift',
  'generate_android',
  'generate_react',

  // Advanced
  'get_layer_properties',
  'get_canvas_state',
  'find_layers',
  'measure_distance',
  'contrast_check',
];

/**
 * All prioritized tools combined
 */
export const ALL_PRIORITY_TOOLS: string[] = [
  ...PRIORITY_1_TOOLS,
  ...PRIORITY_2_TOOLS,
  ...PRIORITY_3_TOOLS,
];

/**
 * Get priority tier for a tool (1 = highest, 4 = not prioritized)
 */
export function getToolPriority(toolName: string): number {
  if (PRIORITY_1_TOOLS.includes(toolName)) return 1;
  if (PRIORITY_2_TOOLS.includes(toolName)) return 2;
  if (PRIORITY_3_TOOLS.includes(toolName)) return 3;
  return 4;
}

// =============================================================================
// Implementation Status
// =============================================================================

/**
 * Tools known to be implemented (based on tool-executor.ts)
 */
export const IMPLEMENTED_TOOLS: Set<string> = new Set([
  // Selection
  'select_all',
  'select_by_name',
  'select_by_type',
  'deselect_all',
  'get_selection',
  // Creation
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
  'set_blend_mode',
  'add_drop_shadow',
  // Layout
  'align_left',
  'align_right',
  'align_center_h',
  'align_top',
  'align_bottom',
  'align_center_v',
  'set_position',
  'set_size',
  'rotate',
  'move_by',
  'scale',
  // Layer Management
  'group_layers',
  'ungroup_layers',
  'lock_layer',
  'unlock_layer',
  'hide_layer',
  'show_layer',
  'delete_selection',
  'rename_layer',
  // Viewport
  'zoom_to_selection',
  'zoom_to_fit',
  'set_zoom',
  'look_at',
  // Query
  'get_layer_properties',
  'get_canvas_state',
  'import_image_as_leaf',
]);

/**
 * Check if a tool is implemented
 */
export function isToolImplemented(toolName: string): boolean {
  return IMPLEMENTED_TOOLS.has(toolName);
}

/**
 * Get implementation statistics
 */
export function getImplementationStats(): {
  total: number;
  implemented: number;
  percentage: number;
  byTier: Record<number, { total: number; implemented: number }>;
} {
  const allTools = Object.keys(TOOL_DEFINITIONS);
  const implemented = allTools.filter(t => IMPLEMENTED_TOOLS.has(t)).length;

  const byTier: Record<number, { total: number; implemented: number }> = {
    1: { total: 0, implemented: 0 },
    2: { total: 0, implemented: 0 },
    3: { total: 0, implemented: 0 },
    4: { total: 0, implemented: 0 },
  };

  for (const tool of allTools) {
    const tier = getToolPriority(tool);
    const tierStats = byTier[tier];
    if (tierStats) {
      tierStats.total++;
      if (IMPLEMENTED_TOOLS.has(tool)) {
        tierStats.implemented++;
      }
    }
  }

  return {
    total: allTools.length,
    implemented,
    percentage: Math.round((implemented / allTools.length) * 100),
    byTier,
  };
}

// =============================================================================
// Documentation Generation
// =============================================================================

/**
 * Generate documentation for a single tool
 */
export function generateToolDocumentation(toolName: string): ToolDocumentation | null {
  const def = getToolDefinition(toolName);
  if (!def) return null;

  const params: ParameterDoc[] = [];

  if (def.parameters?.properties) {
    for (const [name, schema] of Object.entries(def.parameters.properties)) {
      const s = schema as JSONSchema & { description?: string };
      const constraints = buildConstraints(s);
      const paramDoc: ParameterDoc = {
        name,
        type: s.type || 'any',
        required: def.parameters.required?.includes(name) ?? false,
        description: s.description || '',
        default: s.default,
      };
      if (constraints) {
        paramDoc.constraints = constraints;
      }
      params.push(paramDoc);
    }
  }

  // Find related tools in same category
  const relatedTools = findRelatedTools(def.name, def.category);

  // Map examples from definition
  const examples: ExampleDoc[] = (def.examples || []).map(ex => ({
    description: ex.description,
    input: ex.args,
    expectedResult: typeof ex.result === 'string' ? ex.result : JSON.stringify(ex.result),
  }));

  return {
    name: def.name,
    category: def.category,
    description: def.description,
    parameters: params,
    returns: {
      description: 'ToolResult with success status and relevant data',
      dataFields: extractReturnFields(def.returns),
    },
    examples,
    relatedTools,
    implemented: isToolImplemented(toolName),
    tier: getToolPriority(toolName),
  };
}

/**
 * Build constraints string from schema
 */
function buildConstraints(schema: JSONSchema): string | undefined {
  const constraints: string[] = [];

  if (schema.minimum !== undefined) {
    constraints.push(`min: ${schema.minimum}`);
  }
  if (schema.maximum !== undefined) {
    constraints.push(`max: ${schema.maximum}`);
  }
  if (schema.enum) {
    constraints.push(`values: ${schema.enum.join(', ')}`);
  }

  return constraints.length > 0 ? constraints.join(', ') : undefined;
}

/**
 * Find related tools in the same category
 */
function findRelatedTools(name: string, category?: string): string[] {
  if (!category) return [];

  const allTools = Object.keys(TOOL_DEFINITIONS);
  return allTools
    .filter(t => {
      const def = getToolDefinition(t);
      return def?.category === category && t !== name;
    })
    .slice(0, 5);
}

/**
 * Extract return data fields from schema
 */
function extractReturnFields(returns: JSONSchema): Array<{ name: string; type: string; description: string }> {
  const fields: Array<{ name: string; type: string; description: string }> = [];

  if (returns.properties) {
    for (const [name, schema] of Object.entries(returns.properties)) {
      const s = schema as JSONSchema & { description?: string };
      fields.push({
        name,
        type: s.type || 'any',
        description: s.description || '',
      });
    }
  }

  return fields;
}

// =============================================================================
// Markdown Generation
// =============================================================================

/**
 * Generate markdown documentation for a list of tools
 */
export function generateToolMarkdown(tools: string[]): string {
  let doc = '';

  for (const toolName of tools) {
    const toolDoc = generateToolDocumentation(toolName);
    if (!toolDoc) continue;

    const status = toolDoc.implemented ? '' : ' (NOT IMPLEMENTED)';
    doc += `### ${toolDoc.name}${status}\n\n`;
    doc += `**Category**: ${toolDoc.category} | **Priority**: Tier ${toolDoc.tier}\n\n`;
    doc += `${toolDoc.description}\n\n`;

    // Parameters
    if (toolDoc.parameters.length > 0) {
      doc += '**Parameters:**\n\n';
      doc += '| Name | Type | Required | Description |\n';
      doc += '|------|------|----------|-------------|\n';
      for (const p of toolDoc.parameters) {
        const req = p.required ? 'Yes' : `No${p.default !== undefined ? ` (${JSON.stringify(p.default)})` : ''}`;
        doc += `| \`${p.name}\` | ${p.type} | ${req} | ${p.description} |\n`;
      }
      doc += '\n';
    } else {
      doc += '**Parameters:** None\n\n';
    }

    // Returns
    doc += '**Returns**: ToolResult';
    if (toolDoc.returns.dataFields.length > 0) {
      doc += ' with:\n';
      for (const field of toolDoc.returns.dataFields) {
        doc += `- \`${field.name}\` (${field.type}): ${field.description}\n`;
      }
    }
    doc += '\n';

    // Examples
    if (toolDoc.examples.length > 0) {
      doc += '**Examples:**\n\n';
      for (const ex of toolDoc.examples) {
        doc += `- ${ex.description}\n`;
        doc += `  \`\`\`json\n  ${JSON.stringify(ex.input)}\n  \`\`\`\n`;
      }
      doc += '\n';
    }

    // Related
    if (toolDoc.relatedTools.length > 0) {
      doc += `**Related**: ${toolDoc.relatedTools.join(', ')}\n`;
    }

    doc += '\n---\n\n';
  }

  return doc;
}

/**
 * Generate complete tool documentation markdown
 */
export function generateCompleteToolDocumentation(): string {
  let doc = '# AI Tool Documentation\n\n';

  const stats = getImplementationStats();
  doc += `## Overview\n\n`;
  doc += `- **Total Tools**: ${stats.total}\n`;
  doc += `- **Implemented**: ${stats.implemented} (${stats.percentage}%)\n\n`;

  doc += '### By Priority Tier\n\n';
  doc += '| Tier | Total | Implemented | Purpose |\n';
  doc += '|------|-------|-------------|----------|\n';
  const tier1 = stats.byTier[1] ?? { total: 0, implemented: 0 };
  const tier2 = stats.byTier[2] ?? { total: 0, implemented: 0 };
  const tier3 = stats.byTier[3] ?? { total: 0, implemented: 0 };
  const tier4 = stats.byTier[4] ?? { total: 0, implemented: 0 };
  doc += `| 1 | ${tier1.total} | ${tier1.implemented} | Core operations |\n`;
  doc += `| 2 | ${tier2.total} | ${tier2.implemented} | Extended features |\n`;
  doc += `| 3 | ${tier3.total} | ${tier3.implemented} | Professional workflows |\n`;
  doc += `| 4 | ${tier4.total} | ${tier4.implemented} | Additional tools |\n\n`;

  doc += '---\n\n';

  // Priority 1 tools
  doc += '## Tier 1: Core Tools\n\n';
  doc += generateToolMarkdown(PRIORITY_1_TOOLS);

  // Priority 2 tools
  doc += '## Tier 2: Extended Tools\n\n';
  doc += generateToolMarkdown(PRIORITY_2_TOOLS);

  // Priority 3 tools
  doc += '## Tier 3: Professional Tools\n\n';
  doc += generateToolMarkdown(PRIORITY_3_TOOLS);

  return doc;
}

// =============================================================================
// System Prompt Generation
// =============================================================================

/**
 * Generate concise tool summary for system prompts
 * Optimized for token efficiency
 */
export function generateToolPrompt(tools?: string[]): string {
  const toolList = tools || PRIORITY_1_TOOLS;
  const lines: string[] = ['## Available Tools', ''];

  // Group by category
  const byCategory: Record<string, string[]> = {};

  for (const name of toolList) {
    const def = getToolDefinition(name);
    if (!def) continue;

    const cat = def.category || 'other';
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(name);
  }

  // Output grouped tools
  for (const [category, toolNames] of Object.entries(byCategory)) {
    const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
    lines.push(`**${categoryLabel}**: ${toolNames.join(', ')}`);
  }

  lines.push('');
  lines.push('**IMPORTANT: To execute design operations, you MUST use the tool/function calling feature.**');
  lines.push('Do NOT describe tools in JSON or text - actually call them using the tool_use mechanism.');
  lines.push('When you want to create a rectangle, call the create_rectangle tool directly.');
  lines.push('The tools will execute immediately and modify the design canvas.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate tool definitions for a specific tier
 */
export function getToolsForTier(tier: 1 | 2 | 3): string[] {
  switch (tier) {
    case 1:
      return PRIORITY_1_TOOLS;
    case 2:
      return [...PRIORITY_1_TOOLS, ...PRIORITY_2_TOOLS];
    case 3:
      return ALL_PRIORITY_TOOLS;
  }
}

/**
 * Generate a quick reference card for tools
 */
export function generateToolQuickReference(): string {
  const lines: string[] = [
    '## Tool Quick Reference',
    '',
    '### Selection',
    '- `select_all` - Select all layers',
    '- `select_by_name(pattern)` - Select by name (* wildcard)',
    '- `select_by_type(type)` - Select by node type',
    '- `deselect_all` - Clear selection',
    '- `get_selection` - Get selected layer info',
    '',
    '### Create',
    '- `create_rectangle(x, y, width, height, name?)` - Create rectangle',
    '- `create_ellipse(x, y, width, height, name?)` - Create ellipse',
    '- `create_text(x, y, content, name?)` - Create text',
    '- `create_frame(x, y, width, height, name?)` - Create frame',
    '- `create_line(x1, y1, x2, y2, name?)` - Create line',
    '',
    '### Transform',
    '- `set_position(x, y)` - Move selection',
    '- `set_size(width, height)` - Resize selection',
    '- `rotate(angle)` - Rotate by degrees',
    '- `align_left/center_h/right` - Horizontal alignment',
    '- `align_top/center_v/bottom` - Vertical alignment',
    '',
    '### Style',
    '- `set_fill_color(r, g, b, a?)` - Set fill (0-1 values)',
    '- `set_stroke_color(r, g, b, a?)` - Set stroke color',
    '- `set_stroke_width(width)` - Set stroke width',
    '- `set_opacity(opacity)` - Set layer opacity (0-1)',
    '- `set_corner_radius(radius)` - Set corner radius',
    '',
    '### Layers',
    '- `group_layers(name?)` - Group selection',
    '- `ungroup_layers` - Ungroup selection',
    '- `delete_selection` - Delete selected',
    '- `rename_layer(name)` - Rename selection',
    '',
    '### Viewport',
    '- `zoom_to_fit` - Fit all in view',
    '- `zoom_to_selection` - Zoom to selection',
    '- `set_zoom(level)` - Set zoom (1.0 = 100%)',
    '- `look_at(x, y)` - Center view on point',
    '',
  ];

  return lines.join('\n');
}
