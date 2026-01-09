/**
 * Component Library Panel
 *
 * Displays categorized UI components for drag-and-drop onto the canvas.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import {
  LibraryComponentRegistry,
  type LibraryComponent,
  type ComponentCategory,
  CATEGORY_INFO,
  getOrderedCategories,
} from '@scene/components/library-component-registry';
import { getAllLibraryComponents } from '@scene/components/library';

/**
 * Component Library Panel Options
 */
export interface ComponentLibraryPanelOptions {
  /** Reference to runtime */
  runtime: DesignLibreRuntime;
  /** Optional existing registry (if not provided, creates new one) */
  registry?: LibraryComponentRegistry;
}

/**
 * SVG Icons for the panel
 */
const ICONS = {
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,
  chevronDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,
  chevronRight: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="9 6 15 12 9 18"/>
  </svg>`,
  dragHandle: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="9" cy="6" r="1.5" fill="currentColor"/><circle cx="15" cy="6" r="1.5" fill="currentColor"/>
    <circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9" cy="18" r="1.5" fill="currentColor"/><circle cx="15" cy="18" r="1.5" fill="currentColor"/>
  </svg>`,
};

/**
 * Category icons (using simple SVG representations)
 */
const CATEGORY_ICONS: Record<ComponentCategory, string> = {
  'device-frames': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>`,
  'layout': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>`,
  'navigation': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
  </svg>`,
  'typography': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
  </svg>`,
  'buttons': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="8" width="18" height="8" rx="4"/>
  </svg>`,
  'forms': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="5" width="18" height="14" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/>
    <line x1="7" y1="13" x2="13" y2="13"/>
  </svg>`,
  'data-display': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
  </svg>`,
  'feedback': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>`,
  'overlays': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <rect x="7" y="7" width="10" height="10" rx="1" fill="none"/>
  </svg>`,
  'media': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>`,
  'icons': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>`,
  'utility': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>`,
};

/**
 * Component Library Panel
 */
export class ComponentLibraryPanel {
  private _runtime: DesignLibreRuntime;
  private registry: LibraryComponentRegistry;
  private scrollContainer: HTMLElement | null = null;

  // State
  private searchQuery = '';
  private expandedCategories: Set<ComponentCategory> = new Set(['layout']);
  private currentDragComponent: LibraryComponent | null = null;

  constructor(options: ComponentLibraryPanelOptions) {
    this._runtime = options.runtime;
    this.registry = options.registry ?? new LibraryComponentRegistry();

    // Register all core components
    this.registry.registerAll(getAllLibraryComponents());
  }

  /**
   * Create and return the panel element
   */
  createElement(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'designlibre-component-library';
    panel.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--designlibre-bg-secondary, #252525);
    `;

    // Search bar
    panel.appendChild(this.createSearchBar());

    // Scrollable category list
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.className = 'component-library-scroll';
    this.scrollContainer.style.cssText = `
      flex: 1;
      display: block;
      overflow-y: auto;
      overflow-x: hidden;
    `;

    // Render categories
    this.renderCategories(this.scrollContainer);
    panel.appendChild(this.scrollContainer);

    return panel;
  }

  /**
   * Create search bar
   */
  private createSearchBar(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      padding: 8px 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    const searchWrapper = document.createElement('div');
    searchWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border-radius: 6px;
      border: 1px solid transparent;
    `;

    // Search icon
    const iconSpan = document.createElement('span');
    iconSpan.innerHTML = ICONS.search;
    iconSpan.style.cssText = `
      display: flex;
      color: var(--designlibre-text-secondary, #888);
    `;
    searchWrapper.appendChild(iconSpan);

    // Input
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search components...';
    input.style.cssText = `
      flex: 1;
      border: none;
      background: transparent;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 12px;
      outline: none;
    `;
    input.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.refresh();
    });
    searchWrapper.appendChild(input);

    container.appendChild(searchWrapper);
    return container;
  }

  /**
   * Render category list
   */
  private renderCategories(container: HTMLElement): void {
    container.innerHTML = '';

    const orderedCategories = getOrderedCategories();
    const categoryCounts = this.registry.getCategoryCounts();

    // If searching, show flat filtered list
    if (this.searchQuery.trim()) {
      const results = this.registry.search(this.searchQuery);
      if (results.length === 0) {
        container.appendChild(this.createEmptyState('No components found'));
      } else {
        const grid = this.createComponentGrid(results);
        container.appendChild(grid);
      }
      return;
    }

    // Normal category view
    for (const category of orderedCategories) {
      const count = categoryCounts.get(category) ?? 0;
      if (count === 0) continue;

      const categorySection = this.createCategorySection(category);
      container.appendChild(categorySection);
    }
  }

  /**
   * Create category section (header + collapsible content)
   */
  private createCategorySection(category: ComponentCategory): HTMLElement {
    const section = document.createElement('div');
    section.className = 'component-library-category';
    section.style.cssText = `
      display: block;
      width: 100%;
    `;

    const info = CATEGORY_INFO[category];
    const isExpanded = this.expandedCategories.has(category);
    const components = this.registry.getByCategory(category);

    // Category header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    `;
    header.addEventListener('mouseenter', () => {
      header.style.background = 'var(--designlibre-bg-hover, #333)';
    });
    header.addEventListener('mouseleave', () => {
      header.style.background = 'transparent';
    });
    header.addEventListener('click', () => {
      if (isExpanded) {
        this.expandedCategories.delete(category);
      } else {
        this.expandedCategories.add(category);
      }
      this.refresh();
    });

    // Chevron
    const chevron = document.createElement('span');
    chevron.innerHTML = isExpanded ? ICONS.chevronDown : ICONS.chevronRight;
    chevron.style.cssText = `
      display: flex;
      color: var(--designlibre-text-secondary, #888);
      transition: transform 0.15s;
    `;
    header.appendChild(chevron);

    // Category icon
    const icon = document.createElement('span');
    icon.innerHTML = CATEGORY_ICONS[category];
    icon.style.cssText = `
      display: flex;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    header.appendChild(icon);

    // Category name
    const name = document.createElement('span');
    name.textContent = info.name;
    name.style.cssText = `
      flex: 1;
      font-size: 12px;
      font-weight: 500;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    header.appendChild(name);

    // Count badge
    const count = document.createElement('span');
    count.textContent = `${components.length}`;
    count.style.cssText = `
      font-size: 10px;
      color: var(--designlibre-text-secondary, #888);
      padding: 2px 6px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border-radius: 10px;
    `;
    header.appendChild(count);

    section.appendChild(header);

    // Collapsible content
    if (isExpanded) {
      const grid = this.createComponentGrid(components);
      section.appendChild(grid);
    }

    return section;
  }

  /**
   * Create grid of component cards
   */
  private createComponentGrid(components: LibraryComponent[]): HTMLElement {
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 4px 12px 12px 12px;
    `;

    for (const component of components) {
      const card = this.createComponentCard(component);
      grid.appendChild(card);
    }

    return grid;
  }

  /**
   * Create draggable component card
   */
  private createComponentCard(component: LibraryComponent): HTMLElement {
    const card = document.createElement('div');
    card.className = 'component-library-card';
    card.draggable = true;
    card.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px 8px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border-radius: 6px;
      cursor: grab;
      transition: all 0.15s;
      border: 1px solid transparent;
    `;

    // Hover effects
    card.addEventListener('mouseenter', () => {
      card.style.background = 'var(--designlibre-bg-hover, #333)';
      card.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = 'var(--designlibre-bg-tertiary, #1e1e1e)';
      card.style.borderColor = 'transparent';
    });

    // Drag events
    card.addEventListener('dragstart', (e) => {
      this.currentDragComponent = component;
      card.style.opacity = '0.5';

      // Set drag data
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/x-designlibre-library-component', component.id);
        e.dataTransfer.setData('text/plain', component.name);
      }

      // Emit event for canvas to listen
      window.dispatchEvent(new CustomEvent('designlibre-library-dragstart', {
        detail: { componentId: component.id, component },
      }));
    });

    card.addEventListener('dragend', () => {
      this.currentDragComponent = null;
      card.style.opacity = '1';

      window.dispatchEvent(new CustomEvent('designlibre-library-dragend'));
    });

    // Component preview (simple colored box based on category)
    const preview = document.createElement('div');
    const categoryColors: Record<ComponentCategory, string> = {
      'device-frames': '#06b6d4',
      'layout': '#4f46e5',
      'navigation': '#0ea5e9',
      'typography': '#8b5cf6',
      'buttons': '#3b82f6',
      'forms': '#10b981',
      'data-display': '#f59e0b',
      'feedback': '#ef4444',
      'overlays': '#6366f1',
      'media': '#ec4899',
      'icons': '#78716c',
      'utility': '#64748b',
    };
    const categoryColor = categoryColors[component.category] ?? '#666';

    preview.style.cssText = `
      width: 48px;
      height: 32px;
      background: ${categoryColor}22;
      border: 1px solid ${categoryColor}44;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Small icon or initials inside preview
    const previewText = document.createElement('span');
    previewText.textContent = component.name.slice(0, 2).toUpperCase();
    previewText.style.cssText = `
      font-size: 10px;
      font-weight: 600;
      color: ${categoryColor};
    `;
    preview.appendChild(previewText);
    card.appendChild(preview);

    // Component name
    const name = document.createElement('div');
    name.textContent = component.name;
    name.style.cssText = `
      font-size: 10px;
      color: var(--designlibre-text-primary, #e4e4e4);
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    `;
    card.appendChild(name);

    return card;
  }

  /**
   * Create empty state message
   */
  private createEmptyState(message: string): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      color: var(--designlibre-text-secondary, #888);
      text-align: center;
    `;

    const text = document.createElement('div');
    text.textContent = message;
    text.style.cssText = 'font-size: 12px;';
    container.appendChild(text);

    return container;
  }

  /**
   * Refresh the panel
   */
  private refresh(): void {
    if (this.scrollContainer) {
      this.renderCategories(this.scrollContainer);
    }
  }

  /**
   * Get the registry
   */
  getRegistry(): LibraryComponentRegistry {
    return this.registry;
  }

  /**
   * Get the runtime (for creating instances on drop)
   */
  getRuntime(): DesignLibreRuntime {
    return this._runtime;
  }

  /**
   * Get currently dragged component
   */
  getCurrentDragComponent(): LibraryComponent | null {
    return this.currentDragComponent;
  }
}

/**
 * Create a component library panel
 */
export function createComponentLibraryPanel(options: ComponentLibraryPanelOptions): ComponentLibraryPanel {
  return new ComponentLibraryPanel(options);
}
