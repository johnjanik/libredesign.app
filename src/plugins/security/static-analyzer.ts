/**
 * Static Analyzer
 *
 * Analyzes plugin code at install time for potential security issues.
 */

/**
 * Analysis severity levels
 */
export type AnalysisSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Analysis finding category
 */
export type FindingCategory =
  | 'security'
  | 'performance'
  | 'compatibility'
  | 'deprecated'
  | 'malicious';

/**
 * Analysis finding
 */
export interface AnalysisFinding {
  readonly id: string;
  readonly category: FindingCategory;
  readonly severity: AnalysisSeverity;
  readonly rule: string;
  readonly message: string;
  readonly location: CodeLocation | null;
  readonly suggestion: string | null;
  readonly metadata: Record<string, unknown>;
}

/**
 * Code location
 */
export interface CodeLocation {
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
  readonly snippet?: string;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  readonly pluginId: string;
  readonly timestamp: number;
  readonly duration: number;
  readonly passed: boolean;
  readonly findings: readonly AnalysisFinding[];
  readonly summary: AnalysisSummary;
  readonly codeMetrics: CodeMetrics;
}

/**
 * Analysis summary
 */
export interface AnalysisSummary {
  readonly totalFindings: number;
  readonly findingsBySeverity: Record<AnalysisSeverity, number>;
  readonly findingsByCategory: Record<FindingCategory, number>;
  readonly criticalCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
}

/**
 * Code metrics
 */
export interface CodeMetrics {
  readonly totalLines: number;
  readonly codeLines: number;
  readonly commentLines: number;
  readonly blankLines: number;
  readonly functionCount: number;
  readonly complexity: number;
  readonly importCount: number;
  readonly asyncOperations: number;
}

/**
 * Analysis rule
 */
export interface AnalysisRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: FindingCategory;
  readonly severity: AnalysisSeverity;
  readonly enabled: boolean;
  readonly pattern: RegExp | null;
  readonly check: ((code: string, context: AnalysisContext) => AnalysisFinding[]) | null;
}

/**
 * Analysis context
 */
export interface AnalysisContext {
  readonly pluginId: string;
  readonly filename: string;
  readonly lines: readonly string[];
}

/**
 * Static analyzer configuration
 */
export interface StaticAnalyzerConfig {
  /** Maximum code size to analyze in bytes */
  readonly maxCodeSize: number;
  /** Analysis timeout in ms */
  readonly analysisTimeout: number;
  /** Whether to fail on critical findings */
  readonly failOnCritical: boolean;
  /** Whether to fail on error findings */
  readonly failOnError: boolean;
  /** Maximum findings before aborting */
  readonly maxFindings: number;
}

/**
 * Default static analyzer configuration
 */
export const DEFAULT_ANALYZER_CONFIG: StaticAnalyzerConfig = {
  maxCodeSize: 5 * 1024 * 1024, // 5MB
  analysisTimeout: 30000,
  failOnCritical: true,
  failOnError: true,
  maxFindings: 1000,
};

/**
 * Built-in security rules
 */
const SECURITY_RULES: AnalysisRule[] = [
  {
    id: 'no-eval',
    name: 'No eval()',
    description: 'eval() can execute arbitrary code and is a security risk',
    category: 'security',
    severity: 'critical',
    enabled: true,
    pattern: /\beval\s*\(/g,
    check: null,
  },
  {
    id: 'no-function-constructor',
    name: 'No Function constructor',
    description: 'Function constructor can execute arbitrary code',
    category: 'security',
    severity: 'critical',
    enabled: true,
    pattern: /\bnew\s+Function\s*\(/g,
    check: null,
  },
  {
    id: 'no-document-write',
    name: 'No document.write',
    description: 'document.write can be used for XSS attacks',
    category: 'security',
    severity: 'error',
    enabled: true,
    pattern: /\bdocument\.write\s*\(/g,
    check: null,
  },
  {
    id: 'no-innerhtml',
    name: 'No innerHTML assignment',
    description: 'innerHTML can lead to XSS vulnerabilities',
    category: 'security',
    severity: 'warning',
    enabled: true,
    pattern: /\.innerHTML\s*=/g,
    check: null,
  },
  {
    id: 'no-window-open',
    name: 'No window.open',
    description: 'window.open can be used for popup spam or phishing',
    category: 'security',
    severity: 'warning',
    enabled: true,
    pattern: /\bwindow\.open\s*\(/g,
    check: null,
  },
  {
    id: 'no-localstorage',
    name: 'No localStorage/sessionStorage',
    description: 'Plugins should use the provided storage API',
    category: 'security',
    severity: 'error',
    enabled: true,
    pattern: /\b(localStorage|sessionStorage)\s*\./g,
    check: null,
  },
  {
    id: 'no-cookie-access',
    name: 'No document.cookie',
    description: 'Plugins should not access cookies directly',
    category: 'security',
    severity: 'critical',
    enabled: true,
    pattern: /\bdocument\.cookie\b/g,
    check: null,
  },
  {
    id: 'no-fetch-credentials',
    name: 'No fetch with credentials',
    description: 'Network requests should not include credentials',
    category: 'security',
    severity: 'error',
    enabled: true,
    pattern: /credentials\s*:\s*['"]include['"]/g,
    check: null,
  },
  {
    id: 'no-prototype-pollution',
    name: 'No prototype pollution',
    description: 'Avoid modifying Object.prototype',
    category: 'security',
    severity: 'critical',
    enabled: true,
    pattern: /Object\.prototype\s*\./g,
    check: null,
  },
  {
    id: 'no-dangerous-globals',
    name: 'No dangerous global access',
    description: 'Plugins should not access certain global objects',
    category: 'security',
    severity: 'error',
    enabled: true,
    pattern: /\b(process|require|__dirname|__filename|global)\b/g,
    check: null,
  },
];

/**
 * Performance rules
 */
const PERFORMANCE_RULES: AnalysisRule[] = [
  {
    id: 'no-sync-xhr',
    name: 'No synchronous XHR',
    description: 'Synchronous XHR blocks the main thread',
    category: 'performance',
    severity: 'error',
    enabled: true,
    pattern: /\.open\s*\([^)]*,\s*[^)]*,\s*false\s*\)/g,
    check: null,
  },
  {
    id: 'avoid-infinite-loops',
    name: 'Potential infinite loop',
    description: 'while(true) loops can freeze the application',
    category: 'performance',
    severity: 'warning',
    enabled: true,
    pattern: /while\s*\(\s*true\s*\)/g,
    check: null,
  },
  {
    id: 'avoid-blocking-operations',
    name: 'Avoid blocking operations',
    description: 'alert/confirm/prompt block the main thread',
    category: 'performance',
    severity: 'warning',
    enabled: true,
    pattern: /\b(alert|confirm|prompt)\s*\(/g,
    check: null,
  },
];

/**
 * Malicious pattern rules
 */
const MALICIOUS_RULES: AnalysisRule[] = [
  {
    id: 'no-obfuscation',
    name: 'Suspected obfuscation',
    description: 'Code appears to be obfuscated',
    category: 'malicious',
    severity: 'critical',
    enabled: true,
    pattern: null,
    check: (code, context) => {
      const findings: AnalysisFinding[] = [];

      // Check for high density of escape sequences
      const escapeMatches = code.match(/\\x[0-9a-fA-F]{2}/g);
      if (escapeMatches && escapeMatches.length > 50) {
        findings.push({
          id: `${context.pluginId}-obfuscation-escape`,
          category: 'malicious',
          severity: 'critical',
          rule: 'no-obfuscation',
          message: `High density of hex escape sequences detected (${escapeMatches.length} occurrences)`,
          location: null,
          suggestion: 'Remove obfuscated code or provide readable source',
          metadata: { escapeCount: escapeMatches.length },
        });
      }

      // Check for very long lines (common in obfuscated code)
      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        if (line && line.length > 5000) {
          findings.push({
            id: `${context.pluginId}-obfuscation-longline-${i}`,
            category: 'malicious',
            severity: 'warning',
            rule: 'no-obfuscation',
            message: `Extremely long line detected (${line.length} characters)`,
            location: { line: i + 1, column: 1 },
            suggestion: 'Format code with proper line breaks',
            metadata: { lineLength: line.length },
          });
        }
      }

      return findings;
    },
  },
  {
    id: 'no-data-exfiltration',
    name: 'Potential data exfiltration',
    description: 'Code may be attempting to send data externally',
    category: 'malicious',
    severity: 'critical',
    enabled: true,
    pattern: null,
    check: (code, context) => {
      const findings: AnalysisFinding[] = [];

      // Check for image beacon patterns (used for data exfiltration)
      if (/new\s+Image\s*\(\s*\).*\.src\s*=/i.test(code)) {
        findings.push({
          id: `${context.pluginId}-exfiltration-image`,
          category: 'malicious',
          severity: 'warning',
          rule: 'no-data-exfiltration',
          message: 'Image beacon pattern detected, possible data exfiltration',
          location: null,
          suggestion: 'Use the official network API for legitimate requests',
          metadata: {},
        });
      }

      // Check for WebSocket to external domains
      if (/new\s+WebSocket\s*\(/i.test(code)) {
        findings.push({
          id: `${context.pluginId}-exfiltration-websocket`,
          category: 'malicious',
          severity: 'error',
          rule: 'no-data-exfiltration',
          message: 'WebSocket usage detected',
          location: null,
          suggestion: 'WebSocket connections are not allowed in plugins',
          metadata: {},
        });
      }

      return findings;
    },
  },
];

/**
 * Generate finding ID
 */
function generateFindingId(): string {
  return `finding_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Static Analyzer class
 */
export class StaticAnalyzer {
  private readonly config: StaticAnalyzerConfig;
  private readonly rules: AnalysisRule[];

  constructor(config: StaticAnalyzerConfig = DEFAULT_ANALYZER_CONFIG) {
    this.config = config;
    this.rules = [...SECURITY_RULES, ...PERFORMANCE_RULES, ...MALICIOUS_RULES];
  }

  /**
   * Analyze plugin code
   */
  analyze(pluginId: string, code: string, filename: string = 'main.js'): AnalysisResult {
    const startTime = Date.now();
    const findings: AnalysisFinding[] = [];

    // Check code size
    if (code.length > this.config.maxCodeSize) {
      findings.push({
        id: generateFindingId(),
        category: 'security',
        severity: 'critical',
        rule: 'max-code-size',
        message: `Code exceeds maximum size (${code.length} > ${this.config.maxCodeSize} bytes)`,
        location: null,
        suggestion: 'Reduce code size or split into multiple files',
        metadata: { codeSize: code.length, maxSize: this.config.maxCodeSize },
      });
    }

    const lines = code.split('\n');
    const context: AnalysisContext = {
      pluginId,
      filename,
      lines,
    };

    // Run pattern-based rules
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (rule.pattern) {
        const matches = this.findPatternMatches(code, lines, rule);
        findings.push(...matches);
      }

      if (rule.check) {
        const checkFindings = rule.check(code, context);
        findings.push(...checkFindings);
      }

      // Check max findings
      if (findings.length >= this.config.maxFindings) {
        break;
      }
    }

    // Calculate metrics
    const codeMetrics = this.calculateMetrics(code, lines);

    // Build summary
    const summary = this.buildSummary(findings);

    // Determine if passed
    let passed = true;
    if (this.config.failOnCritical && summary.criticalCount > 0) {
      passed = false;
    }
    if (this.config.failOnError && summary.errorCount > 0) {
      passed = false;
    }

    return {
      pluginId,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      passed,
      findings,
      summary,
      codeMetrics,
    };
  }

  /**
   * Add a custom rule
   */
  addRule(rule: AnalysisRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove a rule by ID
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      (rule as { enabled: boolean }).enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get all rules
   */
  getRules(): AnalysisRule[] {
    return [...this.rules];
  }

  /**
   * Find pattern matches in code
   */
  private findPatternMatches(
    code: string,
    lines: string[],
    rule: AnalysisRule
  ): AnalysisFinding[] {
    if (!rule.pattern) return [];

    const findings: AnalysisFinding[] = [];
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);

    let match;
    while ((match = pattern.exec(code)) !== null) {
      // Find line number
      const beforeMatch = code.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      const lineStart = beforeMatch.lastIndexOf('\n') + 1;
      const column = match.index - lineStart + 1;

      const snippetLine = lines[lineNumber - 1];
      const location: CodeLocation = { line: lineNumber, column };
      if (snippetLine) {
        (location as { snippet: string }).snippet = snippetLine.trim().substring(0, 100);
      }

      findings.push({
        id: generateFindingId(),
        category: rule.category,
        severity: rule.severity,
        rule: rule.id,
        message: rule.description,
        location,
        suggestion: null,
        metadata: { match: match[0] },
      });

      // Prevent infinite loops with zero-length matches
      if (match[0].length === 0) {
        pattern.lastIndex++;
      }
    }

    return findings;
  }

  /**
   * Calculate code metrics
   */
  private calculateMetrics(code: string, lines: string[]): CodeMetrics {
    let codeLines = 0;
    let commentLines = 0;
    let blankLines = 0;
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '') {
        blankLines++;
      } else if (inBlockComment) {
        commentLines++;
        if (trimmed.includes('*/')) {
          inBlockComment = false;
        }
      } else if (trimmed.startsWith('//')) {
        commentLines++;
      } else if (trimmed.startsWith('/*')) {
        commentLines++;
        if (!trimmed.includes('*/')) {
          inBlockComment = true;
        }
      } else {
        codeLines++;
      }
    }

    // Count functions
    const functionMatches = code.match(/\bfunction\s+\w+\s*\(|\bconst\s+\w+\s*=\s*(?:async\s*)?\(/g);
    const functionCount = functionMatches?.length ?? 0;

    // Count imports
    const importMatches = code.match(/\bimport\s+/g);
    const importCount = importMatches?.length ?? 0;

    // Count async operations
    const asyncMatches = code.match(/\basync\b|\bawait\b|\bPromise\b/g);
    const asyncOperations = asyncMatches?.length ?? 0;

    // Estimate complexity (simplified)
    const branchMatches = code.match(/\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcatch\b|\?\s*:/g);
    const complexity = (branchMatches?.length ?? 0) + 1;

    return {
      totalLines: lines.length,
      codeLines,
      commentLines,
      blankLines,
      functionCount,
      complexity,
      importCount,
      asyncOperations,
    };
  }

  /**
   * Build analysis summary
   */
  private buildSummary(findings: AnalysisFinding[]): AnalysisSummary {
    const findingsBySeverity: Record<AnalysisSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    const findingsByCategory: Record<FindingCategory, number> = {
      security: 0,
      performance: 0,
      compatibility: 0,
      deprecated: 0,
      malicious: 0,
    };

    for (const finding of findings) {
      findingsBySeverity[finding.severity]++;
      findingsByCategory[finding.category]++;
    }

    return {
      totalFindings: findings.length,
      findingsBySeverity,
      findingsByCategory,
      criticalCount: findingsBySeverity.critical,
      errorCount: findingsBySeverity.error,
      warningCount: findingsBySeverity.warning,
    };
  }
}
