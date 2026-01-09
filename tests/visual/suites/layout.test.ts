/**
 * Layout Visual Regression Tests
 *
 * Tests that design layouts render identically in both the design canvas
 * and the generated code output.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { loadFixture, TestFixture } from '../utils/fixture-loader';
import { renderFixtureToPNG, initBrowser as initDesignBrowser, closeBrowser as closeDesignBrowser } from '../utils/design-renderer';
import { renderFixtureWithReact, initBrowser as initReactBrowser, closeBrowser as closeReactBrowser } from '../renderers/react-renderer';
import { compareForTest, createSideBySideImage } from '../utils/pixel-comparator';
import config from '../visual-regression.config';

// Paths
const snapshotsDir = join(process.cwd(), config.paths.snapshots);
const diffsDir = join(process.cwd(), config.paths.diffs);

// Ensure directories exist
beforeAll(async () => {
  for (const dir of [snapshotsDir, diffsDir]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // Create subdirectories
  const designDir = join(snapshotsDir, 'design', 'layouts');
  const reactDir = join(snapshotsDir, 'code', 'react', 'layouts');
  for (const dir of [designDir, reactDir]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // Initialize browsers
  await Promise.all([initDesignBrowser(), initReactBrowser()]);
});

afterAll(async () => {
  // Close browsers
  await Promise.all([closeDesignBrowser(), closeReactBrowser()]);
});

/**
 * Test a layout fixture against React rendering
 */
async function testLayoutFixture(fixtureName: string): Promise<void> {
  const fixturePath = `layouts/${fixtureName}.json`;
  const fixture = loadFixture(fixturePath);

  // Render design
  const designResult = await renderFixtureToPNG(fixture);

  // Render React
  const reactResult = await renderFixtureWithReact(fixture);

  // Compare images
  const comparison = await compareForTest(
    designResult.buffer,
    reactResult.buffer,
    'layout',
    'react'
  );

  // Save snapshots for debugging
  const designPath = join(snapshotsDir, 'design', 'layouts', `${fixtureName}.png`);
  const reactPath = join(snapshotsDir, 'code', 'react', 'layouts', `${fixtureName}.png`);
  writeFileSync(designPath, designResult.buffer);
  writeFileSync(reactPath, reactResult.buffer);

  // If failed, save diff and side-by-side
  if (!comparison.passed) {
    const diffPath = join(diffsDir, `${fixtureName}-diff.png`);
    writeFileSync(diffPath, comparison.diffImage);

    const sideBySide = await createSideBySideImage(
      designResult.buffer,
      reactResult.buffer,
      comparison.diffImage
    );
    const sideBySidePath = join(diffsDir, `${fixtureName}-comparison.png`);
    writeFileSync(sideBySidePath, sideBySide);
  }

  // Log diff for debugging
  if (!comparison.passed) {
    console.log(`[${fixtureName}] Diff: ${comparison.diffPercentage.toFixed(4)}% (threshold: ${comparison.threshold}%)`);
  }

  expect(comparison.passed).toBe(true);
  expect(comparison.diffPercentage).toBeLessThan(comparison.threshold);
}

describe('Layout Visual Regression', () => {
  describe('Horizontal Layout', () => {
    it('renders horizontal-basic correctly', async () => {
      await testLayoutFixture('horizontal-basic');
    });
  });

  describe('Vertical Layout', () => {
    it('renders vertical-basic correctly', async () => {
      await testLayoutFixture('vertical-basic');
    });
  });

  describe('Space Between', () => {
    it('renders space-between correctly', async () => {
      await testLayoutFixture('space-between');
    });
  });

  describe('Nested Layouts', () => {
    it('renders nested-layout correctly', async () => {
      await testLayoutFixture('nested-layout');
    });
  });

  describe('Alignment Combinations', () => {
    it('renders alignment-combinations correctly', async () => {
      await testLayoutFixture('alignment-combinations');
    });
  });
});

describe('Layout Details', () => {
  it('matches design and code dimensions', async () => {
    const fixture = loadFixture('layouts/horizontal-basic.json');

    const designResult = await renderFixtureToPNG(fixture);
    const reactResult = await renderFixtureWithReact(fixture);

    expect(designResult.width).toBe(reactResult.width);
    expect(designResult.height).toBe(reactResult.height);
  });

  it('fixture loading works correctly', async () => {
    const fixture = loadFixture('layouts/horizontal-basic.json');

    expect(fixture.name).toBe('horizontal-basic');
    expect(fixture.category).toBe('layout');
    expect(fixture.root.type).toBe('FRAME');
    expect(fixture.root.children?.length).toBe(3);
  });
});
