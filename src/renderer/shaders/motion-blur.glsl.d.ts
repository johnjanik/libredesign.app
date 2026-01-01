/**
 * Motion Blur Shader
 *
 * Applies directional motion blur along a specified angle.
 * Uses linear sampling along the blur direction.
 */
/**
 * Vertex shader for post-processing effects
 */
export declare const MOTION_BLUR_VERTEX_SHADER = "#version 300 es\nprecision highp float;\n\nlayout(location = 0) in vec2 aPosition;\nlayout(location = 1) in vec2 aTexCoord;\n\nout vec2 vTexCoord;\n\nvoid main() {\n  vTexCoord = aTexCoord;\n  gl_Position = vec4(aPosition, 0.0, 1.0);\n}\n";
/**
 * Fragment shader for motion blur effect
 */
export declare const MOTION_BLUR_FRAGMENT_SHADER = "#version 300 es\nprecision highp float;\n\nuniform sampler2D uTexture;\nuniform float uAngle;      // Blur direction in radians\nuniform float uDistance;   // Blur distance in pixels\nuniform vec2 uResolution;  // Texture resolution\n\nin vec2 vTexCoord;\nout vec4 fragColor;\n\n// Number of samples for blur quality\nconst int SAMPLES = 15;\n\nvoid main() {\n  // Calculate blur direction vector\n  vec2 direction = vec2(cos(uAngle), sin(uAngle));\n\n  // Convert distance to texture space\n  vec2 texelSize = 1.0 / uResolution;\n  vec2 blurStep = direction * texelSize * uDistance / float(SAMPLES);\n\n  // Accumulate samples\n  vec4 color = vec4(0.0);\n  float totalWeight = 0.0;\n\n  for (int i = -SAMPLES / 2; i <= SAMPLES / 2; i++) {\n    vec2 offset = blurStep * float(i);\n    vec2 sampleCoord = vTexCoord + offset;\n\n    // Clamp to texture bounds\n    sampleCoord = clamp(sampleCoord, 0.0, 1.0);\n\n    // Gaussian-like weight (center samples have more influence)\n    float weight = 1.0 - abs(float(i)) / float(SAMPLES / 2 + 1);\n    weight = weight * weight; // Quadratic falloff\n\n    color += texture(uTexture, sampleCoord) * weight;\n    totalWeight += weight;\n  }\n\n  // Normalize by total weight\n  fragColor = color / totalWeight;\n}\n";
/**
 * High-quality motion blur fragment shader with more samples
 */
export declare const MOTION_BLUR_HQ_FRAGMENT_SHADER = "#version 300 es\nprecision highp float;\n\nuniform sampler2D uTexture;\nuniform float uAngle;      // Blur direction in radians\nuniform float uDistance;   // Blur distance in pixels\nuniform vec2 uResolution;  // Texture resolution\n\nin vec2 vTexCoord;\nout vec4 fragColor;\n\n// Higher sample count for quality\nconst int SAMPLES = 31;\n\n// Gaussian weight for sample index\nfloat gaussianWeight(int index, float sigma) {\n  float x = float(index);\n  return exp(-(x * x) / (2.0 * sigma * sigma));\n}\n\nvoid main() {\n  // Calculate blur direction vector\n  vec2 direction = vec2(cos(uAngle), sin(uAngle));\n\n  // Convert distance to texture space\n  vec2 texelSize = 1.0 / uResolution;\n  vec2 blurStep = direction * texelSize * uDistance / float(SAMPLES);\n\n  // Gaussian sigma based on sample count\n  float sigma = float(SAMPLES) / 4.0;\n\n  // Accumulate samples with Gaussian weighting\n  vec4 color = vec4(0.0);\n  float totalWeight = 0.0;\n\n  for (int i = -SAMPLES / 2; i <= SAMPLES / 2; i++) {\n    vec2 offset = blurStep * float(i);\n    vec2 sampleCoord = vTexCoord + offset;\n\n    // Clamp to texture bounds\n    sampleCoord = clamp(sampleCoord, 0.0, 1.0);\n\n    float weight = gaussianWeight(i, sigma);\n    color += texture(uTexture, sampleCoord) * weight;\n    totalWeight += weight;\n  }\n\n  // Normalize by total weight\n  fragColor = color / totalWeight;\n}\n";
//# sourceMappingURL=motion-blur.glsl.d.ts.map