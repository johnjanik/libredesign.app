/**
 * Tool Format Converter Tests
 */

import { describe, it, expect } from 'vitest';
import {
  toAnthropicFormat,
  toOpenAIFormat,
  toOllamaFormat,
  toLlamaCppFormat,
  toPromptFormat,
  toolDefinitionToAITool,
  convertToolsToFormat,
  parsePromptToolCalls,
  extractPromptResponse,
  validateToolDefinition,
  supportsNativeToolCalling,
  getProviderFormat,
} from '@ai/providers/tool-format-converter';
import type { AITool } from '@ai/providers/ai-provider';
import type { ToolDefinition } from '@ai/tools/tool-registry';

// Sample tool for testing
const sampleTool: AITool = {
  name: 'create_rectangle',
  description: 'Create a new rectangle on the canvas',
  parameters: {
    type: 'object',
    properties: {
      x: { type: 'number', description: 'X coordinate' },
      y: { type: 'number', description: 'Y coordinate' },
      width: { type: 'number', description: 'Width of rectangle' },
      height: { type: 'number', description: 'Height of rectangle' },
      color: {
        type: 'string',
        description: 'Fill color (hex)',
        enum: ['#ff0000', '#00ff00', '#0000ff'],
      },
    },
    required: ['x', 'y', 'width', 'height'],
  },
};

const toolWithNestedProperties: AITool = {
  name: 'set_gradient',
  description: 'Set a gradient fill',
  parameters: {
    type: 'object',
    properties: {
      stops: {
        type: 'array',
        description: 'Gradient stops',
        items: {
          type: 'object',
          properties: {
            position: { type: 'number', description: 'Stop position (0-1)' },
            color: { type: 'string', description: 'Color at this stop' },
          },
          required: ['position', 'color'],
        },
      },
    },
    required: ['stops'],
  },
};

describe('toAnthropicFormat', () => {
  it('converts basic tool correctly', () => {
    const result = toAnthropicFormat(sampleTool);

    expect(result.name).toBe('create_rectangle');
    expect(result.description).toBe('Create a new rectangle on the canvas');
    expect(result.input_schema.type).toBe('object');
    expect(result.input_schema.properties).toBeDefined();
    expect(result.input_schema.required).toEqual(['x', 'y', 'width', 'height']);
  });

  it('includes all properties', () => {
    const result = toAnthropicFormat(sampleTool);

    expect(result.input_schema.properties['x']).toEqual({
      type: 'number',
      description: 'X coordinate',
    });
    expect(result.input_schema.properties['width']).toEqual({
      type: 'number',
      description: 'Width of rectangle',
    });
  });

  it('preserves enum values', () => {
    const result = toAnthropicFormat(sampleTool);

    expect(result.input_schema.properties['color']).toEqual({
      type: 'string',
      description: 'Fill color (hex)',
      enum: ['#ff0000', '#00ff00', '#0000ff'],
    });
  });

  it('handles tools without required fields', () => {
    const toolWithoutRequired: AITool = {
      name: 'select_all',
      description: 'Select all objects',
      parameters: {
        type: 'object',
        properties: {},
      },
    };

    const result = toAnthropicFormat(toolWithoutRequired);

    expect(result.input_schema.required).toBeUndefined();
  });

  it('handles nested array types', () => {
    const result = toAnthropicFormat(toolWithNestedProperties);

    expect(result.input_schema.properties['stops']).toBeDefined();
    const stopsSchema = result.input_schema.properties['stops'] as Record<string, unknown>;
    expect(stopsSchema['type']).toBe('array');
    expect(stopsSchema['items']).toBeDefined();
  });
});

describe('toOpenAIFormat', () => {
  it('converts to function calling format', () => {
    const result = toOpenAIFormat(sampleTool);

    expect(result.type).toBe('function');
    expect(result.function.name).toBe('create_rectangle');
    expect(result.function.description).toBe('Create a new rectangle on the canvas');
    expect(result.function.parameters.type).toBe('object');
  });

  it('includes all properties', () => {
    const result = toOpenAIFormat(sampleTool);

    expect(result.function.parameters.properties['x']).toEqual({
      type: 'number',
      description: 'X coordinate',
    });
  });

  it('includes required fields', () => {
    const result = toOpenAIFormat(sampleTool);

    expect(result.function.parameters.required).toEqual(['x', 'y', 'width', 'height']);
  });

  it('handles tools without required fields', () => {
    const toolWithoutRequired: AITool = {
      name: 'deselect_all',
      description: 'Deselect all objects',
      parameters: {
        type: 'object',
        properties: {},
      },
    };

    const result = toOpenAIFormat(toolWithoutRequired);

    expect(result.function.parameters.required).toBeUndefined();
  });
});

describe('toOllamaFormat', () => {
  it('produces same format as OpenAI', () => {
    const ollamaResult = toOllamaFormat(sampleTool);
    const openaiResult = toOpenAIFormat(sampleTool);

    expect(ollamaResult).toEqual(openaiResult);
  });
});

describe('toLlamaCppFormat', () => {
  it('produces same format as OpenAI', () => {
    const llamaCppResult = toLlamaCppFormat(sampleTool);
    const openaiResult = toOpenAIFormat(sampleTool);

    expect(llamaCppResult).toEqual(openaiResult);
  });
});

describe('toPromptFormat', () => {
  it('generates markdown documentation', () => {
    const result = toPromptFormat([sampleTool]);

    expect(result).toContain('## Available Commands');
    expect(result).toContain('**create_rectangle**');
    expect(result).toContain('Create a new rectangle on the canvas');
  });

  it('includes parameter list', () => {
    const result = toPromptFormat([sampleTool]);

    expect(result).toContain('Parameters:');
    expect(result).toContain('x:');
    expect(result).toContain('y:');
    expect(result).toContain('width:');
    expect(result).toContain('height:');
  });

  it('shows required vs optional parameters', () => {
    const result = toPromptFormat([sampleTool]);

    // Optional parameters should have ? suffix
    expect(result).toContain('color?:');
    // Required parameters should not have ? suffix
    expect(result).toMatch(/x:\s*number/);
  });

  it('includes JSON format example', () => {
    const result = toPromptFormat([sampleTool]);

    expect(result).toContain('```json');
    expect(result).toContain('"commands"');
    expect(result).toContain('"tool"');
    expect(result).toContain('"args"');
  });

  it('handles multiple tools', () => {
    const tools = [
      sampleTool,
      {
        name: 'delete_selection',
        description: 'Delete selected objects',
        parameters: { type: 'object' as const, properties: {} },
      },
    ];

    const result = toPromptFormat(tools);

    expect(result).toContain('**create_rectangle**');
    expect(result).toContain('**delete_selection**');
  });

  it('handles tools with no parameters', () => {
    const noParamTool: AITool = {
      name: 'undo',
      description: 'Undo last action',
      parameters: { type: 'object', properties: {} },
    };

    const result = toPromptFormat([noParamTool]);

    expect(result).toContain('Parameters: none');
  });
});

describe('parsePromptToolCalls', () => {
  it('parses JSON code block format', () => {
    const response = `
I'll create a rectangle for you.

\`\`\`json
{
  "thinking": "User wants a red rectangle",
  "commands": [
    { "tool": "create_rectangle", "args": { "x": 100, "y": 100, "width": 200, "height": 150 } }
  ],
  "response": "Created a rectangle at (100, 100)"
}
\`\`\`
`;

    const result = parsePromptToolCalls(response);

    expect(result).toHaveLength(1);
    expect(result[0]?.tool).toBe('create_rectangle');
    expect(result[0]?.args).toEqual({ x: 100, y: 100, width: 200, height: 150 });
  });

  it('parses multiple commands', () => {
    const response = `
\`\`\`json
{
  "commands": [
    { "tool": "create_rectangle", "args": { "x": 0, "y": 0, "width": 100, "height": 100 } },
    { "tool": "set_fill_color", "args": { "color": "#ff0000" } }
  ],
  "response": "Done"
}
\`\`\`
`;

    const result = parsePromptToolCalls(response);

    expect(result).toHaveLength(2);
    expect(result[0]?.tool).toBe('create_rectangle');
    expect(result[1]?.tool).toBe('set_fill_color');
  });

  it('handles raw JSON without code block', () => {
    const response = `{ "commands": [{ "tool": "select_all", "args": {} }], "response": "Selected all" }`;

    const result = parsePromptToolCalls(response);

    expect(result).toHaveLength(1);
    expect(result[0]?.tool).toBe('select_all');
  });

  it('returns empty array for invalid JSON', () => {
    const response = 'This is just text with no JSON';

    const result = parsePromptToolCalls(response);

    expect(result).toEqual([]);
  });

  it('returns empty array for JSON without commands', () => {
    const response = `\`\`\`json
{ "response": "Hello" }
\`\`\``;

    const result = parsePromptToolCalls(response);

    expect(result).toEqual([]);
  });

  it('handles malformed JSON gracefully', () => {
    const response = `\`\`\`json
{ "commands": [{ invalid json here }] }
\`\`\``;

    const result = parsePromptToolCalls(response);

    expect(result).toEqual([]);
  });
});

describe('extractPromptResponse', () => {
  it('extracts response text from JSON', () => {
    const response = `
\`\`\`json
{
  "commands": [{ "tool": "create_rectangle", "args": {} }],
  "response": "I created a rectangle for you!"
}
\`\`\`
`;

    const result = extractPromptResponse(response);

    expect(result).toBe('I created a rectangle for you!');
  });

  it('returns original for non-JSON responses', () => {
    const response = 'This is just plain text';

    const result = extractPromptResponse(response);

    expect(result).toBe('This is just plain text');
  });

  it('returns original for JSON without response field', () => {
    const response = `\`\`\`json
{ "commands": [] }
\`\`\``;

    const result = extractPromptResponse(response);

    expect(result).toBe(response);
  });
});

describe('toolDefinitionToAITool', () => {
  it('converts ToolDefinition to AITool', () => {
    const toolDef: ToolDefinition = {
      name: 'move_selection',
      description: 'Move selected objects',
      category: 'transform',
      parameters: {
        type: 'object',
        properties: {
          dx: { type: 'number', description: 'X offset' },
          dy: { type: 'number', description: 'Y offset' },
        },
        required: ['dx', 'dy'],
      },
      returns: { type: 'object', properties: { success: { type: 'boolean' } } },
    };

    const result = toolDefinitionToAITool(toolDef);

    expect(result.name).toBe('move_selection');
    expect(result.description).toBe('Move selected objects');
    expect(result.parameters.type).toBe('object');
    expect(result.parameters.properties['dx']).toBeDefined();
    expect(result.parameters.required).toEqual(['dx', 'dy']);
  });

  it('handles empty properties', () => {
    const toolDef: ToolDefinition = {
      name: 'select_all',
      description: 'Select all objects',
      category: 'selection',
      parameters: {
        type: 'object',
        properties: {},
      },
      returns: { type: 'object', properties: { success: { type: 'boolean' } } },
    };

    const result = toolDefinitionToAITool(toolDef);

    expect(result.parameters.properties).toEqual({});
    expect(result.parameters.required).toBeUndefined();
  });

  it('preserves nested types', () => {
    const toolDef: ToolDefinition = {
      name: 'set_transform',
      description: 'Set object transform',
      category: 'transform',
      parameters: {
        type: 'object',
        properties: {
          matrix: {
            type: 'object',
            properties: {
              a: { type: 'number' },
              b: { type: 'number' },
              c: { type: 'number' },
              d: { type: 'number' },
              tx: { type: 'number' },
              ty: { type: 'number' },
            },
            required: ['a', 'b', 'c', 'd', 'tx', 'ty'],
          },
        },
        required: ['matrix'],
      },
      returns: { type: 'object', properties: { success: { type: 'boolean' } } },
    };

    const result = toolDefinitionToAITool(toolDef);

    expect(result.parameters.properties['matrix']).toBeDefined();
    const matrix = result.parameters.properties['matrix']!;
    expect(matrix.type).toBe('object');
    expect(matrix.properties).toBeDefined();
    expect(matrix.properties!['a']!.type).toBe('number');
  });
});

describe('convertToolsToFormat', () => {
  const tools: AITool[] = [sampleTool];

  it('converts to anthropic format', () => {
    const result = convertToolsToFormat(tools, 'anthropic');

    expect(result).toHaveLength(1);
    expect((result[0] as { name: string }).name).toBe('create_rectangle');
    expect((result[0] as { input_schema: unknown }).input_schema).toBeDefined();
  });

  it('converts to openai format', () => {
    const result = convertToolsToFormat(tools, 'openai');

    expect(result).toHaveLength(1);
    expect((result[0] as { type: string }).type).toBe('function');
    expect((result[0] as { function: { name: string } }).function.name).toBe('create_rectangle');
  });

  it('converts to ollama format', () => {
    const result = convertToolsToFormat(tools, 'ollama');

    expect(result).toHaveLength(1);
    expect((result[0] as { type: string }).type).toBe('function');
  });

  it('converts to llamacpp format', () => {
    const result = convertToolsToFormat(tools, 'llamacpp');

    expect(result).toHaveLength(1);
    expect((result[0] as { type: string }).type).toBe('function');
  });

  it('returns original for prompt format', () => {
    const result = convertToolsToFormat(tools, 'prompt');

    expect(result).toEqual(tools);
  });

  it('throws for unsupported format', () => {
    expect(() => convertToolsToFormat(tools, 'invalid' as any)).toThrow('Unsupported provider format');
  });
});

describe('validateToolDefinition', () => {
  it('returns empty array for valid tool', () => {
    const errors = validateToolDefinition(sampleTool);

    expect(errors).toEqual([]);
  });

  it('detects missing name', () => {
    const invalid: AITool = {
      name: '',
      description: 'Test',
      parameters: { type: 'object', properties: {} },
    };

    const errors = validateToolDefinition(invalid);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('name'))).toBe(true);
  });

  it('detects invalid name format', () => {
    const invalid: AITool = {
      name: 'InvalidName', // Should be lowercase
      description: 'Test',
      parameters: { type: 'object', properties: {} },
    };

    const errors = validateToolDefinition(invalid);

    expect(errors.some(e => e.includes('lowercase'))).toBe(true);
  });

  it('allows valid name formats', () => {
    const valid: AITool = {
      name: 'valid_tool_name_123',
      description: 'Test',
      parameters: { type: 'object', properties: {} },
    };

    const errors = validateToolDefinition(valid);

    expect(errors).toEqual([]);
  });

  it('detects missing description', () => {
    const invalid: AITool = {
      name: 'test_tool',
      description: '',
      parameters: { type: 'object', properties: {} },
    };

    const errors = validateToolDefinition(invalid);

    expect(errors.some(e => e.includes('description'))).toBe(true);
  });

  it('detects missing parameters', () => {
    const invalid = {
      name: 'test_tool',
      description: 'Test',
    } as AITool;

    const errors = validateToolDefinition(invalid);

    expect(errors.some(e => e.includes('parameters'))).toBe(true);
  });

  it('detects invalid parameters type', () => {
    const invalid: AITool = {
      name: 'test_tool',
      description: 'Test',
      parameters: { type: 'array' as any, properties: {} },
    };

    const errors = validateToolDefinition(invalid);

    expect(errors.some(e => e.includes('object'))).toBe(true);
  });
});

describe('supportsNativeToolCalling', () => {
  it('returns true for anthropic', () => {
    expect(supportsNativeToolCalling('anthropic')).toBe(true);
  });

  it('returns true for openai', () => {
    expect(supportsNativeToolCalling('openai')).toBe(true);
  });

  it('returns true for ollama', () => {
    expect(supportsNativeToolCalling('ollama')).toBe(true);
  });

  it('returns true for llamacpp', () => {
    expect(supportsNativeToolCalling('llamacpp')).toBe(true);
  });

  it('returns false for prompt', () => {
    expect(supportsNativeToolCalling('prompt')).toBe(false);
  });
});

describe('getProviderFormat', () => {
  it('detects anthropic provider', () => {
    expect(getProviderFormat('anthropic')).toBe('anthropic');
    expect(getProviderFormat('Anthropic Claude')).toBe('anthropic');
    expect(getProviderFormat('claude-3-opus')).toBe('anthropic');
  });

  it('detects openai provider', () => {
    expect(getProviderFormat('openai')).toBe('openai');
    expect(getProviderFormat('OpenAI GPT-4')).toBe('openai');
    expect(getProviderFormat('gpt-4-turbo')).toBe('openai');
  });

  it('detects ollama provider', () => {
    expect(getProviderFormat('ollama')).toBe('ollama');
    expect(getProviderFormat('Ollama Llama3')).toBe('ollama');
  });

  it('detects llamacpp provider', () => {
    expect(getProviderFormat('llamacpp')).toBe('llamacpp');
    expect(getProviderFormat('llama.cpp')).toBe('llamacpp');
    expect(getProviderFormat('cpp-llama')).toBe('llamacpp');
  });

  it('defaults to prompt for unknown providers', () => {
    expect(getProviderFormat('unknown')).toBe('prompt');
    expect(getProviderFormat('custom-model')).toBe('prompt');
  });
});

describe('Edge Cases', () => {
  it('handles tool with all parameter options', () => {
    const complexTool: AITool = {
      name: 'complex_tool',
      description: 'A tool with all parameter types',
      parameters: {
        type: 'object',
        properties: {
          str: { type: 'string', description: 'A string' },
          num: { type: 'number', description: 'A number', minimum: 0, maximum: 100 },
          bool: { type: 'boolean', description: 'A boolean', default: false },
          enumVal: { type: 'string', enum: ['a', 'b', 'c'] },
          arr: {
            type: 'array',
            items: { type: 'string' },
          },
          obj: {
            type: 'object',
            properties: {
              nested: { type: 'string' },
            },
          },
        },
        required: ['str', 'num'],
      },
    };

    // Should not throw for any format
    expect(() => toAnthropicFormat(complexTool)).not.toThrow();
    expect(() => toOpenAIFormat(complexTool)).not.toThrow();
    expect(() => toPromptFormat([complexTool])).not.toThrow();
  });

  it('handles deeply nested structures', () => {
    const deeplyNested: AITool = {
      name: 'nested_tool',
      description: 'Deeply nested',
      parameters: {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        value: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = toAnthropicFormat(deeplyNested);

    expect(result.input_schema.properties['level1']).toBeDefined();
  });

  it('handles empty tools array', () => {
    const result = toPromptFormat([]);

    expect(result).toContain('## Available Commands');
  });
});
