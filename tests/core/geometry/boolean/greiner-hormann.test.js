/**
 * Greiner-Hormann Boolean Operations tests
 */
import { describe, it, expect } from 'vitest';
import { computeBooleanOperation, union, subtract, intersect, exclude, lineLineIntersection, lineBezierIntersection, evaluateBezier, bezierBounds, splitBezier, flattenBezier, pointsEqual, signedArea, isClockwise, distance, Vertex, createPolygonFromPoints, createPolygonsFromPath, polygonToPathCommands, classifyPoint, windingNumber, isSimplePolygon, isZeroArea, hasSharedVertices, arePolygonsIdentical, EPSILON, } from '@core/geometry/boolean';
// Helper to create a rectangular path
function createRectPath(x, y, w, h) {
    return {
        windingRule: 'NONZERO',
        commands: [
            { type: 'M', x, y },
            { type: 'L', x: x + w, y },
            { type: 'L', x: x + w, y: y + h },
            { type: 'L', x, y: y + h },
            { type: 'Z' },
        ],
    };
}
// Helper to create a triangular path
function createTrianglePath(x1, y1, x2, y2, x3, y3) {
    return {
        windingRule: 'NONZERO',
        commands: [
            { type: 'M', x: x1, y: y1 },
            { type: 'L', x: x2, y: y2 },
            { type: 'L', x: x3, y: y3 },
            { type: 'Z' },
        ],
    };
}
describe('Intersection Detection', () => {
    describe('lineLineIntersection', () => {
        it('finds intersection of crossing lines', () => {
            const result = lineLineIntersection({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 });
            expect(result).not.toBeNull();
            expect(result.point.x).toBeCloseTo(5);
            expect(result.point.y).toBeCloseTo(5);
            expect(result.t1).toBeCloseTo(0.5);
            expect(result.t2).toBeCloseTo(0.5);
        });
        it('returns null for parallel lines', () => {
            const result = lineLineIntersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 });
            expect(result).toBeNull();
        });
        it('returns null for non-intersecting segments', () => {
            const result = lineLineIntersection({ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 15, y: 0 });
            expect(result).toBeNull();
        });
        it('finds intersection at endpoint', () => {
            const result = lineLineIntersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 });
            expect(result).not.toBeNull();
            expect(result.point.x).toBeCloseTo(10);
            expect(result.point.y).toBeCloseTo(0);
        });
    });
    describe('evaluateBezier', () => {
        it('returns start point at t=0', () => {
            const p0 = { x: 0, y: 0 };
            const p1 = { x: 10, y: 20 };
            const p2 = { x: 30, y: 20 };
            const p3 = { x: 40, y: 0 };
            const result = evaluateBezier(p0, p1, p2, p3, 0);
            expect(result.x).toBeCloseTo(0);
            expect(result.y).toBeCloseTo(0);
        });
        it('returns end point at t=1', () => {
            const p0 = { x: 0, y: 0 };
            const p1 = { x: 10, y: 20 };
            const p2 = { x: 30, y: 20 };
            const p3 = { x: 40, y: 0 };
            const result = evaluateBezier(p0, p1, p2, p3, 1);
            expect(result.x).toBeCloseTo(40);
            expect(result.y).toBeCloseTo(0);
        });
        it('returns midpoint at t=0.5 for symmetric curve', () => {
            const p0 = { x: 0, y: 0 };
            const p1 = { x: 0, y: 10 };
            const p2 = { x: 10, y: 10 };
            const p3 = { x: 10, y: 0 };
            const result = evaluateBezier(p0, p1, p2, p3, 0.5);
            expect(result.x).toBeCloseTo(5);
            expect(result.y).toBeCloseTo(7.5);
        });
    });
    describe('bezierBounds', () => {
        it('computes correct bounds for simple curve', () => {
            const p0 = { x: 0, y: 0 };
            const p1 = { x: 10, y: 20 };
            const p2 = { x: 30, y: 20 };
            const p3 = { x: 40, y: 0 };
            const bounds = bezierBounds(p0, p1, p2, p3);
            expect(bounds.minX).toBeCloseTo(0);
            expect(bounds.maxX).toBeCloseTo(40);
            expect(bounds.minY).toBeCloseTo(0);
            expect(bounds.maxY).toBeGreaterThan(0);
        });
    });
    describe('splitBezier', () => {
        it('splits at midpoint correctly', () => {
            const p0 = { x: 0, y: 0 };
            const p1 = { x: 10, y: 20 };
            const p2 = { x: 30, y: 20 };
            const p3 = { x: 40, y: 0 };
            const { left, right } = splitBezier(p0, p1, p2, p3, 0.5);
            // Left curve starts at p0
            expect(left[0].x).toBeCloseTo(0);
            expect(left[0].y).toBeCloseTo(0);
            // Right curve ends at p3
            expect(right[3].x).toBeCloseTo(40);
            expect(right[3].y).toBeCloseTo(0);
            // Curves meet at split point
            expect(left[3].x).toBeCloseTo(right[0].x);
            expect(left[3].y).toBeCloseTo(right[0].y);
        });
    });
    describe('flattenBezier', () => {
        it('produces at least 2 points', () => {
            const p0 = { x: 0, y: 0 };
            const p1 = { x: 10, y: 20 };
            const p2 = { x: 30, y: 20 };
            const p3 = { x: 40, y: 0 };
            const points = flattenBezier(p0, p1, p2, p3);
            expect(points.length).toBeGreaterThanOrEqual(2);
            expect(points[0].x).toBeCloseTo(0);
            expect(points[0].y).toBeCloseTo(0);
            expect(points[points.length - 1].x).toBeCloseTo(40);
            expect(points[points.length - 1].y).toBeCloseTo(0);
        });
        it('produces more points for tighter tolerance', () => {
            const p0 = { x: 0, y: 0 };
            const p1 = { x: 10, y: 50 };
            const p2 = { x: 30, y: 50 };
            const p3 = { x: 40, y: 0 };
            const coarse = flattenBezier(p0, p1, p2, p3, 5);
            const fine = flattenBezier(p0, p1, p2, p3, 0.1);
            expect(fine.length).toBeGreaterThan(coarse.length);
        });
    });
    describe('lineBezierIntersection', () => {
        it('finds intersection with curve', () => {
            const lineStart = { x: 0, y: 5 };
            const lineEnd = { x: 40, y: 5 };
            const p0 = { x: 0, y: 0 };
            const p1 = { x: 10, y: 20 };
            const p2 = { x: 30, y: 20 };
            const p3 = { x: 40, y: 0 };
            const results = lineBezierIntersection(lineStart, lineEnd, p0, p1, p2, p3);
            expect(results.length).toBeGreaterThan(0);
        });
    });
});
describe('Polygon', () => {
    describe('Vertex', () => {
        it('creates vertex with coordinates', () => {
            const v = new Vertex(10, 20);
            expect(v.point.x).toBe(10);
            expect(v.point.y).toBe(20);
            expect(v.isIntersection).toBe(false);
        });
        it('clones without links', () => {
            const v = new Vertex(10, 20);
            v.isIntersection = true;
            v.alpha = 0.5;
            const clone = v.clone();
            expect(clone.point.x).toBe(10);
            expect(clone.point.y).toBe(20);
            expect(clone.isIntersection).toBe(true);
            expect(clone.alpha).toBe(0.5);
            expect(clone.next).toBeNull();
            expect(clone.prev).toBeNull();
        });
        it('inserts vertex after', () => {
            const v1 = new Vertex(0, 0);
            const v2 = new Vertex(10, 10);
            v1.insertAfter(v2);
            expect(v1.next).toBe(v2);
            expect(v2.prev).toBe(v1);
        });
    });
    describe('Polygon creation', () => {
        it('creates polygon from points', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            expect(polygon.count).toBe(4);
        });
        it('creates circular linked list', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            expect(polygon.first.prev.next).toBe(polygon.first);
        });
        it('iterates over vertices', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            const vertices = Array.from(polygon.vertices());
            expect(vertices.length).toBe(3);
        });
        it('iterates over edges', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            const edges = Array.from(polygon.edges());
            expect(edges.length).toBe(3);
        });
    });
    describe('createPolygonsFromPath', () => {
        it('creates polygon from simple path', () => {
            const path = createRectPath(0, 0, 100, 100);
            const polygons = createPolygonsFromPath(path);
            expect(polygons.length).toBe(1);
            expect(polygons[0].count).toBe(4);
        });
        it('handles paths with curves', () => {
            const path = {
                windingRule: 'NONZERO',
                commands: [
                    { type: 'M', x: 0, y: 0 },
                    { type: 'C', x1: 10, y1: 20, x2: 30, y2: 20, x: 40, y: 0 },
                    { type: 'Z' },
                ],
            };
            const polygons = createPolygonsFromPath(path);
            expect(polygons.length).toBe(1);
            expect(polygons[0].count).toBeGreaterThan(2);
        });
    });
    describe('polygonToPathCommands', () => {
        it('converts polygon back to commands', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            const commands = polygonToPathCommands(polygon);
            expect(commands.length).toBe(4);
            expect(commands[0].type).toBe('M');
            expect(commands[1].type).toBe('L');
            expect(commands[2].type).toBe('L');
            expect(commands[3].type).toBe('Z');
        });
    });
});
describe('Point Classification', () => {
    describe('classifyPoint', () => {
        it('classifies point inside polygon', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            const result = classifyPoint({ x: 5, y: 5 }, polygon);
            expect(result).toBe('inside');
        });
        it('classifies point outside polygon', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            const result = classifyPoint({ x: 20, y: 20 }, polygon);
            expect(result).toBe('outside');
        });
        it('classifies point on boundary', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            const result = classifyPoint({ x: 5, y: 0 }, polygon);
            expect(result).toBe('on_boundary');
        });
    });
    describe('windingNumber', () => {
        it('returns non-zero for point inside CCW polygon', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            const winding = windingNumber({ x: 5, y: 5 }, polygon);
            expect(winding).not.toBe(0);
        });
        it('returns zero for point outside', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            const winding = windingNumber({ x: 20, y: 20 }, polygon);
            expect(winding).toBe(0);
        });
    });
    describe('isSimplePolygon', () => {
        it('returns true for simple polygon', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            expect(isSimplePolygon(polygon)).toBe(true);
        });
    });
});
describe('Geometry Utilities', () => {
    describe('signedArea', () => {
        it('returns positive for CCW polygon', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
            ];
            expect(signedArea(points)).toBeGreaterThan(0);
        });
        it('returns negative for CW polygon', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 0, y: 10 },
                { x: 10, y: 10 },
                { x: 10, y: 0 },
            ];
            expect(signedArea(points)).toBeLessThan(0);
        });
        it('returns correct area magnitude', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
            ];
            expect(Math.abs(signedArea(points))).toBeCloseTo(100);
        });
    });
    describe('isClockwise', () => {
        it('returns false for CCW polygon', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
            ];
            expect(isClockwise(points)).toBe(false);
        });
        it('returns true for CW polygon', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 0, y: 10 },
                { x: 10, y: 10 },
                { x: 10, y: 0 },
            ];
            expect(isClockwise(points)).toBe(true);
        });
    });
    describe('pointsEqual', () => {
        it('returns true for equal points', () => {
            expect(pointsEqual({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(true);
        });
        it('returns true for nearly equal points', () => {
            expect(pointsEqual({ x: 5, y: 5 }, { x: 5 + EPSILON / 2, y: 5 })).toBe(true);
        });
        it('returns false for different points', () => {
            expect(pointsEqual({ x: 5, y: 5 }, { x: 10, y: 10 })).toBe(false);
        });
    });
    describe('distance', () => {
        it('computes correct distance', () => {
            expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
        });
        it('returns zero for same point', () => {
            expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
        });
    });
});
describe('Degenerate Cases', () => {
    describe('isZeroArea', () => {
        it('returns true for collinear points', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
            ];
            const polygon = createPolygonFromPoints(points);
            expect(isZeroArea(polygon)).toBe(true);
        });
        it('returns false for valid polygon', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ];
            const polygon = createPolygonFromPoints(points);
            expect(isZeroArea(polygon)).toBe(false);
        });
    });
    describe('hasSharedVertices', () => {
        it('returns true when polygons share a vertex', () => {
            const points1 = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ];
            const points2 = [
                { x: 10, y: 0 },
                { x: 20, y: 0 },
                { x: 20, y: 10 },
            ];
            const poly1 = createPolygonFromPoints(points1);
            const poly2 = createPolygonFromPoints(points2);
            expect(hasSharedVertices(poly1, poly2)).toBe(true);
        });
        it('returns false when no shared vertices', () => {
            const points1 = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ];
            const points2 = [
                { x: 20, y: 0 },
                { x: 30, y: 0 },
                { x: 30, y: 10 },
            ];
            const poly1 = createPolygonFromPoints(points1);
            const poly2 = createPolygonFromPoints(points2);
            expect(hasSharedVertices(poly1, poly2)).toBe(false);
        });
    });
    describe('arePolygonsIdentical', () => {
        it('returns true for identical polygons', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ];
            const poly1 = createPolygonFromPoints(points);
            const poly2 = createPolygonFromPoints(points);
            expect(arePolygonsIdentical(poly1, poly2)).toBe(true);
        });
        it('returns true for rotated identical polygons', () => {
            const points1 = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ];
            const points2 = [
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 0 },
            ];
            const poly1 = createPolygonFromPoints(points1);
            const poly2 = createPolygonFromPoints(points2);
            expect(arePolygonsIdentical(poly1, poly2)).toBe(true);
        });
        it('returns false for different polygons', () => {
            const points1 = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ];
            const points2 = [
                { x: 0, y: 0 },
                { x: 20, y: 0 },
                { x: 20, y: 20 },
            ];
            const poly1 = createPolygonFromPoints(points1);
            const poly2 = createPolygonFromPoints(points2);
            expect(arePolygonsIdentical(poly1, poly2)).toBe(false);
        });
    });
});
describe('Boolean Operations', () => {
    describe('computeBooleanOperation', () => {
        it('returns success for valid inputs', () => {
            const rect1 = createRectPath(0, 0, 100, 100);
            const rect2 = createRectPath(50, 50, 100, 100);
            const result = computeBooleanOperation('UNION', [rect1], [rect2]);
            expect(result.success).toBe(true);
        });
        it('returns empty paths for empty inputs', () => {
            const result = computeBooleanOperation('INTERSECT', [], []);
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(0);
        });
        it('returns subject for union with empty clip', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = union([rect], []);
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
        });
        it('returns empty for intersect with empty clip', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = intersect([rect], []);
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(0);
        });
    });
    describe('union', () => {
        it('unions overlapping rectangles', () => {
            const rect1 = createRectPath(0, 0, 100, 100);
            const rect2 = createRectPath(50, 0, 100, 100);
            const result = union([rect1], [rect2]);
            expect(result.success).toBe(true);
        });
        it('returns both for disjoint rectangles', () => {
            const rect1 = createRectPath(0, 0, 50, 50);
            const rect2 = createRectPath(100, 100, 50, 50);
            const result = union([rect1], [rect2]);
            expect(result.success).toBe(true);
        });
    });
    describe('subtract', () => {
        it('subtracts overlapping rectangles', () => {
            const rect1 = createRectPath(0, 0, 100, 100);
            const rect2 = createRectPath(50, 50, 100, 100);
            const result = subtract([rect1], [rect2]);
            expect(result.success).toBe(true);
        });
        it('returns subject for disjoint rectangles', () => {
            const rect1 = createRectPath(0, 0, 50, 50);
            const rect2 = createRectPath(100, 100, 50, 50);
            const result = subtract([rect1], [rect2]);
            expect(result.success).toBe(true);
            expect(result.paths.length).toBeGreaterThan(0);
        });
    });
    describe('intersect', () => {
        it('intersects overlapping rectangles', () => {
            const rect1 = createRectPath(0, 0, 100, 100);
            const rect2 = createRectPath(50, 50, 100, 100);
            const result = intersect([rect1], [rect2]);
            expect(result.success).toBe(true);
        });
        it('returns empty for disjoint rectangles', () => {
            const rect1 = createRectPath(0, 0, 50, 50);
            const rect2 = createRectPath(100, 100, 50, 50);
            const result = intersect([rect1], [rect2]);
            expect(result.success).toBe(true);
        });
    });
    describe('exclude', () => {
        it('excludes overlapping rectangles', () => {
            const rect1 = createRectPath(0, 0, 100, 100);
            const rect2 = createRectPath(50, 50, 100, 100);
            const result = exclude([rect1], [rect2]);
            expect(result.success).toBe(true);
        });
        it('returns both for disjoint rectangles', () => {
            const rect1 = createRectPath(0, 0, 50, 50);
            const rect2 = createRectPath(100, 100, 50, 50);
            const result = exclude([rect1], [rect2]);
            expect(result.success).toBe(true);
        });
    });
    describe('triangles', () => {
        it('unions overlapping triangles', () => {
            const tri1 = createTrianglePath(0, 0, 100, 0, 50, 100);
            const tri2 = createTrianglePath(25, 25, 125, 25, 75, 125);
            const result = union([tri1], [tri2]);
            expect(result.success).toBe(true);
        });
        it('intersects overlapping triangles', () => {
            const tri1 = createTrianglePath(0, 0, 100, 0, 50, 100);
            const tri2 = createTrianglePath(25, 25, 125, 25, 75, 125);
            const result = intersect([tri1], [tri2]);
            expect(result.success).toBe(true);
        });
    });
    describe('identical polygons', () => {
        it('returns single polygon for union of identical', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = union([rect], [rect]);
            expect(result.success).toBe(true);
        });
        it('returns empty for subtract of identical', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = subtract([rect], [rect]);
            expect(result.success).toBe(true);
        });
        it('returns polygon for intersect of identical', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = intersect([rect], [rect]);
            expect(result.success).toBe(true);
        });
        it('returns empty for exclude of identical', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = exclude([rect], [rect]);
            expect(result.success).toBe(true);
        });
    });
    describe('containment', () => {
        it('handles small rectangle inside large', () => {
            const outer = createRectPath(0, 0, 100, 100);
            const inner = createRectPath(25, 25, 50, 50);
            const unionResult = union([outer], [inner]);
            expect(unionResult.success).toBe(true);
            const subtractResult = subtract([outer], [inner]);
            expect(subtractResult.success).toBe(true);
            const intersectResult = intersect([outer], [inner]);
            expect(intersectResult.success).toBe(true);
        });
    });
});
//# sourceMappingURL=greiner-hormann.test.js.map