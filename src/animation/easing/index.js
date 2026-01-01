/**
 * Easing Module
 *
 * Exports all easing-related functions and presets.
 */
// Cubic bezier
export { createCubicBezier, cubicBezierPresets } from './cubic-bezier';
// Spring physics
export { createSpringEasing, springPresets, dampingRatio, isUnderdamped, isCriticallyDamped, isOverdamped, } from './spring';
// Step easing
export { createStepsEasing, stepPresets } from './steps';
// Presets and utilities
export { linear, easingPresets, resolveEasing, reverseEasing, mirrorEasing, blendEasing, createOvershootEasing, createElasticEasing, createBounceEasing, elasticOut, bounceOut, bounceIn, bounceInOut, } from './presets';
//# sourceMappingURL=index.js.map