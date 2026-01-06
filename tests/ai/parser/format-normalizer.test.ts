/**
 * Tests for Format Normalizer Module
 *
 * Tests format detection and normalization of various AI model outputs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FormatNormalizer,
  detectFormat,
  detectFormatDetailed,
  normalizeModelOutput,
  detectAndNormalize,
  hasToolCalls,
  resetDefaultRegistry,
} from '../../../src/ai/parser';

// =============================================================================
// Format Detection Tests
// =============================================================================

describe('detectFormat', () => {
  it('detects Claude tool_use format', () => {
    const claudeOutput = {
      content: [
        { type: 'text', text: 'Creating a rectangle' },
        { type: 'tool_use', id: 'toolu_123', name: 'create_rectangle', input: { x: 100, y: 100 } },
      ],
    };
    const result = detectFormat(claudeOutput);
    expect(result.format).toBe('claude_tool_use');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('detects OpenAI function call format', () => {
    const openaiOutput = {
      choices: [{
        message: {
          content: null,
          tool_calls: [{
            id: 'call_abc123',
            type: 'function',
            function: { name: 'create_rectangle', arguments: '{"x":100}' },
          }],
        },
      }],
    };
    const result = detectFormat(openaiOutput);
    expect(result.format).toBe('openai_function_call');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('detects Ollama/Qwen JSON format', () => {
    const ollamaOutput = {
      thinking: 'I need to create a button',
      commands: [
        { tool: 'create_rectangle', params: { x: 100, y: 100 } },
      ],
    };
    const result = detectFormat(ollamaOutput);
    expect(result.format).toBe('ollama_json');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('detects markdown JSON format', () => {
    const markdownOutput = `Here's the tool call:
\`\`\`json
{"tool": "create_rectangle", "params": {"x": 100}}
\`\`\``;
    const result = detectFormat(markdownOutput);
    expect(result.format).toBe('markdown_json');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('detects custom structured format', () => {
    const customOutput = {
      actions: [
        { type: 'create_rectangle', parameters: { x: 100 } },
      ],
    };
    const result = detectFormat(customOutput);
    expect(result.format).toBe('custom_structured');
  });

  it('returns unknown for unrecognized format', () => {
    const unknownOutput = 'Hello, how can I help you?';
    const result = detectFormat(unknownOutput);
    expect(result.format).toBe('unknown');
    expect(result.confidence).toBe(0);
  });
});

describe('detectFormatDetailed', () => {
  it('extracts version info when available', () => {
    const output = { version: '1.0', tool: 'create_rectangle', params: {} };
    const result = detectFormatDetailed(output);
    expect(result.version).toBe('1.0');
  });

  it('extracts Claude tool ID when available', () => {
    const claudeOutput = {
      type: 'tool_use',
      id: 'toolu_abc123',
      name: 'create_rectangle',
      input: {},
    };
    const result = detectFormatDetailed(claudeOutput);
    expect(result.format).toBe('claude_tool_use');
    expect(result.metadata?.['toolId']).toBe('toolu_abc123');
  });
});

// =============================================================================
// Format Normalizer Tests
// =============================================================================

describe('FormatNormalizer', () => {
  let normalizer: FormatNormalizer;

  beforeEach(() => {
    normalizer = new FormatNormalizer();
  });

  describe('normalize', () => {
    it('normalizes Claude tool_use format', () => {
      const claudeOutput = {
        type: 'tool_use',
        name: 'create_rectangle',
        input: { x: 100, y: 100, width: 200, height: 150 },
      };

      const result = normalizer.normalize(claudeOutput, 'claude');
      expect(result).toHaveLength(1);
      expect(result[0]!.tool).toBe('create_rectangle');
      expect(result[0]!.parameters).toEqual({ x: 100, y: 100, width: 200, height: 150 });
    });

    it('normalizes Claude content array format', () => {
      const claudeOutput = {
        content: [
          { type: 'text', text: 'Creating a rectangle' },
          { type: 'tool_use', name: 'create_rectangle', input: { x: 100, y: 100 } },
          { type: 'tool_use', name: 'set_fill_color', input: { color: '#ff0000' } },
        ],
      };

      const result = normalizer.normalize(claudeOutput, 'claude');
      expect(result).toHaveLength(2);
      expect(result[0]!.tool).toBe('create_rectangle');
      expect(result[1]!.tool).toBe('set_fill_color');
    });

    it('normalizes OpenAI function call format', () => {
      const openaiOutput = {
        choices: [{
          message: {
            tool_calls: [{
              function: {
                name: 'create_rectangle',
                arguments: '{"x":100,"y":100,"width":200}',
              },
            }],
          },
        }],
      };

      const result = normalizer.normalize(openaiOutput, 'openai');
      expect(result).toHaveLength(1);
      expect(result[0]!.tool).toBe('create_rectangle');
      expect(result[0]!.parameters).toEqual({ x: 100, y: 100, width: 200 });
    });

    it('normalizes Ollama commands format', () => {
      const ollamaOutput = {
        commands: [
          { tool: 'create_rectangle', params: { x: 100, y: 100 } },
          { tool: 'set_fill_color', params: { color: 'blue' } },
        ],
      };

      const result = normalizer.normalize(ollamaOutput, 'ollama');
      expect(result).toHaveLength(2);
      expect(result[0]!.tool).toBe('create_rectangle');
      expect(result[1]!.tool).toBe('set_fill_color');
    });

    it('normalizes single Ollama tool call', () => {
      const ollamaOutput = {
        tool: 'create_rectangle',
        params: { x: 100, y: 100, width: 200 },
      };

      const result = normalizer.normalize(ollamaOutput, 'ollama');
      expect(result).toHaveLength(1);
      expect(result[0]!.tool).toBe('create_rectangle');
    });

    it('normalizes Gemini function call format', () => {
      const geminiOutput = {
        functionCall: {
          name: 'create_rectangle',
          args: { x: 100, y: 100 },
        },
      };

      const result = normalizer.normalize(geminiOutput, 'gemini');
      expect(result).toHaveLength(1);
      expect(result[0]!.tool).toBe('create_rectangle');
    });

    it('normalizes generic actions array', () => {
      const genericOutput = {
        actions: [
          { name: 'create_rectangle', parameters: { x: 100 } },
          { name: 'move', parameters: { x: 10, y: 20 } },
        ],
      };

      const result = normalizer.normalize(genericOutput, 'unknown');
      expect(result).toHaveLength(2);
    });

    it('extracts from markdown code blocks', () => {
      const markdownOutput = `Here's the command:
\`\`\`json
{"tool": "create_rectangle", "params": {"x": 100, "y": 100}}
\`\`\``;

      const result = normalizer.normalize(markdownOutput, 'unknown');
      expect(result).toHaveLength(1);
      expect(result[0]!.tool).toBe('create_rectangle');
    });

    it('returns empty array for non-tool content', () => {
      const result = normalizer.normalize('Hello world', 'unknown');
      expect(result).toHaveLength(0);
    });

    it('returns empty array for empty object', () => {
      const result = normalizer.normalize({}, 'unknown');
      expect(result).toHaveLength(0);
    });
  });
});

// =============================================================================
// Convenience Function Tests
// =============================================================================

describe('normalizeModelOutput', () => {
  it('normalizes with default settings', () => {
    const output = { tool: 'move', parameters: { x: 10, y: 20 } };
    const result = normalizeModelOutput(output);
    expect(result).toHaveLength(1);
    expect(result[0]!.tool).toBe('move');
  });
});

describe('detectAndNormalize', () => {
  it('detects format and normalizes in one call', () => {
    const output = {
      commands: [{ tool: 'create_rectangle', params: { x: 0, y: 0 } }],
    };

    const { format, toolCalls } = detectAndNormalize(output, 'ollama');
    expect(format.format).toBe('ollama_json');
    expect(toolCalls).toHaveLength(1);
  });
});

describe('hasToolCalls', () => {
  it('returns true when output has tool calls', () => {
    const output = { tool: 'create_rectangle', params: { x: 0 } };
    expect(hasToolCalls(output)).toBe(true);
  });

  it('returns false when output has no tool calls', () => {
    const output = { message: 'Hello!' };
    expect(hasToolCalls(output)).toBe(false);
  });

  it('returns false for unknown format', () => {
    expect(hasToolCalls('plain text')).toBe(false);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Full Normalization Pipeline', () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  it('normalizes real-world Claude response', () => {
    const claudeResponse = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [
        { type: 'text', text: 'I\'ll create a blue button for you.' },
        {
          type: 'tool_use',
          id: 'toolu_01',
          name: 'create_rectangle',
          input: { x: 100, y: 100, width: 120, height: 48, cornerRadius: 8 },
        },
        {
          type: 'tool_use',
          id: 'toolu_02',
          name: 'set_fill_color',
          input: { color: '#3B82F6' },
        },
      ],
    };

    const normalizer = new FormatNormalizer();
    const result = normalizer.normalize(claudeResponse, 'claude');

    expect(result).toHaveLength(2);
    expect(result[0]!.tool).toBe('create_rectangle');
    expect(result[0]!.parameters['cornerRadius']).toBe(8);
    expect(result[1]!.tool).toBe('set_fill_color');
    expect(result[1]!.parameters['color']).toBe('#3B82F6');
  });

  it('normalizes real-world Qwen response', () => {
    const qwenResponse = {
      thinking: 'The user wants a submit button with rounded corners and shadow',
      commands: [
        {
          tool: 'create_rectangle',
          params: { x: 100, y: 100, width: 120, height: 48, cornerRadius: 8 },
        },
        {
          tool: 'add_drop_shadow',
          params: { offsetX: 0, offsetY: 4, blur: 12, color: 'rgba(0,0,0,0.1)' },
        },
      ],
      response: 'Created a submit button with rounded corners and shadow',
    };

    const normalizer = new FormatNormalizer();
    const result = normalizer.normalize(qwenResponse, 'qwen');

    expect(result).toHaveLength(2);
    expect(result[0]!.tool).toBe('create_rectangle');
    expect(result[1]!.tool).toBe('add_drop_shadow');
  });
});
