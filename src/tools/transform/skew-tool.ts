/**
 * Skew Tool
 *
 * Tool for applying horizontal and vertical skew (shear) transforms to nodes.
 * - Horizontal skew: shears along the X axis
 * - Vertical skew: shears along the Y axis
 * - Shift constrains to 15-degree increments
 */

import type { NodeId } from '@core/types/common';
import type { Point, Rect } from '@core/types/geometry';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '../base/tool';
import { createPivotManager } from './pivot-manager';

/**
 * Skew handle positions
 */
export type SkewHandle = 'top' | 'bottom' | 'left' | 'right';

/**
 * Skew operation for undo
 */
export interface SkewOperation {
  nodeId: NodeId;
  startSkewX: number;
  startSkewY: number;
  endSkewX: number;
  endSkewY: number;
}

/**
 * Skew tool options
 */
export interface SkewToolOptions {
  /** Handle size in pixels */
  readonly handleSize?: number;
  /** Snap angle in degrees (default: 15) */
  readonly snapAngle?: number;
  /** Callback when skew starts */
  readonly onSkewStart?: (nodeId: NodeId) => void;
  /** Callback when skew updates */
  readonly onSkewUpdate?: (nodeId: NodeId, skewX: number, skewY: number) => void;
  /** Callback when skew ends */
  readonly onSkewEnd?: (operation: SkewOperation) => void;
}

/**
 * Skew tool state
 */
interface SkewToolState {
  isSkewing: boolean;
  activeHandle: SkewHandle | null;
  targetNodeId: NodeId | null;
  startBounds: Rect | null;
  startSkewX: number;
  startSkewY: number;
  currentSkewX: number;
  currentSkewY: number;
  startMousePos: Point | null;
}

const DEFAULT_OPTIONS = {
  handleSize: 10,
  snapAngle: 15,
};

/**
 * Skew Tool
 */
export class SkewTool extends BaseTool {
  readonly name = 'skew';
  cursor: ToolCursor = 'default';

  private options: Required<Pick<SkewToolOptions, 'handleSize' | 'snapAngle'>>;
  private onSkewStart: ((nodeId: NodeId) => void) | null;
  private onSkewUpdate: ((nodeId: NodeId, skewX: number, skewY: number) => void) | null;
  private onSkewEnd: ((operation: SkewOperation) => void) | null;

  private state: SkewToolState = {
    isSkewing: false,
    activeHandle: null,
    targetNodeId: null,
    startBounds: null,
    startSkewX: 0,
    startSkewY: 0,
    currentSkewX: 0,
    currentSkewY: 0,
    startMousePos: null,
  };

  constructor(options: SkewToolOptions = {}) {
    super();
    this.options = {
      handleSize: options.handleSize ?? DEFAULT_OPTIONS.handleSize,
      snapAngle: options.snapAngle ?? DEFAULT_OPTIONS.snapAngle,
    };
    this.onSkewStart = options.onSkewStart ?? null;
    this.onSkewUpdate = options.onSkewUpdate ?? null;
    this.onSkewEnd = options.onSkewEnd ?? null;
    // Pivot manager created but not yet used - for future pivot-aware skewing
    createPivotManager();
  }

  activate(context: ToolContext): void {
    super.activate(context);
    this.resetState();
  }

  deactivate(): void {
    super.deactivate();
    this.resetState();
  }

  private resetState(): void {
    this.state = {
      isSkewing: false,
      activeHandle: null,
      targetNodeId: null,
      startBounds: null,
      startSkewX: 0,
      startSkewY: 0,
      currentSkewX: 0,
      currentSkewY: 0,
      startMousePos: null,
    };
  }

  onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    super.onPointerDown(event, context);

    const worldPoint = { x: event.worldX, y: event.worldY };
    const zoom = context.viewport.getZoom();

    // Check if clicking on a skew handle
    for (const nodeId of context.selectedNodeIds) {
      const node = context.sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const n = node as { x: number; y: number; width: number; height: number; skewX?: number; skewY?: number };
        const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };
        const handle = this.hitTestHandles(worldPoint, bounds, zoom);

        if (handle) {
          this.state.isSkewing = true;
          this.state.activeHandle = handle;
          this.state.targetNodeId = nodeId;
          this.state.startBounds = { ...bounds };
          this.state.startSkewX = n.skewX ?? 0;
          this.state.startSkewY = n.skewY ?? 0;
          this.state.currentSkewX = n.skewX ?? 0;
          this.state.currentSkewY = n.skewY ?? 0;
          this.state.startMousePos = worldPoint;

          this.onSkewStart?.(nodeId);
          return true;
        }
      }
    }

    return false;
  }

  onPointerMove(event: PointerEventData, context: ToolContext): void {
    super.onPointerMove(event, context);

    if (!this.state.isSkewing || !this.state.startBounds || !this.state.activeHandle || !this.state.startMousePos) {
      return;
    }

    const worldPoint = { x: event.worldX, y: event.worldY };
    const bounds = this.state.startBounds;

    // Calculate skew angle based on mouse movement
    let skewX = this.state.startSkewX;
    let skewY = this.state.startSkewY;

    const handle = this.state.activeHandle;

    if (handle === 'top' || handle === 'bottom') {
      // Horizontal skew - mouse X movement relative to bounds height
      const deltaX = worldPoint.x - this.state.startMousePos.x;
      const skewFactor = deltaX / (bounds.height / 2);
      const skewAngle = Math.atan(skewFactor) * (180 / Math.PI);

      // Invert for bottom handle
      skewX = this.state.startSkewX + (handle === 'top' ? skewAngle : -skewAngle);
    } else {
      // Vertical skew - mouse Y movement relative to bounds width
      const deltaY = worldPoint.y - this.state.startMousePos.y;
      const skewFactor = deltaY / (bounds.width / 2);
      const skewAngle = Math.atan(skewFactor) * (180 / Math.PI);

      // Invert for right handle
      skewY = this.state.startSkewY + (handle === 'left' ? skewAngle : -skewAngle);
    }

    // Snap to increments when shift is held
    if (event.shiftKey) {
      const snap = this.options.snapAngle;
      skewX = Math.round(skewX / snap) * snap;
      skewY = Math.round(skewY / snap) * snap;
    }

    // Clamp to reasonable range (-85 to 85 degrees)
    skewX = Math.max(-85, Math.min(85, skewX));
    skewY = Math.max(-85, Math.min(85, skewY));

    this.state.currentSkewX = skewX;
    this.state.currentSkewY = skewY;

    if (this.state.targetNodeId) {
      this.onSkewUpdate?.(this.state.targetNodeId, skewX, skewY);
    }
  }

  onPointerUp(_event: PointerEventData, _context: ToolContext): void {
    super.onPointerUp(_event, _context);

    if (this.state.isSkewing && this.state.targetNodeId) {
      this.onSkewEnd?.({
        nodeId: this.state.targetNodeId,
        startSkewX: this.state.startSkewX,
        startSkewY: this.state.startSkewY,
        endSkewX: this.state.currentSkewX,
        endSkewY: this.state.currentSkewY,
      });
    }

    this.resetState();
  }

  onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape' && this.state.isSkewing) {
      // Cancel skew - restore original values
      if (this.state.targetNodeId) {
        this.onSkewUpdate?.(this.state.targetNodeId, this.state.startSkewX, this.state.startSkewY);
      }
      this.resetState();
      return true;
    }
    return false;
  }

  getCursor(point: Point, context: ToolContext): ToolCursor {
    if (this.state.isSkewing) {
      return this.state.activeHandle === 'top' || this.state.activeHandle === 'bottom'
        ? 'ew-resize'
        : 'ns-resize';
    }

    // Check if hovering over a skew handle
    const zoom = context.viewport.getZoom();
    for (const nodeId of context.selectedNodeIds) {
      const node = context.sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const n = node as { x: number; y: number; width: number; height: number };
        const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };
        const handle = this.hitTestHandles(point, bounds, zoom);

        if (handle) {
          return handle === 'top' || handle === 'bottom' ? 'ew-resize' : 'ns-resize';
        }
      }
    }

    return 'default';
  }

  render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    const zoom = context.viewport.getZoom();
    const handleSize = this.options.handleSize / zoom;

    // Render skew handles for selected nodes
    for (const nodeId of context.selectedNodeIds) {
      const node = context.sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const n = node as { x: number; y: number; width: number; height: number };
        const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };

        this.renderHandles(ctx, bounds, handleSize, zoom);
      }
    }

    // Render skew preview info
    if (this.state.isSkewing) {
      ctx.save();
      ctx.fillStyle = '#0066ff';
      ctx.font = `${12 / zoom}px sans-serif`;

      const label = this.state.activeHandle === 'top' || this.state.activeHandle === 'bottom'
        ? `Skew X: ${this.state.currentSkewX.toFixed(1)}°`
        : `Skew Y: ${this.state.currentSkewY.toFixed(1)}°`;

      if (this.state.startBounds) {
        const { x, y, width } = this.state.startBounds;
        ctx.fillText(label, x + width / 2 - 30 / zoom, y - 10 / zoom);
      }

      ctx.restore();
    }
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private hitTestHandles(point: Point, bounds: Rect, zoom: number): SkewHandle | null {
    const handles = this.getHandlePositions(bounds);
    const threshold = (this.options.handleSize / zoom) / 2 + 4 / zoom;

    for (const [handle, pos] of Object.entries(handles)) {
      const dx = point.x - pos.x;
      const dy = point.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= threshold) {
        return handle as SkewHandle;
      }
    }

    return null;
  }

  private getHandlePositions(bounds: Rect): Record<SkewHandle, Point> {
    const { x, y, width, height } = bounds;
    const offset = 15; // Offset from edge

    return {
      top: { x: x + width / 2, y: y - offset },
      bottom: { x: x + width / 2, y: y + height + offset },
      left: { x: x - offset, y: y + height / 2 },
      right: { x: x + width + offset, y: y + height / 2 },
    };
  }

  private renderHandles(
    ctx: CanvasRenderingContext2D,
    bounds: Rect,
    handleSize: number,
    zoom: number
  ): void {
    const handles = this.getHandlePositions(bounds);
    const lineWidth = 1.5 / zoom;

    ctx.save();

    // Draw skew handles as diamond shapes
    for (const [handle, pos] of Object.entries(handles)) {
      const isHorizontal = handle === 'top' || handle === 'bottom';
      const isActive = this.state.activeHandle === handle;

      ctx.fillStyle = isActive ? '#0066ff' : '#ffffff';
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = lineWidth;

      // Draw diamond
      ctx.beginPath();
      if (isHorizontal) {
        // Horizontal diamond (wider)
        ctx.moveTo(pos.x, pos.y - handleSize / 2);
        ctx.lineTo(pos.x + handleSize / 1.5, pos.y);
        ctx.lineTo(pos.x, pos.y + handleSize / 2);
        ctx.lineTo(pos.x - handleSize / 1.5, pos.y);
      } else {
        // Vertical diamond (taller)
        ctx.moveTo(pos.x - handleSize / 2, pos.y);
        ctx.lineTo(pos.x, pos.y - handleSize / 1.5);
        ctx.lineTo(pos.x + handleSize / 2, pos.y);
        ctx.lineTo(pos.x, pos.y + handleSize / 1.5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw direction arrows
      ctx.strokeStyle = isActive ? '#ffffff' : '#0066ff';
      ctx.lineWidth = lineWidth * 0.8;

      if (isHorizontal) {
        // Left-right arrows
        const arrowSize = handleSize / 3;
        ctx.beginPath();
        ctx.moveTo(pos.x - arrowSize, pos.y);
        ctx.lineTo(pos.x + arrowSize, pos.y);
        ctx.moveTo(pos.x - arrowSize + 2 / zoom, pos.y - 2 / zoom);
        ctx.lineTo(pos.x - arrowSize, pos.y);
        ctx.lineTo(pos.x - arrowSize + 2 / zoom, pos.y + 2 / zoom);
        ctx.moveTo(pos.x + arrowSize - 2 / zoom, pos.y - 2 / zoom);
        ctx.lineTo(pos.x + arrowSize, pos.y);
        ctx.lineTo(pos.x + arrowSize - 2 / zoom, pos.y + 2 / zoom);
        ctx.stroke();
      } else {
        // Up-down arrows
        const arrowSize = handleSize / 3;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - arrowSize);
        ctx.lineTo(pos.x, pos.y + arrowSize);
        ctx.moveTo(pos.x - 2 / zoom, pos.y - arrowSize + 2 / zoom);
        ctx.lineTo(pos.x, pos.y - arrowSize);
        ctx.lineTo(pos.x + 2 / zoom, pos.y - arrowSize + 2 / zoom);
        ctx.moveTo(pos.x - 2 / zoom, pos.y + arrowSize - 2 / zoom);
        ctx.lineTo(pos.x, pos.y + arrowSize);
        ctx.lineTo(pos.x + 2 / zoom, pos.y + arrowSize - 2 / zoom);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

/**
 * Create a skew tool instance
 */
export function createSkewTool(options?: SkewToolOptions): SkewTool {
  return new SkewTool(options);
}

/**
 * Apply skew transform to a point
 */
export function skewPoint(
  point: Point,
  pivot: Point,
  skewXDegrees: number,
  skewYDegrees: number
): Point {
  const skewX = Math.tan((skewXDegrees * Math.PI) / 180);
  const skewY = Math.tan((skewYDegrees * Math.PI) / 180);

  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;

  return {
    x: pivot.x + dx + dy * skewX,
    y: pivot.y + dy + dx * skewY,
  };
}

/**
 * Create a CSS skew transform string
 */
export function skewToCss(skewXDegrees: number, skewYDegrees: number): string {
  if (skewXDegrees === 0 && skewYDegrees === 0) {
    return '';
  }
  if (skewYDegrees === 0) {
    return `skewX(${skewXDegrees}deg)`;
  }
  if (skewXDegrees === 0) {
    return `skewY(${skewYDegrees}deg)`;
  }
  return `skew(${skewXDegrees}deg, ${skewYDegrees}deg)`;
}
