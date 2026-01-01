/**
 * Animation Types Module
 *
 * Exports all animation-related type definitions.
 */
export { createKeyframe, createAnimatedProperty, createSimpleAnimation, getValueAtTime, lerpNumber, lerpColor, lerpPoint, } from './keyframe';
export type { Keyframe, AnimatedProperty, NumericProperty, ColorProperty, PointProperty, } from './keyframe';
export type { EasingFunction, EasingPreset, CubicBezierEasing, SpringEasing, StepsEasing, EasingDefinition, } from './easing';
export { createPrototypeLink } from './transition';
export type { TriggerType, TransitionType, TransitionDirection, PrototypeLink, OverlaySettings, ScrollBehavior, } from './transition';
export { createAnimation, createAnimationInstance, createTimeline, } from './animation';
export type { AnimationState, AnimationDirection, AnimationFillMode, Animation, AnimationInstance, AnimationEventType, AnimationEvent, AnimationTimeline, TimelineEntry, } from './animation';
//# sourceMappingURL=index.d.ts.map