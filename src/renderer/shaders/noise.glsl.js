/**
 * Noise/Grain Shader
 *
 * Applies film grain or noise effect to an image.
 * Uses hash-based pseudo-random noise generation.
 */
/**
 * Vertex shader for post-processing effects
 */
export const NOISE_VERTEX_SHADER = `#version 300 es
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
 * Fragment shader for noise/grain effect
 */
export const NOISE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform float uAmount;     // 0 to 100
uniform float uSize;       // 1 to 10 (grain size)
uniform bool uMonochrome;  // true for grayscale noise
uniform float uTime;       // Animation time for varying noise
uniform vec2 uResolution;  // Texture resolution

in vec2 vTexCoord;
out vec4 fragColor;

// Hash function for pseudo-random number generation
// Based on integer hash, produces values in [0, 1]
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 2D noise based on hashing
float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  // Four corners in 2D of a tile
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  // Smooth interpolation
  vec2 u = f * f * (3.0 - 2.0 * f);

  // Mix four corners
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Generate colored noise (RGB)
vec3 colorNoise(vec2 p) {
  return vec3(
    hash(p),
    hash(p + vec2(127.1, 311.7)),
    hash(p + vec2(269.5, 183.3))
  );
}

void main() {
  vec4 color = texture(uTexture, vTexCoord);

  // Skip fully transparent pixels
  if (color.a < 0.001) {
    fragColor = color;
    return;
  }

  // Calculate noise coordinates based on size
  // Smaller size values = larger grains
  vec2 noiseCoord = vTexCoord * uResolution / uSize;

  // Add time-based variation for animated noise
  noiseCoord += vec2(uTime * 0.1);

  // Generate noise value
  vec3 noiseValue;
  if (uMonochrome) {
    float n = hash(noiseCoord);
    noiseValue = vec3(n);
  } else {
    noiseValue = colorNoise(noiseCoord);
  }

  // Center noise around 0 (-0.5 to 0.5)
  noiseValue = noiseValue - 0.5;

  // Scale by amount (0-100 -> 0-0.5 intensity)
  float intensity = uAmount / 200.0;
  noiseValue *= intensity;

  // Unpremultiply alpha for correct blending
  vec3 rgb = color.a > 0.0 ? color.rgb / color.a : color.rgb;

  // Add noise to color
  rgb = clamp(rgb + noiseValue, 0.0, 1.0);

  // Re-premultiply alpha
  fragColor = vec4(rgb * color.a, color.a);
}
`;
//# sourceMappingURL=noise.glsl.js.map