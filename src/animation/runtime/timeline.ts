/**
 * Animation Timeline
 *
 * Manages sequences of animations with timing and coordination.
 * Supports parallel and sequential animation groups.
 */

import type { NodeId } from '@core/types/common';
import type { Animation, AnimationTimeline, TimelineEntry } from '../types/animation';

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
export function createTimelineController(
  timeline: AnimationTimeline,
  getAnimation: (id: string) => Animation | undefined
): TimelineController {
  let state: TimelineState = 'idle';
  let currentTime = 0;
  let iteration = 0;
  let playbackRate = 1;
  const listeners = new Map<TimelineEventType, Set<TimelineEventListener>>();

  // Calculate actual duration including all animation durations
  let calculatedDuration = timeline.duration;
  for (const entry of timeline.entries) {
    const animation = getAnimation(entry.animationId);
    if (animation) {
      const endTime = entry.startOffset + animation.duration;
      calculatedDuration = Math.max(calculatedDuration, endTime);
    }
  }

  const emit = (type: TimelineEventType): void => {
    const event: TimelineEvent = {
      type,
      timelineId: timeline.id,
      currentTime,
      iteration,
    };
    listeners.get(type)?.forEach((listener) => listener(event));
  };

  const controller: TimelineController = {
    get id() {
      return timeline.id;
    },

    get state() {
      return state;
    },

    get currentTime() {
      return currentTime;
    },

    get duration() {
      return calculatedDuration;
    },

    get iteration() {
      return iteration;
    },

    play() {
      if (state === 'idle' || state === 'finished') {
        currentTime = 0;
        iteration = 0;
        state = 'playing';
        emit('start');
      } else if (state === 'paused') {
        state = 'playing';
        emit('resume');
      }
    },

    pause() {
      if (state === 'playing') {
        state = 'paused';
        emit('pause');
      }
    },

    stop() {
      state = 'idle';
      currentTime = 0;
      iteration = 0;
    },

    seek(time: number) {
      currentTime = Math.max(0, Math.min(time, calculatedDuration));
    },

    setPlaybackRate(rate: number) {
      playbackRate = Math.max(0.1, Math.min(10, rate));
    },

    addEventListener(type: TimelineEventType, listener: TimelineEventListener) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type)!.add(listener);
    },

    removeEventListener(type: TimelineEventType, listener: TimelineEventListener) {
      listeners.get(type)?.delete(listener);
    },

    getProgress() {
      if (calculatedDuration === 0) return 1;
      return currentTime / calculatedDuration;
    },

    update(deltaTime: number): TimelineUpdateResult {
      if (state !== 'playing') {
        return {
          activeAnimations: [],
          isPlaying: false,
          progress: controller.getProgress(),
        };
      }

      const prevTime = currentTime;
      currentTime += deltaTime * playbackRate;

      // Check if timeline finished
      if (currentTime >= calculatedDuration) {
        if (timeline.loop) {
          // Loop back
          currentTime = currentTime % calculatedDuration;
          iteration++;
          emit('loop');
        } else {
          currentTime = calculatedDuration;
          state = 'finished';
          emit('finish');
        }
      }

      // Find active animations
      const activeAnimations: ActiveTimelineAnimation[] = [];

      for (const entry of timeline.entries) {
        const animation = getAnimation(entry.animationId);
        if (!animation) continue;

        const animStart = entry.startOffset;
        const animEnd = animStart + animation.duration;

        // Check if animation is active
        if (currentTime >= animStart && currentTime <= animEnd) {
          const localTime = currentTime - animStart;
          const progress = animation.duration > 0 ? localTime / animation.duration : 1;

          activeAnimations.push({
            animationId: entry.animationId,
            targetNodeId: entry.targetNodeId,
            progress: Math.min(progress, 1),
            justStarted: prevTime < animStart && currentTime >= animStart,
            justFinished: prevTime < animEnd && currentTime >= animEnd,
          });
        }
      }

      return {
        activeAnimations,
        isPlaying: state === 'playing',
        progress: controller.getProgress(),
      };
    },
  };

  return controller;
}

/**
 * Timeline builder for easier timeline construction.
 */
export class TimelineBuilder {
  private entries: TimelineEntry[] = [];
  private currentOffset = 0;
  private name: string | undefined = undefined;
  private loop = false;

  constructor(name?: string) {
    if (name !== undefined) {
      this.name = name;
    }
  }

  /**
   * Add an animation at the current offset.
   */
  add(animationId: string, targetNodeId: NodeId, duration?: number): this {
    this.entries.push({
      animationId,
      targetNodeId,
      startOffset: this.currentOffset,
    });
    if (duration !== undefined) {
      this.currentOffset += duration;
    }
    return this;
  }

  /**
   * Add an animation at a specific time.
   */
  addAt(time: number, animationId: string, targetNodeId: NodeId): this {
    this.entries.push({
      animationId,
      targetNodeId,
      startOffset: time,
    });
    return this;
  }

  /**
   * Add delay before the next animation.
   */
  delay(ms: number): this {
    this.currentOffset += ms;
    return this;
  }

  /**
   * Set the loop flag.
   */
  setLoop(loop: boolean): this {
    this.loop = loop;
    return this;
  }

  /**
   * Build the timeline.
   */
  build(): AnimationTimeline {
    let duration = 0;
    for (const entry of this.entries) {
      duration = Math.max(duration, entry.startOffset);
    }

    const result: AnimationTimeline = {
      id: generateTimelineId(),
      entries: this.entries,
      duration,
      loop: this.loop,
    };
    if (this.name !== undefined) {
      return { ...result, name: this.name };
    }
    return result;
  }
}

/**
 * Create a timeline that plays animations in sequence.
 */
export function createSequence(
  animations: Array<{
    animationId: string;
    targetNodeId: NodeId;
    duration: number;
  }>,
  options: { name?: string; loop?: boolean } = {}
): AnimationTimeline {
  const builder = new TimelineBuilder(options.name);

  for (const anim of animations) {
    builder.add(anim.animationId, anim.targetNodeId, anim.duration);
  }

  if (options.loop) {
    builder.setLoop(true);
  }

  return builder.build();
}

/**
 * Create a timeline that plays animations in parallel.
 */
export function createParallel(
  animations: Array<{
    animationId: string;
    targetNodeId: NodeId;
  }>,
  options: { name?: string; loop?: boolean } = {}
): AnimationTimeline {
  const builder = new TimelineBuilder(options.name);

  for (const anim of animations) {
    builder.addAt(0, anim.animationId, anim.targetNodeId);
  }

  if (options.loop) {
    builder.setLoop(true);
  }

  return builder.build();
}

/**
 * Create a staggered timeline where animations start with a delay between each.
 */
export function createStagger(
  animations: Array<{
    animationId: string;
    targetNodeId: NodeId;
  }>,
  staggerDelay: number,
  options: { name?: string; loop?: boolean } = {}
): AnimationTimeline {
  const builder = new TimelineBuilder(options.name);

  for (let i = 0; i < animations.length; i++) {
    const anim = animations[i]!;
    builder.addAt(i * staggerDelay, anim.animationId, anim.targetNodeId);
  }

  if (options.loop) {
    builder.setLoop(true);
  }

  return builder.build();
}

/**
 * Generate a unique timeline ID.
 */
function generateTimelineId(): string {
  return `timeline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
