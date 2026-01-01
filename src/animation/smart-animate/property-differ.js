/**
 * Property Differ
 *
 * Calculates property differences between matched nodes for Smart Animate.
 * Determines which properties changed and how to interpolate them.
 */
const DEFAULT_DIFF_OPTIONS = {
    numberThreshold: 0.01,
    colorThreshold: 2,
    diffPaths: true,
};
/**
 * Calculate differences between two matched nodes.
 */
export function diffNodes(sourceNode, targetNode, options = {}) {
    const opts = { ...DEFAULT_DIFF_OPTIONS, ...options };
    const diffs = [];
    let needsPathMorph = false;
    // Transform properties
    diffTransformProperties(sourceNode, targetNode, diffs, opts);
    // Size properties
    diffSizeProperties(sourceNode, targetNode, diffs, opts);
    // Opacity
    diffOpacity(sourceNode, targetNode, diffs, opts);
    // Fill properties
    diffFillProperties(sourceNode, targetNode, diffs, opts);
    // Stroke properties
    diffStrokeProperties(sourceNode, targetNode, diffs, opts);
    // Corner radius
    diffCornerRadius(sourceNode, targetNode, diffs, opts);
    // Path data (for vector nodes)
    if (opts.diffPaths) {
        const pathDiff = diffPathData(sourceNode, targetNode, opts);
        if (pathDiff) {
            diffs.push(pathDiff);
            needsPathMorph = true;
        }
    }
    // Effects (blur, shadow, etc.)
    diffEffects(sourceNode, targetNode, diffs, opts);
    const significantDiffs = diffs.filter((d) => d.significant);
    return {
        sourceId: sourceNode.id,
        targetId: targetNode.id,
        properties: diffs,
        hasChanges: significantDiffs.length > 0,
        needsPathMorph,
    };
}
/**
 * Diff transform properties (x, y, rotation).
 */
function diffTransformProperties(source, target, diffs, opts) {
    // Position
    if ('x' in source && 'x' in target) {
        const sx = source.x;
        const tx = target.x;
        if (Math.abs(sx - tx) > opts.numberThreshold) {
            diffs.push({
                path: 'x',
                type: 'number',
                from: sx,
                to: tx,
                significant: true,
            });
        }
    }
    if ('y' in source && 'y' in target) {
        const sy = source.y;
        const ty = target.y;
        if (Math.abs(sy - ty) > opts.numberThreshold) {
            diffs.push({
                path: 'y',
                type: 'number',
                from: sy,
                to: ty,
                significant: true,
            });
        }
    }
    // Rotation
    if ('rotation' in source && 'rotation' in target) {
        const sr = source.rotation;
        const tr = target.rotation;
        if (Math.abs(sr - tr) > opts.numberThreshold) {
            diffs.push({
                path: 'rotation',
                type: 'number',
                from: sr,
                to: tr,
                significant: true,
            });
        }
    }
}
/**
 * Diff size properties (width, height).
 */
function diffSizeProperties(source, target, diffs, opts) {
    if ('width' in source && 'width' in target) {
        const sw = source.width;
        const tw = target.width;
        if (Math.abs(sw - tw) > opts.numberThreshold) {
            diffs.push({
                path: 'width',
                type: 'number',
                from: sw,
                to: tw,
                significant: true,
            });
        }
    }
    if ('height' in source && 'height' in target) {
        const sh = source.height;
        const th = target.height;
        if (Math.abs(sh - th) > opts.numberThreshold) {
            diffs.push({
                path: 'height',
                type: 'number',
                from: sh,
                to: th,
                significant: true,
            });
        }
    }
}
/**
 * Diff opacity.
 */
function diffOpacity(source, target, diffs, opts) {
    if ('opacity' in source && 'opacity' in target) {
        const so = source.opacity;
        const to = target.opacity;
        if (Math.abs(so - to) > opts.numberThreshold) {
            diffs.push({
                path: 'opacity',
                type: 'opacity',
                from: so,
                to: to,
                significant: true,
            });
        }
    }
}
/**
 * Diff fill properties.
 */
function diffFillProperties(source, target, diffs, opts) {
    const sourceFills = source.fills;
    const targetFills = target.fills;
    if (!sourceFills || !targetFills)
        return;
    // Compare first solid fill colors
    const sourceColor = sourceFills[0]?.color;
    const targetColor = targetFills[0]?.color;
    if (sourceColor && targetColor) {
        if (!colorsEqual(sourceColor, targetColor, opts.colorThreshold)) {
            diffs.push({
                path: 'fills.0.color',
                type: 'color',
                from: sourceColor,
                to: targetColor,
                significant: true,
            });
        }
    }
}
/**
 * Diff stroke properties.
 */
function diffStrokeProperties(source, target, diffs, opts) {
    const ss = source;
    const ts = target;
    // Stroke weight
    if (ss.strokeWeight !== undefined && ts.strokeWeight !== undefined) {
        if (Math.abs(ss.strokeWeight - ts.strokeWeight) > opts.numberThreshold) {
            diffs.push({
                path: 'strokeWeight',
                type: 'number',
                from: ss.strokeWeight,
                to: ts.strokeWeight,
                significant: true,
            });
        }
    }
    // Stroke color
    const sourceColor = ss.strokes?.[0]?.color;
    const targetColor = ts.strokes?.[0]?.color;
    if (sourceColor && targetColor) {
        if (!colorsEqual(sourceColor, targetColor, opts.colorThreshold)) {
            diffs.push({
                path: 'strokes.0.color',
                type: 'color',
                from: sourceColor,
                to: targetColor,
                significant: true,
            });
        }
    }
}
/**
 * Diff corner radius.
 */
function diffCornerRadius(source, target, diffs, opts) {
    const sc = source;
    const tc = target;
    // Uniform corner radius
    if (sc.cornerRadius !== undefined && tc.cornerRadius !== undefined) {
        if (Math.abs(sc.cornerRadius - tc.cornerRadius) > opts.numberThreshold) {
            diffs.push({
                path: 'cornerRadius',
                type: 'number',
                from: sc.cornerRadius,
                to: tc.cornerRadius,
                significant: true,
            });
        }
    }
    // Individual corners
    const cornerProps = [
        'topLeftRadius',
        'topRightRadius',
        'bottomLeftRadius',
        'bottomRightRadius',
    ];
    for (const prop of cornerProps) {
        const sv = sc[prop];
        const tv = tc[prop];
        if (sv !== undefined && tv !== undefined && Math.abs(sv - tv) > opts.numberThreshold) {
            diffs.push({
                path: prop,
                type: 'number',
                from: sv,
                to: tv,
                significant: true,
            });
        }
    }
}
/**
 * Diff path data for vector nodes.
 */
function diffPathData(source, target, _opts) {
    const sp = source.vectorPaths;
    const tp = target.vectorPaths;
    if (!sp?.length || !tp?.length)
        return null;
    // Check if paths are different
    if (pathsEqual(sp, tp))
        return null;
    return {
        path: 'vectorPaths',
        type: 'path',
        from: sp,
        to: tp,
        significant: true,
    };
}
/**
 * Diff effect properties.
 */
function diffEffects(source, target, diffs, opts) {
    const se = source.effects;
    const te = target.effects;
    if (!se?.length && !te?.length)
        return;
    // Compare blur radius if both have blur
    const sourceBlur = se?.find((e) => e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR');
    const targetBlur = te?.find((e) => e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR');
    if (sourceBlur?.radius !== undefined && targetBlur?.radius !== undefined) {
        if (Math.abs(sourceBlur.radius - targetBlur.radius) > opts.numberThreshold) {
            diffs.push({
                path: 'effects.blur.radius',
                type: 'number',
                from: sourceBlur.radius,
                to: targetBlur.radius,
                significant: true,
            });
        }
    }
    // Handle blur appearing/disappearing
    if (sourceBlur && !targetBlur) {
        diffs.push({
            path: 'effects.blur.radius',
            type: 'number',
            from: sourceBlur.radius ?? 0,
            to: 0,
            significant: true,
        });
    }
    else if (!sourceBlur && targetBlur) {
        diffs.push({
            path: 'effects.blur.radius',
            type: 'number',
            from: 0,
            to: targetBlur.radius ?? 0,
            significant: true,
        });
    }
}
/**
 * Check if two colors are equal within threshold.
 */
function colorsEqual(a, b, threshold) {
    const dr = Math.abs((a.r - b.r) * 255);
    const dg = Math.abs((a.g - b.g) * 255);
    const db = Math.abs((a.b - b.b) * 255);
    const da = Math.abs((a.a - b.a) * 255);
    return dr <= threshold && dg <= threshold && db <= threshold && da <= threshold;
}
/**
 * Check if two path arrays are equal.
 */
function pathsEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        const pa = a[i];
        const pb = b[i];
        if (pa.commands.length !== pb.commands.length)
            return false;
        for (let j = 0; j < pa.commands.length; j++) {
            const ca = pa.commands[j];
            const cb = pb.commands[j];
            if (ca.type !== cb.type)
                return false;
            // Z commands have no coordinates
            if (ca.type === 'Z')
                continue;
            // Compare coordinates with small tolerance
            const tolerance = 0.001;
            if (ca.type === 'M' || ca.type === 'L') {
                const caPos = ca;
                const cbPos = cb;
                if (Math.abs(caPos.x - cbPos.x) > tolerance)
                    return false;
                if (Math.abs(caPos.y - cbPos.y) > tolerance)
                    return false;
            }
            else if (ca.type === 'C' && cb.type === 'C') {
                if (Math.abs(ca.x - cb.x) > tolerance)
                    return false;
                if (Math.abs(ca.y - cb.y) > tolerance)
                    return false;
                if (Math.abs(ca.x1 - cb.x1) > tolerance)
                    return false;
                if (Math.abs(ca.y1 - cb.y1) > tolerance)
                    return false;
                if (Math.abs(ca.x2 - cb.x2) > tolerance)
                    return false;
                if (Math.abs(ca.y2 - cb.y2) > tolerance)
                    return false;
            }
        }
    }
    return true;
}
/**
 * Get a list of all animatable property paths.
 */
export function getAnimatableProperties() {
    return [
        'x',
        'y',
        'rotation',
        'width',
        'height',
        'opacity',
        'cornerRadius',
        'topLeftRadius',
        'topRightRadius',
        'bottomLeftRadius',
        'bottomRightRadius',
        'strokeWeight',
        'fills.0.color',
        'strokes.0.color',
        'effects.blur.radius',
        'vectorPaths',
    ];
}
//# sourceMappingURL=property-differ.js.map