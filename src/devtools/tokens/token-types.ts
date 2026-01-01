/**
 * Design Token Type Definitions
 *
 * Core types for the design token system.
 */

import type { RGBA } from '@core/types/color';

/** Available token types */
export type TokenType =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'shadow'
  | 'radius'
  | 'opacity';

/** Theme mode */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Base design token interface
 */
export interface DesignToken<T = unknown> {
  readonly id: string;
  readonly name: string;
  readonly type: TokenType;
  readonly value: T;
  readonly description?: string;
  readonly group?: string; // e.g., "primary", "semantic", "component"
}

/**
 * Color token with optional theme variants
 */
export interface ColorToken extends DesignToken<RGBA> {
  readonly type: 'color';
  readonly lightValue?: RGBA;
  readonly darkValue?: RGBA;
}

/**
 * Typography value structure
 */
export interface TypographyValue {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly lineHeight: number | 'auto';
  readonly letterSpacing: number;
}

/**
 * Typography token
 */
export interface TypographyToken extends DesignToken<TypographyValue> {
  readonly type: 'typography';
}

/**
 * Spacing token (in pixels)
 */
export interface SpacingToken extends DesignToken<number> {
  readonly type: 'spacing';
}

/**
 * Shadow value structure
 */
export interface ShadowValue {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blur: number;
  readonly spread: number;
  readonly color: RGBA;
  readonly inset?: boolean;
}

/**
 * Shadow token
 */
export interface ShadowToken extends DesignToken<ShadowValue> {
  readonly type: 'shadow';
}

/**
 * Radius token (single value or [tl, tr, br, bl])
 */
export interface RadiusToken extends DesignToken<number | readonly [number, number, number, number]> {
  readonly type: 'radius';
}

/**
 * Opacity token (0-1)
 */
export interface OpacityToken extends DesignToken<number> {
  readonly type: 'opacity';
}

/**
 * Union of all specific token types
 */
export type AnyDesignToken =
  | ColorToken
  | TypographyToken
  | SpacingToken
  | ShadowToken
  | RadiusToken
  | OpacityToken;

/**
 * Serialized token format for persistence
 */
export interface SerializedToken {
  readonly id: string;
  readonly name: string;
  readonly type: TokenType;
  readonly value: unknown;
  readonly description?: string;
  readonly group?: string;
  readonly lightValue?: unknown;
  readonly darkValue?: unknown;
}

/**
 * Serialized tokens collection
 */
export interface SerializedTokens {
  readonly version: string;
  readonly tokens: readonly SerializedToken[];
}

/**
 * Token reference found in a node
 */
export interface TokenReference {
  readonly path: readonly string[];
  readonly token: AnyDesignToken | null;
  readonly rawValue: unknown;
}

/**
 * Token usage report for a node
 */
export interface TokenUsageReport {
  readonly nodeId: string;
  readonly references: readonly TokenReference[];
  readonly unresolvedCount: number;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  readonly activeTheme: ThemeMode;
  readonly themes: {
    readonly light: Record<string, unknown>;
    readonly dark: Record<string, unknown>;
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/** Check if token is a color token */
export function isColorToken(token: AnyDesignToken): token is ColorToken {
  return token.type === 'color';
}

/** Check if token is a typography token */
export function isTypographyToken(token: AnyDesignToken): token is TypographyToken {
  return token.type === 'typography';
}

/** Check if token is a spacing token */
export function isSpacingToken(token: AnyDesignToken): token is SpacingToken {
  return token.type === 'spacing';
}

/** Check if token is a shadow token */
export function isShadowToken(token: AnyDesignToken): token is ShadowToken {
  return token.type === 'shadow';
}

/** Check if token is a radius token */
export function isRadiusToken(token: AnyDesignToken): token is RadiusToken {
  return token.type === 'radius';
}

/** Check if token is an opacity token */
export function isOpacityToken(token: AnyDesignToken): token is OpacityToken {
  return token.type === 'opacity';
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Generate a unique token ID */
export function generateTokenId(): string {
  return `token_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Create a color token */
export function createColorToken(
  name: string,
  value: RGBA,
  options?: {
    description?: string;
    group?: string;
    lightValue?: RGBA;
    darkValue?: RGBA;
  }
): ColorToken {
  return {
    id: generateTokenId(),
    name,
    type: 'color',
    value,
    ...(options?.description !== undefined && { description: options.description }),
    ...(options?.group !== undefined && { group: options.group }),
    ...(options?.lightValue !== undefined && { lightValue: options.lightValue }),
    ...(options?.darkValue !== undefined && { darkValue: options.darkValue }),
  };
}

/** Create a typography token */
export function createTypographyToken(
  name: string,
  value: TypographyValue,
  options?: { description?: string; group?: string }
): TypographyToken {
  return {
    id: generateTokenId(),
    name,
    type: 'typography',
    value,
    ...(options?.description !== undefined && { description: options.description }),
    ...(options?.group !== undefined && { group: options.group }),
  };
}

/** Create a spacing token */
export function createSpacingToken(
  name: string,
  value: number,
  options?: { description?: string; group?: string }
): SpacingToken {
  return {
    id: generateTokenId(),
    name,
    type: 'spacing',
    value,
    ...(options?.description !== undefined && { description: options.description }),
    ...(options?.group !== undefined && { group: options.group }),
  };
}

/** Create a shadow token */
export function createShadowToken(
  name: string,
  value: ShadowValue,
  options?: { description?: string; group?: string }
): ShadowToken {
  return {
    id: generateTokenId(),
    name,
    type: 'shadow',
    value,
    ...(options?.description !== undefined && { description: options.description }),
    ...(options?.group !== undefined && { group: options.group }),
  };
}

/** Create a radius token */
export function createRadiusToken(
  name: string,
  value: number | readonly [number, number, number, number],
  options?: { description?: string; group?: string }
): RadiusToken {
  return {
    id: generateTokenId(),
    name,
    type: 'radius',
    value,
    ...(options?.description !== undefined && { description: options.description }),
    ...(options?.group !== undefined && { group: options.group }),
  };
}

/** Create an opacity token */
export function createOpacityToken(
  name: string,
  value: number,
  options?: { description?: string; group?: string }
): OpacityToken {
  return {
    id: generateTokenId(),
    name,
    type: 'opacity',
    value,
    ...(options?.description !== undefined && { description: options.description }),
    ...(options?.group !== undefined && { group: options.group }),
  };
}
