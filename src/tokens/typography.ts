/**
 * DesignLibre Design Tokens - Typography
 *
 * Font families, sizes, weights, and line heights.
 */

export const fontFamily = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'sans-serif',
  ],
  mono: [
    'SF Mono',
    'Monaco',
    'Fira Code',
    'Consolas',
    'Liberation Mono',
    'monospace',
  ],
  display: [
    'Cal Sans',
    '-apple-system',
    'BlinkMacSystemFont',
    'sans-serif',
  ],
} as const;

export const fontSize = {
  xs: ['11px', { lineHeight: '16px' }],
  sm: ['12px', { lineHeight: '16px' }],
  base: ['13px', { lineHeight: '20px' }],
  md: ['14px', { lineHeight: '20px' }],
  lg: ['16px', { lineHeight: '24px' }],
  xl: ['18px', { lineHeight: '28px' }],
  '2xl': ['20px', { lineHeight: '28px' }],
  '3xl': ['24px', { lineHeight: '32px' }],
  '4xl': ['30px', { lineHeight: '36px' }],
  '5xl': ['36px', { lineHeight: '40px' }],
  '6xl': ['48px', { lineHeight: '1' }],
  '7xl': ['60px', { lineHeight: '1' }],
  '8xl': ['72px', { lineHeight: '1' }],
  '9xl': ['96px', { lineHeight: '1' }],
} as const;

export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
} as const;

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

export type FontFamily = typeof fontFamily;
export type FontSize = typeof fontSize;
export type FontWeight = typeof fontWeight;
export type LineHeight = typeof lineHeight;
export type LetterSpacing = typeof letterSpacing;
