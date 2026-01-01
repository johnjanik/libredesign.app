/**
 * Gradient Renderer
 *
 * Renders gradient fills for vector shapes.
 * Supports linear, radial, angular, and diamond gradients.
 */

import type { WebGLContext } from '../core/webgl-context';
import type { ShaderManager, ShaderProgram } from '../shaders/shader-manager';
import type { Matrix2x3 } from '@core/types/geometry';

/**
 * Gradient type
 */
export type GradientType = 'LINEAR' | 'RADIAL' | 'ANGULAR' | 'DIAMOND';

/**
 * Gradient color stop
 */
export interface GradientStop {
  readonly position: number; // 0 to 1
  readonly color: readonly [number, number, number, number]; // RGBA, 0-1
}

/**
 * Base gradient definition
 */
export interface BaseGradient {
  readonly type: GradientType;
  readonly stops: readonly GradientStop[];
  readonly opacity?: number;
  readonly transform?: Matrix2x3;
}

/**
 * Linear gradient
 */
export interface LinearGradient extends BaseGradient {
  readonly type: 'LINEAR';
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
}

/**
 * Radial gradient
 */
export interface RadialGradient extends BaseGradient {
  readonly type: 'RADIAL';
  readonly centerX: number;
  readonly centerY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly focusX?: number;
  readonly focusY?: number;
}

/**
 * Angular (conic) gradient
 */
export interface AngularGradient extends BaseGradient {
  readonly type: 'ANGULAR';
  readonly centerX: number;
  readonly centerY: number;
  readonly startAngle?: number; // Radians
}

/**
 * Diamond gradient
 */
export interface DiamondGradient extends BaseGradient {
  readonly type: 'DIAMOND';
  readonly centerX: number;
  readonly centerY: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

/**
 * Union type for all gradients
 */
export type Gradient = LinearGradient | RadialGradient | AngularGradient | DiamondGradient;

/**
 * Maximum number of gradient stops supported
 */
const MAX_STOPS = 8;

/**
 * Identity matrix for gradients
 */
const IDENTITY_MATRIX: Matrix2x3 = [1, 0, 0, 1, 0, 0];

/**
 * Gradient renderer for WebGL
 */
export class GradientRenderer {
  private ctx: WebGLContext;
  private shaders: ShaderManager;

  constructor(ctx: WebGLContext, shaders: ShaderManager) {
    this.ctx = ctx;
    this.shaders = shaders;
  }

  /**
   * Get the shader name for a gradient type.
   */
  getShaderName(type: GradientType): string {
    switch (type) {
      case 'LINEAR':
        return 'linearGradient';
      case 'RADIAL':
        return 'radialGradient';
      case 'ANGULAR':
        return 'angularGradient';
      case 'DIAMOND':
        return 'diamondGradient';
    }
  }

  /**
   * Set up gradient uniforms for rendering.
   */
  setupGradient(
    gradient: Gradient,
    viewProjection: Matrix2x3,
    transform: Matrix2x3
  ): ShaderProgram {
    const shaderName = this.getShaderName(gradient.type);
    const program = this.shaders.use(shaderName);
    const gl = this.ctx.gl;

    // Set common uniforms
    this.setMatrix3Uniform(gl, program, 'uViewProjection', viewProjection);
    this.setMatrix3Uniform(gl, program, 'uTransform', transform);
    this.setMatrix3Uniform(gl, program, 'uGradientTransform', gradient.transform || IDENTITY_MATRIX);

    // Set opacity
    const opacityLoc = program.uniforms.get('uOpacity');
    if (opacityLoc) {
      gl.uniform1f(opacityLoc, gradient.opacity ?? 1);
    }

    // Set color stops
    this.setColorStops(gl, program, gradient.stops);

    // Set type-specific uniforms
    switch (gradient.type) {
      case 'LINEAR':
        this.setupLinearGradient(gl, program, gradient);
        break;
      case 'RADIAL':
        this.setupRadialGradient(gl, program, gradient);
        break;
      case 'ANGULAR':
        this.setupAngularGradient(gl, program, gradient);
        break;
      case 'DIAMOND':
        this.setupDiamondGradient(gl, program, gradient);
        break;
    }

    return program;
  }

  /**
   * Set color stop uniforms.
   */
  private setColorStops(
    gl: WebGL2RenderingContext,
    program: ShaderProgram,
    stops: readonly GradientStop[]
  ): void {
    const countLoc = program.uniforms.get('uStopCount');
    if (countLoc) {
      gl.uniform1i(countLoc, Math.min(stops.length, MAX_STOPS));
    }

    // Prepare stop arrays
    const colors = new Float32Array(MAX_STOPS * 4);
    const positions = new Float32Array(MAX_STOPS);

    for (let i = 0; i < Math.min(stops.length, MAX_STOPS); i++) {
      const stop = stops[i]!;
      colors[i * 4] = stop.color[0];
      colors[i * 4 + 1] = stop.color[1];
      colors[i * 4 + 2] = stop.color[2];
      colors[i * 4 + 3] = stop.color[3];
      positions[i] = stop.position;
    }

    // Set uniforms
    const colorsLoc = program.uniforms.get('uStopColors');
    if (colorsLoc) {
      gl.uniform4fv(colorsLoc, colors);
    }

    const positionsLoc = program.uniforms.get('uStopPositions');
    if (positionsLoc) {
      gl.uniform1fv(positionsLoc, positions);
    }
  }

  /**
   * Set up linear gradient uniforms.
   */
  private setupLinearGradient(
    gl: WebGL2RenderingContext,
    program: ShaderProgram,
    gradient: LinearGradient
  ): void {
    const startLoc = program.uniforms.get('uGradientStart');
    if (startLoc) {
      gl.uniform2f(startLoc, gradient.startX, gradient.startY);
    }

    const endLoc = program.uniforms.get('uGradientEnd');
    if (endLoc) {
      gl.uniform2f(endLoc, gradient.endX, gradient.endY);
    }
  }

  /**
   * Set up radial gradient uniforms.
   */
  private setupRadialGradient(
    gl: WebGL2RenderingContext,
    program: ShaderProgram,
    gradient: RadialGradient
  ): void {
    const centerLoc = program.uniforms.get('uGradientCenter');
    if (centerLoc) {
      gl.uniform2f(centerLoc, gradient.centerX, gradient.centerY);
    }

    const radiusLoc = program.uniforms.get('uGradientRadius');
    if (radiusLoc) {
      gl.uniform2f(radiusLoc, gradient.radiusX, gradient.radiusY);
    }

    const focusLoc = program.uniforms.get('uGradientFocus');
    if (focusLoc) {
      gl.uniform2f(
        focusLoc,
        gradient.focusX ?? gradient.centerX,
        gradient.focusY ?? gradient.centerY
      );
    }
  }

  /**
   * Set up angular gradient uniforms.
   */
  private setupAngularGradient(
    gl: WebGL2RenderingContext,
    program: ShaderProgram,
    gradient: AngularGradient
  ): void {
    const centerLoc = program.uniforms.get('uGradientCenter');
    if (centerLoc) {
      gl.uniform2f(centerLoc, gradient.centerX, gradient.centerY);
    }

    const angleLoc = program.uniforms.get('uStartAngle');
    if (angleLoc) {
      gl.uniform1f(angleLoc, gradient.startAngle ?? 0);
    }
  }

  /**
   * Set up diamond gradient uniforms.
   */
  private setupDiamondGradient(
    gl: WebGL2RenderingContext,
    program: ShaderProgram,
    gradient: DiamondGradient
  ): void {
    const centerLoc = program.uniforms.get('uGradientCenter');
    if (centerLoc) {
      gl.uniform2f(centerLoc, gradient.centerX, gradient.centerY);
    }

    const radiusLoc = program.uniforms.get('uGradientRadius');
    if (radiusLoc) {
      gl.uniform2f(radiusLoc, gradient.radiusX, gradient.radiusY);
    }
  }

  /**
   * Set a mat3 uniform from a Matrix2x3.
   */
  private setMatrix3Uniform(
    gl: WebGL2RenderingContext,
    program: ShaderProgram,
    name: string,
    matrix: Matrix2x3
  ): void {
    const loc = program.uniforms.get(name);
    if (loc) {
      // Convert Matrix2x3 to mat3 (column-major)
      gl.uniformMatrix3fv(loc, false, [
        matrix[0], matrix[1], 0,
        matrix[2], matrix[3], 0,
        matrix[4], matrix[5], 1,
      ]);
    }
  }
}

/**
 * Create a gradient renderer.
 */
export function createGradientRenderer(
  ctx: WebGLContext,
  shaders: ShaderManager
): GradientRenderer {
  return new GradientRenderer(ctx, shaders);
}

/**
 * Create a linear gradient.
 */
export function createLinearGradient(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  stops: GradientStop[],
  options?: { opacity?: number; transform?: Matrix2x3 }
): LinearGradient {
  return {
    type: 'LINEAR',
    startX,
    startY,
    endX,
    endY,
    stops,
    ...(options?.opacity !== undefined && { opacity: options.opacity }),
    ...(options?.transform !== undefined && { transform: options.transform }),
  };
}

/**
 * Create a radial gradient.
 */
export function createRadialGradient(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number = radiusX,
  stops: GradientStop[],
  options?: { focusX?: number; focusY?: number; opacity?: number; transform?: Matrix2x3 }
): RadialGradient {
  return {
    type: 'RADIAL',
    centerX,
    centerY,
    radiusX,
    radiusY,
    stops,
    ...(options?.focusX !== undefined ? { focusX: options.focusX } : {}),
    ...(options?.focusY !== undefined ? { focusY: options.focusY } : {}),
    ...(options?.opacity !== undefined ? { opacity: options.opacity } : {}),
    ...(options?.transform !== undefined ? { transform: options.transform } : {}),
  };
}

/**
 * Create an angular gradient.
 */
export function createAngularGradient(
  centerX: number,
  centerY: number,
  stops: GradientStop[],
  options?: { startAngle?: number; opacity?: number; transform?: Matrix2x3 }
): AngularGradient {
  return {
    type: 'ANGULAR',
    centerX,
    centerY,
    stops,
    ...(options?.startAngle !== undefined ? { startAngle: options.startAngle } : {}),
    ...(options?.opacity !== undefined ? { opacity: options.opacity } : {}),
    ...(options?.transform !== undefined ? { transform: options.transform } : {}),
  };
}

/**
 * Create a diamond gradient.
 */
export function createDiamondGradient(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number = radiusX,
  stops: GradientStop[],
  options?: { opacity?: number; transform?: Matrix2x3 }
): DiamondGradient {
  return {
    type: 'DIAMOND',
    centerX,
    centerY,
    radiusX,
    radiusY,
    stops,
    ...(options?.opacity !== undefined ? { opacity: options.opacity } : {}),
    ...(options?.transform !== undefined ? { transform: options.transform } : {}),
  };
}

/**
 * Create a gradient stop.
 */
export function createGradientStop(
  position: number,
  r: number,
  g: number,
  b: number,
  a: number = 1
): GradientStop {
  return {
    position,
    color: [r, g, b, a],
  };
}

/**
 * Create gradient stops from CSS-style colors.
 */
export function createGradientStopsFromColors(
  colors: readonly string[],
  positions?: readonly number[]
): GradientStop[] {
  const stops: GradientStop[] = [];

  for (let i = 0; i < colors.length; i++) {
    const color = parseColor(colors[i]!);
    const position = positions?.[i] ?? i / (colors.length - 1);
    stops.push({ position, color });
  }

  return stops;
}

/**
 * Parse a CSS color string to RGBA values.
 */
function parseColor(color: string): readonly [number, number, number, number] {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0]! + hex[0]!, 16) / 255;
      const g = parseInt(hex[1]! + hex[1]!, 16) / 255;
      const b = parseInt(hex[2]! + hex[2]!, 16) / 255;
      return [r, g, b, 1];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1];
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      return [r, g, b, a];
    }
  }

  // Handle rgba() colors
  const rgbaMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]!, 10) / 255;
    const g = parseInt(rgbaMatch[2]!, 10) / 255;
    const b = parseInt(rgbaMatch[3]!, 10) / 255;
    const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
    return [r, g, b, a];
  }

  // Default to black
  return [0, 0, 0, 1];
}
