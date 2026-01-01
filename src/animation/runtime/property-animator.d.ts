/**
 * Property Animator
 *
 * Handles animating individual properties on nodes.
 * Supports various property types with appropriate interpolation.
 */
import type { NodeId } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { AnimatedProperty, Keyframe } from '../types/keyframe';
import type { EasingFunction, EasingDefinition, EasingPreset } from '../types/easing';
/**
 * Animation target - represents a node being animated.
 */
export interface AnimationTarget {
    /** Node ID */
    readonly nodeId: NodeId;
    /** Get current property value */
    getValue(path: string): unknown;
    /** Set property value */
    setValue(path: string, value: unknown): void;
}
/**
 * Active property animation.
 */
export interface PropertyAnimation {
    /** Target node */
    readonly target: AnimationTarget;
    /** Property being animated */
    readonly property: AnimatedProperty<unknown>;
    /** Default easing if keyframe doesn't specify */
    readonly defaultEasing: EasingFunction;
    /** Start time */
    readonly startTime: number;
    /** Duration in ms */
    readonly duration: number;
    /** Whether animation is complete */
    isComplete: boolean;
}
/**
 * Create a property animation.
 */
export declare function createPropertyAnimation(target: AnimationTarget, property: AnimatedProperty<unknown>, duration: number, easing?: EasingFunction | EasingPreset | EasingDefinition): PropertyAnimation;
/**
 * Update a property animation at the current time.
 */
export declare function updatePropertyAnimation(animation: PropertyAnimation, currentTime: number): void;
/**
 * Interpolate a number property.
 */
export declare function interpolateNumber(keyframes: readonly Keyframe<number>[], time: number, defaultEasing: EasingFunction): number;
/**
 * Interpolate a color property.
 */
export declare function interpolateColor(keyframes: readonly Keyframe<RGBA>[], time: number, defaultEasing: EasingFunction): RGBA;
/**
 * Interpolate a point property.
 */
export declare function interpolatePoint(keyframes: readonly Keyframe<{
    x: number;
    y: number;
}>[], time: number, defaultEasing: EasingFunction): {
    x: number;
    y: number;
};
/**
 * Get the value type for a property path.
 */
export declare function getPropertyValueType(path: string): 'number' | 'color' | 'point' | 'unknown';
/**
 * Get animated property value at a specific time.
 * Dispatches to the appropriate interpolation function based on property type.
 */
export declare function getAnimatedPropertyValue(property: AnimatedProperty<unknown>, time: number, defaultEasing: EasingFunction): unknown;
/**
 * Create animation targets from a node update function.
 */
export declare function createAnimationTarget(nodeId: NodeId, getNode: (id: NodeId) => Record<string, unknown> | undefined, updateNode: (id: NodeId, updates: Record<string, unknown>) => void): AnimationTarget;
//# sourceMappingURL=property-animator.d.ts.map