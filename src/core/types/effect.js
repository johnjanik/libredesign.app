/**
 * Effect types for DesignLibre
 */
// ============================================================================
// Effect factory functions
// ============================================================================
import { rgba } from './color';
import { point } from './geometry';
/** Create a drop shadow effect */
export function dropShadow(options = {}) {
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
export function innerShadow(options = {}) {
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
export function blur(radius = 4) {
    return {
        type: 'BLUR',
        visible: true,
        radius,
    };
}
/** Create a background blur effect */
export function backgroundBlur(radius = 10) {
    return {
        type: 'BACKGROUND_BLUR',
        visible: true,
        radius,
    };
}
/** Create a color adjustment effect */
export function colorAdjustment(options = {}) {
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
export function noise(options = {}) {
    return {
        type: 'NOISE',
        visible: true,
        amount: Math.max(0, Math.min(100, options.amount ?? 10)),
        size: Math.max(1, Math.min(10, options.size ?? 1)),
        monochrome: options.monochrome ?? false,
    };
}
/** Create a motion blur effect */
export function motionBlur(options = {}) {
    return {
        type: 'MOTION_BLUR',
        visible: true,
        angle: options.angle ?? 0,
        distance: Math.max(0, options.distance ?? 10),
    };
}
/** Check if an effect is a shadow */
export function isShadowEffect(effect) {
    return effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW';
}
/** Check if an effect is a blur */
export function isBlurEffect(effect) {
    return effect.type === 'BLUR' || effect.type === 'BACKGROUND_BLUR';
}
/** Check if an effect is a color adjustment */
export function isColorAdjustmentEffect(effect) {
    return effect.type === 'COLOR_ADJUSTMENT';
}
/** Check if an effect is noise */
export function isNoiseEffect(effect) {
    return effect.type === 'NOISE';
}
/** Check if an effect is motion blur */
export function isMotionBlurEffect(effect) {
    return effect.type === 'MOTION_BLUR';
}
//# sourceMappingURL=effect.js.map