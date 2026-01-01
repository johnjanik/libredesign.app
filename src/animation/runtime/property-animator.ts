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
import { resolveEasing } from '../easing/presets';

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
export function createPropertyAnimation(
  target: AnimationTarget,
  property: AnimatedProperty<unknown>,
  duration: number,
  easing: EasingFunction | EasingPreset | EasingDefinition = 'linear'
): PropertyAnimation {
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
export function updatePropertyAnimation(
  animation: PropertyAnimation,
  currentTime: number
): void {
  if (animation.isComplete) return;

  const elapsed = currentTime - animation.startTime;
  const progress = Math.min(elapsed / animation.duration, 1);

  // Get interpolated value
  const value = getAnimatedPropertyValue(
    animation.property,
    progress,
    animation.defaultEasing
  );

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
export function interpolateNumber(
  keyframes: readonly Keyframe<number>[],
  time: number,
  defaultEasing: EasingFunction
): number {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0]!.value;

  // Find surrounding keyframes
  let prevFrame = keyframes[0]!;
  let nextFrame = keyframes[keyframes.length - 1]!;

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i]!.time <= time && keyframes[i + 1]!.time > time) {
      prevFrame = keyframes[i]!;
      nextFrame = keyframes[i + 1]!;
      break;
    }
  }

  // Handle edge cases
  if (time <= prevFrame.time) return prevFrame.value;
  if (time >= nextFrame.time) return nextFrame.value;

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
export function interpolateColor(
  keyframes: readonly Keyframe<RGBA>[],
  time: number,
  defaultEasing: EasingFunction
): RGBA {
  if (keyframes.length === 0) return { r: 0, g: 0, b: 0, a: 1 };
  if (keyframes.length === 1) return keyframes[0]!.value;

  // Find surrounding keyframes
  let prevFrame = keyframes[0]!;
  let nextFrame = keyframes[keyframes.length - 1]!;

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i]!.time <= time && keyframes[i + 1]!.time > time) {
      prevFrame = keyframes[i]!;
      nextFrame = keyframes[i + 1]!;
      break;
    }
  }

  if (time <= prevFrame.time) return prevFrame.value;
  if (time >= nextFrame.time) return nextFrame.value;

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
export function interpolatePoint(
  keyframes: readonly Keyframe<{ x: number; y: number }>[],
  time: number,
  defaultEasing: EasingFunction
): { x: number; y: number } {
  if (keyframes.length === 0) return { x: 0, y: 0 };
  if (keyframes.length === 1) return keyframes[0]!.value;

  let prevFrame = keyframes[0]!;
  let nextFrame = keyframes[keyframes.length - 1]!;

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i]!.time <= time && keyframes[i + 1]!.time > time) {
      prevFrame = keyframes[i]!;
      nextFrame = keyframes[i + 1]!;
      break;
    }
  }

  if (time <= prevFrame.time) return prevFrame.value;
  if (time >= nextFrame.time) return nextFrame.value;

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
export function getPropertyValueType(path: string): 'number' | 'color' | 'point' | 'unknown' {
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
export function getAnimatedPropertyValue(
  property: AnimatedProperty<unknown>,
  time: number,
  defaultEasing: EasingFunction
): unknown {
  const valueType = getPropertyValueType(property.path);

  switch (valueType) {
    case 'number':
      return interpolateNumber(
        property.keyframes as readonly Keyframe<number>[],
        time,
        defaultEasing
      );
    case 'color':
      return interpolateColor(
        property.keyframes as readonly Keyframe<RGBA>[],
        time,
        defaultEasing
      );
    case 'point':
      return interpolatePoint(
        property.keyframes as readonly Keyframe<{ x: number; y: number }>[],
        time,
        defaultEasing
      );
    default:
      // For unknown types, use discrete switching at keyframe times
      for (let i = property.keyframes.length - 1; i >= 0; i--) {
        if (time >= property.keyframes[i]!.time) {
          return property.keyframes[i]!.value;
        }
      }
      return property.keyframes[0]?.value;
  }
}

/**
 * Create animation targets from a node update function.
 */
export function createAnimationTarget(
  nodeId: NodeId,
  getNode: (id: NodeId) => Record<string, unknown> | undefined,
  updateNode: (id: NodeId, updates: Record<string, unknown>) => void
): AnimationTarget {
  return {
    nodeId,
    getValue(path: string): unknown {
      const node = getNode(nodeId);
      if (!node) return undefined;

      // Handle nested paths
      const parts = path.split('.');
      let value: unknown = node;

      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }

      return value;
    },
    setValue(path: string, value: unknown): void {
      // Handle nested paths by creating update object
      const parts = path.split('.');
      const updates: Record<string, unknown> = {};

      if (parts.length === 1) {
        updates[path] = value;
      } else {
        // Build nested update object
        let current = updates;
        for (let i = 0; i < parts.length - 1; i++) {
          current[parts[i]!] = {};
          current = current[parts[i]!] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]!] = value;
      }

      updateNode(nodeId, updates);
    },
  };
}
