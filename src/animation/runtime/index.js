/**
 * Animation Runtime Module
 *
 * Provides the animation playback engine including the main player,
 * timeline management, and property animation.
 */
// Animation Player
export { AnimationPlayer, createSimplePlayer, } from './animation-player';
// Timeline
export { createTimelineController, TimelineBuilder, createSequence, createParallel, createStagger, } from './timeline';
// Property Animation
export { createPropertyAnimation, updatePropertyAnimation, interpolateNumber, interpolateColor, interpolatePoint, getPropertyValueType, createAnimationTarget, } from './property-animator';
//# sourceMappingURL=index.js.map