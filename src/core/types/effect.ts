/**
 * Effect types for DesignLibre
 */

import type { RGBA } from './color';
import type { Point } from './geometry';

/** Effect type discriminator */
export type EffectType =
  | 'DROP_SHADOW'
  | 'INNER_SHADOW'
  | 'BLUR'
  | 'BACKGROUND_BLUR'
  | 'COLOR_ADJUSTMENT'
  | 'NOISE'
  | 'MOTION_BLUR';

/** Base effect properties */
export interface BaseEffect {
  readonly type: EffectType;
  readonly visible: boolean;
}

/** Drop shadow effect */
export interface DropShadowEffect extends BaseEffect {
  readonly type: 'DROP_SHADOW';
  readonly color: RGBA;
  readonly offset: Point;
  readonly radius: number;
  readonly spread: number;
}

/** Inner shadow effect */
export interface InnerShadowEffect extends BaseEffect {
  readonly type: 'INNER_SHADOW';
  readonly color: RGBA;
  readonly offset: Point;
  readonly radius: number;
  readonly spread: number;
}

/** Shadow effect (drop or inner) */
export type ShadowEffect = DropShadowEffect | InnerShadowEffect;

/** Layer blur effect */
export interface BlurEffect extends BaseEffect {
  readonly type: 'BLUR';
  readonly radius: number;
}

/** Background blur effect */
export interface BackgroundBlurEffect extends BaseEffect {
  readonly type: 'BACKGROUND_BLUR';
  readonly radius: number;
}

/** Color adjustment effect */
export interface ColorAdjustmentEffect extends BaseEffect {
  readonly type: 'COLOR_ADJUSTMENT';
  /** Hue rotation in degrees (-180 to 180) */
  readonly hue: number;
  /** Saturation adjustment (-100 to 100) */
  readonly saturation: number;
  /** Brightness adjustment (-100 to 100) */
  readonly brightness: number;
  /** Contrast adjustment (-100 to 100) */
  readonly contrast: number;
}

/** Noise/grain effect */
export interface NoiseEffect extends BaseEffect {
  readonly type: 'NOISE';
  /** Noise amount (0 to 100) */
  readonly amount: number;
  /** Grain size (1 to 10) */
  readonly size: number;
  /** Whether noise is monochrome */
  readonly monochrome: boolean;
}

/** Motion blur effect */
export interface MotionBlurEffect extends BaseEffect {
  readonly type: 'MOTION_BLUR';
  /** Blur angle in degrees */
  readonly angle: number;
  /** Blur distance in pixels */
  readonly distance: number;
}

/** Union of all effect types */
export type Effect =
  | DropShadowEffect
  | InnerShadowEffect
  | BlurEffect
  | BackgroundBlurEffect
  | ColorAdjustmentEffect
  | NoiseEffect
  | MotionBlurEffect;

// ============================================================================
// Effect factory functions
// ============================================================================

import { rgba } from './color';
import { point } from './geometry';

/** Create a drop shadow effect */
export function dropShadow(
  options: {
    color?: RGBA;
    offsetX?: number;
    offsetY?: number;
    radius?: number;
    spread?: number;
  } = {}
): DropShadowEffect {
  return {
    type: 'DROP_SHADOW',
    visible: true,
    color: options.color ?? rgba(0, 0, 0, 0.25),
    offset: point(options.offsetX ?? 0, options.offsetY ?? 4),
    radius: options.radius ?? 4,
    spread: options.spread ?? 0,
  };
}

/** Create an inner shadow effect */
export function innerShadow(
  options: {
    color?: RGBA;
    offsetX?: number;
    offsetY?: number;
    radius?: number;
    spread?: number;
  } = {}
): InnerShadowEffect {
  return {
    type: 'INNER_SHADOW',
    visible: true,
    color: options.color ?? rgba(0, 0, 0, 0.25),
    offset: point(options.offsetX ?? 0, options.offsetY ?? 2),
    radius: options.radius ?? 4,
    spread: options.spread ?? 0,
  };
}

/** Create a layer blur effect */
export function blur(radius: number = 4): BlurEffect {
  return {
    type: 'BLUR',
    visible: true,
    radius,
  };
}

/** Create a background blur effect */
export function backgroundBlur(radius: number = 10): BackgroundBlurEffect {
  return {
    type: 'BACKGROUND_BLUR',
    visible: true,
    radius,
  };
}

/** Create a color adjustment effect */
export function colorAdjustment(
  options: {
    hue?: number;
    saturation?: number;
    brightness?: number;
    contrast?: number;
  } = {}
): ColorAdjustmentEffect {
  return {
    type: 'COLOR_ADJUSTMENT',
    visible: true,
    hue: Math.max(-180, Math.min(180, options.hue ?? 0)),
    saturation: Math.max(-100, Math.min(100, options.saturation ?? 0)),
    brightness: Math.max(-100, Math.min(100, options.brightness ?? 0)),
    contrast: Math.max(-100, Math.min(100, options.contrast ?? 0)),
  };
}

/** Create a noise/grain effect */
export function noise(
  options: {
    amount?: number;
    size?: number;
    monochrome?: boolean;
  } = {}
): NoiseEffect {
  return {
    type: 'NOISE',
    visible: true,
    amount: Math.max(0, Math.min(100, options.amount ?? 10)),
    size: Math.max(1, Math.min(10, options.size ?? 1)),
    monochrome: options.monochrome ?? false,
  };
}

/** Create a motion blur effect */
export function motionBlur(
  options: {
    angle?: number;
    distance?: number;
  } = {}
): MotionBlurEffect {
  return {
    type: 'MOTION_BLUR',
    visible: true,
    angle: options.angle ?? 0,
    distance: Math.max(0, options.distance ?? 10),
  };
}

/** Check if an effect is a shadow */
export function isShadowEffect(effect: Effect): effect is ShadowEffect {
  return effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW';
}

/** Check if an effect is a blur */
export function isBlurEffect(
  effect: Effect
): effect is BlurEffect | BackgroundBlurEffect {
  return effect.type === 'BLUR' || effect.type === 'BACKGROUND_BLUR';
}

/** Check if an effect is a color adjustment */
export function isColorAdjustmentEffect(
  effect: Effect
): effect is ColorAdjustmentEffect {
  return effect.type === 'COLOR_ADJUSTMENT';
}

/** Check if an effect is noise */
export function isNoiseEffect(effect: Effect): effect is NoiseEffect {
  return effect.type === 'NOISE';
}

/** Check if an effect is motion blur */
export function isMotionBlurEffect(effect: Effect): effect is MotionBlurEffect {
  return effect.type === 'MOTION_BLUR';
}
