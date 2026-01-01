/**
 * Keyframe Types
 *
 * Defines keyframes for animation properties.
 */
/**
 * Create a keyframe.
 */
export function createKeyframe(time, value, easing) {
    const keyframe = { time, value };
    if (easing !== undefined) {
        keyframe.easing = easing;
    }
    return keyframe;
}
/**
 * Create an animated property.
 */
export function createAnimatedProperty(path, keyframes) {
    // Sort keyframes by time
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    return { path, keyframes: sorted };
}
/**
 * Create a simple two-keyframe animation (from -> to).
 */
export function createSimpleAnimation(path, from, to, easing) {
    return createAnimatedProperty(path, [
        createKeyframe(0, from),
        createKeyframe(1, to, easing),
    ]);
}
/**
 * Get the value of an animated property at a given time.
 * Returns the interpolated value based on keyframes.
 */
export function getValueAtTime(property, time, interpolate) {
    const { keyframes } = property;
    if (keyframes.length === 0) {
        throw new Error('AnimatedProperty has no keyframes');
    }
    if (keyframes.length === 1 || time <= keyframes[0].time) {
        return keyframes[0].value;
    }
    if (time >= keyframes[keyframes.length - 1].time) {
        return keyframes[keyframes.length - 1].value;
    }
    // Find the two keyframes to interpolate between
    let i = 0;
    for (; i < keyframes.length - 1; i++) {
        if (time < keyframes[i + 1].time) {
            break;
        }
    }
    const k0 = keyframes[i];
    const k1 = keyframes[i + 1];
    // Calculate local time (0-1 between these two keyframes)
    const localTime = (time - k0.time) / (k1.time - k0.time);
    // Apply easing if specified on target keyframe
    const easedTime = k1.easing ? k1.easing(localTime) : localTime;
    return interpolate(k0.value, k1.value, easedTime);
}
/**
 * Linear interpolation for numbers.
 */
export function lerpNumber(a, b, t) {
    return a + (b - a) * t;
}
/**
 * Linear interpolation for colors.
 */
export function lerpColor(a, b, t) {
    return [
        lerpNumber(a[0], b[0], t),
        lerpNumber(a[1], b[1], t),
        lerpNumber(a[2], b[2], t),
        lerpNumber(a[3], b[3], t),
    ];
}
/**
 * Linear interpolation for points.
 */
export function lerpPoint(a, b, t) {
    return {
        x: lerpNumber(a.x, b.x, t),
        y: lerpNumber(a.y, b.y, t),
    };
}
//# sourceMappingURL=keyframe.js.map