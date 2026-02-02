/**
 * Path Operations
 *
 * Operations for manipulating vector paths:
 * - Simplify: reduce anchor count while preserving shape
 * - Reverse: reverse path direction
 * - Flatten: convert curves to line segments
 * - Outline Stroke: convert stroke to filled path
 */

import type { Point, VectorPath, PathCommand } from '@core/types/geometry';

/**
 * Simplify path options
 */
export interface SimplifyOptions {
  /** Tolerance for point removal (higher = fewer points) */
  readonly tolerance: number;
  /** Preserve corners above this angle threshold (degrees) */
  readonly cornerThreshold?: number;
}

/**
 * Flatten path options
 */
export interface FlattenOptions {
  /** Tolerance for curve approximation (smaller = more segments) */
  readonly tolerance: number;
  /** Maximum segment length */
  readonly maxSegmentLength?: number;
}

/**
 * Outline stroke options
 */
export interface OutlineStrokeOptions {
  /** Stroke weight */
  readonly strokeWeight: number;
  /** Cap style: 'butt' | 'round' | 'square' */
  readonly cap?: 'butt' | 'round' | 'square';
  /** Join style: 'miter' | 'round' | 'bevel' */
  readonly join?: 'miter' | 'round' | 'bevel';
  /** Miter limit for sharp corners */
  readonly miterLimit?: number;
}

/**
 * Reverse the direction of a path.
 * This reverses the order of commands so the path is drawn in the opposite direction.
 */
export function reversePath(path: VectorPath): VectorPath {
  const commands = path.commands;
  if (commands.length === 0) {
    return path;
  }

  // Extract points from commands
  const points: Point[] = [];
  let isClosed = false;

  for (const cmd of commands) {
    if (cmd.type === 'M' || cmd.type === 'L') {
      points.push({ x: cmd.x, y: cmd.y });
    } else if (cmd.type === 'C') {
      points.push({ x: cmd.x, y: cmd.y });
    } else if (cmd.type === 'Z') {
      isClosed = true;
    }
  }

  if (points.length === 0) {
    return path;
  }

  // Build reversed commands
  const reversedCommands: PathCommand[] = [];

  // Start with MoveTo to the last point
  const lastPoint = points[points.length - 1]!;
  reversedCommands.push({ type: 'M', x: lastPoint.x, y: lastPoint.y });

  // Process commands in reverse, handling curves specially
  const originalCommands = [...commands].filter(c => c.type !== 'M' && c.type !== 'Z');

  for (let i = originalCommands.length - 1; i >= 0; i--) {
    const cmd = originalCommands[i]!;
    const prevPoint = i > 0 ? getCommandEndPoint(originalCommands[i - 1]!) : getCommandEndPoint(commands[0]!);

    if (cmd.type === 'L') {
      reversedCommands.push({ type: 'L', x: prevPoint.x, y: prevPoint.y });
    } else if (cmd.type === 'C') {
      // For cubic bezier, swap control points
      reversedCommands.push({
        type: 'C',
        x1: cmd.x2,
        y1: cmd.y2,
        x2: cmd.x1,
        y2: cmd.y1,
        x: prevPoint.x,
        y: prevPoint.y,
      });
    }
  }

  if (isClosed) {
    reversedCommands.push({ type: 'Z' });
  }

  return {
    windingRule: path.windingRule,
    commands: reversedCommands,
  };
}

/**
 * Get the end point of a path command
 */
function getCommandEndPoint(cmd: PathCommand): Point {
  if (cmd.type === 'Z') {
    return { x: 0, y: 0 }; // Should not happen in normal use
  }
  return { x: cmd.x, y: cmd.y };
}

/**
 * Simplify a path using the Ramer-Douglas-Peucker algorithm.
 * Reduces the number of points while preserving the overall shape.
 */
export function simplifyPath(path: VectorPath, options: SimplifyOptions): VectorPath {
  const { tolerance, cornerThreshold = 30 } = options;

  if (tolerance <= 0) {
    return path;
  }

  // Convert to points array
  const points = pathToPoints(path);
  if (points.length < 3) {
    return path;
  }

  // Check if closed
  const isClosed = path.commands.some(c => c.type === 'Z');

  // Apply Douglas-Peucker simplification
  const simplified = douglasPeucker(points, tolerance);

  // Preserve corners (high angle points)
  const cornerRad = (cornerThreshold * Math.PI) / 180;
  const withCorners = preserveCorners(points, simplified, cornerRad);

  // Convert back to path
  return pointsToPath(withCorners, isClosed, path.windingRule);
}

/**
 * Douglas-Peucker simplification algorithm
 */
function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) {
    return points;
  }

  // Find point with maximum distance from line between first and last
  let maxDist = 0;
  let maxIndex = 0;
  const first = points[0]!;
  const last = points[points.length - 1]!;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i]!, first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  // Otherwise, return just the endpoints
  return [first, last];
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
    );
  }

  const t = Math.max(0, Math.min(1,
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq
  ));

  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;

  return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
}

/**
 * Preserve corner points that were removed by simplification
 */
function preserveCorners(
  original: Point[],
  simplified: Point[],
  cornerThreshold: number
): Point[] {
  const result: Point[] = [];
  const simplifiedSet = new Set(simplified.map(p => `${p.x},${p.y}`));

  for (let i = 0; i < original.length; i++) {
    const point = original[i]!;
    const key = `${point.x},${point.y}`;

    if (simplifiedSet.has(key)) {
      result.push(point);
    } else {
      // Check if this is a corner
      const prev = original[i - 1] ?? original[original.length - 1];
      const next = original[i + 1] ?? original[0];

      if (prev && next) {
        const angle = calculateAngle(prev, point, next);
        if (Math.abs(Math.PI - angle) > cornerThreshold) {
          result.push(point);
        }
      }
    }
  }

  return result.length > 0 ? result : simplified;
}

/**
 * Calculate angle at vertex (in radians)
 */
function calculateAngle(p1: Point, vertex: Point, p2: Point): number {
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;
  const v2x = p2.x - vertex.x;
  const v2y = p2.y - vertex.y;

  const dot = v1x * v2x + v1y * v2y;
  const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (len1 === 0 || len2 === 0) return Math.PI;

  const cos = Math.max(-1, Math.min(1, dot / (len1 * len2)));
  return Math.acos(cos);
}

/**
 * Flatten a path - convert all curves to line segments
 */
export function flattenPath(path: VectorPath, options: FlattenOptions): VectorPath {
  const { tolerance, maxSegmentLength = Infinity } = options;
  const commands: PathCommand[] = [];
  let currentPoint: Point = { x: 0, y: 0 };

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      commands.push(cmd);
      currentPoint = { x: cmd.x, y: cmd.y };
    } else if (cmd.type === 'L') {
      // Subdivide long lines if needed
      const endPoint = { x: cmd.x, y: cmd.y };
      const dist = Math.sqrt(
        Math.pow(endPoint.x - currentPoint.x, 2) +
        Math.pow(endPoint.y - currentPoint.y, 2)
      );

      if (dist > maxSegmentLength) {
        const segments = Math.ceil(dist / maxSegmentLength);
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          commands.push({
            type: 'L',
            x: currentPoint.x + t * (endPoint.x - currentPoint.x),
            y: currentPoint.y + t * (endPoint.y - currentPoint.y),
          });
        }
      } else {
        commands.push(cmd);
      }
      currentPoint = endPoint;
    } else if (cmd.type === 'C') {
      // Flatten cubic bezier
      const points = flattenCubicBezier(
        currentPoint,
        { x: cmd.x1, y: cmd.y1 },
        { x: cmd.x2, y: cmd.y2 },
        { x: cmd.x, y: cmd.y },
        tolerance
      );

      for (const p of points.slice(1)) {
        commands.push({ type: 'L', x: p.x, y: p.y });
      }
      currentPoint = { x: cmd.x, y: cmd.y };
    } else if (cmd.type === 'Z') {
      commands.push(cmd);
    }
  }

  return { windingRule: path.windingRule, commands };
}

/**
 * Flatten a cubic bezier curve to line segments using adaptive subdivision
 */
function flattenCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  tolerance: number
): Point[] {
  const result: Point[] = [p0];

  function subdivide(
    a0: Point, a1: Point, a2: Point, a3: Point,
    depth: number
  ): void {
    if (depth > 10) {
      result.push(a3);
      return;
    }

    // Check if curve is flat enough
    const d1 = perpendicularDistance(a1, a0, a3);
    const d2 = perpendicularDistance(a2, a0, a3);

    if (d1 + d2 <= tolerance) {
      result.push(a3);
      return;
    }

    // Subdivide using de Casteljau
    const m01 = midpoint(a0, a1);
    const m12 = midpoint(a1, a2);
    const m23 = midpoint(a2, a3);
    const m012 = midpoint(m01, m12);
    const m123 = midpoint(m12, m23);
    const m0123 = midpoint(m012, m123);

    subdivide(a0, m01, m012, m0123, depth + 1);
    subdivide(m0123, m123, m23, a3, depth + 1);
  }

  subdivide(p0, p1, p2, p3, 0);
  return result;
}

/**
 * Calculate midpoint between two points
 */
function midpoint(p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

/**
 * Outline stroke - convert a stroked path to a filled path
 */
export function outlineStroke(path: VectorPath, options: OutlineStrokeOptions): VectorPath[] {
  const {
    strokeWeight,
    cap = 'butt',
    join = 'miter',
    miterLimit = 4,
  } = options;

  const halfWidth = strokeWeight / 2;

  // Flatten the path first for easier processing
  const flatPath = flattenPath(path, { tolerance: 0.5 });
  const points = pathToPoints(flatPath);

  if (points.length < 2) {
    return [];
  }

  const isClosed = path.commands.some(c => c.type === 'Z');

  // Generate offset paths
  const leftPath = offsetPolyline(points, halfWidth, join, miterLimit, isClosed);
  const rightPath = offsetPolyline(points, -halfWidth, join, miterLimit, isClosed);

  if (isClosed) {
    // For closed paths, return inner and outer as separate paths
    return [
      pointsToPath(leftPath, true, path.windingRule),
      pointsToPath(rightPath.reverse(), true, path.windingRule),
    ];
  } else {
    // For open paths, connect the ends with caps
    const outline: Point[] = [];

    // Start with left side
    outline.push(...leftPath);

    // Add end cap
    const endCapPoints = generateCap(
      points[points.length - 1]!,
      points[points.length - 2]!,
      halfWidth,
      cap
    );
    outline.push(...endCapPoints);

    // Add right side (reversed)
    outline.push(...rightPath.reverse());

    // Add start cap
    const startCapPoints = generateCap(
      points[0]!,
      points[1]!,
      halfWidth,
      cap
    );
    outline.push(...startCapPoints.reverse());

    return [pointsToPath(outline, true, path.windingRule)];
  }
}

/**
 * Offset a polyline
 */
function offsetPolyline(
  points: Point[],
  distance: number,
  join: 'miter' | 'round' | 'bevel',
  miterLimit: number,
  isClosed: boolean
): Point[] {
  const result: Point[] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const curr = points[i]!;
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];

    if (!isClosed && i === 0) {
      // First point of open path
      const normal = getSegmentNormal(curr, next!);
      result.push({
        x: curr.x + normal.x * distance,
        y: curr.y + normal.y * distance,
      });
    } else if (!isClosed && i === n - 1) {
      // Last point of open path
      const normal = getSegmentNormal(prev!, curr);
      result.push({
        x: curr.x + normal.x * distance,
        y: curr.y + normal.y * distance,
      });
    } else {
      // Interior point or closed path point
      const n1 = getSegmentNormal(prev!, curr);
      const n2 = getSegmentNormal(curr, next!);

      // Calculate bisector
      const bisector = {
        x: n1.x + n2.x,
        y: n1.y + n2.y,
      };
      const bisectorLen = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y);

      if (bisectorLen < 0.001) {
        // Parallel segments, use normal
        result.push({
          x: curr.x + n1.x * distance,
          y: curr.y + n1.y * distance,
        });
      } else {
        // Calculate offset along bisector
        const dot = n1.x * n2.x + n1.y * n2.y;
        const scale = distance / Math.sqrt((1 + dot) / 2);

        if (Math.abs(scale) > Math.abs(distance) * miterLimit) {
          // Miter limit exceeded, use bevel or fallback
          if (join === 'bevel') {
            result.push({
              x: curr.x + n1.x * distance,
              y: curr.y + n1.y * distance,
            });
            result.push({
              x: curr.x + n2.x * distance,
              y: curr.y + n2.y * distance,
            });
          } else {
            // Fallback to bevel
            result.push({
              x: curr.x + n1.x * distance,
              y: curr.y + n1.y * distance,
            });
          }
        } else {
          const nx = bisector.x / bisectorLen;
          const ny = bisector.y / bisectorLen;
          result.push({
            x: curr.x + nx * scale,
            y: curr.y + ny * scale,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Get normal vector for a segment
 */
function getSegmentNormal(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: 1 };
  return { x: -dy / len, y: dx / len };
}

/**
 * Generate cap points for stroke end
 */
function generateCap(
  endPoint: Point,
  prevPoint: Point,
  halfWidth: number,
  cap: 'butt' | 'round' | 'square'
): Point[] {
  const dx = endPoint.x - prevPoint.x;
  const dy = endPoint.y - prevPoint.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) return [];

  const nx = -dy / len;
  const ny = dx / len;
  const tx = dx / len;
  const ty = dy / len;

  switch (cap) {
    case 'butt':
      return [
        { x: endPoint.x + nx * halfWidth, y: endPoint.y + ny * halfWidth },
        { x: endPoint.x - nx * halfWidth, y: endPoint.y - ny * halfWidth },
      ];

    case 'square':
      return [
        { x: endPoint.x + nx * halfWidth + tx * halfWidth, y: endPoint.y + ny * halfWidth + ty * halfWidth },
        { x: endPoint.x - nx * halfWidth + tx * halfWidth, y: endPoint.y - ny * halfWidth + ty * halfWidth },
      ];

    case 'round': {
      const points: Point[] = [];
      const segments = 8;
      for (let i = 0; i <= segments; i++) {
        const angle = (Math.PI * i) / segments - Math.PI / 2;
        const rx = Math.cos(angle) * nx - Math.sin(angle) * tx;
        const ry = Math.cos(angle) * ny - Math.sin(angle) * ty;
        points.push({
          x: endPoint.x + rx * halfWidth,
          y: endPoint.y + ry * halfWidth,
        });
      }
      return points;
    }

    default:
      return [];
  }
}

/**
 * Convert path to array of points
 */
function pathToPoints(path: VectorPath): Point[] {
  const points: Point[] = [];

  for (const cmd of path.commands) {
    if (cmd.type === 'M' || cmd.type === 'L') {
      points.push({ x: cmd.x, y: cmd.y });
    } else if (cmd.type === 'C') {
      points.push({ x: cmd.x, y: cmd.y });
    }
  }

  return points;
}

/**
 * Convert array of points to path
 */
function pointsToPath(points: Point[], isClosed: boolean, windingRule: 'NONZERO' | 'EVENODD'): VectorPath {
  if (points.length === 0) {
    return { windingRule, commands: [] };
  }

  const commands: PathCommand[] = [];
  commands.push({ type: 'M', x: points[0]!.x, y: points[0]!.y });

  for (let i = 1; i < points.length; i++) {
    commands.push({ type: 'L', x: points[i]!.x, y: points[i]!.y });
  }

  if (isClosed) {
    commands.push({ type: 'Z' });
  }

  return { windingRule, commands };
}

/**
 * Close an open path by connecting start and end
 */
export function closePath(path: VectorPath): VectorPath {
  if (path.commands.length === 0) {
    return path;
  }

  const lastCmd = path.commands[path.commands.length - 1];
  if (lastCmd?.type === 'Z') {
    return path; // Already closed
  }

  return {
    windingRule: path.windingRule,
    commands: [...path.commands, { type: 'Z' }],
  };
}

/**
 * Open a closed path by removing the Z command
 */
export function openPath(path: VectorPath): VectorPath {
  const commands = path.commands.filter(c => c.type !== 'Z');
  return { windingRule: path.windingRule, commands };
}

/**
 * Get path statistics
 */
export interface PathStats {
  readonly anchorCount: number;
  readonly segmentCount: number;
  readonly curveCount: number;
  readonly lineCount: number;
  readonly isClosed: boolean;
  readonly approximateLength: number;
}

export function getPathStats(path: VectorPath): PathStats {
  let anchorCount = 0;
  let curveCount = 0;
  let lineCount = 0;
  let isClosed = false;
  let length = 0;
  let prevPoint: Point | null = null;

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      anchorCount++;
      prevPoint = { x: cmd.x, y: cmd.y };
    } else if (cmd.type === 'L') {
      anchorCount++;
      lineCount++;
      if (prevPoint) {
        length += Math.sqrt(
          Math.pow(cmd.x - prevPoint.x, 2) + Math.pow(cmd.y - prevPoint.y, 2)
        );
      }
      prevPoint = { x: cmd.x, y: cmd.y };
    } else if (cmd.type === 'C') {
      anchorCount++;
      curveCount++;
      // Approximate curve length
      if (prevPoint) {
        length += approximateBezierLength(
          prevPoint,
          { x: cmd.x1, y: cmd.y1 },
          { x: cmd.x2, y: cmd.y2 },
          { x: cmd.x, y: cmd.y }
        );
      }
      prevPoint = { x: cmd.x, y: cmd.y };
    } else if (cmd.type === 'Z') {
      isClosed = true;
    }
  }

  return {
    anchorCount,
    segmentCount: lineCount + curveCount,
    curveCount,
    lineCount,
    isClosed,
    approximateLength: length,
  };
}

/**
 * Approximate bezier curve length using chord length
 */
function approximateBezierLength(p0: Point, p1: Point, p2: Point, p3: Point): number {
  // Use chord + control polygon average for approximation
  const chord = Math.sqrt(Math.pow(p3.x - p0.x, 2) + Math.pow(p3.y - p0.y, 2));
  const controlLen =
    Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2)) +
    Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)) +
    Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2));

  return (chord + controlLen) / 2;
}
