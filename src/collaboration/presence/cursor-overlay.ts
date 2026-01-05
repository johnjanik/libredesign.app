/**
 * Cursor Overlay
 *
 * Renders remote user cursors with labels showing user name and color.
 * Uses HTML/CSS for cursor rendering to avoid WebGL complexity for UI elements.
 */

import type { CursorPosition } from './presence-types';

/**
 * Cursor display data
 */
export interface CursorDisplayData {
  readonly clientId: string;
  readonly cursor: CursorPosition;
  readonly color: string;
  readonly userName: string;
  readonly activeTool?: string;
}

/**
 * Cursor overlay configuration
 */
export interface CursorOverlayConfig {
  /** Container element for the overlay */
  readonly container: HTMLElement;
  /** Cursor size in pixels */
  readonly cursorSize?: number;
  /** Label font size in pixels */
  readonly labelFontSize?: number;
  /** Label padding in pixels */
  readonly labelPadding?: number;
  /** Fade out duration for inactive cursors (ms) */
  readonly fadeOutDuration?: number;
  /** Show tool indicator */
  readonly showToolIndicator?: boolean;
}

const DEFAULT_CONFIG = {
  cursorSize: 16,
  labelFontSize: 12,
  labelPadding: 4,
  fadeOutDuration: 300,
  showToolIndicator: true,
};

/**
 * Cursor element with associated data
 */
interface CursorElement {
  container: HTMLDivElement;
  cursor: HTMLDivElement;
  label: HTMLDivElement;
  lastUpdate: number;
}

/**
 * Cursor overlay renderer
 */
export class CursorOverlay {
  private config: CursorOverlayConfig & typeof DEFAULT_CONFIG;
  private overlayContainer: HTMLDivElement;
  private cursorElements: Map<string, CursorElement> = new Map();
  private viewportOffset = { x: 0, y: 0 };
  private viewportZoom = 1;

  constructor(config: CursorOverlayConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.overlayContainer = this.createOverlayContainer();
    this.config.container.appendChild(this.overlayContainer);
  }

  /**
   * Create the main overlay container.
   */
  private createOverlayContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'cursor-overlay absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-1000';
    return container;
  }

  /**
   * Create a cursor element.
   */
  private createCursorElement(data: CursorDisplayData): CursorElement {
    const container = document.createElement('div');
    container.className = 'remote-cursor absolute pointer-events-none will-change-transform';
    container.style.transition = `transform 50ms linear, opacity ${this.config.fadeOutDuration}ms ease-out`;

    // Cursor arrow SVG
    const cursor = document.createElement('div');
    cursor.className = 'cursor-arrow';
    cursor.innerHTML = this.createCursorSVG(data.color);
    cursor.style.width = `${this.config.cursorSize}px`;
    cursor.style.height = `${this.config.cursorSize}px`;

    // User label
    const label = document.createElement('div');
    label.className = 'cursor-label absolute font-medium rounded whitespace-nowrap shadow-md';
    label.textContent = data.userName;
    label.style.left = `${this.config.cursorSize + 2}px`;
    label.style.top = `${this.config.cursorSize - 4}px`;
    label.style.backgroundColor = data.color;
    label.style.color = this.getContrastColor(data.color);
    label.style.fontSize = `${this.config.labelFontSize}px`;
    label.style.padding = `${this.config.labelPadding}px ${this.config.labelPadding * 2}px`;

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
  private createCursorSVG(color: string): string {
    return `
      <svg width="${this.config.cursorSize}" height="${this.config.cursorSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.94c.45 0 .67-.54.35-.85L6.35 2.79a.5.5 0 0 0-.85.42Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      </svg>
    `;
  }

  /**
   * Get contrasting text color for background.
   */
  private getContrastColor(hexColor: string): string {
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
  updateViewport(offsetX: number, offsetY: number, zoom: number): void {
    this.viewportOffset = { x: offsetX, y: offsetY };
    this.viewportZoom = zoom;

    // Re-render all cursors with new viewport
    for (const [_clientId, element] of this.cursorElements) {
      const data = element as CursorElement & { _data?: CursorDisplayData };
      if (data._data) {
        this.updateCursorPosition(element, data._data.cursor);
      }
    }
  }

  /**
   * Convert world coordinates to screen coordinates.
   */
  private worldToScreen(worldPos: CursorPosition): { x: number; y: number } {
    return {
      x: (worldPos.x + this.viewportOffset.x) * this.viewportZoom,
      y: (worldPos.y + this.viewportOffset.y) * this.viewportZoom,
    };
  }

  /**
   * Update cursor position.
   */
  private updateCursorPosition(element: CursorElement, cursor: CursorPosition): void {
    const screenPos = this.worldToScreen(cursor);
    element.container.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px)`;
  }

  /**
   * Update a cursor.
   */
  updateCursor(data: CursorDisplayData): void {
    let element = this.cursorElements.get(data.clientId);

    if (!element) {
      element = this.createCursorElement(data);
      this.cursorElements.set(data.clientId, element);
    }

    // Store data reference for viewport updates
    (element as CursorElement & { _data?: CursorDisplayData })._data = data;

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
  updateCursors(cursors: CursorDisplayData[]): void {
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
  removeCursor(clientId: string): void {
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
  clear(): void {
    for (const element of this.cursorElements.values()) {
      element.container.remove();
    }
    this.cursorElements.clear();
  }

  /**
   * Get cursor count.
   */
  getCursorCount(): number {
    return this.cursorElements.size;
  }

  /**
   * Show or hide all cursors.
   */
  setVisible(visible: boolean): void {
    this.overlayContainer.style.display = visible ? 'block' : 'none';
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.clear();
    this.overlayContainer.remove();
  }
}

/**
 * Create a cursor overlay.
 */
export function createCursorOverlay(config: CursorOverlayConfig): CursorOverlay {
  return new CursorOverlay(config);
}
