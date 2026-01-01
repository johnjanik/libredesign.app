/**
 * Animation Timeline
 *
 * Manages sequences of animations with timing and coordination.
 * Supports parallel and sequential animation groups.
 */
/**
 * Create a timeline controller.
 */
export function createTimelineController(timeline, getAnimation) {
    let state = 'idle';
    let currentTime = 0;
    let iteration = 0;
    let playbackRate = 1;
    const listeners = new Map();
    // Calculate actual duration including all animation durations
    let calculatedDuration = timeline.duration;
    for (const entry of timeline.entries) {
        const animation = getAnimation(entry.animationId);
        if (animation) {
            const endTime = entry.startOffset + animation.duration;
            calculatedDuration = Math.max(calculatedDuration, endTime);
        }
    }
    const emit = (type) => {
        const event = {
            type,
            timelineId: timeline.id,
            currentTime,
            iteration,
        };
        listeners.get(type)?.forEach((listener) => listener(event));
    };
    const controller = {
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
            }
            else if (state === 'paused') {
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
        seek(time) {
            currentTime = Math.max(0, Math.min(time, calculatedDuration));
        },
        setPlaybackRate(rate) {
            playbackRate = Math.max(0.1, Math.min(10, rate));
        },
        addEventListener(type, listener) {
            if (!listeners.has(type)) {
                listeners.set(type, new Set());
            }
            listeners.get(type).add(listener);
        },
        removeEventListener(type, listener) {
            listeners.get(type)?.delete(listener);
        },
        getProgress() {
            if (calculatedDuration === 0)
                return 1;
            return currentTime / calculatedDuration;
        },
        update(deltaTime) {
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
                }
                else {
                    currentTime = calculatedDuration;
                    state = 'finished';
                    emit('finish');
                }
            }
            // Find active animations
            const activeAnimations = [];
            for (const entry of timeline.entries) {
                const animation = getAnimation(entry.animationId);
                if (!animation)
                    continue;
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
    entries = [];
    currentOffset = 0;
    name = undefined;
    loop = false;
    constructor(name) {
        if (name !== undefined) {
            this.name = name;
        }
    }
    /**
     * Add an animation at the current offset.
     */
    add(animationId, targetNodeId, duration) {
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
    addAt(time, animationId, targetNodeId) {
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
    delay(ms) {
        this.currentOffset += ms;
        return this;
    }
    /**
     * Set the loop flag.
     */
    setLoop(loop) {
        this.loop = loop;
        return this;
    }
    /**
     * Build the timeline.
     */
    build() {
        let duration = 0;
        for (const entry of this.entries) {
            duration = Math.max(duration, entry.startOffset);
        }
        const result = {
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
export function createSequence(animations, options = {}) {
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
export function createParallel(animations, options = {}) {
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
export function createStagger(animations, staggerDelay, options = {}) {
    const builder = new TimelineBuilder(options.name);
    for (let i = 0; i < animations.length; i++) {
        const anim = animations[i];
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
function generateTimelineId() {
    return `timeline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
//# sourceMappingURL=timeline.js.map