# Advanced JSON Parser Implementation Plan

## Overview

Implement a production-grade, fault-tolerant JSON parser based on the specification in `json_parser_specs.md`, with additional enhancements for JSON5 support, fuzzy matching, semantic parameter mapping, and intelligent type coercion.

---

## Phase 1: Core Infrastructure

### 1.1 Create Base Types and Interfaces

**File:** `src/ai/parser/types.ts`

```typescript
// Extraction types
interface ExtractionResult {
  json: unknown;
  sourceText: string;
  startIndex: number;
  endIndex: number;
  extractionMethod: ExtractionMethod;
  confidence: number;
  validationErrors: ValidationError[];
}

// Validation types
interface ValidationResult {
  isValid: boolean;
  normalizedData: unknown;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  coercedValues: Record<string, { from: unknown; to: unknown }>;
}

// Normalized output
interface NormalizedToolCall {
  id: string;
  tool: string;
  parameters: Record<string, unknown>;
  confidence: number;
  sourceFormat: OutputFormat;
  rawData: unknown;
  metadata: ToolCallMetadata;
}

// Parser context
interface ParserContext {
  modelType: ModelType;
  selection: string[];
  viewport: Viewport;
  conversationHistory: Message[];
  toolRegistry: Map<string, ToolSchema>;
}
```

### 1.2 Create Parser Configuration

**File:** `src/ai/parser/config.ts`

```typescript
interface ParserConfig {
  strictMode: boolean;           // Reject on any validation error
  allowPartial: boolean;         // Accept partial tool calls
  attemptRepairs: boolean;       // Try to fix malformed JSON
  useFallbacks: boolean;         // Use fallback strategies
  maxRepairAttempts: number;     // Max repair iterations
  timeoutMs: number;             // Parsing timeout
  enableJson5: boolean;          // Parse JSON5 syntax
  fuzzyToolMatching: boolean;    // Match similar tool names
  semanticParamMapping: boolean; // Map alternative param names
}

const DEFAULT_CONFIG: ParserConfig = {
  strictMode: false,
  allowPartial: true,
  attemptRepairs: true,
  useFallbacks: true,
  maxRepairAttempts: 3,
  timeoutMs: 5000,
  enableJson5: true,
  fuzzyToolMatching: true,
  semanticParamMapping: true
};
```

---

## Phase 2: JSON Extractor Engine

### 2.1 Multi-Strategy Extraction

**File:** `src/ai/parser/extractor.ts`

Implement 5 extraction strategies:

1. **Markdown Code Block** (highest priority)
   - Pattern: ` ```json ... ``` ` or ` ``` ... ``` `
   - Confidence: 0.95

2. **AST Balanced Braces**
   - Track `{` and `}` with proper string handling
   - Handles nested objects correctly
   - Confidence: 0.85

3. **Regex Full JSON**
   - Pattern: `\{[\s\S]*\}` with greedy matching
   - Confidence: 0.75

4. **Inline JSON Detection**
   - Look for `{ "tool":` or `{ "name":` patterns
   - Confidence: 0.70

5. **Partial JSON Recovery**
   - Attempt to complete truncated JSON using schema
   - Confidence: 0.50

### 2.2 Candidate Ranking

```typescript
function selectBestCandidate(candidates: ExtractionResult[]): ExtractionResult {
  return candidates.sort((a, b) => {
    // Primary: confidence score
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence;
    }
    // Secondary: fewer validation errors
    if (a.validationErrors.length !== b.validationErrors.length) {
      return a.validationErrors.length - b.validationErrors.length;
    }
    // Tertiary: prefer earlier in text (intentional)
    return a.startIndex - b.startIndex;
  })[0];
}
```

---

## Phase 3: JSON5 Parser Integration

### 3.1 JSON5 Support

**File:** `src/ai/parser/json5-parser.ts`

Use or implement JSON5 parsing to handle:
- Trailing commas: `{"x": 100, "y": 200,}`
- Unquoted keys: `{x: 100, y: 200}`
- Single quotes: `{'x': 100}`
- Comments: `// comment` and `/* comment */`
- Hexadecimal numbers: `0xFF`
- Leading/trailing decimal: `.5` and `5.`
- Infinity/NaN: `Infinity`, `-Infinity`, `NaN`
- Multi-line strings

Options:
1. Use `json5` npm package
2. Implement lightweight parser for common cases

### 3.2 Repair Fallback

If JSON5 fails, apply repairs:

```typescript
const REPAIR_RULES = [
  // Missing commas
  { pattern: /}(\s*){/g, fix: '}, {' },
  { pattern: /"(\s+)"/g, fix: '", "' },

  // Trailing commas (if not using JSON5)
  { pattern: /,(\s*[}\]])/g, fix: '$1' },

  // Unquoted keys
  { pattern: /([{,]\s*)(\w+)(\s*:)/g, fix: '$1"$2"$3' },

  // Single quotes to double
  { pattern: /'/g, fix: '"' },

  // Python-style None/True/False
  { pattern: /\bNone\b/g, fix: 'null' },
  { pattern: /\bTrue\b/g, fix: 'true' },
  { pattern: /\bFalse\b/g, fix: 'false' },
];
```

---

## Phase 4: Schema Validator

### 4.1 Tool Schema Registry

**File:** `src/ai/parser/schema-registry.ts`

```typescript
class ToolSchemaRegistry {
  private schemas: Map<string, ToolSchema> = new Map();
  private aliases: Map<string, string> = new Map();

  register(schema: ToolSchema): void;
  get(toolName: string): ToolSchema | null;
  findFuzzy(toolName: string, threshold?: number): ToolSchema | null;
  addAlias(alias: string, canonicalName: string): void;
}
```

### 4.2 Fuzzy Tool Matching

**File:** `src/ai/parser/fuzzy-matcher.ts`

```typescript
function findClosestTool(
  input: string,
  registry: ToolSchemaRegistry,
  threshold: number = 0.7
): { tool: string; similarity: number } | null {
  // Use Levenshtein distance or Jaro-Winkler
  // Return best match if above threshold
}

// Common aliases
const TOOL_ALIASES: Record<string, string> = {
  'create_rect': 'create_rectangle',
  'make_rectangle': 'create_rectangle',
  'add_rectangle': 'create_rectangle',
  'rectangle': 'create_rectangle',
  'create_circle': 'create_ellipse',
  'create_oval': 'create_ellipse',
  'set_color': 'set_fill_color',
  'fill': 'set_fill_color',
  'stroke': 'set_stroke_color',
  // ... more aliases
};
```

### 4.3 Semantic Parameter Mapping

**File:** `src/ai/parser/param-mapper.ts`

```typescript
const PARAM_ALIASES: Record<string, Record<string, string>> = {
  // Position aliases
  'x': ['posX', 'pos_x', 'left', 'xPos', 'xPosition'],
  'y': ['posY', 'pos_y', 'top', 'yPos', 'yPosition'],

  // Size aliases
  'width': ['w', 'sizeX', 'size_x'],
  'height': ['h', 'sizeY', 'size_y'],

  // Style aliases
  'fill': ['color', 'backgroundColor', 'background', 'bg', 'fillColor'],
  'stroke': ['border', 'outline', 'strokeColor', 'borderColor'],

  // Corner radius
  'cornerRadius': ['radius', 'borderRadius', 'rounded', 'corners'],
};

function mapParameters(
  params: Record<string, unknown>,
  schema: ToolSchema
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [schemaKey, schemaParam] of Object.entries(schema.parameters)) {
    // Direct match
    if (schemaKey in params) {
      result[schemaKey] = params[schemaKey];
      continue;
    }

    // Alias match
    const aliases = PARAM_ALIASES[schemaKey] || [];
    for (const alias of aliases) {
      if (alias in params) {
        result[schemaKey] = params[alias];
        break;
      }
    }
  }

  return result;
}
```

---

## Phase 5: Type Coercion

### 5.1 Color Normalization

**File:** `src/ai/parser/color-coercer.ts`

```typescript
interface NormalizedColor {
  r: number; // 0-1
  g: number;
  b: number;
  a: number;
}

function coerceColor(input: unknown): NormalizedColor | null {
  if (typeof input === 'string') {
    // Hex: #RGB, #RRGGBB, #RRGGBBAA
    if (input.startsWith('#')) {
      return parseHexColor(input);
    }

    // RGB/RGBA: rgb(r, g, b), rgba(r, g, b, a)
    if (input.startsWith('rgb')) {
      return parseRgbColor(input);
    }

    // HSL: hsl(h, s%, l%), hsla(h, s%, l%, a)
    if (input.startsWith('hsl')) {
      return parseHslColor(input);
    }

    // Named color: "red", "blue", etc.
    return parseNamedColor(input);
  }

  if (typeof input === 'object' && input !== null) {
    // Object format: { r, g, b, a }
    const obj = input as Record<string, unknown>;
    return normalizeColorObject(obj);
  }

  return null;
}
```

### 5.2 Number Coercion

```typescript
function coerceNumber(input: unknown): number | null {
  if (typeof input === 'number') return input;
  if (typeof input === 'string') {
    // Handle units: "100px", "50%", "2rem"
    const match = input.match(/^(-?\d*\.?\d+)(px|%|rem|em|pt)?$/);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  return null;
}
```

---

## Phase 6: Format Normalizer

### 6.1 Format Detection

**File:** `src/ai/parser/format-detector.ts`

```typescript
function detectFormat(data: unknown): DetectedFormat {
  if (isClaudeToolUse(data)) {
    return { format: 'claude_tool_use', confidence: 0.95 };
  }
  if (isOpenAIFunctionCall(data)) {
    return { format: 'openai_function_call', confidence: 0.95 };
  }
  if (isOllamaJson(data)) {
    return { format: 'ollama_json', confidence: 0.85 };
  }
  if (isMarkdownJson(data)) {
    return { format: 'markdown_json', confidence: 0.80 };
  }
  return { format: 'custom_structured', confidence: 0.60 };
}

// Detection helpers
function isClaudeToolUse(data: unknown): boolean {
  // Look for { content: [{ type: 'tool_use', ... }] }
}

function isOpenAIFunctionCall(data: unknown): boolean {
  // Look for { choices: [{ message: { tool_calls: [...] } }] }
}

function isOllamaJson(data: unknown): boolean {
  // Look for { tool: "...", parameters: {...} } or { commands: [...] }
}
```

### 6.2 Format Converters

```typescript
const FORMAT_CONVERTERS: Record<OutputFormat, FormatConverter> = {
  claude_tool_use: {
    extract: (data) => {
      // Extract from data.content[].tool_use
    }
  },
  openai_function_call: {
    extract: (data) => {
      // Extract from data.choices[0].message.tool_calls
    }
  },
  ollama_json: {
    extract: (data) => {
      // Extract from data.tool/parameters or data.commands
    }
  },
  // ... etc
};
```

---

## Phase 7: Fallback & Recovery System

### 7.1 Tiered Fallback Handler

**File:** `src/ai/parser/fallback-handler.ts`

```typescript
class FallbackHandler {
  async handleFailure(
    error: Error,
    rawOutput: string,
    context: ParserContext
  ): Promise<FallbackResult> {

    // Tier 1: JSON5 + Repairs
    const repaired = await this.attemptRepairs(rawOutput);
    if (repaired.success) {
      return { strategy: 'repair', result: repaired.data };
    }

    // Tier 2: Partial extraction
    const partial = await this.extractPartial(rawOutput, context);
    if (partial.length > 0) {
      return { strategy: 'partial', result: partial };
    }

    // Tier 3: Intent inference (extract from natural language)
    const intent = await this.inferIntent(rawOutput, context);
    if (intent) {
      return { strategy: 'intent', result: intent };
    }

    // Tier 4: Fail with suggestions
    return {
      strategy: 'failed',
      error: error.message,
      suggestions: this.generateSuggestions(rawOutput)
    };
  }
}
```

---

## Phase 8: Streaming Parser

### 8.1 Incremental JSON Parser

**File:** `src/ai/parser/streaming-parser.ts`

```typescript
class IncrementalJSONParser {
  private buffer: string = '';
  private stack: string[] = [];
  private inString: boolean = false;
  private escapeNext: boolean = false;
  private completedObjects: unknown[] = [];

  feed(chunk: string): ParseProgress {
    for (const char of chunk) {
      this.buffer += char;
      this.updateState(char);

      // Check if we completed an object
      if (this.isComplete()) {
        const parsed = this.tryParse();
        if (parsed) {
          this.completedObjects.push(parsed);
          this.reset();
        }
      }
    }

    return {
      state: this.stack.length === 0 ? 'complete' : 'partial',
      depth: this.stack.length,
      completed: this.completedObjects,
      buffer: this.buffer
    };
  }

  private updateState(char: string): void {
    if (this.escapeNext) {
      this.escapeNext = false;
      return;
    }

    if (this.inString) {
      if (char === '\\') this.escapeNext = true;
      else if (char === '"') this.inString = false;
      return;
    }

    switch (char) {
      case '{': case '[': this.stack.push(char); break;
      case '}': case ']': this.stack.pop(); break;
      case '"': this.inString = true; break;
    }
  }
}
```

---

## Phase 9: Main Parser Integration

### 9.1 AIOutputParser Class

**File:** `src/ai/parser/ai-output-parser.ts`

```typescript
class AIOutputParser {
  private config: ParserConfig;
  private extractor: JSONExtractor;
  private validator: SchemaValidator;
  private normalizer: FormatNormalizer;
  private fallbackHandler: FallbackHandler;
  private schemaRegistry: ToolSchemaRegistry;

  async parse(
    rawOutput: string,
    context: ParserContext
  ): Promise<ParsingResult> {
    const startTime = Date.now();

    try {
      // Step 1: Extract all JSON candidates
      const candidates = await this.extractor.extractAll(rawOutput);

      // Step 2: Select best candidate
      const selected = this.extractor.selectBestCandidate(candidates);
      if (!selected) {
        throw new Error('No valid JSON found in output');
      }

      // Step 3: Detect format and normalize
      const format = this.normalizer.detectFormat(selected.json);
      const normalized = this.normalizer.normalize(
        selected.json,
        format,
        context
      );

      // Step 4: Validate and coerce
      const validated = await this.validator.validate(
        normalized,
        this.schemaRegistry
      );

      // Step 5: Enrich with context
      const enriched = this.enrichToolCalls(validated.normalizedData, context);

      return {
        success: true,
        toolCalls: enriched,
        metadata: {
          parsingTime: Date.now() - startTime,
          extractionMethod: selected.extractionMethod,
          format: format.format,
          confidence: selected.confidence,
          coercions: validated.coercedValues,
          warnings: validated.warnings
        }
      };

    } catch (error) {
      // Use fallback strategies
      if (this.config.useFallbacks) {
        return this.fallbackHandler.handleFailure(
          error as Error,
          rawOutput,
          context
        );
      }
      throw error;
    }
  }
}
```

---

## Phase 10: Integration with AI Controller

### 10.1 Replace Simple Parser

Update `ai-controller.ts` to use the new parser:

```typescript
import { AIOutputParser } from './parser/ai-output-parser';

class AIController {
  private parser: AIOutputParser;

  constructor(runtime: DesignLibreRuntime, config: AIControllerConfig) {
    // ... existing init

    this.parser = new AIOutputParser({
      strictMode: false,
      enableJson5: true,
      fuzzyToolMatching: true,
      semanticParamMapping: true
    });

    // Register tool schemas
    this.registerToolSchemas();
  }

  async chat(message: string, options: ChatOptions): Promise<AIResponse> {
    // ... existing code ...

    // Replace simple parsing with advanced parser
    if (response.toolCalls.length === 0 && response.content) {
      const context = this.buildParserContext();
      const parsed = await this.parser.parse(response.content, context);

      if (parsed.success && parsed.toolCalls.length > 0) {
        console.log(`Advanced parser found ${parsed.toolCalls.length} tool(s)`);
        toolCallsToExecute = parsed.toolCalls;
      }
    }
  }
}
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `src/ai/parser/types.ts`
- [ ] Create `src/ai/parser/config.ts`

### Phase 2: JSON Extractor
- [ ] Create `src/ai/parser/extractor.ts`
- [ ] Implement 5 extraction strategies
- [ ] Implement candidate ranking

### Phase 3: JSON5 Support
- [ ] Add json5 package or implement parser
- [ ] Create `src/ai/parser/json5-parser.ts`
- [ ] Implement repair rules fallback

### Phase 4: Schema Validator
- [ ] Create `src/ai/parser/schema-registry.ts`
- [ ] Create `src/ai/parser/fuzzy-matcher.ts` (Levenshtein)
- [ ] Create `src/ai/parser/param-mapper.ts`
- [ ] Build tool alias database

### Phase 5: Type Coercion
- [ ] Create `src/ai/parser/color-coercer.ts`
- [ ] Create `src/ai/parser/type-coercer.ts`
- [ ] Support hex, rgb, rgba, hsl, named colors
- [ ] Support units (px, %, rem)

### Phase 6: Format Normalizer
- [ ] Create `src/ai/parser/format-detector.ts`
- [ ] Implement Claude format converter
- [ ] Implement OpenAI format converter
- [ ] Implement Ollama/Qwen format converter

### Phase 7: Fallback System
- [ ] Create `src/ai/parser/fallback-handler.ts`
- [ ] Implement 4-tier fallback strategy
- [ ] Add intent inference (extract from natural language)

### Phase 8: Streaming Parser
- [ ] Create `src/ai/parser/streaming-parser.ts`
- [ ] Implement incremental JSON parser
- [ ] Handle partial tool call detection

### Phase 9: Main Parser
- [ ] Create `src/ai/parser/ai-output-parser.ts`
- [ ] Wire all components together
- [ ] Add comprehensive tests

### Phase 10: Integration
- [ ] Update `ai-controller.ts`
- [ ] Register all tool schemas
- [ ] Test with Qwen, Llama, Mistral
- [ ] Performance benchmarks

---

## Success Criteria

1. **Parse Success Rate**: >95% for well-formed JSON, >80% for malformed
2. **Fuzzy Matching**: Correct tool identification with >3 character typos
3. **Parameter Mapping**: Handle >20 common parameter name variations
4. **Color Parsing**: Support hex, rgb, rgba, hsl, hsla, named colors
5. **Streaming**: Detect tool calls before response completes
6. **Performance**: <50ms parsing time for typical responses

---

## Test Cases

```typescript
// These should all parse successfully:
const testCases = [
  // Well-formed
  '{"tool": "create_rectangle", "parameters": {"x": 100, "y": 100}}',

  // Trailing comma (JSON5)
  '{"tool": "create_rectangle", "parameters": {"x": 100, "y": 100,},}',

  // Unquoted keys
  '{tool: "create_rectangle", parameters: {x: 100, y: 100}}',

  // Typo in tool name
  '{"tool": "create_rect", "params": {"x": 100, "y": 100}}',

  // Alternative parameter names
  '{"tool": "create_rectangle", "parameters": {"posX": 100, "posY": 100, "w": 50, "h": 50}}',

  // Color in various formats
  '{"tool": "set_fill_color", "parameters": {"color": "#FF5733"}}',
  '{"tool": "set_fill_color", "parameters": {"fill": "rgb(255, 87, 51)"}}',
  '{"tool": "set_fill_color", "parameters": {"backgroundColor": "red"}}',

  // Markdown wrapped
  '```json\n{"tool": "select_all"}\n```',

  // Multiple tools
  '{"commands": [{"tool": "create_rectangle"}, {"tool": "set_fill_color"}]}',

  // OpenAI format
  '{"choices": [{"message": {"tool_calls": [{"function": {"name": "create_rectangle"}}]}}]}',
];
```
