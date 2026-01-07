/**
 * Text Tool Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseTextToolCalls, mayContainToolCalls } from '@ai/tools/text-tool-parser';

describe('parseTextToolCalls', () => {
  describe('JSON code blocks', () => {
    it('parses tool call from json code block', () => {
      const text = `I'll create a rectangle.

\`\`\`json
{
  "tool": "create_rectangle",
  "parameters": {
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 150
  }
}
\`\`\`

Done!`;

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0]!.name).toBe('create_rectangle');
      expect(calls[0]!.arguments).toEqual({
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      });
    });

    it('parses multiple tool calls from code blocks', () => {
      const text = `Creating a button...

\`\`\`json
{
  "tool": "create_rectangle",
  "parameters": { "x": 100, "y": 100, "width": 120, "height": 40 }
}
\`\`\`

Adding text...

\`\`\`json
{
  "tool": "create_text",
  "parameters": { "x": 130, "y": 110, "text": "Submit" }
}
\`\`\``;

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(2);
      expect(calls[0]!.name).toBe('create_rectangle');
      expect(calls[1]!.name).toBe('create_text');
      expect(calls[1]!.arguments).toHaveProperty('text', 'Submit');
    });

    it('parses code block without json language specifier', () => {
      const text = `\`\`\`
{ "tool": "select_all", "parameters": {} }
\`\`\``;

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0]!.name).toBe('select_all');
    });
  });

  describe('alternative formats', () => {
    it('parses name/arguments format', () => {
      const text = `\`\`\`json
{
  "name": "create_ellipse",
  "arguments": { "x": 50, "y": 50, "width": 100, "height": 100 }
}
\`\`\``;

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0]!.name).toBe('create_ellipse');
      expect(calls[0]!.arguments).toEqual({
        x: 50, y: 50, width: 100, height: 100
      });
    });

    it('parses function/args format', () => {
      const text = `\`\`\`json
{
  "function": "set_fill_color",
  "args": { "r": 255, "g": 0, "b": 0 }
}
\`\`\``;

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0]!.name).toBe('set_fill_color');
      expect(calls[0]!.arguments).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses flat format with parameters at root', () => {
      const text = `\`\`\`json
{
  "tool": "set_position",
  "x": 200,
  "y": 300
}
\`\`\``;

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0]!.name).toBe('set_position');
      expect(calls[0]!.arguments).toEqual({ x: 200, y: 300 });
    });
  });

  describe('inline JSON', () => {
    it('parses inline JSON when no code blocks present', () => {
      const text = 'I will now execute { "tool": "zoom_to_fit", "parameters": {} } to fit the view.';

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0]!.name).toBe('zoom_to_fit');
    });

    it('prefers code blocks over inline JSON', () => {
      const text = `Here is the tool call { "tool": "ignored", "parameters": {} }

\`\`\`json
{ "tool": "preferred", "parameters": {} }
\`\`\``;

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0]!.name).toBe('preferred');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for text without tool calls', () => {
      const text = 'This is just regular text without any JSON.';
      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(0);
    });

    it('handles malformed JSON gracefully', () => {
      const text = `\`\`\`json
{ "tool": "broken", "parameters": { incomplete
\`\`\``;

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(0);
    });

    it('deduplicates identical tool calls', () => {
      const text = `\`\`\`json
{ "tool": "select_all", "parameters": {} }
\`\`\`

Let me repeat:

\`\`\`json
{ "tool": "select_all", "parameters": {} }
\`\`\``;

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(1);
    });

    it('ignores JSON without tool name field', () => {
      const text = `\`\`\`json
{ "data": "not a tool call", "value": 123 }
\`\`\``;

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(0);
    });

    it('handles nested parameters correctly', () => {
      const text = `\`\`\`json
{
  "tool": "set_fill_color",
  "parameters": {
    "color": { "r": 0.2, "g": 0.6, "b": 1, "a": 1 }
  }
}
\`\`\``;

      const calls = parseTextToolCalls(text);
      expect(calls).toHaveLength(1);
      expect(calls[0]!.arguments).toEqual({
        color: { r: 0.2, g: 0.6, b: 1, a: 1 }
      });
    });
  });
});

describe('mayContainToolCalls', () => {
  it('returns true for text with json code block', () => {
    expect(mayContainToolCalls('```json\n{')).toBe(true);
  });

  it('returns true for text with tool field', () => {
    expect(mayContainToolCalls('{ "tool": "test" }')).toBe(true);
  });

  it('returns true for text with name field', () => {
    expect(mayContainToolCalls('{ "name": "test" }')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(mayContainToolCalls('Just some regular text.')).toBe(false);
  });

  it('returns false for unrelated JSON', () => {
    expect(mayContainToolCalls('{ "data": "value" }')).toBe(false);
  });
});
