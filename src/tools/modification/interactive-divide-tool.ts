/**
 * Interactive Divide Tool
 *
 * An interactive tool for dividing curves into equal segments.
 * Extends BaseTool for integration with the tool manager.
 *
 * Usage:
 * 1. Hover over a curve to see division preview
 * 2. Click to apply division and create markers
 * 3. Use +/- keys to adjust segment count
 * 4. Press M to toggle division mode (count/length)
 */

import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '../base/tool';
import {
  DivideTool,
  type DivisionMode,
  type DivideResult,
  type CurveData,
} from './divide-tool';

/**
 * Interactive divide tool options
 */
export interface InteractiveDivideToolOptions {
  /** Initial division mode */
  mode?: DivisionMode;
  /** Initial segment count */
  segments?: number;
  /** Initial segment length */
  segmentLength?: number;
  /** Hover detection distance */
  hoverDistance?: number;
  /** Marker size */
  markerSize?: number;
}

const DEFAULT_OPTIONS: Required<InteractiveDivideToolOptions> = {
  mode: 'count',
  segments: 4,
  segmentLength: 50,
  hoverDistance: 10,
  markerSize: 4,
};

/**
 * Divisible curve info from scene graph
 */
export interface DivisibleCurve {
  nodeId: NodeId;
  curveData: CurveData;
}

/**
 * Interactive Divide Tool - extends BaseTool for tool manager integration
 */
export class InteractiveDivideTool extends BaseTool {
  readonly name = 'divide';
  cursor: ToolCursor = 'crosshair';

  private options: Required<InteractiveDivideToolOptions>;
  private divideTool: DivideTool;
  private hoveredCurve: DivisibleCurve | null = null;
  private previewPoints: Point[] = [];

  // Callbacks to be set by runtime
  private _onGetDivisibleCurves?: () => DivisibleCurve[];
  private onFindCurveAtPoint?: (point: Point) => DivisibleCurve | null;
  private onCreateMarker?: (point: Point, size: number) => NodeId;
  private onDivisionComplete?: (result: DivideResult) => void;
  private onPreviewUpdate?: () => void;
  private onModeChanged?: (mode: DivisionMode, segments: number, length: number) => void;

  constructor(options: InteractiveDivideToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Create internal divide tool utility
    this.divideTool = new DivideTool({
      mode: this.options.mode,
      segments: this.options.segments,
      segmentLength: this.options.segmentLength,
      includeEndpoints: true,
      createMarkers: true,
      markerSize: this.options.markerSize,
    });
  }

  /**
   * Set callback to get all divisible curves in the scene.
   */
  setOnGetDivisibleCurves(callback: () => DivisibleCurve[]): void {
    this._onGetDivisibleCurves = callback;
  }

  /**
   * Get the callback for retrieving all divisible curves.
   */
  getOnGetDivisibleCurves(): (() => DivisibleCurve[]) | undefined {
    return this._onGetDivisibleCurves;
  }

  /**
   * Set callback to find a curve at a given point.
   */
  setOnFindCurveAtPoint(callback: (point: Point) => DivisibleCurve | null): void {
    this.onFindCurveAtPoint = callback;
  }

  /**
   * Set callback for creating marker nodes.
   */
  setOnCreateMarker(callback: (point: Point, size: number) => NodeId): void {
    this.onCreateMarker = callback;
    this.divideTool.setCreateMarker(callback);
  }

  /**
   * Set callback for division completion.
   */
  setOnDivisionComplete(callback: (result: DivideResult) => void): void {
    this.onDivisionComplete = callback;
  }

  /**
   * Set callback for preview updates.
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Set callback for mode changes.
   */
  setOnModeChanged(callback: (mode: DivisionMode, segments: number, length: number) => void): void {
    this.onModeChanged = callback;
  }

  /**
   * Get current division mode.
   */
  getMode(): DivisionMode {
    return this.divideTool.getMode();
  }

  /**
   * Set division mode.
   */
  setMode(mode: DivisionMode): void {
    this.divideTool.setMode(mode);
    this.updatePreview();
    this.notifyModeChanged();
  }

  /**
   * Get current segment count.
   */
  getSegments(): number {
    return this.divideTool.getSegments();
  }

  /**
   * Set segment count.
   */
  setSegments(segments: number): void {
    this.divideTool.setSegments(segments);
    this.updatePreview();
    this.notifyModeChanged();
  }

  /**
   * Get current segment length.
   */
  getSegmentLength(): number {
    return this.divideTool.getSegmentLength();
  }

  /**
   * Set segment length.
   */
  setSegmentLength(length: number): void {
    this.divideTool.setSegmentLength(length);
    this.updatePreview();
    this.notifyModeChanged();
  }

  /**
   * Get preview points.
   */
  getPreviewPoints(): readonly Point[] {
    return this.previewPoints;
  }

  /**
   * Get hovered curve.
   */
  getHoveredCurve(): DivisibleCurve | null {
    return this.hoveredCurve;
  }

  private notifyModeChanged(): void {
    this.onModeChanged?.(
      this.divideTool.getMode(),
      this.divideTool.getSegments(),
      this.divideTool.getSegmentLength()
    );
  }

  private updatePreview(): void {
    if (this.hoveredCurve) {
      this.previewPoints = this.divideTool.previewCurveData(this.hoveredCurve.curveData);
    } else {
      this.previewPoints = [];
    }
    this.onPreviewUpdate?.();
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.hoveredCurve = null;
    this.previewPoints = [];
  }

  override deactivate(): void {
    super.deactivate();
    this.hoveredCurve = null;
    this.previewPoints = [];
    this.onPreviewUpdate?.();
  }

  override onPointerMove(event: PointerEventData, context: ToolContext): void {
    super.onPointerMove(event, context);

    const point = { x: event.worldX, y: event.worldY };

    // Find curve under cursor
    const curve = this.onFindCurveAtPoint?.(point) ?? null;

    if (curve !== this.hoveredCurve) {
      this.hoveredCurve = curve;
      this.updatePreview();
    }
  }

  override onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    super.onPointerDown(event, context);

    if (event.button !== 0) return false;

    // Apply division if hovering over a curve
    if (this.hoveredCurve) {
      this.applyDivision(this.hoveredCurve);
      return true;
    }

    return false;
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    const mode = this.divideTool.getMode();

    switch (event.key) {
      case '+':
      case '=':
        // Increase segments
        if (mode === 'count') {
          this.divideTool.setSegments(this.divideTool.getSegments() + 1);
        } else {
          this.divideTool.setSegmentLength(this.divideTool.getSegmentLength() + 10);
        }
        this.updatePreview();
        this.notifyModeChanged();
        return true;

      case '-':
      case '_':
        // Decrease segments
        if (mode === 'count') {
          this.divideTool.setSegments(Math.max(1, this.divideTool.getSegments() - 1));
        } else {
          this.divideTool.setSegmentLength(Math.max(1, this.divideTool.getSegmentLength() - 10));
        }
        this.updatePreview();
        this.notifyModeChanged();
        return true;

      case 'm':
      case 'M':
        // Toggle mode
        this.divideTool.setMode(mode === 'count' ? 'length' : 'count');
        this.updatePreview();
        this.notifyModeChanged();
        return true;

      case 'Escape':
        // Clear hover
        this.hoveredCurve = null;
        this.previewPoints = [];
        this.onPreviewUpdate?.();
        return true;

      default:
        return false;
    }
  }

  private applyDivision(curve: DivisibleCurve): void {
    // Set up the divide tool with curve data callback
    this.divideTool.setGetCurveData(() => curve.curveData);

    // Set up marker creation if callback is available
    if (this.onCreateMarker) {
      this.divideTool.setCreateMarker(this.onCreateMarker);
    }

    // Perform division
    const result = this.divideTool.divide(curve.nodeId);

    if (result.success) {
      this.onDivisionComplete?.(result);
    }

    // Update preview
    this.updatePreview();
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (this.previewPoints.length === 0) return;

    const viewport = context.viewport;

    ctx.save();

    // Draw preview markers
    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)'; // Blue
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;

    for (const point of this.previewPoints) {
      const screenPoint = viewport.worldToCanvas(point.x, point.y);

      ctx.beginPath();
      ctx.arc(screenPoint.x, screenPoint.y, this.options.markerSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Draw segment count/length indicator
    if (this.hoveredCurve && this.previewPoints.length > 0) {
      const lastPoint = this.previewPoints[this.previewPoints.length - 1]!;
      const screenPoint = viewport.worldToCanvas(lastPoint.x, lastPoint.y);

      const mode = this.divideTool.getMode();
      const text =
        mode === 'count'
          ? `${this.divideTool.getSegments()} segments`
          : `${this.divideTool.getSegmentLength()}px length`;

      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(screenPoint.x + 10, screenPoint.y - 20, ctx.measureText(text).width + 8, 20);
      ctx.fillStyle = 'white';
      ctx.fillText(text, screenPoint.x + 14, screenPoint.y - 6);
    }

    ctx.restore();
  }
}

/**
 * Create an interactive divide tool.
 */
export function createInteractiveDivideTool(
  options?: InteractiveDivideToolOptions
): InteractiveDivideTool {
  return new InteractiveDivideTool(options);
}
