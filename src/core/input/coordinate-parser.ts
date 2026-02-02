/**
 * Coordinate Parser
 *
 * Parses various coordinate input formats for CAD-style drawing:
 * - Absolute coordinates: "100,50" or "100 50"
 * - Relative coordinates: "@100,50" or "@100 50"
 * - Polar coordinates: "100<45" (distance<angle in degrees)
 * - Relative polar: "@100<45"
 * - Single value with direction: "100" (uses context direction)
 *
 * Also supports:
 * - Mathematical expressions: "100+50,200/2"
 * - Unit suffixes: "100mm,50mm" or "2in,1in"
 */

import type { Point } from '@core/types/geometry';

/**
 * Parsed coordinate result
 */
export interface ParsedCoordinate {
  /** X coordinate (or distance for polar) */
  readonly x: number;
  /** Y coordinate (or angle for polar) */
  readonly y: number;
  /** Whether this is a relative coordinate */
  readonly isRelative: boolean;
  /** Whether this is polar (distance<angle) */
  readonly isPolar: boolean;
  /** Original input string */
  readonly input: string;
  /** Parsing success */
  readonly success: boolean;
  /** Error message if parsing failed */
  readonly error?: string;
}

/**
 * Coordinate parser options
 */
export interface CoordinateParserOptions {
  /** Current unit (for conversion) */
  readonly unit?: 'px' | 'mm' | 'cm' | 'in' | 'pt';
  /** Pixels per unit (for conversion) */
  readonly pixelsPerUnit?: number;
  /** Default angle unit */
  readonly angleUnit?: 'degrees' | 'radians';
  /** Allow mathematical expressions */
  readonly allowExpressions?: boolean;
}

const DEFAULT_OPTIONS: Required<CoordinateParserOptions> = {
  unit: 'px',
  pixelsPerUnit: 1,
  angleUnit: 'degrees',
  allowExpressions: true,
};

/**
 * Unit conversion factors (to pixels, assuming 96 DPI)
 */
const UNIT_TO_PIXELS: Record<string, number> = {
  px: 1,
  pt: 96 / 72,      // 72 points per inch
  mm: 96 / 25.4,    // 25.4mm per inch
  cm: 96 / 2.54,    // 2.54cm per inch
  in: 96,           // 96 pixels per inch
};

/**
 * Parse a coordinate input string
 */
export function parseCoordinate(
  input: string,
  options: CoordinateParserOptions = {}
): ParsedCoordinate {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      x: 0,
      y: 0,
      isRelative: false,
      isPolar: false,
      input,
      success: false,
      error: 'Empty input',
    };
  }

  // Check for relative prefix
  const isRelative = trimmed.startsWith('@');
  const withoutPrefix = isRelative ? trimmed.slice(1) : trimmed;

  // Check for polar format (contains '<')
  if (withoutPrefix.includes('<')) {
    return parsePolar(withoutPrefix, isRelative, input, opts);
  }

  // Parse as Cartesian coordinates
  return parseCartesian(withoutPrefix, isRelative, input, opts);
}

/**
 * Parse Cartesian coordinates
 */
function parseCartesian(
  input: string,
  isRelative: boolean,
  originalInput: string,
  options: Required<CoordinateParserOptions>
): ParsedCoordinate {
  // Split by comma or space
  const parts = input.split(/[,\s]+/).filter(p => p.length > 0);

  if (parts.length === 0) {
    return {
      x: 0,
      y: 0,
      isRelative,
      isPolar: false,
      input: originalInput,
      success: false,
      error: 'No values found',
    };
  }

  if (parts.length === 1) {
    // Single value - interpret as both X and Y (square) or just distance
    const value = parseValue(parts[0]!, options);
    if (value === null) {
      return {
        x: 0,
        y: 0,
        isRelative,
        isPolar: false,
        input: originalInput,
        success: false,
        error: `Invalid value: ${parts[0]}`,
      };
    }
    return {
      x: value,
      y: value,
      isRelative,
      isPolar: false,
      input: originalInput,
      success: true,
    };
  }

  // Two values - X and Y
  const x = parseValue(parts[0]!, options);
  const y = parseValue(parts[1]!, options);

  if (x === null || y === null) {
    return {
      x: 0,
      y: 0,
      isRelative,
      isPolar: false,
      input: originalInput,
      success: false,
      error: `Invalid values: ${parts[0]}, ${parts[1]}`,
    };
  }

  return {
    x,
    y,
    isRelative,
    isPolar: false,
    input: originalInput,
    success: true,
  };
}

/**
 * Parse polar coordinates (distance<angle)
 */
function parsePolar(
  input: string,
  isRelative: boolean,
  originalInput: string,
  options: Required<CoordinateParserOptions>
): ParsedCoordinate {
  const parts = input.split('<');

  if (parts.length !== 2) {
    return {
      x: 0,
      y: 0,
      isRelative,
      isPolar: true,
      input: originalInput,
      success: false,
      error: 'Invalid polar format (use distance<angle)',
    };
  }

  const distance = parseValue(parts[0]!, options);
  const angle = parseValue(parts[1]!, { ...options, unit: 'px' }); // Angle doesn't use length units

  if (distance === null || angle === null) {
    return {
      x: 0,
      y: 0,
      isRelative,
      isPolar: true,
      input: originalInput,
      success: false,
      error: `Invalid polar values: ${parts[0]}<${parts[1]}`,
    };
  }

  // Convert angle to radians if needed
  const angleRadians = options.angleUnit === 'degrees'
    ? (angle * Math.PI) / 180
    : angle;

  // Convert to Cartesian
  const x = distance * Math.cos(angleRadians);
  const y = distance * Math.sin(angleRadians);

  return {
    x,
    y,
    isRelative,
    isPolar: true,
    input: originalInput,
    success: true,
  };
}

/**
 * Parse a single value with optional unit and expression
 */
function parseValue(
  input: string,
  options: Required<CoordinateParserOptions>
): number | null {
  let value = input.trim();

  // Extract unit suffix
  let unitFactor = options.pixelsPerUnit;
  const unitMatch = value.match(/(mm|cm|in|pt|px)$/i);
  if (unitMatch) {
    const unit = unitMatch[1]!.toLowerCase();
    unitFactor = UNIT_TO_PIXELS[unit] ?? 1;
    value = value.slice(0, -unitMatch[1]!.length).trim();
  }

  // Try to evaluate as expression
  if (options.allowExpressions) {
    try {
      // Simple expression evaluation (only allow safe math operations)
      const sanitized = value.replace(/[^0-9+\-*/().e\s]/gi, '');
      if (sanitized !== value) {
        // Contains invalid characters
        return null;
      }

      // Use Function constructor for safe evaluation
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const result = new Function(`return (${sanitized})`)() as unknown;
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return result * unitFactor;
      }
    } catch {
      // Fall through to simple parse
    }
  }

  // Simple number parse
  const num = parseFloat(value);
  if (isNaN(num)) {
    return null;
  }

  return num * unitFactor;
}

/**
 * Apply a parsed coordinate to get an absolute point
 */
export function applyCoordinate(
  parsed: ParsedCoordinate,
  reference: Point
): Point {
  if (!parsed.success) {
    return reference;
  }

  if (parsed.isRelative) {
    return {
      x: reference.x + parsed.x,
      y: reference.y + parsed.y,
    };
  }

  return {
    x: parsed.x,
    y: parsed.y,
  };
}

/**
 * Format a point as a coordinate string
 */
export function formatCoordinate(
  point: Point,
  options: {
    relative?: boolean;
    reference?: Point;
    precision?: number;
    unit?: string;
  } = {}
): string {
  const { relative = false, reference = { x: 0, y: 0 }, precision = 2, unit = '' } = options;

  let x = point.x;
  let y = point.y;

  if (relative && reference) {
    x -= reference.x;
    y -= reference.y;
  }

  const prefix = relative ? '@' : '';
  const suffix = unit ? unit : '';

  return `${prefix}${x.toFixed(precision)}${suffix}, ${y.toFixed(precision)}${suffix}`;
}

/**
 * Format a polar coordinate string
 */
export function formatPolarCoordinate(
  distance: number,
  angle: number,
  options: {
    relative?: boolean;
    precision?: number;
    angleUnit?: 'degrees' | 'radians';
  } = {}
): string {
  const { relative = false, precision = 2, angleUnit = 'degrees' } = options;

  const displayAngle = angleUnit === 'degrees' ? angle : (angle * 180) / Math.PI;
  const prefix = relative ? '@' : '';

  return `${prefix}${distance.toFixed(precision)}<${displayAngle.toFixed(precision)}`;
}

/**
 * Parse dimension input (single value for width/height/radius)
 */
export function parseDimension(
  input: string,
  options: CoordinateParserOptions = {}
): { value: number; success: boolean; error?: string } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const trimmed = input.trim();

  if (!trimmed) {
    return { value: 0, success: false, error: 'Empty input' };
  }

  const value = parseValue(trimmed, opts);

  if (value === null) {
    return { value: 0, success: false, error: `Invalid value: ${trimmed}` };
  }

  return { value, success: true };
}

/**
 * Parse size input (width x height or width,height)
 */
export function parseSize(
  input: string,
  options: CoordinateParserOptions = {}
): { width: number; height: number; success: boolean; error?: string } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const trimmed = input.trim();

  // Try splitting by 'x' first, then comma/space
  let parts: string[];
  if (trimmed.toLowerCase().includes('x')) {
    parts = trimmed.toLowerCase().split('x').map(p => p.trim());
  } else {
    parts = trimmed.split(/[,\s]+/).filter(p => p.length > 0);
  }

  if (parts.length === 0) {
    return { width: 0, height: 0, success: false, error: 'No values found' };
  }

  if (parts.length === 1) {
    const value = parseValue(parts[0]!, opts);
    if (value === null) {
      return { width: 0, height: 0, success: false, error: `Invalid value: ${parts[0]}` };
    }
    return { width: value, height: value, success: true };
  }

  const width = parseValue(parts[0]!, opts);
  const height = parseValue(parts[1]!, opts);

  if (width === null || height === null) {
    return { width: 0, height: 0, success: false, error: `Invalid values: ${parts[0]}, ${parts[1]}` };
  }

  return { width, height, success: true };
}
