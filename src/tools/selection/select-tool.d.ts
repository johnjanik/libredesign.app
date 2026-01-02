/**
 * Select Tool - Selection and basic manipulation
 */
import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
/**
 * Select Tool
 */
export declare class SelectTool extends BaseTool {
    readonly name = "select";
    cursor: ToolCursor;
    private state;
    private readonly handleSize;
    private onSelectionChange;
    constructor(options?: {
        onSelectionChange?: ((nodeIds: NodeId[]) => void) | undefined;
    });
    activate(context: ToolContext): void;
    deactivate(): void;
    private resetState;
    onPointerDown(event: PointerEventData, context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, context: ToolContext): void;
    onPointerUp(event: PointerEventData, context: ToolContext): void;
    onKeyDown(event: KeyEventData, context: ToolContext): boolean;
    getCursor(point: Point, context: ToolContext): ToolCursor;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    private getSelectionMode;
    private handleNodeSelection;
    private updateSelection;
    /**
     * Duplicate selected nodes for Ctrl+drag operation.
     * Creates copies of selected nodes and switches to moving the copies.
     */
    private duplicateNodesForMove;
    private hitTest;
    private hitTestNode;
    private findNodesInRect;
    private findNodesInRectRecursive;
    private getMarqueeRect;
    private pointInRect;
    private rectsIntersect;
    private selectAll;
    private collectSelectableNodes;
    private renderSelectionHandles;
    private getHandlePositions;
    private hitTestHandles;
    private getHandleCursor;
    private calculateResizedBounds;
}
/**
 * Create a select tool.
 */
export declare function createSelectTool(options?: {
    onSelectionChange?: (nodeIds: NodeId[]) => void;
}): SelectTool;
//# sourceMappingURL=select-tool.d.ts.map