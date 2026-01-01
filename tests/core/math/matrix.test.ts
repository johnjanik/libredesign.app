/**
 * Matrix tests
 */

import { describe, it, expect } from 'vitest';
import {
  identity,
  translate,
  scale,
  rotate,
  multiply,
  invert,
  transformPoint,
  getTranslation,
  getScale,
  getRotation,
  matricesEqual,
  isIdentity,
  compose,
  decompose,
  toCSSTransform,
  toMatrix4,
  toMatrix3,
} from '@core/math/matrix';
import type { Matrix2x3, Point } from '@core/types/geometry';

describe('Matrix operations', () => {
  describe('identity', () => {
    it('creates an identity matrix', () => {
      const m = identity();
      expect(m).toEqual([1, 0, 0, 1, 0, 0]);
    });

    it('does not change points when applied', () => {
      const m = identity();
      const p: Point = { x: 5, y: 10 };
      const result = transformPoint(m, p);
      expect(result.x).toBeCloseTo(5);
      expect(result.y).toBeCloseTo(10);
    });
  });

  describe('translate', () => {
    it('creates a translation matrix', () => {
      const m = translate(10, 20);
      expect(m).toEqual([1, 0, 0, 1, 10, 20]);
    });

    it('translates points correctly', () => {
      const m = translate(10, 20);
      const p: Point = { x: 5, y: 5 };
      const result = transformPoint(m, p);
      expect(result.x).toBeCloseTo(15);
      expect(result.y).toBeCloseTo(25);
    });
  });

  describe('scale', () => {
    it('creates a uniform scale matrix', () => {
      const m = scale(2);
      expect(m).toEqual([2, 0, 0, 2, 0, 0]);
    });

    it('creates a non-uniform scale matrix', () => {
      const m = scale(2, 3);
      expect(m).toEqual([2, 0, 0, 3, 0, 0]);
    });

    it('scales points correctly', () => {
      const m = scale(2, 3);
      const p: Point = { x: 5, y: 10 };
      const result = transformPoint(m, p);
      expect(result.x).toBeCloseTo(10);
      expect(result.y).toBeCloseTo(30);
    });
  });

  describe('rotate', () => {
    it('creates a rotation matrix', () => {
      const m = rotate(Math.PI / 2); // 90 degrees
      expect(m[0]).toBeCloseTo(0);
      expect(m[1]).toBeCloseTo(1);
      expect(m[2]).toBeCloseTo(-1);
      expect(m[3]).toBeCloseTo(0);
    });

    it('rotates points correctly', () => {
      const m = rotate(Math.PI / 2); // 90 degrees
      const p: Point = { x: 1, y: 0 };
      const result = transformPoint(m, p);
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(1);
    });
  });

  describe('multiply', () => {
    it('multiplies identity matrices', () => {
      const a = identity();
      const b = identity();
      const result = multiply(a, b);
      expect(matricesEqual(result, identity())).toBe(true);
    });

    it('applies transformations in correct order (b then a)', () => {
      const translateM = translate(10, 0);
      const scaleM = scale(2);
      // First scale, then translate
      const result = multiply(translateM, scaleM);

      const p: Point = { x: 5, y: 0 };
      const transformed = transformPoint(result, p);
      // 5 * 2 = 10, then + 10 = 20
      expect(transformed.x).toBeCloseTo(20);
    });

    it('combines multiple transformations', () => {
      const t1 = translate(5, 0);
      const t2 = translate(3, 0);
      const result = multiply(t1, t2);

      const p: Point = { x: 0, y: 0 };
      const transformed = transformPoint(result, p);
      expect(transformed.x).toBeCloseTo(8);
    });
  });

  describe('invert', () => {
    it('inverts a translation matrix', () => {
      const m = translate(10, 20);
      const inv = invert(m);
      expect(inv).not.toBeNull();
      if (inv) {
        expect(inv[4]).toBeCloseTo(-10);
        expect(inv[5]).toBeCloseTo(-20);
      }
    });

    it('inverts a scale matrix', () => {
      const m = scale(2, 4);
      const inv = invert(m);
      expect(inv).not.toBeNull();
      if (inv) {
        expect(inv[0]).toBeCloseTo(0.5);
        expect(inv[3]).toBeCloseTo(0.25);
      }
    });

    it('returns null for non-invertible matrix', () => {
      const m: Matrix2x3 = [0, 0, 0, 0, 0, 0];
      const inv = invert(m);
      expect(inv).toBeNull();
    });

    it('invert followed by multiply gives identity', () => {
      const m = multiply(translate(5, 10), scale(2, 3));
      const inv = invert(m);
      expect(inv).not.toBeNull();
      if (inv) {
        const result = multiply(m, inv);
        expect(isIdentity(result)).toBe(true);
      }
    });
  });

  describe('transformPoint', () => {
    it('applies identity to point', () => {
      const result = transformPoint(identity(), { x: 10, y: 20 });
      expect(result.x).toBeCloseTo(10);
      expect(result.y).toBeCloseTo(20);
    });

    it('applies complex transformation', () => {
      // Scale by 2, then translate by (10, 10)
      const m = multiply(translate(10, 10), scale(2));
      const p: Point = { x: 5, y: 5 };
      const result = transformPoint(m, p);
      expect(result.x).toBeCloseTo(20); // 5*2 + 10
      expect(result.y).toBeCloseTo(20); // 5*2 + 10
    });
  });

  describe('getTranslation', () => {
    it('extracts translation from matrix', () => {
      const m = translate(15, 25);
      const t = getTranslation(m);
      expect(t.x).toBe(15);
      expect(t.y).toBe(25);
    });
  });

  describe('getScale', () => {
    it('extracts scale from matrix', () => {
      const m = scale(3, 4);
      const s = getScale(m);
      expect(s.scaleX).toBeCloseTo(3);
      expect(s.scaleY).toBeCloseTo(4);
    });

    it('extracts scale from complex matrix', () => {
      const m = compose(0, 0, 0, 2, 3);
      const s = getScale(m);
      expect(s.scaleX).toBeCloseTo(2);
      expect(s.scaleY).toBeCloseTo(3);
    });
  });

  describe('getRotation', () => {
    it('extracts rotation from matrix', () => {
      const angle = Math.PI / 4; // 45 degrees
      const m = rotate(angle);
      const r = getRotation(m);
      expect(r).toBeCloseTo(angle);
    });
  });

  describe('matricesEqual', () => {
    it('returns true for equal matrices', () => {
      const a = translate(5, 10);
      const b = translate(5, 10);
      expect(matricesEqual(a, b)).toBe(true);
    });

    it('returns false for different matrices', () => {
      const a = translate(5, 10);
      const b = translate(5, 11);
      expect(matricesEqual(a, b)).toBe(false);
    });

    it('respects tolerance', () => {
      const a: Matrix2x3 = [1, 0, 0, 1, 0, 0];
      const b: Matrix2x3 = [1.0001, 0, 0, 1, 0, 0];
      expect(matricesEqual(a, b, 0.001)).toBe(true);
      expect(matricesEqual(a, b, 0.00001)).toBe(false);
    });
  });

  describe('isIdentity', () => {
    it('returns true for identity matrix', () => {
      expect(isIdentity(identity())).toBe(true);
    });

    it('returns false for non-identity matrix', () => {
      expect(isIdentity(translate(1, 0))).toBe(false);
      expect(isIdentity(scale(2))).toBe(false);
    });
  });

  describe('compose/decompose', () => {
    it('composes transformation correctly', () => {
      const m = compose(10, 20, Math.PI / 4, 2, 3);
      const d = decompose(m);

      expect(d.tx).toBeCloseTo(10);
      expect(d.ty).toBeCloseTo(20);
      expect(d.rotation).toBeCloseTo(Math.PI / 4);
      expect(d.scaleX).toBeCloseTo(2);
      expect(d.scaleY).toBeCloseTo(3);
    });

    it('round-trips through compose/decompose', () => {
      const tx = 15, ty = 25, rotation = Math.PI / 6, scaleX = 1.5, scaleY = 2.5;
      const m = compose(tx, ty, rotation, scaleX, scaleY);
      const d = decompose(m);

      expect(d.tx).toBeCloseTo(tx);
      expect(d.ty).toBeCloseTo(ty);
      expect(d.rotation).toBeCloseTo(rotation);
      expect(d.scaleX).toBeCloseTo(scaleX);
      expect(d.scaleY).toBeCloseTo(scaleY);
    });
  });

  describe('toCSSTransform', () => {
    it('converts matrix to CSS string', () => {
      const m: Matrix2x3 = [1, 2, 3, 4, 5, 6];
      const css = toCSSTransform(m);
      expect(css).toBe('matrix(1, 2, 3, 4, 5, 6)');
    });
  });

  describe('toMatrix4', () => {
    it('converts to 4x4 matrix', () => {
      const m = translate(10, 20);
      const m4 = toMatrix4(m);

      expect(m4).toBeInstanceOf(Float32Array);
      expect(m4.length).toBe(16);

      // Check translation values in column-major order
      expect(m4[12]).toBeCloseTo(10);
      expect(m4[13]).toBeCloseTo(20);
    });
  });

  describe('toMatrix3', () => {
    it('converts to 3x3 matrix', () => {
      const m = translate(10, 20);
      const m3 = toMatrix3(m);

      expect(m3).toBeInstanceOf(Float32Array);
      expect(m3.length).toBe(9);

      // Check translation values in column-major order
      expect(m3[6]).toBeCloseTo(10);
      expect(m3[7]).toBeCloseTo(20);
    });
  });
});
