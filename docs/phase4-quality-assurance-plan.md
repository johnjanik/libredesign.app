# Phase 4: Quality Assurance Implementation Plan

## Overview

This document details the implementation plan for Phase 4 of the Faithful Code Export initiative. The goal is to establish automated visual regression testing that verifies exported code renders identically to the design canvas.

**Core Principle**: Any pixel difference between design and generated code is a bug that must be caught automatically.

---

## Objectives

1. **Visual Fidelity Verification**: Automated comparison between design renders and code renders
2. **Cross-Platform Testing**: Verify exports for SwiftUI, Compose, React, and CSS
3. **Regression Prevention**: Catch export regressions before they reach users
4. **Continuous Integration**: Integrate testing into the development workflow

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Test Runner (Vitest)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │  Test Suite  │    │  Test Suite  │    │  Test Suite  │               │
│  │   Layout     │    │   Styling    │    │  Components  │               │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘               │
│         │                   │                   │                        │
│         └───────────────────┼───────────────────┘                        │
│                             ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Visual Comparison Engine                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │    │
│  │  │   Design    │  │    Code     │  │    Pixel Diff Engine    │  │    │
│  │  │  Renderer   │  │  Renderer   │  │  (pixelmatch/resemblejs)│  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │    │
│  │         │                │                      │               │    │
│  │         ▼                ▼                      ▼               │    │
│  │    Canvas PNG       Browser PNG           Diff Report           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Platform Renderers                          │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │    │
│  │  │ SwiftUI │  │ Compose │  │  React  │  │   CSS   │            │    │
│  │  │ (Xcode) │  │(Android)│  │(Browser)│  │(Browser)│            │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 4.1: Test Infrastructure Setup

#### 4.1.1 Directory Structure

```
tests/
├── visual/
│   ├── fixtures/                    # Test design fixtures
│   │   ├── layouts/
│   │   │   ├── horizontal-basic.json
│   │   │   ├── vertical-basic.json
│   │   │   ├── nested-layout.json
│   │   │   ├── space-between.json
│   │   │   └── alignment-combinations.json
│   │   ├── styling/
│   │   │   ├── colors-solid.json
│   │   │   ├── colors-gradient.json
│   │   │   ├── shadows.json
│   │   │   ├── borders.json
│   │   │   └── corner-radius.json
│   │   ├── typography/
│   │   │   ├── text-sizes.json
│   │   │   ├── text-weights.json
│   │   │   └── text-alignment.json
│   │   └── components/
│   │       ├── button-variants.json
│   │       ├── card-layout.json
│   │       └── form-elements.json
│   ├── snapshots/                   # Baseline images
│   │   ├── design/                  # Canvas renders
│   │   └── code/                    # Code renders by platform
│   │       ├── react/
│   │       ├── swiftui/
│   │       ├── compose/
│   │       └── css/
│   ├── diffs/                       # Generated diff images
│   ├── reports/                     # HTML reports
│   ├── utils/
│   │   ├── design-renderer.ts       # Render design to PNG
│   │   ├── code-renderer.ts         # Render code to PNG
│   │   ├── pixel-comparator.ts      # Image comparison
│   │   └── report-generator.ts      # HTML report generation
│   ├── suites/
│   │   ├── layout.test.ts
│   │   ├── styling.test.ts
│   │   ├── typography.test.ts
│   │   └── components.test.ts
│   └── visual-regression.config.ts
└── unit/
    └── export/                      # Existing unit tests
```

#### 4.1.2 Dependencies

```json
{
  "devDependencies": {
    "pixelmatch": "^5.3.0",
    "pngjs": "^7.0.0",
    "puppeteer": "^21.0.0",
    "sharp": "^0.33.0",
    "@playwright/test": "^1.40.0"
  }
}
```

#### 4.1.3 Files to Create

| File | Purpose |
|------|---------|
| `tests/visual/utils/design-renderer.ts` | Render DesignLibre canvas to PNG |
| `tests/visual/utils/code-renderer.ts` | Render generated code to PNG via browser/simulator |
| `tests/visual/utils/pixel-comparator.ts` | Compare two images and generate diff |
| `tests/visual/utils/report-generator.ts` | Generate HTML visual diff report |
| `tests/visual/utils/fixture-loader.ts` | Load and parse test fixtures |
| `tests/visual/visual-regression.config.ts` | Configuration for thresholds and platforms |

---

### Phase 4.2: Design Renderer

#### 4.2.1 Implementation

**File**: `tests/visual/utils/design-renderer.ts`

```typescript
/**
 * Design Renderer
 *
 * Renders DesignLibre scene graph nodes to PNG images
 * using the existing WebGL renderer.
 */

export interface RenderOptions {
  width: number;
  height: number;
  scale: number;          // For retina (2x, 3x)
  backgroundColor: string;
  padding: number;
}

export interface RenderResult {
  buffer: Buffer;
  width: number;
  height: number;
}

export async function renderDesignToPNG(
  sceneGraph: SceneGraph,
  nodeId: NodeId,
  options: RenderOptions
): Promise<RenderResult>;

export async function renderFrameToPNG(
  frame: FrameNodeData,
  options: RenderOptions
): Promise<RenderResult>;
```

#### 4.2.2 Approach Options

| Approach | Pros | Cons |
|----------|------|------|
| **WebGL Canvas Export** | Uses existing renderer, accurate | Requires headless browser |
| **SVG Export + Conversion** | Pure Node.js, fast | May differ from canvas render |
| **Puppeteer Screenshot** | Real browser render | Slower, more dependencies |

**Recommended**: WebGL Canvas Export via Puppeteer for accuracy.

---

### Phase 4.3: Code Renderers

#### 4.3.1 React/CSS Renderer

**File**: `tests/visual/utils/renderers/react-renderer.ts`

```typescript
/**
 * Renders React/CSS code to PNG via Puppeteer
 */

export async function renderReactToPNG(
  code: string,
  options: RenderOptions
): Promise<RenderResult> {
  // 1. Create temp HTML file with React + generated code
  // 2. Launch Puppeteer
  // 3. Navigate to temp file
  // 4. Screenshot the component
  // 5. Return PNG buffer
}
```

**Implementation Steps**:
1. Generate standalone HTML with React CDN
2. Inject generated component code
3. Mount component to DOM
4. Use Puppeteer to screenshot
5. Crop to component bounds

#### 4.3.2 SwiftUI Renderer

**File**: `tests/visual/utils/renderers/swiftui-renderer.ts`

```typescript
/**
 * Renders SwiftUI code to PNG via Xcode/Swift
 * Requires macOS with Xcode installed
 */

export async function renderSwiftUIToPNG(
  code: string,
  options: RenderOptions
): Promise<RenderResult> {
  // 1. Write code to temp Swift file
  // 2. Create SwiftUI preview project
  // 3. Use `swift` CLI or Xcode to render preview
  // 4. Capture preview image
  // 5. Return PNG buffer
}
```

**Alternative Approaches**:
| Approach | Feasibility | Notes |
|----------|-------------|-------|
| Xcode Preview | macOS only | Most accurate |
| Swift Playgrounds | macOS only | Simpler setup |
| Skip (manual verification) | Cross-platform | Less automation |

**Recommendation**: Make SwiftUI rendering optional, macOS-only in CI.

#### 4.3.3 Compose Renderer

**File**: `tests/visual/utils/renderers/compose-renderer.ts`

```typescript
/**
 * Renders Compose code to PNG via Android emulator
 * Requires Android SDK
 */

export async function renderComposeToPNG(
  code: string,
  options: RenderOptions
): Promise<RenderResult> {
  // 1. Write code to temp Kotlin file
  // 2. Build test APK with @Preview composable
  // 3. Run on emulator
  // 4. Capture screenshot via adb
  // 5. Return PNG buffer
}
```

**Alternative**: Use Robolectric for JVM-based rendering without emulator.

---

### Phase 4.4: Pixel Comparison Engine

#### 4.4.1 Implementation

**File**: `tests/visual/utils/pixel-comparator.ts`

```typescript
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface ComparisonResult {
  /** Number of different pixels */
  diffPixels: number;
  /** Percentage of different pixels (0-100) */
  diffPercentage: number;
  /** Diff image buffer (red highlights differences) */
  diffImage: Buffer;
  /** Whether comparison passed threshold */
  passed: boolean;
  /** Threshold used */
  threshold: number;
}

export interface ComparisonOptions {
  /** Maximum allowed difference percentage (default: 0.1%) */
  threshold: number;
  /** Antialiasing tolerance (default: true) */
  includeAA: boolean;
  /** Color difference threshold (default: 0.1) */
  colorThreshold: number;
}

export async function compareImages(
  expected: Buffer,
  actual: Buffer,
  options?: ComparisonOptions
): Promise<ComparisonResult>;

export async function generateDiffImage(
  expected: Buffer,
  actual: Buffer
): Promise<Buffer>;
```

#### 4.4.2 Threshold Configuration

```typescript
// tests/visual/visual-regression.config.ts

export const thresholds = {
  // Strict for layout tests
  layout: {
    diffPercentage: 0.1,    // 0.1% max difference
    colorThreshold: 0.1,
  },

  // Slightly relaxed for styling (antialiasing)
  styling: {
    diffPercentage: 0.5,
    colorThreshold: 0.2,
  },

  // More relaxed for typography (font rendering varies)
  typography: {
    diffPercentage: 1.0,
    colorThreshold: 0.3,
  },

  // Per-platform adjustments
  platforms: {
    react: { multiplier: 1.0 },
    swiftui: { multiplier: 1.5 },  // Font rendering differs
    compose: { multiplier: 1.5 },
  },
};
```

---

### Phase 4.5: Test Suites

#### 4.5.1 Layout Test Suite

**File**: `tests/visual/suites/layout.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { loadFixture, renderDesign, renderCode, compare } from '../utils';

describe('Layout Fidelity', () => {
  describe('Horizontal Layout', () => {
    it('renders HStack with spacing correctly', async () => {
      const fixture = await loadFixture('layouts/horizontal-basic.json');
      const designPng = await renderDesign(fixture);
      const codePng = await renderCode(fixture, 'react');
      const result = await compare(designPng, codePng);
      expect(result.diffPercentage).toBeLessThan(0.1);
    });

    it('renders justify-start correctly', async () => { /* ... */ });
    it('renders justify-center correctly', async () => { /* ... */ });
    it('renders justify-end correctly', async () => { /* ... */ });
    it('renders justify-between correctly', async () => { /* ... */ });
  });

  describe('Vertical Layout', () => {
    it('renders VStack with spacing correctly', async () => { /* ... */ });
    it('renders items-start correctly', async () => { /* ... */ });
    it('renders items-center correctly', async () => { /* ... */ });
    it('renders items-end correctly', async () => { /* ... */ });
    it('renders items-baseline correctly', async () => { /* ... */ });
  });

  describe('Nested Layouts', () => {
    it('renders HStack inside VStack', async () => { /* ... */ });
    it('renders VStack inside HStack', async () => { /* ... */ });
    it('renders 3-level nesting', async () => { /* ... */ });
  });

  describe('Sizing Modes', () => {
    it('renders fixed width correctly', async () => { /* ... */ });
    it('renders fixed height correctly', async () => { /* ... */ });
    it('renders hug contents (auto) correctly', async () => { /* ... */ });
    it('renders fill parent correctly', async () => { /* ... */ });
  });

  describe('Padding', () => {
    it('renders uniform padding', async () => { /* ... */ });
    it('renders horizontal/vertical padding', async () => { /* ... */ });
    it('renders asymmetric padding', async () => { /* ... */ });
  });
});
```

#### 4.5.2 Test Matrix

| Test Category | Test Cases | Platforms |
|---------------|------------|-----------|
| **Layout** | | |
| Horizontal alignment | 4 (MIN, CENTER, MAX, SPACE_BETWEEN) | All |
| Vertical alignment | 4 (MIN, CENTER, MAX, BASELINE) | All |
| Nested layouts | 6 combinations | All |
| Sizing modes | 4 (FIXED, AUTO per axis) | All |
| Padding | 4 (uniform, h/v, asymmetric, none) | All |
| **Styling** | | |
| Solid fills | 5 colors | All |
| Gradients | 3 directions | React, CSS |
| Borders | 4 widths | All |
| Corner radius | 5 values | All |
| Shadows | 4 sizes | All |
| **Typography** | | |
| Font sizes | 6 sizes | All |
| Font weights | 5 weights | All |
| Text alignment | 4 alignments | All |
| **Components** | | |
| Button variants | 3 variants | All |
| Card layout | 2 variants | All |
| Form elements | 4 types | React, CSS |

**Total**: ~60 test cases × 4 platforms = ~240 visual comparisons

---

### Phase 4.6: CI/CD Integration

#### 4.6.1 GitHub Actions Workflow

**File**: `.github/workflows/visual-regression.yml`

```yaml
name: Visual Regression Tests

on:
  pull_request:
    paths:
      - 'src/persistence/export/**'
      - 'tests/visual/**'
  push:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install chromium

      - name: Run visual regression tests
        run: npm run test:visual

      - name: Upload diff artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: tests/visual/diffs/

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: visual-report
          path: tests/visual/reports/

  visual-tests-macos:
    runs-on: macos-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest-stable

      - name: Run SwiftUI visual tests
        run: npm run test:visual:swiftui
```

#### 4.6.2 NPM Scripts

```json
{
  "scripts": {
    "test:visual": "vitest run --config tests/visual/vitest.config.ts",
    "test:visual:watch": "vitest --config tests/visual/vitest.config.ts",
    "test:visual:update": "vitest run --config tests/visual/vitest.config.ts --update-snapshots",
    "test:visual:report": "node tests/visual/utils/report-generator.js",
    "test:visual:swiftui": "node tests/visual/runners/swiftui-runner.js",
    "test:visual:compose": "node tests/visual/runners/compose-runner.js"
  }
}
```

---

### Phase 4.7: Report Generation

#### 4.7.1 HTML Report

**File**: `tests/visual/utils/report-generator.ts`

```typescript
export interface TestResult {
  name: string;
  fixture: string;
  platform: string;
  passed: boolean;
  diffPercentage: number;
  threshold: number;
  images: {
    expected: string;  // Base64 or path
    actual: string;
    diff: string;
  };
  duration: number;
}

export function generateHTMLReport(results: TestResult[]): string;
```

**Report Features**:
- Summary statistics (passed/failed/total)
- Side-by-side image comparison
- Diff overlay with highlighting
- Filter by status (passed/failed)
- Filter by platform
- Filter by category
- Downloadable as standalone HTML

#### 4.7.2 Sample Report Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Visual Regression Report                                        │
│  Generated: 2026-01-05 14:30:00                                 │
├─────────────────────────────────────────────────────────────────┤
│  Summary: 235/240 passed (97.9%)                                │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░                     │
├─────────────────────────────────────────────────────────────────┤
│  Filters: [All] [Failed] [Layout] [Styling] [React] [SwiftUI]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❌ FAILED: layout/horizontal-space-between (React)             │
│  ┌─────────────┬─────────────┬─────────────┐                    │
│  │   Expected  │    Actual   │     Diff    │                    │
│  │   [image]   │   [image]   │   [image]   │                    │
│  └─────────────┴─────────────┴─────────────┘                    │
│  Difference: 2.3% (threshold: 0.1%)                             │
│                                                                  │
│  ✅ PASSED: layout/horizontal-center (React)                    │
│  Difference: 0.02% (threshold: 0.1%)                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 4.1: Test Infrastructure
- [ ] Create directory structure
- [ ] Add dependencies to package.json
- [ ] Create vitest.config.ts for visual tests
- [ ] Set up fixture loading utilities

### Phase 4.2: Design Renderer
- [ ] Implement canvas-to-PNG export
- [ ] Add headless browser support
- [ ] Create render options configuration
- [ ] Add caching for performance

### Phase 4.3: Code Renderers
- [ ] Implement React/CSS renderer
- [ ] Create HTML template generator
- [ ] Add Puppeteer screenshot capture
- [ ] (Optional) SwiftUI renderer for macOS
- [ ] (Optional) Compose renderer with Robolectric

### Phase 4.4: Pixel Comparison
- [ ] Implement pixelmatch integration
- [ ] Create diff image generator
- [ ] Add threshold configuration
- [ ] Implement per-platform adjustments

### Phase 4.5: Test Suites
- [ ] Create layout test fixtures (10 fixtures)
- [ ] Create styling test fixtures (8 fixtures)
- [ ] Create typography test fixtures (5 fixtures)
- [ ] Create component test fixtures (5 fixtures)
- [ ] Write layout test suite
- [ ] Write styling test suite
- [ ] Write typography test suite
- [ ] Write component test suite

### Phase 4.6: CI/CD
- [ ] Create GitHub Actions workflow
- [ ] Add artifact upload for failures
- [ ] Configure branch protection rules
- [ ] Set up Slack/Discord notifications

### Phase 4.7: Reporting
- [ ] Implement HTML report generator
- [ ] Add side-by-side comparison view
- [ ] Add filtering and sorting
- [ ] Create summary statistics

---

## Timeline Estimate

| Phase | Complexity | Dependencies |
|-------|------------|--------------|
| 4.1 Infrastructure | Low | None |
| 4.2 Design Renderer | Medium | Puppeteer |
| 4.3 Code Renderers | High | Platform SDKs |
| 4.4 Pixel Comparison | Low | pixelmatch |
| 4.5 Test Suites | Medium | 4.2, 4.3, 4.4 |
| 4.6 CI/CD | Low | 4.5 |
| 4.7 Reporting | Medium | 4.5 |

**Recommended Order**: 4.1 → 4.4 → 4.2 → 4.3 (React only) → 4.5 → 4.7 → 4.6

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Visual fidelity | < 0.1% pixel difference | Per-test assertion |
| Test coverage | 60+ test cases | Test count |
| Platform coverage | 2+ platforms (React + 1 native) | Platforms tested |
| CI integration | 100% PRs tested | GitHub Actions |
| Regression detection | 0 regressions shipped | Production bugs |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Font rendering differences | Medium | Increase threshold for typography, use web fonts |
| Antialiasing variations | Low | Enable AA tolerance in pixelmatch |
| Platform SDK availability | High | Make native renderers optional |
| CI execution time | Medium | Parallelize tests, cache dependencies |
| Flaky tests | High | Add retry logic, stable fixtures |

---

## Future Enhancements

1. **Interactive Approval Flow**: UI for approving/rejecting visual changes
2. **Automated Baseline Updates**: Auto-update baselines on main branch
3. **Performance Testing**: Measure render time alongside visual accuracy
4. **Accessibility Testing**: Integrate axe-core for a11y validation
5. **Animation Testing**: Frame-by-frame comparison for animated components
6. **Real Device Testing**: BrowserStack/Sauce Labs integration

---

## File Locations Reference

```
tests/visual/
├── fixtures/                    # JSON scene graph fixtures
├── snapshots/                   # Baseline PNG images
├── diffs/                       # Generated diff images (gitignored)
├── reports/                     # HTML reports (gitignored)
├── utils/
│   ├── design-renderer.ts
│   ├── code-renderer.ts
│   ├── pixel-comparator.ts
│   ├── report-generator.ts
│   └── fixture-loader.ts
├── renderers/
│   ├── react-renderer.ts
│   ├── swiftui-renderer.ts      # macOS only
│   └── compose-renderer.ts      # Optional
├── suites/
│   ├── layout.test.ts
│   ├── styling.test.ts
│   ├── typography.test.ts
│   └── components.test.ts
├── vitest.config.ts
└── visual-regression.config.ts
```
