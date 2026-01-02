/**
 * Preserve Writer
 *
 * Creates .preserve archive files from DesignLibre documents.
 */
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { TokenRegistry } from '@devtools/tokens/token-registry';
import type { PreserveWriteOptions } from './preserve-types';
/**
 * PreserveWriter - Creates .preserve archives from DesignLibre documents.
 */
export declare class PreserveWriter {
    private zip;
    private sceneGraph;
    private tokenRegistry;
    private options;
    private entries;
    constructor(sceneGraph: SceneGraph, tokenRegistry?: TokenRegistry | null, options?: PreserveWriteOptions);
    /**
     * Write the document to a .preserve archive.
     */
    write(): Promise<Blob>;
    private writeMimetype;
    private writeManifest;
    private writeDocument;
    private writePages;
    private convertNodeTree;
    private writeComponents;
    private writeTokens;
    private writePrototypes;
    private writeAssets;
    private writeHistory;
    private writeThumbnail;
    private getAllNodes;
    private addEntry;
    private hashString;
}
/**
 * Create a .preserve archive from a scene graph.
 */
export declare function createPreserveArchive(sceneGraph: SceneGraph, tokenRegistry?: TokenRegistry | null, options?: PreserveWriteOptions): Promise<Blob>;
//# sourceMappingURL=preserve-writer.d.ts.map