/**
 * Paint types for fills and strokes
 */
import type { RGBA } from './color';
import type { Matrix2x3 } from './geometry';
/** Paint type discriminator */
export type PaintType = 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
/** Base paint properties */
export interface BasePaint {
    readonly type: PaintType;
    readonly visible: boolean;
    readonly opacity: number;
}
/** Solid color paint */
export interface SolidPaint extends BasePaint {
    readonly type: 'SOLID';
    readonly color: RGBA;
}
/** Gradient stop */
export interface GradientStop {
    readonly position: number;
    readonly color: RGBA;
}
/** Linear gradient paint */
export interface LinearGradientPaint extends BasePaint {
    readonly type: 'GRADIENT_LINEAR';
    readonly gradientStops: readonly GradientStop[];
    readonly gradientTransform: Matrix2x3;
}
/** Radial gradient paint */
export interface RadialGradientPaint extends BasePaint {
    readonly type: 'GRADIENT_RADIAL';
    readonly gradientStops: readonly GradientStop[];
    readonly gradientTransform: Matrix2x3;
}
/** Gradient paint (linear or radial) */
export type GradientPaint = LinearGradientPaint | RadialGradientPaint;
/** Image scale mode */
export type ImageScaleMode = 'FILL' | 'FIT' | 'CROP' | 'TILE';
/** Image paint */
export interface ImagePaint extends BasePaint {
    readonly type: 'IMAGE';
    readonly imageRef: string;
    readonly scaleMode: ImageScaleMode;
    readonly imageTransform: Matrix2x3;
}
/** Union of all paint types */
export type Paint = SolidPaint | LinearGradientPaint | RadialGradientPaint | ImagePaint;
/** Create a solid paint */
export declare function solidPaint(color: RGBA, opacity?: number): SolidPaint;
/** Create a linear gradient paint */
export declare function linearGradientPaint(stops: readonly GradientStop[], transform?: Matrix2x3, opacity?: number): LinearGradientPaint;
/** Create a radial gradient paint */
export declare function radialGradientPaint(stops: readonly GradientStop[], transform?: Matrix2x3, opacity?: number): RadialGradientPaint;
/** Create an image paint */
export declare function imagePaint(imageRef: string, scaleMode?: ImageScaleMode, transform?: Matrix2x3, opacity?: number): ImagePaint;
/** Create a gradient stop */
export declare function gradientStop(position: number, color: RGBA): GradientStop;
/** Check if a paint is a gradient */
export declare function isGradientPaint(paint: Paint): paint is GradientPaint;
//# sourceMappingURL=paint.d.ts.map