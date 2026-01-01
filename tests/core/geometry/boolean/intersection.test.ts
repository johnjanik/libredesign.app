/**
 * Intersection Detection tests
 */

import { describe, it, expect } from 'vitest';
import {
  lineLineIntersection,
  lineBezierIntersection,
  bezierBezierIntersection,
  evaluateBezier,
  bezierDerivative,
  bezierBounds,
  splitBezier,
  flattenBezier,
  solveQuadratic,
  pointsEqual,
  signedArea,
  isClockwise,
  distance,
  distanceSquared,
  EPSILON,
} from '@core/geometry/boolean';
import type { Point } from '@core/types/geometry';

describe('lineLineIntersection', () => {
  it('finds intersection of perpendicular lines', () => {
    const result = lineLineIntersection(
      { x: 0, y: 5 },
      { x: 10, y: 5 },
      { x: 5, y: 0 },
      { x: 5, y: 10 }
    );

    expect(result).not.toBeNull();
    expect(result!.point.x).toBeCloseTo(5);
    expect(result!.point.y).toBeCloseTo(5);
    expect(result!.t1).toBeCloseTo(0.5);
    expect(result!.t2).toBeCloseTo(0.5);
  });

  it('finds intersection at segment start', () => {
    const result = lineLineIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 10 }
    );

    expect(result).not.toBeNull();
    expect(result!.point.x).toBeCloseTo(0);
    expect(result!.point.y).toBeCloseTo(0);
    expect(result!.t1).toBeCloseTo(0);
    expect(result!.t2).toBeCloseTo(0);
  });

  it('finds intersection at segment end', () => {
    const result = lineLineIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 }
    );

    expect(result).not.toBeNull();
    expect(result!.point.x).toBeCloseTo(10);
    expect(result!.t1).toBeCloseTo(1);
    expect(result!.t2).toBeCloseTo(0);
  });

  it('returns null for collinear non-overlapping segments', () => {
    const result = lineLineIntersection(
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 15, y: 0 }
    );

    expect(result).toBeNull();
  });

  it('returns null for parallel lines', () => {
    const result = lineLineIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 5 },
      { x: 10, y: 5 }
    );

    expect(result).toBeNull();
  });

  it('handles near-parallel lines correctly', () => {
    const result = lineLineIntersection(
      { x: 0, y: 0 },
      { x: 100, y: 0.001 },
      { x: 0, y: 10 },
      { x: 100, y: 10.001 }
    );

    expect(result).toBeNull();
  });

  it('finds intersection for diagonal lines', () => {
    const result = lineLineIntersection(
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 }
    );

    expect(result).not.toBeNull();
    expect(result!.point.x).toBeCloseTo(50);
    expect(result!.point.y).toBeCloseTo(50);
  });
});

describe('evaluateBezier', () => {
  const p0: Point = { x: 0, y: 0 };
  const p1: Point = { x: 30, y: 40 };
  const p2: Point = { x: 70, y: 40 };
  const p3: Point = { x: 100, y: 0 };

  it('returns exact start point at t=0', () => {
    const result = evaluateBezier(p0, p1, p2, p3, 0);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('returns exact end point at t=1', () => {
    const result = evaluateBezier(p0, p1, p2, p3, 1);
    expect(result.x).toBe(100);
    expect(result.y).toBe(0);
  });

  it('returns point on curve for intermediate t', () => {
    const result = evaluateBezier(p0, p1, p2, p3, 0.5);
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeGreaterThan(0);
  });

  it('handles linear bezier (control points on line)', () => {
    // Note: Cubic beziers with collinear control points don't evaluate linearly
    // The result depends on the bezier formula, not simple interpolation
    const linear = evaluateBezier(
      { x: 0, y: 0 },
      { x: 33, y: 0 },
      { x: 66, y: 0 },
      { x: 100, y: 0 },
      0.5
    );
    // At t=0.5: 0.125*0 + 0.375*33 + 0.375*66 + 0.125*100 = 49.625
    expect(linear.x).toBeCloseTo(49.625);
    expect(linear.y).toBeCloseTo(0);
  });
});

describe('bezierDerivative', () => {
  const p0: Point = { x: 0, y: 0 };
  const p1: Point = { x: 30, y: 40 };
  const p2: Point = { x: 70, y: 40 };
  const p3: Point = { x: 100, y: 0 };

  it('returns tangent at start', () => {
    const result = bezierDerivative(p0, p1, p2, p3, 0);
    // Tangent at t=0 is 3*(p1-p0)
    expect(result.x).toBeCloseTo(90);
    expect(result.y).toBeCloseTo(120);
  });

  it('returns tangent at end', () => {
    const result = bezierDerivative(p0, p1, p2, p3, 1);
    // Tangent at t=1 is 3*(p3-p2)
    expect(result.x).toBeCloseTo(90);
    expect(result.y).toBeCloseTo(-120);
  });
});

describe('bezierBounds', () => {
  it('computes bounds including extrema', () => {
    const p0: Point = { x: 0, y: 0 };
    const p1: Point = { x: 0, y: 100 };
    const p2: Point = { x: 100, y: 100 };
    const p3: Point = { x: 100, y: 0 };

    const bounds = bezierBounds(p0, p1, p2, p3);

    expect(bounds.minX).toBeCloseTo(0);
    expect(bounds.maxX).toBeCloseTo(100);
    expect(bounds.minY).toBeCloseTo(0);
    expect(bounds.maxY).toBeGreaterThan(0);
  });

  it('handles linear bezier', () => {
    const p0: Point = { x: 0, y: 0 };
    const p1: Point = { x: 33, y: 33 };
    const p2: Point = { x: 66, y: 66 };
    const p3: Point = { x: 100, y: 100 };

    const bounds = bezierBounds(p0, p1, p2, p3);

    expect(bounds.minX).toBeCloseTo(0);
    expect(bounds.maxX).toBeCloseTo(100);
    expect(bounds.minY).toBeCloseTo(0);
    expect(bounds.maxY).toBeCloseTo(100);
  });
});

describe('splitBezier', () => {
  const p0: Point = { x: 0, y: 0 };
  const p1: Point = { x: 30, y: 40 };
  const p2: Point = { x: 70, y: 40 };
  const p3: Point = { x: 100, y: 0 };

  it('left curve starts at original start', () => {
    const { left } = splitBezier(p0, p1, p2, p3, 0.5);
    expect(left[0].x).toBe(0);
    expect(left[0].y).toBe(0);
  });

  it('right curve ends at original end', () => {
    const { right } = splitBezier(p0, p1, p2, p3, 0.5);
    expect(right[3].x).toBe(100);
    expect(right[3].y).toBe(0);
  });

  it('curves meet at split point', () => {
    const { left, right } = splitBezier(p0, p1, p2, p3, 0.5);
    expect(left[3].x).toBeCloseTo(right[0].x);
    expect(left[3].y).toBeCloseTo(right[0].y);
  });

  it('split point is on original curve', () => {
    const t = 0.3;
    const expected = evaluateBezier(p0, p1, p2, p3, t);
    const { left, right } = splitBezier(p0, p1, p2, p3, t);

    expect(left[3].x).toBeCloseTo(expected.x);
    expect(left[3].y).toBeCloseTo(expected.y);
    expect(right[0].x).toBeCloseTo(expected.x);
    expect(right[0].y).toBeCloseTo(expected.y);
  });

  it('evaluating split curves gives same points', () => {
    const t = 0.6;
    const { left } = splitBezier(p0, p1, p2, p3, t);

    // Point at 0.3 on original = point at 0.5 on left half
    const original = evaluateBezier(p0, p1, p2, p3, 0.3);
    const fromLeft = evaluateBezier(left[0], left[1], left[2], left[3], 0.5);

    expect(fromLeft.x).toBeCloseTo(original.x);
    expect(fromLeft.y).toBeCloseTo(original.y);
  });
});

describe('flattenBezier', () => {
  const p0: Point = { x: 0, y: 0 };
  const p1: Point = { x: 30, y: 50 };
  const p2: Point = { x: 70, y: 50 };
  const p3: Point = { x: 100, y: 0 };

  it('first point matches curve start', () => {
    const points = flattenBezier(p0, p1, p2, p3);
    expect(points[0]!.x).toBe(0);
    expect(points[0]!.y).toBe(0);
  });

  it('last point matches curve end', () => {
    const points = flattenBezier(p0, p1, p2, p3);
    const last = points[points.length - 1]!;
    expect(last.x).toBe(100);
    expect(last.y).toBe(0);
  });

  it('higher tolerance produces fewer points', () => {
    const fine = flattenBezier(p0, p1, p2, p3, 0.1);
    const coarse = flattenBezier(p0, p1, p2, p3, 10);

    expect(coarse.length).toBeLessThanOrEqual(fine.length);
  });

  it('straight line produces minimal points', () => {
    const straight = flattenBezier(
      { x: 0, y: 0 },
      { x: 33, y: 0 },
      { x: 66, y: 0 },
      { x: 100, y: 0 }
    );

    expect(straight.length).toBe(2);
  });
});

describe('lineBezierIntersection', () => {
  it('finds intersection with curve', () => {
    const lineStart = { x: 0, y: 30 };
    const lineEnd = { x: 100, y: 30 };
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 0, y: 100 };
    const p2 = { x: 100, y: 100 };
    const p3 = { x: 100, y: 0 };

    const results = lineBezierIntersection(lineStart, lineEnd, p0, p1, p2, p3);

    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for non-intersecting', () => {
    const lineStart = { x: 0, y: 200 };
    const lineEnd = { x: 100, y: 200 };
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 0, y: 50 };
    const p2 = { x: 100, y: 50 };
    const p3 = { x: 100, y: 0 };

    const results = lineBezierIntersection(lineStart, lineEnd, p0, p1, p2, p3);

    expect(results.length).toBe(0);
  });

  it('finds multiple intersections', () => {
    const lineStart = { x: 50, y: 0 };
    const lineEnd = { x: 50, y: 100 };
    const p0 = { x: 0, y: 50 };
    const p1 = { x: 100, y: 0 };
    const p2 = { x: 100, y: 100 };
    const p3 = { x: 0, y: 50 };

    const results = lineBezierIntersection(lineStart, lineEnd, p0, p1, p2, p3);

    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('bezierBezierIntersection', () => {
  it('finds intersection of crossing curves', () => {
    const results = bezierBezierIntersection(
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 0 }
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for non-intersecting curves', () => {
    const results = bezierBezierIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 30, y: 0 },
      { x: 0, y: 100 },
      { x: 10, y: 110 },
      { x: 20, y: 110 },
      { x: 30, y: 100 }
    );

    expect(results.length).toBe(0);
  });
});

describe('solveQuadratic', () => {
  it('solves equation with two roots', () => {
    // x^2 - 5x + 6 = 0 => x = 2, 3
    const roots = solveQuadratic(1, -5, 6);

    expect(roots.length).toBe(2);
    expect(roots).toContain(2);
    expect(roots).toContain(3);
  });

  it('solves equation with one root', () => {
    // x^2 - 4x + 4 = 0 => x = 2 (double root)
    const roots = solveQuadratic(1, -4, 4);

    expect(roots.length).toBe(1);
    expect(roots[0]).toBeCloseTo(2);
  });

  it('returns empty for no real roots', () => {
    // x^2 + 1 = 0 => no real roots
    const roots = solveQuadratic(1, 0, 1);

    expect(roots.length).toBe(0);
  });

  it('handles linear equation', () => {
    // 0x^2 + 2x + 4 = 0 => x = -2
    const roots = solveQuadratic(0, 2, 4);

    expect(roots.length).toBe(1);
    expect(roots[0]).toBeCloseTo(-2);
  });

  it('handles constant equation', () => {
    // 0x^2 + 0x + 5 = 0 => no solutions
    const roots = solveQuadratic(0, 0, 5);

    expect(roots.length).toBe(0);
  });
});

describe('pointsEqual', () => {
  it('returns true for identical points', () => {
    expect(pointsEqual({ x: 5, y: 10 }, { x: 5, y: 10 })).toBe(true);
  });

  it('returns true for points within tolerance', () => {
    const p1 = { x: 5, y: 10 };
    const p2 = { x: 5 + EPSILON / 2, y: 10 - EPSILON / 2 };

    expect(pointsEqual(p1, p2)).toBe(true);
  });

  it('returns false for different points', () => {
    expect(pointsEqual({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(false);
  });

  it('uses custom tolerance', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 0.5, y: 0.5 };

    expect(pointsEqual(p1, p2, 1)).toBe(true);
    expect(pointsEqual(p1, p2, 0.1)).toBe(false);
  });
});

describe('signedArea', () => {
  it('returns positive for CCW polygon', () => {
    const ccw: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];

    expect(signedArea(ccw)).toBeGreaterThan(0);
  });

  it('returns negative for CW polygon', () => {
    const cw: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
    ];

    expect(signedArea(cw)).toBeLessThan(0);
  });

  it('returns correct magnitude', () => {
    const square: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];

    expect(Math.abs(signedArea(square))).toBeCloseTo(100);
  });

  it('returns zero for degenerate polygon', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];

    expect(signedArea(line)).toBe(0);
  });
});

describe('isClockwise', () => {
  it('returns false for CCW polygon', () => {
    const ccw: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];

    expect(isClockwise(ccw)).toBe(false);
  });

  it('returns true for CW polygon', () => {
    const cw: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
    ];

    expect(isClockwise(cw)).toBe(true);
  });
});

describe('distance and distanceSquared', () => {
  it('computes correct distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it('computes correct squared distance', () => {
    expect(distanceSquared({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(25);
  });

  it('returns zero for same point', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    expect(distanceSquared({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });
});
