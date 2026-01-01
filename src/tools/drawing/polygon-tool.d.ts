/**
 * Polygon Tool
 *
 * Creates regular polygons (triangles, pentagons, hexagons, etc.) by click-and-drag.
 * Supports:
 * - Configurable number of sides
 * - Shift to constrain rotation to 15-degree increments
 * - Alt to draw from center
 * - Arrow keys to adjust side count while drawing
 */
import type { Point, Rect } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type KeyEventData, type ToolCursor } from '../base/tool';
/**
 * Polygon tool options
 */
export interface PolygonToolOptions {
    /** Minimum size to create a shape (pixels) */
    readonly minSize?: number;
    /** Default number of sides */
    readonly sides?: number;
    /** Minimum number of sides */
    readonly minSides?: number;
    /** Maximum number of sides */
    readonly maxSides?: number;
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
 * Polygon vertex data
 */
export interface PolygonData {
    /** Center point */
    readonly center: Point;
    /** Radius (distance from center to vertices) */
    readonly radius: number;
    /** Number of sides */
    readonly sides: number;
    /** Rotation in radians */
    readonly rotation: number;
    /** Vertex positions */
    readonly vertices: readonly Point[];
    /** Bounding box */
    readonly bounds: Rect;
}
/**
 * Polygon tool for creating regular polygon nodes
 */
export declare class PolygonTool extends BaseTool {
    readonly name = "polygon";
    cursor: ToolCursor;
    private options;
    private startPoint;
    private currentPoint;
    private sides;
    private constrainRotation;
    private drawFromCenter;
    private currentRotation;
    private createdNodeId;
    private onPolygonComplete?;
    private onPreviewUpdate?;
    constructor(options?: PolygonToolOptions);
    /**
     * Set callback for when polygon is completed.
     */
    setOnPolygonComplete(callback: (polygon: PolygonData) => NodeId | null): void;
    /**
     * Set callback for preview updates.
     */
    setOnPreviewUpdate(callback: () => void): void;
    /**
     * Get current number of sides.
     */
    getSides(): number;
    /**
     * Set number of sides.
     */
    setSides(sides: number): void;
    /**
     * Check if currently drawing.
     */
    isDrawing(): boolean;
    /**
     * Get current preview polygon.
     */
    getPreviewPolygon(): PolygonData | null;
    activate(context: ToolContext): void;
    deactivate(): void;
    onPointerDown(event: PointerEventData, _context: ToolContext): boolean;
    onPointerMove(event: PointerEventData, _context: ToolContext): void;
    onPointerUp(event: PointerEventData, context: ToolContext): void;
    onKeyDown(event: KeyEventData, _context: ToolContext): boolean;
    onKeyUp(event: KeyEventData, _context: ToolContext): void;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    /**
     * Calculate polygon from start and end points.
     */
    private calculatePolygon;
    /**
     * Reset the tool state.
     */
    private reset;
    /**
     * Get the ID of the last created node.
     */
    getCreatedNodeId(): NodeId | null;
    /**
     * Generate SVG path data for the polygon.
     */
    static generateSVGPath(polygon: PolygonData): string;
    /**
     * Generate triangulated indices for the polygon (for WebGL rendering).
     */
    static triangulate(sides: number): Uint16Array;
    /**
     * Generate vertex buffer for the polygon (for WebGL rendering).
     * Returns center + perimeter vertices.
     */
    static generateVertexBuffer(polygon: PolygonData): Float32Array;
}
/**
 * Create a polygon tool.
 */
export declare function createPolygonTool(options?: PolygonToolOptions): PolygonTool;
//# sourceMappingURL=polygon-tool.d.ts.map