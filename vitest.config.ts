import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],

      include: ['tests/**/*.test.ts'],
      exclude: ['node_modules', 'dist'],

      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: ['src/**/*.ts'],
        exclude: [
          'src/**/*.d.ts',
          'src/renderer/shaders/**/*.glsl',
          'src/**/*.test.ts',
        ],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 70,
        },
      },

      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: false,
        },
      },
    },
  })
);
