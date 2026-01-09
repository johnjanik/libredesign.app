/**
 * Dimension Tool
 *
 * Tool for creating linear, angular, and radial dimensions.
 * Dimensions are associative - they update when referenced geometry changes.
 *
 * Usage:
 * - Click first point, click second point, move to set offset, click to place
 * - Shift constrains to horizontal/vertical
 * - Alt creates aligned dimension (follows the angle between points)
 */

import type { NodeId } from '@core/types/common';
import type { Point, Rect } from '@core/types/geometry';
import type { SceneGraph } from '@scene/graph/scene-graph';
import {
  type LinearDimensionOrientation,
  type DimensionStyle,
  type DimensionAnchor,
  type LinearDimensionData,
  DEFAULT_DIMENSION_STYLE,
  calculateLinearDimensionGeometry,
  calculateDistance,
  formatDimensionValue,
} from '@core/types/annotation';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '../base/tool';

/**
 * Dimension tool mode
 */
type DimensionToolMode = 'LINEAR' | 'ANGULAR' | 'RADIAL';

/**
 * Dimension tool state
 */
type DimensionState =
  | 'idle'
  | 'placing_start'
  | 'placing_end'
  | 'placing_offset';

/**
 * Dimension tool options
 */
export interface DimensionToolOptions {
  /** Default dimension mode */
  readonly defaultMode?: DimensionToolMode;
  /** Default style */
  readonly defaultStyle?: Partial<DimensionStyle>;
  /** Snap threshold for snapping to nodes */
  readonly snapThreshold?: number;
  /** Callback when dimension is created */
  readonly onDimensionCreate?: (data: LinearDimensionData, startPoint: Point, endPoint: Point) => void;
}

const DEFAULT_OPTIONS = {
  defaultMode: 'LINEAR' as DimensionToolMode,
  snapThreshold: 10,
};

/**
 * Dimension Tool
 */
export class DimensionTool extends BaseTool {
  readonly name = 'dimension';
  cursor: ToolCursor = 'crosshair';

  private mode: DimensionToolMode;
  private state: DimensionState = 'idle';
  private style: DimensionStyle;
  private snapThreshold: number;

  // Points being placed
  private startPoint: Point | null = null;
  private endPoint: Point | null = null;
  private offset = 30;
  private orientation: LinearDimensionOrientation = 'ALIGNED';

  // Preview state
  private previewPoint: Point | null = null;

  // Snapped node references
  private startNodeRef: { nodeId: NodeId; position: string } | null = null;
  private endNodeRef: { nodeId: NodeId; position: string } | null = null;

  // Callback
  private onDimensionCreate: ((data: LinearDimensionData, startPoint: Point, endPoint: Point) => void) | null;

  constructor(options: DimensionToolOptions = {}) {
    super();
    this.mode = options.defaultMode ?? DEFAULT_OPTIONS.defaultMode;
    this.style = { ...DEFAULT_DIMENSION_STYLE, ...options.defaultStyle };
    this.snapThreshold = options.snapThreshold ?? DEFAULT_OPTIONS.snapThreshold;
    this.onDimensionCreate = options.onDimensionCreate ?? null;
  }

  /**
   * Set dimension mode
   */
  setMode(mode: DimensionToolMode): void {
    this.mode = mode;
    this.reset();
  }

  /**
   * Get current mode
   */
  getMode(): DimensionToolMode {
    return this.mode;
  }

  /**
   * Update style
   */
  setStyle(style: Partial<DimensionStyle>): void {
    this.style = { ...this.style, ...style };
  }

  activate(context: ToolContext): void {
    super.activate(context);
    this.reset();
  }

  deactivate(): void {
    super.deactivate();
    this.reset();
  }

  private reset(): void {
    this.state = 'idle';
    this.startPoint = null;
    this.endPoint = null;
    this.previewPoint = null;
    this.offset = 30;
    this.orientation = 'ALIGNED';
    this.startNodeRef = null;
    this.endNodeRef = null;
  }

  onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    super.onPointerDown(event, context);

    const worldPoint = { x: event.worldX, y: event.worldY };
    const zoom = context.viewport.getZoom();

    // Try to snap to nodes
    const snapped = this.snapToNode(worldPoint, context.sceneGraph, zoom);
    const point = snapped?.point ?? worldPoint;

    if (this.mode === 'LINEAR') {
      if (this.state === 'idle') {
        // First click - set start point
        this.startPoint = point;
        this.startNodeRef = snapped?.nodeRef ?? null;
        this.state = 'placing_end';
        return true;
      } else if (this.state === 'placing_end' && this.startPoint) {
        // Second click - set end point
        this.endPoint = point;
        this.endNodeRef = snapped?.nodeRef ?? null;
        this.state = 'placing_offset';
        return true;
      } else if (this.state === 'placing_offset' && this.startPoint && this.endPoint) {
        // Third click - finalize dimension
        this.createDimension();
        this.reset();
        return true;
      }
    }

    return true;
  }

  onPointerMove(event: PointerEventData, context: ToolContext): void {
    super.onPointerMove(event, context);

    const worldPoint = { x: event.worldX, y: event.worldY };
    const zoom = context.viewport.getZoom();

    // Determine orientation from modifier keys
    if (event.shiftKey) {
      // Shift constrains to H or V based on dominant axis
      if (this.startPoint) {
        const dx = Math.abs(worldPoint.x - this.startPoint.x);
        const dy = Math.abs(worldPoint.y - this.startPoint.y);
        this.orientation = dx > dy ? 'HORIZONTAL' : 'VERTICAL';
      }
    } else if (event.altKey) {
      this.orientation = 'ALIGNED';
    } else {
      // Auto-detect based on angle
      if (this.startPoint) {
        const dx = Math.abs(worldPoint.x - this.startPoint.x);
        const dy = Math.abs(worldPoint.y - this.startPoint.y);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 15) {
          this.orientation = 'HORIZONTAL';
        } else if (angle > 75) {
          this.orientation = 'VERTICAL';
        } else {
          this.orientation = 'ALIGNED';
        }
      }
    }

    if (this.state === 'placing_end') {
      // Snap to nodes while placing end point
      const snapped = this.snapToNode(worldPoint, context.sceneGraph, zoom);
      this.previewPoint = snapped?.point ?? worldPoint;
    } else if (this.state === 'placing_offset' && this.startPoint && this.endPoint) {
      // Calculate offset from mouse position
      this.offset = this.calculateOffsetFromMouse(worldPoint);
      this.previewPoint = worldPoint;
    } else {
      this.previewPoint = worldPoint;
    }
  }

  onPointerUp(_event: PointerEventData, _context: ToolContext): void {
    super.onPointerUp(_event, _context);
    // Click handling is done in onPointerDown
  }

  onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape') {
      this.reset();
      return true;
    }

    // Number keys adjust precision
    if (event.key >= '0' && event.key <= '4') {
      this.style = { ...this.style, precision: parseInt(event.key) };
      return true;
    }

    return false;
  }

  getCursor(_point: Point, _context: ToolContext): ToolCursor {
    return 'crosshair';
  }

  render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const zoom = context.viewport.getZoom();

    ctx.save();

    if (this.mode === 'LINEAR') {
      this.renderLinearPreview(ctx, zoom);
    }

    // Render snap indicators
    this.renderSnapIndicators(ctx, context, zoom);

    ctx.restore();
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private renderLinearPreview(ctx: CanvasRenderingContext2D, zoom: number): void {
    const lineWidth = 1 / zoom;
    const textSize = this.style.textSize / zoom;

    if (this.state === 'placing_end' && this.startPoint && this.previewPoint) {
      // Draw preview line from start to cursor
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([4 / zoom, 4 / zoom]);

      ctx.beginPath();
      ctx.moveTo(this.startPoint.x, this.startPoint.y);
      ctx.lineTo(this.previewPoint.x, this.previewPoint.y);
      ctx.stroke();

      // Draw distance preview
      const distance = calculateDistance(this.startPoint, this.previewPoint);
      const text = formatDimensionValue(distance, this.style.precision, this.style.unitFormat, this.style.showUnits);
      const midX = (this.startPoint.x + this.previewPoint.x) / 2;
      const midY = (this.startPoint.y + this.previewPoint.y) / 2;

      ctx.fillStyle = '#0066ff';
      ctx.font = `${textSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(text, midX, midY - 5 / zoom);

      // Draw start point indicator
      this.renderPointIndicator(ctx, this.startPoint, zoom, true);
    } else if (this.state === 'placing_offset' && this.startPoint && this.endPoint) {
      // Draw full dimension preview
      const geometry = calculateLinearDimensionGeometry(
        this.startPoint,
        this.endPoint,
        this.orientation,
        this.offset,
        this.style
      );

      // Extension lines
      ctx.strokeStyle = this.style.lineColor;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([]);

      if (geometry.extensionLine1) {
        ctx.beginPath();
        ctx.moveTo(geometry.extensionLine1.start.x, geometry.extensionLine1.start.y);
        ctx.lineTo(geometry.extensionLine1.end.x, geometry.extensionLine1.end.y);
        ctx.stroke();
      }

      if (geometry.extensionLine2) {
        ctx.beginPath();
        ctx.moveTo(geometry.extensionLine2.start.x, geometry.extensionLine2.start.y);
        ctx.lineTo(geometry.extensionLine2.end.x, geometry.extensionLine2.end.y);
        ctx.stroke();
      }

      // Dimension line
      ctx.beginPath();
      ctx.moveTo(geometry.lineStart.x, geometry.lineStart.y);
      ctx.lineTo(geometry.lineEnd.x, geometry.lineEnd.y);
      ctx.stroke();

      // Arrows
      this.renderArrow(ctx, geometry.lineStart, geometry.lineEnd, zoom);
      this.renderArrow(ctx, geometry.lineEnd, geometry.lineStart, zoom);

      // Text
      ctx.save();
      ctx.translate(geometry.textPosition.x, geometry.textPosition.y);
      ctx.rotate((geometry.textRotation * Math.PI) / 180);

      ctx.fillStyle = this.style.textColor;
      ctx.font = `${textSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(geometry.displayText, 0, -3 / zoom);

      ctx.restore();

      // Draw measured points
      this.renderPointIndicator(ctx, this.startPoint, zoom, true);
      this.renderPointIndicator(ctx, this.endPoint, zoom, true);

      // Show orientation hint
      const orientationText = `[${this.orientation}]`;
      ctx.fillStyle = 'rgba(0, 102, 255, 0.7)';
      ctx.font = `${10 / zoom}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(orientationText, geometry.textPosition.x + 30 / zoom, geometry.textPosition.y);
    }
  }

  private renderArrow(
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    zoom: number
  ): void {
    const arrowSize = this.style.arrowSize / zoom;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.save();
    ctx.translate(from.x, from.y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(arrowSize, arrowSize / 3);
    ctx.lineTo(arrowSize, -arrowSize / 3);
    ctx.closePath();
    ctx.fillStyle = this.style.lineColor;
    ctx.fill();

    ctx.restore();
  }

  private renderPointIndicator(
    ctx: CanvasRenderingContext2D,
    point: Point,
    zoom: number,
    filled: boolean
  ): void {
    const size = 4 / zoom;

    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);

    if (filled) {
      ctx.fillStyle = '#0066ff';
      ctx.fill();
    } else {
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
    }
  }

  private renderSnapIndicators(
    ctx: CanvasRenderingContext2D,
    context: ToolContext,
    zoom: number
  ): void {
    // Render snap points on selected nodes
    for (const nodeId of context.selectedNodeIds) {
      const bounds = context.sceneGraph.getWorldBounds(nodeId);
      if (!bounds) continue;

      const snapPoints = this.getNodeSnapPoints(bounds);
      const size = 3 / zoom;

      ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';

      for (const point of Object.values(snapPoints)) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private getNodeSnapPoints(bounds: Rect): Record<string, Point> {
    return {
      'nw': { x: bounds.x, y: bounds.y },
      'n': { x: bounds.x + bounds.width / 2, y: bounds.y },
      'ne': { x: bounds.x + bounds.width, y: bounds.y },
      'w': { x: bounds.x, y: bounds.y + bounds.height / 2 },
      'center': { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
      'e': { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      'sw': { x: bounds.x, y: bounds.y + bounds.height },
      's': { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      'se': { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    };
  }

  private snapToNode(
    point: Point,
    sceneGraph: SceneGraph,
    zoom: number
  ): { point: Point; nodeRef: { nodeId: NodeId; position: string } } | null {
    const threshold = this.snapThreshold / zoom;

    // Get all nodes and check snap points
    const doc = sceneGraph.getDocument();
    if (!doc) return null;

    const pageIds = sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) return null;

    type SnapResult = { point: Point; nodeRef: { nodeId: NodeId; position: string }; dist: number };
    const candidates: SnapResult[] = [];

    const checkNode = (nodeId: NodeId): void => {
      const bounds = sceneGraph.getWorldBounds(nodeId);
      if (!bounds) return;

      const snapPoints = this.getNodeSnapPoints(bounds);

      for (const [position, snapPoint] of Object.entries(snapPoints)) {
        const dist = calculateDistance(point, snapPoint);
        if (dist < threshold) {
          candidates.push({
            point: snapPoint,
            nodeRef: { nodeId, position },
            dist,
          });
        }
      }

      // Check children
      const childIds = sceneGraph.getChildIds(nodeId);
      for (const childId of childIds) {
        checkNode(childId);
      }
    };

    checkNode(pageIds[0]!);

    if (candidates.length === 0) {
      return null;
    }

    // Find closest
    candidates.sort((a, b) => a.dist - b.dist);
    const closest = candidates[0]!;
    return { point: closest.point, nodeRef: closest.nodeRef };
  }

  private calculateOffsetFromMouse(mousePoint: Point): number {
    if (!this.startPoint || !this.endPoint) return 30;

    // Calculate perpendicular distance from mouse to the line between start and end
    const dx = this.endPoint.x - this.startPoint.x;
    const dy = this.endPoint.y - this.startPoint.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return 30;

    // Perpendicular distance formula
    const dist = ((mousePoint.x - this.startPoint.x) * (-dy) + (mousePoint.y - this.startPoint.y) * dx) / len;

    return dist;
  }

  private createDimension(): void {
    if (!this.startPoint || !this.endPoint) return;

    const startAnchor: DimensionAnchor = this.startNodeRef
      ? {
          type: 'node',
          ref: {
            nodeId: this.startNodeRef.nodeId,
            anchorType: 'corner',
            position: this.startNodeRef.position,
          },
        }
      : { type: 'fixed', point: this.startPoint };

    const endAnchor: DimensionAnchor = this.endNodeRef
      ? {
          type: 'node',
          ref: {
            nodeId: this.endNodeRef.nodeId,
            anchorType: 'corner',
            position: this.endNodeRef.position,
          },
        }
      : { type: 'fixed', point: this.endPoint };

    const data: LinearDimensionData = {
      dimensionType: 'LINEAR',
      startAnchor,
      endAnchor,
      orientation: this.orientation,
      offset: this.offset,
      textOverride: null,
      style: this.style,
    };

    this.onDimensionCreate?.(data, this.startPoint, this.endPoint);
  }
}

/**
 * Create a dimension tool instance
 */
export function createDimensionTool(options?: DimensionToolOptions): DimensionTool {
  return new DimensionTool(options);
}
