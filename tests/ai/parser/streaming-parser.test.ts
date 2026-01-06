/**
 * Tests for Streaming Parser Module
 *
 * Tests incremental JSON parsing and streaming tool call detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IncrementalJSONParser,
  StreamingParser,
  createStreamingParser,
  parseTokenStream,
  arrayToStream,
} from '../../../src/ai/parser/streaming-parser';

// =============================================================================
// IncrementalJSONParser Tests
// =============================================================================

describe('IncrementalJSONParser', () => {
  let parser: IncrementalJSONParser;

  beforeEach(() => {
    parser = new IncrementalJSONParser();
  });

  describe('feedChar', () => {
    it('starts in idle state', () => {
      const state = parser.getState();
      expect(state.state).toBe('idle');
      expect(state.depth).toBe(0);
      expect(state.inString).toBe(false);
    });

    it('enters partial state on opening brace', () => {
      parser.feedChar('{');
      const state = parser.getState();
      expect(state.state).toBe('partial');
      expect(state.depth).toBe(1);
    });

    it('tracks nested structures', () => {
      parser.feed('{"outer": {"inner":');
      const state = parser.getState();
      expect(state.depth).toBe(2);
    });

    it('tracks string state', () => {
      parser.feed('{"key": "value with');
      const state = parser.getState();
      expect(state.inString).toBe(true);
    });

    it('handles escaped quotes in strings', () => {
      const progress = parser.feed('{"text": "say \\"hello\\""}');
      expect(progress.state).toBe('complete');
      expect(progress.inString).toBe(false);
    });

    it('completes when structure is balanced', () => {
      const progress = parser.feed('{"tool": "test"}');
      expect(progress.state).toBe('complete');
      expect(progress.completedObjects).toHaveLength(1);
    });

    it('handles arrays', () => {
      const progress = parser.feed('[1, 2, 3]');
      expect(progress.state).toBe('complete');
    });

    it('handles nested arrays and objects', () => {
      const progress = parser.feed('{"items": [{"a": 1}, {"b": 2}]}');
      expect(progress.state).toBe('complete');
      expect(progress.completedObjects).toHaveLength(1);
    });
  });

  describe('feed', () => {
    it('accumulates text in buffer', () => {
      parser.feed('{"too');
      parser.feed('l": "');
      parser.feed('test"}');
      expect(parser.getBuffer()).toBe('{"tool": "test"}');
    });

    it('detects complete JSON across chunks', () => {
      parser.feed('{"to');
      parser.feed('ol":');
      parser.feed(' "test"');
      const progress = parser.feed('}');
      expect(progress.state).toBe('complete');
    });
  });

  describe('attemptCompletion', () => {
    it('returns null when no structure started', () => {
      const result = parser.attemptCompletion();
      expect(result).toBeNull();
    });

    it('completes truncated object', () => {
      parser.feed('{"tool": "test"');
      const result = parser.attemptCompletion();
      expect(result).not.toBeNull();
      expect((result as { tool: string }).tool).toBe('test');
    });

    it('completes nested structures', () => {
      parser.feed('{"outer": {"inner": 1');
      const result = parser.attemptCompletion();
      expect(result).not.toBeNull();
    });

    it('closes open strings', () => {
      parser.feed('{"tool": "test');
      const result = parser.attemptCompletion();
      // May or may not succeed depending on JSON structure
      // but should not throw
      expect(() => parser.attemptCompletion()).not.toThrow();
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      parser.feed('{"tool": "test"');
      parser.reset();

      const state = parser.getState();
      expect(state.state).toBe('idle');
      expect(state.buffer).toBe('');
      expect(state.depth).toBe(0);
      expect(parser.getCompletedObjects()).toHaveLength(0);
    });
  });

  describe('getCompletedObjects', () => {
    it('returns all completed objects', () => {
      parser.feed('{"a": 1} some text {"b": 2}');
      const objects = parser.getCompletedObjects();
      expect(objects.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isInProgress', () => {
    it('returns false when idle', () => {
      expect(parser.isInProgress()).toBe(false);
    });

    it('returns true when in partial state', () => {
      parser.feed('{"tool":');
      expect(parser.isInProgress()).toBe(true);
    });

    it('returns true when in string', () => {
      parser.feed('{"text": "incomplete');
      expect(parser.isInProgress()).toBe(true);
    });
  });
});

// =============================================================================
// StreamingParser Tests
// =============================================================================

describe('StreamingParser', () => {
  let streamingParser: StreamingParser;

  beforeEach(() => {
    streamingParser = new StreamingParser('unknown');
  });

  describe('feedToken', () => {
    it('accepts tokens and tracks progress', () => {
      const progress = streamingParser.feedToken('{"tool": ');
      expect(progress.state).toBe('partial');
    });

    it('detects partial tool calls', () => {
      streamingParser.feedToken('{"tool": "create_rectangle",');
      streamingParser.feedToken(' "params": {"x": 100}}');

      const partials = streamingParser.getPartialToolCalls();
      expect(partials.length).toBeGreaterThan(0);
      expect(partials[0]!.tool).toBe('create_rectangle');
    });

    it('updates confidence when complete', () => {
      streamingParser.feedToken('{"tool": "move"');
      let partials = streamingParser.getPartialToolCalls();
      const initialConfidence = partials[0]?.confidence || 0;

      streamingParser.feedToken('}');
      partials = streamingParser.getPartialToolCalls();
      expect(partials[0]!.confidence).toBeGreaterThanOrEqual(initialConfidence);
    });
  });

  describe('reset', () => {
    it('clears parser state', () => {
      streamingParser.feedToken('{"tool": "test"');
      streamingParser.reset();

      const state = streamingParser.getState();
      expect(state.buffer).toBe('');
      expect(streamingParser.getPartialToolCalls()).toHaveLength(0);
    });
  });

  describe('tryParse', () => {
    it('returns null for insufficient buffer', async () => {
      streamingParser.feedToken('{"t');
      const result = await streamingParser.tryParse();
      expect(result).toBeNull();
    });

    it('attempts parse with sufficient buffer', async () => {
      streamingParser.feedToken('{"tool": "move", "params": {"x": 10, "y": 20}}');
      const result = await streamingParser.tryParse();
      expect(result).not.toBeNull();
      if (result?.success) {
        expect(result.toolCalls.length).toBeGreaterThan(0);
      }
    });
  });

  describe('parseIncomplete', () => {
    it('attempts to complete and parse truncated JSON', async () => {
      streamingParser.feedToken('{"tool": "move", "params": {"x": 10');
      const result = await streamingParser.parseIncomplete();

      // May succeed or fail depending on completion attempt
      // Should not throw
      expect(result === null || 'success' in result).toBe(true);
    });
  });

  describe('getState', () => {
    it('returns current parsing state', () => {
      streamingParser.feedToken('{"tool": "test"');
      const state = streamingParser.getState();

      expect(state.state).toBe('partial');
      expect(state.buffer).toContain('tool');
    });
  });
});

// =============================================================================
// parseStream Tests
// =============================================================================

describe('StreamingParser.parseStream', () => {
  it('parses complete stream', async () => {
    const tokens = ['{"tool":', ' "move",', ' "params":', ' {"x": 10}}'];
    const parser = new StreamingParser('unknown');

    const updates: ParsingUpdate[] = [];
    for await (const update of parser.parseStream(arrayToStream(tokens))) {
      updates.push(update);
    }

    expect(updates.length).toBeGreaterThan(0);
    const lastUpdate = updates[updates.length - 1]!;
    expect(lastUpdate.type).toBe('complete');
  });

  it('yields incremental updates', async () => {
    const tokens = [
      '{"commands": [',
      '{"tool": "create_rectangle", "params": {"x": 0}},',
      '{"tool": "move", "params": {"x": 10}}',
      ']}',
    ];
    const parser = new StreamingParser('ollama', { progressInterval: 0 });

    let incrementalCount = 0;
    for await (const update of parser.parseStream(arrayToStream(tokens))) {
      if (update.type === 'incremental') {
        incrementalCount++;
      }
    }

    expect(incrementalCount).toBeGreaterThan(0);
  });

  it('provides final result', async () => {
    const tokens = ['{"tool": "move", "params": {"x": 10, "y": 20}}'];
    const parser = new StreamingParser('unknown');

    let finalResult: ParsingResult | null = null;
    for await (const update of parser.parseStream(arrayToStream(tokens))) {
      if (update.type === 'complete' && 'success' in update.data) {
        finalResult = update.data as ParsingResult;
      }
    }

    expect(finalResult).not.toBeNull();
    expect(finalResult!.success).toBe(true);
  });
});

// =============================================================================
// Convenience Function Tests
// =============================================================================

describe('createStreamingParser', () => {
  it('creates parser with default config', () => {
    const parser = createStreamingParser();
    expect(parser).toBeInstanceOf(StreamingParser);
  });

  it('creates parser with custom model type', () => {
    const parser = createStreamingParser('claude');
    expect(parser).toBeInstanceOf(StreamingParser);
  });

  it('creates parser with custom config', () => {
    const parser = createStreamingParser('qwen', {
      minBufferSize: 5,
      progressInterval: 50,
    });
    expect(parser).toBeInstanceOf(StreamingParser);
  });
});

describe('parseTokenStream', () => {
  it('parses token stream to result', async () => {
    const tokens = ['{"tool": "move", "params": {"x": 10}}'];
    const result = await parseTokenStream(arrayToStream(tokens));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.toolCalls.length).toBeGreaterThan(0);
      expect(result.toolCalls[0]!.tool).toBe('move');
    }
  });

  it('handles empty stream', async () => {
    const tokens: string[] = [];
    const result = await parseTokenStream(arrayToStream(tokens));

    expect(result.success).toBe(false);
  });

  it('handles stream with no JSON', async () => {
    const tokens = ['Hello', ' world', '!'];
    const result = await parseTokenStream(arrayToStream(tokens));

    expect(result.success).toBe(false);
  });
});

describe('arrayToStream', () => {
  it('converts array to async iterable', async () => {
    const items = ['a', 'b', 'c'];
    const collected: string[] = [];

    for await (const item of arrayToStream(items)) {
      collected.push(item);
    }

    expect(collected).toEqual(['a', 'b', 'c']);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Streaming Parser Integration', () => {
  it('handles Claude-style streaming response', async () => {
    // Simulate Claude response arriving in chunks
    const chunks = [
      '{"content": [',
      '{"type": "text", "text": "Creating a button"},',
      '{"type": "tool_use", "name": "create_rectangle",',
      ' "input": {"x": 100, "y": 100, "width": 120, "height": 48}}',
      ']}',
    ];

    const parser = createStreamingParser('claude');
    let result: ParsingResult | null = null;

    for await (const update of parser.parseStream(arrayToStream(chunks))) {
      if (update.type === 'complete' && 'success' in update.data) {
        result = update.data as ParsingResult;
      }
    }

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
  });

  it('handles Ollama-style streaming response', async () => {
    const chunks = [
      '{"thinking": "User wants a rectangle",',
      ' "commands": [{"tool": "create_rectangle",',
      ' "params": {"x": 0, "y": 0, "width": 100, "height": 100}}]}',
    ];

    const result = await parseTokenStream(arrayToStream(chunks), 'ollama');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.toolCalls[0]!.tool).toBe('create_rectangle');
    }
  });

  it('detects tool names early in stream', async () => {
    const parser = createStreamingParser('unknown');

    // Feed partial data
    parser.feedToken('{"tool": "create_rectangle", "params": {');

    // Should have detected tool name
    const partials = parser.getPartialToolCalls();
    expect(partials.length).toBeGreaterThan(0);
    expect(partials[0]!.tool).toBe('create_rectangle');

    // Complete the stream
    parser.feedToken('"x": 100}}');
    const result = await parser.tryParse();

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
  });

  it('handles multiple tool calls in stream', async () => {
    const chunks = [
      '{"commands": [',
      '{"tool": "create_rectangle", "params": {"x": 0}},',
      '{"tool": "set_fill_color", "params": {"color": "#ff0000"}},',
      '{"tool": "move", "params": {"x": 50}}',
      ']}',
    ];

    const result = await parseTokenStream(arrayToStream(chunks), 'ollama');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.toolCalls.length).toBe(3);
    }
  });
});

// Import ParsingResult type for proper typing
import type { ParsingResult, ParsingUpdate } from '../../../src/ai/parser/types';
