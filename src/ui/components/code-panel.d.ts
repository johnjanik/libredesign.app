/**
 * Code Panel
 *
 * Code export panel showing generated CSS/Swift/Kotlin for selected elements.
 */
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
/** Supported code formats */
export type CodeFormat = 'css' | 'swift' | 'kotlin';
/** Code panel options */
export interface CodePanelOptions {
    defaultFormat?: CodeFormat;
    width?: number;
    position?: 'left' | 'right';
}
/**
 * Code Panel
 *
 * Displays generated code for selected elements.
 */
export declare class CodePanel {
    private runtime;
    private sceneGraph;
    private container;
    private element;
    private codeElement;
    private currentFormat;
    private options;
    private selectedNodeIds;
    private unsubscribers;
    constructor(runtime: DesignLibreRuntime, container: HTMLElement, options?: CodePanelOptions);
    private setup;
    private getPanelStyles;
    private createHeader;
    private setFormat;
    private updateCode;
    private generateCode;
    private generateCSS;
    private generateSwift;
    private generateKotlin;
    private highlightSyntax;
    private escapeHtml;
    private toClassName;
    private toCamelCase;
    private toPascalCase;
    private rgbaToCSS;
    private rgbaToHexInt;
    /** Show the panel */
    show(): void;
    /** Hide the panel */
    hide(): void;
    /** Dispose of the panel */
    dispose(): void;
}
/**
 * Create a code panel.
 */
export declare function createCodePanel(runtime: DesignLibreRuntime, container: HTMLElement, options?: CodePanelOptions): CodePanel;
//# sourceMappingURL=code-panel.d.ts.map