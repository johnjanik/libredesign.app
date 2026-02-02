/**
 * Circle/Curve Division Functions
 *
 * Implements geometric division functions for circles and curves:
 * - circularPattern: Creates a circular array (polar array) of elements
 * - divideCurve: Places points at equal intervals along a curve
 * - divideCircle: Specialized circle division
 * - divideLine: Specialized line division
 */

import type { Point } from '@core/types/geometry';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Circle definition */
export interface Circle {
  readonly center: Point;
  readonly radius: number;
}

/** Line segment definition */
export interface LineSegment {
  readonly start: Point;
  readonly end: Point;
}

/** Arc definition */
export interface Arc {
  readonly center: Point;
  readonly radius: number;
  readonly startAngle: number; // In radians
  readonly endAngle: number; // In radians
  readonly clockwise?: boolean;
}

/** Parametric curve function */
export type ParametricCurve = (t: number) => Point;

/** Curve types that can be divided */
export type Curve = Circle | LineSegment | Arc | Point[] | ParametricCurve;

/** Division result */
export interface DivisionResult {
  readonly points: Point[];
  readonly parameters?: readonly number[]; // For parametric curves (t values)
}

/** Division options */
export interface DivisionOptions {
  /** Include start and end points (default: true) */
  readonly includeEndpoints?: boolean;
  /** Divide in parameter space rather than geometric space (default: false) */
  readonly parameterSpace?: boolean;
  /** Precision for iterative methods (default: 1e-6) */
  readonly precision?: number;
  /** Maximum iterations for adaptive division (default: 1000) */
  readonly maxIterations?: number;
  /** Reference angle for circle division in radians (default: 0) */
  readonly referenceAngle?: number;
}

/** Circular pattern result */
export interface CircularPatternResult<T> {
  readonly elements: T[];
  readonly angles: readonly number[]; // In radians
  readonly positions: readonly Point[];
}

/** Circular pattern options */
export interface CircularPatternOptions {
  /** Whether to rotate elements to face center (default: false) */
  readonly rotateElements?: boolean;
  /** Starting angle offset in radians (default: 0) */
  readonly referenceAngle?: number;
  /** Direction: clockwise or counter-clockwise (default: 'ccw') */
  readonly direction?: 'cw' | 'ccw';
  /** Total angle to fill in radians (default: 2 * Math.PI) */
  readonly fillAngle?: number;
}

/** Element with position for circular pattern */
export interface PositionedElement {
  readonly position: Point;
  readonly rotation?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export enum DivisionError {
  INVALID_SEGMENTS = 'Number of segments must be >= 1',
  INVALID_RADIUS = 'Circle radius must be positive',
  INVALID_CURVE = 'Invalid curve specification',
  ITERATION_LIMIT = 'Maximum iterations reached in adaptive division',
  ZERO_LENGTH = 'Curve has zero length',
  INVALID_COUNT = 'Count must be >= 1',
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Calculate distance between two points */
function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Calculate angle from center to point */
function angleFromCenter(center: Point, point: Point): number {
  return Math.atan2(point.y - center.y, point.x - center.x);
}

/** Rotate a point around a center by an angle */
function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/** Linear interpolation between two points */
function lerp(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

/** Check if value is a circle */
function isCircle(curve: Curve): curve is Circle {
  return (
    typeof curve === 'object' &&
    curve !== null &&
    'center' in curve &&
    'radius' in curve &&
    !('startAngle' in curve)
  );
}

/** Check if value is an arc */
function isArc(curve: Curve): curve is Arc {
  return (
    typeof curve === 'object' &&
    curve !== null &&
    'center' in curve &&
    'radius' in curve &&
    'startAngle' in curve &&
    'endAngle' in curve
  );
}

/** Check if value is a line segment */
function isLineSegment(curve: Curve): curve is LineSegment {
  return (
    typeof curve === 'object' &&
    curve !== null &&
    'start' in curve &&
    'end' in curve
  );
}

/** Check if value is a polyline (array of points) */
function isPolyline(curve: Curve): curve is Point[] {
  return Array.isArray(curve);
}

/** Check if value is a parametric curve function */
function isParametricCurve(curve: Curve): curve is ParametricCurve {
  return typeof curve === 'function';
}

// ============================================================================
// Circle Division
// ============================================================================

/**
 * Divide a circle into equal segments.
 *
 * @param circle - The circle to divide
 * @param segments - Number of segments (points = segments for a closed circle)
 * @param options - Division options
 * @returns Division result with points
 */
export function divideCircle(
  circle: Circle,
  segments: number,
  options: Pick<DivisionOptions, 'includeEndpoints' | 'referenceAngle'> = {}
): DivisionResult {
  if (segments < 1) {
    throw new Error(DivisionError.INVALID_SEGMENTS);
  }
  if (circle.radius <= 0) {
    throw new Error(DivisionError.INVALID_RADIUS);
  }

  const referenceAngle = options.referenceAngle ?? 0;
  const points: Point[] = [];
  const parameters: number[] = [];
  const angleStep = (2 * Math.PI) / segments;

  for (let i = 0; i < segments; i++) {
    const angle = referenceAngle + i * angleStep;
    const t = i / segments;
    points.push({
      x: circle.center.x + circle.radius * Math.cos(angle),
      y: circle.center.y + circle.radius * Math.sin(angle),
    });
    parameters.push(t);
  }

  return { points, parameters };
}

/**
 * Divide an arc into equal segments.
 *
 * @param arc - The arc to divide
 * @param segments - Number of segments
 * @param options - Division options
 * @returns Division result with points
 */
export function divideArc(
  arc: Arc,
  segments: number,
  options: Pick<DivisionOptions, 'includeEndpoints'> = {}
): DivisionResult {
  if (segments < 1) {
    throw new Error(DivisionError.INVALID_SEGMENTS);
  }
  if (arc.radius <= 0) {
    throw new Error(DivisionError.INVALID_RADIUS);
  }

  const includeEndpoints = options.includeEndpoints ?? true;
  const points: Point[] = [];
  const parameters: number[] = [];

  // Calculate the arc angle
  let arcAngle = arc.endAngle - arc.startAngle;
  if (arc.clockwise) {
    if (arcAngle > 0) {
      arcAngle -= 2 * Math.PI;
    }
  } else {
    if (arcAngle < 0) {
      arcAngle += 2 * Math.PI;
    }
  }

  const numPoints = includeEndpoints ? segments + 1 : segments - 1;
  const startOffset = includeEndpoints ? 0 : 1;
  const divisor = includeEndpoints ? segments : segments;

  for (let i = 0; i < numPoints; i++) {
    const t = (i + startOffset) / divisor;
    const angle = arc.startAngle + arcAngle * t;
    points.push({
      x: arc.center.x + arc.radius * Math.cos(angle),
      y: arc.center.y + arc.radius * Math.sin(angle),
    });
    parameters.push(t);
  }

  return { points, parameters };
}

// ============================================================================
// Line Division
// ============================================================================

/**
 * Divide a line segment into equal segments.
 *
 * @param line - The line segment to divide
 * @param segments - Number of segments
 * @param options - Division options
 * @returns Division result with points
 */
export function divideLine(
  line: LineSegment,
  segments: number,
  options: Pick<DivisionOptions, 'includeEndpoints'> = {}
): DivisionResult {
  if (segments < 1) {
    throw new Error(DivisionError.INVALID_SEGMENTS);
  }

  const lineLength = distance(line.start, line.end);
  if (lineLength === 0) {
    throw new Error(DivisionError.ZERO_LENGTH);
  }

  const includeEndpoints = options.includeEndpoints ?? true;
  const points: Point[] = [];
  const parameters: number[] = [];

  const numPoints = includeEndpoints ? segments + 1 : segments - 1;
  const startOffset = includeEndpoints ? 0 : 1;

  for (let i = 0; i < numPoints; i++) {
    const t = (i + startOffset) / segments;
    points.push(lerp(line.start, line.end, t));
    parameters.push(t);
  }

  return { points, parameters };
}

// ============================================================================
// Polyline Division
// ============================================================================

/**
 * Calculate the total length of a polyline.
 */
function polylineLength(points: readonly Point[]): number {
  if (points.length < 2) return 0;

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1]!, points[i]!);
  }
  return length;
}

/**
 * Get point at a specific distance along a polyline.
 */
function pointAtDistanceOnPolyline(
  points: readonly Point[],
  targetDistance: number
): Point {
  if (points.length === 0) {
    throw new Error(DivisionError.INVALID_CURVE);
  }
  if (points.length === 1) {
    return points[0]!;
  }

  let accumulatedDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const segmentLength = distance(points[i - 1]!, points[i]!);
    if (accumulatedDistance + segmentLength >= targetDistance) {
      const remainingDistance = targetDistance - accumulatedDistance;
      const t = segmentLength > 0 ? remainingDistance / segmentLength : 0;
      return lerp(points[i - 1]!, points[i]!, t);
    }
    accumulatedDistance += segmentLength;
  }

  // Return last point if distance exceeds polyline length
  return points[points.length - 1]!;
}

/**
 * Divide a polyline into equal segments.
 *
 * @param polyline - Array of points forming the polyline
 * @param segments - Number of segments
 * @param options - Division options
 * @returns Division result with points
 */
export function dividePolyline(
  polyline: readonly Point[],
  segments: number,
  options: Pick<DivisionOptions, 'includeEndpoints'> = {}
): DivisionResult {
  if (segments < 1) {
    throw new Error(DivisionError.INVALID_SEGMENTS);
  }
  if (polyline.length < 2) {
    throw new Error(DivisionError.INVALID_CURVE);
  }

  const totalLength = polylineLength(polyline);
  if (totalLength === 0) {
    throw new Error(DivisionError.ZERO_LENGTH);
  }

  const includeEndpoints = options.includeEndpoints ?? true;
  const points: Point[] = [];
  const parameters: number[] = [];

  const numPoints = includeEndpoints ? segments + 1 : segments - 1;
  const startOffset = includeEndpoints ? 0 : 1;
  const segmentLength = totalLength / segments;

  for (let i = 0; i < numPoints; i++) {
    const targetDistance = (i + startOffset) * segmentLength;
    const t = (i + startOffset) / segments;
    points.push(pointAtDistanceOnPolyline(polyline, targetDistance));
    parameters.push(t);
  }

  return { points, parameters };
}

// ============================================================================
// Parametric Curve Division
// ============================================================================

/**
 * Estimate arc length of a parametric curve using numerical integration.
 */
function estimateArcLength(
  curve: ParametricCurve,
  t0: number,
  t1: number,
  numSamples: number = 100
): number {
  let length = 0;
  const step = (t1 - t0) / numSamples;
  let prevPoint = curve(t0);

  for (let i = 1; i <= numSamples; i++) {
    const t = t0 + i * step;
    const point = curve(t);
    length += distance(prevPoint, point);
    prevPoint = point;
  }

  return length;
}

/**
 * Find t value for a target arc length using binary search.
 */
function findTForArcLength(
  curve: ParametricCurve,
  targetLength: number,
  _totalLength: number,
  precision: number,
  maxIterations: number
): number {
  let low = 0;
  let high = 1;
  let iteration = 0;

  while (iteration < maxIterations) {
    const mid = (low + high) / 2;
    const length = estimateArcLength(curve, 0, mid);

    if (Math.abs(length - targetLength) < precision) {
      return mid;
    }

    if (length < targetLength) {
      low = mid;
    } else {
      high = mid;
    }

    iteration++;
  }

  return (low + high) / 2;
}

/**
 * Divide a parametric curve into equal segments.
 *
 * @param curve - Parametric curve function f(t) -> Point where t in [0, 1]
 * @param segments - Number of segments
 * @param options - Division options
 * @returns Division result with points
 */
export function divideParametricCurve(
  curve: ParametricCurve,
  segments: number,
  options: DivisionOptions = {}
): DivisionResult {
  if (segments < 1) {
    throw new Error(DivisionError.INVALID_SEGMENTS);
  }

  const includeEndpoints = options.includeEndpoints ?? true;
  const parameterSpace = options.parameterSpace ?? false;
  const precision = options.precision ?? 1e-6;
  const maxIterations = options.maxIterations ?? 1000;

  const points: Point[] = [];
  const parameters: number[] = [];

  const numPoints = includeEndpoints ? segments + 1 : segments - 1;
  const startOffset = includeEndpoints ? 0 : 1;

  if (parameterSpace) {
    // Simple parameter space division
    for (let i = 0; i < numPoints; i++) {
      const t = (i + startOffset) / segments;
      points.push(curve(t));
      parameters.push(t);
    }
  } else {
    // Geometric space division (equal arc lengths)
    const totalLength = estimateArcLength(curve, 0, 1);
    if (totalLength === 0) {
      throw new Error(DivisionError.ZERO_LENGTH);
    }

    const segmentLength = totalLength / segments;

    for (let i = 0; i < numPoints; i++) {
      const targetLength = (i + startOffset) * segmentLength;
      const t = findTForArcLength(curve, targetLength, totalLength, precision, maxIterations);
      points.push(curve(t));
      parameters.push(t);
    }
  }

  return { points, parameters };
}

// ============================================================================
// Generic Curve Division
// ============================================================================

/**
 * Divide any supported curve type into equal segments.
 *
 * @param curve - The curve to divide (circle, arc, line, polyline, or parametric function)
 * @param segments - Number of segments
 * @param options - Division options
 * @returns Division result with points
 */
export function divideCurve(
  curve: Curve,
  segments: number,
  options: DivisionOptions = {}
): DivisionResult {
  if (isCircle(curve)) {
    return divideCircle(curve, segments, options);
  }
  if (isArc(curve)) {
    return divideArc(curve, segments, options);
  }
  if (isLineSegment(curve)) {
    return divideLine(curve, segments, options);
  }
  if (isPolyline(curve)) {
    return dividePolyline(curve, segments, options);
  }
  if (isParametricCurve(curve)) {
    return divideParametricCurve(curve, segments, options);
  }

  throw new Error(DivisionError.INVALID_CURVE);
}

/**
 * Divide a curve by desired segment length rather than count.
 *
 * @param curve - The curve to divide
 * @param segmentLength - Desired length of each segment
 * @param options - Division options
 * @returns Division result with points
 */
export function divideCurveByLength(
  curve: Curve,
  segmentLength: number,
  options: DivisionOptions = {}
): DivisionResult {
  if (segmentLength <= 0) {
    throw new Error(DivisionError.INVALID_SEGMENTS);
  }

  // Calculate total length based on curve type
  let totalLength: number;

  if (isCircle(curve)) {
    totalLength = 2 * Math.PI * curve.radius;
  } else if (isArc(curve)) {
    let arcAngle = Math.abs(curve.endAngle - curve.startAngle);
    if (arcAngle > 2 * Math.PI) {
      arcAngle = 2 * Math.PI;
    }
    totalLength = arcAngle * curve.radius;
  } else if (isLineSegment(curve)) {
    totalLength = distance(curve.start, curve.end);
  } else if (isPolyline(curve)) {
    totalLength = polylineLength(curve);
  } else if (isParametricCurve(curve)) {
    totalLength = estimateArcLength(curve, 0, 1);
  } else {
    throw new Error(DivisionError.INVALID_CURVE);
  }

  if (totalLength === 0) {
    throw new Error(DivisionError.ZERO_LENGTH);
  }

  const segments = Math.max(1, Math.round(totalLength / segmentLength));
  return divideCurve(curve, segments, options);
}

// ============================================================================
// Circular Pattern
// ============================================================================

/**
 * Creates a circular pattern (polar array) of elements around a center point.
 *
 * @param center - Center point of the pattern
 * @param baseElement - The element to duplicate
 * @param count - Total number of elements (including base)
 * @param options - Configuration options
 * @returns Array of positioned elements with metadata
 */
export function circularPattern<T extends PositionedElement>(
  center: Point,
  baseElement: T,
  count: number,
  options: CircularPatternOptions = {}
): CircularPatternResult<T> {
  if (count < 1) {
    throw new Error(DivisionError.INVALID_COUNT);
  }

  const rotateElements = options.rotateElements ?? false;
  const referenceAngle = options.referenceAngle ?? 0;
  const direction = options.direction ?? 'ccw';
  const fillAngle = options.fillAngle ?? 2 * Math.PI;

  const elements: T[] = [];
  const angles: number[] = [];
  const positions: Point[] = [];

  // Calculate angular step
  // For full circle, we don't want the last element to overlap with the first
  const isFull = Math.abs(fillAngle - 2 * Math.PI) < 1e-10;
  const step = fillAngle / (isFull ? count : count - 1);
  const dirMultiplier = direction === 'cw' ? -1 : 1;

  // Calculate base element's distance and angle from center
  const baseRadius = distance(center, baseElement.position);
  const baseAngle = angleFromCenter(center, baseElement.position);

  for (let i = 0; i < count; i++) {
    const angle = referenceAngle + i * step * dirMultiplier;
    const newAngle = baseAngle + angle;

    // Calculate new position by rotating base element's position
    const newPosition: Point = {
      x: center.x + baseRadius * Math.cos(newAngle),
      y: center.y + baseRadius * Math.sin(newAngle),
    };

    // Create transformed element
    const newElement: T = {
      ...baseElement,
      position: newPosition,
    };

    // Apply rotation if needed
    if (rotateElements && 'rotation' in baseElement) {
      (newElement as T & { rotation: number }).rotation =
        ((baseElement.rotation ?? 0) + angle) % (2 * Math.PI);
    }

    elements.push(newElement);
    angles.push(angle);
    positions.push(newPosition);
  }

  return { elements, angles, positions };
}

/**
 * Creates a circular pattern of points around a center point.
 *
 * @param points - Array of points to pattern
 * @param center - Center point of the pattern
 * @param count - Number of copies (including original)
 * @param options - Configuration options
 * @returns Array of patterned points
 */
export function circularPatternPoints(
  points: readonly Point[],
  center: Point,
  count: number,
  options: Omit<CircularPatternOptions, 'rotateElements'> = {}
): Point[] {
  if (count < 1) {
    throw new Error(DivisionError.INVALID_COUNT);
  }

  const referenceAngle = options.referenceAngle ?? 0;
  const direction = options.direction ?? 'ccw';
  const fillAngle = options.fillAngle ?? 2 * Math.PI;

  const result: Point[] = [];

  // Calculate angular step
  const isFull = Math.abs(fillAngle - 2 * Math.PI) < 1e-10;
  const step = fillAngle / (isFull ? count : count - 1);
  const dirMultiplier = direction === 'cw' ? -1 : 1;

  for (let i = 0; i < count; i++) {
    const angle = referenceAngle + i * step * dirMultiplier;

    for (const point of points) {
      result.push(rotatePoint(point, center, angle));
    }
  }

  return result;
}

// ============================================================================
// Visualization Helpers
// ============================================================================

/**
 * Creates SVG path data from division results.
 *
 * @param result - Division result
 * @param closePath - Whether to close the path
 * @returns SVG path data string
 */
export function createPathFromDivision(
  result: DivisionResult,
  closePath: boolean = false
): string {
  if (result.points.length === 0) {
    return '';
  }

  const commands: string[] = [];
  const first = result.points[0]!;
  commands.push(`M ${first.x} ${first.y}`);

  for (let i = 1; i < result.points.length; i++) {
    const point = result.points[i]!;
    commands.push(`L ${point.x} ${point.y}`);
  }

  if (closePath) {
    commands.push('Z');
  }

  return commands.join(' ');
}

/**
 * Creates SVG markers at division points.
 *
 * @param result - Division result
 * @param markerRadius - Radius of the marker circles
 * @returns SVG string with circle markers
 */
export function createMarkersFromDivision(
  result: DivisionResult,
  markerRadius: number = 2
): string {
  return result.points
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="${markerRadius}" fill="currentColor" />`
    )
    .join('\n');
}
