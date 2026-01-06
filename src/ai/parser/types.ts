/**
 * Advanced JSON Parser Types
 *
 * Core types and interfaces for the production-grade JSON parser
 * that bridges local AI models with the tool execution system.
 */

// =============================================================================
// Extraction Types
// =============================================================================

/**
 * Methods used to extract JSON from mixed content
 */
export type ExtractionMethod =
  | 'markdown_codeblock'    // ```json ... ```
  | 'ast_balanced'          // Balanced brace tracking
  | 'regex_full_json'       // Full JSON regex match
  | 'regex_partial'         // Partial/greedy JSON match
  | 'inline_json'           // Inline JSON detection
  | 'json5_parse'           // JSON5 syntax parsing
  | 'repaired';             // JSON repaired from malformed input

/**
 * Result of a JSON extraction attempt
 */
export interface ExtractionResult {
  /** Parsed JSON object */
  json: unknown;
  /** Original source text that was parsed */
  sourceText: string;
  /** Start index in the original text */
  startIndex: number;
  /** End index in the original text */
  endIndex: number;
  /** Method used for extraction */
  extractionMethod: ExtractionMethod;
  /** Confidence score (0-1) */
  confidence: number;
  /** Any validation errors found */
  validationErrors: ValidationError[];
  /** Repairs applied during extraction */
  appliedRepairs?: string[];
}

/**
 * Selected candidate after ranking
 */
export interface SelectedCandidate extends ExtractionResult {
  /** Why this candidate was selected */
  selectionReason: string;
  /** Other candidates that were considered */
  alternativeCount: number;
}

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Validation error codes
 */
export type ValidationErrorCode =
  | 'required_parameter_missing'
  | 'invalid_type'
  | 'invalid_enum_value'
  | 'number_out_of_range'
  | 'string_pattern_mismatch'
  | 'unknown_tool'
  | 'invalid_json_structure'
  | 'schema_mismatch';

/**
 * Validation error details
 */
export interface ValidationError {
  /** JSON path to the error */
  path: string[];
  /** Error code */
  code: ValidationErrorCode;
  /** Human-readable message */
  message: string;
  /** Suggested fix if available */
  suggestedFix?: string;
  /** Expected value/type */
  expected?: string;
  /** Actual value received */
  received?: string;
}

/**
 * Validation warning (non-fatal issues)
 */
export interface ValidationWarning {
  /** JSON path to the warning */
  path: string[];
  /** Warning message */
  message: string;
  /** Suggestion for improvement */
  suggestion?: string;
}

/**
 * Result of schema validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Normalized/coerced data */
  normalizedData: unknown;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
  /** Values that were coerced */
  coercedValues: Record<string, CoercedValue>;
  /** Default values that were injected */
  injectedDefaults: Record<string, unknown>;
}

/**
 * Record of a value coercion
 */
export interface CoercedValue {
  /** Original value */
  from: unknown;
  /** Coerced value */
  to: unknown;
  /** Type of coercion applied */
  coercionType: string;
}

// =============================================================================
// Tool Schema Types
// =============================================================================

/**
 * JSON Schema subset for tool parameters
 */
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  description?: string;
  enum?: unknown[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
  /** Alternative names for this parameter (for semantic mapping) */
  aliases?: string[];
}

/**
 * Tool schema definition
 */
export interface ToolSchema {
  /** Unique tool identifier */
  id: string;
  /** Tool name (for matching) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Parameter schema */
  parameters: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required?: string[];
  };
  /** Default values for optional parameters */
  defaults?: Record<string, unknown>;
  /** Return type schema */
  returns?: JSONSchemaProperty;
  /** Other tools this depends on */
  dependencies?: string[];
  /** Alternative names for this tool (for fuzzy matching) */
  aliases?: string[];
  /** Category for grouping */
  category?: string;
}

// =============================================================================
// Output Format Types
// =============================================================================

/**
 * Known AI model output formats
 */
export type OutputFormat =
  | 'claude_tool_use'        // Anthropic Claude tool_use blocks
  | 'openai_function_call'   // OpenAI function calling
  | 'anthropic_beta_tools'   // Anthropic beta tools format
  | 'ollama_json'            // Ollama/local model JSON
  | 'qwen_structured'        // Qwen specific format
  | 'llama_json'             // Llama model format
  | 'gemini_function_call'   // Google Gemini
  | 'custom_structured'      // Generic structured JSON
  | 'markdown_json'          // JSON in markdown blocks
  | 'inline_json'            // JSON inline in text
  | 'unknown';               // Unrecognized format

/**
 * Model type identifiers
 */
export type ModelType =
  | 'claude'
  | 'openai'
  | 'anthropic'
  | 'ollama'
  | 'llama'
  | 'qwen'
  | 'mistral'
  | 'gemini'
  | 'llamacpp'
  | 'unknown';

/**
 * Detected format with confidence
 */
export interface DetectedFormat {
  /** Detected format type */
  format: OutputFormat;
  /** Confidence in detection (0-1) */
  confidence: number;
  /** Format version if known */
  version?: string;
  /** Additional format metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Normalized Tool Call Types
// =============================================================================

/**
 * Metadata for a parsed tool call
 */
export interface ToolCallMetadata {
  /** Source model */
  model: string;
  /** Parsing timestamp */
  timestamp: Date;
  /** Method used for parsing */
  parsingMethod: string;
  /** Original format detected */
  sourceFormat: OutputFormat;
  /** Extraction method used */
  extractionMethod: ExtractionMethod;
  /** Coercions applied */
  coercions?: Record<string, CoercedValue>;
  /** Fuzzy match info if tool name was matched fuzzy */
  fuzzyMatch?: {
    originalName: string;
    matchedName: string;
    similarity: number;
  };
  /** Parameter mappings applied */
  parameterMappings?: Record<string, string>;
}

/**
 * Normalized tool call ready for execution
 */
export interface NormalizedToolCall {
  /** Unique identifier */
  id: string;
  /** Tool name (canonical) */
  tool: string;
  /** Validated parameters */
  parameters: Record<string, unknown>;
  /** Confidence score (0-1) */
  confidence: number;
  /** Original format */
  sourceFormat: OutputFormat;
  /** Raw data before normalization */
  rawData: unknown;
  /** Parsing metadata */
  metadata: ToolCallMetadata;
}

// =============================================================================
// Parser Context Types
// =============================================================================

/**
 * Viewport information
 */
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

/**
 * Conversation message for context
 */
export interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  toolCalls?: NormalizedToolCall[];
}

/**
 * Known issue pattern for a model
 */
export interface KnownIssue {
  /** Description of the issue */
  issue: string;
  /** Pattern to detect the issue */
  pattern: RegExp;
  /** Function to fix the issue */
  fix: (text: string) => string;
  /** How often this issue occurs (0-1) */
  frequency: number;
}

/**
 * Model capabilities
 */
export interface ModelCapabilities {
  /** Supports native tool/function calling */
  supportsNativeToolCalls: boolean;
  /** Supports structured output mode */
  supportsStructuredOutput: boolean;
  /** Supports vision/images */
  supportsVision: boolean;
  /** Maximum output tokens */
  maxOutputTokens: number;
  /** Known output formats this model uses */
  knownFormats: OutputFormat[];
  /** Known issues with this model's output */
  knownIssues: KnownIssue[];
}

/**
 * Previous parsing attempt for context
 */
export interface ParsingAttempt {
  /** Timestamp of attempt */
  timestamp: Date;
  /** Whether it succeeded */
  success: boolean;
  /** Method used */
  method: string;
  /** Error if failed */
  error?: string;
  /** Result if succeeded */
  result?: NormalizedToolCall[];
}

/**
 * Full parser context
 */
export interface ParserContext {
  // Model information
  /** Type of model being parsed */
  modelType: ModelType;
  /** Model version string */
  modelVersion: string;
  /** Model capabilities */
  modelCapabilities: ModelCapabilities;

  // Design context
  /** Currently selected node IDs */
  selection: string[];
  /** Current viewport */
  viewport: Viewport;
  /** Active tool name */
  activeTool: string | null;
  /** Active layer ID */
  activeLayerId?: string;

  // Conversation context
  /** Recent conversation history */
  conversationHistory: ContextMessage[];
  /** Last successful tool call */
  lastSuccessfulToolCall?: NormalizedToolCall;
  /** Inferred user intent */
  userIntent?: string;

  // Parser state
  /** Previous parsing attempts */
  previousAttempts: ParsingAttempt[];
  /** Current fallback level (0 = no fallback) */
  fallbackLevel: number;

  // Tool registry reference
  /** Available tool schemas */
  toolRegistry: Map<string, ToolSchema>;
}

// =============================================================================
// Parsing Result Types
// =============================================================================

/**
 * Parsing metadata
 */
export interface ParsingMetadata {
  /** Time taken to parse (ms) */
  parsingTime: number;
  /** Extraction method used */
  extractionMethod: ExtractionMethod;
  /** Detected format */
  format: OutputFormat;
  /** Overall confidence score */
  confidence: number;
  /** Coercions applied */
  coercions: Record<string, CoercedValue>;
  /** Warnings generated */
  warnings: ValidationWarning[];
  /** Snippet of raw output */
  rawOutputSnippet: string;
  /** Fallback strategy used if any */
  fallbackStrategy?: string;
  /** Repairs applied */
  repairsApplied?: string[];
}

/**
 * Successful parsing result
 */
export interface ParsingSuccess {
  success: true;
  /** Parsed tool calls */
  toolCalls: NormalizedToolCall[];
  /** Parsing metadata */
  metadata: ParsingMetadata;
}

/**
 * Failed parsing result
 */
export interface ParsingFailure {
  success: false;
  /** Error message */
  error: string;
  /** Detailed errors */
  errors: ValidationError[];
  /** Suggestions for fixing */
  suggestions: string[];
  /** Partial results if any */
  partialToolCalls?: NormalizedToolCall[];
  /** Parsing metadata */
  metadata?: Partial<ParsingMetadata>;
}

/**
 * Complete parsing result
 */
export type ParsingResult = ParsingSuccess | ParsingFailure;

// =============================================================================
// Streaming Types
// =============================================================================

/**
 * State of incremental parsing
 */
export type ParseState = 'idle' | 'partial' | 'complete' | 'error';

/**
 * Progress of incremental parsing
 */
export interface ParseProgress {
  /** Current state */
  state: ParseState;
  /** Nesting depth */
  depth: number;
  /** Whether currently in a string */
  inString: boolean;
  /** Current buffer contents */
  buffer: string;
  /** Completed objects found so far */
  completedObjects?: unknown[];
  /** Partial tool calls detected */
  partialToolCalls?: Partial<NormalizedToolCall>[];
}

/**
 * Streaming parsing update
 */
export interface ParsingUpdate {
  /** Type of update */
  type: 'incremental' | 'complete' | 'error';
  /** Update data */
  data: ParseProgress | ParsingResult;
  /** Current buffer length */
  bufferLength: number;
  /** Timestamp */
  timestamp: Date;
}

// =============================================================================
// Fallback Types
// =============================================================================

/**
 * Recovery strategy types
 */
export type RecoveryStrategy =
  | 'json5_parse'           // Parse as JSON5
  | 'auto_repair'           // Apply automatic repairs
  | 'llm_assisted_repair'   // Use LLM to fix JSON
  | 'intent_extraction'     // Extract intent from natural language
  | 'partial_execution'     // Execute what we can parse
  | 'user_clarification'    // Ask user for help
  | 'manual_intervention';  // Requires manual fix

/**
 * Fallback result
 */
export interface FallbackResult {
  /** Strategy that was used */
  strategy: RecoveryStrategy;
  /** Parsing result */
  result: ParsingResult;
  /** Repairs/fixes applied */
  appliedFixes?: string[];
  /** Confidence in the fallback result */
  confidence: number;
}

/**
 * Recovery plan
 */
export interface RecoveryPlan {
  /** Primary strategy to try */
  primaryStrategy: RecoveryStrategy;
  /** Fallback strategies in order */
  fallbackStrategies: RecoveryStrategy[];
  /** Estimated success rate */
  estimatedSuccessRate: number;
  /** User input required? */
  requiredUserInput?: string[];
  /** Timeout for recovery */
  timeoutMs: number;
}

// =============================================================================
// Performance Types
// =============================================================================

/**
 * Percentile statistics
 */
export interface PercentileStats {
  p50: number;
  p90: number;
  p99: number;
  max: number;
  min: number;
  avg: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Parsing time statistics */
  parsingTime: PercentileStats;
  /** Success rates */
  successRate: {
    firstAttempt: number;
    withFallback: number;
    byModel: Record<ModelType, number>;
  };
  /** Error distribution */
  errorDistribution: {
    byType: Record<ValidationErrorCode, number>;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  /** Cache efficiency */
  cacheEfficiency: {
    hitRate: number;
    size: number;
    evictionRate: number;
  };
  /** Total requests processed */
  totalRequests: number;
  /** Uptime in ms */
  uptime: number;
}
