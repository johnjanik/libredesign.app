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
export type PointProperty = AnimatedProperty<{ x: number; y: number }>;

/**
 * Create a keyframe.
 */
export function createKeyframe<T>(
  time: number,
  value: T,
  easing?: EasingFunction
): Keyframe<T> {
  const keyframe: Keyframe<T> = { time, value };
  if (easing !== undefined) {
    (keyframe as { easing: EasingFunction }).easing = easing;
  }
  return keyframe;
}

/**
 * Create an animated property.
 */
export function createAnimatedProperty<T>(
  path: string,
  keyframes: Keyframe<T>[]
): AnimatedProperty<T> {
  // Sort keyframes by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  return { path, keyframes: sorted };
}

/**
 * Create a simple two-keyframe animation (from -> to).
 */
export function createSimpleAnimation<T>(
  path: string,
  from: T,
  to: T,
  easing?: EasingFunction
): AnimatedProperty<T> {
  return createAnimatedProperty(path, [
    createKeyframe(0, from),
    createKeyframe(1, to, easing),
  ]);
}

/**
 * Get the value of an animated property at a given time.
 * Returns the interpolated value based on keyframes.
 */
export function getValueAtTime<T>(
  property: AnimatedProperty<T>,
  time: number,
  interpolate: (a: T, b: T, t: number) => T
): T {
  const { keyframes } = property;

  if (keyframes.length === 0) {
    throw new Error('AnimatedProperty has no keyframes');
  }

  if (keyframes.length === 1 || time <= keyframes[0]!.time) {
    return keyframes[0]!.value;
  }

  if (time >= keyframes[keyframes.length - 1]!.time) {
    return keyframes[keyframes.length - 1]!.value;
  }

  // Find the two keyframes to interpolate between
  let i = 0;
  for (; i < keyframes.length - 1; i++) {
    if (time < keyframes[i + 1]!.time) {
      break;
    }
  }

  const k0 = keyframes[i]!;
  const k1 = keyframes[i + 1]!;

  // Calculate local time (0-1 between these two keyframes)
  const localTime = (time - k0.time) / (k1.time - k0.time);

  // Apply easing if specified on target keyframe
  const easedTime = k1.easing ? k1.easing(localTime) : localTime;

  return interpolate(k0.value, k1.value, easedTime);
}

/**
 * Linear interpolation for numbers.
 */
export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linear interpolation for colors.
 */
export function lerpColor(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
  t: number
): readonly [number, number, number, number] {
  return [
    lerpNumber(a[0], b[0], t),
    lerpNumber(a[1], b[1], t),
    lerpNumber(a[2], b[2], t),
    lerpNumber(a[3], b[3], t),
  ];
}

/**
 * Linear interpolation for points.
 */
export function lerpPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number
): { x: number; y: number } {
  return {
    x: lerpNumber(a.x, b.x, t),
    y: lerpNumber(a.y, b.y, t),
  };
}
