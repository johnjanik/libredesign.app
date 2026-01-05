/**
 * Search Panel
 *
 * Global search panel for finding layers, assets, components, and pages.
 * Opens as a centered modal/popover with keyboard navigation.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import { getAssetStorageService } from '@persistence/asset-storage';

/**
 * Search result types
 */
type SearchResultType = 'layer' | 'asset' | 'component' | 'page';

/**
 * Search result item
 */
interface SearchResult {
  id: string;
  type: SearchResultType;
  name: string;
  path?: string;
  icon?: string;
  nodeId?: NodeId;
}

/**
 * SVG Icons
 */
const ICONS = {
  search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,
  layer: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12,2 2,7 12,12 22,7 12,2"/>
    <polyline points="2,17 12,22 22,17"/>
    <polyline points="2,12 12,17 22,12"/>
  </svg>`,
  asset: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  </svg>`,
  component: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>`,
  page: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>`,
  frame: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>`,
  text: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
  </svg>`,
  rectangle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>`,
  ellipse: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <ellipse cx="12" cy="12" rx="9" ry="9"/>
  </svg>`,
  group: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>`,
  enter: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>
  </svg>`,
};

/**
 * Search panel class
 */
export class SearchPanel {
  private runtime: DesignLibreRuntime;
  private overlay: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private resultsContainer: HTMLElement | null = null;
  private results: SearchResult[] = [];
  private selectedIndex = 0;
  private searchQuery = '';
  private isOpen = false;

  constructor(runtime: DesignLibreRuntime) {
    this.runtime = runtime;
  }

  /**
   * Open the search panel
   */
  open(): void {
    if (this.isOpen) {
      this.searchInput?.focus();
      return;
    }

    this.isOpen = true;
    this.results = [];
    this.selectedIndex = 0;
    this.searchQuery = '';

    this.createOverlay();
    this.searchInput?.focus();
  }

  /**
   * Close the search panel
   */
  close(): void {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.overlay?.remove();
    this.overlay = null;
    this.searchInput = null;
    this.resultsContainer = null;
  }

  /**
   * Toggle the search panel
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Check if panel is open
   */
  getIsOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Create the overlay and panel
   */
  private createOverlay(): void {
    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'designlibre-search-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 80px;
      z-index: 10000;
    `;
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Panel
    const panel = document.createElement('div');
    panel.className = 'designlibre-search-panel';
    panel.style.cssText = `
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 12px;
      width: 560px;
      max-width: 90vw;
      max-height: 480px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    // Search header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    // Search icon
    const iconSpan = document.createElement('span');
    iconSpan.innerHTML = ICONS.search;
    iconSpan.style.cssText = 'color: var(--designlibre-text-secondary, #888); display: flex;';
    header.appendChild(iconSpan);

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search layers, assets, components, pages...';
    this.searchInput.style.cssText = `
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 16px;
    `;
    this.searchInput.addEventListener('input', () => this.handleSearch());
    this.searchInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
    header.appendChild(this.searchInput);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = ICONS.close;
    closeBtn.title = 'Close (Esc)';
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--designlibre-text-secondary, #888);
      display: flex;
      padding: 4px;
      border-radius: 4px;
    `;
    closeBtn.addEventListener('click', () => this.close());
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      closeBtn.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.backgroundColor = 'transparent';
      closeBtn.style.color = 'var(--designlibre-text-secondary, #888)';
    });
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Results container
    this.resultsContainer = document.createElement('div');
    this.resultsContainer.className = 'search-results';
    this.resultsContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    `;
    this.renderResults();
    panel.appendChild(this.resultsContainer);

    // Footer with keyboard hints
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 16px;
      border-top: 1px solid var(--designlibre-border, #3d3d3d);
      background: var(--designlibre-bg-secondary, #2d2d2d);
      font-size: 11px;
      color: var(--designlibre-text-secondary, #888);
    `;
    footer.innerHTML = `
      <span style="display: flex; align-items: center; gap: 4px;">
        <kbd style="background: var(--designlibre-bg-tertiary, #161616); padding: 2px 6px; border-radius: 3px; font-family: inherit;">↑↓</kbd>
        Navigate
      </span>
      <span style="display: flex; align-items: center; gap: 4px;">
        <kbd style="background: var(--designlibre-bg-tertiary, #161616); padding: 2px 6px; border-radius: 3px; font-family: inherit;">↵</kbd>
        Select
      </span>
      <span style="display: flex; align-items: center; gap: 4px;">
        <kbd style="background: var(--designlibre-bg-tertiary, #161616); padding: 2px 6px; border-radius: 3px; font-family: inherit;">Esc</kbd>
        Close
      </span>
    `;
    panel.appendChild(footer);

    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);
  }

  /**
   * Handle search input
   */
  private async handleSearch(): Promise<void> {
    this.searchQuery = this.searchInput?.value.trim() ?? '';
    this.selectedIndex = 0;

    if (!this.searchQuery) {
      this.results = [];
      this.renderResults();
      return;
    }

    // Search across all sources
    const results: SearchResult[] = [];

    // Search layers
    results.push(...this.searchLayers(this.searchQuery));

    // Search assets
    results.push(...await this.searchAssets(this.searchQuery));

    // Search library components
    results.push(...this.searchLibraryComponents(this.searchQuery));

    // Search pages/frames
    results.push(...this.searchPages(this.searchQuery));

    this.results = results.slice(0, 50); // Limit results
    this.renderResults();
  }

  /**
   * Search layers in scene graph
   */
  private searchLayers(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const sceneGraph = this.runtime.getSceneGraph();
    const lowerQuery = query.toLowerCase();

    // Get all nodes
    const doc = sceneGraph.getDocument();
    if (!doc) return results;

    const searchNode = (nodeId: NodeId, path: string = '') => {
      const node = sceneGraph.getNode(nodeId);
      if (!node) return;

      const nodePath = path ? `${path} / ${node.name}` : node.name;

      if (node.name.toLowerCase().includes(lowerQuery)) {
        const result: SearchResult = {
          id: `layer-${nodeId}`,
          type: 'layer',
          name: node.name,
          icon: this.getNodeIcon(node.type),
          nodeId,
        };
        if (path) {
          result.path = path;
        }
        results.push(result);
      }

      // Search children
      const childIds = sceneGraph.getChildIds(nodeId);
      for (const childId of childIds) {
        searchNode(childId, nodePath);
      }
    };

    const docChildren = sceneGraph.getChildIds(doc.id);
    for (const childId of docChildren) {
      searchNode(childId);
    }

    return results;
  }

  /**
   * Search saved assets
   */
  private async searchAssets(query: string): Promise<SearchResult[]> {
    const storage = getAssetStorageService();
    const assets = await storage.searchAssets(query);

    return assets.map(asset => ({
      id: `asset-${asset.id}`,
      type: 'asset' as SearchResultType,
      name: asset.name,
      path: asset.category,
      icon: ICONS.asset,
    }));
  }

  /**
   * Search library components
   */
  private searchLibraryComponents(query: string): SearchResult[] {
    const results: SearchResult[] = [];

    // Get library registry from runtime
    const libraryRegistry = (this.runtime as unknown as { getLibraryComponentRegistry?: () => { search: (q: string) => Array<{ id: string; name: string; category: string }> } }).getLibraryComponentRegistry?.();
    if (libraryRegistry) {
      const components = libraryRegistry.search(query);
      for (const comp of components.slice(0, 10)) {
        results.push({
          id: `component-${comp.id}`,
          type: 'component',
          name: comp.name,
          path: comp.category,
          icon: ICONS.component,
        });
      }
    }

    return results;
  }

  /**
   * Search pages/frames
   */
  private searchPages(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const sceneGraph = this.runtime.getSceneGraph();
    const lowerQuery = query.toLowerCase();

    const doc = sceneGraph.getDocument();
    if (!doc) return results;

    const docChildren = sceneGraph.getChildIds(doc.id);
    for (const childId of docChildren) {
      const child = sceneGraph.getNode(childId);
      if (!child) continue;

      if ((child.type === 'FRAME' || child.type === 'PAGE') &&
          child.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `page-${childId}`,
          type: 'page',
          name: child.name,
          icon: ICONS.page,
          nodeId: childId,
        });
      }
    }

    return results;
  }

  /**
   * Get icon for node type
   */
  private getNodeIcon(type: string): string {
    switch (type) {
      case 'FRAME': return ICONS.frame;
      case 'TEXT': return ICONS.text;
      case 'RECTANGLE': return ICONS.rectangle;
      case 'ELLIPSE': return ICONS.ellipse;
      case 'GROUP': return ICONS.group;
      case 'COMPONENT': return ICONS.component;
      case 'INSTANCE': return ICONS.component;
      default: return ICONS.layer;
    }
  }

  /**
   * Render search results
   */
  private renderResults(): void {
    if (!this.resultsContainer) return;
    this.resultsContainer.innerHTML = '';

    if (!this.searchQuery) {
      // Show hint
      const hint = document.createElement('div');
      hint.style.cssText = `
        padding: 32px 16px;
        text-align: center;
        color: var(--designlibre-text-secondary, #888);
      `;
      hint.innerHTML = `
        <div style="font-size: 13px;">Start typing to search</div>
        <div style="font-size: 11px; margin-top: 8px; opacity: 0.7;">
          Search across layers, saved assets, components, and pages
        </div>
      `;
      this.resultsContainer.appendChild(hint);
      return;
    }

    if (this.results.length === 0) {
      const noResults = document.createElement('div');
      noResults.style.cssText = `
        padding: 32px 16px;
        text-align: center;
        color: var(--designlibre-text-secondary, #888);
        font-size: 13px;
      `;
      noResults.textContent = 'No results found';
      this.resultsContainer.appendChild(noResults);
      return;
    }

    // Group results by type
    const grouped = new Map<SearchResultType, SearchResult[]>();
    for (const result of this.results) {
      if (!grouped.has(result.type)) {
        grouped.set(result.type, []);
      }
      grouped.get(result.type)!.push(result);
    }

    // Type labels
    const typeLabels: Record<SearchResultType, string> = {
      layer: 'Layers',
      asset: 'Assets',
      component: 'Components',
      page: 'Pages',
    };

    let globalIndex = 0;
    for (const [type, results] of grouped) {
      // Section header
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 8px 12px 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--designlibre-text-secondary, #888);
      `;
      header.textContent = typeLabels[type];
      this.resultsContainer.appendChild(header);

      // Results
      for (const result of results) {
        const item = this.createResultItem(result, globalIndex);
        this.resultsContainer.appendChild(item);
        globalIndex++;
      }
    }
  }

  /**
   * Create a result item element
   */
  private createResultItem(result: SearchResult, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.dataset['index'] = String(index);
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      ${index === this.selectedIndex ? 'background: var(--designlibre-accent-light, #1a3a5c);' : ''}
    `;

    item.addEventListener('mouseenter', () => {
      this.selectedIndex = index;
      this.updateSelection();
    });

    item.addEventListener('click', () => {
      this.selectResult(result);
    });

    // Icon
    const icon = document.createElement('span');
    icon.innerHTML = result.icon || ICONS.layer;
    icon.style.cssText = `
      color: ${index === this.selectedIndex ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-text-secondary, #888)'};
      display: flex;
    `;
    item.appendChild(icon);

    // Name and path
    const info = document.createElement('div');
    info.style.cssText = 'flex: 1; overflow: hidden;';

    const name = document.createElement('div');
    name.textContent = result.name;
    name.style.cssText = `
      font-size: 13px;
      color: var(--designlibre-text-primary, #e4e4e4);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    info.appendChild(name);

    if (result.path) {
      const path = document.createElement('div');
      path.textContent = result.path;
      path.style.cssText = `
        font-size: 11px;
        color: var(--designlibre-text-secondary, #888);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      info.appendChild(path);
    }

    item.appendChild(info);

    // Type badge
    const badge = document.createElement('span');
    badge.textContent = result.type;
    badge.style.cssText = `
      font-size: 10px;
      text-transform: uppercase;
      color: var(--designlibre-text-secondary, #888);
      background: var(--designlibre-bg-tertiary, #161616);
      padding: 2px 6px;
      border-radius: 3px;
    `;
    item.appendChild(badge);

    return item;
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
        this.updateSelection();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
        break;

      case 'Enter':
        e.preventDefault();
        if (this.results[this.selectedIndex]) {
          this.selectResult(this.results[this.selectedIndex]!);
        }
        break;

      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  /**
   * Update selection highlight
   */
  private updateSelection(): void {
    if (!this.resultsContainer) return;

    const items = this.resultsContainer.querySelectorAll('.search-result-item');
    items.forEach((item, i) => {
      const el = item as HTMLElement;
      if (i === this.selectedIndex) {
        el.style.background = 'var(--designlibre-accent-light, #1a3a5c)';
        const icon = el.querySelector('span');
        if (icon) icon.style.color = 'var(--designlibre-accent, #0d99ff)';
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.style.background = 'transparent';
        const icon = el.querySelector('span');
        if (icon) icon.style.color = 'var(--designlibre-text-secondary, #888)';
      }
    });
  }

  /**
   * Select a result
   */
  private selectResult(result: SearchResult): void {
    this.close();

    switch (result.type) {
      case 'layer':
      case 'page':
        if (result.nodeId) {
          // Select the node
          const selectionManager = this.runtime.getSelectionManager();
          selectionManager.select([result.nodeId], 'replace');

          // Pan to the node (if viewport available)
          const viewport = (this.runtime as unknown as { getViewport?: () => { centerOn: (nodeId: NodeId) => void } }).getViewport?.();
          if (viewport?.centerOn) {
            viewport.centerOn(result.nodeId);
          }
        }
        break;

      case 'asset':
        // Switch to assets panel
        window.dispatchEvent(new CustomEvent('designlibre-panel-changed', {
          detail: { panel: 'assets' },
        }));
        break;

      case 'component':
        // Switch to components panel
        window.dispatchEvent(new CustomEvent('designlibre-panel-changed', {
          detail: { panel: 'components' },
        }));
        break;
    }
  }
}

// Singleton instance
let searchPanelInstance: SearchPanel | null = null;

/**
 * Get or create the search panel
 */
export function getSearchPanel(runtime: DesignLibreRuntime): SearchPanel {
  if (!searchPanelInstance) {
    searchPanelInstance = new SearchPanel(runtime);
  }
  return searchPanelInstance;
}

/**
 * Open the global search panel
 */
export function openSearchPanel(runtime: DesignLibreRuntime): void {
  getSearchPanel(runtime).open();
}

/**
 * Close the global search panel
 */
export function closeSearchPanel(): void {
  searchPanelInstance?.close();
}

/**
 * Toggle the global search panel
 */
export function toggleSearchPanel(runtime: DesignLibreRuntime): void {
  getSearchPanel(runtime).toggle();
}
