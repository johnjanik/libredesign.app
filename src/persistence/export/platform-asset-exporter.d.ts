/**
 * Platform Asset Exporter
 *
 * Export assets for iOS (@1x, @2x, @3x) and Android density buckets.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * iOS scale factors
 */
export declare const IOSScales: {
    readonly '@1x': 1;
    readonly '@2x': 2;
    readonly '@3x': 3;
};
export type IOSScale = keyof typeof IOSScales;
/**
 * Android density buckets
 */
export declare const AndroidDensities: {
    readonly mdpi: 1;
    readonly hdpi: 1.5;
    readonly xhdpi: 2;
    readonly xxhdpi: 3;
    readonly xxxhdpi: 4;
};
export type AndroidDensity = keyof typeof AndroidDensities;
/**
 * Platform export options
 */
export interface PlatformExportOptions {
    /** Base name for the asset */
    baseName?: string | undefined;
    /** Background color (default: transparent) */
    backgroundColor?: string | undefined;
    /** Output format (default: 'image/png') */
    mimeType?: 'image/png' | 'image/jpeg' | 'image/webp' | undefined;
    /** JPEG/WebP quality (default: 0.92) */
    quality?: number | undefined;
    /** Padding around the content (default: 0) */
    padding?: number | undefined;
}
/**
 * iOS export options
 */
export interface IOSExportOptions extends PlatformExportOptions {
    /** Scale factors to export (default: all) */
    scales?: readonly IOSScale[] | undefined;
    /** Include App Icon sizes (default: false) */
    includeAppIcon?: boolean | undefined;
}
/**
 * Android export options
 */
export interface AndroidExportOptions extends PlatformExportOptions {
    /** Density buckets to export (default: all) */
    densities?: readonly AndroidDensity[] | undefined;
    /** Include adaptive icon layers (default: false) */
    includeAdaptiveIcon?: boolean | undefined;
}
/**
 * Exported asset
 */
export interface ExportedAsset {
    readonly name: string;
    readonly scale: number;
    readonly width: number;
    readonly height: number;
    readonly blob: Blob;
    readonly url: string;
}
/**
 * iOS export result
 */
export interface IOSExportResult {
    readonly assets: readonly ExportedAsset[];
    readonly contentJson?: string;
}
/**
 * Android export result
 */
export interface AndroidExportResult {
    readonly assets: readonly ExportedAsset[];
}
/**
 * Platform Asset Exporter
 */
export declare class PlatformAssetExporter {
    private sceneGraph;
    private pngExporter;
    constructor(sceneGraph: SceneGraph);
    /**
     * Export assets for iOS.
     */
    exportForIOS(nodeId: NodeId, options?: IOSExportOptions): Promise<IOSExportResult>;
    /**
     * Export assets for Android.
     */
    exportForAndroid(nodeId: NodeId, options?: AndroidExportOptions): Promise<AndroidExportResult>;
    /**
     * Export for both platforms.
     */
    exportForBothPlatforms(nodeId: NodeId, options?: PlatformExportOptions): Promise<{
        ios: IOSExportResult;
        android: AndroidExportResult;
    }>;
    /**
     * Export at a specific size.
     */
    exportAtSize(nodeId: NodeId, width: number, height: number, options?: PlatformExportOptions): Promise<ExportedAsset>;
    /**
     * Download all assets as a ZIP file.
     */
    downloadAsZip(nodeId: NodeId, platform: 'ios' | 'android' | 'both', _filename?: string, options?: PlatformExportOptions): Promise<void>;
    private exportAdaptiveIcon;
    private getNodeBounds;
    private getNodeName;
    private getExtension;
    private toSnakeCase;
}
/**
 * Create a platform asset exporter.
 */
export declare function createPlatformAssetExporter(sceneGraph: SceneGraph): PlatformAssetExporter;
//# sourceMappingURL=platform-asset-exporter.d.ts.map