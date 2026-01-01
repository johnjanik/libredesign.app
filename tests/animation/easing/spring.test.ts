/**
 * Spring Easing Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createSpringEasing,
  springPresets,
  dampingRatio,
  isUnderdamped,
  isCriticallyDamped,
  isOverdamped,
} from '../../../src/animation/easing/spring';

describe('createSpringEasing', () => {
  it('should return 0 at t=0', () => {
    const spring = createSpringEasing();
    expect(spring(0)).toBe(0);
  });

  it('should return 1 at t=1', () => {
    const spring = createSpringEasing();
    expect(spring(1)).toBe(1);
  });

  it('should produce smooth interpolation', () => {
    const spring = createSpringEasing({ stiffness: 200, damping: 20 });

    // Should increase monotonically for critically damped spring
    let prev = 0;
    for (let t = 0.1; t <= 1; t += 0.1) {
      const current = spring(t);
      expect(current).toBeGreaterThan(prev * 0.9); // Allow for numerical precision
      prev = current;
    }
  });

  it('should overshoot for underdamped spring', () => {
    const spring = createSpringEasing({ mass: 1, stiffness: 180, damping: 8 });

    // Underdamped spring should overshoot (go above 1)
    let maxValue = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      const value = spring(t);
      if (value > maxValue) maxValue = value;
    }

    expect(maxValue).toBeGreaterThan(1);
  });

  it('should not overshoot for overdamped spring', () => {
    const spring = createSpringEasing({ mass: 1, stiffness: 100, damping: 50 });

    // Overdamped spring should never exceed 1
    for (let t = 0; t <= 1; t += 0.01) {
      const value = spring(t);
      expect(value).toBeLessThanOrEqual(1.01); // Allow small numerical error
    }
  });

  it('should respect initial velocity', () => {
    const springWithVelocity = createSpringEasing({ velocity: 10 });
    const springNoVelocity = createSpringEasing({ velocity: 0 });

    // Higher velocity should result in faster initial movement
    const withV = springWithVelocity(0.1);
    const noV = springNoVelocity(0.1);

    expect(withV).toBeGreaterThan(noV);
  });
});

describe('dampingRatio', () => {
  it('should calculate correct damping ratio', () => {
    // Critical damping: zeta = 1 when c = 2 * sqrt(k * m)
    expect(dampingRatio(1, 100, 20)).toBeCloseTo(1, 5);

    // Underdamped: zeta < 1
    expect(dampingRatio(1, 100, 10)).toBeLessThan(1);

    // Overdamped: zeta > 1
    expect(dampingRatio(1, 100, 30)).toBeGreaterThan(1);
  });
});

describe('isUnderdamped', () => {
  it('should return true for underdamped config', () => {
    expect(isUnderdamped({ mass: 1, stiffness: 100, damping: 10 })).toBe(true);
  });

  it('should return false for critically damped config', () => {
    expect(isUnderdamped({ mass: 1, stiffness: 100, damping: 20 })).toBe(false);
  });

  it('should return false for overdamped config', () => {
    expect(isUnderdamped({ mass: 1, stiffness: 100, damping: 30 })).toBe(false);
  });
});

describe('isCriticallyDamped', () => {
  it('should return true for critically damped config', () => {
    expect(isCriticallyDamped({ mass: 1, stiffness: 100, damping: 20 })).toBe(true);
  });

  it('should return false for underdamped config', () => {
    expect(isCriticallyDamped({ mass: 1, stiffness: 100, damping: 10 })).toBe(false);
  });
});

describe('isOverdamped', () => {
  it('should return true for overdamped config', () => {
    expect(isOverdamped({ mass: 1, stiffness: 100, damping: 30 })).toBe(true);
  });

  it('should return false for underdamped config', () => {
    expect(isOverdamped({ mass: 1, stiffness: 100, damping: 10 })).toBe(false);
  });
});

describe('springPresets', () => {
  it('should have all expected presets', () => {
    expect(springPresets.gentle).toBeDefined();
    expect(springPresets.wobbly).toBeDefined();
    expect(springPresets.stiff).toBeDefined();
    expect(springPresets.slow).toBeDefined();
    expect(springPresets.molasses).toBeDefined();
    expect(springPresets.default).toBeDefined();
  });

  it('should all start at 0 and end at 1', () => {
    for (const [, easing] of Object.entries(springPresets)) {
      expect(easing(0)).toBe(0);
      expect(easing(1)).toBe(1);
    }
  });

  it('wobbly preset should overshoot', () => {
    const wobbly = springPresets.wobbly;

    let maxValue = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      const value = wobbly(t);
      if (value > maxValue) maxValue = value;
    }

    expect(maxValue).toBeGreaterThan(1);
  });
});
