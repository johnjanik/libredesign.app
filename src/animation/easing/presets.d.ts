/**
 * Easing Presets
 *
 * Common easing function presets for use in animations.
 * Includes CSS standard easings and additional utilities.
 */
import type { EasingFunction, EasingPreset, EasingDefinition } from '../types/easing';
/**
 * Linear easing (no easing).
 */
export declare const linear: EasingFunction;
/**
 * All built-in easing presets.
 */
export declare const easingPresets: Record<EasingPreset, EasingFunction>;
/**
 * Resolve an easing preset or definition to an easing function.
 */
export declare function resolveEasing(easing: EasingPreset | EasingDefinition | EasingFunction): EasingFunction;
/**
 * Create a reversed easing function.
 * Swaps start and end behavior.
 */
export declare function reverseEasing(easing: EasingFunction): EasingFunction;
/**
 * Create a mirrored easing function.
 * First half uses original, second half uses reversed.
 */
export declare function mirrorEasing(easing: EasingFunction): EasingFunction;
/**
 * Blend two easing functions together.
 */
export declare function blendEasing(easing1: EasingFunction, easing2: EasingFunction, blend?: number): EasingFunction;
/**
 * Create an easing that overshoots by a specified amount.
 */
export declare function createOvershootEasing(overshoot?: number): EasingFunction;
/**
 * Create an elastic easing function.
 */
export declare function createElasticEasing(amplitude?: number, period?: number): EasingFunction;
/**
 * Create a bounce easing function.
 */
export declare function createBounceEasing(): EasingFunction;
export declare const elasticOut: EasingFunction;
export declare const bounceOut: EasingFunction;
export declare const bounceIn: EasingFunction;
export declare const bounceInOut: EasingFunction;
//# sourceMappingURL=presets.d.ts.map