/**
 * Type Schema Registry
 *
 * Provides structured documentation of all domain objects for AI model comprehension.
 * Model-agnostic format that works with Claude, OpenAI, Ollama, and LlamaCPP.
 *
 * This module is part of the AI priming system that will be extended for:
 * - DesignLibre (vector design)
 * - CADLibre (2D/3D CAD)
 * - CAMLibre (additive/subtractive CAM)
 */

/**
 * Property schema definition
 */
export interface PropertySchema {
  /** Property name */
  name: string;
  /** TypeScript-like type string */
  type: string;
  /** Human-readable description */
  description: string;
  /** Whether the property is required */
  required: boolean;
  /** Default value if not required */
  default?: unknown;
  /** Allowed values for enum types */
  enum?: string[];
  /** Nested properties for object types */
  nested?: PropertySchema[];
}

/**
 * Type schema definition
 */
export interface TypeSchema {
  /** Type name (e.g., "Point", "RGBA") */
  name: string;
  /** Human-readable description */
  description: string;
  /** Property definitions */
  properties: PropertySchema[];
  /** Example values */
  examples?: string[];
  /** Related types */
  relatedTypes?: string[];
}

// =============================================================================
// Core Geometric Types
// =============================================================================

export const POINT_SCHEMA: TypeSchema = {
  name: 'Point',
  description: 'A 2D coordinate in pixel space',
  properties: [
    { name: 'x', type: 'number', description: 'X coordinate in pixels', required: true },
    { name: 'y', type: 'number', description: 'Y coordinate in pixels', required: true },
  ],
  examples: [
    '{ x: 100, y: 200 }',
    '{ x: 0, y: 0 } // Origin (top-left)',
  ],
  relatedTypes: ['Bounds', 'Transform'],
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
  examples: [
    '{ x: 0, y: 0, width: 100, height: 50 }',
    '{ x: 50, y: 100, width: 200, height: 300 }',
  ],
  relatedTypes: ['Point', 'Transform'],
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
  examples: [
    '{ x: 100, y: 100, width: 200, height: 150, rotation: 0 }',
    '{ x: 50, y: 50, width: 100, height: 100, rotation: 45 } // 45 degree rotation',
  ],
  relatedTypes: ['Bounds', 'Point'],
};

// =============================================================================
// Color Types
// =============================================================================

export const COLOR_SCHEMA: TypeSchema = {
  name: 'Color',
  description: 'Color value in various string formats',
  properties: [
    { name: 'value', type: 'string', description: 'Color string in hex, rgb, hsl, or named format', required: true },
  ],
  examples: [
    '"#FF5500" // Hex RGB',
    '"#FF550080" // Hex RGBA (50% opacity)',
    '"rgb(255, 85, 0)" // RGB function',
    '"rgba(255, 85, 0, 0.5)" // RGBA function',
    '"hsl(20, 100%, 50%)" // HSL function',
    '"red", "blue", "transparent" // Named colors',
  ],
  relatedTypes: ['RGBA'],
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
  examples: [
    '{ r: 1, g: 0, b: 0, a: 1 } // Solid red',
    '{ r: 0, g: 0.5, b: 1, a: 0.5 } // Semi-transparent blue',
    '{ r: 0.2, g: 0.2, b: 0.2 } // Dark gray (a defaults to 1)',
  ],
  relatedTypes: ['Color', 'Fill', 'Stroke'],
};

export const GRADIENT_STOP_SCHEMA: TypeSchema = {
  name: 'GradientStop',
  description: 'A color stop in a gradient',
  properties: [
    { name: 'color', type: 'RGBA', description: 'Color at this stop', required: true },
    { name: 'position', type: 'number', description: 'Position along gradient (0-1)', required: true },
  ],
  examples: [
    '{ color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 }',
    '{ color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 }',
  ],
  relatedTypes: ['RGBA', 'Fill'],
};

// =============================================================================
// Style Types
// =============================================================================

export const FILL_SCHEMA: TypeSchema = {
  name: 'Fill',
  description: 'Fill style for shapes',
  properties: [
    {
      name: 'type',
      type: 'string',
      description: 'Fill type',
      required: true,
      enum: ['solid', 'linear', 'radial', 'image', 'none']
    },
    { name: 'color', type: 'RGBA', description: 'Solid fill color (for type: solid)', required: false },
    { name: 'visible', type: 'boolean', description: 'Whether fill is visible', required: false, default: true },
    { name: 'opacity', type: 'number', description: 'Fill opacity (0-1)', required: false, default: 1 },
    { name: 'gradientStops', type: 'GradientStop[]', description: 'Gradient color stops (for linear/radial)', required: false },
    { name: 'gradientAngle', type: 'number', description: 'Gradient angle in degrees (for linear)', required: false },
  ],
  examples: [
    '{ type: "solid", color: { r: 0, g: 0.5, b: 1, a: 1 } }',
    '{ type: "linear", gradientStops: [...], gradientAngle: 90 }',
    '{ type: "none" } // No fill (transparent)',
  ],
  relatedTypes: ['RGBA', 'GradientStop', 'Stroke'],
};

export const STROKE_SCHEMA: TypeSchema = {
  name: 'Stroke',
  description: 'Stroke/border style for shapes',
  properties: [
    { name: 'color', type: 'RGBA', description: 'Stroke color', required: true },
    { name: 'width', type: 'number', description: 'Stroke width in pixels', required: true },
    { name: 'visible', type: 'boolean', description: 'Whether stroke is visible', required: false, default: true },
    { name: 'dashArray', type: 'number[]', description: 'Dash pattern [dash, gap, ...]', required: false },
    {
      name: 'lineCap',
      type: 'string',
      description: 'Line end style',
      required: false,
      enum: ['butt', 'round', 'square'],
      default: 'butt'
    },
    {
      name: 'lineJoin',
      type: 'string',
      description: 'Line join style',
      required: false,
      enum: ['miter', 'round', 'bevel'],
      default: 'miter'
    },
    {
      name: 'strokeAlign',
      type: 'string',
      description: 'Stroke alignment relative to path',
      required: false,
      enum: ['center', 'inside', 'outside'],
      default: 'center'
    },
  ],
  examples: [
    '{ color: { r: 0, g: 0, b: 0, a: 1 }, width: 1 }',
    '{ color: { r: 1, g: 0, b: 0, a: 1 }, width: 2, dashArray: [5, 3] }',
  ],
  relatedTypes: ['RGBA', 'Fill'],
};

export const EFFECT_SCHEMA: TypeSchema = {
  name: 'Effect',
  description: 'Visual effect applied to objects',
  properties: [
    {
      name: 'type',
      type: 'string',
      description: 'Effect type',
      required: true,
      enum: ['drop-shadow', 'inner-shadow', 'blur', 'background-blur']
    },
    { name: 'visible', type: 'boolean', description: 'Whether effect is visible', required: false, default: true },
    { name: 'offsetX', type: 'number', description: 'Horizontal offset (shadows only)', required: false, default: 0 },
    { name: 'offsetY', type: 'number', description: 'Vertical offset (shadows only)', required: false, default: 4 },
    { name: 'blur', type: 'number', description: 'Blur radius in pixels', required: false, default: 4 },
    { name: 'spread', type: 'number', description: 'Spread radius (shadows only)', required: false, default: 0 },
    { name: 'color', type: 'RGBA', description: 'Effect color (shadows only)', required: false },
  ],
  examples: [
    '{ type: "drop-shadow", offsetX: 0, offsetY: 4, blur: 8, color: { r: 0, g: 0, b: 0, a: 0.25 } }',
    '{ type: "blur", blur: 10 }',
    '{ type: "inner-shadow", offsetX: 0, offsetY: 2, blur: 4, spread: 0 }',
  ],
  relatedTypes: ['RGBA'],
};

export const BLEND_MODE_SCHEMA: TypeSchema = {
  name: 'BlendMode',
  description: 'Layer blending mode',
  properties: [
    {
      name: 'value',
      type: 'string',
      description: 'Blend mode',
      required: true,
      enum: [
        'normal', 'multiply', 'screen', 'overlay',
        'darken', 'lighten', 'color-dodge', 'color-burn',
        'hard-light', 'soft-light', 'difference', 'exclusion',
        'hue', 'saturation', 'color', 'luminosity'
      ]
    },
  ],
  examples: [
    '"normal"',
    '"multiply"',
    '"overlay"',
  ],
};

// =============================================================================
// Node Types
// =============================================================================

export const NODE_TYPE_SCHEMA: TypeSchema = {
  name: 'NodeType',
  description: 'Types of nodes in the scene graph',
  properties: [
    {
      name: 'value',
      type: 'string',
      description: 'Node type identifier',
      required: true,
      enum: [
        'FRAME', 'GROUP', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR',
        'TEXT', 'IMAGE', 'VECTOR', 'COMPONENT', 'INSTANCE', 'SLICE', 'PAGE'
      ]
    },
  ],
  examples: [
    '"RECTANGLE" // Basic rectangle shape',
    '"FRAME" // Container with clip and background',
    '"TEXT" // Text layer',
    '"COMPONENT" // Reusable component definition',
    '"INSTANCE" // Instance of a component',
  ],
};

export const BASE_NODE_SCHEMA: TypeSchema = {
  name: 'BaseNode',
  description: 'Common properties for all scene graph nodes',
  properties: [
    { name: 'id', type: 'string', description: 'Unique node identifier (UUID)', required: true },
    { name: 'type', type: 'NodeType', description: 'Node type', required: true },
    { name: 'name', type: 'string', description: 'User-visible name', required: true },
    { name: 'x', type: 'number', description: 'X position relative to parent', required: true },
    { name: 'y', type: 'number', description: 'Y position relative to parent', required: true },
    { name: 'width', type: 'number', description: 'Width in pixels', required: true },
    { name: 'height', type: 'number', description: 'Height in pixels', required: true },
    { name: 'rotation', type: 'number', description: 'Rotation in degrees (clockwise)', required: false, default: 0 },
    { name: 'visible', type: 'boolean', description: 'Visibility state', required: false, default: true },
    { name: 'locked', type: 'boolean', description: 'Lock state (prevents editing)', required: false, default: false },
    { name: 'opacity', type: 'number', description: 'Layer opacity (0-1)', required: false, default: 1 },
    { name: 'parentId', type: 'string | null', description: 'Parent node ID (null for root)', required: false },
    { name: 'children', type: 'string[]', description: 'Child node IDs in z-order', required: false },
  ],
  relatedTypes: ['NodeType', 'Transform'],
};

export const TEXT_NODE_SCHEMA: TypeSchema = {
  name: 'TextNode',
  description: 'Text layer with typography properties (extends BaseNode)',
  properties: [
    { name: 'content', type: 'string', description: 'Text content', required: true },
    { name: 'fontFamily', type: 'string', description: 'Font family name', required: false, default: 'Inter' },
    { name: 'fontSize', type: 'number', description: 'Font size in pixels', required: false, default: 14 },
    {
      name: 'fontWeight',
      type: 'number',
      description: 'Font weight (100-900)',
      required: false,
      default: 400
    },
    {
      name: 'fontStyle',
      type: 'string',
      description: 'Font style',
      required: false,
      enum: ['normal', 'italic'],
      default: 'normal'
    },
    { name: 'lineHeight', type: 'number | "auto"', description: 'Line height in pixels or auto', required: false, default: 'auto' },
    { name: 'letterSpacing', type: 'number', description: 'Letter spacing in pixels', required: false, default: 0 },
    {
      name: 'textAlign',
      type: 'string',
      description: 'Horizontal text alignment',
      required: false,
      enum: ['left', 'center', 'right', 'justify'],
      default: 'left'
    },
    {
      name: 'verticalAlign',
      type: 'string',
      description: 'Vertical text alignment',
      required: false,
      enum: ['top', 'middle', 'bottom'],
      default: 'top'
    },
    {
      name: 'textDecoration',
      type: 'string',
      description: 'Text decoration',
      required: false,
      enum: ['none', 'underline', 'strikethrough'],
      default: 'none'
    },
    {
      name: 'textTransform',
      type: 'string',
      description: 'Text case transform',
      required: false,
      enum: ['none', 'uppercase', 'lowercase', 'capitalize'],
      default: 'none'
    },
  ],
  relatedTypes: ['BaseNode', 'Fill'],
};

export const FRAME_NODE_SCHEMA: TypeSchema = {
  name: 'FrameNode',
  description: 'Container frame with layout and clipping (extends BaseNode)',
  properties: [
    { name: 'clipsContent', type: 'boolean', description: 'Whether to clip children to bounds', required: false, default: true },
    { name: 'cornerRadius', type: 'number | number[]', description: 'Corner radius (single or per-corner)', required: false, default: 0 },
    { name: 'fills', type: 'Fill[]', description: 'Background fills', required: false },
    { name: 'strokes', type: 'Stroke[]', description: 'Border strokes', required: false },
    { name: 'effects', type: 'Effect[]', description: 'Visual effects', required: false },
    {
      name: 'layoutMode',
      type: 'string',
      description: 'Auto-layout direction',
      required: false,
      enum: ['none', 'horizontal', 'vertical'],
      default: 'none'
    },
    { name: 'layoutGap', type: 'number', description: 'Gap between auto-layout children', required: false, default: 0 },
    { name: 'paddingTop', type: 'number', description: 'Top padding', required: false, default: 0 },
    { name: 'paddingRight', type: 'number', description: 'Right padding', required: false, default: 0 },
    { name: 'paddingBottom', type: 'number', description: 'Bottom padding', required: false, default: 0 },
    { name: 'paddingLeft', type: 'number', description: 'Left padding', required: false, default: 0 },
    {
      name: 'primaryAxisAlign',
      type: 'string',
      description: 'Main axis alignment',
      required: false,
      enum: ['start', 'center', 'end', 'space-between'],
      default: 'start'
    },
    {
      name: 'counterAxisAlign',
      type: 'string',
      description: 'Cross axis alignment',
      required: false,
      enum: ['start', 'center', 'end', 'stretch'],
      default: 'start'
    },
  ],
  relatedTypes: ['BaseNode', 'Fill', 'Stroke', 'Effect'],
};

// =============================================================================
// Result Types
// =============================================================================

export const TOOL_RESULT_SCHEMA: TypeSchema = {
  name: 'ToolResult',
  description: 'Standard result returned by all AI tools',
  properties: [
    { name: 'success', type: 'boolean', description: 'Whether the operation succeeded', required: true },
    { name: 'message', type: 'string', description: 'Human-readable result description', required: false },
    { name: 'data', type: 'any', description: 'Tool-specific return data', required: false },
    { name: 'error', type: 'string', description: 'Error message if success is false', required: false },
    { name: 'affectedIds', type: 'string[]', description: 'IDs of created or modified objects', required: false },
  ],
  examples: [
    '{ success: true, message: "Created rectangle", affectedIds: ["node-123"] }',
    '{ success: false, error: "No selection" }',
    '{ success: true, data: { count: 5, selectedIds: [...] } }',
  ],
};

// =============================================================================
// Viewport Types
// =============================================================================

export const VIEWPORT_SCHEMA: TypeSchema = {
  name: 'Viewport',
  description: 'Current view state of the canvas',
  properties: [
    { name: 'x', type: 'number', description: 'Left edge X of visible area in canvas coords', required: true },
    { name: 'y', type: 'number', description: 'Top edge Y of visible area in canvas coords', required: true },
    { name: 'width', type: 'number', description: 'Visible width in screen pixels', required: true },
    { name: 'height', type: 'number', description: 'Visible height in screen pixels', required: true },
    { name: 'zoom', type: 'number', description: 'Zoom level (1.0 = 100%)', required: true },
  ],
  examples: [
    '{ x: 0, y: 0, width: 1920, height: 1080, zoom: 1 }',
    '{ x: -500, y: -300, width: 960, height: 540, zoom: 2 } // Zoomed to 200%',
  ],
};

// =============================================================================
// Alignment Types
// =============================================================================

export const ALIGNMENT_TYPE_SCHEMA: TypeSchema = {
  name: 'AlignmentType',
  description: 'Alignment options for positioning objects',
  properties: [
    {
      name: 'value',
      type: 'string',
      description: 'Alignment direction',
      required: true,
      enum: ['left', 'center_h', 'right', 'top', 'center_v', 'bottom']
    },
  ],
  examples: [
    '"left" // Align left edges',
    '"center_h" // Center horizontally',
    '"top" // Align top edges',
  ],
};

export const DISTRIBUTION_TYPE_SCHEMA: TypeSchema = {
  name: 'DistributionType',
  description: 'Distribution options for spacing objects',
  properties: [
    {
      name: 'value',
      type: 'string',
      description: 'Distribution direction',
      required: true,
      enum: ['horizontal', 'vertical']
    },
  ],
  examples: [
    '"horizontal" // Distribute with equal horizontal spacing',
    '"vertical" // Distribute with equal vertical spacing',
  ],
};

// =============================================================================
// Registry
// =============================================================================

/**
 * Registry of all type schemas
 */
export const TYPE_SCHEMA_REGISTRY: TypeSchema[] = [
  // Geometric
  POINT_SCHEMA,
  BOUNDS_SCHEMA,
  TRANSFORM_SCHEMA,
  // Color
  COLOR_SCHEMA,
  RGBA_SCHEMA,
  GRADIENT_STOP_SCHEMA,
  // Style
  FILL_SCHEMA,
  STROKE_SCHEMA,
  EFFECT_SCHEMA,
  BLEND_MODE_SCHEMA,
  // Nodes
  NODE_TYPE_SCHEMA,
  BASE_NODE_SCHEMA,
  TEXT_NODE_SCHEMA,
  FRAME_NODE_SCHEMA,
  // Results
  TOOL_RESULT_SCHEMA,
  // Viewport
  VIEWPORT_SCHEMA,
  // Alignment
  ALIGNMENT_TYPE_SCHEMA,
  DISTRIBUTION_TYPE_SCHEMA,
];

/**
 * Get a type schema by name
 */
export function getTypeSchema(name: string): TypeSchema | undefined {
  return TYPE_SCHEMA_REGISTRY.find(s => s.name === name);
}

/**
 * Get all type schema names
 */
export function getTypeSchemaNames(): string[] {
  return TYPE_SCHEMA_REGISTRY.map(s => s.name);
}

// =============================================================================
// Documentation Generators
// =============================================================================

/**
 * Generate markdown documentation for all type schemas
 */
export function generateTypeSchemaDocumentation(): string {
  let doc = '# Type Schemas\n\n';
  doc += 'These are the data structures used by AI tools and returned in results.\n\n';
  doc += '---\n\n';

  for (const schema of TYPE_SCHEMA_REGISTRY) {
    doc += `## ${schema.name}\n\n`;
    doc += `${schema.description}\n\n`;

    // Properties table
    doc += '### Properties\n\n';
    doc += '| Property | Type | Required | Default | Description |\n';
    doc += '|----------|------|----------|---------|-------------|\n';

    for (const prop of schema.properties) {
      const req = prop.required ? 'Yes' : 'No';
      const def = prop.default !== undefined ? `\`${JSON.stringify(prop.default)}\`` : '-';
      const typeStr = prop.enum ? `${prop.type} (${prop.enum.join(' \\| ')})` : prop.type;
      doc += `| \`${prop.name}\` | ${typeStr} | ${req} | ${def} | ${prop.description} |\n`;
    }

    // Examples
    if (schema.examples && schema.examples.length > 0) {
      doc += '\n### Examples\n\n';
      doc += '```typescript\n';
      for (const ex of schema.examples) {
        doc += `${ex}\n`;
      }
      doc += '```\n';
    }

    // Related types
    if (schema.relatedTypes && schema.relatedTypes.length > 0) {
      doc += `\n**Related**: ${schema.relatedTypes.join(', ')}\n`;
    }

    doc += '\n---\n\n';
  }

  return doc;
}

/**
 * Generate concise type schema summary for system prompts
 * Optimized for token efficiency while maintaining clarity
 */
export function generateTypeSchemaPrompt(): string {
  const lines: string[] = [
    '## Data Types',
    '',
    '**Coordinate System**: Origin (0,0) is top-left. X increases right, Y increases down. Units: pixels.',
    '',
    '**Core Types**:',
    '- `Point`: { x: number, y: number }',
    '- `Bounds`: { x, y, width, height }',
    '- `RGBA`: { r, g, b, a } - all values 0-1',
    '- `Color`: hex "#RRGGBB", "rgb(...)", "hsl(...)", or color name',
    '',
    '**Style Types**:',
    '- `Fill`: { type: "solid"|"linear"|"radial"|"none", color?: RGBA, visible?: bool }',
    '- `Stroke`: { color: RGBA, width: number, dashArray?: number[], lineCap?: "butt"|"round"|"square" }',
    '- `Effect`: { type: "drop-shadow"|"blur", offsetX?, offsetY?, blur?, color? }',
    '',
    '**Node Types**: FRAME, GROUP, RECTANGLE, ELLIPSE, LINE, TEXT, IMAGE, VECTOR, COMPONENT, INSTANCE',
    '',
    '**BaseNode Properties**: id, type, name, x, y, width, height, rotation?, visible?, locked?, opacity?',
    '',
    '**ToolResult**: { success: boolean, message?: string, data?: any, error?: string, affectedIds?: string[] }',
    '',
  ];

  return lines.join('\n');
}

/**
 * Generate a compact JSON schema representation of a type
 * Useful for provider-specific formats
 */
export function typeSchemaToJSONSchema(schema: TypeSchema): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const prop of schema.properties) {
    const propSchema: Record<string, unknown> = {
      type: prop.type.includes('|') ? 'string' : mapTypeToJSONType(prop.type),
      description: prop.description,
    };

    if (prop.enum) {
      propSchema['enum'] = prop.enum;
    }

    if (prop.default !== undefined) {
      propSchema['default'] = prop.default;
    }

    properties[prop.name] = propSchema;

    if (prop.required) {
      required.push(prop.name);
    }
  }

  return {
    type: 'object',
    description: schema.description,
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

/**
 * Map TypeScript-like type strings to JSON Schema types
 */
function mapTypeToJSONType(type: string): string {
  const typeMap: Record<string, string> = {
    'number': 'number',
    'string': 'string',
    'boolean': 'boolean',
    'any': 'object',
    'null': 'null',
  };

  // Handle array types
  if (type.endsWith('[]')) {
    return 'array';
  }

  // Handle known types
  const baseType = type.split(' ')[0] ?? type;
  return typeMap[baseType] ?? 'object';
}
