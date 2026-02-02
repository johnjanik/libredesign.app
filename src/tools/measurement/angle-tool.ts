/**
 * Angle Measurement Tool
 *
 * Interactive tool for measuring angles between:
 * - Three points (vertex + two rays)
 * - Two lines/edges
 *
 * Supports multiple angle display formats (degrees, radians, gradians)
 * and snapping to common angles.
 */

import type { Point } from '@core/types/geometry';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';

/**
 * Angle display units
 */
export type AngleUnit = 'degrees' | 'radians' | 'gradians';

/**
 * Angle measurement result
 */
export interface AngleMeasurement {
  /** The three points defining the angle (point1 -> vertex -> point2) */
  readonly points: [Point, Point, Point];
  /** Angle in radians */
  readonly angleRadians: number;
  /** Angle in degrees */
  readonly angleDegrees: number;
  /** Angle in gradians */
  readonly angleGradians: number;
  /** Whether this is a reflex angle (> 180°) */
  readonly isReflex: boolean;
}

/**
 * Angle tool options
 */
export interface AngleToolOptions {
  /** Display unit */
  readonly unit?: AngleUnit;
  /** Decimal precision */
  readonly precision?: number;
  /** Show reflex angle option */
  readonly showReflex?: boolean;
  /** Snap to common angles (90, 45, 30, 60) */
  readonly snapToCommon?: boolean;
  /** Arc radius for visualization (in pixels at zoom 1) */
  readonly arcRadius?: number;
}

/**
 * Resolved (mutable) options type
 */
interface ResolvedAngleToolOptions {
  unit: AngleUnit;
  precision: number;
  showReflex: boolean;
  snapToCommon: boolean;
  arcRadius: number;
}

const DEFAULT_OPTIONS: ResolvedAngleToolOptions = {
  unit: 'degrees',
  precision: 1,
  showReflex: false,
  snapToCommon: true,
  arcRadius: 40,
};

/**
 * Common angles to snap to (in degrees)
 */
const COMMON_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];

/**
 * Angle measurement tool
 */
export class AngleTool extends BaseTool {
  readonly name = 'angle-measure';
  cursor: ToolCursor = 'crosshair';

  private options: ResolvedAngleToolOptions;
  private points: Point[] = [];
  private previewPoint: Point | null = null;
  private measurement: AngleMeasurement | null = null;

  // Callbacks
  private onMeasurementComplete?: (measurement: AngleMeasurement) => void;
  private onPreviewUpdate?: () => void;

  constructor(options: AngleToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set callback for measurement completion
   */
  setOnMeasurementComplete(callback: (measurement: AngleMeasurement) => void): void {
    this.onMeasurementComplete = callback;
  }

  /**
   * Set callback for preview updates
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Set display unit
   */
  setUnit(unit: AngleUnit): void {
    this.options.unit = unit;
    this.onPreviewUpdate?.();
  }

  /**
   * Get current measurement
   */
  getMeasurement(): AngleMeasurement | null {
    return this.measurement;
  }

  /**
   * Get current click count
   */
  getClickCount(): number {
    return this.points.length;
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.reset();
  }

  override deactivate(): void {
    this.reset();
    super.deactivate();
  }

  override onPointerDown(event: PointerEventData, _context: ToolContext): boolean {
    const point = { x: event.worldX, y: event.worldY };

    if (this.points.length < 3) {
      this.points.push(point);

      if (this.points.length === 3) {
        // Complete measurement
        this.measurement = this.calculateAngle(
          this.points[0]!,
          this.points[1]!,
          this.points[2]!
        );
        this.onMeasurementComplete?.(this.measurement);
      }

      this.onPreviewUpdate?.();
      return true;
    }

    // Start new measurement
    this.reset();
    this.points.push(point);
    this.onPreviewUpdate?.();
    return true;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    this.previewPoint = { x: event.worldX, y: event.worldY };

    // Update preview measurement if we have 2 points
    if (this.points.length === 2 && this.previewPoint) {
      this.measurement = this.calculateAngle(
        this.points[0]!,
        this.points[1]!,
        this.previewPoint
      );
    }

    this.onPreviewUpdate?.();
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape') {
      this.reset();
      this.onPreviewUpdate?.();
      return true;
    }

    // Toggle reflex angle with 'R'
    if (event.key === 'r' || event.key === 'R') {
      this.options.showReflex = !this.options.showReflex;
      if (this.points.length >= 2) {
        const p3 = this.points[2] || this.previewPoint;
        if (p3) {
          this.measurement = this.calculateAngle(
            this.points[0]!,
            this.points[1]!,
            p3
          );
        }
      }
      this.onPreviewUpdate?.();
      return true;
    }

    // Cycle units with 'U'
    if (event.key === 'u' || event.key === 'U') {
      const units: AngleUnit[] = ['degrees', 'radians', 'gradians'];
      const currentIndex = units.indexOf(this.options.unit);
      this.options.unit = units[(currentIndex + 1) % units.length]!;
      this.onPreviewUpdate?.();
      return true;
    }

    return false;
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const viewport = context.viewport;
    const zoom = viewport.getZoom();

    ctx.save();

    // Draw placed points
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]!;
      this.drawPoint(ctx, point, i === 1, zoom);
    }

    // Draw lines connecting points
    if (this.points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(this.points[0]!.x, this.points[0]!.y);
      ctx.lineTo(this.points[1]!.x, this.points[1]!.y);

      if (this.points.length >= 3) {
        ctx.moveTo(this.points[1]!.x, this.points[1]!.y);
        ctx.lineTo(this.points[2]!.x, this.points[2]!.y);
      } else if (this.previewPoint) {
        ctx.moveTo(this.points[1]!.x, this.points[1]!.y);
        ctx.lineTo(this.previewPoint.x, this.previewPoint.y);
      }

      ctx.strokeStyle = '#FF6600';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([5 / zoom, 3 / zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw preview point
    if (this.previewPoint && this.points.length < 3) {
      this.drawPoint(ctx, this.previewPoint, false, zoom, true);
    }

    // Draw angle arc and measurement
    if (this.measurement) {
      this.drawAngleArc(ctx, this.measurement, zoom);
      this.drawMeasurementText(ctx, this.measurement, zoom);
    }

    // Draw instructions
    this.drawInstructions(ctx, viewport);

    ctx.restore();
  }

  /**
   * Draw a point marker
   */
  private drawPoint(
    ctx: CanvasRenderingContext2D,
    point: Point,
    isVertex: boolean,
    zoom: number,
    isPreview = false
  ): void {
    const radius = (isVertex ? 6 : 4) / zoom;

    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);

    if (isVertex) {
      ctx.fillStyle = isPreview ? 'rgba(255, 102, 0, 0.5)' : '#FF6600';
    } else {
      ctx.fillStyle = isPreview ? 'rgba(255, 255, 255, 0.5)' : '#FFFFFF';
    }
    ctx.fill();

    ctx.strokeStyle = '#FF6600';
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();
  }

  /**
   * Draw the angle arc
   */
  private drawAngleArc(
    ctx: CanvasRenderingContext2D,
    measurement: AngleMeasurement,
    zoom: number
  ): void {
    const [p1, vertex, p2] = measurement.points;
    const radius = this.options.arcRadius / zoom;

    // Calculate angles
    const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
    const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);

    // Determine arc direction
    let startAngle = angle1;
    let endAngle = angle2;

    if (this.options.showReflex) {
      // Draw the larger arc
      const diff = this.normalizeAngle(endAngle - startAngle);
      if (diff < Math.PI) {
        // Swap to get reflex angle
        [startAngle, endAngle] = [endAngle, startAngle];
      }
    } else {
      // Draw the smaller arc
      const diff = this.normalizeAngle(endAngle - startAngle);
      if (diff > Math.PI) {
        // Swap to get smaller angle
        [startAngle, endAngle] = [endAngle, startAngle];
      }
    }

    // Draw arc
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, radius, startAngle, endAngle);
    ctx.strokeStyle = '#FF6600';
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();

    // Draw small tick marks at arc ends
    const tickLength = 8 / zoom;
    for (const angle of [startAngle, endAngle]) {
      const innerX = vertex.x + (radius - tickLength / 2) * Math.cos(angle);
      const innerY = vertex.y + (radius - tickLength / 2) * Math.sin(angle);
      const outerX = vertex.x + (radius + tickLength / 2) * Math.cos(angle);
      const outerY = vertex.y + (radius + tickLength / 2) * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }
  }

  /**
   * Draw measurement text
   */
  private drawMeasurementText(
    ctx: CanvasRenderingContext2D,
    measurement: AngleMeasurement,
    zoom: number
  ): void {
    const [p1, vertex, p2] = measurement.points;

    // Calculate text position (bisector of the angle)
    const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
    const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
    const bisector = (angle1 + angle2) / 2;

    // Adjust bisector for reflex angles
    let adjustedBisector = bisector;
    const diff = this.normalizeAngle(angle2 - angle1);
    if ((this.options.showReflex && diff < Math.PI) || (!this.options.showReflex && diff > Math.PI)) {
      adjustedBisector = bisector + Math.PI;
    }

    const textRadius = (this.options.arcRadius + 20) / zoom;
    const textX = vertex.x + textRadius * Math.cos(adjustedBisector);
    const textY = vertex.y + textRadius * Math.sin(adjustedBisector);

    // Format angle value
    const angleValue = this.formatAngle(measurement);

    // Draw background
    const fontSize = 14 / zoom;
    ctx.font = `bold ${fontSize}px sans-serif`;
    const textMetrics = ctx.measureText(angleValue);
    const padding = 4 / zoom;
    const bgWidth = textMetrics.width + padding * 2;
    const bgHeight = fontSize + padding * 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(
      textX - bgWidth / 2,
      textY - bgHeight / 2,
      bgWidth,
      bgHeight
    );

    ctx.strokeStyle = '#FF6600';
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(
      textX - bgWidth / 2,
      textY - bgHeight / 2,
      bgWidth,
      bgHeight
    );

    // Draw text
    ctx.fillStyle = '#FF6600';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(angleValue, textX, textY);
  }

  /**
   * Draw instructions
   */
  private drawInstructions(_ctx: CanvasRenderingContext2D, _viewport: { getZoom(): number }): void {
    // Instructions would need screen coordinates - skip for now
    // This method is a placeholder for future instruction overlay
  }

  /**
   * Calculate angle from three points
   */
  private calculateAngle(p1: Point, vertex: Point, p2: Point): AngleMeasurement {
    // Calculate vectors from vertex to each point
    const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
    const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };

    // Calculate angle using atan2 for each vector, then difference
    const angle1 = Math.atan2(v1.y, v1.x);
    const angle2 = Math.atan2(v2.y, v2.x);

    let angleRadians = Math.abs(angle2 - angle1);

    // Normalize to [0, 2π)
    if (angleRadians > Math.PI) {
      angleRadians = 2 * Math.PI - angleRadians;
    }

    // Check for reflex
    const isReflex = this.options.showReflex && angleRadians < Math.PI;
    if (isReflex) {
      angleRadians = 2 * Math.PI - angleRadians;
    }

    // Snap to common angles if enabled
    if (this.options.snapToCommon) {
      const degrees = angleRadians * (180 / Math.PI);
      const snapped = this.snapToCommonAngle(degrees);
      if (snapped !== degrees) {
        angleRadians = snapped * (Math.PI / 180);
      }
    }

    return {
      points: [p1, vertex, p2],
      angleRadians,
      angleDegrees: angleRadians * (180 / Math.PI),
      angleGradians: angleRadians * (200 / Math.PI),
      isReflex,
    };
  }

  /**
   * Snap to nearest common angle if within threshold
   */
  private snapToCommonAngle(degrees: number): number {
    const threshold = 2; // degrees
    for (const common of COMMON_ANGLES) {
      if (Math.abs(degrees - common) < threshold) {
        return common;
      }
    }
    return degrees;
  }

  /**
   * Normalize angle to [0, 2π)
   */
  private normalizeAngle(angle: number): number {
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    return angle;
  }

  /**
   * Format angle value with unit
   */
  private formatAngle(measurement: AngleMeasurement): string {
    const precision = this.options.precision;

    switch (this.options.unit) {
      case 'degrees':
        return `${measurement.angleDegrees.toFixed(precision)}°`;
      case 'radians':
        return `${measurement.angleRadians.toFixed(precision + 2)} rad`;
      case 'gradians':
        return `${measurement.angleGradians.toFixed(precision)} grad`;
      default:
        return `${measurement.angleDegrees.toFixed(precision)}°`;
    }
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.points = [];
    this.previewPoint = null;
    this.measurement = null;
  }
}

/**
 * Create an angle measurement tool
 */
export function createAngleTool(options?: AngleToolOptions): AngleTool {
  return new AngleTool(options);
}

/**
 * Calculate angle between two vectors (utility function)
 */
export function angleBetweenVectors(
  v1: { x: number; y: number },
  v2: { x: number; y: number }
): number {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle);
}

/**
 * Calculate angle between two lines defined by points
 */
export function angleBetweenLines(
  line1Start: Point,
  line1End: Point,
  line2Start: Point,
  line2End: Point
): number {
  const v1 = { x: line1End.x - line1Start.x, y: line1End.y - line1Start.y };
  const v2 = { x: line2End.x - line2Start.x, y: line2End.y - line2Start.y };
  return angleBetweenVectors(v1, v2);
}
