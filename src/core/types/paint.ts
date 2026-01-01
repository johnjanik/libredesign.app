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
  readonly position: number; // 0-1
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
  readonly imageRef: string; // Asset reference
  readonly scaleMode: ImageScaleMode;
  readonly imageTransform: Matrix2x3;
}

/** Union of all paint types */
export type Paint = SolidPaint | LinearGradientPaint | RadialGradientPaint | ImagePaint;

// ============================================================================
// Paint factory functions
// ============================================================================

import { identity } from '../math/matrix';

/** Create a solid paint */
export function solidPaint(color: RGBA, opacity: number = 1): SolidPaint {
  return {
    type: 'SOLID',
    visible: true,
    opacity,
    color,
  };
}

/** Create a linear gradient paint */
export function linearGradientPaint(
  stops: readonly GradientStop[],
  transform?: Matrix2x3,
  opacity: number = 1
): LinearGradientPaint {
  return {
    type: 'GRADIENT_LINEAR',
    visible: true,
    opacity,
    gradientStops: stops,
    gradientTransform: transform ?? identity(),
  };
}

/** Create a radial gradient paint */
export function radialGradientPaint(
  stops: readonly GradientStop[],
  transform?: Matrix2x3,
  opacity: number = 1
): RadialGradientPaint {
  return {
    type: 'GRADIENT_RADIAL',
    visible: true,
    opacity,
    gradientStops: stops,
    gradientTransform: transform ?? identity(),
  };
}

/** Create an image paint */
export function imagePaint(
  imageRef: string,
  scaleMode: ImageScaleMode = 'FILL',
  transform?: Matrix2x3,
  opacity: number = 1
): ImagePaint {
  return {
    type: 'IMAGE',
    visible: true,
    opacity,
    imageRef,
    scaleMode,
    imageTransform: transform ?? identity(),
  };
}

/** Create a gradient stop */
export function gradientStop(position: number, color: RGBA): GradientStop {
  return { position, color };
}

/** Check if a paint is a gradient */
export function isGradientPaint(paint: Paint): paint is GradientPaint {
  return paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL';
}
