/**
 * Paint types for fills and strokes
 */
// ============================================================================
// Paint factory functions
// ============================================================================
import { identity } from '../math/matrix';
/** Create a solid paint */
export function solidPaint(color, opacity = 1) {
    return {
        type: 'SOLID',
        visible: true,
        opacity,
        color,
    };
}
/** Create a linear gradient paint */
export function linearGradientPaint(stops, transform, opacity = 1) {
    return {
        type: 'GRADIENT_LINEAR',
        visible: true,
        opacity,
        gradientStops: stops,
        gradientTransform: transform ?? identity(),
    };
}
/** Create a radial gradient paint */
export function radialGradientPaint(stops, transform, opacity = 1) {
    return {
        type: 'GRADIENT_RADIAL',
        visible: true,
        opacity,
        gradientStops: stops,
        gradientTransform: transform ?? identity(),
    };
}
/** Create an image paint */
export function imagePaint(imageRef, scaleMode = 'FILL', transform, opacity = 1) {
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
export function gradientStop(position, color) {
    return { position, color };
}
/** Check if a paint is a gradient */
export function isGradientPaint(paint) {
    return paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL';
}
//# sourceMappingURL=paint.js.map