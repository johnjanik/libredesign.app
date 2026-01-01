/**
 * Tokens Panel
 *
 * UI panel for managing design tokens.
 */
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { TokenRegistry } from '@devtools/tokens/token-registry';
import type { TokenExporter } from '@devtools/tokens/token-exporter';
/** Tokens panel options */
export interface TokensPanelOptions {
    position?: 'left' | 'right';
    width?: number;
}
/**
 * Tokens Panel
 *
 * Displays and manages design tokens.
 */
export declare class TokensPanel {
    private registry;
    private exporter;
    private container;
    private element;
    private contentElement;
    private options;
    private activeTab;
    private unsubscribers;
    constructor(_runtime: DesignLibreRuntime, registry: TokenRegistry, exporter: TokenExporter, container: HTMLElement, options?: TokensPanelOptions);
    private setup;
    private getPanelStyles;
    private createHeader;
    private createTabs;
    private updateTabs;
    private createExportSection;
    private updateContent;
    private renderEmptyState;
    private renderTypeSection;
    private renderToken;
    private createTokenElement;
    private groupByType;
    private formatTypeName;
    private formatTokenValue;
    private getTokenCopyValue;
    /** Show the panel */
    show(): void;
    /** Hide the panel */
    hide(): void;
    /** Dispose of the panel */
    dispose(): void;
}
/**
 * Create a tokens panel.
 */
export declare function createTokensPanel(runtime: DesignLibreRuntime, registry: TokenRegistry, exporter: TokenExporter, container: HTMLElement, options?: TokensPanelOptions): TokensPanel;
//# sourceMappingURL=tokens-panel.d.ts.map