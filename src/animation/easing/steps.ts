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
export type StepPosition =
  | 'jump-start'  // First jump at t=0
  | 'jump-end'    // Last jump at t=1
  | 'jump-none'   // No jumps at endpoints
  | 'jump-both'   // Jumps at both endpoints
  | 'start'       // Alias for jump-start
  | 'end';        // Alias for jump-end

/**
 * Create a step easing function.
 *
 * @param steps - Number of steps
 * @param position - Where jumps occur (default: 'end')
 */
export function createStepsEasing(
  steps: number,
  position: StepPosition = 'end'
): EasingFunction {
  if (steps < 1) {
    throw new Error('Steps must be at least 1');
  }

  // Normalize position aliases
  const normalizedPosition = normalizePosition(position);

  return function stepsEasing(t: number): number {
    if (t <= 0) return getStartValue(normalizedPosition, steps);
    if (t >= 1) return getEndValue(normalizedPosition, steps);

    return computeStepValue(t, steps, normalizedPosition);
  };
}

/**
 * Normalize position aliases.
 */
function normalizePosition(position: StepPosition): StepPosition {
  if (position === 'start') return 'jump-start';
  if (position === 'end') return 'jump-end';
  return position;
}

/**
 * Get the output value at t=0.
 */
function getStartValue(position: StepPosition, steps: number): number {
  switch (position) {
    case 'jump-start':
      // First step happens immediately
      return 1 / steps;
    case 'jump-both':
      // First step happens immediately
      return 1 / (steps + 1);
    case 'jump-end':
    case 'jump-none':
      return 0;
    default:
      return 0;
  }
}

/**
 * Get the output value at t=1.
 */
function getEndValue(position: StepPosition, steps: number): number {
  switch (position) {
    case 'jump-end':
    case 'jump-both':
      return 1;
    case 'jump-start':
      return 1;
    case 'jump-none':
      return steps === 1 ? 0 : (steps - 1) / steps;
    default:
      return 1;
  }
}

/**
 * Compute the step value for intermediate t.
 */
function computeStepValue(
  t: number,
  steps: number,
  position: StepPosition
): number {
  let currentStep: number;
  let totalSteps: number;

  switch (position) {
    case 'jump-start':
      // Jump happens at the start of each interval
      currentStep = Math.ceil(t * steps);
      return currentStep / steps;

    case 'jump-end':
      // Jump happens at the end of each interval
      currentStep = Math.floor(t * steps);
      return currentStep / steps;

    case 'jump-none':
      // No jumps at endpoints, steps-1 intervals
      totalSteps = steps - 1;
      if (totalSteps === 0) return 0;
      currentStep = Math.floor(t * totalSteps);
      return currentStep / totalSteps;

    case 'jump-both':
      // Jumps at both endpoints, steps+1 intervals
      totalSteps = steps + 1;
      currentStep = Math.floor(t * totalSteps) + 1;
      return Math.min(currentStep / totalSteps, 1);

    default:
      return t;
  }
}

/**
 * Step easing presets.
 */
export const stepPresets = {
  /** 1 step at end (CSS step-end) */
  stepEnd: createStepsEasing(1, 'end'),

  /** 1 step at start (CSS step-start) */
  stepStart: createStepsEasing(1, 'start'),

  /** Frame-by-frame animation (24 fps feel) */
  frames24: createStepsEasing(24, 'end'),

  /** Frame-by-frame animation (12 fps feel) */
  frames12: createStepsEasing(12, 'end'),

  /** Frame-by-frame animation (6 fps feel) */
  frames6: createStepsEasing(6, 'end'),
} as const;
