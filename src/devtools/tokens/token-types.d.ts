/**
 * Design Token Type Definitions
 *
 * Core types for the design token system.
 */
import type { RGBA } from '@core/types/color';
/** Available token types */
export type TokenType = 'color' | 'typography' | 'spacing' | 'shadow' | 'radius' | 'opacity';
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
    readonly group?: string;
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
export type AnyDesignToken = ColorToken | TypographyToken | SpacingToken | ShadowToken | RadiusToken | OpacityToken;
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
/** Check if token is a color token */
export declare function isColorToken(token: AnyDesignToken): token is ColorToken;
/** Check if token is a typography token */
export declare function isTypographyToken(token: AnyDesignToken): token is TypographyToken;
/** Check if token is a spacing token */
export declare function isSpacingToken(token: AnyDesignToken): token is SpacingToken;
/** Check if token is a shadow token */
export declare function isShadowToken(token: AnyDesignToken): token is ShadowToken;
/** Check if token is a radius token */
export declare function isRadiusToken(token: AnyDesignToken): token is RadiusToken;
/** Check if token is an opacity token */
export declare function isOpacityToken(token: AnyDesignToken): token is OpacityToken;
/** Generate a unique token ID */
export declare function generateTokenId(): string;
/** Create a color token */
export declare function createColorToken(name: string, value: RGBA, options?: {
    description?: string;
    group?: string;
    lightValue?: RGBA;
    darkValue?: RGBA;
}): ColorToken;
/** Create a typography token */
export declare function createTypographyToken(name: string, value: TypographyValue, options?: {
    description?: string;
    group?: string;
}): TypographyToken;
/** Create a spacing token */
export declare function createSpacingToken(name: string, value: number, options?: {
    description?: string;
    group?: string;
}): SpacingToken;
/** Create a shadow token */
export declare function createShadowToken(name: string, value: ShadowValue, options?: {
    description?: string;
    group?: string;
}): ShadowToken;
/** Create a radius token */
export declare function createRadiusToken(name: string, value: number | readonly [number, number, number, number], options?: {
    description?: string;
    group?: string;
}): RadiusToken;
/** Create an opacity token */
export declare function createOpacityToken(name: string, value: number, options?: {
    description?: string;
    group?: string;
}): OpacityToken;
//# sourceMappingURL=token-types.d.ts.map