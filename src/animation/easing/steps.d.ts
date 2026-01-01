/**
 * Step Easing
 *
 * Implements step-based easing for discrete animation jumps.
 * Compatible with CSS steps() timing function.
 */
import type { EasingFunction } from '../types/easing';
/**
 * Jump term for step positioning.
 */
export type StepPosition = 'jump-start' | 'jump-end' | 'jump-none' | 'jump-both' | 'start' | 'end';
/**
 * Create a step easing function.
 *
 * @param steps - Number of steps
 * @param position - Where jumps occur (default: 'end')
 */
export declare function createStepsEasing(steps: number, position?: StepPosition): EasingFunction;
/**
 * Step easing presets.
 */
export declare const stepPresets: {
    /** 1 step at end (CSS step-end) */
    readonly stepEnd: EasingFunction;
    /** 1 step at start (CSS step-start) */
    readonly stepStart: EasingFunction;
    /** Frame-by-frame animation (24 fps feel) */
    readonly frames24: EasingFunction;
    /** Frame-by-frame animation (12 fps feel) */
    readonly frames12: EasingFunction;
    /** Frame-by-frame animation (6 fps feel) */
    readonly frames6: EasingFunction;
};
//# sourceMappingURL=steps.d.ts.map