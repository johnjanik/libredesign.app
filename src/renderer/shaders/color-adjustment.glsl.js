/**
 * Color Adjustment Shader
 *
 * Applies hue rotation, saturation, brightness, and contrast adjustments.
 * Uses RGB to HSV and HSV to RGB conversion.
 */
/**
 * Vertex shader for post-processing effects
 */
export const COLOR_ADJUSTMENT_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aTexCoord;

out vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;
/**
 * Fragment shader for color adjustment
 */
export const COLOR_ADJUSTMENT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform float uHue;        // -180 to 180 degrees
uniform float uSaturation; // -100 to 100 percent
uniform float uBrightness; // -100 to 100 percent
uniform float uContrast;   // -100 to 100 percent

in vec2 vTexCoord;
out vec4 fragColor;

// Convert RGB to HSV
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// Convert HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec4 color = texture(uTexture, vTexCoord);

  // Skip fully transparent pixels
  if (color.a < 0.001) {
    fragColor = color;
    return;
  }

  // Unpremultiply alpha for correct color adjustment
  vec3 rgb = color.a > 0.0 ? color.rgb / color.a : color.rgb;

  // Convert to HSV
  vec3 hsv = rgb2hsv(rgb);

  // Apply hue rotation (normalize to 0-1 range)
  hsv.x = fract(hsv.x + uHue / 360.0);

  // Apply saturation adjustment
  float satMult = 1.0 + uSaturation / 100.0;
  hsv.y = clamp(hsv.y * satMult, 0.0, 1.0);

  // Convert back to RGB
  rgb = hsv2rgb(hsv);

  // Apply brightness adjustment
  float brightMult = 1.0 + uBrightness / 100.0;
  rgb = clamp(rgb * brightMult, 0.0, 1.0);

  // Apply contrast adjustment
  // Formula: output = (input - 0.5) * contrast + 0.5
  float contrastFactor = 1.0 + uContrast / 100.0;
  rgb = clamp((rgb - 0.5) * contrastFactor + 0.5, 0.0, 1.0);

  // Re-premultiply alpha
  fragColor = vec4(rgb * color.a, color.a);
}
`;
//# sourceMappingURL=color-adjustment.glsl.js.map