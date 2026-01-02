/**
 * Pencil Tool (Freehand Drawing)
 *
 * Creates freehand paths by drawing.
 * Supports:
 * - Smooth path generation with curve fitting
 * - Pressure sensitivity (if available)
 * - Path simplification to reduce points
 */
import type { Point, VectorPath } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
/**
 * Pencil tool options
 */
export interface PencilToolOptions {
    /** Minimum distance between points (pixels) */
    readonly minDistance?: number;
    /** Smoothing factor (0-1, higher = smoother) */
    readonly smoothing?: number;
    /** Simplification tolerance (higher = fewer points) */
    readonly simplifyTolerance?: number;
    /** Stroke color */
    readonly strokeColor?: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    /** Stroke weight */
    readonly strokeWeight?: number;
}
/**
 * Freehand path data
 */
export interface FreehandData {
    /** Raw input points */
    readonly rawPoints: readonly Point[];
    /** Simplified/smoothed points */
    readonly smoothedPoints: readonly Point[];
    /** Generated vector path */
    readonly path: VectorPath;
    /** Bounding box */
    readonly bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
/**
 * Pencil tool for freehand drawing
 */
export declare class PencilTool extends BaseTool {
    readonly name = "pencil";
    cursor: ToolCursor;
    private options;
    private rawPoints;
    private isDrawing;
    private createdNodeId;
    private onPathComplete?;
    private onPreviewUpdate?;
    constructor(options?: PencilToolOptions);
    /**
     * Set callback for when path is completed.
     */
    setOnPathComplete(callback: (data: FreehandData) => NodeId | null): void;
    /**
     * Set callback for preview updates.
     */
    setOnPreviewUpdate(callback: () => void): void;
    /**
     * Check if currently drawing.
     */
    getIsDrawing(): boolean;
    /**
     * Get current raw points.
     */
    getRawPoints(): readonly Point[];
    activate(context: ToolContext): void;
    deactivate(): void;
    onPointerDown(event: PointerEventData, _context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, context: ToolContext): void;
    onPointerUp(_event: PointerEventData, _context: ToolContext): void;
    onKeyDown(event: KeyEventData, _context: ToolContext): boolean;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    /**
     * Generate freehand data from raw points.
     */
    private generateFreehandData;
    /**
     * Simplify path using Douglas-Peucker algorithm.
     */
    private simplifyPath;
    /**
     * Calculate perpendicular distance from point to line.
     */
    private pointLineDistance;
    /**
     * Smooth path using Chaikin's algorithm.
     */
    private smoothPath;
    /**
     * Generate cubic bezier path from points.
     */
    private generatePath;
    /**
     * Calculate bounding box of points.
     */
    private calculateBounds;
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
 * Create a pencil tool.
 */
export declare function createPencilTool(options?: PencilToolOptions): PencilTool;
//# sourceMappingURL=pencil-tool.d.ts.map