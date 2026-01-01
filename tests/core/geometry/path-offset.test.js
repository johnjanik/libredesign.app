/**
 * Path Offset tests
 */
import { describe, it, expect } from 'vitest';
import { offsetPath, offsetForStrokeAlignment, createStrokeOutline, } from '@core/geometry/path-offset';
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
// Helper to compute approximate area from commands
function approximatePathArea(path) {
    const points = [];
    for (const cmd of path.commands) {
        if (cmd.type === 'M' || cmd.type === 'L') {
            points.push({ x: cmd.x, y: cmd.y });
        }
    }
    if (points.length < 3)
        return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
}
describe('offsetPath', () => {
    describe('basic rectangle offsetting', () => {
        it('expands rectangle with positive offset', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = offsetPath(rect, { distance: 10 });
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
            // Outer rectangle should be larger
            const originalArea = approximatePathArea(rect);
            const offsetArea = approximatePathArea(result.paths[0]);
            expect(offsetArea).toBeGreaterThan(originalArea);
        });
        it('shrinks rectangle with negative offset', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = offsetPath(rect, { distance: -10 });
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
            // Inner rectangle should be smaller
            const originalArea = approximatePathArea(rect);
            const offsetArea = approximatePathArea(result.paths[0]);
            expect(offsetArea).toBeLessThan(originalArea);
        });
        it('returns original for zero offset', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = offsetPath(rect, { distance: 0 });
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
        });
    });
    describe('join styles', () => {
        it('supports miter join', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = offsetPath(rect, {
                distance: 10,
                joinStyle: 'MITER',
            });
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
        });
        it('supports bevel join', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = offsetPath(rect, {
                distance: 10,
                joinStyle: 'BEVEL',
            });
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
        });
        it('supports round join', () => {
            const rect = createRectPath(0, 0, 100, 100);
            const result = offsetPath(rect, {
                distance: 10,
                joinStyle: 'ROUND',
            });
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
            // Round join produces at least as many points as miter
            expect(result.paths[0].commands.length).toBeGreaterThanOrEqual(5);
        });
    });
    describe('miter limit', () => {
        it('respects miter limit', () => {
            // Sharp angle triangle
            const triangle = createTrianglePath(50, 0, 100, 100, 0, 100);
            const withMiter = offsetPath(triangle, {
                distance: 10,
                joinStyle: 'MITER',
                miterLimit: 10,
            });
            expect(withMiter.success).toBe(true);
        });
        it('falls back to bevel when miter limit exceeded', () => {
            // Very sharp angle
            const sharpTriangle = createTrianglePath(50, 0, 100, 10, 0, 10);
            const result = offsetPath(sharpTriangle, {
                distance: 5,
                joinStyle: 'MITER',
                miterLimit: 1.5, // Very restrictive
            });
            expect(result.success).toBe(true);
        });
    });
    describe('triangle offsetting', () => {
        it('expands triangle outward', () => {
            const triangle = createTrianglePath(50, 0, 100, 100, 0, 100);
            const result = offsetPath(triangle, { distance: 5 });
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
            const originalArea = approximatePathArea(triangle);
            const offsetArea = approximatePathArea(result.paths[0]);
            expect(offsetArea).toBeGreaterThan(originalArea);
        });
        it('shrinks triangle inward', () => {
            const triangle = createTrianglePath(50, 0, 100, 100, 0, 100);
            const result = offsetPath(triangle, { distance: -5 });
            expect(result.success).toBe(true);
            const originalArea = approximatePathArea(triangle);
            const offsetArea = approximatePathArea(result.paths[0]);
            expect(offsetArea).toBeLessThan(originalArea);
        });
    });
    describe('path with curves', () => {
        it('handles path with bezier curves', () => {
            const pathWithCurve = {
                windingRule: 'NONZERO',
                commands: [
                    { type: 'M', x: 0, y: 0 },
                    { type: 'L', x: 100, y: 0 },
                    { type: 'C', x1: 150, y1: 0, x2: 150, y2: 100, x: 100, y: 100 },
                    { type: 'L', x: 0, y: 100 },
                    { type: 'Z' },
                ],
            };
            const result = offsetPath(pathWithCurve, { distance: 5 });
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
        });
    });
    describe('empty and degenerate paths', () => {
        it('handles empty path', () => {
            const emptyPath = {
                windingRule: 'NONZERO',
                commands: [],
            };
            const result = offsetPath(emptyPath, { distance: 10 });
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(0);
        });
        it('handles path with only moveto', () => {
            const singlePoint = {
                windingRule: 'NONZERO',
                commands: [{ type: 'M', x: 50, y: 50 }],
            };
            const result = offsetPath(singlePoint, { distance: 10 });
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(0);
        });
        it('handles line (2 points)', () => {
            const line = {
                windingRule: 'NONZERO',
                commands: [
                    { type: 'M', x: 0, y: 0 },
                    { type: 'L', x: 100, y: 0 },
                    { type: 'Z' },
                ],
            };
            const result = offsetPath(line, { distance: 10 });
            expect(result.success).toBe(true);
        });
    });
});
describe('offsetForStrokeAlignment', () => {
    const rect = createRectPath(0, 0, 100, 100);
    const strokeWeight = 10;
    describe('CENTER alignment', () => {
        it('returns original path for center alignment', () => {
            const result = offsetForStrokeAlignment(rect, strokeWeight, 'CENTER');
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
            expect(result.paths[0]).toBe(rect);
        });
    });
    describe('INSIDE alignment', () => {
        it('produces valid offset path for inside alignment', () => {
            const result = offsetForStrokeAlignment(rect, strokeWeight, 'INSIDE');
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
            expect(result.paths[0].commands.length).toBeGreaterThanOrEqual(4);
        });
    });
    describe('OUTSIDE alignment', () => {
        it('produces valid offset path for outside alignment', () => {
            const result = offsetForStrokeAlignment(rect, strokeWeight, 'OUTSIDE');
            expect(result.success).toBe(true);
            expect(result.paths.length).toBe(1);
            expect(result.paths[0].commands.length).toBeGreaterThanOrEqual(4);
        });
    });
    describe('with join style', () => {
        it('uses specified join style', () => {
            const result = offsetForStrokeAlignment(rect, strokeWeight, 'OUTSIDE', 'ROUND');
            expect(result.success).toBe(true);
            expect(result.paths[0].commands.length).toBeGreaterThanOrEqual(5);
        });
        it('uses specified miter limit', () => {
            const result = offsetForStrokeAlignment(rect, strokeWeight, 'OUTSIDE', 'MITER', 2);
            expect(result.success).toBe(true);
        });
    });
});
describe('createStrokeOutline', () => {
    const rect = createRectPath(10, 10, 80, 80);
    const strokeWeight = 4;
    it('creates outer and inner outlines', () => {
        const { outer, inner } = createStrokeOutline(rect, strokeWeight);
        expect(outer.success).toBe(true);
        expect(inner.success).toBe(true);
        expect(outer.paths.length).toBe(1);
        expect(inner.paths.length).toBe(1);
    });
    it('outer has valid path', () => {
        const { outer } = createStrokeOutline(rect, strokeWeight);
        expect(outer.paths[0].commands.length).toBeGreaterThanOrEqual(4);
        expect(outer.paths[0].commands[0].type).toBe('M');
    });
    it('inner has valid path', () => {
        const { inner } = createStrokeOutline(rect, strokeWeight);
        expect(inner.paths[0].commands.length).toBeGreaterThanOrEqual(4);
        expect(inner.paths[0].commands[0].type).toBe('M');
    });
    it('outer and inner have different bounds', () => {
        const { outer, inner } = createStrokeOutline(rect, strokeWeight);
        // Get first point from each path
        const outerFirst = outer.paths[0].commands[0];
        const innerFirst = inner.paths[0].commands[0];
        // They should have different coordinates
        if (outerFirst.type === 'M' && innerFirst.type === 'M') {
            // The difference between outer and inner first point should be related to stroke weight
            const dx = Math.abs(outerFirst.x - innerFirst.x);
            const dy = Math.abs(outerFirst.y - innerFirst.y);
            expect(dx + dy).toBeGreaterThan(0);
        }
    });
    it('uses specified join style', () => {
        const { outer, inner } = createStrokeOutline(rect, strokeWeight, 'ROUND');
        expect(outer.success).toBe(true);
        expect(inner.success).toBe(true);
        // Round join produces more vertices (at least as many as regular)
        expect(outer.paths[0].commands.length).toBeGreaterThanOrEqual(5);
    });
});
//# sourceMappingURL=path-offset.test.js.map