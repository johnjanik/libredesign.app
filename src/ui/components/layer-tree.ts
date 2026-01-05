/**
 * Layer Tree
 *
 * Hierarchical layer view with multi-select, drag-and-drop,
 * inline rename, and visibility/lock toggles.
 *
 * Standalone component that can be mounted anywhere.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type { Unsubscribe } from '@core/events/event-emitter';

/**
 * Layer tree options
 */
export interface LayerTreeOptions {
  /** Show search filter */
  showSearch?: boolean;
  /** Show layer count in header */
  showCount?: boolean;
  /** Enable drag-and-drop reordering */
  enableDragDrop?: boolean;
  /** Enable multi-select */
  enableMultiSelect?: boolean;
}

/**
 * Layer node for tree rendering
 */
interface LayerNode {
  id: NodeId;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  children: LayerNode[];
  depth: number;
}

/**
 * SVG icons
 */
const ICONS = {
  chevronRight: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="9 6 15 12 9 18"/>
  </svg>`,
  chevronDown: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,
  frame: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>`,
  group: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>`,
  rectangle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>`,
  ellipse: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <ellipse cx="12" cy="12" rx="9" ry="9"/>
  </svg>`,
  text: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
  </svg>`,
  vector: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
  </svg>`,
  image: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
  </svg>`,
  component: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5 12,2"/>
    <line x1="12" y1="22" x2="12" y2="15.5"/><line x1="22" y1="8.5" x2="12" y2="15.5"/>
    <line x1="2" y1="8.5" x2="12" y2="15.5"/>
  </svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>`,
  eyeOff: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`,
  lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`,
  unlock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,
};

/**
 * Map node type to icon
 */
const TYPE_ICONS: Record<string, string> = {
  FRAME: ICONS.frame,
  GROUP: ICONS.group,
  RECTANGLE: ICONS.rectangle,
  ELLIPSE: ICONS.ellipse,
  TEXT: ICONS.text,
  VECTOR: ICONS.vector,
  IMAGE: ICONS.image,
  COMPONENT: ICONS.component,
  INSTANCE: ICONS.component,
};

/**
 * Layer Tree Component
 */
export class LayerTree {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private listElement: HTMLElement | null = null;
  private options: Required<LayerTreeOptions>;
  private subscriptions: Unsubscribe[] = [];

  private expandedIds: Set<string> = new Set();
  private searchQuery: string = '';
  private draggedId: NodeId | null = null;
  private dropTargetId: NodeId | null = null;
  private dropPosition: 'before' | 'after' | 'inside' | null = null;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: LayerTreeOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.options = {
      showSearch: options.showSearch ?? true,
      showCount: options.showCount ?? true,
      enableDragDrop: options.enableDragDrop ?? true,
      enableMultiSelect: options.enableMultiSelect ?? true,
    };

    this.setup();
    this.setupEventListeners();
  }

  private setup(): void {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-layer-tree flex flex-col h-full overflow-hidden';

    this.render();
    this.container.appendChild(this.element);
  }

  private setupEventListeners(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    if (sceneGraph) {
      const unsub1 = sceneGraph.on('node:created', () => this.render());
      const unsub2 = sceneGraph.on('node:deleted', () => this.render());
      const unsub3 = sceneGraph.on('node:propertyChanged', () => this.render());
      this.subscriptions.push(unsub1, unsub2, unsub3);
    }

    const unsub4 = this.runtime.on('selection:changed', () => this.render());
    this.subscriptions.push(unsub4);
  }

  private render(): void {
    if (!this.element) return;

    this.element.innerHTML = '';

    // Header
    const header = this.renderHeader();
    this.element.appendChild(header);

    // Search (optional)
    if (this.options.showSearch) {
      const search = this.renderSearch();
      this.element.appendChild(search);
    }

    // Layer list
    this.listElement = document.createElement('div');
    this.listElement.className = 'layer-tree-list flex-1 overflow-y-auto overflow-x-hidden';
    this.listElement.setAttribute('role', 'tree');
    this.listElement.setAttribute('aria-label', 'Layer hierarchy');

    const layers = this.buildLayerTree();
    if (layers.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No layers yet';
      empty.className = 'p-4 text-content-tertiary text-xs text-center';
      this.listElement.appendChild(empty);
    } else {
      this.renderLayers(layers, this.listElement);
    }

    this.element.appendChild(this.listElement);
  }

  private renderHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'layer-tree-header flex items-center justify-between px-3 py-2 border-b border-border';

    const title = document.createElement('span');
    title.textContent = 'Layers';
    title.className = 'text-xs font-semibold uppercase tracking-wide text-content-secondary';
    header.appendChild(title);

    if (this.options.showCount) {
      const count = this.getLayerCount();
      const countEl = document.createElement('span');
      countEl.textContent = String(count);
      countEl.className = 'text-2xs text-content-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded-full';
      header.appendChild(countEl);
    }

    return header;
  }

  private renderSearch(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'px-3 py-2 border-b border-border';

    const searchBox = document.createElement('div');
    searchBox.className = 'flex items-center gap-1.5 px-2 py-1 bg-surface-tertiary border border-border rounded';

    const icon = document.createElement('span');
    icon.innerHTML = ICONS.search;
    icon.className = 'flex text-content-tertiary';
    searchBox.appendChild(icon);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Filter layers...';
    input.value = this.searchQuery;
    input.className = 'flex-1 border-none bg-transparent text-content text-xs outline-none';
    input.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.render();
    });
    searchBox.appendChild(input);

    wrapper.appendChild(searchBox);
    return wrapper;
  }

  private buildLayerTree(): LayerNode[] {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) return [];

    const currentPageId = this.runtime.getCurrentPageId?.() ?? null;
    if (!currentPageId) return [];

    const page = sceneGraph.getNode(currentPageId);
    if (!page) return [];

    const getChildIds = (node: { children?: NodeId[] }): NodeId[] => {
      return 'children' in node && Array.isArray(node.children) ? node.children : [];
    };

    const buildNode = (nodeId: NodeId, depth: number): LayerNode | null => {
      const node = sceneGraph.getNode(nodeId);
      if (!node) return null;

      // Skip document and page nodes
      if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
        return null;
      }

      // Filter by search
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const nameMatches = node.name.toLowerCase().includes(query);
        // For groups/frames, check if any children match
        const childIds = getChildIds(node as { children?: NodeId[] });
        const childrenMatch = childIds.some((childId: NodeId) => {
          const child = sceneGraph.getNode(childId);
          return child?.name.toLowerCase().includes(query);
        });
        if (!nameMatches && !childrenMatch) {
          return null;
        }
      }

      const childIds = getChildIds(node as { children?: NodeId[] });
      const children: LayerNode[] = [];
      for (const childId of childIds) {
        const childNode = buildNode(childId, depth + 1);
        if (childNode) {
          children.push(childNode);
        }
      }

      return {
        id: nodeId,
        name: node.name,
        type: node.type,
        visible: node.visible ?? true,
        locked: node.locked ?? false,
        children,
        depth,
      };
    };

    const childIds = getChildIds(page as { children?: NodeId[] });
    const nodes: LayerNode[] = [];
    for (const childId of childIds) {
      const node = buildNode(childId, 0);
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  private renderLayers(layers: LayerNode[], parent: HTMLElement): void {
    for (const layer of layers) {
      const item = this.renderLayerItem(layer);
      parent.appendChild(item);

      if (layer.children.length > 0 && this.expandedIds.has(layer.id)) {
        const childrenWrapper = document.createElement('div');
        childrenWrapper.className = 'layer-children';
        childrenWrapper.setAttribute('role', 'group');
        this.renderLayers(layer.children, childrenWrapper);
        parent.appendChild(childrenWrapper);
      }
    }
  }

  private renderLayerItem(layer: LayerNode): HTMLElement {
    const selectionManager = this.runtime.getSelectionManager();
    const selectedIds = selectionManager?.getSelectedNodeIds() ?? [];
    const isSelected = selectedIds.includes(layer.id);
    const hasChildren = layer.children.length > 0;
    const isExpanded = this.expandedIds.has(layer.id);

    const item = document.createElement('div');
    item.className = isSelected
      ? 'group layer-item-selected border-l-2 border-accent text-accent'
      : 'group layer-item border-l-2 border-transparent text-content';
    item.dataset['nodeId'] = layer.id;
    item.setAttribute('role', 'treeitem');
    item.setAttribute('aria-selected', String(isSelected));
    item.setAttribute('aria-expanded', String(isExpanded));
    // Dynamic padding for depth hierarchy
    item.style.paddingLeft = `${8 + layer.depth * 16}px`;

    // Expand/collapse toggle
    const toggle = document.createElement('span');
    toggle.className = `layer-toggle flex w-4 h-4 items-center justify-center text-content-secondary ${hasChildren ? 'visible' : 'invisible'}`;
    toggle.innerHTML = isExpanded ? ICONS.chevronDown : ICONS.chevronRight;
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleExpand(layer.id);
    });
    item.appendChild(toggle);

    // Type icon
    const icon = document.createElement('span');
    icon.className = `layer-icon flex ${isSelected ? 'text-accent' : 'text-content-secondary'}`;
    icon.innerHTML = TYPE_ICONS[layer.type] ?? ICONS.frame;
    item.appendChild(icon);

    // Name
    const name = document.createElement('span');
    name.className = 'layer-name flex-1 truncate';
    name.textContent = layer.name;
    item.appendChild(name);

    // Action buttons (visibility, lock) - show on hover via group-hover
    const actions = document.createElement('div');
    actions.className = 'layer-actions flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity';

    // Visibility toggle
    const visBtn = this.createActionButton(
      layer.visible ? ICONS.eye : ICONS.eyeOff,
      layer.visible ? 'Hide' : 'Show',
      () => this.toggleVisibility(layer.id, !layer.visible)
    );
    if (!layer.visible) {
      visBtn.classList.add('opacity-100', 'text-content-tertiary');
    }
    actions.appendChild(visBtn);

    // Lock toggle
    const lockBtn = this.createActionButton(
      layer.locked ? ICONS.lock : ICONS.unlock,
      layer.locked ? 'Unlock' : 'Lock',
      () => this.toggleLock(layer.id, !layer.locked)
    );
    if (layer.locked) {
      lockBtn.classList.add('opacity-100', 'text-content-tertiary');
    }
    actions.appendChild(lockBtn);

    item.appendChild(actions);

    // Selection
    item.addEventListener('click', (e) => {
      this.handleSelect(layer.id, e);
    });

    // Double-click to rename
    name.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.startRename(layer.id, name);
    });

    // Drag and drop
    if (this.options.enableDragDrop) {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', (e) => this.handleDragStart(e, layer.id));
      item.addEventListener('dragover', (e) => this.handleDragOver(e, layer.id));
      item.addEventListener('dragleave', () => this.handleDragLeave());
      item.addEventListener('drop', (e) => this.handleDrop(e, layer.id));
      item.addEventListener('dragend', () => this.handleDragEnd());
    }

    return item;
  }

  private createActionButton(
    icon: string,
    title: string,
    onClick: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.innerHTML = icon;
    btn.title = title;
    btn.className = 'flex p-0.5 border-none bg-transparent text-content-secondary cursor-pointer rounded-sm hover:bg-surface-tertiary transition-colors';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  // ============================================================
  // Interactions
  // ============================================================

  private handleSelect(nodeId: NodeId, e: MouseEvent): void {
    const selectionManager = this.runtime.getSelectionManager();
    if (!selectionManager) return;

    if (this.options.enableMultiSelect && (e.ctrlKey || e.metaKey)) {
      // Toggle selection
      const currentIds = selectionManager.getSelectedNodeIds();
      if (currentIds.includes(nodeId)) {
        // Deselect by selecting all except this one
        selectionManager.select(currentIds.filter((id) => id !== nodeId));
      } else {
        // Add to selection
        selectionManager.select([...currentIds, nodeId]);
      }
    } else if (this.options.enableMultiSelect && e.shiftKey) {
      // Range selection (simplified - add to current)
      const currentIds = selectionManager.getSelectedNodeIds();
      if (!currentIds.includes(nodeId)) {
        selectionManager.select([...currentIds, nodeId]);
      }
    } else {
      // Single select
      selectionManager.select([nodeId]);
    }
  }

  private toggleExpand(nodeId: NodeId): void {
    if (this.expandedIds.has(nodeId)) {
      this.expandedIds.delete(nodeId);
    } else {
      this.expandedIds.add(nodeId);
    }
    this.render();
  }

  private toggleVisibility(nodeId: NodeId, visible: boolean): void {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph?.updateNode(nodeId, { visible });
  }

  private toggleLock(nodeId: NodeId, locked: boolean): void {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph?.updateNode(nodeId, { locked });
  }

  private startRename(nodeId: NodeId, nameEl: HTMLElement): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph?.getNode(nodeId);
    if (!node) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = node.name;
    input.className = 'flex-1 border border-accent rounded-sm bg-surface text-content text-xs px-1 outline-none';

    const finishRename = () => {
      const newName = input.value.trim() || node.name;
      sceneGraph?.updateNode(nodeId, { name: newName });
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

    nameEl.textContent = '';
    nameEl.appendChild(input);
    input.focus();
    input.select();
  }

  // ============================================================
  // Drag and Drop
  // ============================================================

  private handleDragStart(e: DragEvent, nodeId: NodeId): void {
    this.draggedId = nodeId;
    e.dataTransfer?.setData('text/plain', nodeId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  private handleDragOver(e: DragEvent, targetId: NodeId): void {
    if (!this.draggedId || this.draggedId === targetId) return;

    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';

    this.dropTargetId = targetId;

    // Determine drop position based on mouse Y
    const item = (e.target as HTMLElement).closest('.layer-item');
    if (item) {
      const rect = item.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;

      if (y < height * 0.25) {
        this.dropPosition = 'before';
        (item as HTMLElement).style.borderTop = '2px solid var(--designlibre-accent, #0d99ff)';
        (item as HTMLElement).style.borderBottom = '';
      } else if (y > height * 0.75) {
        this.dropPosition = 'after';
        (item as HTMLElement).style.borderTop = '';
        (item as HTMLElement).style.borderBottom = '2px solid var(--designlibre-accent, #0d99ff)';
      } else {
        this.dropPosition = 'inside';
        (item as HTMLElement).style.borderTop = '';
        (item as HTMLElement).style.borderBottom = '';
        (item as HTMLElement).style.backgroundColor = 'var(--designlibre-accent-light, #1a3a5c)';
      }
    }
  }

  private handleDragLeave(): void {
    // Clear visual feedback
    const items = this.element?.querySelectorAll('.layer-item');
    items?.forEach((item) => {
      (item as HTMLElement).style.borderTop = '';
      (item as HTMLElement).style.borderBottom = '';
    });
  }

  private handleDrop(e: DragEvent, targetId: NodeId): void {
    e.preventDefault();

    if (!this.draggedId || !this.dropPosition) return;

    // TODO: Implement actual reordering via sceneGraph
    console.log('Drop:', this.draggedId, this.dropPosition, targetId);

    this.handleDragEnd();
  }

  private handleDragEnd(): void {
    this.draggedId = null;
    this.dropTargetId = null;
    this.dropPosition = null;

    // Clear all visual feedback
    const items = this.element?.querySelectorAll('.layer-item');
    items?.forEach((item) => {
      (item as HTMLElement).style.borderTop = '';
      (item as HTMLElement).style.borderBottom = '';
    });

    this.render();
  }

  // ============================================================
  // Helpers
  // ============================================================

  private getLayerCount(): number {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) return 0;

    const getChildIds = (node: { children?: NodeId[] } | undefined): NodeId[] => {
      if (!node) return [];
      return 'children' in node && Array.isArray(node.children) ? node.children : [];
    };

    let count = 0;
    const countNodes = (nodeId: NodeId) => {
      const node = sceneGraph.getNode(nodeId);
      if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') {
        const children = getChildIds(node as { children?: NodeId[] } | undefined);
        for (const childId of children) {
          countNodes(childId);
        }
        return;
      }
      count++;
      const children = getChildIds(node as { children?: NodeId[] });
      for (const childId of children) {
        countNodes(childId);
      }
    };

    const currentPageId = this.runtime.getCurrentPageId?.();
    if (currentPageId) {
      countNodes(currentPageId);
    }

    return count;
  }

  // ============================================================
  // Public API
  // ============================================================

  /** Expand a node */
  expand(nodeId: NodeId): void {
    this.expandedIds.add(nodeId);
    this.render();
  }

  /** Collapse a node */
  collapse(nodeId: NodeId): void {
    this.expandedIds.delete(nodeId);
    this.render();
  }

  /** Expand all nodes */
  expandAll(): void {
    const layers = this.buildLayerTree();
    const addAll = (nodes: LayerNode[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          this.expandedIds.add(node.id);
          addAll(node.children);
        }
      }
    };
    addAll(layers);
    this.render();
  }

  /** Collapse all nodes */
  collapseAll(): void {
    this.expandedIds.clear();
    this.render();
  }

  /** Get element */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /** Get current drag state (for external drag handling) */
  getDragState(): { draggedId: NodeId | null; dropTargetId: NodeId | null; dropPosition: 'before' | 'after' | 'inside' | null } {
    return {
      draggedId: this.draggedId,
      dropTargetId: this.dropTargetId,
      dropPosition: this.dropPosition,
    };
  }

  /** Force re-render */
  refresh(): void {
    this.render();
  }

  /** Dispose */
  dispose(): void {
    for (const unsub of this.subscriptions) {
      unsub();
    }
    this.subscriptions = [];

    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

/**
 * Create a layer tree
 */
export function createLayerTree(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: LayerTreeOptions
): LayerTree {
  return new LayerTree(runtime, container, options);
}
