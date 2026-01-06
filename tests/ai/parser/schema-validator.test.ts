/**
 * Tests for Schema Validation Module
 *
 * Tests schema registry, fuzzy matching, parameter mapping, and validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Schema Registry
  ToolSchemaRegistry,
  createToolSchema,
  numberParam,
  stringParam,
  getDefaultRegistry,
  resetDefaultRegistry,
  // Fuzzy Matcher
  levenshteinDistance,
  levenshteinSimilarity,
  jaroSimilarity,
  jaroWinklerSimilarity,
  findBestMatch,
  findTool,
  isSimilar,
  // Parameter Mapper
  ParameterMapper,
  resolveParameterName,
  // Schema Validator
  SchemaValidator,
  validateToolCall,
  isValidToolCall,
} from '../../../src/ai/parser';

// =============================================================================
// Schema Registry Tests
// =============================================================================

describe('ToolSchemaRegistry', () => {
  let registry: ToolSchemaRegistry;

  beforeEach(() => {
    registry = new ToolSchemaRegistry();
  });

  describe('register', () => {
    it('registers a tool schema', () => {
      const schema = createToolSchema(
        'test_tool',
        'A test tool',
        { param: stringParam('A parameter') },
        ['param']
      );
      registry.register(schema);
      expect(registry.has('test_tool')).toBe(true);
    });

    it('retrieves registered schema by name', () => {
      const schema = createToolSchema('my_tool', 'My tool', {});
      registry.register(schema);
      const retrieved = registry.get('my_tool');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('my_tool');
    });

    it('is case-insensitive', () => {
      const schema = createToolSchema('Create_Rectangle', 'Create a rectangle', {});
      registry.register(schema);
      expect(registry.has('create_rectangle')).toBe(true);
      expect(registry.has('CREATE_RECTANGLE')).toBe(true);
    });
  });

  describe('aliases', () => {
    it('adds and resolves custom aliases', () => {
      const schema = createToolSchema('create_rectangle', 'Create a rectangle', {});
      registry.register(schema);
      registry.addAlias('rect', 'create_rectangle');

      const retrieved = registry.get('rect');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('create_rectangle');
    });
  });

  describe('getToolNames', () => {
    it('returns all registered tool names', () => {
      registry.register(createToolSchema('tool1', 'Tool 1', {}));
      registry.register(createToolSchema('tool2', 'Tool 2', {}));
      registry.register(createToolSchema('tool3', 'Tool 3', {}));

      const names = registry.getToolNames();
      expect(names).toHaveLength(3);
      expect(names).toContain('tool1');
      expect(names).toContain('tool2');
      expect(names).toContain('tool3');
    });
  });
});

describe('createToolSchema', () => {
  it('creates a properly structured schema', () => {
    const schema = createToolSchema(
      'my_tool',
      'My tool description',
      {
        x: numberParam('X coordinate', { minimum: 0 }),
        name: stringParam('Name'),
      },
      ['x']
    );

    expect(schema.id).toBe('tool_my_tool');
    expect(schema.name).toBe('my_tool');
    expect(schema.description).toBe('My tool description');
    expect(schema.parameters.type).toBe('object');
    expect(schema.parameters.properties).toHaveProperty('x');
    expect(schema.parameters.properties).toHaveProperty('name');
    expect(schema.parameters.required).toEqual(['x']);
  });
});

describe('Default Registry', () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  it('creates default registry with DesignLibre tools', () => {
    const registry = getDefaultRegistry();
    expect(registry.has('create_rectangle')).toBe(true);
    expect(registry.has('create_ellipse')).toBe(true);
    expect(registry.has('create_text')).toBe(true);
    expect(registry.has('create_frame')).toBe(true);
    expect(registry.has('move')).toBe(true);
    expect(registry.has('align')).toBe(true);
  });

  it('returns singleton instance', () => {
    const registry1 = getDefaultRegistry();
    const registry2 = getDefaultRegistry();
    expect(registry1).toBe(registry2);
  });
});

// =============================================================================
// Fuzzy Matcher Tests
// =============================================================================

describe('Levenshtein Distance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('returns correct distance for simple edits', () => {
    expect(levenshteinDistance('cat', 'hat')).toBe(1); // substitution
    expect(levenshteinDistance('cat', 'cats')).toBe(1); // insertion
    expect(levenshteinDistance('cats', 'cat')).toBe(1); // deletion
  });

  it('handles empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0);
    expect(levenshteinDistance('hello', '')).toBe(5);
    expect(levenshteinDistance('', 'world')).toBe(5);
  });
});

describe('Levenshtein Similarity', () => {
  it('returns 1 for identical strings', () => {
    expect(levenshteinSimilarity('hello', 'hello')).toBe(1);
  });

  it('returns high similarity for similar strings', () => {
    const sim = levenshteinSimilarity('create_rectangle', 'create_recangle');
    expect(sim).toBeGreaterThan(0.9);
  });

  it('returns low similarity for different strings', () => {
    const sim = levenshteinSimilarity('hello', 'world');
    expect(sim).toBeLessThan(0.5);
  });
});

describe('Jaro-Winkler Similarity', () => {
  it('returns 1 for identical strings', () => {
    expect(jaroWinklerSimilarity('hello', 'hello')).toBe(1);
  });

  it('gives bonus for matching prefixes', () => {
    // Jaro-Winkler should score higher than Jaro for strings with common prefix
    const jaro = jaroSimilarity('create_rect', 'create_ellipse');
    const jaroWinkler = jaroWinklerSimilarity('create_rect', 'create_ellipse');
    expect(jaroWinkler).toBeGreaterThan(jaro);
  });

  it('handles typos well', () => {
    const sim = jaroWinklerSimilarity('create_rectangle', 'create_rectanlge');
    expect(sim).toBeGreaterThan(0.9);
  });
});

describe('findBestMatch', () => {
  const candidates = ['create_rectangle', 'create_ellipse', 'create_text', 'move', 'delete'];

  it('finds exact match', () => {
    const match = findBestMatch('create_rectangle', candidates);
    expect(match).not.toBeNull();
    expect(match?.match).toBe('create_rectangle');
    expect(match?.similarity).toBe(1);
    expect(match?.algorithm).toBe('exact');
  });

  it('finds fuzzy match for typo', () => {
    const match = findBestMatch('create_rectagle', candidates);
    expect(match).not.toBeNull();
    expect(match?.match).toBe('create_rectangle');
    expect(match?.similarity).toBeGreaterThan(0.8);
  });

  it('returns null when no match above threshold', () => {
    const match = findBestMatch('xyz', candidates, { threshold: 0.9 });
    expect(match).toBeNull();
  });
});

describe('findTool', () => {
  let registry: ToolSchemaRegistry;

  beforeEach(() => {
    resetDefaultRegistry();
    registry = getDefaultRegistry();
  });

  it('finds tool by exact name', () => {
    const match = findTool('create_rectangle', registry);
    expect(match).not.toBeNull();
    expect(match?.match.name).toBe('create_rectangle');
    expect(match?.algorithm).toBe('exact');
  });

  it('finds tool by fuzzy match', () => {
    const match = findTool('create_rectangl', registry);
    expect(match).not.toBeNull();
    expect(match?.match.name).toBe('create_rectangle');
    expect(match?.similarity).toBeGreaterThan(0.8);
  });
});

describe('isSimilar', () => {
  it('returns true for similar strings', () => {
    expect(isSimilar('hello', 'hallo', 0.7)).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(isSimilar('hello', 'world', 0.7)).toBe(false);
  });
});

// =============================================================================
// Parameter Mapper Tests
// =============================================================================

describe('ParameterMapper', () => {
  let mapper: ParameterMapper;
  const schema = createToolSchema(
    'test_tool',
    'Test tool',
    {
      x: numberParam('X coordinate'),
      y: numberParam('Y coordinate'),
      width: numberParam('Width'),
      height: numberParam('Height'),
      fill: stringParam('Fill color'),
    },
    ['x', 'y']
  );

  beforeEach(() => {
    mapper = new ParameterMapper();
  });

  it('maps direct parameter names', () => {
    const result = mapper.map({ x: 10, y: 20, width: 100 }, schema);
    expect(result.parameters).toEqual({ x: 10, y: 20, width: 100 });
    expect(result.unmapped).toHaveLength(0);
  });

  it('maps case-insensitive parameter names', () => {
    const result = mapper.map({ X: 10, Y: 20, Width: 100 }, schema);
    expect(result.parameters).toHaveProperty('x', 10);
    expect(result.parameters).toHaveProperty('y', 20);
    expect(result.parameters).toHaveProperty('width', 100);
  });

  it('coerces string numbers to numbers', () => {
    const mapper = new ParameterMapper({ enableCoercion: true });
    const result = mapper.map({ x: '10', y: '20.5' }, schema);
    expect(result.parameters['x']).toBe(10);
    expect(result.parameters['y']).toBe(20.5);
  });

  it('coerces values with units', () => {
    const mapper = new ParameterMapper({ enableCoercion: true });
    const result = mapper.map({ width: '100px', height: '50%' }, schema);
    expect(result.parameters['width']).toBe(100);
    expect(result.parameters['height']).toBe(50);
  });

  it('reports unmapped parameters', () => {
    const result = mapper.map({ x: 10, y: 20, unknownParam: 'value' }, schema);
    expect(result.unmapped).toContain('unknownParam');
  });
});

describe('resolveParameterName', () => {
  const schemaParams = ['x', 'y', 'width', 'height', 'fill'];

  it('resolves exact match', () => {
    expect(resolveParameterName('x', schemaParams)).toBe('x');
  });

  it('resolves case-insensitive match', () => {
    expect(resolveParameterName('WIDTH', schemaParams)).toBe('width');
  });

  it('returns null for unknown parameters', () => {
    expect(resolveParameterName('unknown', schemaParams)).toBeNull();
  });
});

// =============================================================================
// Schema Validator Tests
// =============================================================================

describe('SchemaValidator', () => {
  let validator: SchemaValidator;
  let registry: ToolSchemaRegistry;

  beforeEach(() => {
    resetDefaultRegistry();
    registry = getDefaultRegistry();
    validator = new SchemaValidator();
  });

  describe('validate', () => {
    it('validates correct tool call', () => {
      const result = validator.validate(
        {
          tool: 'create_rectangle',
          parameters: { x: 0, y: 0, width: 100, height: 100 },
        },
        registry
      );
      expect(result.isValid).toBe(true);
      expect(result.normalizedData).not.toBeNull();
      expect(result.normalizedData?.tool).toBe('create_rectangle');
    });

    it('fails for unknown tool', () => {
      // Use strict mode and no fuzzy matching to ensure unknown tool fails
      const strictValidator = new SchemaValidator({
        fuzzyToolMatching: false,
        strictMode: true,
      });
      const result = strictValidator.validate(
        { tool: 'xyz_nonexistent_tool', parameters: {} },
        registry
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'unknown_tool')).toBe(true);
    });

    it('fails for missing required parameters when defaults disabled', () => {
      // Disable defaults to ensure missing required params fail
      const strictValidator = new SchemaValidator({
        useDefaults: false,
        strictMode: true,
      });
      const result = strictValidator.validate(
        {
          tool: 'create_rectangle',
          parameters: { x: 0, y: 0 }, // missing width and height
        },
        registry
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'required_parameter_missing')).toBe(true);
    });

    it('uses defaults for missing required params when enabled', () => {
      const validatorWithDefaults = new SchemaValidator({ useDefaults: true });
      const result = validatorWithDefaults.validate(
        {
          tool: 'create_rectangle',
          parameters: { x: 0, y: 0 }, // width and height have defaults in schema
        },
        registry
      );
      // Default schema has width/height with default values
      // Check that at least warnings are generated about using defaults
      expect(result.isValid).toBe(true);
      // If defaults are injected, they should be in injectedDefaults or parameters
      expect(
        result.normalizedData?.parameters['width'] !== undefined ||
        result.injectedDefaults['width'] !== undefined
      ).toBe(true);
    });

    it('fuzzy matches tool names', () => {
      const validator = new SchemaValidator({ fuzzyToolMatching: true });
      const result = validator.validate(
        {
          tool: 'create_rectagle', // typo
          parameters: { x: 0, y: 0, width: 100, height: 100 },
        },
        registry
      );
      expect(result.isValid).toBe(true);
      expect(result.normalizedData?.tool).toBe('create_rectangle');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('handles various parameter name formats', () => {
      const result = validator.validate(
        {
          name: 'create_rectangle', // 'name' instead of 'tool'
          params: { x: 0, y: 0, width: 100, height: 100 }, // 'params' instead of 'parameters'
        },
        registry
      );
      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateToolCall convenience function', () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  it('validates with default registry', () => {
    const registry = getDefaultRegistry();
    const result = validateToolCall(
      { tool: 'move', parameters: { x: 10, y: 20 } },
      registry
    );
    expect(result.isValid).toBe(true);
  });
});

describe('isValidToolCall convenience function', () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  it('returns true for valid tool call', () => {
    const registry = getDefaultRegistry();
    expect(isValidToolCall({ tool: 'move', parameters: { x: 10, y: 20 } }, registry)).toBe(true);
  });

  it('returns false for very different tool name even with fuzzy matching', () => {
    const registry = getDefaultRegistry();
    // Use a name with very low similarity to all tools (< 0.6 threshold)
    // 'qqqq' has very low similarity to all registered tool names
    const result = isValidToolCall({ tool: 'qqqq', parameters: {} }, registry);
    expect(result).toBe(false);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Full Validation Pipeline', () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  it('validates and normalizes a complete tool call', () => {
    const registry = getDefaultRegistry();
    const validator = new SchemaValidator({
      fuzzyToolMatching: true,
      fuzzyParamMatching: true,
      enableCoercion: true,
    });

    const result = validator.validate(
      {
        tool: 'create_rectanlge', // typo
        params: {
          X: '100px', // uppercase, with unit
          Y: 50,
          Width: '200',
          Height: 150,
          Fill: '#ff0000',
        },
      },
      registry
    );

    expect(result.isValid).toBe(true);
    expect(result.normalizedData?.tool).toBe('create_rectangle');
    expect(result.normalizedData?.parameters).toEqual(
      expect.objectContaining({
        x: 100,
        y: 50,
        width: 200,
        height: 150,
        fill: '#ff0000',
      })
    );
    expect(result.warnings.length).toBeGreaterThan(0); // fuzzy match warning
    expect(result.coercedValues).toHaveProperty('X'); // coercion record
  });
});
