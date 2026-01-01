/**
 * Geometry types for DesignLibre
 */

/** 2D point */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Size dimensions */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Rectangle with position and size */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Axis-aligned bounding box */
export interface AABB {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * 2D affine transformation matrix (3x3, last row implicit [0, 0, 1])
 * Stored in column-major order: [a, b, c, d, tx, ty]
 *
 * | a  c  tx |
 * | b  d  ty |
 * | 0  0  1  |
 */
export type Matrix2x3 = readonly [
  number,
  number, // column 0: [a, b]
  number,
  number, // column 1: [c, d]
  number,
  number, // column 2: [tx, ty]
];

/** Winding rule for path filling */
export type WindingRule = 'NONZERO' | 'EVENODD';

/** Path command types */
export type PathCommandType = 'M' | 'L' | 'C' | 'Z';

/** MoveTo command */
export interface MoveToCommand {
  readonly type: 'M';
  readonly x: number;
  readonly y: number;
}

/** LineTo command */
export interface LineToCommand {
  readonly type: 'L';
  readonly x: number;
  readonly y: number;
}

/** Cubic Bezier CurveTo command */
export interface CurveToCommand {
  readonly type: 'C';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly x: number;
  readonly y: number;
}

/** ClosePath command */
export interface ClosePathCommand {
  readonly type: 'Z';
}

/** Union of all path commands */
export type PathCommand =
  | MoveToCommand
  | LineToCommand
  | CurveToCommand
  | ClosePathCommand;

/** Vector path with winding rule and commands */
export interface VectorPath {
  readonly windingRule: WindingRule;
  readonly commands: readonly PathCommand[];
}

/** Stroke alignment relative to path */
export type StrokeAlign = 'INSIDE' | 'CENTER' | 'OUTSIDE';

/** Stroke cap style */
export type StrokeCap = 'NONE' | 'ROUND' | 'SQUARE';

/** Stroke join style */
export type StrokeJoin = 'MITER' | 'BEVEL' | 'ROUND';

/** Stroke properties */
export interface StrokeProps {
  readonly strokeWeight: number;
  readonly strokeAlign: StrokeAlign;
  readonly strokeCap: StrokeCap;
  readonly strokeJoin: StrokeJoin;
  readonly strokeMiterLimit: number;
  readonly dashPattern: readonly number[];
  readonly dashOffset: number;
}

// ============================================================================
// Geometry utility functions
// ============================================================================

/** Create a point */
export function point(x: number, y: number): Point {
  return { x, y };
}

/** Create a rectangle */
export function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

/** Convert rectangle to AABB */
export function rectToAABB(r: Rect): AABB {
  return {
    minX: r.x,
    minY: r.y,
    maxX: r.x + r.width,
    maxY: r.y + r.height,
  };
}

/** Convert AABB to rectangle */
export function aabbToRect(aabb: AABB): Rect {
  return {
    x: aabb.minX,
    y: aabb.minY,
    width: aabb.maxX - aabb.minX,
    height: aabb.maxY - aabb.minY,
  };
}

/** Check if two AABBs intersect */
export function aabbIntersects(a: AABB, b: AABB): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/** Check if point is inside AABB */
export function aabbContainsPoint(aabb: AABB, p: Point): boolean {
  return p.x >= aabb.minX && p.x <= aabb.maxX && p.y >= aabb.minY && p.y <= aabb.maxY;
}

/** Merge two AABBs */
export function aabbUnion(a: AABB, b: AABB): AABB {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** Create an empty AABB */
export function emptyAABB(): AABB {
  return {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
}

/** Check if AABB is empty */
export function isEmptyAABB(aabb: AABB): boolean {
  return aabb.minX > aabb.maxX || aabb.minY > aabb.maxY;
}
