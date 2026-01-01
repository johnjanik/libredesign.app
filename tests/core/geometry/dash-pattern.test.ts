/**
 * Dash Pattern Tests
 */

import { describe, it, expect } from 'vitest';
import {
  applyDashPattern,
  pathLength,
  pointAtLength,
  tangentAtLength,
} from '../../../src/core/geometry/dash-pattern';
import type { VectorPath } from '../../../src/core/types/geometry';

// Helper to create a simple horizontal line path
function createLinePath(x1: number, y1: number, x2: number, y2: number): VectorPath {
  return {
    windingRule: 'NONZERO',
    commands: [
      { type: 'M', x: x1, y: y1 },
      { type: 'L', x: x2, y: y2 },
    ],
  };
}

// Helper to create a square path
function createSquarePath(x: number, y: number, size: number): VectorPath {
  return {
    windingRule: 'NONZERO',
    commands: [
      { type: 'M', x: x, y: y },
      { type: 'L', x: x + size, y: y },
      { type: 'L', x: x + size, y: y + size },
      { type: 'L', x: x, y: y + size },
      { type: 'Z' },
    ],
  };
}

// Helper to create a path with a cubic bezier curve
function createCurvePath(): VectorPath {
  return {
    windingRule: 'NONZERO',
    commands: [
      { type: 'M', x: 0, y: 0 },
      { type: 'C', x1: 50, y1: 0, x2: 50, y2: 100, x: 100, y: 100 },
    ],
  };
}

describe('applyDashPattern', () => {
  it('should return original path when pattern is empty', () => {
    const path = createLinePath(0, 0, 100, 0);
    const result = applyDashPattern(path, { pattern: [] });

    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]).toEqual(path);
  });

  it('should create dashed segments for simple dash pattern', () => {
    const path = createLinePath(0, 0, 100, 0);
    const result = applyDashPattern(path, { pattern: [20, 10] });

    // 100px line with 20px dash, 10px gap = dashes at 0-20, 30-50, 60-80, 90-100
    expect(result.paths.length).toBeGreaterThanOrEqual(3);
    expect(result.totalLength).toBeCloseTo(100, 5);
  });

  it('should handle dash pattern with offset', () => {
    const path = createLinePath(0, 0, 100, 0);
    const result = applyDashPattern(path, { pattern: [20, 10], offset: 10 });

    // With offset 10, we start 10px into the first dash (20px)
    // So first dash is 10px (remainder of first dash)
    expect(result.paths.length).toBeGreaterThan(0);
  });

  it('should handle negative offset', () => {
    const path = createLinePath(0, 0, 100, 0);
    const result = applyDashPattern(path, { pattern: [20, 10], offset: -5 });

    // Negative offset should work as well
    expect(result.paths.length).toBeGreaterThan(0);
  });

  it('should handle equal dash and gap', () => {
    const path = createLinePath(0, 0, 100, 0);
    const result = applyDashPattern(path, { pattern: [10, 10] });

    // 100px line with 10px dash, 10px gap = 5 dashes
    expect(result.paths).toHaveLength(5);
  });

  it('should handle single value pattern (duplicates it)', () => {
    const path = createLinePath(0, 0, 100, 0);
    const result = applyDashPattern(path, { pattern: [25] });

    // Single value [25] becomes [25, 25]
    // 100px line = 2 dashes (0-25, 50-75)
    expect(result.paths).toHaveLength(2);
  });

  it('should handle closed paths', () => {
    const path = createSquarePath(0, 0, 100);
    const result = applyDashPattern(path, { pattern: [50, 25] });

    // Square has perimeter of 400px
    // 50px dash, 25px gap = 75px pattern
    // 400 / 75 = 5.33 full patterns
    expect(result.paths.length).toBeGreaterThan(0);
    expect(result.totalLength).toBeCloseTo(400, 5);
  });

  it('should handle curved paths', () => {
    const path = createCurvePath();
    const result = applyDashPattern(path, { pattern: [20, 10] });

    expect(result.paths.length).toBeGreaterThan(0);
    expect(result.totalLength).toBeGreaterThan(100); // Curve is longer than straight line
  });

  it('should return empty paths for zero-length pattern', () => {
    const path = createLinePath(0, 0, 100, 0);
    const result = applyDashPattern(path, { pattern: [0, 0] });

    expect(result.paths).toHaveLength(0);
  });

  it('should handle very small dashes', () => {
    const path = createLinePath(0, 0, 10, 0);
    const result = applyDashPattern(path, { pattern: [1, 1] });

    expect(result.paths).toHaveLength(5);
  });

  it('should handle dash longer than path', () => {
    const path = createLinePath(0, 0, 50, 0);
    const result = applyDashPattern(path, { pattern: [100, 50] });

    // Single dash covers entire path
    expect(result.paths).toHaveLength(1);
  });

  it('should preserve winding rule', () => {
    const path: VectorPath = {
      windingRule: 'EVENODD',
      commands: [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 },
      ],
    };
    const result = applyDashPattern(path, { pattern: [20, 10] });

    for (const dashPath of result.paths) {
      expect(dashPath.windingRule).toBe('EVENODD');
    }
  });

  it('should handle complex multi-value pattern', () => {
    const path = createLinePath(0, 0, 200, 0);
    // 200px line with pattern [30, 10, 10, 10] = 60px per cycle
    // Should create dashes of varying lengths
    const result = applyDashPattern(path, { pattern: [30, 10, 10, 10] });

    expect(result.paths.length).toBeGreaterThan(0);
  });
});

describe('pathLength', () => {
  it('should calculate length of straight line', () => {
    const path = createLinePath(0, 0, 100, 0);
    expect(pathLength(path)).toBeCloseTo(100, 5);
  });

  it('should calculate length of diagonal line', () => {
    const path = createLinePath(0, 0, 100, 100);
    expect(pathLength(path)).toBeCloseTo(Math.sqrt(2) * 100, 5);
  });

  it('should calculate perimeter of square', () => {
    const path = createSquarePath(0, 0, 100);
    expect(pathLength(path)).toBeCloseTo(400, 5);
  });

  it('should calculate length of curved path', () => {
    const path = createCurvePath();
    const length = pathLength(path);

    // Curve should be longer than straight line from (0,0) to (100,100)
    expect(length).toBeGreaterThan(Math.sqrt(2) * 100);
    // But shorter than control point detour
    expect(length).toBeLessThan(300);
  });

  it('should return 0 for empty path', () => {
    const path: VectorPath = { windingRule: 'NONZERO', commands: [] };
    expect(pathLength(path)).toBe(0);
  });

  it('should return 0 for path with only MoveTo', () => {
    const path: VectorPath = {
      windingRule: 'NONZERO',
      commands: [{ type: 'M', x: 50, y: 50 }],
    };
    expect(pathLength(path)).toBe(0);
  });
});

describe('pointAtLength', () => {
  it('should return start point at length 0', () => {
    const path = createLinePath(10, 20, 110, 20);
    const point = pointAtLength(path, 0);

    expect(point).not.toBeNull();
    expect(point!.x).toBeCloseTo(10, 5);
    expect(point!.y).toBeCloseTo(20, 5);
  });

  it('should return end point at full length', () => {
    const path = createLinePath(10, 20, 110, 20);
    const point = pointAtLength(path, 100);

    expect(point).not.toBeNull();
    expect(point!.x).toBeCloseTo(110, 5);
    expect(point!.y).toBeCloseTo(20, 5);
  });

  it('should return midpoint at half length', () => {
    const path = createLinePath(0, 0, 100, 0);
    const point = pointAtLength(path, 50);

    expect(point).not.toBeNull();
    expect(point!.x).toBeCloseTo(50, 5);
    expect(point!.y).toBeCloseTo(0, 5);
  });

  it('should handle diagonal lines', () => {
    const path = createLinePath(0, 0, 100, 100);
    const halfLength = (Math.sqrt(2) * 100) / 2;
    const point = pointAtLength(path, halfLength);

    expect(point).not.toBeNull();
    expect(point!.x).toBeCloseTo(50, 5);
    expect(point!.y).toBeCloseTo(50, 5);
  });

  it('should return null for empty path', () => {
    const path: VectorPath = { windingRule: 'NONZERO', commands: [] };
    const point = pointAtLength(path, 50);

    expect(point).toBeNull();
  });

  it('should return last point when length exceeds path', () => {
    const path = createLinePath(0, 0, 100, 0);
    const point = pointAtLength(path, 200);

    expect(point).not.toBeNull();
    expect(point!.x).toBeCloseTo(100, 5);
    expect(point!.y).toBeCloseTo(0, 5);
  });

  it('should work with multi-segment paths', () => {
    const path = createSquarePath(0, 0, 100);
    // At 150px we should be halfway along the second side
    const point = pointAtLength(path, 150);

    expect(point).not.toBeNull();
    expect(point!.x).toBeCloseTo(100, 5);
    expect(point!.y).toBeCloseTo(50, 5);
  });
});

describe('tangentAtLength', () => {
  it('should return horizontal tangent for horizontal line', () => {
    const path = createLinePath(0, 0, 100, 0);
    const tangent = tangentAtLength(path, 50);

    expect(tangent).not.toBeNull();
    expect(tangent!.x).toBeCloseTo(1, 5);
    expect(tangent!.y).toBeCloseTo(0, 5);
  });

  it('should return vertical tangent for vertical line', () => {
    const path = createLinePath(0, 0, 0, 100);
    const tangent = tangentAtLength(path, 50);

    expect(tangent).not.toBeNull();
    expect(tangent!.x).toBeCloseTo(0, 5);
    expect(tangent!.y).toBeCloseTo(1, 5);
  });

  it('should return diagonal tangent for diagonal line', () => {
    const path = createLinePath(0, 0, 100, 100);
    const tangent = tangentAtLength(path, 50);

    expect(tangent).not.toBeNull();
    const sqrt2_2 = Math.SQRT1_2;
    expect(tangent!.x).toBeCloseTo(sqrt2_2, 5);
    expect(tangent!.y).toBeCloseTo(sqrt2_2, 5);
  });

  it('should return normalized tangent', () => {
    const path = createLinePath(0, 0, 100, 100);
    const tangent = tangentAtLength(path, 50);

    expect(tangent).not.toBeNull();
    const length = Math.sqrt(tangent!.x * tangent!.x + tangent!.y * tangent!.y);
    expect(length).toBeCloseTo(1, 5);
  });

  it('should return null for empty path', () => {
    const path: VectorPath = { windingRule: 'NONZERO', commands: [] };
    const tangent = tangentAtLength(path, 50);

    expect(tangent).toBeNull();
  });

  it('should handle multi-segment paths', () => {
    const path = createSquarePath(0, 0, 100);

    // At length 50, we're on the first horizontal segment (going right)
    const tangent1 = tangentAtLength(path, 50);
    expect(tangent1).not.toBeNull();
    expect(tangent1!.x).toBeCloseTo(1, 5);
    expect(tangent1!.y).toBeCloseTo(0, 5);

    // At length 150, we're on the second segment (going down)
    const tangent2 = tangentAtLength(path, 150);
    expect(tangent2).not.toBeNull();
    expect(tangent2!.x).toBeCloseTo(0, 5);
    expect(tangent2!.y).toBeCloseTo(1, 5);
  });
});
