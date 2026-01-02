/**
 * Context Menu
 *
 * Right-click context menu with context-aware options.
 */
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
/**
 * Menu item definition
 */
export interface MenuItem {
    id: string;
    label: string;
    shortcut?: string | undefined;
    icon?: string | undefined;
    disabled?: boolean | undefined;
    separator?: boolean | undefined;
    submenu?: MenuItem[] | undefined;
    action?: (() => void) | undefined;
}
/**
 * Context menu options
 */
export interface ContextMenuOptions {
    /** Animation duration in ms */
    animationDuration?: number;
}
/**
 * Context Menu Component
 */
export declare class ContextMenu {
    private runtime;
    private container;
    private menuElement;
    private options;
    private isVisible;
    private targetNodeIds;
    constructor(runtime: DesignLibreRuntime, options?: ContextMenuOptions);
    /**
     * Create the menu container element.
     */
    private createContainer;
    /**
     * Attach global event listeners.
     */
    private attachEventListeners;
    /**
     * Show the context menu at specified position.
     */
    show(x: number, y: number, targetNodeIds?: NodeId[]): void;
    /**
     * Hide the context menu.
     */
    hide(): void;
    /**
     * Get the context type based on selection.
     */
    private getContextType;
    /**
     * Get menu items based on context type.
     */
    private getMenuItems;
    /**
     * Get menu items for canvas context (no selection).
     */
    private getCanvasMenuItems;
    /**
     * Get menu items for selection context.
     */
    private getSelectionMenuItems;
    /**
     * Render menu items to the menu element.
     */
    private renderMenuItems;
    /**
     * Dispose of the context menu.
     */
    dispose(): void;
}
/**
 * Create a context menu.
 */
export declare function createContextMenu(runtime: DesignLibreRuntime, options?: ContextMenuOptions): ContextMenu;
//# sourceMappingURL=context-menu.d.ts.map