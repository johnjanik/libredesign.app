/**
 * Path Utilities
 *
 * Utilities for parsing and manipulating vector paths for node editing.
 */

import type { Point, VectorPath, PathCommand } from '@core/types/geometry';
import type { AnchorPoint } from '../drawing/path-builder';

/**
 * Editable anchor point with index tracking
 */
export interface EditableAnchor extends AnchorPoint {
  /** Index in the path */
  readonly index: number;
  /** Whether this is a corner (no handles) or smooth point */
  readonly isCorner: boolean;
}

/**
 * Result of parsing a path into editable anchors
 */
export interface ParsedPath {
  readonly anchors: EditableAnchor[];
  readonly isClosed: boolean;
}

/**
 * Parse a VectorPath into editable anchor points.
 * This reverses the PathBuilder.build() operation.
 */
export function parsePathToAnchors(path: VectorPath): ParsedPath {
  const anchors: EditableAnchor[] = [];
  let isClosed = false;

  if (path.commands.length === 0) {
    return { anchors, isClosed };
  }

  // First pass: collect anchor positions from M, L, C commands
  // We'll figure out handles in the second pass
  const positions: Point[] = [];
  const handleOuts: (Point | null)[] = [];
  const handleIns: (Point | null)[] = [];

  for (let i = 0; i < path.commands.length; i++) {
    const cmd = path.commands[i]!;

    if (cmd.type === 'M') {
      positions.push({ x: cmd.x, y: cmd.y });
      handleOuts.push(null);
      handleIns.push(null);
    } else if (cmd.type === 'L') {
      positions.push({ x: cmd.x, y: cmd.y });
      handleOuts.push(null);
      handleIns.push(null);
    } else if (cmd.type === 'C') {
      // Previous anchor's handleOut is x1, y1
      if (handleOuts.length > 0) {
        handleOuts[handleOuts.length - 1] = { x: cmd.x1, y: cmd.y1 };
      }
      // Current anchor's handleIn is x2, y2
      positions.push({ x: cmd.x, y: cmd.y });
      handleIns.push({ x: cmd.x2, y: cmd.y2 });
      handleOuts.push(null);
    } else if (cmd.type === 'Z') {
      isClosed = true;
      // Check if there's a curved close (look at previous command)
      // The first anchor might have a handleIn from the close segment
    }
  }

  // Handle closed path - check if the close segment has handles
  if (isClosed && path.commands.length >= 2) {
    const lastCmd = path.commands[path.commands.length - 2];
    if (lastCmd && lastCmd.type === 'C') {
      // The first point's handleIn comes from the closing curve
      // But we need to look at the command before Z
      const cmdBeforeZ = path.commands[path.commands.length - 1]?.type === 'Z'
        ? path.commands[path.commands.length - 2]
        : null;
      if (cmdBeforeZ?.type === 'C' && handleIns.length > 0) {
        // First anchor gets handleIn from closing curve
        // This is tricky - for closed paths, the first anchor's handleIn
        // comes from the segment that closes back to it
      }
    }
  }

  // Build anchor points
  for (let i = 0; i < positions.length; i++) {
    const position = positions[i]!;
    const handleIn = handleIns[i] ?? null;
    const handleOut = handleOuts[i] ?? null;
    const isCorner = handleIn === null && handleOut === null;

    anchors.push({
      index: i,
      position,
      handleIn,
      handleOut,
      isCorner,
    });
  }

  return { anchors, isClosed };
}

/**
 * Build a VectorPath from editable anchors.
 */
export function buildPathFromAnchors(anchors: EditableAnchor[], isClosed: boolean): VectorPath {
  if (anchors.length === 0) {
    return { windingRule: 'NONZERO', commands: [] };
  }

  const commands: PathCommand[] = [];
  const first = anchors[0]!;

  // MoveTo first point
  commands.push({
    type: 'M',
    x: first.position.x,
    y: first.position.y,
  });

  // Process segments
  for (let i = 1; i < anchors.length; i++) {
    const prev = anchors[i - 1]!;
    const curr = anchors[i]!;

    if (prev.handleOut || curr.handleIn) {
      // Bezier curve
      const x1 = prev.handleOut?.x ?? prev.position.x;
      const y1 = prev.handleOut?.y ?? prev.position.y;
      const x2 = curr.handleIn?.x ?? curr.position.x;
      const y2 = curr.handleIn?.y ?? curr.position.y;

      commands.push({
        type: 'C',
        x1, y1,
        x2, y2,
        x: curr.position.x,
        y: curr.position.y,
      });
    } else {
      // Straight line
      commands.push({
        type: 'L',
        x: curr.position.x,
        y: curr.position.y,
      });
    }
  }

  // Close path if needed
  if (isClosed && anchors.length > 1) {
    const last = anchors[anchors.length - 1]!;

    if (last.handleOut || first.handleIn) {
      // Curved closure
      const x1 = last.handleOut?.x ?? last.position.x;
      const y1 = last.handleOut?.y ?? last.position.y;
      const x2 = first.handleIn?.x ?? first.position.x;
      const y2 = first.handleIn?.y ?? first.position.y;

      commands.push({
        type: 'C',
        x1, y1,
        x2, y2,
        x: first.position.x,
        y: first.position.y,
      });
    }

    commands.push({ type: 'Z' });
  }

  return { windingRule: 'NONZERO', commands };
}

/**
 * Calculate distance between two points
 */
export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the closest anchor to a point
 */
export function findClosestAnchor(
  point: Point,
  anchors: EditableAnchor[],
  threshold: number
): EditableAnchor | null {
  let closest: EditableAnchor | null = null;
  let minDist = threshold;

  for (const anchor of anchors) {
    const dist = distance(point, anchor.position);
    if (dist < minDist) {
      minDist = dist;
      closest = anchor;
    }
  }

  return closest;
}

/**
 * Handle type for selection
 */
export type HandleType = 'in' | 'out';

/**
 * Result of finding closest handle
 */
export interface HandleHitResult {
  readonly anchor: EditableAnchor;
  readonly handleType: HandleType;
  readonly handlePosition: Point;
}

/**
 * Find the closest handle to a point
 */
export function findClosestHandle(
  point: Point,
  anchors: EditableAnchor[],
  threshold: number
): HandleHitResult | null {
  let closest: HandleHitResult | null = null;
  let minDist = threshold;

  for (const anchor of anchors) {
    if (anchor.handleIn) {
      const dist = distance(point, anchor.handleIn);
      if (dist < minDist) {
        minDist = dist;
        closest = {
          anchor,
          handleType: 'in',
          handlePosition: anchor.handleIn,
        };
      }
    }

    if (anchor.handleOut) {
      const dist = distance(point, anchor.handleOut);
      if (dist < minDist) {
        minDist = dist;
        closest = {
          anchor,
          handleType: 'out',
          handlePosition: anchor.handleOut,
        };
      }
    }
  }

  return closest;
}

/**
 * Find the closest point on a path segment
 */
export interface SegmentHitResult {
  /** Index of the segment (between anchor i and i+1) */
  readonly segmentIndex: number;
  /** Point on the segment */
  readonly point: Point;
  /** Parameter t (0-1) along the segment */
  readonly t: number;
  /** Distance from click to point */
  readonly distance: number;
}

/**
 * Evaluate a cubic bezier at parameter t
 */
function evaluateCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
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
 * Find the closest point on a path segment to a given point.
 * Uses sampling for approximate results.
 */
export function findClosestPointOnSegment(
  point: Point,
  anchors: EditableAnchor[],
  segmentIndex: number,
  samples: number = 20
): SegmentHitResult | null {
  if (segmentIndex < 0 || segmentIndex >= anchors.length - 1) {
    return null;
  }

  const start = anchors[segmentIndex]!;
  const end = anchors[segmentIndex + 1]!;

  let closestPoint: Point = start.position;
  let closestT = 0;
  let minDist = Infinity;

  const isCurve = start.handleOut || end.handleIn;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    let p: Point;

    if (isCurve) {
      const p0 = start.position;
      const p1 = start.handleOut ?? start.position;
      const p2 = end.handleIn ?? end.position;
      const p3 = end.position;
      p = evaluateCubicBezier(p0, p1, p2, p3, t);
    } else {
      // Linear interpolation
      p = {
        x: start.position.x + t * (end.position.x - start.position.x),
        y: start.position.y + t * (end.position.y - start.position.y),
      };
    }

    const dist = distance(point, p);
    if (dist < minDist) {
      minDist = dist;
      closestPoint = p;
      closestT = t;
    }
  }

  return {
    segmentIndex,
    point: closestPoint,
    t: closestT,
    distance: minDist,
  };
}

/**
 * Find the closest segment to a point
 */
export function findClosestSegment(
  point: Point,
  anchors: EditableAnchor[],
  threshold: number,
  isClosed: boolean
): SegmentHitResult | null {
  let closest: SegmentHitResult | null = null;
  let minDist = threshold;

  const segmentCount = isClosed ? anchors.length : anchors.length - 1;

  for (let i = 0; i < segmentCount; i++) {
    const nextIndex = (i + 1) % anchors.length;
    const tempAnchors = [anchors[i]!, anchors[nextIndex]!];

    const result = findClosestPointOnSegment(point, tempAnchors, 0);
    if (result && result.distance < minDist) {
      minDist = result.distance;
      closest = {
        ...result,
        segmentIndex: i,
      };
    }
  }

  return closest;
}

/**
 * Split a segment at parameter t, creating a new anchor
 */
export function splitSegmentAt(
  anchors: EditableAnchor[],
  segmentIndex: number,
  t: number
): EditableAnchor[] {
  if (segmentIndex < 0 || segmentIndex >= anchors.length - 1) {
    return anchors;
  }

  const result = [...anchors];
  const start = anchors[segmentIndex]!;
  const end = anchors[segmentIndex + 1]!;

  const isCurve = start.handleOut || end.handleIn;

  if (isCurve) {
    // De Casteljau subdivision for bezier curves
    const p0 = start.position;
    const p1 = start.handleOut ?? start.position;
    const p2 = end.handleIn ?? end.position;
    const p3 = end.position;

    // First level
    const p01 = { x: p0.x + t * (p1.x - p0.x), y: p0.y + t * (p1.y - p0.y) };
    const p12 = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
    const p23 = { x: p2.x + t * (p3.x - p2.x), y: p2.y + t * (p3.y - p2.y) };

    // Second level
    const p012 = { x: p01.x + t * (p12.x - p01.x), y: p01.y + t * (p12.y - p01.y) };
    const p123 = { x: p12.x + t * (p23.x - p12.x), y: p12.y + t * (p23.y - p12.y) };

    // Third level - the split point
    const splitPoint = { x: p012.x + t * (p123.x - p012.x), y: p012.y + t * (p123.y - p012.y) };

    // Update start anchor's handleOut
    const newStart: EditableAnchor = {
      ...start,
      handleOut: p01,
    };

    // Create new middle anchor
    const newMiddle: EditableAnchor = {
      index: segmentIndex + 1,
      position: splitPoint,
      handleIn: p012,
      handleOut: p123,
      isCorner: false,
    };

    // Update end anchor's handleIn
    const newEnd: EditableAnchor = {
      ...end,
      handleIn: p23,
    };

    // Replace in result array
    result[segmentIndex] = newStart;
    result[segmentIndex + 1] = newEnd;
    result.splice(segmentIndex + 1, 0, newMiddle);
  } else {
    // Linear interpolation for straight lines
    const splitPoint = {
      x: start.position.x + t * (end.position.x - start.position.x),
      y: start.position.y + t * (end.position.y - start.position.y),
    };

    const newMiddle: EditableAnchor = {
      index: segmentIndex + 1,
      position: splitPoint,
      handleIn: null,
      handleOut: null,
      isCorner: true,
    };

    result.splice(segmentIndex + 1, 0, newMiddle);
  }

  // Reindex anchors
  return result.map((a, i) => ({ ...a, index: i }));
}

/**
 * Delete an anchor from the path
 */
export function deleteAnchor(
  anchors: EditableAnchor[],
  anchorIndex: number
): EditableAnchor[] {
  if (anchors.length <= 2) {
    // Can't delete if only 2 anchors remain
    return anchors;
  }

  const result = anchors.filter((_, i) => i !== anchorIndex);

  // Reindex anchors
  return result.map((a, i) => ({ ...a, index: i }));
}

/**
 * Toggle an anchor between corner and smooth
 */
export function toggleAnchorType(
  anchors: EditableAnchor[],
  anchorIndex: number
): EditableAnchor[] {
  const result = [...anchors];
  const anchor = result[anchorIndex];
  if (!anchor) return anchors;

  if (anchor.isCorner) {
    // Convert to smooth - create handles based on neighboring anchors
    const prev = result[anchorIndex - 1] ?? result[result.length - 1];
    const next = result[anchorIndex + 1] ?? result[0];

    if (prev && next) {
      // Create handles along the line between neighbors
      const handleLength = 30; // Default handle length
      const dx = next.position.x - prev.position.x;
      const dy = next.position.y - prev.position.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len > 0) {
        const nx = dx / len;
        const ny = dy / len;

        result[anchorIndex] = {
          ...anchor,
          handleIn: {
            x: anchor.position.x - nx * handleLength,
            y: anchor.position.y - ny * handleLength,
          },
          handleOut: {
            x: anchor.position.x + nx * handleLength,
            y: anchor.position.y + ny * handleLength,
          },
          isCorner: false,
        };
      }
    }
  } else {
    // Convert to corner - remove handles
    result[anchorIndex] = {
      ...anchor,
      handleIn: null,
      handleOut: null,
      isCorner: true,
    };
  }

  return result;
}

/**
 * Move an anchor point
 */
export function moveAnchor(
  anchors: EditableAnchor[],
  anchorIndex: number,
  newPosition: Point
): EditableAnchor[] {
  const result = [...anchors];
  const anchor = result[anchorIndex];
  if (!anchor) return anchors;

  const dx = newPosition.x - anchor.position.x;
  const dy = newPosition.y - anchor.position.y;

  // Move position and handles together
  result[anchorIndex] = {
    ...anchor,
    position: newPosition,
    handleIn: anchor.handleIn
      ? { x: anchor.handleIn.x + dx, y: anchor.handleIn.y + dy }
      : null,
    handleOut: anchor.handleOut
      ? { x: anchor.handleOut.x + dx, y: anchor.handleOut.y + dy }
      : null,
  };

  return result;
}

/**
 * Move a handle
 */
export function moveHandle(
  anchors: EditableAnchor[],
  anchorIndex: number,
  handleType: HandleType,
  newPosition: Point,
  symmetric: boolean = false
): EditableAnchor[] {
  const result = [...anchors];
  const anchor = result[anchorIndex];
  if (!anchor) return anchors;

  if (handleType === 'in') {
    // Calculate symmetric handle if needed
    let newHandleOut = anchor.handleOut;
    if (symmetric) {
      const dx = anchor.position.x - newPosition.x;
      const dy = anchor.position.y - newPosition.y;
      newHandleOut = {
        x: anchor.position.x + dx,
        y: anchor.position.y + dy,
      };
    }

    result[anchorIndex] = {
      ...anchor,
      handleIn: newPosition,
      handleOut: newHandleOut,
      isCorner: false,
    };
  } else {
    // Calculate symmetric handle if needed
    let newHandleIn = anchor.handleIn;
    if (symmetric) {
      const dx = anchor.position.x - newPosition.x;
      const dy = anchor.position.y - newPosition.y;
      newHandleIn = {
        x: anchor.position.x + dx,
        y: anchor.position.y + dy,
      };
    }

    result[anchorIndex] = {
      ...anchor,
      handleOut: newPosition,
      handleIn: newHandleIn,
      isCorner: false,
    };
  }

  return result;
}
