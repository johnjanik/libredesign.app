# **TypeScript JSON Parser Specification for AI Tool Calling**

## **Document:** JSON Parser & Structured Output Interceptor
**Version:** 2.0.0  
**Date:** 2026-01-06  
**Status:**  SPECIFICATION

---

## 1. Executive Summary

This specification defines a **production-grade, fault-tolerant JSON parser** designed to intercept and interpret structured tool calls from AI models that lack native function calling capabilities. The parser bridges the gap between local models (Llama, Qwen, Mistral) and API models (Claude, GPT) by normalizing their outputs into a unified execution format.

## 2. Problem Statement

### 2.1 Current Limitations
- **Local models** output JSON as plain text, not structured tool calls
- **Multiple formats** across different models (Claude `tool_use`, OpenAI `function_calls`, Ollama custom JSON)
- **Malformed JSON** due to model hallucinations, streaming artifacts, or partial responses
- **Mixed content** where JSON is embedded within markdown, explanations, or natural language

### 2.2 Requirements
1. **Universal compatibility** across all AI model outputs
2. **Graceful degradation** when parsing fails
3. **Schema validation** against tool definitions
4. **Context-aware recovery** from partial or malformed JSON
5. **Real-time streaming** support for token-by-token parsing

---

## 3. Architecture Overview

```typescript
┌─────────────────────────────────────────────────────────┐
│                    AI Model Output                       │
│  • Plain text with embedded JSON                        │
│  • Mixed markdown/JSON                                  │
│  • Partial or malformed JSON                            │
└───────────────┬─────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│               Multi-Format Parser Layer                  │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ JSON Extractor  │  │ Schema Validator│               │
│  │ • Regex patterns│  │ • JSON Schema   │               │
│  │ • AST parsing   │  │ • Zod validation│               │
│  └─────────────────┘  └─────────────────┘               │
└───────────────┬─────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│           Normalization & Transformation                 │
│  • Format conversion (Claude→Universal)                 │
│  • Parameter validation & coercion                      │
│  • Default value injection                              │
└───────────────┬─────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│              Execution-Ready Tool Calls                  │
│  • Validated, typed parameters                          │
│  • Context enrichment (selection, viewport)             │
│  • Priority ordering & dependency resolution            │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Core Components Specification

### 4.1 **JSON Extractor Engine**

```typescript
interface JSONExtractor {
	/**
	* Extracts JSON from mixed-content text using multiple strategies
	* Returns all potential JSON objects found, ranked by confidence
	*/
	extractAll(text: string): ExtractionResult[];
	
	/**
	* Intelligently selects the best JSON candidate
	* Uses heuristics, schema matching, and contextual clues
	*/
	selectBestCandidate(candidates: ExtractionResult[]): SelectedCandidate;
}

interface ExtractionResult {
	json: any;
	sourceText: string;
	startIndex: number;
	endIndex: number;
	extractionMethod: ExtractionMethod;
	confidence: number;
	validationErrors: ValidationError[];
}

enum ExtractionMethod {
	REGEX_FULL_JSON = "regex_full_json",
	REGEX_PARTIAL = "regex_partial",
	AST_BALANCED = "ast_balanced",
	MARKDOWN_CODEBLOCK = "markdown_codeblock",
	LLM_ASSISTED = "llm_assisted"
}
```

#### 4.1.1 Extraction Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **Regex Full JSON** | `/\{[\s\S]*\}/` or `/\[[\s\S]*\]/` | Well-formed JSON in plain text |
| **Regex Partial** | `/\{[^}]*\}/` (greedy) | Incomplete or malformed JSON |
| **AST Balanced** | Find balanced `{}` or `[]` using stack | Nested structures, streaming chunks |
| **Markdown Codeblock** | Extract ` ```json ... ``` ` blocks | Models that output formatted responses |
| **LLM Assisted** | Use small model to fix/complete JSON | Severely malformed content |

### 4.2 **Schema-Driven Validator**

```typescript
interface SchemaValidator {
/**
* Validates extracted JSON against tool schemas
* Performs type coercion, default injection, and normalization
*/
validate(
candidate: any, 
toolSchemas: Map<string, ToolSchema>
): ValidationResult;

/**
* Attempts to repair common JSON errors
* - Missing commas
* - Unquoted keys
* - Trailing commas
* - Mismatched quotes
*/
attemptRepair(jsonString: string): RepairResult;
}

interface ToolSchema {
id: string;
name: string;
description: string;
parameters: JSONSchema;
required: string[];
defaults: Record<string, any>;
returns?: JSONSchema;
dependencies?: string[];
}

interface ValidationResult {
isValid: boolean;
normalizedData: any;
errors: ValidationError[];
warnings: ValidationWarning[];
coercedValues: Record<string, {from: any, to: any}>;
}

interface ValidationError {
path: string[];
code: ValidationErrorCode;
message: string;
suggestedFix?: string;
}

enum ValidationErrorCode {
REQUIRED_PARAMETER_MISSING = "required_parameter_missing",
INVALID_TYPE = "invalid_type",
INVALID_ENUM_VALUE = "invalid_enum_value",
NUMBER_OUT_OF_RANGE = "number_out_of_range",
STRING_PATTERN_MISMATCH = "string_pattern_mismatch",
UNKNOWN_TOOL = "unknown_tool"
}
```

### 4.3 **Format Normalizer**

```typescript
interface FormatNormalizer {
/**
* Converts model-specific formats to universal tool calls
*/
normalize(
modelOutput: any,
modelType: ModelType,
context: ParserContext
): NormalizedToolCall[];

/**
* Detects the output format based on structure
*/
detectFormat(data: any): DetectedFormat;
}

type ModelType = 
| "claude"
| "openai"
| "anthropic"
| "ollama"
| "llama"
| "qwen"
| "mistral"
| "gemini";

interface DetectedFormat {
format: OutputFormat;
confidence: number;
version?: string;
}

type OutputFormat = 
| "claude_tool_use"
| "openai_function_call"
| "anthropic_beta_tools"
| "ollama_json"
| "custom_structured"
| "markdown_json"
| "unknown";

interface NormalizedToolCall {
id: string;
tool: string;
parameters: Record<string, any>;
confidence: number;
sourceFormat: OutputFormat;
rawData: any;
metadata: {
	model: string;
	timestamp: Date;
	parsingMethod: string;
};
}
```

---

## 5. Parser Implementation Specification

### 5.1 **Main Parser Class**

```typescript
class AIOutputParser {
// Configuration
private config: ParserConfig;

// Sub-components
private extractor: JSONExtractor;
private validator: SchemaValidator;
private normalizer: FormatNormalizer;
private fallbackHandler: FallbackHandler;

// State
private context: ParserContext;
private toolRegistry: Map<string, ToolSchema>;
private modelCapabilities: ModelCapabilities;

constructor(config: Partial<ParserConfig> = {}) {
	this.config = {
		// Default configuration
		strictMode: false,
		allowPartial: true,
		attemptRepairs: true,
		useFallbacks: true,
		maxRepairAttempts: 3,
		timeoutMs: 5000,
		...config
	};
	
	this.initializeComponents();
}

/**
* Main entry point: Parse AI output into executable tool calls
*/
async parse(
rawOutput: string,
context: ParserContext
): Promise<ParsingResult> {
	const startTime = Date.now();
	
	try {
		// Step 1: Extract potential JSON from raw text
		const extractionResults = await this.extractor.extractAll(rawOutput);
		
		// Step 2: Select best candidate
		const selected = this.extractor.selectBestCandidate(extractionResults);
		
		// Step 3: Validate against schemas
		const validation = await this.validator.validate(
		selected.json,
		this.toolRegistry
		);
		
		// Step 4: Normalize to universal format
		const normalized = await this.normalizer.normalize(
		validation.normalizedData,
		context.modelType,
		context
		);
		
		// Step 5: Enrich with context
		const enriched = await this.enrichToolCalls(normalized, context);
		
		return {
			success: true,
			toolCalls: enriched,
			metadata: {
				parsingTime: Date.now() - startTime,
				extractionMethod: selected.extractionMethod,
				validationScore: validation.errors.length === 0 ? 1.0 : 0.5,
				warnings: validation.warnings,
				rawOutputSnippet: rawOutput.substring(0, 200)
			}
		};
		
	} catch (error) {
		// Fallback strategies
		return await this.handleParsingFailure(error, rawOutput, context);
	}
}

/**
* Streaming parser for token-by-token processing
*/
async *parseStream(
stream: AsyncIterable<string>,
context: ParserContext
): AsyncIterable<ParsingUpdate> {
	let buffer = "";
	let partialResult: PartialParsingResult = {};
	
	for await (const chunk of stream) {
		buffer += chunk;
		
		// Attempt incremental parsing
		const incremental = await this.parseIncremental(buffer, context);
		
		if (incremental.state !== "no_progress") {
			yield {
				type: "incremental",
				data: incremental,
				bufferLength: buffer.length
			};
			
			// Update partial result
			partialResult = this.mergePartialResults(partialResult, incremental);
		}
	}
	
	// Final parsing attempt
	const final = await this.parse(buffer, context);
	yield {
		type: "final",
		data: final,
		bufferLength: buffer.length
	};
}
}
```

### 5.2 **Context Management**

```typescript
interface ParserContext {
// Model information
modelType: ModelType;
modelVersion: string;
modelCapabilities: ModelCapabilities;

// Design context
documentState: DocumentState;
selection: string[];
viewport: Viewport;
activeTool: string | null;

// Conversation context
conversationHistory: Message[];
lastSuccessfulToolCall?: ToolCall;
userIntent?: string;

// Parser state
previousAttempts: ParsingAttempt[];
fallbackLevel: number;
}

interface ModelCapabilities {
supportsNativeToolCalls: boolean;
supportsStructuredOutput: boolean;
supportsVision: boolean;
maxOutputTokens: number;
knownFormats: OutputFormat[];
knownIssues: KnownIssue[];
}

interface KnownIssue {
issue: string;
pattern: RegExp;
fix: (text: string) => string;
frequency: number;
}
```

### 5.3 **Fallback & Recovery System**

```typescript
class FallbackHandler {
/**
* Implements multi-tier fallback strategy
*/
async handleFailure(
error: Error,
rawOutput: string,
context: ParserContext,
previousAttempts: ParsingAttempt[]
): Promise<FallbackResult> {
	
	// Tier 1: Simple repairs
	if (context.fallbackLevel === 0) {
		const repaired = await this.attemptSimpleRepairs(rawOutput);
		if (repaired.success) {
			return {
				strategy: "simple_repair",
				result: await this.parser.parse(repaired.text, {
					...context,
					fallbackLevel: 1
				}),
				appliedFixes: repaired.appliedFixes
			};
		}
	}
	
	// Tier 2: LLM-assisted repair
	if (context.fallbackLevel <= 1) {
		const llmRepaired = await this.attemptLLMRepair(rawOutput, context);
		if (llmRepaired.success) {
			return {
				strategy: "llm_assisted",
				result: await this.parser.parse(llmRepaired.text, {
					...context,
					fallbackLevel: 2
				}),
				appliedFixes: llmRepaired.appliedFixes
			};
		}
	}
	
	// Tier 3: Intent-based fallback
	if (context.fallbackLevel <= 2) {
		const intent = await this.extractIntent(rawOutput, context);
		const inferred = await this.inferToolsFromIntent(intent, context);
		
		return {
			strategy: "intent_inference",
			result: {
				success: true,
				toolCalls: inferred,
				metadata: {
					intentExtracted: intent,
					confidence: 0.7,
					note: "Tool calls inferred from user intent"
				}
			}
		};
	}
	
	// Tier 4: Manual intervention required
	return {
		strategy: "manual_intervention",
		result: {
			success: false,
			error: "Failed to parse after all fallback strategies",
			suggestions: this.generateManualSuggestions(rawOutput, error)
		}
	};
}
}
```

---

## 6. Supported Input Formats

### 6.1 **Claude-Style (Native Tool Use)**
```json
{
"content": [
{
	"type": "text",
	"text": "I'll create a submit button for you."
},
{
	"type": "tool_use",
	"id": "toolu_01",
	"name": "create_rectangle",
	"input": {
		"x": 100,
		"y": 100,
		"width": 120,
		"height": 48,
		"cornerRadius": 8,
		"fill": "#3B82F6"
	}
}
]
}
```

### 6.2 **OpenAI-Style (Function Calls)**
```json
{
"choices": [{
	"message": {
		"content": null,
		"tool_calls": [{
			"id": "call_abc123",
			"type": "function",
			"function": {
				"name": "create_rectangle",
				"arguments": "{\"x\":100,\"y\":100,\"width\":120,\"height\":48}"
			}
		}]
	}
}]
}
```

### 6.3 **Ollama/Qwen-Style (Custom JSON)**
```json
{
"thinking": "I need to create a button with rounded corners and shadow",
"commands": [
{
	"tool": "create_rectangle",
	"params": {
		"x": 100,
		"y": 100,
		"width": 120,
		"height": 48,
		"cornerRadius": 8
	}
},
{
	"tool": "add_drop_shadow",
	"params": {
		"offsetX": 0,
		"offsetY": 4,
		"blur": 12,
		"color": "rgba(0,0,0,0.1)"
	}
}
],
"response": "Created a submit button with rounded corners and shadow"
}
```

### 6.4 **Markdown-Embedded JSON**
```markdown
I'll create a submit button with the requested features.

```json
{
"actions": [
{
	"type": "create_rectangle",
	"parameters": {
		"x": 100,
		"y": 100,
		"width": 120,
		"height": 48,
		"cornerRadius": 8
	}
}
]
}
```

The button will have rounded corners and a drop shadow.
```

### 6.5 **Plain Text with JSON Fragments**
```
First, I'll create the button rectangle at position (100, 100) with size 120x48.
Action: {"tool": "create_rectangle", "x": 100, "y": 100, "width": 120, "height": 48}

Then I'll round the corners to 8px.
Action: {"tool": "set_corner_radius", "radius": 8}

Finally, I'll add a drop shadow.
Action: {"tool": "add_drop_shadow", "offsetX": 0, "offsetY": 4, "blur": 12}
```

---

## 7. Advanced Features

### 7.1 **Incremental & Streaming Parsing**
```typescript
interface StreamingParser {
/**
* Handles token-by-token parsing for streaming responses
*/
parseToken(token: string): ParsingState;

/**
* Detects when a JSON object is complete enough to parse
*/
isComplete(): boolean;

/**
* Returns the best partial parse so far
*/
getBestPartial(): PartialToolCall[];
}

class IncrementalJSONParser {
private stack: string[] = [];
private buffer: string = "";
private inString: boolean = false;
private escapeNext: boolean = false;

feed(char: string): ParseProgress {
	this.buffer += char;
	
	// Track JSON structure
	if (!this.inString) {
		if (char === '{' || char === '[') {
				this.stack.push(char);
			} else if (char === '}' || char === ']') {
			this.stack.pop();
		} else if (char === '"') {
			this.inString = true;
		}
	} else {
		if (this.escapeNext) {
			this.escapeNext = false;
		} else if (char === '\\') {
			this.escapeNext = true;
		} else if (char === '"') {
			this.inString = false;
		}
	}
	
	// Check if we have a complete JSON object
	if (this.stack.length === 0 && !this.inString) {
		try {
			const parsed = JSON.parse(this.buffer);
			return {
				state: "complete",
				data: parsed,
				buffer: this.buffer
			};
		} catch {
			// Not valid JSON yet, continue
		}
	}
	
	// Return partial state
	return {
		state: "partial",
		depth: this.stack.length,
		inString: this.inString,
		buffer: this.buffer
	};
}
}
```

### 7.2 **Schema-Aware Default Injection**
```typescript
class DefaultInjector {
/**
* Injects missing parameters with defaults from schema
*/
injectDefaults(
parameters: Record<string, any>,
schema: ToolSchema,
context: ParserContext
): Record<string, any> {
	const result = { ...parameters };
	
	for (const [paramName, paramSchema] of Object.entries(schema.parameters)) {
		if (!(paramName in result)) {
			// Use explicit default from schema
			if ('default' in paramSchema) {
				result[paramName] = paramSchema.default;
			}
			// Infer from context
			else if (paramName === 'layerId' && context.activeLayerId) {
				result[paramName] = context.activeLayerId;
			}
			// Use type-specific defaults
			else {
				result[paramName] = this.getTypeDefault(paramSchema.type);
			}
		}
	}
	
	return result;
}

private getTypeDefault(type: string): any {
	switch (type) {
		case 'string': return '';
		case 'number': return 0;
		case 'boolean': return false;
		case 'array': return [];
		case 'object': return {};
		default: return null;
	}
}
}
```

### 7.3 **Confidence Scoring & Ranking**
```typescript
interface ConfidenceScorer {
/**
* Scores parsing results by multiple criteria
*/
score(result: ParsingResult): ParsingScore;

/**
* Ranks multiple parsing attempts
*/
rank(attempts: ParsingAttempt[]): RankedAttempt[];
}

interface ParsingScore {
overall: number;
components: {
	structural: number;      // Valid JSON structure
	semantic: number;        // Matches expected schema
	contextual: number;      // Fits current context
	completeness: number;    // All required parameters present
	plausibility: number;    // Makes sense for the task
};
flags: {
	hasMissingRequired: boolean;
	hasTypeMismatches: boolean;
	hasOutOfRange: boolean;
	hasUnknownTool: boolean;
};
}
```

---

## 8. Error Handling & Recovery

### 8.1 **Common Error Patterns & Fixes**

| Error Pattern | Detection | Automatic Fix |
|---------------|-----------|---------------|
| **Missing commas** | `{"x":100 "y":200}` | Insert comma: `{"x":100, "y":200}` |
| **Unquoted keys** | `{x:100, y:200}` | Quote keys: `{"x":100, "y":200}` |
| **Trailing commas** | `{"x":100, "y":200,}` | Remove trailing comma |
| **Mismatched quotes** | `{"text": "It's "quoted""}` | Escape inner quotes |
| **Incomplete objects** | `{"tool": "create_rect"` | Attempt completion using schema |
| **Mixed content** | `Text {json} more text` | Extract JSON portion |
| **Markdown artifacts** | ````json\n{...}\n```` | Strip markdown wrapper |

### 8.2 **Recovery Strategies**
```typescript
enum RecoveryStrategy {
	AUTO_REPAIR = "auto_repair",
	LLM_ASSISTED_REPAIR = "llm_assisted_repair",
	INTENT_EXTRACTION = "intent_extraction",
	PARTIAL_EXECUTION = "partial_execution",
	USER_CLARIFICATION = "user_clarification"
}

interface RecoveryPlan {
	primaryStrategy: RecoveryStrategy;
	fallbackStrategies: RecoveryStrategy[];
	estimatedSuccessRate: number;
	requiredUserInput?: string[];
	timeoutMs: number;
}
```

---

## 9. Integration with AI Model Adapters

### 9.1 **Unified Parser-Adapter Interface**
```typescript
interface UnifiedAIParser {
	/**
	* Universal parse method that works with any model output
	*/
	parseModelOutput(
	rawOutput: any,
	adapter: AIModelAdapter,
	context: ParserContext
	): Promise<ParsingResult>;
	
	/**
	* Registers model-specific parsing rules
	*/
	registerModelParser(
	modelType: ModelType,
	parser: ModelSpecificParser
	): void;
}

class ModelSpecificParser {
	constructor(
	private modelCapabilities: ModelCapabilities,
	private knownFormats: OutputFormat[]
	) {}
	
	/**
	* Model-specific preprocessing
	*/
	preprocess(raw: any): string {
		// Extract text from model-specific response format
		if (this.modelCapabilities.supportsNativeToolCalls) {
			return this.extractFromToolCalls(raw);
		} else {
			return this.extractFromText(raw);
		}
	}
	
	/**
	* Model-specific postprocessing
	*/
	postprocess(parsed: ParsingResult, raw: any): ParsingResult {
		// Add model-specific metadata
		return {
			...parsed,
			metadata: {
				...parsed.metadata,
				modelSpecific: this.extractModelMetadata(raw)
			}
		};
	}
}
```

### 9.2 **Adapter Integration Example**
```typescript
class QwenAdapter implements AIModelAdapter {
	private parser: AIOutputParser;
	
	constructor() {
		this.parser = new AIOutputParser({
			// Qwen-specific configuration
			strictMode: false,  // Qwen often outputs informal JSON
			attemptRepairs: true,
			knownIssues: [
			{
				issue: "Qwen sometimes outputs unquoted keys",
				pattern: /(\w+):/g,
				fix: (text) => text.replace(/(\w+):/g, '"$1":')
			}
			]
		});
	}
	
	async parseResponse(response: any): Promise<AIModelResponse> {
		// Extract raw text from Qwen response
		const rawText = response.choices?.[0]?.message?.content || 
		response.response || 
		JSON.stringify(response);
		
		// Parse using universal parser
		const result = await this.parser.parse(rawText, {
			modelType: "qwen",
			modelVersion: response.model || "unknown",
			modelCapabilities: {
				supportsNativeToolCalls: false,
				supportsStructuredOutput: true,
				supportsVision: false,
				maxOutputTokens: 8192,
				knownFormats: ["ollama_json", "custom_structured", "markdown_json"]
			}
		});
		
		// Convert to universal AIModelResponse
		return {
			text: result.metadata?.rawOutputSnippet || "",
			toolCalls: result.toolCalls.map(tc => ({
				toolId: tc.tool,
				parameters: tc.parameters,
				confidence: tc.confidence
			})),
			confidence: result.metadata?.validationScore || 0.5,
			reasoning: result.metadata?.warnings?.join(", ")
		};
	}
}
```

---

## 10. Performance & Optimization

### 10.1 **Caching Strategy**
```typescript
interface ParserCache {
	/**
	* Cache successful parses to avoid re-parsing identical inputs
	*/
	getCacheKey(rawOutput: string, context: ParserContext): string;
	
	/**
	* Cache common repair patterns
	*/
	cacheRepairPattern(pattern: string, fix: string, successRate: number): void;
	
	/**
	* Cache model-specific output patterns
	*/
	cacheModelPattern(model: ModelType, pattern: RegExp, handler: Parser): void;
}

class LRUParserCache implements ParserCache {
	private maxSize: number = 1000;
	private cache = new Map<string, CachedParse>();
	
	get(key: string): CachedParse | null {
		const cached = this.cache.get(key);
		if (cached) {
			// Move to front (most recently used)
			this.cache.delete(key);
			this.cache.set(key, cached);
			return cached;
		}
		return null;
	}
	
	set(key: string, value: CachedParse): void {
		if (this.cache.size >= this.maxSize) {
			// Remove least recently used
			const firstKey = this.cache.keys().next().value;
			this.cache.delete(firstKey);
		}
		this.cache.set(key, value);
	}
}
```

### 10.2 **Performance Metrics**
```typescript
interface PerformanceMetrics {
	parsingTime: {
		p50: number;  // 50th percentile
		p90: number;  // 90th percentile
		p99: number;  // 99th percentile
		max: number;
	};
	
	successRate: {
		firstAttempt: number;
		withFallback: number;
		byModel: Record<ModelType, number>;
	};
	
	errorDistribution: {
		byType: Record<ValidationErrorCode, number>;
		bySeverity: {
			critical: number;
			high: number;
			medium: number;
			low: number;
		};
	};
	
	cacheEfficiency: {
		hitRate: number;
		size: number;
		evictionRate: number;
	};
}
```

---

## 11. Testing Strategy

### 11.1 **Test Suite Architecture**
```typescript
describe('AIOutputParser', () => {
	const parser = new AIOutputParser();
	
	describe('Format Detection', () => {
		test.each([
		['Claude tool_use', CLAUDE_OUTPUT, 'claude_tool_use'],
		['OpenAI function', OPENAI_OUTPUT, 'openai_function_call'],
		['Ollama JSON', OLLAMA_OUTPUT, 'ollama_json'],
		['Markdown JSON', MARKDOWN_OUTPUT, 'markdown_json'],
		['Plain text with JSON', MIXED_OUTPUT, 'custom_structured']
		])('%s', async (_, input, expectedFormat) => {
			const result = await parser.parse(input, basicContext);
			expect(result.metadata?.detectedFormat).toBe(expectedFormat);
		});
	});
	
	describe('Error Recovery', () => {
		test('Recovers from missing comma', async () => {
			const malformed = '{"tool":"create_rectangle" "x":100}';
			const result = await parser.parse(malformed, basicContext);
			expect(result.success).toBe(true);
			expect(result.toolCalls).toHaveLength(1);
		});
		
		test('Handles incomplete streaming JSON', async () => {
			const stream = simulateStream('{"tool":"create');
				const parser = new StreamingParser();
				
				for await (const chunk of stream) {
					parser.feed(chunk);
				}
				
				expect(parser.getResult().state).toBe('complete');
			});
		});
		
		describe('Schema Validation', () => {
			test('Rejects unknown tools', async () => {
				const output = '{"tool":"unknown_tool","params":{}}';
				const result = await parser.parse(output, basicContext);
				expect(result.success).toBe(false);
				expect(result.error).toContain('unknown_tool');
			});
			
			test('Injects missing defaults', async () => {
				const output = '{"tool":"create_rectangle","params":{"x":100}}';
				const result = await parser.parse(output, basicContext);
				expect(result.toolCalls[0].parameters.width).toBe(100); // Default
				expect(result.toolCalls[0].parameters.height).toBe(100); // Default
			});
		});
	});
	```
	
	### 11.2 **Test Data Generation**
	```typescript
	class TestDataGenerator {
		/**
		* Generates synthetic AI outputs for testing
		*/
		generateTestCases(count: number): TestCase[] {
			const cases: TestCase[] = [];
			
			for (let i = 0; i < count; i++) {
				cases.push({
					id: `test_${i}`,
					rawOutput: this.generateRandomOutput(),
					expectedTools: this.generateExpectedTools(),
					shouldSucceed: Math.random() > 0.2, // 80% success rate
					difficulty: this.randomDifficulty(),
					tags: this.randomTags()
				});
			}
			
			return cases;
		}
		
		private generateRandomOutput(): string {
			const formats = [
			this.generateClaudeFormat,
			this.generateOpenAIFormat,
			this.generateOllamaFormat,
			this.generateMalformedFormat,
			this.generateMixedFormat
			];
			
			const format = formats[Math.floor(Math.random() * formats.length)];
			return format.call(this);
		}
	}
	```
	
	---
	
	## 12. Deployment & Monitoring
	
	### 12.1 **Production Configuration**
	```yaml
	# parser.config.yaml
	parser:
	strictMode: false
	attemptRepairs: true
	useFallbacks: true
	maxRepairAttempts: 3
	timeoutMs: 5000
	
	extraction:
	methods:
	- regex_full_json
	- regex_partial
	- ast_balanced
	- markdown_codeblock
	priority: balanced
	
	validation:
	strictSchema: true
	injectDefaults: true
	coerceTypes: true
	
	caching:
	enabled: true
	maxSize: 1000
	ttl: 300000  # 5 minutes
	
	monitoring:
	enabled: true
	metrics:
	- parsing_time
	- success_rate
	- error_distribution
	- cache_efficiency
	alerts:
	- error_rate > 10%
	- p99_parsing_time > 1000ms
	```
	
	### 12.2 **Health Checks**
	```typescript
	interface ParserHealth {
		status: 'healthy' | 'degraded' | 'unhealthy';
		metrics: {
			uptime: number;
			requestCount: number;
			errorRate: number;
			cacheHitRate: number;
			avgParsingTime: number;
		};
		recentErrors: ParserError[];
		resourceUsage: {
			memory: number;
			cpu: number;
			cacheSize: number;
		};
		recommendations: string[];
	}
	
	class HealthMonitor {
		async checkHealth(): Promise<ParserHealth> {
			return {
				status: this.calculateStatus(),
				metrics: await this.collectMetrics(),
				recentErrors: this.errorTracker.getRecent(10),
				resourceUsage: await this.getResourceUsage(),
				recommendations: this.generateRecommendations()
			};
		}
	}
	```
	
	---
	
	## 13. Future Extensions
	
	### 13.1 **Planned Enhancements**
	1. **Machine Learning-Based Parser**
	- Train model to recognize tool call patterns
	- Adaptive parsing based on model behavior
	- Predictive error correction
	
	2. **Multi-Modal Parser**
	- Parse diagrams, sketches, or screenshots
	- Combine visual understanding with text parsing
	- Generate tool calls from visual inputs
	
	3. **Collaborative Parsing**
	- Multiple parser instances with voting
	- Consensus-based validation
	- Distributed repair strategies
	
	4. **Real-Time Adaptation**
	- Learn from user corrections
	- Adapt to individual model quirks
	- Personalized parsing rules

	---
	
	## 14. Conclusion
	
	This specification defines a **comprehensive, production-ready JSON parser** that solves the fundamental problem of local AI models lacking native tool calling capabilities. By implementing:
	
	1. **Multi-strategy extraction** for diverse output formats
	2. **Schema-driven validation** with intelligent defaults
	3. **Robust error recovery** with tiered fallback strategies
	4. **Streaming-aware parsing** for real-time responses
	5. **Performance-optimized** caching and processing
	
	The parser enables seamless integration of local vision and chat models into your 2D design application, providing users with natural language control regardless of the underlying AI model's capabilities.
	
	The architecture is designed to be **extensible, maintainable, and observable**, with comprehensive testing, monitoring, and future-proofing considerations built in from the ground up.