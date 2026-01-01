/**
 * Prototype Player
 *
 * Main prototype playback component that orchestrates
 * state management, interaction handling, and transitions.
 */
import { resolveEasing } from '@animation/easing/presets';
import { prepareSmartAnimate } from '@animation/smart-animate';
import { createStateManager, } from './state-manager';
import { createInteractionHandler, } from './interaction-handler';
/**
 * Prototype player for running interactive prototypes.
 */
export class PrototypePlayer {
    sceneGraph;
    stateManager;
    interactionHandler;
    listeners = new Set();
    links = new Map(); // nodeId:trigger -> link
    getLinksForNode;
    currentTransition = null;
    rafId = null;
    constructor(options) {
        this.sceneGraph = options.sceneGraph;
        this.getLinksForNode = options.getLinks;
        this.stateManager = createStateManager(options.initialFrameId);
        // Build link lookup map
        this.buildLinkMap(options.initialFrameId);
        // Create interaction handler
        this.interactionHandler = createInteractionHandler(options.hitTest, (nodeId, trigger) => {
            const key = `${nodeId}:${trigger}`;
            return this.links.get(key) ?? null;
        });
        // Listen for trigger events
        this.interactionHandler.addListener(this.handleTrigger);
    }
    /**
     * Start the prototype.
     */
    start() {
        this.stateManager.start();
        this.emit({ type: 'start', frameId: this.stateManager.getState().currentFrame });
        this.startLoop();
        this.scheduleTimeoutTriggers();
    }
    /**
     * Stop the prototype.
     */
    stop() {
        this.stopLoop();
        this.interactionHandler.clearAllTimers();
        this.stateManager.stop();
        this.emit({ type: 'stop' });
    }
    /**
     * Reset to initial state.
     */
    reset(initialFrameId) {
        this.stopLoop();
        this.interactionHandler.clearAllTimers();
        this.currentTransition = null;
        this.stateManager.reset(initialFrameId ?? this.stateManager.getState().currentFrame);
        this.buildLinkMap(this.stateManager.getState().currentFrame);
    }
    /**
     * Get current frame ID.
     */
    getCurrentFrame() {
        return this.stateManager.getVisibleFrame();
    }
    /**
     * Get current transition progress (0-1, null if no transition).
     */
    getTransitionProgress() {
        if (!this.currentTransition?.isActive)
            return null;
        const elapsed = performance.now() - this.currentTransition.startTime;
        return Math.min(elapsed / this.currentTransition.link.duration, 1);
    }
    /**
     * Check if a transition is in progress.
     */
    isTransitioning() {
        return this.currentTransition?.isActive ?? false;
    }
    /**
     * Navigate back.
     */
    goBack() {
        if (this.currentTransition?.isActive)
            return false;
        return this.stateManager.goBack();
    }
    /**
     * Navigate forward.
     */
    goForward() {
        if (this.currentTransition?.isActive)
            return false;
        return this.stateManager.goForward();
    }
    /**
     * Close current overlay.
     */
    closeOverlay() {
        return this.stateManager.closeOverlay();
    }
    /**
     * Add event listener.
     */
    addEventListener(listener) {
        this.listeners.add(listener);
    }
    /**
     * Remove event listener.
     */
    removeEventListener(listener) {
        this.listeners.delete(listener);
    }
    /**
     * Get state manager (for external access).
     */
    getStateManager() {
        return this.stateManager;
    }
    /**
     * Get interaction handler (for external access).
     */
    getInteractionHandler() {
        return this.interactionHandler;
    }
    /**
     * Dispose the player.
     */
    dispose() {
        this.stop();
        this.interactionHandler.dispose();
        this.listeners.clear();
        this.links.clear();
    }
    /**
     * Handle a trigger event.
     */
    handleTrigger = (event) => {
        if (!event.link)
            return;
        if (this.currentTransition?.isActive)
            return;
        this.executeTransition(event.link);
    };
    /**
     * Execute a transition.
     */
    async executeTransition(link) {
        const sourceFrameId = this.stateManager.getState().currentFrame;
        const targetFrameId = link.targetNodeId;
        // Prepare Smart Animate if needed
        let smartAnimate = null;
        if (link.transition === 'SMART_ANIMATE') {
            smartAnimate = prepareSmartAnimate({
                sourceFrameId,
                targetFrameId,
                duration: link.duration,
                easing: resolveEasing(link.easing),
            }, this.sceneGraph);
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
            const overlayOptions = {
                background: link.overlay.background ?? 'NONE',
                backgroundOpacity: link.overlay.backgroundOpacity ?? 0.5,
            };
            if (link.overlay.closeOnOutsideClick !== undefined) {
                overlayOptions.closeOnOutsideClick = link.overlay.closeOnOutsideClick;
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
    }
    ;
    /**
     * Wait for a transition to complete.
     */
    waitForTransition(duration) {
        return new Promise((resolve) => {
            setTimeout(resolve, duration);
        });
    }
    /**
     * Build link lookup map for current frame.
     */
    buildLinkMap(frameId) {
        this.links.clear();
        // Get all nodes in the frame
        const collectLinks = (nodeId) => {
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
    scheduleTimeoutTriggers() {
        for (const [, link] of this.links) {
            if (link.trigger === 'AFTER_TIMEOUT' && link.delay) {
                this.interactionHandler.scheduleTimeout(link.sourceNodeId, link.delay);
            }
        }
    }
    /**
     * Start the animation loop.
     */
    startLoop() {
        if (this.rafId !== null)
            return;
        this.rafId = requestAnimationFrame(this.tick);
    }
    /**
     * Stop the animation loop.
     */
    stopLoop() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
    /**
     * Animation frame callback.
     */
    tick = (_currentTime) => {
        if (!this.stateManager.getState().isRunning)
            return;
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
    emit(event) {
        this.listeners.forEach((listener) => listener(event));
    }
}
/**
 * Create a prototype player.
 */
export function createPrototypePlayer(options) {
    return new PrototypePlayer(options);
}
/**
 * Get transition renderer info.
 */
export function getTransitionInfo(type) {
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
//# sourceMappingURL=prototype-player.js.map