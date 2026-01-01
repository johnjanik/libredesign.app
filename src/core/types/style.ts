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
  readonly property: string; // e.g., 'backgroundColor', 'fills[0]', 'textStyle'
}

/**
 * Generate a unique style ID
 */
export function generateStyleId(): StyleId {
  return `style_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a color style
 */
export function createColorStyle(name: string, color: RGBA): ColorStyle {
  const now = Date.now();
  return {
    id: generateStyleId(),
    type: 'COLOR',
    name,
    color,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a text style
 */
export function createTextStyle(
  name: string,
  options: Partial<Omit<TextStyle, 'id' | 'type' | 'name' | 'createdAt' | 'updatedAt'>> = {}
): TextStyle {
  const now = Date.now();
  return {
    id: generateStyleId(),
    type: 'TEXT',
    name,
    fontFamily: options.fontFamily ?? 'Inter',
    fontWeight: options.fontWeight ?? 400,
    fontSize: options.fontSize ?? 14,
    lineHeight: options.lineHeight ?? 'AUTO',
    letterSpacing: options.letterSpacing ?? 0,
    textDecoration: options.textDecoration ?? 'NONE',
    textColor: options.textColor ?? { r: 0, g: 0, b: 0, a: 1 },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create an effect style
 */
export function createEffectStyle(name: string, effects: Effect[]): EffectStyle {
  const now = Date.now();
  return {
    id: generateStyleId(),
    type: 'EFFECT',
    name,
    effects,
    createdAt: now,
    updatedAt: now,
  };
}
