/**
 * Selection Overlay
 *
 * Renders colored outlines around nodes selected by remote users.
 * Integrates with the scene graph to get node bounds.
 */
import type { NodeId } from '@core/types/common';
/**
 * Bounding box for a node
 */
export interface NodeBounds {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}
/**
 * Node bounds provider interface
 */
export interface NodeBoundsProvider {
    getNodeBounds(nodeId: NodeId): NodeBounds | null;
}
/**
 * Selection display data
 */
export interface SelectionDisplayData {
    readonly clientId: string;
    readonly selection: readonly NodeId[];
    readonly color: string;
    readonly userName?: string;
}
/**
 * Selection overlay configuration
 */
export interface SelectionOverlayConfig {
    /** Container element for the overlay */
    readonly container: HTMLElement;
    /** Node bounds provider */
    readonly boundsProvider: NodeBoundsProvider;
    /** Selection outline width in pixels */
    readonly outlineWidth?: number;
    /** Selection outline offset in pixels */
    readonly outlineOffset?: number;
    /** Show user label on selection */
    readonly showUserLabel?: boolean;
    /** Label font size in pixels */
    readonly labelFontSize?: number;
    /** Corner radius for selection rectangles */
    readonly cornerRadius?: number;
}
/**
 * Selection overlay renderer
 */
export declare class SelectionOverlay {
    private config;
    private overlayContainer;
    private selectionElements;
    private viewportOffset;
    private viewportZoom;
    constructor(config: SelectionOverlayConfig);
    /**
     * Create the main overlay container.
     */
    private createOverlayContainer;
    /**
     * Create a selection container for a client.
     */
    private createSelectionElement;
    /**
     * Create a selection rectangle for a node.
     */
    private createSelectionRect;
    /**
     * Get contrasting text color for background.
     */
    private getContrastColor;
    /**
     * Update the viewport transform.
     */
    updateViewport(offsetX: number, offsetY: number, zoom: number): void;
    /**
     * Convert world bounds to screen bounds.
     */
    private worldToScreen;
    /**
     * Update a selection rectangle position.
     */
    private updateRectPosition;
    /**
     * Update selection for a client.
     */
    updateSelection(data: SelectionDisplayData): void;
    /**
     * Update multiple selections.
     */
    updateSelections(selections: SelectionDisplayData[]): void;
    /**
     * Refresh all selection positions (after viewport change).
     */
    refreshAllSelections(): void;
    /**
     * Remove selection for a client.
     */
    removeSelection(clientId: string): void;
    /**
     * Remove all selections.
     */
    clear(): void;
    /**
     * Get selection count.
     */
    getSelectionCount(): number;
    /**
     * Get total selected node count across all clients.
     */
    getTotalSelectedNodeCount(): number;
    /**
     * Check if a node is highlighted by any remote selection.
     */
    isNodeHighlighted(nodeId: NodeId): boolean;
    /**
     * Get the color used for a client's selection.
     */
    getClientColor(clientId: string): string | null;
    /**
     * Show or hide all selections.
     */
    setVisible(visible: boolean): void;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create a selection overlay.
 */
export declare function createSelectionOverlay(config: SelectionOverlayConfig): SelectionOverlay;
//# sourceMappingURL=selection-overlay.d.ts.map