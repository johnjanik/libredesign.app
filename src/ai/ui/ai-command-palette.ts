/**
 * AI Command Palette
 *
 * Quick command input for AI actions, triggered by Ctrl+Shift+A.
 */

import type { AIController } from '../ai-controller';

/**
 * Command palette options
 */
export interface AICommandPaletteOptions {
  /** Include screenshot with command by default */
  defaultScreenshot?: boolean | undefined;
}

/**
 * Required options (internal)
 */
interface RequiredAICommandPaletteOptions {
  defaultScreenshot: boolean;
}

/**
 * Predefined quick commands
 */
interface QuickCommand {
  label: string;
  command: string;
  description: string;
}

const QUICK_COMMANDS: QuickCommand[] = [
  { label: 'Create rectangle', command: 'Create a rectangle at the center', description: 'Add a new rectangle shape' },
  { label: 'Create ellipse', command: 'Create an ellipse at the center', description: 'Add a new ellipse shape' },
  { label: 'Create text', command: 'Create a text element that says "Hello"', description: 'Add a new text element' },
  { label: 'Delete selected', command: 'Delete the selected elements', description: 'Remove selected items' },
  { label: 'Change color', command: 'Change the color of selected elements to blue', description: 'Update fill color' },
  { label: 'Zoom to fit', command: 'Zoom to fit all content', description: 'Adjust viewport' },
  { label: 'Describe canvas', command: 'Describe what you see on the canvas', description: 'Get AI analysis' },
];

/**
 * AI Command Palette
 */
export class AICommandPalette {
  private aiController: AIController;
  private options: RequiredAICommandPaletteOptions;
  private overlay: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private suggestionsList: HTMLElement | null = null;
  private isVisible = false;
  private selectedIndex = -1;
  private filteredCommands: QuickCommand[] = [];

  constructor(aiController: AIController, options: AICommandPaletteOptions = {}) {
    this.aiController = aiController;
    this.options = {
      defaultScreenshot: options.defaultScreenshot ?? true,
    };

    this.setupKeyboardShortcut();
  }

  private setupKeyboardShortcut(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + A to open
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        this.toggle();
      }

      // Escape to close
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * Toggle visibility.
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show the command palette.
   */
  show(): void {
    if (this.isVisible) return;

    this.createOverlay();
    this.isVisible = true;
    this.input?.focus();
  }

  /**
   * Hide the command palette.
   */
  hide(): void {
    if (!this.isVisible) return;

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.input = null;
    this.suggestionsList = null;
    this.isVisible = false;
    this.selectedIndex = -1;
  }

  private createOverlay(): void {
    // Backdrop
    this.overlay = document.createElement('div');
    this.overlay.className = 'designlibre-ai-command-palette fixed inset-0 bg-black/50 flex items-start justify-center pt-25 z-10000';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Palette container
    const palette = document.createElement('div');
    palette.className = 'w-125 max-w-[90vw] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden';

    // Header with AI icon
    const header = document.createElement('div');
    header.className = 'flex items-center gap-3 p-4 border-b border-border bg-surface-tertiary';

    const icon = document.createElement('div');
    icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--designlibre-accent, #a855f7)" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>`;
    icon.className = 'flex';
    header.appendChild(icon);

    const title = document.createElement('div');
    title.innerHTML = '<div class="font-semibold text-sm text-content">AI Command</div><div class="text-[11px] text-content-muted">Type a command or select from suggestions</div>';
    header.appendChild(title);

    palette.appendChild(header);

    // Input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'What would you like to do?';
    this.input.className = 'w-full p-4 border-none bg-transparent text-content text-base outline-none box-border';
    this.input.addEventListener('input', () => this.updateSuggestions());
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    palette.appendChild(this.input);

    // Suggestions list
    this.suggestionsList = document.createElement('div');
    this.suggestionsList.className = 'suggestions-list max-h-75 overflow-y-auto border-t border-border';
    this.filteredCommands = [...QUICK_COMMANDS];
    this.renderSuggestions();
    palette.appendChild(this.suggestionsList);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'flex items-center justify-between py-3 px-4 border-t border-border bg-surface-tertiary text-[11px] text-content-muted';

    const shortcuts = document.createElement('div');
    shortcuts.innerHTML = `
      <span class="mr-3"><kbd class="bg-surface-secondary py-0.5 px-1.5 rounded mr-1">↑↓</kbd> Navigate</span>
      <span class="mr-3"><kbd class="bg-surface-secondary py-0.5 px-1.5 rounded mr-1">Enter</kbd> Execute</span>
      <span><kbd class="bg-surface-secondary py-0.5 px-1.5 rounded mr-1">Esc</kbd> Close</span>
    `;
    footer.appendChild(shortcuts);

    // Screenshot toggle
    const screenshotLabel = document.createElement('label');
    screenshotLabel.className = 'flex items-center gap-1.5 cursor-pointer';
    const screenshotCheckbox = document.createElement('input');
    screenshotCheckbox.type = 'checkbox';
    screenshotCheckbox.checked = this.options.defaultScreenshot;
    screenshotCheckbox.className = 'accent-accent';
    screenshotLabel.appendChild(screenshotCheckbox);
    screenshotLabel.appendChild(document.createTextNode('Include screenshot'));
    footer.appendChild(screenshotLabel);

    palette.appendChild(footer);

    this.overlay.appendChild(palette);
    document.body.appendChild(this.overlay);
  }

  private updateSuggestions(): void {
    const query = this.input?.value.toLowerCase() ?? '';

    if (query.length === 0) {
      this.filteredCommands = [...QUICK_COMMANDS];
    } else {
      this.filteredCommands = QUICK_COMMANDS.filter(
        cmd => cmd.label.toLowerCase().includes(query) ||
               cmd.command.toLowerCase().includes(query) ||
               cmd.description.toLowerCase().includes(query)
      );
    }

    this.selectedIndex = this.filteredCommands.length > 0 ? 0 : -1;
    this.renderSuggestions();
  }

  private renderSuggestions(): void {
    if (!this.suggestionsList) return;
    this.suggestionsList.innerHTML = '';

    if (this.filteredCommands.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'p-5 text-center text-content-muted text-xs';
      empty.textContent = 'Press Enter to send your custom command';
      this.suggestionsList.appendChild(empty);
      return;
    }

    for (let i = 0; i < this.filteredCommands.length; i++) {
      const cmd = this.filteredCommands[i]!;
      const item = document.createElement('div');
      item.className = `suggestion-item py-3 px-4 cursor-pointer flex items-center justify-between transition-colors ${i === this.selectedIndex ? 'bg-surface-secondary' : 'bg-transparent'}`;

      const left = document.createElement('div');
      const label = document.createElement('div');
      label.className = 'text-[13px] text-content mb-0.5';
      label.textContent = cmd.label;
      left.appendChild(label);

      const desc = document.createElement('div');
      desc.className = 'text-[11px] text-content-muted';
      desc.textContent = cmd.description;
      left.appendChild(desc);

      item.appendChild(left);

      item.addEventListener('mouseenter', () => {
        this.selectedIndex = i;
        this.renderSuggestions();
      });

      item.addEventListener('click', () => {
        this.executeCommand(cmd.command);
      });

      this.suggestionsList.appendChild(item);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (this.filteredCommands.length > 0) {
          this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
          this.renderSuggestions();
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (this.filteredCommands.length > 0) {
          this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
          this.renderSuggestions();
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredCommands.length) {
          this.executeCommand(this.filteredCommands[this.selectedIndex]!.command);
        } else if (this.input?.value.trim()) {
          this.executeCommand(this.input.value.trim());
        }
        break;

      case 'Tab':
        e.preventDefault();
        // Fill input with selected command
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredCommands.length) {
          this.input!.value = this.filteredCommands[this.selectedIndex]!.command;
        }
        break;
    }
  }

  private async executeCommand(command: string): Promise<void> {
    // Get screenshot preference from checkbox before hiding
    const checkbox = this.overlay?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    const includeScreenshot = checkbox !== null ? checkbox.checked : this.options.defaultScreenshot;

    this.hide();

    try {
      await this.aiController.chat(command, {
        screenshot: includeScreenshot,
      });
    } catch (error) {
      console.error('AI command error:', error);
    }
  }

  /**
   * Check if palette is visible.
   */
  isOpen(): boolean {
    return this.isVisible;
  }

  /**
   * Dispose of the command palette.
   */
  dispose(): void {
    this.hide();
  }
}

/**
 * Create an AI command palette.
 */
export function createAICommandPalette(
  aiController: AIController,
  options?: AICommandPaletteOptions
): AICommandPalette {
  return new AICommandPalette(aiController, options);
}
