/**
 * Advanced JSON Parser Module
 *
 * Production-grade, fault-tolerant JSON parser for AI tool calling.
 * Bridges local models (Llama, Qwen, Mistral) with the tool execution system.
 *
 * @module ai/parser
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Extraction types
  ExtractionMethod,
  ExtractionResult,
  SelectedCandidate,

  // Validation types
  ValidationErrorCode,
  ValidationError,
  ValidationWarning,
  ValidationResult,
  CoercedValue,

  // Tool schema types
  JSONSchemaProperty,
  ToolSchema,

  // Output format types
  OutputFormat,
  ModelType,
  DetectedFormat,

  // Normalized tool call types
  ToolCallMetadata,
  NormalizedToolCall,

  // Parser context types
  Viewport,
  ContextMessage,
  KnownIssue,
  ModelCapabilities,
  ParsingAttempt,
  ParserContext,

  // Parsing result types
  ParsingMetadata,
  ParsingSuccess,
  ParsingFailure,
  ParsingResult,

  // Streaming types
  ParseState,
  ParseProgress,
  ParsingUpdate,

  // Fallback types
  RecoveryStrategy,
  FallbackResult,
  RecoveryPlan,

  // Performance types
  PercentileStats,
  PerformanceMetrics,
} from './types';

// =============================================================================
// Configuration
// =============================================================================

export type { ParserConfig, FallbackConfig } from './config';

export {
  // Default configurations
  DEFAULT_PARSER_CONFIG,
  STRICT_PARSER_CONFIG,
  LENIENT_PARSER_CONFIG,
  DEFAULT_FALLBACK_CONFIG,

  // Model capabilities
  MODEL_CAPABILITIES,
  EXTRACTION_CONFIDENCE,

  // Alias databases
  TOOL_ALIASES,
  PARAMETER_ALIASES,
  NAMED_COLORS,

  // Helper functions
  createParserConfig,
  getModelCapabilities,
  supportsNativeToolCalls,
  getKnownIssues,
  getCanonicalToolName,
  getCanonicalParamName,
} from './config';

// =============================================================================
// JSON5 Parser
// =============================================================================

export type { JSON5ParseResult } from './json5-parser';

export {
  parseJSON5,
  parseJsonOrJson5,
  looksLikeJSON5,
} from './json5-parser';

// =============================================================================
// Repair Utilities
// =============================================================================

export type { RepairResult, RepairRule } from './repair';

export {
  REPAIR_RULES,
  repairJson,
  completeTruncatedJson,
  applyModelFixes,
  fullRepair,
  mightContainJson,
  findJsonStart,
  findJsonEnd,
  extractJsonPortion,
} from './repair';

// =============================================================================
// JSON Extractor
// =============================================================================

export type { ExtractorConfig } from './extractor';

export {
  JSONExtractor,
  createJSONExtractor,
  extractJson,
  extractBestJson,
} from './extractor';

// =============================================================================
// Schema Registry
// =============================================================================

export type { RegisteredTool, RegistryStats } from './schema-registry';

export {
  ToolSchemaRegistry,
  createToolSchema,
  numberParam,
  stringParam,
  booleanParam,
  arrayParam,
  objectParam,
  createDefaultRegistry,
  getDefaultRegistry,
  resetDefaultRegistry,
} from './schema-registry';

// =============================================================================
// Fuzzy Matcher
// =============================================================================

export type { FuzzyMatch, FuzzyMatcherConfig } from './fuzzy-matcher';

export {
  // Distance/similarity algorithms
  levenshteinDistance,
  levenshteinSimilarity,
  jaroSimilarity,
  jaroWinklerSimilarity,
  // Matching functions
  findBestMatch,
  findAllMatches,
  findTool,
  findToolMatches,
  findCanonicalParam,
  mapParametersToSchema,
  // Utilities
  isSimilar,
  getSimilarity,
  suggestToolCorrections,
} from './fuzzy-matcher';

// =============================================================================
// Parameter Mapper
// =============================================================================

export type { ParameterMappingResult, ParameterMapping, MapperConfig } from './param-mapper';

export {
  ParameterMapper,
  mapParameters,
  resolveParameterName,
  isParameterAlias,
  getParameterAliases,
} from './param-mapper';

// =============================================================================
// Schema Validator
// =============================================================================

export type { ValidatorConfig, RawToolCall } from './schema-validator';

export {
  SchemaValidator,
  createValidator,
  validateToolCall,
  isValidToolCall,
} from './schema-validator';

// =============================================================================
// Format Normalizer
// =============================================================================

export type { NormalizerConfig } from './format-normalizer';

export {
  FormatNormalizer,
  detectFormat,
  detectFormatDetailed,
  normalizeModelOutput,
  detectAndNormalize,
  hasToolCalls,
} from './format-normalizer';

// =============================================================================
// AI Output Parser (Main Entry Point)
// =============================================================================

export type { AIOutputParserConfig } from './ai-output-parser';

export {
  AIOutputParser,
  createParser,
  parseAIOutput,
  parseAIOutputSync,
  canParseOutput,
} from './ai-output-parser';
