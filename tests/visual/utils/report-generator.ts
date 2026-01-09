/**
 * Visual Regression Report Generator
 *
 * Generates HTML reports with side-by-side comparisons of design
 * and code renders, highlighting any differences.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import config from '../visual-regression.config';

/**
 * Test result for a single visual comparison
 */
export interface TestResult {
  /** Test name */
  name: string;
  /** Fixture path */
  fixture: string;
  /** Target platform */
  platform: 'react' | 'css' | 'swiftui' | 'compose';
  /** Test category */
  category: 'layout' | 'styling' | 'typography' | 'components';
  /** Whether the test passed */
  passed: boolean;
  /** Pixel difference percentage */
  diffPercentage: number;
  /** Threshold used */
  threshold: number;
  /** Image paths or base64 data */
  images: {
    expected: string;
    actual: string;
    diff: string;
  };
  /** Test duration in ms */
  duration: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Full test report
 */
export interface TestReport {
  /** Report timestamp */
  timestamp: string;
  /** Total tests */
  total: number;
  /** Passed tests */
  passed: number;
  /** Failed tests */
  failed: number;
  /** Pass rate percentage */
  passRate: number;
  /** Individual test results */
  results: TestResult[];
  /** Total duration in ms */
  duration: number;
}

/**
 * Generate HTML report from test results
 */
export function generateHTMLReport(report: TestReport): string {
  const failedResults = report.results.filter(r => !r.passed);
  const passedResults = report.results.filter(r => r.passed);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Regression Report - ${report.timestamp}</title>
  <style>
    :root {
      --bg: #f5f5f5;
      --card-bg: #ffffff;
      --text: #1a1a1a;
      --text-muted: #666666;
      --border: #e0e0e0;
      --success: #22c55e;
      --success-bg: #dcfce7;
      --error: #ef4444;
      --error-bg: #fee2e2;
      --warning: #f59e0b;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    h1 {
      font-size: 1.75rem;
      margin-bottom: 0.5rem;
    }

    .timestamp {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .stat {
      background: var(--bg);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
    }

    .stat-label {
      color: var(--text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-passed .stat-value { color: var(--success); }
    .stat-failed .stat-value { color: var(--error); }

    .progress-bar {
      height: 8px;
      background: var(--error-bg);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 1rem;
    }

    .progress-fill {
      height: 100%;
      background: var(--success);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .filters {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .filter-btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .filter-btn:hover {
      border-color: var(--text);
    }

    .filter-btn.active {
      background: var(--text);
      color: white;
      border-color: var(--text);
    }

    .results-section {
      margin-bottom: 2rem;
    }

    .section-title {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-title .badge {
      background: var(--error-bg);
      color: var(--error);
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 10px;
    }

    .section-title.passed .badge {
      background: var(--success-bg);
      color: var(--success);
    }

    .result-card {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .result-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .result-meta {
      display: flex;
      gap: 1rem;
      color: var(--text-muted);
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .result-status {
      padding: 0.25rem 0.75rem;
      border-radius: 15px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .result-status.passed {
      background: var(--success-bg);
      color: var(--success);
    }

    .result-status.failed {
      background: var(--error-bg);
      color: var(--error);
    }

    .comparison {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .comparison-item {
      text-align: center;
    }

    .comparison-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .comparison-image {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: white;
    }

    .diff-info {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--bg);
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .diff-bar {
      height: 4px;
      background: var(--success-bg);
      border-radius: 2px;
      margin-top: 0.5rem;
      overflow: hidden;
    }

    .diff-bar-fill {
      height: 100%;
      background: var(--error);
      border-radius: 2px;
    }

    .error-message {
      background: var(--error-bg);
      color: var(--error);
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted);
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      .comparison {
        grid-template-columns: 1fr;
      }

      .summary {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Visual Regression Report</h1>
      <p class="timestamp">Generated: ${report.timestamp} | Duration: ${(report.duration / 1000).toFixed(2)}s</p>

      <div class="summary">
        <div class="stat">
          <div class="stat-value">${report.total}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat stat-passed">
          <div class="stat-value">${report.passed}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat stat-failed">
          <div class="stat-value">${report.failed}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat">
          <div class="stat-value">${report.passRate.toFixed(1)}%</div>
          <div class="stat-label">Pass Rate</div>
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" style="width: ${report.passRate}%"></div>
      </div>
    </header>

    <div class="filters">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="failed">Failed Only</button>
      <button class="filter-btn" data-filter="passed">Passed Only</button>
      <button class="filter-btn" data-filter="layout">Layout</button>
      <button class="filter-btn" data-filter="styling">Styling</button>
      <button class="filter-btn" data-filter="react">React</button>
    </div>

    ${failedResults.length > 0 ? `
    <section class="results-section" data-category="failed">
      <h2 class="section-title">
        Failed Tests
        <span class="badge">${failedResults.length}</span>
      </h2>
      ${failedResults.map(result => renderResultCard(result)).join('')}
    </section>
    ` : ''}

    <section class="results-section passed" data-category="passed">
      <h2 class="section-title passed">
        Passed Tests
        <span class="badge">${passedResults.length}</span>
      </h2>
      ${passedResults.length > 0
        ? passedResults.map(result => renderResultCard(result)).join('')
        : '<div class="empty-state">No passed tests</div>'}
    </section>
  </div>

  <script>
    // Filter functionality
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        document.querySelectorAll('.result-card').forEach(card => {
          const show = filter === 'all' ||
            (filter === 'failed' && card.dataset.status === 'failed') ||
            (filter === 'passed' && card.dataset.status === 'passed') ||
            card.dataset.category === filter ||
            card.dataset.platform === filter;
          card.style.display = show ? 'block' : 'none';
        });

        document.querySelectorAll('.results-section').forEach(section => {
          const hasVisible = section.querySelector('.result-card[style="display: block"]') ||
            section.querySelector('.result-card:not([style])');
          section.style.display = hasVisible ? 'block' : 'none';
        });
      });
    });
  </script>
</body>
</html>`;
}

function renderResultCard(result: TestResult): string {
  return `
    <div class="result-card" data-status="${result.passed ? 'passed' : 'failed'}" data-category="${result.category}" data-platform="${result.platform}">
      <div class="result-header">
        <div>
          <div class="result-name">${escapeHtml(result.name)}</div>
          <div class="result-meta">
            <span>${result.category}</span>
            <span>${result.platform}</span>
            <span>${result.duration.toFixed(0)}ms</span>
          </div>
        </div>
        <span class="result-status ${result.passed ? 'passed' : 'failed'}">
          ${result.passed ? 'PASSED' : 'FAILED'}
        </span>
      </div>

      <div class="comparison">
        <div class="comparison-item">
          <div class="comparison-label">Expected (Design)</div>
          <img class="comparison-image" src="${result.images.expected}" alt="Expected" />
        </div>
        <div class="comparison-item">
          <div class="comparison-label">Actual (${result.platform})</div>
          <img class="comparison-image" src="${result.images.actual}" alt="Actual" />
        </div>
        <div class="comparison-item">
          <div class="comparison-label">Difference</div>
          <img class="comparison-image" src="${result.images.diff}" alt="Diff" />
        </div>
      </div>

      <div class="diff-info">
        <strong>Difference:</strong> ${result.diffPercentage.toFixed(4)}%
        (threshold: ${result.threshold.toFixed(2)}%)
        <div class="diff-bar">
          <div class="diff-bar-fill" style="width: ${Math.min(100, (result.diffPercentage / result.threshold) * 100)}%"></div>
        </div>
      </div>

      ${result.error ? `<div class="error-message">${escapeHtml(result.error)}</div>` : ''}
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate report from snapshot directories
 */
export function generateReportFromSnapshots(): TestReport {
  const results: TestResult[] = [];
  const startTime = Date.now();

  const snapshotsDir = join(process.cwd(), config.paths.snapshots);
  const diffsDir = join(process.cwd(), config.paths.diffs);

  // Find all design snapshots
  const designDir = join(snapshotsDir, 'design');
  if (existsSync(designDir)) {
    for (const category of readdirSync(designDir)) {
      const categoryPath = join(designDir, category);
      if (!existsSync(categoryPath)) continue;

      for (const file of readdirSync(categoryPath)) {
        if (!file.endsWith('.png')) continue;

        const testName = basename(file, '.png');
        const designPath = join(categoryPath, file);

        // Look for corresponding code renders
        for (const platform of ['react', 'css'] as const) {
          const codePath = join(snapshotsDir, 'code', platform, category, file);
          const diffPath = join(diffsDir, `${testName}-diff.png`);

          if (existsSync(codePath)) {
            const hasDiff = existsSync(diffPath);

            results.push({
              name: `${category}/${testName}`,
              fixture: `${category}/${testName}.json`,
              platform,
              category: category as any,
              passed: !hasDiff,
              diffPercentage: hasDiff ? 1.0 : 0,
              threshold: config.thresholds[category as keyof typeof config.thresholds]?.diffPercentage || 0.1,
              images: {
                expected: `file://${designPath}`,
                actual: `file://${codePath}`,
                diff: hasDiff ? `file://${diffPath}` : '',
              },
              duration: 0,
            });
          }
        }
      }
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    passRate: results.length > 0 ? (passed / results.length) * 100 : 100,
    results,
    duration: Date.now() - startTime,
  };
}

/**
 * Save HTML report to file
 */
export function saveReport(report: TestReport, outputPath?: string): string {
  const reportsDir = join(process.cwd(), config.paths.reports);
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const fileName = outputPath || `report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
  const fullPath = join(reportsDir, fileName);

  const html = generateHTMLReport(report);
  writeFileSync(fullPath, html);

  return fullPath;
}

// CLI entry point
if (require.main === module) {
  console.log('Generating visual regression report...');
  const report = generateReportFromSnapshots();
  const path = saveReport(report);
  console.log(`Report saved to: ${path}`);
  console.log(`Results: ${report.passed}/${report.total} passed (${report.passRate.toFixed(1)}%)`);
}
