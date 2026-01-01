/**
 * Effect types for DesignLibre
 */
import type { RGBA } from './color';
import type { Point } from './geometry';
/** Effect type discriminator */
export type EffectType = 'DROP_SHADOW' | 'INNER_SHADOW' | 'BLUR' | 'BACKGROUND_BLUR' | 'COLOR_ADJUSTMENT' | 'NOISE' | 'MOTION_BLUR';
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
export type Effect = DropShadowEffect | InnerShadowEffect | BlurEffect | BackgroundBlurEffect | ColorAdjustmentEffect | NoiseEffect | MotionBlurEffect;
/** Create a drop shadow effect */
export declare function dropShadow(options?: {
    color?: RGBA;
    offsetX?: number;
    offsetY?: number;
    radius?: number;
    spread?: number;
}): DropShadowEffect;
/** Create an inner shadow effect */
export declare function innerShadow(options?: {
    color?: RGBA;
    offsetX?: number;
    offsetY?: number;
    radius?: number;
    spread?: number;
}): InnerShadowEffect;
/** Create a layer blur effect */
export declare function blur(radius?: number): BlurEffect;
/** Create a background blur effect */
export declare function backgroundBlur(radius?: number): BackgroundBlurEffect;
/** Create a color adjustment effect */
export declare function colorAdjustment(options?: {
    hue?: number;
    saturation?: number;
    brightness?: number;
    contrast?: number;
}): ColorAdjustmentEffect;
/** Create a noise/grain effect */
export declare function noise(options?: {
    amount?: number;
    size?: number;
    monochrome?: boolean;
}): NoiseEffect;
/** Create a motion blur effect */
export declare function motionBlur(options?: {
    angle?: number;
    distance?: number;
}): MotionBlurEffect;
/** Check if an effect is a shadow */
export declare function isShadowEffect(effect: Effect): effect is ShadowEffect;
/** Check if an effect is a blur */
export declare function isBlurEffect(effect: Effect): effect is BlurEffect | BackgroundBlurEffect;
/** Check if an effect is a color adjustment */
export declare function isColorAdjustmentEffect(effect: Effect): effect is ColorAdjustmentEffect;
/** Check if an effect is noise */
export declare function isNoiseEffect(effect: Effect): effect is NoiseEffect;
/** Check if an effect is motion blur */
export declare function isMotionBlurEffect(effect: Effect): effect is MotionBlurEffect;
//# sourceMappingURL=effect.d.ts.map