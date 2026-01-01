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
    readonly position: number;
    readonly color: readonly [number, number, number, number];
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
    readonly startAngle?: number;
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
 * Gradient renderer for WebGL
 */
export declare class GradientRenderer {
    private ctx;
    private shaders;
    constructor(ctx: WebGLContext, shaders: ShaderManager);
    /**
     * Get the shader name for a gradient type.
     */
    getShaderName(type: GradientType): string;
    /**
     * Set up gradient uniforms for rendering.
     */
    setupGradient(gradient: Gradient, viewProjection: Matrix2x3, transform: Matrix2x3): ShaderProgram;
    /**
     * Set color stop uniforms.
     */
    private setColorStops;
    /**
     * Set up linear gradient uniforms.
     */
    private setupLinearGradient;
    /**
     * Set up radial gradient uniforms.
     */
    private setupRadialGradient;
    /**
     * Set up angular gradient uniforms.
     */
    private setupAngularGradient;
    /**
     * Set up diamond gradient uniforms.
     */
    private setupDiamondGradient;
    /**
     * Set a mat3 uniform from a Matrix2x3.
     */
    private setMatrix3Uniform;
}
/**
 * Create a gradient renderer.
 */
export declare function createGradientRenderer(ctx: WebGLContext, shaders: ShaderManager): GradientRenderer;
/**
 * Create a linear gradient.
 */
export declare function createLinearGradient(startX: number, startY: number, endX: number, endY: number, stops: GradientStop[], options?: {
    opacity?: number;
    transform?: Matrix2x3;
}): LinearGradient;
/**
 * Create a radial gradient.
 */
export declare function createRadialGradient(centerX: number, centerY: number, radiusX: number, radiusY: number | undefined, stops: GradientStop[], options?: {
    focusX?: number;
    focusY?: number;
    opacity?: number;
    transform?: Matrix2x3;
}): RadialGradient;
/**
 * Create an angular gradient.
 */
export declare function createAngularGradient(centerX: number, centerY: number, stops: GradientStop[], options?: {
    startAngle?: number;
    opacity?: number;
    transform?: Matrix2x3;
}): AngularGradient;
/**
 * Create a diamond gradient.
 */
export declare function createDiamondGradient(centerX: number, centerY: number, radiusX: number, radiusY: number | undefined, stops: GradientStop[], options?: {
    opacity?: number;
    transform?: Matrix2x3;
}): DiamondGradient;
/**
 * Create a gradient stop.
 */
export declare function createGradientStop(position: number, r: number, g: number, b: number, a?: number): GradientStop;
/**
 * Create gradient stops from CSS-style colors.
 */
export declare function createGradientStopsFromColors(colors: readonly string[], positions?: readonly number[]): GradientStop[];
//# sourceMappingURL=gradient-renderer.d.ts.map