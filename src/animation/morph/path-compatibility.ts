/**
 * Path Compatibility
 *
 * Checks if two paths are compatible for morphing and provides
 * information about how to make them compatible.
 */

import type { VectorPath, PathCommand } from '@core/types/geometry';

/**
 * Compatibility level for path morphing.
 */
export type CompatibilityLevel =
  | 'direct'      // Same point count, can morph directly
  | 'subdivide'   // Different point count, needs subdivision
  | 'incompatible'; // Too different to morph

/**
 * Result of compatibility check.
 */
export interface CompatibilityResult {
  /** Compatibility level */
  readonly level: CompatibilityLevel;
  /** Whether paths can be morphed */
  readonly canMorph: boolean;
  /** Source path point count */
  readonly sourcePoints: number;
  /** Target path point count */
  readonly targetPoints: number;
  /** Point difference */
  readonly pointDifference: number;
  /** Recommended subdivisions for source */
  readonly sourceSubdivisions: number;
  /** Recommended subdivisions for target */
  readonly targetSubdivisions: number;
  /** Reason if incompatible */
  readonly reason?: string;
}

/**
 * Options for compatibility check.
 */
export interface CompatibilityOptions {
  /** Maximum point difference allowed for subdivision (default: 50) */
  readonly maxPointDifference?: number;
  /** Whether to allow open/closed path mismatch (default: false) */
  readonly allowOpenClosedMismatch?: boolean;
}

const DEFAULT_OPTIONS: Required<CompatibilityOptions> = {
  maxPointDifference: 50,
  allowOpenClosedMismatch: false,
};

/**
 * Check if two paths are compatible for morphing.
 */
export function checkCompatibility(
  sourcePath: VectorPath,
  targetPath: VectorPath,
  options: CompatibilityOptions = {}
): CompatibilityResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const sourcePoints = countPoints(sourcePath);
  const targetPoints = countPoints(targetPath);
  const pointDifference = Math.abs(sourcePoints - targetPoints);

  // Check for closed path mismatch
  const sourceIsClosed = isClosedPath(sourcePath);
  const targetIsClosed = isClosedPath(targetPath);

  if (!opts.allowOpenClosedMismatch && sourceIsClosed !== targetIsClosed) {
    return {
      level: 'incompatible',
      canMorph: false,
      sourcePoints,
      targetPoints,
      pointDifference,
      sourceSubdivisions: 0,
      targetSubdivisions: 0,
      reason: 'Cannot morph between open and closed paths',
    };
  }

  // Check for empty paths
  if (sourcePoints === 0 || targetPoints === 0) {
    return {
      level: 'incompatible',
      canMorph: false,
      sourcePoints,
      targetPoints,
      pointDifference,
      sourceSubdivisions: 0,
      targetSubdivisions: 0,
      reason: 'Cannot morph empty paths',
    };
  }

  // Direct compatibility
  if (sourcePoints === targetPoints) {
    return {
      level: 'direct',
      canMorph: true,
      sourcePoints,
      targetPoints,
      pointDifference: 0,
      sourceSubdivisions: 0,
      targetSubdivisions: 0,
    };
  }

  // Check if subdivision is feasible
  if (pointDifference > opts.maxPointDifference) {
    return {
      level: 'incompatible',
      canMorph: false,
      sourcePoints,
      targetPoints,
      pointDifference,
      sourceSubdivisions: 0,
      targetSubdivisions: 0,
      reason: `Point difference (${pointDifference}) exceeds maximum (${opts.maxPointDifference})`,
    };
  }

  // Calculate subdivisions needed
  const { sourceSubdivisions, targetSubdivisions } = calculateSubdivisions(
    sourcePoints,
    targetPoints
  );

  return {
    level: 'subdivide',
    canMorph: true,
    sourcePoints,
    targetPoints,
    pointDifference,
    sourceSubdivisions,
    targetSubdivisions,
  };
}

/**
 * Count the number of points in a path.
 */
export function countPoints(path: VectorPath): number {
  let count = 0;

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
      case 'L':
        count += 1;
        break;
      case 'C':
        count += 1; // End point
        break;
      case 'Z':
        // Close doesn't add a point
        break;
    }
  }

  return count;
}

/**
 * Check if a path is closed.
 */
export function isClosedPath(path: VectorPath): boolean {
  const lastCmd = path.commands[path.commands.length - 1];
  return lastCmd?.type === 'Z';
}

/**
 * Get the winding direction of a closed path.
 * Returns 1 for clockwise, -1 for counter-clockwise.
 */
export function getWindingDirection(path: VectorPath): number {
  // Calculate signed area using shoelace formula
  let area = 0;
  let prevX = 0;
  let prevY = 0;
  let firstX = 0;
  let firstY = 0;
  let hasFirst = false;

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      if (hasFirst) {
        // Close previous subpath
        area += prevX * firstY - firstX * prevY;
      }
      firstX = cmd.x;
      firstY = cmd.y;
      prevX = cmd.x;
      prevY = cmd.y;
      hasFirst = true;
    } else if (cmd.type === 'L' || cmd.type === 'C') {
      area += prevX * cmd.y - cmd.x * prevY;
      prevX = cmd.x;
      prevY = cmd.y;
    } else if (cmd.type === 'Z') {
      area += prevX * firstY - firstX * prevY;
    }
  }

  return area >= 0 ? 1 : -1;
}

/**
 * Calculate the number of subdivisions needed for each path.
 */
function calculateSubdivisions(
  sourcePoints: number,
  targetPoints: number
): { sourceSubdivisions: number; targetSubdivisions: number } {
  if (sourcePoints === targetPoints) {
    return { sourceSubdivisions: 0, targetSubdivisions: 0 };
  }

  // Find LCM or just match to the larger count
  const targetCount = Math.max(sourcePoints, targetPoints);

  return {
    sourceSubdivisions: targetCount - sourcePoints,
    targetSubdivisions: targetCount - targetPoints,
  };
}

/**
 * Get command types present in a path.
 */
export function getCommandTypes(path: VectorPath): Set<PathCommand['type']> {
  const types = new Set<PathCommand['type']>();
  for (const cmd of path.commands) {
    types.add(cmd.type);
  }
  return types;
}

/**
 * Check if paths have compatible command types.
 * For best morphing, both should use the same curve types.
 */
export function hasCompatibleCommands(
  sourcePath: VectorPath,
  targetPath: VectorPath
): boolean {
  const sourceTypes = getCommandTypes(sourcePath);
  const targetTypes = getCommandTypes(targetPath);

  // Check if both have curves or neither
  const sourceHasCurves = sourceTypes.has('C');
  const targetHasCurves = targetTypes.has('C');

  // It's okay to morph lines to curves, but prefer matching types
  return sourceHasCurves === targetHasCurves;
}

/**
 * Get the bounds of a path.
 */
export function getPathBounds(path: VectorPath): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const cmd of path.commands) {
    if (cmd.type === 'Z') continue;

    minX = Math.min(minX, cmd.x);
    minY = Math.min(minY, cmd.y);
    maxX = Math.max(maxX, cmd.x);
    maxY = Math.max(maxY, cmd.y);

    if (cmd.type === 'C') {
      minX = Math.min(minX, cmd.x1, cmd.x2);
      minY = Math.min(minY, cmd.y1, cmd.y2);
      maxX = Math.max(maxX, cmd.x1, cmd.x2);
      maxY = Math.max(maxY, cmd.y1, cmd.y2);
    }
  }

  return {
    minX: minX === Infinity ? 0 : minX,
    minY: minY === Infinity ? 0 : minY,
    maxX: maxX === -Infinity ? 0 : maxX,
    maxY: maxY === -Infinity ? 0 : maxY,
    width: maxX === -Infinity ? 0 : maxX - minX,
    height: maxY === -Infinity ? 0 : maxY - minY,
  };
}
