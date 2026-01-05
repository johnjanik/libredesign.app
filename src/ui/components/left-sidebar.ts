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
import {
  SwiftUIImporter,
  ComposeImporter,
  type XcodeProjectImportOptions,
  type AndroidProjectImportOptions,
} from '@persistence/import';
import { ComponentLibraryPanel } from './component-library-panel';
import { HistoryPanel } from './history-panel';
import { AssetsPanel } from './assets-panel';

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
  chevronRight: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="9 6 15 12 9 18"/>
  </svg>`,
  chevronDown: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
  unlock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
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
  component: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5 12,2"/>
    <line x1="12" y1="22" x2="12" y2="15.5"/><line x1="22" y1="8.5" x2="12" y2="15.5"/>
    <line x1="2" y1="8.5" x2="12" y2="15.5"/>
  </svg>`,
  image: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
  </svg>`,
};

/**
 * Type badge configuration
 */
const TYPE_BADGES: Record<string, { label: string; color: string; tooltip: string }> = {
  FRAME_NONE: { label: 'F', color: '#666', tooltip: 'Frame' },
  FRAME_HORIZONTAL: { label: 'H', color: '#0d99ff', tooltip: 'Horizontal auto-layout' },
  FRAME_VERTICAL: { label: 'V', color: '#a855f7', tooltip: 'Vertical auto-layout' },
  GROUP: { label: 'G', color: '#f97316', tooltip: 'Group' },
  COMPONENT: { label: 'C', color: '#22c55e', tooltip: 'Component' },
  INSTANCE: { label: 'I', color: '#22c55e', tooltip: 'Component instance' },
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
  private activeTab: 'layers' | 'assets' | 'library' | 'components' | 'history' = 'layers';
  private leaves: Leaf[] = [{ id: 'leaf-1', name: 'Leaf 1' }];
  private activeLeafId = 'leaf-1';
  private leafCounter = 1;
  private expandedNodeIds: Set<string> = new Set();

  // Drag-and-drop state
  private draggedNodeId: NodeId | null = null;
  private dropPosition: 'before' | 'after' | 'inside' | null = null;

  // Component library panel (lazy-initialized)
  private componentLibraryPanel: ComponentLibraryPanel | null = null;

  // History panel (lazy-initialized)
  private historyPanel: HistoryPanel | null = null;

  // Assets panel (lazy-initialized)
  private assetsPanel: AssetsPanel | null = null;

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

    // Listen for panel changes from nav rail
    window.addEventListener('designlibre-panel-changed', ((e: CustomEvent) => {
      const panel = e.detail.panel as typeof this.activeTab;
      if (['layers', 'assets', 'library', 'components', 'history'].includes(panel)) {
        this.activeTab = panel;
        this.render();
      }
    }) as EventListener);

    // When embedded, sync collapsed state with side panel toggle
    if (this.options.width === 0) {
      window.addEventListener('designlibre-side-panel-toggle', ((e: CustomEvent) => {
        const sidePanelCollapsed = e.detail.collapsed as boolean;
        // When side panel expands and we were collapsed, expand too
        if (!sidePanelCollapsed && this.collapsed) {
          this.collapsed = false;
          this.updateStyles();
          this.render();
        }
      }) as EventListener);
    }
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

    // width: 0 means "fill parent container" (for embedding in side panel)
    const widthStyle = this.collapsed
      ? '48px'
      : this.options.width === 0
        ? '100%'
        : `${this.options.width}px`;

    // When embedded (width: 0), fill parent and allow flex grow
    const isEmbedded = this.options.width === 0;

    this.element.style.cssText = `
      width: ${widthStyle};
      height: 100%;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border-right: ${isEmbedded ? 'none' : '1px solid var(--designlibre-border, #3d3d3d)'};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: width 0.2s ease;
      flex: ${isEmbedded ? '1' : '0 0 auto'};
      min-height: 0;
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

    // Content depends on active panel (controlled by nav rail)
    if (this.activeTab === 'library') {
      // Library panel: show templates
      this.element.appendChild(this.createLibrarySection());
    } else if (this.activeTab === 'components') {
      // Components panel: library of draggable UI components
      this.element.appendChild(this.createComponentsSection());
    } else if (this.activeTab === 'history') {
      // History panel: version history with undo/redo
      this.element.appendChild(this.createHistorySection());
    } else if (this.activeTab === 'assets') {
      // Assets panel: saved reusable compositions
      this.element.appendChild(this.createAssetsSection());
    } else {
      // Layers panel: show leaves and layers
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
    }
  }

  private createComponentsSection(): HTMLElement {
    // Lazy-initialize the component library panel
    if (!this.componentLibraryPanel) {
      this.componentLibraryPanel = new ComponentLibraryPanel({
        runtime: this.runtime,
      });
    }
    return this.componentLibraryPanel.createElement();
  }

  private createHistorySection(): HTMLElement {
    // Lazy-initialize the history panel
    if (!this.historyPanel) {
      this.historyPanel = new HistoryPanel(this.runtime);
    }
    return this.historyPanel.create();
  }

  private createAssetsSection(): HTMLElement {
    // Lazy-initialize the assets panel
    if (!this.assetsPanel) {
      this.assetsPanel = new AssetsPanel({
        runtime: this.runtime,
      });
    }
    return this.assetsPanel.createElement();
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

    // Get visibility from the PAGE node if available
    let isVisible = true;
    if (leaf.nodeId) {
      const sceneGraph = this.runtime.getSceneGraph();
      if (sceneGraph) {
        const pageNode = sceneGraph.getNode(leaf.nodeId);
        if (pageNode) {
          isVisible = pageNode.visible !== false;
        }
      }
    }

    // Visibility toggle button
    const visibilityBtn = document.createElement('button');
    visibilityBtn.innerHTML = isVisible ? ICONS.eye : ICONS.eyeOff;
    visibilityBtn.title = isVisible ? 'Hide leaf' : 'Show leaf';
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
      flex-shrink: 0;
    `;

    // Toggle visibility on click
    visibilityBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent leaf selection
      if (leaf.nodeId) {
        const sceneGraph = this.runtime.getSceneGraph();
        if (sceneGraph) {
          const pageNode = sceneGraph.getNode(leaf.nodeId);
          if (pageNode) {
            const newVisible = pageNode.visible === false;
            sceneGraph.updateNode(leaf.nodeId, { visible: newVisible });
            visibilityBtn.innerHTML = newVisible ? ICONS.eye : ICONS.eyeOff;
            visibilityBtn.title = newVisible ? 'Hide leaf' : 'Show leaf';
          }
        }
      }
    });

    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(visibilityBtn);

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
      visibilityBtn.style.opacity = '1';
      if (leaf.id !== this.activeLeafId) {
        item.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    item.addEventListener('mouseleave', () => {
      visibilityBtn.style.opacity = '0';
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
    downloadBtn.textContent = 'Download .seed';
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
          downloadBtn.textContent = 'Download .seed';
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
        // Recursively render all layers
        this.renderLayerChildren(list, currentPageId, selectedIds, sceneGraph, 0);
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

  private renderLayerChildren(
    container: HTMLElement,
    parentId: NodeId,
    selectedIds: NodeId[],
    sceneGraph: ReturnType<DesignLibreRuntime['getSceneGraph']>,
    depth: number
  ): void {
    if (!sceneGraph) return;

    const childIds = sceneGraph.getChildIds(parentId);
    for (const childId of childIds) {
      const node = sceneGraph.getNode(childId);
      if (node) {
        const nodeChildIds = sceneGraph.getChildIds(childId);
        const hasChildren = nodeChildIds.length > 0;
        const isExpanded = this.expandedNodeIds.has(childId);

        const layerItem = this.createLayerItem(
          node,
          selectedIds.includes(childId),
          depth,
          hasChildren,
          isExpanded
        );
        container.appendChild(layerItem);

        // Recursively render children if expanded
        if (hasChildren && isExpanded) {
          this.renderLayerChildren(container, childId, selectedIds, sceneGraph, depth + 1);
        }
      }
    }
  }

  private createLayerItem(
    node: { id: NodeId; name: string; type: string; visible?: boolean; locked?: boolean },
    isSelected: boolean,
    depth: number,
    hasChildren: boolean = false,
    isExpanded: boolean = false
  ): HTMLElement {
    const item = document.createElement('div');
    item.className = 'designlibre-layer-item';
    item.dataset['nodeId'] = node.id;
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      padding-left: ${8 + depth * 16}px;
      cursor: pointer;
      border-radius: 4px;
      background: ${isSelected ? 'var(--designlibre-accent-light, #1a3a5c)' : 'transparent'};
      color: ${isSelected ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-text-primary, #e4e4e4)'};
      transition: background 0.15s;
    `;

    // Expand/collapse button for nodes with children
    const expandBtn = document.createElement('button');
    if (hasChildren) {
      expandBtn.innerHTML = isExpanded ? ICONS.chevronDown : ICONS.chevronRight;
      expandBtn.title = isExpanded ? 'Collapse' : 'Expand';
      expandBtn.style.cssText = `
        width: 16px;
        height: 16px;
        border: none;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--designlibre-text-muted, #6a6a6a);
        border-radius: 2px;
        padding: 0;
        flex-shrink: 0;
      `;
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.expandedNodeIds.has(node.id)) {
          this.expandedNodeIds.delete(node.id);
        } else {
          this.expandedNodeIds.add(node.id);
        }
        this.renderLayersSection();
      });
    } else {
      // Spacer for alignment
      expandBtn.style.cssText = `
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      `;
    }

    // Icon based on type
    const icon = document.createElement('span');
    icon.style.cssText = `display: flex; opacity: 0.6; flex-shrink: 0;`;
    switch (node.type) {
      case 'FRAME':
        icon.innerHTML = ICONS.frame;
        break;
      case 'RECTANGLE':
        icon.innerHTML = ICONS.rectangle;
        break;
      case 'ELLIPSE':
        icon.innerHTML = ICONS.ellipse;
        break;
      case 'GROUP':
        icon.innerHTML = ICONS.group;
        break;
      case 'COMPONENT':
      case 'INSTANCE':
        icon.innerHTML = ICONS.component;
        break;
      case 'IMAGE':
        icon.innerHTML = ICONS.image;
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

    // Type badge (F/H/V/G/C/I)
    const badgeKey = this.getLayerBadgeKey(node);
    let badge: HTMLElement | null = null;
    if (badgeKey && TYPE_BADGES[badgeKey]) {
      const badgeInfo = TYPE_BADGES[badgeKey];
      badge = document.createElement('span');
      badge.textContent = badgeInfo.label;
      badge.title = badgeInfo.tooltip;
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 14px;
        height: 14px;
        padding: 0 3px;
        font-size: 9px;
        font-weight: 600;
        color: white;
        background: ${badgeInfo.color};
        border-radius: 3px;
        flex-shrink: 0;
      `;
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

    // Action buttons container
    const actionsContainer = document.createElement('div');
    actionsContainer.style.cssText = `
      display: flex;
      gap: 2px;
      flex-shrink: 0;
    `;

    // Determine if layer has active state (hidden or locked)
    const isHidden = node.visible === false;
    const isLocked = node.locked === true;
    const hasActiveState = isHidden || isLocked;

    // Visibility toggle
    const visibilityBtn = document.createElement('button');
    visibilityBtn.innerHTML = !isHidden ? ICONS.eye : ICONS.eyeOff;
    visibilityBtn.title = !isHidden ? 'Hide layer' : 'Show layer';
    visibilityBtn.style.cssText = `
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${isHidden ? 'var(--designlibre-warning, #f59e0b)' : 'var(--designlibre-text-muted, #6a6a6a)'};
      border-radius: 2px;
      opacity: ${hasActiveState ? '1' : '0'};
      transition: opacity 0.15s;
      flex-shrink: 0;
    `;

    // Toggle visibility on click
    visibilityBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sceneGraph = this.runtime.getSceneGraph();
      if (sceneGraph) {
        const newVisible = node.visible === false;
        sceneGraph.updateNode(node.id, { visible: newVisible });
      }
    });

    // Lock toggle
    const lockBtn = document.createElement('button');
    lockBtn.innerHTML = isLocked ? ICONS.lock : ICONS.unlock;
    lockBtn.title = isLocked ? 'Unlock layer' : 'Lock layer';
    lockBtn.style.cssText = `
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${isLocked ? 'var(--designlibre-error, #ef4444)' : 'var(--designlibre-text-muted, #6a6a6a)'};
      border-radius: 2px;
      opacity: ${hasActiveState ? '1' : '0'};
      transition: opacity 0.15s;
      flex-shrink: 0;
    `;

    // Toggle lock on click
    lockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sceneGraph = this.runtime.getSceneGraph();
      if (sceneGraph) {
        const newLocked = !node.locked;
        sceneGraph.updateNode(node.id, { locked: newLocked });
      }
    });

    actionsContainer.appendChild(visibilityBtn);
    actionsContainer.appendChild(lockBtn);

    item.appendChild(expandBtn);
    item.appendChild(icon);
    if (badge) {
      item.appendChild(badge);
    }
    item.appendChild(name);
    item.appendChild(actionsContainer);

    // Show action buttons on hover, keep visible if layer has active state
    item.addEventListener('mouseenter', () => {
      visibilityBtn.style.opacity = '1';
      lockBtn.style.opacity = '1';
      if (!isSelected) {
        item.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    item.addEventListener('mouseleave', () => {
      if (!hasActiveState) {
        visibilityBtn.style.opacity = '0';
        lockBtn.style.opacity = '0';
      }
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

    // Drag-and-drop
    item.setAttribute('draggable', 'true');

    item.addEventListener('dragstart', (e) => {
      this.draggedNodeId = node.id;
      e.dataTransfer?.setData('text/plain', node.id);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
      }
      item.style.opacity = '0.5';
    });

    item.addEventListener('dragend', () => {
      this.draggedNodeId = null;
      this.dropPosition = null;
      item.style.opacity = '1';
      // Clear all visual feedback
      const allItems = this.element?.querySelectorAll('.designlibre-layer-item');
      allItems?.forEach((el) => {
        (el as HTMLElement).style.borderTop = '';
        (el as HTMLElement).style.borderBottom = '';
        (el as HTMLElement).style.outline = '';
      });
      this.renderLayersSection();
    });

    item.addEventListener('dragover', (e) => {
      if (!this.draggedNodeId || this.draggedNodeId === node.id) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';

      // Determine drop position based on mouse Y
      const rect = item.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;

      // Clear previous styles
      item.style.borderTop = '';
      item.style.borderBottom = '';
      item.style.outline = '';

      if (y < height * 0.25) {
        this.dropPosition = 'before';
        item.style.borderTop = '2px solid var(--designlibre-accent, #4dabff)';
      } else if (y > height * 0.75) {
        this.dropPosition = 'after';
        item.style.borderBottom = '2px solid var(--designlibre-accent, #4dabff)';
      } else {
        // Only allow 'inside' for container types
        if (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'COMPONENT') {
          this.dropPosition = 'inside';
          item.style.outline = '2px solid var(--designlibre-accent, #4dabff)';
        } else {
          this.dropPosition = 'after';
          item.style.borderBottom = '2px solid var(--designlibre-accent, #4dabff)';
        }
      }
    });

    item.addEventListener('dragleave', () => {
      item.style.borderTop = '';
      item.style.borderBottom = '';
      item.style.outline = '';
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!this.draggedNodeId || !this.dropPosition) return;

      const sceneGraph = this.runtime.getSceneGraph();
      if (!sceneGraph) return;

      const draggedNode = sceneGraph.getNode(this.draggedNodeId);
      const targetNode = sceneGraph.getNode(node.id);
      if (!draggedNode || !targetNode) return;

      // Prevent dropping into descendants
      if (this.isDescendantOf(this.draggedNodeId, node.id, sceneGraph)) return;

      try {
        if (this.dropPosition === 'inside') {
          // Move into the target
          sceneGraph.moveNode(this.draggedNodeId, node.id, 0);
          this.expandedNodeIds.add(node.id);
        } else {
          // Move before or after
          const targetParentId = targetNode.parentId;
          if (targetParentId) {
            const parent = sceneGraph.getNode(targetParentId);
            const children = (parent as { children?: NodeId[] })?.children ?? [];
            const targetIndex = children.indexOf(node.id);

            if (targetIndex >= 0) {
              if (draggedNode.parentId === targetParentId) {
                // Same parent - reorder
                const draggedIndex = children.indexOf(this.draggedNodeId);
                let newPosition = this.dropPosition === 'after' ? targetIndex + 1 : targetIndex;
                if (draggedIndex < newPosition) newPosition--;
                sceneGraph.reorderNode(this.draggedNodeId, newPosition);
              } else {
                // Different parent - move
                const newPosition = this.dropPosition === 'after' ? targetIndex + 1 : targetIndex;
                sceneGraph.moveNode(this.draggedNodeId, targetParentId, newPosition);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to move layer:', error);
      }
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

  /**
   * Get the badge key for a layer based on its type and auto-layout mode
   */
  private getLayerBadgeKey(node: { type: string; autoLayout?: { mode?: string } }): string | null {
    switch (node.type) {
      case 'FRAME':
        if (node.autoLayout?.mode === 'HORIZONTAL') return 'FRAME_HORIZONTAL';
        if (node.autoLayout?.mode === 'VERTICAL') return 'FRAME_VERTICAL';
        return 'FRAME_NONE';
      case 'GROUP':
        return 'GROUP';
      case 'COMPONENT':
        if (node.autoLayout?.mode === 'HORIZONTAL') return 'FRAME_HORIZONTAL';
        if (node.autoLayout?.mode === 'VERTICAL') return 'FRAME_VERTICAL';
        return 'COMPONENT';
      case 'INSTANCE':
        return 'INSTANCE';
      default:
        return null;
    }
  }

  /**
   * Check if potentialAncestor is an ancestor of nodeId
   */
  private isDescendantOf(potentialAncestorId: NodeId, nodeId: NodeId, sceneGraph: ReturnType<DesignLibreRuntime['getSceneGraph']>): boolean {
    if (!sceneGraph) return false;
    if (potentialAncestorId === nodeId) return true;

    let current = sceneGraph.getNode(nodeId);
    while (current && current.parentId) {
      if (current.parentId === potentialAncestorId) return true;
      current = sceneGraph.getNode(current.parentId);
    }
    return false;
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

    // When embedded in side panel, dispatch event so side panel can hide/show
    if (this.options.width === 0) {
      window.dispatchEvent(
        new CustomEvent('designlibre-sidebar-toggle', {
          detail: { open: !this.collapsed },
        })
      );
    }
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
      { label: 'Open .seed...', shortcut: 'Ctrl+O', action: () => this.openSeedFile() },
      { separator: true },
      { label: 'Save', shortcut: 'Ctrl+S', action: () => this.runtime.saveDocument() },
      { label: 'Save as .seed...', shortcut: 'Ctrl+Shift+S', action: () => this.saveAsSeed() },
      { separator: true },
      { label: 'Templates', submenu: true, action: () => this.showTemplatesMenu(anchor) },
      { separator: true },
      { label: 'Import Project...', submenu: true, action: () => this.showImportMenu(anchor) },
      { label: 'Export Project...', submenu: true, action: () => this.showExportMenu(anchor) },
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
   * Show import project menu.
   */
  private showImportMenu(anchor: HTMLElement): void {
    // Remove existing menu if present
    const existingMenu = document.getElementById('designlibre-import-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'designlibre-import-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${rect.right + 4}px;
      top: ${rect.top}px;
      min-width: 300px;
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

    const importItems = [
      {
        label: 'Import Xcode Project',
        description: 'SwiftUI views from .xcodeproj folder',
        icon: this.createAppleIcon(),
        action: () => this.importXcodeProject(),
      },
      {
        label: 'Import Android Project',
        description: 'Jetpack Compose from Gradle project',
        icon: this.createAndroidIcon(),
        action: () => this.importAndroidProject(),
      },
    ];

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding: 8px 12px; font-size: 11px; font-weight: 600; color: #6a6a6a; text-transform: uppercase;';
    header.textContent = 'Import from Project';
    menu.appendChild(header);

    // Info text
    const infoText = document.createElement('div');
    infoText.style.cssText = 'padding: 4px 12px 8px; font-size: 11px; color: #888; line-height: 1.4;';
    infoText.textContent = 'Import UI elements from mobile projects. Designers can edit visual properties while code logic stays read-only.';
    menu.appendChild(infoText);

    for (const item of importItems) {
      const menuItem = document.createElement('div');
      menuItem.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 4px;
        cursor: pointer;
      `;

      // Icon container
      const iconContainer = document.createElement('div');
      iconContainer.style.cssText = 'flex-shrink: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;';
      iconContainer.innerHTML = item.icon;
      menuItem.appendChild(iconContainer);

      // Text container
      const textContainer = document.createElement('div');
      textContainer.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';

      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.fontWeight = '500';
      textContainer.appendChild(label);

      const desc = document.createElement('span');
      desc.textContent = item.description;
      desc.style.cssText = 'font-size: 11px; color: #6a6a6a;';
      textContainer.appendChild(desc);

      menuItem.appendChild(textContainer);

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

    // Separator
    const sep = document.createElement('div');
    sep.style.cssText = 'height: 1px; background: #3d3d3d; margin: 8px 0;';
    menu.appendChild(sep);

    // Feature note
    const note = document.createElement('div');
    note.style.cssText = 'padding: 8px 12px; font-size: 10px; color: #666; line-height: 1.4;';
    note.innerHTML = '<strong>Live Sync:</strong> Changes sync bidirectionally. Code-controlled properties (state, bindings) are locked.';
    menu.appendChild(note);

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
   * Create Apple logo icon.
   */
  private createAppleIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>`;
  }

  /**
   * Create Android robot icon.
   */
  private createAndroidIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
    </svg>`;
  }

  /**
   * Import Xcode (SwiftUI) project.
   */
  private async importXcodeProject(): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) {
      alert('Scene graph not available');
      return;
    }

    // Check if File System Access API is supported
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support the File System Access API. Please use Chrome, Edge, or a compatible browser.');
      return;
    }

    try {
      // Show directory picker
      const directoryHandle = await (window as unknown as { showDirectoryPicker(options?: { mode?: string }): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
        mode: 'read',
      });

      // Show import options dialog
      const options = await this.showImportOptionsDialog('xcode', directoryHandle.name);
      if (!options) return; // User cancelled

      // Create importer
      const importer = new SwiftUIImporter(sceneGraph);

      // Show progress
      const progressDialog = this.showImportProgressDialog('Xcode');

      try {
        const result = await importer.importXcodeProject(directoryHandle, options as XcodeProjectImportOptions);

        progressDialog.remove();

        // Show results
        const message = `Import complete!\n\n` +
          `• Files imported: ${result.files.length}\n` +
          `• Total nodes created: ${result.totalNodeCount}\n` +
          `• Asset colors found: ${result.assetColors.size}\n` +
          (result.warnings.length > 0 ? `\nWarnings:\n${result.warnings.slice(0, 5).join('\n')}` : '');

        alert(message);
      } catch (importError) {
        progressDialog.remove();
        throw importError;
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled the picker
        return;
      }
      console.error('Failed to import Xcode project:', error);
      alert(`Failed to import Xcode project: ${(error as Error).message}`);
    }
  }

  /**
   * Import Android (Compose) project.
   */
  private async importAndroidProject(): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) {
      alert('Scene graph not available');
      return;
    }

    // Check if File System Access API is supported
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support the File System Access API. Please use Chrome, Edge, or a compatible browser.');
      return;
    }

    try {
      // Show directory picker
      const directoryHandle = await (window as unknown as { showDirectoryPicker(options?: { mode?: string }): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
        mode: 'read',
      });

      // Show import options dialog
      const options = await this.showImportOptionsDialog('android', directoryHandle.name);
      if (!options) return; // User cancelled

      // Create importer
      const importer = new ComposeImporter(sceneGraph);

      // Show progress
      const progressDialog = this.showImportProgressDialog('Android');

      try {
        const result = await importer.importAndroidProject(directoryHandle, options as AndroidProjectImportOptions);

        progressDialog.remove();

        // Show results
        const message = `Import complete!\n\n` +
          `• Files imported: ${result.files.length}\n` +
          `• Total nodes created: ${result.totalNodeCount}\n` +
          `• Theme colors found: ${result.themeColors.size}\n` +
          (result.warnings.length > 0 ? `\nWarnings:\n${result.warnings.slice(0, 5).join('\n')}` : '');

        alert(message);
      } catch (importError) {
        progressDialog.remove();
        throw importError;
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled the picker
        return;
      }
      console.error('Failed to import Android project:', error);
      alert(`Failed to import Android project: ${(error as Error).message}`);
    }
  }

  /**
   * Show import options dialog.
   */
  private showImportOptionsDialog(
    projectType: 'xcode' | 'android',
    projectName: string
  ): Promise<XcodeProjectImportOptions | AndroidProjectImportOptions | null> {
    return new Promise((resolve) => {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.id = 'import-options-dialog-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000000;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: #1e1e1e;
        border: 1px solid #3d3d3d;
        border-radius: 8px;
        padding: 24px;
        min-width: 400px;
        max-width: 500px;
        color: #e4e4e4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
      `;

      // Title
      const title = document.createElement('h2');
      title.style.cssText = 'margin: 0 0 8px 0; font-size: 18px; font-weight: 600;';
      title.textContent = projectType === 'xcode' ? 'Import Xcode Project' : 'Import Android Project';
      dialog.appendChild(title);

      // Project name
      const projectInfo = document.createElement('div');
      projectInfo.style.cssText = 'margin-bottom: 20px; color: #888;';
      projectInfo.textContent = `Project: ${projectName}`;
      dialog.appendChild(projectInfo);

      // Options container
      const optionsContainer = document.createElement('div');
      optionsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;';

      // Scale option
      const scaleRow = this.createOptionRow('Scale Factor', 'Number multiplier for sizes', 'number', '1');
      optionsContainer.appendChild(scaleRow.container);

      // Expand loops option
      const expandLoopsRow = this.createOptionRow('Expand Loops', 'Show multiple instances for ForEach/LazyColumn', 'checkbox', 'true');
      optionsContainer.appendChild(expandLoopsRow.container);

      // Loop count option
      const loopCountRow = this.createOptionRow('Loop Expansion Count', 'Number of items to show for loops', 'number', '3');
      optionsContainer.appendChild(loopCountRow.container);

      // Include conditionals option
      const conditionalsRow = this.createOptionRow('Include Conditionals', 'Show both branches of if/else', 'checkbox', 'false');
      optionsContainer.appendChild(conditionalsRow.container);

      // Preserve folder structure option
      const folderRow = this.createOptionRow('Preserve Folder Structure', 'Create groups matching folder hierarchy', 'checkbox', 'true');
      optionsContainer.appendChild(folderRow.container);

      dialog.appendChild(optionsContainer);

      // Buttons
      const buttonRow = document.createElement('div');
      buttonRow.style.cssText = 'display: flex; justify-content: flex-end; gap: 12px;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        padding: 8px 16px;
        background: transparent;
        border: 1px solid #3d3d3d;
        border-radius: 4px;
        color: #e4e4e4;
        cursor: pointer;
        font-size: 13px;
      `;
      cancelBtn.addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });
      buttonRow.appendChild(cancelBtn);

      const importBtn = document.createElement('button');
      importBtn.textContent = 'Import';
      importBtn.style.cssText = `
        padding: 8px 20px;
        background: #4dabff;
        border: none;
        border-radius: 4px;
        color: #000;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
      `;
      importBtn.addEventListener('click', () => {
        const options: XcodeProjectImportOptions | AndroidProjectImportOptions = {
          scale: parseFloat((scaleRow.input as HTMLInputElement).value) || 1,
          expandLoops: (expandLoopsRow.input as HTMLInputElement).checked,
          loopExpansionCount: parseInt((loopCountRow.input as HTMLInputElement).value, 10) || 3,
          includeConditionals: (conditionalsRow.input as HTMLInputElement).checked,
          preserveFolderStructure: (folderRow.input as HTMLInputElement).checked,
        };
        overlay.remove();
        resolve(options);
      });
      buttonRow.appendChild(importBtn);

      dialog.appendChild(buttonRow);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Close on escape
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          overlay.remove();
          document.removeEventListener('keydown', handleEscape);
          resolve(null);
        }
      };
      document.addEventListener('keydown', handleEscape);

      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });
    });
  }

  /**
   * Create an option row for the import dialog.
   */
  private createOptionRow(
    label: string,
    description: string,
    type: 'checkbox' | 'number',
    defaultValue: string
  ): { container: HTMLElement; input: HTMLElement } {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 16px;';

    const labelContainer = document.createElement('div');
    labelContainer.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.fontWeight = '500';
    labelContainer.appendChild(labelEl);

    const descEl = document.createElement('span');
    descEl.textContent = description;
    descEl.style.cssText = 'font-size: 11px; color: #6a6a6a;';
    labelContainer.appendChild(descEl);

    container.appendChild(labelContainer);

    let input: HTMLInputElement;

    if (type === 'checkbox') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = defaultValue === 'true';
      input.style.cssText = 'width: 18px; height: 18px; cursor: pointer;';
    } else {
      input = document.createElement('input');
      input.type = 'number';
      input.value = defaultValue;
      input.min = '0.1';
      input.max = '10';
      input.step = '0.1';
      input.style.cssText = `
        width: 60px;
        padding: 4px 8px;
        background: #2d2d2d;
        border: 1px solid #3d3d3d;
        border-radius: 4px;
        color: #e4e4e4;
        font-size: 13px;
        text-align: center;
      `;
    }

    container.appendChild(input);

    return { container, input };
  }

  /**
   * Show import progress dialog.
   */
  private showImportProgressDialog(projectType: string): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = 'import-progress-dialog';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000000;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #1e1e1e;
      border: 1px solid #3d3d3d;
      border-radius: 8px;
      padding: 32px 48px;
      text-align: center;
      color: #e4e4e4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    // Spinner
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 40px;
      height: 40px;
      margin: 0 auto 16px;
      border: 3px solid #3d3d3d;
      border-top-color: #4dabff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;
    dialog.appendChild(spinner);

    // Add keyframes
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);

    // Text
    const text = document.createElement('div');
    text.style.fontSize = '14px';
    text.textContent = `Importing ${projectType} project...`;
    dialog.appendChild(text);

    const subtext = document.createElement('div');
    subtext.style.cssText = 'font-size: 12px; color: #888; margin-top: 8px;';
    subtext.textContent = 'Parsing source files and creating nodes';
    dialog.appendChild(subtext);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    return overlay;
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
   * Get text scale setting from localStorage.
   */
  private getTextScaleSetting(): number {
    const stored = localStorage.getItem('designlibre-text-scale');
    return stored === null ? 1 : parseFloat(stored);
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
   * Save the current document as a .seed file.
   */
  private async saveAsSeed(): Promise<void> {
    try {
      const filename = `${this.documentName.replace(/[^a-zA-Z0-9-_ ]/g, '')}.seed`;
      await this.runtime.saveAsSeed(filename);
    } catch (error) {
      console.error('Failed to save .seed file:', error);
      // Could show an error notification here
    }
  }

  /**
   * Open a .seed file.
   */
  private openSeedFile(): void {
    // Create a hidden file input to trigger file selection
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.seed';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        await this.runtime.loadSeed(file);
        // Update document name from filename
        this.documentName = file.name.replace('.seed', '');
        // Sync leaves and re-render
        this.syncLeavesFromSceneGraph();
        this.render();
      } catch (error) {
        console.error('Failed to open .seed file:', error);
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
