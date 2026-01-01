/**
 * Documentation Generator
 *
 * Auto-generates documentation for components.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { TokenRegistry } from '@devtools/tokens/token-registry';
import type { AnyDesignToken } from '@devtools/tokens/token-types';
/** Property documentation */
export interface PropertyDocumentation {
    readonly name: string;
    readonly type: string;
    readonly defaultValue: string;
    readonly description?: string;
}
/** Variant documentation */
export interface VariantDocumentation {
    readonly name: string;
    readonly properties: Record<string, string>;
}
/** Component documentation */
export interface ComponentDocumentation {
    readonly name: string;
    readonly description: string;
    readonly nodeType: string;
    readonly properties: readonly PropertyDocumentation[];
    readonly variants: readonly VariantDocumentation[];
    readonly usedTokens: readonly AnyDesignToken[];
    readonly children: readonly string[];
    readonly dimensions: {
        readonly width: number;
        readonly height: number;
    };
}
/** Style guide documentation */
export interface StyleGuideDocumentation {
    readonly title: string;
    readonly sections: readonly StyleGuideSection[];
}
/** Style guide section */
export interface StyleGuideSection {
    readonly title: string;
    readonly components: readonly ComponentDocumentation[];
}
/**
 * Documentation Generator
 *
 * Generates documentation for components and style guides.
 */
export declare class DocumentationGenerator {
    private readonly sceneGraph;
    private readonly tokenRegistry;
    constructor(sceneGraph: SceneGraph, tokenRegistry: TokenRegistry);
    /**
     * Generate documentation for a component.
     */
    generateComponentDoc(componentId: NodeId): ComponentDocumentation | null;
    /**
     * Generate a style guide from a page.
     */
    generateStyleGuide(pageId: NodeId): StyleGuideDocumentation | null;
    /**
     * Export documentation to Markdown.
     */
    exportToMarkdown(doc: ComponentDocumentation): string;
    /**
     * Export documentation to HTML.
     */
    exportToHTML(doc: ComponentDocumentation): string;
    /**
     * Export style guide to Markdown.
     */
    exportStyleGuideToMarkdown(guide: StyleGuideDocumentation): string;
    private extractProperties;
    private extractVariants;
    private findUsedTokens;
    private getChildNames;
    private getDimensions;
    private generateDescription;
    private formatTokenValue;
    private escapeHtml;
    private toSlug;
}
/**
 * Create a documentation generator.
 */
export declare function createDocumentationGenerator(sceneGraph: SceneGraph, tokenRegistry: TokenRegistry): DocumentationGenerator;
//# sourceMappingURL=doc-generator.d.ts.map