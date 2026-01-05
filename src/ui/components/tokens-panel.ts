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
    this.element.className = 'designlibre-tokens-panel';
    this.element.style.cssText = this.getPanelStyles();

    // Header
    const header = this.createHeader();
    this.element.appendChild(header);

    // Tabs
    const tabs = this.createTabs();
    this.element.appendChild(tabs);

    // Content
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'designlibre-tokens-content';
    this.contentElement.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    `;
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

  private getPanelStyles(): string {
    return `
      position: absolute;
      top: 0;
      ${this.options.position}: 0;
      width: ${this.options.width}px;
      height: 100%;
      background: var(--designlibre-bg-primary, #ffffff);
      border-${this.options.position === 'right' ? 'left' : 'right'}: 1px solid var(--designlibre-border, #e0e0e0);
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      z-index: 100;
      box-shadow: var(--designlibre-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
    `;
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px;
      border-bottom: 1px solid var(--designlibre-border, #e0e0e0);
      font-weight: 600;
    `;
    header.textContent = 'Design Tokens';
    return header;
  }

  private createTabs(): HTMLElement {
    const tabsContainer = document.createElement('div');
    tabsContainer.style.cssText = `
      display: flex;
      border-bottom: 1px solid var(--designlibre-border, #e0e0e0);
      overflow-x: auto;
    `;

    const tabs: Array<{ id: TokenType | 'all'; label: string }> = [
      { id: 'all', label: 'All' },
      { id: 'color', label: 'Colors' },
      { id: 'typography', label: 'Type' },
      { id: 'spacing', label: 'Space' },
    ];

    for (const tab of tabs) {
      const tabBtn = document.createElement('button');
      tabBtn.style.cssText = `
        flex: 1;
        padding: 8px 4px;
        background: none;
        border: none;
        border-bottom: 2px solid ${tab.id === this.activeTab ? 'var(--designlibre-accent, #0066ff)' : 'transparent'};
        cursor: pointer;
        font-size: 11px;
        font-weight: ${tab.id === this.activeTab ? '600' : '400'};
        color: ${tab.id === this.activeTab ? 'var(--designlibre-accent, #0066ff)' : 'var(--designlibre-text-secondary, #666)'};
        white-space: nowrap;
      `;
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
      btn.style.borderBottom = isActive ? '2px solid var(--designlibre-accent, #0066ff)' : '2px solid transparent';
      btn.style.fontWeight = isActive ? '600' : '400';
      btn.style.color = isActive ? 'var(--designlibre-accent, #0066ff)' : 'var(--designlibre-text-secondary, #666)';
    });
  }

  private createExportSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      padding: 12px;
      border-top: 1px solid var(--designlibre-border, #e0e0e0);
    `;

    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 11px;
      color: var(--designlibre-text-secondary, #666);
      margin-bottom: 8px;
    `;
    label.textContent = 'Export Format';
    section.appendChild(label);

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid var(--designlibre-border, #e0e0e0);
      border-radius: var(--designlibre-radius-sm, 4px);
      font-size: 12px;
      margin-bottom: 8px;
    `;

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
    exportBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      background: var(--designlibre-accent, #0066ff);
      color: white;
      border: none;
      border-radius: var(--designlibre-radius-sm, 4px);
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    `;
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
    empty.style.cssText = `
      color: var(--designlibre-text-secondary, #666);
      text-align: center;
      padding: 40px 20px;
    `;
    empty.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 8px;">🎨</div>
      <div>No tokens defined yet.</div>
      <div style="font-size: 11px; margin-top: 8px;">
        Select elements to create tokens from their styles.
      </div>
    `;
    this.contentElement.appendChild(empty);
  }

  private renderTypeSection(type: TokenType, tokens: AnyDesignToken[]): void {
    if (!this.contentElement) return;

    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 16px;';

    const header = document.createElement('div');
    header.style.cssText = `
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--designlibre-text-secondary, #666);
      margin-bottom: 8px;
    `;
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
    el.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px;
      margin-bottom: 4px;
      background: var(--designlibre-bg-secondary, #f5f5f5);
      border-radius: var(--designlibre-radius-sm, 4px);
      cursor: pointer;
    `;

    // Preview (for colors)
    if (token.type === 'color') {
      const colorToken = token as ColorToken;
      const hex = rgbaToHex(colorToken.value);
      const preview = document.createElement('div');
      preview.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 4px;
        background: ${hex};
        border: 1px solid var(--designlibre-border, #e0e0e0);
        margin-right: 10px;
        flex-shrink: 0;
      `;
      el.appendChild(preview);
    }

    // Info
    const info = document.createElement('div');
    info.style.cssText = 'flex: 1; min-width: 0;';

    const name = document.createElement('div');
    name.style.cssText = `
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    name.textContent = token.name;
    info.appendChild(name);

    const value = document.createElement('div');
    value.style.cssText = `
      font-size: 10px;
      color: var(--designlibre-text-secondary, #666);
      font-family: 'SF Mono', Monaco, monospace;
    `;
    value.textContent = this.formatTokenValue(token);
    info.appendChild(value);

    el.appendChild(info);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0.5;
      padding: 4px;
    `;
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
        el.style.background = 'var(--designlibre-accent-light, #e6f0ff)';
        setTimeout(() => {
          el.style.background = 'var(--designlibre-bg-secondary, #f5f5f5)';
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
