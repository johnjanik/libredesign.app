/**
 * Area and Perimeter Calculator
 *
 * Calculates geometric properties of shapes:
 * - Area (using Shoelace formula for polygons, numerical integration for curves)
 * - Perimeter/circumference
 * - Centroid (geometric center)
 *
 * Supports:
 * - Simple polygons
 * - Complex paths with curves
 * - Shapes with holes
 */

import type { Point, VectorPath, Rect } from '@core/types/geometry';

/**
 * Geometric properties result
 */
export interface GeometricProperties {
  /** Total area (absolute value) */
  readonly area: number;
  /** Signed area (negative for clockwise winding) */
  readonly signedArea: number;
  /** Total perimeter length */
  readonly perimeter: number;
  /** Centroid (center of mass) */
  readonly centroid: Point;
  /** Bounding box */
  readonly bounds: Rect;
  /** Whether the path is closed */
  readonly isClosed: boolean;
  /** Winding direction */
  readonly windingDirection: 'clockwise' | 'counterclockwise';
}

/**
 * Unit conversion factors (to convert from pixels)
 */
export const UNIT_FACTORS: Record<string, number> = {
  px: 1,
  pt: 72 / 96, // 72 points per inch, 96 pixels per inch
  mm: 25.4 / 96, // 25.4mm per inch
  cm: 2.54 / 96, // 2.54cm per inch
  in: 1 / 96, // 96 pixels per inch
};

/**
 * Options for area calculation
 */
export interface AreaCalculationOptions {
  /** Number of segments to use for curve approximation */
  readonly curveSegments?: number;
  /** Target unit for results */
  readonly unit?: string;
  /** Scale factor (for scaled drawings) */
  readonly scale?: number;
}

const DEFAULT_OPTIONS: Required<AreaCalculationOptions> = {
  curveSegments: 32,
  unit: 'px',
  scale: 1,
};

/**
 * Calculate area of a polygon using the Shoelace formula
 * Returns signed area (positive for counterclockwise, negative for clockwise)
 */
export function shoelaceArea(points: readonly Point[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % n]!;
    area += (p1.x * p2.y - p2.x * p1.y);
  }

  return area / 2;
}

/**
 * Calculate perimeter of a polygon
 */
export function polygonPerimeter(points: readonly Point[], closed: boolean = true): number {
  if (points.length < 2) return 0;

  let perimeter = 0;
  const n = points.length;
  const end = closed ? n : n - 1;

  for (let i = 0; i < end; i++) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % n]!;
    perimeter += Math.sqrt(
      (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)
    );
  }

  return perimeter;
}

/**
 * Calculate centroid of a polygon
 */
export function polygonCentroid(points: readonly Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { x: points[0]!.x, y: points[0]!.y };
  if (points.length === 2) {
    return {
      x: (points[0]!.x + points[1]!.x) / 2,
      y: (points[0]!.y + points[1]!.y) / 2,
    };
  }

  const area = shoelaceArea(points);
  if (Math.abs(area) < 1e-10) {
    // Degenerate polygon - return average of points
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  let cx = 0;
  let cy = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % n]!;
    const cross = p1.x * p2.y - p2.x * p1.y;
    cx += (p1.x + p2.x) * cross;
    cy += (p1.y + p2.y) * cross;
  }

  const factor = 1 / (6 * area);
  return { x: cx * factor, y: cy * factor };
}

/**
 * Convert a path to a polygon by flattening curves
 */
export function pathToPolygon(
  path: VectorPath,
  segmentsPerCurve: number = 32
): Point[][] {
  const subpaths: Point[][] = [];
  let currentSubpath: Point[] = [];
  let currentX = 0;
  let currentY = 0;
  let subpathStartX = 0;
  let subpathStartY = 0;

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        if (currentSubpath.length > 0) {
          subpaths.push(currentSubpath);
        }
        currentSubpath = [{ x: cmd.x, y: cmd.y }];
        currentX = cmd.x;
        currentY = cmd.y;
        subpathStartX = cmd.x;
        subpathStartY = cmd.y;
        break;

      case 'L':
        currentSubpath.push({ x: cmd.x, y: cmd.y });
        currentX = cmd.x;
        currentY = cmd.y;
        break;

      case 'C': {
        // Flatten cubic Bezier curve
        const curvePoints = flattenCubicBezier(
          { x: currentX, y: currentY },
          { x: cmd.x1, y: cmd.y1 },
          { x: cmd.x2, y: cmd.y2 },
          { x: cmd.x, y: cmd.y },
          segmentsPerCurve
        );
        // Skip first point (already have it)
        for (let i = 1; i < curvePoints.length; i++) {
          currentSubpath.push(curvePoints[i]!);
        }
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      }

      case 'Z':
        // Close path - don't add the start point again if it's already there
        if (currentSubpath.length > 0) {
          const last = currentSubpath[currentSubpath.length - 1]!;
          if (Math.abs(last.x - subpathStartX) > 1e-6 || Math.abs(last.y - subpathStartY) > 1e-6) {
            currentSubpath.push({ x: subpathStartX, y: subpathStartY });
          }
        }
        currentX = subpathStartX;
        currentY = subpathStartY;
        break;
    }
  }

  if (currentSubpath.length > 0) {
    subpaths.push(currentSubpath);
  }

  return subpaths;
}

/**
 * Flatten a cubic Bezier curve to line segments
 */
export function flattenCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  segments: number
): Point[] {
  const points: Point[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    // Cubic Bezier formula
    const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
    const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;

    points.push({ x, y });
  }

  return points;
}

/**
 * Calculate length of a cubic Bezier curve
 */
export function cubicBezierLength(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  segments: number = 32
): number {
  const points = flattenCubicBezier(p0, p1, p2, p3, segments);
  return polygonPerimeter(points, false);
}

/**
 * Calculate bounding box of points
 */
export function pointsBounds(points: readonly Point[]): Rect {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
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
 * Calculate geometric properties of a vector path
 */
export function calculatePathProperties(
  path: VectorPath,
  options: AreaCalculationOptions = {}
): GeometricProperties {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const unitFactor = UNIT_FACTORS[opts.unit] ?? 1;
  const scaleFactor = opts.scale * unitFactor;
  const areaScaleFactor = scaleFactor * scaleFactor; // Area scales quadratically

  // Convert path to polygons
  const subpaths = pathToPolygon(path, opts.curveSegments);

  if (subpaths.length === 0) {
    return {
      area: 0,
      signedArea: 0,
      perimeter: 0,
      centroid: { x: 0, y: 0 },
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      isClosed: false,
      windingDirection: 'counterclockwise',
    };
  }

  // Calculate total area (handling holes with winding rule)
  let totalSignedArea = 0;
  let totalPerimeter = 0;
  let weightedCentroidX = 0;
  let weightedCentroidY = 0;
  let allPoints: Point[] = [];

  for (const polygon of subpaths) {
    const signedArea = shoelaceArea(polygon);
    totalSignedArea += signedArea;

    const centroid = polygonCentroid(polygon);
    weightedCentroidX += centroid.x * Math.abs(signedArea);
    weightedCentroidY += centroid.y * Math.abs(signedArea);

    // Check if path is closed (last point equals first point)
    const isClosed = polygon.length > 2 &&
      Math.abs(polygon[0]!.x - polygon[polygon.length - 1]!.x) < 1e-6 &&
      Math.abs(polygon[0]!.y - polygon[polygon.length - 1]!.y) < 1e-6;

    totalPerimeter += polygonPerimeter(polygon, isClosed);

    allPoints = allPoints.concat(polygon);
  }

  // Finalize centroid
  const totalAbsArea = Math.abs(totalSignedArea);
  const centroid = totalAbsArea > 1e-10
    ? { x: weightedCentroidX / totalAbsArea, y: weightedCentroidY / totalAbsArea }
    : polygonCentroid(allPoints);

  // Apply scaling
  const scaledArea = Math.abs(totalSignedArea) * areaScaleFactor;
  const scaledSignedArea = totalSignedArea * areaScaleFactor;
  const scaledPerimeter = totalPerimeter * scaleFactor;
  const scaledCentroid = {
    x: centroid.x * scaleFactor,
    y: centroid.y * scaleFactor,
  };
  const rawBounds = pointsBounds(allPoints);
  const scaledBounds = {
    x: rawBounds.x * scaleFactor,
    y: rawBounds.y * scaleFactor,
    width: rawBounds.width * scaleFactor,
    height: rawBounds.height * scaleFactor,
  };

  // Check if any subpath is closed
  const isClosed = subpaths.some(polygon => {
    if (polygon.length < 3) return false;
    const first = polygon[0]!;
    const last = polygon[polygon.length - 1]!;
    return Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.y - last.y) < 1e-6;
  });

  return {
    area: scaledArea,
    signedArea: scaledSignedArea,
    perimeter: scaledPerimeter,
    centroid: scaledCentroid,
    bounds: scaledBounds,
    isClosed,
    windingDirection: totalSignedArea >= 0 ? 'counterclockwise' : 'clockwise',
  };
}

/**
 * Calculate area of a rectangle
 */
export function rectangleArea(width: number, height: number): number {
  return Math.abs(width * height);
}

/**
 * Calculate perimeter of a rectangle
 */
export function rectanglePerimeter(width: number, height: number): number {
  return 2 * (Math.abs(width) + Math.abs(height));
}

/**
 * Calculate area of an ellipse
 */
export function ellipseArea(radiusX: number, radiusY: number): number {
  return Math.PI * Math.abs(radiusX) * Math.abs(radiusY);
}

/**
 * Calculate circumference of an ellipse (approximation using Ramanujan's formula)
 */
export function ellipseCircumference(radiusX: number, radiusY: number): number {
  const a = Math.abs(radiusX);
  const b = Math.abs(radiusY);

  if (a === 0 && b === 0) return 0;
  if (a === b) return 2 * Math.PI * a; // Circle

  // Ramanujan's approximation
  const h = ((a - b) * (a - b)) / ((a + b) * (a + b));
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

/**
 * Calculate area of a regular polygon
 */
export function regularPolygonArea(sides: number, radius: number): number {
  if (sides < 3) return 0;
  return (sides * radius * radius * Math.sin(2 * Math.PI / sides)) / 2;
}

/**
 * Calculate perimeter of a regular polygon
 */
export function regularPolygonPerimeter(sides: number, radius: number): number {
  if (sides < 3) return 0;
  const sideLength = 2 * radius * Math.sin(Math.PI / sides);
  return sides * sideLength;
}

/**
 * Calculate area of a star shape
 */
export function starArea(
  points: number,
  outerRadius: number,
  innerRadius: number
): number {
  if (points < 3) return 0;

  // A star can be decomposed into triangles
  const angle = Math.PI / points;
  const triangleArea = 0.5 * outerRadius * innerRadius * Math.sin(angle);
  return 2 * points * triangleArea;
}

/**
 * Calculate perimeter of a star shape
 */
export function starPerimeter(
  pointCount: number,
  outerRadius: number,
  innerRadius: number
): number {
  if (pointCount < 3) return 0;

  // Each "arm" consists of two edges: outer-to-inner and inner-to-outer
  const angleStep = Math.PI / pointCount;

  // Distance from outer point to adjacent inner point
  const outerToInner = Math.sqrt(
    outerRadius * outerRadius +
    innerRadius * innerRadius -
    2 * outerRadius * innerRadius * Math.cos(angleStep)
  );

  return 2 * pointCount * outerToInner;
}

/**
 * Format area value with appropriate unit
 */
export function formatArea(
  area: number,
  unit: string = 'px',
  precision: number = 2
): string {
  const unitSuffix = unit === 'px' ? 'px' : unit;
  return `${area.toFixed(precision)} ${unitSuffix}\u00B2`;
}

/**
 * Format length value with appropriate unit
 */
export function formatLength(
  length: number,
  unit: string = 'px',
  precision: number = 2
): string {
  return `${length.toFixed(precision)} ${unit}`;
}
