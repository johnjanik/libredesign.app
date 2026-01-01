/**
 * Image Shader
 *
 * Renders textured quads with transform and opacity support.
 * Supports both regular and tiled image modes.
 */
/**
 * Vertex shader for image rendering
 */
export declare const IMAGE_VERTEX_SHADER = "#version 300 es\nprecision highp float;\n\nlayout(location = 0) in vec2 aPosition;\nlayout(location = 1) in vec2 aTexCoord;\n\nuniform mat4 uViewProjection;\nuniform mat3 uTransform;\n\nout vec2 vTexCoord;\nout vec2 vPosition;\n\nvoid main() {\n  // Apply image transform to texture coordinates\n  vec3 transformedCoord = uTransform * vec3(aTexCoord, 1.0);\n  vTexCoord = transformedCoord.xy;\n  vPosition = aPosition;\n\n  gl_Position = uViewProjection * vec4(aPosition, 0.0, 1.0);\n}\n";
/**
 * Fragment shader for image rendering
 */
export declare const IMAGE_FRAGMENT_SHADER = "#version 300 es\nprecision highp float;\n\nin vec2 vTexCoord;\nin vec2 vPosition;\n\nuniform sampler2D uTexture;\nuniform float uOpacity;\nuniform int uTiling;\n\nout vec4 fragColor;\n\nvoid main() {\n  vec2 uv = vTexCoord;\n\n  // Handle tiling mode - wrap coordinates\n  if (uTiling == 1) {\n    uv = fract(uv);\n  } else {\n    // Clamp to edge for non-tiling\n    uv = clamp(uv, 0.0, 1.0);\n  }\n\n  vec4 texColor = texture(uTexture, uv);\n\n  // Apply opacity\n  fragColor = texColor * uOpacity;\n}\n";
/**
 * Fragment shader for image rendering with alpha masking
 */
export declare const IMAGE_MASKED_FRAGMENT_SHADER = "#version 300 es\nprecision highp float;\n\nin vec2 vTexCoord;\nin vec2 vPosition;\n\nuniform sampler2D uTexture;\nuniform sampler2D uMask;\nuniform float uOpacity;\nuniform int uTiling;\n\nout vec4 fragColor;\n\nvoid main() {\n  vec2 uv = vTexCoord;\n\n  // Handle tiling mode\n  if (uTiling == 1) {\n    uv = fract(uv);\n  } else {\n    uv = clamp(uv, 0.0, 1.0);\n  }\n\n  vec4 texColor = texture(uTexture, uv);\n  float maskAlpha = texture(uMask, vTexCoord).a;\n\n  fragColor = texColor * uOpacity * maskAlpha;\n}\n";
/**
 * Fragment shader for image with color overlay
 */
export declare const IMAGE_TINTED_FRAGMENT_SHADER = "#version 300 es\nprecision highp float;\n\nin vec2 vTexCoord;\nin vec2 vPosition;\n\nuniform sampler2D uTexture;\nuniform float uOpacity;\nuniform vec4 uTintColor;\nuniform float uTintAmount;\nuniform int uTiling;\n\nout vec4 fragColor;\n\nvoid main() {\n  vec2 uv = vTexCoord;\n\n  if (uTiling == 1) {\n    uv = fract(uv);\n  } else {\n    uv = clamp(uv, 0.0, 1.0);\n  }\n\n  vec4 texColor = texture(uTexture, uv);\n\n  // Mix texture color with tint\n  vec4 tinted = mix(texColor, uTintColor * texColor.a, uTintAmount);\n\n  fragColor = tinted * uOpacity;\n}\n";
/**
 * Fragment shader for image with brightness/contrast adjustment
 */
export declare const IMAGE_ADJUSTED_FRAGMENT_SHADER = "#version 300 es\nprecision highp float;\n\nin vec2 vTexCoord;\nin vec2 vPosition;\n\nuniform sampler2D uTexture;\nuniform float uOpacity;\nuniform float uBrightness;\nuniform float uContrast;\nuniform float uSaturation;\nuniform int uTiling;\n\nout vec4 fragColor;\n\nvoid main() {\n  vec2 uv = vTexCoord;\n\n  if (uTiling == 1) {\n    uv = fract(uv);\n  } else {\n    uv = clamp(uv, 0.0, 1.0);\n  }\n\n  vec4 texColor = texture(uTexture, uv);\n  vec3 rgb = texColor.rgb;\n\n  // Apply brightness (-1 to 1)\n  rgb = rgb + uBrightness;\n\n  // Apply contrast (-1 to 1, maps to 0 to 2)\n  float contrastFactor = 1.0 + uContrast;\n  rgb = (rgb - 0.5) * contrastFactor + 0.5;\n\n  // Apply saturation (-1 to 1)\n  float luminance = dot(rgb, vec3(0.299, 0.587, 0.114));\n  rgb = mix(vec3(luminance), rgb, 1.0 + uSaturation);\n\n  // Clamp and apply alpha\n  rgb = clamp(rgb, 0.0, 1.0);\n  fragColor = vec4(rgb, texColor.a) * uOpacity;\n}\n";
//# sourceMappingURL=image.glsl.d.ts.map