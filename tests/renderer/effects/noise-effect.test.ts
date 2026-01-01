/**
 * Noise Effect Tests
 */

import { describe, it, expect } from 'vitest';
import {
  noise,
  isNoiseEffect,
} from '@core/types/effect';
import type { NoiseEffect, Effect } from '@core/types/effect';

describe('noise factory', () => {
  it('should create a noise effect with defaults', () => {
    const effect = noise();

    expect(effect.type).toBe('NOISE');
    expect(effect.visible).toBe(true);
    expect(effect.amount).toBe(10);
    expect(effect.size).toBe(1);
    expect(effect.monochrome).toBe(false);
  });

  it('should create a noise effect with custom values', () => {
    const effect = noise({
      amount: 50,
      size: 5,
      monochrome: true,
    });

    expect(effect.amount).toBe(50);
    expect(effect.size).toBe(5);
    expect(effect.monochrome).toBe(true);
  });

  it('should clamp amount to valid range', () => {
    const effectOver = noise({ amount: 150 });
    expect(effectOver.amount).toBe(100);

    const effectUnder = noise({ amount: -10 });
    expect(effectUnder.amount).toBe(0);
  });

  it('should clamp size to valid range', () => {
    const effectOver = noise({ size: 20 });
    expect(effectOver.size).toBe(10);

    const effectUnder = noise({ size: 0 });
    expect(effectUnder.size).toBe(1);
  });

  it('should allow color noise by default', () => {
    const effect = noise();
    expect(effect.monochrome).toBe(false);
  });

  it('should allow monochrome noise', () => {
    const effect = noise({ monochrome: true });
    expect(effect.monochrome).toBe(true);
  });
});

describe('isNoiseEffect', () => {
  it('should return true for noise effects', () => {
    const effect: Effect = noise({ amount: 25 });
    expect(isNoiseEffect(effect)).toBe(true);
  });

  it('should return false for other effects', () => {
    const blurEffect: Effect = {
      type: 'BLUR',
      visible: true,
      radius: 5,
    };
    expect(isNoiseEffect(blurEffect)).toBe(false);
  });
});

describe('NoiseEffectConfig', () => {
  it('should detect noop configurations', () => {
    // A noop is when amount is effectively 0
    const isNoop = (config: NoiseEffect) => config.amount < 0.1;

    expect(isNoop(noise({ amount: 0 }))).toBe(true);
    expect(isNoop(noise({ amount: 0.05 }))).toBe(true);
    expect(isNoop(noise({ amount: 1 }))).toBe(false);
  });

  it('should support film grain effect preset', () => {
    // Film grain typically uses small monochrome noise
    const filmGrain = noise({
      amount: 15,
      size: 1,
      monochrome: true,
    });

    expect(filmGrain.amount).toBe(15);
    expect(filmGrain.size).toBe(1);
    expect(filmGrain.monochrome).toBe(true);
  });

  it('should support color noise preset', () => {
    // Color noise uses larger colored noise
    const colorNoise = noise({
      amount: 30,
      size: 2,
      monochrome: false,
    });

    expect(colorNoise.amount).toBe(30);
    expect(colorNoise.size).toBe(2);
    expect(colorNoise.monochrome).toBe(false);
  });
});
