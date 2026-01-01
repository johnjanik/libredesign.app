/**
 * Property Animator
 *
 * Handles animating individual properties on nodes.
 * Supports various property types with appropriate interpolation.
 */
import { resolveEasing } from '../easing/presets';
/**
 * Create a property animation.
 */
export function createPropertyAnimation(target, property, duration, easing = 'linear') {
    return {
        target,
        property,
        defaultEasing: typeof easing === 'function' ? easing : resolveEasing(easing),
        startTime: 0,
        duration,
        isComplete: false,
    };
}
/**
 * Update a property animation at the current time.
 */
export function updatePropertyAnimation(animation, currentTime) {
    if (animation.isComplete)
        return;
    const elapsed = currentTime - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);
    // Get interpolated value
    const value = getAnimatedPropertyValue(animation.property, progress, animation.defaultEasing);
    // Apply value to target
    animation.target.setValue(animation.property.path, value);
    // Check if complete
    if (progress >= 1) {
        animation.isComplete = true;
    }
}
/**
 * Interpolate a number property.
 */
export function interpolateNumber(keyframes, time, defaultEasing) {
    if (keyframes.length === 0)
        return 0;
    if (keyframes.length === 1)
        return keyframes[0].value;
    // Find surrounding keyframes
    let prevFrame = keyframes[0];
    let nextFrame = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i++) {
        if (keyframes[i].time <= time && keyframes[i + 1].time > time) {
            prevFrame = keyframes[i];
            nextFrame = keyframes[i + 1];
            break;
        }
    }
    // Handle edge cases
    if (time <= prevFrame.time)
        return prevFrame.value;
    if (time >= nextFrame.time)
        return nextFrame.value;
    // Calculate local progress
    const localT = (time - prevFrame.time) / (nextFrame.time - prevFrame.time);
    const easing = prevFrame.easing ?? defaultEasing;
    const easedT = easing(localT);
    // Linear interpolation
    return prevFrame.value + (nextFrame.value - prevFrame.value) * easedT;
}
/**
 * Interpolate a color property.
 */
export function interpolateColor(keyframes, time, defaultEasing) {
    if (keyframes.length === 0)
        return { r: 0, g: 0, b: 0, a: 1 };
    if (keyframes.length === 1)
        return keyframes[0].value;
    // Find surrounding keyframes
    let prevFrame = keyframes[0];
    let nextFrame = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i++) {
        if (keyframes[i].time <= time && keyframes[i + 1].time > time) {
            prevFrame = keyframes[i];
            nextFrame = keyframes[i + 1];
            break;
        }
    }
    if (time <= prevFrame.time)
        return prevFrame.value;
    if (time >= nextFrame.time)
        return nextFrame.value;
    const localT = (time - prevFrame.time) / (nextFrame.time - prevFrame.time);
    const easing = prevFrame.easing ?? defaultEasing;
    const easedT = easing(localT);
    // Interpolate each channel
    return {
        r: prevFrame.value.r + (nextFrame.value.r - prevFrame.value.r) * easedT,
        g: prevFrame.value.g + (nextFrame.value.g - prevFrame.value.g) * easedT,
        b: prevFrame.value.b + (nextFrame.value.b - prevFrame.value.b) * easedT,
        a: prevFrame.value.a + (nextFrame.value.a - prevFrame.value.a) * easedT,
    };
}
/**
 * Interpolate a point property.
 */
export function interpolatePoint(keyframes, time, defaultEasing) {
    if (keyframes.length === 0)
        return { x: 0, y: 0 };
    if (keyframes.length === 1)
        return keyframes[0].value;
    let prevFrame = keyframes[0];
    let nextFrame = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i++) {
        if (keyframes[i].time <= time && keyframes[i + 1].time > time) {
            prevFrame = keyframes[i];
            nextFrame = keyframes[i + 1];
            break;
        }
    }
    if (time <= prevFrame.time)
        return prevFrame.value;
    if (time >= nextFrame.time)
        return nextFrame.value;
    const localT = (time - prevFrame.time) / (nextFrame.time - prevFrame.time);
    const easing = prevFrame.easing ?? defaultEasing;
    const easedT = easing(localT);
    return {
        x: prevFrame.value.x + (nextFrame.value.x - prevFrame.value.x) * easedT,
        y: prevFrame.value.y + (nextFrame.value.y - prevFrame.value.y) * easedT,
    };
}
/**
 * Get the value type for a property path.
 */
export function getPropertyValueType(path) {
    // Color properties
    if (path.includes('color') || path.includes('Color') || path.endsWith('.fill') || path.endsWith('.stroke')) {
        return 'color';
    }
    // Point properties
    if (path === 'position' || path.endsWith('Position') || path.includes('point')) {
        return 'point';
    }
    // Common number properties
    const numberProps = [
        'x', 'y', 'width', 'height', 'rotation', 'opacity',
        'scaleX', 'scaleY', 'cornerRadius', 'strokeWeight',
        'blur', 'radius', 'offset', 'spread',
    ];
    for (const prop of numberProps) {
        if (path === prop || path.endsWith(`.${prop}`)) {
            return 'number';
        }
    }
    return 'unknown';
}
/**
 * Get animated property value at a specific time.
 * Dispatches to the appropriate interpolation function based on property type.
 */
export function getAnimatedPropertyValue(property, time, defaultEasing) {
    const valueType = getPropertyValueType(property.path);
    switch (valueType) {
        case 'number':
            return interpolateNumber(property.keyframes, time, defaultEasing);
        case 'color':
            return interpolateColor(property.keyframes, time, defaultEasing);
        case 'point':
            return interpolatePoint(property.keyframes, time, defaultEasing);
        default:
            // For unknown types, use discrete switching at keyframe times
            for (let i = property.keyframes.length - 1; i >= 0; i--) {
                if (time >= property.keyframes[i].time) {
                    return property.keyframes[i].value;
                }
            }
            return property.keyframes[0]?.value;
    }
}
/**
 * Create animation targets from a node update function.
 */
export function createAnimationTarget(nodeId, getNode, updateNode) {
    return {
        nodeId,
        getValue(path) {
            const node = getNode(nodeId);
            if (!node)
                return undefined;
            // Handle nested paths
            const parts = path.split('.');
            let value = node;
            for (const part of parts) {
                if (value && typeof value === 'object') {
                    value = value[part];
                }
                else {
                    return undefined;
                }
            }
            return value;
        },
        setValue(path, value) {
            // Handle nested paths by creating update object
            const parts = path.split('.');
            const updates = {};
            if (parts.length === 1) {
                updates[path] = value;
            }
            else {
                // Build nested update object
                let current = updates;
                for (let i = 0; i < parts.length - 1; i++) {
                    current[parts[i]] = {};
                    current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = value;
            }
            updateNode(nodeId, updates);
        },
    };
}
//# sourceMappingURL=property-animator.js.map