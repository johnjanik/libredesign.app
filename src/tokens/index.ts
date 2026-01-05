/**
 * DesignLibre Design Tokens
 *
 * Central export for all design tokens.
 * Used by UnoCSS configuration and design-to-code export.
 */

export { colors, lightColors, type Colors, type LightColors } from './colors';
export {
  spacing,
  borderRadius,
  boxShadow,
  type Spacing,
  type BorderRadius,
  type BoxShadow,
} from './spacing';
export {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  type FontFamily,
  type FontSize,
  type FontWeight,
  type LineHeight,
  type LetterSpacing,
} from './typography';

/**
 * Breakpoints for responsive design
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export type Breakpoints = typeof breakpoints;

/**
 * Animation durations
 */
export const duration = {
  75: '75ms',
  100: '100ms',
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
  1000: '1000ms',
} as const;

/**
 * Animation easing functions
 */
export const easing = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export type Duration = typeof duration;
export type Easing = typeof easing;
