/**
 * Rotate Tool - Rotate nodes by dragging
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

/**
 * Rotate operation for undo
 */
export interface RotateOperation {
  nodeId: NodeId;
  startRotation: number;
  endRotation: number;
  pivotX: number;
  pivotY: number;
}

/**
 * Rotate tool options
 */
export interface RotateToolOptions {
  /** Snap angle in degrees (0 to disable) */
  snapAngle?: number | undefined;
  /** Handle distance from corners */
  handleOffset?: number | undefined;
  /** Callback when rotation starts */
  onRotateStart?: ((nodeId: NodeId) => void) | undefined;
  /** Callback when rotation updates */
  onRotateUpdate?: ((nodeId: NodeId, rotation: number, pivot: Point) => void) | undefined;
  /** Callback when rotation ends */
  onRotateEnd?: ((operation: RotateOperation) => void) | undefined;
}

/**
 * Rotate tool state
 */
interface RotateToolState {
  isRotating: boolean;
  targetNodeId: NodeId | null;
  startAngle: number;
  startRotation: number;
  currentRotation: number;
  pivot: Point | null;
}

/**
 * Rotate Tool
 */
export class RotateTool extends BaseTool {
  readonly name = 'rotate';
  cursor: ToolCursor = 'default';

  private snapAngle: number;
  private handleOffset: number;
  private onRotateStart: ((nodeId: NodeId) => void) | undefined;
  private onRotateUpdate: ((nodeId: NodeId, rotation: number, pivot: Point) => void) | undefined;
  private onRotateEnd: ((operation: RotateOperation) => void) | undefined;

  private state: RotateToolState = {
    isRotating: false,
    targetNodeId: null,
    startAngle: 0,
    startRotation: 0,
    currentRotation: 0,
    pivot: null,
  };

  constructor(options: RotateToolOptions = {}) {
    super();
    this.snapAngle = options.snapAngle ?? 0;
    this.handleOffset = options.handleOffset ?? 20;
    this.onRotateStart = options.onRotateStart;
    this.onRotateUpdate = options.onRotateUpdate;
    this.onRotateEnd = options.onRotateEnd;
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
      isRotating: false,
      targetNodeId: null,
      startAngle: 0,
      startRotation: 0,
      currentRotation: 0,
      pivot: null,
    };
  }

  onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    super.onPointerDown(event, context);

    const worldPoint = { x: event.worldX, y: event.worldY };

    // Check if clicking on a rotation handle
    for (const nodeId of context.selectedNodeIds) {
      const node = context.sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const n = node as { x: number; y: number; width: number; height: number; rotation?: number };
        const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };
        const rotation = n.rotation ?? 0;

        if (this.hitTestRotationZone(worldPoint, bounds)) {
          const pivot = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
          };

          this.state.isRotating = true;
          this.state.targetNodeId = nodeId;
          this.state.pivot = pivot;
          this.state.startAngle = this.getAngle(worldPoint, pivot);
          this.state.startRotation = rotation;
          this.state.currentRotation = rotation;

          this.onRotateStart?.(nodeId);
          return true;
        }
      }
    }

    return false;
  }

  onPointerMove(event: PointerEventData, _context: ToolContext): void {
    super.onPointerMove(event, _context);

    if (!this.state.isRotating || !this.state.pivot) {
      return;
    }

    const worldPoint = { x: event.worldX, y: event.worldY };
    const currentAngle = this.getAngle(worldPoint, this.state.pivot);
    let deltaAngle = currentAngle - this.state.startAngle;

    // Normalize delta
    while (deltaAngle > 180) deltaAngle -= 360;
    while (deltaAngle < -180) deltaAngle += 360;

    let newRotation = this.state.startRotation + deltaAngle;

    // Apply snap
    if (this.snapAngle > 0 && !event.shiftKey) {
      newRotation = Math.round(newRotation / this.snapAngle) * this.snapAngle;
    }

    // Constrain to 45-degree increments when shift is held
    if (event.shiftKey) {
      newRotation = Math.round(newRotation / 45) * 45;
    }

    // Normalize to 0-360
    while (newRotation < 0) newRotation += 360;
    while (newRotation >= 360) newRotation -= 360;

    this.state.currentRotation = newRotation;

    if (this.state.targetNodeId && this.state.pivot) {
      this.onRotateUpdate?.(this.state.targetNodeId, newRotation, this.state.pivot);
    }
  }

  onPointerUp(_event: PointerEventData, _context: ToolContext): void {
    super.onPointerUp(_event, _context);

    if (this.state.isRotating && this.state.targetNodeId && this.state.pivot) {
      this.onRotateEnd?.({
        nodeId: this.state.targetNodeId,
        startRotation: this.state.startRotation,
        endRotation: this.state.currentRotation,
        pivotX: this.state.pivot.x,
        pivotY: this.state.pivot.y,
      });
    }

    this.resetState();
  }

  onKeyDown(event: KeyEventData, _context: ToolContext): boolean {
    if (event.key === 'Escape' && this.state.isRotating) {
      // Cancel rotation
      if (this.state.targetNodeId && this.state.pivot) {
        this.onRotateUpdate?.(this.state.targetNodeId, this.state.startRotation, this.state.pivot);
      }
      this.resetState();
      return true;
    }
    return false;
  }

  getCursor(point: Point, context: ToolContext): ToolCursor {
    if (this.state.isRotating) {
      return 'grabbing';
    }

    // Check if hovering over rotation zone
    for (const nodeId of context.selectedNodeIds) {
      const node = context.sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const n = node as { x: number; y: number; width: number; height: number };
        const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };

        if (this.hitTestRotationZone(point, bounds)) {
          return 'rotate';
        }
      }
    }

    return 'default';
  }

  render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    // Render rotation handles for selected nodes
    for (const nodeId of context.selectedNodeIds) {
      const node = context.sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const n = node as { x: number; y: number; width: number; height: number };
        const bounds = { x: n.x, y: n.y, width: n.width, height: n.height };

        this.renderRotationHandles(ctx, bounds);
      }
    }

    // Render rotation preview
    if (this.state.isRotating && this.state.pivot) {
      ctx.save();

      // Draw rotation line from center to cursor
      ctx.beginPath();
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(this.state.pivot.x, this.state.pivot.y);

      if (this.lastPoint) {
        ctx.lineTo(this.lastPoint.x, this.lastPoint.y);
      }
      ctx.stroke();

      // Draw rotation angle indicator
      const angle = this.state.currentRotation;
      ctx.fillStyle = '#0066ff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${angle.toFixed(1)}°`, this.state.pivot.x + 10, this.state.pivot.y - 10);

      ctx.restore();
    }
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private getAngle(point: Point, pivot: Point): number {
    const dx = point.x - pivot.x;
    const dy = point.y - pivot.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  private hitTestRotationZone(point: Point, bounds: Rect): boolean {
    // Rotation zone is outside the bounding box corners
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height },
    ];

    const innerOffset = 8; // Distance inside the corner where resize handles are
    const outerOffset = this.handleOffset;

    for (const corner of corners) {
      const dist = Math.sqrt(
        Math.pow(point.x - corner.x, 2) + Math.pow(point.y - corner.y, 2)
      );

      // Check if point is in the rotation zone (between inner and outer ring)
      if (dist > innerOffset && dist < outerOffset) {
        return true;
      }
    }

    return false;
  }

  private renderRotationHandles(ctx: CanvasRenderingContext2D, bounds: Rect): void {
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height },
    ];

    ctx.save();

    // Draw rotation hint circles at corners
    ctx.strokeStyle = 'rgba(0, 102, 255, 0.3)';
    ctx.lineWidth = 2;

    for (const corner of corners) {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, this.handleOffset, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw center point
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    ctx.fillStyle = '#0066ff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Create a rotate tool.
 */
export function createRotateTool(options?: RotateToolOptions): RotateTool {
  return new RotateTool(options);
}
