/**
 * Hatch Renderer
 *
 * Renders hatch patterns within bounded regions.
 * Supports ANSI/ISO patterns and custom patterns.
 */

import type { Point, Rect } from '@core/types/geometry';
import type { RGBA } from '@core/types/color';
import {
  type HatchPattern,
  type HatchFill,
  type HatchBoundary,
  getHatchPattern,
} from '@core/types/hatch';

/**
 * Hatch renderer options
 */
export interface HatchRendererOptions {
  /** Anti-alias lines */
  readonly antiAlias?: boolean;
  /** Minimum line length to render */
  readonly minLineLength?: number;
  /** Maximum lines to generate (performance limit) */
  readonly maxLines?: number;
}

const DEFAULT_OPTIONS: Required<HatchRendererOptions> = {
  antiAlias: true,
  minLineLength: 1,
  maxLines: 10000,
};

/**
 * Render a hatch pattern within a rectangular bounds
 */
export function renderHatchInRect(
  ctx: CanvasRenderingContext2D,
  bounds: Rect,
  fill: HatchFill,
  options: HatchRendererOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const pattern = getHatchPattern(fill.pattern);

  if (!pattern) {
    // Fallback to solid fill if pattern not found
    ctx.fillStyle = rgbaToString(fill.color);
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    return;
  }

  ctx.save();

  // Set up clipping region
  ctx.beginPath();
  ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.clip();

  // Draw background if specified
  if (fill.backgroundColor) {
    ctx.fillStyle = rgbaToString(fill.backgroundColor);
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  // Set line style
  ctx.strokeStyle = rgbaToString(fill.color);
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';

  // Generate and render pattern lines
  const lines = generatePatternLines(bounds, pattern, fill, opts);

  ctx.beginPath();
  for (const line of lines) {
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Render a hatch pattern within a polygon boundary
 */
export function renderHatchInPolygon(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  fill: HatchFill,
  options: HatchRendererOptions = {}
): void {
  if (points.length < 3) return;

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const pattern = getHatchPattern(fill.pattern);

  if (!pattern) {
    // Fallback to solid fill
    ctx.fillStyle = rgbaToString(fill.color);
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.save();

  // Set up clipping path
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  ctx.closePath();
  ctx.clip();

  // Draw background if specified
  if (fill.backgroundColor) {
    ctx.fillStyle = rgbaToString(fill.backgroundColor);
    ctx.fill();
  }

  // Calculate bounds of polygon
  const bounds = polygonBounds(points);

  // Set line style
  ctx.strokeStyle = rgbaToString(fill.color);
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';

  // Generate and render pattern lines
  const lines = generatePatternLines(bounds, pattern, fill, opts);

  ctx.beginPath();
  for (const line of lines) {
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Render hatch with boundary paths (with island support)
 */
export function renderHatchWithBoundaries(
  ctx: CanvasRenderingContext2D,
  boundaries: readonly HatchBoundary[],
  fill: HatchFill,
  options: HatchRendererOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const pattern = getHatchPattern(fill.pattern);

  ctx.save();

  // Build clipping path with holes (even-odd rule)
  ctx.beginPath();

  for (const boundary of boundaries) {
    if (boundary.points && boundary.points.length >= 3) {
      const pts = boundary.points;
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i]!.x, pts[i]!.y);
      }
      ctx.closePath();
    }
  }

  ctx.clip('evenodd');

  if (!pattern) {
    // Solid fill
    ctx.fillStyle = rgbaToString(fill.color);
    ctx.fillRect(-10000, -10000, 20000, 20000);
    ctx.restore();
    return;
  }

  // Draw background if specified
  if (fill.backgroundColor) {
    ctx.fillStyle = rgbaToString(fill.backgroundColor);
    ctx.fillRect(-10000, -10000, 20000, 20000);
  }

  // Calculate overall bounds
  let allPoints: Point[] = [];
  for (const boundary of boundaries) {
    if (boundary.points) {
      allPoints = allPoints.concat([...boundary.points]);
    }
  }

  if (allPoints.length === 0) {
    ctx.restore();
    return;
  }

  const bounds = polygonBounds(allPoints);

  // Set line style
  ctx.strokeStyle = rgbaToString(fill.color);
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';

  // Generate and render pattern lines
  const lines = generatePatternLines(bounds, pattern, fill, opts);

  ctx.beginPath();
  for (const line of lines) {
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
  }
  ctx.stroke();

  ctx.restore();
}

// ============================================================================
// Pattern Line Generation
// ============================================================================

interface PatternLine {
  start: Point;
  end: Point;
}

/**
 * Generate all pattern lines within bounds
 */
function generatePatternLines(
  bounds: Rect,
  pattern: HatchPattern,
  fill: HatchFill,
  options: Required<HatchRendererOptions>
): PatternLine[] {
  const lines: PatternLine[] = [];
  const scale = fill.scale * pattern.defaultScale;
  const totalRotation = fill.rotation;

  // Expand bounds slightly to ensure coverage after rotation
  const diagonal = Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  for (const hatchLine of pattern.lines) {
    const angle = (hatchLine.angle + totalRotation) * (Math.PI / 180);
    const offset = hatchLine.offset * scale;

    if (offset <= 0) continue;

    // Calculate perpendicular direction
    const perpX = Math.sin(angle);
    const perpY = -Math.cos(angle);

    // Calculate line direction
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    // Calculate how many lines we need
    const startOffset = -diagonal / 2;
    const endOffset = diagonal / 2;
    const numLines = Math.ceil((endOffset - startOffset) / offset);

    if (numLines > options.maxLines) {
      // Limit number of lines for performance
      continue;
    }

    for (let i = 0; i <= numLines; i++) {
      const lineOffset = startOffset + i * offset + (hatchLine.origin.x * perpX + hatchLine.origin.y * perpY) * scale;

      // Line center point
      const lineCenterX = centerX + fill.origin.x + perpX * lineOffset;
      const lineCenterY = centerY + fill.origin.y + perpY * lineOffset;

      // Line endpoints (extend to cover bounds)
      const halfLength = diagonal;

      if (hatchLine.dashPattern.length === 0) {
        // Solid line
        lines.push({
          start: {
            x: lineCenterX - dirX * halfLength,
            y: lineCenterY - dirY * halfLength,
          },
          end: {
            x: lineCenterX + dirX * halfLength,
            y: lineCenterY + dirY * halfLength,
          },
        });
      } else {
        // Dashed line
        const dashLines = generateDashedLine(
          { x: lineCenterX - dirX * halfLength, y: lineCenterY - dirY * halfLength },
          { x: lineCenterX + dirX * halfLength, y: lineCenterY + dirY * halfLength },
          hatchLine.dashPattern.map(d => d * scale)
        );
        lines.push(...dashLines);
      }

      if (lines.length > options.maxLines) break;
    }

    if (lines.length > options.maxLines) break;
  }

  return lines;
}

/**
 * Generate dashed line segments
 */
function generateDashedLine(
  start: Point,
  end: Point,
  dashPattern: readonly number[]
): PatternLine[] {
  const lines: PatternLine[] = [];

  if (dashPattern.length === 0) {
    lines.push({ start, end });
    return lines;
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return lines;

  const dirX = dx / length;
  const dirY = dy / length;

  let pos = 0;
  let dashIndex = 0;
  let drawing = true;

  while (pos < length) {
    const dashLength = dashPattern[dashIndex % dashPattern.length]!;
    const segEnd = Math.min(pos + dashLength, length);

    if (drawing) {
      lines.push({
        start: {
          x: start.x + dirX * pos,
          y: start.y + dirY * pos,
        },
        end: {
          x: start.x + dirX * segEnd,
          y: start.y + dirY * segEnd,
        },
      });
    }

    pos = segEnd;
    dashIndex++;
    drawing = !drawing;
  }

  return lines;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate bounding box of polygon
 */
function polygonBounds(points: readonly Point[]): Rect {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = points[0]!.x;
  let minY = points[0]!.y;
  let maxX = points[0]!.x;
  let maxY = points[0]!.y;

  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Convert RGBA to CSS color string
 */
function rgbaToString(color: RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${color.a})`;
}

/**
 * Create a hatch pattern canvas (for use with ctx.createPattern)
 */
export function createHatchPatternCanvas(
  _pattern: HatchPattern, // Reserved for future custom pattern support
  fill: HatchFill,
  tileSize: number = 32
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;

  const ctx = canvas.getContext('2d')!;

  // Clear with background
  if (fill.backgroundColor) {
    ctx.fillStyle = rgbaToString(fill.backgroundColor);
    ctx.fillRect(0, 0, tileSize, tileSize);
  }

  // Render pattern tile
  renderHatchInRect(ctx, { x: 0, y: 0, width: tileSize, height: tileSize }, fill);

  return canvas;
}
