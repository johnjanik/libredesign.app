/**
 * Dash Pattern
 *
 * Converts a vector path with a dash pattern into multiple dashed segments.
 * Supports arbitrary dash patterns and dash offsets.
 */

import type {
  Point,
  VectorPath,
  PathCommand,
  WindingRule,
} from '@core/types/geometry';

/**
 * Configuration for dash pattern application
 */
export interface DashConfig {
  /** Array of dash and gap lengths (e.g., [10, 5] for 10px dash, 5px gap) */
  readonly pattern: readonly number[];
  /** Offset into the dash pattern */
  readonly offset?: number;
  /** Tolerance for Bezier curve flattening */
  readonly tolerance?: number;
}

const DEFAULT_TOLERANCE = 0.5;

/**
 * Result of applying a dash pattern to a path
 */
export interface DashResult {
  /** Array of dashed path segments */
  readonly paths: VectorPath[];
  /** Total length of the original path */
  readonly totalLength: number;
}

/**
 * Apply a dash pattern to a vector path.
 * Returns an array of path segments representing the visible dashes.
 */
export function applyDashPattern(path: VectorPath, config: DashConfig): DashResult {
  const { pattern, offset = 0, tolerance = DEFAULT_TOLERANCE } = config;

  // Validate pattern
  if (pattern.length === 0) {
    return { paths: [path], totalLength: 0 };
  }

  // Normalize pattern (must have even number of elements)
  const normalizedPattern = normalizePattern(pattern);
  const patternLength = normalizedPattern.reduce((sum, len) => sum + len, 0);

  if (patternLength <= 0) {
    return { paths: [], totalLength: 0 };
  }

  // Convert path to segments with length information
  const segments = pathToSegments(path, tolerance);
  if (segments.length === 0) {
    return { paths: [], totalLength: 0 };
  }

  // Calculate total path length
  const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);

  // Generate dashed segments
  const dashedPaths = generateDashedPaths(
    segments,
    normalizedPattern,
    offset,
    patternLength,
    path.windingRule
  );

  return { paths: dashedPaths, totalLength };
}

/**
 * Calculate the total length of a path
 */
export function pathLength(path: VectorPath, tolerance: number = DEFAULT_TOLERANCE): number {
  const segments = pathToSegments(path, tolerance);
  return segments.reduce((sum, seg) => sum + seg.length, 0);
}

/**
 * Get a point at a specific distance along a path
 */
export function pointAtLength(
  path: VectorPath,
  targetLength: number,
  tolerance: number = DEFAULT_TOLERANCE
): Point | null {
  const segments = pathToSegments(path, tolerance);
  let accumulatedLength = 0;

  for (const segment of segments) {
    if (accumulatedLength + segment.length >= targetLength) {
      const t = (targetLength - accumulatedLength) / segment.length;
      return interpolatePoint(segment.start, segment.end, t);
    }
    accumulatedLength += segment.length;
  }

  // Return last point if targetLength exceeds path length
  const lastSegment = segments[segments.length - 1];
  return lastSegment ? lastSegment.end : null;
}

/**
 * Get the tangent direction at a specific distance along a path
 */
export function tangentAtLength(
  path: VectorPath,
  targetLength: number,
  tolerance: number = DEFAULT_TOLERANCE
): Point | null {
  const segments = pathToSegments(path, tolerance);
  let accumulatedLength = 0;

  for (const segment of segments) {
    if (accumulatedLength + segment.length >= targetLength) {
      // Calculate normalized direction
      const dx = segment.end.x - segment.start.x;
      const dy = segment.end.y - segment.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-10) continue;
      return { x: dx / len, y: dy / len };
    }
    accumulatedLength += segment.length;
  }

  // Return last tangent
  const lastSegment = segments[segments.length - 1];
  if (lastSegment) {
    const dx = lastSegment.end.x - lastSegment.start.x;
    const dy = lastSegment.end.y - lastSegment.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len >= 1e-10) {
      return { x: dx / len, y: dy / len };
    }
  }
  return null;
}

// ============================================================================
// Internal types and functions
// ============================================================================

interface Segment {
  start: Point;
  end: Point;
  length: number;
}

/**
 * Normalize dash pattern to have even number of elements
 */
function normalizePattern(pattern: readonly number[]): number[] {
  // Filter out non-positive values and ensure all values are positive
  const filtered = pattern.map((v) => Math.max(0, v));

  // If odd number of elements, duplicate the pattern
  if (filtered.length % 2 !== 0) {
    return [...filtered, ...filtered];
  }

  return filtered;
}

/**
 * Convert a path to line segments
 */
function pathToSegments(path: VectorPath, tolerance: number): Segment[] {
  const segments: Segment[] = [];
  let currentPoint: Point | null = null;
  let subPathStart: Point | null = null;

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        currentPoint = { x: cmd.x, y: cmd.y };
        subPathStart = currentPoint;
        break;

      case 'L':
        if (currentPoint) {
          const end = { x: cmd.x, y: cmd.y };
          const length = distance(currentPoint, end);
          if (length > 1e-10) {
            segments.push({ start: currentPoint, end, length });
          }
          currentPoint = end;
        }
        break;

      case 'C':
        if (currentPoint) {
          const curveSegments = flattenCubicBezier(
            currentPoint,
            { x: cmd.x1, y: cmd.y1 },
            { x: cmd.x2, y: cmd.y2 },
            { x: cmd.x, y: cmd.y },
            tolerance
          );
          segments.push(...curveSegments);
          currentPoint = { x: cmd.x, y: cmd.y };
        }
        break;

      case 'Z':
        if (currentPoint && subPathStart) {
          const length = distance(currentPoint, subPathStart);
          if (length > 1e-10) {
            segments.push({
              start: currentPoint,
              end: subPathStart,
              length,
            });
          }
          currentPoint = subPathStart;
        }
        break;
    }
  }

  return segments;
}

/**
 * Flatten a cubic Bezier curve to line segments
 */
function flattenCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  tolerance: number
): Segment[] {
  const segments: Segment[] = [];
  flattenBezierRecursive(p0, p1, p2, p3, tolerance, segments);
  return segments;
}

function flattenBezierRecursive(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  tolerance: number,
  segments: Segment[]
): void {
  // Check if curve is flat enough
  const d1 = pointToLineDistance(p1, p0, p3);
  const d2 = pointToLineDistance(p2, p0, p3);

  if (d1 + d2 <= tolerance) {
    // Curve is flat enough, add line segment
    const length = distance(p0, p3);
    if (length > 1e-10) {
      segments.push({ start: p0, end: p3, length });
    }
    return;
  }

  // Subdivide curve at t=0.5
  const mid = 0.5;
  const [left, right] = splitCubicBezier(p0, p1, p2, p3, mid);

  flattenBezierRecursive(left.p0, left.p1, left.p2, left.p3, tolerance, segments);
  flattenBezierRecursive(right.p0, right.p1, right.p2, right.p3, tolerance, segments);
}

function splitCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): [{ p0: Point; p1: Point; p2: Point; p3: Point }, { p0: Point; p1: Point; p2: Point; p3: Point }] {
  const p01 = interpolatePoint(p0, p1, t);
  const p12 = interpolatePoint(p1, p2, t);
  const p23 = interpolatePoint(p2, p3, t);
  const p012 = interpolatePoint(p01, p12, t);
  const p123 = interpolatePoint(p12, p23, t);
  const p0123 = interpolatePoint(p012, p123, t);

  return [
    { p0: p0, p1: p01, p2: p012, p3: p0123 },
    { p0: p0123, p1: p123, p2: p23, p3: p3 },
  ];
}

/**
 * Generate dashed paths from segments
 */
function generateDashedPaths(
  segments: Segment[],
  pattern: number[],
  offset: number,
  patternLength: number,
  windingRule: WindingRule
): VectorPath[] {
  const paths: VectorPath[] = [];

  // Normalize offset to be within pattern length
  let normalizedOffset = offset % patternLength;
  if (normalizedOffset < 0) {
    normalizedOffset += patternLength;
  }

  // Find starting position in pattern
  let patternIndex = 0;
  let patternPos = 0;
  let inDash = true;

  // Skip through pattern to account for offset
  let remainingOffset = normalizedOffset;
  while (remainingOffset > 0) {
    const currentLen = pattern[patternIndex]!;
    if (remainingOffset < currentLen) {
      patternPos = remainingOffset;
      break;
    }
    remainingOffset -= currentLen;
    patternIndex = (patternIndex + 1) % pattern.length;
    inDash = patternIndex % 2 === 0;
    patternPos = 0;
  }

  // Walk through all segments
  let segmentIndex = 0;
  let segmentPos = 0;
  let currentDash: Point[] = [];

  while (segmentIndex < segments.length) {
    const segment = segments[segmentIndex]!;
    const remainingSegment = segment.length - segmentPos;
    const remainingPattern = pattern[patternIndex]! - patternPos;

    const advance = Math.min(remainingSegment, remainingPattern);

    if (inDash) {
      // Start dash if needed
      if (currentDash.length === 0) {
        const t = segmentPos / segment.length;
        currentDash.push(interpolatePoint(segment.start, segment.end, t));
      }

      // Add end point of this advance
      const endT = (segmentPos + advance) / segment.length;
      const endPoint = interpolatePoint(segment.start, segment.end, endT);

      // Check if we're ending the dash
      if (advance >= remainingPattern - 1e-10) {
        currentDash.push(endPoint);
        // Complete this dash
        if (currentDash.length >= 2) {
          paths.push(pointsToDashPath(currentDash, windingRule));
        }
        currentDash = [];
      } else if (advance >= remainingSegment - 1e-10) {
        // End of segment but not end of dash
        currentDash.push(endPoint);
      }
    }

    segmentPos += advance;
    patternPos += advance;

    // Check if we've consumed the current pattern element
    if (patternPos >= pattern[patternIndex]! - 1e-10) {
      patternIndex = (patternIndex + 1) % pattern.length;
      patternPos = 0;
      inDash = patternIndex % 2 === 0;
    }

    // Check if we've consumed the current segment
    if (segmentPos >= segment.length - 1e-10) {
      segmentIndex++;
      segmentPos = 0;
    }
  }

  // Complete any remaining dash
  if (currentDash.length >= 2) {
    paths.push(pointsToDashPath(currentDash, windingRule));
  }

  return paths;
}

/**
 * Convert a list of points to a dash path
 */
function pointsToDashPath(points: Point[], windingRule: WindingRule): VectorPath {
  if (points.length === 0) {
    return { windingRule, commands: [] };
  }

  const commands: PathCommand[] = [
    { type: 'M', x: points[0]!.x, y: points[0]!.y },
  ];

  for (let i = 1; i < points.length; i++) {
    commands.push({ type: 'L', x: points[i]!.x, y: points[i]!.y });
  }

  return { windingRule, commands };
}

/**
 * Linear interpolation between two points
 */
function interpolatePoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Calculate distance between two points
 */
function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate perpendicular distance from point to line
 */
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lineLenSq = dx * dx + dy * dy;

  if (lineLenSq < 1e-20) {
    return distance(point, lineStart);
  }

  // Use cross product to find perpendicular distance
  const cross = Math.abs(
    (point.x - lineStart.x) * dy - (point.y - lineStart.y) * dx
  );
  return cross / Math.sqrt(lineLenSq);
}
