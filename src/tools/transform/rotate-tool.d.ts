/**
 * Rotate Tool - Rotate nodes by dragging
 */
import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
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
 * Rotate Tool
 */
export declare class RotateTool extends BaseTool {
    readonly name = "rotate";
    cursor: ToolCursor;
    private snapAngle;
    private handleOffset;
    private onRotateStart;
    private onRotateUpdate;
    private onRotateEnd;
    private state;
    constructor(options?: RotateToolOptions);
    activate(context: ToolContext): void;
    deactivate(): void;
    private resetState;
    onPointerDown(event: PointerEventData, context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, _context: ToolContext): void;
    onPointerUp(_event: PointerEventData, _context: ToolContext): void;
    onKeyDown(event: KeyEventData, _context: ToolContext): boolean;
    getCursor(point: Point, context: ToolContext): ToolCursor;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    private getAngle;
    private hitTestRotationZone;
    private renderRotationHandles;
}
/**
 * Create a rotate tool.
 */
export declare function createRotateTool(options?: RotateToolOptions): RotateTool;
//# sourceMappingURL=rotate-tool.d.ts.map