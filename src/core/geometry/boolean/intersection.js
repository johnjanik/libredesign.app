/**
 * Intersection Detection
 *
 * Computes intersections between line segments and bezier curves.
 * Used by the Greiner-Hormann algorithm for boolean operations.
 */
/** Tolerance for floating point comparisons */
export const EPSILON = 1e-10;
/**
 * Compute intersection between two line segments.
 *
 * Uses parametric line representation:
 * P = P0 + t * (P1 - P0)
 *
 * Returns null if segments don't intersect or are parallel.
 */
export function lineLineIntersection(a0, a1, b0, b1) {
    const dx1 = a1.x - a0.x;
    const dy1 = a1.y - a0.y;
    const dx2 = b1.x - b0.x;
    const dy2 = b1.y - b0.y;
    // Cross product of direction vectors
    const cross = dx1 * dy2 - dy1 * dx2;
    // Check if lines are parallel
    if (Math.abs(cross) < EPSILON) {
        return null;
    }
    const dx = b0.x - a0.x;
    const dy = b0.y - a0.y;
    // Compute parameters
    const t1 = (dx * dy2 - dy * dx2) / cross;
    const t2 = (dx * dy1 - dy * dx1) / cross;
    // Check if intersection is within both segments
    if (t1 < -EPSILON || t1 > 1 + EPSILON || t2 < -EPSILON || t2 > 1 + EPSILON) {
        return null;
    }
    // Clamp to [0, 1]
    const clampedT1 = Math.max(0, Math.min(1, t1));
    const clampedT2 = Math.max(0, Math.min(1, t2));
    return {
        point: {
            x: a0.x + clampedT1 * dx1,
            y: a0.y + clampedT1 * dy1,
        },
        t1: clampedT1,
        t2: clampedT2,
    };
}
/**
 * Check if two points are approximately equal.
 */
export function pointsEqual(a, b, tolerance = EPSILON) {
    return Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance;
}
/**
 * Evaluate a cubic bezier curve at parameter t.
 */
export function evaluateBezier(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    return {
        x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
        y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    };
}
/**
 * Compute the derivative of a cubic bezier at parameter t.
 */
export function bezierDerivative(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    // B'(t) = 3(1-t)^2(P1-P0) + 6(1-t)t(P2-P1) + 3t^2(P3-P2)
    return {
        x: 3 * mt2 * (p1.x - p0.x) +
            6 * mt * t * (p2.x - p1.x) +
            3 * t2 * (p3.x - p2.x),
        y: 3 * mt2 * (p1.y - p0.y) +
            6 * mt * t * (p2.y - p1.y) +
            3 * t2 * (p3.y - p2.y),
    };
}
/**
 * Compute bounding box of a cubic bezier curve.
 */
export function bezierBounds(p0, p1, p2, p3) {
    // Start with endpoints
    let minX = Math.min(p0.x, p3.x);
    let maxX = Math.max(p0.x, p3.x);
    let minY = Math.min(p0.y, p3.y);
    let maxY = Math.max(p0.y, p3.y);
    // Find extrema by solving derivative = 0
    // B'(t) = at^2 + bt + c = 0
    const ax = -p0.x + 3 * p1.x - 3 * p2.x + p3.x;
    const bx = 2 * p0.x - 4 * p1.x + 2 * p2.x;
    const cx = -p0.x + p1.x;
    const ay = -p0.y + 3 * p1.y - 3 * p2.y + p3.y;
    const by = 2 * p0.y - 4 * p1.y + 2 * p2.y;
    const cy = -p0.y + p1.y;
    // Solve for x extrema
    const xRoots = solveQuadratic(ax, bx, cx);
    for (const t of xRoots) {
        if (t > 0 && t < 1) {
            const pt = evaluateBezier(p0, p1, p2, p3, t);
            minX = Math.min(minX, pt.x);
            maxX = Math.max(maxX, pt.x);
        }
    }
    // Solve for y extrema
    const yRoots = solveQuadratic(ay, by, cy);
    for (const t of yRoots) {
        if (t > 0 && t < 1) {
            const pt = evaluateBezier(p0, p1, p2, p3, t);
            minY = Math.min(minY, pt.y);
            maxY = Math.max(maxY, pt.y);
        }
    }
    return { minX, minY, maxX, maxY };
}
/**
 * Solve quadratic equation ax^2 + bx + c = 0.
 * Returns array of real roots.
 */
export function solveQuadratic(a, b, c) {
    if (Math.abs(a) < EPSILON) {
        // Linear equation
        if (Math.abs(b) < EPSILON) {
            return [];
        }
        return [-c / b];
    }
    const discriminant = b * b - 4 * a * c;
    if (discriminant < -EPSILON) {
        return [];
    }
    if (discriminant < EPSILON) {
        return [-b / (2 * a)];
    }
    const sqrtD = Math.sqrt(discriminant);
    return [(-b - sqrtD) / (2 * a), (-b + sqrtD) / (2 * a)];
}
/**
 * Split a cubic bezier curve at parameter t using de Casteljau's algorithm.
 * Returns the control points for the two resulting curves.
 */
export function splitBezier(p0, p1, p2, p3, t) {
    // Level 1
    const p01 = { x: p0.x + t * (p1.x - p0.x), y: p0.y + t * (p1.y - p0.y) };
    const p12 = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
    const p23 = { x: p2.x + t * (p3.x - p2.x), y: p2.y + t * (p3.y - p2.y) };
    // Level 2
    const p012 = { x: p01.x + t * (p12.x - p01.x), y: p01.y + t * (p12.y - p01.y) };
    const p123 = { x: p12.x + t * (p23.x - p12.x), y: p12.y + t * (p23.y - p12.y) };
    // Level 3 (the point on the curve)
    const p0123 = { x: p012.x + t * (p123.x - p012.x), y: p012.y + t * (p123.y - p012.y) };
    return {
        left: [p0, p01, p012, p0123],
        right: [p0123, p123, p23, p3],
    };
}
/**
 * Flatten a cubic bezier curve to line segments.
 * Uses adaptive subdivision based on flatness.
 */
export function flattenBezier(p0, p1, p2, p3, tolerance = 0.5) {
    const result = [p0];
    flattenBezierRecursive(p0, p1, p2, p3, tolerance * tolerance, result);
    return result;
}
function flattenBezierRecursive(p0, p1, p2, p3, toleranceSq, result) {
    // Check flatness using max deviation from straight line
    const flatness = maxDeviation(p0, p1, p2, p3);
    if (flatness <= toleranceSq) {
        // Flat enough, add end point
        result.push(p3);
        return;
    }
    // Subdivide at midpoint
    const { left, right } = splitBezier(p0, p1, p2, p3, 0.5);
    flattenBezierRecursive(left[0], left[1], left[2], left[3], toleranceSq, result);
    flattenBezierRecursive(right[0], right[1], right[2], right[3], toleranceSq, result);
}
/**
 * Compute maximum deviation of control points from the line p0-p3.
 * Returns squared distance for efficiency.
 */
function maxDeviation(p0, p1, p2, p3) {
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < EPSILON) {
        // Degenerate case: start and end are the same
        const d1 = (p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2;
        const d2 = (p2.x - p0.x) ** 2 + (p2.y - p0.y) ** 2;
        return Math.max(d1, d2);
    }
    // Distance from p1 to line p0-p3
    const t1 = ((p1.x - p0.x) * dx + (p1.y - p0.y) * dy) / lenSq;
    const proj1x = p0.x + t1 * dx;
    const proj1y = p0.y + t1 * dy;
    const d1 = (p1.x - proj1x) ** 2 + (p1.y - proj1y) ** 2;
    // Distance from p2 to line p0-p3
    const t2 = ((p2.x - p0.x) * dx + (p2.y - p0.y) * dy) / lenSq;
    const proj2x = p0.x + t2 * dx;
    const proj2y = p0.y + t2 * dy;
    const d2 = (p2.x - proj2x) ** 2 + (p2.y - proj2y) ** 2;
    return Math.max(d1, d2);
}
/**
 * Find intersections between a line segment and a cubic bezier curve.
 * Uses recursive subdivision.
 */
export function lineBezierIntersection(lineStart, lineEnd, p0, p1, p2, p3, tolerance = 1e-6) {
    const results = [];
    lineBezierIntersectionRecursive(lineStart, lineEnd, p0, p1, p2, p3, 0, 1, tolerance, results);
    return results;
}
function lineBezierIntersectionRecursive(lineStart, lineEnd, p0, p1, p2, p3, tMin, tMax, tolerance, results) {
    // Check bounding box intersection first
    const curveBounds = bezierBounds(p0, p1, p2, p3);
    const lineBounds = {
        minX: Math.min(lineStart.x, lineEnd.x) - tolerance,
        minY: Math.min(lineStart.y, lineEnd.y) - tolerance,
        maxX: Math.max(lineStart.x, lineEnd.x) + tolerance,
        maxY: Math.max(lineStart.y, lineEnd.y) + tolerance,
    };
    if (curveBounds.maxX < lineBounds.minX ||
        curveBounds.minX > lineBounds.maxX ||
        curveBounds.maxY < lineBounds.minY ||
        curveBounds.minY > lineBounds.maxY) {
        return;
    }
    // Check if curve is flat enough to approximate with a line
    const flatness = maxDeviation(p0, p1, p2, p3);
    if (flatness <= tolerance * tolerance) {
        // Treat as line-line intersection
        const intersection = lineLineIntersection(lineStart, lineEnd, p0, p3);
        if (intersection) {
            results.push({
                point: intersection.point,
                t1: intersection.t1,
                t2: tMin + intersection.t2 * (tMax - tMin),
            });
        }
        return;
    }
    // Subdivide and recurse
    const tMid = (tMin + tMax) / 2;
    const { left, right } = splitBezier(p0, p1, p2, p3, 0.5);
    lineBezierIntersectionRecursive(lineStart, lineEnd, left[0], left[1], left[2], left[3], tMin, tMid, tolerance, results);
    lineBezierIntersectionRecursive(lineStart, lineEnd, right[0], right[1], right[2], right[3], tMid, tMax, tolerance, results);
}
/**
 * Find intersections between two cubic bezier curves.
 * Uses recursive subdivision with bounding box rejection.
 */
export function bezierBezierIntersection(a0, a1, a2, a3, b0, b1, b2, b3, tolerance = 1e-6) {
    const results = [];
    bezierBezierIntersectionRecursive(a0, a1, a2, a3, 0, 1, b0, b1, b2, b3, 0, 1, tolerance, results);
    // Remove duplicates (can occur at subdivision boundaries)
    return deduplicateIntersections(results, tolerance);
}
function bezierBezierIntersectionRecursive(a0, a1, a2, a3, aMin, aMax, b0, b1, b2, b3, bMin, bMax, tolerance, results) {
    // Bounding box rejection
    const aBounds = bezierBounds(a0, a1, a2, a3);
    const bBounds = bezierBounds(b0, b1, b2, b3);
    if (aBounds.maxX < bBounds.minX - tolerance ||
        aBounds.minX > bBounds.maxX + tolerance ||
        aBounds.maxY < bBounds.minY - tolerance ||
        aBounds.minY > bBounds.maxY + tolerance) {
        return;
    }
    // Check if both curves are flat enough
    const aFlat = maxDeviation(a0, a1, a2, a3) <= tolerance * tolerance;
    const bFlat = maxDeviation(b0, b1, b2, b3) <= tolerance * tolerance;
    if (aFlat && bFlat) {
        // Treat as line-line intersection
        const intersection = lineLineIntersection(a0, a3, b0, b3);
        if (intersection) {
            results.push({
                point: intersection.point,
                t1: aMin + intersection.t1 * (aMax - aMin),
                t2: bMin + intersection.t2 * (bMax - bMin),
            });
        }
        return;
    }
    // Subdivide the less flat curve
    if (!aFlat) {
        const aMid = (aMin + aMax) / 2;
        const { left, right } = splitBezier(a0, a1, a2, a3, 0.5);
        bezierBezierIntersectionRecursive(left[0], left[1], left[2], left[3], aMin, aMid, b0, b1, b2, b3, bMin, bMax, tolerance, results);
        bezierBezierIntersectionRecursive(right[0], right[1], right[2], right[3], aMid, aMax, b0, b1, b2, b3, bMin, bMax, tolerance, results);
    }
    else {
        const bMid = (bMin + bMax) / 2;
        const { left, right } = splitBezier(b0, b1, b2, b3, 0.5);
        bezierBezierIntersectionRecursive(a0, a1, a2, a3, aMin, aMax, left[0], left[1], left[2], left[3], bMin, bMid, tolerance, results);
        bezierBezierIntersectionRecursive(a0, a1, a2, a3, aMin, aMax, right[0], right[1], right[2], right[3], bMid, bMax, tolerance, results);
    }
}
/**
 * Remove duplicate intersections that are too close together.
 */
function deduplicateIntersections(intersections, tolerance) {
    if (intersections.length <= 1) {
        return intersections;
    }
    const result = [];
    for (const intersection of intersections) {
        const isDuplicate = result.some((existing) => Math.abs(existing.t1 - intersection.t1) < tolerance &&
            Math.abs(existing.t2 - intersection.t2) < tolerance);
        if (!isDuplicate) {
            result.push(intersection);
        }
    }
    return result;
}
/**
 * Compute signed area of a polygon (positive for CCW, negative for CW).
 */
export function signedArea(points) {
    const n = points.length;
    if (n < 3)
        return 0;
    let area = 0;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return area / 2;
}
/**
 * Check if a polygon is clockwise.
 */
export function isClockwise(points) {
    return signedArea(points) < 0;
}
/**
 * Distance squared between two points.
 */
export function distanceSquared(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
}
/**
 * Distance between two points.
 */
export function distance(a, b) {
    return Math.sqrt(distanceSquared(a, b));
}
//# sourceMappingURL=intersection.js.map