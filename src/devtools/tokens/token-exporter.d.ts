/**
 * Token Exporter
 *
 * Export design tokens to various formats.
 */
import type { TokenRegistry } from './token-registry';
/** Supported export formats */
export type TokenExportFormat = 'css-variables' | 'scss-variables' | 'tailwind-config' | 'json-dtf' | 'swift-colors' | 'kotlin-compose';
/** Export options */
export interface TokenExportOptions {
    /** Include comments/descriptions */
    includeComments?: boolean;
    /** Prefix for variable names */
    prefix?: string;
    /** Minify output */
    minify?: boolean;
    /** Include theme variants */
    includeThemes?: boolean;
}
/**
 * Token Exporter
 *
 * Exports design tokens to various formats.
 */
export declare class TokenExporter {
    private readonly registry;
    constructor(registry: TokenRegistry);
    /**
     * Export tokens to the specified format.
     */
    export(format: TokenExportFormat, options?: TokenExportOptions): string;
    private exportCSSVariables;
    private exportSCSSVariables;
    private exportTailwindConfig;
    private exportDesignTokensFormat;
    private exportSwiftColors;
    private exportKotlinCompose;
    private groupByType;
    private rgbaToCSS;
    private rgbaToHexInt;
    private shadowToCSS;
    private radiusToCSS;
    private formatLineHeight;
    private toKebabCase;
    private toCamelCase;
    private capitalize;
    private kotlinFontWeight;
}
/**
 * Create a token exporter.
 */
export declare function createTokenExporter(registry: TokenRegistry): TokenExporter;
//# sourceMappingURL=token-exporter.d.ts.map