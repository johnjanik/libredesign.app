/**
 * Shader Manager
 *
 * Compiles, links, and manages WebGL shaders and programs.
 */

import type { WebGLContext } from '../core/webgl-context';
import {
  GRADIENT_VERTEX_SHADER,
  LINEAR_GRADIENT_FRAGMENT_SHADER,
  RADIAL_GRADIENT_FRAGMENT_SHADER,
  ANGULAR_GRADIENT_FRAGMENT_SHADER,
  DIAMOND_GRADIENT_FRAGMENT_SHADER,
} from './gradient.glsl';
import {
  COLOR_ADJUSTMENT_VERTEX_SHADER,
  COLOR_ADJUSTMENT_FRAGMENT_SHADER,
} from './color-adjustment.glsl';
import {
  NOISE_VERTEX_SHADER,
  NOISE_FRAGMENT_SHADER,
} from './noise.glsl';
import {
  MOTION_BLUR_VERTEX_SHADER,
  MOTION_BLUR_FRAGMENT_SHADER,
  MOTION_BLUR_HQ_FRAGMENT_SHADER,
} from './motion-blur.glsl';

/**
 * Shader program with uniform locations
 */
export interface ShaderProgram {
  readonly program: WebGLProgram;
  readonly uniforms: Map<string, WebGLUniformLocation>;
  readonly attributes: Map<string, number>;
}

/**
 * Shader source definition
 */
export interface ShaderSource {
  readonly vertex: string;
  readonly fragment: string;
  readonly uniforms?: readonly string[];
  readonly attributes?: readonly string[];
}

/**
 * Built-in shader names
 */
export type BuiltInShader =
  | 'fill'
  | 'stroke'
  | 'text-sdf'
  | 'image'
  | 'blur'
  | 'composite'
  | 'shadow'
  | 'innerShadow'
  | 'innerShadowComposite'
  | 'linearGradient'
  | 'radialGradient'
  | 'angularGradient'
  | 'diamondGradient'
  | 'colorAdjustment'
  | 'noise'
  | 'motionBlur'
  | 'motionBlurHQ'
  | 'transparencyGrid';

/**
 * Shader Manager - compiles and manages shader programs
 */
export class ShaderManager {
  private ctx: WebGLContext;
  private programs: Map<string, ShaderProgram> = new Map();
  private shaderSources: Map<string, ShaderSource> = new Map();

  constructor(ctx: WebGLContext) {
    this.ctx = ctx;
    this.registerBuiltInShaders();
  }

  // =========================================================================
  // Shader Registration
  // =========================================================================

  /**
   * Register a shader source.
   */
  registerShader(name: string, source: ShaderSource): void {
    this.shaderSources.set(name, source);
  }

  /**
   * Register built-in shaders.
   */
  private registerBuiltInShaders(): void {
    // Fill shader - solid color and gradient fills
    this.registerShader('fill', {
      vertex: FILL_VERTEX_SHADER,
      fragment: FILL_FRAGMENT_SHADER,
      uniforms: ['uViewProjection', 'uTransform', 'uColor', 'uOpacity'],
      attributes: ['aPosition'],
    });

    // Stroke shader - for strokes
    this.registerShader('stroke', {
      vertex: STROKE_VERTEX_SHADER,
      fragment: STROKE_FRAGMENT_SHADER,
      uniforms: ['uViewProjection', 'uTransform', 'uColor', 'uOpacity', 'uStrokeWidth'],
      attributes: ['aPosition', 'aNormal'],
    });

    // Text SDF shader
    this.registerShader('text-sdf', {
      vertex: TEXT_SDF_VERTEX_SHADER,
      fragment: TEXT_SDF_FRAGMENT_SHADER,
      uniforms: ['uViewProjection', 'uTransform', 'uColor', 'uOpacity', 'uAtlas', 'uSDFParams'],
      attributes: ['aPosition', 'aTexCoord'],
    });

    // Image shader
    this.registerShader('image', {
      vertex: IMAGE_VERTEX_SHADER,
      fragment: IMAGE_FRAGMENT_SHADER,
      uniforms: ['uViewProjection', 'uTransform', 'uOpacity', 'uTexture', 'uTiling'],
      attributes: ['aPosition', 'aTexCoord'],
    });

    // Blur shader (Gaussian, separable)
    this.registerShader('blur', {
      vertex: EFFECT_VERTEX_SHADER,
      fragment: BLUR_FRAGMENT_SHADER,
      uniforms: ['uTexture', 'uDirection', 'uRadius'],
      attributes: ['aPosition', 'aTexCoord'],
    });

    // Composite shader (simple texture blit)
    this.registerShader('composite', {
      vertex: EFFECT_VERTEX_SHADER,
      fragment: COMPOSITE_FRAGMENT_SHADER,
      uniforms: ['uTexture', 'uDestRect'],
      attributes: ['aPosition', 'aTexCoord'],
    });

    // Shadow shader (offset and colorize)
    this.registerShader('shadow', {
      vertex: EFFECT_VERTEX_SHADER,
      fragment: SHADOW_FRAGMENT_SHADER,
      uniforms: ['uTexture', 'uOffset', 'uColor', 'uSpread'],
      attributes: ['aPosition', 'aTexCoord'],
    });

    // Inner shadow shader
    this.registerShader('innerShadow', {
      vertex: EFFECT_VERTEX_SHADER,
      fragment: INNER_SHADOW_FRAGMENT_SHADER,
      uniforms: ['uTexture', 'uOffset', 'uColor', 'uSpread'],
      attributes: ['aPosition', 'aTexCoord'],
    });

    // Inner shadow composite shader
    this.registerShader('innerShadowComposite', {
      vertex: EFFECT_VERTEX_SHADER,
      fragment: INNER_SHADOW_COMPOSITE_FRAGMENT_SHADER,
      uniforms: ['uSource', 'uShadow'],
      attributes: ['aPosition', 'aTexCoord'],
    });

    // Gradient shaders
    const gradientUniforms = [
      'uViewProjection',
      'uTransform',
      'uGradientTransform',
      'uOpacity',
      'uStopCount',
      'uStopColors',
      'uStopPositions',
    ];

    this.registerShader('linearGradient', {
      vertex: GRADIENT_VERTEX_SHADER,
      fragment: LINEAR_GRADIENT_FRAGMENT_SHADER,
      uniforms: [...gradientUniforms, 'uGradientStart', 'uGradientEnd'],
      attributes: ['aPosition'],
    });

    this.registerShader('radialGradient', {
      vertex: GRADIENT_VERTEX_SHADER,
      fragment: RADIAL_GRADIENT_FRAGMENT_SHADER,
      uniforms: [...gradientUniforms, 'uGradientCenter', 'uGradientRadius', 'uGradientFocus'],
      attributes: ['aPosition'],
    });

    this.registerShader('angularGradient', {
      vertex: GRADIENT_VERTEX_SHADER,
      fragment: ANGULAR_GRADIENT_FRAGMENT_SHADER,
      uniforms: [...gradientUniforms, 'uGradientCenter', 'uStartAngle'],
      attributes: ['aPosition'],
    });

    this.registerShader('diamondGradient', {
      vertex: GRADIENT_VERTEX_SHADER,
      fragment: DIAMOND_GRADIENT_FRAGMENT_SHADER,
      uniforms: [...gradientUniforms, 'uGradientCenter', 'uGradientRadius'],
      attributes: ['aPosition'],
    });

    // Color adjustment shader
    this.registerShader('colorAdjustment', {
      vertex: COLOR_ADJUSTMENT_VERTEX_SHADER,
      fragment: COLOR_ADJUSTMENT_FRAGMENT_SHADER,
      uniforms: ['uTexture', 'uHue', 'uSaturation', 'uBrightness', 'uContrast'],
      attributes: ['aPosition', 'aTexCoord'],
    });

    // Noise/grain shader
    this.registerShader('noise', {
      vertex: NOISE_VERTEX_SHADER,
      fragment: NOISE_FRAGMENT_SHADER,
      uniforms: ['uTexture', 'uAmount', 'uSize', 'uMonochrome', 'uTime', 'uResolution'],
      attributes: ['aPosition', 'aTexCoord'],
    });

    // Motion blur shaders
    this.registerShader('motionBlur', {
      vertex: MOTION_BLUR_VERTEX_SHADER,
      fragment: MOTION_BLUR_FRAGMENT_SHADER,
      uniforms: ['uTexture', 'uAngle', 'uDistance', 'uResolution'],
      attributes: ['aPosition', 'aTexCoord'],
    });

    this.registerShader('motionBlurHQ', {
      vertex: MOTION_BLUR_VERTEX_SHADER,
      fragment: MOTION_BLUR_HQ_FRAGMENT_SHADER,
      uniforms: ['uTexture', 'uAngle', 'uDistance', 'uResolution'],
      attributes: ['aPosition', 'aTexCoord'],
    });

    // Transparency grid shader (checkerboard pattern)
    this.registerShader('transparencyGrid', {
      vertex: TRANSPARENCY_GRID_VERTEX_SHADER,
      fragment: TRANSPARENCY_GRID_FRAGMENT_SHADER,
      uniforms: ['uViewProjection', 'uGridSize', 'uColor1', 'uColor2'],
      attributes: ['aPosition'],
    });
  }

  // =========================================================================
  // Program Compilation
  // =========================================================================

  /**
   * Get or compile a shader program.
   */
  getProgram(name: string): ShaderProgram {
    // Return cached program
    const existing = this.programs.get(name);
    if (existing) {
      return existing;
    }

    // Get source
    const source = this.shaderSources.get(name);
    if (!source) {
      throw new Error(`Unknown shader: ${name}`);
    }

    // Compile program
    const program = this.compileProgram(source);
    this.programs.set(name, program);

    return program;
  }

  /**
   * Compile a shader program.
   */
  private compileProgram(source: ShaderSource): ShaderProgram {
    const gl = this.ctx.gl;

    // Compile shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, source.vertex);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, source.fragment);

    // Link program
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(`Failed to link program: ${error}`);
    }

    // Clean up shaders (they're now part of the program)
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    // Get uniform locations
    const uniforms = new Map<string, WebGLUniformLocation>();
    if (source.uniforms) {
      for (const name of source.uniforms) {
        const location = gl.getUniformLocation(program, name);
        if (location) {
          uniforms.set(name, location);
        }
      }
    }

    // Get attribute locations
    const attributes = new Map<string, number>();
    if (source.attributes) {
      for (const name of source.attributes) {
        const location = gl.getAttribLocation(program, name);
        if (location >= 0) {
          attributes.set(name, location);
        }
      }
    }

    return { program, uniforms, attributes };
  }

  /**
   * Compile a single shader.
   */
  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.ctx.gl;

    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Failed to compile shader: ${error}`);
    }

    return shader;
  }

  // =========================================================================
  // Program Usage
  // =========================================================================

  /**
   * Use a shader program.
   */
  use(name: string): ShaderProgram {
    const program = this.getProgram(name);
    this.ctx.useProgram(program.program);
    return program;
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /**
   * Check if a shader is registered.
   */
  hasShader(name: string): boolean {
    return this.shaderSources.has(name);
  }

  /**
   * Dispose of all programs.
   */
  dispose(): void {
    const gl = this.ctx.gl;
    for (const program of this.programs.values()) {
      gl.deleteProgram(program.program);
    }
    this.programs.clear();
  }
}

/**
 * Create a shader manager.
 */
export function createShaderManager(ctx: WebGLContext): ShaderManager {
  return new ShaderManager(ctx);
}

// ============================================================================
// Built-in Shaders
// ============================================================================

const FILL_VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat3 uViewProjection;
uniform mat3 uTransform;

in vec2 aPosition;

void main() {
  vec3 pos = uViewProjection * uTransform * vec3(aPosition, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
}
`;

const FILL_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec4 uColor;
uniform float uOpacity;

out vec4 fragColor;

void main() {
  fragColor = uColor * uOpacity;
}
`;

const STROKE_VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat3 uViewProjection;
uniform mat3 uTransform;
uniform float uStrokeWidth;

in vec2 aPosition;
in vec2 aNormal;

void main() {
  vec2 worldPos = (uTransform * vec3(aPosition, 1.0)).xy;
  vec2 worldNormal = normalize(mat2(uTransform) * aNormal);
  vec2 offset = worldNormal * uStrokeWidth * 0.5;
  vec3 pos = uViewProjection * vec3(worldPos + offset, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
}
`;

const STROKE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec4 uColor;
uniform float uOpacity;

out vec4 fragColor;

void main() {
  fragColor = uColor * uOpacity;
}
`;

const TEXT_SDF_VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat3 uViewProjection;
uniform mat3 uTransform;

in vec2 aPosition;
in vec2 aTexCoord;

out vec2 vTexCoord;

void main() {
  vec3 pos = uViewProjection * uTransform * vec3(aPosition, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
  vTexCoord = aTexCoord;
}
`;

const TEXT_SDF_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uAtlas;
uniform vec4 uColor;
uniform float uOpacity;
uniform vec2 uSDFParams; // x = buffer, y = gamma

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  float dist = texture(uAtlas, vTexCoord).r;
  float buffer = uSDFParams.x;
  float gamma = uSDFParams.y;
  float alpha = smoothstep(buffer - gamma, buffer + gamma, dist);
  fragColor = uColor * (alpha * uOpacity);
}
`;

const IMAGE_VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat3 uViewProjection;
uniform mat3 uTransform;

in vec2 aPosition;
in vec2 aTexCoord;

out vec2 vTexCoord;

void main() {
  // Transform position
  vec3 worldPos = uTransform * vec3(aPosition, 1.0);
  vec3 clipPos = uViewProjection * worldPos;
  gl_Position = vec4(clipPos.xy, 0.0, 1.0);

  // Pass texture coordinates
  vTexCoord = aTexCoord;
}
`;

const IMAGE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform float uOpacity;
uniform int uTiling;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  vec2 uv = vTexCoord;

  // Handle tiling mode - wrap coordinates
  if (uTiling == 1) {
    uv = fract(uv);
  } else {
    // Clamp to edge for non-tiling
    uv = clamp(uv, 0.0, 1.0);
  }

  vec4 color = texture(uTexture, uv);
  fragColor = color * uOpacity;
}
`;

// ============================================================================
// Effect Shaders
// ============================================================================

const EFFECT_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 aPosition;
in vec2 aTexCoord;

out vec2 vTexCoord;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vTexCoord = aTexCoord;
}
`;

const BLUR_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uDirection;  // (1/width, 0) or (0, 1/height)
uniform float uRadius;

in vec2 vTexCoord;
out vec4 fragColor;

// 9-tap Gaussian kernel weights
const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
  vec4 result = texture(uTexture, vTexCoord) * weights[0];

  for (int i = 1; i < 5; i++) {
    vec2 offset = uDirection * float(i) * uRadius;
    result += texture(uTexture, vTexCoord + offset) * weights[i];
    result += texture(uTexture, vTexCoord - offset) * weights[i];
  }

  fragColor = result;
}
`;

const COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec4 uDestRect;  // x, y, width, height in NDC

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  fragColor = texture(uTexture, vTexCoord);
}
`;

const SHADOW_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uOffset;
uniform vec4 uColor;
uniform float uSpread;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  // Sample source with offset
  vec2 offsetCoord = vTexCoord - uOffset;
  float alpha = texture(uTexture, offsetCoord).a;

  // Apply spread (expand the silhouette)
  // Spread is approximated by sampling nearby pixels
  if (uSpread > 0.0) {
    float spreadSamples = 0.0;
    float stepSize = 0.001 * uSpread;
    for (float dx = -1.0; dx <= 1.0; dx += 1.0) {
      for (float dy = -1.0; dy <= 1.0; dy += 1.0) {
        vec2 sampleCoord = offsetCoord + vec2(dx, dy) * stepSize;
        spreadSamples += texture(uTexture, sampleCoord).a;
      }
    }
    alpha = max(alpha, spreadSamples / 9.0);
  }

  // Output colored shadow
  fragColor = vec4(uColor.rgb, uColor.a * alpha);
}
`;

const INNER_SHADOW_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uOffset;
uniform vec4 uColor;
uniform float uSpread;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  // Get original alpha
  float originalAlpha = texture(uTexture, vTexCoord).a;

  // Sample with offset for shadow
  vec2 offsetCoord = vTexCoord - uOffset;
  float offsetAlpha = texture(uTexture, offsetCoord).a;

  // Inner shadow = original shape minus offset shape
  float shadowAlpha = originalAlpha * (1.0 - offsetAlpha);

  // Output colored inner shadow
  fragColor = vec4(uColor.rgb, uColor.a * shadowAlpha);
}
`;

const INNER_SHADOW_COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uSource;
uniform sampler2D uShadow;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  vec4 source = texture(uSource, vTexCoord);
  vec4 shadow = texture(uShadow, vTexCoord);

  // Composite: source with inner shadow blended on top
  // Shadow is only visible inside the original shape (masked by source alpha)
  vec3 blended = mix(source.rgb, shadow.rgb, shadow.a * source.a);
  fragColor = vec4(blended, source.a);
}
`;

// ============================================================================
// Transparency Grid Shader (Checkerboard)
// ============================================================================

const TRANSPARENCY_GRID_VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat3 uViewProjection;

in vec2 aPosition;
out vec2 vWorldPos;

void main() {
  vec3 pos = uViewProjection * vec3(aPosition, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
  vWorldPos = aPosition;
}
`;

const TRANSPARENCY_GRID_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float uGridSize;
uniform vec4 uColor1;
uniform vec4 uColor2;

in vec2 vWorldPos;
out vec4 fragColor;

void main() {
  // Create checkerboard pattern
  vec2 cell = floor(vWorldPos / uGridSize);
  float checker = mod(cell.x + cell.y, 2.0);
  fragColor = mix(uColor1, uColor2, checker);
}
`;
