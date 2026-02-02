/**
 * Pen Tool
 *
 * Creates vector paths by placing anchor points and bezier control handles.
 * Supports:
 * - Click to add corner points
 * - Click + drag to add smooth points with handles
 * - Click on first point to close path
 * - Escape to finish open path
 * - Backspace to remove last point
 * - Object snapping (when snap callback provided)
 */

import type { Point, VectorPath } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
import { PathBuilder, createPathBuilder } from './path-builder';

/** Snap result from snap callback */
export interface SnapResult {
  readonly x: number;
  readonly y: number;
  readonly type: string;
}

/**
 * Pen tool state
 */
export type PenToolState = 'IDLE' | 'PLACING_ANCHOR' | 'DRAGGING_HANDLE';

/**
 * Pen tool options
 */
export interface PenToolOptions {
  /** Distance threshold for closing path (pixels) */
  readonly closeThreshold?: number;
  /** Minimum drag distance to create handles (pixels) */
  readonly handleThreshold?: number;
  /** Stroke color for new paths */
  readonly strokeColor?: { r: number; g: number; b: number; a: number };
  /** Stroke width for new paths */
  readonly strokeWidth?: number;
  /** Fill color for new paths (null for no fill) */
  readonly fillColor?: { r: number; g: number; b: number; a: number } | null;
}

const DEFAULT_OPTIONS: Required<PenToolOptions> = {
  closeThreshold: 10,
  handleThreshold: 5,
  strokeColor: { r: 0, g: 0, b: 0, a: 1 },
  strokeWidth: 1,
  fillColor: null,
};

/**
 * Pen tool for creating vector paths
 */
export class PenTool extends BaseTool {
  readonly name = 'pen';
  cursor: ToolCursor = 'crosshair';

  private options: Required<PenToolOptions>;
  private state: PenToolState = 'IDLE';
  private pathBuilder: PathBuilder;
  private anchorPosition: Point | null = null;
  private handlePosition: Point | null = null;
  private createdNodeId: NodeId | null = null;

  // Snap state
  private currentSnap: SnapResult | null = null;

  // Callbacks
  private onPathComplete?: (path: VectorPath) => NodeId | null;
  private onPreviewUpdate?: () => void;
  private onFindSnap?: (x: number, y: number) => SnapResult | null;
  private onRenderSnap?: (ctx: CanvasRenderingContext2D, snap: SnapResult | null) => void;

  constructor(options: PenToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.pathBuilder = createPathBuilder();
  }

  /**
   * Set callback for when path is completed.
   */
  setOnPathComplete(callback: (path: VectorPath) => NodeId | null): void {
    this.onPathComplete = callback;
  }

  /**
   * Set callback for preview updates.
   */
  setOnPreviewUpdate(callback: () => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * Set callback for finding snap points.
   */
  setOnFindSnap(callback: (x: number, y: number) => SnapResult | null): void {
    this.onFindSnap = callback;
  }

  /**
   * Set callback for rendering snap indicators.
   */
  setOnRenderSnap(callback: (ctx: CanvasRenderingContext2D, snap: SnapResult | null) => void): void {
    this.onRenderSnap = callback;
  }

  /**
   * Get current tool state.
   */
  getState(): PenToolState {
    return this.state;
  }

  /**
   * Get the path builder for preview rendering.
   */
  getPathBuilder(): PathBuilder {
    return this.pathBuilder;
  }

  /**
   * Get current anchor position (for preview).
   */
  getAnchorPosition(): Point | null {
    return this.anchorPosition;
  }

  /**
   * Get current handle position (for preview).
   */
  getHandlePosition(): Point | null {
    return this.handlePosition;
  }

  /**
   * Check if the tool is currently drawing.
   */
  isDrawing(): boolean {
    return this.pathBuilder.anchorCount > 0;
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.reset();
  }

  override deactivate(): void {
    // Finish any in-progress path
    if (this.pathBuilder.anchorCount > 0) {
      this.finishPath();
    }
    this.reset();
    super.deactivate();
  }

  override onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    // Use snap point if available
    const snapPoint = this.currentSnap ?? { x: event.worldX, y: event.worldY };
    const worldPoint = { x: snapPoint.x, y: snapPoint.y };

    // Check if clicking near first anchor to close
    if (this.pathBuilder.anchorCount >= 2) {
      const screenThreshold = this.options.closeThreshold / context.viewport.getZoom();
      if (this.pathBuilder.isNearFirstAnchor(worldPoint, screenThreshold)) {
        this.closePath();
        return true;
      }
    }

    // Start placing a new anchor
    this.state = 'PLACING_ANCHOR';
    this.anchorPosition = worldPoint;
    this.handlePosition = null;

    return true;
  }

  override onPointerMove(event: PointerEventData, context: ToolContext): void {
    // Find snap point
    if (this.onFindSnap) {
      this.currentSnap = this.onFindSnap(event.worldX, event.worldY);
    }

    const snapPoint = this.currentSnap ?? { x: event.worldX, y: event.worldY };
    const worldPoint = { x: snapPoint.x, y: snapPoint.y };

    if (this.state === 'PLACING_ANCHOR' && this.anchorPosition) {
      // Check if dragging far enough to create handles
      const dx = worldPoint.x - this.anchorPosition.x;
      const dy = worldPoint.y - this.anchorPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const screenThreshold = this.options.handleThreshold / context.viewport.getZoom();

      if (distance > screenThreshold) {
        this.state = 'DRAGGING_HANDLE';
        this.handlePosition = worldPoint;
      }
    } else if (this.state === 'DRAGGING_HANDLE') {
      this.handlePosition = worldPoint;
    }

    // Update cursor based on position
    if (this.pathBuilder.anchorCount >= 2) {
      const screenThreshold = this.options.closeThreshold / context.viewport.getZoom();
      if (this.pathBuilder.isNearFirstAnchor(worldPoint, screenThreshold)) {
        this.cursor = 'pointer';
      } else {
        this.cursor = 'crosshair';
      }
    }

    this.onPreviewUpdate?.();
  }

  override onPointerUp(_event: PointerEventData, _context: ToolContext): void {
    if (!this.anchorPosition) return;

    if (this.state === 'DRAGGING_HANDLE' && this.handlePosition) {
      // Add smooth anchor with handles
      this.pathBuilder.addSmooth(this.anchorPosition, this.handlePosition);
    } else {
      // Add corner anchor
      this.pathBuilder.addCorner(this.anchorPosition);
    }

    // Reset state
    this.state = 'IDLE';
    this.anchorPosition = null;
    this.handlePosition = null;

    this.onPreviewUpdate?.();
  }

  override onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    switch (event.key) {
      case 'Escape':
        if (this.pathBuilder.anchorCount > 0) {
          this.finishPath();
          return true;
        }
        break;

      case 'Backspace':
      case 'Delete':
        if (this.pathBuilder.anchorCount > 0) {
          this.pathBuilder.removeLastAnchor();
          this.onPreviewUpdate?.();
          return true;
        }
        break;

      case 'Enter':
        if (this.pathBuilder.anchorCount >= 2) {
          this.closePath();
          return true;
        }
        break;
    }

    return false;
  }

  override onDoubleClick(_event: PointerEventData, _context: ToolContext): void {
    // Double-click finishes the path
    if (this.pathBuilder.anchorCount > 0) {
      this.finishPath();
    }
  }

  override getCursor(point: Point, context: ToolContext): ToolCursor {
    if (this.pathBuilder.anchorCount >= 2) {
      const screenThreshold = this.options.closeThreshold / context.viewport.getZoom();
      if (this.pathBuilder.isNearFirstAnchor(point, screenThreshold)) {
        return 'pointer';
      }
    }
    return 'crosshair';
  }

  override render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const builderState = this.pathBuilder.getState();
    if (builderState.anchors.length === 0 && !this.anchorPosition) return;

    const viewport = context.viewport;

    ctx.save();

    // Canvas container already applies viewport transform, so we render in world coords
    // Draw existing path segments
    if (builderState.anchors.length > 0) {
      ctx.beginPath();
      const first = builderState.anchors[0]!;
      ctx.moveTo(first.position.x, first.position.y);

      for (let i = 1; i < builderState.anchors.length; i++) {
        const prev = builderState.anchors[i - 1]!;
        const curr = builderState.anchors[i]!;

        if (prev.handleOut && curr.handleIn) {
          ctx.bezierCurveTo(
            prev.handleOut.x, prev.handleOut.y,
            curr.handleIn.x, curr.handleIn.y,
            curr.position.x, curr.position.y
          );
        } else {
          ctx.lineTo(curr.position.x, curr.position.y);
        }
      }

      ctx.strokeStyle = '#0066FF';
      ctx.lineWidth = 2 / viewport.getZoom();
      ctx.stroke();
    }

    // Draw preview segment to current position
    if (builderState.anchors.length > 0 && (this.anchorPosition || this.handlePosition)) {
      const last = builderState.anchors[builderState.anchors.length - 1]!;
      const target = this.anchorPosition ?? this.handlePosition;

      if (target) {
        ctx.beginPath();
        ctx.moveTo(last.position.x, last.position.y);

        if (last.handleOut) {
          ctx.bezierCurveTo(
            last.handleOut.x, last.handleOut.y,
            target.x, target.y,
            target.x, target.y
          );
        } else {
          ctx.lineTo(target.x, target.y);
        }

        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = 1 / viewport.getZoom();
        ctx.setLineDash([4 / viewport.getZoom(), 4 / viewport.getZoom()]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw anchor points
    const pointRadius = 4 / viewport.getZoom();
    for (const anchor of builderState.anchors) {
      ctx.beginPath();
      ctx.arc(anchor.position.x, anchor.position.y, pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#0066FF';
      ctx.lineWidth = 1.5 / viewport.getZoom();
      ctx.stroke();

      // Draw handles
      if (anchor.handleOut) {
        ctx.beginPath();
        ctx.moveTo(anchor.position.x, anchor.position.y);
        ctx.lineTo(anchor.handleOut.x, anchor.handleOut.y);
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1 / viewport.getZoom();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(anchor.handleOut.x, anchor.handleOut.y, pointRadius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#888888';
        ctx.fill();
      }

      if (anchor.handleIn) {
        ctx.beginPath();
        ctx.moveTo(anchor.position.x, anchor.position.y);
        ctx.lineTo(anchor.handleIn.x, anchor.handleIn.y);
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1 / viewport.getZoom();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(anchor.handleIn.x, anchor.handleIn.y, pointRadius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#888888';
        ctx.fill();
      }
    }

    // Draw current anchor being placed
    if (this.anchorPosition) {
      ctx.beginPath();
      ctx.arc(this.anchorPosition.x, this.anchorPosition.y, pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#0066FF';
      ctx.fill();

      // Draw handle being dragged
      if (this.handlePosition) {
        ctx.beginPath();
        ctx.moveTo(this.anchorPosition.x, this.anchorPosition.y);
        ctx.lineTo(this.handlePosition.x, this.handlePosition.y);
        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = 1 / viewport.getZoom();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.handlePosition.x, this.handlePosition.y, pointRadius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#0066FF';
        ctx.fill();

        // Draw symmetric handle
        const symX = this.anchorPosition.x - (this.handlePosition.x - this.anchorPosition.x);
        const symY = this.anchorPosition.y - (this.handlePosition.y - this.anchorPosition.y);
        ctx.beginPath();
        ctx.moveTo(this.anchorPosition.x, this.anchorPosition.y);
        ctx.lineTo(symX, symY);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(symX, symY, pointRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Draw snap indicator
    if (this.currentSnap && this.onRenderSnap) {
      this.onRenderSnap(ctx, this.currentSnap);
    }
  }

  /**
   * Close the current path.
   */
  private closePath(): void {
    try {
      this.pathBuilder.close();
      this.finishPath();
    } catch {
      // Not enough anchors to close
    }
  }

  /**
   * Finish and emit the current path.
   */
  private finishPath(): void {
    if (this.pathBuilder.anchorCount === 0) return;

    const path = this.pathBuilder.build();

    if (this.onPathComplete) {
      this.createdNodeId = this.onPathComplete(path);
    }

    this.reset();
    this.onPreviewUpdate?.();
  }

  /**
   * Reset the tool state.
   */
  private reset(): void {
    this.pathBuilder.clear();
    this.state = 'IDLE';
    this.anchorPosition = null;
    this.handlePosition = null;
    this.createdNodeId = null;
    this.currentSnap = null;
  }

  /**
   * Get the ID of the last created node.
   */
  getCreatedNodeId(): NodeId | null {
    return this.createdNodeId;
  }
}

/**
 * Create a pen tool.
 */
export function createPenTool(options?: PenToolOptions): PenTool {
  return new PenTool(options);
}
