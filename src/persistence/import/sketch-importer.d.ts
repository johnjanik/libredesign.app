/**
 * Sketch Importer
 *
 * Import Sketch files (.sketch) and convert them to scene graph nodes.
 * Sketch files are ZIP archives containing JSON and image assets.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * Sketch import options
 */
export interface SketchImportOptions {
    /** Parent node ID to import into */
    parentId?: NodeId | undefined;
    /** Import only specific page names */
    pageNames?: readonly string[] | undefined;
    /** Scale factor (default: 1) */
    scale?: number | undefined;
    /** Import hidden layers (default: false) */
    importHidden?: boolean | undefined;
    /** Flatten symbols (default: false) */
    flattenSymbols?: boolean | undefined;
}
/**
 * Sketch import result
 */
export interface SketchImportResult {
    /** Root node ID of imported content */
    readonly rootId: NodeId;
    /** Number of nodes created */
    readonly nodeCount: number;
    /** Original document name */
    readonly documentName: string;
    /** Page count */
    readonly pageCount: number;
    /** Warnings during import */
    readonly warnings: readonly string[];
}
/**
 * Sketch Importer
 */
export declare class SketchImporter {
    private sceneGraph;
    private warnings;
    private nodeCount;
    private symbolMap;
    private imageMap;
    constructor(sceneGraph: SceneGraph);
    /**
     * Import a Sketch file.
     */
    import(file: File, options?: SketchImportOptions): Promise<SketchImportResult>;
    private buildSymbolMap;
    private importPage;
    private importLayer;
    private importArtboard;
    private importGroup;
    private importRectangle;
    private importOval;
    private importShape;
    private importText;
    private importBitmap;
    private importSymbolInstance;
    private importSymbolMaster;
    private convertFills;
    private convertBorders;
    private getStrokeWeight;
    private convertEffects;
    private getOpacity;
    private convertColor;
    private convertPath;
    private parsePoint;
    private getDefaultParent;
    private getMimeType;
}
/**
 * Create a Sketch importer.
 */
export declare function createSketchImporter(sceneGraph: SceneGraph): SketchImporter;
//# sourceMappingURL=sketch-importer.d.ts.map