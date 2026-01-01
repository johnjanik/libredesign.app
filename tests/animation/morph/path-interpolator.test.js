/**
 * Path Interpolator Tests
 */
import { describe, it, expect } from 'vitest';
import { prepareMorph, interpolatePathArrays, } from '../../../src/animation/morph/path-interpolator';
import { checkCompatibility, countPoints, } from '../../../src/animation/morph/path-compatibility';
import { extractPoints, normalizePathPoints, } from '../../../src/animation/morph/point-matching';
// Helper to create simple paths
function createSquarePath(size, x = 0, y = 0) {
    return {
        commands: [
            { type: 'M', x: x, y: y },
            { type: 'L', x: x + size, y: y },
            { type: 'L', x: x + size, y: y + size },
            { type: 'L', x: x, y: y + size },
            { type: 'Z' },
        ],
        windingRule: 'NONZERO',
    };
}
function createTrianglePath(size, x = 0, y = 0) {
    return {
        commands: [
            { type: 'M', x: x + size / 2, y: y },
            { type: 'L', x: x + size, y: y + size },
            { type: 'L', x: x, y: y + size },
            { type: 'Z' },
        ],
        windingRule: 'NONZERO',
    };
}
describe('checkCompatibility', () => {
    it('should return direct compatibility for same point count', () => {
        const path1 = createSquarePath(100);
        const path2 = createSquarePath(200);
        const result = checkCompatibility(path1, path2);
        expect(result.level).toBe('direct');
        expect(result.canMorph).toBe(true);
        expect(result.pointDifference).toBe(0);
    });
    it('should return subdivide for different point counts', () => {
        const square = createSquarePath(100);
        const triangle = createTrianglePath(100);
        const result = checkCompatibility(square, triangle);
        expect(result.level).toBe('subdivide');
        expect(result.canMorph).toBe(true);
        expect(result.pointDifference).toBe(1);
    });
    it('should return incompatible for large point differences', () => {
        const simple = {
            commands: [
                { type: 'M', x: 0, y: 0 },
                { type: 'L', x: 100, y: 100 },
                { type: 'Z' },
            ],
            windingRule: 'NONZERO',
        };
        // Create complex path with many points
        const commandsList = [{ type: 'M', x: 0, y: 0 }];
        for (let i = 1; i <= 60; i++) {
            commandsList.push({ type: 'L', x: i * 10, y: Math.sin(i) * 50 });
        }
        commandsList.push({ type: 'Z' });
        const complex = { commands: commandsList, windingRule: 'NONZERO' };
        const result = checkCompatibility(simple, complex, { maxPointDifference: 50 });
        expect(result.level).toBe('incompatible');
        expect(result.canMorph).toBe(false);
    });
    it('should detect open vs closed path mismatch', () => {
        const closed = createSquarePath(100);
        const open = {
            commands: [
                { type: 'M', x: 0, y: 0 },
                { type: 'L', x: 100, y: 0 },
                { type: 'L', x: 100, y: 100 },
            ],
            windingRule: 'NONZERO',
        };
        const result = checkCompatibility(closed, open);
        expect(result.canMorph).toBe(false);
        expect(result.reason).toContain('open and closed');
    });
});
describe('countPoints', () => {
    it('should count points in a square', () => {
        const square = createSquarePath(100);
        expect(countPoints(square)).toBe(4);
    });
    it('should count points in a triangle', () => {
        const triangle = createTrianglePath(100);
        expect(countPoints(triangle)).toBe(3);
    });
    it('should not count Z command as a point', () => {
        const pathWithZ = {
            commands: [
                { type: 'M', x: 0, y: 0 },
                { type: 'L', x: 100, y: 0 },
                { type: 'Z' },
                { type: 'Z' },
            ],
            windingRule: 'NONZERO',
        };
        expect(countPoints(pathWithZ)).toBe(2);
    });
});
describe('extractPoints', () => {
    it('should extract all points from a path', () => {
        const square = createSquarePath(100);
        const points = extractPoints(square);
        expect(points).toHaveLength(4);
        expect(points[0]).toMatchObject({ x: 0, y: 0 });
        expect(points[1]).toMatchObject({ x: 100, y: 0 });
        expect(points[2]).toMatchObject({ x: 100, y: 100 });
        expect(points[3]).toMatchObject({ x: 0, y: 100 });
    });
});
describe('normalizePathPoints', () => {
    it('should return same paths when point counts match', () => {
        const path1 = createSquarePath(100);
        const path2 = createSquarePath(200);
        const { source, target } = normalizePathPoints(path1, path2);
        expect(countPoints(source)).toBe(countPoints(target));
        expect(countPoints(source)).toBe(4);
    });
    it('should add points to shorter path', () => {
        const square = createSquarePath(100); // 4 points
        const triangle = createTrianglePath(100); // 3 points
        const { source, target } = normalizePathPoints(square, triangle);
        expect(countPoints(source)).toBe(countPoints(target));
        expect(countPoints(source)).toBe(4); // Both should have 4 points
    });
});
describe('prepareMorph', () => {
    it('should prepare morph for compatible paths', () => {
        const source = createSquarePath(100);
        const target = createSquarePath(200, 50, 50);
        const transition = prepareMorph(source, target);
        expect(transition.isCompatible).toBe(true);
        expect(transition.sourcePoints.length).toBe(transition.targetPoints.length);
    });
    it('should interpolate at t=0 to source path', () => {
        const source = createSquarePath(100);
        const target = createSquarePath(200, 50, 50);
        const transition = prepareMorph(source, target);
        const result = transition.interpolate(0);
        // At t=0, should be close to source
        const firstCmd = result.commands[0];
        expect(firstCmd.type).toBe('M');
        if (firstCmd.type === 'M') {
            expect(firstCmd.x).toBeCloseTo(0, 1);
            expect(firstCmd.y).toBeCloseTo(0, 1);
        }
    });
    it('should interpolate at t=1 to target path', () => {
        const source = createSquarePath(100);
        const target = createSquarePath(200, 50, 50);
        const transition = prepareMorph(source, target);
        const result = transition.interpolate(1);
        // At t=1, should be close to target
        const firstCmd = result.commands[0];
        expect(firstCmd.type).toBe('M');
        if (firstCmd.type === 'M') {
            expect(firstCmd.x).toBeCloseTo(50, 1);
            expect(firstCmd.y).toBeCloseTo(50, 1);
        }
    });
    it('should interpolate at t=0.5 to midpoint', () => {
        const source = createSquarePath(100);
        const target = createSquarePath(100, 100, 100);
        const transition = prepareMorph(source, target);
        const result = transition.interpolate(0.5);
        // At t=0.5, first point should be midway between (0,0) and (100,100)
        const firstCmd = result.commands[0];
        expect(firstCmd.type).toBe('M');
        if (firstCmd.type === 'M') {
            expect(firstCmd.x).toBeCloseTo(50, 1);
            expect(firstCmd.y).toBeCloseTo(50, 1);
        }
    });
    it('should handle incompatible paths with snap', () => {
        const simple = {
            commands: [
                { type: 'M', x: 0, y: 0 },
                { type: 'L', x: 100, y: 100 },
            ],
            windingRule: 'NONZERO',
        };
        // Create complex path with many points
        const commandsList = [{ type: 'M', x: 0, y: 0 }];
        for (let i = 1; i <= 60; i++) {
            commandsList.push({ type: 'L', x: i * 10, y: Math.sin(i) * 50 });
        }
        const complex = { commands: commandsList, windingRule: 'NONZERO' };
        const transition = prepareMorph(simple, complex, { maxPointDifference: 50 });
        expect(transition.isCompatible).toBe(false);
        // Should snap at 0.5
        const beforeSnap = transition.interpolate(0.4);
        const afterSnap = transition.interpolate(0.6);
        expect(beforeSnap.commands.length).toBe(simple.commands.length);
        expect(afterSnap.commands.length).toBe(complex.commands.length);
    });
});
describe('interpolatePathArrays', () => {
    it('should interpolate multiple paths', () => {
        const source = [createSquarePath(100), createSquarePath(50, 200, 0)];
        const target = [createSquarePath(200, 50, 50), createSquarePath(100, 250, 50)];
        const result = interpolatePathArrays(source, target, 0.5);
        expect(result).toHaveLength(2);
    });
    it('should handle mismatched array lengths', () => {
        const source = [createSquarePath(100)];
        const target = [createSquarePath(200), createSquarePath(100, 300, 0)];
        const resultEarly = interpolatePathArrays(source, target, 0.3);
        expect(resultEarly).toHaveLength(1); // Only matched path
        const resultLate = interpolatePathArrays(source, target, 0.7);
        expect(resultLate).toHaveLength(2); // Matched + faded in
    });
});
//# sourceMappingURL=path-interpolator.test.js.map