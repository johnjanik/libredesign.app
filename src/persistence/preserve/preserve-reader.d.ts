/**
 * Preserve Reader
 *
 * Reads .preserve archive files and imports them into DesignLibre.
 */
import type { PreserveArchive, PreserveReadOptions } from './preserve-types';
/**
 * PreserveReader - Reads .preserve archives.
 */
export declare class PreserveReader {
    private zip;
    private options;
    constructor(options?: PreserveReadOptions);
    /**
     * Read a .preserve archive from a File or Blob.
     */
    read(file: File | Blob): Promise<PreserveArchive>;
    private validateMimetype;
    private readManifest;
    private readDocument;
    private readPages;
    private readComponents;
    private readTokens;
    private readPrototypes;
    private readAssets;
    private readHistory;
    private readThumbnail;
    /**
     * Get a specific file from the archive.
     */
    getFile(path: string): Promise<string | null>;
    /**
     * Get a specific binary file from the archive.
     */
    getBinaryFile(path: string): Promise<Blob | null>;
    /**
     * List all files in the archive.
     */
    listFiles(): string[];
}
/**
 * Read a .preserve archive.
 */
export declare function readPreserveArchive(file: File | Blob, options?: PreserveReadOptions): Promise<PreserveArchive>;
/**
 * Quick preview of a .preserve archive (reads only metadata).
 */
export declare function previewPreserveArchive(file: File | Blob): Promise<{
    name: string;
    pageCount: number;
    created: string;
    modified: string;
    thumbnail?: Blob;
}>;
//# sourceMappingURL=preserve-reader.d.ts.map