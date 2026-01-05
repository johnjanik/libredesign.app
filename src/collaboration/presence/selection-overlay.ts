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

const DEFAULT_CONFIG = {
  outlineWidth: 2,
  outlineOffset: 2,
  showUserLabel: true,
  labelFontSize: 10,
  cornerRadius: 4,
};

/**
 * Selection element for a client
 */
interface SelectionElement {
  container: HTMLDivElement;
  rects: Map<string, HTMLDivElement>; // nodeId -> rect element
  label: HTMLDivElement | null;
  color: string;
}

/**
 * Selection overlay renderer
 */
export class SelectionOverlay {
  private config: SelectionOverlayConfig & typeof DEFAULT_CONFIG;
  private overlayContainer: HTMLDivElement;
  private selectionElements: Map<string, SelectionElement> = new Map();
  private viewportOffset = { x: 0, y: 0 };
  private viewportZoom = 1;

  constructor(config: SelectionOverlayConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.overlayContainer = this.createOverlayContainer();
    this.config.container.appendChild(this.overlayContainer);
  }

  /**
   * Create the main overlay container.
   */
  private createOverlayContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'selection-overlay absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-999';
    return container;
  }

  /**
   * Create a selection container for a client.
   */
  private createSelectionElement(clientId: string, color: string, userName?: string): SelectionElement {
    const container = document.createElement('div');
    container.className = `selection-${clientId} absolute inset-0 w-full h-full pointer-events-none`;

    let label: HTMLDivElement | null = null;
    if (this.config.showUserLabel && userName) {
      label = document.createElement('div');
      label.className = 'selection-label absolute font-medium py-0.5 px-1.5 rounded-sm whitespace-nowrap opacity-0 transition-opacity duration-150 pointer-events-none';
      label.textContent = userName;
      label.style.backgroundColor = color;
      label.style.color = this.getContrastColor(color);
      label.style.fontSize = `${this.config.labelFontSize}px`;
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
  private createSelectionRect(color: string): HTMLDivElement {
    const rect = document.createElement('div');
    rect.className = 'selection-rect absolute pointer-events-none box-border';
    rect.style.border = `${this.config.outlineWidth}px solid ${color}`;
    rect.style.borderRadius = `${this.config.cornerRadius}px`;
    rect.style.backgroundColor = `${color}10`;
    return rect;
  }

  /**
   * Get contrasting text color for background.
   */
  private getContrastColor(hexColor: string): string {
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
  updateViewport(offsetX: number, offsetY: number, zoom: number): void {
    this.viewportOffset = { x: offsetX, y: offsetY };
    this.viewportZoom = zoom;
    this.refreshAllSelections();
  }

  /**
   * Convert world bounds to screen bounds.
   */
  private worldToScreen(bounds: NodeBounds): NodeBounds {
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
  private updateRectPosition(rect: HTMLDivElement, bounds: NodeBounds): void {
    const screenBounds = this.worldToScreen(bounds);
    rect.style.left = `${screenBounds.x}px`;
    rect.style.top = `${screenBounds.y}px`;
    rect.style.width = `${screenBounds.width}px`;
    rect.style.height = `${screenBounds.height}px`;
  }

  /**
   * Update selection for a client.
   */
  updateSelection(data: SelectionDisplayData): void {
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

      if (!bounds) continue;

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
    } else if (element.label) {
      element.label.style.opacity = '0';
    }
  }

  /**
   * Update multiple selections.
   */
  updateSelections(selections: SelectionDisplayData[]): void {
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
  refreshAllSelections(): void {
    for (const [_clientId, element] of this.selectionElements) {
      for (const [nodeIdStr, rect] of element.rects) {
        const nodeId = nodeIdStr as unknown as NodeId;
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
  removeSelection(clientId: string): void {
    const element = this.selectionElements.get(clientId);
    if (element) {
      element.container.remove();
      this.selectionElements.delete(clientId);
    }
  }

  /**
   * Remove all selections.
   */
  clear(): void {
    for (const element of this.selectionElements.values()) {
      element.container.remove();
    }
    this.selectionElements.clear();
  }

  /**
   * Get selection count.
   */
  getSelectionCount(): number {
    return this.selectionElements.size;
  }

  /**
   * Get total selected node count across all clients.
   */
  getTotalSelectedNodeCount(): number {
    let count = 0;
    for (const element of this.selectionElements.values()) {
      count += element.rects.size;
    }
    return count;
  }

  /**
   * Check if a node is highlighted by any remote selection.
   */
  isNodeHighlighted(nodeId: NodeId): boolean {
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
  getClientColor(clientId: string): string | null {
    return this.selectionElements.get(clientId)?.color ?? null;
  }

  /**
   * Show or hide all selections.
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
 * Create a selection overlay.
 */
export function createSelectionOverlay(config: SelectionOverlayConfig): SelectionOverlay {
  return new SelectionOverlay(config);
}
