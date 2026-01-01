/**
 * Blend mode map tests
 */
import { describe, it, expect, vi } from 'vitest';
import { getBlendFactors, requiresShaderBlend, getBlendModeGLSL, applyBlendFactors, setNormalBlending, HSL_CONVERSION_GLSL, } from '@renderer/blending/blend-mode-map';
// Mock WebGL constants
const GL = {
    ZERO: 0,
    ONE: 1,
    SRC_COLOR: 0x0300,
    ONE_MINUS_SRC_COLOR: 0x0301,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    DST_ALPHA: 0x0304,
    ONE_MINUS_DST_ALPHA: 0x0305,
    DST_COLOR: 0x0306,
    ONE_MINUS_DST_COLOR: 0x0307,
};
// Create mock WebGL2RenderingContext
const createMockGL = () => ({
    ...GL,
    blendFunc: vi.fn(),
    blendFuncSeparate: vi.fn(),
});
describe('getBlendFactors', () => {
    let gl;
    beforeEach(() => {
        gl = createMockGL();
    });
    describe('GL-based blend modes', () => {
        it('returns factors for PASS_THROUGH', () => {
            const factors = getBlendFactors(gl, 'PASS_THROUGH');
            expect(factors).not.toBeNull();
            expect(factors?.srcRGB).toBe(GL.ONE);
            expect(factors?.dstRGB).toBe(GL.ONE_MINUS_SRC_ALPHA);
            expect(factors?.srcAlpha).toBe(GL.ONE);
            expect(factors?.dstAlpha).toBe(GL.ONE_MINUS_SRC_ALPHA);
        });
        it('returns factors for NORMAL', () => {
            const factors = getBlendFactors(gl, 'NORMAL');
            expect(factors).not.toBeNull();
            expect(factors?.srcRGB).toBe(GL.ONE);
            expect(factors?.dstRGB).toBe(GL.ONE_MINUS_SRC_ALPHA);
        });
        it('returns factors for MULTIPLY', () => {
            const factors = getBlendFactors(gl, 'MULTIPLY');
            expect(factors).not.toBeNull();
            expect(factors?.srcRGB).toBe(GL.DST_COLOR);
            expect(factors?.dstRGB).toBe(GL.ONE_MINUS_SRC_ALPHA);
        });
        it('returns factors for SCREEN', () => {
            const factors = getBlendFactors(gl, 'SCREEN');
            expect(factors).not.toBeNull();
            expect(factors?.srcRGB).toBe(GL.ONE);
            expect(factors?.dstRGB).toBe(GL.ONE_MINUS_SRC_COLOR);
        });
        it('returns factors for DARKEN', () => {
            const factors = getBlendFactors(gl, 'DARKEN');
            expect(factors).not.toBeNull();
            expect(factors?.srcRGB).toBe(GL.ONE);
            expect(factors?.dstRGB).toBe(GL.ONE_MINUS_SRC_ALPHA);
        });
        it('returns factors for LIGHTEN', () => {
            const factors = getBlendFactors(gl, 'LIGHTEN');
            expect(factors).not.toBeNull();
            expect(factors?.srcRGB).toBe(GL.ONE);
            expect(factors?.dstRGB).toBe(GL.ONE_MINUS_SRC_ALPHA);
        });
        it('returns default factors for unknown blend mode', () => {
            const factors = getBlendFactors(gl, 'UNKNOWN_MODE');
            expect(factors).not.toBeNull();
            expect(factors?.srcRGB).toBe(GL.ONE);
            expect(factors?.dstRGB).toBe(GL.ONE_MINUS_SRC_ALPHA);
        });
    });
    describe('shader-based blend modes', () => {
        const shaderModes = [
            'OVERLAY',
            'SOFT_LIGHT',
            'HARD_LIGHT',
            'COLOR_BURN',
            'COLOR_DODGE',
            'DIFFERENCE',
            'EXCLUSION',
            'HUE',
            'SATURATION',
            'COLOR',
            'LUMINOSITY',
        ];
        it.each(shaderModes)('returns null for %s', (mode) => {
            const factors = getBlendFactors(gl, mode);
            expect(factors).toBeNull();
        });
    });
    describe('premultiplied alpha', () => {
        it('uses premultiplied alpha factors for NORMAL', () => {
            const factors = getBlendFactors(gl, 'NORMAL');
            // Premultiplied alpha uses ONE for srcRGB instead of SRC_ALPHA
            expect(factors?.srcRGB).toBe(GL.ONE);
            expect(factors?.srcAlpha).toBe(GL.ONE);
        });
    });
});
describe('requiresShaderBlend', () => {
    describe('GL-based modes', () => {
        const glModes = [
            'PASS_THROUGH',
            'NORMAL',
            'DARKEN',
            'MULTIPLY',
            'LIGHTEN',
            'SCREEN',
        ];
        it.each(glModes)('returns false for %s', (mode) => {
            expect(requiresShaderBlend(mode)).toBe(false);
        });
    });
    describe('shader-based modes', () => {
        const shaderModes = [
            'OVERLAY',
            'SOFT_LIGHT',
            'HARD_LIGHT',
            'COLOR_BURN',
            'COLOR_DODGE',
            'DIFFERENCE',
            'EXCLUSION',
            'HUE',
            'SATURATION',
            'COLOR',
            'LUMINOSITY',
        ];
        it.each(shaderModes)('returns true for %s', (mode) => {
            expect(requiresShaderBlend(mode)).toBe(true);
        });
    });
    it('returns false for unknown mode', () => {
        expect(requiresShaderBlend('UNKNOWN')).toBe(false);
    });
});
describe('getBlendModeGLSL', () => {
    describe('OVERLAY', () => {
        it('returns valid GLSL function', () => {
            const glsl = getBlendModeGLSL('OVERLAY');
            expect(glsl).toContain('blendOverlay');
            expect(glsl).toContain('vec3 base');
            expect(glsl).toContain('vec3 blend');
            expect(glsl).toContain('0.5');
        });
        it('implements overlay formula correctly', () => {
            const glsl = getBlendModeGLSL('OVERLAY');
            // Overlay: if base < 0.5, 2*base*blend, else 1 - 2*(1-base)*(1-blend)
            expect(glsl).toContain('base.r < 0.5');
            expect(glsl).toContain('2.0 * base.r * blend.r');
        });
    });
    describe('SOFT_LIGHT', () => {
        it('returns valid GLSL function', () => {
            const glsl = getBlendModeGLSL('SOFT_LIGHT');
            expect(glsl).toContain('blendSoftLight');
            expect(glsl).toContain('sqrt');
        });
    });
    describe('HARD_LIGHT', () => {
        it('returns valid GLSL function', () => {
            const glsl = getBlendModeGLSL('HARD_LIGHT');
            expect(glsl).toContain('blendHardLight');
            expect(glsl).toContain('blend.r < 0.5');
        });
    });
    describe('COLOR_BURN', () => {
        it('returns valid GLSL function', () => {
            const glsl = getBlendModeGLSL('COLOR_BURN');
            expect(glsl).toContain('blendColorBurn');
            expect(glsl).toContain('blend.r == 0.0');
            expect(glsl).toContain('max');
        });
    });
    describe('COLOR_DODGE', () => {
        it('returns valid GLSL function', () => {
            const glsl = getBlendModeGLSL('COLOR_DODGE');
            expect(glsl).toContain('blendColorDodge');
            expect(glsl).toContain('blend.r == 1.0');
            expect(glsl).toContain('min');
        });
    });
    describe('DIFFERENCE', () => {
        it('returns valid GLSL function', () => {
            const glsl = getBlendModeGLSL('DIFFERENCE');
            expect(glsl).toContain('blendDifference');
            expect(glsl).toContain('abs(base - blend)');
        });
    });
    describe('EXCLUSION', () => {
        it('returns valid GLSL function', () => {
            const glsl = getBlendModeGLSL('EXCLUSION');
            expect(glsl).toContain('blendExclusion');
            expect(glsl).toContain('base + blend - 2.0 * base * blend');
        });
    });
    describe('HSL-based modes', () => {
        it('HUE uses HSL conversion', () => {
            const glsl = getBlendModeGLSL('HUE');
            expect(glsl).toContain('blendHue');
            expect(glsl).toContain('rgbToHsl');
            expect(glsl).toContain('hslToRgb');
        });
        it('SATURATION uses HSL conversion', () => {
            const glsl = getBlendModeGLSL('SATURATION');
            expect(glsl).toContain('blendSaturation');
            expect(glsl).toContain('blendHSL.y');
        });
        it('COLOR uses HSL conversion', () => {
            const glsl = getBlendModeGLSL('COLOR');
            expect(glsl).toContain('blendColor');
            expect(glsl).toContain('blendHSL.x');
            expect(glsl).toContain('blendHSL.y');
        });
        it('LUMINOSITY uses HSL conversion', () => {
            const glsl = getBlendModeGLSL('LUMINOSITY');
            expect(glsl).toContain('blendLuminosity');
            expect(glsl).toContain('blendHSL.z');
        });
    });
    describe('default mode', () => {
        it('returns normal blend function for unknown mode', () => {
            const glsl = getBlendModeGLSL('UNKNOWN');
            expect(glsl).toContain('blendNormal');
            expect(glsl).toContain('return blend');
        });
        it('returns normal blend function for NORMAL', () => {
            const glsl = getBlendModeGLSL('NORMAL');
            expect(glsl).toContain('blendNormal');
        });
    });
});
describe('HSL_CONVERSION_GLSL', () => {
    it('contains rgbToHsl function', () => {
        expect(HSL_CONVERSION_GLSL).toContain('vec3 rgbToHsl');
        expect(HSL_CONVERSION_GLSL).toContain('float maxC');
        expect(HSL_CONVERSION_GLSL).toContain('float minC');
    });
    it('contains hslToRgb function', () => {
        expect(HSL_CONVERSION_GLSL).toContain('vec3 hslToRgb');
        expect(HSL_CONVERSION_GLSL).toContain('hueToRgb');
    });
    it('contains hueToRgb helper', () => {
        expect(HSL_CONVERSION_GLSL).toContain('float hueToRgb');
        expect(HSL_CONVERSION_GLSL).toContain('1.0/6.0');
        expect(HSL_CONVERSION_GLSL).toContain('2.0/3.0');
    });
    it('handles achromatic colors', () => {
        // When saturation is 0, should return grayscale
        expect(HSL_CONVERSION_GLSL).toContain('hsl.y == 0.0');
        expect(HSL_CONVERSION_GLSL).toContain('return vec3(hsl.z)');
    });
    it('handles hue wrapping', () => {
        // Hue values should wrap around
        expect(HSL_CONVERSION_GLSL).toContain('t < 0.0');
        expect(HSL_CONVERSION_GLSL).toContain('t += 1.0');
        expect(HSL_CONVERSION_GLSL).toContain('t > 1.0');
        expect(HSL_CONVERSION_GLSL).toContain('t -= 1.0');
    });
});
describe('applyBlendFactors', () => {
    let gl;
    beforeEach(() => {
        gl = createMockGL();
    });
    it('calls blendFuncSeparate with correct factors', () => {
        const factors = {
            srcRGB: GL.ONE,
            dstRGB: GL.ONE_MINUS_SRC_ALPHA,
            srcAlpha: GL.ONE,
            dstAlpha: GL.ONE_MINUS_SRC_ALPHA,
        };
        applyBlendFactors(gl, factors);
        expect(gl.blendFuncSeparate).toHaveBeenCalledWith(GL.ONE, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
    });
    it('handles different RGB and alpha factors', () => {
        const factors = {
            srcRGB: GL.DST_COLOR,
            dstRGB: GL.ZERO,
            srcAlpha: GL.ONE,
            dstAlpha: GL.ONE_MINUS_SRC_ALPHA,
        };
        applyBlendFactors(gl, factors);
        expect(gl.blendFuncSeparate).toHaveBeenCalledWith(GL.DST_COLOR, GL.ZERO, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
    });
});
describe('setNormalBlending', () => {
    let gl;
    beforeEach(() => {
        gl = createMockGL();
    });
    it('sets standard premultiplied alpha blending', () => {
        setNormalBlending(gl);
        expect(gl.blendFunc).toHaveBeenCalledWith(GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
    });
});
describe('blend mode consistency', () => {
    let gl;
    beforeEach(() => {
        gl = createMockGL();
    });
    it('getBlendFactors and requiresShaderBlend are consistent', () => {
        const allModes = [
            'PASS_THROUGH',
            'NORMAL',
            'DARKEN',
            'MULTIPLY',
            'LIGHTEN',
            'SCREEN',
            'COLOR_BURN',
            'COLOR_DODGE',
            'OVERLAY',
            'SOFT_LIGHT',
            'HARD_LIGHT',
            'DIFFERENCE',
            'EXCLUSION',
            'HUE',
            'SATURATION',
            'COLOR',
            'LUMINOSITY',
        ];
        for (const mode of allModes) {
            const factors = getBlendFactors(gl, mode);
            const needsShader = requiresShaderBlend(mode);
            if (needsShader) {
                expect(factors).toBeNull();
            }
            else {
                expect(factors).not.toBeNull();
            }
        }
    });
    it('shader modes always return GLSL code', () => {
        const shaderModes = [
            'OVERLAY',
            'SOFT_LIGHT',
            'HARD_LIGHT',
            'COLOR_BURN',
            'COLOR_DODGE',
            'DIFFERENCE',
            'EXCLUSION',
            'HUE',
            'SATURATION',
            'COLOR',
            'LUMINOSITY',
        ];
        for (const mode of shaderModes) {
            const glsl = getBlendModeGLSL(mode);
            expect(glsl).toBeTruthy();
            expect(glsl.length).toBeGreaterThan(10);
            expect(glsl).toContain('vec3');
        }
    });
});
describe('GLSL syntax validation', () => {
    const shaderModes = [
        'OVERLAY',
        'SOFT_LIGHT',
        'HARD_LIGHT',
        'COLOR_BURN',
        'COLOR_DODGE',
        'DIFFERENCE',
        'EXCLUSION',
        'HUE',
        'SATURATION',
        'COLOR',
        'LUMINOSITY',
    ];
    it.each(shaderModes)('%s GLSL has balanced braces', (mode) => {
        const glsl = getBlendModeGLSL(mode);
        const openBraces = (glsl.match(/{/g) || []).length;
        const closeBraces = (glsl.match(/}/g) || []).length;
        expect(openBraces).toBe(closeBraces);
    });
    it.each(shaderModes)('%s GLSL has balanced parentheses', (mode) => {
        const glsl = getBlendModeGLSL(mode);
        const openParens = (glsl.match(/\(/g) || []).length;
        const closeParens = (glsl.match(/\)/g) || []).length;
        expect(openParens).toBe(closeParens);
    });
    it.each(shaderModes)('%s GLSL returns vec3', (mode) => {
        const glsl = getBlendModeGLSL(mode);
        // Should return vec3, abs(), base, blend, or hslToRgb()
        expect(glsl).toMatch(/return\s+(vec3|abs|base|blend|hslToRgb)/);
    });
    it('HSL conversion GLSL has balanced braces', () => {
        const openBraces = (HSL_CONVERSION_GLSL.match(/{/g) || []).length;
        const closeBraces = (HSL_CONVERSION_GLSL.match(/}/g) || []).length;
        expect(openBraces).toBe(closeBraces);
    });
    it('HSL conversion GLSL has balanced parentheses', () => {
        const openParens = (HSL_CONVERSION_GLSL.match(/\(/g) || []).length;
        const closeParens = (HSL_CONVERSION_GLSL.match(/\)/g) || []).length;
        expect(openParens).toBe(closeParens);
    });
});
describe('blend factor values', () => {
    let gl;
    beforeEach(() => {
        gl = createMockGL();
    });
    it('MULTIPLY uses DST_COLOR for darkening effect', () => {
        const factors = getBlendFactors(gl, 'MULTIPLY');
        // Multiply should use destination color as source factor
        expect(factors?.srcRGB).toBe(GL.DST_COLOR);
    });
    it('SCREEN uses ONE_MINUS_SRC_COLOR for lightening effect', () => {
        const factors = getBlendFactors(gl, 'SCREEN');
        // Screen: dst + src - dst*src = dst + src*(1-dst)
        expect(factors?.dstRGB).toBe(GL.ONE_MINUS_SRC_COLOR);
    });
    it('all GL modes preserve alpha correctly', () => {
        const glModes = [
            'PASS_THROUGH',
            'NORMAL',
            'DARKEN',
            'MULTIPLY',
            'LIGHTEN',
            'SCREEN',
        ];
        for (const mode of glModes) {
            const factors = getBlendFactors(gl, mode);
            expect(factors?.srcAlpha).toBe(GL.ONE);
            expect(factors?.dstAlpha).toBe(GL.ONE_MINUS_SRC_ALPHA);
        }
    });
});
//# sourceMappingURL=blend-mode-map.test.js.map