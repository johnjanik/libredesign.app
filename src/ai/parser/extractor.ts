/**
 * JSON Extractor Engine
 *
 * Multi-strategy JSON extraction from AI model outputs.
 * Finds, extracts, and ranks JSON candidates from mixed content.
 */

import type {
  ExtractionMethod,
  ExtractionResult,
  SelectedCandidate,
  KnownIssue,
} from './types';
import { EXTRACTION_CONFIDENCE } from './config';
import { parseJsonOrJson5 } from './json5-parser';
import { fullRepair, mightContainJson, extractJsonPortion } from './repair';

// =============================================================================
// Types
// =============================================================================

export interface ExtractorConfig {
  /** Extraction methods to use, in order of preference */
  methods: ExtractionMethod[];
  /** Minimum confidence to keep a candidate */
  minConfidence: number;
  /** Maximum candidates to return */
  maxCandidates: number;
  /** Enable JSON5 parsing */
  enableJson5: boolean;
  /** Enable repair attempts */
  enableRepair: boolean;
  /** Model-specific known issues */
  knownIssues: KnownIssue[];
}

const DEFAULT_EXTRACTOR_CONFIG: ExtractorConfig = {
  methods: [
    'markdown_codeblock',
    'ast_balanced',
    'json5_parse',
    'regex_full_json',
    'inline_json',
    'regex_partial',
  ],
  minConfidence: 0.3,
  maxCandidates: 10,
  enableJson5: true,
  enableRepair: true,
  knownIssues: [],
};

// =============================================================================
// Extraction Strategies
// =============================================================================

/**
 * Extract JSON from markdown code blocks
 * Pattern: ```json ... ``` or ``` ... ```
 */
function extractMarkdownCodeBlocks(text: string): ExtractionResult[] {
  const results: ExtractionResult[] = [];

  // Match ```json ... ``` or ``` ... ```
  const pattern = /```(?:json|JSON)?\s*\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const jsonStr = match[1]?.trim();
    if (!jsonStr) continue;

    const startIndex = match.index;
    const endIndex = match.index + match[0].length;

    // Try to parse
    const parseResult = parseJsonOrJson5(jsonStr);

    if (parseResult.success) {
      results.push({
        json: parseResult.value,
        sourceText: jsonStr,
        startIndex,
        endIndex,
        extractionMethod: 'markdown_codeblock',
        confidence: EXTRACTION_CONFIDENCE.markdown_codeblock,
        validationErrors: [],
      });
    } else {
      // Try with repair
      const repairResult = fullRepair(jsonStr);
      if (repairResult.success) {
        const reparsed = parseJsonOrJson5(repairResult.text);
        if (reparsed.success) {
          results.push({
            json: reparsed.value,
            sourceText: jsonStr,
            startIndex,
            endIndex,
            extractionMethod: 'markdown_codeblock',
            confidence: EXTRACTION_CONFIDENCE.markdown_codeblock * 0.9,
            validationErrors: [],
            appliedRepairs: repairResult.appliedRepairs,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Extract JSON using balanced brace tracking (AST-like)
 */
function extractBalancedBraces(text: string): ExtractionResult[] {
  const results: ExtractionResult[] = [];

  // Find all potential JSON start points
  const startIndices: Array<{ index: number; char: '{' | '[' }> = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') {
      startIndices.push({ index: i, char: text[i] as '{' | '[' });
    }
  }

  for (const { index: startIndex, char: startChar } of startIndices) {
    const endChar = startChar === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let endIndex = -1;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === startChar) {
          depth++;
        } else if (char === endChar) {
          depth--;
          if (depth === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
    }

    if (endIndex > startIndex) {
      const jsonStr = text.slice(startIndex, endIndex);

      // Try to parse
      const parseResult = parseJsonOrJson5(jsonStr);

      if (parseResult.success) {
        // Check if this is a duplicate of an existing result
        const isDuplicate = results.some(
          (r) => r.startIndex === startIndex && r.endIndex === endIndex
        );

        if (!isDuplicate) {
          results.push({
            json: parseResult.value,
            sourceText: jsonStr,
            startIndex,
            endIndex,
            extractionMethod: 'ast_balanced',
            confidence: EXTRACTION_CONFIDENCE.ast_balanced,
            validationErrors: [],
          });
        }
      }
    }
  }

  return results;
}

/**
 * Extract JSON using regex for full JSON objects
 */
function extractRegexFullJson(text: string): ExtractionResult[] {
  const results: ExtractionResult[] = [];

  // Match full JSON objects/arrays
  // This is a simplified pattern - real JSON can be more complex
  const pattern = /(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\])/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const jsonStr = match[1];
    if (!jsonStr) continue;
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;

    const parseResult = parseJsonOrJson5(jsonStr);

    if (parseResult.success) {
      results.push({
        json: parseResult.value,
        sourceText: jsonStr,
        startIndex,
        endIndex,
        extractionMethod: 'regex_full_json',
        confidence: EXTRACTION_CONFIDENCE.regex_full_json,
        validationErrors: [],
      });
    }
  }

  return results;
}

/**
 * Extract inline JSON patterns like: { "tool": "..." }
 */
function extractInlineJson(text: string): ExtractionResult[] {
  const results: ExtractionResult[] = [];

  // Look for patterns that look like tool calls
  const patterns = [
    /\{\s*"(?:tool|name|function)"\s*:\s*"[^"]+"/g,
    /\{\s*"(?:actions|commands|tools)"\s*:\s*\[/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const startIndex = match.index;

      // Try to find the complete JSON object using balanced braces
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      let endIndex = -1;

      for (let i = startIndex; i < text.length; i++) {
        const char = text[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\' && inString) {
          escapeNext = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') depth++;
          else if (char === '}') {
            depth--;
            if (depth === 0) {
              endIndex = i + 1;
              break;
            }
          }
        }
      }

      if (endIndex > startIndex) {
        const jsonStr = text.slice(startIndex, endIndex);
        const parseResult = parseJsonOrJson5(jsonStr);

        if (parseResult.success) {
          results.push({
            json: parseResult.value,
            sourceText: jsonStr,
            startIndex,
            endIndex,
            extractionMethod: 'inline_json',
            confidence: EXTRACTION_CONFIDENCE.inline_json,
            validationErrors: [],
          });
        }
      }
    }
  }

  return results;
}

/**
 * Extract using JSON portion extraction and repair
 */
function extractWithRepair(text: string, knownIssues: KnownIssue[]): ExtractionResult[] {
  const results: ExtractionResult[] = [];

  // Try to extract the JSON portion
  const jsonPortion = extractJsonPortion(text);
  if (!jsonPortion) return results;

  // Try full repair
  const repairResult = fullRepair(
    jsonPortion,
    knownIssues.map((ki) => ({ pattern: ki.pattern, fix: ki.fix, issue: ki.issue }))
  );

  if (repairResult.success) {
    const parseResult = parseJsonOrJson5(repairResult.text);

    if (parseResult.success) {
      const startIndex = text.indexOf(jsonPortion);
      results.push({
        json: parseResult.value,
        sourceText: jsonPortion,
        startIndex,
        endIndex: startIndex + jsonPortion.length,
        extractionMethod: 'repaired',
        confidence: EXTRACTION_CONFIDENCE.repaired,
        validationErrors: [],
        appliedRepairs: repairResult.appliedRepairs,
      });
    }
  }

  return results;
}

// =============================================================================
// Main Extractor Class
// =============================================================================

/**
 * JSON Extractor Engine
 */
export class JSONExtractor {
  private config: ExtractorConfig;

  constructor(config: Partial<ExtractorConfig> = {}) {
    this.config = { ...DEFAULT_EXTRACTOR_CONFIG, ...config };
  }

  /**
   * Extract all JSON candidates from text
   */
  extractAll(text: string): ExtractionResult[] {
    // Quick check if text might contain JSON
    if (!mightContainJson(text)) {
      return [];
    }

    const allResults: ExtractionResult[] = [];
    const seenRanges = new Set<string>();

    // Run each extraction method in order
    for (const method of this.config.methods) {
      let results: ExtractionResult[] = [];

      switch (method) {
        case 'markdown_codeblock':
          results = extractMarkdownCodeBlocks(text);
          break;

        case 'ast_balanced':
          results = extractBalancedBraces(text);
          break;

        case 'regex_full_json':
          results = extractRegexFullJson(text);
          break;

        case 'inline_json':
          results = extractInlineJson(text);
          break;

        case 'json5_parse':
          // JSON5 is used by other methods, no separate extraction
          break;

        case 'regex_partial':
        case 'repaired':
          if (this.config.enableRepair) {
            results = extractWithRepair(text, this.config.knownIssues);
          }
          break;
      }

      // Add results, avoiding duplicates
      for (const result of results) {
        const rangeKey = `${result.startIndex}-${result.endIndex}`;
        if (!seenRanges.has(rangeKey) && result.confidence >= this.config.minConfidence) {
          seenRanges.add(rangeKey);
          allResults.push(result);
        }
      }
    }

    // Sort by confidence (highest first)
    allResults.sort((a, b) => b.confidence - a.confidence);

    // Limit results
    return allResults.slice(0, this.config.maxCandidates);
  }

  /**
   * Select the best candidate from extraction results
   */
  selectBestCandidate(candidates: ExtractionResult[]): SelectedCandidate | null {
    if (candidates.length === 0) {
      return null;
    }

    // Score each candidate
    const scored = candidates.map((candidate) => ({
      candidate,
      score: this.scoreCandidate(candidate),
    }));

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0]!;

    return {
      ...best.candidate,
      selectionReason: this.getSelectionReason(best.candidate, best.score),
      alternativeCount: candidates.length - 1,
    };
  }

  /**
   * Score a candidate based on multiple criteria
   */
  private scoreCandidate(candidate: ExtractionResult): number {
    let score = candidate.confidence;

    // Boost for tool-call-like structure
    if (this.looksLikeToolCall(candidate.json)) {
      score += 0.1;
    }

    // Penalty for validation errors
    score -= candidate.validationErrors.length * 0.1;

    // Boost for no repairs needed
    if (!candidate.appliedRepairs || candidate.appliedRepairs.length === 0) {
      score += 0.05;
    }

    // Slight boost for earlier in text (more likely intentional)
    const positionPenalty = (candidate.startIndex / 10000) * 0.01;
    score -= Math.min(positionPenalty, 0.05);

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Check if JSON looks like a tool call
   */
  private looksLikeToolCall(json: unknown): boolean {
    if (!json || typeof json !== 'object') return false;

    const obj = json as Record<string, unknown>;

    // Direct tool call format
    if ('tool' in obj || 'name' in obj || 'function' in obj) {
      return true;
    }

    // Array of tool calls
    if (Array.isArray(json)) {
      return json.some((item) => this.looksLikeToolCall(item));
    }

    // Nested tool calls
    if ('actions' in obj || 'commands' in obj || 'tools' in obj || 'tool_calls' in obj) {
      return true;
    }

    // Claude format
    if ('content' in obj && Array.isArray(obj['content'])) {
      return (obj['content'] as unknown[]).some(
        (item) => typeof item === 'object' && item !== null && 'type' in item
      );
    }

    // OpenAI format
    if ('choices' in obj && Array.isArray(obj['choices'])) {
      return true;
    }

    return false;
  }

  /**
   * Generate a human-readable selection reason
   */
  private getSelectionReason(candidate: ExtractionResult, score: number): string {
    const reasons: string[] = [];

    reasons.push(`method: ${candidate.extractionMethod}`);
    reasons.push(`confidence: ${(candidate.confidence * 100).toFixed(0)}%`);

    if (this.looksLikeToolCall(candidate.json)) {
      reasons.push('tool-call structure detected');
    }

    if (candidate.appliedRepairs && candidate.appliedRepairs.length > 0) {
      reasons.push(`repairs: ${candidate.appliedRepairs.join(', ')}`);
    }

    if (candidate.validationErrors.length > 0) {
      reasons.push(`${candidate.validationErrors.length} validation errors`);
    }

    reasons.push(`final score: ${(score * 100).toFixed(0)}%`);

    return reasons.join('; ');
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ExtractorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ExtractorConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a JSON extractor instance
 */
export function createJSONExtractor(config: Partial<ExtractorConfig> = {}): JSONExtractor {
  return new JSONExtractor(config);
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Quick extraction with default settings
 */
export function extractJson(text: string): ExtractionResult[] {
  const extractor = new JSONExtractor();
  return extractor.extractAll(text);
}

/**
 * Extract and select best candidate
 */
export function extractBestJson(text: string): SelectedCandidate | null {
  const extractor = new JSONExtractor();
  const candidates = extractor.extractAll(text);
  return extractor.selectBestCandidate(candidates);
}
