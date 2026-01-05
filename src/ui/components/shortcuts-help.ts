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
    this.overlay.className = 'designlibre-shortcuts-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-10000 opacity-0 transition-opacity';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'designlibre-shortcuts-modal w-150 max-w-[calc(100vw-64px)] max-h-[calc(100vh-64px)] bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden';

    // Header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between px-5 py-4 border-b border-border';

    const title = document.createElement('h2');
    title.textContent = 'Keyboard Shortcuts';
    title.className = 'm-0 text-lg font-semibold text-content';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    closeBtn.title = 'Close (Escape)';
    closeBtn.className = 'flex p-1.5 border-none bg-transparent text-content-secondary cursor-pointer rounded hover:bg-surface-secondary hover:text-content transition-colors';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    this.modal.appendChild(header);

    // Search bar
    const searchBar = document.createElement('div');
    searchBar.className = 'px-5 py-3 border-b border-border';

    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search shortcuts...';
    this.searchInput.className = 'w-full px-3.5 py-2.5 border border-border rounded-md bg-surface-secondary text-content text-sm outline-none box-border focus:border-accent';
    this.searchInput.addEventListener('input', () => {
      this.searchQuery = this.searchInput?.value.toLowerCase() ?? '';
      this.renderShortcuts();
    });
    searchBar.appendChild(this.searchInput);
    this.modal.appendChild(searchBar);

    // Content
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'flex-1 overflow-y-auto p-5';
    this.renderShortcuts();
    this.modal.appendChild(this.contentContainer);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'px-5 py-3 border-t border-border flex justify-between items-center';

    const hint = document.createElement('span');
    hint.textContent = 'Press ? to show this dialog';
    hint.className = 'text-xs text-content-muted';
    footer.appendChild(hint);

    const customizeBtn = document.createElement('button');
    customizeBtn.textContent = 'Customize Shortcuts';
    customizeBtn.className = 'px-4 py-2 border border-border bg-transparent text-content text-xs rounded cursor-pointer hover:bg-surface-secondary transition-colors';
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
      categoryHeader.className = `text-xs font-semibold text-content-secondary uppercase tracking-wide py-3 pb-2 border-b border-surface-tertiary ${this.contentContainer.children.length > 0 ? 'mt-4' : ''}`;
      categoryHeader.textContent = CATEGORY_NAMES[category];
      this.contentContainer.appendChild(categoryHeader);

      // Shortcuts list
      const list = document.createElement('div');
      list.className = 'flex flex-col';

      for (const action of actions) {
        const row = this.createShortcutRow(action, hotkeyManager.getShortcut(action.id));
        list.appendChild(row);
      }

      this.contentContainer.appendChild(list);
    }

    // No results message
    if (!hasResults) {
      const noResults = document.createElement('div');
      noResults.className = 'text-center py-10 px-5 text-content-muted';
      noResults.textContent = this.searchQuery
        ? 'No shortcuts match your search'
        : 'No shortcuts available';
      this.contentContainer.appendChild(noResults);
    }
  }

  private createShortcutRow(action: HotkeyAction, shortcut: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'flex justify-between items-center py-2.5 border-b border-surface-tertiary';

    const name = document.createElement('span');
    name.textContent = action.name;
    name.className = 'text-sm text-content';
    row.appendChild(name);

    const kbd = document.createElement('kbd');
    kbd.textContent = this.formatShortcut(shortcut);
    kbd.className = 'px-2 py-1 bg-surface-secondary border border-border rounded font-mono text-[11px] text-content-secondary';
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
