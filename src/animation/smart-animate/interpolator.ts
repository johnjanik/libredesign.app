/**
 * Smart Animate Interpolator
 *
 * Interpolates between source and target node states during Smart Animate.
 * Handles different property types with appropriate interpolation methods.
 */

import type { NodeId } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
import type { RGBA } from '@core/types/color';
import type { EasingFunction } from '../types/easing';
import type { NodeDiff, PropertyDiff } from './property-differ';

/**
 * Interpolated node state at a point in time.
 */
export interface InterpolatedState {
  /** Node ID */
  readonly nodeId: NodeId;
  /** Interpolated property values */
  readonly values: Record<string, unknown>;
  /** Current opacity (for fade in/out) */
  readonly opacity: number;
  /** Whether node is fading in */
  readonly fadingIn: boolean;
  /** Whether node is fading out */
  readonly fadingOut: boolean;
}

/**
 * All interpolated states for a frame.
 */
export interface FrameInterpolation {
  /** States for matched nodes */
  readonly matched: readonly InterpolatedState[];
  /** States for fade-out nodes (source only) */
  readonly fadeOut: readonly InterpolatedState[];
  /** States for fade-in nodes (target only) */
  readonly fadeIn: readonly InterpolatedState[];
}

/**
 * Options for interpolation.
 */
export interface InterpolateOptions {
  /** Easing function to apply */
  readonly easing?: EasingFunction;
  /** Duration for fade in/out (0-1 portion of animation) */
  readonly fadeDuration?: number;
}

const DEFAULT_OPTIONS: Required<InterpolateOptions> = {
  easing: (t) => t,
  fadeDuration: 0.3,
};

/**
 * Interpolate all node states for a given progress value.
 */
export function interpolateFrame(
  progress: number,
  diffs: readonly NodeDiff[],
  sourceNodes: Map<NodeId, NodeData>,
  targetNodes: Map<NodeId, NodeData>,
  fadeOutIds: readonly NodeId[],
  fadeInIds: readonly NodeId[],
  options: InterpolateOptions = {}
): FrameInterpolation {
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
function interpolateNode(
  diff: NodeDiff,
  sourceNode: NodeData | undefined,
  t: number
): InterpolatedState {
  const values: Record<string, unknown> = {};

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
function interpolateProperty(prop: PropertyDiff, t: number): unknown {
  switch (prop.type) {
    case 'number':
    case 'opacity':
      return lerpNumber(prop.from as number, prop.to as number, t);

    case 'color':
      return lerpColor(prop.from as RGBA, prop.to as RGBA, t);

    case 'point':
      return lerpPoint(
        prop.from as { x: number; y: number },
        prop.to as { x: number; y: number },
        t
      );

    case 'size':
      return {
        width: lerpNumber(
          (prop.from as { width: number }).width,
          (prop.to as { width: number }).width,
          t
        ),
        height: lerpNumber(
          (prop.from as { height: number }).height,
          (prop.to as { height: number }).height,
          t
        ),
      };

    case 'path':
      // Path interpolation is handled separately by the morph module
      return t < 0.5 ? prop.from : prop.to;

    case 'transform':
      // Transform interpolation
      return interpolateTransform(
        prop.from as TransformValue,
        prop.to as TransformValue,
        t
      );

    default:
      // For unknown types, snap at 50%
      return t < 0.5 ? prop.from : prop.to;
  }
}

/**
 * Linear interpolation for numbers.
 */
function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linear interpolation for colors.
 */
function lerpColor(a: RGBA, b: RGBA, t: number): RGBA {
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
function lerpPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number
): { x: number; y: number } {
  return {
    x: lerpNumber(a.x, b.x, t),
    y: lerpNumber(a.y, b.y, t),
  };
}

/**
 * Transform value interface.
 */
interface TransformValue {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

/**
 * Interpolate transform values.
 */
function interpolateTransform(
  a: TransformValue,
  b: TransformValue,
  t: number
): TransformValue {
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
function lerpAngle(a: number, b: number, t: number): number {
  // Normalize angles to 0-360
  a = ((a % 360) + 360) % 360;
  b = ((b % 360) + 360) % 360;

  // Find shortest path
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;

  return a + delta * t;
}

/**
 * Create fade-out state for a source-only node.
 */
function createFadeOutState(
  nodeId: NodeId,
  node: NodeData | undefined,
  fadeProgress: number
): InterpolatedState {
  const values: Record<string, unknown> = {};

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
function createFadeInState(
  nodeId: NodeId,
  node: NodeData | undefined,
  fadeProgress: number
): InterpolatedState {
  const values: Record<string, unknown> = {};

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
function copyNodeValues(node: NodeData, values: Record<string, unknown>): void {
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
      values[prop] = (node as unknown as Record<string, unknown>)[prop];
    }
  }

  // Handle nested properties
  type FillNode = { fills?: readonly { color?: RGBA }[] };
  const fills = (node as FillNode).fills;
  if (fills?.[0]?.color) {
    values['fills.0.color'] = fills[0].color;
  }

  type StrokeNode = { strokes?: readonly { color?: RGBA }[] };
  const strokes = (node as StrokeNode).strokes;
  if (strokes?.[0]?.color) {
    values['strokes.0.color'] = strokes[0].color;
  }
}

/**
 * Apply interpolated values to a node.
 * Returns a new node data object with the interpolated values.
 */
export function applyInterpolation(
  baseNode: NodeData,
  state: InterpolatedState
): NodeData {
  const result = { ...baseNode } as unknown as Record<string, unknown>;

  // Apply simple properties
  for (const [path, value] of Object.entries(state.values)) {
    if (!path.includes('.')) {
      result[path] = value;
    }
  }

  // Apply nested properties
  if ('fills.0.color' in state.values) {
    const fills = result['fills'] as { color?: RGBA }[] | undefined;
    if (fills?.[0]) {
      result['fills'] = [
        { ...fills[0], color: state.values['fills.0.color'] as RGBA },
        ...fills.slice(1),
      ];
    }
  }

  if ('strokes.0.color' in state.values) {
    const strokes = result['strokes'] as { color?: RGBA }[] | undefined;
    if (strokes?.[0]) {
      result['strokes'] = [
        { ...strokes[0], color: state.values['strokes.0.color'] as RGBA },
        ...strokes.slice(1),
      ];
    }
  }

  // Ensure opacity reflects fade state
  result['opacity'] = state.opacity;

  return result as unknown as NodeData;
}

/**
 * Create an interpolation function for a specific node pair.
 */
export function createNodeInterpolator(
  diff: NodeDiff,
  sourceNode: NodeData,
  easing: EasingFunction = (t) => t
): (t: number) => InterpolatedState {
  return (t: number) => {
    const easedT = easing(Math.max(0, Math.min(1, t)));
    return interpolateNode(diff, sourceNode, easedT);
  };
}
