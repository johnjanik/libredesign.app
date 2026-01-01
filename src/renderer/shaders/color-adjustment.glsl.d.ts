/**
 * Color Adjustment Shader
 *
 * Applies hue rotation, saturation, brightness, and contrast adjustments.
 * Uses RGB to HSV and HSV to RGB conversion.
 */
/**
 * Vertex shader for post-processing effects
 */
export declare const COLOR_ADJUSTMENT_VERTEX_SHADER = "#version 300 es\nprecision highp float;\n\nlayout(location = 0) in vec2 aPosition;\nlayout(location = 1) in vec2 aTexCoord;\n\nout vec2 vTexCoord;\n\nvoid main() {\n  vTexCoord = aTexCoord;\n  gl_Position = vec4(aPosition, 0.0, 1.0);\n}\n";
/**
 * Fragment shader for color adjustment
 */
export declare const COLOR_ADJUSTMENT_FRAGMENT_SHADER = "#version 300 es\nprecision highp float;\n\nuniform sampler2D uTexture;\nuniform float uHue;        // -180 to 180 degrees\nuniform float uSaturation; // -100 to 100 percent\nuniform float uBrightness; // -100 to 100 percent\nuniform float uContrast;   // -100 to 100 percent\n\nin vec2 vTexCoord;\nout vec4 fragColor;\n\n// Convert RGB to HSV\nvec3 rgb2hsv(vec3 c) {\n  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\n  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\n\n  float d = q.x - min(q.w, q.y);\n  float e = 1.0e-10;\n  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\n\n// Convert HSV to RGB\nvec3 hsv2rgb(vec3 c) {\n  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\n\nvoid main() {\n  vec4 color = texture(uTexture, vTexCoord);\n\n  // Skip fully transparent pixels\n  if (color.a < 0.001) {\n    fragColor = color;\n    return;\n  }\n\n  // Unpremultiply alpha for correct color adjustment\n  vec3 rgb = color.a > 0.0 ? color.rgb / color.a : color.rgb;\n\n  // Convert to HSV\n  vec3 hsv = rgb2hsv(rgb);\n\n  // Apply hue rotation (normalize to 0-1 range)\n  hsv.x = fract(hsv.x + uHue / 360.0);\n\n  // Apply saturation adjustment\n  float satMult = 1.0 + uSaturation / 100.0;\n  hsv.y = clamp(hsv.y * satMult, 0.0, 1.0);\n\n  // Convert back to RGB\n  rgb = hsv2rgb(hsv);\n\n  // Apply brightness adjustment\n  float brightMult = 1.0 + uBrightness / 100.0;\n  rgb = clamp(rgb * brightMult, 0.0, 1.0);\n\n  // Apply contrast adjustment\n  // Formula: output = (input - 0.5) * contrast + 0.5\n  float contrastFactor = 1.0 + uContrast / 100.0;\n  rgb = clamp((rgb - 0.5) * contrastFactor + 0.5, 0.0, 1.0);\n\n  // Re-premultiply alpha\n  fragColor = vec4(rgb * color.a, color.a);\n}\n";
//# sourceMappingURL=color-adjustment.glsl.d.ts.map