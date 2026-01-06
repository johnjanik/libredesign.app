/**
 * JSON Repair Utilities
 *
 * Attempts to repair common JSON errors produced by AI models.
 * Handles missing commas, unquoted keys, trailing commas, and more.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a repair attempt
 */
export interface RepairResult {
  /** Whether repair was successful */
  success: boolean;
  /** Repaired text (or original if failed) */
  text: string;
  /** Repairs that were applied */
  appliedRepairs: string[];
  /** Errors encountered during repair */
  errors: string[];
}

/**
 * A repair rule definition
 */
export interface RepairRule {
  /** Name of the repair */
  name: string;
  /** Description of what this repairs */
  description: string;
  /** Pattern to match */
  pattern: RegExp;
  /** Replacement (string or function) */
  replacement: string | ((match: string, ...args: string[]) => string);
  /** Priority (higher = applied first) */
  priority: number;
}

// =============================================================================
// Repair Rules
// =============================================================================

/**
 * Standard repair rules in priority order
 */
export const REPAIR_RULES: RepairRule[] = [
  // High priority: structural issues
  {
    name: 'python_booleans',
    description: 'Convert Python True/False/None to JSON',
    pattern: /\b(True|False|None)\b/g,
    replacement: (match) => {
      switch (match) {
        case 'True': return 'true';
        case 'False': return 'false';
        case 'None': return 'null';
        default: return match;
      }
    },
    priority: 100,
  },
  {
    name: 'single_quotes',
    description: 'Convert single quotes to double quotes',
    pattern: /'([^'\\]*(?:\\.[^'\\]*)*)'/g,
    replacement: '"$1"',
    priority: 95,
  },
  {
    name: 'unquoted_keys',
    description: 'Quote unquoted object keys',
    pattern: /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g,
    replacement: '$1"$2"$3',
    priority: 90,
  },
  {
    name: 'trailing_comma_object',
    description: 'Remove trailing commas in objects',
    pattern: /,(\s*})/g,
    replacement: '$1',
    priority: 85,
  },
  {
    name: 'trailing_comma_array',
    description: 'Remove trailing commas in arrays',
    pattern: /,(\s*\])/g,
    replacement: '$1',
    priority: 85,
  },
  {
    name: 'missing_comma_between_properties',
    description: 'Add missing commas between object properties',
    pattern: new RegExp('(")\\s*\\n\\s*(")', 'g'),
    replacement: '$1,\n  $2',
    priority: 80,
  },
  {
    name: 'missing_comma_after_value',
    description: 'Add missing comma after values',
    pattern: new RegExp('(\\d|true|false|null|")\\s+(")', 'g'),
    replacement: '$1, $2',
    priority: 75,
  },
  {
    name: 'missing_comma_after_brace',
    description: 'Add missing comma after closing brace/bracket',
    pattern: /([}\]])\s*([{\[])/g,
    replacement: '$1, $2',
    priority: 70,
  },

  // Medium priority: value issues
  {
    name: 'nan_infinity',
    description: 'Replace NaN/Infinity with null',
    pattern: /\b(NaN|Infinity|-Infinity)\b/g,
    replacement: 'null',
    priority: 60,
  },
  {
    name: 'undefined_to_null',
    description: 'Replace undefined with null',
    pattern: /\bundefined\b/g,
    replacement: 'null',
    priority: 60,
  },

  // Low priority: cleanup
  {
    name: 'remove_comments_single',
    description: 'Remove single-line comments',
    pattern: /\/\/[^\n]*/g,
    replacement: '',
    priority: 50,
  },
  {
    name: 'remove_comments_multi',
    description: 'Remove multi-line comments',
    pattern: /\/\*[\s\S]*?\*\//g,
    replacement: '',
    priority: 50,
  },
  {
    name: 'normalize_whitespace',
    description: 'Normalize excessive whitespace',
    pattern: /\n\s*\n\s*\n/g,
    replacement: '\n\n',
    priority: 10,
  },
];

// =============================================================================
// Repair Functions
// =============================================================================

/**
 * Apply all repair rules to a string
 */
export function repairJson(text: string, rules: RepairRule[] = REPAIR_RULES): RepairResult {
  const appliedRepairs: string[] = [];
  const errors: string[] = [];
  let repairedText = text;

  // Sort rules by priority (highest first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    try {
      const before = repairedText;
      if (typeof rule.replacement === 'function') {
        repairedText = repairedText.replace(rule.pattern, rule.replacement as (match: string, ...args: string[]) => string);
      } else {
        repairedText = repairedText.replace(rule.pattern, rule.replacement);
      }

      if (repairedText !== before) {
        appliedRepairs.push(rule.name);
      }
    } catch (error) {
      errors.push(`Rule "${rule.name}" failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Try to parse the result to verify it's valid JSON
  let success = false;
  try {
    JSON.parse(repairedText);
    success = true;
  } catch {
    // Still not valid JSON, but we did our best
    success = false;
  }

  return {
    success,
    text: repairedText,
    appliedRepairs,
    errors,
  };
}

/**
 * Attempt to complete truncated JSON
 */
export function completeTruncatedJson(text: string): RepairResult {
  const appliedRepairs: string[] = [];
  let repairedText = text.trim();

  // Count braces and brackets
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (const char of repairedText) {
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
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;
    }
  }

  // If we're in a string, close it
  if (inString) {
    repairedText += '"';
    appliedRepairs.push('close_string');
  }

  // Add missing closing brackets/braces
  while (bracketCount > 0) {
    repairedText += ']';
    bracketCount--;
    appliedRepairs.push('close_bracket');
  }

  while (braceCount > 0) {
    repairedText += '}';
    braceCount--;
    appliedRepairs.push('close_brace');
  }

  // Try to parse
  let success = false;
  try {
    JSON.parse(repairedText);
    success = true;
  } catch {
    success = false;
  }

  return {
    success,
    text: repairedText,
    appliedRepairs,
    errors: [],
  };
}

/**
 * Apply model-specific fixes
 */
export function applyModelFixes(
  text: string,
  knownIssues: Array<{ pattern: RegExp; fix: (text: string) => string; issue: string }>
): RepairResult {
  const appliedRepairs: string[] = [];
  let repairedText = text;

  for (const issue of knownIssues) {
    try {
      if (issue.pattern.test(repairedText)) {
        const before = repairedText;
        repairedText = issue.fix(repairedText);
        if (repairedText !== before) {
          appliedRepairs.push(issue.issue);
        }
      }
    } catch (error) {
      // Skip failed fixes
    }
  }

  let success = false;
  try {
    JSON.parse(repairedText);
    success = true;
  } catch {
    success = false;
  }

  return {
    success,
    text: repairedText,
    appliedRepairs,
    errors: [],
  };
}

/**
 * Full repair pipeline: apply all strategies
 */
export function fullRepair(
  text: string,
  knownIssues: Array<{ pattern: RegExp; fix: (text: string) => string; issue: string }> = []
): RepairResult {
  const allAppliedRepairs: string[] = [];
  let currentText = text;

  // Step 1: Apply model-specific fixes first
  if (knownIssues.length > 0) {
    const modelResult = applyModelFixes(currentText, knownIssues);
    currentText = modelResult.text;
    allAppliedRepairs.push(...modelResult.appliedRepairs);
    if (modelResult.success) {
      return {
        success: true,
        text: currentText,
        appliedRepairs: allAppliedRepairs,
        errors: [],
      };
    }
  }

  // Step 2: Apply standard repair rules
  const standardResult = repairJson(currentText);
  currentText = standardResult.text;
  allAppliedRepairs.push(...standardResult.appliedRepairs);
  if (standardResult.success) {
    return {
      success: true,
      text: currentText,
      appliedRepairs: allAppliedRepairs,
      errors: standardResult.errors,
    };
  }

  // Step 3: Try to complete truncated JSON
  const completionResult = completeTruncatedJson(currentText);
  currentText = completionResult.text;
  allAppliedRepairs.push(...completionResult.appliedRepairs);

  return {
    success: completionResult.success,
    text: currentText,
    appliedRepairs: allAppliedRepairs,
    errors: standardResult.errors,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a string looks like it might contain JSON
 */
export function mightContainJson(text: string): boolean {
  // Quick checks for JSON-like content
  const hasJsonStart = /[{\[]/.test(text);
  const hasJsonEnd = /[}\]]/.test(text);
  const hasColon = /:/.test(text);

  return hasJsonStart && hasJsonEnd && hasColon;
}

/**
 * Find the likely start of JSON in text
 */
export function findJsonStart(text: string): number {
  // Look for first { or [
  const braceIndex = text.indexOf('{');
  const bracketIndex = text.indexOf('[');

  if (braceIndex === -1 && bracketIndex === -1) {
    return -1;
  }

  if (braceIndex === -1) return bracketIndex;
  if (bracketIndex === -1) return braceIndex;

  return Math.min(braceIndex, bracketIndex);
}

/**
 * Find the likely end of JSON in text
 */
export function findJsonEnd(text: string): number {
  // Look for last } or ]
  const braceIndex = text.lastIndexOf('}');
  const bracketIndex = text.lastIndexOf(']');

  return Math.max(braceIndex, bracketIndex);
}

/**
 * Extract the JSON portion from mixed text
 */
export function extractJsonPortion(text: string): string | null {
  const start = findJsonStart(text);
  const end = findJsonEnd(text);

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
}
