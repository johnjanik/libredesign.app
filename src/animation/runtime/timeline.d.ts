/**
 * Animation Timeline
 *
 * Manages sequences of animations with timing and coordination.
 * Supports parallel and sequential animation groups.
 */
import type { NodeId } from '@core/types/common';
import type { Animation, AnimationTimeline } from '../types/animation';
/**
 * Timeline playback state.
 */
export type TimelineState = 'idle' | 'playing' | 'paused' | 'finished';
/**
 * Timeline event types.
 */
export type TimelineEventType = 'start' | 'pause' | 'resume' | 'finish' | 'loop';
/**
 * Timeline event.
 */
export interface TimelineEvent {
    readonly type: TimelineEventType;
    readonly timelineId: string;
    readonly currentTime: number;
    readonly iteration: number;
}
/**
 * Timeline event listener.
 */
export type TimelineEventListener = (event: TimelineEvent) => void;
/**
 * Timeline controller for playback control.
 */
export interface TimelineController {
    /** Timeline ID */
    readonly id: string;
    /** Current state */
    readonly state: TimelineState;
    /** Current playback time (ms) */
    readonly currentTime: number;
    /** Total duration (ms) */
    readonly duration: number;
    /** Current iteration */
    readonly iteration: number;
    /** Play the timeline */
    play(): void;
    /** Pause the timeline */
    pause(): void;
    /** Stop and reset the timeline */
    stop(): void;
    /** Seek to a specific time */
    seek(time: number): void;
    /** Set playback rate */
    setPlaybackRate(rate: number): void;
    /** Add event listener */
    addEventListener(type: TimelineEventType, listener: TimelineEventListener): void;
    /** Remove event listener */
    removeEventListener(type: TimelineEventType, listener: TimelineEventListener): void;
    /** Get current progress (0-1) */
    getProgress(): number;
    /** Update the timeline (called each frame) */
    update(deltaTime: number): TimelineUpdateResult;
}
/**
 * Result of a timeline update.
 */
export interface TimelineUpdateResult {
    /** Active animations to run this frame */
    readonly activeAnimations: readonly ActiveTimelineAnimation[];
    /** Whether timeline is still playing */
    readonly isPlaying: boolean;
    /** Current progress (0-1) */
    readonly progress: number;
}
/**
 * An active animation from the timeline.
 */
export interface ActiveTimelineAnimation {
    /** Animation ID */
    readonly animationId: string;
    /** Target node ID */
    readonly targetNodeId: NodeId;
    /** Local progress within this animation (0-1) */
    readonly progress: number;
    /** Whether this animation just started this frame */
    readonly justStarted: boolean;
    /** Whether this animation just finished this frame */
    readonly justFinished: boolean;
}
/**
 * Create a timeline controller.
 */
export declare function createTimelineController(timeline: AnimationTimeline, getAnimation: (id: string) => Animation | undefined): TimelineController;
/**
 * Timeline builder for easier timeline construction.
 */
export declare class TimelineBuilder {
    private entries;
    private currentOffset;
    private name;
    private loop;
    constructor(name?: string);
    /**
     * Add an animation at the current offset.
     */
    add(animationId: string, targetNodeId: NodeId, duration?: number): this;
    /**
     * Add an animation at a specific time.
     */
    addAt(time: number, animationId: string, targetNodeId: NodeId): this;
    /**
     * Add delay before the next animation.
     */
    delay(ms: number): this;
    /**
     * Set the loop flag.
     */
    setLoop(loop: boolean): this;
    /**
     * Build the timeline.
     */
    build(): AnimationTimeline;
}
/**
 * Create a timeline that plays animations in sequence.
 */
export declare function createSequence(animations: Array<{
    animationId: string;
    targetNodeId: NodeId;
    duration: number;
}>, options?: {
    name?: string;
    loop?: boolean;
}): AnimationTimeline;
/**
 * Create a timeline that plays animations in parallel.
 */
export declare function createParallel(animations: Array<{
    animationId: string;
    targetNodeId: NodeId;
}>, options?: {
    name?: string;
    loop?: boolean;
}): AnimationTimeline;
/**
 * Create a staggered timeline where animations start with a delay between each.
 */
export declare function createStagger(animations: Array<{
    animationId: string;
    targetNodeId: NodeId;
}>, staggerDelay: number, options?: {
    name?: string;
    loop?: boolean;
}): AnimationTimeline;
//# sourceMappingURL=timeline.d.ts.map