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
 */
import type { Point, VectorPath } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
import { PathBuilder } from './path-builder';
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
    readonly strokeColor?: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    /** Stroke width for new paths */
    readonly strokeWidth?: number;
    /** Fill color for new paths (null for no fill) */
    readonly fillColor?: {
        r: number;
        g: number;
        b: number;
        a: number;
    } | null;
}
/**
 * Pen tool for creating vector paths
 */
export declare class PenTool extends BaseTool {
    readonly name = "pen";
    cursor: ToolCursor;
    private options;
    private state;
    private pathBuilder;
    private anchorPosition;
    private handlePosition;
    private createdNodeId;
    private onPathComplete?;
    private onPreviewUpdate?;
    constructor(options?: PenToolOptions);
    /**
     * Set callback for when path is completed.
     */
    setOnPathComplete(callback: (path: VectorPath) => NodeId | null): void;
    /**
     * Set callback for preview updates.
     */
    setOnPreviewUpdate(callback: () => void): void;
    /**
     * Get current tool state.
     */
    getState(): PenToolState;
    /**
     * Get the path builder for preview rendering.
     */
    getPathBuilder(): PathBuilder;
    /**
     * Get current anchor position (for preview).
     */
    getAnchorPosition(): Point | null;
    /**
     * Get current handle position (for preview).
     */
    getHandlePosition(): Point | null;
    /**
     * Check if the tool is currently drawing.
     */
    isDrawing(): boolean;
    activate(context: ToolContext): void;
    deactivate(): void;
    onPointerDown(event: PointerEventData, context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, context: ToolContext): void;
    onPointerUp(_event: PointerEventData, _context: ToolContext): void;
    onKeyDown(event: KeyEventData, _context: ToolContext): boolean;
    onDoubleClick(_event: PointerEventData, _context: ToolContext): void;
    getCursor(point: Point, context: ToolContext): ToolCursor;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    /**
     * Close the current path.
     */
    private closePath;
    /**
     * Finish and emit the current path.
     */
    private finishPath;
    /**
     * Reset the tool state.
     */
    private reset;
    /**
     * Get the ID of the last created node.
     */
    getCreatedNodeId(): NodeId | null;
}
/**
 * Create a pen tool.
 */
export declare function createPenTool(options?: PenToolOptions): PenTool;
//# sourceMappingURL=pen-tool.d.ts.map