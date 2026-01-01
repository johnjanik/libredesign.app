/**
 * Selection Overlay
 *
 * Renders colored outlines around nodes selected by remote users.
 * Integrates with the scene graph to get node bounds.
 */
const DEFAULT_CONFIG = {
    outlineWidth: 2,
    outlineOffset: 2,
    showUserLabel: true,
    labelFontSize: 10,
    cornerRadius: 4,
};
/**
 * Selection overlay renderer
 */
export class SelectionOverlay {
    config;
    overlayContainer;
    selectionElements = new Map();
    viewportOffset = { x: 0, y: 0 };
    viewportZoom = 1;
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.overlayContainer = this.createOverlayContainer();
        this.config.container.appendChild(this.overlayContainer);
    }
    /**
     * Create the main overlay container.
     */
    createOverlayContainer() {
        const container = document.createElement('div');
        container.className = 'selection-overlay';
        container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
      z-index: 999;
    `;
        return container;
    }
    /**
     * Create a selection container for a client.
     */
    createSelectionElement(clientId, color, userName) {
        const container = document.createElement('div');
        container.className = `selection-${clientId}`;
        container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
        let label = null;
        if (this.config.showUserLabel && userName) {
            label = document.createElement('div');
            label.className = 'selection-label';
            label.textContent = userName;
            label.style.cssText = `
        position: absolute;
        background-color: ${color};
        color: ${this.getContrastColor(color)};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: ${this.config.labelFontSize}px;
        font-weight: 500;
        padding: 2px 6px;
        border-radius: 2px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 150ms ease-in-out;
        pointer-events: none;
      `;
            container.appendChild(label);
        }
        this.overlayContainer.appendChild(container);
        return {
            container,
            rects: new Map(),
            label,
            color,
        };
    }
    /**
     * Create a selection rectangle for a node.
     */
    createSelectionRect(color) {
        const rect = document.createElement('div');
        rect.className = 'selection-rect';
        rect.style.cssText = `
      position: absolute;
      border: ${this.config.outlineWidth}px solid ${color};
      border-radius: ${this.config.cornerRadius}px;
      pointer-events: none;
      box-sizing: border-box;
      background-color: ${color}10;
    `;
        return rect;
    }
    /**
     * Get contrasting text color for background.
     */
    getContrastColor(hexColor) {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    /**
     * Update the viewport transform.
     */
    updateViewport(offsetX, offsetY, zoom) {
        this.viewportOffset = { x: offsetX, y: offsetY };
        this.viewportZoom = zoom;
        this.refreshAllSelections();
    }
    /**
     * Convert world bounds to screen bounds.
     */
    worldToScreen(bounds) {
        const offset = this.config.outlineOffset;
        return {
            x: (bounds.x + this.viewportOffset.x) * this.viewportZoom - offset,
            y: (bounds.y + this.viewportOffset.y) * this.viewportZoom - offset,
            width: bounds.width * this.viewportZoom + offset * 2,
            height: bounds.height * this.viewportZoom + offset * 2,
        };
    }
    /**
     * Update a selection rectangle position.
     */
    updateRectPosition(rect, bounds) {
        const screenBounds = this.worldToScreen(bounds);
        rect.style.left = `${screenBounds.x}px`;
        rect.style.top = `${screenBounds.y}px`;
        rect.style.width = `${screenBounds.width}px`;
        rect.style.height = `${screenBounds.height}px`;
    }
    /**
     * Update selection for a client.
     */
    updateSelection(data) {
        let element = this.selectionElements.get(data.clientId);
        if (!element) {
            element = this.createSelectionElement(data.clientId, data.color, data.userName);
            this.selectionElements.set(data.clientId, element);
        }
        // Track which nodes are in the current selection
        const currentNodeIds = new Set(data.selection.map(id => String(id)));
        // Remove rects for nodes no longer selected
        for (const [nodeIdStr, rect] of element.rects) {
            if (!currentNodeIds.has(nodeIdStr)) {
                rect.remove();
                element.rects.delete(nodeIdStr);
            }
        }
        // Add or update rects for selected nodes
        let minX = Infinity, minY = Infinity;
        for (const nodeId of data.selection) {
            const nodeIdStr = String(nodeId);
            const bounds = this.config.boundsProvider.getNodeBounds(nodeId);
            if (!bounds)
                continue;
            let rect = element.rects.get(nodeIdStr);
            if (!rect) {
                rect = this.createSelectionRect(data.color);
                element.container.appendChild(rect);
                element.rects.set(nodeIdStr, rect);
            }
            this.updateRectPosition(rect, bounds);
            // Track minimum position for label
            const screenBounds = this.worldToScreen(bounds);
            minX = Math.min(minX, screenBounds.x);
            minY = Math.min(minY, screenBounds.y);
        }
        // Update label position
        if (element.label && data.selection.length > 0 && minX !== Infinity) {
            element.label.style.left = `${minX}px`;
            element.label.style.top = `${minY - 20}px`;
            element.label.style.opacity = '1';
        }
        else if (element.label) {
            element.label.style.opacity = '0';
        }
    }
    /**
     * Update multiple selections.
     */
    updateSelections(selections) {
        const activeIds = new Set(selections.map(s => s.clientId));
        // Update active selections
        for (const selection of selections) {
            this.updateSelection(selection);
        }
        // Remove inactive selections
        for (const [clientId, _element] of this.selectionElements) {
            if (!activeIds.has(clientId)) {
                this.removeSelection(clientId);
            }
        }
    }
    /**
     * Refresh all selection positions (after viewport change).
     */
    refreshAllSelections() {
        for (const [_clientId, element] of this.selectionElements) {
            for (const [nodeIdStr, rect] of element.rects) {
                const nodeId = nodeIdStr;
                const bounds = this.config.boundsProvider.getNodeBounds(nodeId);
                if (bounds) {
                    this.updateRectPosition(rect, bounds);
                }
            }
        }
    }
    /**
     * Remove selection for a client.
     */
    removeSelection(clientId) {
        const element = this.selectionElements.get(clientId);
        if (element) {
            element.container.remove();
            this.selectionElements.delete(clientId);
        }
    }
    /**
     * Remove all selections.
     */
    clear() {
        for (const element of this.selectionElements.values()) {
            element.container.remove();
        }
        this.selectionElements.clear();
    }
    /**
     * Get selection count.
     */
    getSelectionCount() {
        return this.selectionElements.size;
    }
    /**
     * Get total selected node count across all clients.
     */
    getTotalSelectedNodeCount() {
        let count = 0;
        for (const element of this.selectionElements.values()) {
            count += element.rects.size;
        }
        return count;
    }
    /**
     * Check if a node is highlighted by any remote selection.
     */
    isNodeHighlighted(nodeId) {
        const nodeIdStr = String(nodeId);
        for (const element of this.selectionElements.values()) {
            if (element.rects.has(nodeIdStr)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get the color used for a client's selection.
     */
    getClientColor(clientId) {
        return this.selectionElements.get(clientId)?.color ?? null;
    }
    /**
     * Show or hide all selections.
     */
    setVisible(visible) {
        this.overlayContainer.style.display = visible ? 'block' : 'none';
    }
    /**
     * Dispose of resources.
     */
    dispose() {
        this.clear();
        this.overlayContainer.remove();
    }
}
/**
 * Create a selection overlay.
 */
export function createSelectionOverlay(config) {
    return new SelectionOverlay(config);
}
//# sourceMappingURL=selection-overlay.js.map