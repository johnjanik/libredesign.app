/**
 * Hatching Types
 *
 * Types for hatch patterns used in technical drawings:
 * - ANSI standard patterns (steel, brass, bronze, etc.)
 * - ISO standard patterns
 * - Custom patterns
 * - Solid fills
 */

import type { Point } from './geometry';
import type { RGBA } from './color';

/**
 * Hatch line definition - a single line in a hatch pattern
 */
export interface HatchLine {
  /** Angle of the line in degrees (0 = horizontal) */
  readonly angle: number;
  /** Origin point for the line pattern */
  readonly origin: Point;
  /** Offset between lines (perpendicular to line direction) */
  readonly offset: number;
  /** Dash pattern (empty = solid line) */
  readonly dashPattern: readonly number[];
}

/**
 * Hatch pattern definition
 */
export interface HatchPattern {
  /** Pattern name */
  readonly name: string;
  /** Pattern description */
  readonly description: string;
  /** Pattern type */
  readonly type: 'predefined' | 'custom';
  /** Lines that make up the pattern */
  readonly lines: readonly HatchLine[];
  /** Default scale */
  readonly defaultScale: number;
}

/**
 * Hatch fill applied to a region
 */
export interface HatchFill {
  /** Pattern name or 'solid' */
  readonly pattern: string;
  /** Pattern scale factor */
  readonly scale: number;
  /** Pattern rotation angle in degrees */
  readonly rotation: number;
  /** Pattern origin offset */
  readonly origin: Point;
  /** Hatch color */
  readonly color: RGBA;
  /** Background color (optional) */
  readonly backgroundColor?: RGBA;
}

/**
 * Boundary path for hatching - defines a closed region
 */
export interface HatchBoundary {
  /** Boundary type */
  readonly type: 'polyline' | 'path';
  /** Boundary points (for polyline) */
  readonly points?: readonly Point[];
  /** SVG path data (for complex paths) */
  readonly pathData?: string;
  /** Whether this is an outer boundary (vs inner island) */
  readonly isOuter: boolean;
}

/**
 * Complete hatch definition
 */
export interface HatchData {
  /** Fill settings */
  readonly fill: HatchFill;
  /** Boundaries defining the region */
  readonly boundaries: readonly HatchBoundary[];
  /** Whether hatch is associative (updates with boundary) */
  readonly associative: boolean;
}

// ============================================================================
// ANSI Standard Hatch Patterns
// ============================================================================

/**
 * ANSI 31 - Iron/Steel (diagonal lines)
 */
export const ANSI31_STEEL: HatchPattern = {
  name: 'ANSI31',
  description: 'Iron, Brick, Stone masonry',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 3.175, dashPattern: [] },
  ],
};

/**
 * ANSI 32 - Steel (double diagonal)
 */
export const ANSI32_STEEL: HatchPattern = {
  name: 'ANSI32',
  description: 'Steel',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 3.175, dashPattern: [] },
    { angle: 45, origin: { x: 1.5875, y: 0 }, offset: 3.175, dashPattern: [] },
  ],
};

/**
 * ANSI 33 - Brass, Bronze, Copper
 */
export const ANSI33_BRASS: HatchPattern = {
  name: 'ANSI33',
  description: 'Brass, Bronze, Copper',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 6.35, dashPattern: [] },
    { angle: -45, origin: { x: 0, y: 0 }, offset: 6.35, dashPattern: [] },
  ],
};

/**
 * ANSI 34 - Plastic, Rubber
 */
export const ANSI34_PLASTIC: HatchPattern = {
  name: 'ANSI34',
  description: 'Plastic, Rubber',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 3.175, dashPattern: [6.35, 3.175] },
  ],
};

/**
 * ANSI 35 - Fire Brick, Refractory
 */
export const ANSI35_FIREBRICK: HatchPattern = {
  name: 'ANSI35',
  description: 'Fire Brick, Refractory material',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 6.35, dashPattern: [] },
  ],
};

/**
 * ANSI 36 - Marble, Slate, Glass
 */
export const ANSI36_MARBLE: HatchPattern = {
  name: 'ANSI36',
  description: 'Marble, Slate, Glass',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 6.35, dashPattern: [] },
    { angle: 45, origin: { x: 0, y: 3.175 }, offset: 6.35, dashPattern: [12.7, 6.35] },
  ],
};

/**
 * ANSI 37 - Lead, Zinc, Magnesium
 */
export const ANSI37_LEAD: HatchPattern = {
  name: 'ANSI37',
  description: 'Lead, Zinc, Magnesium',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 3.175, dashPattern: [] },
    { angle: -45, origin: { x: 0, y: 0 }, offset: 6.35, dashPattern: [] },
  ],
};

/**
 * ANSI 38 - Aluminum
 */
export const ANSI38_ALUMINUM: HatchPattern = {
  name: 'ANSI38',
  description: 'Aluminum',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 3.175, dashPattern: [] },
    { angle: -45, origin: { x: 0, y: 0 }, offset: 12.7, dashPattern: [] },
  ],
};

// ============================================================================
// ISO Standard Patterns
// ============================================================================

/**
 * ISO Standard - Metals
 */
export const ISO_STEEL: HatchPattern = {
  name: 'ISO_STEEL',
  description: 'ISO Standard - Steel and Iron',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 2.5, dashPattern: [] },
  ],
};

/**
 * ISO Standard - Non-ferrous metals
 */
export const ISO_BRASS: HatchPattern = {
  name: 'ISO_BRASS',
  description: 'ISO Standard - Copper, Brass, Bronze',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 5, dashPattern: [] },
    { angle: -45, origin: { x: 0, y: 0 }, offset: 5, dashPattern: [] },
  ],
};

/**
 * ISO Standard - Insulation
 */
export const ISO_INSULATION: HatchPattern = {
  name: 'ISO_INSULATION',
  description: 'ISO Standard - Insulation',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 0, origin: { x: 0, y: 0 }, offset: 3, dashPattern: [3, 3] },
    { angle: 0, origin: { x: 1.5, y: 1.5 }, offset: 3, dashPattern: [3, 3] },
  ],
};

/**
 * ISO Standard - Wood
 */
export const ISO_WOOD: HatchPattern = {
  name: 'ISO_WOOD',
  description: 'ISO Standard - Wood (end grain)',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 0, origin: { x: 0, y: 0 }, offset: 4, dashPattern: [] },
    { angle: 90, origin: { x: 0, y: 0 }, offset: 4, dashPattern: [] },
  ],
};

/**
 * ISO Standard - Concrete
 */
export const ISO_CONCRETE: HatchPattern = {
  name: 'ISO_CONCRETE',
  description: 'ISO Standard - Concrete',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 3, dashPattern: [2, 4] },
    { angle: -45, origin: { x: 0, y: 0 }, offset: 6, dashPattern: [] },
  ],
};

// ============================================================================
// Common Patterns
// ============================================================================

/**
 * Simple horizontal lines
 */
export const HORIZONTAL: HatchPattern = {
  name: 'HORIZONTAL',
  description: 'Horizontal lines',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 0, origin: { x: 0, y: 0 }, offset: 4, dashPattern: [] },
  ],
};

/**
 * Simple vertical lines
 */
export const VERTICAL: HatchPattern = {
  name: 'VERTICAL',
  description: 'Vertical lines',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 90, origin: { x: 0, y: 0 }, offset: 4, dashPattern: [] },
  ],
};

/**
 * Cross-hatch pattern
 */
export const CROSS: HatchPattern = {
  name: 'CROSS',
  description: 'Cross-hatch (grid)',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 0, origin: { x: 0, y: 0 }, offset: 4, dashPattern: [] },
    { angle: 90, origin: { x: 0, y: 0 }, offset: 4, dashPattern: [] },
  ],
};

/**
 * Diagonal cross-hatch
 */
export const DIAGONAL_CROSS: HatchPattern = {
  name: 'DIAGONAL_CROSS',
  description: 'Diagonal cross-hatch',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 45, origin: { x: 0, y: 0 }, offset: 4, dashPattern: [] },
    { angle: -45, origin: { x: 0, y: 0 }, offset: 4, dashPattern: [] },
  ],
};

/**
 * Dots pattern
 */
export const DOTS: HatchPattern = {
  name: 'DOTS',
  description: 'Dot pattern',
  type: 'predefined',
  defaultScale: 1,
  lines: [
    { angle: 0, origin: { x: 0, y: 0 }, offset: 4, dashPattern: [0.5, 4] },
    { angle: 0, origin: { x: 2, y: 2 }, offset: 4, dashPattern: [0.5, 4] },
  ],
};

// ============================================================================
// Pattern Registry
// ============================================================================

/**
 * All predefined hatch patterns
 */
export const HATCH_PATTERNS: Record<string, HatchPattern> = {
  // ANSI patterns
  ANSI31: ANSI31_STEEL,
  ANSI32: ANSI32_STEEL,
  ANSI33: ANSI33_BRASS,
  ANSI34: ANSI34_PLASTIC,
  ANSI35: ANSI35_FIREBRICK,
  ANSI36: ANSI36_MARBLE,
  ANSI37: ANSI37_LEAD,
  ANSI38: ANSI38_ALUMINUM,

  // ISO patterns
  ISO_STEEL: ISO_STEEL,
  ISO_BRASS: ISO_BRASS,
  ISO_INSULATION: ISO_INSULATION,
  ISO_WOOD: ISO_WOOD,
  ISO_CONCRETE: ISO_CONCRETE,

  // Common patterns
  HORIZONTAL: HORIZONTAL,
  VERTICAL: VERTICAL,
  CROSS: CROSS,
  DIAGONAL_CROSS: DIAGONAL_CROSS,
  DOTS: DOTS,
};

/**
 * Get a hatch pattern by name
 */
export function getHatchPattern(name: string): HatchPattern | null {
  return HATCH_PATTERNS[name] ?? null;
}

/**
 * Get all available pattern names
 */
export function getPatternNames(): string[] {
  return Object.keys(HATCH_PATTERNS);
}

/**
 * Create a custom hatch pattern
 */
export function createCustomPattern(
  name: string,
  description: string,
  lines: HatchLine[]
): HatchPattern {
  return {
    name,
    description,
    type: 'custom',
    lines,
    defaultScale: 1,
  };
}

/**
 * Create default hatch fill settings
 */
export function createDefaultHatchFill(patternName: string = 'ANSI31'): HatchFill {
  return {
    pattern: patternName,
    scale: 1,
    rotation: 0,
    origin: { x: 0, y: 0 },
    color: { r: 0, g: 0, b: 0, a: 1 },
  };
}
