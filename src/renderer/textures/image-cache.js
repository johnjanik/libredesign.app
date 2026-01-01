/**
 * Image Cache
 *
 * Handles loading, decoding, and caching of image assets.
 * Supports various image formats and provides async loading.
 */
const DEFAULT_MAX_CACHE_SIZE = 50;
const DEFAULT_EVICTION_TIMEOUT = 60000; // 1 minute
/**
 * Manages image loading and caching
 */
export class ImageCache {
    images = new Map();
    pending = new Map();
    maxCacheSize;
    evictionTimeout;
    useImageBitmap;
    crossOrigin;
    disposed = false;
    constructor(config = {}) {
        this.maxCacheSize = config.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;
        this.evictionTimeout = config.evictionTimeout ?? DEFAULT_EVICTION_TIMEOUT;
        this.useImageBitmap = config.useImageBitmap ?? true;
        this.crossOrigin = config.crossOrigin ?? 'anonymous';
    }
    /**
     * Load an image from a URL
     */
    async loadImage(url) {
        this.checkDisposed();
        // Return cached image if available
        const cached = this.images.get(url);
        if (cached) {
            cached.refCount++;
            cached.lastUsed = Date.now();
            return cached;
        }
        // Return pending load if already in progress
        const pending = this.pending.get(url);
        if (pending) {
            return pending.promise;
        }
        // Start new load
        const abortController = new AbortController();
        const promise = this.doLoadImage(url, abortController.signal);
        this.pending.set(url, { promise, abortController });
        try {
            const entry = await promise;
            this.pending.delete(url);
            return entry;
        }
        catch (error) {
            this.pending.delete(url);
            throw error;
        }
    }
    /**
     * Load an image from a Blob or File
     */
    async loadImageFromBlob(key, blob) {
        this.checkDisposed();
        // Return cached image if available
        const cached = this.images.get(key);
        if (cached) {
            cached.refCount++;
            cached.lastUsed = Date.now();
            return cached;
        }
        try {
            let image;
            let width;
            let height;
            if (this.useImageBitmap && typeof createImageBitmap === 'function') {
                image = await createImageBitmap(blob);
                width = image.width;
                height = image.height;
            }
            else {
                const objectUrl = URL.createObjectURL(blob);
                try {
                    const imgElement = await this.loadImageElement(objectUrl);
                    image = imgElement;
                    width = imgElement.naturalWidth;
                    height = imgElement.naturalHeight;
                }
                finally {
                    URL.revokeObjectURL(objectUrl);
                }
            }
            const entry = {
                image,
                width,
                height,
                status: 'loaded',
                refCount: 1,
                lastUsed: Date.now(),
            };
            this.images.set(key, entry);
            this.maybeEvict();
            return entry;
        }
        catch (error) {
            const errorEntry = {
                image: null,
                width: 0,
                height: 0,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                refCount: 0,
                lastUsed: Date.now(),
            };
            return errorEntry;
        }
    }
    /**
     * Load an image from ImageData
     */
    async loadImageFromImageData(key, imageData) {
        this.checkDisposed();
        // Return cached image if available
        const cached = this.images.get(key);
        if (cached) {
            cached.refCount++;
            cached.lastUsed = Date.now();
            return cached;
        }
        try {
            let image;
            if (this.useImageBitmap && typeof createImageBitmap === 'function') {
                image = await createImageBitmap(imageData);
            }
            else {
                // Create canvas and draw ImageData
                const canvas = document.createElement('canvas');
                canvas.width = imageData.width;
                canvas.height = imageData.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error('Failed to get 2D context');
                }
                ctx.putImageData(imageData, 0, 0);
                // Convert to image
                const dataUrl = canvas.toDataURL('image/png');
                image = await this.loadImageElement(dataUrl);
            }
            const entry = {
                image,
                width: imageData.width,
                height: imageData.height,
                status: 'loaded',
                refCount: 1,
                lastUsed: Date.now(),
            };
            this.images.set(key, entry);
            this.maybeEvict();
            return entry;
        }
        catch (error) {
            const errorEntry = {
                image: null,
                width: 0,
                height: 0,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                refCount: 0,
                lastUsed: Date.now(),
            };
            return errorEntry;
        }
    }
    /**
     * Get a cached image
     */
    getImage(key) {
        const entry = this.images.get(key);
        if (entry) {
            entry.lastUsed = Date.now();
        }
        return entry ?? null;
    }
    /**
     * Check if an image is cached
     */
    hasImage(key) {
        return this.images.has(key);
    }
    /**
     * Check if an image is currently loading
     */
    isLoading(key) {
        return this.pending.has(key);
    }
    /**
     * Acquire a reference to an image
     */
    acquire(key) {
        const entry = this.images.get(key);
        if (entry) {
            entry.refCount++;
            entry.lastUsed = Date.now();
        }
        return entry ?? null;
    }
    /**
     * Release a reference to an image
     */
    release(key) {
        const entry = this.images.get(key);
        if (entry) {
            entry.refCount = Math.max(0, entry.refCount - 1);
        }
    }
    /**
     * Cancel a pending image load
     */
    cancelLoad(key) {
        const pending = this.pending.get(key);
        if (pending) {
            pending.abortController.abort();
            this.pending.delete(key);
        }
    }
    /**
     * Remove an image from the cache
     */
    removeImage(key) {
        const entry = this.images.get(key);
        if (entry) {
            // Close ImageBitmap if applicable
            if ('close' in entry.image && typeof entry.image.close === 'function') {
                entry.image.close();
            }
            this.images.delete(key);
        }
    }
    /**
     * Clear unused images
     */
    clearUnused() {
        const now = Date.now();
        let cleared = 0;
        for (const [key, entry] of this.images) {
            if (entry.refCount === 0 && now - entry.lastUsed > this.evictionTimeout) {
                if ('close' in entry.image && typeof entry.image.close === 'function') {
                    entry.image.close();
                }
                this.images.delete(key);
                cleared++;
            }
        }
        return cleared;
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            count: this.images.size,
            pending: this.pending.size,
            maxSize: this.maxCacheSize,
        };
    }
    /**
     * Dispose the cache and release all resources
     */
    dispose() {
        if (this.disposed)
            return;
        // Cancel all pending loads
        for (const pending of this.pending.values()) {
            pending.abortController.abort();
        }
        this.pending.clear();
        // Close all ImageBitmaps
        for (const entry of this.images.values()) {
            if ('close' in entry.image && typeof entry.image.close === 'function') {
                entry.image.close();
            }
        }
        this.images.clear();
        this.disposed = true;
    }
    checkDisposed() {
        if (this.disposed) {
            throw new Error('ImageCache has been disposed');
        }
    }
    async doLoadImage(url, signal) {
        try {
            let image;
            let width;
            let height;
            if (this.useImageBitmap && typeof createImageBitmap === 'function') {
                // Fetch and create ImageBitmap
                const response = await fetch(url, {
                    signal,
                    credentials: this.crossOrigin === 'use-credentials' ? 'include' : 'same-origin',
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
                }
                const blob = await response.blob();
                image = await createImageBitmap(blob);
                width = image.width;
                height = image.height;
            }
            else {
                // Use HTMLImageElement
                const imgElement = await this.loadImageElement(url, signal);
                image = imgElement;
                width = imgElement.naturalWidth;
                height = imgElement.naturalHeight;
            }
            const entry = {
                image,
                width,
                height,
                status: 'loaded',
                refCount: 1,
                lastUsed: Date.now(),
            };
            this.images.set(url, entry);
            this.maybeEvict();
            return entry;
        }
        catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            const errorEntry = {
                image: null,
                width: 0,
                height: 0,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                refCount: 0,
                lastUsed: Date.now(),
            };
            this.images.set(url, errorEntry);
            return errorEntry;
        }
    }
    loadImageElement(url, signal) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = this.crossOrigin;
            const cleanup = () => {
                img.onload = null;
                img.onerror = null;
                if (signal) {
                    signal.removeEventListener('abort', onAbort);
                }
            };
            const onAbort = () => {
                cleanup();
                reject(new DOMException('Image load aborted', 'AbortError'));
            };
            if (signal) {
                if (signal.aborted) {
                    reject(new DOMException('Image load aborted', 'AbortError'));
                    return;
                }
                signal.addEventListener('abort', onAbort);
            }
            img.onload = () => {
                cleanup();
                resolve(img);
            };
            img.onerror = () => {
                cleanup();
                reject(new Error(`Failed to load image: ${url}`));
            };
            img.src = url;
        });
    }
    maybeEvict() {
        if (this.images.size <= this.maxCacheSize)
            return;
        // Find and evict images with zero references, oldest first
        const candidates = [];
        for (const [key, entry] of this.images) {
            if (entry.refCount === 0) {
                candidates.push({ key, lastUsed: entry.lastUsed });
            }
        }
        // Sort by last used time (oldest first)
        candidates.sort((a, b) => a.lastUsed - b.lastUsed);
        // Evict until we're under the limit
        const toEvict = this.images.size - this.maxCacheSize;
        for (let i = 0; i < Math.min(toEvict, candidates.length); i++) {
            this.removeImage(candidates[i].key);
        }
    }
}
/**
 * Create an image cache
 */
export function createImageCache(config) {
    return new ImageCache(config);
}
//# sourceMappingURL=image-cache.js.map