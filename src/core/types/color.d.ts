/**
 * Color types for DesignLibre
 */
/** RGBA color with components in [0, 1] range */
export interface RGBA {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;
}
/** Color space */
export type ColorSpace = 'srgb' | 'display-p3' | 'linear-srgb' | 'oklch' | 'oklab';
/** Create an RGBA color */
export declare function rgba(r: number, g: number, b: number, a?: number): RGBA;
/** Parse hex color string to RGBA */
export declare function hexToRGBA(hex: string): RGBA;
/** Convert RGBA to hex string */
export declare function rgbaToHex(color: RGBA, includeAlpha?: boolean): string;
/** Linearly interpolate between two colors */
export declare function lerpColor(a: RGBA, b: RGBA, t: number): RGBA;
/** Clamp color components to [0, 1] */
export declare function clampColor(color: RGBA): RGBA;
/** Check if two colors are equal (with tolerance) */
export declare function colorsEqual(a: RGBA, b: RGBA, tolerance?: number): boolean;
/** Predefined colors */
export declare const Colors: {
    readonly transparent: RGBA;
    readonly black: RGBA;
    readonly white: RGBA;
    readonly red: RGBA;
    readonly green: RGBA;
    readonly blue: RGBA;
};
//# sourceMappingURL=color.d.ts.map