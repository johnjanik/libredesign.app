/**
 * Animation Module
 *
 * Provides animation and prototyping functionality for DesignLibre.
 * Includes easing functions, keyframe animations, Smart Animate,
 * shape morphing, and prototype playback.
 */

// Types
export type {
  Keyframe,
  AnimatedProperty,
  NumericProperty,
  ColorProperty,
  PointProperty,
} from './types/keyframe';
export type {
  EasingFunction,
  EasingPreset,
  CubicBezierEasing,
  SpringEasing,
  StepsEasing,
  EasingDefinition,
} from './types/easing';
export type {
  TriggerType,
  TransitionType,
  TransitionDirection,
  PrototypeLink,
  OverlaySettings,
  ScrollBehavior,
} from './types/transition';
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
} from './types/animation';

// Type factories
export {
  createKeyframe,
  createAnimatedProperty,
  createSimpleAnimation,
  getValueAtTime,
  lerpNumber,
  lerpColor,
  lerpPoint,
} from './types/keyframe';
export { createPrototypeLink } from './types/transition';
export {
  createAnimation,
  createAnimationInstance,
  createTimeline,
} from './types/animation';

// Easing
export {
  // Cubic bezier
  createCubicBezier,
  cubicBezierPresets,
  // Spring
  createSpringEasing,
  springPresets,
  dampingRatio,
  isUnderdamped,
  isCriticallyDamped,
  isOverdamped,
  // Steps
  createStepsEasing,
  stepPresets,
  // Presets and utilities
  linear,
  easingPresets,
  resolveEasing,
  reverseEasing,
  mirrorEasing,
  blendEasing,
  createOvershootEasing,
  createElasticEasing,
  createBounceEasing,
  elasticOut,
  bounceOut,
  bounceIn,
  bounceInOut,
} from './easing';
export type { SpringConfig, SpringState } from './easing';
export type { StepPosition } from './easing';

// Smart Animate
export {
  matchNodes,
  getAnimatableNodes,
  diffNodes,
  getAnimatableProperties,
  interpolateFrame,
  applyInterpolation,
  createNodeInterpolator,
  prepareSmartAnimate,
  countAnimations,
  hasAnimations,
  getPathMorphNodes,
} from './smart-animate';
export type {
  MatchConfidence,
  NodeMatch,
  MatchResult,
  MatchOptions,
  AnimatablePropertyType,
  PropertyDiff,
  NodeDiff,
  DiffOptions,
  InterpolatedState,
  FrameInterpolation,
  InterpolateOptions,
  SmartAnimateConfig,
  SmartAnimateTransition,
} from './smart-animate';

// Shape Morphing
export {
  checkCompatibility,
  countPoints,
  isClosedPath,
  getWindingDirection,
  extractPoints,
  matchPoints,
  normalizePathPoints,
  prepareMorph,
  interpolatePathArrays,
  createMorphAnimator,
} from './morph';
export type {
  CompatibilityLevel,
  CompatibilityResult,
  PathPoint,
  PointMapping,
  MatchingResult as MorphMatchingResult,
  PathMorphTransition,
  MorphOptions,
} from './morph';

// Animation Runtime
export {
  AnimationPlayer,
  createSimplePlayer,
  createTimelineController,
  TimelineBuilder,
  createSequence,
  createParallel,
  createStagger,
  createPropertyAnimation,
  updatePropertyAnimation,
  interpolateNumber,
  interpolateColor,
  interpolatePoint,
  getPropertyValueType,
  createAnimationTarget,
} from './runtime';
export type {
  AnimationEventListener,
  AnimationPlayerOptions,
  TimelineState,
  TimelineEventType,
  TimelineEvent,
  TimelineEventListener,
  TimelineController,
  TimelineUpdateResult,
  ActiveTimelineAnimation,
  AnimationTarget,
  PropertyAnimation,
} from './runtime';
