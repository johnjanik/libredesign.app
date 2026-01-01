/**
 * Path Offset
 *
 * Offsets vector paths inward or outward for stroke alignment.
 * Supports different join styles (miter, bevel, round).
 */

import type { Point, VectorPath, PathCommand, StrokeJoin } from '@core/types/geometry';

/**
 * Offset configuration
 */
export interface OffsetConfig {
  /** Amount to offset (positive = outward, negative = inward) */
  readonly distance: number;
  /** Join style at corners */
  readonly joinStyle?: StrokeJoin;
  /** Miter limit (ratio of miter length to distance) */
  readonly miterLimit?: number;
  /** Tolerance for curve flattening */
  readonly tolerance?: number;
}

const DEFAULT_MITER_LIMIT = 4;
const DEFAULT_TOLERANCE = 0.5;

/**
 * Result of path offset operation
 */
export interface OffsetResult {
  /** Offset path(s) - may produce multiple paths due to self-intersection */
  readonly paths: VectorPath[];
  /** Whether operation succeeded */
  readonly success: boolean;
  /** Error message if failed */
  readonly error?: string;
}

/**
 * Offset a vector path by a distance.
 */
export function offsetPath(path: VectorPath, config: OffsetConfig): OffsetResult {
  const { distance, joinStyle = 'MITER', miterLimit = DEFAULT_MITER_LIMIT, tolerance = DEFAULT_TOLERANCE } = config;

  if (Math.abs(distance) < 1e-10) {
    return { paths: [path], success: true };
  }

  try {
    // Convert path to polygon points
    const polygons = flattenPathToPolygons(path, tolerance);
    if (polygons.length === 0) {
      return { paths: [], success: true };
    }

    // Offset each polygon
    const offsetPolygons: Point[][] = [];
    for (const polygon of polygons) {
      if (polygon.length < 2) continue;

      const offsetPoly = offsetPolygon(polygon, distance, joinStyle, miterLimit);
      if (offsetPoly.length >= 3) {
        offsetPolygons.push(offsetPoly);
      }
    }

    // Convert back to vector paths
    const offsetPaths = offsetPolygons.map((poly) => polygonToVectorPath(poly, path.windingRule));

    return { paths: offsetPaths, success: true };
  } catch (error) {
    return {
      paths: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Offset a closed polygon.
 */
function offsetPolygon(
  points: Point[],
  distance: number,
  joinStyle: StrokeJoin,
  miterLimit: number
): Point[] {
  const n = points.length;
  if (n < 2) return [];

  const result: Point[] = [];

  // Determine winding direction
  const area = signedPolygonArea(points);
  const ccw = area > 0;

  // Our normal calculation is (-edge.y, edge.x) which is a 90° CCW rotation.
  // For CCW polygons, this points INWARD. For CW polygons, it points OUTWARD.
  // So for CCW, we negate to get outward; for CW, we keep the direction.
  // Since user wants positive distance = outward expansion:
  const d = ccw ? -distance : distance;

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]!;
    const curr = points[i]!;
    const next = points[(i + 1) % n]!;

    // Compute edge normals
    const edge1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const edge2 = { x: next.x - curr.x, y: next.y - curr.y };

    const len1 = Math.sqrt(edge1.x * edge1.x + edge1.y * edge1.y);
    const len2 = Math.sqrt(edge2.x * edge2.x + edge2.y * edge2.y);

    if (len1 < 1e-10 || len2 < 1e-10) {
      result.push(curr);
      continue;
    }

    // Normalize and get perpendicular (outward normal)
    const n1 = { x: -edge1.y / len1, y: edge1.x / len1 };
    const n2 = { x: -edge2.y / len2, y: edge2.x / len2 };

    // Average normal for miter
    const avgNx = n1.x + n2.x;
    const avgNy = n1.y + n2.y;
    const avgLen = Math.sqrt(avgNx * avgNx + avgNy * avgNy);

    if (avgLen < 1e-10) {
      // Parallel edges - use one normal
      result.push({
        x: curr.x + n1.x * d,
        y: curr.y + n1.y * d,
      });
      continue;
    }

    // Cross product to determine if turning left or right
    const cross = edge1.x * edge2.y - edge1.y * edge2.x;
    const turningOutward = ccw ? cross < 0 : cross > 0;

    // Dot product to get angle
    const dot = n1.x * n2.x + n1.y * n2.y;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    // Miter length factor
    const miterFactor = 1 / Math.cos(angle / 2);

    if (joinStyle === 'MITER' && miterFactor <= miterLimit) {
      // Miter join
      const miterX = (avgNx / avgLen) * d * miterFactor;
      const miterY = (avgNy / avgLen) * d * miterFactor;
      result.push({
        x: curr.x + miterX,
        y: curr.y + miterY,
      });
    } else if (joinStyle === 'ROUND' && turningOutward) {
      // Round join - add arc
      const startAngle = Math.atan2(n1.y, n1.x);
      const endAngle = Math.atan2(n2.y, n2.x);
      addArc(result, curr, Math.abs(d), startAngle, endAngle, d > 0);
    } else {
      // Bevel join or fallback
      result.push({
        x: curr.x + n1.x * d,
        y: curr.y + n1.y * d,
      });
      if (turningOutward) {
        result.push({
          x: curr.x + n2.x * d,
          y: curr.y + n2.y * d,
        });
      }
    }
  }

  return result;
}

/**
 * Add arc points for round join.
 */
function addArc(
  result: Point[],
  center: Point,
  radius: number,
  startAngle: number,
  endAngle: number,
  ccw: boolean
): void {
  // Normalize angles
  let sweep = endAngle - startAngle;
  if (ccw && sweep < 0) sweep += Math.PI * 2;
  if (!ccw && sweep > 0) sweep -= Math.PI * 2;

  const steps = Math.max(2, Math.ceil(Math.abs(sweep) * 6));
  const step = sweep / steps;

  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + i * step;
    result.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }
}

/**
 * Compute signed area of a polygon.
 */
function signedPolygonArea(points: Point[]): number {
  const n = points.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i]!.x * points[j]!.y;
    area -= points[j]!.x * points[i]!.y;
  }
  return area / 2;
}

/**
 * Flatten a vector path to polygon points.
 */
function flattenPathToPolygons(path: VectorPath, tolerance: number): Point[][] {
  const polygons: Point[][] = [];
  let currentPolygon: Point[] = [];
  let currentPoint: Point = { x: 0, y: 0 };
  let startPoint: Point = { x: 0, y: 0 };

  const closePolygon = () => {
    if (currentPolygon.length >= 3) {
      polygons.push(currentPolygon);
    }
    currentPolygon = [];
  };

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        closePolygon();
        currentPoint = { x: cmd.x, y: cmd.y };
        startPoint = currentPoint;
        currentPolygon.push(currentPoint);
        break;

      case 'L':
        currentPoint = { x: cmd.x, y: cmd.y };
        currentPolygon.push(currentPoint);
        break;

      case 'C':
        // Flatten bezier curve
        const flatPoints = flattenBezier(
          currentPoint,
          { x: cmd.x1, y: cmd.y1 },
          { x: cmd.x2, y: cmd.y2 },
          { x: cmd.x, y: cmd.y },
          tolerance
        );
        // Skip first point (same as current)
        for (let i = 1; i < flatPoints.length; i++) {
          currentPolygon.push(flatPoints[i]!);
        }
        currentPoint = { x: cmd.x, y: cmd.y };
        break;

      case 'Z':
        currentPoint = startPoint;
        closePolygon();
        break;
    }
  }

  closePolygon();
  return polygons;
}

/**
 * Flatten a cubic bezier curve to line segments.
 */
function flattenBezier(p0: Point, p1: Point, p2: Point, p3: Point, tolerance: number): Point[] {
  const result: Point[] = [p0];
  flattenBezierRecursive(p0, p1, p2, p3, tolerance * tolerance, result);
  return result;
}

function flattenBezierRecursive(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  toleranceSq: number,
  result: Point[]
): void {
  // Check flatness
  const flatness = maxDeviation(p0, p1, p2, p3);

  if (flatness <= toleranceSq) {
    result.push(p3);
    return;
  }

  // Subdivide at midpoint
  const { left, right } = splitBezier(p0, p1, p2, p3);
  flattenBezierRecursive(left[0], left[1], left[2], left[3], toleranceSq, result);
  flattenBezierRecursive(right[0], right[1], right[2], right[3], toleranceSq, result);
}

function maxDeviation(p0: Point, p1: Point, p2: Point, p3: Point): number {
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 1e-10) {
    const d1 = (p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2;
    const d2 = (p2.x - p0.x) ** 2 + (p2.y - p0.y) ** 2;
    return Math.max(d1, d2);
  }

  const t1 = ((p1.x - p0.x) * dx + (p1.y - p0.y) * dy) / lenSq;
  const proj1x = p0.x + t1 * dx;
  const proj1y = p0.y + t1 * dy;
  const d1 = (p1.x - proj1x) ** 2 + (p1.y - proj1y) ** 2;

  const t2 = ((p2.x - p0.x) * dx + (p2.y - p0.y) * dy) / lenSq;
  const proj2x = p0.x + t2 * dx;
  const proj2y = p0.y + t2 * dy;
  const d2 = (p2.x - proj2x) ** 2 + (p2.y - proj2y) ** 2;

  return Math.max(d1, d2);
}

function splitBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): { left: [Point, Point, Point, Point]; right: [Point, Point, Point, Point] } {
  const t = 0.5;
  const p01: Point = { x: p0.x + t * (p1.x - p0.x), y: p0.y + t * (p1.y - p0.y) };
  const p12: Point = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
  const p23: Point = { x: p2.x + t * (p3.x - p2.x), y: p2.y + t * (p3.y - p2.y) };
  const p012: Point = { x: p01.x + t * (p12.x - p01.x), y: p01.y + t * (p12.y - p01.y) };
  const p123: Point = { x: p12.x + t * (p23.x - p12.x), y: p12.y + t * (p23.y - p12.y) };
  const p0123: Point = { x: p012.x + t * (p123.x - p012.x), y: p012.y + t * (p123.y - p012.y) };

  return {
    left: [p0, p01, p012, p0123],
    right: [p0123, p123, p23, p3],
  };
}

/**
 * Convert polygon points to a vector path.
 */
function polygonToVectorPath(points: Point[], windingRule: 'NONZERO' | 'EVENODD'): VectorPath {
  if (points.length === 0) {
    return { windingRule, commands: [] };
  }

  const commands: PathCommand[] = [{ type: 'M', x: points[0]!.x, y: points[0]!.y }];

  for (let i = 1; i < points.length; i++) {
    commands.push({ type: 'L', x: points[i]!.x, y: points[i]!.y });
  }

  commands.push({ type: 'Z' });

  return { windingRule, commands };
}

/**
 * Offset a path for stroke alignment.
 * Returns the inside or outside path based on alignment.
 */
export function offsetForStrokeAlignment(
  path: VectorPath,
  strokeWeight: number,
  alignment: 'INSIDE' | 'CENTER' | 'OUTSIDE',
  joinStyle: StrokeJoin = 'MITER',
  miterLimit: number = DEFAULT_MITER_LIMIT
): OffsetResult {
  switch (alignment) {
    case 'INSIDE':
      return offsetPath(path, {
        distance: -strokeWeight / 2,
        joinStyle,
        miterLimit,
      });

    case 'OUTSIDE':
      return offsetPath(path, {
        distance: strokeWeight / 2,
        joinStyle,
        miterLimit,
      });

    case 'CENTER':
    default:
      return { paths: [path], success: true };
  }
}

/**
 * Create expanded stroke outline from a path.
 * Returns the outer and inner paths that form the stroke area.
 */
export function createStrokeOutline(
  path: VectorPath,
  strokeWeight: number,
  joinStyle: StrokeJoin = 'MITER',
  miterLimit: number = DEFAULT_MITER_LIMIT
): { outer: OffsetResult; inner: OffsetResult } {
  const halfWeight = strokeWeight / 2;

  const outer = offsetPath(path, {
    distance: halfWeight,
    joinStyle,
    miterLimit,
  });

  const inner = offsetPath(path, {
    distance: -halfWeight,
    joinStyle,
    miterLimit,
  });

  return { outer, inner };
}
