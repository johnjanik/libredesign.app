/**
 * Reference Point Tool
 *
 * Tool for placing reference points that can be used for snapping.
 * - Click to place a reference point
 * - Double-click to add a label
 * - Hold Shift to snap to grid
 */

import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import {
  type ReferencePoint,
  type ConstructionStyle,
  DEFAULT_CONSTRUCTION_STYLE,
  createReferencePoint,
} from '@core/types/construction';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '../base/tool';

/**
 * Reference point tool options
 */
export interface ReferencePointToolOptions {
  /** Visual style for reference points */
  readonly style?: ConstructionStyle;
  /** Grid size for snapping (0 = no grid snap) */
  readonly gridSize?: number;
  /** Callback when a reference point is created */
  readonly onPointCreate?: (point: ReferencePoint) => void;
  /** Function to generate unique IDs */
  readonly generateId?: () => NodeId;
}

/**
 * Reference Point Tool
 */
export class ReferencePointTool extends BaseTool {
  readonly name = 'reference-point';
  cursor: ToolCursor = 'crosshair';

  private style: ConstructionStyle;
  private gridSize: number;
  private onPointCreate: ((point: ReferencePoint) => void) | null = null;
  private generateId: () => NodeId;

  // Preview state
  private previewPoint: Point | null = null;
  private snapToGrid = false;

  constructor(options: ReferencePointToolOptions = {}) {
    super();
    this.style = options.style ?? { ...DEFAULT_CONSTRUCTION_STYLE, color: '#ff00ff' }; // Magenta for points
    this.gridSize = options.gridSize ?? 10;
    this.onPointCreate = options.onPointCreate ?? null;
    this.generateId = options.generateId ?? (() => `rpoint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as NodeId);
  }

  /**
   * Set visual style
   */
  setStyle(style: ConstructionStyle): void {
    this.style = style;
  }

  /**
   * Set grid size
   */
  setGridSize(size: number): void {
    this.gridSize = size;
  }

  /**
   * Set callback for point creation
   */
  setOnPointCreate(callback: (point: ReferencePoint) => void): void {
    this.onPointCreate = callback;
  }

  activate(context: ToolContext): void {
    super.activate(context);
    this.previewPoint = null;
  }

  deactivate(): void {
    this.previewPoint = null;
    super.deactivate();
  }

  onPointerDown(event: PointerEventData, _context: ToolContext): boolean {
    let point: Point = { x: event.worldX, y: event.worldY };
    this.snapToGrid = event.shiftKey;

    // Apply grid snap if shift held
    if (this.snapToGrid && this.gridSize > 0) {
      point = this.snapPointToGrid(point);
    }

    // Create the reference point
    const refPoint = createReferencePoint(
      this.generateId(),
      point,
      undefined,
      this.style
    );

    this.onPointCreate?.(refPoint);
    return true;
  }

  onPointerMove(event: PointerEventData, _context: ToolContext): void {
    let point: Point = { x: event.worldX, y: event.worldY };
    this.snapToGrid = event.shiftKey;

    if (this.snapToGrid && this.gridSize > 0) {
      point = this.snapPointToGrid(point);
    }

    this.previewPoint = point;
  }

  onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape') {
      this.previewPoint = null;
      return true;
    }
    return false;
  }

  onKeyUp(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Shift') {
      this.snapToGrid = false;
    }
    return false;
  }

  getCursor(_point: Point, _context: ToolContext): ToolCursor {
    return 'crosshair';
  }

  render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    if (!this.previewPoint) return;

    const zoom = context.viewport.getZoom();
    this.renderReferencePoint(ctx, this.previewPoint, zoom, 0.5); // Preview at half opacity
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private snapPointToGrid(point: Point): Point {
    return {
      x: Math.round(point.x / this.gridSize) * this.gridSize,
      y: Math.round(point.y / this.gridSize) * this.gridSize,
    };
  }

  private renderReferencePoint(
    ctx: CanvasRenderingContext2D,
    point: Point,
    zoom: number,
    opacity: number = 1
  ): void {
    const size = 8 / zoom;
    const crossSize = 4 / zoom;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Draw circle
    ctx.strokeStyle = this.style.color;
    ctx.lineWidth = 1.5 / zoom;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.stroke();

    // Draw cross
    ctx.beginPath();
    ctx.moveTo(point.x - crossSize, point.y);
    ctx.lineTo(point.x + crossSize, point.y);
    ctx.moveTo(point.x, point.y - crossSize);
    ctx.lineTo(point.x, point.y + crossSize);
    ctx.stroke();

    // Draw center dot
    ctx.fillStyle = this.style.color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2 / zoom, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Create a reference point tool instance
 */
export function createReferencePointTool(options?: ReferencePointToolOptions): ReferencePointTool {
  return new ReferencePointTool(options);
}
