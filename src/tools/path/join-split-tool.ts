/**
 * Join & Split Path Tools
 *
 * Tools for joining multiple paths and splitting paths at points.
 */

import type { Point, VectorPath } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { parsePathToAnchors, buildPathFromAnchors, type EditableAnchor, distance } from './path-utils';

/**
 * Result of finding path endpoints
 */
export interface PathEndpoint {
  readonly pathIndex: number;
  readonly anchorIndex: number;
  readonly point: Point;
  readonly isStart: boolean;
}

/**
 * Join options
 */
export interface JoinOptions {
  /** Maximum distance to consider endpoints joinable */
  readonly tolerance: number;
  /** Whether to close path if start/end are close */
  readonly closeIfNear?: boolean;
}

/**
 * Split result
 */
export interface SplitResult {
  readonly pathBefore: VectorPath;
  readonly pathAfter: VectorPath;
}

/**
 * Find all endpoints of a path
 */
export function findPathEndpoints(path: VectorPath): [PathEndpoint, PathEndpoint] | null {
  const parsed = parsePathToAnchors(path);
  const anchors = parsed.anchors;

  if (anchors.length < 2) {
    return null;
  }

  const firstAnchor = anchors[0]!;
  const lastAnchor = anchors[anchors.length - 1]!;

  return [
    {
      pathIndex: 0,
      anchorIndex: 0,
      point: firstAnchor.position,
      isStart: true,
    },
    {
      pathIndex: 0,
      anchorIndex: anchors.length - 1,
      point: lastAnchor.position,
      isStart: false,
    },
  ];
}

/**
 * Find the closest endpoint from multiple paths
 */
export function findClosestEndpoint(
  point: Point,
  paths: readonly VectorPath[],
  tolerance: number
): { pathIndex: number; endpoint: PathEndpoint } | null {
  let closest: { pathIndex: number; endpoint: PathEndpoint; dist: number } | null = null;

  for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
    const endpoints = findPathEndpoints(paths[pathIndex]!);
    if (!endpoints) continue;

    for (const endpoint of endpoints) {
      const dist = distance(point, endpoint.point);
      if (dist <= tolerance && (!closest || dist < closest.dist)) {
        closest = {
          pathIndex,
          endpoint: { ...endpoint, pathIndex },
          dist,
        };
      }
    }
  }

  return closest ? { pathIndex: closest.pathIndex, endpoint: closest.endpoint } : null;
}

/**
 * Join two paths at their endpoints.
 *
 * @param path1 First path
 * @param path2 Second path
 * @param endpoint1 Which endpoint of path1 to join (start or end)
 * @param endpoint2 Which endpoint of path2 to join (start or end)
 */
export function joinPaths(
  path1: VectorPath,
  path2: VectorPath,
  endpoint1: 'start' | 'end' = 'end',
  endpoint2: 'start' | 'end' = 'start'
): VectorPath {
  const parsed1 = parsePathToAnchors(path1);
  const parsed2 = parsePathToAnchors(path2);
  let anchors1 = parsed1.anchors;
  let anchors2 = parsed2.anchors;

  // Reverse path2 if needed to align endpoints
  if (endpoint2 === 'end') {
    anchors2 = reverseAnchors(anchors2);
  }

  // Build combined anchors based on which endpoint of path1 we're joining from
  let combinedAnchors: EditableAnchor[];
  if (endpoint1 === 'end') {
    // Join at end of path1
    combinedAnchors = reindexAnchors([...anchors1, ...anchors2]);
  } else {
    // Join at start of path1 - reverse path1 first
    anchors1 = reverseAnchors(anchors1);
    combinedAnchors = reindexAnchors([...anchors1, ...anchors2]);
  }

  return buildPathFromAnchors(combinedAnchors, false);
}

/**
 * Join multiple paths in sequence, connecting closest endpoints.
 */
export function joinMultiplePaths(paths: readonly VectorPath[], options: JoinOptions): VectorPath {
  if (paths.length === 0) {
    return { windingRule: 'NONZERO', commands: [] };
  }
  if (paths.length === 1) {
    return paths[0]!;
  }

  // Start with the first path
  let result = paths[0]!;

  // Join remaining paths one by one
  for (let i = 1; i < paths.length; i++) {
    const currentPath = paths[i]!;

    // Find which endpoints are closest
    const resultEndpoints = findPathEndpoints(result);
    const currentEndpoints = findPathEndpoints(currentPath);

    if (!resultEndpoints || !currentEndpoints) continue;

    // Find the closest pair of endpoints
    let bestPair: { dist: number; resultEnd: 'start' | 'end'; currentEnd: 'start' | 'end' } = {
      dist: Infinity,
      resultEnd: 'end',
      currentEnd: 'start',
    };

    const pairs: Array<{ resultEnd: 'start' | 'end'; currentEnd: 'start' | 'end' }> = [
      { resultEnd: 'end', currentEnd: 'start' },
      { resultEnd: 'end', currentEnd: 'end' },
      { resultEnd: 'start', currentEnd: 'start' },
      { resultEnd: 'start', currentEnd: 'end' },
    ];

    for (const pair of pairs) {
      const resultPoint = pair.resultEnd === 'start' ? resultEndpoints[0].point : resultEndpoints[1].point;
      const currentPoint = pair.currentEnd === 'start' ? currentEndpoints[0].point : currentEndpoints[1].point;
      const dist = distance(resultPoint, currentPoint);
      if (dist < bestPair.dist) {
        bestPair = { dist, ...pair };
      }
    }

    // Join using the best pair
    result = joinPaths(result, currentPath, bestPair.resultEnd, bestPair.currentEnd);
  }

  // Optionally close the path if endpoints are close
  if (options.closeIfNear) {
    const endpoints = findPathEndpoints(result);
    if (endpoints) {
      const dist = distance(endpoints[0].point, endpoints[1].point);
      if (dist <= options.tolerance) {
        result = closePathByCommand(result);
      }
    }
  }

  return result;
}

/**
 * Close a path by adding a Z command
 */
function closePathByCommand(path: VectorPath): VectorPath {
  const commands = [...path.commands];
  const lastCmd = commands[commands.length - 1];

  // Don't add close if already closed
  if (lastCmd?.type === 'Z') {
    return path;
  }

  commands.push({ type: 'Z' });
  return { windingRule: path.windingRule, commands };
}

/**
 * Split a path at a specific anchor point.
 *
 * @param path The path to split
 * @param anchorIndex The index of the anchor where to split
 */
export function splitPathAtAnchor(path: VectorPath, anchorIndex: number): SplitResult | null {
  const parsed = parsePathToAnchors(path);
  const anchors = parsed.anchors;

  if (anchorIndex <= 0 || anchorIndex >= anchors.length - 1) {
    return null; // Can't split at first or last anchor
  }

  const anchorsBefore = reindexAnchors(anchors.slice(0, anchorIndex + 1));
  const anchorsAfter = reindexAnchors(anchors.slice(anchorIndex));

  return {
    pathBefore: buildPathFromAnchors(anchorsBefore, false),
    pathAfter: buildPathFromAnchors(anchorsAfter, false),
  };
}

/**
 * Split a path at a parameter position along a segment.
 *
 * @param path The path to split
 * @param segmentIndex The index of the segment to split
 * @param t Parameter along the segment (0-1)
 */
export function splitPathAtParameter(
  path: VectorPath,
  segmentIndex: number,
  t: number
): SplitResult | null {
  const parsed = parsePathToAnchors(path);
  const anchors = parsed.anchors;

  if (segmentIndex < 0 || segmentIndex >= anchors.length - 1) {
    return null;
  }

  // Clamp t to valid range
  t = Math.max(0.01, Math.min(0.99, t));

  const startAnchor = anchors[segmentIndex]!;
  const endAnchor = anchors[segmentIndex + 1]!;

  // Calculate split point based on segment type
  let splitAnchor: EditableAnchor;

  if (startAnchor.handleOut || endAnchor.handleIn) {
    // Cubic bezier - use de Casteljau
    const p0 = startAnchor.position;
    const p1 = startAnchor.handleOut ?? startAnchor.position;
    const p2 = endAnchor.handleIn ?? endAnchor.position;
    const p3 = endAnchor.position;

    const split = deCasteljauSplit(p0, p1, p2, p3, t);

    splitAnchor = {
      position: split.point,
      handleIn: split.handleInLeft,
      handleOut: split.handleOutRight,
      index: 0,
      isCorner: false,
    };

    // Update the surrounding anchors' handles
    const newStartAnchor: EditableAnchor = {
      ...startAnchor,
      handleOut: split.handleOutLeft,
    };
    const newEndAnchor: EditableAnchor = {
      ...endAnchor,
      handleIn: split.handleInRight,
    };

    // Build the two new paths
    const anchorsBefore = reindexAnchors([
      ...anchors.slice(0, segmentIndex),
      newStartAnchor,
      splitAnchor,
    ]);
    const anchorsAfter = reindexAnchors([
      { ...splitAnchor, handleIn: null, handleOut: split.handleOutRight },
      newEndAnchor,
      ...anchors.slice(segmentIndex + 2),
    ]);

    return {
      pathBefore: buildPathFromAnchors(anchorsBefore, false),
      pathAfter: buildPathFromAnchors(anchorsAfter, false),
    };
  } else {
    // Line segment - simple interpolation
    splitAnchor = {
      position: {
        x: startAnchor.position.x + (endAnchor.position.x - startAnchor.position.x) * t,
        y: startAnchor.position.y + (endAnchor.position.y - startAnchor.position.y) * t,
      },
      handleIn: null,
      handleOut: null,
      index: 0,
      isCorner: true,
    };

    const anchorsBefore = reindexAnchors([...anchors.slice(0, segmentIndex + 1), splitAnchor]);
    const anchorsAfter = reindexAnchors([splitAnchor, ...anchors.slice(segmentIndex + 1)]);

    return {
      pathBefore: buildPathFromAnchors(anchorsBefore, false),
      pathAfter: buildPathFromAnchors(anchorsAfter, false),
    };
  }
}

/**
 * Break a closed path at an anchor, converting it to an open path.
 */
export function breakPathAtAnchor(path: VectorPath, anchorIndex: number): VectorPath {
  const parsed = parsePathToAnchors(path);
  const anchors = parsed.anchors;

  if (anchors.length < 2) {
    return path;
  }

  // Rotate the anchors so the break point becomes the start/end
  const rotatedAnchors = reindexAnchors([
    ...anchors.slice(anchorIndex),
    ...anchors.slice(0, anchorIndex),
  ]);

  // Build open path (no close command)
  return buildPathFromAnchors(rotatedAnchors, false);
}

/**
 * Find the closest point on a path to a given point.
 */
export function findClosestPointOnPath(
  path: VectorPath,
  point: Point,
  samples: number = 100
): { segmentIndex: number; t: number; point: Point; distance: number } | null {
  const parsed = parsePathToAnchors(path);
  const anchors = parsed.anchors;
  if (anchors.length < 2) return null;

  let closest: { segmentIndex: number; t: number; point: Point; distance: number } | null = null;

  for (let i = 0; i < anchors.length - 1; i++) {
    const start = anchors[i]!;
    const end = anchors[i + 1]!;

    // Sample points along the segment
    for (let j = 0; j <= samples; j++) {
      const t = j / samples;
      let segmentPoint: Point;

      if (start.handleOut || end.handleIn) {
        // Bezier curve
        const p0 = start.position;
        const p1 = start.handleOut ?? start.position;
        const p2 = end.handleIn ?? end.position;
        const p3 = end.position;
        segmentPoint = evaluateBezier(p0, p1, p2, p3, t);
      } else {
        // Line segment
        segmentPoint = {
          x: start.position.x + (end.position.x - start.position.x) * t,
          y: start.position.y + (end.position.y - start.position.y) * t,
        };
      }

      const dist = distance(point, segmentPoint);
      if (!closest || dist < closest.distance) {
        closest = { segmentIndex: i, t, point: segmentPoint, distance: dist };
      }
    }
  }

  return closest;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Reverse the order of anchors and swap their handles
 */
function reverseAnchors(anchors: readonly EditableAnchor[]): EditableAnchor[] {
  return anchors.slice().reverse().map((a, i) => ({
    ...a,
    handleIn: a.handleOut,
    handleOut: a.handleIn,
    index: i,
  }));
}

/**
 * Reindex anchors array with correct indices
 */
function reindexAnchors(anchors: readonly EditableAnchor[]): EditableAnchor[] {
  return anchors.map((a, i) => ({ ...a, index: i }));
}

/**
 * Evaluate a cubic bezier curve at parameter t
 */
function evaluateBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
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
 * De Casteljau split for cubic bezier
 */
function deCasteljauSplit(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): {
  point: Point;
  handleOutLeft: Point;
  handleInLeft: Point;
  handleOutRight: Point;
  handleInRight: Point;
} {
  // First level
  const p01 = lerp(p0, p1, t);
  const p12 = lerp(p1, p2, t);
  const p23 = lerp(p2, p3, t);

  // Second level
  const p012 = lerp(p01, p12, t);
  const p123 = lerp(p12, p23, t);

  // Final point
  const p0123 = lerp(p012, p123, t);

  return {
    point: p0123,
    handleOutLeft: p01,
    handleInLeft: p012,
    handleOutRight: p123,
    handleInRight: p23,
  };
}

/**
 * Linear interpolation between two points
 */
function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Join selected paths operation (for use with runtime)
 */
export interface JoinPathsOperation {
  readonly type: 'join';
  readonly nodeIds: readonly NodeId[];
  readonly resultPath: VectorPath;
}

/**
 * Split path operation (for use with runtime)
 */
export interface SplitPathOperation {
  readonly type: 'split';
  readonly nodeId: NodeId;
  readonly segmentIndex: number;
  readonly t: number;
  readonly pathBefore: VectorPath;
  readonly pathAfter: VectorPath;
}
