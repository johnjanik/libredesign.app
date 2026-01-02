/**
 * Left Sidebar
 *
 * Collapsible sidebar with file menu, leaves (pages), and layers.
 */
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
/**
 * Left sidebar options
 */
export interface LeftSidebarOptions {
    /** Initial width */
    width?: number;
    /** Initially collapsed */
    collapsed?: boolean;
}
/**
 * Left Sidebar
 */
export declare class LeftSidebar {
    private runtime;
    private container;
    private element;
    private options;
    private collapsed;
    private documentName;
    private activeTab;
    private leaves;
    private activeLeafId;
    private leafCounter;
    private onCollapseChange?;
    constructor(runtime: DesignLibreRuntime, container: HTMLElement, options?: LeftSidebarOptions);
    private setup;
    /**
     * Sync leaves with actual PAGE nodes from scene graph.
     */
    private syncLeavesFromSceneGraph;
    private updateStyles;
    private render;
    private renderCollapsedState;
    private renderExpandedState;
    private createHeader;
    private createFileNameSection;
    private createTabsSection;
    private createLeavesSection;
    private createLeafItem;
    private createLayersSection;
    private createLayerItem;
    private renderLayersSection;
    private getIconButtonStyles;
    private addHoverEffect;
    private toggleCollapse;
    private addLeaf;
    private renameLeaf;
    private showFileMenu;
    /**
     * Save the current document as a .preserve file.
     */
    private saveAsPreserve;
    /**
     * Open a .preserve file.
     */
    private openPreserveFile;
    private showFileOptionsMenu;
    private showContextMenu;
    /**
     * Set collapse change callback.
     */
    setOnCollapseChange(callback: (collapsed: boolean) => void): void;
    /**
     * Check if sidebar is collapsed.
     */
    isCollapsed(): boolean;
    /**
     * Set document name.
     */
    setDocumentName(name: string): void;
    /**
     * Dispose of the sidebar.
     */
    dispose(): void;
}
/**
 * Create a left sidebar.
 */
export declare function createLeftSidebar(runtime: DesignLibreRuntime, container: HTMLElement, options?: LeftSidebarOptions): LeftSidebar;
//# sourceMappingURL=left-sidebar.d.ts.map