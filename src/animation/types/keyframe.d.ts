/**
 * Keyframe Types
 *
 * Defines keyframes for animation properties.
 */
import type { EasingFunction } from './easing';
/**
 * A keyframe defines a value at a specific point in time.
 */
export interface Keyframe<T> {
    /** Time position (0 = start, 1 = end) */
    readonly time: number;
    /** Value at this keyframe */
    readonly value: T;
    /** Easing function to use when transitioning TO this keyframe */
    readonly easing?: EasingFunction;
}
/**
 * An animated property with multiple keyframes.
 */
export interface AnimatedProperty<T> {
    /** Property path (e.g., 'x', 'opacity', 'fill.color') */
    readonly path: string;
    /** Keyframes for this property */
    readonly keyframes: readonly Keyframe<T>[];
}
/**
 * Numeric property animation (position, rotation, scale, opacity, etc.)
 */
export type NumericProperty = AnimatedProperty<number>;
/**
 * Color property animation (RGBA values)
 */
export type ColorProperty = AnimatedProperty<readonly [number, number, number, number]>;
/**
 * Point property animation (x, y coordinates)
 */
export type PointProperty = AnimatedProperty<{
    x: number;
    y: number;
}>;
/**
 * Create a keyframe.
 */
export declare function createKeyframe<T>(time: number, value: T, easing?: EasingFunction): Keyframe<T>;
/**
 * Create an animated property.
 */
export declare function createAnimatedProperty<T>(path: string, keyframes: Keyframe<T>[]): AnimatedProperty<T>;
/**
 * Create a simple two-keyframe animation (from -> to).
 */
export declare function createSimpleAnimation<T>(path: string, from: T, to: T, easing?: EasingFunction): AnimatedProperty<T>;
/**
 * Get the value of an animated property at a given time.
 * Returns the interpolated value based on keyframes.
 */
export declare function getValueAtTime<T>(property: AnimatedProperty<T>, time: number, interpolate: (a: T, b: T, t: number) => T): T;
/**
 * Linear interpolation for numbers.
 */
export declare function lerpNumber(a: number, b: number, t: number): number;
/**
 * Linear interpolation for colors.
 */
export declare function lerpColor(a: readonly [number, number, number, number], b: readonly [number, number, number, number], t: number): readonly [number, number, number, number];
/**
 * Linear interpolation for points.
 */
export declare function lerpPoint(a: {
    x: number;
    y: number;
}, b: {
    x: number;
    y: number;
}, t: number): {
    x: number;
    y: number;
};
//# sourceMappingURL=keyframe.d.ts.map