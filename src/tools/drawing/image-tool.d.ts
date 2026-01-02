/**
 * Image Tool
 *
 * Places image/video elements by clicking on the canvas.
 * Opens a file picker to select an image or video file.
 */
import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type ToolCursor } from '../base/tool';
/**
 * Image tool options
 */
export interface ImageToolOptions {
    /** Default image width */
    readonly defaultWidth?: number;
    /** Default image height */
    readonly defaultHeight?: number;
    /** Accepted file types */
    readonly acceptedTypes?: string;
}
/**
 * Image placement data
 */
export interface ImagePlacementData {
    /** Position where the image should be placed */
    readonly position: Point;
    /** File that was selected */
    readonly file: File;
    /** Image dimensions (if loaded) */
    readonly naturalWidth?: number;
    readonly naturalHeight?: number;
    /** Data URL of the image */
    readonly dataUrl: string;
}
/**
 * Image tool for placing images/videos
 */
export declare class ImageTool extends BaseTool {
    readonly name = "image";
    cursor: ToolCursor;
    private options;
    private pendingPosition;
    private createdNodeId;
    private fileInput;
    private onImagePlace?;
    constructor(options?: ImageToolOptions);
    /**
     * Set callback for when image is placed.
     */
    setOnImagePlace(callback: (data: ImagePlacementData) => NodeId | null): void;
    activate(context: ToolContext): void;
    deactivate(): void;
    onPointerDown(event: PointerEventData, _context: ToolContext): boolean;
    /**
     * Create and open file picker.
     */
    private openFilePicker;
    /**
     * Handle file selection.
     */
    private handleFileSelect;
    /**
     * Read file as data URL.
     */
    private readFileAsDataUrl;
    /**
     * Get image dimensions from data URL.
     */
    private getImageDimensions;
    /**
     * Cleanup file input element.
     */
    private cleanupFileInput;
    /**
     * Get the ID of the last created node.
     */
    getCreatedNodeId(): NodeId | null;
}
/**
 * Create an image tool.
 */
export declare function createImageTool(options?: ImageToolOptions): ImageTool;
//# sourceMappingURL=image-tool.d.ts.map