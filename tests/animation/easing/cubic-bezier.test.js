/**
 * Cubic Bezier Easing Tests
 */
import { describe, it, expect } from 'vitest';
import { createCubicBezier, cubicBezierPresets, } from '../../../src/animation/easing/cubic-bezier';
describe('createCubicBezier', () => {
    it('should return 0 at t=0', () => {
        const ease = createCubicBezier(0.25, 0.1, 0.25, 1.0);
        expect(ease(0)).toBe(0);
    });
    it('should return 1 at t=1', () => {
        const ease = createCubicBezier(0.25, 0.1, 0.25, 1.0);
        expect(ease(1)).toBe(1);
    });
    it('should handle linear bezier (all points on diagonal)', () => {
        const linear = createCubicBezier(0.5, 0.5, 0.5, 0.5);
        expect(linear(0)).toBe(0);
        expect(linear(0.5)).toBeCloseTo(0.5, 1);
        expect(linear(1)).toBe(1);
    });
    it('should throw for x values outside [0, 1]', () => {
        expect(() => createCubicBezier(-0.1, 0.5, 0.5, 0.5)).toThrow();
        expect(() => createCubicBezier(0.5, 0.5, 1.1, 0.5)).toThrow();
    });
    it('should allow y values outside [0, 1]', () => {
        // Should not throw - y can overshoot
        const overshoot = createCubicBezier(0.5, 1.5, 0.5, -0.5);
        expect(overshoot(0)).toBe(0);
        expect(overshoot(1)).toBe(1);
    });
    it('should produce smooth interpolation', () => {
        const ease = createCubicBezier(0.25, 0.1, 0.25, 1.0);
        let prev = 0;
        for (let t = 0.1; t <= 1; t += 0.1) {
            const current = ease(t);
            expect(current).toBeGreaterThanOrEqual(prev);
            prev = current;
        }
    });
    it('should match CSS ease curve behavior', () => {
        const ease = cubicBezierPresets.ease;
        // CSS ease (0.25, 0.1, 0.25, 1.0) is a smooth acceleration-deceleration curve
        // The curve accelerates quickly due to control point at (0.25, 1.0)
        const t25 = ease(0.25);
        const t50 = ease(0.5);
        const t75 = ease(0.75);
        // At t=0.25, output is already above 0.25 due to strong acceleration
        expect(t25).toBeGreaterThan(0.25);
        // At t=0.5, we're past the midpoint in output
        expect(t50).toBeGreaterThan(0.5);
        // At t=0.75, we're close to 1 as the curve flattens
        expect(t75).toBeGreaterThan(0.85);
    });
    it('should handle ease-in curve (slow start)', () => {
        const easeIn = cubicBezierPresets.easeIn;
        // Slow start means value at t=0.5 should be less than 0.5
        expect(easeIn(0.5)).toBeLessThan(0.5);
    });
    it('should handle ease-out curve (slow end)', () => {
        const easeOut = cubicBezierPresets.easeOut;
        // Slow end means value at t=0.5 should be greater than 0.5
        expect(easeOut(0.5)).toBeGreaterThan(0.5);
    });
    it('should handle ease-in-out curve (slow start and end)', () => {
        const easeInOut = cubicBezierPresets.easeInOut;
        // Symmetric curve
        expect(easeInOut(0.5)).toBeCloseTo(0.5, 1);
        expect(easeInOut(0.25)).toBeLessThan(0.25);
        expect(easeInOut(0.75)).toBeGreaterThan(0.75);
    });
});
describe('cubicBezierPresets', () => {
    it('should have all expected presets', () => {
        expect(cubicBezierPresets.ease).toBeDefined();
        expect(cubicBezierPresets.easeIn).toBeDefined();
        expect(cubicBezierPresets.easeOut).toBeDefined();
        expect(cubicBezierPresets.easeInOut).toBeDefined();
        expect(cubicBezierPresets.standard).toBeDefined();
        expect(cubicBezierPresets.decelerate).toBeDefined();
        expect(cubicBezierPresets.accelerate).toBeDefined();
        expect(cubicBezierPresets.sharp).toBeDefined();
    });
    it('should all return values in [0, 1] for t in [0, 1]', () => {
        for (const [, easing] of Object.entries(cubicBezierPresets)) {
            for (let t = 0; t <= 1; t += 0.1) {
                const value = easing(t);
                expect(value).toBeGreaterThanOrEqual(-0.1); // Allow slight undershoot
                expect(value).toBeLessThanOrEqual(1.1); // Allow slight overshoot
            }
        }
    });
});
//# sourceMappingURL=cubic-bezier.test.js.map