/**
 * Animation Types
 *
 * Core animation type definitions.
 */
/**
 * Create an animation.
 */
export function createAnimation(properties, options = {}) {
    const animation = {
        id: generateAnimationId(),
        duration: options.duration ?? 300,
        iterations: options.iterations ?? 1,
        direction: options.direction ?? 'normal',
        fillMode: options.fillMode ?? 'none',
        properties,
    };
    if (options.name !== undefined) {
        animation.name = options.name;
    }
    if (options.delay !== undefined) {
        animation.delay = options.delay;
    }
    if (options.easing !== undefined) {
        animation.easing = options.easing;
    }
    return animation;
}
/**
 * Create an animation instance.
 */
export function createAnimationInstance(animationId, targetNodeId) {
    return {
        animationId,
        targetNodeId,
        state: 'idle',
        startTime: 0,
        elapsedTime: 0,
        currentIteration: 0,
        playbackRate: 1,
        isPaused: false,
    };
}
/**
 * Create an animation timeline.
 */
export function createTimeline(entries, options = {}) {
    // Calculate total duration from entries
    let duration = 0;
    for (const entry of entries) {
        // Would need animation duration lookup here
        // For now, just use start offset as minimum duration
        duration = Math.max(duration, entry.startOffset);
    }
    const timeline = {
        id: generateTimelineId(),
        entries,
        duration,
    };
    if (options.name !== undefined) {
        timeline.name = options.name;
    }
    if (options.loop !== undefined) {
        timeline.loop = options.loop;
    }
    return timeline;
}
/**
 * Generate a unique animation ID.
 */
function generateAnimationId() {
    return `anim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
/**
 * Generate a unique timeline ID.
 */
function generateTimelineId() {
    return `timeline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
//# sourceMappingURL=animation.js.map