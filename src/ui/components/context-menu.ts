/**
 * Context Menu
 *
 * Right-click context menu with context-aware options.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';

/**
 * Menu item definition
 */
export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string | undefined;
  icon?: string | undefined;
  disabled?: boolean | undefined;
  separator?: boolean | undefined;
  submenu?: MenuItem[] | undefined;
  action?: (() => void) | undefined;
}

/**
 * Context menu options
 */
export interface ContextMenuOptions {
  /** Animation duration in ms */
  animationDuration?: number;
}

/**
 * Context type for determining menu items
 */
type ContextType = 'canvas' | 'selection' | 'single' | 'multiple';

/**
 * SVG icons for menu items
 */
const MENU_ICONS: Record<string, string> = {
  cut: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
    <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
    <line x1="8.12" y1="8.12" x2="12" y2="12"/>
  </svg>`,
  copy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`,
  paste: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>`,
  duplicate: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="8" y="8" width="12" height="12" rx="2"/>
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>
  </svg>`,
  delete: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`,
  group: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>`,
  ungroup: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    <line x1="10" y1="12" x2="14" y2="12" stroke-dasharray="2 2"/>
  </svg>`,
  bringFront: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="8" y="8" width="12" height="12" fill="currentColor" opacity="0.3"/>
    <rect x="4" y="4" width="12" height="12"/>
  </svg>`,
  sendBack: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="4" y="4" width="12" height="12" fill="currentColor" opacity="0.3"/>
    <rect x="8" y="8" width="12" height="12"/>
  </svg>`,
  lock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`,
  unlock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>`,
  hide: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`,
  rename: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`,
  selectAll: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/>
  </svg>`,
  zoomIn: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
  </svg>`,
  zoomOut: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>`,
  zoomFit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
  </svg>`,
  undo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
  </svg>`,
  redo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
  </svg>`,
  flipH: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 3v18M16 7l5 5-5 5M8 7l-5 5 5 5"/>
  </svg>`,
  flipV: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 12h18M7 8l5-5 5 5M7 16l5 5 5-5"/>
  </svg>`,
  component: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
    <line x1="12" y1="22" x2="12" y2="15.5"/><line x1="22" y1="8.5" x2="12" y2="15.5"/>
    <line x1="2" y1="8.5" x2="12" y2="15.5"/>
  </svg>`,
  detach: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`,
  frame: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
    <line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
  </svg>`,
  copyProps: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    <path d="M12 16h6" stroke-width="1.5"/><path d="M12 19h4" stroke-width="1.5"/>
  </svg>`,
  pasteProps: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14h6" stroke-width="1.5"/>
    <path d="M9 17h4" stroke-width="1.5"/>
  </svg>`,
  boolean: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="9" cy="9" r="6"/><circle cx="15" cy="15" r="6"/>
  </svg>`,
  flatten: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
  </svg>`,
  outline: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 3L2 12h3v9h14v-9h3L12 3z"/>
  </svg>`,
  mask: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.3"/>
  </svg>`,
};

/**
 * Context Menu Component
 */
export class ContextMenu {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement | null = null;
  private menuElement: HTMLElement | null = null;
  private options: Required<ContextMenuOptions>;
  private isVisible = false;
  private targetNodeIds: NodeId[] = [];

  constructor(runtime: DesignLibreRuntime, options: ContextMenuOptions = {}) {
    this.runtime = runtime;
    this.options = {
      animationDuration: options.animationDuration ?? 150,
    };

    this.createContainer();
    this.attachEventListeners();
  }

  /**
   * Create the menu container element.
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = 'designlibre-context-menu-container';
    this.container.innerHTML = `
      <style>
        .designlibre-context-menu-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
          pointer-events: none;
        }

        .designlibre-context-menu {
          position: absolute;
          background: var(--designlibre-bg-secondary, #2d2d2d);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: var(--designlibre-radius, 8px);
          box-shadow: var(--designlibre-shadow, 0 4px 12px rgba(0, 0, 0, 0.4));
          min-width: 200px;
          padding: 4px 0;
          pointer-events: auto;
          opacity: 0;
          transform: scale(0.95);
          transform-origin: top left;
          transition: opacity ${this.options.animationDuration}ms ease, transform ${this.options.animationDuration}ms ease;
        }

        .designlibre-context-menu.visible {
          opacity: 1;
          transform: scale(1);
        }

        .designlibre-context-menu-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          cursor: pointer;
          color: var(--designlibre-text-primary, #e4e4e4);
          font-size: 13px;
          font-family: system-ui, -apple-system, sans-serif;
          transition: background ${this.options.animationDuration}ms ease;
        }

        .designlibre-context-menu-item:hover:not(.disabled) {
          background: var(--designlibre-accent-light, #1a3a5c);
        }

        .designlibre-context-menu-item.disabled {
          color: var(--designlibre-text-muted, #6a6a6a);
          cursor: not-allowed;
        }

        .designlibre-context-menu-item-icon {
          width: 16px;
          height: 16px;
          margin-right: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
        }

        .designlibre-context-menu-item-icon svg {
          width: 16px;
          height: 16px;
        }

        .designlibre-context-menu-item-label {
          flex: 1;
        }

        .designlibre-context-menu-item-shortcut {
          color: var(--designlibre-text-muted, #6a6a6a);
          font-size: 12px;
          margin-left: 20px;
        }

        .designlibre-context-menu-separator {
          height: 1px;
          background: var(--designlibre-border, #3d3d3d);
          margin: 4px 8px;
        }

        .designlibre-context-menu-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: auto;
        }
      </style>
      <div class="designlibre-context-menu-backdrop"></div>
    `;

    document.body.appendChild(this.container);

    // Close on backdrop click
    const backdrop = this.container.querySelector('.designlibre-context-menu-backdrop');
    backdrop?.addEventListener('click', () => this.hide());
    backdrop?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.hide();
    });
  }

  /**
   * Attach global event listeners.
   */
  private attachEventListeners(): void {
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Close on scroll
    document.addEventListener('scroll', () => {
      if (this.isVisible) {
        this.hide();
      }
    }, true);
  }

  /**
   * Show the context menu at specified position.
   */
  show(x: number, y: number, targetNodeIds: NodeId[] = []): void {
    if (!this.container) return;

    this.targetNodeIds = targetNodeIds;
    this.hide(); // Close any existing menu

    // Determine context type
    const contextType = this.getContextType();
    const items = this.getMenuItems(contextType);

    // Create menu element
    this.menuElement = document.createElement('div');
    this.menuElement.className = 'designlibre-context-menu';
    this.renderMenuItems(items);

    this.container.appendChild(this.menuElement);

    // Position menu (ensure it stays within viewport)
    const menuRect = this.menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let menuX = x;
    let menuY = y;

    if (x + menuRect.width > viewportWidth) {
      menuX = viewportWidth - menuRect.width - 8;
    }
    if (y + menuRect.height > viewportHeight) {
      menuY = viewportHeight - menuRect.height - 8;
    }

    this.menuElement.style.left = `${Math.max(8, menuX)}px`;
    this.menuElement.style.top = `${Math.max(8, menuY)}px`;

    // Trigger animation
    requestAnimationFrame(() => {
      this.menuElement?.classList.add('visible');
    });

    this.isVisible = true;
  }

  /**
   * Hide the context menu.
   */
  hide(): void {
    if (this.menuElement) {
      this.menuElement.classList.remove('visible');
      setTimeout(() => {
        this.menuElement?.remove();
        this.menuElement = null;
      }, this.options.animationDuration);
    }
    this.isVisible = false;
  }

  /**
   * Get the context type based on selection.
   */
  private getContextType(): ContextType {
    if (this.targetNodeIds.length === 0) {
      return 'canvas';
    } else if (this.targetNodeIds.length === 1) {
      return 'single';
    } else {
      return 'multiple';
    }
  }

  /**
   * Get menu items based on context type.
   */
  private getMenuItems(contextType: ContextType): MenuItem[] {
    const keyboardManager = this.runtime.getKeyboardManager();
    const hasClipboard = keyboardManager?.hasClipboardContent() ?? false;

    switch (contextType) {
      case 'canvas':
        return this.getCanvasMenuItems(hasClipboard);
      case 'single':
      case 'multiple':
        return this.getSelectionMenuItems(hasClipboard, contextType === 'multiple');
      default:
        return [];
    }
  }

  /**
   * Get menu items for canvas context (no selection).
   */
  private getCanvasMenuItems(hasClipboard: boolean): MenuItem[] {
    const keyboardManager = this.runtime.getKeyboardManager();

    return [
      {
        id: 'undo',
        label: 'Undo',
        shortcut: 'Ctrl+Z',
        icon: MENU_ICONS['undo'],
        action: () => { keyboardManager?.actionUndo(); },
      },
      {
        id: 'redo',
        label: 'Redo',
        shortcut: 'Ctrl+Shift+Z',
        icon: MENU_ICONS['redo'],
        action: () => { keyboardManager?.actionRedo(); },
      },
      { id: 'sep0', label: '', separator: true },
      {
        id: 'paste',
        label: 'Paste',
        shortcut: 'Ctrl+V',
        icon: MENU_ICONS['paste'],
        disabled: !hasClipboard,
        action: () => { keyboardManager?.pasteFromClipboard(); },
      },
      { id: 'sep1', label: '', separator: true },
      {
        id: 'selectAll',
        label: 'Select All',
        shortcut: 'Ctrl+A',
        icon: MENU_ICONS['selectAll'],
        action: () => this.runtime.getSelectionManager().selectAll(),
      },
      { id: 'sep2', label: '', separator: true },
      {
        id: 'zoomIn',
        label: 'Zoom In',
        shortcut: 'Ctrl++',
        icon: MENU_ICONS['zoomIn'],
        action: () => { this.runtime.getViewport()?.zoomIn(); },
      },
      {
        id: 'zoomOut',
        label: 'Zoom Out',
        shortcut: 'Ctrl+-',
        icon: MENU_ICONS['zoomOut'],
        action: () => { this.runtime.getViewport()?.zoomOut(); },
      },
      {
        id: 'zoomFit',
        label: 'Zoom to Fit',
        shortcut: 'Home',
        icon: MENU_ICONS['zoomFit'],
        action: () => { keyboardManager?.actionZoomToFit(); },
      },
      {
        id: 'zoom100',
        label: 'Zoom to 100%',
        shortcut: 'Ctrl+0',
        action: () => { this.runtime.getViewport()?.setZoom(1); },
      },
    ];
  }

  /**
   * Get menu items for selection context.
   */
  private getSelectionMenuItems(hasClipboard: boolean, isMultiple: boolean): MenuItem[] {
    const keyboardManager = this.runtime.getKeyboardManager();

    return [
      {
        id: 'cut',
        label: 'Cut',
        shortcut: 'Ctrl+X',
        icon: MENU_ICONS['cut'],
        action: () => { keyboardManager?.actionCut(); },
      },
      {
        id: 'copy',
        label: 'Copy',
        shortcut: 'Ctrl+C',
        icon: MENU_ICONS['copy'],
        action: () => { keyboardManager?.actionCopy(); },
      },
      {
        id: 'paste',
        label: 'Paste',
        shortcut: 'Ctrl+V',
        icon: MENU_ICONS['paste'],
        disabled: !hasClipboard,
        action: () => { keyboardManager?.pasteFromClipboard(); },
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        shortcut: 'Ctrl+D',
        icon: MENU_ICONS['duplicate'],
        action: () => { keyboardManager?.actionDuplicate(); },
      },
      { id: 'sep1', label: '', separator: true },
      {
        id: 'copyProperties',
        label: 'Copy Properties',
        icon: MENU_ICONS['copyProps'],
        action: () => { this.runtime.emit('command:copyProperties', {}); },
      },
      {
        id: 'pasteProperties',
        label: 'Paste Properties',
        icon: MENU_ICONS['pasteProps'],
        disabled: true, // TODO: Enable when properties are in clipboard
        action: () => { this.runtime.emit('command:pasteProperties', {}); },
      },
      { id: 'sep2', label: '', separator: true },
      {
        id: 'delete',
        label: 'Delete',
        shortcut: 'Delete',
        icon: MENU_ICONS['delete'],
        action: () => { keyboardManager?.actionDelete(); },
      },
      {
        id: 'rename',
        label: 'Rename',
        shortcut: 'F2',
        icon: MENU_ICONS['rename'],
        disabled: isMultiple,
        action: () => this.runtime.emit('command:rename', {}),
      },
      { id: 'sep3', label: '', separator: true },
      {
        id: 'flipHorizontal',
        label: 'Flip Horizontal',
        shortcut: 'Shift+H',
        icon: MENU_ICONS['flipH'],
        action: () => { this.runtime.emit('command:flipHorizontal', {}); },
      },
      {
        id: 'flipVertical',
        label: 'Flip Vertical',
        shortcut: 'Shift+V',
        icon: MENU_ICONS['flipV'],
        action: () => { this.runtime.emit('command:flipVertical', {}); },
      },
      { id: 'sep4', label: '', separator: true },
      {
        id: 'group',
        label: 'Group',
        shortcut: 'Ctrl+G',
        icon: MENU_ICONS['group'],
        disabled: !isMultiple,
        action: () => { keyboardManager?.actionGroup(); },
      },
      {
        id: 'ungroup',
        label: 'Ungroup',
        shortcut: 'Ctrl+Shift+G',
        icon: MENU_ICONS['ungroup'],
        action: () => { keyboardManager?.actionUngroup(); },
      },
      {
        id: 'frameSelection',
        label: 'Frame Selection',
        shortcut: 'Ctrl+Alt+G',
        icon: MENU_ICONS['frame'],
        action: () => { this.runtime.emit('command:frameSelection', {}); },
      },
      { id: 'sep5', label: '', separator: true },
      {
        id: 'createComponent',
        label: 'Create Component',
        shortcut: 'Ctrl+Alt+K',
        icon: MENU_ICONS['component'],
        action: () => { this.runtime.emit('command:createComponent', {}); },
      },
      {
        id: 'detachInstance',
        label: 'Detach Instance',
        icon: MENU_ICONS['detach'],
        action: () => { this.runtime.emit('command:detachInstance', {}); },
      },
      { id: 'sep6', label: '', separator: true },
      {
        id: 'booleanUnion',
        label: 'Union',
        icon: MENU_ICONS['boolean'],
        disabled: !isMultiple,
        action: () => { this.runtime.emit('command:booleanUnion', {}); },
      },
      {
        id: 'booleanSubtract',
        label: 'Subtract',
        icon: MENU_ICONS['boolean'],
        disabled: !isMultiple,
        action: () => { this.runtime.emit('command:booleanSubtract', {}); },
      },
      {
        id: 'booleanIntersect',
        label: 'Intersect',
        icon: MENU_ICONS['boolean'],
        disabled: !isMultiple,
        action: () => { this.runtime.emit('command:booleanIntersect', {}); },
      },
      {
        id: 'booleanExclude',
        label: 'Exclude',
        icon: MENU_ICONS['boolean'],
        disabled: !isMultiple,
        action: () => { this.runtime.emit('command:booleanExclude', {}); },
      },
      { id: 'sep7', label: '', separator: true },
      {
        id: 'bringToFront',
        label: 'Bring to Front',
        shortcut: 'Ctrl+Shift+]',
        icon: MENU_ICONS['bringFront'],
        action: () => { keyboardManager?.actionBringToFront(); },
      },
      {
        id: 'bringForward',
        label: 'Bring Forward',
        shortcut: 'Ctrl+]',
        action: () => { keyboardManager?.actionBringForward(); },
      },
      {
        id: 'sendBackward',
        label: 'Send Backward',
        shortcut: 'Ctrl+[',
        action: () => { keyboardManager?.actionSendBackward(); },
      },
      {
        id: 'sendToBack',
        label: 'Send to Back',
        shortcut: 'Ctrl+Shift+[',
        icon: MENU_ICONS['sendBack'],
        action: () => { keyboardManager?.actionSendToBack(); },
      },
      { id: 'sep8', label: '', separator: true },
      {
        id: 'lock',
        label: 'Lock',
        shortcut: 'Ctrl+L',
        icon: MENU_ICONS['lock'],
        action: () => { keyboardManager?.actionLock(); },
      },
      {
        id: 'hide',
        label: 'Hide',
        shortcut: 'Ctrl+Shift+H',
        icon: MENU_ICONS['hide'],
        action: () => { keyboardManager?.actionHide(); },
      },
    ];
  }

  /**
   * Render menu items to the menu element.
   */
  private renderMenuItems(items: MenuItem[]): void {
    if (!this.menuElement) return;

    for (const item of items) {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.className = 'designlibre-context-menu-separator';
        this.menuElement.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = `designlibre-context-menu-item${item.disabled ? ' disabled' : ''}`;
        menuItem.innerHTML = `
          <span class="designlibre-context-menu-item-icon">${item.icon || ''}</span>
          <span class="designlibre-context-menu-item-label">${item.label}</span>
          ${item.shortcut ? `<span class="designlibre-context-menu-item-shortcut">${item.shortcut}</span>` : ''}
        `;

        if (!item.disabled && item.action) {
          menuItem.addEventListener('click', () => {
            this.hide();
            item.action!();
          });
        }

        this.menuElement.appendChild(menuItem);
      }
    }
  }

  /**
   * Dispose of the context menu.
   */
  dispose(): void {
    this.hide();
    this.container?.remove();
    this.container = null;
  }
}

/**
 * Create a context menu.
 */
export function createContextMenu(
  runtime: DesignLibreRuntime,
  options?: ContextMenuOptions
): ContextMenu {
  return new ContextMenu(runtime, options);
}
