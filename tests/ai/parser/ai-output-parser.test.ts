/**
 * Tests for AI Output Parser Module
 *
 * Tests the main parser class that ties together extraction, validation,
 * normalization, and fallback strategies.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AIOutputParser,
  createParser,
  parseAIOutput,
  parseAIOutputSync,
  canParseOutput,
  resetDefaultRegistry,
} from '../../../src/ai/parser';

// =============================================================================
// AIOutputParser Tests
// =============================================================================

describe('AIOutputParser', () => {
  let parser: AIOutputParser;

  beforeEach(() => {
    resetDefaultRegistry();
    parser = new AIOutputParser();
  });

  describe('parse', () => {
    it('parses Claude tool_use format', async () => {
      const claudeOutput = JSON.stringify({
        type: 'tool_use',
        name: 'create_rectangle',
        input: { x: 100, y: 100, width: 200, height: 150 },
      });

      const result = await parser.parse(claudeOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.toolCalls).toHaveLength(1);
        const tc = result.toolCalls[0]!;
        expect(tc.tool).toBe('create_rectangle');
        expect(tc.parameters).toEqual({ x: 100, y: 100, width: 200, height: 150 });
      }
    });

    it('parses OpenAI function call format', async () => {
      const openaiOutput = JSON.stringify({
        choices: [{
          message: {
            tool_calls: [{
              function: {
                name: 'create_rectangle',
                arguments: '{"x":100,"y":100}',
              },
            }],
          },
        }],
      });

      const result = await parser.parse(openaiOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls[0]!.tool).toBe('create_rectangle');
      }
    });

    it('parses Ollama JSON format', async () => {
      const ollamaOutput = JSON.stringify({
        commands: [
          { tool: 'create_rectangle', params: { x: 0, y: 0, width: 100, height: 100 } },
        ],
      });

      const result = await parser.parse(ollamaOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls[0]!.tool).toBe('create_rectangle');
      }
    });

    it('parses markdown code blocks', async () => {
      const markdownOutput = `Here's what I'll do:
\`\`\`json
{"tool": "create_rectangle", "params": {"x": 50, "y": 50}}
\`\`\``;

      const result = await parser.parse(markdownOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls[0]!.tool).toBe('create_rectangle');
      }
    });

    it('handles multiple tool calls in one response', async () => {
      const multiOutput = JSON.stringify({
        commands: [
          { tool: 'create_rectangle', params: { x: 0, y: 0, width: 100, height: 100 } },
          { tool: 'set_fill_color', params: { color: '#ff0000' } },
          { tool: 'move', params: { x: 50, y: 50 } },
        ],
      });

      const result = await parser.parse(multiOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.toolCalls).toHaveLength(3);
        expect(result.toolCalls[0]!.tool).toBe('create_rectangle');
        expect(result.toolCalls[1]!.tool).toBe('set_fill_color');
        expect(result.toolCalls[2]!.tool).toBe('move');
      }
    });

    it('returns failure for plain text without JSON', async () => {
      const plainText = 'Hello, I cannot help with that request.';
      const result = await parser.parse(plainText);
      expect(result.success).toBe(false);
    });

    it('returns failure for empty input', async () => {
      const result = await parser.parse('');
      expect(result.success).toBe(false);
    });

    it('includes parsing metadata on success', async () => {
      const output = JSON.stringify({ tool: 'move', parameters: { x: 10, y: 20 } });
      const result = await parser.parse(output);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.metadata).toBeDefined();
        expect(result.metadata.parsingTime).toBeGreaterThanOrEqual(0);
        expect(result.metadata.extractionMethod).toBeDefined();
      }
    });

    it('includes suggestions on failure', async () => {
      const result = await parser.parse('not valid json at all');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('parseWithModel', () => {
    it('uses model type for context', async () => {
      const output = JSON.stringify({
        type: 'tool_use',
        name: 'create_rectangle',
        input: { x: 0, y: 0, width: 100, height: 100 },
      });

      const result = await parser.parseWithModel(output, 'claude');
      expect(result.success).toBe(true);
    });
  });

  describe('parseSync', () => {
    it('returns tool calls for valid input', () => {
      const output = JSON.stringify({ tool: 'move', parameters: { x: 10, y: 20 } });
      const result = parser.parseSync(output);

      expect(result).toHaveLength(1);
      expect(result[0]!.tool).toBe('move');
    });

    it('returns empty array for invalid input', () => {
      const result = parser.parseSync('not json');
      expect(result).toHaveLength(0);
    });
  });

  describe('canParse', () => {
    it('returns true for parseable output', () => {
      const output = JSON.stringify({ tool: 'create_rectangle', params: { x: 0 } });
      expect(parser.canParse(output)).toBe(true);
    });

    it('returns false for non-parseable output', () => {
      expect(parser.canParse('plain text')).toBe(false);
    });

    it('returns false for empty output', () => {
      expect(parser.canParse('')).toBe(false);
    });
  });

  describe('registerTool', () => {
    it('registers custom tools', () => {
      parser.registerTool({
        id: 'tool_custom_action',
        name: 'custom_action',
        description: 'A custom action',
        parameters: {
          type: 'object',
          properties: {
            value: { type: 'string', description: 'A value' },
          },
          required: ['value'],
        },
      });

      const registry = parser.getRegistry();
      expect(registry.has('custom_action')).toBe(true);
    });
  });

  describe('configure', () => {
    it('updates parser configuration', () => {
      parser.configure({ attemptRepairs: false });
      const config = parser.getConfig();
      expect(config.attemptRepairs).toBe(false);
    });
  });
});

// =============================================================================
// Convenience Function Tests
// =============================================================================

describe('createParser', () => {
  it('creates parser with default config', () => {
    const parser = createParser();
    expect(parser).toBeInstanceOf(AIOutputParser);
  });

  it('creates parser with custom config', () => {
    const parser = createParser({
      attemptRepairs: false,
      useFallbacks: false,
    });
    const config = parser.getConfig();
    expect(config.attemptRepairs).toBe(false);
    expect(config.useFallbacks).toBe(false);
  });
});

describe('parseAIOutput', () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  it('parses output with default settings', async () => {
    const output = JSON.stringify({ tool: 'move', parameters: { x: 10, y: 20 } });
    const result = await parseAIOutput(output);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.toolCalls).toHaveLength(1);
    }
  });

  it('accepts model type parameter', async () => {
    const output = JSON.stringify({
      type: 'tool_use',
      name: 'create_rectangle',
      input: { x: 0, y: 0, width: 100, height: 100 },
    });

    const result = await parseAIOutput(output, 'claude');
    expect(result.success).toBe(true);
  });
});

describe('parseAIOutputSync', () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  it('returns tool calls synchronously', () => {
    const output = JSON.stringify({ tool: 'move', params: { x: 10, y: 20 } });
    const result = parseAIOutputSync(output);

    expect(result).toHaveLength(1);
    expect(result[0]!.tool).toBe('move');
  });
});

describe('canParseOutput', () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  it('returns true for valid output', () => {
    const output = JSON.stringify({ tool: 'create_rectangle', params: {} });
    expect(canParseOutput(output)).toBe(true);
  });

  it('returns false for invalid output', () => {
    expect(canParseOutput('not json')).toBe(false);
  });
});

// =============================================================================
// Repair and Fallback Tests
// =============================================================================

describe('Repair Strategies', () => {
  let parser: AIOutputParser;

  beforeEach(() => {
    resetDefaultRegistry();
    parser = new AIOutputParser({ attemptRepairs: true });
  });

  it('repairs trailing comma in JSON', async () => {
    const malformedJson = '{"tool": "move", "params": {"x": 10, "y": 20,}}';
    const result = await parser.parse(malformedJson);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.toolCalls[0]!.tool).toBe('move');
    }
  });

  it('repairs unquoted keys', async () => {
    const unquotedKeys = '{tool: "create_rectangle", params: {x: 100}}';
    const result = await parser.parse(unquotedKeys);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.toolCalls[0]!.tool).toBe('create_rectangle');
    }
  });

  it('repairs single quotes', async () => {
    const singleQuotes = "{'tool': 'move', 'params': {'x': 50}}";
    const result = await parser.parse(singleQuotes);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.toolCalls[0]!.tool).toBe('move');
    }
  });
});

describe('Fallback Strategies', () => {
  let parser: AIOutputParser;

  beforeEach(() => {
    resetDefaultRegistry();
    parser = new AIOutputParser({ useFallbacks: true });
  });

  it('uses lenient extraction as fallback', async () => {
    // JSON embedded in text noise
    const noisyOutput = 'Sure! Here is the command: {"tool":"move","params":{"x":10}} Let me know if you need more.';
    const result = await parser.parse(noisyOutput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.toolCalls[0]!.tool).toBe('move');
    }
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Full Parsing Pipeline', () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  it('handles real-world Claude response', async () => {
    const claudeResponse = `{
      "id": "msg_123",
      "type": "message",
      "role": "assistant",
      "content": [
        {"type": "text", "text": "I'll create a button for you."},
        {
          "type": "tool_use",
          "id": "toolu_01",
          "name": "create_rectangle",
          "input": {"x": 100, "y": 100, "width": 120, "height": 48}
        },
        {
          "type": "tool_use",
          "id": "toolu_02",
          "name": "set_fill_color",
          "input": {"color": "#3B82F6"}
        }
      ]
    }`;

    const parser = new AIOutputParser();
    const result = await parser.parse(claudeResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls[0]!.tool).toBe('create_rectangle');
      expect(result.toolCalls[1]!.tool).toBe('set_fill_color');
    }
  });

  it('handles real-world Qwen/local model response', async () => {
    const qwenResponse = `{
      "thinking": "The user wants a submit button with rounded corners",
      "commands": [
        {
          "tool": "create_rectangle",
          "params": {"x": 100, "y": 100, "width": 120, "height": 48, "cornerRadius": 8}
        },
        {
          "tool": "add_drop_shadow",
          "params": {"offsetX": 0, "offsetY": 4, "blur": 12}
        }
      ],
      "response": "Created a submit button"
    }`;

    const parser = new AIOutputParser();
    const result = await parser.parse(qwenResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.toolCalls).toHaveLength(2);
      const tc = result.toolCalls[0]!;
      expect(tc.tool).toBe('create_rectangle');
      expect(tc.parameters['cornerRadius']).toBe(8);
    }
  });

  it('handles mixed content with multiple JSON blocks', async () => {
    const mixedContent = `
I'll help you create a layout. First, let me create a frame:

\`\`\`json
{"tool": "create_frame", "params": {"x": 0, "y": 0, "width": 400, "height": 300}}
\`\`\`

Then I'll add a button inside:

\`\`\`json
{"tool": "create_rectangle", "params": {"x": 20, "y": 20, "width": 100, "height": 40}}
\`\`\`
`;

    const parser = new AIOutputParser();
    const result = await parser.parse(mixedContent);

    expect(result.success).toBe(true);
    if (result.success) {
      // Should extract at least one tool call (first one typically)
      expect(result.toolCalls.length).toBeGreaterThan(0);
    }
  });
});
