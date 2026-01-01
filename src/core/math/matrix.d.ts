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
export declare function identity(): Matrix2x3;
/** Create a translation matrix */
export declare function translate(tx: number, ty: number): Matrix2x3;
/** Create a scale matrix */
export declare function scale(sx: number, sy?: number): Matrix2x3;
/** Create a rotation matrix (angle in radians, clockwise) */
export declare function rotate(angle: number): Matrix2x3;
/** Create a skew matrix (angles in radians) */
export declare function skew(angleX: number, angleY: number): Matrix2x3;
/**
 * Multiply two matrices: result = a * b
 * The resulting transformation applies b first, then a.
 */
export declare function multiply(a: Matrix2x3, b: Matrix2x3): Matrix2x3;
/**
 * Invert a matrix.
 * Returns null if the matrix is not invertible (determinant is zero).
 */
export declare function invert(m: Matrix2x3): Matrix2x3 | null;
/** Transform a point by a matrix */
export declare function transformPoint(m: Matrix2x3, p: Point): Point;
/** Transform multiple points by a matrix */
export declare function transformPoints(m: Matrix2x3, points: readonly Point[]): Point[];
/** Extract translation from a matrix */
export declare function getTranslation(m: Matrix2x3): Point;
/** Extract scale factors from a matrix (approximate, assumes no skew) */
export declare function getScale(m: Matrix2x3): {
    scaleX: number;
    scaleY: number;
};
/** Extract rotation angle from a matrix (in radians, approximate) */
export declare function getRotation(m: Matrix2x3): number;
/** Check if two matrices are approximately equal */
export declare function matricesEqual(a: Matrix2x3, b: Matrix2x3, tolerance?: number): boolean;
/** Check if a matrix is the identity matrix */
export declare function isIdentity(m: Matrix2x3, tolerance?: number): boolean;
/** Create a matrix from individual components */
export declare function matrix(a: number, b: number, c: number, d: number, tx: number, ty: number): Matrix2x3;
/** Compose a transformation from translation, rotation, and scale */
export declare function compose(tx: number, ty: number, rotation: number, scaleX: number, scaleY: number): Matrix2x3;
/** Decompose a matrix into translation, rotation, and scale */
export declare function decompose(m: Matrix2x3): {
    tx: number;
    ty: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
};
/** Convert Matrix2x3 to a CSS transform string */
export declare function toCSSTransform(m: Matrix2x3): string;
/** Convert Matrix2x3 to a 4x4 matrix (for WebGL) */
export declare function toMatrix4(m: Matrix2x3): Float32Array;
/** Convert Matrix2x3 to a 3x3 matrix */
export declare function toMatrix3(m: Matrix2x3): Float32Array;
//# sourceMappingURL=matrix.d.ts.map