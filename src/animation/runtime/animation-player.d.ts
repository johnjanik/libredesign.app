/**
 * Animation Player
 *
 * Main animation runtime that plays animations using requestAnimationFrame.
 * Supports multiple concurrent animations with proper lifecycle management.
 */
import type { NodeId } from '@core/types/common';
import type { Animation, AnimationState, AnimationEvent, AnimationEventType } from '../types/animation';
/**
 * Animation player event listener.
 */
export type AnimationEventListener = (event: AnimationEvent) => void;
/**
 * Animation player options.
 */
export interface AnimationPlayerOptions {
    /** Auto-start when animations are added (default: true) */
    readonly autoStart?: boolean;
    /** Default playback rate (default: 1) */
    readonly defaultPlaybackRate?: number;
}
/**
 * Animation player for running animations via RAF.
 */
export declare class AnimationPlayer {
    private animations;
    private animationDefinitions;
    private listeners;
    private rafId;
    private lastFrameTime;
    private isRunning;
    private getNode;
    private updateNode;
    private options;
    constructor(getNode: (id: NodeId) => Record<string, unknown> | undefined, updateNode: (id: NodeId, updates: Record<string, unknown>) => void, options?: AnimationPlayerOptions);
    /**
     * Register an animation definition.
     */
    registerAnimation(animation: Animation): void;
    /**
     * Get an animation definition by ID.
     */
    getAnimation(id: string): Animation | undefined;
    /**
     * Play an animation on a target node.
     * Returns a unique instance ID.
     */
    play(animationId: string, targetNodeId: NodeId): string;
    /**
     * Pause a running animation.
     */
    pause(instanceId: string): void;
    /**
     * Resume a paused animation.
     */
    resume(instanceId: string): void;
    /**
     * Stop and remove an animation.
     */
    stop(instanceId: string): void;
    /**
     * Stop all animations.
     */
    stopAll(): void;
    /**
     * Seek an animation to a specific time.
     */
    seek(instanceId: string, time: number): void;
    /**
     * Set playback rate for an animation.
     */
    setPlaybackRate(instanceId: string, rate: number): void;
    /**
     * Get the current state of an animation.
     */
    getState(instanceId: string): AnimationState | undefined;
    /**
     * Get the current progress of an animation (0-1).
     */
    getProgress(instanceId: string): number | undefined;
    /**
     * Add an event listener.
     */
    addEventListener(type: AnimationEventType, listener: AnimationEventListener): void;
    /**
     * Remove an event listener.
     */
    removeEventListener(type: AnimationEventType, listener: AnimationEventListener): void;
    /**
     * Start the animation loop.
     */
    start(): void;
    /**
     * Stop the animation loop.
     */
    private stopLoop;
    /**
     * Animation frame callback.
     */
    private tick;
    /**
     * Apply animated values to the target at the given time.
     */
    private applyAnimationValues;
    /**
     * Emit an animation event.
     */
    private emit;
    /**
     * Get the number of running animations.
     */
    get runningCount(): number;
    /**
     * Check if any animations are running.
     */
    get hasAnimations(): boolean;
    /**
     * Dispose the player and clean up.
     */
    dispose(): void;
}
/**
 * Create a simple animation player for testing or standalone use.
 */
export declare function createSimplePlayer(): {
    player: AnimationPlayer;
    nodes: Map<NodeId, Record<string, unknown>>;
};
//# sourceMappingURL=animation-player.d.ts.map