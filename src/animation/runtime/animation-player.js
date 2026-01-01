/**
 * Animation Player
 *
 * Main animation runtime that plays animations using requestAnimationFrame.
 * Supports multiple concurrent animations with proper lifecycle management.
 */
import { resolveEasing } from '../easing/presets';
import { createAnimationTarget, getAnimatedPropertyValue } from './property-animator';
/**
 * Animation player for running animations via RAF.
 */
export class AnimationPlayer {
    animations = new Map();
    animationDefinitions = new Map();
    listeners = new Map();
    rafId = null;
    lastFrameTime = 0;
    isRunning = false;
    getNode;
    updateNode;
    options;
    constructor(getNode, updateNode, options = {}) {
        this.getNode = getNode;
        this.updateNode = updateNode;
        this.options = {
            autoStart: options.autoStart ?? true,
            defaultPlaybackRate: options.defaultPlaybackRate ?? 1,
        };
    }
    /**
     * Register an animation definition.
     */
    registerAnimation(animation) {
        this.animationDefinitions.set(animation.id, animation);
    }
    /**
     * Get an animation definition by ID.
     */
    getAnimation(id) {
        return this.animationDefinitions.get(id);
    }
    /**
     * Play an animation on a target node.
     * Returns a unique instance ID.
     */
    play(animationId, targetNodeId) {
        const animation = this.animationDefinitions.get(animationId);
        if (!animation) {
            throw new Error(`Animation not found: ${animationId}`);
        }
        // Create instance
        const instanceId = generateInstanceId();
        const instance = {
            animationId,
            targetNodeId,
            state: 'running',
            startTime: performance.now(),
            elapsedTime: 0,
            currentIteration: 0,
            playbackRate: this.options.defaultPlaybackRate,
            isPaused: false,
        };
        // Create target
        const target = createAnimationTarget(targetNodeId, this.getNode, this.updateNode);
        // Resolve easing
        const easing = animation.easing
            ? resolveEasing(animation.easing)
            : (t) => t;
        this.animations.set(instanceId, {
            animation,
            instance,
            target,
            easing,
        });
        // Emit start event
        this.emit('start', animation, instance);
        // Start the animation loop if needed
        if (this.options.autoStart && !this.isRunning) {
            this.start();
        }
        return instanceId;
    }
    /**
     * Pause a running animation.
     */
    pause(instanceId) {
        const running = this.animations.get(instanceId);
        if (!running || running.instance.state !== 'running')
            return;
        running.instance.state = 'paused';
        running.instance.isPaused = true;
        this.emit('pause', running.animation, running.instance);
    }
    /**
     * Resume a paused animation.
     */
    resume(instanceId) {
        const running = this.animations.get(instanceId);
        if (!running || running.instance.state !== 'paused')
            return;
        running.instance.state = 'running';
        running.instance.isPaused = false;
        running.instance.startTime = performance.now() - running.instance.elapsedTime;
        this.emit('resume', running.animation, running.instance);
    }
    /**
     * Stop and remove an animation.
     */
    stop(instanceId) {
        const running = this.animations.get(instanceId);
        if (!running)
            return;
        running.instance.state = 'finished';
        this.emit('cancel', running.animation, running.instance);
        this.animations.delete(instanceId);
        // Stop the loop if no animations left
        if (this.animations.size === 0) {
            this.stopLoop();
        }
    }
    /**
     * Stop all animations.
     */
    stopAll() {
        for (const instanceId of this.animations.keys()) {
            this.stop(instanceId);
        }
    }
    /**
     * Seek an animation to a specific time.
     */
    seek(instanceId, time) {
        const running = this.animations.get(instanceId);
        if (!running)
            return;
        running.instance.elapsedTime = Math.max(0, Math.min(time, running.animation.duration));
        running.instance.startTime = performance.now() - running.instance.elapsedTime;
        // Apply values at this time
        this.applyAnimationValues(running, running.instance.elapsedTime);
    }
    /**
     * Set playback rate for an animation.
     */
    setPlaybackRate(instanceId, rate) {
        const running = this.animations.get(instanceId);
        if (!running)
            return;
        running.instance.playbackRate = Math.max(0.1, Math.min(10, rate));
    }
    /**
     * Get the current state of an animation.
     */
    getState(instanceId) {
        return this.animations.get(instanceId)?.instance.state;
    }
    /**
     * Get the current progress of an animation (0-1).
     */
    getProgress(instanceId) {
        const running = this.animations.get(instanceId);
        if (!running)
            return undefined;
        return running.instance.elapsedTime / running.animation.duration;
    }
    /**
     * Add an event listener.
     */
    addEventListener(type, listener) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(listener);
    }
    /**
     * Remove an event listener.
     */
    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }
    /**
     * Start the animation loop.
     */
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.lastFrameTime = performance.now();
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
        this.isRunning = false;
    }
    /**
     * Animation frame callback.
     */
    tick = (currentTime) => {
        if (!this.isRunning)
            return;
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        // Update all running animations
        const finishedAnimations = [];
        for (const [instanceId, running] of this.animations) {
            if (running.instance.state !== 'running')
                continue;
            // Update elapsed time
            running.instance.elapsedTime += deltaTime * running.instance.playbackRate;
            // Apply animated values
            this.applyAnimationValues(running, running.instance.elapsedTime);
            // Check if animation is complete
            const totalDuration = running.animation.duration * (running.animation.iterations ?? 1);
            if (running.instance.elapsedTime >= totalDuration) {
                // Check for iterations
                const maxIterations = running.animation.iterations ?? 1;
                const newIteration = Math.floor(running.instance.elapsedTime / running.animation.duration);
                if (newIteration > running.instance.currentIteration) {
                    if (newIteration >= maxIterations && maxIterations !== Infinity) {
                        // Animation finished
                        finishedAnimations.push(instanceId);
                    }
                    else {
                        // New iteration
                        running.instance.currentIteration = newIteration;
                        this.emit('iteration', running.animation, running.instance);
                    }
                }
            }
        }
        // Clean up finished animations
        for (const instanceId of finishedAnimations) {
            const running = this.animations.get(instanceId);
            if (running) {
                running.instance.state = 'finished';
                // Apply fill mode
                if (running.animation.fillMode === 'forwards' || running.animation.fillMode === 'both') {
                    this.applyAnimationValues(running, running.animation.duration);
                }
                this.emit('end', running.animation, running.instance);
                this.animations.delete(instanceId);
            }
        }
        // Continue loop if there are still animations
        if (this.animations.size > 0) {
            this.rafId = requestAnimationFrame(this.tick);
        }
        else {
            this.stopLoop();
        }
    };
    /**
     * Apply animated values to the target at the given time.
     */
    applyAnimationValues(running, elapsedTime) {
        const { animation, target, easing } = running;
        const duration = animation.duration;
        // Calculate normalized time for current iteration
        let normalizedTime = (elapsedTime % duration) / duration;
        // Handle direction
        const direction = animation.direction ?? 'normal';
        const currentIteration = Math.floor(elapsedTime / duration);
        if (direction === 'reverse') {
            normalizedTime = 1 - normalizedTime;
        }
        else if (direction === 'alternate') {
            if (currentIteration % 2 === 1) {
                normalizedTime = 1 - normalizedTime;
            }
        }
        else if (direction === 'alternate-reverse') {
            if (currentIteration % 2 === 0) {
                normalizedTime = 1 - normalizedTime;
            }
        }
        // Clamp
        normalizedTime = Math.max(0, Math.min(1, normalizedTime));
        // Apply each property
        for (const property of animation.properties) {
            const value = getAnimatedPropertyValue(property, normalizedTime, easing);
            target.setValue(property.path, value);
        }
    }
    /**
     * Emit an animation event.
     */
    emit(type, animation, instance) {
        const event = {
            type,
            animationId: animation.id,
            targetNodeId: instance.targetNodeId,
            elapsedTime: instance.elapsedTime,
            iteration: instance.currentIteration,
        };
        this.listeners.get(type)?.forEach((listener) => listener(event));
    }
    /**
     * Get the number of running animations.
     */
    get runningCount() {
        return this.animations.size;
    }
    /**
     * Check if any animations are running.
     */
    get hasAnimations() {
        return this.animations.size > 0;
    }
    /**
     * Dispose the player and clean up.
     */
    dispose() {
        this.stopAll();
        this.listeners.clear();
        this.animationDefinitions.clear();
    }
}
/**
 * Generate a unique instance ID.
 */
function generateInstanceId() {
    return `instance_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
/**
 * Create a simple animation player for testing or standalone use.
 */
export function createSimplePlayer() {
    const nodes = new Map();
    const getNode = (id) => nodes.get(id);
    const updateNode = (id, updates) => {
        const node = nodes.get(id) ?? {};
        Object.assign(node, updates);
        nodes.set(id, node);
    };
    const player = new AnimationPlayer(getNode, updateNode);
    return { player, nodes };
}
//# sourceMappingURL=animation-player.js.map