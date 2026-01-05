/**
 * Tokens Panel
 *
 * UI panel for managing design tokens.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { TokenRegistry } from '@devtools/tokens/token-registry';
import type { TokenExporter, TokenExportFormat } from '@devtools/tokens/token-exporter';
import type { AnyDesignToken, TokenType, ColorToken } from '@devtools/tokens/token-types';
import { rgbaToHex } from '@core/types/color';
import { copyToClipboard, showCopyFeedback } from '@devtools/code-export/clipboard';

/** Tokens panel options */
export interface TokensPanelOptions {
  position?: 'left' | 'right';
  width?: number;
}

/**
 * Tokens Panel
 *
 * Displays and manages design tokens.
 */
export class TokensPanel {
  private registry: TokenRegistry;
  private exporter: TokenExporter;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private contentElement: HTMLElement | null = null;
  private options: Required<TokensPanelOptions>;
  private activeTab: TokenType | 'all' = 'all';
  private unsubscribers: Array<() => void> = [];

  constructor(
    _runtime: DesignLibreRuntime,
    registry: TokenRegistry,
    exporter: TokenExporter,
    container: HTMLElement,
    options: TokensPanelOptions = {}
  ) {
    this.registry = registry;
    this.exporter = exporter;
    this.container = container;
    this.options = {
      position: options.position ?? 'right',
      width: options.width ?? 280,
    };

    this.setup();
  }

  private setup(): void {
    // Create panel element
    this.element = document.createElement('div');
    this.element.className = `designlibre-tokens-panel absolute top-0 ${this.options.position}-0 h-full bg-surface flex flex-col text-xs z-100 shadow-lg`;
    this.element.style.width = `${this.options.width}px`;
    this.element.style[this.options.position === 'right' ? 'borderLeft' : 'borderRight'] = '1px solid var(--designlibre-border, #3d3d3d)';

    // Header
    const header = this.createHeader();
    this.element.appendChild(header);

    // Tabs
    const tabs = this.createTabs();
    this.element.appendChild(tabs);

    // Content
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'designlibre-tokens-content flex-1 overflow-y-auto p-3';
    this.element.appendChild(this.contentElement);

    // Export section
    const exportSection = this.createExportSection();
    this.element.appendChild(exportSection);

    // Add to container
    this.container.appendChild(this.element);

    // Subscribe to registry changes
    const unsubAdd = this.registry.on('token:added', () => this.updateContent());
    const unsubUpdate = this.registry.on('token:updated', () => this.updateContent());
    const unsubDelete = this.registry.on('token:deleted', () => this.updateContent());
    const unsubClear = this.registry.on('tokens:cleared', () => this.updateContent());

    this.unsubscribers.push(unsubAdd, unsubUpdate, unsubDelete, unsubClear);

    // Initial render
    this.updateContent();
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'p-3 border-b border-border font-semibold';
    header.textContent = 'Design Tokens';
    return header;
  }

  private createTabs(): HTMLElement {
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'flex border-b border-border overflow-x-auto';

    const tabs: Array<{ id: TokenType | 'all'; label: string }> = [
      { id: 'all', label: 'All' },
      { id: 'color', label: 'Colors' },
      { id: 'typography', label: 'Type' },
      { id: 'spacing', label: 'Space' },
    ];

    for (const tab of tabs) {
      const tabBtn = document.createElement('button');
      const isActive = tab.id === this.activeTab;
      tabBtn.className = `flex-1 px-1 py-2 bg-transparent border-none border-b-2 cursor-pointer text-[11px] whitespace-nowrap ${isActive ? 'border-accent font-semibold text-accent' : 'border-transparent font-normal text-content-secondary'}`;
      tabBtn.textContent = tab.label;
      tabBtn.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.updateTabs(tabsContainer);
        this.updateContent();
      });
      tabsContainer.appendChild(tabBtn);
    }

    return tabsContainer;
  }

  private updateTabs(container: HTMLElement): void {
    const tabs = container.querySelectorAll('button');
    const tabIds: Array<TokenType | 'all'> = ['all', 'color', 'typography', 'spacing'];

    tabs.forEach((btn, index) => {
      const isActive = tabIds[index] === this.activeTab;
      if (isActive) {
        btn.classList.remove('border-transparent', 'font-normal', 'text-content-secondary');
        btn.classList.add('border-accent', 'font-semibold', 'text-accent');
      } else {
        btn.classList.remove('border-accent', 'font-semibold', 'text-accent');
        btn.classList.add('border-transparent', 'font-normal', 'text-content-secondary');
      }
    });
  }

  private createExportSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'p-3 border-t border-border';

    const label = document.createElement('div');
    label.className = 'text-[11px] text-content-secondary mb-2';
    label.textContent = 'Export Format';
    section.appendChild(label);

    const select = document.createElement('select');
    select.className = 'w-full p-2 border border-border rounded text-xs mb-2';

    const formats: Array<{ value: TokenExportFormat; label: string }> = [
      { value: 'css-variables', label: 'CSS Variables' },
      { value: 'scss-variables', label: 'SCSS Variables' },
      { value: 'tailwind-config', label: 'Tailwind Config' },
      { value: 'json-dtf', label: 'JSON (Design Tokens)' },
      { value: 'swift-colors', label: 'Swift (iOS)' },
      { value: 'kotlin-compose', label: 'Kotlin (Android)' },
    ];

    for (const format of formats) {
      const option = document.createElement('option');
      option.value = format.value;
      option.textContent = format.label;
      select.appendChild(option);
    }

    section.appendChild(select);

    const exportBtn = document.createElement('button');
    exportBtn.className = 'w-full py-2.5 bg-accent text-white border-none rounded cursor-pointer text-xs font-medium hover:bg-accent-hover transition-colors';
    exportBtn.textContent = 'Copy to Clipboard';
    exportBtn.addEventListener('click', async () => {
      const format = select.value as TokenExportFormat;
      const code = this.exporter.export(format, { includeComments: true });
      const result = await copyToClipboard(code);
      showCopyFeedback(exportBtn, result.success);
    });
    section.appendChild(exportBtn);

    return section;
  }

  private updateContent(): void {
    if (!this.contentElement) return;

    this.contentElement.innerHTML = '';

    const tokens = this.activeTab === 'all'
      ? this.registry.getAll()
      : this.registry.getByType(this.activeTab);

    if (tokens.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Group by type if showing all
    if (this.activeTab === 'all') {
      const grouped = this.groupByType(tokens);
      for (const [type, typeTokens] of Object.entries(grouped)) {
        if (typeTokens.length === 0) continue;
        this.renderTypeSection(type as TokenType, typeTokens);
      }
    } else {
      for (const token of tokens) {
        this.renderToken(token);
      }
    }
  }

  private renderEmptyState(): void {
    if (!this.contentElement) return;

    const empty = document.createElement('div');
    empty.className = 'text-content-secondary text-center py-10 px-5';
    empty.innerHTML = `
      <div class="text-2xl mb-2">🎨</div>
      <div>No tokens defined yet.</div>
      <div class="text-[11px] mt-2">
        Select elements to create tokens from their styles.
      </div>
    `;
    this.contentElement.appendChild(empty);
  }

  private renderTypeSection(type: TokenType, tokens: AnyDesignToken[]): void {
    if (!this.contentElement) return;

    const section = document.createElement('div');
    section.className = 'mb-4';

    const header = document.createElement('div');
    header.className = 'font-semibold text-[11px] uppercase tracking-wide text-content-secondary mb-2';
    header.textContent = this.formatTypeName(type);
    section.appendChild(header);

    for (const token of tokens) {
      const tokenEl = this.createTokenElement(token);
      section.appendChild(tokenEl);
    }

    this.contentElement.appendChild(section);
  }

  private renderToken(token: AnyDesignToken): void {
    if (!this.contentElement) return;
    const tokenEl = this.createTokenElement(token);
    this.contentElement.appendChild(tokenEl);
  }

  private createTokenElement(token: AnyDesignToken): HTMLElement {
    const el = document.createElement('div');
    el.className = 'group flex items-center p-2 mb-1 bg-surface-secondary rounded cursor-pointer hover:bg-surface-tertiary transition-colors';

    // Preview (for colors)
    if (token.type === 'color') {
      const colorToken = token as ColorToken;
      const hex = rgbaToHex(colorToken.value);
      const preview = document.createElement('div');
      preview.className = 'w-6 h-6 rounded border border-border mr-2.5 flex-shrink-0';
      preview.style.background = hex;
      el.appendChild(preview);
    }

    // Info
    const info = document.createElement('div');
    info.className = 'flex-1 min-w-0';

    const name = document.createElement('div');
    name.className = 'font-medium whitespace-nowrap overflow-hidden text-ellipsis';
    name.textContent = token.name;
    info.appendChild(name);

    const value = document.createElement('div');
    value.className = 'text-[10px] text-content-secondary font-mono';
    value.textContent = this.formatTokenValue(token);
    info.appendChild(value);

    el.appendChild(info);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-50 hover:opacity-100 p-1 text-content-secondary hover:text-red-500 transition-opacity';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete token';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.registry.delete(token.id);
    });
    el.appendChild(deleteBtn);

    // Click to copy
    el.addEventListener('click', async () => {
      const copyValue = this.getTokenCopyValue(token);
      const result = await copyToClipboard(copyValue);
      if (result.success) {
        el.classList.remove('bg-surface-secondary');
        el.classList.add('bg-accent-light');
        setTimeout(() => {
          el.classList.remove('bg-accent-light');
          el.classList.add('bg-surface-secondary');
        }, 300);
      }
    });
    el.title = 'Click to copy';

    return el;
  }

  private groupByType(tokens: AnyDesignToken[]): Record<TokenType, AnyDesignToken[]> {
    const grouped: Record<TokenType, AnyDesignToken[]> = {
      color: [],
      typography: [],
      spacing: [],
      shadow: [],
      radius: [],
      opacity: [],
    };

    for (const token of tokens) {
      grouped[token.type].push(token);
    }

    return grouped;
  }

  private formatTypeName(type: TokenType): string {
    const names: Record<TokenType, string> = {
      color: 'Colors',
      typography: 'Typography',
      spacing: 'Spacing',
      shadow: 'Shadows',
      radius: 'Border Radius',
      opacity: 'Opacity',
    };
    return names[type];
  }

  private formatTokenValue(token: AnyDesignToken): string {
    switch (token.type) {
      case 'color':
        return rgbaToHex((token as ColorToken).value);
      case 'spacing':
      case 'radius':
        return `${token.value}px`;
      case 'opacity':
        return `${Math.round((token.value as number) * 100)}%`;
      case 'typography': {
        const t = token.value as any;
        return `${t.fontFamily} ${t.fontSize}px`;
      }
      case 'shadow': {
        const s = token.value as any;
        return `${s.offsetX}px ${s.offsetY}px ${s.blur}px`;
      }
    }
  }

  private getTokenCopyValue(token: AnyDesignToken): string {
    switch (token.type) {
      case 'color':
        return rgbaToHex((token as ColorToken).value);
      case 'spacing':
      case 'radius':
        return `${token.value}px`;
      case 'opacity':
        return String(token.value);
      default:
        return JSON.stringify(token.value);
    }
  }

  /** Show the panel */
  show(): void {
    if (this.element) {
      this.element.style.display = 'flex';
    }
  }

  /** Hide the panel */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /** Dispose of the panel */
  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.contentElement = null;
  }
}

/**
 * Create a tokens panel.
 */
export function createTokensPanel(
  runtime: DesignLibreRuntime,
  registry: TokenRegistry,
  exporter: TokenExporter,
  container: HTMLElement,
  options?: TokensPanelOptions
): TokensPanel {
  return new TokensPanel(runtime, registry, exporter, container, options);
}
