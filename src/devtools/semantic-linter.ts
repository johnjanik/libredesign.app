/**
 * Semantic Linter
 *
 * Provides accessibility and design-code consistency checks for semantic nodes.
 * Validates that designs meet accessibility standards and can be properly exported
 * to production-ready code.
 */

import type { NodeId } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
import type { SceneGraph } from '@scene/graph/scene-graph';
import {
  type SemanticMetadata,
  type SemanticNodeType,
  getSemanticMetadata,
} from '@core/types/semantic-schema';

// =============================================================================
// Types
// =============================================================================

/**
 * Severity level for lint issues
 */
export type LintSeverity = 'error' | 'warning' | 'info';

/**
 * Category of lint issue
 */
export type LintCategory =
  | 'accessibility'
  | 'semantics'
  | 'consistency'
  | 'code-export'
  | 'performance';

/**
 * A single lint issue
 */
export interface LintIssue {
  /** Unique rule ID */
  ruleId: string;
  /** Severity of the issue */
  severity: LintSeverity;
  /** Category of the issue */
  category: LintCategory;
  /** Human-readable message */
  message: string;
  /** Suggestion for fixing the issue */
  suggestion?: string;
  /** Affected node ID */
  nodeId: NodeId;
  /** Affected node name */
  nodeName: string;
  /** Affected property (if applicable) */
  property?: string;
  /** Link to documentation */
  helpUrl?: string;
}

/**
 * Summary of lint results
 */
export interface LintSummary {
  /** Total issues found */
  total: number;
  /** Error count */
  errors: number;
  /** Warning count */
  warnings: number;
  /** Info count */
  infos: number;
  /** Issues by category */
  byCategory: Record<LintCategory, number>;
  /** Issues by rule */
  byRule: Record<string, number>;
}

/**
 * Full lint result
 */
export interface LintResult {
  /** All issues found */
  issues: LintIssue[];
  /** Summary statistics */
  summary: LintSummary;
  /** Timestamp of the lint run */
  timestamp: Date;
  /** Nodes checked */
  nodesChecked: number;
}

/**
 * Lint rule definition
 */
interface LintRule {
  id: string;
  severity: LintSeverity;
  category: LintCategory;
  description: string;
  check: (node: NodeData, semantic: SemanticMetadata | null, sceneGraph: SceneGraph) => LintIssue[];
}

// =============================================================================
// Lint Rules
// =============================================================================

const LINT_RULES: LintRule[] = [
  // ---------------------------------------------------------------------------
  // Accessibility Rules
  // ---------------------------------------------------------------------------
  {
    id: 'a11y/missing-label',
    severity: 'error',
    category: 'accessibility',
    description: 'Interactive elements must have an accessibility label',
    check: (node, semantic) => {
      if (!semantic) return [];

      const interactiveTypes: SemanticNodeType[] = [
        'Button', 'IconButton', 'TextField', 'TextArea', 'Checkbox', 'Toggle', 'RadioButton',
        'Slider', 'Picker', 'DatePicker', 'Link', 'TabItem',
      ];

      if (!interactiveTypes.includes(semantic.semanticType)) return [];

      if (!semantic.accessibility?.label) {
        return [{
          ruleId: 'a11y/missing-label',
          severity: 'error',
          category: 'accessibility',
          message: `${semantic.semanticType} is missing an accessibility label`,
          suggestion: 'Add an accessibility label in the Inspect panel > Accessibility section',
          nodeId: node.id,
          nodeName: node.name,
          property: 'accessibility.label',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
        }];
      }

      return [];
    },
  },

  {
    id: 'a11y/missing-role',
    severity: 'warning',
    category: 'accessibility',
    description: 'Semantic nodes should have an explicit ARIA role',
    check: (node, semantic) => {
      if (!semantic) return [];

      // Custom type without explicit role
      if (semantic.semanticType === 'Custom' && !semantic.accessibility?.role) {
        return [{
          ruleId: 'a11y/missing-role',
          severity: 'warning',
          category: 'accessibility',
          message: 'Custom component should have an explicit ARIA role',
          suggestion: 'Set the role property in Inspect panel > Accessibility section',
          nodeId: node.id,
          nodeName: node.name,
          property: 'accessibility.role',
        }];
      }

      return [];
    },
  },

  {
    id: 'a11y/image-without-alt',
    severity: 'error',
    category: 'accessibility',
    description: 'Images must have alt text or be marked decorative',
    check: (node, semantic) => {
      if (!semantic || semantic.semanticType !== 'Image') return [];

      const label = semantic.accessibility?.label;
      const description = semantic.accessibility?.description;

      // No alt text and not explicitly marked as decorative (empty string label)
      if (!label && label !== '' && !description) {
        return [{
          ruleId: 'a11y/image-without-alt',
          severity: 'error',
          category: 'accessibility',
          message: 'Image is missing alt text',
          suggestion: 'Add a label describing the image, or set empty label "" for decorative images',
          nodeId: node.id,
          nodeName: node.name,
          property: 'accessibility.label',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
        }];
      }

      return [];
    },
  },

  {
    id: 'a11y/focusable-without-indicator',
    severity: 'warning',
    category: 'accessibility',
    description: 'Focusable elements should have visible focus indicators',
    check: (node, semantic) => {
      if (!semantic) return [];

      // Check if focusable
      if (!semantic.accessibility?.focusable) return [];

      // Check if it has focus state binding or handler
      const hasFocusHandler = semantic.eventHandlers?.some(h => h.event === 'onFocus');
      const hasFocusBinding = semantic.stateBindings?.some(b =>
        b.propertyPath.join('.').includes('focus')
      );

      // This is a heuristic - we can't fully verify focus states from metadata alone
      if (!hasFocusHandler && !hasFocusBinding) {
        return [{
          ruleId: 'a11y/focusable-without-indicator',
          severity: 'warning',
          category: 'accessibility',
          message: 'Focusable element may need a visible focus indicator',
          suggestion: 'Consider adding a focus state or onFocus handler for visual feedback',
          nodeId: node.id,
          nodeName: node.name,
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html',
        }];
      }

      return [];
    },
  },

  {
    id: 'a11y/heading-without-level',
    severity: 'info',
    category: 'accessibility',
    description: 'Heading elements should specify their level for proper hierarchy',
    check: (node, semantic) => {
      if (!semantic || semantic.semanticType !== 'Heading') return [];

      // Check if heading level is specified in platform semantics
      const webRole = semantic.platformSemantics?.web?.ariaRole;
      const hasLevel = webRole && /h[1-6]/.test(webRole);

      if (!hasLevel && !semantic.accessibility?.role?.match(/heading/)) {
        return [{
          ruleId: 'a11y/heading-without-level',
          severity: 'info',
          category: 'accessibility',
          message: 'Heading should specify level (h1-h6) for proper document structure',
          suggestion: 'Set the ARIA role to h1, h2, h3, etc.',
          nodeId: node.id,
          nodeName: node.name,
          property: 'accessibility.role',
        }];
      }

      return [];
    },
  },

  // ---------------------------------------------------------------------------
  // Semantic Rules
  // ---------------------------------------------------------------------------
  {
    id: 'semantic/missing-type',
    severity: 'warning',
    category: 'semantics',
    description: 'Interactive nodes should have a semantic type',
    check: (node, semantic, _sceneGraph) => {
      // Check if node has any interactions
      const hasInteraction = node.pluginData?.['designlibre:interactions'] !== undefined;

      // If interactive but no semantic type
      if (hasInteraction && !semantic) {
        return [{
          ruleId: 'semantic/missing-type',
          severity: 'warning',
          category: 'semantics',
          message: 'Interactive node has no semantic type assigned',
          suggestion: 'Set a semantic type in Inspect panel > Semantic section',
          nodeId: node.id,
          nodeName: node.name,
        }];
      }

      return [];
    },
  },

  {
    id: 'semantic/button-without-handler',
    severity: 'info',
    category: 'semantics',
    description: 'Button components should have at least one event handler',
    check: (node, semantic) => {
      if (!semantic || semantic.semanticType !== 'Button') return [];

      if (!semantic.eventHandlers || semantic.eventHandlers.length === 0) {
        return [{
          ruleId: 'semantic/button-without-handler',
          severity: 'info',
          category: 'semantics',
          message: 'Button has no event handlers defined',
          suggestion: 'Add an onPress handler in Prototype tab > Event Handlers',
          nodeId: node.id,
          nodeName: node.name,
        }];
      }

      return [];
    },
  },

  {
    id: 'semantic/form-field-no-label',
    severity: 'warning',
    category: 'semantics',
    description: 'Form fields should have associated labels',
    check: (node, semantic) => {
      if (!semantic) return [];

      const formFieldTypes: SemanticNodeType[] = [
        'TextField', 'TextArea', 'Checkbox', 'RadioButton', 'Picker', 'DatePicker', 'Slider', 'Toggle',
      ];

      if (!formFieldTypes.includes(semantic.semanticType)) return [];

      // Check for label in accessibility or LLM context
      const hasA11yLabel = semantic.accessibility?.label;
      const hasPurpose = semantic.llmContext?.purpose;

      if (!hasA11yLabel && !hasPurpose) {
        return [{
          ruleId: 'semantic/form-field-no-label',
          severity: 'warning',
          category: 'semantics',
          message: `${semantic.semanticType} has no associated label or purpose`,
          suggestion: 'Add an accessibility label or describe the purpose in LLM Context',
          nodeId: node.id,
          nodeName: node.name,
        }];
      }

      return [];
    },
  },

  // ---------------------------------------------------------------------------
  // Consistency Rules
  // ---------------------------------------------------------------------------
  {
    id: 'consistency/orphan-handler',
    severity: 'warning',
    category: 'consistency',
    description: 'Event handlers should reference defined variables',
    check: (node, semantic) => {
      if (!semantic || !semantic.eventHandlers) return [];

      const issues: LintIssue[] = [];

      for (const handler of semantic.eventHandlers) {
        const variableId = handler.actionConfig?.['variableId'] as string | undefined;

        if (variableId && (handler.actionType === 'setVariable' || handler.actionType === 'toggleVariable')) {
          // This would need access to variable manager to fully check
          // For now, just check that a variableId is specified
          if (!variableId.trim()) {
            issues.push({
              ruleId: 'consistency/orphan-handler',
              severity: 'warning',
              category: 'consistency',
              message: `${handler.event} handler references missing variable`,
              suggestion: 'Ensure the variable is defined in the Variables panel',
              nodeId: node.id,
              nodeName: node.name,
            });
          }
        }
      }

      return issues;
    },
  },

  {
    id: 'consistency/binding-type-mismatch',
    severity: 'warning',
    category: 'consistency',
    description: 'State bindings should have compatible types',
    check: (node, semantic) => {
      if (!semantic || !semantic.stateBindings) return [];

      const issues: LintIssue[] = [];

      // Type inference from property path
      for (const binding of semantic.stateBindings) {
        const propPath = binding.propertyPath.join('.');

        // Check for common type mismatches
        if (propPath.includes('color') && binding.transform === 'direct') {
          // Color properties need proper color values
          issues.push({
            ruleId: 'consistency/binding-type-mismatch',
            severity: 'info',
            category: 'consistency',
            message: `Color binding for "${propPath}" may need a format transform`,
            suggestion: 'Consider using the "format" transform for color values',
            nodeId: node.id,
            nodeName: node.name,
            property: propPath,
          });
        }
      }

      return issues;
    },
  },

  // ---------------------------------------------------------------------------
  // Code Export Rules
  // ---------------------------------------------------------------------------
  {
    id: 'export/missing-component-name',
    severity: 'info',
    category: 'code-export',
    description: 'Component roots should have valid code-friendly names',
    check: (node, semantic) => {
      if (!semantic?.isComponentRoot) return [];

      // Check if name is code-friendly
      const name = node.name;
      const validName = /^[A-Z][a-zA-Z0-9]*$/.test(name);

      if (!validName) {
        return [{
          ruleId: 'export/missing-component-name',
          severity: 'info',
          category: 'code-export',
          message: `Component name "${name}" may not be valid for code export`,
          suggestion: 'Rename to PascalCase format (e.g., SubmitButton)',
          nodeId: node.id,
          nodeName: node.name,
        }];
      }

      return [];
    },
  },

  {
    id: 'export/incomplete-llm-context',
    severity: 'info',
    category: 'code-export',
    description: 'LLM context helps generate better code',
    check: (node, semantic) => {
      if (!semantic || !semantic.isComponentRoot) return [];

      const context = semantic.llmContext;
      if (!context?.purpose) {
        return [{
          ruleId: 'export/incomplete-llm-context',
          severity: 'info',
          category: 'code-export',
          message: 'Component has no purpose defined for LLM code generation',
          suggestion: 'Add a purpose description in Inspect tab > LLM Context',
          nodeId: node.id,
          nodeName: node.name,
          property: 'llmContext.purpose',
        }];
      }

      return [];
    },
  },
];

// =============================================================================
// Semantic Linter
// =============================================================================

/**
 * Semantic linter for accessibility and design consistency checks
 */
export class SemanticLinter {
  private rules: LintRule[];
  private enabledRules: Set<string>;

  constructor(options?: { disabledRules?: string[] }) {
    this.rules = LINT_RULES;
    this.enabledRules = new Set(this.rules.map(r => r.id));

    // Disable specified rules
    if (options?.disabledRules) {
      for (const ruleId of options.disabledRules) {
        this.enabledRules.delete(ruleId);
      }
    }
  }

  /**
   * Lint a single node
   */
  lintNode(node: NodeData, sceneGraph: SceneGraph): LintIssue[] {
    const pluginData = (node as NodeData & { pluginData?: Record<string, unknown> }).pluginData ?? {};
    const semantic = getSemanticMetadata(pluginData);

    const issues: LintIssue[] = [];

    for (const rule of this.rules) {
      if (!this.enabledRules.has(rule.id)) continue;

      try {
        const ruleIssues = rule.check(node, semantic, sceneGraph);
        issues.push(...ruleIssues);
      } catch {
        console.warn(`Lint rule ${rule.id} threw an error`);
      }
    }

    return issues;
  }

  /**
   * Lint all nodes in the scene graph
   */
  lintAll(sceneGraph: SceneGraph): LintResult {
    const issues: LintIssue[] = [];
    const allNodeIds = sceneGraph.getAllNodeIds();
    const allNodes = allNodeIds.map(id => sceneGraph.getNode(id)).filter((n): n is NodeData => n !== null);

    for (const node of allNodes) {
      // Skip document and page nodes
      if (node.type === 'DOCUMENT' || node.type === 'PAGE') continue;

      const nodeIssues = this.lintNode(node, sceneGraph);
      issues.push(...nodeIssues);
    }

    return this.createResult(issues, allNodes.length);
  }

  /**
   * Lint selected nodes only
   */
  lintSelection(nodeIds: NodeId[], sceneGraph: SceneGraph): LintResult {
    const issues: LintIssue[] = [];
    let nodesChecked = 0;

    for (const nodeId of nodeIds) {
      const node = sceneGraph.getNode(nodeId);
      if (!node) continue;

      nodesChecked++;
      const nodeIssues = this.lintNode(node, sceneGraph);
      issues.push(...nodeIssues);

      // Also lint descendants
      const descendants = sceneGraph.getDescendants(nodeId);
      for (const descendant of descendants) {
        nodesChecked++;
        const descIssues = this.lintNode(descendant, sceneGraph);
        issues.push(...descIssues);
      }
    }

    return this.createResult(issues, nodesChecked);
  }

  /**
   * Create lint result with summary
   */
  private createResult(issues: LintIssue[], nodesChecked: number): LintResult {
    const summary: LintSummary = {
      total: issues.length,
      errors: 0,
      warnings: 0,
      infos: 0,
      byCategory: {
        accessibility: 0,
        semantics: 0,
        consistency: 0,
        'code-export': 0,
        performance: 0,
      },
      byRule: {},
    };

    for (const issue of issues) {
      // Count by severity
      switch (issue.severity) {
        case 'error': summary.errors++; break;
        case 'warning': summary.warnings++; break;
        case 'info': summary.infos++; break;
      }

      // Count by category
      summary.byCategory[issue.category]++;

      // Count by rule
      summary.byRule[issue.ruleId] = (summary.byRule[issue.ruleId] ?? 0) + 1;
    }

    return {
      issues,
      summary,
      timestamp: new Date(),
      nodesChecked,
    };
  }

  /**
   * Get all available rules
   */
  getRules(): Array<{ id: string; severity: LintSeverity; category: LintCategory; description: string }> {
    return this.rules.map(r => ({
      id: r.id,
      severity: r.severity,
      category: r.category,
      description: r.description,
    }));
  }

  /**
   * Enable a rule
   */
  enableRule(ruleId: string): void {
    this.enabledRules.add(ruleId);
  }

  /**
   * Disable a rule
   */
  disableRule(ruleId: string): void {
    this.enabledRules.delete(ruleId);
  }

  /**
   * Check if a rule is enabled
   */
  isRuleEnabled(ruleId: string): boolean {
    return this.enabledRules.has(ruleId);
  }
}

/**
 * Create a semantic linter instance
 */
export function createSemanticLinter(options?: { disabledRules?: string[] }): SemanticLinter {
  return new SemanticLinter(options);
}

/**
 * Format lint issues as a human-readable report
 */
export function formatLintReport(result: LintResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('Semantic Lint Report');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Nodes checked: ${result.nodesChecked}`);
  lines.push(`Total issues: ${result.summary.total}`);
  lines.push(`  Errors: ${result.summary.errors}`);
  lines.push(`  Warnings: ${result.summary.warnings}`);
  lines.push(`  Info: ${result.summary.infos}`);
  lines.push('');

  if (result.issues.length === 0) {
    lines.push('No issues found!');
    return lines.join('\n');
  }

  // Group by severity
  const errors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');
  const infos = result.issues.filter(i => i.severity === 'info');

  if (errors.length > 0) {
    lines.push('ERRORS:');
    lines.push('-'.repeat(40));
    for (const issue of errors) {
      lines.push(`  [${issue.ruleId}] ${issue.nodeName}`);
      lines.push(`    ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`    Fix: ${issue.suggestion}`);
      }
      lines.push('');
    }
  }

  if (warnings.length > 0) {
    lines.push('WARNINGS:');
    lines.push('-'.repeat(40));
    for (const issue of warnings) {
      lines.push(`  [${issue.ruleId}] ${issue.nodeName}`);
      lines.push(`    ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`    Fix: ${issue.suggestion}`);
      }
      lines.push('');
    }
  }

  if (infos.length > 0) {
    lines.push('INFO:');
    lines.push('-'.repeat(40));
    for (const issue of infos) {
      lines.push(`  [${issue.ruleId}] ${issue.nodeName}`);
      lines.push(`    ${issue.message}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
