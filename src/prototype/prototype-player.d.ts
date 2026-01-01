/**
 * Prototype Player
 *
 * Main prototype playback component that orchestrates
 * state management, interaction handling, and transitions.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { PrototypeLink, TransitionType } from '@animation/types/transition';
import { PrototypeStateManager } from './state-manager';
import { InteractionHandler } from './interaction-handler';
import type { HitTestFunction } from './interaction-handler';
/**
 * Prototype player events.
 */
export type PrototypePlayerEventType = 'start' | 'stop' | 'frame-change' | 'transition-start' | 'transition-end' | 'overlay-open' | 'overlay-close';
/**
 * Prototype player event.
 */
export interface PrototypePlayerEvent {
    readonly type: PrototypePlayerEventType;
    readonly frameId?: NodeId;
    readonly transition?: PrototypeLink;
    readonly progress?: number;
}
/**
 * Prototype player event listener.
 */
export type PrototypePlayerEventListener = (event: PrototypePlayerEvent) => void;
/**
 * Prototype player options.
 */
export interface PrototypePlayerOptions {
    /** Scene graph instance */
    readonly sceneGraph: SceneGraph;
    /** Initial frame ID */
    readonly initialFrameId: NodeId;
    /** Hit test function */
    readonly hitTest: HitTestFunction;
    /** Get prototype links for a node */
    readonly getLinks: (nodeId: NodeId) => readonly PrototypeLink[];
}
/**
 * Prototype player for running interactive prototypes.
 */
export declare class PrototypePlayer {
    private sceneGraph;
    private stateManager;
    private interactionHandler;
    private listeners;
    private links;
    private getLinksForNode;
    private currentTransition;
    private rafId;
    constructor(options: PrototypePlayerOptions);
    /**
     * Start the prototype.
     */
    start(): void;
    /**
     * Stop the prototype.
     */
    stop(): void;
    /**
     * Reset to initial state.
     */
    reset(initialFrameId?: NodeId): void;
    /**
     * Get current frame ID.
     */
    getCurrentFrame(): NodeId;
    /**
     * Get current transition progress (0-1, null if no transition).
     */
    getTransitionProgress(): number | null;
    /**
     * Check if a transition is in progress.
     */
    isTransitioning(): boolean;
    /**
     * Navigate back.
     */
    goBack(): boolean;
    /**
     * Navigate forward.
     */
    goForward(): boolean;
    /**
     * Close current overlay.
     */
    closeOverlay(): boolean;
    /**
     * Add event listener.
     */
    addEventListener(listener: PrototypePlayerEventListener): void;
    /**
     * Remove event listener.
     */
    removeEventListener(listener: PrototypePlayerEventListener): void;
    /**
     * Get state manager (for external access).
     */
    getStateManager(): PrototypeStateManager;
    /**
     * Get interaction handler (for external access).
     */
    getInteractionHandler(): InteractionHandler;
    /**
     * Dispose the player.
     */
    dispose(): void;
    /**
     * Handle a trigger event.
     */
    private handleTrigger;
    /**
     * Execute a transition.
     */
    private executeTransition;
    /**
     * Wait for a transition to complete.
     */
    private waitForTransition;
    /**
     * Build link lookup map for current frame.
     */
    private buildLinkMap;
    /**
     * Schedule timeout triggers for current frame.
     */
    private scheduleTimeoutTriggers;
    /**
     * Start the animation loop.
     */
    private startLoop;
    /**
     * Stop the animation loop.
     */
    private stopLoop;
    /**
     * Animation frame callback.
     */
    private tick;
    /**
     * Emit an event.
     */
    private emit;
}
/**
 * Create a prototype player.
 */
export declare function createPrototypePlayer(options: PrototypePlayerOptions): PrototypePlayer;
/**
 * Get transition renderer info.
 */
export declare function getTransitionInfo(type: TransitionType): {
    needsSourceCapture: boolean;
    needsTargetPrerender: boolean;
    animatesPosition: boolean;
};
//# sourceMappingURL=prototype-player.d.ts.map