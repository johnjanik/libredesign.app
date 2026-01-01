/**
 * DesignLibre Bundler
 *
 * Create and read .designlibre bundle files.
 * A .designlibre file is a ZIP archive containing:
 * - canvas.json - The serialized document
 * - images/ - Directory with embedded images
 * - meta.json - Metadata file
 * - thumbnail.png - Preview thumbnail
 */
import type { SceneGraph } from '@scene/graph/scene-graph';
import { type SerializedDocument } from '../serialization/document-serializer';
/**
 * DesignLibre metadata
 */
export interface DesignLibreMeta {
    readonly version: string;
    readonly name: string;
    readonly created: string;
    readonly modified: string;
    readonly author?: string | undefined;
    readonly description?: string | undefined;
    readonly tags?: readonly string[] | undefined;
    readonly dimensions: {
        readonly width: number;
        readonly height: number;
    };
    readonly nodeCount: number;
    readonly imageCount: number;
    readonly fontCount: number;
}
/**
 * DesignLibre bundle options
 */
export interface DesignLibreBundleOptions {
    /** Author name */
    author?: string | undefined;
    /** Description */
    description?: string | undefined;
    /** Tags for organization */
    tags?: readonly string[] | undefined;
    /** Thumbnail size (default: 512) */
    thumbnailSize?: number | undefined;
    /** Include images (default: true) */
    includeImages?: boolean | undefined;
    /** Include fonts (default: false) */
    includeFonts?: boolean | undefined;
    /** Compression level (0-9, default: 6) */
    compressionLevel?: number | undefined;
}
/**
 * DesignLibre bundle result
 */
export interface DesignLibreBundleResult {
    readonly blob: Blob;
    readonly url: string;
    readonly meta: DesignLibreMeta;
    readonly size: number;
}
/**
 * DesignLibre import result
 */
export interface DesignLibreImportResult {
    readonly meta: DesignLibreMeta;
    readonly document: SerializedDocument;
    readonly images: Map<string, Blob>;
    readonly fonts: Map<string, Blob>;
    readonly thumbnail: Blob | null;
}
/**
 * DesignLibre Bundler
 */
export declare class DesignLibreBundler {
    private sceneGraph;
    private serializer;
    private pngExporter;
    constructor(sceneGraph: SceneGraph);
    /**
     * Create a .designlibre bundle.
     */
    bundle(options?: DesignLibreBundleOptions): Promise<DesignLibreBundleResult>;
    /**
     * Import a .designlibre bundle.
     */
    import(file: File | Blob): Promise<DesignLibreImportResult>;
    /**
     * Apply imported bundle to scene graph.
     */
    apply(importResult: DesignLibreImportResult): void;
    /**
     * Download the bundle.
     */
    download(filename?: string, options?: DesignLibreBundleOptions): Promise<void>;
    /**
     * Get bundle info without fully importing.
     */
    getInfo(file: File | Blob): Promise<DesignLibreMeta>;
    /**
     * Get thumbnail from bundle.
     */
    getThumbnail(file: File | Blob): Promise<Blob | null>;
    private getDocumentDimensions;
    private countNodes;
    private collectImages;
    private getMimeType;
}
/**
 * Create a DesignLibre bundler.
 */
export declare function createDesignLibreBundler(sceneGraph: SceneGraph): DesignLibreBundler;
//# sourceMappingURL=designlibre-bundler.d.ts.map