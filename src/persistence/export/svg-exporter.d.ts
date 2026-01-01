/**
 * SVG Exporter
 *
 * Export scene graph nodes to SVG format.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * SVG export options
 */
export interface SVGExportOptions {
    /** Whether to include XML declaration (default: true) */
    includeXmlDeclaration?: boolean | undefined;
    /** Whether to include viewBox attribute (default: true) */
    includeViewBox?: boolean | undefined;
    /** Whether to embed fonts (default: false) */
    embedFonts?: boolean | undefined;
    /** Padding around content (default: 0) */
    padding?: number | undefined;
    /** Number of decimal places for coordinates (default: 2) */
    precision?: number | undefined;
    /** Whether to minify output (default: false) */
    minify?: boolean | undefined;
}
/**
 * SVG export result
 */
export interface SVGExportResult {
    readonly svg: string;
    readonly width: number;
    readonly height: number;
    readonly blob: Blob;
    readonly url: string;
}
/**
 * SVG Exporter
 */
export declare class SVGExporter {
    private sceneGraph;
    constructor(sceneGraph: SceneGraph);
    /**
     * Export a node to SVG.
     */
    export(nodeId: NodeId, options?: SVGExportOptions): SVGExportResult;
    /**
     * Export multiple nodes to SVG.
     */
    exportMultiple(nodeIds: NodeId[], options?: SVGExportOptions): SVGExportResult;
    /**
     * Export current page to SVG.
     */
    exportPage(options?: SVGExportOptions): SVGExportResult;
    /**
     * Download the exported SVG.
     */
    download(nodeId: NodeId, filename?: string, options?: SVGExportOptions): void;
    private getNodeBounds;
    private collectDefinitions;
    private renderNode;
    private renderFrame;
    private renderVector;
    private renderText;
    private renderGroup;
    private pathToSVG;
    private commandToSVG;
    private getFillAttribute;
    private getStrokeAttribute;
    private getOpacityAttribute;
    private getTransformAttribute;
    private colorToCSS;
    private round;
    private escapeXml;
}
/**
 * Create an SVG exporter.
 */
export declare function createSVGExporter(sceneGraph: SceneGraph): SVGExporter;
//# sourceMappingURL=svg-exporter.d.ts.map