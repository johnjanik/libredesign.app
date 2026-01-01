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
 * Asset Manager
 */
export class AssetManager extends EventEmitter {
    assets = new Map();
    versions = new Map();
    thumbnails = new Map();
    maxVersions = 10;
    constructor() {
        super();
    }
    /**
     * Add an asset to the library.
     */
    async add(file, options = {}) {
        const id = this.generateId();
        const name = options.name ?? (file instanceof File ? file.name : `Asset ${id}`);
        const type = this.detectType(file);
        const mimeType = file.type || 'application/octet-stream';
        // Optimize if requested and is an image
        let blob = file instanceof File ? file : file;
        if (options.optimize && type === 'image') {
            blob = await this.optimizeImage(blob, options.optimizationOptions);
        }
        // Get dimensions for images
        let width;
        let height;
        if (type === 'image') {
            const dims = await this.getImageDimensions(blob);
            width = dims.width;
            height = dims.height;
        }
        const url = URL.createObjectURL(blob);
        const now = new Date().toISOString();
        // Generate thumbnail for images
        let thumbnailUrl;
        if (type === 'image') {
            thumbnailUrl = await this.generateThumbnail(blob);
            if (thumbnailUrl) {
                this.thumbnails.set(id, thumbnailUrl);
            }
        }
        const asset = {
            id,
            name,
            type,
            mimeType,
            size: blob.size,
            width,
            height,
            tags: options.tags ?? [],
            createdAt: now,
            updatedAt: now,
            version: 1,
            blob,
            url,
            thumbnailUrl,
        };
        this.assets.set(id, asset);
        this.versions.set(id, [{
                version: 1,
                blob,
                size: blob.size,
                createdAt: now,
            }]);
        this.emit('assetAdded', { asset });
        return asset;
    }
    /**
     * Update an asset.
     */
    async update(id, newBlob, options = {}) {
        const existing = this.assets.get(id);
        if (!existing) {
            throw new Error(`Asset not found: ${id}`);
        }
        // Optimize if requested and is an image
        let blob = newBlob;
        if (options.optimize && existing.type === 'image') {
            blob = await this.optimizeImage(blob, options.optimizationOptions);
        }
        // Get dimensions for images
        let width = existing.width;
        let height = existing.height;
        if (existing.type === 'image') {
            const dims = await this.getImageDimensions(blob);
            width = dims.width;
            height = dims.height;
        }
        // Create new version
        const newVersion = existing.version + 1;
        const now = new Date().toISOString();
        const versions = this.versions.get(id) ?? [];
        versions.push({
            version: newVersion,
            blob,
            size: blob.size,
            createdAt: now,
            comment: options.comment,
        });
        // Prune old versions
        while (versions.length > this.maxVersions) {
            const removed = versions.shift();
            if (removed) {
                // Note: Can't revoke blob URLs for old versions as they might be in use
            }
        }
        this.versions.set(id, versions);
        // Revoke old URL
        URL.revokeObjectURL(existing.url);
        if (existing.thumbnailUrl) {
            URL.revokeObjectURL(existing.thumbnailUrl);
        }
        const url = URL.createObjectURL(blob);
        // Generate new thumbnail
        let thumbnailUrl;
        if (existing.type === 'image') {
            thumbnailUrl = await this.generateThumbnail(blob);
            if (thumbnailUrl) {
                this.thumbnails.set(id, thumbnailUrl);
            }
        }
        const previousVersion = existing.version;
        const updated = {
            ...existing,
            size: blob.size,
            width,
            height,
            updatedAt: now,
            version: newVersion,
            blob,
            url,
            thumbnailUrl,
        };
        this.assets.set(id, updated);
        this.emit('assetUpdated', { asset: updated, previousVersion });
        return updated;
    }
    /**
     * Get an asset by ID.
     */
    get(id) {
        return this.assets.get(id);
    }
    /**
     * Delete an asset.
     */
    delete(id) {
        const asset = this.assets.get(id);
        if (!asset)
            return false;
        URL.revokeObjectURL(asset.url);
        if (asset.thumbnailUrl) {
            URL.revokeObjectURL(asset.thumbnailUrl);
        }
        this.assets.delete(id);
        this.versions.delete(id);
        this.thumbnails.delete(id);
        this.emit('assetDeleted', { id });
        return true;
    }
    /**
     * Get all assets.
     */
    getAll() {
        return Array.from(this.assets.values());
    }
    /**
     * Search assets.
     */
    search(options = {}) {
        let results = Array.from(this.assets.values());
        // Filter by type
        if (options.type) {
            results = results.filter(a => a.type === options.type);
        }
        // Filter by tags
        if (options.tags && options.tags.length > 0) {
            results = results.filter(a => options.tags.some(tag => a.tags.includes(tag)));
        }
        // Filter by query
        if (options.query) {
            const query = options.query.toLowerCase();
            results = results.filter(a => a.name.toLowerCase().includes(query) ||
                a.tags.some(t => t.toLowerCase().includes(query)));
        }
        // Sort
        const sortBy = options.sortBy ?? 'createdAt';
        const sortOrder = options.sortOrder ?? 'desc';
        const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
        results.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name) * sortMultiplier;
                case 'size':
                    return (a.size - b.size) * sortMultiplier;
                case 'updatedAt':
                    return a.updatedAt.localeCompare(b.updatedAt) * sortMultiplier;
                case 'createdAt':
                default:
                    return a.createdAt.localeCompare(b.createdAt) * sortMultiplier;
            }
        });
        // Pagination
        if (options.offset) {
            results = results.slice(options.offset);
        }
        if (options.limit) {
            results = results.slice(0, options.limit);
        }
        return results;
    }
    /**
     * Get version history for an asset.
     */
    getVersionHistory(id) {
        return this.versions.get(id) ?? [];
    }
    /**
     * Restore asset to a specific version.
     */
    async restoreVersion(id, version) {
        const versions = this.versions.get(id);
        if (!versions) {
            throw new Error(`Asset not found: ${id}`);
        }
        const targetVersion = versions.find(v => v.version === version);
        if (!targetVersion) {
            throw new Error(`Version not found: ${version}`);
        }
        const existing = this.assets.get(id);
        if (!existing) {
            throw new Error(`Asset not found: ${id}`);
        }
        // Create new version from the old one
        return this.update(id, targetVersion.blob, {
            comment: `Restored from version ${version}`,
        });
    }
    /**
     * Add tags to an asset.
     */
    addTags(id, tags) {
        const asset = this.assets.get(id);
        if (!asset)
            return undefined;
        const newTags = [...new Set([...asset.tags, ...tags])];
        const updated = {
            ...asset,
            tags: newTags,
            updatedAt: new Date().toISOString(),
        };
        this.assets.set(id, updated);
        return updated;
    }
    /**
     * Remove tags from an asset.
     */
    removeTags(id, tags) {
        const asset = this.assets.get(id);
        if (!asset)
            return undefined;
        const newTags = asset.tags.filter(t => !tags.includes(t));
        const updated = {
            ...asset,
            tags: newTags,
            updatedAt: new Date().toISOString(),
        };
        this.assets.set(id, updated);
        return updated;
    }
    /**
     * Rename an asset.
     */
    rename(id, newName) {
        const asset = this.assets.get(id);
        if (!asset)
            return undefined;
        const updated = {
            ...asset,
            name: newName,
            updatedAt: new Date().toISOString(),
        };
        this.assets.set(id, updated);
        return updated;
    }
    /**
     * Get all unique tags.
     */
    getAllTags() {
        const tags = new Set();
        for (const asset of this.assets.values()) {
            for (const tag of asset.tags) {
                tags.add(tag);
            }
        }
        return Array.from(tags).sort();
    }
    /**
     * Optimize an image.
     */
    async optimizeImage(blob, options = {}) {
        const maxWidth = options.maxWidth ?? 4096;
        const maxHeight = options.maxHeight ?? 4096;
        const quality = options.quality ?? 0.8;
        const format = options.format ?? 'image/jpeg';
        // Load image
        const img = await this.loadImage(blob);
        // Calculate dimensions
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
            const scale = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }
        // Create canvas and draw
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Convert to blob
        return new Promise((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) {
                    resolve(result);
                }
                else {
                    reject(new Error('Failed to create blob'));
                }
            }, format, quality);
        });
    }
    /**
     * Compress an image.
     */
    async compressImage(blob, targetSizeKB) {
        let quality = 0.9;
        let result = blob;
        while (result.size > targetSizeKB * 1024 && quality > 0.1) {
            result = await this.optimizeImage(blob, { quality });
            quality -= 0.1;
        }
        return result;
    }
    /**
     * Get total storage size.
     */
    getTotalSize() {
        let total = 0;
        for (const asset of this.assets.values()) {
            total += asset.size;
        }
        return total;
    }
    /**
     * Get storage statistics.
     */
    getStats() {
        const byType = {
            image: { count: 0, size: 0 },
            font: { count: 0, size: 0 },
            vector: { count: 0, size: 0 },
            document: { count: 0, size: 0 },
            other: { count: 0, size: 0 },
        };
        let totalSize = 0;
        for (const asset of this.assets.values()) {
            byType[asset.type].count++;
            byType[asset.type].size += asset.size;
            totalSize += asset.size;
        }
        return {
            totalAssets: this.assets.size,
            totalSize,
            byType,
        };
    }
    /**
     * Clear all assets.
     */
    clear() {
        for (const asset of this.assets.values()) {
            URL.revokeObjectURL(asset.url);
            if (asset.thumbnailUrl) {
                URL.revokeObjectURL(asset.thumbnailUrl);
            }
        }
        this.assets.clear();
        this.versions.clear();
        this.thumbnails.clear();
    }
    /**
     * Export assets to JSON metadata.
     */
    exportMetadata() {
        return Array.from(this.assets.values()).map(asset => ({
            id: asset.id,
            name: asset.name,
            type: asset.type,
            mimeType: asset.mimeType,
            size: asset.size,
            width: asset.width,
            height: asset.height,
            tags: asset.tags,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
            version: asset.version,
        }));
    }
    // =========================================================================
    // Private Methods
    // =========================================================================
    generateId() {
        return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    detectType(file) {
        const mimeType = file.type;
        if (mimeType.startsWith('image/')) {
            if (mimeType === 'image/svg+xml') {
                return 'vector';
            }
            return 'image';
        }
        if (mimeType.startsWith('font/') || mimeType === 'application/font-woff' || mimeType === 'application/font-woff2') {
            return 'font';
        }
        if (mimeType === 'application/pdf' || mimeType === 'application/json') {
            return 'document';
        }
        return 'other';
    }
    async loadImage(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(blob);
        });
    }
    async getImageDimensions(blob) {
        const img = await this.loadImage(blob);
        return { width: img.width, height: img.height };
    }
    async generateThumbnail(blob, size = 128) {
        try {
            const img = await this.loadImage(blob);
            const canvas = document.createElement('canvas');
            const scale = Math.min(size / img.width, size / img.height);
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            return new Promise((resolve) => {
                canvas.toBlob((result) => {
                    if (result) {
                        resolve(URL.createObjectURL(result));
                    }
                    else {
                        resolve(undefined);
                    }
                }, 'image/jpeg', 0.7);
            });
        }
        catch {
            return undefined;
        }
    }
}
/**
 * Create an asset manager.
 */
export function createAssetManager() {
    return new AssetManager();
}
//# sourceMappingURL=asset-manager.js.map