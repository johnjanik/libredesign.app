/**
 * Easing Module
 *
 * Exports all easing-related functions and presets.
 */
export { createCubicBezier, cubicBezierPresets } from './cubic-bezier';
export { createSpringEasing, springPresets, dampingRatio, isUnderdamped, isCriticallyDamped, isOverdamped, } from './spring';
export type { SpringConfig, SpringState } from './spring';
export { createStepsEasing, stepPresets } from './steps';
export type { StepPosition } from './steps';
export { linear, easingPresets, resolveEasing, reverseEasing, mirrorEasing, blendEasing, createOvershootEasing, createElasticEasing, createBounceEasing, elasticOut, bounceOut, bounceIn, bounceInOut, } from './presets';
//# sourceMappingURL=index.d.ts.map