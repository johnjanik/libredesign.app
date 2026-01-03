/**
 * Side Panel
 *
 * Collapsible, resizable panel container.
 * Hosts child components like WorkspaceSelector, LayerTree, etc.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';

/**
 * Side panel options
 */
export interface SidePanelOptions {
  /** Initial width in pixels */
  width?: number;
  /** Minimum width */
  minWidth?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Position of the panel */
  position?: 'left' | 'right';
  /** Initially collapsed */
  collapsed?: boolean;
  /** Storage key for persisting width */
  storageKey?: string;
}

/**
 * Side Panel Component
 */
export class SidePanel {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private contentElement: HTMLElement | null = null;
  private resizeHandle: HTMLElement | null = null;
  private options: Required<SidePanelOptions>;

  private width: number;
  private collapsed: boolean;
  private isResizing: boolean = false;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: SidePanelOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.options = {
      width: options.width ?? 280,
      minWidth: options.minWidth ?? 200,
      maxWidth: options.maxWidth ?? 480,
      position: options.position ?? 'left',
      collapsed: options.collapsed ?? false,
      storageKey: options.storageKey ?? 'designlibre-side-panel',
    };

    // Load persisted width
    this.width = this.loadWidth();
    this.collapsed = this.options.collapsed;

    this.setup();
    this.setupEventListeners();
  }

  private loadWidth(): number {
    try {
      const stored = localStorage.getItem(`${this.options.storageKey}-width`);
      if (stored) {
        const width = parseInt(stored, 10);
        if (width >= this.options.minWidth && width <= this.options.maxWidth) {
          return width;
        }
      }
    } catch {
      // localStorage not available
    }
    return this.options.width;
  }

  private saveWidth(): void {
    try {
      localStorage.setItem(`${this.options.storageKey}-width`, String(this.width));
    } catch {
      // localStorage not available
    }
  }

  private setup(): void {
    // Create panel wrapper
    this.element = document.createElement('aside');
    this.element.className = 'designlibre-side-panel';
    this.element.setAttribute('role', 'complementary');
    this.element.setAttribute('aria-label', 'Side panel');
    this.element.style.cssText = this.getPanelStyles();

    // Create content area
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'side-panel-content';
    this.contentElement.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    `;
    this.element.appendChild(this.contentElement);

    // Create resize handle
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'side-panel-resize-handle';
    this.resizeHandle.style.cssText = this.getResizeHandleStyles();
    this.resizeHandle.setAttribute('role', 'separator');
    this.resizeHandle.setAttribute('aria-orientation', 'vertical');
    this.resizeHandle.setAttribute('aria-valuenow', String(this.width));
    this.resizeHandle.setAttribute('aria-valuemin', String(this.options.minWidth));
    this.resizeHandle.setAttribute('aria-valuemax', String(this.options.maxWidth));
    this.element.appendChild(this.resizeHandle);

    this.container.appendChild(this.element);

    // Setup resize interaction
    this.setupResize();
  }

  private getPanelStyles(): string {
    const isLeft = this.options.position === 'left';

    return `
      display: ${this.collapsed ? 'none' : 'flex'};
      flex-direction: row;
      width: ${this.width}px;
      height: 100%;
      background: var(--designlibre-bg-secondary, #1e1e1e);
      border-${isLeft ? 'right' : 'left'}: 1px solid var(--designlibre-border, #2d2d2d);
      position: relative;
      flex-shrink: 0;
      overflow: hidden;
    `;
  }

  private getResizeHandleStyles(): string {
    const isLeft = this.options.position === 'left';

    return `
      position: absolute;
      top: 0;
      ${isLeft ? 'right: -3px' : 'left: -3px'};
      width: 6px;
      height: 100%;
      cursor: col-resize;
      z-index: 10;
      background: transparent;
      transition: background-color 0.15s;
    `;
  }

  private setupResize(): void {
    if (!this.resizeHandle) return;

    // Hover effect
    this.resizeHandle.addEventListener('mouseenter', () => {
      if (!this.isResizing) {
        this.resizeHandle!.style.backgroundColor = 'var(--designlibre-accent, #0d99ff)';
      }
    });

    this.resizeHandle.addEventListener('mouseleave', () => {
      if (!this.isResizing) {
        this.resizeHandle!.style.backgroundColor = 'transparent';
      }
    });

    // Drag to resize
    this.resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startResize(e);
    });

    // Double-click to reset
    this.resizeHandle.addEventListener('dblclick', () => {
      this.setWidth(this.options.width);
    });
  }

  private startResize(startEvent: MouseEvent): void {
    this.isResizing = true;
    this.resizeHandle!.style.backgroundColor = 'var(--designlibre-accent, #0d99ff)';

    const startX = startEvent.clientX;
    const startWidth = this.width;
    const isLeft = this.options.position === 'left';

    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = isLeft ? startWidth + delta : startWidth - delta;
      this.setWidth(newWidth);
    };

    const onMouseUp = () => {
      this.isResizing = false;
      this.resizeHandle!.style.backgroundColor = 'transparent';
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.saveWidth();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  private setupEventListeners(): void {
    // Listen for sidebar toggle from nav rail
    window.addEventListener('designlibre-sidebar-toggle', ((e: CustomEvent) => {
      this.setCollapsed(!e.detail.open);
    }) as EventListener);
  }

  // ============================================================
  // Public API
  // ============================================================

  /** Set panel width */
  setWidth(width: number): void {
    this.width = Math.max(
      this.options.minWidth,
      Math.min(this.options.maxWidth, width)
    );

    if (this.element) {
      this.element.style.width = `${this.width}px`;
    }

    if (this.resizeHandle) {
      this.resizeHandle.setAttribute('aria-valuenow', String(this.width));
    }

    // Notify listeners
    window.dispatchEvent(
      new CustomEvent('designlibre-side-panel-resize', {
        detail: { width: this.width },
      })
    );
  }

  /** Get current width */
  getWidth(): number {
    return this.width;
  }

  /** Collapse the panel */
  collapse(): void {
    this.setCollapsed(true);
  }

  /** Expand the panel */
  expand(): void {
    this.setCollapsed(false);
  }

  /** Toggle collapsed state */
  toggle(): void {
    this.setCollapsed(!this.collapsed);
  }

  /** Set collapsed state */
  setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
    if (this.element) {
      this.element.style.display = collapsed ? 'none' : 'flex';
    }

    window.dispatchEvent(
      new CustomEvent('designlibre-side-panel-toggle', {
        detail: { collapsed: this.collapsed },
      })
    );
  }

  /** Check if collapsed */
  isCollapsed(): boolean {
    return this.collapsed;
  }

  /** Get content element for appending child components */
  getContentElement(): HTMLElement | null {
    return this.contentElement;
  }

  /** Add a section to the panel */
  addSection(element: HTMLElement, options?: { flex?: boolean }): void {
    if (!this.contentElement) return;

    if (options?.flex) {
      element.style.flex = '1';
      element.style.minHeight = '0';
    }

    this.contentElement.appendChild(element);
  }

  /** Add a divider */
  addDivider(): void {
    if (!this.contentElement) return;

    const divider = document.createElement('div');
    divider.className = 'side-panel-divider';
    divider.style.cssText = `
      height: 1px;
      background: var(--designlibre-border, #2d2d2d);
      margin: 0;
      flex-shrink: 0;
    `;
    this.contentElement.appendChild(divider);
  }

  /** Get the panel element */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /** Get the runtime */
  getRuntime(): DesignLibreRuntime {
    return this.runtime;
  }

  /** Dispose of the panel */
  dispose(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
      this.contentElement = null;
      this.resizeHandle = null;
    }
  }
}

/**
 * Create a side panel instance
 */
export function createSidePanel(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: SidePanelOptions
): SidePanel {
  return new SidePanel(runtime, container, options);
}
