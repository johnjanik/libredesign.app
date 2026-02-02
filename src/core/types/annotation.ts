/**
 * Annotation Types
 *
 * Types for technical drawing annotations: dimensions, callouts, notes.
 */

import type { Point } from './geometry';
import type { NodeId } from './common';

/**
 * Dimension types
 */
export type DimensionType = 'LINEAR' | 'ANGULAR' | 'RADIAL' | 'ARC_LENGTH';

/**
 * Linear dimension orientation
 */
export type LinearDimensionOrientation = 'HORIZONTAL' | 'VERTICAL' | 'ALIGNED';

/**
 * Dimension arrow/terminator style
 */
export type DimensionTerminator = 'ARROW' | 'TICK' | 'DOT' | 'NONE';

/**
 * Dimension text position relative to the dimension line
 */
export type DimensionTextPosition = 'ABOVE' | 'CENTERED' | 'BELOW';

/**
 * Unit display format
 */
export type DimensionUnitFormat = 'NONE' | 'PX' | 'MM' | 'CM' | 'IN' | 'PT';

/**
 * Anchor point reference on a node
 */
export interface NodeAnchorRef {
  /** The node being referenced */
  readonly nodeId: NodeId;
  /** Which point on the node: specific position or computed */
  readonly anchorType: 'corner' | 'edge' | 'center' | 'custom';
  /** For corners: 'nw' | 'ne' | 'sw' | 'se' */
  /** For edges: 'n' | 's' | 'e' | 'w' */
  readonly position?: string;
  /** Custom point offset from node origin (for 'custom' anchor type) */
  readonly customOffset?: Point;
}

/**
 * Dimension anchor - either a fixed point or a node reference
 */
export type DimensionAnchor =
  | { readonly type: 'fixed'; readonly point: Point }
  | { readonly type: 'node'; readonly ref: NodeAnchorRef };

/**
 * Dimension style configuration
 */
export interface DimensionStyle {
  /** Arrow/terminator style at start */
  readonly startTerminator: DimensionTerminator;
  /** Arrow/terminator style at end */
  readonly endTerminator: DimensionTerminator;
  /** Text position relative to line */
  readonly textPosition: DimensionTextPosition;
  /** Decimal precision for display */
  readonly precision: number;
  /** Unit format */
  readonly unitFormat: DimensionUnitFormat;
  /** Show unit suffix in text */
  readonly showUnits: boolean;
  /** Text size (in document units) */
  readonly textSize: number;
  /** Line color (hex) */
  readonly lineColor: string;
  /** Text color (hex) */
  readonly textColor: string;
  /** Line weight */
  readonly lineWeight: number;
  /** Extension line overshoot past dimension line */
  readonly extensionOvershoot: number;
  /** Gap between measured point and extension line start */
  readonly extensionGap: number;
  /** Arrow size */
  readonly arrowSize: number;
}

/**
 * Default dimension style
 */
export const DEFAULT_DIMENSION_STYLE: DimensionStyle = {
  startTerminator: 'ARROW',
  endTerminator: 'ARROW',
  textPosition: 'ABOVE',
  precision: 1,
  unitFormat: 'PX',
  showUnits: true,
  textSize: 12,
  lineColor: '#333333',
  textColor: '#333333',
  lineWeight: 1,
  extensionOvershoot: 2,
  extensionGap: 2,
  arrowSize: 8,
};

/**
 * Linear dimension data
 */
export interface LinearDimensionData {
  readonly dimensionType: 'LINEAR';
  /** Start anchor point */
  readonly startAnchor: DimensionAnchor;
  /** End anchor point */
  readonly endAnchor: DimensionAnchor;
  /** Orientation: horizontal, vertical, or aligned to points */
  readonly orientation: LinearDimensionOrientation;
  /** Offset distance from the measured geometry */
  readonly offset: number;
  /** Manual text override (null = auto-calculated) */
  readonly textOverride: string | null;
  /** Style configuration */
  readonly style: DimensionStyle;
}

/**
 * Angular dimension data
 */
export interface AngularDimensionData {
  readonly dimensionType: 'ANGULAR';
  /** Center/vertex point */
  readonly centerAnchor: DimensionAnchor;
  /** Start point of first ray */
  readonly startAnchor: DimensionAnchor;
  /** End point of second ray */
  readonly endAnchor: DimensionAnchor;
  /** Radius of the arc indicator */
  readonly arcRadius: number;
  /** Display in degrees (default) or radians */
  readonly angleUnit: 'DEGREES' | 'RADIANS';
  /** Manual text override */
  readonly textOverride: string | null;
  /** Style configuration */
  readonly style: DimensionStyle;
}

/**
 * Radial dimension data (for circles/arcs)
 */
export interface RadialDimensionData {
  readonly dimensionType: 'RADIAL';
  /** Center point anchor */
  readonly centerAnchor: DimensionAnchor;
  /** Point on the circle/arc */
  readonly radiusAnchor: DimensionAnchor;
  /** Show radius (R) or diameter (⌀) */
  readonly showDiameter: boolean;
  /** Leader line direction angle (in degrees) */
  readonly leaderAngle: number;
  /** Manual text override */
  readonly textOverride: string | null;
  /** Style configuration */
  readonly style: DimensionStyle;
}

/**
 * Arc length dimension data
 */
export interface ArcLengthDimensionData {
  readonly dimensionType: 'ARC_LENGTH';
  /** Center point of arc */
  readonly centerAnchor: DimensionAnchor;
  /** Start point of arc */
  readonly startAnchor: DimensionAnchor;
  /** End point of arc */
  readonly endAnchor: DimensionAnchor;
  /** Offset from arc */
  readonly offset: number;
  /** Manual text override */
  readonly textOverride: string | null;
  /** Style configuration */
  readonly style: DimensionStyle;
}

/**
 * Union of all dimension data types
 */
export type DimensionData =
  | LinearDimensionData
  | AngularDimensionData
  | RadialDimensionData
  | ArcLengthDimensionData;

/**
 * Calculated dimension geometry for rendering
 */
export interface DimensionGeometry {
  /** The actual measured value */
  readonly value: number;
  /** Formatted display text */
  readonly displayText: string;
  /** Start point of dimension line */
  readonly lineStart: Point;
  /** End point of dimension line */
  readonly lineEnd: Point;
  /** Extension line 1 points (if applicable) */
  readonly extensionLine1?: { start: Point; end: Point };
  /** Extension line 2 points (if applicable) */
  readonly extensionLine2?: { start: Point; end: Point };
  /** Text position and rotation */
  readonly textPosition: Point;
  readonly textRotation: number;
  /** Arc geometry for angular dimensions */
  readonly arc?: {
    center: Point;
    radius: number;
    startAngle: number;
    endAngle: number;
  };
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points (in radians)
 */
export function calculateAngle(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * Calculate angle between three points (vertex at center)
 */
export function calculateVertexAngle(start: Point, center: Point, end: Point): number {
  const angle1 = Math.atan2(start.y - center.y, start.x - center.x);
  const angle2 = Math.atan2(end.y - center.y, end.x - center.x);
  let angle = angle2 - angle1;

  // Normalize to 0-2π
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;

  return angle;
}

/**
 * Format dimension value for display
 */
export function formatDimensionValue(
  value: number,
  precision: number,
  unitFormat: DimensionUnitFormat,
  showUnits: boolean
): string {
  const formatted = value.toFixed(precision);

  if (!showUnits || unitFormat === 'NONE') {
    return formatted;
  }

  const unitSuffix: Record<DimensionUnitFormat, string> = {
    NONE: '',
    PX: 'px',
    MM: 'mm',
    CM: 'cm',
    IN: '"',
    PT: 'pt',
  };

  return `${formatted}${unitSuffix[unitFormat]}`;
}

/**
 * Calculate linear dimension geometry
 */
export function calculateLinearDimensionGeometry(
  startPoint: Point,
  endPoint: Point,
  orientation: LinearDimensionOrientation,
  offset: number,
  style: DimensionStyle
): DimensionGeometry {
  let lineStart: Point;
  let lineEnd: Point;
  let value: number;

  // Calculate based on orientation
  if (orientation === 'HORIZONTAL') {
    // Measure horizontal distance
    value = Math.abs(endPoint.x - startPoint.x);
    const y = Math.min(startPoint.y, endPoint.y) - offset;
    lineStart = { x: startPoint.x, y };
    lineEnd = { x: endPoint.x, y };
  } else if (orientation === 'VERTICAL') {
    // Measure vertical distance
    value = Math.abs(endPoint.y - startPoint.y);
    const x = Math.min(startPoint.x, endPoint.x) - offset;
    lineStart = { x, y: startPoint.y };
    lineEnd = { x, y: endPoint.y };
  } else {
    // Aligned - measure actual distance
    value = calculateDistance(startPoint, endPoint);
    const angle = calculateAngle(startPoint, endPoint);
    const perpAngle = angle + Math.PI / 2;
    const offsetX = Math.cos(perpAngle) * offset;
    const offsetY = Math.sin(perpAngle) * offset;
    lineStart = { x: startPoint.x + offsetX, y: startPoint.y + offsetY };
    lineEnd = { x: endPoint.x + offsetX, y: endPoint.y + offsetY };
  }

  // Calculate extension lines
  const extensionLine1 = {
    start: { x: startPoint.x, y: startPoint.y + style.extensionGap * Math.sign(offset) },
    end: { x: lineStart.x, y: lineStart.y + style.extensionOvershoot * Math.sign(offset) },
  };

  const extensionLine2 = {
    start: { x: endPoint.x, y: endPoint.y + style.extensionGap * Math.sign(offset) },
    end: { x: lineEnd.x, y: lineEnd.y + style.extensionOvershoot * Math.sign(offset) },
  };

  // Calculate text position (midpoint of dimension line)
  const textPosition = {
    x: (lineStart.x + lineEnd.x) / 2,
    y: (lineStart.y + lineEnd.y) / 2,
  };

  // Calculate text rotation for aligned dimensions
  let textRotation = 0;
  if (orientation === 'ALIGNED') {
    textRotation = calculateAngle(lineStart, lineEnd) * (180 / Math.PI);
    // Keep text readable (not upside down)
    if (textRotation > 90 || textRotation < -90) {
      textRotation += 180;
    }
  }

  const displayText = formatDimensionValue(
    value,
    style.precision,
    style.unitFormat,
    style.showUnits
  );

  return {
    value,
    displayText,
    lineStart,
    lineEnd,
    extensionLine1,
    extensionLine2,
    textPosition,
    textRotation,
  };
}
