/**
 * Hatch Tool
 *
 * Interactive tool for applying hatch patterns to regions.
 * Supports:
 * - Click to hatch closed regions (auto-detect boundary)
 * - Manual boundary selection
 * - Pattern selection and customization
 * - Pick point inside region
 */

import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import type {
  HatchFill,
  HatchBoundary,
  HatchData,
  HatchPattern,
} from '@core/types/hatch';
import {
  createDefaultHatchFill,
  getHatchPattern,
  getPatternNames,
  HATCH_PATTERNS,
} from '@core/types/hatch';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '../base/tool';

/**
 * Hatch tool options
 */
export interface HatchToolOptions {
  /** Default pattern name */
  readonly defaultPattern?: string;
  /** Default scale */
  readonly defaultScale?: number;
  /** Default rotation */
  readonly defaultRotation?: number;
  /** Default color */
  readonly defaultColor?: { r: number; g: number; b: number; a: number };
  /** Tolerance for boundary detection */
  readonly boundaryTolerance?: number;
}

const DEFAULT_OPTIONS: Required<HatchToolOptions> = {
  defaultPattern: 'ANSI31',
  defaultScale: 1,
  defaultRotation: 0,
  defaultColor: { r: 0, g: 0, b: 0, a: 1 },
  boundaryTolerance: 5,
};

/**
 * Result of hatch creation
 */
export interface HatchCreateResult {
  /** Created hatch data */
  readonly hatchData: HatchData;
  /** Associated node ID (if created as node) */
  readonly nodeId?: NodeId;
}

/**
 * Hatch tool for applying patterns to regions
 */
export class HatchTool extends BaseTool {
  readonly name = 'hatch';
  cursor: ToolCursor = 'crosshair';

  private options: Required<HatchToolOptions>;
  private currentFill: HatchFill;
  private currentPatternName: string;
  private patternNames: string[];
  private patternIndex: number = 0;
  private previewPoint: Point | null = null;
  private detectedBoundary: HatchBoundary | null = null;

  // Callbacks
  private onHatchCreate?: (result: HatchCreateResult) => void;
  private onPreviewUpdate?: () => void;
  private onDetectBoundary?: (point: Point) => HatchBoundary | null;
  private onGetClosedPaths?: () => Point[][];

  constructor(options: HatchToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.currentPatternName = this.options.defaultPattern;
    this.currentFill = createDefaultHatchFill(this.currentPatternName);
    this.currentFill = {
      ...this.currentFill,
      scale: this.options.defaultScale,
      rotation: this.options.defaultRotation,
      color: this.options.defaultColor,
    };
    this.patternNames = getPatternNames();
    this.patternIndex = this.patternNames.indexOf(this.currentPatternName);
    if (this.patternIndex < 0) this.patternIndex = 0;
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Set callback for when hatch is created.
   */
  setOnHatchCreate(callback: (result: HatchCreateResult) => void): void {
    this.onHatchCreate = callback;
  }

  /**
   * Set callback for preview updates.
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Set callback to detect boundary at a point.
   */
  setOnDetectBoundary(callback: (point: Point) => HatchBoundary | null): void {
    this.onDetectBoundary = callback;
  }

  /**
   * Set callback to get all closed paths for boundary detection.
   */
  setOnGetClosedPaths(callback: () => Point[][]): void {
    this.onGetClosedPaths = callback;
  }

  /**
   * Set the current pattern by name.
   */
  setPattern(patternName: string): void {
    if (HATCH_PATTERNS[patternName]) {
      this.currentPatternName = patternName;
      this.patternIndex = this.patternNames.indexOf(patternName);
      this.currentFill = { ...this.currentFill, pattern: patternName };
      this.onPreviewUpdate?.();
    }
  }

  /**
   * Get current pattern name.
   */
  getPatternName(): string {
    return this.currentPatternName;
  }

  /**
   * Get current pattern definition.
   */
  getCurrentPattern(): HatchPattern | null {
    return getHatchPattern(this.currentPatternName);
  }

  /**
   * Set hatch scale.
   */
  setScale(scale: number): void {
    this.currentFill = { ...this.currentFill, scale: Math.max(0.1, scale) };
    this.onPreviewUpdate?.();
  }

  /**
   * Get current scale.
   */
  getScale(): number {
    return this.currentFill.scale;
  }

  /**
   * Set hatch rotation.
   */
  setRotation(rotation: number): void {
    this.currentFill = { ...this.currentFill, rotation };
    this.onPreviewUpdate?.();
  }

  /**
   * Get current rotation.
   */
  getRotation(): number {
    return this.currentFill.rotation;
  }

  /**
   * Set hatch color.
   */
  setColor(color: { r: number; g: number; b: number; a: number }): void {
    this.currentFill = { ...this.currentFill, color };
    this.onPreviewUpdate?.();
  }

  /**
   * Get current color.
   */
  getColor(): { r: number; g: number; b: number; a: number } {
    return this.currentFill.color;
  }

  /**
   * Get all available pattern names.
   */
  getAvailablePatterns(): string[] {
    return this.patternNames;
  }

  /**
   * Cycle to next pattern.
   */
  nextPattern(): void {
    this.patternIndex = (this.patternIndex + 1) % this.patternNames.length;
    this.currentPatternName = this.patternNames[this.patternIndex]!;
    this.currentFill = { ...this.currentFill, pattern: this.currentPatternName };
    this.onPreviewUpdate?.();
  }

  /**
   * Cycle to previous pattern.
   */
  previousPattern(): void {
    this.patternIndex = (this.patternIndex - 1 + this.patternNames.length) % this.patternNames.length;
    this.currentPatternName = this.patternNames[this.patternIndex]!;
    this.currentFill = { ...this.currentFill, pattern: this.currentPatternName };
    this.onPreviewUpdate?.();
  }

  // ===========================================================================
  // Tool Lifecycle
  // ===========================================================================

  override activate(_context: ToolContext): void {
    this.previewPoint = null;
    this.detectedBoundary = null;
  }

  override deactivate(): void {
    this.previewPoint = null;
    this.detectedBoundary = null;
  }

  // ===========================================================================
  // Pointer Events
  // ===========================================================================

  override onPointerDown(event: PointerEventData, _context: ToolContext): boolean {
    if (event.button !== 0) return false;
    return true;
  }

  override onPointerMove(event: PointerEventData, _context: ToolContext): void {
    this.previewPoint = { x: event.canvasX, y: event.canvasY };

    // Try to detect boundary at current position
    if (this.onDetectBoundary) {
      this.detectedBoundary = this.onDetectBoundary(this.previewPoint);
    } else if (this.onGetClosedPaths) {
      // Fallback: find which closed path contains the point
      const closedPaths = this.onGetClosedPaths();
      this.detectedBoundary = this.findContainingBoundary(this.previewPoint, closedPaths);
    }

    this.onPreviewUpdate?.();
  }

  override onPointerUp(event: PointerEventData, _context: ToolContext): void {
    if (event.button !== 0) return;

    const point = { x: event.canvasX, y: event.canvasY };

    // Get boundary to hatch
    let boundary = this.detectedBoundary;
    if (!boundary && this.onDetectBoundary) {
      boundary = this.onDetectBoundary(point);
    } else if (!boundary && this.onGetClosedPaths) {
      const closedPaths = this.onGetClosedPaths();
      boundary = this.findContainingBoundary(point, closedPaths);
    }

    if (boundary) {
      // Create hatch
      const hatchData: HatchData = {
        fill: this.currentFill,
        boundaries: [boundary],
        associative: true,
      };

      this.onHatchCreate?.({
        hatchData,
      });
    }

    this.detectedBoundary = null;
    this.onPreviewUpdate?.();
  }

  // ===========================================================================
  // Keyboard Events
  // ===========================================================================

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    switch (event.key) {
      case 'Tab':
        // Cycle patterns
        if (event.shiftKey) {
          this.previousPattern();
        } else {
          this.nextPattern();
        }
        return true;

      case 'ArrowUp':
        // Increase scale
        this.setScale(this.currentFill.scale * 1.1);
        return true;

      case 'ArrowDown':
        // Decrease scale
        this.setScale(this.currentFill.scale / 1.1);
        return true;

      case 'ArrowLeft':
        // Rotate counter-clockwise
        this.setRotation(this.currentFill.rotation - 15);
        return true;

      case 'ArrowRight':
        // Rotate clockwise
        this.setRotation(this.currentFill.rotation + 15);
        return true;

      case 'Escape':
        this.previewPoint = null;
        this.detectedBoundary = null;
        this.onPreviewUpdate?.();
        return true;
    }

    return false;
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  override render(ctx: CanvasRenderingContext2D): void {
    // Draw pattern preview info
    this.renderPatternInfo(ctx);

    // Highlight detected boundary
    if (this.detectedBoundary && this.detectedBoundary.points) {
      this.renderBoundaryHighlight(ctx, this.detectedBoundary.points);
    }
  }

  private renderPatternInfo(ctx: CanvasRenderingContext2D): void {
    // Draw info box at bottom-left
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for screen-space rendering

    const infoX = 10;
    const infoY = ctx.canvas.height - 60;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(infoX, infoY, 200, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Pattern: ${this.currentPatternName}`, infoX + 10, infoY + 18);
    ctx.fillText(`Scale: ${this.currentFill.scale.toFixed(2)}`, infoX + 10, infoY + 33);
    ctx.fillText(`Rotation: ${this.currentFill.rotation.toFixed(0)}°`, infoX + 100, infoY + 33);

    ctx.restore();
  }

  private renderBoundaryHighlight(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
    if (points.length < 3) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    ctx.closePath();

    // Fill with semi-transparent pattern preview color
    ctx.fillStyle = `rgba(${this.currentFill.color.r * 255}, ${this.currentFill.color.g * 255}, ${this.currentFill.color.b * 255}, 0.2)`;
    ctx.fill();

    // Stroke the boundary
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();

    ctx.restore();
  }

  // ===========================================================================
  // Boundary Detection Helpers
  // ===========================================================================

  /**
   * Find which closed path contains the given point.
   */
  private findContainingBoundary(point: Point, closedPaths: Point[][]): HatchBoundary | null {
    for (const path of closedPaths) {
      if (this.isPointInPolygon(point, path)) {
        return {
          type: 'polyline',
          points: path,
          isOuter: true,
        };
      }
    }
    return null;
  }

  /**
   * Check if a point is inside a polygon using ray casting.
   */
  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const pi = polygon[i]!;
      const pj = polygon[j]!;

      if (((pi.y > point.y) !== (pj.y > point.y)) &&
          (point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x)) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Get preview info for UI.
   */
  getPreviewInfo(): {
    point: Point | null;
    patternName: string;
    scale: number;
    rotation: number;
    hasBoundary: boolean;
  } {
    return {
      point: this.previewPoint,
      patternName: this.currentPatternName,
      scale: this.currentFill.scale,
      rotation: this.currentFill.rotation,
      hasBoundary: !!this.detectedBoundary,
    };
  }
}

/**
 * Create a hatch tool instance.
 */
export function createHatchTool(options?: HatchToolOptions): HatchTool {
  return new HatchTool(options);
}
