/**
 * Ellipse Tool
 *
 * Creates elliptical shapes by click-and-drag.
 * Supports:
 * - Shift to constrain to circle
 * - Alt to draw from center
 */
import type { Rect, VectorPath } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
/**
 * Ellipse tool options
 */
export interface EllipseToolOptions {
    /** Minimum size to create a shape (pixels) */
    readonly minSize?: number;
    /** Fill color */
    readonly fillColor?: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
}
/**
 * Ellipse tool for creating vector nodes with ellipse paths
 */
export declare class EllipseTool extends BaseTool {
    readonly name = "ellipse";
    cursor: ToolCursor;
    private options;
    private startPoint;
    private currentPoint;
    private constrainCircle;
    private drawFromCenter;
    private createdNodeId;
    private onEllipseComplete?;
    private onPreviewUpdate?;
    constructor(options?: EllipseToolOptions);
    /**
     * Set callback for when ellipse is completed.
     */
    setOnEllipseComplete(callback: (path: VectorPath, bounds: Rect) => NodeId | null): void;
    /**
     * Set callback for preview updates.
     */
    setOnPreviewUpdate(callback: () => void): void;
    /**
     * Check if currently drawing.
     */
    isDrawing(): boolean;
    /**
     * Get current preview bounds.
     */
    getPreviewBounds(): Rect | null;
    activate(context: ToolContext): void;
    deactivate(): void;
    onPointerDown(event: PointerEventData, _context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, _context: ToolContext): void;
    onPointerUp(event: PointerEventData, context: ToolContext): void;
    onKeyDown(event: KeyEventData, _context: ToolContext): boolean;
    onKeyUp(event: KeyEventData, _context: ToolContext): void;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    /**
     * Calculate bounds from two points.
     */
    private calculateBounds;
    /**
     * Create an ellipse path using cubic bezier approximation.
     */
    private createEllipsePath;
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
 * Create an ellipse tool.
 */
export declare function createEllipseTool(options?: EllipseToolOptions): EllipseTool;
//# sourceMappingURL=ellipse-tool.d.ts.map