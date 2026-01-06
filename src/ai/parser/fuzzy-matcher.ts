/**
 * Fuzzy Matcher
 *
 * String similarity algorithms for fuzzy matching tool names and parameters.
 * Implements Levenshtein distance and Jaro-Winkler similarity.
 */

import type { ToolSchema } from './types';
import { TOOL_ALIASES, PARAMETER_ALIASES } from './config';
import type { ToolSchemaRegistry } from './schema-registry';

// =============================================================================
// Types
// =============================================================================

export interface FuzzyMatch<T = string> {
  /** The matched item */
  match: T;
  /** Similarity score (0-1, higher is better) */
  similarity: number;
  /** The algorithm used for matching */
  algorithm: 'exact' | 'alias' | 'levenshtein' | 'jaro_winkler';
}

export interface FuzzyMatcherConfig {
  /** Minimum similarity threshold (0-1) */
  threshold: number;
  /** Use Jaro-Winkler (better for short strings) vs Levenshtein */
  preferJaroWinkler: boolean;
  /** Check aliases before fuzzy matching */
  checkAliases: boolean;
  /** Maximum results to return */
  maxResults: number;
}

const DEFAULT_CONFIG: FuzzyMatcherConfig = {
  threshold: 0.6,
  preferJaroWinkler: true,
  checkAliases: true,
  maxResults: 5,
};

// =============================================================================
// Levenshtein Distance
// =============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * (minimum number of single-character edits to transform s1 into s2)
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0) as number[]);

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = 1 + Math.min(
          dp[i - 1]![j]!,     // deletion
          dp[i]![j - 1]!,     // insertion
          dp[i - 1]![j - 1]!  // substitution
        );
      }
    }
  }

  return dp[m]![n]!;
}

/**
 * Calculate normalized Levenshtein similarity (0-1, higher is better)
 */
export function levenshteinSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1.toLowerCase(), s2.toLowerCase());
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - distance / maxLength;
}

// =============================================================================
// Jaro-Winkler Similarity
// =============================================================================

/**
 * Calculate Jaro similarity between two strings
 */
export function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const str1 = s1.toLowerCase();
  const str2 = s2.toLowerCase();

  const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;

  const s1Matches: boolean[] = new Array(str1.length).fill(false);
  const s2Matches: boolean[] = new Array(str2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matching characters
  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, str2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || str1[i] !== str2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / str1.length +
      matches / str2.length +
      (matches - transpositions / 2) / matches) /
    3;

  return jaro;
}

/**
 * Calculate Jaro-Winkler similarity (0-1, higher is better)
 * Gives bonus to strings that match from the beginning
 */
export function jaroWinklerSimilarity(
  s1: string,
  s2: string,
  scalingFactor: number = 0.1
): number {
  const jaro = jaroSimilarity(s1, s2);

  // Find common prefix (up to 4 characters)
  const str1 = s1.toLowerCase();
  const str2 = s2.toLowerCase();
  let prefixLength = 0;

  for (let i = 0; i < Math.min(4, str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }

  return jaro + prefixLength * scalingFactor * (1 - jaro);
}

// =============================================================================
// Fuzzy Matching Functions
// =============================================================================

/**
 * Find the best match for a string from a list of candidates
 */
export function findBestMatch(
  input: string,
  candidates: string[],
  config: Partial<FuzzyMatcherConfig> = {}
): FuzzyMatch | null {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!input || candidates.length === 0) {
    return null;
  }

  const normalizedInput = input.toLowerCase();

  // Check for exact match
  const exactMatch = candidates.find((c) => c.toLowerCase() === normalizedInput);
  if (exactMatch) {
    return { match: exactMatch, similarity: 1, algorithm: 'exact' };
  }

  // Find best fuzzy match
  let bestMatch: FuzzyMatch | null = null;

  for (const candidate of candidates) {
    const similarity = cfg.preferJaroWinkler
      ? jaroWinklerSimilarity(normalizedInput, candidate.toLowerCase())
      : levenshteinSimilarity(normalizedInput, candidate.toLowerCase());

    if (similarity >= cfg.threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = {
          match: candidate,
          similarity,
          algorithm: cfg.preferJaroWinkler ? 'jaro_winkler' : 'levenshtein',
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Find all matches above the threshold, sorted by similarity
 */
export function findAllMatches(
  input: string,
  candidates: string[],
  config: Partial<FuzzyMatcherConfig> = {}
): FuzzyMatch[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!input || candidates.length === 0) {
    return [];
  }

  const normalizedInput = input.toLowerCase();
  const matches: FuzzyMatch[] = [];

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase();

    // Exact match
    if (normalizedCandidate === normalizedInput) {
      matches.push({ match: candidate, similarity: 1, algorithm: 'exact' });
      continue;
    }

    // Fuzzy match
    const similarity = cfg.preferJaroWinkler
      ? jaroWinklerSimilarity(normalizedInput, normalizedCandidate)
      : levenshteinSimilarity(normalizedInput, normalizedCandidate);

    if (similarity >= cfg.threshold) {
      matches.push({
        match: candidate,
        similarity,
        algorithm: cfg.preferJaroWinkler ? 'jaro_winkler' : 'levenshtein',
      });
    }
  }

  // Sort by similarity (descending)
  matches.sort((a, b) => b.similarity - a.similarity);

  return matches.slice(0, cfg.maxResults);
}

// =============================================================================
// Tool Matching
// =============================================================================

/**
 * Find a tool by name with alias and fuzzy matching support
 */
export function findTool(
  toolName: string,
  registry: ToolSchemaRegistry,
  config: Partial<FuzzyMatcherConfig> = {}
): FuzzyMatch<ToolSchema> | null {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const normalizedName = toolName.toLowerCase();

  // Check direct match
  const directSchema = registry.get(normalizedName);
  if (directSchema) {
    return { match: directSchema, similarity: 1, algorithm: 'exact' };
  }

  // Check built-in aliases
  if (cfg.checkAliases) {
    for (const [canonical, aliases] of Object.entries(TOOL_ALIASES)) {
      if (aliases.some((a) => a.toLowerCase() === normalizedName)) {
        const schema = registry.get(canonical);
        if (schema) {
          return { match: schema, similarity: 0.95, algorithm: 'alias' };
        }
      }
    }
  }

  // Fuzzy match against all registered tool names
  const toolNames = registry.getToolNames();
  const fuzzyMatch = findBestMatch(normalizedName, toolNames, cfg);

  if (fuzzyMatch) {
    const schema = registry.get(fuzzyMatch.match);
    if (schema) {
      return {
        match: schema,
        similarity: fuzzyMatch.similarity,
        algorithm: fuzzyMatch.algorithm,
      };
    }
  }

  return null;
}

/**
 * Find multiple tool matches with scores
 */
export function findToolMatches(
  toolName: string,
  registry: ToolSchemaRegistry,
  config: Partial<FuzzyMatcherConfig> = {}
): FuzzyMatch<ToolSchema>[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const toolNames = registry.getToolNames();
  const stringMatches = findAllMatches(toolName, toolNames, cfg);

  return stringMatches
    .map((m) => {
      const schema = registry.get(m.match);
      if (!schema) return null;
      return {
        match: schema,
        similarity: m.similarity,
        algorithm: m.algorithm,
      };
    })
    .filter((m): m is FuzzyMatch<ToolSchema> => m !== null);
}

// =============================================================================
// Parameter Matching
// =============================================================================

/**
 * Find the canonical parameter name for an input parameter
 */
export function findCanonicalParam(
  paramName: string,
  schemaParams: string[]
): FuzzyMatch | null {
  const normalizedName = paramName.toLowerCase();

  // Check direct match
  const directMatch = schemaParams.find((p) => p.toLowerCase() === normalizedName);
  if (directMatch) {
    return { match: directMatch, similarity: 1, algorithm: 'exact' };
  }

  // Check built-in parameter aliases
  for (const [canonical, aliases] of Object.entries(PARAMETER_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === normalizedName)) {
      // Check if canonical exists in schema
      const schemaMatch = schemaParams.find((p) => p.toLowerCase() === canonical);
      if (schemaMatch) {
        return { match: schemaMatch, similarity: 0.95, algorithm: 'alias' };
      }
    }
  }

  // Fuzzy match
  return findBestMatch(normalizedName, schemaParams, {
    threshold: 0.7,
    preferJaroWinkler: true,
  });
}

/**
 * Map input parameters to schema parameters using fuzzy matching
 */
export function mapParametersToSchema(
  inputParams: Record<string, unknown>,
  schemaParams: string[],
  config: Partial<FuzzyMatcherConfig> = {}
): {
  mapped: Record<string, unknown>;
  unmatched: string[];
  mappings: Record<string, { from: string; to: string; similarity: number }>;
} {
  const mapped: Record<string, unknown> = {};
  const unmatched: string[] = [];
  const mappings: Record<string, { from: string; to: string; similarity: number }> = {};

  for (const [inputKey, value] of Object.entries(inputParams)) {
    const match = findCanonicalParam(inputKey, schemaParams);

    if (match && match.similarity >= (config.threshold || 0.6)) {
      mapped[match.match] = value;

      if (inputKey.toLowerCase() !== match.match.toLowerCase()) {
        mappings[inputKey] = {
          from: inputKey,
          to: match.match,
          similarity: match.similarity,
        };
      }
    } else {
      unmatched.push(inputKey);
    }
  }

  return { mapped, unmatched, mappings };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if two strings are similar enough to be considered a match
 */
export function isSimilar(
  s1: string,
  s2: string,
  threshold: number = 0.7
): boolean {
  return jaroWinklerSimilarity(s1, s2) >= threshold;
}

/**
 * Get similarity score between two strings
 */
export function getSimilarity(
  s1: string,
  s2: string,
  algorithm: 'levenshtein' | 'jaro_winkler' = 'jaro_winkler'
): number {
  return algorithm === 'jaro_winkler'
    ? jaroWinklerSimilarity(s1, s2)
    : levenshteinSimilarity(s1, s2);
}

/**
 * Suggest corrections for a misspelled tool name
 */
export function suggestToolCorrections(
  misspelled: string,
  registry: ToolSchemaRegistry,
  maxSuggestions: number = 3
): string[] {
  const matches = findToolMatches(misspelled, registry, {
    threshold: 0.4,
    maxResults: maxSuggestions,
  });

  return matches.map((m) => m.match.name);
}
