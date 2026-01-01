/**
 * CSS Code Generator
 *
 * Generate CSS code from scene graph nodes for web development.
 */
import type { NodeId } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * CSS generation options
 */
export interface CSSGeneratorOptions {
    /** Output format (default: 'css') */
    format?: 'css' | 'scss' | 'less' | 'tailwind' | undefined;
    /** Use CSS variables for colors (default: true) */
    useVariables?: boolean | undefined;
    /** Variable prefix (default: '--designlibre-') */
    variablePrefix?: string | undefined;
    /** Class name prefix (default: '') */
    classPrefix?: string | undefined;
    /** Use shorthand properties (default: true) */
    useShorthand?: boolean | undefined;
    /** Include comments (default: true) */
    includeComments?: boolean | undefined;
    /** Unit for dimensions (default: 'px') */
    unit?: 'px' | 'rem' | 'em' | undefined;
    /** Base font size for rem conversion (default: 16) */
    baseFontSize?: number | undefined;
    /** Minify output (default: false) */
    minify?: boolean | undefined;
    /** Include reset styles (default: false) */
    includeReset?: boolean | undefined;
}
/**
 * CSS generation result
 */
export interface CSSGeneratorResult {
    /** Generated CSS code */
    readonly css: string;
    /** CSS variables definitions */
    readonly variables: string;
    /** Class names generated */
    readonly classNames: readonly string[];
    /** Color palette extracted */
    readonly colorPalette: readonly ColorDefinition[];
    /** Typography styles extracted */
    readonly typography: readonly TypographyDefinition[];
    /** Blob for download */
    readonly blob: Blob;
    /** Download URL */
    readonly url: string;
}
/**
 * Color definition
 */
export interface ColorDefinition {
    readonly name: string;
    readonly value: string;
    readonly rgba: RGBA;
}
/**
 * Typography definition
 */
export interface TypographyDefinition {
    readonly name: string;
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly fontWeight: number;
    readonly lineHeight?: number | undefined;
    readonly letterSpacing?: number | undefined;
}
/**
 * CSS Code Generator
 */
export declare class CSSGenerator {
    private sceneGraph;
    private colorIndex;
    private typographyIndex;
    private extractedColors;
    private extractedTypography;
    constructor(sceneGraph: SceneGraph);
    /**
     * Generate CSS for a node.
     */
    generate(nodeId: NodeId, options?: CSSGeneratorOptions): CSSGeneratorResult;
    /**
     * Generate CSS for multiple nodes.
     */
    generateMultiple(nodeIds: NodeId[], options?: CSSGeneratorOptions): CSSGeneratorResult;
    /**
     * Download the generated CSS.
     */
    download(nodeId: NodeId, filename?: string, options?: CSSGeneratorOptions): void;
    private extractDesignTokens;
    private registerColor;
    private registerTypography;
    private generateVariables;
    private generateNodeStyles;
    private generateReset;
    private generateTailwindConfig;
    private fillsToCSS;
    private strokesToCSS;
    private effectsToCSS;
    private textStylesToCSS;
    private colorToCSS;
    private colorToHex;
    private toUnit;
    private sanitizeClassName;
}
/**
 * Create a CSS generator.
 */
export declare function createCSSGenerator(sceneGraph: SceneGraph): CSSGenerator;
//# sourceMappingURL=css-generator.d.ts.map