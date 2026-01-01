/**
 * Geometry types for DesignLibre
 */
// ============================================================================
// Geometry utility functions
// ============================================================================
/** Create a point */
export function point(x, y) {
    return { x, y };
}
/** Create a rectangle */
export function rect(x, y, width, height) {
    return { x, y, width, height };
}
/** Convert rectangle to AABB */
export function rectToAABB(r) {
    return {
        minX: r.x,
        minY: r.y,
        maxX: r.x + r.width,
        maxY: r.y + r.height,
    };
}
/** Convert AABB to rectangle */
export function aabbToRect(aabb) {
    return {
        x: aabb.minX,
        y: aabb.minY,
        width: aabb.maxX - aabb.minX,
        height: aabb.maxY - aabb.minY,
    };
}
/** Check if two AABBs intersect */
export function aabbIntersects(a, b) {
    return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}
/** Check if point is inside AABB */
export function aabbContainsPoint(aabb, p) {
    return p.x >= aabb.minX && p.x <= aabb.maxX && p.y >= aabb.minY && p.y <= aabb.maxY;
}
/** Merge two AABBs */
export function aabbUnion(a, b) {
    return {
        minX: Math.min(a.minX, b.minX),
        minY: Math.min(a.minY, b.minY),
        maxX: Math.max(a.maxX, b.maxX),
        maxY: Math.max(a.maxY, b.maxY),
    };
}
/** Create an empty AABB */
export function emptyAABB() {
    return {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
    };
}
/** Check if AABB is empty */
export function isEmptyAABB(aabb) {
    return aabb.minX > aabb.maxX || aabb.minY > aabb.maxY;
}
//# sourceMappingURL=geometry.js.map