/**
 * Streaming Parser
 *
 * Provides token-by-token and character-by-character parsing for streaming
 * AI model responses. Enables real-time tool call detection before the
 * complete response is received.
 */

import type {
  ParseState,
  ParseProgress,
  ParsingUpdate,
  ParsingResult,
  NormalizedToolCall,
  ParserContext,
  ModelType,
} from './types';
import { AIOutputParser, type AIOutputParserConfig } from './ai-output-parser';
import { detectFormat } from './format-normalizer';

// =============================================================================
// Types
// =============================================================================

export interface StreamingParserConfig extends AIOutputParserConfig {
  /** Minimum buffer size before attempting parse */
  minBufferSize: number;
  /** Maximum buffer size before forcing parse attempt */
  maxBufferSize: number;
  /** Emit progress updates at this interval (ms) */
  progressInterval: number;
  /** Attempt to parse incomplete JSON */
  parseIncomplete: boolean;
}

const DEFAULT_STREAMING_CONFIG: StreamingParserConfig = {
  minBufferSize: 10,
  maxBufferSize: 50000,
  progressInterval: 100,
  parseIncomplete: true,
};

export interface PartialToolCall {
  /** Detected tool name (may be partial) */
  tool?: string;
  /** Partial parameters detected */
  parameters?: Record<string, unknown>;
  /** Confidence in this partial detection */
  confidence: number;
  /** Whether this appears complete */
  isComplete: boolean;
}

// =============================================================================
// Incremental JSON Parser
// =============================================================================

/**
 * Character-by-character JSON parser for streaming responses.
 * Tracks JSON structure state without full parsing until complete.
 */
export class IncrementalJSONParser {
  private stack: string[] = [];
  private buffer: string = '';
  private inString: boolean = false;
  private escapeNext: boolean = false;
  private completedObjects: unknown[] = [];
  private lastCompleteEnd: number = 0;

  /**
   * Reset parser state
   */
  reset(): void {
    this.stack = [];
    this.buffer = '';
    this.inString = false;
    this.escapeNext = false;
    this.completedObjects = [];
    this.lastCompleteEnd = 0;
  }

  /**
   * Feed a single character to the parser
   */
  feedChar(char: string): ParseProgress {
    this.buffer += char;

    // Track JSON structure
    if (!this.inString) {
      if (char === '{' || char === '[') {
        this.stack.push(char);
      } else if (char === '}') {
        if (this.stack.length > 0 && this.stack[this.stack.length - 1] === '{') {
          this.stack.pop();
        }
      } else if (char === ']') {
        if (this.stack.length > 0 && this.stack[this.stack.length - 1] === '[') {
          this.stack.pop();
        }
      } else if (char === '"') {
        this.inString = true;
      }
    } else {
      // Inside string
      if (this.escapeNext) {
        this.escapeNext = false;
      } else if (char === '\\') {
        this.escapeNext = true;
      } else if (char === '"') {
        this.inString = false;
      }
    }

    // Check if we have a complete JSON object
    if (this.stack.length === 0 && !this.inString && this.buffer.trim().length > 0) {
      try {
        // Try to extract the last complete JSON
        const jsonPortion = this.extractLastJson();
        if (jsonPortion) {
          const parsed = JSON.parse(jsonPortion);
          this.completedObjects.push(parsed);
          this.lastCompleteEnd = this.buffer.length;

          return {
            state: 'complete',
            depth: 0,
            inString: false,
            buffer: this.buffer,
            completedObjects: [...this.completedObjects],
          };
        }
      } catch {
        // Not valid JSON yet, continue accumulating
      }
    }

    // Return partial state
    return {
      state: this.stack.length > 0 || this.inString ? 'partial' : 'idle',
      depth: this.stack.length,
      inString: this.inString,
      buffer: this.buffer,
      completedObjects: [...this.completedObjects],
    };
  }

  /**
   * Feed a chunk of text (multiple characters)
   */
  feed(text: string): ParseProgress {
    let lastProgress: ParseProgress = {
      state: 'idle',
      depth: 0,
      inString: false,
      buffer: this.buffer,
    };

    for (const char of text) {
      lastProgress = this.feedChar(char);

      // If we found a complete object, check if there's more
      if (lastProgress.state === 'complete') {
        // Continue processing to find more objects
      }
    }

    return lastProgress;
  }

  /**
   * Extract the last complete JSON from the buffer
   */
  private extractLastJson(): string | null {
    const trimmed = this.buffer.trim();
    if (!trimmed) return null;

    // Find the start of JSON (first { or [)
    let start = -1;
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === '{' || trimmed[i] === '[') {
        start = i;
        break;
      }
    }

    if (start === -1) return null;

    // Try to parse from start to end
    const jsonCandidate = trimmed.slice(start);
    try {
      JSON.parse(jsonCandidate);
      return jsonCandidate;
    } catch {
      return null;
    }
  }

  /**
   * Get current parsing state
   */
  getState(): ParseProgress {
    return {
      state: this.stack.length > 0 || this.inString ? 'partial' : 'idle',
      depth: this.stack.length,
      inString: this.inString,
      buffer: this.buffer,
      completedObjects: [...this.completedObjects],
    };
  }

  /**
   * Get the current buffer
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * Get completed objects found so far
   */
  getCompletedObjects(): unknown[] {
    return [...this.completedObjects];
  }

  /**
   * Check if parser is currently inside a JSON structure
   */
  isInProgress(): boolean {
    return this.stack.length > 0 || this.inString;
  }

  /**
   * Attempt to complete truncated JSON
   */
  attemptCompletion(): unknown | null {
    if (this.stack.length === 0) return null;

    let completed = this.buffer;

    // Close all open structures
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const opener = this.stack[i];
      if (opener === '{') {
        // Check if we need to close a string first
        if (this.inString) {
          completed += '"';
        }
        completed += '}';
      } else if (opener === '[') {
        if (this.inString) {
          completed += '"';
        }
        completed += ']';
      }
    }

    try {
      return JSON.parse(completed);
    } catch {
      return null;
    }
  }
}

// =============================================================================
// Streaming Parser
// =============================================================================

/**
 * High-level streaming parser that wraps IncrementalJSONParser
 * and integrates with AIOutputParser for tool call extraction.
 */
export class StreamingParser {
  private config: StreamingParserConfig;
  private parser: AIOutputParser;
  private incrementalParser: IncrementalJSONParser;
  private modelType: ModelType;
  private lastParseTime: number = 0;
  private partialToolCalls: PartialToolCall[] = [];

  constructor(
    modelType: ModelType = 'unknown',
    config: Partial<StreamingParserConfig> = {}
  ) {
    this.config = { ...DEFAULT_STREAMING_CONFIG, ...config };
    this.parser = new AIOutputParser(config);
    this.incrementalParser = new IncrementalJSONParser();
    this.modelType = modelType;
  }

  /**
   * Reset parser state for a new stream
   */
  reset(): void {
    this.incrementalParser.reset();
    this.lastParseTime = 0;
    this.partialToolCalls = [];
  }

  /**
   * Feed a token/chunk to the parser
   */
  feedToken(token: string): ParseProgress {
    const progress = this.incrementalParser.feed(token);

    // Update partial tool call detection
    if (progress.state === 'partial' || progress.state === 'complete') {
      this.detectPartialToolCalls(progress);
    }

    return {
      ...progress,
      partialToolCalls: [...this.partialToolCalls],
    };
  }

  /**
   * Parse stream as async generator
   */
  async *parseStream(
    stream: AsyncIterable<string>,
    context?: Partial<ParserContext>
  ): AsyncGenerator<ParsingUpdate> {
    this.reset();
    let lastYieldTime = Date.now();

    for await (const chunk of stream) {
      const progress = this.feedToken(chunk);

      // Yield progress updates at intervals
      const now = Date.now();
      if (now - lastYieldTime >= this.config.progressInterval) {
        yield {
          type: 'incremental',
          data: progress,
          bufferLength: progress.buffer.length,
          timestamp: new Date(),
        };
        lastYieldTime = now;
      }

      // If we found complete objects, try to parse them
      if (progress.completedObjects && progress.completedObjects.length > 0) {
        for (const obj of progress.completedObjects) {
          const detected = detectFormat(obj);
          if (detected.confidence > 0.5) {
            // We have a likely tool call, yield it
            yield {
              type: 'incremental',
              data: progress,
              bufferLength: progress.buffer.length,
              timestamp: new Date(),
            };
          }
        }
      }
    }

    // Final parse with full buffer
    const buffer = this.incrementalParser.getBuffer();
    try {
      const result = await this.parser.parse(buffer, {
        modelType: this.modelType,
        ...context,
      });

      yield {
        type: 'complete',
        data: result,
        bufferLength: buffer.length,
        timestamp: new Date(),
      };
    } catch (error) {
      yield {
        type: 'error',
        data: {
          state: 'error',
          depth: 0,
          inString: false,
          buffer,
        },
        bufferLength: buffer.length,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Try to get current tool calls from buffer
   */
  async tryParse(context?: Partial<ParserContext>): Promise<ParsingResult | null> {
    const buffer = this.incrementalParser.getBuffer();
    if (buffer.length < this.config.minBufferSize) {
      return null;
    }

    try {
      return await this.parser.parse(buffer, {
        modelType: this.modelType,
        ...context,
      });
    } catch {
      return null;
    }
  }

  /**
   * Get partial tool calls detected so far
   */
  getPartialToolCalls(): PartialToolCall[] {
    return [...this.partialToolCalls];
  }

  /**
   * Attempt to complete and parse incomplete JSON
   */
  async parseIncomplete(context?: Partial<ParserContext>): Promise<ParsingResult | null> {
    const completed = this.incrementalParser.attemptCompletion();
    if (!completed) {
      return null;
    }

    try {
      const result = await this.parser.parse(JSON.stringify(completed), {
        modelType: this.modelType,
        ...context,
      });

      // Mark as incomplete parse with reduced confidence
      if (result.success) {
        result.metadata.confidence *= 0.7;
        result.metadata.warnings.push({
          path: [],
          message: 'Parsed from incomplete JSON (auto-completed)',
        });
      }

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Detect partial tool calls from current state
   */
  private detectPartialToolCalls(progress: ParseProgress): void {
    const buffer = progress.buffer;

    // Look for tool name patterns
    const toolPatterns = [
      /"tool"\s*:\s*"([^"]+)"/,
      /"name"\s*:\s*"([^"]+)"/,
      /"function"\s*:\s*"([^"]+)"/,
      /"action"\s*:\s*"([^"]+)"/,
    ];

    for (const pattern of toolPatterns) {
      const match = buffer.match(pattern);
      if (match && match[1]) {
        const toolName = match[1];

        // Check if we already have this tool
        const existing = this.partialToolCalls.find((tc) => tc.tool === toolName);
        if (!existing) {
          this.partialToolCalls.push({
            tool: toolName,
            parameters: {},
            confidence: progress.state === 'complete' ? 0.9 : 0.5,
            isComplete: progress.state === 'complete',
          });
        } else {
          existing.confidence = progress.state === 'complete' ? 0.9 : 0.5;
          existing.isComplete = progress.state === 'complete';
        }
      }
    }

    // Try to extract parameters for detected tools
    for (const tc of this.partialToolCalls) {
      if (!tc.tool) continue;

      // Look for parameters near the tool name
      const paramsPatterns = [
        new RegExp(`"tool"\\s*:\\s*"${tc.tool}"[^}]*"params"\\s*:\\s*\\{([^}]*)`, 's'),
        new RegExp(`"tool"\\s*:\\s*"${tc.tool}"[^}]*"parameters"\\s*:\\s*\\{([^}]*)`, 's'),
        new RegExp(`"tool"\\s*:\\s*"${tc.tool}"[^}]*"input"\\s*:\\s*\\{([^}]*)`, 's'),
      ];

      for (const pattern of paramsPatterns) {
        const match = buffer.match(pattern);
        if (match) {
          // Try to parse partial parameters
          try {
            const partialParams = '{' + match[1] + '}';
            const parsed = JSON.parse(partialParams);
            tc.parameters = { ...tc.parameters, ...parsed };
          } catch {
            // Can't parse yet, try key-value extraction
            const kvPattern = /"(\w+)"\s*:\s*("[^"]*"|\d+\.?\d*|true|false|null)/g;
            let kvMatch;
            while ((kvMatch = kvPattern.exec(match[1])) !== null) {
              try {
                tc.parameters = tc.parameters || {};
                tc.parameters[kvMatch[1]!] = JSON.parse(kvMatch[2]!);
              } catch {
                // Skip unparseable value
              }
            }
          }
          break;
        }
      }
    }
  }

  /**
   * Get current parser state
   */
  getState(): ParseProgress {
    const state = this.incrementalParser.getState();
    return {
      ...state,
      partialToolCalls: this.partialToolCalls.map((tc) => ({
        id: `partial_${Date.now()}`,
        tool: tc.tool || 'unknown',
        parameters: tc.parameters || {},
        confidence: tc.confidence,
        sourceFormat: 'unknown' as const,
        rawData: null,
        metadata: {
          model: this.modelType,
          timestamp: new Date(),
          parsingMethod: 'streaming',
          sourceFormat: 'unknown' as const,
          extractionMethod: 'ast_balanced' as const,
        },
      })) as Partial<NormalizedToolCall>[],
    };
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a streaming parser with default settings
 */
export function createStreamingParser(
  modelType: ModelType = 'unknown',
  config: Partial<StreamingParserConfig> = {}
): StreamingParser {
  return new StreamingParser(modelType, config);
}

/**
 * Parse a stream of tokens into tool calls
 */
export async function parseTokenStream(
  stream: AsyncIterable<string>,
  modelType: ModelType = 'unknown',
  context?: Partial<ParserContext>
): Promise<ParsingResult> {
  const parser = new StreamingParser(modelType);
  let finalResult: ParsingResult | null = null;

  for await (const update of parser.parseStream(stream, context)) {
    if (update.type === 'complete' && 'success' in update.data) {
      finalResult = update.data as ParsingResult;
    }
  }

  if (!finalResult) {
    return {
      success: false,
      error: 'Stream ended without producing a result',
      errors: [],
      suggestions: ['Ensure the stream contains valid tool call JSON'],
      metadata: { parsingTime: 0 },
    };
  }

  return finalResult;
}

/**
 * Create an async iterable from an array (for testing)
 */
export async function* arrayToStream(tokens: string[]): AsyncIterable<string> {
  for (const token of tokens) {
    yield token;
  }
}
