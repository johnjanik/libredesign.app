/**
 * Resize Tool - Resize nodes by dragging handles
 */
import type { NodeId } from '@core/types/common';
import type { Point, Rect } from '@core/types/geometry';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
/**
 * Resize handle positions
 */
export type HandlePosition = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';
/**
 * Resize operation for undo
 */
export interface ResizeOperation {
    nodeId: NodeId;
    startBounds: Rect;
    endBounds: Rect;
}
/**
 * Resize tool options
 */
export interface ResizeToolOptions {
    /** Handle size in pixels */
    handleSize?: number | undefined;
    /** Minimum node size */
    minSize?: number | undefined;
    /** Callback when resize starts */
    onResizeStart?: ((nodeId: NodeId) => void) | undefined;
    /** Callback when resize updates */
    onResizeUpdate?: ((nodeId: NodeId, newBounds: Rect) => void) | undefined;
    /** Callback when resize ends */
    onResizeEnd?: ((operation: ResizeOperation) => void) | undefined;
}
/**
 * Resize Tool
 */
export declare class ResizeTool extends BaseTool {
    readonly name = "resize";
    cursor: ToolCursor;
    private handleSize;
    private minSize;
    private onResizeStart;
    private onResizeUpdate;
    private onResizeEnd;
    private state;
    constructor(options?: ResizeToolOptions);
    activate(context: ToolContext): void;
    deactivate(): void;
    private resetState;
    onPointerDown(event: PointerEventData, context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, _context: ToolContext): void;
    onPointerUp(_event: PointerEventData, _context: ToolContext): void;
    onKeyDown(event: KeyEventData, _context: ToolContext): boolean;
    getCursor(point: Point, context: ToolContext): ToolCursor;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    private hitTestHandles;
    private getHandlePositions;
    private getHandleCursor;
    private calculateNewBounds;
    private renderHandles;
}
/**
 * Create a resize tool.
 */
export declare function createResizeTool(options?: ResizeToolOptions): ResizeTool;
//# sourceMappingURL=resize-tool.d.ts.map