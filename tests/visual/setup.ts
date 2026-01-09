/**
 * Visual regression test setup
 *
 * Runs before all visual tests to ensure proper environment.
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import config from './visual-regression.config';

// Ensure output directories exist
const dirs = [config.paths.diffs, config.paths.reports];
for (const dir of dirs) {
  const fullPath = join(process.cwd(), dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }
}

// Set test timeout for visual tests
if (typeof global.vi !== 'undefined') {
  // @ts-expect-error - vi global from vitest
  global.vi.setConfig({ testTimeout: 60000 });
}
