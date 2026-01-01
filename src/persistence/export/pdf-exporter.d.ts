/**
 * PDF Exporter
 *
 * Export scene graph nodes to PDF format for print.
 * Uses a lightweight PDF generation approach without external dependencies.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * PDF export options
 */
export interface PDFExportOptions {
    /** Page width in points (default: 612 = US Letter) */
    pageWidth?: number | undefined;
    /** Page height in points (default: 792 = US Letter) */
    pageHeight?: number | undefined;
    /** Page orientation (default: 'portrait') */
    orientation?: 'portrait' | 'landscape' | undefined;
    /** Scale factor (default: 1) */
    scale?: number | undefined;
    /** Padding in points (default: 36 = 0.5 inch) */
    padding?: number | undefined;
    /** Title metadata */
    title?: string | undefined;
    /** Author metadata */
    author?: string | undefined;
    /** Whether to include bleed marks (default: false) */
    includeBleedMarks?: boolean | undefined;
    /** Bleed size in points (default: 9 = 1/8 inch) */
    bleedSize?: number | undefined;
    /** Color space (default: 'RGB') */
    colorSpace?: 'RGB' | 'CMYK' | undefined;
}
/**
 * PDF export result
 */
export interface PDFExportResult {
    readonly blob: Blob;
    readonly pageCount: number;
    readonly url: string;
}
/**
 * Standard page sizes in points (1 point = 1/72 inch)
 */
export declare const PageSizes: {
    readonly LETTER: {
        readonly width: 612;
        readonly height: 792;
    };
    readonly LEGAL: {
        readonly width: 612;
        readonly height: 1008;
    };
    readonly TABLOID: {
        readonly width: 792;
        readonly height: 1224;
    };
    readonly A4: {
        readonly width: 595.28;
        readonly height: 841.89;
    };
    readonly A3: {
        readonly width: 841.89;
        readonly height: 1190.55;
    };
    readonly A5: {
        readonly width: 419.53;
        readonly height: 595.28;
    };
};
/**
 * PDF Exporter
 */
export declare class PDFExporter {
    private sceneGraph;
    constructor(sceneGraph: SceneGraph);
    /**
     * Export a node to PDF.
     */
    export(nodeId: NodeId, options?: PDFExportOptions): PDFExportResult;
    /**
     * Export multiple pages to PDF.
     */
    exportMultiPage(nodeIds: NodeId[], options?: PDFExportOptions): PDFExportResult;
    /**
     * Export all pages in the document.
     */
    exportDocument(options?: PDFExportOptions): PDFExportResult;
    /**
     * Download the exported PDF.
     */
    download(nodeId: NodeId, filename?: string, options?: PDFExportOptions): void;
    private getNodeBounds;
    private renderBleedMarks;
    private renderNode;
    private renderFrame;
    private renderVector;
    private renderText;
}
/**
 * Create a PDF exporter.
 */
export declare function createPDFExporter(sceneGraph: SceneGraph): PDFExporter;
//# sourceMappingURL=pdf-exporter.d.ts.map