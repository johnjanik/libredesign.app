/**
 * Left Sidebar
 *
 * Collapsible sidebar with file menu, leaves (pages), and layers.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import { downloadiOS26Template, downloadKotlinMaterial3Template } from '@templates/index';
import {
  downloadAndroidProject,
  downloadIOSProject,
  downloadTypeScriptProject,
} from '@persistence/export/project-export';

/**
 * Leaf (page) definition
 */
interface Leaf {
  id: string;
  name: string;
  nodeId?: NodeId;
}

/**
 * Left sidebar options
 */
export interface LeftSidebarOptions {
  /** Initial width */
  width?: number;
  /** Initially collapsed */
  collapsed?: boolean;
}

/**
 * SVG Icons
 */
const ICONS = {
  menu: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`,
  minimize: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
  </svg>`,
  expand: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
  </svg>`,
  dropdown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,
  leaf: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>`,
  frame: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>`,
  vector: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
  </svg>`,
  text: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
  </svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>`,
  eyeOff: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`,
  lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`,
};

/**
 * Left Sidebar
 */
export class LeftSidebar {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private options: Required<LeftSidebarOptions>;

  // State
  private collapsed = false;
  private documentName = 'Untitled';
  private activeTab: 'assets' | 'library' = 'assets';
  private leaves: Leaf[] = [{ id: 'leaf-1', name: 'Leaf 1' }];
  private activeLeafId = 'leaf-1';
  private leafCounter = 1;

  // Callbacks
  private onCollapseChange?: (collapsed: boolean) => void;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: LeftSidebarOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.options = {
      width: options.width ?? 240,
      collapsed: options.collapsed ?? false,
    };
    this.collapsed = this.options.collapsed;

    this.setup();
  }

  private setup(): void {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-left-sidebar';
    this.updateStyles();

    // Apply saved text scale setting
    this.applyTextScale();

    // Initialize leaves from scene graph pages
    this.syncLeavesFromSceneGraph();

    this.render();
    this.container.insertBefore(this.element, this.container.firstChild);

    // Listen for scene graph changes to update layers and leaves
    const sceneGraph = this.runtime.getSceneGraph();
    if (sceneGraph) {
      sceneGraph.on('node:created', () => {
        this.syncLeavesFromSceneGraph();
        this.renderLayersSection();
      });
      sceneGraph.on('node:deleted', () => {
        this.syncLeavesFromSceneGraph();
        this.renderLayersSection();
      });
      sceneGraph.on('node:propertyChanged', () => this.renderLayersSection());
    }

    // Listen for selection changes
    this.runtime.on('selection:changed', () => this.renderLayersSection());

    // Listen for rename command from keyboard manager
    this.runtime.on('command:rename', () => this.handleRenameCommand());
  }

  private handleRenameCommand(): void {
    const selectionManager = this.runtime.getSelectionManager();
    const selectedIds = selectionManager?.getSelectedNodeIds() ?? [];

    if (selectedIds.length !== 1) return;

    const selectedId = selectedIds[0]!;
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) return;

    const node = sceneGraph.getNode(selectedId);
    if (!node) return;

    // Check if selected node is a page (leaf) or a layer
    if (node.type === 'PAGE') {
      // Find the leaf item and trigger rename
      const leaf = this.leaves.find(l => l.nodeId === selectedId);
      if (leaf) {
        const leafItem = this.element?.querySelector(`.designlibre-leaves-list .designlibre-leaf-item:nth-child(${this.leaves.indexOf(leaf) + 1}) span:last-of-type`) as HTMLElement;
        if (leafItem) {
          this.renameLeaf(leaf, leafItem);
        }
      }
    } else {
      // It's a layer - find the layer item and trigger rename
      const layerItem = this.element?.querySelector(`.designlibre-layers-list .designlibre-layer-item[data-node-id="${selectedId}"] span:nth-child(2)`) as HTMLElement;
      if (layerItem) {
        this.renameLayer(selectedId, node.name, layerItem);
      } else {
        // Fallback: re-render with rename active
        this.triggerLayerRename(selectedId, node.name);
      }
    }
  }

  private triggerLayerRename(nodeId: NodeId, currentName: string): void {
    // Find the layer item in the DOM
    const layersList = this.element?.querySelector('.designlibre-layers-list');
    if (!layersList) return;

    const items = layersList.querySelectorAll('.designlibre-layer-item');
    for (const item of items) {
      const nameSpan = item.querySelector('span:nth-child(2)') as HTMLElement;
      if (nameSpan && nameSpan.textContent === currentName) {
        this.renameLayer(nodeId, currentName, nameSpan);
        return;
      }
    }
  }

  /**
   * Sync leaves with actual PAGE nodes from scene graph.
   */
  private syncLeavesFromSceneGraph(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) return;

    const doc = sceneGraph.getDocument();
    if (!doc) return;

    const pageIds = sceneGraph.getChildIds(doc.id);
    this.leaves = pageIds.map((pageId, index) => {
      const page = sceneGraph.getNode(pageId);
      return {
        id: `leaf-${pageId}`,
        name: page?.name ?? `Leaf ${index + 1}`,
        nodeId: pageId,
      };
    });

    // Ensure at least one leaf exists
    if (this.leaves.length === 0) {
      this.leaves = [{ id: 'leaf-1', name: 'Leaf 1' }];
    }

    // Sync active leaf with runtime's current page
    const currentPageId = this.runtime.getCurrentPageId();
    const currentLeaf = this.leaves.find(l => l.nodeId === currentPageId);
    if (currentLeaf) {
      this.activeLeafId = currentLeaf.id;
    } else if (!this.leaves.find(l => l.id === this.activeLeafId)) {
      // Set active leaf to first if current is not in list
      this.activeLeafId = this.leaves[0]!.id;
    }

    this.leafCounter = this.leaves.length;
  }

  private updateStyles(): void {
    if (!this.element) return;

    this.element.style.cssText = `
      width: ${this.collapsed ? '48px' : `${this.options.width}px`};
      height: 100%;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border-right: 1px solid var(--designlibre-border, #3d3d3d);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: width 0.2s ease;
      flex-shrink: 0;
    `;
  }

  private render(): void {
    if (!this.element) return;

    this.element.innerHTML = '';

    if (this.collapsed) {
      this.renderCollapsedState();
    } else {
      this.renderExpandedState();
    }
  }

  private renderCollapsedState(): void {
    if (!this.element) return;

    // Just show expand button
    const expandBtn = document.createElement('button');
    expandBtn.className = 'designlibre-sidebar-expand-btn';
    expandBtn.innerHTML = ICONS.expand;
    expandBtn.title = 'Expand sidebar';
    expandBtn.style.cssText = `
      width: 100%;
      height: 48px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;
    expandBtn.addEventListener('click', () => this.toggleCollapse());
    expandBtn.addEventListener('mouseenter', () => {
      expandBtn.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    expandBtn.addEventListener('mouseleave', () => {
      expandBtn.style.backgroundColor = 'transparent';
    });

    this.element.appendChild(expandBtn);
  }

  private renderExpandedState(): void {
    if (!this.element) return;

    // Header with menu and minimize
    this.element.appendChild(this.createHeader());

    // File name section
    this.element.appendChild(this.createFileNameSection());

    // Tabs (Assets, Library) + Search
    this.element.appendChild(this.createTabsSection());

    // Tab content depends on active tab
    if (this.activeTab === 'assets') {
      // Assets tab: show leaves and layers
      this.element.appendChild(this.createLeavesSection());

      // Separator
      const separator = document.createElement('div');
      separator.style.cssText = `
        height: 1px;
        background: var(--designlibre-border, #3d3d3d);
        margin: 0;
      `;
      this.element.appendChild(separator);

      // Layers section
      const layersSection = this.createLayersSection();
      this.element.appendChild(layersSection);
    } else {
      // Library tab: show templates
      this.element.appendChild(this.createLibrarySection());
    }
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'designlibre-sidebar-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 48px;
      padding: 0 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    // File Menu button
    const menuBtn = document.createElement('button');
    menuBtn.className = 'designlibre-sidebar-menu-btn';
    menuBtn.innerHTML = ICONS.menu;
    menuBtn.title = 'File Menu';
    menuBtn.style.cssText = this.getIconButtonStyles();
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.showFileMenu(menuBtn);
    });
    this.addHoverEffect(menuBtn);

    // Minimize button
    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'designlibre-sidebar-minimize-btn';
    minimizeBtn.innerHTML = ICONS.minimize;
    minimizeBtn.title = 'Minimize sidebar';
    minimizeBtn.style.cssText = this.getIconButtonStyles();
    minimizeBtn.addEventListener('click', () => this.toggleCollapse());
    this.addHoverEffect(minimizeBtn);

    header.appendChild(menuBtn);
    header.appendChild(minimizeBtn);

    return header;
  }

  private createFileNameSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'designlibre-sidebar-filename';
    section.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    // Editable filename input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.documentName;
    input.className = 'designlibre-filename-input';
    input.style.cssText = `
      flex: 1;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 6px 8px;
      font-size: var(--designlibre-sidebar-font-size-lg, 14px);
      font-weight: 500;
      color: var(--designlibre-text-primary, #e4e4e4);
      outline: none;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--designlibre-accent, #4dabff)';
      input.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'transparent';
      input.style.backgroundColor = 'transparent';
      this.documentName = input.value || 'Untitled';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });

    // Dropdown button for file options
    const dropdownBtn = document.createElement('button');
    dropdownBtn.className = 'designlibre-filename-dropdown';
    dropdownBtn.innerHTML = ICONS.dropdown;
    dropdownBtn.title = 'File options';
    dropdownBtn.style.cssText = `
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #a0a0a0);
      border-radius: 4px;
    `;
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.showFileOptionsMenu(dropdownBtn);
    });
    this.addHoverEffect(dropdownBtn);

    section.appendChild(input);
    section.appendChild(dropdownBtn);

    return section;
  }

  private createTabsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'designlibre-sidebar-tabs-section';
    section.style.cssText = `
      padding: 8px 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    // Tabs row
    const tabsRow = document.createElement('div');
    tabsRow.style.cssText = `
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    `;

    const tabs = [
      { id: 'assets', label: 'Assets' },
      { id: 'library', label: 'Library' },
    ] as const;

    for (const tab of tabs) {
      const tabBtn = document.createElement('button');
      tabBtn.className = 'designlibre-sidebar-tab';
      tabBtn.textContent = tab.label;
      tabBtn.style.cssText = `
        flex: 1;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        background: ${this.activeTab === tab.id ? 'var(--designlibre-bg-secondary, #2d2d2d)' : 'transparent'};
        color: ${this.activeTab === tab.id ? 'var(--designlibre-text-primary, #e4e4e4)' : 'var(--designlibre-text-secondary, #a0a0a0)'};
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s;
      `;
      tabBtn.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.render();
      });
      tabBtn.addEventListener('mouseenter', () => {
        if (this.activeTab !== tab.id) {
          tabBtn.style.backgroundColor = 'var(--designlibre-bg-tertiary, #252525)';
        }
      });
      tabBtn.addEventListener('mouseleave', () => {
        if (this.activeTab !== tab.id) {
          tabBtn.style.backgroundColor = 'transparent';
        }
      });

      tabsRow.appendChild(tabBtn);
    }

    section.appendChild(tabsRow);

    // Search input
    const searchWrapper = document.createElement('div');
    searchWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      padding: 0 8px;
    `;

    const searchIcon = document.createElement('span');
    searchIcon.innerHTML = ICONS.search;
    searchIcon.style.cssText = `
      display: flex;
      color: var(--designlibre-text-muted, #6a6a6a);
    `;

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search project...';
    searchInput.style.cssText = `
      flex: 1;
      background: transparent;
      border: none;
      padding: 8px 0;
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      color: var(--designlibre-text-primary, #e4e4e4);
      outline: none;
    `;

    searchWrapper.appendChild(searchIcon);
    searchWrapper.appendChild(searchInput);
    section.appendChild(searchWrapper);

    return section;
  }

  private createLeavesSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'designlibre-sidebar-leaves';
    section.style.cssText = `
      padding: 8px 0;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    // Header with "Leaves" and + button
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 12px;
      margin-bottom: 4px;
    `;

    const label = document.createElement('span');
    label.textContent = 'Leaves';
    label.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      font-weight: 600;
      text-transform: uppercase;
      color: var(--designlibre-text-secondary, #a0a0a0);
      letter-spacing: 0.5px;
    `;

    const addBtn = document.createElement('button');
    addBtn.innerHTML = ICONS.plus;
    addBtn.title = 'Add new leaf';
    addBtn.style.cssText = `
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #a0a0a0);
      border-radius: 4px;
    `;
    addBtn.addEventListener('click', () => this.addLeaf());
    this.addHoverEffect(addBtn);

    header.appendChild(label);
    header.appendChild(addBtn);
    section.appendChild(header);

    // Leaves list
    const list = document.createElement('div');
    list.className = 'designlibre-leaves-list';

    for (const leaf of this.leaves) {
      const item = this.createLeafItem(leaf);
      list.appendChild(item);
    }

    section.appendChild(list);

    return section;
  }

  private createLeafItem(leaf: Leaf): HTMLElement {
    const item = document.createElement('div');
    item.className = 'designlibre-leaf-item';
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      cursor: pointer;
      background: ${leaf.id === this.activeLeafId ? 'var(--designlibre-accent-light, #1a3a5c)' : 'transparent'};
      color: ${leaf.id === this.activeLeafId ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-text-primary, #e4e4e4)'};
      transition: background 0.15s;
    `;

    const icon = document.createElement('span');
    icon.innerHTML = ICONS.leaf;
    icon.style.cssText = `display: flex; opacity: 0.6;`;

    const name = document.createElement('span');
    name.textContent = leaf.name;
    name.style.cssText = `
      flex: 1;
      font-size: var(--designlibre-sidebar-font-size, 13px);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    item.appendChild(icon);
    item.appendChild(name);

    // Double-click to rename (must be registered before click to work properly)
    item.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.renameLeaf(leaf, name);
    });

    item.addEventListener('click', () => {
      // Only re-render if switching to a different leaf
      if (this.activeLeafId !== leaf.id) {
        this.activeLeafId = leaf.id;
        // Switch to this page in the runtime and select it to show properties
        if (leaf.nodeId) {
          this.runtime.setCurrentPage(leaf.nodeId);
          // Select the page node so inspector shows page properties
          const selectionManager = this.runtime.getSelectionManager();
          if (selectionManager) {
            selectionManager.select([leaf.nodeId], 'replace');
          }
        }
        this.render();
      } else if (leaf.nodeId) {
        // If clicking the active leaf, just ensure it's selected
        const selectionManager = this.runtime.getSelectionManager();
        if (selectionManager) {
          selectionManager.select([leaf.nodeId], 'replace');
        }
      }
    });

    item.addEventListener('mouseenter', () => {
      if (leaf.id !== this.activeLeafId) {
        item.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    item.addEventListener('mouseleave', () => {
      if (leaf.id !== this.activeLeafId) {
        item.style.backgroundColor = 'transparent';
      }
    });

    return item;
  }

  private createLibrarySection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'designlibre-sidebar-library';
    section.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
    `;

    const label = document.createElement('span');
    label.textContent = 'Templates';
    label.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      font-weight: 600;
      text-transform: uppercase;
      color: var(--designlibre-text-secondary, #a0a0a0);
      letter-spacing: 0.5px;
    `;
    header.appendChild(label);
    section.appendChild(header);

    // Templates list
    const list = document.createElement('div');
    list.className = 'designlibre-library-list';
    list.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 0 8px;
    `;

    // iOS 26 Template
    const iOSTemplate = this.createTemplateItem(
      'iOS 26 Liquid Glass',
      'Complete iOS 26 design system with Liquid Glass components',
      'iOS/iPadOS',
      async () => {
        await downloadiOS26Template();
      }
    );
    list.appendChild(iOSTemplate);

    // Kotlin Material Design 3 Template
    const kotlinTemplate = this.createTemplateItem(
      'Kotlin Material Design 3',
      'Complete Material 3 system with Compose components, typography, and colors',
      'Android',
      async () => {
        await downloadKotlinMaterial3Template();
      }
    );
    list.appendChild(kotlinTemplate);

    // Placeholder for more templates
    const moreTemplates = document.createElement('div');
    moreTemplates.style.cssText = `
      padding: 16px 8px;
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      color: var(--designlibre-text-muted, #6a6a6a);
      text-align: center;
    `;
    moreTemplates.innerHTML = `
      <div style="margin-bottom: 8px;">More templates coming soon</div>
      <div style="font-size: 11px; opacity: 0.7;">Drag templates to Assets to use them in your project</div>
    `;
    list.appendChild(moreTemplates);

    section.appendChild(list);

    return section;
  }

  private createTemplateItem(
    name: string,
    description: string,
    platform: string,
    onDownload: () => Promise<void>
  ): HTMLElement {
    const item = document.createElement('div');
    item.className = 'designlibre-template-item';
    item.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px;
      margin-bottom: 8px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    `;

    // Platform badge
    const badge = document.createElement('span');
    badge.textContent = platform;
    badge.style.cssText = `
      font-size: 10px;
      font-weight: 600;
      color: var(--designlibre-accent, #4dabff);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    item.appendChild(badge);

    // Name
    const nameEl = document.createElement('span');
    nameEl.textContent = name;
    nameEl.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-lg, 14px);
      font-weight: 500;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    item.appendChild(nameEl);

    // Description
    const descEl = document.createElement('span');
    descEl.textContent = description;
    descEl.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      color: var(--designlibre-text-secondary, #a0a0a0);
      line-height: 1.4;
    `;
    item.appendChild(descEl);

    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download .preserve';
    downloadBtn.style.cssText = `
      margin-top: 8px;
      padding: 6px 12px;
      background: var(--designlibre-accent, #4dabff);
      border: none;
      border-radius: 4px;
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      font-weight: 500;
      color: white;
      cursor: pointer;
      transition: background 0.15s;
    `;
    downloadBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      downloadBtn.textContent = 'Downloading...';
      downloadBtn.style.opacity = '0.7';
      try {
        await onDownload();
        downloadBtn.textContent = 'Downloaded!';
        setTimeout(() => {
          downloadBtn.textContent = 'Download .preserve';
          downloadBtn.style.opacity = '1';
        }, 2000);
      } catch (error) {
        downloadBtn.textContent = 'Error - Try Again';
        downloadBtn.style.opacity = '1';
        console.error('Template download failed:', error);
      }
    });
    downloadBtn.addEventListener('mouseenter', () => {
      downloadBtn.style.background = 'var(--designlibre-accent-hover, #6bbaff)';
    });
    downloadBtn.addEventListener('mouseleave', () => {
      downloadBtn.style.background = 'var(--designlibre-accent, #4dabff)';
    });
    item.appendChild(downloadBtn);

    // Hover effect
    item.addEventListener('mouseenter', () => {
      item.style.background = 'var(--designlibre-bg-tertiary, #252525)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });

    return item;
  }

  private createLayersSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'designlibre-sidebar-layers';
    section.id = 'designlibre-layers-section';
    section.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    // Header with "Layers"
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
    `;

    const label = document.createElement('span');
    label.textContent = 'Layers';
    label.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      font-weight: 600;
      text-transform: uppercase;
      color: var(--designlibre-text-secondary, #a0a0a0);
      letter-spacing: 0.5px;
    `;

    header.appendChild(label);
    section.appendChild(header);

    // Layers list
    const list = document.createElement('div');
    list.className = 'designlibre-layers-list';
    list.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 0 4px;
    `;

    // Get layers from scene graph for the current page
    const sceneGraph = this.runtime.getSceneGraph();
    const selectionManager = this.runtime.getSelectionManager();
    const selectedIds = selectionManager?.getSelectedNodeIds() ?? [];

    if (sceneGraph) {
      // Get current page ID from runtime
      const currentPageId = this.runtime.getCurrentPageId();
      if (currentPageId) {
        const childIds = sceneGraph.getChildIds(currentPageId);

        for (const childId of childIds) {
          const node = sceneGraph.getNode(childId);
          if (node) {
            const layerItem = this.createLayerItem(node, selectedIds.includes(childId), 0);
            list.appendChild(layerItem);
          }
        }
      }
    }

    if (list.children.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `
        padding: 16px 12px;
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        color: var(--designlibre-text-muted, #6a6a6a);
        text-align: center;
      `;
      empty.textContent = 'No layers yet. Use the toolbar to add shapes.';
      list.appendChild(empty);
    }

    section.appendChild(list);

    return section;
  }

  private createLayerItem(
    node: { id: NodeId; name: string; type: string; visible?: boolean },
    isSelected: boolean,
    depth: number
  ): HTMLElement {
    const item = document.createElement('div');
    item.className = 'designlibre-layer-item';
    item.dataset['nodeId'] = node.id;
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      padding-left: ${8 + depth * 16}px;
      cursor: pointer;
      border-radius: 4px;
      background: ${isSelected ? 'var(--designlibre-accent-light, #1a3a5c)' : 'transparent'};
      color: ${isSelected ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-text-primary, #e4e4e4)'};
      transition: background 0.15s;
    `;

    // Icon based on type
    const icon = document.createElement('span');
    icon.style.cssText = `display: flex; opacity: 0.6;`;
    switch (node.type) {
      case 'FRAME':
        icon.innerHTML = ICONS.frame;
        break;
      case 'VECTOR':
        icon.innerHTML = ICONS.vector;
        break;
      case 'TEXT':
        icon.innerHTML = ICONS.text;
        break;
      default:
        icon.innerHTML = ICONS.frame;
    }

    // Name
    const name = document.createElement('span');
    name.textContent = node.name;
    name.style.cssText = `
      flex: 1;
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    // Visibility toggle
    const visibilityBtn = document.createElement('button');
    visibilityBtn.innerHTML = node.visible !== false ? ICONS.eye : ICONS.eyeOff;
    visibilityBtn.title = node.visible !== false ? 'Hide layer' : 'Show layer';
    visibilityBtn.style.cssText = `
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-muted, #6a6a6a);
      border-radius: 2px;
      opacity: 0;
      transition: opacity 0.15s;
    `;

    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(visibilityBtn);

    // Show visibility button on hover
    item.addEventListener('mouseenter', () => {
      visibilityBtn.style.opacity = '1';
      if (!isSelected) {
        item.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    item.addEventListener('mouseleave', () => {
      visibilityBtn.style.opacity = '0';
      if (!isSelected) {
        item.style.backgroundColor = 'transparent';
      }
    });

    // Select on click
    item.addEventListener('click', () => {
      const selectionManager = this.runtime.getSelectionManager();
      if (selectionManager) {
        selectionManager.select([node.id]);
      }
    });

    // Double-click to rename
    item.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.renameLayer(node.id, node.name, name);
    });

    return item;
  }

  private renameLayer(nodeId: NodeId, currentName: string, nameElement: HTMLElement): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.style.cssText = `
      flex: 1;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-accent, #4dabff);
      border-radius: 2px;
      padding: 2px 4px;
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      color: var(--designlibre-text-primary, #e4e4e4);
      outline: none;
    `;

    const finishRename = (): void => {
      const newName = input.value || currentName;

      // Update the scene graph node name
      const sceneGraph = this.runtime.getSceneGraph();
      if (sceneGraph) {
        sceneGraph.updateNode(nodeId, { name: newName });
      }

      this.renderLayersSection();
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        finishRename();
      } else if (e.key === 'Escape') {
        this.renderLayersSection();
      }
    });

    // Prevent click from bubbling up and selecting
    input.addEventListener('click', (e) => e.stopPropagation());

    nameElement.replaceWith(input);
    input.focus();
    input.select();
  }

  private renderLayersSection(): void {
    const section = this.element?.querySelector('#designlibre-layers-section');
    if (section) {
      const newSection = this.createLayersSection();
      section.replaceWith(newSection);
    }
  }

  private getIconButtonStyles(): string {
    return `
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #a0a0a0);
      border-radius: 6px;
    `;
  }

  private addHoverEffect(button: HTMLButtonElement): void {
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
      button.style.color = 'var(--designlibre-text-secondary, #a0a0a0)';
    });
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.updateStyles();
    this.render();
    this.onCollapseChange?.(this.collapsed);
  }

  private addLeaf(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) return;

    const doc = sceneGraph.getDocument();
    if (!doc) return;

    this.leafCounter++;
    const pageName = `Leaf ${this.leafCounter}`;

    // Create a new page in the scene graph
    const pageId = sceneGraph.createNode('PAGE', doc.id, -1, { name: pageName });

    // Sync leaves from scene graph and switch to new page
    this.syncLeavesFromSceneGraph();

    const newLeaf = this.leaves.find(l => l.nodeId === pageId);
    if (newLeaf) {
      this.activeLeafId = newLeaf.id;
      this.runtime.setCurrentPage(pageId);
      // Select the new page so inspector shows page properties
      const selectionManager = this.runtime.getSelectionManager();
      if (selectionManager) {
        selectionManager.select([pageId], 'replace');
      }
    }

    this.render();
  }

  private renameLeaf(leaf: Leaf, nameElement: HTMLElement): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = leaf.name;
    input.style.cssText = `
      flex: 1;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-accent, #4dabff);
      border-radius: 2px;
      padding: 2px 4px;
      font-size: var(--designlibre-sidebar-font-size, 13px);
      color: var(--designlibre-text-primary, #e4e4e4);
      outline: none;
    `;

    const finishRename = (): void => {
      const newName = input.value || leaf.name;
      leaf.name = newName;

      // Update the scene graph node name
      if (leaf.nodeId) {
        const sceneGraph = this.runtime.getSceneGraph();
        if (sceneGraph) {
          sceneGraph.updateNode(leaf.nodeId, { name: newName });
        }
      }

      this.render();
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        finishRename();
      } else if (e.key === 'Escape') {
        this.render();
      }
    });

    nameElement.replaceWith(input);
    input.focus();
    input.select();
  }

  private showFileMenu(anchor: HTMLElement): void {
    // Remove existing menu if present
    const existingMenu = document.getElementById('designlibre-file-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'designlibre-file-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.bottom + 4}px;
      min-width: 220px;
      background: #1e1e1e;
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      padding: 4px;
      color: #e4e4e4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: var(--designlibre-sidebar-font-size, 13px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      z-index: 999999;
    `;

    const menuItems = [
      { label: 'New File', shortcut: 'Ctrl+N', action: () => this.createNewFile() },
      { label: 'Open .preserve...', shortcut: 'Ctrl+O', action: () => this.openPreserveFile() },
      { separator: true },
      { label: 'Save', shortcut: 'Ctrl+S', action: () => this.runtime.saveDocument() },
      { label: 'Save as .preserve...', shortcut: 'Ctrl+Shift+S', action: () => this.saveAsPreserve() },
      { separator: true },
      { label: 'Templates', submenu: true, action: () => this.showTemplatesMenu(anchor) },
      { separator: true },
      { label: 'Export Project...', submenu: true, action: () => this.showExportMenu(anchor) },
      { separator: true },
      { label: 'Settings', action: () => this.showSettingsMenu(anchor) },
    ];

    for (const item of menuItems) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.style.cssText = 'height: 1px; background: #3d3d3d; margin: 4px 0;';
        menu.appendChild(sep);
      } else {
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
        `;

        const label = document.createElement('span');
        label.textContent = item.label ?? '';
        menuItem.appendChild(label);

        if (item.shortcut) {
          const shortcut = document.createElement('span');
          shortcut.textContent = item.shortcut;
          shortcut.style.cssText = 'font-size: 11px; color: #6a6a6a;';
          menuItem.appendChild(shortcut);
        }

        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = '#2d2d2d';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = 'transparent';
        });
        menuItem.addEventListener('click', () => {
          menu.remove();
          item.action?.();
        });

        menu.appendChild(menuItem);
      }
    }

    document.body.appendChild(menu);

    // Close when clicking outside
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('mousedown', closeMenu);
      }
    };
    // Delay adding the listener to avoid immediate close
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', closeMenu);
    });
  }

  /**
   * Show templates submenu.
   */
  private showTemplatesMenu(anchor: HTMLElement): void {
    // Remove existing menu if present
    const existingMenu = document.getElementById('designlibre-templates-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'designlibre-templates-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${rect.right + 4}px;
      top: ${rect.top}px;
      min-width: 260px;
      background: #1e1e1e;
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      padding: 4px;
      color: #e4e4e4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: var(--designlibre-sidebar-font-size, 13px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      z-index: 999999;
    `;

    const templateItems = [
      {
        label: 'iOS 26 Liquid Glass',
        description: 'Complete iOS 26 design system',
        action: async () => {
          menu.remove();
          await downloadiOS26Template();
        },
      },
      {
        label: 'Kotlin Material Design 3',
        description: 'Complete Material 3 system for Android',
        action: async () => {
          menu.remove();
          await downloadKotlinMaterial3Template();
        },
      },
    ];

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding: 8px 12px; font-size: 11px; font-weight: 600; color: #6a6a6a; text-transform: uppercase;';
    header.textContent = 'Download Template';
    menu.appendChild(header);

    for (const item of templateItems) {
      const menuItem = document.createElement('div');
      menuItem.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 10px 12px;
        border-radius: 4px;
        cursor: pointer;
      `;

      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.fontWeight = '500';
      menuItem.appendChild(label);

      if (item.description) {
        const desc = document.createElement('span');
        desc.textContent = item.description;
        desc.style.cssText = 'font-size: 11px; color: #6a6a6a;';
        menuItem.appendChild(desc);
      }

      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = '#2d2d2d';
      });
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'transparent';
      });
      menuItem.addEventListener('click', () => {
        item.action();
      });

      menu.appendChild(menuItem);
    }

    document.body.appendChild(menu);

    // Close when clicking outside
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('mousedown', closeMenu);
      }
    };
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', closeMenu);
    });
  }

  /**
   * Show export project menu.
   */
  private showExportMenu(anchor: HTMLElement): void {
    // Remove existing menu if present
    const existingMenu = document.getElementById('designlibre-export-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'designlibre-export-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${rect.right + 4}px;
      top: ${rect.top}px;
      min-width: 280px;
      background: #1e1e1e;
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      padding: 4px;
      color: #e4e4e4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: var(--designlibre-sidebar-font-size, 13px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      z-index: 999999;
    `;

    const exportItems = [
      {
        label: 'Export Android Project',
        description: 'Gradle + Kotlin/Compose (.zip)',
        action: () => this.exportAndroid(),
      },
      {
        label: 'Export iOS Project',
        description: 'Xcode + SwiftUI (.zip)',
        action: () => this.exportIOS(),
      },
      {
        label: 'Export TypeScript Project',
        description: 'React + Vite (.zip)',
        action: () => this.exportTypeScript(),
      },
    ];

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding: 8px 12px; font-size: 11px; font-weight: 600; color: #6a6a6a; text-transform: uppercase;';
    header.textContent = 'Export as Project';
    menu.appendChild(header);

    for (const item of exportItems) {
      const menuItem = document.createElement('div');
      menuItem.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 10px 12px;
        border-radius: 4px;
        cursor: pointer;
      `;

      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.fontWeight = '500';
      menuItem.appendChild(label);

      if (item.description) {
        const desc = document.createElement('span');
        desc.textContent = item.description;
        desc.style.cssText = 'font-size: 11px; color: #6a6a6a;';
        menuItem.appendChild(desc);
      }

      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = '#2d2d2d';
      });
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'transparent';
      });
      menuItem.addEventListener('click', () => {
        menu.remove();
        item.action();
      });

      menu.appendChild(menuItem);
    }

    document.body.appendChild(menu);

    // Close when clicking outside
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('mousedown', closeMenu);
      }
    };
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', closeMenu);
    });
  }

  /**
   * Export to Android project.
   */
  private async exportAndroid(): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) return;

    // Get all top-level nodes from the current page
    const currentPageId = this.runtime.getCurrentPageId();
    if (!currentPageId) return;

    const nodeIds = sceneGraph.getChildIds(currentPageId);
    if (nodeIds.length === 0) {
      alert('No nodes to export. Add some elements to the canvas first.');
      return;
    }

    const projectName = this.documentName.replace(/[^a-zA-Z0-9]/g, '') || 'DesignLibreProject';
    const packageName = `com.designlibre.${projectName.toLowerCase()}`;

    try {
      await downloadAndroidProject(sceneGraph, nodeIds, {
        projectName,
        packageName,
        useCompose: true,
        includeTests: true,
      });
    } catch (error) {
      console.error('Failed to export Android project:', error);
      alert('Failed to export Android project. Check console for details.');
    }
  }

  /**
   * Export to iOS project.
   */
  private async exportIOS(): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) return;

    // Get all top-level nodes from the current page
    const currentPageId = this.runtime.getCurrentPageId();
    if (!currentPageId) return;

    const nodeIds = sceneGraph.getChildIds(currentPageId);
    if (nodeIds.length === 0) {
      alert('No nodes to export. Add some elements to the canvas first.');
      return;
    }

    const projectName = this.documentName.replace(/[^a-zA-Z0-9]/g, '') || 'DesignLibreProject';
    const bundleId = `com.designlibre.${projectName.toLowerCase()}`;

    try {
      await downloadIOSProject(sceneGraph, nodeIds, {
        projectName,
        bundleId,
      });
    } catch (error) {
      console.error('Failed to export iOS project:', error);
      alert('Failed to export iOS project. Check console for details.');
    }
  }

  /**
   * Export to TypeScript/React project.
   */
  private async exportTypeScript(): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) return;

    // Get all top-level nodes from the current page
    const currentPageId = this.runtime.getCurrentPageId();
    if (!currentPageId) return;

    const nodeIds = sceneGraph.getChildIds(currentPageId);
    if (nodeIds.length === 0) {
      alert('No nodes to export. Add some elements to the canvas first.');
      return;
    }

    const projectName = this.documentName.replace(/[^a-zA-Z0-9]/g, '') || 'DesignLibreProject';

    try {
      await downloadTypeScriptProject(sceneGraph, nodeIds, {
        projectName,
        useVite: true,
        includeCss: true,
      });
    } catch (error) {
      console.error('Failed to export TypeScript project:', error);
      alert('Failed to export TypeScript project. Check console for details.');
    }
  }

  /**
   * Show settings menu.
   */
  private showSettingsMenu(anchor: HTMLElement): void {
    // Remove existing menu if present
    const existingMenu = document.getElementById('designlibre-settings-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'designlibre-settings-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.bottom + 4}px;
      min-width: 280px;
      background: #1e1e1e;
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      padding: 8px;
      color: #e4e4e4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: var(--designlibre-sidebar-font-size, 13px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      z-index: 999999;
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = 'Settings';
    title.style.cssText = 'font-weight: 600; padding: 4px 8px 12px; border-bottom: 1px solid #3d3d3d; margin-bottom: 8px;';
    menu.appendChild(title);

    // Syntax Highlighting toggle
    const syntaxHighlightSetting = this.createToggleSetting(
      'Syntax Highlighting',
      'Color code in Code view by language',
      this.getSyntaxHighlightingSetting(),
      (enabled) => this.setSyntaxHighlightingSetting(enabled)
    );
    menu.appendChild(syntaxHighlightSetting);

    // Text Scale slider
    const textScaleSetting = this.createSliderSetting(
      'Text Scale',
      'Adjust text size in sidebars',
      this.getTextScaleSetting(),
      0.8,  // min
      1.4,  // max
      0.05, // step
      (value) => `${Math.round(value * 100)}%`,
      (scale) => this.setTextScaleSetting(scale)
    );
    menu.appendChild(textScaleSetting);

    document.body.appendChild(menu);

    // Close when clicking outside
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('mousedown', closeMenu);
      }
    };
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', closeMenu);
    });
  }

  /**
   * Create a toggle setting row.
   */
  private createToggleSetting(
    label: string,
    description: string,
    initialValue: boolean,
    onChange: (enabled: boolean) => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8px;
      border-radius: 4px;
    `;

    const textContainer = document.createElement('div');
    textContainer.style.cssText = 'flex: 1; margin-right: 12px;';

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-weight: 500; margin-bottom: 2px;';
    textContainer.appendChild(labelEl);

    const descEl = document.createElement('div');
    descEl.textContent = description;
    descEl.style.cssText = 'font-size: 11px; color: #888;';
    textContainer.appendChild(descEl);

    row.appendChild(textContainer);

    // Toggle switch
    const toggle = document.createElement('button');
    toggle.style.cssText = `
      width: 40px;
      height: 22px;
      border-radius: 11px;
      border: none;
      cursor: pointer;
      position: relative;
      transition: background-color 0.2s;
      background: ${initialValue ? '#4dabff' : '#444'};
    `;

    const knob = document.createElement('div');
    knob.style.cssText = `
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      position: absolute;
      top: 2px;
      transition: left 0.2s;
      left: ${initialValue ? '20px' : '2px'};
    `;
    toggle.appendChild(knob);

    let enabled = initialValue;
    toggle.addEventListener('click', () => {
      enabled = !enabled;
      toggle.style.background = enabled ? '#4dabff' : '#444';
      knob.style.left = enabled ? '20px' : '2px';
      onChange(enabled);
    });

    row.appendChild(toggle);
    return row;
  }

  /**
   * Create a slider setting row.
   */
  private createSliderSetting(
    label: string,
    description: string,
    initialValue: number,
    min: number,
    max: number,
    step: number,
    formatValue: (value: number) => string,
    onChange: (value: number) => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      padding: 8px;
      border-radius: 4px;
    `;

    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';

    const textContainer = document.createElement('div');

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-weight: 500; margin-bottom: 2px;';
    textContainer.appendChild(labelEl);

    const descEl = document.createElement('div');
    descEl.textContent = description;
    descEl.style.cssText = 'font-size: 11px; color: #888;';
    textContainer.appendChild(descEl);

    headerRow.appendChild(textContainer);

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = formatValue(initialValue);
    valueDisplay.style.cssText = 'font-size: 12px; color: #4dabff; font-weight: 500; min-width: 40px; text-align: right;';
    headerRow.appendChild(valueDisplay);

    row.appendChild(headerRow);

    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(initialValue);
    slider.style.cssText = `
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: #444;
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    `;

    // Style the slider thumb via CSS
    const styleId = 'designlibre-slider-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #4dabff;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #4dabff;
          cursor: pointer;
          border: none;
        }
      `;
      document.head.appendChild(style);
    }

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      valueDisplay.textContent = formatValue(value);
      onChange(value);
    });

    row.appendChild(slider);
    return row;
  }

  /**
   * Get syntax highlighting setting from localStorage.
   */
  private getSyntaxHighlightingSetting(): boolean {
    const stored = localStorage.getItem('designlibre-syntax-highlighting');
    return stored === null ? true : stored === 'true';
  }

  /**
   * Set syntax highlighting setting and dispatch event.
   */
  private setSyntaxHighlightingSetting(enabled: boolean): void {
    localStorage.setItem('designlibre-syntax-highlighting', String(enabled));
    // Dispatch custom event for CodeView to listen to
    window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
      detail: { syntaxHighlighting: enabled }
    }));
  }

  /**
   * Get text scale setting from localStorage.
   */
  private getTextScaleSetting(): number {
    const stored = localStorage.getItem('designlibre-text-scale');
    return stored === null ? 1 : parseFloat(stored);
  }

  /**
   * Set text scale setting and apply to document.
   */
  private setTextScaleSetting(scale: number): void {
    localStorage.setItem('designlibre-text-scale', String(scale));
    // Apply to CSS custom property
    document.documentElement.style.setProperty('--designlibre-text-scale', String(scale));
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
      detail: { textScale: scale }
    }));
  }

  /**
   * Apply saved text scale on initialization.
   */
  private applyTextScale(): void {
    const scale = this.getTextScaleSetting();
    document.documentElement.style.setProperty('--designlibre-text-scale', String(scale));
  }

  /**
   * Create a new empty document.
   */
  private createNewFile(): void {
    // Clear selection first
    const selectionManager = this.runtime.getSelectionManager();
    if (selectionManager) {
      selectionManager.clear();
    }

    // Create new document (this clears the scene graph and creates fresh doc + page)
    this.runtime.createDocument('Untitled');

    // Update document name
    this.documentName = 'Untitled';

    // Sync leaves from the new scene graph
    this.syncLeavesFromSceneGraph();

    // Re-render the sidebar
    this.render();
  }

  /**
   * Save the current document as a .preserve file.
   */
  private async saveAsPreserve(): Promise<void> {
    try {
      const filename = `${this.documentName.replace(/[^a-zA-Z0-9-_ ]/g, '')}.preserve`;
      await this.runtime.saveAsPreserve(filename);
    } catch (error) {
      console.error('Failed to save .preserve file:', error);
      // Could show an error notification here
    }
  }

  /**
   * Open a .preserve file.
   */
  private openPreserveFile(): void {
    // Create a hidden file input to trigger file selection
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.preserve';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        await this.runtime.loadPreserve(file);
        // Update document name from filename
        this.documentName = file.name.replace('.preserve', '');
        // Sync leaves and re-render
        this.syncLeavesFromSceneGraph();
        this.render();
      } catch (error) {
        console.error('Failed to open .preserve file:', error);
        // Could show an error notification here
      }

      // Clean up
      fileInput.remove();
    });

    document.body.appendChild(fileInput);
    fileInput.click();
  }

  private showFileOptionsMenu(anchor: HTMLElement): void {
    // Remove existing menu if present
    const existingMenu = document.getElementById('designlibre-file-options-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'designlibre-file-options-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.bottom + 4}px;
      min-width: 180px;
      background: #1e1e1e;
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      padding: 4px;
      color: #e4e4e4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: var(--designlibre-sidebar-font-size, 13px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      z-index: 999999;
    `;

    const menuItems = [
      { label: 'Rename', action: () => {} },
      { label: 'Duplicate', action: () => {} },
      { separator: true },
      { label: 'Move to...', action: () => {} },
      { label: 'Share...', action: () => {} },
      { separator: true },
      { label: 'Version History', action: () => {} },
    ];

    for (const item of menuItems) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.style.cssText = 'height: 1px; background: #3d3d3d; margin: 4px 0;';
        menu.appendChild(sep);
      } else {
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
        `;
        menuItem.textContent = item.label ?? '';

        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = '#2d2d2d';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = 'transparent';
        });
        menuItem.addEventListener('click', () => {
          menu.remove();
          item.action?.();
        });

        menu.appendChild(menuItem);
      }
    }

    document.body.appendChild(menu);

    // Close when clicking outside
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('mousedown', closeMenu);
      }
    };
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', closeMenu);
    });
  }

  /**
   * Set collapse change callback.
   */
  setOnCollapseChange(callback: (collapsed: boolean) => void): void {
    this.onCollapseChange = callback;
  }

  /**
   * Check if sidebar is collapsed.
   */
  isCollapsed(): boolean {
    return this.collapsed;
  }

  /**
   * Set document name.
   */
  setDocumentName(name: string): void {
    this.documentName = name;
    this.render();
  }

  /**
   * Dispose of the sidebar.
   */
  dispose(): void {
    if (this.element) {
      this.container.removeChild(this.element);
    }
  }
}

/**
 * Create a left sidebar.
 */
export function createLeftSidebar(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: LeftSidebarOptions
): LeftSidebar {
  return new LeftSidebar(runtime, container, options);
}
