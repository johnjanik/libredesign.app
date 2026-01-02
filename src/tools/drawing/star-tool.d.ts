/**
 * Star Tool
 *
 * Creates star shapes by click-and-drag.
 * Supports:
 * - Configurable number of points
 * - Configurable inner radius ratio
 * - Shift to constrain rotation to 15-degree increments
 * - Alt to draw from center
 * - Arrow keys to adjust point count while drawing
 */
import type { Point, Rect } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
/**
 * Star tool options
 */
export interface StarToolOptions {
    /** Minimum size to create a shape (pixels) */
    readonly minSize?: number;
    /** Default number of points */
    readonly points?: number;
    /** Minimum number of points */
    readonly minPoints?: number;
    /** Maximum number of points */
    readonly maxPoints?: number;
    /** Inner radius ratio (0-1, where 0.5 is typical) */
    readonly innerRadiusRatio?: number;
    /** Fill color */
    readonly fillColor?: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    /** Default rotation offset in radians (0 = first vertex points right) */
    readonly rotationOffset?: number;
}
/**
 * Star vertex data
 */
export interface StarData {
    /** Center point */
    readonly center: Point;
    /** Outer radius (distance from center to outer points) */
    readonly outerRadius: number;
    /** Inner radius (distance from center to inner points) */
    readonly innerRadius: number;
    /** Number of points */
    readonly points: number;
    /** Rotation in radians */
    readonly rotation: number;
    /** Vertex positions (alternating outer/inner) */
    readonly vertices: readonly Point[];
    /** Bounding box */
    readonly bounds: Rect;
}
/**
 * Star tool for creating star shape nodes
 */
export declare class StarTool extends BaseTool {
    readonly name = "star";
    cursor: ToolCursor;
    private options;
    private startPoint;
    private currentPoint;
    private points;
    private innerRadiusRatio;
    private constrainRotation;
    private drawFromCenter;
    private currentRotation;
    private createdNodeId;
    private onStarComplete?;
    private onPreviewUpdate?;
    constructor(options?: StarToolOptions);
    /**
     * Set callback for when star is completed.
     */
    setOnStarComplete(callback: (star: StarData) => NodeId | null): void;
    /**
     * Set callback for preview updates.
     */
    setOnPreviewUpdate(callback: () => void): void;
    /**
     * Get current number of points.
     */
    getPoints(): number;
    /**
     * Set number of points.
     */
    setPoints(points: number): void;
    /**
     * Get inner radius ratio.
     */
    getInnerRadiusRatio(): number;
    /**
     * Set inner radius ratio.
     */
    setInnerRadiusRatio(ratio: number): void;
    /**
     * Check if currently drawing.
     */
    isDrawing(): boolean;
    /**
     * Get current preview star.
     */
    getPreviewStar(): StarData | null;
    activate(context: ToolContext): void;
    deactivate(): void;
    onPointerDown(event: PointerEventData, _context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, _context: ToolContext): void;
    onPointerUp(event: PointerEventData, context: ToolContext): void;
    onKeyDown(event: KeyEventData, _context: ToolContext): boolean;
    onKeyUp(event: KeyEventData, _context: ToolContext): void;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    /**
     * Calculate star from start and end points.
     */
    private calculateStar;
    /**
     * Reset the tool state.
     */
    private reset;
    /**
     * Get the ID of the last created node.
     */
    getCreatedNodeId(): NodeId | null;
    /**
     * Generate SVG path data for the star.
     */
    static generateSVGPath(star: StarData): string;
}
/**
 * Create a star tool.
 */
export declare function createStarTool(options?: StarToolOptions): StarTool;
//# sourceMappingURL=star-tool.d.ts.map