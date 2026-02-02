/**
 * Divide Tool
 *
 * Divides curves (circles, arcs, lines, polylines) into equal segments
 * and places point markers at division locations.
 *
 * Supports:
 * - Circle/ellipse division (equal angular segments)
 * - Arc division
 * - Line division
 * - Polyline division (equal arc-length segments)
 * - Count-based or length-based division
 */

import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import {
  divideCurveByLength,
  divideCircle,
  divideArc,
  divideLine,
  dividePolyline,
  type Circle,
  type Arc,
  type LineSegment,
  type DivisionResult,
  type DivisionOptions,
} from '@core/geometry/circular-division';

/**
 * Division mode
 */
export type DivisionMode = 'count' | 'length';

/**
 * Curve type for division
 */
export type DivisibleCurveType = 'circle' | 'arc' | 'line' | 'polyline' | 'ellipse';

/**
 * Divide tool options
 */
export interface DivideToolOptions {
  /** Division mode: by count or by length */
  mode: DivisionMode;
  /** Number of segments (for count mode) */
  segments: number;
  /** Segment length (for length mode) */
  segmentLength: number;
  /** Include endpoints in result */
  includeEndpoints: boolean;
  /** Reference angle for circle/arc division (degrees) */
  referenceAngle: number;
  /** Create point markers at division locations */
  createMarkers: boolean;
  /** Marker size (radius in pixels) */
  markerSize: number;
}

/**
 * Divide result
 */
export interface DivideResult {
  /** The divided curve's node ID */
  curveId: NodeId;
  /** Division points */
  points: Point[];
  /** Number of segments created */
  segmentCount: number;
  /** IDs of created marker nodes (if createMarkers is true) */
  markerIds: NodeId[];
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Curve data extracted from a node
 */
export interface CurveData {
  type: DivisibleCurveType;
  circle?: Circle;
  arc?: Arc;
  line?: LineSegment;
  polyline?: Point[];
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: DivideToolOptions = {
  mode: 'count',
  segments: 4,
  segmentLength: 50,
  includeEndpoints: true,
  referenceAngle: 0,
  createMarkers: true,
  markerSize: 3,
};

/**
 * Divide Tool class
 */
export class DivideTool {
  private options: DivideToolOptions;

  // Callback for extracting curve data from a node
  private getCurveData?: (nodeId: NodeId) => CurveData | null;

  // Callback for creating marker nodes
  private createMarker?: (point: Point, size: number) => NodeId;

  constructor(options: Partial<DivideToolOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set callback for extracting curve data from nodes.
   */
  setGetCurveData(callback: (nodeId: NodeId) => CurveData | null): void {
    this.getCurveData = callback;
  }

  /**
   * Set callback for creating marker nodes.
   */
  setCreateMarker(callback: (point: Point, size: number) => NodeId): void {
    this.createMarker = callback;
  }

  /**
   * Get current options.
   */
  getOptions(): DivideToolOptions {
    return { ...this.options };
  }

  /**
   * Set division mode.
   */
  setMode(mode: DivisionMode): void {
    this.options.mode = mode;
  }

  /**
   * Get division mode.
   */
  getMode(): DivisionMode {
    return this.options.mode;
  }

  /**
   * Set number of segments (for count mode).
   */
  setSegments(segments: number): void {
    this.options.segments = Math.max(1, Math.floor(segments));
  }

  /**
   * Get number of segments.
   */
  getSegments(): number {
    return this.options.segments;
  }

  /**
   * Set segment length (for length mode).
   */
  setSegmentLength(length: number): void {
    this.options.segmentLength = Math.max(1, length);
  }

  /**
   * Get segment length.
   */
  getSegmentLength(): number {
    return this.options.segmentLength;
  }

  /**
   * Set whether to include endpoints.
   */
  setIncludeEndpoints(include: boolean): void {
    this.options.includeEndpoints = include;
  }

  /**
   * Get include endpoints setting.
   */
  getIncludeEndpoints(): boolean {
    return this.options.includeEndpoints;
  }

  /**
   * Set reference angle for circle/arc division (degrees).
   */
  setReferenceAngle(angle: number): void {
    this.options.referenceAngle = angle;
  }

  /**
   * Get reference angle.
   */
  getReferenceAngle(): number {
    return this.options.referenceAngle;
  }

  /**
   * Set whether to create point markers.
   */
  setCreateMarkers(create: boolean): void {
    this.options.createMarkers = create;
  }

  /**
   * Get create markers setting.
   */
  getCreateMarkers(): boolean {
    return this.options.createMarkers;
  }

  /**
   * Set marker size.
   */
  setMarkerSize(size: number): void {
    this.options.markerSize = Math.max(1, size);
  }

  /**
   * Get marker size.
   */
  getMarkerSize(): number {
    return this.options.markerSize;
  }

  /**
   * Divide a curve and optionally create markers.
   */
  divide(curveId: NodeId): DivideResult {
    if (!this.getCurveData) {
      return {
        curveId,
        points: [],
        segmentCount: 0,
        markerIds: [],
        success: false,
        error: 'No curve data callback set',
      };
    }

    const curveData = this.getCurveData(curveId);
    if (!curveData) {
      return {
        curveId,
        points: [],
        segmentCount: 0,
        markerIds: [],
        success: false,
        error: 'Could not extract curve data from node',
      };
    }

    try {
      const result = this.divideCurveData(curveData);
      const markerIds: NodeId[] = [];

      // Create markers if enabled and callback is set
      if (this.options.createMarkers && this.createMarker) {
        for (const point of result.points) {
          const markerId = this.createMarker(point, this.options.markerSize);
          markerIds.push(markerId);
        }
      }

      return {
        curveId,
        points: result.points,
        segmentCount: result.points.length > 0 ? result.points.length - 1 : 0,
        markerIds,
        success: true,
      };
    } catch (error) {
      return {
        curveId,
        points: [],
        segmentCount: 0,
        markerIds: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Preview division points without creating markers.
   */
  preview(curveId: NodeId): Point[] {
    if (!this.getCurveData) {
      return [];
    }

    const curveData = this.getCurveData(curveId);
    if (!curveData) {
      return [];
    }

    try {
      const result = this.divideCurveData(curveData);
      return result.points;
    } catch {
      return [];
    }
  }

  /**
   * Preview division for raw curve data.
   */
  previewCurveData(curveData: CurveData): Point[] {
    try {
      const result = this.divideCurveData(curveData);
      return result.points;
    } catch {
      return [];
    }
  }

  /**
   * Divide curve data using appropriate method.
   */
  private divideCurveData(curveData: CurveData): DivisionResult {
    const divisionOptions: DivisionOptions = {
      includeEndpoints: this.options.includeEndpoints,
      referenceAngle: (this.options.referenceAngle * Math.PI) / 180, // Convert to radians
    };

    if (this.options.mode === 'count') {
      return this.divideByCountWithData(curveData, this.options.segments, divisionOptions);
    } else {
      return this.divideByLengthWithData(curveData, this.options.segmentLength, divisionOptions);
    }
  }

  /**
   * Divide curve data by segment count.
   */
  private divideByCountWithData(
    curveData: CurveData,
    segments: number,
    options: DivisionOptions
  ): DivisionResult {
    switch (curveData.type) {
      case 'circle':
        if (!curveData.circle) throw new Error('Circle data not provided');
        return divideCircle(curveData.circle, segments, options);

      case 'ellipse':
        // Treat ellipse as a circle with average radius for now
        // TODO: Implement proper ellipse division
        if (!curveData.circle) throw new Error('Ellipse data not provided');
        return divideCircle(curveData.circle, segments, options);

      case 'arc':
        if (!curveData.arc) throw new Error('Arc data not provided');
        return divideArc(curveData.arc, segments, options);

      case 'line':
        if (!curveData.line) throw new Error('Line data not provided');
        return divideLine(curveData.line, segments, options);

      case 'polyline':
        if (!curveData.polyline) throw new Error('Polyline data not provided');
        return dividePolyline(curveData.polyline, segments, options);

      default:
        throw new Error(`Unsupported curve type: ${curveData.type}`);
    }
  }

  /**
   * Divide curve data by segment length.
   */
  private divideByLengthWithData(
    curveData: CurveData,
    segmentLength: number,
    options: DivisionOptions
  ): DivisionResult {
    // Convert curve data to generic Curve type
    let curve;

    switch (curveData.type) {
      case 'circle':
      case 'ellipse':
        if (!curveData.circle) throw new Error('Circle data not provided');
        curve = curveData.circle;
        break;

      case 'arc':
        if (!curveData.arc) throw new Error('Arc data not provided');
        curve = curveData.arc;
        break;

      case 'line':
        if (!curveData.line) throw new Error('Line data not provided');
        curve = curveData.line;
        break;

      case 'polyline':
        if (!curveData.polyline) throw new Error('Polyline data not provided');
        curve = curveData.polyline;
        break;

      default:
        throw new Error(`Unsupported curve type: ${curveData.type}`);
    }

    return divideCurveByLength(curve, segmentLength, options);
  }

  /**
   * Divide a circle directly.
   */
  divideCircle(circle: Circle, segments?: number): DivisionResult {
    const count = segments ?? this.options.segments;
    return divideCircle(circle, count, {
      referenceAngle: (this.options.referenceAngle * Math.PI) / 180,
    });
  }

  /**
   * Divide an arc directly.
   */
  divideArc(arc: Arc, segments?: number): DivisionResult {
    const count = segments ?? this.options.segments;
    return divideArc(arc, count, {
      includeEndpoints: this.options.includeEndpoints,
    });
  }

  /**
   * Divide a line directly.
   */
  divideLine(line: LineSegment, segments?: number): DivisionResult {
    const count = segments ?? this.options.segments;
    return divideLine(line, count, {
      includeEndpoints: this.options.includeEndpoints,
    });
  }

  /**
   * Divide a polyline directly.
   */
  dividePolyline(polyline: Point[], segments?: number): DivisionResult {
    const count = segments ?? this.options.segments;
    return dividePolyline(polyline, count, {
      includeEndpoints: this.options.includeEndpoints,
    });
  }
}

/**
 * Create a divide tool.
 */
export function createDivideTool(options?: Partial<DivideToolOptions>): DivideTool {
  return new DivideTool(options);
}

/**
 * Extract curve data from node properties.
 * This is a helper function that can be used as the getCurveData callback.
 */
export function extractCurveDataFromNode(
  nodeType: string,
  nodeProps: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    startAngle?: number;
    endAngle?: number;
    points?: Point[];
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
  }
): CurveData | null {
  switch (nodeType) {
    case 'ELLIPSE': {
      // For now, treat ellipse as circle with average radius
      const cx = (nodeProps.x ?? 0) + (nodeProps.width ?? 0) / 2;
      const cy = (nodeProps.y ?? 0) + (nodeProps.height ?? 0) / 2;
      const rx = (nodeProps.width ?? 0) / 2;
      const ry = (nodeProps.height ?? 0) / 2;
      const radius = (rx + ry) / 2;

      // Check if it's an arc
      if (nodeProps.startAngle !== undefined && nodeProps.endAngle !== undefined) {
        return {
          type: 'arc',
          arc: {
            center: { x: cx, y: cy },
            radius,
            startAngle: nodeProps.startAngle,
            endAngle: nodeProps.endAngle,
          },
        };
      }

      return {
        type: rx === ry ? 'circle' : 'ellipse',
        circle: {
          center: { x: cx, y: cy },
          radius,
        },
      };
    }

    case 'VECTOR':
    case 'LINE': {
      if (nodeProps.points && nodeProps.points.length >= 2) {
        if (nodeProps.points.length === 2) {
          return {
            type: 'line',
            line: {
              start: nodeProps.points[0]!,
              end: nodeProps.points[1]!,
            },
          };
        }
        return {
          type: 'polyline',
          polyline: nodeProps.points,
        };
      }

      // Fallback to startX/Y, endX/Y if available
      if (nodeProps.startX !== undefined && nodeProps.endX !== undefined) {
        return {
          type: 'line',
          line: {
            start: { x: nodeProps.startX, y: nodeProps.startY ?? 0 },
            end: { x: nodeProps.endX, y: nodeProps.endY ?? 0 },
          },
        };
      }

      return null;
    }

    default:
      return null;
  }
}
