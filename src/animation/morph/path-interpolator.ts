/**
 * Path Interpolator
 *
 * Interpolates between source and target vector paths for shape morphing.
 * Produces intermediate paths for smooth transitions.
 */

import type { VectorPath, PathCommand } from '@core/types/geometry';
import type { EasingFunction } from '../types/easing';
import { extractPoints, matchPoints, normalizePathPoints } from './point-matching';
import { checkCompatibility } from './path-compatibility';
import type { PathPoint, MatchingResult } from './point-matching';

/**
 * Prepared path morph transition.
 */
export interface PathMorphTransition {
  /** Normalized source path */
  readonly sourcePath: VectorPath;
  /** Normalized target path */
  readonly targetPath: VectorPath;
  /** Source points */
  readonly sourcePoints: readonly PathPoint[];
  /** Target points (reordered for best match) */
  readonly targetPoints: readonly PathPoint[];
  /** Point matching result */
  readonly matching: MatchingResult;
  /** Whether paths are compatible */
  readonly isCompatible: boolean;
  /** Interpolate at progress (0-1) */
  interpolate(t: number): VectorPath;
}

/**
 * Options for path morphing.
 */
export interface MorphOptions {
  /** Easing function */
  readonly easing?: EasingFunction;
  /** Maximum point difference allowed */
  readonly maxPointDifference?: number;
  /** Allow open to closed path morphing */
  readonly allowOpenClosedMismatch?: boolean;
}

const DEFAULT_OPTIONS: Required<MorphOptions> = {
  easing: (t) => t,
  maxPointDifference: 50,
  allowOpenClosedMismatch: false,
};

/**
 * Prepare a path morph transition.
 */
export function prepareMorph(
  sourcePath: VectorPath,
  targetPath: VectorPath,
  options: MorphOptions = {}
): PathMorphTransition {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check compatibility
  const compatibility = checkCompatibility(sourcePath, targetPath, {
    maxPointDifference: opts.maxPointDifference,
    allowOpenClosedMismatch: opts.allowOpenClosedMismatch,
  });

  if (!compatibility.canMorph) {
    // Return a non-morphing transition (snap at 50%)
    return createSnapTransition(sourcePath, targetPath);
  }

  // Normalize paths to have same point count
  const { source: normalizedSource, target: normalizedTarget } = normalizePathPoints(
    sourcePath,
    targetPath
  );

  // Extract and match points
  const sourcePoints = extractPoints(normalizedSource);
  const targetPoints = extractPoints(normalizedTarget);
  const matching = matchPoints(sourcePoints, targetPoints);

  // Create interpolation function
  const interpolate = (t: number): VectorPath => {
    const easedT = opts.easing(Math.max(0, Math.min(1, t)));
    return interpolatePaths(normalizedSource, normalizedTarget, matching, easedT);
  };

  return {
    sourcePath: normalizedSource,
    targetPath: normalizedTarget,
    sourcePoints,
    targetPoints: matching.targetPoints,
    matching,
    isCompatible: true,
    interpolate,
  };
}

/**
 * Create a snap transition for incompatible paths.
 */
function createSnapTransition(
  sourcePath: VectorPath,
  targetPath: VectorPath
): PathMorphTransition {
  const sourcePoints = extractPoints(sourcePath);
  const targetPoints = extractPoints(targetPath);

  return {
    sourcePath,
    targetPath,
    sourcePoints,
    targetPoints,
    matching: {
      mappings: [],
      sourcePoints,
      targetPoints,
      sourceRotation: 0,
      targetRotation: 0,
      reversed: false,
    },
    isCompatible: false,
    interpolate: (t: number) => (t < 0.5 ? sourcePath : targetPath),
  };
}

/**
 * Interpolate between two paths at a given progress.
 */
function interpolatePaths(
  sourcePath: VectorPath,
  targetPath: VectorPath,
  matching: MatchingResult,
  t: number
): VectorPath {
  // Handle edge cases
  if (t <= 0) return sourcePath;
  if (t >= 1) return targetPath;

  const sourceCommands = sourcePath.commands;
  const targetCommands = targetPath.commands;

  // Create interpolated commands
  const commands: PathCommand[] = [];
  let matchIndex = 0;

  for (let i = 0; i < sourceCommands.length; i++) {
    const sourceCmd = sourceCommands[i]!;
    const targetCmd = getTargetCommand(targetCommands, matching, matchIndex, i);

    if (sourceCmd.type === 'Z') {
      commands.push({ type: 'Z' });
      continue;
    }

    const interpolatedCmd = interpolateCommand(sourceCmd, targetCmd, t);
    commands.push(interpolatedCmd);
    matchIndex++;
  }

  return {
    commands,
    windingRule: sourcePath.windingRule,
  };
}

/**
 * Get the corresponding target command for a source command.
 */
function getTargetCommand(
  targetCommands: readonly PathCommand[],
  matching: MatchingResult,
  matchIndex: number,
  commandIndex: number
): PathCommand {
  // For Z commands, return Z
  if (commandIndex >= targetCommands.length) {
    return { type: 'Z' };
  }

  // Use matching to get reordered target point
  if (matchIndex < matching.targetPoints.length) {
    const targetPoint = matching.targetPoints[matchIndex]!;
    const targetCmd = targetCommands[targetPoint.commandIndex];
    if (targetCmd) return targetCmd;
  }

  return targetCommands[commandIndex] ?? { type: 'L', x: 0, y: 0 };
}

/**
 * Interpolate between two commands.
 */
function interpolateCommand(
  source: PathCommand,
  target: PathCommand,
  t: number
): PathCommand {
  // Handle Z commands
  if (source.type === 'Z' || target.type === 'Z') {
    return { type: 'Z' };
  }

  // Handle different command types by upgrading to the more complex one
  const type = getInterpolatedCommandType(source.type, target.type);

  switch (type) {
    case 'M':
      return {
        type: 'M',
        x: lerp(source.x, target.x, t),
        y: lerp(source.y, target.y, t),
      };

    case 'L':
      return {
        type: 'L',
        x: lerp(source.x, target.x, t),
        y: lerp(source.y, target.y, t),
      };

    case 'C': {
      const sourceC = upgradeToCubic(source);
      const targetC = upgradeToCubic(target);
      return {
        type: 'C',
        x1: lerp(sourceC.x1, targetC.x1, t),
        y1: lerp(sourceC.y1, targetC.y1, t),
        x2: lerp(sourceC.x2, targetC.x2, t),
        y2: lerp(sourceC.y2, targetC.y2, t),
        x: lerp(sourceC.x, targetC.x, t),
        y: lerp(sourceC.y, targetC.y, t),
      };
    }

    default:
      return {
        type: 'L',
        x: lerp(source.x, target.x, t),
        y: lerp(source.y, target.y, t),
      };
  }
}

/**
 * Determine the interpolated command type (upgrade to more complex if needed).
 */
function getInterpolatedCommandType(
  sourceType: PathCommand['type'],
  targetType: PathCommand['type']
): 'M' | 'L' | 'C' {
  if (sourceType === 'C' || targetType === 'C') {
    return 'C';
  }
  if (sourceType === 'L' || targetType === 'L') {
    return 'L';
  }
  return 'M';
}

/**
 * Upgrade a command to cubic bezier.
 */
function upgradeToCubic(
  cmd: PathCommand
): { x1: number; y1: number; x2: number; y2: number; x: number; y: number } {
  if (cmd.type === 'C') {
    return {
      x1: cmd.x1,
      y1: cmd.y1,
      x2: cmd.x2,
      y2: cmd.y2,
      x: cmd.x,
      y: cmd.y,
    };
  }
  if (cmd.type === 'Z') {
    // Z doesn't have coordinates, shouldn't get here
    return { x1: 0, y1: 0, x2: 0, y2: 0, x: 0, y: 0 };
  }
  // Line or Move - control points at endpoints
  return {
    x1: cmd.x,
    y1: cmd.y,
    x2: cmd.x,
    y2: cmd.y,
    x: cmd.x,
    y: cmd.y,
  };
}

/**
 * Linear interpolation.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate multiple paths (for multi-path shapes).
 */
export function interpolatePathArrays(
  sourcePaths: readonly VectorPath[],
  targetPaths: readonly VectorPath[],
  t: number,
  options: MorphOptions = {}
): VectorPath[] {
  const maxLength = Math.max(sourcePaths.length, targetPaths.length);
  const result: VectorPath[] = [];

  for (let i = 0; i < maxLength; i++) {
    const sourcePath = sourcePaths[i];
    const targetPath = targetPaths[i];

    if (sourcePath && targetPath) {
      // Both exist, morph between them
      const transition = prepareMorph(sourcePath, targetPath, options);
      result.push(transition.interpolate(t));
    } else if (sourcePath) {
      // Only source exists, fade out
      if (t < 0.5) {
        result.push(sourcePath);
      }
      // After 0.5, path disappears
    } else if (targetPath) {
      // Only target exists, fade in
      if (t >= 0.5) {
        result.push(targetPath);
      }
      // Before 0.5, path doesn't exist
    }
  }

  return result;
}

/**
 * Create a morph animation function for use with animation system.
 */
export function createMorphAnimator(
  sourcePaths: readonly VectorPath[],
  targetPaths: readonly VectorPath[],
  options: MorphOptions = {}
): (t: number) => VectorPath[] {
  // Prepare all transitions upfront
  const transitions: PathMorphTransition[] = [];
  const maxLength = Math.max(sourcePaths.length, targetPaths.length);

  for (let i = 0; i < maxLength; i++) {
    const sourcePath = sourcePaths[i];
    const targetPath = targetPaths[i];

    if (sourcePath && targetPath) {
      transitions.push(prepareMorph(sourcePath, targetPath, options));
    }
  }

  return (t: number): VectorPath[] => {
    const result: VectorPath[] = [];

    for (let i = 0; i < maxLength; i++) {
      const sourcePath = sourcePaths[i];
      const targetPath = targetPaths[i];
      const transition = transitions[i];

      if (transition) {
        result.push(transition.interpolate(t));
      } else if (sourcePath && !targetPath) {
        if (t < 0.5) result.push(sourcePath);
      } else if (!sourcePath && targetPath) {
        if (t >= 0.5) result.push(targetPath);
      }
    }

    return result;
  };
}
