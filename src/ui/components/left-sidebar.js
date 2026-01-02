/**
 * Left Sidebar
 *
 * Collapsible sidebar with file menu, leaves (pages), and layers.
 */
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
    runtime;
    container;
    element = null;
    options;
    // State
    collapsed = false;
    documentName = 'Untitled';
    activeTab = 'assets';
    leaves = [{ id: 'leaf-1', name: 'Leaf 1' }];
    activeLeafId = 'leaf-1';
    leafCounter = 1;
    // Callbacks
    onCollapseChange;
    constructor(runtime, container, options = {}) {
        this.runtime = runtime;
        this.container = container;
        this.options = {
            width: options.width ?? 240,
            collapsed: options.collapsed ?? false,
        };
        this.collapsed = this.options.collapsed;
        this.setup();
    }
    setup() {
        this.element = document.createElement('div');
        this.element.className = 'designlibre-left-sidebar';
        this.updateStyles();
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
    }
    /**
     * Sync leaves with actual PAGE nodes from scene graph.
     */
    syncLeavesFromSceneGraph() {
        const sceneGraph = this.runtime.getSceneGraph();
        if (!sceneGraph)
            return;
        const doc = sceneGraph.getDocument();
        if (!doc)
            return;
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
        }
        else if (!this.leaves.find(l => l.id === this.activeLeafId)) {
            // Set active leaf to first if current is not in list
            this.activeLeafId = this.leaves[0].id;
        }
        this.leafCounter = this.leaves.length;
    }
    updateStyles() {
        if (!this.element)
            return;
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
    render() {
        if (!this.element)
            return;
        this.element.innerHTML = '';
        if (this.collapsed) {
            this.renderCollapsedState();
        }
        else {
            this.renderExpandedState();
        }
    }
    renderCollapsedState() {
        if (!this.element)
            return;
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
    renderExpandedState() {
        if (!this.element)
            return;
        // Header with menu and minimize
        this.element.appendChild(this.createHeader());
        // File name section
        this.element.appendChild(this.createFileNameSection());
        // Tabs (File, Library) + Search
        this.element.appendChild(this.createTabsSection());
        // Leaves section
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
    createHeader() {
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
        menuBtn.addEventListener('click', () => this.showFileMenu(menuBtn));
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
    createFileNameSection() {
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
      font-size: 14px;
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
        dropdownBtn.addEventListener('click', () => this.showFileOptionsMenu(dropdownBtn));
        this.addHoverEffect(dropdownBtn);
        section.appendChild(input);
        section.appendChild(dropdownBtn);
        return section;
    }
    createTabsSection() {
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
        ];
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
        font-size: 12px;
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
      font-size: 12px;
      color: var(--designlibre-text-primary, #e4e4e4);
      outline: none;
    `;
        searchWrapper.appendChild(searchIcon);
        searchWrapper.appendChild(searchInput);
        section.appendChild(searchWrapper);
        return section;
    }
    createLeavesSection() {
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
      font-size: 11px;
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
    createLeafItem(leaf) {
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
      font-size: 13px;
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
            }
            else if (leaf.nodeId) {
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
    createLayersSection() {
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
      font-size: 11px;
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
        font-size: 12px;
        color: var(--designlibre-text-muted, #6a6a6a);
        text-align: center;
      `;
            empty.textContent = 'No layers yet. Use the toolbar to add shapes.';
            list.appendChild(empty);
        }
        section.appendChild(list);
        return section;
    }
    createLayerItem(node, isSelected, depth) {
        const item = document.createElement('div');
        item.className = 'designlibre-layer-item';
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
      font-size: 12px;
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
    renameLayer(nodeId, currentName, nameElement) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.style.cssText = `
      flex: 1;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-accent, #4dabff);
      border-radius: 2px;
      padding: 2px 4px;
      font-size: 12px;
      color: var(--designlibre-text-primary, #e4e4e4);
      outline: none;
    `;
        const finishRename = () => {
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
            }
            else if (e.key === 'Escape') {
                this.renderLayersSection();
            }
        });
        // Prevent click from bubbling up and selecting
        input.addEventListener('click', (e) => e.stopPropagation());
        nameElement.replaceWith(input);
        input.focus();
        input.select();
    }
    renderLayersSection() {
        const section = this.element?.querySelector('#designlibre-layers-section');
        if (section) {
            const newSection = this.createLayersSection();
            section.replaceWith(newSection);
        }
    }
    getIconButtonStyles() {
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
    addHoverEffect(button) {
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
            button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'transparent';
            button.style.color = 'var(--designlibre-text-secondary, #a0a0a0)';
        });
    }
    toggleCollapse() {
        this.collapsed = !this.collapsed;
        this.updateStyles();
        this.render();
        this.onCollapseChange?.(this.collapsed);
    }
    addLeaf() {
        const sceneGraph = this.runtime.getSceneGraph();
        if (!sceneGraph)
            return;
        const doc = sceneGraph.getDocument();
        if (!doc)
            return;
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
    renameLeaf(leaf, nameElement) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = leaf.name;
        input.style.cssText = `
      flex: 1;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-accent, #4dabff);
      border-radius: 2px;
      padding: 2px 4px;
      font-size: 13px;
      color: var(--designlibre-text-primary, #e4e4e4);
      outline: none;
    `;
        const finishRename = () => {
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
            }
            else if (e.key === 'Escape') {
                this.render();
            }
        });
        nameElement.replaceWith(input);
        input.focus();
        input.select();
    }
    showFileMenu(anchor) {
        this.showContextMenu(anchor, [
            { label: 'New File', shortcut: 'Ctrl+N', action: () => { } },
            { label: 'Open .preserve...', shortcut: 'Ctrl+O', action: () => this.openPreserveFile() },
            { label: 'Open Recent', submenu: true },
            { separator: true },
            { label: 'Save', shortcut: 'Ctrl+S', action: () => this.runtime.saveDocument() },
            { label: 'Save as .preserve...', shortcut: 'Ctrl+Shift+S', action: () => this.saveAsPreserve() },
            { separator: true },
            { label: 'Export...', shortcut: 'Ctrl+E', action: () => { } },
            { separator: true },
            { label: 'Settings', action: () => { } },
        ]);
    }
    /**
     * Save the current document as a .preserve file.
     */
    async saveAsPreserve() {
        try {
            const filename = `${this.documentName.replace(/[^a-zA-Z0-9-_ ]/g, '')}.preserve`;
            await this.runtime.saveAsPreserve(filename);
        }
        catch (error) {
            console.error('Failed to save .preserve file:', error);
            // Could show an error notification here
        }
    }
    /**
     * Open a .preserve file.
     */
    openPreserveFile() {
        // Create a hidden file input to trigger file selection
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.preserve';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', async (e) => {
            const target = e.target;
            const file = target.files?.[0];
            if (!file)
                return;
            try {
                await this.runtime.loadPreserve(file);
                // Update document name from filename
                this.documentName = file.name.replace('.preserve', '');
                // Sync leaves and re-render
                this.syncLeavesFromSceneGraph();
                this.render();
            }
            catch (error) {
                console.error('Failed to open .preserve file:', error);
                // Could show an error notification here
            }
            // Clean up
            fileInput.remove();
        });
        document.body.appendChild(fileInput);
        fileInput.click();
    }
    showFileOptionsMenu(anchor) {
        this.showContextMenu(anchor, [
            { label: 'Rename', action: () => { } },
            { label: 'Duplicate', action: () => { } },
            { separator: true },
            { label: 'Move to...', action: () => { } },
            { label: 'Share...', action: () => { } },
            { separator: true },
            { label: 'Version History', action: () => { } },
        ]);
    }
    showContextMenu(anchor, items) {
        // Remove any existing menu
        document.querySelector('.designlibre-context-menu')?.remove();
        const menu = document.createElement('div');
        menu.className = 'designlibre-context-menu';
        menu.style.cssText = `
      position: fixed;
      min-width: 200px;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      padding: 4px;
      z-index: 1000;
    `;
        const rect = anchor.getBoundingClientRect();
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${rect.bottom + 4}px`;
        for (const item of items) {
            if (item.separator) {
                const sep = document.createElement('div');
                sep.style.cssText = `
          height: 1px;
          background: var(--designlibre-border, #3d3d3d);
          margin: 4px 0;
        `;
                menu.appendChild(sep);
            }
            else {
                const menuItem = document.createElement('div');
                menuItem.className = 'designlibre-context-menu-item';
                menuItem.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          color: var(--designlibre-text-primary, #e4e4e4);
        `;
                const label = document.createElement('span');
                label.textContent = item.label ?? '';
                menuItem.appendChild(label);
                if (item.shortcut) {
                    const shortcut = document.createElement('span');
                    shortcut.textContent = item.shortcut;
                    shortcut.style.cssText = `
            font-size: 11px;
            color: var(--designlibre-text-muted, #6a6a6a);
          `;
                    menuItem.appendChild(shortcut);
                }
                if (item.submenu) {
                    const arrow = document.createElement('span');
                    arrow.textContent = '▸';
                    arrow.style.cssText = `
            font-size: 10px;
            color: var(--designlibre-text-muted, #6a6a6a);
          `;
                    menuItem.appendChild(arrow);
                }
                menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
                });
                menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.backgroundColor = 'transparent';
                });
                menuItem.addEventListener('click', () => {
                    item.action?.();
                    menu.remove();
                });
                menu.appendChild(menuItem);
            }
        }
        document.body.appendChild(menu);
        // Close on click outside
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }
    /**
     * Set collapse change callback.
     */
    setOnCollapseChange(callback) {
        this.onCollapseChange = callback;
    }
    /**
     * Check if sidebar is collapsed.
     */
    isCollapsed() {
        return this.collapsed;
    }
    /**
     * Set document name.
     */
    setDocumentName(name) {
        this.documentName = name;
        this.render();
    }
    /**
     * Dispose of the sidebar.
     */
    dispose() {
        if (this.element) {
            this.container.removeChild(this.element);
        }
    }
}
/**
 * Create a left sidebar.
 */
export function createLeftSidebar(runtime, container, options) {
    return new LeftSidebar(runtime, container, options);
}
//# sourceMappingURL=left-sidebar.js.map