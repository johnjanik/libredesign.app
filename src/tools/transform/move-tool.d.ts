/**
 * Move Tool - Drag nodes to move them
 */
import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
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
 * Move Tool
 */
export declare class MoveTool extends BaseTool {
    readonly name = "move";
    cursor: ToolCursor;
    private gridSnap;
    private onMoveStart;
    private onMoveUpdate;
    private onMoveEnd;
    private state;
    constructor(options?: MoveToolOptions);
    activate(context: ToolContext): void;
    deactivate(): void;
    private resetState;
    onPointerDown(event: PointerEventData, context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, context: ToolContext): void;
    onPointerUp(_event: PointerEventData, context: ToolContext): void;
    onKeyDown(event: KeyEventData, context: ToolContext): boolean;
    getCursor(_point: Point, context: ToolContext): ToolCursor;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
}
/**
 * Create a move tool.
 */
export declare function createMoveTool(options?: MoveToolOptions): MoveTool;
//# sourceMappingURL=move-tool.d.ts.map