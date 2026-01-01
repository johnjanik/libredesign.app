/**
 * PNG Exporter
 *
 * Export scene graph nodes to PNG images using canvas rasterization.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * PNG export options
 */
export interface PNGExportOptions {
    /** Scale factor (default: 1) */
    scale?: number | undefined;
    /** Background color (CSS color string, default: transparent) */
    backgroundColor?: string | undefined;
    /** Output format (default: 'image/png') */
    mimeType?: 'image/png' | 'image/jpeg' | 'image/webp' | undefined;
    /** JPEG/WebP quality (0-1, default: 0.92) */
    quality?: number | undefined;
    /** Padding around the content (default: 0) */
    padding?: number | undefined;
    /** Maximum dimension (width or height, default: 4096) */
    maxSize?: number | undefined;
}
/**
 * PNG export result
 */
export interface PNGExportResult {
    readonly blob: Blob;
    readonly width: number;
    readonly height: number;
    readonly url: string;
}
/**
 * PNG Exporter
 */
export declare class PNGExporter {
    private sceneGraph;
    constructor(sceneGraph: SceneGraph);
    /**
     * Export a node to PNG.
     */
    export(nodeId: NodeId, options?: PNGExportOptions): Promise<PNGExportResult>;
    /**
     * Export multiple nodes to a single PNG.
     */
    exportMultiple(nodeIds: NodeId[], options?: PNGExportOptions): Promise<PNGExportResult>;
    /**
     * Export current page to PNG.
     */
    exportPage(options?: PNGExportOptions): Promise<PNGExportResult>;
    /**
     * Download the exported image.
     */
    download(nodeId: NodeId, filename?: string, options?: PNGExportOptions): Promise<void>;
    private getNodeBounds;
    private renderNode;
    private renderNodeContent;
    private renderFrame;
    private renderVector;
    private renderText;
}
/**
 * Create a PNG exporter.
 */
export declare function createPNGExporter(sceneGraph: SceneGraph): PNGExporter;
//# sourceMappingURL=png-exporter.d.ts.map