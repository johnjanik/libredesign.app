/**
 * Vitest configuration for visual regression tests
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['tests/visual/suites/**/*.test.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 60000, // Visual tests may take longer
    hookTimeout: 30000,
    pool: 'forks', // Use forks for better isolation with Puppeteer
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially to avoid Puppeteer conflicts
      },
    },
    setupFiles: ['tests/visual/setup.ts'],
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@core': resolve(__dirname, '../../src/core'),
      '@scene': resolve(__dirname, '../../src/scene'),
      '@persistence': resolve(__dirname, '../../src/persistence'),
      '@visual': resolve(__dirname, './'),
    },
  },
});
