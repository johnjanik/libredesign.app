/**
 * Asset Manager
 *
 * Centralized management for images, fonts, and other assets.
 * Features:
 * - Asset library with search
 * - Image optimization and compression
 * - Font subsetting
 * - Version history
 */
import { EventEmitter } from '@core/events/event-emitter';
/**
 * Asset types
 */
export type AssetType = 'image' | 'font' | 'vector' | 'document' | 'other';
/**
 * Asset metadata
 */
export interface AssetMetadata {
    readonly id: string;
    readonly name: string;
    readonly type: AssetType;
    readonly mimeType: string;
    readonly size: number;
    readonly width?: number | undefined;
    readonly height?: number | undefined;
    readonly tags: readonly string[];
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly version: number;
}
/**
 * Asset with data
 */
export interface Asset extends AssetMetadata {
    readonly blob: Blob;
    readonly url: string;
    readonly thumbnailUrl?: string | undefined;
}
/**
 * Asset version entry
 */
export interface AssetVersion {
    readonly version: number;
    readonly blob: Blob;
    readonly size: number;
    readonly createdAt: string;
    readonly comment?: string | undefined;
}
/**
 * Image optimization options
 */
export interface ImageOptimizationOptions {
    /** Max width */
    maxWidth?: number | undefined;
    /** Max height */
    maxHeight?: number | undefined;
    /** Quality (0-1, default: 0.8) */
    quality?: number | undefined;
    /** Output format */
    format?: 'image/jpeg' | 'image/png' | 'image/webp' | undefined;
    /** Strip metadata (default: true) */
    stripMetadata?: boolean | undefined;
}
/**
 * Search options
 */
export interface AssetSearchOptions {
    /** Search query */
    query?: string | undefined;
    /** Filter by type */
    type?: AssetType | undefined;
    /** Filter by tags */
    tags?: readonly string[] | undefined;
    /** Sort field */
    sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'size' | undefined;
    /** Sort direction */
    sortOrder?: 'asc' | 'desc' | undefined;
    /** Limit results */
    limit?: number | undefined;
    /** Offset for pagination */
    offset?: number | undefined;
}
/**
 * Asset manager events
 */
export interface AssetManagerEvents {
    assetAdded: {
        asset: Asset;
    };
    assetUpdated: {
        asset: Asset;
        previousVersion: number;
    };
    assetDeleted: {
        id: string;
    };
    assetRestored: {
        asset: Asset;
        fromVersion: number;
    };
    [key: string]: unknown;
}
/**
 * Asset Manager
 */
export declare class AssetManager extends EventEmitter<AssetManagerEvents> {
    private assets;
    private versions;
    private thumbnails;
    private maxVersions;
    constructor();
    /**
     * Add an asset to the library.
     */
    add(file: File | Blob, options?: {
        name?: string;
        tags?: string[];
        optimize?: boolean;
        optimizationOptions?: ImageOptimizationOptions;
    }): Promise<Asset>;
    /**
     * Update an asset.
     */
    update(id: string, newBlob: Blob, options?: {
        comment?: string;
        optimize?: boolean;
        optimizationOptions?: ImageOptimizationOptions;
    }): Promise<Asset>;
    /**
     * Get an asset by ID.
     */
    get(id: string): Asset | undefined;
    /**
     * Delete an asset.
     */
    delete(id: string): boolean;
    /**
     * Get all assets.
     */
    getAll(): Asset[];
    /**
     * Search assets.
     */
    search(options?: AssetSearchOptions): Asset[];
    /**
     * Get version history for an asset.
     */
    getVersionHistory(id: string): AssetVersion[];
    /**
     * Restore asset to a specific version.
     */
    restoreVersion(id: string, version: number): Promise<Asset>;
    /**
     * Add tags to an asset.
     */
    addTags(id: string, tags: string[]): Asset | undefined;
    /**
     * Remove tags from an asset.
     */
    removeTags(id: string, tags: string[]): Asset | undefined;
    /**
     * Rename an asset.
     */
    rename(id: string, newName: string): Asset | undefined;
    /**
     * Get all unique tags.
     */
    getAllTags(): string[];
    /**
     * Optimize an image.
     */
    optimizeImage(blob: Blob, options?: ImageOptimizationOptions): Promise<Blob>;
    /**
     * Compress an image.
     */
    compressImage(blob: Blob, targetSizeKB: number): Promise<Blob>;
    /**
     * Get total storage size.
     */
    getTotalSize(): number;
    /**
     * Get storage statistics.
     */
    getStats(): {
        totalAssets: number;
        totalSize: number;
        byType: Record<AssetType, {
            count: number;
            size: number;
        }>;
    };
    /**
     * Clear all assets.
     */
    clear(): void;
    /**
     * Export assets to JSON metadata.
     */
    exportMetadata(): AssetMetadata[];
    private generateId;
    private detectType;
    private loadImage;
    private getImageDimensions;
    private generateThumbnail;
}
/**
 * Create an asset manager.
 */
export declare function createAssetManager(): AssetManager;
//# sourceMappingURL=asset-manager.d.ts.map