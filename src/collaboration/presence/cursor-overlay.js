/**
 * Cursor Overlay
 *
 * Renders remote user cursors with labels showing user name and color.
 * Uses HTML/CSS for cursor rendering to avoid WebGL complexity for UI elements.
 */
const DEFAULT_CONFIG = {
    cursorSize: 16,
    labelFontSize: 12,
    labelPadding: 4,
    fadeOutDuration: 300,
    showToolIndicator: true,
};
/**
 * Cursor overlay renderer
 */
export class CursorOverlay {
    config;
    overlayContainer;
    cursorElements = new Map();
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
        container.className = 'cursor-overlay';
        container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
      z-index: 1000;
    `;
        return container;
    }
    /**
     * Create a cursor element.
     */
    createCursorElement(data) {
        const container = document.createElement('div');
        container.className = 'remote-cursor';
        container.style.cssText = `
      position: absolute;
      pointer-events: none;
      transition: transform 50ms linear, opacity ${this.config.fadeOutDuration}ms ease-out;
      will-change: transform;
    `;
        // Cursor arrow SVG
        const cursor = document.createElement('div');
        cursor.className = 'cursor-arrow';
        cursor.innerHTML = this.createCursorSVG(data.color);
        cursor.style.cssText = `
      width: ${this.config.cursorSize}px;
      height: ${this.config.cursorSize}px;
    `;
        // User label
        const label = document.createElement('div');
        label.className = 'cursor-label';
        label.textContent = data.userName;
        label.style.cssText = `
      position: absolute;
      left: ${this.config.cursorSize + 2}px;
      top: ${this.config.cursorSize - 4}px;
      background-color: ${data.color};
      color: ${this.getContrastColor(data.color)};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${this.config.labelFontSize}px;
      font-weight: 500;
      padding: ${this.config.labelPadding}px ${this.config.labelPadding * 2}px;
      border-radius: 4px;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    `;
        container.appendChild(cursor);
        container.appendChild(label);
        this.overlayContainer.appendChild(container);
        return {
            container,
            cursor,
            label,
            lastUpdate: Date.now(),
        };
    }
    /**
     * Create cursor arrow SVG.
     */
    createCursorSVG(color) {
        return `
      <svg width="${this.config.cursorSize}" height="${this.config.cursorSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.94c.45 0 .67-.54.35-.85L6.35 2.79a.5.5 0 0 0-.85.42Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      </svg>
    `;
    }
    /**
     * Get contrasting text color for background.
     */
    getContrastColor(hexColor) {
        // Parse hex color
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    /**
     * Update the viewport transform.
     */
    updateViewport(offsetX, offsetY, zoom) {
        this.viewportOffset = { x: offsetX, y: offsetY };
        this.viewportZoom = zoom;
        // Re-render all cursors with new viewport
        for (const [_clientId, element] of this.cursorElements) {
            const data = element;
            if (data._data) {
                this.updateCursorPosition(element, data._data.cursor);
            }
        }
    }
    /**
     * Convert world coordinates to screen coordinates.
     */
    worldToScreen(worldPos) {
        return {
            x: (worldPos.x + this.viewportOffset.x) * this.viewportZoom,
            y: (worldPos.y + this.viewportOffset.y) * this.viewportZoom,
        };
    }
    /**
     * Update cursor position.
     */
    updateCursorPosition(element, cursor) {
        const screenPos = this.worldToScreen(cursor);
        element.container.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px)`;
    }
    /**
     * Update a cursor.
     */
    updateCursor(data) {
        let element = this.cursorElements.get(data.clientId);
        if (!element) {
            element = this.createCursorElement(data);
            this.cursorElements.set(data.clientId, element);
        }
        // Store data reference for viewport updates
        element._data = data;
        // Update position
        this.updateCursorPosition(element, data.cursor);
        // Update label if name changed
        if (element.label.textContent !== data.userName) {
            element.label.textContent = data.userName;
        }
        // Update color if changed
        if (!element.cursor.innerHTML.includes(data.color)) {
            element.cursor.innerHTML = this.createCursorSVG(data.color);
            element.label.style.backgroundColor = data.color;
            element.label.style.color = this.getContrastColor(data.color);
        }
        // Show and reset opacity
        element.container.style.opacity = '1';
        element.lastUpdate = Date.now();
    }
    /**
     * Update multiple cursors.
     */
    updateCursors(cursors) {
        const activeIds = new Set(cursors.map(c => c.clientId));
        // Update active cursors
        for (const cursor of cursors) {
            this.updateCursor(cursor);
        }
        // Fade out inactive cursors
        for (const [clientId, element] of this.cursorElements) {
            if (!activeIds.has(clientId)) {
                element.container.style.opacity = '0';
            }
        }
    }
    /**
     * Remove a cursor.
     */
    removeCursor(clientId) {
        const element = this.cursorElements.get(clientId);
        if (element) {
            // Fade out then remove
            element.container.style.opacity = '0';
            setTimeout(() => {
                element.container.remove();
                this.cursorElements.delete(clientId);
            }, this.config.fadeOutDuration);
        }
    }
    /**
     * Remove all cursors.
     */
    clear() {
        for (const element of this.cursorElements.values()) {
            element.container.remove();
        }
        this.cursorElements.clear();
    }
    /**
     * Get cursor count.
     */
    getCursorCount() {
        return this.cursorElements.size;
    }
    /**
     * Show or hide all cursors.
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
 * Create a cursor overlay.
 */
export function createCursorOverlay(config) {
    return new CursorOverlay(config);
}
//# sourceMappingURL=cursor-overlay.js.map