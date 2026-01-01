/**
 * Style definitions for reusable design styles
 */
import type { RGBA } from './color';
import type { Effect } from './effect';
/**
 * Unique style identifier
 */
export type StyleId = string;
/**
 * Base style properties
 */
export interface BaseStyle {
    readonly id: StyleId;
    readonly name: string;
    readonly description?: string;
    readonly createdAt: number;
    readonly updatedAt: number;
}
/**
 * Color style - reusable color definition
 */
export interface ColorStyle extends BaseStyle {
    readonly type: 'COLOR';
    readonly color: RGBA;
}
/**
 * Text style - reusable text formatting
 */
export interface TextStyle extends BaseStyle {
    readonly type: 'TEXT';
    readonly fontFamily: string;
    readonly fontWeight: number;
    readonly fontSize: number;
    readonly lineHeight: number | 'AUTO';
    readonly letterSpacing: number;
    readonly textDecoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
    readonly textColor: RGBA;
}
/**
 * Effect style - reusable effects (shadows, blurs)
 */
export interface EffectStyle extends BaseStyle {
    readonly type: 'EFFECT';
    readonly effects: readonly Effect[];
}
/**
 * Grid style - reusable layout grid
 */
export interface GridStyle extends BaseStyle {
    readonly type: 'GRID';
    readonly gridType: 'ROWS' | 'COLUMNS' | 'GRID';
    readonly count: number;
    readonly gutterSize: number;
    readonly offset: number;
    readonly color: RGBA;
}
/**
 * Union of all style types
 */
export type Style = ColorStyle | TextStyle | EffectStyle | GridStyle;
/**
 * Style type discriminator
 */
export type StyleType = Style['type'];
/**
 * Style reference - links a node property to a style
 */
export interface StyleReference {
    readonly styleId: StyleId;
    readonly property: string;
}
/**
 * Generate a unique style ID
 */
export declare function generateStyleId(): StyleId;
/**
 * Create a color style
 */
export declare function createColorStyle(name: string, color: RGBA): ColorStyle;
/**
 * Create a text style
 */
export declare function createTextStyle(name: string, options?: Partial<Omit<TextStyle, 'id' | 'type' | 'name' | 'createdAt' | 'updatedAt'>>): TextStyle;
/**
 * Create an effect style
 */
export declare function createEffectStyle(name: string, effects: Effect[]): EffectStyle;
//# sourceMappingURL=style.d.ts.map