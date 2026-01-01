/**
 * Cubic Bezier Easing
 *
 * Implements cubic bezier easing using Newton-Raphson iteration.
 * Compatible with CSS cubic-bezier() timing functions.
 */
import type { EasingFunction } from '../types/easing';
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
export declare function createCubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction;
/**
 * Common cubic bezier presets.
 */
export declare const cubicBezierPresets: {
    /** CSS ease - slight acceleration then deceleration */
    readonly ease: EasingFunction;
    /** CSS ease-in - acceleration from zero velocity */
    readonly easeIn: EasingFunction;
    /** CSS ease-out - deceleration to zero velocity */
    readonly easeOut: EasingFunction;
    /** CSS ease-in-out - acceleration then deceleration */
    readonly easeInOut: EasingFunction;
    /** Material Design standard curve */
    readonly standard: EasingFunction;
    /** Material Design deceleration curve */
    readonly decelerate: EasingFunction;
    /** Material Design acceleration curve */
    readonly accelerate: EasingFunction;
    /** Sharp curve for elements leaving screen */
    readonly sharp: EasingFunction;
};
//# sourceMappingURL=cubic-bezier.d.ts.map