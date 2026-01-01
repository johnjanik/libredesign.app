/**
 * Bezier curve utilities for DesignLibre
 */

import type { Point, AABB } from '../types/geometry';

/** Evaluate a cubic Bezier curve at parameter t */
export function cubicBezierPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

/** Evaluate a quadratic Bezier curve at parameter t */
export function quadraticBezierPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  t: number
): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: mt2 * p0.x + 2 * mt * t * p1.x + t2 * p2.x,
    y: mt2 * p0.y + 2 * mt * t * p1.y + t2 * p2.y,
  };
}

/** Get the derivative (tangent) of a cubic Bezier at parameter t */
export function cubicBezierDerivative(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x:
      3 * mt2 * (p1.x - p0.x) +
      6 * mt * t * (p2.x - p1.x) +
      3 * t2 * (p3.x - p2.x),
    y:
      3 * mt2 * (p1.y - p0.y) +
      6 * mt * t * (p2.y - p1.y) +
      3 * t2 * (p3.y - p2.y),
  };
}

/** Split a cubic Bezier at parameter t into two curves */
export function splitCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): { left: [Point, Point, Point, Point]; right: [Point, Point, Point, Point] } {
  // De Casteljau's algorithm
  const p01 = lerp(p0, p1, t);
  const p12 = lerp(p1, p2, t);
  const p23 = lerp(p2, p3, t);

  const p012 = lerp(p01, p12, t);
  const p123 = lerp(p12, p23, t);

  const p0123 = lerp(p012, p123, t);

  return {
    left: [p0, p01, p012, p0123],
    right: [p0123, p123, p23, p3],
  };
}

/** Linear interpolation between two points */
export function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/** Calculate approximate length of a cubic Bezier using subdivision */
export function cubicBezierLength(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  segments: number = 10
): number {
  let length = 0;
  let prevPoint = p0;

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const point = cubicBezierPoint(p0, p1, p2, p3, t);
    length += distance(prevPoint, point);
    prevPoint = point;
  }

  return length;
}

/** Calculate distance between two points */
export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Calculate squared distance between two points */
export function distanceSquared(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/**
 * Find the bounding box of a cubic Bezier curve.
 * This finds the exact bounds by computing the curve's extrema.
 */
export function cubicBezierBounds(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): AABB {
  // Start with endpoints
  let minX = Math.min(p0.x, p3.x);
  let maxX = Math.max(p0.x, p3.x);
  let minY = Math.min(p0.y, p3.y);
  let maxY = Math.max(p0.y, p3.y);

  // Find extrema in x
  const xRoots = findCubicExtrema(p0.x, p1.x, p2.x, p3.x);
  for (const t of xRoots) {
    if (t > 0 && t < 1) {
      const p = cubicBezierPoint(p0, p1, p2, p3, t);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
    }
  }

  // Find extrema in y
  const yRoots = findCubicExtrema(p0.y, p1.y, p2.y, p3.y);
  for (const t of yRoots) {
    if (t > 0 && t < 1) {
      const p = cubicBezierPoint(p0, p1, p2, p3, t);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Find the t values where the derivative of a cubic polynomial equals zero.
 * Used to find the extrema of a Bezier curve.
 */
function findCubicExtrema(
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number[] {
  // Derivative coefficients
  const a = 3 * (-p0 + 3 * p1 - 3 * p2 + p3);
  const b = 6 * (p0 - 2 * p1 + p2);
  const c = 3 * (p1 - p0);

  return solveQuadratic(a, b, c);
}

/** Solve a quadratic equation ax² + bx + c = 0 */
function solveQuadratic(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < 1e-10) {
    // Linear equation
    if (Math.abs(b) < 1e-10) {
      return [];
    }
    return [-c / b];
  }

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return [];
  }

  if (Math.abs(discriminant) < 1e-10) {
    return [-b / (2 * a)];
  }

  const sqrtD = Math.sqrt(discriminant);
  return [(-b + sqrtD) / (2 * a), (-b - sqrtD) / (2 * a)];
}

/** Convert quadratic Bezier to cubic Bezier */
export function quadraticToCubic(
  p0: Point,
  p1: Point,
  p2: Point
): [Point, Point, Point, Point] {
  // The control points of the cubic are:
  // cp1 = p0 + 2/3 * (p1 - p0)
  // cp2 = p2 + 2/3 * (p1 - p2)
  return [
    p0,
    {
      x: p0.x + (2 / 3) * (p1.x - p0.x),
      y: p0.y + (2 / 3) * (p1.y - p0.y),
    },
    {
      x: p2.x + (2 / 3) * (p1.x - p2.x),
      y: p2.y + (2 / 3) * (p1.y - p2.y),
    },
    p2,
  ];
}

/** Sample points along a cubic Bezier curve */
export function sampleCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  numSamples: number
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    points.push(cubicBezierPoint(p0, p1, p2, p3, t));
  }
  return points;
}

/**
 * Find the parameter t on the curve closest to a given point.
 * Uses Newton-Raphson iteration.
 */
export function cubicBezierNearestT(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  target: Point,
  iterations: number = 5
): number {
  // Start with a rough search
  let bestT = 0;
  let bestDist = Infinity;

  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const p = cubicBezierPoint(p0, p1, p2, p3, t);
    const dist = distanceSquared(p, target);
    if (dist < bestDist) {
      bestDist = dist;
      bestT = t;
    }
  }

  // Refine with Newton-Raphson
  for (let i = 0; i < iterations; i++) {
    const p = cubicBezierPoint(p0, p1, p2, p3, bestT);
    const d = cubicBezierDerivative(p0, p1, p2, p3, bestT);

    const dx = p.x - target.x;
    const dy = p.y - target.y;

    const numerator = dx * d.x + dy * d.y;
    const denominator = d.x * d.x + d.y * d.y;

    if (Math.abs(denominator) < 1e-10) break;

    bestT = Math.max(0, Math.min(1, bestT - numerator / denominator));
  }

  return bestT;
}
