/**
 * Text Style Types
 *
 * Comprehensive text styling system for technical drawings:
 * - Named text styles (like CAD dimension styles)
 * - Multi-line text support
 * - Text along path configuration
 */

import type { RGBA } from './color';

/**
 * Text alignment options
 */
export type TextHorizontalAlign = 'left' | 'center' | 'right' | 'justify';
export type TextVerticalAlign = 'top' | 'middle' | 'bottom' | 'baseline';

/**
 * Text decoration
 */
export type TextDecoration = 'none' | 'underline' | 'overline' | 'line-through';

/**
 * Font weight
 */
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 'normal' | 'bold';

/**
 * Font style
 */
export type FontStyle = 'normal' | 'italic' | 'oblique';

/**
 * Text transform
 */
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

/**
 * Text style definition
 */
export interface TextStyle {
  /** Unique style name */
  readonly name: string;
  /** Style description */
  readonly description?: string;

  // Font properties
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: FontWeight;
  readonly fontStyle: FontStyle;

  // Spacing
  readonly lineHeight: number; // multiplier (1.0 = single space)
  readonly letterSpacing: number; // in pixels
  readonly wordSpacing: number; // in pixels
  readonly paragraphSpacing: number; // space after paragraphs in pixels

  // Alignment
  readonly textAlign: TextHorizontalAlign;
  readonly verticalAlign: TextVerticalAlign;

  // Decoration & Transform
  readonly textDecoration: TextDecoration;
  readonly textTransform: TextTransform;

  // Color
  readonly color: RGBA;
  readonly backgroundColor?: RGBA;

  // Stroke (outline text)
  readonly strokeColor?: RGBA;
  readonly strokeWidth?: number;

  // Advanced
  readonly tabSize: number; // in characters
  readonly firstLineIndent: number; // in pixels
}

/**
 * Multi-line text data (MTEXT)
 */
export interface MultiLineTextData {
  /** Raw text content with newlines */
  readonly content: string;
  /** Bounding box width (text wraps within) */
  readonly width: number;
  /** Text style to apply */
  readonly style: TextStyle;
  /** Position of text anchor point */
  readonly position: { readonly x: number; readonly y: number };
  /** Rotation in degrees */
  readonly rotation: number;
}

/**
 * Text along path configuration
 */
export interface TextAlongPathData {
  /** Text content */
  readonly content: string;
  /** Text style */
  readonly style: TextStyle;
  /** Path data (SVG path string) */
  readonly pathData: string;
  /** Start offset along path (0-1) */
  readonly startOffset: number;
  /** Spacing between characters (1.0 = normal) */
  readonly characterSpacing: number;
  /** Whether to stretch text to fill path */
  readonly stretchToFit: boolean;
  /** Vertical alignment relative to path */
  readonly alignToPath: 'top' | 'center' | 'bottom';
  /** Text direction along path */
  readonly direction: 'forward' | 'reverse';
}

/**
 * Rich text span (for mixed formatting within text)
 */
export interface RichTextSpan {
  /** Start character index */
  readonly start: number;
  /** End character index */
  readonly end: number;
  /** Style overrides for this span */
  readonly styleOverrides: Partial<TextStyle>;
}

/**
 * Rich text data
 */
export interface RichTextData {
  /** Plain text content */
  readonly content: string;
  /** Base style */
  readonly baseStyle: TextStyle;
  /** Formatted spans */
  readonly spans: readonly RichTextSpan[];
}

// ============================================================================
// Default Styles
// ============================================================================

/**
 * Default text style
 */
export const DEFAULT_TEXT_STYLE: TextStyle = {
  name: 'Default',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14,
  fontWeight: 400,
  fontStyle: 'normal',
  lineHeight: 1.4,
  letterSpacing: 0,
  wordSpacing: 0,
  paragraphSpacing: 10,
  textAlign: 'left',
  verticalAlign: 'top',
  textDecoration: 'none',
  textTransform: 'none',
  color: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
  tabSize: 4,
  firstLineIndent: 0,
};

/**
 * Technical drawing annotation style
 */
export const ANNOTATION_TEXT_STYLE: TextStyle = {
  name: 'Annotation',
  description: 'For dimension text and notes',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 10,
  fontWeight: 400,
  fontStyle: 'normal',
  lineHeight: 1.2,
  letterSpacing: 0,
  wordSpacing: 0,
  paragraphSpacing: 6,
  textAlign: 'center',
  verticalAlign: 'middle',
  textDecoration: 'none',
  textTransform: 'none',
  color: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
  tabSize: 4,
  firstLineIndent: 0,
};

/**
 * Title/heading style
 */
export const TITLE_TEXT_STYLE: TextStyle = {
  name: 'Title',
  description: 'For headings and titles',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 24,
  fontWeight: 700,
  fontStyle: 'normal',
  lineHeight: 1.3,
  letterSpacing: -0.5,
  wordSpacing: 0,
  paragraphSpacing: 16,
  textAlign: 'left',
  verticalAlign: 'top',
  textDecoration: 'none',
  textTransform: 'none',
  color: { r: 1, g: 1, b: 1, a: 1 },
  tabSize: 4,
  firstLineIndent: 0,
};

/**
 * Code/monospace style
 */
export const CODE_TEXT_STYLE: TextStyle = {
  name: 'Code',
  description: 'For code and technical text',
  fontFamily: 'JetBrains Mono, Consolas, monospace',
  fontSize: 12,
  fontWeight: 400,
  fontStyle: 'normal',
  lineHeight: 1.5,
  letterSpacing: 0,
  wordSpacing: 0,
  paragraphSpacing: 8,
  textAlign: 'left',
  verticalAlign: 'top',
  textDecoration: 'none',
  textTransform: 'none',
  color: { r: 0.7, g: 0.85, b: 0.7, a: 1 },
  backgroundColor: { r: 0.1, g: 0.1, b: 0.1, a: 0.5 },
  tabSize: 2,
  firstLineIndent: 0,
};

/**
 * CAD dimension style (like AutoCAD Standard)
 */
export const DIMENSION_TEXT_STYLE: TextStyle = {
  name: 'Dimension',
  description: 'For CAD dimension labels',
  fontFamily: 'Arial, sans-serif',
  fontSize: 8,
  fontWeight: 400,
  fontStyle: 'normal',
  lineHeight: 1.0,
  letterSpacing: 0,
  wordSpacing: 0,
  paragraphSpacing: 0,
  textAlign: 'center',
  verticalAlign: 'middle',
  textDecoration: 'none',
  textTransform: 'none',
  color: { r: 0, g: 0, b: 0, a: 1 },
  tabSize: 4,
  firstLineIndent: 0,
};

// ============================================================================
// Text Style Registry
// ============================================================================

/**
 * Built-in text styles
 */
export const TEXT_STYLES: Record<string, TextStyle> = {
  Default: DEFAULT_TEXT_STYLE,
  Annotation: ANNOTATION_TEXT_STYLE,
  Title: TITLE_TEXT_STYLE,
  Code: CODE_TEXT_STYLE,
  Dimension: DIMENSION_TEXT_STYLE,
};

/**
 * Get a text style by name
 */
export function getTextStyle(name: string): TextStyle | null {
  return TEXT_STYLES[name] ?? null;
}

/**
 * Get all available text style names
 */
export function getTextStyleNames(): string[] {
  return Object.keys(TEXT_STYLES);
}

/**
 * Create a custom text style
 */
export function createTextStyle(
  name: string,
  overrides: Partial<Omit<TextStyle, 'name'>>,
  baseStyle: TextStyle = DEFAULT_TEXT_STYLE
): TextStyle {
  return {
    ...baseStyle,
    ...overrides,
    name,
  };
}

/**
 * Merge style overrides into a base style
 */
export function mergeTextStyles(
  base: TextStyle,
  overrides: Partial<TextStyle>
): TextStyle {
  return {
    ...base,
    ...overrides,
  };
}

// ============================================================================
// Text Measurement Utilities
// ============================================================================

/**
 * Measure text dimensions
 */
export interface TextMetrics {
  readonly width: number;
  readonly height: number;
  readonly lineCount: number;
  readonly lineHeights: readonly number[];
  readonly actualBoundingBoxAscent: number;
  readonly actualBoundingBoxDescent: number;
}

/**
 * Word wrap result
 */
export interface WrappedLine {
  readonly text: string;
  readonly width: number;
  readonly y: number;
}

/**
 * Wrap text to fit within a maximum width
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measureFn: (text: string) => number
): WrappedLine[] {
  const lines: WrappedLine[] = [];
  const paragraphs = text.split('\n');
  let y = 0;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let currentLine = '';
    let currentWidth = 0;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = measureFn(testLine);

      if (testWidth > maxWidth && currentLine) {
        // Push current line and start new one
        lines.push({ text: currentLine, width: currentWidth, y });
        y += 1; // Line height multiplier applied later
        currentLine = word;
        currentWidth = measureFn(word);
      } else {
        currentLine = testLine;
        currentWidth = testWidth;
      }
    }

    // Push remaining text
    if (currentLine) {
      lines.push({ text: currentLine, width: currentWidth, y });
      y += 1;
    }
  }

  return lines;
}

/**
 * Apply text transform
 */
export function applyTextTransform(text: string, transform: TextTransform): string {
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\w/g, c => c.toUpperCase());
    default:
      return text;
  }
}
