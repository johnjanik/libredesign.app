/**
 * SVG Importer
 *
 * Import SVG files and convert them to scene graph nodes.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * SVG import options
 */
export interface SVGImportOptions {
    /** Parent node ID to import into */
    parentId?: NodeId | undefined;
    /** Flatten groups (default: false) */
    flattenGroups?: boolean | undefined;
    /** Convert strokes to fills (default: false) */
    strokesAsOutlines?: boolean | undefined;
    /** Preserve viewBox dimensions (default: true) */
    preserveViewBox?: boolean | undefined;
    /** Import hidden elements (default: false) */
    importHidden?: boolean | undefined;
    /** Scale factor (default: 1) */
    scale?: number | undefined;
}
/**
 * SVG import result
 */
export interface SVGImportResult {
    /** Root node ID of imported content */
    readonly rootId: NodeId;
    /** Number of nodes created */
    readonly nodeCount: number;
    /** Original SVG dimensions */
    readonly dimensions: {
        width: number;
        height: number;
    };
    /** Warnings during import */
    readonly warnings: readonly string[];
}
/**
 * Parsed SVG element
 */
export interface ParsedElement {
    readonly tag: string;
    readonly attributes: Record<string, string>;
    readonly children: ParsedElement[];
    readonly textContent?: string;
}
/**
 * SVG Importer
 */
export declare class SVGImporter {
    private sceneGraph;
    private warnings;
    private nodeCount;
    constructor(sceneGraph: SceneGraph);
    /**
     * Import SVG from string.
     */
    import(svgContent: string, options?: SVGImportOptions): SVGImportResult;
    /**
     * Import SVG from file.
     */
    importFile(file: File, options?: SVGImportOptions): Promise<SVGImportResult>;
    /**
     * Import SVG from URL.
     */
    importFromUrl(url: string, options?: SVGImportOptions): Promise<SVGImportResult>;
    private getSVGDimensions;
    private parseViewBox;
    private calculateViewBoxTransform;
    private parseLength;
    private importChildren;
    private importElement;
    private importGroup;
    private importRect;
    private importCircle;
    private importEllipse;
    private importLine;
    private importPolyline;
    private importPath;
    private importText;
    private importImage;
    private parseSVGPath;
    private tokenizePath;
    private parseStyle;
    private getStyleValue;
    private parseColor;
    private parseHexColor;
    private parseRGBColor;
    private parseOpacity;
    private parseFontSize;
    private parseTransform;
    private combineTransforms;
    private parsePoints;
    private createEllipsePath;
    private getDefaultParent;
}
/**
 * Create an SVG importer.
 */
export declare function createSVGImporter(sceneGraph: SceneGraph): SVGImporter;
//# sourceMappingURL=svg-importer.d.ts.map