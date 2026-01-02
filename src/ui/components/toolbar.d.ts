/**
 * Toolbar
 *
 * UI component for tool selection with popup menus for tool groups.
 */
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
/**
 * Tool options for configurable tools
 */
interface ToolOptions {
    sides?: number;
    points?: number;
    innerRadius?: number;
}
/**
 * Toolbar options
 */
export interface ToolbarOptions {
    /** Position of toolbar */
    position?: 'top' | 'left' | 'right' | 'bottom' | undefined;
    /** Show tool labels */
    showLabels?: boolean | undefined;
}
/**
 * Toolbar
 */
export declare class Toolbar {
    private runtime;
    private container;
    private element;
    private options;
    private buttons;
    private activePopup;
    private selectedGroupTools;
    private toolOptions;
    constructor(runtime: DesignLibreRuntime, container: HTMLElement, options?: ToolbarOptions);
    private setup;
    private getToolbarStyles;
    private getSeparatorStyles;
    private createToolButton;
    private createToolGroupButton;
    private togglePopup;
    private createPopupMenu;
    private createPopupMenuItem;
    private createToolOptionsRow;
    private selectGroupTool;
    private applyToolOptions;
    private closePopup;
    private addActionButtons;
    private createActionButton;
    private setActiveButton;
    /**
     * Get tool options for a specific tool.
     */
    getToolOptions(toolId: string): ToolOptions | undefined;
    /**
     * Show the toolbar.
     */
    show(): void;
    /**
     * Hide the toolbar.
     */
    hide(): void;
    /**
     * Dispose of the toolbar.
     */
    dispose(): void;
}
/**
 * Create a toolbar.
 */
export declare function createToolbar(runtime: DesignLibreRuntime, container: HTMLElement, options?: ToolbarOptions): Toolbar;
export {};
//# sourceMappingURL=toolbar.d.ts.map