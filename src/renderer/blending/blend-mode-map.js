/**
 * Blend Mode Mapping
 *
 * Maps DesignLibre blend modes to WebGL blend factors and determines
 * which blend modes require shader-based blending.
 */
/**
 * Get blend factors for standard GL blend modes.
 * Returns null for blend modes that require shader-based blending.
 */
export function getBlendFactors(gl, mode) {
    switch (mode) {
        case 'PASS_THROUGH':
        case 'NORMAL':
            // Standard alpha blending (premultiplied)
            return {
                srcRGB: gl.ONE,
                dstRGB: gl.ONE_MINUS_SRC_ALPHA,
                srcAlpha: gl.ONE,
                dstAlpha: gl.ONE_MINUS_SRC_ALPHA,
            };
        case 'MULTIPLY':
            // Multiply: dst * src
            return {
                srcRGB: gl.DST_COLOR,
                dstRGB: gl.ONE_MINUS_SRC_ALPHA,
                srcAlpha: gl.ONE,
                dstAlpha: gl.ONE_MINUS_SRC_ALPHA,
            };
        case 'SCREEN':
            // Screen: 1 - (1-dst)(1-src) = dst + src - dst*src
            return {
                srcRGB: gl.ONE,
                dstRGB: gl.ONE_MINUS_SRC_COLOR,
                srcAlpha: gl.ONE,
                dstAlpha: gl.ONE_MINUS_SRC_ALPHA,
            };
        case 'DARKEN':
            // Darken: min(src, dst) - approximated with GL
            return {
                srcRGB: gl.ONE,
                dstRGB: gl.ONE_MINUS_SRC_ALPHA,
                srcAlpha: gl.ONE,
                dstAlpha: gl.ONE_MINUS_SRC_ALPHA,
            };
        case 'LIGHTEN':
            // Lighten: max(src, dst) - approximated with GL
            return {
                srcRGB: gl.ONE,
                dstRGB: gl.ONE_MINUS_SRC_ALPHA,
                srcAlpha: gl.ONE,
                dstAlpha: gl.ONE_MINUS_SRC_ALPHA,
            };
        // These blend modes require shader-based blending
        case 'OVERLAY':
        case 'SOFT_LIGHT':
        case 'HARD_LIGHT':
        case 'COLOR_BURN':
        case 'COLOR_DODGE':
        case 'DIFFERENCE':
        case 'EXCLUSION':
        case 'HUE':
        case 'SATURATION':
        case 'COLOR':
        case 'LUMINOSITY':
            return null;
        default:
            // Default to normal blending
            return {
                srcRGB: gl.ONE,
                dstRGB: gl.ONE_MINUS_SRC_ALPHA,
                srcAlpha: gl.ONE,
                dstAlpha: gl.ONE_MINUS_SRC_ALPHA,
            };
    }
}
/**
 * Check if a blend mode requires shader-based blending.
 */
export function requiresShaderBlend(mode) {
    switch (mode) {
        case 'OVERLAY':
        case 'SOFT_LIGHT':
        case 'HARD_LIGHT':
        case 'COLOR_BURN':
        case 'COLOR_DODGE':
        case 'DIFFERENCE':
        case 'EXCLUSION':
        case 'HUE':
        case 'SATURATION':
        case 'COLOR':
        case 'LUMINOSITY':
            return true;
        default:
            return false;
    }
}
/**
 * Get the GLSL blend function for a given blend mode.
 * Used for shader-based blending.
 */
export function getBlendModeGLSL(mode) {
    switch (mode) {
        case 'OVERLAY':
            return `
vec3 blendOverlay(vec3 base, vec3 blend) {
  return vec3(
    base.r < 0.5 ? (2.0 * base.r * blend.r) : (1.0 - 2.0 * (1.0 - base.r) * (1.0 - blend.r)),
    base.g < 0.5 ? (2.0 * base.g * blend.g) : (1.0 - 2.0 * (1.0 - base.g) * (1.0 - blend.g)),
    base.b < 0.5 ? (2.0 * base.b * blend.b) : (1.0 - 2.0 * (1.0 - base.b) * (1.0 - blend.b))
  );
}`;
        case 'SOFT_LIGHT':
            return `
vec3 blendSoftLight(vec3 base, vec3 blend) {
  return vec3(
    blend.r < 0.5 ? (2.0 * base.r * blend.r + base.r * base.r * (1.0 - 2.0 * blend.r)) : (sqrt(base.r) * (2.0 * blend.r - 1.0) + 2.0 * base.r * (1.0 - blend.r)),
    blend.g < 0.5 ? (2.0 * base.g * blend.g + base.g * base.g * (1.0 - 2.0 * blend.g)) : (sqrt(base.g) * (2.0 * blend.g - 1.0) + 2.0 * base.g * (1.0 - blend.g)),
    blend.b < 0.5 ? (2.0 * base.b * blend.b + base.b * base.b * (1.0 - 2.0 * blend.b)) : (sqrt(base.b) * (2.0 * blend.b - 1.0) + 2.0 * base.b * (1.0 - blend.b))
  );
}`;
        case 'HARD_LIGHT':
            return `
vec3 blendHardLight(vec3 base, vec3 blend) {
  return vec3(
    blend.r < 0.5 ? (2.0 * base.r * blend.r) : (1.0 - 2.0 * (1.0 - base.r) * (1.0 - blend.r)),
    blend.g < 0.5 ? (2.0 * base.g * blend.g) : (1.0 - 2.0 * (1.0 - base.g) * (1.0 - blend.g)),
    blend.b < 0.5 ? (2.0 * base.b * blend.b) : (1.0 - 2.0 * (1.0 - base.b) * (1.0 - blend.b))
  );
}`;
        case 'COLOR_BURN':
            return `
vec3 blendColorBurn(vec3 base, vec3 blend) {
  return vec3(
    blend.r == 0.0 ? 0.0 : max(1.0 - (1.0 - base.r) / blend.r, 0.0),
    blend.g == 0.0 ? 0.0 : max(1.0 - (1.0 - base.g) / blend.g, 0.0),
    blend.b == 0.0 ? 0.0 : max(1.0 - (1.0 - base.b) / blend.b, 0.0)
  );
}`;
        case 'COLOR_DODGE':
            return `
vec3 blendColorDodge(vec3 base, vec3 blend) {
  return vec3(
    blend.r == 1.0 ? 1.0 : min(base.r / (1.0 - blend.r), 1.0),
    blend.g == 1.0 ? 1.0 : min(base.g / (1.0 - blend.g), 1.0),
    blend.b == 1.0 ? 1.0 : min(base.b / (1.0 - blend.b), 1.0)
  );
}`;
        case 'DIFFERENCE':
            return `
vec3 blendDifference(vec3 base, vec3 blend) {
  return abs(base - blend);
}`;
        case 'EXCLUSION':
            return `
vec3 blendExclusion(vec3 base, vec3 blend) {
  return base + blend - 2.0 * base * blend;
}`;
        case 'HUE':
            return `
vec3 blendHue(vec3 base, vec3 blend) {
  vec3 baseHSL = rgbToHsl(base);
  vec3 blendHSL = rgbToHsl(blend);
  return hslToRgb(vec3(blendHSL.x, baseHSL.y, baseHSL.z));
}`;
        case 'SATURATION':
            return `
vec3 blendSaturation(vec3 base, vec3 blend) {
  vec3 baseHSL = rgbToHsl(base);
  vec3 blendHSL = rgbToHsl(blend);
  return hslToRgb(vec3(baseHSL.x, blendHSL.y, baseHSL.z));
}`;
        case 'COLOR':
            return `
vec3 blendColor(vec3 base, vec3 blend) {
  vec3 baseHSL = rgbToHsl(base);
  vec3 blendHSL = rgbToHsl(blend);
  return hslToRgb(vec3(blendHSL.x, blendHSL.y, baseHSL.z));
}`;
        case 'LUMINOSITY':
            return `
vec3 blendLuminosity(vec3 base, vec3 blend) {
  vec3 baseHSL = rgbToHsl(base);
  vec3 blendHSL = rgbToHsl(blend);
  return hslToRgb(vec3(baseHSL.x, baseHSL.y, blendHSL.z));
}`;
        default:
            return `
vec3 blendNormal(vec3 base, vec3 blend) {
  return blend;
}`;
    }
}
/**
 * HSL conversion functions for use with color blend modes.
 */
export const HSL_CONVERSION_GLSL = `
vec3 rgbToHsl(vec3 rgb) {
  float maxC = max(max(rgb.r, rgb.g), rgb.b);
  float minC = min(min(rgb.r, rgb.g), rgb.b);
  float l = (maxC + minC) / 2.0;

  if (maxC == minC) {
    return vec3(0.0, 0.0, l);
  }

  float d = maxC - minC;
  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

  float h;
  if (maxC == rgb.r) {
    h = (rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6.0 : 0.0);
  } else if (maxC == rgb.g) {
    h = (rgb.b - rgb.r) / d + 2.0;
  } else {
    h = (rgb.r - rgb.g) / d + 4.0;
  }
  h /= 6.0;

  return vec3(h, s, l);
}

float hueToRgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hslToRgb(vec3 hsl) {
  if (hsl.y == 0.0) {
    return vec3(hsl.z);
  }

  float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
  float p = 2.0 * hsl.z - q;

  return vec3(
    hueToRgb(p, q, hsl.x + 1.0/3.0),
    hueToRgb(p, q, hsl.x),
    hueToRgb(p, q, hsl.x - 1.0/3.0)
  );
}
`;
/**
 * Apply blend factors to WebGL context.
 */
export function applyBlendFactors(gl, factors) {
    gl.blendFuncSeparate(factors.srcRGB, factors.dstRGB, factors.srcAlpha, factors.dstAlpha);
}
/**
 * Set up standard alpha blending.
 */
export function setNormalBlending(gl) {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
}
//# sourceMappingURL=blend-mode-map.js.map