/**
 * Tool Schema Registry
 *
 * Manages tool schemas with support for aliases, fuzzy matching,
 * and canonical name resolution.
 */

import type { ToolSchema, JSONSchemaProperty } from './types';
import { TOOL_ALIASES, getCanonicalToolName } from './config';

// =============================================================================
// Types
// =============================================================================

export interface RegisteredTool {
  schema: ToolSchema;
  aliases: string[];
  registeredAt: number;
}

export interface RegistryStats {
  toolCount: number;
  aliasCount: number;
  totalMappings: number;
}

// =============================================================================
// Tool Schema Registry
// =============================================================================

/**
 * Registry for tool schemas with alias and fuzzy matching support
 */
export class ToolSchemaRegistry {
  private schemas: Map<string, ToolSchema> = new Map();
  private customAliases: Map<string, string> = new Map();
  private registrationOrder: string[] = [];

  /**
   * Register a tool schema
   */
  register(schema: ToolSchema): void {
    const name = schema.name.toLowerCase();
    this.schemas.set(name, schema);

    if (!this.registrationOrder.includes(name)) {
      this.registrationOrder.push(name);
    }
  }

  /**
   * Register multiple tool schemas at once
   */
  registerAll(schemas: ToolSchema[]): void {
    for (const schema of schemas) {
      this.register(schema);
    }
  }

  /**
   * Get a tool schema by name (direct or alias)
   */
  get(toolName: string): ToolSchema | null {
    const normalizedName = toolName.toLowerCase();

    // Direct match
    const direct = this.schemas.get(normalizedName);
    if (direct) {
      return direct;
    }

    // Custom alias match
    const customCanonical = this.customAliases.get(normalizedName);
    if (customCanonical) {
      return this.schemas.get(customCanonical) || null;
    }

    // Built-in alias match
    const canonical = getCanonicalToolName(normalizedName);
    if (canonical && canonical !== normalizedName) {
      return this.schemas.get(canonical) || null;
    }

    return null;
  }

  /**
   * Check if a tool exists (by name or alias)
   */
  has(toolName: string): boolean {
    return this.get(toolName) !== null;
  }

  /**
   * Add a custom alias for a tool
   */
  addAlias(alias: string, canonicalName: string): void {
    this.customAliases.set(alias.toLowerCase(), canonicalName.toLowerCase());
  }

  /**
   * Remove a custom alias
   */
  removeAlias(alias: string): void {
    this.customAliases.delete(alias.toLowerCase());
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get all registered schemas
   */
  getAllSchemas(): ToolSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get all aliases for a tool
   */
  getAliases(toolName: string): string[] {
    const normalizedName = toolName.toLowerCase();
    const aliases: string[] = [];

    // Get built-in aliases
    const builtInAliases = TOOL_ALIASES[normalizedName];
    if (builtInAliases) {
      aliases.push(...builtInAliases);
    }

    // Get custom aliases
    for (const [alias, canonical] of this.customAliases) {
      if (canonical === normalizedName) {
        aliases.push(alias);
      }
    }

    return aliases;
  }

  /**
   * Resolve a tool name to its canonical form
   */
  resolveCanonical(toolName: string): string {
    const normalizedName = toolName.toLowerCase();

    // Check custom aliases first
    const customCanonical = this.customAliases.get(normalizedName);
    if (customCanonical && this.schemas.has(customCanonical)) {
      return customCanonical;
    }

    // Check built-in aliases
    const canonical = getCanonicalToolName(normalizedName);
    if (canonical && this.schemas.has(canonical)) {
      return canonical;
    }

    // Return as-is if not found
    return normalizedName;
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    let aliasCount = this.customAliases.size;

    // Count built-in aliases for registered tools
    for (const toolName of this.schemas.keys()) {
      const builtInAliases = TOOL_ALIASES[toolName];
      if (builtInAliases) {
        aliasCount += builtInAliases.length;
      }
    }

    return {
      toolCount: this.schemas.size,
      aliasCount,
      totalMappings: this.schemas.size + aliasCount,
    };
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.schemas.clear();
    this.customAliases.clear();
    this.registrationOrder = [];
  }

  /**
   * Create a copy of this registry
   */
  clone(): ToolSchemaRegistry {
    const clone = new ToolSchemaRegistry();
    for (const schema of this.schemas.values()) {
      clone.register(schema);
    }
    for (const [alias, canonical] of this.customAliases) {
      clone.addAlias(alias, canonical);
    }
    return clone;
  }
}

// =============================================================================
// Schema Builder Helpers
// =============================================================================

/**
 * Create a simple tool schema
 */
export function createToolSchema(
  name: string,
  description: string,
  properties: Record<string, JSONSchemaProperty>,
  required: string[] = []
): ToolSchema {
  return {
    id: `tool_${name}`,
    name,
    description,
    parameters: {
      type: 'object',
      properties,
      required,
    },
  };
}

/**
 * Create a number parameter definition
 */
export function numberParam(
  description: string,
  options: { minimum?: number; maximum?: number; default?: number } = {}
): JSONSchemaProperty {
  return {
    type: 'number',
    description,
    ...options,
  };
}

/**
 * Create a string parameter definition
 */
export function stringParam(
  description: string,
  options: { enum?: string[]; default?: string; pattern?: string } = {}
): JSONSchemaProperty {
  return {
    type: 'string',
    description,
    ...options,
  };
}

/**
 * Create a boolean parameter definition
 */
export function booleanParam(
  description: string,
  options: { default?: boolean } = {}
): JSONSchemaProperty {
  return {
    type: 'boolean',
    description,
    ...options,
  };
}

/**
 * Create an array parameter definition
 */
export function arrayParam(
  description: string,
  itemType: JSONSchemaProperty,
  options: { minItems?: number; maxItems?: number } = {}
): JSONSchemaProperty {
  return {
    type: 'array',
    description,
    items: itemType,
    ...options,
  };
}

/**
 * Create an object parameter definition
 */
export function objectParam(
  description: string,
  properties: Record<string, JSONSchemaProperty>,
  required: string[] = []
): JSONSchemaProperty {
  return {
    type: 'object',
    description,
    properties,
    required,
  };
}

// =============================================================================
// Default Registry Factory
// =============================================================================

/**
 * Create a registry with default DesignLibre tool schemas
 */
export function createDefaultRegistry(): ToolSchemaRegistry {
  const registry = new ToolSchemaRegistry();

  // Shape creation tools
  registry.register(createToolSchema(
    'create_rectangle',
    'Create a rectangle at the specified position with given dimensions',
    {
      x: numberParam('X position', { default: 0 }),
      y: numberParam('Y position', { default: 0 }),
      width: numberParam('Width', { minimum: 1, default: 100 }),
      height: numberParam('Height', { minimum: 1, default: 100 }),
      fill: stringParam('Fill color'),
      cornerRadius: numberParam('Corner radius', { minimum: 0, default: 0 }),
    },
    ['x', 'y', 'width', 'height']
  ));

  registry.register(createToolSchema(
    'create_ellipse',
    'Create an ellipse (or circle) at the specified position',
    {
      x: numberParam('X position', { default: 0 }),
      y: numberParam('Y position', { default: 0 }),
      width: numberParam('Width', { minimum: 1, default: 100 }),
      height: numberParam('Height', { minimum: 1, default: 100 }),
      fill: stringParam('Fill color'),
    },
    ['x', 'y', 'width', 'height']
  ));

  registry.register(createToolSchema(
    'create_text',
    'Create a text element',
    {
      x: numberParam('X position', { default: 0 }),
      y: numberParam('Y position', { default: 0 }),
      content: stringParam('Text content'),
      fontSize: numberParam('Font size', { minimum: 1, default: 16 }),
      fontFamily: stringParam('Font family', { default: 'Inter' }),
      fill: stringParam('Text color'),
    },
    ['content']
  ));

  registry.register(createToolSchema(
    'create_frame',
    'Create a frame (container)',
    {
      x: numberParam('X position', { default: 0 }),
      y: numberParam('Y position', { default: 0 }),
      width: numberParam('Width', { minimum: 1, default: 200 }),
      height: numberParam('Height', { minimum: 1, default: 200 }),
      fill: stringParam('Background color'),
      name: stringParam('Frame name'),
    },
    ['x', 'y', 'width', 'height']
  ));

  registry.register(createToolSchema(
    'create_line',
    'Create a line between two points',
    {
      x1: numberParam('Start X position'),
      y1: numberParam('Start Y position'),
      x2: numberParam('End X position'),
      y2: numberParam('End Y position'),
      stroke: stringParam('Stroke color'),
      strokeWidth: numberParam('Stroke width', { minimum: 0.1, default: 1 }),
    },
    ['x1', 'y1', 'x2', 'y2']
  ));

  // Style tools
  registry.register(createToolSchema(
    'set_fill_color',
    'Set the fill color of selected elements',
    {
      color: stringParam('Fill color (hex, rgb, or named color)'),
    },
    ['color']
  ));

  registry.register(createToolSchema(
    'set_stroke_color',
    'Set the stroke color of selected elements',
    {
      color: stringParam('Stroke color'),
      width: numberParam('Stroke width', { minimum: 0 }),
    },
    ['color']
  ));

  registry.register(createToolSchema(
    'set_corner_radius',
    'Set corner radius on selected elements',
    {
      radius: numberParam('Corner radius', { minimum: 0 }),
    },
    ['radius']
  ));

  registry.register(createToolSchema(
    'add_drop_shadow',
    'Add a drop shadow effect to selected elements',
    {
      offsetX: numberParam('Shadow X offset', { default: 0 }),
      offsetY: numberParam('Shadow Y offset', { default: 4 }),
      blur: numberParam('Shadow blur radius', { minimum: 0, default: 8 }),
      spread: numberParam('Shadow spread', { default: 0 }),
      color: stringParam('Shadow color', { default: 'rgba(0,0,0,0.25)' }),
    }
  ));

  // Selection tools
  registry.register(createToolSchema(
    'select_all',
    'Select all elements on the canvas',
    {}
  ));

  registry.register(createToolSchema(
    'select_none',
    'Clear the current selection',
    {}
  ));

  registry.register(createToolSchema(
    'select_by_name',
    'Select elements by name',
    {
      name: stringParam('Element name to select'),
    },
    ['name']
  ));

  // Transform tools
  registry.register(createToolSchema(
    'move',
    'Move selected elements',
    {
      x: numberParam('X offset to move'),
      y: numberParam('Y offset to move'),
    },
    ['x', 'y']
  ));

  registry.register(createToolSchema(
    'resize',
    'Resize selected elements',
    {
      width: numberParam('New width', { minimum: 1 }),
      height: numberParam('New height', { minimum: 1 }),
    }
  ));

  registry.register(createToolSchema(
    'rotate',
    'Rotate selected elements',
    {
      angle: numberParam('Rotation angle in degrees'),
    },
    ['angle']
  ));

  registry.register(createToolSchema(
    'duplicate',
    'Duplicate selected elements',
    {
      offsetX: numberParam('X offset for duplicate', { default: 20 }),
      offsetY: numberParam('Y offset for duplicate', { default: 20 }),
    }
  ));

  registry.register(createToolSchema(
    'delete',
    'Delete selected elements',
    {}
  ));

  // Arrangement tools
  registry.register(createToolSchema(
    'bring_to_front',
    'Bring selected elements to front',
    {}
  ));

  registry.register(createToolSchema(
    'send_to_back',
    'Send selected elements to back',
    {}
  ));

  registry.register(createToolSchema(
    'group',
    'Group selected elements',
    {}
  ));

  registry.register(createToolSchema(
    'ungroup',
    'Ungroup selected group',
    {}
  ));

  // Alignment tools
  registry.register(createToolSchema(
    'align',
    'Align selected elements',
    {
      alignment: stringParam('Alignment direction', {
        enum: ['left', 'center', 'right', 'top', 'middle', 'bottom'],
      }),
    },
    ['alignment']
  ));

  registry.register(createToolSchema(
    'distribute',
    'Distribute selected elements evenly',
    {
      direction: stringParam('Distribution direction', {
        enum: ['horizontal', 'vertical'],
      }),
    },
    ['direction']
  ));

  return registry;
}

// =============================================================================
// Singleton Default Registry
// =============================================================================

let defaultRegistry: ToolSchemaRegistry | null = null;

/**
 * Get the default tool schema registry (singleton)
 */
export function getDefaultRegistry(): ToolSchemaRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createDefaultRegistry();
  }
  return defaultRegistry;
}

/**
 * Reset the default registry (useful for testing)
 */
export function resetDefaultRegistry(): void {
  defaultRegistry = null;
}
