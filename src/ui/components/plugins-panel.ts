/**
 * Plugins Panel
 *
 * Panel for managing installed plugins, browsing marketplace, and development.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';

/**
 * SVG Icons
 */
const ICONS = {
  puzzle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.452-.968-.878a2.5 2.5 0 1 0 0 4.696c.166-.426.498-.808.968-.878a.979.979 0 0 1 .837.276l1.611 1.611c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.568 1.568a.984.984 0 0 1-1.327.039 2.5 2.5 0 1 0-4.713-.001.984.984 0 0 1-1.327-.039l-1.568-1.568c-.47-.47-.706-1.087-.706-1.704s.235-1.233.706-1.704l1.611-1.611a.98.98 0 0 1 .837-.276c.47.07.802.452.968.878a2.5 2.5 0 1 0 0-4.696c-.166.426-.498.808-.968.878a.979.979 0 0 1-.837-.276l-1.611-1.611A2.405 2.405 0 0 1 9 9.5c0-.617.235-1.233.706-1.704L11.274 6.23a.984.984 0 0 1 1.327-.039 2.5 2.5 0 1 0 4.713.001.984.984 0 0 1 1.327.039l1.568 1.568c.23.23.338.556.289.878z"/>
  </svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,
  folder: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>`,
  settings: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,
  play: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>`,
  stop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="6" y="6" width="12" height="12"/>
  </svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`,
  download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`,
  code: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,
  alertCircle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`,
  info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>`,
  externalLink: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`,
};

/**
 * Plugin status
 */
export type PluginStatus = 'installed' | 'running' | 'stopped' | 'error' | 'loading';

/**
 * Installed plugin info for UI
 */
export interface UIPluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  status: PluginStatus;
  enabled: boolean;
  hasUpdate?: boolean;
  error?: string;
}

/**
 * Panel tab
 */
type PanelTab = 'installed' | 'browse' | 'develop';

/**
 * Plugins panel options
 */
export interface PluginsPanelOptions {
  runtime: DesignLibreRuntime;
  onLoadLocalPlugin?: () => void;
  onOpenMarketplace?: () => void;
}

/**
 * Plugin event callbacks
 */
export interface PluginsPanelCallbacks {
  onEnable: (pluginId: string) => Promise<void>;
  onDisable: (pluginId: string) => Promise<void>;
  onUninstall: (pluginId: string) => Promise<void>;
  onRun: (pluginId: string) => Promise<void>;
  onStop: (pluginId: string) => Promise<void>;
  onLoadLocal: (path: string) => Promise<void>;
  onRefresh: () => Promise<UIPluginInfo[]>;
}

/**
 * Plugins Panel Component
 */
export class PluginsPanel {
  private element: HTMLElement | null = null;
  private pluginsContainer: HTMLElement | null = null;
  private callbacks: PluginsPanelCallbacks | null = null;

  // State
  private plugins: UIPluginInfo[] = [];
  private searchQuery = '';
  private activeTab: PanelTab = 'installed';
  private isLoading = false;
  private devModeEnabled = false;

  constructor(_options: PluginsPanelOptions) {
    // Runtime available via _options.runtime if needed for future features
  }

  /**
   * Set callbacks for plugin operations
   */
  setCallbacks(callbacks: PluginsPanelCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Update the list of plugins and re-render
   */
  setPlugins(plugins: UIPluginInfo[]): void {
    this.plugins = plugins;
    this.render();
  }

  /**
   * Create the panel element
   */
  createElement(): HTMLElement {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-plugins-panel';
    this.element.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: var(--bg-primary, #1e1e1e);
      color: var(--text-primary, #e0e0e0);
    `;

    // Listen for dev mode activation from menu
    window.addEventListener('designlibre-plugins-dev-mode', ((e: CustomEvent) => {
      if (e.detail.enabled) {
        this.devModeEnabled = true;
        this.activeTab = 'develop';
        this.render();
      }
    }) as EventListener);

    this.render();
    this.refreshPlugins();

    return this.element;
  }

  /**
   * Refresh plugins list
   */
  async refreshPlugins(): Promise<void> {
    if (!this.callbacks) return;

    this.isLoading = true;
    this.render();

    try {
      this.plugins = await this.callbacks.onRefresh();
    } catch (error) {
      console.error('Failed to refresh plugins:', error);
    }

    this.isLoading = false;
    this.render();
  }

  /**
   * Update a single plugin's status
   */
  updatePluginStatus(pluginId: string, status: PluginStatus, error?: string): void {
    const plugin = this.plugins.find((p) => p.id === pluginId);
    if (plugin) {
      plugin.status = status;
      if (error !== undefined) {
        plugin.error = error;
      }
      this.render();
    }
  }

  /**
   * Render the panel
   */
  private render(): void {
    if (!this.element) return;

    this.element.innerHTML = '';

    // Header
    this.element.appendChild(this.createHeader());

    // Tabs
    this.element.appendChild(this.createTabs());

    // Search (for installed tab)
    if (this.activeTab === 'installed') {
      this.element.appendChild(this.createSearch());
    }

    // Content area
    this.pluginsContainer = document.createElement('div');
    this.pluginsContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    `;

    if (this.isLoading) {
      this.pluginsContainer.appendChild(this.createLoadingState());
    } else {
      switch (this.activeTab) {
        case 'installed':
          this.renderInstalledPlugins();
          break;
        case 'browse':
          this.renderBrowseTab();
          break;
        case 'develop':
          this.renderDevelopTab();
          break;
      }
    }

    this.element.appendChild(this.pluginsContainer);
  }

  /**
   * Create header
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border-bottom: 1px solid var(--border-color, #333);
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    `;
    title.innerHTML = `${ICONS.puzzle} Plugins`;

    const actions = document.createElement('div');
    actions.style.cssText = `display: flex; gap: 4px;`;

    const refreshBtn = this.createIconButton(ICONS.refresh, 'Refresh', () => this.refreshPlugins());
    actions.appendChild(refreshBtn);

    header.appendChild(title);
    header.appendChild(actions);

    return header;
  }

  /**
   * Create tabs
   */
  private createTabs(): HTMLElement {
    const tabs = document.createElement('div');
    tabs.style.cssText = `
      display: flex;
      border-bottom: 1px solid var(--border-color, #333);
    `;

    const tabItems: { id: PanelTab; label: string }[] = [
      { id: 'installed', label: 'Installed' },
      { id: 'browse', label: 'Browse' },
      { id: 'develop', label: 'Develop' },
    ];

    for (const tab of tabItems) {
      const tabBtn = document.createElement('button');
      tabBtn.style.cssText = `
        flex: 1;
        padding: 8px 12px;
        background: none;
        border: none;
        border-bottom: 2px solid ${this.activeTab === tab.id ? 'var(--accent-color, #4a90d9)' : 'transparent'};
        color: ${this.activeTab === tab.id ? 'var(--text-primary, #e0e0e0)' : 'var(--text-secondary, #888)'};
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s ease;
      `;
      tabBtn.textContent = tab.label;
      tabBtn.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.render();
      });
      tabBtn.addEventListener('mouseenter', () => {
        if (this.activeTab !== tab.id) {
          tabBtn.style.color = 'var(--text-primary, #e0e0e0)';
        }
      });
      tabBtn.addEventListener('mouseleave', () => {
        if (this.activeTab !== tab.id) {
          tabBtn.style.color = 'var(--text-secondary, #888)';
        }
      });
      tabs.appendChild(tabBtn);
    }

    return tabs;
  }

  /**
   * Create search input
   */
  private createSearch(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-color, #333);
    `;

    const searchWrapper = document.createElement('div');
    searchWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-secondary, #2a2a2a);
      border-radius: 4px;
      padding: 6px 10px;
    `;

    const icon = document.createElement('span');
    icon.innerHTML = ICONS.search;
    icon.style.cssText = `color: var(--text-secondary, #888); display: flex;`;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search plugins...';
    input.value = this.searchQuery;
    input.style.cssText = `
      flex: 1;
      background: none;
      border: none;
      outline: none;
      color: var(--text-primary, #e0e0e0);
      font-size: 12px;
    `;
    input.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.renderInstalledPlugins();
    });

    searchWrapper.appendChild(icon);
    searchWrapper.appendChild(input);
    container.appendChild(searchWrapper);

    return container;
  }

  /**
   * Render installed plugins
   */
  private renderInstalledPlugins(): void {
    if (!this.pluginsContainer) return;

    this.pluginsContainer.innerHTML = '';

    const filtered = this.plugins.filter((plugin) => {
      if (!this.searchQuery) return true;
      const query = this.searchQuery.toLowerCase();
      return (
        plugin.name.toLowerCase().includes(query) ||
        plugin.description.toLowerCase().includes(query) ||
        plugin.author.toLowerCase().includes(query)
      );
    });

    if (filtered.length === 0) {
      this.pluginsContainer.appendChild(this.createEmptyState());
      return;
    }

    for (const plugin of filtered) {
      this.pluginsContainer.appendChild(this.createPluginCard(plugin));
    }
  }

  /**
   * Render browse tab (marketplace placeholder)
   */
  private renderBrowseTab(): void {
    if (!this.pluginsContainer) return;

    const placeholder = document.createElement('div');
    placeholder.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: var(--text-secondary, #888);
      padding: 20px;
    `;

    placeholder.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">${ICONS.download}</div>
      <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">Plugin Marketplace</div>
      <div style="font-size: 12px; margin-bottom: 16px;">Browse and install community plugins</div>
      <button style="
        padding: 8px 16px;
        background: var(--accent-color, #4a90d9);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Coming Soon</button>
    `;

    this.pluginsContainer.appendChild(placeholder);
  }

  /**
   * Render develop tab
   */
  private renderDevelopTab(): void {
    if (!this.pluginsContainer) return;

    this.pluginsContainer.innerHTML = '';

    // Dev mode toggle
    const devModeSection = document.createElement('div');
    devModeSection.style.cssText = `
      background: var(--bg-secondary, #2a2a2a);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
    `;

    const devModeHeader = document.createElement('div');
    devModeHeader.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    `;

    const devModeLabel = document.createElement('div');
    devModeLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
    `;
    devModeLabel.innerHTML = `${ICONS.code} Developer Mode`;

    const devModeToggle = this.createToggle(this.devModeEnabled, (enabled) => {
      this.devModeEnabled = enabled;
      this.render();
    });

    devModeHeader.appendChild(devModeLabel);
    devModeHeader.appendChild(devModeToggle);

    const devModeDesc = document.createElement('div');
    devModeDesc.style.cssText = `
      font-size: 11px;
      color: var(--text-secondary, #888);
    `;
    devModeDesc.textContent = 'Enable hot reload and development features';

    devModeSection.appendChild(devModeHeader);
    devModeSection.appendChild(devModeDesc);
    this.pluginsContainer.appendChild(devModeSection);

    // Load local plugin
    const loadLocalSection = document.createElement('div');
    loadLocalSection.style.cssText = `
      background: var(--bg-secondary, #2a2a2a);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
    `;

    const loadLocalHeader = document.createElement('div');
    loadLocalHeader.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 8px;
    `;
    loadLocalHeader.innerHTML = `${ICONS.folder} Load Local Plugin`;

    const loadLocalDesc = document.createElement('div');
    loadLocalDesc.style.cssText = `
      font-size: 11px;
      color: var(--text-secondary, #888);
      margin-bottom: 12px;
    `;
    loadLocalDesc.textContent = 'Load a plugin from your local filesystem for testing';

    const loadLocalBtn = document.createElement('button');
    loadLocalBtn.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: var(--bg-tertiary, #333);
      color: var(--text-primary, #e0e0e0);
      border: 1px dashed var(--border-color, #444);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    `;
    loadLocalBtn.innerHTML = `${ICONS.plus} Select Plugin Folder`;
    loadLocalBtn.addEventListener('click', () => this.handleLoadLocalPlugin());

    loadLocalSection.appendChild(loadLocalHeader);
    loadLocalSection.appendChild(loadLocalDesc);
    loadLocalSection.appendChild(loadLocalBtn);
    this.pluginsContainer.appendChild(loadLocalSection);

    // Documentation link
    const docsSection = document.createElement('div');
    docsSection.style.cssText = `
      background: var(--bg-secondary, #2a2a2a);
      border-radius: 6px;
      padding: 12px;
    `;

    const docsHeader = document.createElement('div');
    docsHeader.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 8px;
    `;
    docsHeader.innerHTML = `${ICONS.info} Resources`;

    const docsList = document.createElement('div');
    docsList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    const docsLinks = [
      { label: 'Plugin Development Guide', url: '#' },
      { label: 'API Reference', url: '#' },
      { label: 'Example Plugins', url: '#' },
    ];

    for (const link of docsLinks) {
      const linkEl = document.createElement('a');
      linkEl.href = link.url;
      linkEl.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--accent-color, #4a90d9);
        font-size: 12px;
        text-decoration: none;
      `;
      linkEl.innerHTML = `${link.label} ${ICONS.externalLink}`;
      docsList.appendChild(linkEl);
    }

    docsSection.appendChild(docsHeader);
    docsSection.appendChild(docsList);
    this.pluginsContainer.appendChild(docsSection);
  }

  /**
   * Create a plugin card
   */
  private createPluginCard(plugin: UIPluginInfo): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = `
      background: var(--bg-secondary, #2a2a2a);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
    `;

    // Header row
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    `;

    // Icon
    const icon = document.createElement('div');
    icon.style.cssText = `
      width: 32px;
      height: 32px;
      background: var(--bg-tertiary, #333);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;
    if (plugin.icon) {
      const img = document.createElement('img');
      img.src = plugin.icon;
      img.style.cssText = `width: 20px; height: 20px;`;
      icon.appendChild(img);
    } else {
      icon.innerHTML = ICONS.puzzle;
    }

    // Info
    const info = document.createElement('div');
    info.style.cssText = `flex: 1; min-width: 0;`;

    const nameRow = document.createElement('div');
    nameRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    `;

    const name = document.createElement('span');
    name.style.cssText = `
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    name.textContent = plugin.name;

    const version = document.createElement('span');
    version.style.cssText = `
      font-size: 10px;
      color: var(--text-secondary, #888);
      background: var(--bg-tertiary, #333);
      padding: 1px 4px;
      border-radius: 3px;
    `;
    version.textContent = `v${plugin.version}`;

    nameRow.appendChild(name);
    nameRow.appendChild(version);

    // Status badge
    const statusBadge = this.createStatusBadge(plugin.status);
    nameRow.appendChild(statusBadge);

    const author = document.createElement('div');
    author.style.cssText = `
      font-size: 11px;
      color: var(--text-secondary, #888);
    `;
    author.textContent = `by ${plugin.author}`;

    info.appendChild(nameRow);
    info.appendChild(author);

    // Toggle
    const toggle = this.createToggle(plugin.enabled, async (enabled) => {
      if (this.callbacks) {
        try {
          if (enabled) {
            await this.callbacks.onEnable(plugin.id);
          } else {
            await this.callbacks.onDisable(plugin.id);
          }
          plugin.enabled = enabled;
          this.render();
        } catch (error) {
          console.error('Failed to toggle plugin:', error);
        }
      }
    });

    header.appendChild(icon);
    header.appendChild(info);
    header.appendChild(toggle);
    card.appendChild(header);

    // Description
    const desc = document.createElement('div');
    desc.style.cssText = `
      font-size: 11px;
      color: var(--text-secondary, #888);
      margin-bottom: 10px;
      line-height: 1.4;
    `;
    desc.textContent = plugin.description;
    card.appendChild(desc);

    // Error message
    if (plugin.error) {
      const errorEl = document.createElement('div');
      errorEl.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 6px;
        padding: 8px;
        background: rgba(239, 68, 68, 0.1);
        border-radius: 4px;
        margin-bottom: 10px;
        font-size: 11px;
        color: #ef4444;
      `;
      errorEl.innerHTML = `${ICONS.alertCircle} ${plugin.error}`;
      card.appendChild(errorEl);
    }

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = `
      display: flex;
      gap: 6px;
    `;

    if (plugin.enabled) {
      if (plugin.status === 'running') {
        actions.appendChild(
          this.createActionButton('Stop', ICONS.stop, async () => {
            if (this.callbacks) {
              await this.callbacks.onStop(plugin.id);
            }
          })
        );
      } else if (plugin.status === 'stopped' || plugin.status === 'installed') {
        actions.appendChild(
          this.createActionButton('Run', ICONS.play, async () => {
            if (this.callbacks) {
              await this.callbacks.onRun(plugin.id);
            }
          })
        );
      }
    }

    actions.appendChild(
      this.createActionButton('Uninstall', ICONS.trash, async () => {
        if (this.callbacks && confirm(`Uninstall "${plugin.name}"?`)) {
          await this.callbacks.onUninstall(plugin.id);
          this.plugins = this.plugins.filter((p) => p.id !== plugin.id);
          this.render();
        }
      }, true)
    );

    card.appendChild(actions);

    return card;
  }

  /**
   * Create status badge
   */
  private createStatusBadge(status: PluginStatus): HTMLElement {
    const badge = document.createElement('span');

    const colors: Record<PluginStatus, { bg: string; text: string }> = {
      installed: { bg: 'rgba(107, 114, 128, 0.2)', text: '#9ca3af' },
      running: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' },
      stopped: { bg: 'rgba(107, 114, 128, 0.2)', text: '#9ca3af' },
      error: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
      loading: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
    };

    const color = colors[status];
    badge.style.cssText = `
      font-size: 9px;
      padding: 2px 5px;
      border-radius: 3px;
      background: ${color.bg};
      color: ${color.text};
      text-transform: uppercase;
      font-weight: 500;
    `;
    badge.textContent = status;

    return badge;
  }

  /**
   * Create action button
   */
  private createActionButton(
    label: string,
    icon: string,
    onClick: () => void,
    danger = false
  ): HTMLElement {
    const btn = document.createElement('button');
    btn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      background: ${danger ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary, #333)'};
      color: ${danger ? '#ef4444' : 'var(--text-primary, #e0e0e0)'};
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      transition: background 0.15s ease;
    `;
    btn.innerHTML = `${icon} ${label}`;
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => {
      btn.style.background = danger ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-hover, #444)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = danger ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary, #333)';
    });

    return btn;
  }

  /**
   * Create icon button
   */
  private createIconButton(icon: string, title: string, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.title = title;
    btn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: none;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: var(--text-secondary, #888);
      transition: all 0.15s ease;
    `;
    btn.innerHTML = icon;
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'var(--bg-hover, #333)';
      btn.style.color = 'var(--text-primary, #e0e0e0)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'none';
      btn.style.color = 'var(--text-secondary, #888)';
    });

    return btn;
  }

  /**
   * Create toggle switch
   */
  private createToggle(checked: boolean, onChange: (checked: boolean) => void): HTMLElement {
    const container = document.createElement('label');
    container.style.cssText = `
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
    `;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.style.cssText = `opacity: 0; width: 0; height: 0;`;
    input.addEventListener('change', () => onChange(input.checked));

    const slider = document.createElement('span');
    slider.style.cssText = `
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${checked ? 'var(--accent-color, #4a90d9)' : 'var(--bg-tertiary, #333)'};
      transition: 0.2s;
      border-radius: 20px;
    `;

    const knob = document.createElement('span');
    knob.style.cssText = `
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: ${checked ? '18px' : '2px'};
      bottom: 2px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    `;
    slider.appendChild(knob);

    input.addEventListener('change', () => {
      slider.style.backgroundColor = input.checked
        ? 'var(--accent-color, #4a90d9)'
        : 'var(--bg-tertiary, #333)';
      knob.style.left = input.checked ? '18px' : '2px';
    });

    container.appendChild(input);
    container.appendChild(slider);

    return container;
  }

  /**
   * Create empty state
   */
  private createEmptyState(): HTMLElement {
    const empty = document.createElement('div');
    empty.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      text-align: center;
      color: var(--text-secondary, #888);
    `;

    if (this.searchQuery) {
      empty.innerHTML = `
        <div style="font-size: 14px; margin-bottom: 4px;">No plugins found</div>
        <div style="font-size: 12px;">Try a different search term</div>
      `;
    } else {
      empty.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 12px;">${ICONS.puzzle}</div>
        <div style="font-size: 14px; margin-bottom: 4px;">No plugins installed</div>
        <div style="font-size: 12px;">Browse the marketplace or load a local plugin</div>
      `;
    }

    return empty;
  }

  /**
   * Create loading state
   */
  private createLoadingState(): HTMLElement {
    const loading = document.createElement('div');
    loading.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--text-secondary, #888);
    `;
    loading.innerHTML = `
      <div style="font-size: 12px;">Loading plugins...</div>
    `;

    return loading;
  }

  /**
   * Handle load local plugin
   */
  private async handleLoadLocalPlugin(): Promise<void> {
    // In a real implementation, this would open a file picker
    // For now, prompt for a path
    const path = prompt('Enter path to plugin folder:');
    if (path && this.callbacks) {
      try {
        await this.callbacks.onLoadLocal(path);
        await this.refreshPlugins();
      } catch (error) {
        console.error('Failed to load local plugin:', error);
        alert(`Failed to load plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Destroy the panel
   */
  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.pluginsContainer = null;
  }
}
