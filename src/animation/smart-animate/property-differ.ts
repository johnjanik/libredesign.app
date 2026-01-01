/**
 * Property Differ
 *
 * Calculates property differences between matched nodes for Smart Animate.
 * Determines which properties changed and how to interpolate them.
 */

import type { NodeId } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
import type { RGBA } from '@core/types/color';
import type { VectorPath } from '@core/types/geometry';

/**
 * Types of properties that can be animated.
 */
export type AnimatablePropertyType =
  | 'number'
  | 'point'
  | 'color'
  | 'path'
  | 'transform'
  | 'opacity'
  | 'size';

/**
 * A single property difference.
 */
export interface PropertyDiff<T = unknown> {
  /** Property path (e.g., 'x', 'fill.color') */
  readonly path: string;
  /** Property type */
  readonly type: AnimatablePropertyType;
  /** Source value */
  readonly from: T;
  /** Target value */
  readonly to: T;
  /** Whether values are significantly different */
  readonly significant: boolean;
}

/**
 * All property differences between two nodes.
 */
export interface NodeDiff {
  /** Source node ID */
  readonly sourceId: NodeId;
  /** Target node ID */
  readonly targetId: NodeId;
  /** Property differences */
  readonly properties: readonly PropertyDiff[];
  /** Whether the node has significant changes */
  readonly hasChanges: boolean;
  /** Whether path morphing is needed */
  readonly needsPathMorph: boolean;
}

/**
 * Options for diffing.
 */
export interface DiffOptions {
  /** Threshold for considering number changes significant */
  readonly numberThreshold?: number;
  /** Threshold for considering color changes significant (0-255) */
  readonly colorThreshold?: number;
  /** Whether to diff path data */
  readonly diffPaths?: boolean;
}

const DEFAULT_DIFF_OPTIONS: Required<DiffOptions> = {
  numberThreshold: 0.01,
  colorThreshold: 2,
  diffPaths: true,
};

/**
 * Calculate differences between two matched nodes.
 */
export function diffNodes(
  sourceNode: NodeData,
  targetNode: NodeData,
  options: DiffOptions = {}
): NodeDiff {
  const opts = { ...DEFAULT_DIFF_OPTIONS, ...options };
  const diffs: PropertyDiff[] = [];
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
function diffTransformProperties(
  source: NodeData,
  target: NodeData,
  diffs: PropertyDiff[],
  opts: Required<DiffOptions>
): void {
  // Position
  if ('x' in source && 'x' in target) {
    const sx = (source as { x: number }).x;
    const tx = (target as { x: number }).x;
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
    const sy = (source as { y: number }).y;
    const ty = (target as { y: number }).y;
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
    const sr = (source as { rotation: number }).rotation;
    const tr = (target as { rotation: number }).rotation;
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
function diffSizeProperties(
  source: NodeData,
  target: NodeData,
  diffs: PropertyDiff[],
  opts: Required<DiffOptions>
): void {
  if ('width' in source && 'width' in target) {
    const sw = (source as { width: number }).width;
    const tw = (target as { width: number }).width;
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
    const sh = (source as { height: number }).height;
    const th = (target as { height: number }).height;
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
function diffOpacity(
  source: NodeData,
  target: NodeData,
  diffs: PropertyDiff[],
  opts: Required<DiffOptions>
): void {
  if ('opacity' in source && 'opacity' in target) {
    const so = (source as { opacity: number }).opacity;
    const to = (target as { opacity: number }).opacity;
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
function diffFillProperties(
  source: NodeData,
  target: NodeData,
  diffs: PropertyDiff[],
  opts: Required<DiffOptions>
): void {
  type FillNode = { fills?: readonly { color?: RGBA }[] };

  const sourceFills = (source as FillNode).fills;
  const targetFills = (target as FillNode).fills;

  if (!sourceFills || !targetFills) return;

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
function diffStrokeProperties(
  source: NodeData,
  target: NodeData,
  diffs: PropertyDiff[],
  opts: Required<DiffOptions>
): void {
  type StrokeNode = {
    strokes?: readonly { color?: RGBA }[];
    strokeWeight?: number;
  };

  const ss = source as StrokeNode;
  const ts = target as StrokeNode;

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
function diffCornerRadius(
  source: NodeData,
  target: NodeData,
  diffs: PropertyDiff[],
  opts: Required<DiffOptions>
): void {
  type CornerNode = {
    cornerRadius?: number;
    topLeftRadius?: number;
    topRightRadius?: number;
    bottomLeftRadius?: number;
    bottomRightRadius?: number;
  };

  const sc = source as CornerNode;
  const tc = target as CornerNode;

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
  ] as const;

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
function diffPathData(
  source: NodeData,
  target: NodeData,
  _opts: Required<DiffOptions>
): PropertyDiff | null {
  type PathNode = { vectorPaths?: readonly VectorPath[] };

  const sp = (source as PathNode).vectorPaths;
  const tp = (target as PathNode).vectorPaths;

  if (!sp?.length || !tp?.length) return null;

  // Check if paths are different
  if (pathsEqual(sp, tp)) return null;

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
function diffEffects(
  source: NodeData,
  target: NodeData,
  diffs: PropertyDiff[],
  opts: Required<DiffOptions>
): void {
  type EffectNode = {
    effects?: readonly {
      type: string;
      radius?: number;
      visible?: boolean;
    }[];
  };

  const se = (source as EffectNode).effects;
  const te = (target as EffectNode).effects;

  if (!se?.length && !te?.length) return;

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
  } else if (!sourceBlur && targetBlur) {
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
function colorsEqual(a: RGBA, b: RGBA, threshold: number): boolean {
  const dr = Math.abs((a.r - b.r) * 255);
  const dg = Math.abs((a.g - b.g) * 255);
  const db = Math.abs((a.b - b.b) * 255);
  const da = Math.abs((a.a - b.a) * 255);

  return dr <= threshold && dg <= threshold && db <= threshold && da <= threshold;
}

/**
 * Check if two path arrays are equal.
 */
function pathsEqual(
  a: readonly VectorPath[],
  b: readonly VectorPath[]
): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const pa = a[i]!;
    const pb = b[i]!;

    if (pa.commands.length !== pb.commands.length) return false;

    for (let j = 0; j < pa.commands.length; j++) {
      const ca = pa.commands[j]!;
      const cb = pb.commands[j]!;

      if (ca.type !== cb.type) return false;

      // Z commands have no coordinates
      if (ca.type === 'Z') continue;

      // Compare coordinates with small tolerance
      const tolerance = 0.001;
      if (ca.type === 'M' || ca.type === 'L') {
        const caPos = ca as { x: number; y: number };
        const cbPos = cb as { x: number; y: number };
        if (Math.abs(caPos.x - cbPos.x) > tolerance) return false;
        if (Math.abs(caPos.y - cbPos.y) > tolerance) return false;
      } else if (ca.type === 'C' && cb.type === 'C') {
        if (Math.abs(ca.x - cb.x) > tolerance) return false;
        if (Math.abs(ca.y - cb.y) > tolerance) return false;
        if (Math.abs(ca.x1 - cb.x1) > tolerance) return false;
        if (Math.abs(ca.y1 - cb.y1) > tolerance) return false;
        if (Math.abs(ca.x2 - cb.x2) > tolerance) return false;
        if (Math.abs(ca.y2 - cb.y2) > tolerance) return false;
      }
    }
  }

  return true;
}

/**
 * Get a list of all animatable property paths.
 */
export function getAnimatableProperties(): readonly string[] {
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
  ] as const;
}
