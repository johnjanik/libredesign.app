/**
 * Canvas Container
 *
 * UI component that manages the canvas element and overlay layers.
 */
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
/**
 * Canvas container options
 */
export interface CanvasContainerOptions {
    /** Background color (CSS color) */
    backgroundColor?: string | undefined;
    /** Show pixel grid at high zoom */
    showPixelGrid?: boolean | undefined;
    /** Grid color */
    gridColor?: string | undefined;
    /** Show origin marker at world (0,0) for debugging */
    showOrigin?: boolean | undefined;
    /** Origin marker color */
    originColor?: string | undefined;
}
/**
 * Canvas Container
 */
export declare class CanvasContainer {
    private runtime;
    private container;
    private canvas;
    private overlayCanvas;
    private options;
    private animationFrameId;
    private isRunning;
    constructor(runtime: DesignLibreRuntime, container: HTMLElement, options?: CanvasContainerOptions);
    private setup;
    /**
     * Start the overlay render loop.
     */
    private startRenderLoop;
    /**
     * Stop the overlay render loop.
     */
    private stopRenderLoop;
    private handleResize;
    /**
     * Render overlay elements.
     *
     * Uses the universal coordinate transformation pipeline to ensure
     * consistency with pointer input handling.
     */
    render(): void;
    /**
     * Render selection overlay with bounding box and handles.
     *
     * @param ctx - Canvas 2D rendering context
     * @param scaleX - X scale factor (canvas.width / cssWidth)
     * @param scaleY - Y scale factor (canvas.height / cssHeight)
     */
    private renderSelectionOverlay;
    private drawPixelGrid;
    private drawCrosshairs;
    /**
     * Draw origin marker at world (0,0).
     * This is rendered in world coordinates (viewport transform already applied).
     */
    private drawOrigin;
    /**
     * Set background color.
     */
    setBackgroundColor(color: string): void;
    /**
     * Toggle pixel grid.
     */
    setShowPixelGrid(show: boolean): void;
    /**
     * Toggle origin marker (for debugging coordinate systems).
     */
    setShowOrigin(show: boolean): void;
    /**
     * Dispose of the container.
     */
    dispose(): void;
}
/**
 * Create a canvas container.
 */
export declare function createCanvasContainer(runtime: DesignLibreRuntime, container: HTMLElement, options?: CanvasContainerOptions): CanvasContainer;
//# sourceMappingURL=canvas-container.d.ts.map