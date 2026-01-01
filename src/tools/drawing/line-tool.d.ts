/**
 * Line Tool
 *
 * Creates straight lines by click-and-drag.
 * Supports:
 * - Shift to constrain to 45° angles
 */
import type { Point, VectorPath } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
/**
 * Line tool options
 */
export interface LineToolOptions {
    /** Minimum length to create a line (pixels) */
    readonly minLength?: number;
    /** Stroke width */
    readonly strokeWidth?: number;
    /** Stroke color */
    readonly strokeColor?: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
}
/**
 * Line tool for creating vector line nodes
 */
export declare class LineTool extends BaseTool {
    readonly name = "line";
    cursor: ToolCursor;
    private options;
    private startPoint;
    private endPoint;
    private constrainAngle;
    private createdNodeId;
    private onLineComplete?;
    private onPreviewUpdate?;
    constructor(options?: LineToolOptions);
    /**
     * Set callback for when line is completed.
     */
    setOnLineComplete(callback: (path: VectorPath, start: Point, end: Point) => NodeId | null): void;
    /**
     * Set callback for preview updates.
     */
    setOnPreviewUpdate(callback: () => void): void;
    /**
     * Check if currently drawing.
     */
    isDrawing(): boolean;
    /**
     * Get current line endpoints.
     */
    getLinePoints(): {
        start: Point;
        end: Point;
    } | null;
    activate(context: ToolContext): void;
    deactivate(): void;
    onPointerDown(event: PointerEventData, _context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, _context: ToolContext): void;
    onPointerUp(event: PointerEventData, context: ToolContext): void;
    onKeyDown(event: KeyEventData, _context: ToolContext): boolean;
    onKeyUp(event: KeyEventData, _context: ToolContext): void;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    /**
     * Constrain end point to 45° angles.
     */
    private constrainEndPoint;
    /**
     * Create a line path.
     */
    private createLinePath;
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
 * Create a line tool.
 */
export declare function createLineTool(options?: LineToolOptions): LineTool;
//# sourceMappingURL=line-tool.d.ts.map