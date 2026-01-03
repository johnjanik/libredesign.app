/**
 * DesignLibre Token Schema
 *
 * Defines the JSON structure for design tokens.
 * Follows the Design Tokens Community Group specification with DesignLibre extensions.
 * Tokens are stored in the tokens/ directory, organized by type.
 *
 * @version 1.0.0
 * @license MIT
 */

import type { ColorSpace } from './color';

// =============================================================================
// Common Token Types
// =============================================================================

/**
 * Token types supported by DesignLibre
 */
export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'strokeStyle'
  | 'border'
  | 'transition'
  | 'shadow'
  | 'gradient'
  | 'typography'
  | 'spacing'
  | 'borderRadius';

/**
 * Base token definition
 */
export interface BaseToken {
  /** Human-readable description */
  readonly $description?: string;

  /** Token type identifier */
  readonly $type: TokenType;

  /** Token extensions for platform-specific values or metadata */
  readonly $extensions?: TokenExtensions;
}

/**
 * Extensions for platform-specific values and metadata
 */
export interface TokenExtensions {
  /** DesignLibre-specific extensions */
  readonly 'com.designlibre'?: {
    /** Token creation timestamp */
    readonly createdAt?: string;
    /** Token last modified timestamp */
    readonly updatedAt?: string;
    /** Whether this token is deprecated */
    readonly deprecated?: boolean;
    /** Deprecation message */
    readonly deprecatedMessage?: string;
    /** Replacement token path */
    readonly replacedBy?: string;
    /** Tags for categorization */
    readonly tags?: readonly string[];
    /** Figma variable ID (for migrated tokens) */
    readonly figmaVariableId?: string;
    /** CSS custom property override */
    readonly cssProperty?: string;
  };

  /** iOS-specific values */
  readonly 'com.apple'?: {
    /** UIKit color name */
    readonly uiColor?: string;
    /** SwiftUI color name */
    readonly swiftUIColor?: string;
    /** Dynamic color for dark mode */
    readonly darkModeValue?: string;
  };

  /** Android-specific values */
  readonly 'com.android'?: {
    /** Resource name */
    readonly resourceName?: string;
    /** Night mode value */
    readonly nightModeValue?: string;
  };

  /** Allow other extensions */
  readonly [key: string]: unknown;
}

// =============================================================================
// Token File Structure
// =============================================================================

/**
 * Root structure of a token JSON file
 */
export interface TokenFile {
  /** Schema identifier for validation */
  readonly $schema: 'https://designlibre.app/schemas/tokens-v1.json';

  /** File format version */
  readonly version: '1.0.0';

  /** Token file metadata */
  readonly $metadata: TokenFileMetadata;

  /** Token groups and values (nested structure) */
  readonly tokens: TokenGroup;
}

/**
 * Token file metadata
 */
export interface TokenFileMetadata {
  /** Token type this file contains */
  readonly type: TokenType | 'mixed';

  /** Human-readable name */
  readonly name: string;

  /** Description of token collection */
  readonly description?: string;

  /** Timestamp of creation */
  readonly createdAt: string;

  /** Timestamp of last update */
  readonly updatedAt: string;
}

/**
 * Token group (can be nested)
 */
export interface TokenGroup {
  /** Group description */
  readonly $description?: string;

  /** Default type for tokens in this group */
  readonly $type?: TokenType;

  /** Extensions for the group */
  readonly $extensions?: TokenExtensions;

  /** Nested groups or token values */
  readonly [key: string]: TokenValue | TokenGroup | string | TokenType | TokenExtensions | undefined;
}

/**
 * Union of all token value types
 */
export type TokenValue =
  | ColorToken
  | DimensionToken
  | FontFamilyToken
  | FontWeightToken
  | DurationToken
  | CubicBezierToken
  | NumberToken
  | StrokeStyleToken
  | BorderToken
  | TransitionToken
  | ShadowToken
  | GradientToken
  | TypographyToken
  | SpacingToken
  | BorderRadiusToken;

// =============================================================================
// Color Tokens
// =============================================================================

/**
 * Color token definition
 */
export interface ColorToken extends BaseToken {
  readonly $type: 'color';

  /** Color value - hex, rgba, or reference */
  readonly $value: ColorValue;
}

/**
 * Color value formats
 */
export type ColorValue =
  | string // Hex (#RRGGBB, #RRGGBBAA) or reference ({colors.primary.500})
  | RGBAValue
  | HSLValue
  | OKLCHValue;

/**
 * RGBA color value
 */
export interface RGBAValue {
  readonly r: number; // 0-255
  readonly g: number; // 0-255
  readonly b: number; // 0-255
  readonly a?: number; // 0-1, defaults to 1
  readonly space?: ColorSpace;
}

/**
 * HSL color value
 */
export interface HSLValue {
  readonly h: number; // 0-360
  readonly s: number; // 0-100
  readonly l: number; // 0-100
  readonly a?: number; // 0-1
}

/**
 * OKLCH color value (perceptually uniform)
 */
export interface OKLCHValue {
  readonly l: number; // Lightness 0-1
  readonly c: number; // Chroma 0-0.4
  readonly h: number; // Hue 0-360
  readonly a?: number; // 0-1
}

// =============================================================================
// Dimension Tokens
// =============================================================================

/**
 * Dimension token (sizes, widths, heights)
 */
export interface DimensionToken extends BaseToken {
  readonly $type: 'dimension';

  /** Dimension value with unit */
  readonly $value: DimensionValue;
}

/**
 * Dimension value
 */
export type DimensionValue =
  | string // "16px", "1rem", "{spacing.md}"
  | {
      readonly value: number;
      readonly unit: DimensionUnit;
    };

/**
 * Supported dimension units
 */
export type DimensionUnit =
  | 'px'
  | 'rem'
  | 'em'
  | '%'
  | 'vw'
  | 'vh'
  | 'pt';

// =============================================================================
// Typography Tokens
// =============================================================================

/**
 * Font family token
 */
export interface FontFamilyToken extends BaseToken {
  readonly $type: 'fontFamily';

  /** Font family stack */
  readonly $value: string | readonly string[];
}

/**
 * Font weight token
 */
export interface FontWeightToken extends BaseToken {
  readonly $type: 'fontWeight';

  /** Font weight value */
  readonly $value: FontWeightValue;
}

/**
 * Font weight values
 */
export type FontWeightValue =
  | number // 100-900
  | 'thin'
  | 'hairline'
  | 'extra-light'
  | 'ultra-light'
  | 'light'
  | 'normal'
  | 'regular'
  | 'medium'
  | 'semi-bold'
  | 'demi-bold'
  | 'bold'
  | 'extra-bold'
  | 'ultra-bold'
  | 'black'
  | 'heavy';

/**
 * Complete typography composite token
 */
export interface TypographyToken extends BaseToken {
  readonly $type: 'typography';

  /** Typography composite value */
  readonly $value: TypographyValue;
}

/**
 * Typography composite value
 */
export interface TypographyValue {
  /** Font family (reference or value) */
  readonly fontFamily: string | readonly string[];

  /** Font size */
  readonly fontSize: DimensionValue;

  /** Font weight */
  readonly fontWeight: FontWeightValue;

  /** Line height */
  readonly lineHeight: number | DimensionValue;

  /** Letter spacing */
  readonly letterSpacing?: DimensionValue;

  /** Text transform */
  readonly textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  /** Text decoration */
  readonly textDecoration?: 'none' | 'underline' | 'line-through';

  /** Paragraph spacing */
  readonly paragraphSpacing?: DimensionValue;

  /** Paragraph indent */
  readonly paragraphIndent?: DimensionValue;

  /** Text case */
  readonly textCase?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

// =============================================================================
// Spacing Tokens
// =============================================================================

/**
 * Spacing token (margins, padding, gaps)
 */
export interface SpacingToken extends BaseToken {
  readonly $type: 'spacing';

  /** Spacing value */
  readonly $value: SpacingValue;
}

/**
 * Spacing value - single or multi-directional
 */
export type SpacingValue =
  | DimensionValue // Single value for all sides
  | {
      // Individual sides
      readonly top?: DimensionValue;
      readonly right?: DimensionValue;
      readonly bottom?: DimensionValue;
      readonly left?: DimensionValue;
    }
  | {
      // Shorthand (vertical, horizontal)
      readonly vertical?: DimensionValue;
      readonly horizontal?: DimensionValue;
    };

// =============================================================================
// Shadow Tokens
// =============================================================================

/**
 * Shadow token
 */
export interface ShadowToken extends BaseToken {
  readonly $type: 'shadow';

  /** Shadow value - single or multiple (for layered shadows) */
  readonly $value: ShadowValue | readonly ShadowValue[];
}

/**
 * Shadow value
 */
export interface ShadowValue {
  /** Shadow type */
  readonly type?: 'dropShadow' | 'innerShadow';

  /** Horizontal offset */
  readonly offsetX: DimensionValue;

  /** Vertical offset */
  readonly offsetY: DimensionValue;

  /** Blur radius */
  readonly blur: DimensionValue;

  /** Spread radius */
  readonly spread?: DimensionValue;

  /** Shadow color */
  readonly color: ColorValue;
}

// =============================================================================
// Border Tokens
// =============================================================================

/**
 * Stroke style token
 */
export interface StrokeStyleToken extends BaseToken {
  readonly $type: 'strokeStyle';

  /** Stroke style value */
  readonly $value: StrokeStyleValue;
}

/**
 * Stroke style value
 */
export type StrokeStyleValue =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'double'
  | 'groove'
  | 'ridge'
  | 'outset'
  | 'inset'
  | {
      readonly dashArray: readonly DimensionValue[];
      readonly lineCap?: 'round' | 'butt' | 'square';
    };

/**
 * Border token (composite)
 */
export interface BorderToken extends BaseToken {
  readonly $type: 'border';

  /** Border value */
  readonly $value: BorderValue;
}

/**
 * Border value
 */
export interface BorderValue {
  /** Border color */
  readonly color: ColorValue;

  /** Border width */
  readonly width: DimensionValue;

  /** Border style */
  readonly style: StrokeStyleValue;
}

/**
 * Border radius token
 */
export interface BorderRadiusToken extends BaseToken {
  readonly $type: 'borderRadius';

  /** Border radius value */
  readonly $value: BorderRadiusValue;
}

/**
 * Border radius value
 */
export type BorderRadiusValue =
  | DimensionValue // Single value for all corners
  | {
      // Individual corners
      readonly topLeft?: DimensionValue;
      readonly topRight?: DimensionValue;
      readonly bottomRight?: DimensionValue;
      readonly bottomLeft?: DimensionValue;
    };

// =============================================================================
// Motion Tokens
// =============================================================================

/**
 * Duration token
 */
export interface DurationToken extends BaseToken {
  readonly $type: 'duration';

  /** Duration value in milliseconds or string */
  readonly $value: DurationValue;
}

/**
 * Duration value
 */
export type DurationValue =
  | number // Milliseconds
  | string; // "200ms", "0.2s", "{motion.duration.fast}"

/**
 * Cubic bezier easing token
 */
export interface CubicBezierToken extends BaseToken {
  readonly $type: 'cubicBezier';

  /** Cubic bezier control points */
  readonly $value: CubicBezierValue;
}

/**
 * Cubic bezier value - array of 4 control points
 */
export type CubicBezierValue = readonly [number, number, number, number];

/**
 * Transition composite token
 */
export interface TransitionToken extends BaseToken {
  readonly $type: 'transition';

  /** Transition value */
  readonly $value: TransitionValue;
}

/**
 * Transition value
 */
export interface TransitionValue {
  /** Duration */
  readonly duration: DurationValue;

  /** Easing function */
  readonly timingFunction: CubicBezierValue | EasingKeyword;

  /** Delay before starting */
  readonly delay?: DurationValue;
}

/**
 * Named easing keywords
 */
export type EasingKeyword =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring';

// =============================================================================
// Gradient Tokens
// =============================================================================

/**
 * Gradient token
 */
export interface GradientToken extends BaseToken {
  readonly $type: 'gradient';

  /** Gradient value */
  readonly $value: GradientValue;
}

/**
 * Gradient value
 */
export type GradientValue = LinearGradient | RadialGradient | AngularGradient | DiamondGradient;

/**
 * Linear gradient
 */
export interface LinearGradient {
  readonly type: 'linear';

  /** Angle in degrees (0 = up, 90 = right) */
  readonly angle: number;

  /** Color stops */
  readonly stops: readonly GradientStop[];
}

/**
 * Radial gradient
 */
export interface RadialGradient {
  readonly type: 'radial';

  /** Center position (0-1) */
  readonly center?: { readonly x: number; readonly y: number };

  /** Color stops */
  readonly stops: readonly GradientStop[];
}

/**
 * Angular/conic gradient
 */
export interface AngularGradient {
  readonly type: 'angular';

  /** Center position (0-1) */
  readonly center?: { readonly x: number; readonly y: number };

  /** Start angle in degrees */
  readonly startAngle?: number;

  /** Color stops */
  readonly stops: readonly GradientStop[];
}

/**
 * Diamond gradient (Figma-specific)
 */
export interface DiamondGradient {
  readonly type: 'diamond';

  /** Center position (0-1) */
  readonly center?: { readonly x: number; readonly y: number };

  /** Color stops */
  readonly stops: readonly GradientStop[];
}

/**
 * Gradient color stop
 */
export interface GradientStop {
  /** Position (0-1) */
  readonly position: number;

  /** Color at this stop */
  readonly color: ColorValue;
}

// =============================================================================
// Number Token
// =============================================================================

/**
 * Generic number token (for ratios, multipliers, etc.)
 */
export interface NumberToken extends BaseToken {
  readonly $type: 'number';

  /** Numeric value */
  readonly $value: number;
}

// =============================================================================
// Token Reference Utilities
// =============================================================================

/**
 * Check if a value is a token reference
 */
export function isTokenReference(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return value.startsWith('{') && value.endsWith('}');
}

/**
 * Parse a token reference path
 * @example "{colors.primary.500}" => ["colors", "primary", "500"]
 */
export function parseTokenReference(ref: string): string[] {
  if (!isTokenReference(ref)) {
    throw new Error(`Invalid token reference: ${ref}`);
  }
  return ref.slice(1, -1).split('.');
}

/**
 * Create a token reference string
 * @example createTokenReference(["colors", "primary", "500"]) => "{colors.primary.500}"
 */
export function createTokenReference(path: string[]): string {
  return `{${path.join('.')}}`;
}

// =============================================================================
// Token Resolution
// =============================================================================

/**
 * Resolved token value (after reference resolution)
 */
export interface ResolvedToken<T = unknown> {
  /** Original token path */
  readonly path: string[];

  /** Resolved value */
  readonly value: T;

  /** Original token definition */
  readonly token: TokenValue;

  /** Resolution chain (for debugging circular refs) */
  readonly chain: readonly string[][];
}

/**
 * Token resolution context
 */
export interface TokenResolutionContext {
  /** All loaded token files */
  readonly files: Map<string, TokenFile>;

  /** Resolution cache */
  readonly cache: Map<string, ResolvedToken>;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an empty token file
 */
export function createEmptyTokenFile(
  type: TokenType | 'mixed',
  name: string,
  description?: string
): TokenFile {
  const now = new Date().toISOString();

  const metadata: TokenFileMetadata = {
    type,
    name,
    createdAt: now,
    updatedAt: now,
  };

  if (description !== undefined) {
    (metadata as { description: string }).description = description;
  }

  return {
    $schema: 'https://designlibre.app/schemas/tokens-v1.json',
    version: '1.0.0',
    $metadata: metadata,
    tokens: {},
  };
}

/**
 * Create a color token
 */
export function createColorToken(
  value: ColorValue,
  description?: string
): ColorToken {
  const token: ColorToken = {
    $type: 'color',
    $value: value,
  };

  if (description !== undefined) {
    (token as { $description: string }).$description = description;
  }

  return token;
}

/**
 * Create a dimension token
 */
export function createDimensionToken(
  value: number,
  unit: DimensionUnit = 'px',
  description?: string
): DimensionToken {
  const token: DimensionToken = {
    $type: 'dimension',
    $value: { value, unit },
  };

  if (description !== undefined) {
    (token as { $description: string }).$description = description;
  }

  return token;
}

/**
 * Create a typography token
 */
export function createTypographyToken(
  fontFamily: string | readonly string[],
  fontSize: DimensionValue,
  fontWeight: FontWeightValue,
  lineHeight: number | DimensionValue,
  description?: string
): TypographyToken {
  const token: TypographyToken = {
    $type: 'typography',
    $value: {
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight,
    },
  };

  if (description !== undefined) {
    (token as { $description: string }).$description = description;
  }

  return token;
}

/**
 * Create a shadow token
 */
export function createShadowToken(
  offsetX: DimensionValue,
  offsetY: DimensionValue,
  blur: DimensionValue,
  color: ColorValue,
  spread?: DimensionValue,
  description?: string
): ShadowToken {
  const shadowValue: ShadowValue = {
    offsetX,
    offsetY,
    blur,
    color,
  };

  if (spread !== undefined) {
    (shadowValue as { spread: DimensionValue }).spread = spread;
  }

  const token: ShadowToken = {
    $type: 'shadow',
    $value: shadowValue,
  };

  if (description !== undefined) {
    (token as { $description: string }).$description = description;
  }

  return token;
}

/**
 * Create a duration token
 */
export function createDurationToken(
  milliseconds: number,
  description?: string
): DurationToken {
  const token: DurationToken = {
    $type: 'duration',
    $value: milliseconds,
  };

  if (description !== undefined) {
    (token as { $description: string }).$description = description;
  }

  return token;
}

/**
 * Create a cubic bezier token
 */
export function createCubicBezierToken(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  description?: string
): CubicBezierToken {
  const token: CubicBezierToken = {
    $type: 'cubicBezier',
    $value: [x1, y1, x2, y2],
  };

  if (description !== undefined) {
    (token as { $description: string }).$description = description;
  }

  return token;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validation error
 */
export interface TokenValidationError {
  readonly path: string[];
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

/**
 * Validate a token file
 */
export function validateTokenFile(file: unknown): TokenValidationError[] {
  const errors: TokenValidationError[] = [];

  if (!file || typeof file !== 'object') {
    errors.push({
      path: [],
      message: 'Token file must be an object',
      severity: 'error',
    });
    return errors;
  }

  const f = file as Record<string, unknown>;

  // Check required fields
  if (f['$schema'] !== 'https://designlibre.app/schemas/tokens-v1.json') {
    errors.push({
      path: ['$schema'],
      message: 'Invalid or missing $schema',
      severity: 'error',
    });
  }

  if (f['version'] !== '1.0.0') {
    errors.push({
      path: ['version'],
      message: 'Invalid or missing version',
      severity: 'error',
    });
  }

  if (!f['$metadata'] || typeof f['$metadata'] !== 'object') {
    errors.push({
      path: ['$metadata'],
      message: 'Missing $metadata',
      severity: 'error',
    });
  }

  if (!f['tokens'] || typeof f['tokens'] !== 'object') {
    errors.push({
      path: ['tokens'],
      message: 'Missing tokens object',
      severity: 'error',
    });
  }

  return errors;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if value is a color token
 */
export function isColorToken(token: TokenValue): token is ColorToken {
  return token.$type === 'color';
}

/**
 * Check if value is a dimension token
 */
export function isDimensionToken(token: TokenValue): token is DimensionToken {
  return token.$type === 'dimension';
}

/**
 * Check if value is a typography token
 */
export function isTypographyToken(token: TokenValue): token is TypographyToken {
  return token.$type === 'typography';
}

/**
 * Check if value is a shadow token
 */
export function isShadowToken(token: TokenValue): token is ShadowToken {
  return token.$type === 'shadow';
}

/**
 * Check if value is a gradient token
 */
export function isGradientToken(token: TokenValue): token is GradientToken {
  return token.$type === 'gradient';
}

/**
 * Check if value is a duration token
 */
export function isDurationToken(token: TokenValue): token is DurationToken {
  return token.$type === 'duration';
}

/**
 * Check if value is a transition token
 */
export function isTransitionToken(token: TokenValue): token is TransitionToken {
  return token.$type === 'transition';
}

// =============================================================================
// Platform Output Helpers
// =============================================================================

/**
 * Convert color token to CSS custom property
 */
export function colorTokenToCSS(token: ColorToken, name: string, prefix = ''): string {
  const propName = prefix ? `--${prefix}-${name}` : `--${name}`;
  const value = typeof token.$value === 'string' ? token.$value : rgbaToCSS(token.$value as RGBAValue);
  return `${propName}: ${value};`;
}

/**
 * Convert RGBA to CSS string
 */
function rgbaToCSS(rgba: RGBAValue): string {
  const a = rgba.a ?? 1;
  if (a === 1) {
    return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  }
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${a})`;
}

/**
 * Convert dimension to CSS
 */
export function dimensionToCSS(value: DimensionValue): string {
  if (typeof value === 'string') return value;
  return `${value.value}${value.unit}`;
}

/**
 * Convert typography token to CSS properties
 */
export function typographyTokenToCSS(token: TypographyToken): Record<string, string> {
  const val = token.$value;
  const result: Record<string, string> = {};

  if (typeof val.fontFamily === 'string') {
    const ff = val.fontFamily;
    result['font-family'] = ff.includes(' ') ? `"${ff}"` : ff;
  } else {
    result['font-family'] = (val.fontFamily as readonly string[]).map(f => f.includes(' ') ? `"${f}"` : f).join(', ');
  }

  result['font-size'] = dimensionToCSS(val.fontSize);
  result['font-weight'] = typeof val.fontWeight === 'number' ? String(val.fontWeight) : val.fontWeight;
  result['line-height'] = typeof val.lineHeight === 'number' ? String(val.lineHeight) : dimensionToCSS(val.lineHeight);

  if (val.letterSpacing) {
    result['letter-spacing'] = dimensionToCSS(val.letterSpacing);
  }

  if (val.textTransform) {
    result['text-transform'] = val.textTransform;
  }

  if (val.textDecoration) {
    result['text-decoration'] = val.textDecoration;
  }

  return result;
}
