/**
 * Animation Module
 *
 * Provides animation and prototyping functionality for DesignLibre.
 * Includes easing functions, keyframe animations, Smart Animate,
 * shape morphing, and prototype playback.
 */
// Type factories
export { createKeyframe, createAnimatedProperty, createSimpleAnimation, getValueAtTime, lerpNumber, lerpColor, lerpPoint, } from './types/keyframe';
export { createPrototypeLink } from './types/transition';
export { createAnimation, createAnimationInstance, createTimeline, } from './types/animation';
// Easing
export { 
// Cubic bezier
createCubicBezier, cubicBezierPresets, 
// Spring
createSpringEasing, springPresets, dampingRatio, isUnderdamped, isCriticallyDamped, isOverdamped, 
// Steps
createStepsEasing, stepPresets, 
// Presets and utilities
linear, easingPresets, resolveEasing, reverseEasing, mirrorEasing, blendEasing, createOvershootEasing, createElasticEasing, createBounceEasing, elasticOut, bounceOut, bounceIn, bounceInOut, } from './easing';
// Smart Animate
export { matchNodes, getAnimatableNodes, diffNodes, getAnimatableProperties, interpolateFrame, applyInterpolation, createNodeInterpolator, prepareSmartAnimate, countAnimations, hasAnimations, getPathMorphNodes, } from './smart-animate';
// Shape Morphing
export { checkCompatibility, countPoints, isClosedPath, getWindingDirection, extractPoints, matchPoints, normalizePathPoints, prepareMorph, interpolatePathArrays, createMorphAnimator, } from './morph';
// Animation Runtime
export { AnimationPlayer, createSimplePlayer, createTimelineController, TimelineBuilder, createSequence, createParallel, createStagger, createPropertyAnimation, updatePropertyAnimation, interpolateNumber, interpolateColor, interpolatePoint, getPropertyValueType, createAnimationTarget, } from './runtime';
//# sourceMappingURL=index.js.map