/**
 * Main Renderer
 *
 * Coordinates WebGL rendering of the scene graph.
 */
import type { RGBA } from '@core/types/color';
import type { SceneGraph } from '@scene/graph/scene-graph';
import { EventEmitter } from '@core/events/event-emitter';
import { Viewport } from './viewport';
/**
 * Renderer events
 */
export type RendererEvents = {
    'frame:start': {
        time: number;
    };
    'frame:end': {
        time: number;
        drawCalls: number;
    };
    'resize': {
        width: number;
        height: number;
    };
    [key: string]: unknown;
};
/**
 * Render statistics
 */
export interface RenderStats {
    readonly frameTime: number;
    readonly drawCalls: number;
    readonly triangles: number;
    readonly fps: number;
}
/**
 * Renderer options
 */
export interface RendererOptions {
    readonly clearColor?: RGBA;
    readonly antialias?: boolean;
    readonly pixelRatio?: number;
}
/**
 * Main Renderer class
 */
export declare class Renderer extends EventEmitter<RendererEvents> {
    private canvas;
    private ctx;
    private viewport;
    private shaders;
    private fillVAO;
    private fillVBO;
    private fillIBO;
    private sceneGraph;
    private clearColor;
    private pixelRatio;
    private animationFrameId;
    private isRendering;
    private lastFrameTime;
    private frameCount;
    private drawCallCount;
    private triangleCount;
    constructor(canvas: HTMLCanvasElement, options?: RendererOptions);
    /**
     * Set up WebGL resources.
     */
    private setupResources;
    /**
     * Set the scene graph to render.
     */
    setSceneGraph(sceneGraph: SceneGraph): void;
    /**
     * Get the viewport.
     */
    getViewport(): Viewport;
    /**
     * Request a render on next frame.
     */
    requestRender(): void;
    /**
     * Start continuous rendering loop.
     */
    startRenderLoop(): void;
    /**
     * Stop the render loop.
     */
    stopRenderLoop(): void;
    /**
     * Render a frame.
     */
    render(time?: number): void;
    /**
     * Render the scene graph.
     */
    private renderScene;
    /**
     * Render the page background color.
     */
    private renderPageBackground;
    /**
     * Render transparency checkerboard grid.
     */
    private renderTransparencyGrid;
    /**
     * Render a node and its children.
     */
    private renderNode;
    /**
     * Get the local transform for a node.
     */
    private getNodeTransform;
    /**
     * Render the content of a node.
     */
    private renderNodeContent;
    /**
     * Render a frame node.
     */
    private renderFrame;
    /**
     * Render a vector node.
     */
    private renderVector;
    /**
     * Render a text node.
     */
    private renderText;
    private setMatrixUniform;
    private setColorUniform;
    /**
     * Resize the renderer to fit the canvas.
     */
    resize(): void;
    /**
     * Get render statistics.
     */
    getStats(): RenderStats;
    /**
     * Dispose of the renderer.
     */
    dispose(): void;
}
/**
 * Create a renderer.
 */
export declare function createRenderer(canvas: HTMLCanvasElement, options?: RendererOptions): Renderer;
//# sourceMappingURL=renderer.d.ts.map