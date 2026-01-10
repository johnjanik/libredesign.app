/**
 * Lint Panel
 *
 * UI component for displaying semantic lint issues with accessibility
 * and design consistency checks.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import {
  createSemanticLinter,
  formatLintReport,
  type SemanticLinter,
  type LintResult,
  type LintIssue,
  type LintSeverity,
  type LintCategory,
} from '@devtools/semantic-linter';

/**
 * Lint panel options
 */
export interface LintPanelOptions {
  /** Auto-lint on selection change */
  autoLint?: boolean;
  /** Disabled rules */
  disabledRules?: string[];
}

/**
 * SVG Icons for lint panel
 */
const ICONS = {
  error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>`,
  warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,
  info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>`,
  filter: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>`,
  goto: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,
  copy: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`,
  accessibility: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="4" r="2"/><path d="M12 6v14"/><path d="M8 8l4 2 4-2"/>
    <path d="M6 14l6 6 6-6"/>
  </svg>`,
};

/**
 * Colors for severity levels
 */
const SEVERITY_COLORS: Record<LintSeverity, { bg: string; text: string; border: string }> = {
  error: { bg: '#dc2626', text: '#fecaca', border: '#ef4444' },
  warning: { bg: '#d97706', text: '#fef3c7', border: '#f59e0b' },
  info: { bg: '#2563eb', text: '#dbeafe', border: '#3b82f6' },
};


/**
 * Lint Panel
 */
export class LintPanel {
  private runtime: DesignLibreRuntime;
  private linter: SemanticLinter;
  private element: HTMLElement | null = null;
  private listContainer: HTMLElement | null = null;
  private summaryContainer: HTMLElement | null = null;
  private autoLint: boolean;
  private lastResult: LintResult | null = null;
  private filterSeverity: LintSeverity | 'all' = 'all';
  private filterCategory: LintCategory | 'all' = 'all';

  constructor(runtime: DesignLibreRuntime, options: LintPanelOptions = {}) {
    this.runtime = runtime;
    this.autoLint = options.autoLint ?? false;
    this.linter = options.disabledRules
      ? createSemanticLinter({ disabledRules: options.disabledRules })
      : createSemanticLinter();
  }

  /**
   * Create the lint panel element
   */
  create(): HTMLElement {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-lint-panel';
    this.element.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--designlibre-bg-primary, #1a1a1a);
    `;

    // Header with actions
    this.element.appendChild(this.createHeader());

    // Summary bar
    this.summaryContainer = document.createElement('div');
    this.summaryContainer.className = 'lint-summary';
    this.element.appendChild(this.summaryContainer);

    // Filter bar
    this.element.appendChild(this.createFilterBar());

    // Issues list
    this.listContainer = document.createElement('div');
    this.listContainer.className = 'lint-list';
    this.listContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    `;
    this.element.appendChild(this.listContainer);

    // Initial empty state
    this.renderEmptyState();

    // Subscribe to selection changes if auto-lint enabled
    if (this.autoLint) {
      this.subscribeToSelectionChanges();
    }

    return this.element;
  }

  /**
   * Create header with title and actions
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'lint-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    // Title with icon
    const titleSection = document.createElement('div');
    titleSection.style.cssText = `display: flex; align-items: center; gap: 8px;`;

    const icon = document.createElement('span');
    icon.innerHTML = ICONS.accessibility;
    icon.style.cssText = `color: var(--designlibre-primary, #3b82f6);`;
    titleSection.appendChild(icon);

    const title = document.createElement('div');
    title.textContent = 'Lint';
    title.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    titleSection.appendChild(title);
    header.appendChild(titleSection);

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = `display: flex; gap: 4px;`;

    // Run lint button
    const lintBtn = this.createHeaderButton(ICONS.refresh, 'Run Lint (All)', () => {
      this.runLint();
    });
    actions.appendChild(lintBtn);

    // Lint selection button
    const lintSelBtn = this.createHeaderButton(ICONS.goto, 'Lint Selection', () => {
      this.runLintSelection();
    });
    actions.appendChild(lintSelBtn);

    // Copy report button
    const copyBtn = this.createHeaderButton(ICONS.copy, 'Copy Report', () => {
      this.copyReport();
    });
    actions.appendChild(copyBtn);

    header.appendChild(actions);

    return header;
  }

  /**
   * Create filter bar
   */
  private createFilterBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'lint-filter-bar';
    bar.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      font-size: 11px;
    `;

    // Severity filter
    const severityLabel = document.createElement('span');
    severityLabel.textContent = 'Severity:';
    severityLabel.style.cssText = `color: var(--designlibre-text-muted, #888);`;
    bar.appendChild(severityLabel);

    const severitySelect = document.createElement('select');
    severitySelect.style.cssText = `
      padding: 4px 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #fff);
      font-size: 11px;
    `;
    const severities: Array<{ value: LintSeverity | 'all'; label: string }> = [
      { value: 'all', label: 'All' },
      { value: 'error', label: 'Errors' },
      { value: 'warning', label: 'Warnings' },
      { value: 'info', label: 'Info' },
    ];
    for (const sev of severities) {
      const opt = document.createElement('option');
      opt.value = sev.value;
      opt.textContent = sev.label;
      severitySelect.appendChild(opt);
    }
    severitySelect.addEventListener('change', () => {
      this.filterSeverity = severitySelect.value as LintSeverity | 'all';
      this.renderIssues();
    });
    bar.appendChild(severitySelect);

    // Category filter
    const categoryLabel = document.createElement('span');
    categoryLabel.textContent = 'Category:';
    categoryLabel.style.cssText = `color: var(--designlibre-text-muted, #888); margin-left: 8px;`;
    bar.appendChild(categoryLabel);

    const categorySelect = document.createElement('select');
    categorySelect.style.cssText = `
      padding: 4px 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #fff);
      font-size: 11px;
    `;
    const categories: Array<{ value: LintCategory | 'all'; label: string }> = [
      { value: 'all', label: 'All' },
      { value: 'accessibility', label: 'Accessibility' },
      { value: 'semantics', label: 'Semantics' },
      { value: 'consistency', label: 'Consistency' },
      { value: 'code-export', label: 'Code Export' },
    ];
    for (const cat of categories) {
      const opt = document.createElement('option');
      opt.value = cat.value;
      opt.textContent = cat.label;
      categorySelect.appendChild(opt);
    }
    categorySelect.addEventListener('change', () => {
      this.filterCategory = categorySelect.value as LintCategory | 'all';
      this.renderIssues();
    });
    bar.appendChild(categorySelect);

    return bar;
  }

  /**
   * Create a header action button
   */
  private createHeaderButton(icon: string, title: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.innerHTML = icon;
    button.title = title;
    button.style.cssText = `
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #888);
      transition: all 0.15s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
      button.style.color = 'var(--designlibre-text-secondary, #888)';
    });

    button.addEventListener('click', onClick);

    return button;
  }

  /**
   * Run lint on all nodes
   */
  runLint(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    this.lastResult = this.linter.lintAll(sceneGraph);
    this.renderSummary();
    this.renderIssues();
  }

  /**
   * Run lint on selected nodes
   */
  runLintSelection(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const selection = this.runtime.getSelectionManager().getSelectedNodeIds();

    if (selection.length === 0) {
      this.showMessage('No nodes selected. Select nodes to lint.');
      return;
    }

    this.lastResult = this.linter.lintSelection(selection, sceneGraph);
    this.renderSummary();
    this.renderIssues();
  }

  /**
   * Render the summary bar
   */
  private renderSummary(): void {
    if (!this.summaryContainer || !this.lastResult) return;

    this.summaryContainer.innerHTML = '';
    this.summaryContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      font-size: 11px;
    `;

    const { summary } = this.lastResult;

    // Nodes checked
    const nodesSpan = document.createElement('span');
    nodesSpan.textContent = `${this.lastResult.nodesChecked} nodes`;
    nodesSpan.style.cssText = `color: var(--designlibre-text-muted, #888);`;
    this.summaryContainer.appendChild(nodesSpan);

    // Separator
    const sep = document.createElement('span');
    sep.textContent = '|';
    sep.style.cssText = `color: var(--designlibre-border, #3d3d3d);`;
    this.summaryContainer.appendChild(sep);

    // Error count
    if (summary.errors > 0) {
      const errorSpan = this.createCountBadge('error', summary.errors);
      this.summaryContainer.appendChild(errorSpan);
    }

    // Warning count
    if (summary.warnings > 0) {
      const warningSpan = this.createCountBadge('warning', summary.warnings);
      this.summaryContainer.appendChild(warningSpan);
    }

    // Info count
    if (summary.infos > 0) {
      const infoSpan = this.createCountBadge('info', summary.infos);
      this.summaryContainer.appendChild(infoSpan);
    }

    // All clear
    if (summary.total === 0) {
      const clearSpan = document.createElement('span');
      clearSpan.innerHTML = `${ICONS.check} No issues found`;
      clearSpan.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        color: #22c55e;
      `;
      this.summaryContainer.appendChild(clearSpan);
    }
  }

  /**
   * Create a count badge
   */
  private createCountBadge(severity: LintSeverity, count: number): HTMLElement {
    const colors = SEVERITY_COLORS[severity];
    const badge = document.createElement('span');
    badge.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      background: ${colors.bg}22;
      border: 1px solid ${colors.border}44;
      border-radius: 4px;
      color: ${colors.text};
    `;
    badge.innerHTML = `${this.getIcon(severity)} ${count}`;
    return badge;
  }

  /**
   * Get icon for severity
   */
  private getIcon(severity: LintSeverity): string {
    switch (severity) {
      case 'error': return ICONS.error;
      case 'warning': return ICONS.warning;
      case 'info': return ICONS.info;
    }
  }

  /**
   * Render the issues list
   */
  private renderIssues(): void {
    if (!this.listContainer || !this.lastResult) return;

    this.listContainer.innerHTML = '';

    // Filter issues
    let issues = this.lastResult.issues;
    if (this.filterSeverity !== 'all') {
      issues = issues.filter(i => i.severity === this.filterSeverity);
    }
    if (this.filterCategory !== 'all') {
      issues = issues.filter(i => i.category === this.filterCategory);
    }

    if (issues.length === 0) {
      if (this.lastResult.issues.length === 0) {
        this.renderSuccessState();
      } else {
        this.showMessage('No issues match the current filters.');
      }
      return;
    }

    // Group by severity
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infos = issues.filter(i => i.severity === 'info');

    if (errors.length > 0) {
      this.listContainer.appendChild(this.renderIssueGroup('Errors', errors, 'error'));
    }
    if (warnings.length > 0) {
      this.listContainer.appendChild(this.renderIssueGroup('Warnings', warnings, 'warning'));
    }
    if (infos.length > 0) {
      this.listContainer.appendChild(this.renderIssueGroup('Info', infos, 'info'));
    }
  }

  /**
   * Render a group of issues
   */
  private renderIssueGroup(title: string, issues: LintIssue[], severity: LintSeverity): HTMLElement {
    const group = document.createElement('div');
    group.className = 'lint-issue-group';
    group.style.cssText = `margin-bottom: 12px;`;

    // Group header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 600;
      color: ${SEVERITY_COLORS[severity].text};
    `;
    header.innerHTML = `${this.getIcon(severity)} ${title} (${issues.length})`;
    group.appendChild(header);

    // Issues
    for (const issue of issues) {
      group.appendChild(this.renderIssueRow(issue));
    }

    return group;
  }

  /**
   * Render a single issue row
   */
  private renderIssueRow(issue: LintIssue): HTMLElement {
    const colors = SEVERITY_COLORS[issue.severity];
    const row = document.createElement('div');
    row.className = 'lint-issue-row';
    row.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 10px;
      margin-bottom: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-left: 3px solid ${colors.border};
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
    `;

    row.addEventListener('mouseenter', () => {
      row.style.background = 'var(--designlibre-bg-tertiary, #333)';
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });

    // Click to select node
    row.addEventListener('click', () => {
      this.selectNode(issue.nodeId);
    });

    // Top row: node name and rule
    const topRow = document.createElement('div');
    topRow.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    `;

    const nodeName = document.createElement('span');
    nodeName.textContent = issue.nodeName;
    nodeName.style.cssText = `
      font-size: 12px;
      font-weight: 500;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    topRow.appendChild(nodeName);

    const ruleId = document.createElement('span');
    ruleId.textContent = issue.ruleId;
    ruleId.style.cssText = `
      font-size: 10px;
      font-family: monospace;
      color: var(--designlibre-text-muted, #666);
      padding: 1px 4px;
      background: var(--designlibre-bg-tertiary, #333);
      border-radius: 2px;
    `;
    topRow.appendChild(ruleId);

    row.appendChild(topRow);

    // Message
    const message = document.createElement('div');
    message.textContent = issue.message;
    message.style.cssText = `
      font-size: 11px;
      color: var(--designlibre-text-secondary, #aaa);
      line-height: 1.4;
    `;
    row.appendChild(message);

    // Suggestion (if any)
    if (issue.suggestion) {
      const suggestion = document.createElement('div');
      suggestion.textContent = `Fix: ${issue.suggestion}`;
      suggestion.style.cssText = `
        font-size: 10px;
        color: ${colors.text};
        opacity: 0.8;
      `;
      row.appendChild(suggestion);
    }

    return row;
  }

  /**
   * Select a node in the canvas
   */
  private selectNode(nodeId: NodeId): void {
    const selectionManager = this.runtime.getSelectionManager();
    selectionManager.select([nodeId]);

    // Center the node in viewport
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(nodeId);
    if (node) {
      const viewport = this.runtime.getViewport();
      if (viewport && 'x' in node && 'y' in node) {
        viewport.centerOn(node.x as number, node.y as number);
      }
    }
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): void {
    if (!this.listContainer) return;

    this.listContainer.innerHTML = '';
    const empty = document.createElement('div');
    empty.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      color: var(--designlibre-text-muted, #666);
      text-align: center;
    `;
    empty.innerHTML = `
      <div style="opacity: 0.5; margin-bottom: 12px;">${ICONS.accessibility}</div>
      <div style="font-size: 12px; margin-bottom: 8px;">No lint results</div>
      <div style="font-size: 11px;">Click "Run Lint" to check for accessibility and semantic issues.</div>
    `;
    this.listContainer.appendChild(empty);
  }

  /**
   * Render success state
   */
  private renderSuccessState(): void {
    if (!this.listContainer) return;

    this.listContainer.innerHTML = '';
    const success = document.createElement('div');
    success.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      color: #22c55e;
      text-align: center;
    `;
    success.innerHTML = `
      <div style="margin-bottom: 12px;">${ICONS.check}</div>
      <div style="font-size: 12px; font-weight: 500;">All checks passed!</div>
      <div style="font-size: 11px; color: var(--designlibre-text-muted, #666); margin-top: 8px;">
        No accessibility or semantic issues found.
      </div>
    `;
    this.listContainer.appendChild(success);
  }

  /**
   * Show a message
   */
  private showMessage(message: string): void {
    if (!this.listContainer) return;

    this.listContainer.innerHTML = '';
    const msg = document.createElement('div');
    msg.style.cssText = `
      padding: 16px;
      color: var(--designlibre-text-muted, #666);
      text-align: center;
      font-size: 12px;
    `;
    msg.textContent = message;
    this.listContainer.appendChild(msg);
  }

  /**
   * Copy lint report to clipboard
   */
  private copyReport(): void {
    if (!this.lastResult) {
      this.showMessage('Run lint first to generate a report.');
      return;
    }

    const report = formatLintReport(this.lastResult);
    navigator.clipboard.writeText(report).then(() => {
      // Show brief feedback
      const btn = this.element?.querySelector('button[title="Copy Report"]') as HTMLButtonElement | null;
      if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML = ICONS.check;
        btn.style.color = '#22c55e';
        setTimeout(() => {
          btn.innerHTML = original;
          btn.style.color = '';
        }, 1500);
      }
    });
  }

  /**
   * Subscribe to selection changes for auto-lint
   */
  private subscribeToSelectionChanges(): void {
    const selectionManager = this.runtime.getSelectionManager();
    selectionManager.on('selectionChanged', () => {
      this.runLintSelection();
    });
  }

  /**
   * Get the panel element
   */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /**
   * Get the last lint result
   */
  getLastResult(): LintResult | null {
    return this.lastResult;
  }

  /**
   * Destroy the panel
   */
  destroy(): void {
    this.element?.remove();
    this.element = null;
    this.listContainer = null;
    this.summaryContainer = null;
    this.lastResult = null;
  }
}

/**
 * Create a lint panel instance
 */
export function createLintPanel(
  runtime: DesignLibreRuntime,
  options?: LintPanelOptions
): LintPanel {
  return new LintPanel(runtime, options);
}
