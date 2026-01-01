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
export type ColorSpace =
  | 'srgb'
  | 'display-p3'
  | 'linear-srgb'
  | 'oklch'
  | 'oklab';

// ============================================================================
// Color utility functions
// ============================================================================

/** Create an RGBA color */
export function rgba(r: number, g: number, b: number, a: number = 1): RGBA {
  return { r, g, b, a };
}

/** Parse hex color string to RGBA */
export function hexToRGBA(hex: string): RGBA {
  const clean = hex.replace('#', '');
  let r: number, g: number, b: number, a: number = 1;

  if (clean.length === 3) {
    r = parseInt(clean[0]! + clean[0], 16) / 255;
    g = parseInt(clean[1]! + clean[1], 16) / 255;
    b = parseInt(clean[2]! + clean[2], 16) / 255;
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16) / 255;
    g = parseInt(clean.slice(2, 4), 16) / 255;
    b = parseInt(clean.slice(4, 6), 16) / 255;
  } else if (clean.length === 8) {
    r = parseInt(clean.slice(0, 2), 16) / 255;
    g = parseInt(clean.slice(2, 4), 16) / 255;
    b = parseInt(clean.slice(4, 6), 16) / 255;
    a = parseInt(clean.slice(6, 8), 16) / 255;
  } else {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return { r, g, b, a };
}

/** Convert RGBA to hex string */
export function rgbaToHex(color: RGBA, includeAlpha: boolean = false): string {
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
export function lerpColor(a: RGBA, b: RGBA, t: number): RGBA {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t,
  };
}

/** Clamp color components to [0, 1] */
export function clampColor(color: RGBA): RGBA {
  return {
    r: Math.max(0, Math.min(1, color.r)),
    g: Math.max(0, Math.min(1, color.g)),
    b: Math.max(0, Math.min(1, color.b)),
    a: Math.max(0, Math.min(1, color.a)),
  };
}

/** Check if two colors are equal (with tolerance) */
export function colorsEqual(a: RGBA, b: RGBA, tolerance: number = 0.001): boolean {
  return (
    Math.abs(a.r - b.r) < tolerance &&
    Math.abs(a.g - b.g) < tolerance &&
    Math.abs(a.b - b.b) < tolerance &&
    Math.abs(a.a - b.a) < tolerance
  );
}

/** Predefined colors */
export const Colors = {
  transparent: rgba(0, 0, 0, 0),
  black: rgba(0, 0, 0, 1),
  white: rgba(1, 1, 1, 1),
  red: rgba(1, 0, 0, 1),
  green: rgba(0, 1, 0, 1),
  blue: rgba(0, 0, 1, 1),
} as const;
