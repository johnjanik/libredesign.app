/**
 * Toolbar
 *
 * UI component for tool selection with popup menus for tool groups.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';

/**
 * Tool definition
 */
interface ToolDefinition {
  id: string;
  name: string;
  icon: string;
  shortcut: string;
  options?: ToolOptions;
}

/**
 * Tool options for configurable tools
 */
interface ToolOptions {
  sides?: number; // For n-gon
  points?: number; // For star
  innerRadius?: number; // For star
}

/**
 * Tool group with popup menu
 */
interface ToolGroup {
  id: string;
  tools: ToolDefinition[];
  defaultTool: string;
}

/**
 * Toolbar options
 */
export interface ToolbarOptions {
  /** Position of toolbar */
  position?: 'top' | 'left' | 'right' | 'bottom' | undefined;
  /** Show tool labels */
  showLabels?: boolean | undefined;
}

/**
 * SVG icons for tools
 */
const TOOL_ICONS: Record<string, string> = {
  select: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
    <path d="M13 13l6 6"/>
  </svg>`,
  rectangle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>`,
  ellipse: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <ellipse cx="12" cy="12" rx="9" ry="9"/>
  </svg>`,
  line: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="5" y1="19" x2="19" y2="5"/>
  </svg>`,
  polygon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12,2 22,8.5 19,20 5,20 2,8.5"/>
  </svg>`,
  star: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>`,
  image: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21,15 16,10 5,21"/>
  </svg>`,
  pen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    <path d="M2 2l7.586 7.586"/>
  </svg>`,
  pencil: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>`,
  text: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="4 7 4 4 20 4 20 7"/>
    <line x1="9" y1="20" x2="15" y2="20"/>
    <line x1="12" y1="4" x2="12" y2="20"/>
  </svg>`,
  hand: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
  </svg>`,
  dropdown: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 10l5 5 5-5z"/>
  </svg>`,
};

/**
 * Shape tools group
 */
const SHAPE_TOOLS: ToolDefinition[] = [
  { id: 'rectangle', name: 'Rectangle', icon: TOOL_ICONS['rectangle']!, shortcut: 'R' },
  { id: 'ellipse', name: 'Ellipse', icon: TOOL_ICONS['ellipse']!, shortcut: 'O' },
  { id: 'line', name: 'Line', icon: TOOL_ICONS['line']!, shortcut: 'L' },
  { id: 'polygon', name: 'Polygon', icon: TOOL_ICONS['polygon']!, shortcut: 'Shift+P', options: { sides: 5 } },
  { id: 'star', name: 'Star', icon: TOOL_ICONS['star']!, shortcut: 'Shift+S', options: { points: 5, innerRadius: 0.5 } },
  { id: 'image', name: 'Image/Video', icon: TOOL_ICONS['image']!, shortcut: 'Shift+I' },
];

/**
 * Drawing tools group
 */
const DRAWING_TOOLS: ToolDefinition[] = [
  { id: 'pen', name: 'Pen', icon: TOOL_ICONS['pen']!, shortcut: 'P' },
  { id: 'pencil', name: 'Pencil', icon: TOOL_ICONS['pencil']!, shortcut: 'Shift+P' },
];

/**
 * Standalone tools (no popup)
 */
const STANDALONE_TOOLS: ToolDefinition[] = [
  { id: 'select', name: 'Select', icon: TOOL_ICONS['select']!, shortcut: 'V' },
  { id: 'hand', name: 'Hand', icon: TOOL_ICONS['hand']!, shortcut: 'H' },
  { id: 'text', name: 'Text', icon: TOOL_ICONS['text']!, shortcut: 'T' },
];

/**
 * Tool groups
 */
const TOOL_GROUPS: ToolGroup[] = [
  { id: 'shapes', tools: SHAPE_TOOLS, defaultTool: 'rectangle' },
  { id: 'drawing', tools: DRAWING_TOOLS, defaultTool: 'pen' },
];

/**
 * Toolbar
 */
export class Toolbar {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private options: Required<ToolbarOptions>;
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private activePopup: HTMLElement | null = null;
  private selectedGroupTools: Map<string, string> = new Map();
  private toolOptions: Map<string, ToolOptions> = new Map();

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: ToolbarOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.options = {
      position: options.position ?? 'left',
      showLabels: options.showLabels ?? false,
    };

    // Initialize selected tools for each group
    for (const group of TOOL_GROUPS) {
      this.selectedGroupTools.set(group.id, group.defaultTool);
    }

    // Initialize tool options
    for (const group of TOOL_GROUPS) {
      for (const tool of group.tools) {
        if (tool.options) {
          this.toolOptions.set(tool.id, { ...tool.options });
        }
      }
    }

    this.setup();
  }

  private setup(): void {
    // Create toolbar element
    this.element = document.createElement('div');
    this.element.className = 'designlibre-toolbar';
    this.element.style.cssText = this.getToolbarStyles();

    // Add standalone tools first (Select, Hand)
    for (const tool of STANDALONE_TOOLS.slice(0, 2)) {
      const button = this.createToolButton(tool);
      this.buttons.set(tool.id, button);
      this.element.appendChild(button);
    }

    // Add tool groups with popups
    for (const group of TOOL_GROUPS) {
      const groupButton = this.createToolGroupButton(group);
      this.element.appendChild(groupButton);
    }

    // Add remaining standalone tools (Text)
    for (const tool of STANDALONE_TOOLS.slice(2)) {
      const button = this.createToolButton(tool);
      this.buttons.set(tool.id, button);
      this.element.appendChild(button);
    }

    // Add separator
    const separator = document.createElement('div');
    separator.className = 'designlibre-toolbar-separator';
    separator.style.cssText = this.getSeparatorStyles();
    this.element.appendChild(separator);

    // Add action buttons
    this.addActionButtons();

    this.container.appendChild(this.element);

    // Listen for tool changes
    this.runtime.on('tool:changed', ({ tool }) => {
      this.setActiveButton(tool);
    });

    // Set initial active state
    this.setActiveButton(this.runtime.getActiveTool());

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
      if (this.activePopup && !this.activePopup.contains(e.target as Node)) {
        const buttonContainer = this.activePopup.parentElement;
        if (!buttonContainer?.contains(e.target as Node)) {
          this.closePopup();
        }
      }
    });
  }

  private getToolbarStyles(): string {
    const base = `
      display: flex;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      padding: 4px;
      gap: 2px;
      box-shadow: var(--designlibre-shadow, 0 4px 12px rgba(0, 0, 0, 0.4));
      z-index: 100;
    `;

    switch (this.options.position) {
      case 'top':
        return `${base} position: absolute; top: 12px; left: 50%; transform: translateX(-50%); flex-direction: row;`;
      case 'right':
        return `${base} position: absolute; right: 12px; top: 50%; transform: translateY(-50%); flex-direction: column;`;
      case 'bottom':
        return `${base} position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); flex-direction: row;`;
      case 'left':
      default:
        return `${base} position: absolute; left: 12px; top: 50%; transform: translateY(-50%); flex-direction: column;`;
    }
  }

  private getSeparatorStyles(): string {
    return this.options.position === 'top' || this.options.position === 'bottom'
      ? 'width: 1px; height: 24px; background: var(--designlibre-border, #3d3d3d); margin: 0 4px;'
      : 'width: 24px; height: 1px; background: var(--designlibre-border, #3d3d3d); margin: 4px 0;';
  }

  private createToolButton(tool: ToolDefinition): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'designlibre-toolbar-button';
    button.title = `${tool.name} (${tool.shortcut})`;
    button.innerHTML = this.options.showLabels
      ? `<span class="icon">${tool.icon}</span><span class="label">${tool.name}</span>`
      : tool.icon;

    button.style.cssText = `
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;

    button.addEventListener('mouseenter', () => {
      if (!button.classList.contains('active')) {
        button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('active')) {
        button.style.backgroundColor = 'transparent';
      }
    });

    button.addEventListener('click', () => {
      this.runtime.setTool(tool.id);
    });

    return button;
  }

  private createToolGroupButton(group: ToolGroup): HTMLElement {
    const container = document.createElement('div');
    container.className = 'designlibre-toolbar-group';
    container.style.cssText = 'position: relative;';

    const selectedToolId = this.selectedGroupTools.get(group.id)!;
    const selectedTool = group.tools.find(t => t.id === selectedToolId)!;

    // Main button
    const button = document.createElement('button');
    button.className = 'designlibre-toolbar-button';
    button.dataset['groupId'] = group.id;
    button.title = `${selectedTool.name} (${selectedTool.shortcut}) - Click and hold for more`;
    button.style.cssText = `
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s;
      color: var(--designlibre-text-primary, #e4e4e4);
      position: relative;
    `;

    // Icon container
    const iconContainer = document.createElement('span');
    iconContainer.className = 'icon-container';
    iconContainer.innerHTML = selectedTool.icon;
    button.appendChild(iconContainer);

    // Dropdown indicator
    const dropdown = document.createElement('span');
    dropdown.className = 'dropdown-indicator';
    dropdown.innerHTML = TOOL_ICONS['dropdown']!;
    dropdown.style.cssText = `
      position: absolute;
      bottom: 2px;
      right: 2px;
      opacity: 0.6;
    `;
    button.appendChild(dropdown);

    this.buttons.set(group.id, button);

    button.addEventListener('mouseenter', () => {
      if (!button.classList.contains('active')) {
        button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('active')) {
        button.style.backgroundColor = 'transparent';
      }
    });

    // Click activates the selected tool
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentTool = this.selectedGroupTools.get(group.id)!;
      this.runtime.setTool(currentTool);
      this.closePopup();
    });

    // Right-click or long press opens popup
    button.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.togglePopup(group, container);
    });

    // Long press detection
    let pressTimer: number | null = null;
    button.addEventListener('mousedown', () => {
      pressTimer = window.setTimeout(() => {
        this.togglePopup(group, container);
      }, 300);
    });
    button.addEventListener('mouseup', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });
    button.addEventListener('mouseleave', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    container.appendChild(button);
    return container;
  }

  private togglePopup(group: ToolGroup, container: HTMLElement): void {
    if (this.activePopup && this.activePopup.parentElement === container) {
      this.closePopup();
      return;
    }

    this.closePopup();
    this.activePopup = this.createPopupMenu(group, container);
    container.appendChild(this.activePopup);
  }

  private createPopupMenu(group: ToolGroup, _container: HTMLElement): HTMLElement {
    const popup = document.createElement('div');
    popup.className = 'designlibre-toolbar-popup';

    const isHorizontal = this.options.position === 'top' || this.options.position === 'bottom';
    const popupPosition = isHorizontal ? 'bottom: 100%; left: 0; margin-bottom: 4px;' : 'left: 100%; top: 0; margin-left: 4px;';

    popup.style.cssText = `
      position: absolute;
      ${popupPosition}
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      padding: 4px;
      box-shadow: var(--designlibre-shadow, 0 4px 12px rgba(0, 0, 0, 0.4));
      z-index: 200;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 140px;
    `;

    for (const tool of group.tools) {
      const item = this.createPopupMenuItem(tool, group);
      popup.appendChild(item);

      // Add options row for polygon and star
      if ((tool.id === 'polygon' || tool.id === 'star') && tool.options) {
        const optionsRow = this.createToolOptionsRow(tool);
        popup.appendChild(optionsRow);
      }
    }

    return popup;
  }

  private createPopupMenuItem(tool: ToolDefinition, group: ToolGroup): HTMLElement {
    const item = document.createElement('button');
    item.className = 'designlibre-popup-item';

    const isSelected = this.selectedGroupTools.get(group.id) === tool.id;

    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px;
      border: none;
      border-radius: 4px;
      background: ${isSelected ? 'var(--designlibre-accent-light, #1a3a5c)' : 'transparent'};
      color: ${isSelected ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-text-primary, #e4e4e4)'};
      cursor: pointer;
      font-size: 12px;
      text-align: left;
    `;

    const icon = document.createElement('span');
    icon.innerHTML = tool.icon;
    icon.style.cssText = 'display: flex; align-items: center;';

    const name = document.createElement('span');
    name.textContent = tool.name;
    name.style.cssText = 'flex: 1;';

    const shortcut = document.createElement('span');
    shortcut.textContent = tool.shortcut;
    shortcut.style.cssText = 'font-size: 10px; color: var(--designlibre-text-muted, #6a6a6a);';

    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(shortcut);

    item.addEventListener('mouseenter', () => {
      if (!isSelected) {
        item.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    item.addEventListener('mouseleave', () => {
      if (!isSelected) {
        item.style.backgroundColor = 'transparent';
      }
    });

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectGroupTool(group, tool);
    });

    return item;
  }

  private createToolOptionsRow(tool: ToolDefinition): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px 8px 36px;
      font-size: 11px;
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;

    const options = this.toolOptions.get(tool.id) ?? tool.options!;

    if (tool.id === 'polygon') {
      const label = document.createElement('span');
      label.textContent = 'Sides:';

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '3';
      input.max = '12';
      input.value = String(options.sides ?? 5);
      input.style.cssText = `
        width: 50px;
        padding: 4px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: 11px;
      `;

      input.addEventListener('change', () => {
        const sides = Math.max(3, Math.min(12, parseInt(input.value) || 5));
        input.value = String(sides);
        this.toolOptions.set(tool.id, { ...options, sides });
        // Apply to actual tool
        const polygonTool = this.runtime.getPolygonTool();
        if (polygonTool) {
          polygonTool.setSides(sides);
        }
      });

      input.addEventListener('click', (e) => e.stopPropagation());

      row.appendChild(label);
      row.appendChild(input);
    } else if (tool.id === 'star') {
      const pointsLabel = document.createElement('span');
      pointsLabel.textContent = 'Points:';

      const pointsInput = document.createElement('input');
      pointsInput.type = 'number';
      pointsInput.min = '3';
      pointsInput.max = '12';
      pointsInput.value = String(options.points ?? 5);
      pointsInput.style.cssText = `
        width: 40px;
        padding: 4px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: 11px;
      `;

      pointsInput.addEventListener('change', () => {
        const points = Math.max(3, Math.min(12, parseInt(pointsInput.value) || 5));
        pointsInput.value = String(points);
        this.toolOptions.set(tool.id, { ...this.toolOptions.get(tool.id), points });
        // Apply to actual tool
        const starTool = this.runtime.getStarTool();
        if (starTool) {
          starTool.setPoints(points);
        }
      });

      pointsInput.addEventListener('click', (e) => e.stopPropagation());

      row.appendChild(pointsLabel);
      row.appendChild(pointsInput);
    }

    return row;
  }

  private selectGroupTool(group: ToolGroup, tool: ToolDefinition): void {
    this.selectedGroupTools.set(group.id, tool.id);

    // Update the group button icon
    const button = this.buttons.get(group.id);
    if (button) {
      const iconContainer = button.querySelector('.icon-container');
      if (iconContainer) {
        iconContainer.innerHTML = tool.icon;
      }
      button.title = `${tool.name} (${tool.shortcut}) - Click and hold for more`;
    }

    // Apply tool options before activating
    this.applyToolOptions(tool.id);

    // Activate the tool
    this.runtime.setTool(tool.id);
    this.closePopup();
  }

  private applyToolOptions(toolId: string): void {
    const options = this.toolOptions.get(toolId);
    if (!options) return;

    if (toolId === 'polygon' && options.sides) {
      const polygonTool = this.runtime.getPolygonTool();
      if (polygonTool) {
        polygonTool.setSides(options.sides);
      }
    } else if (toolId === 'star' && options.points) {
      const starTool = this.runtime.getStarTool();
      if (starTool) {
        starTool.setPoints(options.points);
      }
    }
  }

  private closePopup(): void {
    if (this.activePopup) {
      this.activePopup.remove();
      this.activePopup = null;
    }
  }

  private addActionButtons(): void {
    if (!this.element) return;

    const zoomInIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>`;

    const zoomOutIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>`;

    const zoomFitIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
    </svg>`;

    // Zoom controls
    const zoomIn = this.createActionButton(zoomInIcon, 'Zoom In', () => {
      const zoom = this.runtime.getZoom();
      this.runtime.setZoom(zoom * 1.2);
    });

    const zoomOut = this.createActionButton(zoomOutIcon, 'Zoom Out', () => {
      const zoom = this.runtime.getZoom();
      this.runtime.setZoom(zoom / 1.2);
    });

    const zoomFit = this.createActionButton(zoomFitIcon, 'Zoom to Fit', () => {
      this.runtime.zoomToFit();
    });

    this.element.appendChild(zoomOut);
    this.element.appendChild(zoomFit);
    this.element.appendChild(zoomIn);
  }

  private createActionButton(
    icon: string,
    title: string,
    onClick: () => void
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'designlibre-toolbar-action';
    button.title = title;
    button.innerHTML = icon;
    button.style.cssText = `
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
    });

    button.addEventListener('click', onClick);

    return button;
  }

  private setActiveButton(toolId: string): void {
    // Find which group (if any) contains this tool
    let groupId: string | null = null;
    for (const group of TOOL_GROUPS) {
      if (group.tools.some(t => t.id === toolId)) {
        groupId = group.id;
        break;
      }
    }

    // Update standalone buttons
    for (const tool of STANDALONE_TOOLS) {
      const button = this.buttons.get(tool.id);
      if (button) {
        if (tool.id === toolId) {
          button.classList.add('active');
          button.style.backgroundColor = 'var(--designlibre-accent-light, #1a3a5c)';
          button.style.color = 'var(--designlibre-accent, #4dabff)';
        } else {
          button.classList.remove('active');
          button.style.backgroundColor = 'transparent';
          button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
        }
      }
    }

    // Update group buttons
    for (const group of TOOL_GROUPS) {
      const button = this.buttons.get(group.id);
      if (button) {
        if (group.id === groupId) {
          button.classList.add('active');
          button.style.backgroundColor = 'var(--designlibre-accent-light, #1a3a5c)';
          button.style.color = 'var(--designlibre-accent, #4dabff)';
        } else {
          button.classList.remove('active');
          button.style.backgroundColor = 'transparent';
          button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
        }
      }
    }
  }

  /**
   * Get tool options for a specific tool.
   */
  getToolOptions(toolId: string): ToolOptions | undefined {
    return this.toolOptions.get(toolId);
  }

  /**
   * Show the toolbar.
   */
  show(): void {
    if (this.element) {
      this.element.style.display = 'flex';
    }
  }

  /**
   * Hide the toolbar.
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Dispose of the toolbar.
   */
  dispose(): void {
    if (this.element) {
      this.container.removeChild(this.element);
    }
  }
}

/**
 * Create a toolbar.
 */
export function createToolbar(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: ToolbarOptions
): Toolbar {
  return new Toolbar(runtime, container, options);
}
