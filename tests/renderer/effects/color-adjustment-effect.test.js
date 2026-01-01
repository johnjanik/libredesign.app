/**
 * Color Adjustment Effect Tests
 */
import { describe, it, expect } from 'vitest';
import { colorAdjustment, isColorAdjustmentEffect, } from '@core/types/effect';
describe('colorAdjustment factory', () => {
    it('should create a color adjustment effect with defaults', () => {
        const effect = colorAdjustment();
        expect(effect.type).toBe('COLOR_ADJUSTMENT');
        expect(effect.visible).toBe(true);
        expect(effect.hue).toBe(0);
        expect(effect.saturation).toBe(0);
        expect(effect.brightness).toBe(0);
        expect(effect.contrast).toBe(0);
    });
    it('should create a color adjustment effect with custom values', () => {
        const effect = colorAdjustment({
            hue: 45,
            saturation: 25,
            brightness: -10,
            contrast: 15,
        });
        expect(effect.hue).toBe(45);
        expect(effect.saturation).toBe(25);
        expect(effect.brightness).toBe(-10);
        expect(effect.contrast).toBe(15);
    });
    it('should clamp hue to valid range', () => {
        const effectOver = colorAdjustment({ hue: 200 });
        expect(effectOver.hue).toBe(180);
        const effectUnder = colorAdjustment({ hue: -200 });
        expect(effectUnder.hue).toBe(-180);
    });
    it('should clamp saturation to valid range', () => {
        const effectOver = colorAdjustment({ saturation: 150 });
        expect(effectOver.saturation).toBe(100);
        const effectUnder = colorAdjustment({ saturation: -150 });
        expect(effectUnder.saturation).toBe(-100);
    });
    it('should clamp brightness to valid range', () => {
        const effectOver = colorAdjustment({ brightness: 150 });
        expect(effectOver.brightness).toBe(100);
        const effectUnder = colorAdjustment({ brightness: -150 });
        expect(effectUnder.brightness).toBe(-100);
    });
    it('should clamp contrast to valid range', () => {
        const effectOver = colorAdjustment({ contrast: 150 });
        expect(effectOver.contrast).toBe(100);
        const effectUnder = colorAdjustment({ contrast: -150 });
        expect(effectUnder.contrast).toBe(-100);
    });
});
describe('isColorAdjustmentEffect', () => {
    it('should return true for color adjustment effects', () => {
        const effect = colorAdjustment({ hue: 10 });
        expect(isColorAdjustmentEffect(effect)).toBe(true);
    });
    it('should return false for other effects', () => {
        const blurEffect = {
            type: 'BLUR',
            visible: true,
            radius: 5,
        };
        expect(isColorAdjustmentEffect(blurEffect)).toBe(false);
    });
});
describe('ColorAdjustmentConfig', () => {
    it('should detect noop configurations', () => {
        // A noop configuration is when all values are effectively 0
        const noopConfig = {
            hue: 0,
            saturation: 0,
            brightness: 0,
            contrast: 0,
        };
        const isNoop = (config) => {
            const epsilon = 0.01;
            return (Math.abs(config.hue) < epsilon &&
                Math.abs(config.saturation) < epsilon &&
                Math.abs(config.brightness) < epsilon &&
                Math.abs(config.contrast) < epsilon);
        };
        expect(isNoop(colorAdjustment(noopConfig))).toBe(true);
        expect(isNoop(colorAdjustment({ hue: 10 }))).toBe(false);
    });
});
//# sourceMappingURL=color-adjustment-effect.test.js.map