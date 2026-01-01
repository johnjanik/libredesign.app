/**
 * Gradient Shaders
 *
 * GLSL shaders for linear and radial gradient rendering.
 * Supports up to 8 color stops with configurable positions.
 */
/**
 * Gradient vertex shader - passes object-space position to fragment shader
 */
export const GRADIENT_VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat3 uViewProjection;
uniform mat3 uTransform;

in vec2 aPosition;

out vec2 vPosition;

void main() {
  // Pass object-space position to fragment shader for gradient calculation
  vPosition = aPosition;

  // Transform to clip space for rendering
  vec3 pos = uViewProjection * uTransform * vec3(aPosition, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
}
`;
/**
 * Linear gradient fragment shader
 */
export const LINEAR_GRADIENT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

// Maximum number of color stops
#define MAX_STOPS 8

// Gradient parameters
uniform vec2 uGradientStart;      // Start point in object space
uniform vec2 uGradientEnd;        // End point in object space
uniform mat3 uGradientTransform;  // Transform applied to gradient

// Color stops
uniform int uStopCount;
uniform vec4 uStopColors[MAX_STOPS];
uniform float uStopPositions[MAX_STOPS];

// Overall opacity
uniform float uOpacity;

in vec2 vPosition;
out vec4 fragColor;

vec4 sampleGradient(float t) {
  // Clamp t to [0, 1]
  t = clamp(t, 0.0, 1.0);

  // Handle edge cases
  if (uStopCount <= 0) {
    return vec4(0.0);
  }
  if (uStopCount == 1) {
    return uStopColors[0];
  }

  // Find the two stops to interpolate between
  int i = 0;
  for (; i < uStopCount - 1; i++) {
    if (t <= uStopPositions[i + 1]) {
      break;
    }
  }

  // Ensure we don't go out of bounds
  if (i >= uStopCount - 1) {
    return uStopColors[uStopCount - 1];
  }

  // Interpolate between stops
  float t0 = uStopPositions[i];
  float t1 = uStopPositions[i + 1];
  float localT = (t1 > t0) ? (t - t0) / (t1 - t0) : 0.0;
  localT = clamp(localT, 0.0, 1.0);

  return mix(uStopColors[i], uStopColors[i + 1], localT);
}

void main() {
  // Apply gradient transform to position
  vec2 pos = (uGradientTransform * vec3(vPosition, 1.0)).xy;

  // Calculate gradient vector
  vec2 gradientVec = uGradientEnd - uGradientStart;
  float gradientLenSq = dot(gradientVec, gradientVec);

  // Calculate position along gradient (0 to 1)
  float t = 0.0;
  if (gradientLenSq > 0.0001) {
    t = dot(pos - uGradientStart, gradientVec) / gradientLenSq;
  }

  // Sample gradient and apply opacity
  vec4 color = sampleGradient(t);
  fragColor = color * uOpacity;
}
`;
/**
 * Radial gradient fragment shader
 */
export const RADIAL_GRADIENT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

// Maximum number of color stops
#define MAX_STOPS 8

// Gradient parameters
uniform vec2 uGradientCenter;     // Center point in object space
uniform vec2 uGradientRadius;     // Radii (x, y) for ellipse support
uniform vec2 uGradientFocus;      // Focus point offset (for focal gradients)
uniform mat3 uGradientTransform;  // Transform applied to gradient

// Color stops
uniform int uStopCount;
uniform vec4 uStopColors[MAX_STOPS];
uniform float uStopPositions[MAX_STOPS];

// Overall opacity
uniform float uOpacity;

in vec2 vPosition;
out vec4 fragColor;

vec4 sampleGradient(float t) {
  // Clamp t to [0, 1]
  t = clamp(t, 0.0, 1.0);

  // Handle edge cases
  if (uStopCount <= 0) {
    return vec4(0.0);
  }
  if (uStopCount == 1) {
    return uStopColors[0];
  }

  // Find the two stops to interpolate between
  int i = 0;
  for (; i < uStopCount - 1; i++) {
    if (t <= uStopPositions[i + 1]) {
      break;
    }
  }

  // Ensure we don't go out of bounds
  if (i >= uStopCount - 1) {
    return uStopColors[uStopCount - 1];
  }

  // Interpolate between stops
  float t0 = uStopPositions[i];
  float t1 = uStopPositions[i + 1];
  float localT = (t1 > t0) ? (t - t0) / (t1 - t0) : 0.0;
  localT = clamp(localT, 0.0, 1.0);

  return mix(uStopColors[i], uStopColors[i + 1], localT);
}

void main() {
  // Apply gradient transform to position
  vec2 pos = (uGradientTransform * vec3(vPosition, 1.0)).xy;

  // Calculate distance from center, normalized by radius
  vec2 offset = pos - uGradientCenter;

  // Handle elliptical radii
  float rx = max(uGradientRadius.x, 0.0001);
  float ry = max(uGradientRadius.y, 0.0001);
  vec2 normalized = vec2(offset.x / rx, offset.y / ry);

  // Distance in normalized space
  float t = length(normalized);

  // Sample gradient and apply opacity
  vec4 color = sampleGradient(t);
  fragColor = color * uOpacity;
}
`;
/**
 * Angular/conic gradient fragment shader
 */
export const ANGULAR_GRADIENT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

// Maximum number of color stops
#define MAX_STOPS 8
#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Gradient parameters
uniform vec2 uGradientCenter;     // Center point in object space
uniform float uStartAngle;        // Starting angle in radians
uniform mat3 uGradientTransform;  // Transform applied to gradient

// Color stops
uniform int uStopCount;
uniform vec4 uStopColors[MAX_STOPS];
uniform float uStopPositions[MAX_STOPS];

// Overall opacity
uniform float uOpacity;

in vec2 vPosition;
out vec4 fragColor;

vec4 sampleGradient(float t) {
  // Wrap t to [0, 1]
  t = fract(t);

  // Handle edge cases
  if (uStopCount <= 0) {
    return vec4(0.0);
  }
  if (uStopCount == 1) {
    return uStopColors[0];
  }

  // Find the two stops to interpolate between
  int i = 0;
  for (; i < uStopCount - 1; i++) {
    if (t <= uStopPositions[i + 1]) {
      break;
    }
  }

  // Ensure we don't go out of bounds
  if (i >= uStopCount - 1) {
    i = uStopCount - 2;
  }

  // Interpolate between stops
  float t0 = uStopPositions[i];
  float t1 = uStopPositions[i + 1];
  float localT = (t1 > t0) ? (t - t0) / (t1 - t0) : 0.0;
  localT = clamp(localT, 0.0, 1.0);

  return mix(uStopColors[i], uStopColors[i + 1], localT);
}

void main() {
  // Apply gradient transform to position
  vec2 pos = (uGradientTransform * vec3(vPosition, 1.0)).xy;

  // Calculate angle from center
  vec2 offset = pos - uGradientCenter;
  float angle = atan(offset.y, offset.x);

  // Normalize angle to [0, 1] starting from startAngle
  float t = (angle - uStartAngle + PI) / TWO_PI;
  t = fract(t); // Wrap around

  // Sample gradient and apply opacity
  vec4 color = sampleGradient(t);
  fragColor = color * uOpacity;
}
`;
/**
 * Diamond gradient fragment shader (square-based radial gradient)
 */
export const DIAMOND_GRADIENT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

// Maximum number of color stops
#define MAX_STOPS 8

// Gradient parameters
uniform vec2 uGradientCenter;     // Center point in object space
uniform vec2 uGradientRadius;     // Radii (x, y)
uniform mat3 uGradientTransform;  // Transform applied to gradient

// Color stops
uniform int uStopCount;
uniform vec4 uStopColors[MAX_STOPS];
uniform float uStopPositions[MAX_STOPS];

// Overall opacity
uniform float uOpacity;

in vec2 vPosition;
out vec4 fragColor;

vec4 sampleGradient(float t) {
  // Clamp t to [0, 1]
  t = clamp(t, 0.0, 1.0);

  // Handle edge cases
  if (uStopCount <= 0) {
    return vec4(0.0);
  }
  if (uStopCount == 1) {
    return uStopColors[0];
  }

  // Find the two stops to interpolate between
  int i = 0;
  for (; i < uStopCount - 1; i++) {
    if (t <= uStopPositions[i + 1]) {
      break;
    }
  }

  // Ensure we don't go out of bounds
  if (i >= uStopCount - 1) {
    return uStopColors[uStopCount - 1];
  }

  // Interpolate between stops
  float t0 = uStopPositions[i];
  float t1 = uStopPositions[i + 1];
  float localT = (t1 > t0) ? (t - t0) / (t1 - t0) : 0.0;
  localT = clamp(localT, 0.0, 1.0);

  return mix(uStopColors[i], uStopColors[i + 1], localT);
}

void main() {
  // Apply gradient transform to position
  vec2 pos = (uGradientTransform * vec3(vPosition, 1.0)).xy;

  // Calculate distance from center using Manhattan distance (diamond shape)
  vec2 offset = abs(pos - uGradientCenter);

  // Normalize by radius
  float rx = max(uGradientRadius.x, 0.0001);
  float ry = max(uGradientRadius.y, 0.0001);

  // Manhattan distance normalized
  float t = offset.x / rx + offset.y / ry;

  // Sample gradient and apply opacity
  vec4 color = sampleGradient(t);
  fragColor = color * uOpacity;
}
`;
//# sourceMappingURL=gradient.glsl.js.map