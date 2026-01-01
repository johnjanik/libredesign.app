/**
 * Blend Mode Mapping
 *
 * Maps DesignLibre blend modes to WebGL blend factors and determines
 * which blend modes require shader-based blending.
 */
import type { BlendMode } from '@core/types/common';
/**
 * WebGL blend factor pair
 */
export interface BlendFactors {
    readonly srcRGB: number;
    readonly dstRGB: number;
    readonly srcAlpha: number;
    readonly dstAlpha: number;
}
/**
 * Blend mode implementation type
 */
export type BlendModeType = 'gl' | 'shader';
/**
 * Blend mode configuration
 */
export interface BlendModeConfig {
    readonly type: BlendModeType;
    readonly factors?: BlendFactors;
    readonly shaderFunction?: string;
}
/**
 * Get blend factors for standard GL blend modes.
 * Returns null for blend modes that require shader-based blending.
 */
export declare function getBlendFactors(gl: WebGL2RenderingContext, mode: BlendMode): BlendFactors | null;
/**
 * Check if a blend mode requires shader-based blending.
 */
export declare function requiresShaderBlend(mode: BlendMode): boolean;
/**
 * Get the GLSL blend function for a given blend mode.
 * Used for shader-based blending.
 */
export declare function getBlendModeGLSL(mode: BlendMode): string;
/**
 * HSL conversion functions for use with color blend modes.
 */
export declare const HSL_CONVERSION_GLSL = "\nvec3 rgbToHsl(vec3 rgb) {\n  float maxC = max(max(rgb.r, rgb.g), rgb.b);\n  float minC = min(min(rgb.r, rgb.g), rgb.b);\n  float l = (maxC + minC) / 2.0;\n\n  if (maxC == minC) {\n    return vec3(0.0, 0.0, l);\n  }\n\n  float d = maxC - minC;\n  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);\n\n  float h;\n  if (maxC == rgb.r) {\n    h = (rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6.0 : 0.0);\n  } else if (maxC == rgb.g) {\n    h = (rgb.b - rgb.r) / d + 2.0;\n  } else {\n    h = (rgb.r - rgb.g) / d + 4.0;\n  }\n  h /= 6.0;\n\n  return vec3(h, s, l);\n}\n\nfloat hueToRgb(float p, float q, float t) {\n  if (t < 0.0) t += 1.0;\n  if (t > 1.0) t -= 1.0;\n  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;\n  if (t < 1.0/2.0) return q;\n  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;\n  return p;\n}\n\nvec3 hslToRgb(vec3 hsl) {\n  if (hsl.y == 0.0) {\n    return vec3(hsl.z);\n  }\n\n  float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;\n  float p = 2.0 * hsl.z - q;\n\n  return vec3(\n    hueToRgb(p, q, hsl.x + 1.0/3.0),\n    hueToRgb(p, q, hsl.x),\n    hueToRgb(p, q, hsl.x - 1.0/3.0)\n  );\n}\n";
/**
 * Apply blend factors to WebGL context.
 */
export declare function applyBlendFactors(gl: WebGL2RenderingContext, factors: BlendFactors): void;
/**
 * Set up standard alpha blending.
 */
export declare function setNormalBlending(gl: WebGL2RenderingContext): void;
//# sourceMappingURL=blend-mode-map.d.ts.map