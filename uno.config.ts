/**
 * UnoCSS Configuration for DesignLibre
 *
 * This configuration serves dual purposes:
 * 1. Styling the DesignLibre application UI (dogfooding)
 * 2. Generating utility classes for design-to-code exports
 */

import {
  defineConfig,
  presetUno,
  presetAttributify,
  presetIcons,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss';
import { colors, spacing, borderRadius, boxShadow, fontFamily, fontSize } from './src/tokens';

export default defineConfig({
  // Presets
  presets: [
    presetUno(),
    presetAttributify({
      prefix: 'un-',
      prefixedOnly: false,
    }),
    presetIcons({
      scale: 1.2,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],

  // Transformers
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],

  // Theme customization from design tokens
  theme: {
    colors,
    spacing,
    borderRadius,
    boxShadow,
    fontFamily: {
      sans: fontFamily.sans.join(', '),
      mono: fontFamily.mono.join(', '),
      display: fontFamily.display.join(', '),
    },
    fontSize: Object.fromEntries(
      Object.entries(fontSize).map(([key, [size, options]]) => [
        key,
        [size, options],
      ])
    ),
  },

  // Shortcuts for common patterns
  shortcuts: {
    // Buttons
    'btn': 'px-3 py-2 rounded font-medium transition-all duration-150',
    'btn-primary': 'btn bg-accent text-white hover:bg-accent-hover',
    'btn-secondary': 'btn bg-surface-secondary text-content border border-border hover:bg-surface-tertiary',
    'btn-ghost': 'btn bg-transparent text-content hover:bg-surface-secondary',
    'btn-icon': 'w-9 h-9 flex items-center justify-center rounded bg-transparent hover:bg-surface-secondary transition-colors',

    // Form inputs
    'input': 'h-8 px-2.5 rounded-sm border border-border bg-surface text-content text-sm outline-none transition-colors focus:border-accent',
    'input-label': 'block text-xs font-medium text-content-secondary mb-1',

    // Panels and cards
    'panel': 'bg-surface border border-border rounded shadow-panel',
    'panel-header': 'flex items-center justify-between h-9 px-3 border-b border-border font-medium text-xs uppercase text-content-secondary',
    'panel-content': 'p-3',
    'card': 'bg-surface rounded-lg border border-border',
    'card-elevated': 'bg-surface-secondary rounded-lg shadow-md',

    // Layout
    'sidebar': 'w-60 bg-surface border-l border-border flex flex-col',
    'sidebar-section': 'p-3 border-b border-border',

    // Toolbar
    'toolbar': 'flex bg-surface border border-border rounded p-1 gap-0.5 shadow-panel',
    'toolbar-btn': 'w-9 h-9 flex items-center justify-center rounded-sm bg-transparent hover:bg-surface-secondary transition-colors text-content',
    'toolbar-btn-active': 'toolbar-btn bg-accent-light text-accent',
    'toolbar-separator': 'w-px bg-border my-1',

    // Layer items
    'layer-item': 'flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer transition-colors hover:bg-surface-secondary',
    'layer-item-selected': 'layer-item bg-accent-light',

    // Context menu
    'context-menu': 'fixed min-w-45 bg-surface border border-border rounded shadow-panel p-1 z-1000',
    'context-menu-item': 'flex items-center justify-between px-3 py-2 rounded-sm cursor-pointer text-sm transition-colors hover:bg-surface-secondary',
    'context-menu-separator': 'h-px bg-border my-1',

    // Status indicators
    'status-success': 'text-success',
    'status-warning': 'text-warning',
    'status-error': 'text-error',

    // Code view
    'code-block': 'font-mono text-xs leading-relaxed whitespace-pre-wrap',

    // Flexbox helpers
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',

    // View switcher
    'view-tab': 'flex items-center gap-1.5 px-3 py-1.5 bg-transparent rounded-sm text-xs font-medium text-content-secondary cursor-pointer transition-all hover:text-content hover:bg-surface-tertiary',
    'view-tab-active': 'view-tab text-accent bg-surface shadow-sm',
  },

  // Safelist classes that might be dynamically generated
  safelist: [
    'bg-success', 'bg-warning', 'bg-error',
    'text-success', 'text-warning', 'text-error',
    'border-success', 'border-warning', 'border-error',
    // Opacity variants
    ...[10, 20, 30, 40, 50, 60, 70, 80, 90].map(n => `opacity-${n}`),
    // Common sizes
    ...[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24].map(n => `w-${n}`),
    ...[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24].map(n => `h-${n}`),
    ...[1, 2, 3, 4, 5, 6, 8].map(n => `gap-${n}`),
    ...[1, 2, 3, 4, 5, 6, 8].map(n => `p-${n}`),
  ],

  // Content sources to scan
  content: {
    filesystem: [
      './src/**/*.{ts,tsx,js,jsx,html}',
      './index.html',
    ],
  },

  // Rules for dark mode
  rules: [
    // CSS variable-based colors for theme switching
    ['bg-var-surface', { 'background-color': 'var(--designlibre-bg-primary)' }],
    ['bg-var-surface-secondary', { 'background-color': 'var(--designlibre-bg-secondary)' }],
    ['text-var-content', { 'color': 'var(--designlibre-text-primary)' }],
    ['text-var-content-secondary', { 'color': 'var(--designlibre-text-secondary)' }],
    ['border-var-border', { 'border-color': 'var(--designlibre-border)' }],
  ],
});
