/**
 * Text Along Path Renderer
 *
 * Renders text that follows a path curve.
 */

import type { Point } from '@core/types/geometry';
import type { TextAlongPathData } from '@core/types/text-style';
import { applyTextTransform } from '@core/types/text-style';

/**
 * Point on path with tangent angle
 */
interface PathPoint {
  x: number;
  y: number;
  angle: number; // radians
}

/**
 * Render text along a path
 */
export function renderTextAlongPath(
  ctx: CanvasRenderingContext2D,
  data: TextAlongPathData
): void {
  const {
    content,
    style,
    pathData,
    startOffset,
    characterSpacing,
    stretchToFit,
    alignToPath,
    direction,
  } = data;

  // Parse path and sample points
  const pathPoints = samplePath(pathData, 500);
  if (pathPoints.length < 2) return;

  // Calculate total path length
  const pathLength = calculatePathLength(pathPoints);

  // Apply text transform
  const transformedText = applyTextTransform(content, style.textTransform);
  const characters = transformedText.split('');

  if (characters.length === 0) return;

  // Measure each character
  ctx.save();
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;

  const charWidths: number[] = [];
  let totalTextWidth = 0;

  for (const char of characters) {
    const width = ctx.measureText(char).width * characterSpacing;
    charWidths.push(width);
    totalTextWidth += width;
  }

  // Calculate starting position
  let currentDistance = startOffset * pathLength;

  // If stretching to fit, adjust character spacing
  let adjustedWidths = charWidths;
  if (stretchToFit && totalTextWidth > 0) {
    const availableLength = pathLength * (1 - startOffset);
    const scale = availableLength / totalTextWidth;
    adjustedWidths = charWidths.map(w => w * scale);
  }

  // Handle direction
  const orderedChars = direction === 'reverse' ? characters.slice().reverse() : characters;
  const orderedWidths = direction === 'reverse' ? adjustedWidths.slice().reverse() : adjustedWidths;

  // Set text style
  ctx.fillStyle = rgbaToString(style.color);
  ctx.textAlign = 'center';
  ctx.textBaseline = alignToPath === 'top' ? 'bottom' : alignToPath === 'bottom' ? 'top' : 'middle';

  if (style.strokeColor && style.strokeWidth) {
    ctx.strokeStyle = rgbaToString(style.strokeColor);
    ctx.lineWidth = style.strokeWidth;
  }

  // Render each character
  for (let i = 0; i < orderedChars.length; i++) {
    const char = orderedChars[i]!;
    const charWidth = orderedWidths[i]!;

    // Position at center of character
    const charCenter = currentDistance + charWidth / 2;

    // Get point and angle at this distance
    const point = getPointAtDistance(pathPoints, charCenter, pathLength);
    if (!point) continue;

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(direction === 'reverse' ? point.angle + Math.PI : point.angle);

    // Draw character
    if (style.strokeColor && style.strokeWidth) {
      ctx.strokeText(char, 0, 0);
    }
    ctx.fillText(char, 0, 0);

    ctx.restore();

    currentDistance += charWidth;
  }

  ctx.restore();
}

/**
 * Sample points along an SVG path
 */
function samplePath(pathData: string, numSamples: number): PathPoint[] {
  // Create path samples from parsed commands

  // For now, use a simple linear approximation
  // In a full implementation, we'd parse the path properly
  const points: PathPoint[] = [];

  // Parse path data to extract control points
  const commands = parsePathCommands(pathData);
  if (commands.length === 0) return points;

  // Generate samples along the path
  const segments = segmentizePath(commands);

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const point = interpolateSegments(segments, t);
    if (point) {
      points.push(point);
    }
  }

  return points;
}

/**
 * Path command types
 */
interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  points: Point[];
}

/**
 * Parse SVG path data into commands
 */
function parsePathCommands(pathData: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const regex = /([MLCQZ])\s*([^MLCQZ]*)/gi;
  let match;

  while ((match = regex.exec(pathData)) !== null) {
    const type = match[1]!.toUpperCase() as 'M' | 'L' | 'C' | 'Q' | 'Z';
    const args = match[2]!.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

    const points: Point[] = [];
    for (let i = 0; i < args.length; i += 2) {
      if (i + 1 < args.length) {
        points.push({ x: args[i]!, y: args[i + 1]! });
      }
    }

    commands.push({ type, points });
  }

  return commands;
}

/**
 * Segment with start and end points
 */
interface PathSegment {
  type: 'line' | 'cubic' | 'quadratic';
  start: Point;
  end: Point;
  control1?: Point;
  control2?: Point;
  length: number;
}

/**
 * Convert path commands to segments
 */
function segmentizePath(commands: PathCommand[]): PathSegment[] {
  const segments: PathSegment[] = [];
  let currentPoint: Point = { x: 0, y: 0 };
  let startPoint: Point = { x: 0, y: 0 };

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        if (cmd.points.length > 0) {
          currentPoint = cmd.points[0]!;
          startPoint = currentPoint;
        }
        break;

      case 'L':
        for (const point of cmd.points) {
          const length = distance(currentPoint, point);
          segments.push({
            type: 'line',
            start: currentPoint,
            end: point,
            length,
          });
          currentPoint = point;
        }
        break;

      case 'C':
        // Cubic bezier: 3 points per curve (cp1, cp2, end)
        for (let i = 0; i < cmd.points.length; i += 3) {
          if (i + 2 < cmd.points.length) {
            const cp1 = cmd.points[i]!;
            const cp2 = cmd.points[i + 1]!;
            const end = cmd.points[i + 2]!;
            const length = approximateCubicLength(currentPoint, cp1, cp2, end);
            segments.push({
              type: 'cubic',
              start: currentPoint,
              end,
              control1: cp1,
              control2: cp2,
              length,
            });
            currentPoint = end;
          }
        }
        break;

      case 'Q':
        // Quadratic bezier: 2 points per curve (cp, end)
        for (let i = 0; i < cmd.points.length; i += 2) {
          if (i + 1 < cmd.points.length) {
            const cp = cmd.points[i]!;
            const end = cmd.points[i + 1]!;
            const length = approximateQuadraticLength(currentPoint, cp, end);
            segments.push({
              type: 'quadratic',
              start: currentPoint,
              end,
              control1: cp,
              length,
            });
            currentPoint = end;
          }
        }
        break;

      case 'Z':
        if (currentPoint.x !== startPoint.x || currentPoint.y !== startPoint.y) {
          const length = distance(currentPoint, startPoint);
          segments.push({
            type: 'line',
            start: currentPoint,
            end: startPoint,
            length,
          });
          currentPoint = startPoint;
        }
        break;
    }
  }

  return segments;
}

/**
 * Interpolate point along segments at parameter t (0-1)
 */
function interpolateSegments(segments: PathSegment[], t: number): PathPoint | null {
  if (segments.length === 0) return null;

  // Calculate total length
  const totalLength = segments.reduce((sum, s) => sum + s.length, 0);
  const targetLength = t * totalLength;

  // Find segment at this distance
  let accumulatedLength = 0;
  for (const segment of segments) {
    if (accumulatedLength + segment.length >= targetLength) {
      // Found the segment
      const localT = (targetLength - accumulatedLength) / segment.length;
      return interpolateSegment(segment, localT);
    }
    accumulatedLength += segment.length;
  }

  // Return last point
  const lastSegment = segments[segments.length - 1]!;
  return {
    x: lastSegment.end.x,
    y: lastSegment.end.y,
    angle: Math.atan2(
      lastSegment.end.y - lastSegment.start.y,
      lastSegment.end.x - lastSegment.start.x
    ),
  };
}

/**
 * Interpolate within a single segment
 */
function interpolateSegment(segment: PathSegment, t: number): PathPoint {
  let point: Point;
  let tangent: Point;

  switch (segment.type) {
    case 'line':
      point = {
        x: segment.start.x + (segment.end.x - segment.start.x) * t,
        y: segment.start.y + (segment.end.y - segment.start.y) * t,
      };
      tangent = {
        x: segment.end.x - segment.start.x,
        y: segment.end.y - segment.start.y,
      };
      break;

    case 'cubic':
      point = cubicBezierPoint(segment.start, segment.control1!, segment.control2!, segment.end, t);
      tangent = cubicBezierTangent(segment.start, segment.control1!, segment.control2!, segment.end, t);
      break;

    case 'quadratic':
      point = quadraticBezierPoint(segment.start, segment.control1!, segment.end, t);
      tangent = quadraticBezierTangent(segment.start, segment.control1!, segment.end, t);
      break;
  }

  return {
    x: point.x,
    y: point.y,
    angle: Math.atan2(tangent.y, tangent.x),
  };
}

// ============================================================================
// Bezier Math
// ============================================================================

function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

function cubicBezierTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  };
}

function quadraticBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: mt2 * p0.x + 2 * mt * t * p1.x + t2 * p2.x,
    y: mt2 * p0.y + 2 * mt * t * p1.y + t2 * p2.y,
  };
}

function quadraticBezierTangent(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;

  return {
    x: 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

function approximateCubicLength(p0: Point, p1: Point, p2: Point, p3: Point, samples: number = 20): number {
  let length = 0;
  let prevPoint = p0;

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const point = cubicBezierPoint(p0, p1, p2, p3, t);
    length += distance(prevPoint, point);
    prevPoint = point;
  }

  return length;
}

function approximateQuadraticLength(p0: Point, p1: Point, p2: Point, samples: number = 20): number {
  let length = 0;
  let prevPoint = p0;

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const point = quadraticBezierPoint(p0, p1, p2, t);
    length += distance(prevPoint, point);
    prevPoint = point;
  }

  return length;
}

// ============================================================================
// Utility Functions
// ============================================================================

function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculatePathLength(points: PathPoint[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1]!, points[i]!);
  }
  return length;
}

function getPointAtDistance(
  points: PathPoint[],
  targetDistance: number,
  _totalLength: number
): PathPoint | null {
  if (points.length < 2) return null;

  let accumulatedLength = 0;
  for (let i = 1; i < points.length; i++) {
    const segmentLength = distance(points[i - 1]!, points[i]!);

    if (accumulatedLength + segmentLength >= targetDistance) {
      const t = (targetDistance - accumulatedLength) / segmentLength;
      const p0 = points[i - 1]!;
      const p1 = points[i]!;

      return {
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
        angle: Math.atan2(p1.y - p0.y, p1.x - p0.x),
      };
    }

    accumulatedLength += segmentLength;
  }

  // Return last point if past end
  return points[points.length - 1] ?? null;
}

function rgbaToString(color: { r: number; g: number; b: number; a: number }): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${color.a})`;
}
