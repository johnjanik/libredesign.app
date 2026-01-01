/**
 * Blending module exports
 */

export {
  getBlendFactors,
  requiresShaderBlend,
  getBlendModeGLSL,
  applyBlendFactors,
  setNormalBlending,
  HSL_CONVERSION_GLSL,
} from './blend-mode-map';

export type { BlendFactors, BlendModeType, BlendModeConfig } from './blend-mode-map';
