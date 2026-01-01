/**
 * Toolbar
 *
 * UI component for tool selection and common actions.
 */
/**
 * SVG icons for tools
 */
const TOOL_ICONS = {
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
    pen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    <path d="M2 2l7.586 7.586"/>
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
};
/**
 * Default tools
 */
const DEFAULT_TOOLS = [
    { id: 'select', name: 'Select', icon: TOOL_ICONS['select'], shortcut: 'V' },
    { id: 'hand', name: 'Hand', icon: TOOL_ICONS['hand'], shortcut: 'H' },
    { id: 'rectangle', name: 'Rectangle', icon: TOOL_ICONS['rectangle'], shortcut: 'R' },
    { id: 'ellipse', name: 'Ellipse', icon: TOOL_ICONS['ellipse'], shortcut: 'O' },
    { id: 'line', name: 'Line', icon: TOOL_ICONS['line'], shortcut: 'L' },
    { id: 'pen', name: 'Pen', icon: TOOL_ICONS['pen'], shortcut: 'P' },
    { id: 'text', name: 'Text', icon: TOOL_ICONS['text'], shortcut: 'T' },
];
/**
 * Toolbar
 */
export class Toolbar {
    runtime;
    container;
    element = null;
    options;
    tools;
    buttons = new Map();
    constructor(runtime, container, options = {}) {
        this.runtime = runtime;
        this.container = container;
        this.options = {
            position: options.position ?? 'left',
            showLabels: options.showLabels ?? false,
        };
        this.tools = [...DEFAULT_TOOLS];
        this.setup();
    }
    setup() {
        // Create toolbar element
        this.element = document.createElement('div');
        this.element.className = 'designlibre-toolbar';
        this.element.style.cssText = this.getToolbarStyles();
        // Create tool buttons
        for (const tool of this.tools) {
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
    }
    getToolbarStyles() {
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
    getSeparatorStyles() {
        return this.options.position === 'top' || this.options.position === 'bottom'
            ? 'width: 1px; height: 24px; background: var(--designlibre-border, #3d3d3d); margin: 0 4px;'
            : 'width: 24px; height: 1px; background: var(--designlibre-border, #3d3d3d); margin: 4px 0;';
    }
    createToolButton(tool) {
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
    addActionButtons() {
        if (!this.element)
            return;
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
    createActionButton(icon, title, onClick) {
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
    setActiveButton(toolId) {
        for (const [id, button] of this.buttons) {
            if (id === toolId) {
                button.classList.add('active');
                button.style.backgroundColor = 'var(--designlibre-accent-light, #1a3a5c)';
                button.style.color = 'var(--designlibre-accent, #4dabff)';
            }
            else {
                button.classList.remove('active');
                button.style.backgroundColor = 'transparent';
                button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
            }
        }
    }
    /**
     * Add a custom tool.
     */
    addTool(tool) {
        this.tools.push(tool);
        if (this.element) {
            const button = this.createToolButton(tool);
            this.buttons.set(tool.id, button);
            // Insert before separator
            const separator = this.element.querySelector('.designlibre-toolbar-separator');
            if (separator) {
                this.element.insertBefore(button, separator);
            }
        }
    }
    /**
     * Remove a tool.
     */
    removeTool(toolId) {
        this.tools = this.tools.filter(t => t.id !== toolId);
        const button = this.buttons.get(toolId);
        if (button) {
            button.remove();
            this.buttons.delete(toolId);
        }
    }
    /**
     * Show the toolbar.
     */
    show() {
        if (this.element) {
            this.element.style.display = 'flex';
        }
    }
    /**
     * Hide the toolbar.
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }
    /**
     * Dispose of the toolbar.
     */
    dispose() {
        if (this.element) {
            this.container.removeChild(this.element);
        }
    }
}
/**
 * Create a toolbar.
 */
export function createToolbar(runtime, container, options) {
    return new Toolbar(runtime, container, options);
}
//# sourceMappingURL=toolbar.js.map