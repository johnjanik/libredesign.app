/**
 * Motion Blur Effect Tests
 */

import { describe, it, expect } from 'vitest';
import {
  motionBlur,
  isMotionBlurEffect,
} from '@core/types/effect';
import type { MotionBlurEffect, Effect } from '@core/types/effect';

describe('motionBlur factory', () => {
  it('should create a motion blur effect with defaults', () => {
    const effect = motionBlur();

    expect(effect.type).toBe('MOTION_BLUR');
    expect(effect.visible).toBe(true);
    expect(effect.angle).toBe(0);
    expect(effect.distance).toBe(10);
  });

  it('should create a motion blur effect with custom values', () => {
    const effect = motionBlur({
      angle: 45,
      distance: 25,
    });

    expect(effect.angle).toBe(45);
    expect(effect.distance).toBe(25);
  });

  it('should allow any angle value', () => {
    const effect = motionBlur({ angle: 720 });
    expect(effect.angle).toBe(720);

    const effectNegative = motionBlur({ angle: -90 });
    expect(effectNegative.angle).toBe(-90);
  });

  it('should clamp distance to non-negative', () => {
    const effect = motionBlur({ distance: -10 });
    expect(effect.distance).toBe(0);
  });

  it('should allow zero distance (no blur)', () => {
    const effect = motionBlur({ distance: 0 });
    expect(effect.distance).toBe(0);
  });
});

describe('isMotionBlurEffect', () => {
  it('should return true for motion blur effects', () => {
    const effect: Effect = motionBlur({ angle: 45, distance: 10 });
    expect(isMotionBlurEffect(effect)).toBe(true);
  });

  it('should return false for other effects', () => {
    const blurEffect: Effect = {
      type: 'BLUR',
      visible: true,
      radius: 5,
    };
    expect(isMotionBlurEffect(blurEffect)).toBe(false);
  });
});

describe('MotionBlurConfig', () => {
  it('should detect noop configurations', () => {
    // A noop is when distance is effectively 0
    const isNoop = (config: MotionBlurEffect) => config.distance < 0.5;

    expect(isNoop(motionBlur({ distance: 0 }))).toBe(true);
    expect(isNoop(motionBlur({ distance: 0.3 }))).toBe(true);
    expect(isNoop(motionBlur({ distance: 1 }))).toBe(false);
  });

  it('should support horizontal blur', () => {
    const horizontal = motionBlur({ angle: 0, distance: 20 });
    expect(horizontal.angle).toBe(0);
    expect(horizontal.distance).toBe(20);
  });

  it('should support vertical blur', () => {
    const vertical = motionBlur({ angle: 90, distance: 20 });
    expect(vertical.angle).toBe(90);
    expect(vertical.distance).toBe(20);
  });

  it('should support diagonal blur', () => {
    const diagonal = motionBlur({ angle: 45, distance: 20 });
    expect(diagonal.angle).toBe(45);
    expect(diagonal.distance).toBe(20);
  });
});

describe('Motion blur angle calculations', () => {
  it('should convert angle to direction vector correctly', () => {
    // Test helper function that would be used in the renderer
    const angleToDirection = (degrees: number) => {
      const radians = degrees * (Math.PI / 180);
      return {
        x: Math.cos(radians),
        y: Math.sin(radians),
      };
    };

    // 0 degrees = right (1, 0)
    const right = angleToDirection(0);
    expect(right.x).toBeCloseTo(1, 5);
    expect(right.y).toBeCloseTo(0, 5);

    // 90 degrees = up (0, 1)
    const up = angleToDirection(90);
    expect(up.x).toBeCloseTo(0, 5);
    expect(up.y).toBeCloseTo(1, 5);

    // 180 degrees = left (-1, 0)
    const left = angleToDirection(180);
    expect(left.x).toBeCloseTo(-1, 5);
    expect(left.y).toBeCloseTo(0, 5);

    // 45 degrees = diagonal
    const diagonal = angleToDirection(45);
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2, 5);
    expect(diagonal.y).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it('should calculate angle from velocity correctly', () => {
    // Test helper function for velocity-based blur
    const velocityToAngle = (vx: number, vy: number) => {
      return Math.atan2(vy, vx) * (180 / Math.PI);
    };

    // Moving right
    expect(velocityToAngle(10, 0)).toBeCloseTo(0, 5);

    // Moving up
    expect(velocityToAngle(0, 10)).toBeCloseTo(90, 5);

    // Moving left
    expect(velocityToAngle(-10, 0)).toBeCloseTo(180, 5);

    // Moving down
    expect(velocityToAngle(0, -10)).toBeCloseTo(-90, 5);

    // Moving diagonal
    expect(velocityToAngle(10, 10)).toBeCloseTo(45, 5);
  });
});
