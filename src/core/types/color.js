/**
 * Color types for DesignLibre
 */
// ============================================================================
// Color utility functions
// ============================================================================
/** Create an RGBA color */
export function rgba(r, g, b, a = 1) {
    return { r, g, b, a };
}
/** Parse hex color string to RGBA */
export function hexToRGBA(hex) {
    const clean = hex.replace('#', '');
    let r, g, b, a = 1;
    if (clean.length === 3) {
        r = parseInt(clean[0] + clean[0], 16) / 255;
        g = parseInt(clean[1] + clean[1], 16) / 255;
        b = parseInt(clean[2] + clean[2], 16) / 255;
    }
    else if (clean.length === 6) {
        r = parseInt(clean.slice(0, 2), 16) / 255;
        g = parseInt(clean.slice(2, 4), 16) / 255;
        b = parseInt(clean.slice(4, 6), 16) / 255;
    }
    else if (clean.length === 8) {
        r = parseInt(clean.slice(0, 2), 16) / 255;
        g = parseInt(clean.slice(2, 4), 16) / 255;
        b = parseInt(clean.slice(4, 6), 16) / 255;
        a = parseInt(clean.slice(6, 8), 16) / 255;
    }
    else {
        throw new Error(`Invalid hex color: ${hex}`);
    }
    return { r, g, b, a };
}
/** Convert RGBA to hex string */
export function rgbaToHex(color, includeAlpha = false) {
    const r = Math.round(color.r * 255)
        .toString(16)
        .padStart(2, '0');
    const g = Math.round(color.g * 255)
        .toString(16)
        .padStart(2, '0');
    const b = Math.round(color.b * 255)
        .toString(16)
        .padStart(2, '0');
    if (includeAlpha) {
        const a = Math.round(color.a * 255)
            .toString(16)
            .padStart(2, '0');
        return `#${r}${g}${b}${a}`;
    }
    return `#${r}${g}${b}`;
}
/** Linearly interpolate between two colors */
export function lerpColor(a, b, t) {
    return {
        r: a.r + (b.r - a.r) * t,
        g: a.g + (b.g - a.g) * t,
        b: a.b + (b.b - a.b) * t,
        a: a.a + (b.a - a.a) * t,
    };
}
/** Clamp color components to [0, 1] */
export function clampColor(color) {
    return {
        r: Math.max(0, Math.min(1, color.r)),
        g: Math.max(0, Math.min(1, color.g)),
        b: Math.max(0, Math.min(1, color.b)),
        a: Math.max(0, Math.min(1, color.a)),
    };
}
/** Check if two colors are equal (with tolerance) */
export function colorsEqual(a, b, tolerance = 0.001) {
    return (Math.abs(a.r - b.r) < tolerance &&
        Math.abs(a.g - b.g) < tolerance &&
        Math.abs(a.b - b.b) < tolerance &&
        Math.abs(a.a - b.a) < tolerance);
}
/** Predefined colors */
export const Colors = {
    transparent: rgba(0, 0, 0, 0),
    black: rgba(0, 0, 0, 1),
    white: rgba(1, 1, 1, 1),
    red: rgba(1, 0, 0, 1),
    green: rgba(0, 1, 0, 1),
    blue: rgba(0, 0, 1, 1),
};
//# sourceMappingURL=color.js.map