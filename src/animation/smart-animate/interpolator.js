/**
 * Smart Animate Interpolator
 *
 * Interpolates between source and target node states during Smart Animate.
 * Handles different property types with appropriate interpolation methods.
 */
const DEFAULT_OPTIONS = {
    easing: (t) => t,
    fadeDuration: 0.3,
};
/**
 * Interpolate all node states for a given progress value.
 */
export function interpolateFrame(progress, diffs, sourceNodes, targetNodes, fadeOutIds, fadeInIds, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const t = opts.easing(Math.max(0, Math.min(1, progress)));
    // Interpolate matched nodes
    const matched = diffs.map((diff) => {
        const sourceNode = sourceNodes.get(diff.sourceId);
        return interpolateNode(diff, sourceNode, t);
    });
    // Calculate fade out states
    const fadeOut = fadeOutIds.map((id) => {
        const node = sourceNodes.get(id);
        const fadeProgress = Math.min(progress / opts.fadeDuration, 1);
        return createFadeOutState(id, node, fadeProgress);
    });
    // Calculate fade in states
    const fadeIn = fadeInIds.map((id) => {
        const node = targetNodes.get(id);
        const fadeStart = 1 - opts.fadeDuration;
        const fadeProgress = Math.max(0, (progress - fadeStart) / opts.fadeDuration);
        return createFadeInState(id, node, fadeProgress);
    });
    return { matched, fadeOut, fadeIn };
}
/**
 * Interpolate a single matched node.
 */
function interpolateNode(diff, sourceNode, t) {
    const values = {};
    // Start with source values
    if (sourceNode) {
        copyNodeValues(sourceNode, values);
    }
    // Apply interpolated property changes
    for (const prop of diff.properties) {
        if (prop.significant) {
            values[prop.path] = interpolateProperty(prop, t);
        }
    }
    return {
        nodeId: diff.targetId,
        values,
        opacity: typeof values['opacity'] === 'number' ? values['opacity'] : 1,
        fadingIn: false,
        fadingOut: false,
    };
}
/**
 * Interpolate a single property value.
 */
function interpolateProperty(prop, t) {
    switch (prop.type) {
        case 'number':
        case 'opacity':
            return lerpNumber(prop.from, prop.to, t);
        case 'color':
            return lerpColor(prop.from, prop.to, t);
        case 'point':
            return lerpPoint(prop.from, prop.to, t);
        case 'size':
            return {
                width: lerpNumber(prop.from.width, prop.to.width, t),
                height: lerpNumber(prop.from.height, prop.to.height, t),
            };
        case 'path':
            // Path interpolation is handled separately by the morph module
            return t < 0.5 ? prop.from : prop.to;
        case 'transform':
            // Transform interpolation
            return interpolateTransform(prop.from, prop.to, t);
        default:
            // For unknown types, snap at 50%
            return t < 0.5 ? prop.from : prop.to;
    }
}
/**
 * Linear interpolation for numbers.
 */
function lerpNumber(a, b, t) {
    return a + (b - a) * t;
}
/**
 * Linear interpolation for colors.
 */
function lerpColor(a, b, t) {
    return {
        r: lerpNumber(a.r, b.r, t),
        g: lerpNumber(a.g, b.g, t),
        b: lerpNumber(a.b, b.b, t),
        a: lerpNumber(a.a, b.a, t),
    };
}
/**
 * Linear interpolation for points.
 */
function lerpPoint(a, b, t) {
    return {
        x: lerpNumber(a.x, b.x, t),
        y: lerpNumber(a.y, b.y, t),
    };
}
/**
 * Interpolate transform values.
 */
function interpolateTransform(a, b, t) {
    return {
        x: lerpNumber(a.x ?? 0, b.x ?? 0, t),
        y: lerpNumber(a.y ?? 0, b.y ?? 0, t),
        rotation: lerpAngle(a.rotation ?? 0, b.rotation ?? 0, t),
        scaleX: lerpNumber(a.scaleX ?? 1, b.scaleX ?? 1, t),
        scaleY: lerpNumber(a.scaleY ?? 1, b.scaleY ?? 1, t),
    };
}
/**
 * Interpolate angles, taking the shortest path.
 */
function lerpAngle(a, b, t) {
    // Normalize angles to 0-360
    a = ((a % 360) + 360) % 360;
    b = ((b % 360) + 360) % 360;
    // Find shortest path
    let delta = b - a;
    if (delta > 180)
        delta -= 360;
    if (delta < -180)
        delta += 360;
    return a + delta * t;
}
/**
 * Create fade-out state for a source-only node.
 */
function createFadeOutState(nodeId, node, fadeProgress) {
    const values = {};
    if (node) {
        copyNodeValues(node, values);
    }
    // Fade opacity
    const baseOpacity = typeof values['opacity'] === 'number' ? values['opacity'] : 1;
    const opacity = baseOpacity * (1 - fadeProgress);
    return {
        nodeId,
        values,
        opacity,
        fadingIn: false,
        fadingOut: true,
    };
}
/**
 * Create fade-in state for a target-only node.
 */
function createFadeInState(nodeId, node, fadeProgress) {
    const values = {};
    if (node) {
        copyNodeValues(node, values);
    }
    // Fade opacity
    const baseOpacity = typeof values['opacity'] === 'number' ? values['opacity'] : 1;
    const opacity = baseOpacity * fadeProgress;
    return {
        nodeId,
        values,
        opacity,
        fadingIn: true,
        fadingOut: false,
    };
}
/**
 * Copy relevant node values to a record.
 */
function copyNodeValues(node, values) {
    const props = [
        'x',
        'y',
        'width',
        'height',
        'rotation',
        'opacity',
        'cornerRadius',
        'topLeftRadius',
        'topRightRadius',
        'bottomLeftRadius',
        'bottomRightRadius',
        'strokeWeight',
    ];
    for (const prop of props) {
        if (prop in node) {
            values[prop] = node[prop];
        }
    }
    const fills = node.fills;
    if (fills?.[0]?.color) {
        values['fills.0.color'] = fills[0].color;
    }
    const strokes = node.strokes;
    if (strokes?.[0]?.color) {
        values['strokes.0.color'] = strokes[0].color;
    }
}
/**
 * Apply interpolated values to a node.
 * Returns a new node data object with the interpolated values.
 */
export function applyInterpolation(baseNode, state) {
    const result = { ...baseNode };
    // Apply simple properties
    for (const [path, value] of Object.entries(state.values)) {
        if (!path.includes('.')) {
            result[path] = value;
        }
    }
    // Apply nested properties
    if ('fills.0.color' in state.values) {
        const fills = result['fills'];
        if (fills?.[0]) {
            result['fills'] = [
                { ...fills[0], color: state.values['fills.0.color'] },
                ...fills.slice(1),
            ];
        }
    }
    if ('strokes.0.color' in state.values) {
        const strokes = result['strokes'];
        if (strokes?.[0]) {
            result['strokes'] = [
                { ...strokes[0], color: state.values['strokes.0.color'] },
                ...strokes.slice(1),
            ];
        }
    }
    // Ensure opacity reflects fade state
    result['opacity'] = state.opacity;
    return result;
}
/**
 * Create an interpolation function for a specific node pair.
 */
export function createNodeInterpolator(diff, sourceNode, easing = (t) => t) {
    return (t) => {
        const easedT = easing(Math.max(0, Math.min(1, t)));
        return interpolateNode(diff, sourceNode, easedT);
    };
}
//# sourceMappingURL=interpolator.js.map