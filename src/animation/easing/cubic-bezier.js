/**
 * Cubic Bezier Easing
 *
 * Implements cubic bezier easing using Newton-Raphson iteration.
 * Compatible with CSS cubic-bezier() timing functions.
 */
/** Precision for Newton-Raphson iteration */
const NEWTON_ITERATIONS = 8;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 0.0000001;
const SUBDIVISION_MAX_ITERATIONS = 10;
/** Sample table size for initial guess */
const SAMPLE_TABLE_SIZE = 11;
const SAMPLE_STEP_SIZE = 1.0 / (SAMPLE_TABLE_SIZE - 1);
/**
 * Create a cubic bezier easing function.
 *
 * The curve is defined by two control points:
 * P0 = (0, 0), P1 = (x1, y1), P2 = (x2, y2), P3 = (1, 1)
 *
 * @param x1 - X coordinate of first control point (0-1)
 * @param y1 - Y coordinate of first control point (can exceed 0-1)
 * @param x2 - X coordinate of second control point (0-1)
 * @param y2 - Y coordinate of second control point (can exceed 0-1)
 */
export function createCubicBezier(x1, y1, x2, y2) {
    // Validate x values (must be in [0, 1] for valid timing function)
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
        throw new Error('Cubic bezier x values must be in [0, 1]');
    }
    // Special case: linear
    if (x1 === y1 && x2 === y2) {
        return (t) => t;
    }
    // Precompute sample table for fast initial guess
    const sampleValues = new Float32Array(SAMPLE_TABLE_SIZE);
    for (let i = 0; i < SAMPLE_TABLE_SIZE; i++) {
        sampleValues[i] = calcBezier(i * SAMPLE_STEP_SIZE, x1, x2);
    }
    return function cubicBezierEasing(t) {
        // Handle edge cases
        if (t === 0)
            return 0;
        if (t === 1)
            return 1;
        // Find parameter value for given x using Newton-Raphson
        const paramT = getTForX(t, x1, x2, sampleValues);
        // Evaluate y at that parameter
        return calcBezier(paramT, y1, y2);
    };
}
/**
 * Calculate bezier value at parameter t for a single dimension.
 * B(t) = 3(1-t)^2*t*p1 + 3(1-t)*t^2*p2 + t^3
 * (Simplified since p0=0 and p3=1)
 */
function calcBezier(t, p1, p2) {
    return (((1 - 3 * p2 + 3 * p1) * t + (3 * p2 - 6 * p1)) * t + 3 * p1) * t;
}
/**
 * Calculate derivative of bezier at parameter t.
 * B'(t) = 3(1-t)^2*p1 + 6(1-t)*t*(p2-p1) + 3t^2*(1-p2)
 */
function getSlope(t, p1, p2) {
    return (3 * (1 - 3 * p2 + 3 * p1) * t * t +
        2 * (3 * p2 - 6 * p1) * t +
        3 * p1);
}
/**
 * Find parameter t for a given x value using Newton-Raphson.
 */
function getTForX(x, x1, x2, sampleValues) {
    // Initial guess from sample table
    let intervalStart = 0;
    let currentSample = 1;
    const lastSample = SAMPLE_TABLE_SIZE - 1;
    while (currentSample !== lastSample && sampleValues[currentSample] <= x) {
        intervalStart += SAMPLE_STEP_SIZE;
        currentSample++;
    }
    currentSample--;
    // Interpolate within interval for better initial guess
    const dist = (x - sampleValues[currentSample]) /
        (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    let guessT = intervalStart + dist * SAMPLE_STEP_SIZE;
    // Newton-Raphson iteration
    const initialSlope = getSlope(guessT, x1, x2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
        return newtonRaphsonIterate(x, guessT, x1, x2);
    }
    else if (initialSlope === 0) {
        return guessT;
    }
    else {
        // Fall back to binary subdivision for flat regions
        return binarySubdivide(x, intervalStart, intervalStart + SAMPLE_STEP_SIZE, x1, x2);
    }
}
/**
 * Newton-Raphson iteration to find t for x.
 */
function newtonRaphsonIterate(x, guessT, x1, x2) {
    for (let i = 0; i < NEWTON_ITERATIONS; i++) {
        const currentSlope = getSlope(guessT, x1, x2);
        if (currentSlope === 0) {
            return guessT;
        }
        const currentX = calcBezier(guessT, x1, x2) - x;
        guessT -= currentX / currentSlope;
    }
    return guessT;
}
/**
 * Binary subdivision fallback for flat curves.
 */
function binarySubdivide(x, a, b, x1, x2) {
    let currentX;
    let currentT;
    let i = 0;
    do {
        currentT = a + (b - a) / 2;
        currentX = calcBezier(currentT, x1, x2) - x;
        if (currentX > 0) {
            b = currentT;
        }
        else {
            a = currentT;
        }
    } while (Math.abs(currentX) > SUBDIVISION_PRECISION &&
        ++i < SUBDIVISION_MAX_ITERATIONS);
    return currentT;
}
/**
 * Common cubic bezier presets.
 */
export const cubicBezierPresets = {
    /** CSS ease - slight acceleration then deceleration */
    ease: createCubicBezier(0.25, 0.1, 0.25, 1.0),
    /** CSS ease-in - acceleration from zero velocity */
    easeIn: createCubicBezier(0.42, 0, 1.0, 1.0),
    /** CSS ease-out - deceleration to zero velocity */
    easeOut: createCubicBezier(0, 0, 0.58, 1.0),
    /** CSS ease-in-out - acceleration then deceleration */
    easeInOut: createCubicBezier(0.42, 0, 0.58, 1.0),
    /** Material Design standard curve */
    standard: createCubicBezier(0.4, 0, 0.2, 1),
    /** Material Design deceleration curve */
    decelerate: createCubicBezier(0, 0, 0.2, 1),
    /** Material Design acceleration curve */
    accelerate: createCubicBezier(0.4, 0, 1, 1),
    /** Sharp curve for elements leaving screen */
    sharp: createCubicBezier(0.4, 0, 0.6, 1),
};
//# sourceMappingURL=cubic-bezier.js.map