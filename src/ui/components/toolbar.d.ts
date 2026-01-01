/**
 * Toolbar
 *
 * UI component for tool selection and common actions.
 */
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
/**
 * Tool definition
 */
interface ToolDefinition {
    id: string;
    name: string;
    icon: string;
    shortcut: string;
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
    private tools;
    private buttons;
    constructor(runtime: DesignLibreRuntime, container: HTMLElement, options?: ToolbarOptions);
    private setup;
    private getToolbarStyles;
    private getSeparatorStyles;
    private createToolButton;
    private addActionButtons;
    private createActionButton;
    private setActiveButton;
    /**
     * Add a custom tool.
     */
    addTool(tool: ToolDefinition): void;
    /**
     * Remove a tool.
     */
    removeTool(toolId: string): void;
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