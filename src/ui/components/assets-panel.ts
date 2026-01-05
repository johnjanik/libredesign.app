/**
 * Assets Panel
 *
 * Panel for managing user-saved reusable compositions (assets).
 * Users can save selections to assets, organize by category, and drag to canvas.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type { SavedAsset, SerializedAssetNode, AssetCategory } from '@core/types/asset';
import { getAssetStorageService, type AssetStorageService } from '@persistence/asset-storage';

/**
 * SVG Icons
 */
const ICONS = {
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`,
  folder: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>`,
  grid: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>`,
  list: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>`,
  chevronRight: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="9 6 15 12 9 18"/>
  </svg>`,
  chevronDown: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,
};

/**
 * Assets panel options
 */
export interface AssetsPanelOptions {
  runtime: DesignLibreRuntime;
}

/**
 * Assets Panel Component
 */
export class AssetsPanel {
  private runtime: DesignLibreRuntime;
  private storage: AssetStorageService;
  private element: HTMLElement | null = null;
  private assetsContainer: HTMLElement | null = null;

  // State
  private assets: SavedAsset[] = [];
  private categories: AssetCategory[] = [];
  private searchQuery = '';
  private viewMode: 'grid' | 'list' = 'grid';
  private expandedCategories: Set<string> = new Set(['layouts', 'headers', 'cards', 'other']);
  private draggedAssetId: string | null = null;

  constructor(options: AssetsPanelOptions) {
    this.runtime = options.runtime;
    this.storage = getAssetStorageService();
  }

  /**
   * Create the panel element
   */
  createElement(): HTMLElement {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-assets-panel';
    this.element.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    `;

    // Load assets and render
    this.loadAssets();

    return this.element;
  }

  /**
   * Load assets from storage
   */
  private async loadAssets(): Promise<void> {
    try {
      this.categories = await this.storage.getCategories();
      this.assets = await this.storage.getAllAssets();
      this.render();
    } catch (error) {
      console.error('Failed to load assets:', error);
      this.render();
    }
  }

  /**
   * Render the panel
   */
  private render(): void {
    if (!this.element) return;
    this.element.innerHTML = '';

    // Header with save button
    this.element.appendChild(this.createHeader());

    // Search bar
    this.element.appendChild(this.createSearchBar());

    // Assets content
    this.assetsContainer = document.createElement('div');
    this.assetsContainer.className = 'assets-content';
    this.assetsContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    `;

    this.renderAssets();
    this.element.appendChild(this.assetsContainer);
  }

  /**
   * Create header with save button
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    // Title
    const title = document.createElement('span');
    title.textContent = 'Assets';
    title.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    header.appendChild(title);

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 4px;';

    // Save selection button
    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = ICONS.plus;
    saveBtn.title = 'Save selection to assets';
    saveBtn.style.cssText = this.getIconButtonStyles();
    saveBtn.addEventListener('click', () => this.saveSelectionAsAsset());
    this.addHoverEffect(saveBtn);
    actions.appendChild(saveBtn);

    // View mode toggle
    const viewBtn = document.createElement('button');
    viewBtn.innerHTML = this.viewMode === 'grid' ? ICONS.list : ICONS.grid;
    viewBtn.title = this.viewMode === 'grid' ? 'List view' : 'Grid view';
    viewBtn.style.cssText = this.getIconButtonStyles();
    viewBtn.addEventListener('click', () => {
      this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
      viewBtn.innerHTML = this.viewMode === 'grid' ? ICONS.list : ICONS.grid;
      viewBtn.title = this.viewMode === 'grid' ? 'List view' : 'Grid view';
      this.renderAssets();
    });
    this.addHoverEffect(viewBtn);
    actions.appendChild(viewBtn);

    header.appendChild(actions);
    return header;
  }

  /**
   * Create search bar
   */
  private createSearchBar(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'padding: 8px 12px; border-bottom: 1px solid var(--designlibre-border, #3d3d3d);';

    const searchWrapper = document.createElement('div');
    searchWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 4px;
      padding: 4px 8px;
    `;

    const iconSpan = document.createElement('span');
    iconSpan.innerHTML = ICONS.search;
    iconSpan.style.cssText = 'color: var(--designlibre-text-secondary, #888); display: flex;';
    searchWrapper.appendChild(iconSpan);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search assets...';
    input.value = this.searchQuery;
    input.style.cssText = `
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 12px;
    `;
    input.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.renderAssets();
    });
    searchWrapper.appendChild(input);

    container.appendChild(searchWrapper);
    return container;
  }

  /**
   * Render assets grouped by category
   */
  private renderAssets(): void {
    if (!this.assetsContainer) return;
    this.assetsContainer.innerHTML = '';

    // Filter assets
    let filteredAssets = this.assets;
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filteredAssets = this.assets.filter(asset =>
        asset.name.toLowerCase().includes(query) ||
        asset.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (filteredAssets.length === 0 && this.assets.length === 0) {
      // Empty state
      const empty = document.createElement('div');
      empty.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px 16px;
        text-align: center;
        color: var(--designlibre-text-secondary, #888);
      `;
      empty.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 12px;">📦</div>
        <div style="font-size: 13px; font-weight: 500; margin-bottom: 4px;">No saved assets</div>
        <div style="font-size: 11px; opacity: 0.7;">Select elements on canvas and click + to save as reusable assets</div>
      `;
      this.assetsContainer.appendChild(empty);
      return;
    }

    if (filteredAssets.length === 0) {
      // No results
      const noResults = document.createElement('div');
      noResults.style.cssText = `
        padding: 24px 16px;
        text-align: center;
        color: var(--designlibre-text-secondary, #888);
        font-size: 12px;
      `;
      noResults.textContent = 'No assets match your search';
      this.assetsContainer.appendChild(noResults);
      return;
    }

    // Group by category
    const byCategory = new Map<string, SavedAsset[]>();
    for (const asset of filteredAssets) {
      const cat = asset.category || 'other';
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(asset);
    }

    // Render each category
    for (const category of this.categories) {
      const categoryAssets = byCategory.get(category.id);
      if (!categoryAssets || categoryAssets.length === 0) continue;

      const section = this.createCategorySection(category, categoryAssets);
      this.assetsContainer.appendChild(section);
    }
  }

  /**
   * Create a category section
   */
  private createCategorySection(category: AssetCategory, assets: SavedAsset[]): HTMLElement {
    const section = document.createElement('div');
    section.className = 'asset-category';
    section.style.cssText = 'margin-bottom: 8px;';

    const isExpanded = this.expandedCategories.has(category.id);

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 8px;
      cursor: pointer;
      border-radius: 4px;
      user-select: none;
    `;
    header.addEventListener('mouseenter', () => {
      header.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    header.addEventListener('mouseleave', () => {
      header.style.backgroundColor = 'transparent';
    });
    header.addEventListener('click', () => {
      if (this.expandedCategories.has(category.id)) {
        this.expandedCategories.delete(category.id);
      } else {
        this.expandedCategories.add(category.id);
      }
      this.renderAssets();
    });

    // Chevron
    const chevron = document.createElement('span');
    chevron.innerHTML = isExpanded ? ICONS.chevronDown : ICONS.chevronRight;
    chevron.style.cssText = 'color: var(--designlibre-text-secondary, #888); display: flex;';
    header.appendChild(chevron);

    // Category name
    const name = document.createElement('span');
    name.textContent = category.name;
    name.style.cssText = `
      flex: 1;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--designlibre-text-secondary, #888);
    `;
    header.appendChild(name);

    // Count
    const count = document.createElement('span');
    count.textContent = String(assets.length);
    count.style.cssText = `
      font-size: 10px;
      color: var(--designlibre-text-secondary, #888);
      background: var(--designlibre-bg-tertiary, #161616);
      padding: 1px 5px;
      border-radius: 3px;
    `;
    header.appendChild(count);

    section.appendChild(header);

    // Content
    if (isExpanded) {
      const content = document.createElement('div');
      content.style.cssText = this.viewMode === 'grid'
        ? 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 8px;'
        : 'display: flex; flex-direction: column; gap: 4px; padding: 4px 8px;';

      for (const asset of assets) {
        content.appendChild(
          this.viewMode === 'grid'
            ? this.createAssetCardGrid(asset)
            : this.createAssetCardList(asset)
        );
      }

      section.appendChild(content);
    }

    return section;
  }

  /**
   * Create asset card (grid view)
   */
  private createAssetCardGrid(asset: SavedAsset): HTMLElement {
    const card = document.createElement('div');
    card.className = 'asset-card';
    card.draggable = true;
    card.style.cssText = `
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      overflow: hidden;
      cursor: grab;
      transition: transform 0.1s, box-shadow 0.1s;
    `;

    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.02)';
      card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'scale(1)';
      card.style.boxShadow = 'none';
    });

    // Drag handling
    card.addEventListener('dragstart', (e) => {
      this.draggedAssetId = asset.id;
      e.dataTransfer?.setData('application/designlibre-asset', asset.id);
      card.style.opacity = '0.5';
    });
    card.addEventListener('dragend', () => {
      this.draggedAssetId = null;
      card.style.opacity = '1';
    });

    // Thumbnail
    const thumb = document.createElement('div');
    thumb.style.cssText = `
      width: 100%;
      aspect-ratio: 1;
      background: var(--designlibre-bg-tertiary, #161616);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #888);
      font-size: 24px;
    `;
    if (asset.thumbnail) {
      thumb.style.backgroundImage = `url(${asset.thumbnail})`;
      thumb.style.backgroundSize = 'contain';
      thumb.style.backgroundPosition = 'center';
      thumb.style.backgroundRepeat = 'no-repeat';
    } else {
      thumb.innerHTML = ICONS.grid;
    }
    card.appendChild(thumb);

    // Info row
    const info = document.createElement('div');
    info.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
    `;

    const name = document.createElement('span');
    name.textContent = asset.name;
    name.title = asset.name;
    name.style.cssText = `
      font-size: 11px;
      color: var(--designlibre-text-primary, #e4e4e4);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    `;
    info.appendChild(name);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = ICONS.trash;
    deleteBtn.title = 'Delete asset';
    deleteBtn.style.cssText = `
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--designlibre-text-secondary, #888);
      padding: 2px;
      display: flex;
      opacity: 0;
      transition: opacity 0.15s;
    `;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteAsset(asset.id);
    });
    card.addEventListener('mouseenter', () => { deleteBtn.style.opacity = '1'; });
    card.addEventListener('mouseleave', () => { deleteBtn.style.opacity = '0'; });
    info.appendChild(deleteBtn);

    card.appendChild(info);

    // Double-click to insert
    card.addEventListener('dblclick', () => this.insertAsset(asset));

    return card;
  }

  /**
   * Create asset card (list view)
   */
  private createAssetCardList(asset: SavedAsset): HTMLElement {
    const card = document.createElement('div');
    card.className = 'asset-card-list';
    card.draggable = true;
    card.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 4px;
      cursor: grab;
    `;

    card.addEventListener('mouseenter', () => {
      card.style.backgroundColor = 'var(--designlibre-bg-tertiary, #161616)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });

    // Drag handling
    card.addEventListener('dragstart', (e) => {
      this.draggedAssetId = asset.id;
      e.dataTransfer?.setData('application/designlibre-asset', asset.id);
      card.style.opacity = '0.5';
    });
    card.addEventListener('dragend', () => {
      this.draggedAssetId = null;
      card.style.opacity = '1';
    });

    // Small thumbnail
    const thumb = document.createElement('div');
    thumb.style.cssText = `
      width: 32px;
      height: 32px;
      background: var(--designlibre-bg-tertiary, #161616);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;
    if (asset.thumbnail) {
      thumb.style.backgroundImage = `url(${asset.thumbnail})`;
      thumb.style.backgroundSize = 'contain';
      thumb.style.backgroundPosition = 'center';
      thumb.style.backgroundRepeat = 'no-repeat';
    } else {
      thumb.innerHTML = ICONS.grid;
      thumb.style.color = 'var(--designlibre-text-secondary, #888)';
    }
    card.appendChild(thumb);

    // Name
    const name = document.createElement('span');
    name.textContent = asset.name;
    name.title = asset.name;
    name.style.cssText = `
      flex: 1;
      font-size: 12px;
      color: var(--designlibre-text-primary, #e4e4e4);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    card.appendChild(name);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = ICONS.trash;
    deleteBtn.title = 'Delete asset';
    deleteBtn.style.cssText = `
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--designlibre-text-secondary, #888);
      padding: 4px;
      display: flex;
      opacity: 0;
      transition: opacity 0.15s;
    `;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteAsset(asset.id);
    });
    card.addEventListener('mouseenter', () => { deleteBtn.style.opacity = '1'; });
    card.addEventListener('mouseleave', () => { deleteBtn.style.opacity = '0'; });
    card.appendChild(deleteBtn);

    // Double-click to insert
    card.addEventListener('dblclick', () => this.insertAsset(asset));

    return card;
  }

  /**
   * Save current selection as an asset
   */
  private async saveSelectionAsAsset(): Promise<void> {
    const selectionManager = this.runtime.getSelectionManager();
    const selectedIds = selectionManager.getSelectedNodeIds();

    if (selectedIds.length === 0) {
      this.showToast('Select elements on canvas to save as asset');
      return;
    }

    // Prompt for name and category
    const result = await this.showSaveDialog();
    if (!result) return;

    const { name, category } = result;

    // Serialize selected nodes
    const nodeData = this.serializeNodes(selectedIds);
    if (!nodeData) {
      this.showToast('Failed to serialize selection');
      return;
    }

    // Generate thumbnail (placeholder for now)
    const thumbnail = await this.generateThumbnail(selectedIds);

    // Create asset
    const asset: SavedAsset = {
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      category,
      nodeData,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Only add thumbnail if present
    if (thumbnail) {
      asset.thumbnail = thumbnail;
    }

    try {
      await this.storage.saveAsset(asset);
      this.assets.unshift(asset);
      this.renderAssets();
      this.showToast(`Saved "${name}" to assets`);
    } catch (error) {
      console.error('Failed to save asset:', error);
      this.showToast('Failed to save asset');
    }
  }

  /**
   * Serialize selected nodes
   */
  private serializeNodes(nodeIds: readonly NodeId[]): SerializedAssetNode | null {
    if (nodeIds.length === 0) return null;

    // If single node, serialize it directly
    if (nodeIds.length === 1) {
      return this.serializeNode(nodeIds[0]!);
    }

    // Multiple nodes: wrap in a group
    const children: SerializedAssetNode[] = [];
    for (const nodeId of nodeIds) {
      const serialized = this.serializeNode(nodeId);
      if (serialized) {
        children.push(serialized);
      }
    }

    return {
      type: 'FRAME',
      name: 'Asset Group',
      properties: {
        width: 200,
        height: 200,
      },
      children,
    };
  }

  /**
   * Serialize a single node and its children
   */
  private serializeNode(nodeId: NodeId): SerializedAssetNode | null {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(nodeId);
    if (!node) return null;

    const childIds = sceneGraph.getChildIds(nodeId);
    const children: SerializedAssetNode[] = [];
    for (const childId of childIds) {
      const serialized = this.serializeNode(childId);
      if (serialized) {
        children.push(serialized);
      }
    }

    // Extract relevant properties (excluding parentId, children, etc.)
    const { id, parentId, depth, ...properties } = node as unknown as Record<string, unknown>;

    return {
      type: node.type,
      name: node.name,
      properties,
      children,
    };
  }

  /**
   * Generate thumbnail for nodes
   */
  private async generateThumbnail(_nodeIds: readonly NodeId[]): Promise<string | undefined> {
    // TODO: Implement actual canvas capture using _nodeIds
    // For now, return undefined (no thumbnail)
    return undefined;
  }

  /**
   * Show save dialog
   */
  private showSaveDialog(): Promise<{ name: string; category: string } | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: var(--designlibre-bg-primary, #1e1e1e);
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 8px;
        padding: 20px;
        width: 320px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      `;

      dialog.innerHTML = `
        <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: var(--designlibre-text-primary, #e4e4e4);">Save to Assets</h3>
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-size: 12px; color: var(--designlibre-text-secondary, #888);">Name</label>
          <input type="text" id="asset-name" placeholder="My Asset" style="
            width: 100%;
            box-sizing: border-box;
            padding: 8px;
            background: var(--designlibre-bg-secondary, #2d2d2d);
            border: 1px solid var(--designlibre-border, #3d3d3d);
            border-radius: 4px;
            color: var(--designlibre-text-primary, #e4e4e4);
            font-size: 13px;
          "/>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 4px; font-size: 12px; color: var(--designlibre-text-secondary, #888);">Category</label>
          <select id="asset-category" style="
            width: 100%;
            padding: 8px;
            background: var(--designlibre-bg-secondary, #2d2d2d);
            border: 1px solid var(--designlibre-border, #3d3d3d);
            border-radius: 4px;
            color: var(--designlibre-text-primary, #e4e4e4);
            font-size: 13px;
          ">
            ${this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="cancel-btn" style="
            padding: 8px 16px;
            background: transparent;
            border: 1px solid var(--designlibre-border, #3d3d3d);
            border-radius: 4px;
            color: var(--designlibre-text-primary, #e4e4e4);
            cursor: pointer;
            font-size: 13px;
          ">Cancel</button>
          <button id="save-btn" style="
            padding: 8px 16px;
            background: var(--designlibre-accent, #0d99ff);
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 13px;
          ">Save</button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const nameInput = dialog.querySelector('#asset-name') as HTMLInputElement;
      const categorySelect = dialog.querySelector('#asset-category') as HTMLSelectElement;
      const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLButtonElement;
      const saveBtn = dialog.querySelector('#save-btn') as HTMLButtonElement;

      nameInput.focus();

      const close = (result: { name: string; category: string } | null) => {
        overlay.remove();
        resolve(result);
      };

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });

      cancelBtn.addEventListener('click', () => close(null));

      saveBtn.addEventListener('click', () => {
        const name = nameInput.value.trim() || 'Untitled Asset';
        const category = categorySelect.value;
        close({ name, category });
      });

      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveBtn.click();
        } else if (e.key === 'Escape') {
          close(null);
        }
      });
    });
  }

  /**
   * Insert asset onto canvas
   */
  private async insertAsset(asset: SavedAsset): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const doc = sceneGraph.getDocument();
    if (!doc) return;

    // Find first frame or use document as parent
    const docChildren = sceneGraph.getChildIds(doc.id);
    let parentId: NodeId = doc.id;
    for (const childId of docChildren) {
      const child = sceneGraph.getNode(childId);
      if (child && (child.type === 'FRAME' || child.type === 'PAGE')) {
        parentId = childId;
        break;
      }
    }

    // Recursively create nodes from asset data
    const createdId = this.createNodesFromAsset(asset.nodeData, parentId);

    if (createdId) {
      // Select the created node
      const selectionManager = this.runtime.getSelectionManager();
      selectionManager.select([createdId], 'replace');
      this.showToast(`Inserted "${asset.name}"`);
    }
  }

  /**
   * Create nodes from serialized asset data
   */
  private createNodesFromAsset(data: SerializedAssetNode, parentId: NodeId): NodeId | null {
    const sceneGraph = this.runtime.getSceneGraph();

    const nodeId = sceneGraph.createNode(
      data.type as Parameters<typeof sceneGraph.createNode>[0],
      parentId,
      -1,
      { name: data.name, ...data.properties }
    );

    // Create children
    for (const childData of data.children) {
      this.createNodesFromAsset(childData, nodeId);
    }

    return nodeId;
  }

  /**
   * Delete an asset
   */
  private async deleteAsset(assetId: string): Promise<void> {
    const asset = this.assets.find(a => a.id === assetId);
    if (!asset) return;

    if (!confirm(`Delete "${asset.name}"?`)) return;

    try {
      await this.storage.deleteAsset(assetId);
      this.assets = this.assets.filter(a => a.id !== assetId);
      this.renderAssets();
      this.showToast('Asset deleted');
    } catch (error) {
      console.error('Failed to delete asset:', error);
      this.showToast('Failed to delete asset');
    }
  }

  /**
   * Get the dragged asset ID (for canvas drop handling)
   */
  getDraggedAssetId(): string | null {
    return this.draggedAssetId;
  }

  /**
   * Get asset by ID
   */
  async getAsset(id: string): Promise<SavedAsset | null> {
    return this.storage.getAsset(id);
  }

  /**
   * Show toast notification
   */
  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--designlibre-bg-primary, #1e1e1e);
      color: var(--designlibre-text-primary, #e4e4e4);
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 10001;
      animation: fadeInUp 0.2s ease;
    `;

    // Add animation keyframes if not present
    if (!document.querySelector('#toast-animation')) {
      const style = document.createElement('style');
      style.id = 'toast-animation';
      style.textContent = `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s';
      setTimeout(() => toast.remove(), 200);
    }, 2000);
  }

  /**
   * Get icon button styles
   */
  private getIconButtonStyles(): string {
    return `
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--designlibre-text-secondary, #888);
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s, color 0.15s;
    `;
  }

  /**
   * Add hover effect to button
   */
  private addHoverEffect(button: HTMLButtonElement): void {
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
      button.style.color = 'var(--designlibre-text-secondary, #888)';
    });
  }

  /**
   * Refresh assets from storage
   */
  async refresh(): Promise<void> {
    await this.loadAssets();
  }

  /**
   * Dispose of the panel
   */
  dispose(): void {
    this.element = null;
    this.assetsContainer = null;
  }
}
