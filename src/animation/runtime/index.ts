/**
 * Animation Runtime Module
 *
 * Provides the animation playback engine including the main player,
 * timeline management, and property animation.
 */

// Animation Player
export {
  AnimationPlayer,
  createSimplePlayer,
} from './animation-player';
export type {
  AnimationEventListener,
  AnimationPlayerOptions,
} from './animation-player';

// Timeline
export {
  createTimelineController,
  TimelineBuilder,
  createSequence,
  createParallel,
  createStagger,
} from './timeline';
export type {
  TimelineState,
  TimelineEventType,
  TimelineEvent,
  TimelineEventListener,
  TimelineController,
  TimelineUpdateResult,
  ActiveTimelineAnimation,
} from './timeline';

// Property Animation
export {
  createPropertyAnimation,
  updatePropertyAnimation,
  interpolateNumber,
  interpolateColor,
  interpolatePoint,
  getPropertyValueType,
  createAnimationTarget,
} from './property-animator';
export type {
  AnimationTarget,
  PropertyAnimation,
} from './property-animator';
