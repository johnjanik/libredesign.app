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
    this.overlay.className = 'designlibre-ai-command-palette';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 100px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Palette container
    const palette = document.createElement('div');
    palette.style.cssText = `
      width: 500px;
      max-width: 90vw;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    `;

    // Header with AI icon
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      background: var(--designlibre-bg-tertiary, #252525);
    `;

    const icon = document.createElement('div');
    icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--designlibre-accent, #a855f7)" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>`;
    icon.style.cssText = `display: flex;`;
    header.appendChild(icon);

    const title = document.createElement('div');
    title.innerHTML = '<div style="font-weight: 600; font-size: 14px; color: var(--designlibre-text-primary, #e4e4e4);">AI Command</div><div style="font-size: 11px; color: var(--designlibre-text-muted, #6a6a6a);">Type a command or select from suggestions</div>';
    header.appendChild(title);

    palette.appendChild(header);

    // Input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'What would you like to do?';
    this.input.style.cssText = `
      width: 100%;
      padding: 16px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 16px;
      outline: none;
      box-sizing: border-box;
    `;
    this.input.addEventListener('input', () => this.updateSuggestions());
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    palette.appendChild(this.input);

    // Suggestions list
    this.suggestionsList = document.createElement('div');
    this.suggestionsList.className = 'suggestions-list';
    this.suggestionsList.style.cssText = `
      max-height: 300px;
      overflow-y: auto;
      border-top: 1px solid var(--designlibre-border, #3d3d3d);
    `;
    this.filteredCommands = [...QUICK_COMMANDS];
    this.renderSuggestions();
    palette.appendChild(this.suggestionsList);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-top: 1px solid var(--designlibre-border, #3d3d3d);
      background: var(--designlibre-bg-tertiary, #252525);
      font-size: 11px;
      color: var(--designlibre-text-muted, #6a6a6a);
    `;

    const shortcuts = document.createElement('div');
    shortcuts.innerHTML = `
      <span style="margin-right: 12px;"><kbd style="background: var(--designlibre-bg-secondary, #2d2d2d); padding: 2px 6px; border-radius: 3px; margin-right: 4px;">↑↓</kbd> Navigate</span>
      <span style="margin-right: 12px;"><kbd style="background: var(--designlibre-bg-secondary, #2d2d2d); padding: 2px 6px; border-radius: 3px; margin-right: 4px;">Enter</kbd> Execute</span>
      <span><kbd style="background: var(--designlibre-bg-secondary, #2d2d2d); padding: 2px 6px; border-radius: 3px; margin-right: 4px;">Esc</kbd> Close</span>
    `;
    footer.appendChild(shortcuts);

    // Screenshot toggle
    const screenshotLabel = document.createElement('label');
    screenshotLabel.style.cssText = `display: flex; align-items: center; gap: 6px; cursor: pointer;`;
    const screenshotCheckbox = document.createElement('input');
    screenshotCheckbox.type = 'checkbox';
    screenshotCheckbox.checked = this.options.defaultScreenshot;
    screenshotCheckbox.style.cssText = `accent-color: var(--designlibre-accent, #a855f7);`;
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
      empty.style.cssText = `
        padding: 20px;
        text-align: center;
        color: var(--designlibre-text-muted, #6a6a6a);
        font-size: 12px;
      `;
      empty.textContent = 'Press Enter to send your custom command';
      this.suggestionsList.appendChild(empty);
      return;
    }

    for (let i = 0; i < this.filteredCommands.length; i++) {
      const cmd = this.filteredCommands[i]!;
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.style.cssText = `
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: ${i === this.selectedIndex ? 'var(--designlibre-bg-secondary, #2d2d2d)' : 'transparent'};
        transition: background 0.1s;
      `;

      const left = document.createElement('div');
      const label = document.createElement('div');
      label.style.cssText = `font-size: 13px; color: var(--designlibre-text-primary, #e4e4e4); margin-bottom: 2px;`;
      label.textContent = cmd.label;
      left.appendChild(label);

      const desc = document.createElement('div');
      desc.style.cssText = `font-size: 11px; color: var(--designlibre-text-muted, #6a6a6a);`;
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
