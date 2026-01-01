/**
 * Platform Asset Exporter
 *
 * Export assets for iOS (@1x, @2x, @3x) and Android density buckets.
 */
import { PNGExporter } from './png-exporter';
/**
 * iOS scale factors
 */
export const IOSScales = {
    '@1x': 1,
    '@2x': 2,
    '@3x': 3,
};
/**
 * Android density buckets
 */
export const AndroidDensities = {
    mdpi: 1, // 160 dpi (baseline)
    hdpi: 1.5, // 240 dpi
    xhdpi: 2, // 320 dpi
    xxhdpi: 3, // 480 dpi
    xxxhdpi: 4, // 640 dpi
};
/**
 * App icon sizes for iOS
 */
const IOS_APP_ICON_SIZES = [
    { size: 20, scales: [2, 3] }, // Notification
    { size: 29, scales: [2, 3] }, // Settings
    { size: 40, scales: [2, 3] }, // Spotlight
    { size: 60, scales: [2, 3] }, // App Icon (iPhone)
    { size: 76, scales: [1, 2] }, // App Icon (iPad)
    { size: 83.5, scales: [2] }, // App Icon (iPad Pro)
    { size: 1024, scales: [1] }, // App Store
];
/**
 * Platform Asset Exporter
 */
export class PlatformAssetExporter {
    sceneGraph;
    pngExporter;
    constructor(sceneGraph) {
        this.sceneGraph = sceneGraph;
        this.pngExporter = new PNGExporter(sceneGraph);
    }
    /**
     * Export assets for iOS.
     */
    async exportForIOS(nodeId, options = {}) {
        const baseName = options.baseName ?? this.getNodeName(nodeId);
        const scales = options.scales ?? ['@1x', '@2x', '@3x'];
        const backgroundColor = options.backgroundColor ?? 'transparent';
        const mimeType = options.mimeType ?? 'image/png';
        const quality = options.quality ?? 0.92;
        const padding = options.padding ?? 0;
        const assets = [];
        const contentJsonEntries = [];
        // Export regular scales
        for (const scaleKey of scales) {
            const scale = IOSScales[scaleKey];
            const result = await this.pngExporter.export(nodeId, {
                scale,
                backgroundColor,
                mimeType,
                quality,
                padding,
            });
            const suffix = scaleKey === '@1x' ? '' : scaleKey;
            const name = `${baseName}${suffix}.${this.getExtension(mimeType)}`;
            assets.push({
                name,
                scale,
                width: result.width,
                height: result.height,
                blob: result.blob,
                url: result.url,
            });
            contentJsonEntries.push({
                filename: name,
                idiom: 'universal',
                scale: `${scale}x`,
            });
        }
        // Export app icon sizes if requested
        if (options.includeAppIcon) {
            for (const iconConfig of IOS_APP_ICON_SIZES) {
                for (const scale of iconConfig.scales) {
                    const targetSize = iconConfig.size * scale;
                    const result = await this.exportAtSize(nodeId, targetSize, targetSize, {
                        backgroundColor,
                        mimeType,
                        quality,
                    });
                    const name = `AppIcon-${iconConfig.size}@${scale}x.${this.getExtension(mimeType)}`;
                    assets.push({
                        name,
                        scale,
                        width: result.width,
                        height: result.height,
                        blob: result.blob,
                        url: result.url,
                    });
                }
            }
        }
        // Generate Contents.json for Xcode asset catalog
        const contentJson = JSON.stringify({
            images: contentJsonEntries,
            info: {
                author: 'designlibre',
                version: 1,
            },
        }, null, 2);
        return {
            assets,
            contentJson,
        };
    }
    /**
     * Export assets for Android.
     */
    async exportForAndroid(nodeId, options = {}) {
        const baseName = options.baseName ?? this.getNodeName(nodeId);
        const densities = options.densities ?? ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
        const backgroundColor = options.backgroundColor ?? 'transparent';
        const mimeType = options.mimeType ?? 'image/png';
        const quality = options.quality ?? 0.92;
        const padding = options.padding ?? 0;
        const assets = [];
        for (const density of densities) {
            const scale = AndroidDensities[density];
            const result = await this.pngExporter.export(nodeId, {
                scale,
                backgroundColor,
                mimeType,
                quality,
                padding,
            });
            // Android convention: drawable-{density}/{name}.png
            const folder = density === 'mdpi' ? 'drawable' : `drawable-${density}`;
            const name = `${folder}/${this.toSnakeCase(baseName)}.${this.getExtension(mimeType)}`;
            assets.push({
                name,
                scale,
                width: result.width,
                height: result.height,
                blob: result.blob,
                url: result.url,
            });
        }
        // Export adaptive icon layers if requested
        if (options.includeAdaptiveIcon) {
            const adaptiveAssets = await this.exportAdaptiveIcon(nodeId, options);
            assets.push(...adaptiveAssets);
        }
        return { assets };
    }
    /**
     * Export for both platforms.
     */
    async exportForBothPlatforms(nodeId, options = {}) {
        const [ios, android] = await Promise.all([
            this.exportForIOS(nodeId, options),
            this.exportForAndroid(nodeId, options),
        ]);
        return { ios, android };
    }
    /**
     * Export at a specific size.
     */
    async exportAtSize(nodeId, width, height, options = {}) {
        const bounds = this.getNodeBounds(nodeId);
        if (!bounds) {
            throw new Error(`Cannot get bounds for node: ${nodeId}`);
        }
        // Calculate scale to fit the target size
        const scaleX = width / bounds.width;
        const scaleY = height / bounds.height;
        const scale = Math.min(scaleX, scaleY);
        const result = await this.pngExporter.export(nodeId, {
            scale,
            backgroundColor: options.backgroundColor ?? 'transparent',
            mimeType: options.mimeType ?? 'image/png',
            quality: options.quality ?? 0.92,
            padding: options.padding ?? 0,
        });
        const baseName = options.baseName ?? this.getNodeName(nodeId);
        return {
            name: `${baseName}-${width}x${height}.${this.getExtension(options.mimeType ?? 'image/png')}`,
            scale,
            width: result.width,
            height: result.height,
            blob: result.blob,
            url: result.url,
        };
    }
    /**
     * Download all assets as a ZIP file.
     */
    async downloadAsZip(nodeId, platform, _filename = 'assets.zip', options = {}) {
        // Simple ZIP implementation using browser APIs
        // For a real implementation, you'd want to use a library like JSZip
        let assets = [];
        if (platform === 'ios' || platform === 'both') {
            const iosResult = await this.exportForIOS(nodeId, options);
            assets.push(...iosResult.assets);
        }
        if (platform === 'android' || platform === 'both') {
            const androidResult = await this.exportForAndroid(nodeId, options);
            assets.push(...androidResult.assets);
        }
        // For now, download assets individually
        // A proper ZIP implementation would bundle these
        for (const asset of assets) {
            const link = document.createElement('a');
            link.href = asset.url;
            link.download = asset.name.replace(/\//g, '-');
            link.click();
        }
        // Clean up URLs
        for (const asset of assets) {
            URL.revokeObjectURL(asset.url);
        }
    }
    // =========================================================================
    // Private Methods
    // =========================================================================
    async exportAdaptiveIcon(nodeId, options) {
        const assets = [];
        // Adaptive icon sizes for different densities
        const adaptiveSizes = {
            mdpi: 108,
            hdpi: 162,
            xhdpi: 216,
            xxhdpi: 324,
            xxxhdpi: 432,
        };
        const densities = options.densities ?? ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
        for (const density of densities) {
            const size = adaptiveSizes[density];
            // Foreground layer
            const foreground = await this.exportAtSize(nodeId, size, size, {
                ...options,
                backgroundColor: 'transparent',
            });
            const folder = density === 'mdpi' ? 'mipmap' : `mipmap-${density}`;
            assets.push({
                ...foreground,
                name: `${folder}/ic_launcher_foreground.png`,
            });
            // Background layer (solid color or separate asset)
            // For now, create a transparent background
            assets.push({
                ...foreground,
                name: `${folder}/ic_launcher_background.png`,
            });
        }
        return assets;
    }
    getNodeBounds(nodeId) {
        const node = this.sceneGraph.getNode(nodeId);
        if (!node)
            return null;
        if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
            const n = node;
            return { x: n.x, y: n.y, width: n.width, height: n.height };
        }
        const childIds = this.sceneGraph.getChildIds(nodeId);
        if (childIds.length === 0)
            return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const childId of childIds) {
            const childBounds = this.getNodeBounds(childId);
            if (childBounds) {
                minX = Math.min(minX, childBounds.x);
                minY = Math.min(minY, childBounds.y);
                maxX = Math.max(maxX, childBounds.x + childBounds.width);
                maxY = Math.max(maxY, childBounds.y + childBounds.height);
            }
        }
        if (minX === Infinity)
            return null;
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }
    getNodeName(nodeId) {
        const node = this.sceneGraph.getNode(nodeId);
        if (!node)
            return 'asset';
        return node.name || node.type.toLowerCase();
    }
    getExtension(mimeType) {
        switch (mimeType) {
            case 'image/jpeg':
                return 'jpg';
            case 'image/webp':
                return 'webp';
            default:
                return 'png';
        }
    }
    toSnakeCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .replace(/[\s-]+/g, '_')
            .toLowerCase();
    }
}
/**
 * Create a platform asset exporter.
 */
export function createPlatformAssetExporter(sceneGraph) {
    return new PlatformAssetExporter(sceneGraph);
}
//# sourceMappingURL=platform-asset-exporter.js.map