/**
 * Easing Types
 *
 * Type definitions for easing functions.
 */

/**
 * Easing function that maps input time [0, 1] to output progress [0, 1].
 */
export type EasingFunction = (t: number) => number;

/**
 * Named easing preset.
 */
export type EasingPreset =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-quad'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'ease-in-quart'
  | 'ease-out-quart'
  | 'ease-in-out-quart'
  | 'ease-in-quint'
  | 'ease-out-quint'
  | 'ease-in-out-quint'
  | 'ease-in-sine'
  | 'ease-out-sine'
  | 'ease-in-out-sine'
  | 'ease-in-expo'
  | 'ease-out-expo'
  | 'ease-in-out-expo'
  | 'ease-in-circ'
  | 'ease-out-circ'
  | 'ease-in-out-circ'
  | 'ease-in-back'
  | 'ease-out-back'
  | 'ease-in-out-back'
  | 'ease-in-elastic'
  | 'ease-out-elastic'
  | 'ease-in-out-elastic'
  | 'ease-out-bounce'
  | 'spring-gentle'
  | 'spring-wobbly'
  | 'spring-stiff'
  | 'spring-slow'
  | 'spring-molasses'
  | 'step-start'
  | 'step-end';

/**
 * Cubic bezier easing definition.
 */
export interface CubicBezierEasing {
  readonly type: 'cubic-bezier';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/**
 * Spring easing definition.
 */
export interface SpringEasing {
  readonly type: 'spring';
  readonly mass: number;
  readonly stiffness: number;
  readonly damping: number;
  readonly velocity?: number;
}

/**
 * Step position for step easing.
 */
export type StepPosition =
  | 'jump-start'
  | 'jump-end'
  | 'jump-none'
  | 'jump-both'
  | 'start'
  | 'end';

/**
 * Steps easing definition.
 */
export interface StepsEasing {
  readonly type: 'steps';
  readonly steps: number;
  readonly position?: StepPosition;
}

/**
 * Union of all easing definitions.
 */
export type EasingDefinition =
  | { readonly type: 'preset'; readonly preset: EasingPreset }
  | CubicBezierEasing
  | SpringEasing
  | StepsEasing;
