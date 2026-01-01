/**
 * Figma Importer
 *
 * Import Figma files via REST API or .fig file parsing.
 * Note: .fig files use a proprietary format. This importer primarily
 * uses the Figma REST API for reliable imports.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * Figma import options
 */
export interface FigmaImportOptions {
    /** Figma personal access token (required for API) */
    accessToken?: string | undefined;
    /** Parent node ID to import into */
    parentId?: NodeId | undefined;
    /** Import only specific node IDs */
    nodeIds?: readonly string[] | undefined;
    /** Scale factor (default: 1) */
    scale?: number | undefined;
    /** Import hidden layers (default: false) */
    importHidden?: boolean | undefined;
    /** Flatten components (default: false) */
    flattenComponents?: boolean | undefined;
}
/**
 * Figma import result
 */
export interface FigmaImportResult {
    /** Root node ID of imported content */
    readonly rootId: NodeId;
    /** Number of nodes created */
    readonly nodeCount: number;
    /** Original document name */
    readonly documentName: string;
    /** Warnings during import */
    readonly warnings: readonly string[];
}
/**
 * Figma Importer
 */
export declare class FigmaImporter {
    private sceneGraph;
    private warnings;
    private nodeCount;
    private componentMap;
    constructor(sceneGraph: SceneGraph);
    /**
     * Import from Figma API using file key.
     */
    importFromApi(fileKey: string, options?: FigmaImportOptions): Promise<FigmaImportResult>;
    /**
     * Import from Figma URL.
     */
    importFromUrl(figmaUrl: string, options?: FigmaImportOptions): Promise<FigmaImportResult>;
    /**
     * Parse a .fig file.
     * Note: .fig files use a proprietary protobuf format.
     * This provides limited support for basic structures.
     */
    importFigFile(file: File, options?: FigmaImportOptions): Promise<FigmaImportResult>;
    private buildComponentMap;
    private importNode;
    private importCanvas;
    private importFrame;
    private importRectangle;
    private importEllipse;
    private importVector;
    private importText;
    private importComponent;
    private importInstance;
    private importBooleanOperation;
    private convertFills;
    private convertStrokes;
    private convertVectorPaths;
    private parseSVGPathData;
    private parseFigZip;
    private parseFigProtobuf;
    private getDefaultParent;
}
/**
 * Create a Figma importer.
 */
export declare function createFigmaImporter(sceneGraph: SceneGraph): FigmaImporter;
//# sourceMappingURL=figma-importer.d.ts.map