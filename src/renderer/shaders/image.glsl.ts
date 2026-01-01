/**
 * Image Shader
 *
 * Renders textured quads with transform and opacity support.
 * Supports both regular and tiled image modes.
 */

/**
 * Vertex shader for image rendering
 */
export const IMAGE_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aTexCoord;

uniform mat4 uViewProjection;
uniform mat3 uTransform;

out vec2 vTexCoord;
out vec2 vPosition;

void main() {
  // Apply image transform to texture coordinates
  vec3 transformedCoord = uTransform * vec3(aTexCoord, 1.0);
  vTexCoord = transformedCoord.xy;
  vPosition = aPosition;

  gl_Position = uViewProjection * vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * Fragment shader for image rendering
 */
export const IMAGE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec2 vPosition;

uniform sampler2D uTexture;
uniform float uOpacity;
uniform int uTiling;

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

  vec4 texColor = texture(uTexture, uv);

  // Apply opacity
  fragColor = texColor * uOpacity;
}
`;

/**
 * Fragment shader for image rendering with alpha masking
 */
export const IMAGE_MASKED_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec2 vPosition;

uniform sampler2D uTexture;
uniform sampler2D uMask;
uniform float uOpacity;
uniform int uTiling;

out vec4 fragColor;

void main() {
  vec2 uv = vTexCoord;

  // Handle tiling mode
  if (uTiling == 1) {
    uv = fract(uv);
  } else {
    uv = clamp(uv, 0.0, 1.0);
  }

  vec4 texColor = texture(uTexture, uv);
  float maskAlpha = texture(uMask, vTexCoord).a;

  fragColor = texColor * uOpacity * maskAlpha;
}
`;

/**
 * Fragment shader for image with color overlay
 */
export const IMAGE_TINTED_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec2 vPosition;

uniform sampler2D uTexture;
uniform float uOpacity;
uniform vec4 uTintColor;
uniform float uTintAmount;
uniform int uTiling;

out vec4 fragColor;

void main() {
  vec2 uv = vTexCoord;

  if (uTiling == 1) {
    uv = fract(uv);
  } else {
    uv = clamp(uv, 0.0, 1.0);
  }

  vec4 texColor = texture(uTexture, uv);

  // Mix texture color with tint
  vec4 tinted = mix(texColor, uTintColor * texColor.a, uTintAmount);

  fragColor = tinted * uOpacity;
}
`;

/**
 * Fragment shader for image with brightness/contrast adjustment
 */
export const IMAGE_ADJUSTED_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec2 vPosition;

uniform sampler2D uTexture;
uniform float uOpacity;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform int uTiling;

out vec4 fragColor;

void main() {
  vec2 uv = vTexCoord;

  if (uTiling == 1) {
    uv = fract(uv);
  } else {
    uv = clamp(uv, 0.0, 1.0);
  }

  vec4 texColor = texture(uTexture, uv);
  vec3 rgb = texColor.rgb;

  // Apply brightness (-1 to 1)
  rgb = rgb + uBrightness;

  // Apply contrast (-1 to 1, maps to 0 to 2)
  float contrastFactor = 1.0 + uContrast;
  rgb = (rgb - 0.5) * contrastFactor + 0.5;

  // Apply saturation (-1 to 1)
  float luminance = dot(rgb, vec3(0.299, 0.587, 0.114));
  rgb = mix(vec3(luminance), rgb, 1.0 + uSaturation);

  // Clamp and apply alpha
  rgb = clamp(rgb, 0.0, 1.0);
  fragColor = vec4(rgb, texColor.a) * uOpacity;
}
`;
