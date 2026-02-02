/**
 * Command Palette Component
 *
 * Quick-access command interface for power users.
 * Activated with Ctrl+K or /
 *
 * Features:
 * - Fuzzy search
 * - Keyboard navigation
 * - Command history
 * - Category filtering
 * - CLI-style input with arguments
 */

import {
  CommandRegistry,
  getGlobalCommandRegistry,
  type Command,
  type CommandContext,
  type CommandSearchResult,
} from '@core/commands/command-registry';

/**
 * Command palette options
 */
export interface CommandPaletteOptions {
  /** Custom command registry */
  readonly registry?: CommandRegistry;
  /** Maximum results to show */
  readonly maxResults?: number;
  /** Placeholder text */
  readonly placeholder?: string;
  /** Show category badges */
  readonly showCategories?: boolean;
  /** Show shortcuts */
  readonly showShortcuts?: boolean;
}

const DEFAULT_OPTIONS: Required<CommandPaletteOptions> = {
  registry: getGlobalCommandRegistry(),
  maxResults: 10,
  placeholder: 'Type a command or search...',
  showCategories: true,
  showShortcuts: true,
};

/**
 * Command Palette Component
 */
export class CommandPalette {
  private options: Required<CommandPaletteOptions>;
  private container: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private resultsList: HTMLElement | null = null;
  private visible = false;
  private selectedIndex = 0;
  private results: CommandSearchResult[] = [];
  private context: CommandContext | null = null;
  private inputHistory: string[] = [];
  private historyIndex = -1;

  // Callbacks
  private onClose?: () => void;
  private onCommandSelected?: (command: Command) => void;

  constructor(options: CommandPaletteOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.createContainer();
    this.setupGlobalShortcut();
  }

  /**
   * Set execution context
   */
  setContext(context: CommandContext): void {
    this.context = context;
  }

  /**
   * Set callbacks
   */
  setOnClose(callback: () => void): void {
    this.onClose = callback;
  }

  setOnCommandSelected(callback: (command: Command) => void): void {
    this.onCommandSelected = callback;
  }

  /**
   * Show the palette
   */
  show(): void {
    if (!this.container) return;

    this.visible = true;
    this.container.style.display = 'flex';
    this.selectedIndex = 0;
    this.historyIndex = -1;

    // Focus input
    if (this.input) {
      this.input.value = '';
      this.input.focus();
    }

    // Show all commands initially
    this.search('');
  }

  /**
   * Hide the palette
   */
  hide(): void {
    if (!this.container) return;

    this.visible = false;
    this.container.style.display = 'none';
    this.onClose?.();
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Create the container
   */
  private createContainer(): void {
    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'command-palette-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      display: none;
    `;
    backdrop.addEventListener('click', () => this.hide());

    // Container
    this.container = document.createElement('div');
    this.container.className = 'command-palette';
    this.container.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: 500px;
      max-width: 90vw;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 9999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #3c3c3c;
    `;

    // Search icon
    const searchIcon = document.createElement('span');
    searchIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>`;
    searchIcon.style.cssText = `
      color: #888888;
      margin-right: 12px;
      display: flex;
      align-items: center;
    `;
    inputContainer.appendChild(searchIcon);

    // Input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = this.options.placeholder;
    this.input.style.cssText = `
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #ffffff;
      font-size: 14px;
      font-family: inherit;
    `;
    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    inputContainer.appendChild(this.input);

    // Shortcut hint
    const shortcutHint = document.createElement('span');
    shortcutHint.textContent = 'ESC';
    shortcutHint.style.cssText = `
      color: #666666;
      font-size: 11px;
      padding: 2px 6px;
      background: #2d2d2d;
      border-radius: 3px;
      margin-left: 8px;
    `;
    inputContainer.appendChild(shortcutHint);

    this.container.appendChild(inputContainer);

    // Results list
    this.resultsList = document.createElement('div');
    this.resultsList.className = 'command-palette-results';
    this.resultsList.style.cssText = `
      max-height: 400px;
      overflow-y: auto;
      padding: 8px;
    `;
    this.container.appendChild(this.resultsList);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-top: 1px solid #3c3c3c;
      font-size: 11px;
      color: #666666;
    `;
    footer.innerHTML = `
      <span><kbd>↑↓</kbd> Navigate</span>
      <span><kbd>Enter</kbd> Execute</span>
      <span><kbd>Esc</kbd> Close</span>
    `;
    footer.querySelectorAll('kbd').forEach(kbd => {
      (kbd as HTMLElement).style.cssText = `
        background: #2d2d2d;
        padding: 2px 6px;
        border-radius: 3px;
        margin: 0 2px;
      `;
    });
    this.container.appendChild(footer);

    // Add to DOM
    document.body.appendChild(backdrop);
    document.body.appendChild(this.container);

    // Link backdrop visibility to container
    const observer = new MutationObserver(() => {
      backdrop.style.display = this.container?.style.display ?? 'none';
    });
    observer.observe(this.container, { attributes: true, attributeFilter: ['style'] });
  }

  /**
   * Setup global keyboard shortcut
   */
  private setupGlobalShortcut(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
      // Also allow '/' when not in an input
      if (e.key === '/' && !this.isInputFocused()) {
        e.preventDefault();
        this.show();
      }
    });
  }

  /**
   * Check if any input is focused
   */
  private isInputFocused(): boolean {
    const active = document.activeElement;
    return active instanceof HTMLInputElement ||
           active instanceof HTMLTextAreaElement ||
           (active as HTMLElement)?.isContentEditable === true;
  }

  /**
   * Handle input changes
   */
  private handleInput(): void {
    const query = this.input?.value ?? '';
    this.search(query);
    this.selectedIndex = 0;
    this.updateSelection();
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
        this.updateSelection();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
        // Also handle history navigation
        if (this.selectedIndex === 0 && this.input?.value === '') {
          this.navigateHistory(-1);
        }
        break;

      case 'Enter':
        e.preventDefault();
        this.executeSelected();
        break;

      case 'Escape':
        e.preventDefault();
        this.hide();
        break;

      case 'Tab':
        e.preventDefault();
        // Auto-complete with selected command name
        if (this.results[this.selectedIndex]) {
          const cmd = this.results[this.selectedIndex]!.command;
          if (this.input) {
            this.input.value = cmd.id + ' ';
            this.handleInput();
          }
        }
        break;
    }
  }

  /**
   * Navigate input history
   */
  private navigateHistory(direction: number): void {
    if (this.inputHistory.length === 0) return;

    this.historyIndex = Math.max(
      -1,
      Math.min(this.historyIndex + direction, this.inputHistory.length - 1)
    );

    if (this.input) {
      this.input.value = this.historyIndex >= 0
        ? this.inputHistory[this.historyIndex] ?? ''
        : '';
      this.handleInput();
    }
  }

  /**
   * Search commands
   */
  private search(query: string): void {
    const context = this.context ?? { selectedNodeIds: [] };
    this.results = this.options.registry.search(query, context)
      .slice(0, this.options.maxResults);
    this.renderResults();
  }

  /**
   * Render search results
   */
  private renderResults(): void {
    if (!this.resultsList) return;

    this.resultsList.innerHTML = '';

    if (this.results.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No commands found';
      empty.style.cssText = `
        padding: 16px;
        text-align: center;
        color: #666666;
      `;
      this.resultsList.appendChild(empty);
      return;
    }

    this.results.forEach((result, index) => {
      const item = this.createResultItem(result, index);
      this.resultsList?.appendChild(item);
    });
  }

  /**
   * Create a result item element
   */
  private createResultItem(result: CommandSearchResult, index: number): HTMLElement {
    const { command } = result;

    const item = document.createElement('div');
    item.className = 'command-palette-item';
    item.dataset['index'] = String(index);
    item.style.cssText = `
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.1s;
      ${index === this.selectedIndex ? 'background: #2d2d2d;' : ''}
    `;

    item.addEventListener('mouseenter', () => {
      this.selectedIndex = index;
      this.updateSelection();
    });

    item.addEventListener('click', () => {
      this.selectedIndex = index;
      this.executeSelected();
    });

    // Icon/category badge
    if (this.options.showCategories) {
      const badge = document.createElement('span');
      badge.textContent = command.category.slice(0, 3).toUpperCase();
      badge.style.cssText = `
        background: #3c3c3c;
        color: #888888;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 500;
        margin-right: 12px;
        min-width: 28px;
        text-align: center;
      `;
      item.appendChild(badge);
    }

    // Command info
    const info = document.createElement('div');
    info.style.cssText = 'flex: 1; min-width: 0;';

    const name = document.createElement('div');
    name.textContent = command.name;
    name.style.cssText = `
      color: #ffffff;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    info.appendChild(name);

    const desc = document.createElement('div');
    desc.textContent = command.description;
    desc.style.cssText = `
      color: #888888;
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    `;
    info.appendChild(desc);

    item.appendChild(info);

    // Shortcut
    if (this.options.showShortcuts && command.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.textContent = command.shortcut;
      shortcut.style.cssText = `
        color: #666666;
        font-size: 11px;
        padding: 2px 6px;
        background: #2d2d2d;
        border-radius: 3px;
        margin-left: 8px;
      `;
      item.appendChild(shortcut);
    }

    return item;
  }

  /**
   * Update selection highlighting
   */
  private updateSelection(): void {
    if (!this.resultsList) return;

    const items = this.resultsList.querySelectorAll('.command-palette-item');
    items.forEach((item, index) => {
      (item as HTMLElement).style.background = index === this.selectedIndex ? '#2d2d2d' : '';
    });

    // Scroll selected item into view
    const selectedItem = items[this.selectedIndex] as HTMLElement | undefined;
    selectedItem?.scrollIntoView({ block: 'nearest' });
  }

  /**
   * Execute selected command
   */
  private async executeSelected(): Promise<void> {
    const result = this.results[this.selectedIndex];
    if (!result) return;

    const inputValue = this.input?.value ?? '';

    // Add to history
    if (inputValue && !this.inputHistory.includes(inputValue)) {
      this.inputHistory.unshift(inputValue);
      if (this.inputHistory.length > 50) {
        this.inputHistory.pop();
      }
    }

    this.hide();
    this.onCommandSelected?.(result.command);

    // Execute the command
    const context = this.context ?? { selectedNodeIds: [] };

    // Check if there are arguments in the input
    const parsed = this.options.registry.parseInput(inputValue);
    const args = parsed?.args ?? {};

    const cmdResult = await this.options.registry.execute(result.command.id, args, context);

    if (!cmdResult.success && cmdResult.error) {
      console.error('Command failed:', cmdResult.error);
      // Could show toast/notification here
    }
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    const backdrop = document.querySelector('.command-palette-backdrop');
    backdrop?.parentNode?.removeChild(backdrop);

    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.input = null;
    this.resultsList = null;
  }
}

/**
 * Create a command palette instance
 */
export function createCommandPalette(options?: CommandPaletteOptions): CommandPalette {
  return new CommandPalette(options);
}
