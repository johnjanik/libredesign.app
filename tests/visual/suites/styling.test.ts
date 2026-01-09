/**
 * Styling Visual Regression Tests
 *
 * Tests that design styling (colors, borders, shadows, etc.) renders
 * identically in both the design canvas and the generated code output.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { loadFixture } from '../utils/fixture-loader';
import { renderFixtureToPNG, initBrowser as initDesignBrowser, closeBrowser as closeDesignBrowser } from '../utils/design-renderer';
import { renderFixtureWithReact, initBrowser as initReactBrowser, closeBrowser as closeReactBrowser } from '../renderers/react-renderer';
import { compareForTest, createSideBySideImage } from '../utils/pixel-comparator';
import config from '../visual-regression.config';

const snapshotsDir = join(process.cwd(), config.paths.snapshots);
const diffsDir = join(process.cwd(), config.paths.diffs);

beforeAll(async () => {
  // Ensure directories exist
  const designDir = join(snapshotsDir, 'design', 'styling');
  const reactDir = join(snapshotsDir, 'code', 'react', 'styling');
  for (const dir of [designDir, reactDir, diffsDir]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  await Promise.all([initDesignBrowser(), initReactBrowser()]);
});

afterAll(async () => {
  await Promise.all([closeDesignBrowser(), closeReactBrowser()]);
});

async function testStylingFixture(fixtureName: string): Promise<void> {
  const fixturePath = `styling/${fixtureName}.json`;
  const fixture = loadFixture(fixturePath);

  const designResult = await renderFixtureToPNG(fixture);
  const reactResult = await renderFixtureWithReact(fixture);

  const comparison = await compareForTest(
    designResult.buffer,
    reactResult.buffer,
    'styling',
    'react'
  );

  // Save snapshots
  const designPath = join(snapshotsDir, 'design', 'styling', `${fixtureName}.png`);
  const reactPath = join(snapshotsDir, 'code', 'react', 'styling', `${fixtureName}.png`);
  writeFileSync(designPath, designResult.buffer);
  writeFileSync(reactPath, reactResult.buffer);

  // Log diff for debugging
  if (!comparison.passed) {
    console.log(`[styling/${fixtureName}] Diff: ${comparison.diffPercentage.toFixed(4)}% (threshold: ${comparison.threshold}%)`);

    const diffPath = join(diffsDir, `styling-${fixtureName}-diff.png`);
    writeFileSync(diffPath, comparison.diffImage);

    const sideBySide = await createSideBySideImage(
      designResult.buffer,
      reactResult.buffer,
      comparison.diffImage
    );
    writeFileSync(join(diffsDir, `styling-${fixtureName}-comparison.png`), sideBySide);
  }

  expect(comparison.passed).toBe(true);
  expect(comparison.diffPercentage).toBeLessThan(comparison.threshold);
}

describe('Styling Visual Regression', () => {
  describe('Solid Colors', () => {
    it('renders colors-solid correctly', async () => {
      await testStylingFixture('colors-solid');
    });
  });

  describe('Corner Radius', () => {
    it('renders corner-radius correctly', async () => {
      await testStylingFixture('corner-radius');
    });
  });
});
