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
    number,
    number,
    number,
    number,
    number
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
export type PathCommand = MoveToCommand | LineToCommand | CurveToCommand | ClosePathCommand;
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
/** Create a point */
export declare function point(x: number, y: number): Point;
/** Create a rectangle */
export declare function rect(x: number, y: number, width: number, height: number): Rect;
/** Convert rectangle to AABB */
export declare function rectToAABB(r: Rect): AABB;
/** Convert AABB to rectangle */
export declare function aabbToRect(aabb: AABB): Rect;
/** Check if two AABBs intersect */
export declare function aabbIntersects(a: AABB, b: AABB): boolean;
/** Check if point is inside AABB */
export declare function aabbContainsPoint(aabb: AABB, p: Point): boolean;
/** Merge two AABBs */
export declare function aabbUnion(a: AABB, b: AABB): AABB;
/** Create an empty AABB */
export declare function emptyAABB(): AABB;
/** Check if AABB is empty */
export declare function isEmptyAABB(aabb: AABB): boolean;
//# sourceMappingURL=geometry.d.ts.map