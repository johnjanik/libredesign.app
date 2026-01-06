# AI Priming & Toolchain Implementation Plan

## Vision

Build a model-agnostic AI integration system for DesignLibre that serves as the foundation for the Libre Design Suite:
- **DesignLibre** - Vector design application (current)
- **CADLibre** - 2D and 3D CAD application (future)
- **CAMLibre** - Additive and subtractive CAM program (future)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI Integration Layer                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Type Schemas    │  │  Tool Registry   │  │  Context Builder         │  │
│  │                  │  │                  │  │                          │  │
│  │  • Object types  │  │  • 172 tools     │  │  • Selection state       │  │
│  │  • Transforms    │  │  • JSON Schema   │  │  • Viewport info         │  │
│  │  • Fills/Strokes │  │  • Categories    │  │  • Layer structure       │  │
│  │  • Effects       │  │  • Tiers         │  │  • Recent operations     │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────────┬─────────────┘  │
│           │                     │                         │                 │
│           └─────────────────────┼─────────────────────────┘                 │
│                                 ▼                                           │
│                    ┌──────────────────────┐                                 │
│                    │   System Prompt      │                                 │
│                    │   Generator          │                                 │
│                    │                      │                                 │
│                    │   Combines:          │                                 │
│                    │   • Domain knowledge │                                 │
│                    │   • Type schemas     │                                 │
│                    │   • Tool docs        │                                 │
│                    │   • Current context  │                                 │
│                    └──────────┬───────────┘                                 │
│                               │                                             │
│                               ▼                                             │
│         ┌─────────────────────────────────────────────────┐                │
│         │            Provider Abstraction Layer            │                │
│         │                                                  │                │
│         │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │                │
│         │  │Anthropic│ │ OpenAI  │ │ Ollama  │ │LlamaCPP│ │                │
│         │  └─────────┘ └─────────┘ └─────────┘ └────────┘ │                │
│         │                                                  │                │
│         │  Common Interface:                               │                │
│         │  • formatTools(tools) → provider format          │                │
│         │  • sendMessage(prompt, tools) → response         │                │
│         │  • parseToolCalls(response) → ToolCall[]         │                │
│         └─────────────────────────────────────────────────┘                │
│                               │                                             │
│                               ▼                                             │
│                    ┌──────────────────────┐                                 │
│                    │   Tool Executor      │                                 │
│                    │                      │                                 │
│                    │   • Validates calls  │                                 │
│                    │   • Routes to bridge │                                 │
│                    │   • Returns results  │                                 │
│                    └──────────┬───────────┘                                 │
│                               │                                             │
│                               ▼                                             │
│                    ┌──────────────────────┐                                 │
│                    │   Runtime Bridge     │                                 │
│                    │                      │                                 │
│                    │   DesignLibre ──────►│ DesignLibreBridge              │
│                    │   CADLibre ─────────►│ CADLibreBridge (future)        │
│                    │   CAMLibre ─────────►│ CAMLibreBridge (future)        │
│                    └──────────────────────┘                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Type Schema System

### 1.1 Create Type Schema Registry

**File**: `src/ai/schemas/type-schemas.ts`

```typescript
/**
 * Type Schema Registry
 *
 * Provides structured documentation of all domain objects
 * for AI model comprehension. Model-agnostic format.
 */

export interface TypeSchema {
  name: string;
  description: string;
  properties: PropertySchema[];
  examples?: string[];
}

export interface PropertySchema {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
  nested?: PropertySchema[];
}

// Core geometric types
export const POINT_SCHEMA: TypeSchema = {
  name: 'Point',
  description: 'A 2D coordinate in pixel space',
  properties: [
    { name: 'x', type: 'number', description: 'X coordinate in pixels', required: true },
    { name: 'y', type: 'number', description: 'Y coordinate in pixels', required: true },
  ],
  examples: ['{ x: 100, y: 200 }', '{ x: 0, y: 0 } // Origin (top-left)'],
};

export const BOUNDS_SCHEMA: TypeSchema = {
  name: 'Bounds',
  description: 'A rectangular region defined by position and size',
  properties: [
    { name: 'x', type: 'number', description: 'Left edge X coordinate', required: true },
    { name: 'y', type: 'number', description: 'Top edge Y coordinate', required: true },
    { name: 'width', type: 'number', description: 'Width in pixels', required: true },
    { name: 'height', type: 'number', description: 'Height in pixels', required: true },
  ],
};

export const TRANSFORM_SCHEMA: TypeSchema = {
  name: 'Transform',
  description: 'Complete transformation state of an object',
  properties: [
    { name: 'x', type: 'number', description: 'X position of top-left corner', required: true },
    { name: 'y', type: 'number', description: 'Y position of top-left corner', required: true },
    { name: 'width', type: 'number', description: 'Width in pixels', required: true },
    { name: 'height', type: 'number', description: 'Height in pixels', required: true },
    { name: 'rotation', type: 'number', description: 'Rotation in degrees (clockwise)', required: false, default: 0 },
    { name: 'scaleX', type: 'number', description: 'Horizontal scale factor', required: false, default: 1 },
    { name: 'scaleY', type: 'number', description: 'Vertical scale factor', required: false, default: 1 },
  ],
};

// Color and style types
export const COLOR_SCHEMA: TypeSchema = {
  name: 'Color',
  description: 'Color value in various formats',
  properties: [
    { name: 'value', type: 'string', description: 'Color string', required: true },
  ],
  examples: [
    '"#FF5500" // Hex RGB',
    '"#FF550080" // Hex RGBA (50% opacity)',
    '"rgb(255, 85, 0)" // RGB function',
    '"rgba(255, 85, 0, 0.5)" // RGBA function',
    '"hsl(20, 100%, 50%)" // HSL function',
    '"red", "blue", "transparent" // Named colors',
  ],
};

export const RGBA_SCHEMA: TypeSchema = {
  name: 'RGBA',
  description: 'Color with separate RGBA components (0-1 range)',
  properties: [
    { name: 'r', type: 'number', description: 'Red component (0-1)', required: true },
    { name: 'g', type: 'number', description: 'Green component (0-1)', required: true },
    { name: 'b', type: 'number', description: 'Blue component (0-1)', required: true },
    { name: 'a', type: 'number', description: 'Alpha/opacity (0-1)', required: false, default: 1 },
  ],
};

export const FILL_SCHEMA: TypeSchema = {
  name: 'Fill',
  description: 'Fill style for shapes',
  properties: [
    { name: 'type', type: 'string', description: 'Fill type', required: true, enum: ['solid', 'linear', 'radial', 'none'] },
    { name: 'color', type: 'RGBA', description: 'Solid fill color', required: false },
    { name: 'visible', type: 'boolean', description: 'Whether fill is visible', required: false, default: true },
    { name: 'opacity', type: 'number', description: 'Fill opacity (0-1)', required: false, default: 1 },
  ],
};

export const STROKE_SCHEMA: TypeSchema = {
  name: 'Stroke',
  description: 'Stroke/border style for shapes',
  properties: [
    { name: 'color', type: 'RGBA', description: 'Stroke color', required: true },
    { name: 'width', type: 'number', description: 'Stroke width in pixels', required: true },
    { name: 'visible', type: 'boolean', description: 'Whether stroke is visible', required: false, default: true },
    { name: 'dashArray', type: 'number[]', description: 'Dash pattern [dash, gap, ...]', required: false },
    { name: 'lineCap', type: 'string', description: 'Line end style', required: false, enum: ['butt', 'round', 'square'] },
    { name: 'lineJoin', type: 'string', description: 'Line join style', required: false, enum: ['miter', 'round', 'bevel'] },
  ],
};

export const EFFECT_SCHEMA: TypeSchema = {
  name: 'Effect',
  description: 'Visual effect applied to objects',
  properties: [
    { name: 'type', type: 'string', description: 'Effect type', required: true, enum: ['drop-shadow', 'inner-shadow', 'blur', 'background-blur'] },
    { name: 'visible', type: 'boolean', description: 'Whether effect is visible', required: false, default: true },
    { name: 'offsetX', type: 'number', description: 'Horizontal offset (shadows)', required: false },
    { name: 'offsetY', type: 'number', description: 'Vertical offset (shadows)', required: false },
    { name: 'blur', type: 'number', description: 'Blur radius', required: false },
    { name: 'spread', type: 'number', description: 'Spread radius (shadows)', required: false },
    { name: 'color', type: 'RGBA', description: 'Effect color (shadows)', required: false },
  ],
};

// Node types
export const BASE_NODE_SCHEMA: TypeSchema = {
  name: 'BaseNode',
  description: 'Common properties for all scene graph nodes',
  properties: [
    { name: 'id', type: 'string', description: 'Unique node identifier', required: true },
    { name: 'type', type: 'NodeType', description: 'Node type', required: true },
    { name: 'name', type: 'string', description: 'User-visible name', required: true },
    { name: 'x', type: 'number', description: 'X position', required: true },
    { name: 'y', type: 'number', description: 'Y position', required: true },
    { name: 'width', type: 'number', description: 'Width in pixels', required: true },
    { name: 'height', type: 'number', description: 'Height in pixels', required: true },
    { name: 'rotation', type: 'number', description: 'Rotation in degrees', required: false, default: 0 },
    { name: 'visible', type: 'boolean', description: 'Visibility state', required: false, default: true },
    { name: 'locked', type: 'boolean', description: 'Lock state', required: false, default: false },
    { name: 'opacity', type: 'number', description: 'Opacity (0-1)', required: false, default: 1 },
    { name: 'parentId', type: 'string | null', description: 'Parent node ID', required: false },
    { name: 'children', type: 'string[]', description: 'Child node IDs', required: false },
  ],
};

export const NODE_TYPE_SCHEMA: TypeSchema = {
  name: 'NodeType',
  description: 'Types of nodes in the scene graph',
  properties: [
    { name: 'value', type: 'string', description: 'Node type identifier', required: true,
      enum: ['FRAME', 'GROUP', 'RECTANGLE', 'ELLIPSE', 'LINE', 'TEXT', 'IMAGE', 'VECTOR', 'COMPONENT', 'INSTANCE'] },
  ],
};

// Result types
export const TOOL_RESULT_SCHEMA: TypeSchema = {
  name: 'ToolResult',
  description: 'Standard result returned by all tools',
  properties: [
    { name: 'success', type: 'boolean', description: 'Whether operation succeeded', required: true },
    { name: 'message', type: 'string', description: 'Human-readable result description', required: false },
    { name: 'data', type: 'any', description: 'Tool-specific return data', required: false },
    { name: 'error', type: 'string', description: 'Error message if failed', required: false },
    { name: 'affectedIds', type: 'string[]', description: 'IDs of created/modified objects', required: false },
  ],
};

// Viewport
export const VIEWPORT_SCHEMA: TypeSchema = {
  name: 'Viewport',
  description: 'Current view state of the canvas',
  properties: [
    { name: 'x', type: 'number', description: 'Left edge of visible area', required: true },
    { name: 'y', type: 'number', description: 'Top edge of visible area', required: true },
    { name: 'width', type: 'number', description: 'Visible width in pixels', required: true },
    { name: 'height', type: 'number', description: 'Visible height in pixels', required: true },
    { name: 'zoom', type: 'number', description: 'Zoom level (1.0 = 100%)', required: true },
  ],
};

// Registry of all schemas
export const TYPE_SCHEMA_REGISTRY: TypeSchema[] = [
  POINT_SCHEMA,
  BOUNDS_SCHEMA,
  TRANSFORM_SCHEMA,
  COLOR_SCHEMA,
  RGBA_SCHEMA,
  FILL_SCHEMA,
  STROKE_SCHEMA,
  EFFECT_SCHEMA,
  BASE_NODE_SCHEMA,
  NODE_TYPE_SCHEMA,
  TOOL_RESULT_SCHEMA,
  VIEWPORT_SCHEMA,
];

/**
 * Generate markdown documentation for all type schemas
 */
export function generateTypeSchemaDocumentation(): string {
  let doc = '## Type Schemas\n\n';
  doc += 'These are the data structures used by tools and returned in results.\n\n';

  for (const schema of TYPE_SCHEMA_REGISTRY) {
    doc += `### ${schema.name}\n`;
    doc += `${schema.description}\n\n`;
    doc += '| Property | Type | Required | Description |\n';
    doc += '|----------|------|----------|-------------|\n';

    for (const prop of schema.properties) {
      const req = prop.required ? 'Yes' : `No (default: ${prop.default ?? 'undefined'})`;
      const enumStr = prop.enum ? ` (${prop.enum.join(', ')})` : '';
      doc += `| ${prop.name} | ${prop.type}${enumStr} | ${req} | ${prop.description} |\n`;
    }

    if (schema.examples && schema.examples.length > 0) {
      doc += '\n**Examples:**\n';
      for (const ex of schema.examples) {
        doc += `- \`${ex}\`\n`;
      }
    }
    doc += '\n';
  }

  return doc;
}

/**
 * Generate concise type schema summary for system prompt
 */
export function generateTypeSchemaPrompt(): string {
  let prompt = '## Data Types\n\n';

  // Coordinate system note
  prompt += '**Coordinate System**: Origin (0,0) is top-left. X increases right, Y increases down.\n\n';

  // Concise type definitions
  prompt += '**Core Types:**\n';
  prompt += '- `Point`: { x: number, y: number }\n';
  prompt += '- `Bounds`: { x, y, width, height }\n';
  prompt += '- `RGBA`: { r, g, b, a } - values 0-1\n';
  prompt += '- `Color`: hex string "#RRGGBB", "rgb(...)", "hsl(...)", or color name\n\n';

  prompt += '**Node Types**: FRAME, GROUP, RECTANGLE, ELLIPSE, LINE, TEXT, IMAGE, VECTOR, COMPONENT, INSTANCE\n\n';

  prompt += '**ToolResult**: { success: boolean, message?: string, data?: any, error?: string, affectedIds?: string[] }\n\n';

  return prompt;
}
```

### 1.2 Tool Documentation Generator

**File**: `src/ai/schemas/tool-documentation.ts`

```typescript
/**
 * Tool Documentation Generator
 *
 * Generates comprehensive documentation for AI model consumption.
 * Model-agnostic format that can be adapted by providers.
 */

import { getToolDefinition, getAllToolNames } from '../tools/tool-registry';

export interface ToolDocumentation {
  name: string;
  category: string;
  description: string;
  parameters: ParameterDoc[];
  returns: ReturnDoc;
  examples: ExampleDoc[];
  relatedTools: string[];
}

export interface ParameterDoc {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: any;
  constraints?: string;
}

export interface ReturnDoc {
  description: string;
  dataFields: { name: string; type: string; description: string }[];
}

export interface ExampleDoc {
  description: string;
  input: Record<string, any>;
  expectedResult: string;
}

/**
 * Priority 1: Core 30 tools for initial implementation
 */
export const PRIORITY_1_TOOLS = [
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
  'move_by',
  'scale',
  'align_left', // represents all align tools

  // Style (6)
  'set_fill_color',
  'set_stroke_color',
  'set_stroke_width',
  'set_opacity',
  'set_corner_radius',
  'add_drop_shadow',

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
 * Priority 2: Extended tools
 */
export const PRIORITY_2_TOOLS = [
  // Additional selection
  'select_children',
  'select_parent',
  'invert_selection',

  // Additional creation
  'create_polygon',
  'create_star',
  'create_arrow',

  // Additional transform
  'flip_horizontal',
  'flip_vertical',
  'distribute_horizontal',
  'distribute_vertical',

  // Additional style
  'set_fill_gradient',
  'add_blur',
  'set_blend_mode',
  'remove_fill',
  'remove_stroke',

  // Typography
  'set_font_family',
  'set_font_size',
  'set_font_weight',
  'set_text_alignment',
  'set_line_height',

  // Layer operations
  'duplicate_layer',
  'reorder_layers',
  'lock_layer',
  'unlock_layer',
  'hide_layer',
  'show_layer',
];

/**
 * Priority 3: Advanced tools
 */
export const PRIORITY_3_TOOLS = [
  // Auto-layout
  'add_auto_layout',
  'set_layout_direction',
  'set_layout_gap',
  'set_layout_padding',

  // Components
  'create_component',
  'create_instance',
  'detach_instance',

  // Styles
  'create_color_style',
  'create_text_style',
  'apply_style',

  // Export
  'export_png',
  'export_svg',

  // Code generation
  'generate_css',
  'generate_swift',
  'generate_android',
  'generate_react',
];

/**
 * Generate documentation for a single tool
 */
export function generateToolDocumentation(toolName: string): ToolDocumentation | null {
  const def = getToolDefinition(toolName);
  if (!def) return null;

  const params: ParameterDoc[] = [];

  if (def.parameters?.properties) {
    for (const [name, schema] of Object.entries(def.parameters.properties)) {
      const s = schema as any;
      params.push({
        name,
        type: s.type || 'any',
        required: def.parameters.required?.includes(name) ?? false,
        description: s.description || '',
        default: s.default,
        constraints: buildConstraints(s),
      });
    }
  }

  return {
    name: def.name,
    category: def.category || 'uncategorized',
    description: def.description,
    parameters: params,
    returns: {
      description: def.returns?.description || 'ToolResult',
      dataFields: def.returns?.properties || [],
    },
    examples: def.examples || [],
    relatedTools: findRelatedTools(def.name, def.category),
  };
}

function buildConstraints(schema: any): string | undefined {
  const constraints: string[] = [];
  if (schema.minimum !== undefined) constraints.push(`min: ${schema.minimum}`);
  if (schema.maximum !== undefined) constraints.push(`max: ${schema.maximum}`);
  if (schema.enum) constraints.push(`values: ${schema.enum.join(', ')}`);
  return constraints.length > 0 ? constraints.join(', ') : undefined;
}

function findRelatedTools(name: string, category?: string): string[] {
  if (!category) return [];
  const allTools = getAllToolNames();
  return allTools
    .filter(t => {
      const def = getToolDefinition(t);
      return def?.category === category && t !== name;
    })
    .slice(0, 5);
}

/**
 * Generate markdown documentation for tools
 */
export function generateToolMarkdown(tools: string[]): string {
  let doc = '';

  for (const toolName of tools) {
    const toolDoc = generateToolDocumentation(toolName);
    if (!toolDoc) continue;

    doc += `### ${toolDoc.name}\n`;
    doc += `**Category**: ${toolDoc.category}\n\n`;
    doc += `${toolDoc.description}\n\n`;

    if (toolDoc.parameters.length > 0) {
      doc += '**Parameters:**\n';
      doc += '| Name | Type | Required | Description |\n';
      doc += '|------|------|----------|-------------|\n';
      for (const p of toolDoc.parameters) {
        const req = p.required ? 'Yes' : `No${p.default !== undefined ? ` (${p.default})` : ''}`;
        doc += `| ${p.name} | ${p.type} | ${req} | ${p.description} |\n`;
      }
      doc += '\n';
    }

    doc += '**Returns**: ToolResult with `success`, `message`, and relevant `data`\n\n';
    doc += '---\n\n';
  }

  return doc;
}

/**
 * Generate concise tool prompt for system message
 */
export function generateToolPrompt(tools: string[]): string {
  let prompt = '## Available Tools\n\n';

  // Group by category
  const byCategory: Record<string, string[]> = {};
  for (const name of tools) {
    const def = getToolDefinition(name);
    const cat = def?.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(name);
  }

  for (const [category, toolNames] of Object.entries(byCategory)) {
    prompt += `**${category}**: ${toolNames.join(', ')}\n`;
  }

  return prompt;
}
```

---

## Phase 2: System Prompt Generator

### 2.1 Model-Agnostic Prompt Builder

**File**: `src/ai/prompts/system-prompt-builder.ts`

```typescript
/**
 * System Prompt Builder
 *
 * Generates comprehensive system prompts for AI models.
 * Model-agnostic design that works with any provider.
 */

import { generateTypeSchemaPrompt } from '../schemas/type-schemas';
import { generateToolPrompt, PRIORITY_1_TOOLS } from '../schemas/tool-documentation';
import type { DesignContext } from '../context/context-builder';

export interface SystemPromptOptions {
  /** Include type schemas in prompt */
  includeTypeSchemas: boolean;
  /** Include tool summaries */
  includeToolSummary: boolean;
  /** Include coordinate system explanation */
  includeCoordinateSystem: boolean;
  /** Include best practices */
  includeBestPractices: boolean;
  /** Custom instructions to append */
  customInstructions?: string;
  /** Application context (designlibre, cadlibre, camlibre) */
  application: 'designlibre' | 'cadlibre' | 'camlibre';
}

const DEFAULT_OPTIONS: SystemPromptOptions = {
  includeTypeSchemas: true,
  includeToolSummary: true,
  includeCoordinateSystem: true,
  includeBestPractices: true,
  application: 'designlibre',
};

/**
 * Application-specific domain knowledge
 */
const APPLICATION_DOMAINS: Record<string, string> = {
  designlibre: `You are an AI design assistant for DesignLibre, a professional 2D vector graphics editor.
You help users create, modify, and organize designs through natural language commands.
You can create shapes, apply styles, manage layers, and control the viewport.`,

  cadlibre: `You are an AI CAD assistant for CADLibre, a professional 2D and 3D CAD application.
You help users create technical drawings, 3D models, and engineering designs.
You can create geometry, apply constraints, manage layers, and control views.`,

  camlibre: `You are an AI CAM assistant for CAMLibre, an additive and subtractive manufacturing application.
You help users create toolpaths, set up operations, and optimize manufacturing processes.
You can define operations, select tools, configure parameters, and simulate processes.`,
};

/**
 * Coordinate system documentation
 */
const COORDINATE_SYSTEM = `## Coordinate System

- **Origin**: Top-left corner of the canvas at (0, 0)
- **X-axis**: Positive direction is RIGHT
- **Y-axis**: Positive direction is DOWN
- **Units**: Pixels (px) by default
- **Rotation**: Clockwise in degrees, pivot at object center

Example positions:
- (0, 0) = top-left corner
- (100, 0) = 100px to the right of origin
- (0, 100) = 100px below origin
- (100, 100) = diagonal from origin
`;

/**
 * Best practices for AI
 */
const BEST_PRACTICES = `## Best Practices

1. **Be precise with coordinates** - Position objects at exact pixel values
2. **Use reasonable sizes** - Typical objects are 50-500px, not 1px or 10000px
3. **Name objects descriptively** - "Header Background" not "Rectangle 1"
4. **Group related objects** - Keep logical elements together
5. **Work incrementally** - Create, position, then style
6. **Confirm actions** - Describe what you did after tool execution
7. **Handle errors gracefully** - If a tool fails, explain and suggest alternatives

When creating designs:
1. Plan the layout structure first
2. Create container frames/groups
3. Add individual elements
4. Apply styling (colors, strokes, effects)
5. Fine-tune positioning and alignment
`;

/**
 * Build the complete system prompt
 */
export function buildSystemPrompt(
  options: Partial<SystemPromptOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sections: string[] = [];

  // 1. Application domain
  sections.push(APPLICATION_DOMAINS[opts.application] || APPLICATION_DOMAINS.designlibre);

  // 2. Coordinate system
  if (opts.includeCoordinateSystem) {
    sections.push(COORDINATE_SYSTEM);
  }

  // 3. Type schemas
  if (opts.includeTypeSchemas) {
    sections.push(generateTypeSchemaPrompt());
  }

  // 4. Tool summary
  if (opts.includeToolSummary) {
    sections.push(generateToolPrompt(PRIORITY_1_TOOLS));
  }

  // 5. Best practices
  if (opts.includeBestPractices) {
    sections.push(BEST_PRACTICES);
  }

  // 6. Custom instructions
  if (opts.customInstructions) {
    sections.push(`## Custom Instructions\n\n${opts.customInstructions}`);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Build context prompt for current state
 */
export function buildContextPrompt(context: DesignContext): string {
  const parts: string[] = ['## Current Context'];

  // Selection
  if (context.selection.ids.length === 0) {
    parts.push('**Selection**: Nothing selected');
  } else {
    parts.push(`**Selection**: ${context.selection.ids.length} object(s)`);
    for (const obj of context.selection.objects.slice(0, 5)) {
      parts.push(`  - ${obj.type} "${obj.name}" at (${obj.x}, ${obj.y})`);
    }
    if (context.selection.objects.length > 5) {
      parts.push(`  - ... and ${context.selection.objects.length - 5} more`);
    }
  }

  // Viewport
  parts.push(`**Viewport**: (${context.viewport.x.toFixed(0)}, ${context.viewport.y.toFixed(0)}) at ${(context.viewport.zoom * 100).toFixed(0)}% zoom`);
  parts.push(`**Visible area**: ${context.viewport.width.toFixed(0)} × ${context.viewport.height.toFixed(0)} px`);

  // Layers
  if (context.layers.length > 0) {
    parts.push(`**Layers**: ${context.layers.length}`);
    for (const layer of context.layers.slice(0, 5)) {
      const active = layer.id === context.activeLayerId ? ' [ACTIVE]' : '';
      parts.push(`  - ${layer.name} (${layer.objectCount} objects)${active}`);
    }
  }

  // Recent operations
  if (context.recentlyCreated && context.recentlyCreated.length > 0) {
    parts.push(`**Recently created**: ${context.recentlyCreated.slice(0, 5).join(', ')}`);
  }

  return parts.join('\n');
}
```

---

## Phase 3: Provider Abstraction Layer

### 3.1 Universal Tool Format Converter

**File**: `src/ai/providers/tool-format-converter.ts`

```typescript
/**
 * Tool Format Converter
 *
 * Converts tool definitions to provider-specific formats.
 * Ensures model-agnostic tool definitions work with all providers.
 */

import type { ToolDefinition } from '../tools/tool-registry';

/**
 * Anthropic tool format
 */
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * OpenAI tool format
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

/**
 * Ollama tool format (similar to OpenAI)
 */
export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

/**
 * Convert to Anthropic format
 */
export function toAnthropicFormat(tool: ToolDefinition): AnthropicTool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: tool.parameters?.properties || {},
      required: tool.parameters?.required || [],
    },
  };
}

/**
 * Convert to OpenAI format
 */
export function toOpenAIFormat(tool: ToolDefinition): OpenAITool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters?.properties || {},
        required: tool.parameters?.required || [],
      },
    },
  };
}

/**
 * Convert to Ollama format
 */
export function toOllamaFormat(tool: ToolDefinition): OllamaTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters?.properties || {},
        required: tool.parameters?.required || [],
      },
    },
  };
}

/**
 * Convert tools for models without native tool support
 * Returns a structured prompt instead
 */
export function toPromptFormat(tools: ToolDefinition[]): string {
  let prompt = '## Available Commands\n\n';
  prompt += 'You can execute these commands by responding with JSON:\n\n';
  prompt += '```json\n';
  prompt += '{\n';
  prompt += '  "thinking": "Your analysis of what to do",\n';
  prompt += '  "commands": [\n';
  prompt += '    { "tool": "tool_name", "args": { ... } }\n';
  prompt += '  ],\n';
  prompt += '  "response": "What to tell the user"\n';
  prompt += '}\n';
  prompt += '```\n\n';

  prompt += '### Command Reference\n\n';

  for (const tool of tools) {
    prompt += `**${tool.name}**\n`;
    prompt += `${tool.description.split('\n')[0]}\n`;

    if (tool.parameters?.properties) {
      const params = Object.entries(tool.parameters.properties)
        .map(([name, schema]: [string, any]) => {
          const req = tool.parameters?.required?.includes(name) ? '' : '?';
          return `${name}${req}: ${schema.type}`;
        })
        .join(', ');
      prompt += `Parameters: { ${params} }\n`;
    }
    prompt += '\n';
  }

  return prompt;
}
```

---

## Phase 4: Implementation Checklist

### Phase 4.1: Type Schema System
- [ ] Create `src/ai/schemas/type-schemas.ts`
- [ ] Define all core type schemas (Point, Bounds, RGBA, Fill, Stroke, Effect, etc.)
- [ ] Create `generateTypeSchemaDocumentation()` function
- [ ] Create `generateTypeSchemaPrompt()` function
- [ ] Add unit tests for schema generation

### Phase 4.2: Tool Documentation
- [ ] Create `src/ai/schemas/tool-documentation.ts`
- [ ] Define priority tool lists (P1: 30, P2: 30, P3: remaining)
- [ ] Create `generateToolDocumentation()` function
- [ ] Create `generateToolMarkdown()` function
- [ ] Create `generateToolPrompt()` function
- [ ] Document all 30 Priority 1 tools with examples

### Phase 4.3: System Prompt Builder
- [ ] Create `src/ai/prompts/system-prompt-builder.ts`
- [ ] Implement `buildSystemPrompt()` with options
- [ ] Implement `buildContextPrompt()`
- [ ] Add application-specific domains (DesignLibre, CADLibre, CAMLibre)
- [ ] Add coordinate system documentation
- [ ] Add best practices section

### Phase 4.4: Provider Abstraction
- [ ] Create `src/ai/providers/tool-format-converter.ts`
- [ ] Implement Anthropic format converter
- [ ] Implement OpenAI format converter
- [ ] Implement Ollama format converter
- [ ] Implement prompt-based format for models without tool support

### Phase 4.5: Integration
- [ ] Update `context-builder.ts` to use new system prompt builder
- [ ] Update providers to use tool format converters
- [ ] Add type schemas to system prompts
- [ ] Test with Claude, OpenAI, and Ollama
- [ ] Performance test prompt token usage

### Phase 4.6: Tool Implementation (Priority 1)
- [ ] Implement remaining Priority 1 tools in `tool-executor.ts`
  - [ ] `move_by`
  - [ ] `scale`
  - [ ] `rename_layer`
  - [ ] `add_drop_shadow`
  - [ ] (others as identified)
- [ ] Add proper error handling
- [ ] Return `affectedIds` in all tool results
- [ ] Add tool execution tests

---

## File Structure

```
src/ai/
├── schemas/
│   ├── type-schemas.ts          # NEW: Type definitions for AI
│   ├── tool-documentation.ts    # NEW: Tool documentation generator
│   └── index.ts                 # Export all schemas
├── prompts/
│   ├── system-prompt-builder.ts # NEW: System prompt generator
│   └── index.ts                 # Export prompt builders
├── providers/
│   ├── tool-format-converter.ts # NEW: Provider format conversion
│   ├── anthropic-provider.ts    # EXISTING: Update to use converter
│   ├── openai-provider.ts       # EXISTING: Update to use converter
│   ├── ollama-provider.ts       # EXISTING: Update to use converter
│   └── index.ts
├── tools/
│   ├── tool-registry.ts         # EXISTING: Tool definitions
│   ├── tool-executor.ts         # EXISTING: Implement remaining tools
│   ├── runtime-bridge.ts        # EXISTING: Bridge interface
│   └── designlibre-bridge.ts    # EXISTING: Implementation
├── context/
│   └── context-builder.ts       # EXISTING: Update to use new prompts
└── ai-controller.ts             # EXISTING: Main controller
```

---

## Success Metrics

1. **Type Schema Coverage**: 100% of core types documented
2. **Priority 1 Tool Implementation**: 30/30 tools working (100%)
3. **Provider Compatibility**: Works with Claude, OpenAI, Ollama, LlamaCPP
4. **Prompt Token Efficiency**: System prompt < 2000 tokens
5. **Tool Success Rate**: >95% successful executions
6. **Response Quality**: AI uses appropriate tools for requests

---

## Future Extensibility

### CADLibre Extensions
```typescript
// Additional type schemas for CAD
const CONSTRAINT_SCHEMA: TypeSchema = { ... };
const DIMENSION_SCHEMA: TypeSchema = { ... };
const ASSEMBLY_SCHEMA: TypeSchema = { ... };

// Additional tools
'create_sketch', 'add_constraint', 'extrude', 'revolve', 'boolean_union', ...
```

### CAMLibre Extensions
```typescript
// Additional type schemas for CAM
const TOOLPATH_SCHEMA: TypeSchema = { ... };
const OPERATION_SCHEMA: TypeSchema = { ... };
const MACHINE_SCHEMA: TypeSchema = { ... };

// Additional tools
'create_toolpath', 'add_operation', 'set_feeds_speeds', 'simulate', 'post_process', ...
```

The architecture is designed so that:
1. Core schemas are shared across all Libre applications
2. Application-specific schemas extend the base
3. Tool registry supports namespaced tools
4. Provider abstraction works identically for all applications
