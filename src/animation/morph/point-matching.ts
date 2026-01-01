/**
 * Point Matching
 *
 * Matches points between source and target paths for smooth morphing.
 * Uses various heuristics to find optimal point correspondence.
 */

import type { VectorPath, PathCommand } from '@core/types/geometry';

/**
 * A point extracted from a path with its index.
 */
export interface PathPoint {
  /** X coordinate */
  readonly x: number;
  /** Y coordinate */
  readonly y: number;
  /** Index in the original path commands */
  readonly commandIndex: number;
  /** Parameter along the segment (0-1) for subdivided points */
  readonly t: number;
  /** Original command type */
  readonly commandType: PathCommand['type'];
}

/**
 * Point mapping from source to target.
 */
export interface PointMapping {
  /** Source point index */
  readonly sourceIndex: number;
  /** Target point index */
  readonly targetIndex: number;
  /** Mapping quality (0-1) */
  readonly quality: number;
}

/**
 * Result of point matching.
 */
export interface MatchingResult {
  /** Point mappings */
  readonly mappings: readonly PointMapping[];
  /** Source points (possibly reordered) */
  readonly sourcePoints: readonly PathPoint[];
  /** Target points (possibly reordered) */
  readonly targetPoints: readonly PathPoint[];
  /** Starting index rotation for source */
  readonly sourceRotation: number;
  /** Starting index rotation for target */
  readonly targetRotation: number;
  /** Whether direction was reversed */
  readonly reversed: boolean;
}

/**
 * Options for point matching.
 */
export interface MatchingOptions {
  /** Try rotating start point for better match (default: true) */
  readonly tryRotation?: boolean;
  /** Try reversing direction for better match (default: true) */
  readonly tryReverse?: boolean;
}

const DEFAULT_OPTIONS: Required<MatchingOptions> = {
  tryRotation: true,
  tryReverse: true,
};

/**
 * Extract points from a path.
 */
export function extractPoints(path: VectorPath): PathPoint[] {
  const points: PathPoint[] = [];

  for (let i = 0; i < path.commands.length; i++) {
    const cmd = path.commands[i]!;

    if (cmd.type === 'Z') continue;

    points.push({
      x: cmd.x,
      y: cmd.y,
      commandIndex: i,
      t: 1,
      commandType: cmd.type,
    });
  }

  return points;
}

/**
 * Match points between source and target paths.
 * Both paths should have the same number of points.
 */
export function matchPoints(
  sourcePoints: readonly PathPoint[],
  targetPoints: readonly PathPoint[],
  options: MatchingOptions = {}
): MatchingResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (sourcePoints.length !== targetPoints.length) {
    throw new Error('Source and target must have same number of points');
  }

  if (sourcePoints.length === 0) {
    return {
      mappings: [],
      sourcePoints: [],
      targetPoints: [],
      sourceRotation: 0,
      targetRotation: 0,
      reversed: false,
    };
  }

  // Find best rotation and direction
  let bestResult: MatchingResult | null = null;
  let bestScore = Infinity;

  // Try each rotation of target
  const rotationsToTry = opts.tryRotation ? sourcePoints.length : 1;

  for (let rotation = 0; rotation < rotationsToTry; rotation++) {
    // Try normal direction
    const normalResult = createMapping(
      sourcePoints,
      targetPoints,
      rotation,
      false
    );
    const normalScore = calculateMappingScore(normalResult);

    if (normalScore < bestScore) {
      bestScore = normalScore;
      bestResult = normalResult;
    }

    // Try reversed direction
    if (opts.tryReverse) {
      const reversedResult = createMapping(
        sourcePoints,
        targetPoints,
        rotation,
        true
      );
      const reversedScore = calculateMappingScore(reversedResult);

      if (reversedScore < bestScore) {
        bestScore = reversedScore;
        bestResult = reversedResult;
      }
    }
  }

  return bestResult!;
}

/**
 * Create a point mapping with given rotation and direction.
 */
function createMapping(
  sourcePoints: readonly PathPoint[],
  targetPoints: readonly PathPoint[],
  rotation: number,
  reversed: boolean
): MatchingResult {
  const n = sourcePoints.length;
  const mappings: PointMapping[] = [];
  const reorderedTarget: PathPoint[] = [];

  for (let i = 0; i < n; i++) {
    // Calculate target index based on rotation and direction
    let targetIdx: number;
    if (reversed) {
      targetIdx = (rotation - i + n) % n;
    } else {
      targetIdx = (rotation + i) % n;
    }

    reorderedTarget.push(targetPoints[targetIdx]!);

    const quality = calculatePointQuality(
      sourcePoints[i]!,
      targetPoints[targetIdx]!
    );

    mappings.push({
      sourceIndex: i,
      targetIndex: targetIdx,
      quality,
    });
  }

  return {
    mappings,
    sourcePoints,
    targetPoints: reorderedTarget,
    sourceRotation: 0,
    targetRotation: rotation,
    reversed,
  };
}

/**
 * Calculate quality score for a single point mapping.
 */
function calculatePointQuality(source: PathPoint, target: PathPoint): number {
  const dx = source.x - target.x;
  const dy = source.y - target.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Normalize by assuming 1000px is a "large" distance
  return Math.max(0, 1 - distance / 1000);
}

/**
 * Calculate overall score for a mapping (lower is better).
 */
function calculateMappingScore(result: MatchingResult): number {
  let totalDistance = 0;

  for (let i = 0; i < result.sourcePoints.length; i++) {
    const source = result.sourcePoints[i]!;
    const target = result.targetPoints[i]!;

    const dx = source.x - target.x;
    const dy = source.y - target.y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }

  return totalDistance;
}

/**
 * Subdivide a path segment to add more points.
 */
export function subdivideSegment(
  start: PathPoint,
  end: PathPoint,
  command: PathCommand,
  divisions: number
): PathPoint[] {
  const points: PathPoint[] = [];

  for (let i = 1; i <= divisions; i++) {
    const t = i / (divisions + 1);
    const point = interpolateCommand(start, command, t);
    points.push({
      ...point,
      commandIndex: end.commandIndex,
      t,
      commandType: command.type,
    });
  }

  return points;
}

/**
 * Interpolate along a path command.
 */
function interpolateCommand(
  start: PathPoint,
  command: PathCommand,
  t: number
): { x: number; y: number } {
  switch (command.type) {
    case 'L':
    case 'M':
      // Linear interpolation
      return {
        x: start.x + (command.x - start.x) * t,
        y: start.y + (command.y - start.y) * t,
      };

    case 'C': {
      // Cubic bezier interpolation
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;
      return {
        x: mt3 * start.x +
           3 * mt2 * t * command.x1 +
           3 * mt * t2 * command.x2 +
           t3 * command.x,
        y: mt3 * start.y +
           3 * mt2 * t * command.y1 +
           3 * mt * t2 * command.y2 +
           t3 * command.y,
      };
    }

    case 'Z':
      // Close path - return start point
      return { x: start.x, y: start.y };

    default:
      return { x: start.x, y: start.y };
  }
}

/**
 * Add points to a path to reach a target count.
 */
export function addPointsToPath(
  path: VectorPath,
  targetCount: number
): VectorPath {
  const currentPoints = extractPoints(path);
  const currentCount = currentPoints.length;

  if (currentCount >= targetCount) {
    return path;
  }

  const pointsToAdd = targetCount - currentCount;
  const newCommands: PathCommand[] = [];

  // Distribute new points evenly across segments
  const segmentCount = Math.max(1, currentCount - 1);
  const pointsPerSegment = Math.floor(pointsToAdd / segmentCount);
  let remainder = pointsToAdd % segmentCount;

  let prevPoint: PathPoint | null = null;

  for (let i = 0; i < path.commands.length; i++) {
    const cmd = path.commands[i]!;

    if (cmd.type === 'M') {
      newCommands.push(cmd);
      prevPoint = {
        x: cmd.x,
        y: cmd.y,
        commandIndex: i,
        t: 1,
        commandType: 'M',
      };
      continue;
    }

    if (cmd.type === 'Z') {
      newCommands.push(cmd);
      continue;
    }

    // Add subdivided points for this segment
    const subdivisionsHere = pointsPerSegment + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    if (subdivisionsHere > 0 && prevPoint) {
      const endPoint: PathPoint = {
        x: cmd.x,
        y: cmd.y,
        commandIndex: i,
        t: 1,
        commandType: cmd.type,
      };
      const subdivided = subdivideSegment(prevPoint, endPoint, cmd, subdivisionsHere);

      // Convert subdivided points to line commands
      for (const pt of subdivided) {
        newCommands.push({ type: 'L', x: pt.x, y: pt.y });
      }
    }

    // Add the original endpoint
    newCommands.push(cmd);
    prevPoint = {
      x: cmd.x,
      y: cmd.y,
      commandIndex: i,
      t: 1,
      commandType: cmd.type,
    };
  }

  return {
    commands: newCommands,
    windingRule: path.windingRule,
  };
}

/**
 * Normalize paths to have the same number of points.
 */
export function normalizePathPoints(
  sourcePath: VectorPath,
  targetPath: VectorPath
): { source: VectorPath; target: VectorPath } {
  const sourceCount = extractPoints(sourcePath).length;
  const targetCount = extractPoints(targetPath).length;

  if (sourceCount === targetCount) {
    return { source: sourcePath, target: targetPath };
  }

  const targetPointCount = Math.max(sourceCount, targetCount);

  return {
    source: addPointsToPath(sourcePath, targetPointCount),
    target: addPointsToPath(targetPath, targetPointCount),
  };
}
