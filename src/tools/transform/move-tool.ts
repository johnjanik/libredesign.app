/**
 * Move Tool - Drag nodes to move them
 */

import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import {
  BaseTool,
  type ToolContext,
  type PointerEventData,
  type KeyEventData,
  type ToolCursor,
} from '../base/tool';

/**
 * Move operation for undo
 */
export interface MoveOperation {
  nodeId: NodeId;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Move tool options
 */
export interface MoveToolOptions {
  /** Snap to grid when moving */
  gridSnap?: number | undefined;
  /** Callback when move starts */
  onMoveStart?: ((nodeIds: NodeId[]) => void) | undefined;
  /** Callback when move updates */
  onMoveUpdate?: ((nodeIds: NodeId[], delta: Point) => void) | undefined;
  /** Callback when move ends */
  onMoveEnd?: ((operations: MoveOperation[]) => void) | undefined;
}

/**
 * Move tool state
 */
interface MoveToolState {
  isMoving: boolean;
  startPositions: Map<NodeId, Point>;
  lastDelta: Point;
}

/**
 * Move Tool
 */
export class MoveTool extends BaseTool {
  readonly name = 'move';
  cursor: ToolCursor = 'move';

  private gridSnap: number;
  private onMoveStart: ((nodeIds: NodeId[]) => void) | undefined;
  private onMoveUpdate: ((nodeIds: NodeId[], delta: Point) => void) | undefined;
  private onMoveEnd: ((operations: MoveOperation[]) => void) | undefined;

  private state: MoveToolState = {
    isMoving: false,
    startPositions: new Map(),
    lastDelta: { x: 0, y: 0 },
  };

  constructor(options: MoveToolOptions = {}) {
    super();
    this.gridSnap = options.gridSnap ?? 0;
    this.onMoveStart = options.onMoveStart;
    this.onMoveUpdate = options.onMoveUpdate;
    this.onMoveEnd = options.onMoveEnd;
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
      isMoving: false,
      startPositions: new Map(),
      lastDelta: { x: 0, y: 0 },
    };
  }

  onPointerDown(event: PointerEventData, context: ToolContext): boolean {
    super.onPointerDown(event, context);

    if (context.selectedNodeIds.length === 0) {
      return false;
    }

    // Store starting positions of all selected nodes
    this.state.startPositions.clear();
    for (const nodeId of context.selectedNodeIds) {
      const node = context.sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node) {
        const n = node as { x: number; y: number };
        this.state.startPositions.set(nodeId, { x: n.x, y: n.y });
      }
    }

    if (this.state.startPositions.size > 0) {
      this.state.isMoving = true;
      this.state.lastDelta = { x: 0, y: 0 };
      this.onMoveStart?.(context.selectedNodeIds.slice());
    }

    return true;
  }

  onPointerMove(event: PointerEventData, context: ToolContext): void {
    super.onPointerMove(event, context);

    if (!this.state.isMoving || !this.dragStartPoint) {
      return;
    }

    // Calculate delta from drag start
    let deltaX = event.worldX - this.dragStartPoint.x;
    let deltaY = event.worldY - this.dragStartPoint.y;

    // Apply grid snapping
    if (this.gridSnap > 0) {
      deltaX = Math.round(deltaX / this.gridSnap) * this.gridSnap;
      deltaY = Math.round(deltaY / this.gridSnap) * this.gridSnap;
    }

    // Apply constraints
    if (event.shiftKey) {
      // Constrain to horizontal or vertical movement
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        deltaY = 0;
      } else {
        deltaX = 0;
      }
    }

    this.state.lastDelta = { x: deltaX, y: deltaY };
    this.onMoveUpdate?.(context.selectedNodeIds.slice(), this.state.lastDelta);
  }

  onPointerUp(_event: PointerEventData, context: ToolContext): void {
    super.onPointerUp(_event, context);

    if (this.state.isMoving) {
      // Generate move operations for undo
      const operations: MoveOperation[] = [];

      for (const [nodeId, startPos] of this.state.startPositions) {
        operations.push({
          nodeId,
          startX: startPos.x,
          startY: startPos.y,
          endX: startPos.x + this.state.lastDelta.x,
          endY: startPos.y + this.state.lastDelta.y,
        });
      }

      this.onMoveEnd?.(operations);
    }

    this.resetState();
  }

  onKeyDown(event: KeyEventData, context: ToolContext): boolean {
    // Arrow key nudging
    const nudgeAmount = event.shiftKey ? 10 : 1;
    let delta: Point | null = null;

    switch (event.key) {
      case 'ArrowUp':
        delta = { x: 0, y: -nudgeAmount };
        break;
      case 'ArrowDown':
        delta = { x: 0, y: nudgeAmount };
        break;
      case 'ArrowLeft':
        delta = { x: -nudgeAmount, y: 0 };
        break;
      case 'ArrowRight':
        delta = { x: nudgeAmount, y: 0 };
        break;
    }

    if (delta && context.selectedNodeIds.length > 0) {
      // Create operations for nudge
      const operations: MoveOperation[] = [];

      for (const nodeId of context.selectedNodeIds) {
        const node = context.sceneGraph.getNode(nodeId);
        if (node && 'x' in node && 'y' in node) {
          const n = node as { x: number; y: number };
          operations.push({
            nodeId,
            startX: n.x,
            startY: n.y,
            endX: n.x + delta.x,
            endY: n.y + delta.y,
          });
        }
      }

      this.onMoveEnd?.(operations);
      return true;
    }

    return false;
  }

  getCursor(_point: Point, context: ToolContext): ToolCursor {
    if (this.state.isMoving) {
      return 'grabbing';
    }
    return context.selectedNodeIds.length > 0 ? 'move' : 'default';
  }

  render(ctx: CanvasRenderingContext2D, context: ToolContext): void {
    // Render move preview (nodes at new position)
    if (this.state.isMoving) {
      ctx.save();
      ctx.globalAlpha = 0.5;

      for (const nodeId of context.selectedNodeIds) {
        const node = context.sceneGraph.getNode(nodeId);
        if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
          const n = node as { x: number; y: number; width: number; height: number };
          const startPos = this.state.startPositions.get(nodeId);

          if (startPos) {
            const newX = startPos.x + this.state.lastDelta.x;
            const newY = startPos.y + this.state.lastDelta.y;

            ctx.strokeStyle = '#0066ff';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(newX, newY, n.width, n.height);
          }
        }
      }

      ctx.restore();
    }
  }
}

/**
 * Create a move tool.
 */
export function createMoveTool(options?: MoveToolOptions): MoveTool {
  return new MoveTool(options);
}
