/**
 * DesignLibre Design Tokens - Colors
 *
 * Semantic color system for both app UI and design exports.
 * These tokens map to UnoCSS theme configuration.
 */

export const colors = {
  // Surface colors (backgrounds)
  surface: {
    DEFAULT: '#1e1e1e',
    secondary: '#2d2d2d',
    tertiary: '#252525',
    canvas: '#0a0a0a',
  },

  // Text colors
  content: {
    DEFAULT: '#e4e4e4',
    secondary: '#a0a0a0',
    muted: '#6a6a6a',
  },

  // Border colors
  border: {
    DEFAULT: '#3d3d3d',
    light: '#4a4a4a',
  },

  // Accent/Brand colors
  accent: {
    DEFAULT: '#4dabff',
    hover: '#6bbaff',
    light: '#1a3a5c',
  },

  // Feedback colors
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',

  // Extended palette (for design exports)
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    950: '#422006',
  },

  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  },

  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
    950: '#500724',
  },
} as const;

/**
 * Light theme color overrides
 */
export const lightColors = {
  surface: {
    DEFAULT: '#ffffff',
    secondary: '#f5f5f5',
    tertiary: '#fafafa',
    canvas: '#e8e8e8',
  },

  content: {
    DEFAULT: '#1a1a1a',
    secondary: '#666666',
    muted: '#999999',
  },

  border: {
    DEFAULT: '#e0e0e0',
    light: '#d0d0d0',
  },

  accent: {
    DEFAULT: '#0066ff',
    hover: '#0052cc',
    light: '#e6f0ff',
  },

  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
} as const;

export type Colors = typeof colors;
export type LightColors = typeof lightColors;
