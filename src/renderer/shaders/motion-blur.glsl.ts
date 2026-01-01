/**
 * Motion Blur Shader
 *
 * Applies directional motion blur along a specified angle.
 * Uses linear sampling along the blur direction.
 */

/**
 * Vertex shader for post-processing effects
 */
export const MOTION_BLUR_VERTEX_SHADER = `#version 300 es
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
 * Fragment shader for motion blur effect
 */
export const MOTION_BLUR_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform float uAngle;      // Blur direction in radians
uniform float uDistance;   // Blur distance in pixels
uniform vec2 uResolution;  // Texture resolution

in vec2 vTexCoord;
out vec4 fragColor;

// Number of samples for blur quality
const int SAMPLES = 15;

void main() {
  // Calculate blur direction vector
  vec2 direction = vec2(cos(uAngle), sin(uAngle));

  // Convert distance to texture space
  vec2 texelSize = 1.0 / uResolution;
  vec2 blurStep = direction * texelSize * uDistance / float(SAMPLES);

  // Accumulate samples
  vec4 color = vec4(0.0);
  float totalWeight = 0.0;

  for (int i = -SAMPLES / 2; i <= SAMPLES / 2; i++) {
    vec2 offset = blurStep * float(i);
    vec2 sampleCoord = vTexCoord + offset;

    // Clamp to texture bounds
    sampleCoord = clamp(sampleCoord, 0.0, 1.0);

    // Gaussian-like weight (center samples have more influence)
    float weight = 1.0 - abs(float(i)) / float(SAMPLES / 2 + 1);
    weight = weight * weight; // Quadratic falloff

    color += texture(uTexture, sampleCoord) * weight;
    totalWeight += weight;
  }

  // Normalize by total weight
  fragColor = color / totalWeight;
}
`;

/**
 * High-quality motion blur fragment shader with more samples
 */
export const MOTION_BLUR_HQ_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform float uAngle;      // Blur direction in radians
uniform float uDistance;   // Blur distance in pixels
uniform vec2 uResolution;  // Texture resolution

in vec2 vTexCoord;
out vec4 fragColor;

// Higher sample count for quality
const int SAMPLES = 31;

// Gaussian weight for sample index
float gaussianWeight(int index, float sigma) {
  float x = float(index);
  return exp(-(x * x) / (2.0 * sigma * sigma));
}

void main() {
  // Calculate blur direction vector
  vec2 direction = vec2(cos(uAngle), sin(uAngle));

  // Convert distance to texture space
  vec2 texelSize = 1.0 / uResolution;
  vec2 blurStep = direction * texelSize * uDistance / float(SAMPLES);

  // Gaussian sigma based on sample count
  float sigma = float(SAMPLES) / 4.0;

  // Accumulate samples with Gaussian weighting
  vec4 color = vec4(0.0);
  float totalWeight = 0.0;

  for (int i = -SAMPLES / 2; i <= SAMPLES / 2; i++) {
    vec2 offset = blurStep * float(i);
    vec2 sampleCoord = vTexCoord + offset;

    // Clamp to texture bounds
    sampleCoord = clamp(sampleCoord, 0.0, 1.0);

    float weight = gaussianWeight(i, sigma);
    color += texture(uTexture, sampleCoord) * weight;
    totalWeight += weight;
  }

  // Normalize by total weight
  fragColor = color / totalWeight;
}
`;
