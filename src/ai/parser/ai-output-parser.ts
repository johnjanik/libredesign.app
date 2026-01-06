/**
 * AI Output Parser
 *
 * Main entry point for parsing AI model outputs into executable tool calls.
 * Combines extraction, validation, normalization, and fallback strategies.
 */

import type {
  ModelType,
  OutputFormat,
  NormalizedToolCall,
  ParserContext,
  ParsingResult,
  ParsingSuccess,
  ParsingFailure,
  ParsingMetadata,
  ValidationWarning,
  CoercedValue,
  ExtractionMethod,
  ToolSchema,
} from './types';
import type { ParserConfig } from './config';
import { DEFAULT_PARSER_CONFIG, getModelCapabilities, getKnownIssues } from './config';
import { JSONExtractor, type ExtractorConfig } from './extractor';
import { FormatNormalizer, detectFormat } from './format-normalizer';
import { ToolSchemaRegistry, getDefaultRegistry } from './schema-registry';
import { fullRepair } from './repair';

// =============================================================================
// Types
// =============================================================================

export interface AIOutputParserConfig extends Partial<ParserConfig> {
  /** Extractor configuration */
  extractorConfig?: Partial<ExtractorConfig>;
  /** Custom tool registry */
  registry?: ToolSchemaRegistry;
}

// =============================================================================
// Main Parser Class
// =============================================================================

/**
 * Production-grade AI output parser
 *
 * Handles parsing of AI model outputs from various formats (Claude, OpenAI,
 * Ollama, etc.) into normalized, validated tool calls ready for execution.
 */
export class AIOutputParser {
  private config: ParserConfig;
  private extractor: JSONExtractor;
  private normalizer: FormatNormalizer;
  private registry: ToolSchemaRegistry;

  constructor(config: AIOutputParserConfig = {}) {
    this.config = { ...DEFAULT_PARSER_CONFIG, ...config };
    this.extractor = new JSONExtractor(config.extractorConfig);
    this.normalizer = new FormatNormalizer({
      validatorConfig: {
        fuzzyToolMatching: true,
        fuzzyParamMatching: true,
        enableCoercion: true,
        useDefaults: true,
      },
    });
    this.registry = config.registry || getDefaultRegistry();
  }

  /**
   * Parse AI output into executable tool calls
   *
   * This is the main entry point for parsing AI model responses.
   */
  async parse(
    rawOutput: string,
    context?: Partial<ParserContext>
  ): Promise<ParsingResult> {
    const startTime = Date.now();
    const modelType = context?.modelType || 'unknown';

    try {
      // Step 1: Extract JSON from raw text
      const extractionResults = this.extractor.extractAll(rawOutput);

      if (extractionResults.length === 0) {
        // No JSON found - try repair strategies
        if (this.config.attemptRepairs) {
          return await this.handleNoExtraction(rawOutput, modelType, startTime, context);
        }

        return this.createFailure(
          'No JSON content found in output',
          [],
          ['Ensure the AI model outputs JSON-formatted tool calls'],
          startTime
        );
      }

      // Step 2: Select best candidate
      const selected = this.extractor.selectBestCandidate(extractionResults);

      if (!selected) {
        return this.createFailure(
          'Could not select best candidate from extractions',
          [],
          ['Ensure valid JSON structure in output'],
          startTime
        );
      }

      // Step 3: Detect format and normalize
      const detected = detectFormat(selected.json);
      const fullContext = this.buildContext(context, modelType);

      const toolCalls = this.normalizer.normalize(
        selected.json,
        modelType,
        fullContext
      );

      if (toolCalls.length === 0) {
        // Extraction succeeded but no valid tool calls
        return await this.handleNoToolCalls(
          selected.json,
          modelType,
          startTime
        );
      }

      // Step 4: Build successful result
      return this.createSuccess(
        toolCalls,
        selected.extractionMethod,
        detected.format,
        selected.confidence,
        startTime,
        rawOutput
      );

    } catch (error) {
      // Handle parsing failure with fallback strategies
      if (this.config.useFallbacks) {
        return await this.handleParsingFailure(
          error as Error,
          rawOutput,
          modelType,
          startTime,
          context
        );
      }

      return this.createFailure(
        error instanceof Error ? error.message : 'Unknown parsing error',
        [],
        ['Check the AI model output format'],
        startTime
      );
    }
  }

  /**
   * Parse with explicit model type
   */
  async parseWithModel(
    rawOutput: string,
    modelType: ModelType
  ): Promise<ParsingResult> {
    return this.parse(rawOutput, { modelType });
  }

  /**
   * Quick parse for simple cases
   */
  parseSync(rawOutput: string): NormalizedToolCall[] {
    try {
      const extractionResults = this.extractor.extractAll(rawOutput);
      if (extractionResults.length === 0) return [];

      const selected = this.extractor.selectBestCandidate(extractionResults);
      if (!selected) return [];

      return this.normalizer.normalize(selected.json, 'unknown');
    } catch {
      return [];
    }
  }

  /**
   * Check if output contains parseable tool calls
   */
  canParse(rawOutput: string): boolean {
    try {
      const results = this.extractor.extractAll(rawOutput);
      if (results.length === 0) return false;

      const selected = this.extractor.selectBestCandidate(results);
      if (!selected) return false;

      const toolCalls = this.normalizer.normalize(selected.json, 'unknown');
      return toolCalls.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Handle case where no JSON was extracted
   */
  private async handleNoExtraction(
    rawOutput: string,
    modelType: ModelType,
    startTime: number,
    context?: Partial<ParserContext>
  ): Promise<ParsingResult> {
    // Get known issues for the model type
    const knownIssues = getKnownIssues(modelType);

    // Try repair strategies
    const repaired = fullRepair(rawOutput, knownIssues);

    if (repaired.success && repaired.text !== rawOutput) {
      // Retry with repaired JSON
      const extractionResults = this.extractor.extractAll(repaired.text);

      if (extractionResults.length > 0) {
        const selected = this.extractor.selectBestCandidate(extractionResults);
        if (selected) {
          const detected = detectFormat(selected.json);
          const fullContext = this.buildContext(context, modelType);

          const toolCalls = this.normalizer.normalize(
            selected.json,
            modelType,
            fullContext
          );

          if (toolCalls.length > 0) {
            const result = this.createSuccess(
              toolCalls,
              'repaired',
              detected.format,
              selected.confidence * 0.8, // Reduce confidence for repaired
              startTime,
              rawOutput
            );

            if (result.success) {
              result.metadata.repairsApplied = repaired.appliedRepairs;
              result.metadata.fallbackStrategy = 'auto_repair';
            }

            return result;
          }
        }
      }
    }

    return this.createFailure(
      'Could not extract valid JSON from output',
      [],
      [
        'Ensure the AI model outputs valid JSON',
        'Check for unclosed brackets or quotes',
        repaired.appliedRepairs.length > 0
          ? `Attempted repairs: ${repaired.appliedRepairs.join(', ')}`
          : 'No repairs were applicable',
      ],
      startTime
    );
  }

  /**
   * Handle case where JSON was extracted but no tool calls found
   */
  private async handleNoToolCalls(
    extractedJson: unknown,
    modelType: ModelType,
    startTime: number
  ): Promise<ParsingResult> {
    // The JSON might be in an unexpected format
    // Try to extract any tool-like structures

    const suggestions: string[] = [
      'Ensure tool calls have "tool" or "name" field',
      'Check that parameters are properly structured',
    ];

    // Check if it looks like tool calls but in wrong format
    const jsonStr = JSON.stringify(extractedJson);
    if (jsonStr.includes('tool') || jsonStr.includes('function')) {
      suggestions.unshift('Tool call structure detected but could not be parsed');
    }

    return this.createFailure(
      'JSON extracted but no valid tool calls found',
      [],
      suggestions,
      startTime,
      [{
        tool: 'unknown',
        parameters: {},
        id: 'partial_0',
        confidence: 0.1,
        sourceFormat: 'unknown',
        rawData: extractedJson,
        metadata: {
          model: modelType,
          timestamp: new Date(),
          parsingMethod: 'partial',
          sourceFormat: 'unknown',
          extractionMethod: 'ast_balanced',
        },
      }]
    );
  }

  /**
   * Handle parsing failure with fallback strategies
   */
  private async handleParsingFailure(
    _error: Error,
    rawOutput: string,
    modelType: ModelType,
    startTime: number,
    context?: Partial<ParserContext>
  ): Promise<ParsingResult> {
    const fallbackLevel = context?.fallbackLevel || 0;

    // Tier 1: Try repair
    if (fallbackLevel === 0 && this.config.attemptRepairs) {
      const knownIssues = getKnownIssues(modelType);
      const repaired = fullRepair(rawOutput, knownIssues);

      if (repaired.success && repaired.text !== rawOutput) {
        try {
          const result = await this.parse(repaired.text, {
            ...context,
            fallbackLevel: 1,
          });

          if (result.success) {
            result.metadata.fallbackStrategy = 'auto_repair';
            result.metadata.repairsApplied = repaired.appliedRepairs;
          }

          return result;
        } catch {
          // Repair didn't help, continue to next tier
        }
      }
    }

    // Tier 2: Try lenient extraction
    if (fallbackLevel <= 1) {
      try {
        const lenientExtractor = new JSONExtractor({
          enableRepair: true,
          maxCandidates: 10,
          minConfidence: 0.3,
        });

        const results = lenientExtractor.extractAll(rawOutput);
        if (results.length > 0) {
          const selected = lenientExtractor.selectBestCandidate(results);
          if (selected) {
            const toolCalls = this.normalizer.normalize(selected.json, modelType);

            if (toolCalls.length > 0) {
              const result = this.createSuccess(
                toolCalls,
                selected.extractionMethod,
                detectFormat(selected.json).format,
                selected.confidence * 0.6,
                startTime,
                rawOutput
              );

              if (result.success) {
                result.metadata.fallbackStrategy = 'lenient_extraction';
              }

              return result;
            }
          }
        }
      } catch {
        // Lenient extraction failed
      }
    }

    // All fallbacks failed
    return this.createFailure(
      `Parsing failed: ${_error.message}`,
      [],
      [
        'Check the AI model output format',
        'Ensure valid JSON structure',
        'Verify tool names match registered tools',
      ],
      startTime
    );
  }

  /**
   * Build full parser context
   */
  private buildContext(
    partial?: Partial<ParserContext>,
    modelType: ModelType = 'unknown'
  ): ParserContext {
    const capabilities = getModelCapabilities(modelType);

    const context: ParserContext = {
      modelType,
      modelVersion: partial?.modelVersion || 'unknown',
      modelCapabilities: capabilities,
      selection: partial?.selection || [],
      viewport: partial?.viewport || { x: 0, y: 0, width: 1920, height: 1080, zoom: 1 },
      activeTool: partial?.activeTool || null,
      conversationHistory: partial?.conversationHistory || [],
      previousAttempts: partial?.previousAttempts || [],
      fallbackLevel: partial?.fallbackLevel || 0,
      toolRegistry: this.registryToMap(),
    };

    // Add optional properties only if defined
    if (partial?.activeLayerId) {
      context.activeLayerId = partial.activeLayerId;
    }
    if (partial?.lastSuccessfulToolCall) {
      context.lastSuccessfulToolCall = partial.lastSuccessfulToolCall;
    }
    if (partial?.userIntent) {
      context.userIntent = partial.userIntent;
    }

    return context;
  }

  /**
   * Convert registry to Map for context
   */
  private registryToMap(): Map<string, ToolSchema> {
    const map = new Map<string, ToolSchema>();
    for (const schema of this.registry.getAllSchemas()) {
      map.set(schema.name, schema);
    }
    return map;
  }

  /**
   * Create successful parsing result
   */
  private createSuccess(
    toolCalls: NormalizedToolCall[],
    extractionMethod: ExtractionMethod,
    format: OutputFormat,
    confidence: number,
    startTime: number,
    rawOutput: string
  ): ParsingSuccess {
    const warnings: ValidationWarning[] = [];
    const coercions: Record<string, CoercedValue> = {};

    // Collect warnings and coercions from all tool calls
    for (const tc of toolCalls) {
      if (tc.metadata.coercions) {
        Object.assign(coercions, tc.metadata.coercions);
      }
    }

    const metadata: ParsingMetadata = {
      parsingTime: Date.now() - startTime,
      extractionMethod,
      format,
      confidence,
      coercions,
      warnings,
      rawOutputSnippet: rawOutput.substring(0, 200),
    };

    return {
      success: true,
      toolCalls,
      metadata,
    };
  }

  /**
   * Create failed parsing result
   */
  private createFailure(
    error: string,
    errors: { code: string; message: string; path: string[] }[],
    suggestions: string[],
    startTime: number,
    partialToolCalls?: NormalizedToolCall[]
  ): ParsingFailure {
    const result: ParsingFailure = {
      success: false,
      error,
      errors: errors.map((e) => ({
        ...e,
        code: e.code as any,
      })),
      suggestions,
      metadata: {
        parsingTime: Date.now() - startTime,
      },
    };

    if (partialToolCalls && partialToolCalls.length > 0) {
      result.partialToolCalls = partialToolCalls;
    }

    return result;
  }

  /**
   * Register additional tools
   */
  registerTool(schema: ToolSchema): void {
    this.registry.register(schema);
  }

  /**
   * Register multiple tools
   */
  registerTools(schemas: ToolSchema[]): void {
    this.registry.registerAll(schemas);
  }

  /**
   * Get current configuration
   */
  getConfig(): ParserConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ParserConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the tool registry
   */
  getRegistry(): ToolSchemaRegistry {
    return this.registry;
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a parser with default settings
 */
export function createParser(
  config: AIOutputParserConfig = {}
): AIOutputParser {
  return new AIOutputParser(config);
}

/**
 * Quick parse with default settings
 */
export async function parseAIOutput(
  rawOutput: string,
  modelType: ModelType = 'unknown'
): Promise<ParsingResult> {
  const parser = new AIOutputParser();
  return parser.parseWithModel(rawOutput, modelType);
}

/**
 * Synchronous parse for simple cases
 */
export function parseAIOutputSync(rawOutput: string): NormalizedToolCall[] {
  const parser = new AIOutputParser();
  return parser.parseSync(rawOutput);
}

/**
 * Check if output can be parsed
 */
export function canParseOutput(rawOutput: string): boolean {
  const parser = new AIOutputParser();
  return parser.canParse(rawOutput);
}
