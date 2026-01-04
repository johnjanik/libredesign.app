/**
 * Keyboard Shortcuts Help Dialog
 *
 * Displays all available keyboard shortcuts in a searchable modal.
 */

import { getHotkeyManager, type HotkeyAction } from '@core/hotkeys/hotkey-manager';

/**
 * Shortcuts help options
 */
export interface ShortcutsHelpOptions {
  onClose?: () => void;
}

/**
 * Category display names
 */
const CATEGORY_NAMES: Record<HotkeyAction['category'], string> = {
  common: 'Common Actions',
  tools: 'Tools',
  view: 'View',
  ai: 'AI Assistant',
};

/**
 * Category order
 */
const CATEGORY_ORDER: HotkeyAction['category'][] = ['common', 'tools', 'view', 'ai'];

/**
 * Shortcuts Help Dialog
 */
export class ShortcutsHelpDialog {
  private overlay: HTMLElement | null = null;
  private modal: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private contentContainer: HTMLElement | null = null;
  private options: Required<ShortcutsHelpOptions>;
  private searchQuery = '';

  constructor(options: ShortcutsHelpOptions = {}) {
    this.options = {
      onClose: options.onClose ?? (() => {}),
    };
  }

  /**
   * Show the shortcuts help dialog
   */
  show(): void {
    this.render();
    document.body.style.overflow = 'hidden';
    this.searchInput?.focus();
  }

  /**
   * Close the dialog
   */
  close(): void {
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this.handleKeyDown);

    if (this.overlay) {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
        this.modal = null;
        this.searchInput = null;
        this.contentContainer = null;
        this.options.onClose();
      }, 150);
    }
  }

  private render(): void {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'designlibre-shortcuts-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'designlibre-shortcuts-modal';
    this.modal.style.cssText = `
      width: 600px;
      max-width: calc(100vw - 64px);
      max-height: calc(100vh - 64px);
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 12px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
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
      padding: 16px 20px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    const title = document.createElement('h2');
    title.textContent = 'Keyboard Shortcuts';
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    closeBtn.title = 'Close (Escape)';
    closeBtn.style.cssText = `
      display: flex;
      padding: 6px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-secondary, #888);
      cursor: pointer;
      border-radius: 4px;
    `;
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    this.modal.appendChild(header);

    // Search bar
    const searchBar = document.createElement('div');
    searchBar.style.cssText = 'padding: 12px 20px; border-bottom: 1px solid var(--designlibre-border, #3d3d3d);';

    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search shortcuts...';
    this.searchInput.style.cssText = `
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
    `;
    this.searchInput.addEventListener('input', () => {
      this.searchQuery = this.searchInput?.value.toLowerCase() ?? '';
      this.renderShortcuts();
    });
    searchBar.appendChild(this.searchInput);
    this.modal.appendChild(searchBar);

    // Content
    this.contentContainer = document.createElement('div');
    this.contentContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    `;
    this.renderShortcuts();
    this.modal.appendChild(this.contentContainer);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 12px 20px;
      border-top: 1px solid var(--designlibre-border, #3d3d3d);
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const hint = document.createElement('span');
    hint.textContent = 'Press ? to show this dialog';
    hint.style.cssText = 'font-size: 12px; color: var(--designlibre-text-muted, #6a6a6a);';
    footer.appendChild(hint);

    const customizeBtn = document.createElement('button');
    customizeBtn.textContent = 'Customize Shortcuts';
    customizeBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      background: transparent;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 12px;
      border-radius: 4px;
      cursor: pointer;
    `;
    customizeBtn.addEventListener('click', () => {
      this.close();
      // Open settings modal to hotkeys tab
      import('./settings-modal').then(({ openSettingsModal }) => {
        openSettingsModal('hotkeys');
      });
    });
    footer.appendChild(customizeBtn);

    this.modal.appendChild(footer);

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);

    // Animate in
    requestAnimationFrame(() => {
      if (this.overlay) {
        this.overlay.style.opacity = '1';
      }
    });

    // Keyboard handler
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.close();
    }
  };

  private renderShortcuts(): void {
    if (!this.contentContainer) return;
    this.contentContainer.innerHTML = '';

    const hotkeyManager = getHotkeyManager();
    const allActions = hotkeyManager.getAllActions();

    // Filter by search query
    const filteredActions = this.searchQuery
      ? allActions.filter(action =>
          action.name.toLowerCase().includes(this.searchQuery) ||
          hotkeyManager.getShortcut(action.id).toLowerCase().includes(this.searchQuery)
        )
      : allActions;

    // Group by category
    const grouped = new Map<HotkeyAction['category'], HotkeyAction[]>();
    for (const action of filteredActions) {
      if (!grouped.has(action.category)) {
        grouped.set(action.category, []);
      }
      grouped.get(action.category)!.push(action);
    }

    // Render categories in order
    let hasResults = false;
    for (const category of CATEGORY_ORDER) {
      const actions = grouped.get(category);
      if (!actions || actions.length === 0) continue;

      hasResults = true;

      // Category header
      const categoryHeader = document.createElement('div');
      categoryHeader.style.cssText = `
        font-size: 12px;
        font-weight: 600;
        color: var(--designlibre-text-secondary, #888);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 12px 0 8px;
        margin-top: ${this.contentContainer.children.length > 0 ? '16px' : '0'};
        border-bottom: 1px solid var(--designlibre-border-light, #252525);
      `;
      categoryHeader.textContent = CATEGORY_NAMES[category];
      this.contentContainer.appendChild(categoryHeader);

      // Shortcuts list
      const list = document.createElement('div');
      list.style.cssText = 'display: flex; flex-direction: column;';

      for (const action of actions) {
        const row = this.createShortcutRow(action, hotkeyManager.getShortcut(action.id));
        list.appendChild(row);
      }

      this.contentContainer.appendChild(list);
    }

    // No results message
    if (!hasResults) {
      const noResults = document.createElement('div');
      noResults.style.cssText = `
        text-align: center;
        padding: 40px 20px;
        color: var(--designlibre-text-muted, #6a6a6a);
      `;
      noResults.textContent = this.searchQuery
        ? 'No shortcuts match your search'
        : 'No shortcuts available';
      this.contentContainer.appendChild(noResults);
    }
  }

  private createShortcutRow(action: HotkeyAction, shortcut: string): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--designlibre-border-light, #202020);
    `;

    const name = document.createElement('span');
    name.textContent = action.name;
    name.style.cssText = 'font-size: 13px; color: var(--designlibre-text-primary, #e4e4e4);';
    row.appendChild(name);

    const kbd = document.createElement('kbd');
    kbd.textContent = this.formatShortcut(shortcut);
    kbd.style.cssText = `
      padding: 4px 8px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 11px;
      color: var(--designlibre-text-secondary, #888);
    `;
    row.appendChild(kbd);

    return row;
  }

  private formatShortcut(shortcut: string): string {
    // Format shortcut for display (e.g., Ctrl becomes Cmd on Mac)
    const isMac = navigator.platform.includes('Mac');
    if (isMac) {
      return shortcut
        .replace(/Ctrl\+/g, '\u2318')
        .replace(/Alt\+/g, '\u2325')
        .replace(/Shift\+/g, '\u21E7');
    }
    return shortcut;
  }
}

/**
 * Show the keyboard shortcuts help dialog
 */
export function showShortcutsHelp(options?: ShortcutsHelpOptions): ShortcutsHelpDialog {
  const dialog = new ShortcutsHelpDialog(options);
  dialog.show();
  return dialog;
}

/**
 * Set up global keyboard shortcut to show help (? key)
 */
export function setupShortcutsHelpHotkey(): void {
  document.addEventListener('keydown', (e) => {
    // Show help on ? key (Shift + /)
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Don't trigger if in an input field
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return;
      }

      e.preventDefault();
      showShortcutsHelp();
    }
  });
}
