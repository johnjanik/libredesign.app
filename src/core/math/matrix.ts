/**
 * 2D Matrix operations for DesignLibre
 *
 * Matrix2x3 represents a 2D affine transformation:
 * | a  c  tx |
 * | b  d  ty |
 * | 0  0  1  |
 *
 * Stored as [a, b, c, d, tx, ty] in column-major order.
 */

import type { Matrix2x3, Point } from '../types/geometry';

/** Identity matrix */
export function identity(): Matrix2x3 {
  return [1, 0, 0, 1, 0, 0];
}

/** Create a translation matrix */
export function translate(tx: number, ty: number): Matrix2x3 {
  return [1, 0, 0, 1, tx, ty];
}

/** Create a scale matrix */
export function scale(sx: number, sy: number = sx): Matrix2x3 {
  return [sx, 0, 0, sy, 0, 0];
}

/** Create a rotation matrix (angle in radians, clockwise) */
export function rotate(angle: number): Matrix2x3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [cos, sin, -sin, cos, 0, 0];
}

/** Create a skew matrix (angles in radians) */
export function skew(angleX: number, angleY: number): Matrix2x3 {
  return [1, Math.tan(angleY), Math.tan(angleX), 1, 0, 0];
}

/**
 * Multiply two matrices: result = a * b
 * The resulting transformation applies b first, then a.
 */
export function multiply(a: Matrix2x3, b: Matrix2x3): Matrix2x3 {
  const [a0, a1, a2, a3, a4, a5] = a;
  const [b0, b1, b2, b3, b4, b5] = b;

  return [
    a0 * b0 + a2 * b1,
    a1 * b0 + a3 * b1,
    a0 * b2 + a2 * b3,
    a1 * b2 + a3 * b3,
    a0 * b4 + a2 * b5 + a4,
    a1 * b4 + a3 * b5 + a5,
  ];
}

/**
 * Invert a matrix.
 * Returns null if the matrix is not invertible (determinant is zero).
 */
export function invert(m: Matrix2x3): Matrix2x3 | null {
  const [a, b, c, d, tx, ty] = m;
  const det = a * d - b * c;

  if (Math.abs(det) < 1e-10) {
    return null;
  }

  const invDet = 1 / det;

  return [
    d * invDet,
    -b * invDet,
    -c * invDet,
    a * invDet,
    (c * ty - d * tx) * invDet,
    (b * tx - a * ty) * invDet,
  ];
}

/** Transform a point by a matrix */
export function transformPoint(m: Matrix2x3, p: Point): Point {
  const [a, b, c, d, tx, ty] = m;
  return {
    x: a * p.x + c * p.y + tx,
    y: b * p.x + d * p.y + ty,
  };
}

/** Transform multiple points by a matrix */
export function transformPoints(m: Matrix2x3, points: readonly Point[]): Point[] {
  return points.map((p) => transformPoint(m, p));
}

/** Extract translation from a matrix */
export function getTranslation(m: Matrix2x3): Point {
  return { x: m[4], y: m[5] };
}

/** Extract scale factors from a matrix (approximate, assumes no skew) */
export function getScale(m: Matrix2x3): { scaleX: number; scaleY: number } {
  const [a, b, c, d] = m;
  return {
    scaleX: Math.sqrt(a * a + b * b),
    scaleY: Math.sqrt(c * c + d * d),
  };
}

/** Extract rotation angle from a matrix (in radians, approximate) */
export function getRotation(m: Matrix2x3): number {
  const [a, b] = m;
  return Math.atan2(b, a);
}

/** Check if two matrices are approximately equal */
export function matricesEqual(
  a: Matrix2x3,
  b: Matrix2x3,
  tolerance: number = 1e-6
): boolean {
  for (let i = 0; i < 6; i++) {
    if (Math.abs(a[i]! - b[i]!) > tolerance) {
      return false;
    }
  }
  return true;
}

/** Check if a matrix is the identity matrix */
export function isIdentity(m: Matrix2x3, tolerance: number = 1e-6): boolean {
  return matricesEqual(m, identity(), tolerance);
}

/** Create a matrix from individual components */
export function matrix(
  a: number,
  b: number,
  c: number,
  d: number,
  tx: number,
  ty: number
): Matrix2x3 {
  return [a, b, c, d, tx, ty];
}

/** Compose a transformation from translation, rotation, and scale */
export function compose(
  tx: number,
  ty: number,
  rotation: number,
  scaleX: number,
  scaleY: number
): Matrix2x3 {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return [
    cos * scaleX,
    sin * scaleX,
    -sin * scaleY,
    cos * scaleY,
    tx,
    ty,
  ];
}

/** Decompose a matrix into translation, rotation, and scale */
export function decompose(m: Matrix2x3): {
  tx: number;
  ty: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
} {
  const [a, b, c, d, tx, ty] = m;
  const scaleX = Math.sqrt(a * a + b * b);
  const scaleY = Math.sqrt(c * c + d * d);
  const rotation = Math.atan2(b, a);

  // Check for negative scale (flip)
  const det = a * d - b * c;
  const actualScaleY = det < 0 ? -scaleY : scaleY;

  return { tx, ty, rotation, scaleX, scaleY: actualScaleY };
}

/** Convert Matrix2x3 to a CSS transform string */
export function toCSSTransform(m: Matrix2x3): string {
  return `matrix(${m[0]}, ${m[1]}, ${m[2]}, ${m[3]}, ${m[4]}, ${m[5]})`;
}

/** Convert Matrix2x3 to a 4x4 matrix (for WebGL) */
export function toMatrix4(m: Matrix2x3): Float32Array {
  const [a, b, c, d, tx, ty] = m;
  // Column-major 4x4 matrix
  return new Float32Array([
    a, b, 0, 0,
    c, d, 0, 0,
    0, 0, 1, 0,
    tx, ty, 0, 1,
  ]);
}

/** Convert Matrix2x3 to a 3x3 matrix */
export function toMatrix3(m: Matrix2x3): Float32Array {
  const [a, b, c, d, tx, ty] = m;
  // Column-major 3x3 matrix
  return new Float32Array([a, b, 0, c, d, 0, tx, ty, 1]);
}
