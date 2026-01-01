/**
 * Image Cache
 *
 * Handles loading, decoding, and caching of image assets.
 * Supports various image formats and provides async loading.
 */
/**
 * Image loading status
 */
export type ImageStatus = 'loading' | 'loaded' | 'error';
/**
 * Cached image entry
 */
export interface ImageEntry {
    /** The loaded image element or bitmap */
    readonly image: HTMLImageElement | ImageBitmap;
    /** Image width in pixels */
    readonly width: number;
    /** Image height in pixels */
    readonly height: number;
    /** Load status */
    readonly status: ImageStatus;
    /** Error message if status is 'error' */
    readonly error?: string;
    /** Reference count */
    refCount: number;
    /** Last access time */
    lastUsed: number;
}
/**
 * Image cache configuration
 */
export interface ImageCacheConfig {
    /** Maximum number of images to cache */
    readonly maxCacheSize?: number;
    /** Time in ms before unused images are evicted */
    readonly evictionTimeout?: number;
    /** Whether to use ImageBitmap for better performance */
    readonly useImageBitmap?: boolean;
    /** Cross-origin setting for image loading */
    readonly crossOrigin?: 'anonymous' | 'use-credentials';
}
/**
 * Manages image loading and caching
 */
export declare class ImageCache {
    private images;
    private pending;
    private maxCacheSize;
    private evictionTimeout;
    private useImageBitmap;
    private crossOrigin;
    private disposed;
    constructor(config?: ImageCacheConfig);
    /**
     * Load an image from a URL
     */
    loadImage(url: string): Promise<ImageEntry>;
    /**
     * Load an image from a Blob or File
     */
    loadImageFromBlob(key: string, blob: Blob): Promise<ImageEntry>;
    /**
     * Load an image from ImageData
     */
    loadImageFromImageData(key: string, imageData: ImageData): Promise<ImageEntry>;
    /**
     * Get a cached image
     */
    getImage(key: string): ImageEntry | null;
    /**
     * Check if an image is cached
     */
    hasImage(key: string): boolean;
    /**
     * Check if an image is currently loading
     */
    isLoading(key: string): boolean;
    /**
     * Acquire a reference to an image
     */
    acquire(key: string): ImageEntry | null;
    /**
     * Release a reference to an image
     */
    release(key: string): void;
    /**
     * Cancel a pending image load
     */
    cancelLoad(key: string): void;
    /**
     * Remove an image from the cache
     */
    removeImage(key: string): void;
    /**
     * Clear unused images
     */
    clearUnused(): number;
    /**
     * Get cache statistics
     */
    getStats(): {
        count: number;
        pending: number;
        maxSize: number;
    };
    /**
     * Dispose the cache and release all resources
     */
    dispose(): void;
    private checkDisposed;
    private doLoadImage;
    private loadImageElement;
    private maybeEvict;
}
/**
 * Create an image cache
 */
export declare function createImageCache(config?: ImageCacheConfig): ImageCache;
//# sourceMappingURL=image-cache.d.ts.map