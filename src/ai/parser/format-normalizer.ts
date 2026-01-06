/**
 * Format Normalizer
 *
 * Converts model-specific AI output formats to universal normalized tool calls.
 * Supports Claude, OpenAI, Ollama/local models, and various JSON formats.
 */

import type {
  OutputFormat,
  ModelType,
  DetectedFormat,
  NormalizedToolCall,
  ToolCallMetadata,
  ParserContext,
  ExtractionMethod,
} from './types';
import type { ToolSchemaRegistry } from './schema-registry';
import { SchemaValidator, type RawToolCall, type ValidatorConfig } from './schema-validator';

// =============================================================================
// Types
// =============================================================================

export interface NormalizerConfig {
  /** Enable strict format detection */
  strictDetection: boolean;
  /** Minimum confidence for format detection */
  detectionThreshold: number;
  /** Schema validator config */
  validatorConfig: Partial<ValidatorConfig>;
}

const DEFAULT_CONFIG: NormalizerConfig = {
  strictDetection: false,
  detectionThreshold: 0.7,
  validatorConfig: {
    fuzzyToolMatching: true,
    fuzzyParamMatching: true,
    enableCoercion: true,
    useDefaults: true,
  },
};

// Format detection patterns - ORDER MATTERS! More specific patterns first.
const FORMAT_PATTERNS = {
  // Markdown must be checked first (before looking at JSON content inside)
  markdown_json: {
    // Markdown code block: ```json ... ```
    patterns: [
      /```json[\s\S]*?```/i,
      /```\s*\{[\s\S]*?\}\s*```/i,
    ],
    confidence: 0.8,
  },
  claude_tool_use: {
    // Claude tool_use block: { type: "tool_use", name: "...", input: {...} }
    patterns: [
      /["']type["']\s*:\s*["']tool_use["']/i,
      /["']content["']\s*:\s*\[[\s\S]*["']type["']\s*:\s*["']tool_use["']/i,
    ],
    confidence: 0.95,
  },
  openai_function_call: {
    // OpenAI: { function: { name: "...", arguments: "..." } }
    patterns: [
      /["']tool_calls["']\s*:\s*\[/i,
      /["']function["']\s*:\s*\{[\s\S]*["']name["']/i,
      /["']arguments["']\s*:\s*["']\{/i,
    ],
    confidence: 0.95,
  },
  gemini_function_call: {
    // Gemini: { functionCall: { name: "...", args: {...} } }
    patterns: [
      /["']functionCall["']\s*:\s*\{/i,
      /["']functionResponse["']\s*:/i,
    ],
    confidence: 0.9,
  },
  ollama_json: {
    // Ollama/Qwen style: { commands: [...], tool: "...", params: {...} }
    patterns: [
      /["']commands["']\s*:\s*\[/i,
      /["']tool["']\s*:\s*["'][^"']+["']/i,
      /["']thinking["']\s*:/i,
    ],
    confidence: 0.85,
  },
  custom_structured: {
    // Generic: { action/actions/tool/tools: ... }
    patterns: [
      /["']actions?["']\s*:\s*[\[{]/i,
      /["']tools?["']\s*:\s*[\[{]/i,
    ],
    confidence: 0.7,
  },
};

// =============================================================================
// Format Detector
// =============================================================================

/**
 * Detect the output format of AI model response
 */
export function detectFormat(data: unknown): DetectedFormat {
  const text = typeof data === 'string' ? data : JSON.stringify(data);

  // Check each format pattern
  for (const [format, config] of Object.entries(FORMAT_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        return {
          format: format as OutputFormat,
          confidence: config.confidence,
        };
      }
    }
  }

  // Check if it looks like inline JSON
  if (typeof data === 'object' && data !== null) {
    return {
      format: 'inline_json',
      confidence: 0.6,
    };
  }

  return {
    format: 'unknown',
    confidence: 0,
  };
}

/**
 * Detect format with additional metadata
 */
export function detectFormatDetailed(data: unknown): DetectedFormat {
  const basic = detectFormat(data);
  const text = typeof data === 'string' ? data : JSON.stringify(data);

  // Extract version info if available
  const versionMatch = text.match(/["']version["']\s*:\s*["']([^"']+)["']/);
  if (versionMatch && versionMatch[1]) {
    basic.version = versionMatch[1];
  }

  // Add metadata for specific formats
  if (basic.format === 'claude_tool_use') {
    const idMatch = text.match(/["']id["']\s*:\s*["'](toolu_[^"']+)["']/);
    if (idMatch) {
      basic.metadata = { toolId: idMatch[1] };
    }
  }

  return basic;
}

// =============================================================================
// Format Normalizer Class
// =============================================================================

/**
 * Normalizes AI model outputs to universal tool call format
 */
export class FormatNormalizer {
  private config: NormalizerConfig;
  private validator: SchemaValidator;

  constructor(config: Partial<NormalizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validator = new SchemaValidator(this.config.validatorConfig);
  }

  /**
   * Normalize model output to universal tool calls
   */
  normalize(
    modelOutput: unknown,
    modelType: ModelType,
    context: ParserContext | null = null
  ): NormalizedToolCall[] {
    // Detect format
    const detected = detectFormat(modelOutput);

    // Extract raw tool calls based on format
    const rawCalls = this.extractRawToolCalls(modelOutput, detected.format);

    if (rawCalls.length === 0) {
      return [];
    }

    // Get registry from context or use default
    const registry = context?.toolRegistry
      ? this.mapToRegistry(context.toolRegistry)
      : null;

    // Normalize each raw call
    const normalized: NormalizedToolCall[] = [];

    for (const rawCall of rawCalls) {
      const normalized_ = this.normalizeToolCall(
        rawCall,
        detected,
        modelType,
        registry
      );
      if (normalized_) {
        normalized.push(normalized_);
      }
    }

    return normalized;
  }

  /**
   * Convert Map<string, ToolSchema> to ToolSchemaRegistry
   */
  private mapToRegistry(map: Map<string, unknown>): ToolSchemaRegistry | null {
    // Import dynamically to avoid circular dependency
    try {
      const { ToolSchemaRegistry } = require('./schema-registry');
      const registry = new ToolSchemaRegistry();
      for (const [_name, schema] of map) {
        registry.register(schema);
      }
      return registry;
    } catch {
      return null;
    }
  }

  /**
   * Extract raw tool calls from model output based on format
   */
  private extractRawToolCalls(
    data: unknown,
    format: OutputFormat
  ): RawToolCall[] {
    switch (format) {
      case 'claude_tool_use':
        return this.extractClaudeToolCalls(data);

      case 'openai_function_call':
        return this.extractOpenAIToolCalls(data);

      case 'ollama_json':
      case 'qwen_structured':
      case 'llama_json':
        return this.extractOllamaToolCalls(data);

      case 'gemini_function_call':
        return this.extractGeminiToolCalls(data);

      case 'custom_structured':
      case 'inline_json':
        return this.extractGenericToolCalls(data);

      case 'markdown_json':
        return this.extractMarkdownToolCalls(data);

      default:
        return this.extractGenericToolCalls(data);
    }
  }

  /**
   * Extract tool calls from Claude format
   */
  private extractClaudeToolCalls(data: unknown): RawToolCall[] {
    const calls: RawToolCall[] = [];
    const obj = this.ensureObject(data);

    if (!obj) return calls;

    // Handle content array
    const content = obj['content'];
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block && typeof block === 'object' && block['type'] === 'tool_use') {
          calls.push({
            tool: block['name'],
            parameters: block['input'] || {},
          });
        }
      }
    }

    // Handle single tool_use block
    if (obj['type'] === 'tool_use') {
      calls.push({
        tool: obj['name'] as string,
        parameters: (obj['input'] as Record<string, unknown>) || {},
      });
    }

    return calls;
  }

  /**
   * Extract tool calls from OpenAI format
   */
  private extractOpenAIToolCalls(data: unknown): RawToolCall[] {
    const calls: RawToolCall[] = [];
    const obj = this.ensureObject(data);

    if (!obj) return calls;

    // Handle choices array
    const choices = obj['choices'];
    if (Array.isArray(choices)) {
      for (const choice of choices) {
        const message = choice?.['message'];
        const toolCalls = message?.['tool_calls'];

        if (Array.isArray(toolCalls)) {
          for (const tc of toolCalls) {
            const fn = tc['function'];
            if (fn) {
              let args = fn['arguments'];
              if (typeof args === 'string') {
                try {
                  args = JSON.parse(args);
                } catch {
                  // Keep as string
                }
              }
              calls.push({
                tool: fn['name'],
                parameters: typeof args === 'object' ? args : {},
              });
            }
          }
        }
      }
    }

    // Handle direct tool_calls array
    const toolCalls = obj['tool_calls'];
    if (Array.isArray(toolCalls)) {
      for (const tc of toolCalls) {
        const fn = tc['function'];
        if (fn) {
          let args = fn['arguments'];
          if (typeof args === 'string') {
            try {
              args = JSON.parse(args);
            } catch {
              // Keep as string
            }
          }
          calls.push({
            tool: fn['name'],
            parameters: typeof args === 'object' ? args : {},
          });
        }
      }
    }

    return calls;
  }

  /**
   * Extract tool calls from Ollama/Qwen/local model format
   */
  private extractOllamaToolCalls(data: unknown): RawToolCall[] {
    const calls: RawToolCall[] = [];
    const obj = this.ensureObject(data);

    if (!obj) return calls;

    // Handle commands array
    const commands = obj['commands'];
    if (Array.isArray(commands)) {
      for (const cmd of commands) {
        if (cmd && typeof cmd === 'object') {
          calls.push({
            tool: cmd['tool'] || cmd['name'] || cmd['action'],
            parameters: cmd['params'] || cmd['parameters'] || cmd['args'] || {},
          });
        }
      }
    }

    // Handle single command/tool
    if (obj['tool'] || obj['name'] || obj['action']) {
      calls.push({
        tool: (obj['tool'] || obj['name'] || obj['action']) as string,
        parameters: (obj['params'] || obj['parameters'] || obj['args'] || {}) as Record<string, unknown>,
      });
    }

    return calls;
  }

  /**
   * Extract tool calls from Gemini format
   */
  private extractGeminiToolCalls(data: unknown): RawToolCall[] {
    const calls: RawToolCall[] = [];
    const obj = this.ensureObject(data);

    if (!obj) return calls;

    // Handle functionCall
    const functionCall = obj['functionCall'] as Record<string, unknown> | undefined;
    if (functionCall && typeof functionCall === 'object') {
      calls.push({
        tool: functionCall['name'] as string,
        parameters: (functionCall['args'] as Record<string, unknown>) || {},
      });
    }

    // Handle parts array
    const parts = obj['parts'];
    if (Array.isArray(parts)) {
      for (const part of parts) {
        const fc = part?.['functionCall'] as Record<string, unknown> | undefined;
        if (fc) {
          calls.push({
            tool: fc['name'] as string,
            parameters: (fc['args'] as Record<string, unknown>) || {},
          });
        }
      }
    }

    return calls;
  }

  /**
   * Extract tool calls from generic structured format
   */
  private extractGenericToolCalls(data: unknown): RawToolCall[] {
    const calls: RawToolCall[] = [];
    const obj = this.ensureObject(data);

    if (!obj) return calls;

    // Check various common structures
    const possibleArrays = ['actions', 'tools', 'commands', 'calls', 'operations'];
    for (const key of possibleArrays) {
      const arr = obj[key];
      if (Array.isArray(arr)) {
        for (const item of arr) {
          const call = this.extractSingleToolCall(item);
          if (call) calls.push(call);
        }
        if (calls.length > 0) return calls;
      }
    }

    // Check for single tool call at root
    const singleCall = this.extractSingleToolCall(obj);
    if (singleCall) {
      calls.push(singleCall);
    }

    return calls;
  }

  /**
   * Extract tool calls from markdown code blocks
   */
  private extractMarkdownToolCalls(data: unknown): RawToolCall[] {
    if (typeof data !== 'string') {
      return this.extractGenericToolCalls(data);
    }

    const calls: RawToolCall[] = [];

    // Extract JSON from code blocks
    const codeBlockPattern = /```(?:json)?\s*([\s\S]*?)```/gi;
    let match;

    while ((match = codeBlockPattern.exec(data)) !== null) {
      const jsonContent = match[1]?.trim();
      if (jsonContent) {
        try {
          const parsed = JSON.parse(jsonContent);
          const extracted = this.extractGenericToolCalls(parsed);
          calls.push(...extracted);
        } catch {
          // Not valid JSON, skip
        }
      }
    }

    return calls;
  }

  /**
   * Extract a single tool call from an object
   */
  private extractSingleToolCall(obj: unknown): RawToolCall | null {
    if (!obj || typeof obj !== 'object') return null;

    const o = obj as Record<string, unknown>;

    // Look for tool name
    const toolName =
      o['tool'] ||
      o['name'] ||
      o['function'] ||
      o['action'] ||
      o['type'];

    if (typeof toolName !== 'string') return null;

    // Look for parameters
    const params =
      o['parameters'] ||
      o['params'] ||
      o['arguments'] ||
      o['args'] ||
      o['input'] ||
      {};

    return {
      tool: toolName,
      parameters: typeof params === 'object' && params !== null
        ? params as Record<string, unknown>
        : {},
    };
  }

  /**
   * Normalize a single raw tool call
   */
  private normalizeToolCall(
    rawCall: RawToolCall,
    detected: DetectedFormat,
    modelType: ModelType,
    registry: ToolSchemaRegistry | null
  ): NormalizedToolCall | null {
    // If we have a registry, validate against it
    if (registry) {
      const validationResult = this.validator.validate(rawCall, registry);

      if (validationResult.isValid && validationResult.normalizedData) {
        return validationResult.normalizedData as NormalizedToolCall;
      }

      // If validation failed but we have partial data, return it with lower confidence
      if (!validationResult.isValid) {
        // Still try to create a basic normalized call
        const toolName = rawCall.tool || rawCall.name || rawCall.function;
        if (toolName) {
          return this.createBasicNormalizedCall(
            rawCall,
            toolName,
            detected,
            modelType,
            0.3 // Low confidence due to validation failure
          );
        }
      }

      return null;
    }

    // No registry - create basic normalized call
    const toolName = rawCall.tool || rawCall.name || rawCall.function;
    if (!toolName || typeof toolName !== 'string') return null;

    return this.createBasicNormalizedCall(
      rawCall,
      toolName,
      detected,
      modelType,
      detected.confidence
    );
  }

  /**
   * Create a basic normalized tool call without full validation
   */
  private createBasicNormalizedCall(
    rawCall: RawToolCall,
    toolName: string,
    detected: DetectedFormat,
    modelType: ModelType,
    confidence: number
  ): NormalizedToolCall {
    const params =
      rawCall.parameters ||
      rawCall.params ||
      rawCall.arguments ||
      rawCall.args ||
      {};

    const metadata: ToolCallMetadata = {
      model: modelType,
      timestamp: new Date(),
      parsingMethod: 'format_normalizer',
      sourceFormat: detected.format,
      extractionMethod: 'ast_balanced' as ExtractionMethod,
    };

    return {
      id: this.generateId(),
      tool: toolName,
      parameters: typeof params === 'object' && params !== null
        ? params as Record<string, unknown>
        : {},
      confidence,
      sourceFormat: detected.format,
      rawData: rawCall,
      metadata,
    };
  }

  /**
   * Ensure data is an object
   */
  private ensureObject(data: unknown): Record<string, unknown> | null {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch {
        return null;
      }
    }

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }

    return null;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `norm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<NormalizerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.validatorConfig) {
      this.validator.configure(config.validatorConfig);
    }
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Normalize model output with default settings
 */
export function normalizeModelOutput(
  output: unknown,
  modelType: ModelType = 'unknown'
): NormalizedToolCall[] {
  const normalizer = new FormatNormalizer();
  return normalizer.normalize(output, modelType);
}

/**
 * Detect and normalize in one step
 */
export function detectAndNormalize(
  output: unknown,
  modelType: ModelType = 'unknown'
): {
  format: DetectedFormat;
  toolCalls: NormalizedToolCall[];
} {
  const format = detectFormatDetailed(output);
  const normalizer = new FormatNormalizer();
  const toolCalls = normalizer.normalize(output, modelType);

  return { format, toolCalls };
}

/**
 * Check if output contains tool calls
 */
export function hasToolCalls(output: unknown): boolean {
  const format = detectFormat(output);
  if (format.format === 'unknown') return false;

  const normalizer = new FormatNormalizer();
  const calls = normalizer.normalize(output, 'unknown');
  return calls.length > 0;
}
