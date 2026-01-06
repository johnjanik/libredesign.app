/**
 * Type Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  TYPE_SCHEMA_REGISTRY,
  POINT_SCHEMA,
  BOUNDS_SCHEMA,
  TRANSFORM_SCHEMA,
  RGBA_SCHEMA,
  FILL_SCHEMA,
  STROKE_SCHEMA,
  EFFECT_SCHEMA,
  BASE_NODE_SCHEMA,
  TOOL_RESULT_SCHEMA,
  VIEWPORT_SCHEMA,
  getTypeSchema,
  getTypeSchemaNames,
  generateTypeSchemaDocumentation,
  generateTypeSchemaPrompt,
  typeSchemaToJSONSchema,
} from '@ai/schemas/type-schemas';

describe('TypeSchema Registry', () => {
  it('contains all expected core schemas', () => {
    const names = getTypeSchemaNames();

    expect(names).toContain('Point');
    expect(names).toContain('Bounds');
    expect(names).toContain('Transform');
    expect(names).toContain('RGBA');
    expect(names).toContain('Fill');
    expect(names).toContain('Stroke');
    expect(names).toContain('Effect');
    expect(names).toContain('BaseNode');
    expect(names).toContain('ToolResult');
    expect(names).toContain('Viewport');
  });

  it('has at least 15 type schemas', () => {
    expect(TYPE_SCHEMA_REGISTRY.length).toBeGreaterThanOrEqual(15);
  });

  it('retrieves schema by name', () => {
    const point = getTypeSchema('Point');
    expect(point).toBeDefined();
    expect(point?.name).toBe('Point');
    expect(point?.properties).toHaveLength(2);
  });

  it('returns undefined for unknown schema', () => {
    const unknown = getTypeSchema('UnknownType');
    expect(unknown).toBeUndefined();
  });
});

describe('Point Schema', () => {
  it('has x and y properties', () => {
    const props = POINT_SCHEMA.properties;
    const propNames = props.map(p => p.name);

    expect(propNames).toContain('x');
    expect(propNames).toContain('y');
  });

  it('requires both x and y', () => {
    const requiredProps = POINT_SCHEMA.properties.filter(p => p.required);
    expect(requiredProps).toHaveLength(2);
  });

  it('has examples', () => {
    expect(POINT_SCHEMA.examples).toBeDefined();
    expect(POINT_SCHEMA.examples!.length).toBeGreaterThan(0);
  });
});

describe('Bounds Schema', () => {
  it('has x, y, width, height properties', () => {
    const propNames = BOUNDS_SCHEMA.properties.map(p => p.name);

    expect(propNames).toEqual(['x', 'y', 'width', 'height']);
  });

  it('all properties are required', () => {
    const allRequired = BOUNDS_SCHEMA.properties.every(p => p.required);
    expect(allRequired).toBe(true);
  });
});

describe('Transform Schema', () => {
  it('extends Bounds with rotation and scale', () => {
    const propNames = TRANSFORM_SCHEMA.properties.map(p => p.name);

    expect(propNames).toContain('x');
    expect(propNames).toContain('y');
    expect(propNames).toContain('width');
    expect(propNames).toContain('height');
    expect(propNames).toContain('rotation');
    expect(propNames).toContain('scaleX');
    expect(propNames).toContain('scaleY');
  });

  it('has default values for optional properties', () => {
    const rotation = TRANSFORM_SCHEMA.properties.find(p => p.name === 'rotation');
    const scaleX = TRANSFORM_SCHEMA.properties.find(p => p.name === 'scaleX');

    expect(rotation?.default).toBe(0);
    expect(scaleX?.default).toBe(1);
  });
});

describe('RGBA Schema', () => {
  it('has r, g, b, a properties', () => {
    const propNames = RGBA_SCHEMA.properties.map(p => p.name);

    expect(propNames).toEqual(['r', 'g', 'b', 'a']);
  });

  it('alpha is optional with default 1', () => {
    const alpha = RGBA_SCHEMA.properties.find(p => p.name === 'a');

    expect(alpha?.required).toBe(false);
    expect(alpha?.default).toBe(1);
  });

  it('has related types', () => {
    expect(RGBA_SCHEMA.relatedTypes).toContain('Color');
    expect(RGBA_SCHEMA.relatedTypes).toContain('Fill');
  });
});

describe('Fill Schema', () => {
  it('has type property with enum values', () => {
    const typerop = FILL_SCHEMA.properties.find(p => p.name === 'type');

    expect(typerop).toBeDefined();
    expect(typerop?.enum).toContain('solid');
    expect(typerop?.enum).toContain('linear');
    expect(typerop?.enum).toContain('radial');
    expect(typerop?.enum).toContain('none');
  });

  it('has color and visibility properties', () => {
    const propNames = FILL_SCHEMA.properties.map(p => p.name);

    expect(propNames).toContain('color');
    expect(propNames).toContain('visible');
    expect(propNames).toContain('opacity');
  });
});

describe('Stroke Schema', () => {
  it('has required color and width', () => {
    const color = STROKE_SCHEMA.properties.find(p => p.name === 'color');
    const width = STROKE_SCHEMA.properties.find(p => p.name === 'width');

    expect(color?.required).toBe(true);
    expect(width?.required).toBe(true);
  });

  it('has lineCap and lineJoin enums', () => {
    const lineCap = STROKE_SCHEMA.properties.find(p => p.name === 'lineCap');
    const lineJoin = STROKE_SCHEMA.properties.find(p => p.name === 'lineJoin');

    expect(lineCap?.enum).toContain('butt');
    expect(lineCap?.enum).toContain('round');
    expect(lineJoin?.enum).toContain('miter');
    expect(lineJoin?.enum).toContain('bevel');
  });
});

describe('Effect Schema', () => {
  it('has type enum with shadow and blur effects', () => {
    const typeProp = EFFECT_SCHEMA.properties.find(p => p.name === 'type');

    expect(typeProp?.enum).toContain('drop-shadow');
    expect(typeProp?.enum).toContain('inner-shadow');
    expect(typeProp?.enum).toContain('blur');
  });

  it('has offset, blur, and spread properties', () => {
    const propNames = EFFECT_SCHEMA.properties.map(p => p.name);

    expect(propNames).toContain('offsetX');
    expect(propNames).toContain('offsetY');
    expect(propNames).toContain('blur');
    expect(propNames).toContain('spread');
  });
});

describe('BaseNode Schema', () => {
  it('has all essential node properties', () => {
    const propNames = BASE_NODE_SCHEMA.properties.map(p => p.name);

    expect(propNames).toContain('id');
    expect(propNames).toContain('type');
    expect(propNames).toContain('name');
    expect(propNames).toContain('x');
    expect(propNames).toContain('y');
    expect(propNames).toContain('width');
    expect(propNames).toContain('height');
    expect(propNames).toContain('rotation');
    expect(propNames).toContain('visible');
    expect(propNames).toContain('locked');
    expect(propNames).toContain('opacity');
    expect(propNames).toContain('parentId');
    expect(propNames).toContain('children');
  });

  it('has correct defaults for visibility and lock', () => {
    const visible = BASE_NODE_SCHEMA.properties.find(p => p.name === 'visible');
    const locked = BASE_NODE_SCHEMA.properties.find(p => p.name === 'locked');

    expect(visible?.default).toBe(true);
    expect(locked?.default).toBe(false);
  });
});

describe('ToolResult Schema', () => {
  it('has success as required property', () => {
    const success = TOOL_RESULT_SCHEMA.properties.find(p => p.name === 'success');

    expect(success?.required).toBe(true);
    expect(success?.type).toBe('boolean');
  });

  it('has optional message, data, error, and affectedIds', () => {
    const optional = TOOL_RESULT_SCHEMA.properties.filter(p => !p.required);
    const optionalNames = optional.map(p => p.name);

    expect(optionalNames).toContain('message');
    expect(optionalNames).toContain('data');
    expect(optionalNames).toContain('error');
    expect(optionalNames).toContain('affectedIds');
  });
});

describe('Viewport Schema', () => {
  it('has all viewport properties', () => {
    const propNames = VIEWPORT_SCHEMA.properties.map(p => p.name);

    expect(propNames).toEqual(['x', 'y', 'width', 'height', 'zoom']);
  });

  it('all properties are required', () => {
    const allRequired = VIEWPORT_SCHEMA.properties.every(p => p.required);
    expect(allRequired).toBe(true);
  });
});

describe('generateTypeSchemaDocumentation', () => {
  it('generates non-empty markdown', () => {
    const doc = generateTypeSchemaDocumentation();

    expect(doc.length).toBeGreaterThan(1000);
  });

  it('includes all type names as headers', () => {
    const doc = generateTypeSchemaDocumentation();

    expect(doc).toContain('## Point');
    expect(doc).toContain('## Bounds');
    expect(doc).toContain('## RGBA');
    expect(doc).toContain('## Fill');
    expect(doc).toContain('## BaseNode');
  });

  it('includes property tables', () => {
    const doc = generateTypeSchemaDocumentation();

    expect(doc).toContain('| Property | Type | Required');
    expect(doc).toContain('|----------|------|');
  });

  it('includes examples section', () => {
    const doc = generateTypeSchemaDocumentation();

    expect(doc).toContain('### Examples');
    expect(doc).toContain('```typescript');
  });
});

describe('generateTypeSchemaPrompt', () => {
  it('generates concise prompt for system message', () => {
    const prompt = generateTypeSchemaPrompt();

    // Should be token-efficient (under 2000 chars)
    expect(prompt.length).toBeLessThan(2000);
  });

  it('includes coordinate system explanation', () => {
    const prompt = generateTypeSchemaPrompt();

    expect(prompt).toContain('Coordinate System');
    expect(prompt).toContain('Origin (0,0)');
    expect(prompt).toContain('top-left');
  });

  it('includes core type definitions', () => {
    const prompt = generateTypeSchemaPrompt();

    expect(prompt).toContain('Point');
    expect(prompt).toContain('Bounds');
    expect(prompt).toContain('RGBA');
    expect(prompt).toContain('Fill');
  });

  it('includes node types', () => {
    const prompt = generateTypeSchemaPrompt();

    expect(prompt).toContain('FRAME');
    expect(prompt).toContain('RECTANGLE');
    expect(prompt).toContain('TEXT');
    expect(prompt).toContain('COMPONENT');
  });

  it('includes ToolResult format', () => {
    const prompt = generateTypeSchemaPrompt();

    expect(prompt).toContain('ToolResult');
    expect(prompt).toContain('success');
  });
});

describe('typeSchemaToJSONSchema', () => {
  it('converts Point schema to JSON Schema', () => {
    const jsonSchema = typeSchemaToJSONSchema(POINT_SCHEMA);

    expect(jsonSchema['type']).toBe('object');
    expect(jsonSchema['description']).toBe('A 2D coordinate in pixel space');
    expect(jsonSchema['properties']).toBeDefined();
    const props = jsonSchema['properties'] as Record<string, unknown>;
    expect(props['x']).toBeDefined();
    expect(props['y']).toBeDefined();
    expect(jsonSchema['required']).toEqual(['x', 'y']);
  });

  it('handles optional properties correctly', () => {
    const jsonSchema = typeSchemaToJSONSchema(RGBA_SCHEMA);

    // Only r, g, b are required, not a
    expect(jsonSchema['required']).toEqual(['r', 'g', 'b']);
  });

  it('includes enum values', () => {
    const jsonSchema = typeSchemaToJSONSchema(FILL_SCHEMA);
    const props = jsonSchema['properties'] as Record<string, { enum?: string[] }>;

    expect(props['type']?.enum).toBeDefined();
    expect(props['type']?.enum).toContain('solid');
  });

  it('includes default values', () => {
    const jsonSchema = typeSchemaToJSONSchema(TRANSFORM_SCHEMA);
    const props = jsonSchema['properties'] as Record<string, { default?: unknown }>;

    expect(props['rotation']?.default).toBe(0);
    expect(props['scaleX']?.default).toBe(1);
  });
});
