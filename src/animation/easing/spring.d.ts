/**
 * Spring Physics Easing
 *
 * Implements spring physics for natural, bouncy animations.
 * Supports underdamped, critically damped, and overdamped springs.
 */
import type { EasingFunction } from '../types/easing';
/**
 * Spring configuration.
 */
export interface SpringConfig {
    /** Mass of the object (default: 1) */
    readonly mass?: number;
    /** Spring stiffness (default: 100) */
    readonly stiffness?: number;
    /** Damping coefficient (default: 10) */
    readonly damping?: number;
    /** Initial velocity (default: 0) */
    readonly velocity?: number;
    /** Precision for settling detection (default: 0.01) */
    readonly precision?: number;
}
/**
 * Spring state at a point in time.
 */
export interface SpringState {
    readonly position: number;
    readonly velocity: number;
}
/**
 * Create a spring easing function.
 *
 * The spring animates from 0 to 1, with optional overshoot
 * depending on the damping ratio.
 */
export declare function createSpringEasing(config?: SpringConfig): EasingFunction;
/**
 * Spring presets for common use cases.
 */
export declare const springPresets: {
    /** Gentle spring with minimal overshoot */
    readonly gentle: EasingFunction;
    /** Wobbly spring with noticeable bounce */
    readonly wobbly: EasingFunction;
    /** Stiff spring with quick settle */
    readonly stiff: EasingFunction;
    /** Slow spring with gradual motion */
    readonly slow: EasingFunction;
    /** Molasses-like spring */
    readonly molasses: EasingFunction;
    /** Default balanced spring */
    readonly default: EasingFunction;
};
/**
 * Calculate the damping ratio for a spring.
 */
export declare function dampingRatio(mass: number, stiffness: number, damping: number): number;
/**
 * Check if a spring configuration is underdamped (will overshoot).
 */
export declare function isUnderdamped(config: SpringConfig): boolean;
/**
 * Check if a spring configuration is critically damped.
 */
export declare function isCriticallyDamped(config: SpringConfig): boolean;
/**
 * Check if a spring configuration is overdamped.
 */
export declare function isOverdamped(config: SpringConfig): boolean;
//# sourceMappingURL=spring.d.ts.map