/**
 * Animation Types Module
 *
 * Exports all animation-related type definitions.
 */

// Keyframe types
export {
  createKeyframe,
  createAnimatedProperty,
  createSimpleAnimation,
  getValueAtTime,
  lerpNumber,
  lerpColor,
  lerpPoint,
} from './keyframe';
export type {
  Keyframe,
  AnimatedProperty,
  NumericProperty,
  ColorProperty,
  PointProperty,
} from './keyframe';

// Easing types
export type {
  EasingFunction,
  EasingPreset,
  CubicBezierEasing,
  SpringEasing,
  StepsEasing,
  EasingDefinition,
} from './easing';

// Transition types
export { createPrototypeLink } from './transition';
export type {
  TriggerType,
  TransitionType,
  TransitionDirection,
  PrototypeLink,
  OverlaySettings,
  ScrollBehavior,
} from './transition';

// Animation types
export {
  createAnimation,
  createAnimationInstance,
  createTimeline,
} from './animation';
export type {
  AnimationState,
  AnimationDirection,
  AnimationFillMode,
  Animation,
  AnimationInstance,
  AnimationEventType,
  AnimationEvent,
  AnimationTimeline,
  TimelineEntry,
} from './animation';
