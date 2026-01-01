/**
 * Prototype Player
 *
 * Main prototype playback component that orchestrates
 * state management, interaction handling, and transitions.
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { PrototypeLink, TransitionType } from '@animation/types/transition';
import { resolveEasing } from '@animation/easing/presets';
import { prepareSmartAnimate } from '@animation/smart-animate';
import type { SmartAnimateTransition } from '@animation/smart-animate';
import {
  PrototypeStateManager,
  createStateManager,
} from './state-manager';
import {
  InteractionHandler,
  createInteractionHandler,
} from './interaction-handler';
import type { TriggerEvent, HitTestFunction } from './interaction-handler';

/**
 * Prototype player events.
 */
export type PrototypePlayerEventType =
  | 'start'
  | 'stop'
  | 'frame-change'
  | 'transition-start'
  | 'transition-end'
  | 'overlay-open'
  | 'overlay-close';

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
 * Transition state.
 */
interface TransitionState {
  /** Link being executed */
  readonly link: PrototypeLink;
  /** Start time */
  readonly startTime: number;
  /** Smart Animate transition (if applicable) */
  readonly smartAnimate: SmartAnimateTransition | null;
  /** Is in progress */
  isActive: boolean;
}

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
export class PrototypePlayer {
  private sceneGraph: SceneGraph;
  private stateManager: PrototypeStateManager;
  private interactionHandler: InteractionHandler;
  private listeners = new Set<PrototypePlayerEventListener>();
  private links = new Map<string, PrototypeLink>(); // nodeId:trigger -> link
  private getLinksForNode: (nodeId: NodeId) => readonly PrototypeLink[];
  private currentTransition: TransitionState | null = null;
  private rafId: number | null = null;

  constructor(options: PrototypePlayerOptions) {
    this.sceneGraph = options.sceneGraph;
    this.getLinksForNode = options.getLinks;
    this.stateManager = createStateManager(options.initialFrameId);

    // Build link lookup map
    this.buildLinkMap(options.initialFrameId);

    // Create interaction handler
    this.interactionHandler = createInteractionHandler(
      options.hitTest,
      (nodeId, trigger) => {
        const key = `${nodeId}:${trigger}`;
        return this.links.get(key) ?? null;
      }
    );

    // Listen for trigger events
    this.interactionHandler.addListener(this.handleTrigger);
  }

  /**
   * Start the prototype.
   */
  start(): void {
    this.stateManager.start();
    this.emit({ type: 'start', frameId: this.stateManager.getState().currentFrame });
    this.startLoop();
    this.scheduleTimeoutTriggers();
  }

  /**
   * Stop the prototype.
   */
  stop(): void {
    this.stopLoop();
    this.interactionHandler.clearAllTimers();
    this.stateManager.stop();
    this.emit({ type: 'stop' });
  }

  /**
   * Reset to initial state.
   */
  reset(initialFrameId?: NodeId): void {
    this.stopLoop();
    this.interactionHandler.clearAllTimers();
    this.currentTransition = null;
    this.stateManager.reset(initialFrameId ?? this.stateManager.getState().currentFrame);
    this.buildLinkMap(this.stateManager.getState().currentFrame);
  }

  /**
   * Get current frame ID.
   */
  getCurrentFrame(): NodeId {
    return this.stateManager.getVisibleFrame();
  }

  /**
   * Get current transition progress (0-1, null if no transition).
   */
  getTransitionProgress(): number | null {
    if (!this.currentTransition?.isActive) return null;

    const elapsed = performance.now() - this.currentTransition.startTime;
    return Math.min(elapsed / this.currentTransition.link.duration, 1);
  }

  /**
   * Check if a transition is in progress.
   */
  isTransitioning(): boolean {
    return this.currentTransition?.isActive ?? false;
  }

  /**
   * Navigate back.
   */
  goBack(): boolean {
    if (this.currentTransition?.isActive) return false;
    return this.stateManager.goBack();
  }

  /**
   * Navigate forward.
   */
  goForward(): boolean {
    if (this.currentTransition?.isActive) return false;
    return this.stateManager.goForward();
  }

  /**
   * Close current overlay.
   */
  closeOverlay(): boolean {
    return this.stateManager.closeOverlay();
  }

  /**
   * Add event listener.
   */
  addEventListener(listener: PrototypePlayerEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener.
   */
  removeEventListener(listener: PrototypePlayerEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get state manager (for external access).
   */
  getStateManager(): PrototypeStateManager {
    return this.stateManager;
  }

  /**
   * Get interaction handler (for external access).
   */
  getInteractionHandler(): InteractionHandler {
    return this.interactionHandler;
  }

  /**
   * Dispose the player.
   */
  dispose(): void {
    this.stop();
    this.interactionHandler.dispose();
    this.listeners.clear();
    this.links.clear();
  }

  /**
   * Handle a trigger event.
   */
  private handleTrigger = (event: TriggerEvent): void => {
    if (!event.link) return;
    if (this.currentTransition?.isActive) return;

    this.executeTransition(event.link);
  };

  /**
   * Execute a transition.
   */
  private async executeTransition(link: PrototypeLink): Promise<void> {
    const sourceFrameId = this.stateManager.getState().currentFrame;
    const targetFrameId = link.targetNodeId;

    // Prepare Smart Animate if needed
    let smartAnimate: SmartAnimateTransition | null = null;
    if (link.transition === 'SMART_ANIMATE') {
      smartAnimate = prepareSmartAnimate(
        {
          sourceFrameId,
          targetFrameId,
          duration: link.duration,
          easing: resolveEasing(link.easing),
        },
        this.sceneGraph
      );
    }

    // Create transition state
    this.currentTransition = {
      link,
      startTime: performance.now(),
      smartAnimate,
      isActive: true,
    };

    // Emit transition start
    this.emit({
      type: 'transition-start',
      frameId: targetFrameId,
      transition: link,
    });

    // Check if this is an overlay
    if (link.overlay) {
      const overlayOptions: Partial<{
        readonly closeOnOutsideClick: boolean;
        readonly background: 'NONE' | 'BLUR' | 'DIM';
        readonly backgroundOpacity: number;
      }> = {
        background: link.overlay.background ?? 'NONE',
        backgroundOpacity: link.overlay.backgroundOpacity ?? 0.5,
      };
      if (link.overlay.closeOnOutsideClick !== undefined) {
        (overlayOptions as { closeOnOutsideClick: boolean }).closeOnOutsideClick = link.overlay.closeOnOutsideClick;
      }
      this.stateManager.openOverlay(targetFrameId, link.sourceNodeId, overlayOptions);
      this.emit({ type: 'overlay-open', frameId: targetFrameId });
    }

    // Wait for transition to complete
    await this.waitForTransition(link.duration);

    // Complete transition
    if (!link.overlay) {
      this.stateManager.navigateTo(targetFrameId, link);
      this.buildLinkMap(targetFrameId);
    }

    this.currentTransition.isActive = false;
    this.currentTransition = null;

    // Emit transition end
    this.emit({
      type: 'transition-end',
      frameId: targetFrameId,
      transition: link,
    });

    // Schedule timeout triggers for new frame
    this.scheduleTimeoutTriggers();
  };

  /**
   * Wait for a transition to complete.
   */
  private waitForTransition(duration: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, duration);
    });
  }

  /**
   * Build link lookup map for current frame.
   */
  private buildLinkMap(frameId: NodeId): void {
    this.links.clear();

    // Get all nodes in the frame
    const collectLinks = (nodeId: NodeId): void => {
      const links = this.getLinksForNode(nodeId);
      for (const link of links) {
        const key = `${link.sourceNodeId}:${link.trigger}`;
        this.links.set(key, link);
      }

      // Recurse into children
      const children = this.sceneGraph.getChildren(nodeId);
      for (const child of children) {
        collectLinks(child.id);
      }
    };

    collectLinks(frameId);
  }

  /**
   * Schedule timeout triggers for current frame.
   */
  private scheduleTimeoutTriggers(): void {
    for (const [, link] of this.links) {
      if (link.trigger === 'AFTER_TIMEOUT' && link.delay) {
        this.interactionHandler.scheduleTimeout(link.sourceNodeId, link.delay);
      }
    }
  }

  /**
   * Start the animation loop.
   */
  private startLoop(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(this.tick);
  }

  /**
   * Stop the animation loop.
   */
  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Animation frame callback.
   */
  private tick = (_currentTime: number): void => {
    if (!this.stateManager.getState().isRunning) return;

    // Update transition if active
    if (this.currentTransition?.isActive) {
      // Transition progress available via getTransitionProgress()
      // Render system can query this for animation state
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * Emit an event.
   */
  private emit(event: PrototypePlayerEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

/**
 * Create a prototype player.
 */
export function createPrototypePlayer(
  options: PrototypePlayerOptions
): PrototypePlayer {
  return new PrototypePlayer(options);
}

/**
 * Get transition renderer info.
 */
export function getTransitionInfo(type: TransitionType): {
  needsSourceCapture: boolean;
  needsTargetPrerender: boolean;
  animatesPosition: boolean;
} {
  switch (type) {
    case 'INSTANT':
      return { needsSourceCapture: false, needsTargetPrerender: false, animatesPosition: false };
    case 'DISSOLVE':
      return { needsSourceCapture: true, needsTargetPrerender: true, animatesPosition: false };
    case 'SMART_ANIMATE':
      return { needsSourceCapture: false, needsTargetPrerender: false, animatesPosition: true };
    case 'MOVE_IN':
    case 'MOVE_OUT':
    case 'PUSH':
    case 'SLIDE_IN':
    case 'SLIDE_OUT':
      return { needsSourceCapture: true, needsTargetPrerender: true, animatesPosition: true };
    default:
      return { needsSourceCapture: false, needsTargetPrerender: false, animatesPosition: false };
  }
}
