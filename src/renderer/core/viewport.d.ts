/**
 * Viewport - Camera and view transformation
 *
 * Manages the view transformation for the canvas.
 */
import type { Point, Matrix2x3 } from '@core/types/geometry';
import { EventEmitter } from '@core/events/event-emitter';
/**
 * Viewport events
 */
export type ViewportEvents = {
    'changed': {
        viewport: Viewport;
    };
    [key: string]: unknown;
};
/**
 * Viewport bounds
 */
export interface ViewportBounds {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}
/**
 * Viewport configuration
 */
export interface ViewportConfig {
    readonly minZoom?: number;
    readonly maxZoom?: number;
    readonly zoomStep?: number;
}
/**
 * Viewport - manages camera position and zoom
 */
export declare class Viewport extends EventEmitter<ViewportEvents> {
    private canvasWidth;
    private canvasHeight;
    private offsetX;
    private offsetY;
    private zoomLevel;
    private minZoom;
    private maxZoom;
    private zoomStep;
    private viewMatrix;
    private inverseViewMatrix;
    private projectionMatrix;
    private viewProjectionMatrix;
    private matrixDirty;
    constructor(config?: ViewportConfig);
    /**
     * Set canvas dimensions.
     */
    setCanvasSize(width: number, height: number): void;
    /**
     * Get canvas dimensions.
     */
    getCanvasSize(): {
        width: number;
        height: number;
    };
    /**
     * Get camera offset.
     */
    getOffset(): Point;
    /**
     * Set camera offset.
     */
    setOffset(x: number, y: number): void;
    /**
     * Pan camera by delta.
     */
    pan(dx: number, dy: number): void;
    /**
     * Center view on a point.
     */
    centerOn(x: number, y: number): void;
    /**
     * Get current zoom level.
     */
    getZoom(): number;
    /**
     * Set zoom level.
     */
    setZoom(zoom: number): void;
    /**
     * Zoom in.
     */
    zoomIn(factor?: number): void;
    /**
     * Zoom out.
     */
    zoomOut(factor?: number): void;
    /**
     * Zoom at a specific point (keeps that point fixed).
     */
    zoomAt(zoom: number, canvasX: number, canvasY: number): void;
    /**
     * Reset to default view.
     */
    reset(): void;
    /**
     * Fit a rectangle in view.
     */
    fitRect(x: number, y: number, width: number, height: number, padding?: number): void;
    private updateMatrices;
    /**
     * Get the view matrix.
     */
    getViewMatrix(): Matrix2x3;
    /**
     * Get the inverse view matrix.
     */
    getInverseViewMatrix(): Matrix2x3;
    /**
     * Get the projection matrix.
     */
    getProjectionMatrix(): Matrix2x3;
    /**
     * Get the combined view-projection matrix.
     */
    getViewProjectionMatrix(): Matrix2x3;
    /**
     * Convert canvas pixel coordinates to world coordinates.
     *
     * Pipeline: Canvas Pixels → NDC → World
     *
     * This follows the universal graphics pipeline used by Three.js, Babylon.js,
     * Unity, and all professional engines.
     *
     * @param pixelX - X position in canvas pixels (from pointer event)
     * @param pixelY - Y position in canvas pixels (from pointer event)
     */
    canvasToWorld(pixelX: number, pixelY: number): Point;
    /**
     * Convert world coordinates to canvas pixel coordinates.
     *
     * Pipeline: World → NDC → Canvas Pixels
     *
     * @param worldX - X position in world coordinates
     * @param worldY - Y position in world coordinates
     */
    worldToCanvas(worldX: number, worldY: number): Point;
    /**
     * Get the visible world bounds.
     */
    getVisibleBounds(): ViewportBounds;
    /**
     * Check if a world rectangle is visible.
     */
    isRectVisible(x: number, y: number, width: number, height: number): boolean;
}
/**
 * Create a new viewport.
 */
export declare function createViewport(config?: ViewportConfig): Viewport;
//# sourceMappingURL=viewport.d.ts.map