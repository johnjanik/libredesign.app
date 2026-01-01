/**
 * Animation Types
 *
 * Core animation type definitions.
 */
import type { NodeId } from '@core/types/common';
import type { AnimatedProperty } from './keyframe';
import type { EasingPreset, EasingDefinition } from './easing';
/**
 * Animation state.
 */
export type AnimationState = 'idle' | 'running' | 'paused' | 'finished';
/**
 * Animation direction.
 */
export type AnimationDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
/**
 * Animation fill mode (what happens before/after animation).
 */
export type AnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';
/**
 * Animation definition.
 */
export interface Animation {
    /** Unique animation ID */
    readonly id: string;
    /** Human-readable name */
    readonly name?: string;
    /** Duration in milliseconds */
    readonly duration: number;
    /** Delay before starting (ms) */
    readonly delay?: number;
    /** Number of iterations (Infinity for endless) */
    readonly iterations?: number;
    /** Direction of playback */
    readonly direction?: AnimationDirection;
    /** Fill mode */
    readonly fillMode?: AnimationFillMode;
    /** Default easing for all properties */
    readonly easing?: EasingPreset | EasingDefinition;
    /** Animated properties */
    readonly properties: readonly AnimatedProperty<unknown>[];
}
/**
 * Running animation instance.
 */
export interface AnimationInstance {
    /** Reference to the animation definition */
    readonly animationId: string;
    /** Target node being animated */
    readonly targetNodeId: NodeId;
    /** Current state */
    state: AnimationState;
    /** Start time (performance.now()) */
    startTime: number;
    /** Current elapsed time (ms) */
    elapsedTime: number;
    /** Current iteration (0-based) */
    currentIteration: number;
    /** Playback rate (1 = normal, 2 = double speed, 0.5 = half speed) */
    playbackRate: number;
    /** Whether animation was explicitly paused */
    isPaused: boolean;
}
/**
 * Animation event types.
 */
export type AnimationEventType = 'start' | 'end' | 'cancel' | 'iteration' | 'pause' | 'resume';
/**
 * Animation event.
 */
export interface AnimationEvent {
    readonly type: AnimationEventType;
    readonly animationId: string;
    readonly targetNodeId: NodeId;
    readonly elapsedTime: number;
    readonly iteration: number;
}
/**
 * Animation timeline for sequencing multiple animations.
 */
export interface AnimationTimeline {
    /** Unique timeline ID */
    readonly id: string;
    /** Name of the timeline */
    readonly name?: string;
    /** Timeline entries */
    readonly entries: readonly TimelineEntry[];
    /** Total duration (calculated from entries) */
    readonly duration: number;
    /** Whether timeline loops */
    readonly loop?: boolean;
}
/**
 * Entry in an animation timeline.
 */
export interface TimelineEntry {
    /** Animation to play */
    readonly animationId: string;
    /** Target node */
    readonly targetNodeId: NodeId;
    /** Start time offset within timeline (ms) */
    readonly startOffset: number;
}
/**
 * Create an animation.
 */
export declare function createAnimation(properties: AnimatedProperty<unknown>[], options?: {
    name?: string;
    duration?: number;
    delay?: number;
    iterations?: number;
    direction?: AnimationDirection;
    fillMode?: AnimationFillMode;
    easing?: EasingPreset | EasingDefinition;
}): Animation;
/**
 * Create an animation instance.
 */
export declare function createAnimationInstance(animationId: string, targetNodeId: NodeId): AnimationInstance;
/**
 * Create an animation timeline.
 */
export declare function createTimeline(entries: TimelineEntry[], options?: {
    name?: string;
    loop?: boolean;
}): AnimationTimeline;
//# sourceMappingURL=animation.d.ts.map