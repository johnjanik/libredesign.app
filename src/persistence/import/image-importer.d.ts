/**
 * Image Importer
 *
 * Import raster images with optional auto-tracing to vectors.
 */
import type { NodeId } from '@core/types/common';
import type { VectorPath } from '@core/types/geometry';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * Image import options
 */
export interface ImageImportOptions {
    /** Parent node ID to import into */
    parentId?: NodeId | undefined;
    /** Position X (default: 0) */
    x?: number | undefined;
    /** Position Y (default: 0) */
    y?: number | undefined;
    /** Max width (maintains aspect ratio) */
    maxWidth?: number | undefined;
    /** Max height (maintains aspect ratio) */
    maxHeight?: number | undefined;
    /** Whether to auto-trace the image to vectors (default: false) */
    autoTrace?: boolean | undefined;
    /** Auto-trace options */
    traceOptions?: AutoTraceOptions | undefined;
}
/**
 * Auto-trace options
 */
export interface AutoTraceOptions {
    /** Threshold for edge detection (0-255, default: 128) */
    threshold?: number | undefined;
    /** Minimum path length in pixels (default: 5) */
    minPathLength?: number | undefined;
    /** Path simplification tolerance (default: 2) */
    tolerance?: number | undefined;
    /** Whether to trace colors or just edges (default: false) */
    traceColors?: boolean | undefined;
    /** Number of colors for color tracing (default: 8) */
    colorCount?: number | undefined;
    /** Blur radius for noise reduction (default: 0) */
    blurRadius?: number | undefined;
    /** Invert colors before tracing (default: false) */
    invert?: boolean | undefined;
}
/**
 * Image import result
 */
export interface ImageImportResult {
    /** Created node ID */
    readonly nodeId: NodeId;
    /** Original image dimensions */
    readonly originalWidth: number;
    readonly originalHeight: number;
    /** Final dimensions after scaling */
    readonly width: number;
    readonly height: number;
    /** Whether auto-trace was applied */
    readonly traced: boolean;
    /** Number of paths generated (if traced) */
    readonly pathCount: number;
}
/**
 * Traced path with color
 */
interface TracedPath {
    path: VectorPath;
    color: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
}
/**
 * Image Importer
 */
export declare class ImageImporter {
    private sceneGraph;
    constructor(sceneGraph: SceneGraph);
    /**
     * Import an image file.
     */
    import(file: File, options?: ImageImportOptions): Promise<ImageImportResult>;
    /**
     * Import multiple images.
     */
    importMultiple(files: File[], options?: ImageImportOptions): Promise<ImageImportResult[]>;
    /**
     * Trace an image to vector paths.
     */
    traceImage(source: HTMLImageElement | HTMLCanvasElement | ImageData, options?: AutoTraceOptions): Promise<TracedPath[]>;
    private loadImage;
    private fileToDataUrl;
    private getImageData;
    private applyBlur;
    private invertColors;
    private traceEdges;
    private findContours;
    private traceContour;
    private traceWithColors;
    private quantizeColors;
    private simplifyPath;
    private pointToLineDistance;
    private getDefaultParent;
}
/**
 * Create an image importer.
 */
export declare function createImageImporter(sceneGraph: SceneGraph): ImageImporter;
export {};
//# sourceMappingURL=image-importer.d.ts.map