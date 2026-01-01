/**
 * Animation Runtime Module
 *
 * Provides the animation playback engine including the main player,
 * timeline management, and property animation.
 */
export { AnimationPlayer, createSimplePlayer, } from './animation-player';
export type { AnimationEventListener, AnimationPlayerOptions, } from './animation-player';
export { createTimelineController, TimelineBuilder, createSequence, createParallel, createStagger, } from './timeline';
export type { TimelineState, TimelineEventType, TimelineEvent, TimelineEventListener, TimelineController, TimelineUpdateResult, ActiveTimelineAnimation, } from './timeline';
export { createPropertyAnimation, updatePropertyAnimation, interpolateNumber, interpolateColor, interpolatePoint, getPropertyValueType, createAnimationTarget, } from './property-animator';
export type { AnimationTarget, PropertyAnimation, } from './property-animator';
//# sourceMappingURL=index.d.ts.map