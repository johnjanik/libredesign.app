/**
 * Rectangle Tool
 *
 * Creates rectangular frames by click-and-drag.
 * Supports:
 * - Shift to constrain to square
 * - Alt to draw from center
 */
import type { Rect } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
/**
 * Rectangle tool options
 */
export interface RectangleToolOptions {
    /** Minimum size to create a shape (pixels) */
    readonly minSize?: number;
    /** Default corner radius */
    readonly cornerRadius?: number;
    /** Fill color */
    readonly fillColor?: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
}
/**
 * Rectangle tool for creating frame nodes
 */
export declare class RectangleTool extends BaseTool {
    readonly name = "rectangle";
    cursor: ToolCursor;
    private options;
    private startPoint;
    private currentPoint;
    private constrainSquare;
    private drawFromCenter;
    private createdNodeId;
    private onRectComplete?;
    private onPreviewUpdate?;
    constructor(options?: RectangleToolOptions);
    /**
     * Set callback for when rectangle is completed.
     */
    setOnRectComplete(callback: (rect: Rect, cornerRadius: number) => NodeId | null): void;
    /**
     * Set callback for preview updates.
     */
    setOnPreviewUpdate(callback: () => void): void;
    /**
     * Check if currently drawing.
     */
    isDrawing(): boolean;
    /**
     * Get current preview rectangle.
     */
    getPreviewRect(): Rect | null;
    activate(context: ToolContext): void;
    deactivate(): void;
    onPointerDown(event: PointerEventData, _context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, _context: ToolContext): void;
    onPointerUp(event: PointerEventData, context: ToolContext): void;
    onKeyDown(event: KeyEventData, _context: ToolContext): boolean;
    onKeyUp(event: KeyEventData, _context: ToolContext): void;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    /**
     * Calculate rectangle from two points.
     */
    private calculateRect;
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
 * Create a rectangle tool.
 */
export declare function createRectangleTool(options?: RectangleToolOptions): RectangleTool;
//# sourceMappingURL=rectangle-tool.d.ts.map