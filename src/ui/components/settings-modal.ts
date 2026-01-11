/**
 * Settings Modal
 *
 * Full-screen settings modal with sidebar navigation.
 * Follows Obsidian-style design with categories:
 * General, Editor, Files, Appearance, Hotkeys, Plugins
 */

import { setThemeMode, getSavedThemeMode, type ThemeMode } from '../utils/theme-manager';
import { getConfigManager, testProviderConnection } from '@ai/config';
import { AVAILABLE_MODELS, type ProviderType } from '@ai/config/provider-config';
import { getHotkeyManager, type HotkeyAction } from '@core/hotkeys/hotkey-manager';

/**
 * Settings category definition
 */
interface SettingsCategory {
  id: string;
  label: string;
  icon: string;
}

/**
 * Settings categories
 */
const CATEGORIES: SettingsCategory[] = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'editor', label: 'Editor', icon: 'edit' },
  { id: 'files', label: 'Files', icon: 'folder' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'hotkeys', label: 'Hotkeys', icon: 'keyboard' },
  { id: 'ai', label: 'AI Integration', icon: 'ai' },
  { id: 'plugins', label: 'Plugins', icon: 'puzzle' },
];

/**
 * SVG icons
 */
const ICONS: Record<string, string> = {
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,
  edit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`,
  folder: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>`,
  palette: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/>
    <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/>
    <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>
  </svg>`,
  keyboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
    <line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/>
    <line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/>
    <line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/>
    <line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/>
    <line x1="8" y1="16" x2="16" y2="16"/>
  </svg>`,
  puzzle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.315 8.69a.979.979 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.61a2.404 2.404 0 0 1 1.705-.707c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/>
  </svg>`,
  ai: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
    <circle cx="8" cy="14" r="1" fill="currentColor"/><circle cx="16" cy="14" r="1" fill="currentColor"/>
  </svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>`,
  eyeOff: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>`,
  spinner: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="settings-spinner">
    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
  </svg>`,
};

/**
 * Settings Modal Component
 */
export class SettingsModal {
  private overlay: HTMLElement | null = null;
  private modal: HTMLElement | null = null;
  private sidebar: HTMLElement | null = null;
  private content: HTMLElement | null = null;
  private activeCategory: string = 'general';
  private isOpen: boolean = false;

  constructor() {
    this.setupKeyboardHandler();
  }

  private setupKeyboardHandler(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Open the settings modal
   */
  open(initialCategory?: string): void {
    if (this.isOpen) return;

    this.activeCategory = initialCategory ?? 'general';
    this.isOpen = true;
    this.render();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the settings modal
   */
  close(): void {
    if (!this.isOpen) return;

    this.isOpen = false;
    document.body.style.overflow = '';

    if (this.overlay) {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
        this.modal = null;
        this.sidebar = null;
        this.content = null;
      }, 150);
    }
  }

  private render(): void {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'designlibre-settings-overlay';
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

    // Create modal container
    this.modal = document.createElement('div');
    this.modal.className = 'designlibre-settings-modal';
    this.modal.style.cssText = `
      display: flex;
      width: 900px;
      max-width: calc(100vw - 64px);
      height: 600px;
      max-height: calc(100vh - 64px);
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 12px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
      overflow: hidden;
    `;

    // Create sidebar
    this.sidebar = this.createSidebar();
    this.modal.appendChild(this.sidebar);

    // Create content area
    this.content = document.createElement('div');
    this.content.className = 'settings-content';
    this.content.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    // Content header
    const contentHeader = document.createElement('div');
    contentHeader.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    const title = document.createElement('h2');
    title.id = 'settings-title';
    title.style.cssText = `
      margin: 0;
      font-size: 27px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    title.textContent = this.getCategoryLabel(this.activeCategory);
    contentHeader.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = ICONS['close'] ?? '';
    closeBtn.title = 'Close (Escape)';
    closeBtn.setAttribute('aria-label', 'Close settings');
    closeBtn.style.cssText = `
      display: flex;
      padding: 6px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-secondary, #888);
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.15s;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      closeBtn.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.backgroundColor = 'transparent';
      closeBtn.style.color = 'var(--designlibre-text-secondary, #888)';
    });
    closeBtn.addEventListener('click', () => this.close());
    contentHeader.appendChild(closeBtn);

    this.content.appendChild(contentHeader);

    // Content body (scrollable)
    const contentBody = document.createElement('div');
    contentBody.className = 'settings-content-body';
    contentBody.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    `;
    this.renderCategoryContent(contentBody);
    this.content.appendChild(contentBody);

    this.modal.appendChild(this.content);
    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);

    // Animate in
    requestAnimationFrame(() => {
      if (this.overlay) {
        this.overlay.style.opacity = '1';
      }
    });
  }

  private createSidebar(): HTMLElement {
    const sidebar = document.createElement('div');
    sidebar.className = 'settings-sidebar';
    sidebar.style.cssText = `
      width: 220px;
      background: var(--designlibre-bg-tertiary, #161616);
      border-right: 1px solid var(--designlibre-border, #2d2d2d);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px;
      font-size: 17px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--designlibre-text-secondary, #888);
    `;
    header.textContent = 'Options';
    sidebar.appendChild(header);

    // Category buttons
    for (const category of CATEGORIES) {
      const button = this.createCategoryButton(category);
      sidebar.appendChild(button);
    }

    return sidebar;
  }

  private createCategoryButton(category: SettingsCategory): HTMLElement {
    const button = document.createElement('button');
    button.className = 'settings-category-btn';
    button.dataset['category'] = category.id;
    const isActive = category.id === this.activeCategory;

    button.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 16px;
      border: none;
      background: ${isActive ? 'var(--designlibre-accent, #0d99ff)' : 'transparent'};
      color: ${isActive ? 'white' : 'var(--designlibre-text-primary, #e4e4e4)'};
      font-size: 21px;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.15s;
    `;

    const icon = document.createElement('span');
    icon.innerHTML = ICONS[category.icon] ?? ICONS['settings'] ?? '';
    icon.style.cssText = 'display: flex; opacity: 0.8;';
    button.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = category.label;
    button.appendChild(label);

    button.addEventListener('mouseenter', () => {
      if (category.id !== this.activeCategory) {
        button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (category.id !== this.activeCategory) {
        button.style.backgroundColor = 'transparent';
      }
    });

    button.addEventListener('click', () => {
      this.setActiveCategory(category.id);
    });

    return button;
  }

  private setActiveCategory(categoryId: string): void {
    this.activeCategory = categoryId;

    // Update sidebar buttons
    const buttons = this.sidebar?.querySelectorAll('.settings-category-btn');
    buttons?.forEach((btn) => {
      const el = btn as HTMLElement;
      const isActive = el.dataset['category'] === categoryId;
      el.style.backgroundColor = isActive ? 'var(--designlibre-accent, #0d99ff)' : 'transparent';
      el.style.color = isActive ? 'white' : 'var(--designlibre-text-primary, #e4e4e4)';
    });

    // Update title
    const title = this.content?.querySelector('#settings-title');
    if (title) {
      title.textContent = this.getCategoryLabel(categoryId);
    }

    // Update content
    const contentBody = this.content?.querySelector('.settings-content-body');
    if (contentBody) {
      contentBody.innerHTML = '';
      this.renderCategoryContent(contentBody as HTMLElement);
    }
  }

  private getCategoryLabel(categoryId: string): string {
    return CATEGORIES.find((c) => c.id === categoryId)?.label ?? 'Settings';
  }

  private renderCategoryContent(container: HTMLElement): void {
    switch (this.activeCategory) {
      case 'general':
        this.renderGeneralSettings(container);
        break;
      case 'editor':
        this.renderEditorSettings(container);
        break;
      case 'files':
        this.renderFilesSettings(container);
        break;
      case 'appearance':
        this.renderAppearanceSettings(container);
        break;
      case 'hotkeys':
        this.renderHotkeysSettings(container);
        break;
      case 'ai':
        this.renderAISettings(container);
        break;
      case 'plugins':
        this.renderPluginsSettings(container);
        break;
    }
  }

  // ============================================================
  // Settings Sections
  // ============================================================

  private renderGeneralSettings(container: HTMLElement): void {
    this.addSectionHeader(container, 'App');

    this.addSettingRow(container, {
      title: 'Version',
      description: 'DesignLibre 0.1.0',
      type: 'info',
    });

    this.addSettingRow(container, {
      title: 'Check for updates',
      description: 'Automatically check for new versions',
      type: 'toggle',
      value: this.getSetting('auto-update', true),
      onChange: (v) => {
        this.setSetting('auto-update', v);
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { autoUpdate: v }
        }));
      },
    });

    this.addSectionHeader(container, 'Startup');

    this.addSettingRow(container, {
      title: 'Open last project',
      description: 'Automatically open the last project on startup',
      type: 'toggle',
      value: this.getSetting('open-last-project', true),
      onChange: (v) => {
        this.setSetting('open-last-project', v);
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { openLastProject: v }
        }));
      },
    });
  }

  private renderEditorSettings(container: HTMLElement): void {
    this.addSectionHeader(container, 'Toolbar');

    this.addSettingRow(container, {
      title: 'Toolbar position',
      description: 'Position the toolbar at the top or bottom of the canvas',
      type: 'select',
      value: this.getSetting('toolbar-position', 'bottom'),
      options: [
        { value: 'bottom', label: 'Bottom' },
        { value: 'top', label: 'Top' },
      ],
      onChange: (v) => {
        this.setSetting('toolbar-position', v);
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { toolbarPosition: v }
        }));
      },
    });

    this.addSectionHeader(container, 'Code View');

    this.addSettingRow(container, {
      title: 'Syntax highlighting',
      description: 'Color code in Code view by language',
      type: 'toggle',
      value: this.getSetting('syntax-highlighting', true),
      onChange: (v) => {
        this.setSetting('syntax-highlighting', v);
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { syntaxHighlighting: v }
        }));
      },
    });

    this.addSectionHeader(container, 'Canvas');

    this.addSettingRow(container, {
      title: 'Show origin crosshair',
      description: 'Display red crosshair at canvas origin (0,0)',
      type: 'toggle',
      value: this.getSetting('show-origin', false),
      onChange: (v) => {
        this.setSetting('show-origin', v);
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { showOrigin: v }
        }));
      },
    });

    this.addSettingRow(container, {
      title: 'Snap to grid',
      description: 'Snap objects to grid when moving',
      type: 'toggle',
      value: this.getSetting('snap-to-grid', true),
      onChange: (v) => {
        this.setSetting('snap-to-grid', v);
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { snapToGrid: v }
        }));
      },
    });

    this.addSettingRow(container, {
      title: 'Grid size',
      description: 'Size of the grid in pixels',
      type: 'slider',
      value: this.getSetting('grid-size', 8),
      min: 1,
      max: 100,
      step: 1,
      format: (v: number) => `${v}px`,
      onChange: (v) => {
        this.setSetting('grid-size', v);
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { gridSize: v }
        }));
      },
    });
  }

  private renderFilesSettings(container: HTMLElement): void {
    this.addSectionHeader(container, 'Auto-save');

    this.addSettingRow(container, {
      title: 'Enable auto-save',
      description: 'Automatically save changes periodically',
      type: 'toggle',
      value: this.getSetting('auto-save', true),
      onChange: (v) => {
        this.setSetting('auto-save', v);
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { autosaveEnabled: v }
        }));
      },
    });

    this.addSettingRow(container, {
      title: 'Auto-save interval',
      description: 'How often to auto-save (in seconds)',
      type: 'slider',
      value: this.getSetting('auto-save-interval', 60),
      min: 10,
      max: 300,
      step: 10,
      format: (v: number) => `${v}s`,
      onChange: (v) => {
        this.setSetting('auto-save-interval', v);
        // Convert seconds to milliseconds for runtime
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { autosaveInterval: (v as number) * 1000 }
        }));
      },
    });

    this.addSectionHeader(container, 'Export');

    this.addSettingRow(container, {
      title: 'Default export format',
      description: 'Default format when exporting designs',
      type: 'select',
      value: this.getSetting('default-export-format', 'svg'),
      options: [
        { value: 'svg', label: 'SVG' },
        { value: 'png', label: 'PNG' },
        { value: 'pdf', label: 'PDF' },
      ],
      onChange: (v) => {
        this.setSetting('default-export-format', v);
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { defaultExportFormat: v }
        }));
      },
    });
  }

  private renderAppearanceSettings(container: HTMLElement): void {
    this.addSectionHeader(container, 'Interface');

    this.addSettingRow(container, {
      title: 'Text scale',
      description: 'Adjust text size in sidebars',
      type: 'slider',
      value: this.getSetting('text-scale', 1),
      min: 0.5,
      max: 2.0,
      step: 0.1,
      format: (v: number) => `${Math.round(v * 100)}%`,
      onChange: (v) => {
        this.setSetting('text-scale', v);
        document.documentElement.style.setProperty('--designlibre-text-scale', String(v));
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { textScale: v }
        }));
      },
    });

    this.addSettingRow(container, {
      title: 'Theme',
      description: 'Choose the color theme',
      type: 'select',
      value: getSavedThemeMode(),
      options: [
        { value: 'dark', label: 'Dark' },
        { value: 'light', label: 'Light' },
        { value: 'system', label: 'System' },
      ],
      onChange: (v) => {
        setThemeMode(v as ThemeMode);
      },
    });

    this.addSectionHeader(container, 'Canvas');

    this.addSettingRow(container, {
      title: 'Canvas background',
      description: 'Default background color for the canvas',
      type: 'select',
      value: this.getSetting('canvas-background', 'dark'),
      options: [
        { value: 'dark', label: 'Dark (#0a0a0a)' },
        { value: 'light', label: 'Light (#f5f5f5)' },
        { value: 'transparent', label: 'Transparent' },
      ],
      onChange: (v) => {
        this.setSetting('canvas-background', v);
        // Map value to actual color
        const colorMap: Record<string, string> = {
          'dark': '#0a0a0a',
          'light': '#f5f5f5',
          'transparent': 'transparent',
        };
        window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
          detail: { canvasBackground: colorMap[v as string] ?? '#0a0a0a' }
        }));
      },
    });
  }

  private renderHotkeysSettings(container: HTMLElement): void {
    const hotkeyManager = getHotkeyManager();

    // Reset all button
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: flex; justify-content: flex-end; margin-bottom: 16px;';

    const resetAllBtn = document.createElement('button');
    resetAllBtn.textContent = 'Reset All to Defaults';
    resetAllBtn.style.cssText = `
      padding: 6px 12px;
      background: transparent;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      color: var(--designlibre-text-secondary, #888);
      font-size: 18px;
      border-radius: 4px;
      cursor: pointer;
    `;
    resetAllBtn.addEventListener('click', () => {
      hotkeyManager.resetAllShortcuts();
      container.innerHTML = '';
      this.renderHotkeysSettings(container);
    });
    headerRow.appendChild(resetAllBtn);
    container.appendChild(headerRow);

    // Common Actions
    this.addSectionHeader(container, 'Common Actions');
    const commonActions = hotkeyManager.getActionsByCategory('common');
    for (const action of commonActions) {
      this.addEditableHotkeyRow(container, action);
    }

    // Tools
    this.addSectionHeader(container, 'Tools');
    const toolActions = hotkeyManager.getActionsByCategory('tools');
    for (const action of toolActions) {
      this.addEditableHotkeyRow(container, action);
    }

    // View
    this.addSectionHeader(container, 'View');
    const viewActions = hotkeyManager.getActionsByCategory('view');
    for (const action of viewActions) {
      this.addEditableHotkeyRow(container, action);
    }

    // AI
    this.addSectionHeader(container, 'AI');
    const aiActions = hotkeyManager.getActionsByCategory('ai');
    for (const action of aiActions) {
      this.addEditableHotkeyRow(container, action);
    }
  }

  private addEditableHotkeyRow(container: HTMLElement, action: HotkeyAction): void {
    const hotkeyManager = getHotkeyManager();
    const currentShortcut = hotkeyManager.getShortcut(action.id);
    const isCustom = hotkeyManager.hasCustomShortcut(action.id);

    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--designlibre-border-light, #252525);
    `;

    const actionEl = document.createElement('span');
    actionEl.textContent = action.name;
    actionEl.style.cssText = `
      font-size: 15px;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    row.appendChild(actionEl);

    const controlsWrapper = document.createElement('div');
    controlsWrapper.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    // Shortcut button (clickable to edit)
    const shortcutBtn = document.createElement('button');
    shortcutBtn.className = 'hotkey-shortcut-btn';
    shortcutBtn.textContent = currentShortcut || 'Click to set';
    shortcutBtn.style.cssText = `
      padding: 6px 12px;
      min-width: 80px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid ${isCustom ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-border, #3d3d3d)'};
      border-radius: 4px;
      font-family: monospace;
      font-size: 18px;
      color: ${isCustom ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-text-secondary, #888)'};
      cursor: pointer;
      transition: all 0.15s;
    `;

    shortcutBtn.addEventListener('mouseenter', () => {
      shortcutBtn.style.borderColor = 'var(--designlibre-accent, #0d99ff)';
    });
    shortcutBtn.addEventListener('mouseleave', () => {
      if (!shortcutBtn.classList.contains('recording')) {
        shortcutBtn.style.borderColor = isCustom ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-border, #3d3d3d)';
      }
    });

    shortcutBtn.addEventListener('click', () => {
      this.startRecordingHotkey(shortcutBtn, action, container);
    });

    controlsWrapper.appendChild(shortcutBtn);

    // Reset button (only show if custom)
    if (isCustom) {
      const resetBtn = document.createElement('button');
      resetBtn.innerHTML = '↺';
      resetBtn.title = `Reset to default (${action.defaultShortcut})`;
      resetBtn.style.cssText = `
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: var(--designlibre-text-secondary, #888);
        font-size: 21px;
        cursor: pointer;
        border-radius: 4px;
      `;
      resetBtn.addEventListener('click', () => {
        hotkeyManager.resetShortcut(action.id);
        container.innerHTML = '';
        this.renderHotkeysSettings(container);
      });
      controlsWrapper.appendChild(resetBtn);
    }

    row.appendChild(controlsWrapper);
    container.appendChild(row);
  }

  private startRecordingHotkey(button: HTMLElement, action: HotkeyAction, container: HTMLElement): void {
    const hotkeyManager = getHotkeyManager();

    button.classList.add('recording');
    button.textContent = 'Press keys...';
    button.style.borderColor = 'var(--designlibre-warning, #ff9800)';
    button.style.color = 'var(--designlibre-warning, #ff9800)';

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Escape cancels
      if (event.key === 'Escape') {
        cleanup();
        button.textContent = hotkeyManager.getShortcut(action.id) || 'Click to set';
        button.style.borderColor = hotkeyManager.hasCustomShortcut(action.id)
          ? 'var(--designlibre-accent, #0d99ff)'
          : 'var(--designlibre-border, #3d3d3d)';
        button.style.color = hotkeyManager.hasCustomShortcut(action.id)
          ? 'var(--designlibre-accent, #0d99ff)'
          : 'var(--designlibre-text-secondary, #888)';
        return;
      }

      // Don't capture modifier-only presses
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
        return;
      }

      const shortcut = hotkeyManager.eventToShortcut(event);
      if (!shortcut) return;

      // Check for conflicts
      const conflict = hotkeyManager.findConflict(shortcut, action.id);
      if (conflict) {
        const conflictAction = hotkeyManager.getAllActions().find((a) => a.id === conflict);
        if (conflictAction) {
          // Show brief conflict warning
          button.textContent = `Conflicts with ${conflictAction.name}!`;
          button.style.color = 'var(--designlibre-error, #f44336)';
          setTimeout(() => {
            cleanup();
            hotkeyManager.setShortcut(action.id, shortcut);
            container.innerHTML = '';
            this.renderHotkeysSettings(container);
          }, 800);
          return;
        }
      }

      cleanup();
      hotkeyManager.setShortcut(action.id, shortcut);
      container.innerHTML = '';
      this.renderHotkeysSettings(container);
    };

    const handleClick = (event: MouseEvent) => {
      if (!button.contains(event.target as Node)) {
        cleanup();
        button.textContent = hotkeyManager.getShortcut(action.id) || 'Click to set';
        button.style.borderColor = hotkeyManager.hasCustomShortcut(action.id)
          ? 'var(--designlibre-accent, #0d99ff)'
          : 'var(--designlibre-border, #3d3d3d)';
        button.style.color = hotkeyManager.hasCustomShortcut(action.id)
          ? 'var(--designlibre-accent, #0d99ff)'
          : 'var(--designlibre-text-secondary, #888)';
      }
    };

    const cleanup = () => {
      button.classList.remove('recording');
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('click', handleClick, true);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('click', handleClick, true);
  }

  private renderAISettings(container: HTMLElement): void {
    const configManager = getConfigManager();
    const config = configManager.getConfig();

    this.addSectionHeader(container, 'AI Providers');

    // Provider display names
    const PROVIDER_NAMES: Record<ProviderType, string> = {
      anthropic: 'Anthropic (Claude)',
      openai: 'OpenAI (GPT-4)',
      ollama: 'Ollama (Local)',
      llamacpp: 'llama.cpp (Local)',
    };

    // Provider toggles
    const providers: ProviderType[] = ['anthropic', 'openai', 'ollama', 'llamacpp'];

    for (const provider of providers) {
      const providerConfig = config.providers[provider];
      this.addProviderRow(container, provider, PROVIDER_NAMES[provider], providerConfig, configManager);
    }

    this.addSectionHeader(container, 'Default Settings');

    // Active provider
    const enabledProviders = providers.filter((p) => config.providers[p].enabled);
    if (enabledProviders.length > 0) {
      this.addSettingRow(container, {
        title: 'Default Provider',
        description: 'AI provider to use by default',
        type: 'select',
        value: config.activeProvider,
        options: enabledProviders.map((p) => ({ value: p, label: PROVIDER_NAMES[p] })),
        onChange: (v) => {
          configManager.setActiveProvider(v as ProviderType);
        },
      });
    }

    this.addSectionHeader(container, 'Keyboard Shortcuts');

    this.addHotkeyRow(container, 'Toggle AI Panel', 'Ctrl+Shift+L');
    this.addHotkeyRow(container, 'New AI Chat', 'Ctrl+Shift+N');
    this.addHotkeyRow(container, 'AI Command Palette', 'Ctrl+K');
  }

  private addProviderRow(
    container: HTMLElement,
    provider: ProviderType,
    displayName: string,
    providerConfig: { enabled: boolean; defaultModel: string; apiKey?: string; temperature: number; maxTokens: number; endpoint?: string; visionModel?: string },
    configManager: ReturnType<typeof getConfigManager>
  ): void {
    const row = document.createElement('div');
    row.style.cssText = `
      padding: 16px;
      background: var(--designlibre-bg-tertiary, #252525);
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    // Header row with toggle
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    const title = document.createElement('span');
    title.textContent = displayName;
    title.style.cssText = 'font-weight: 600; font-size: 21px; color: var(--designlibre-text-primary, #e4e4e4);';
    nameEl.appendChild(title);

    if (configManager.getConfig().activeProvider === provider) {
      const badge = document.createElement('span');
      badge.textContent = 'Active';
      badge.style.cssText = `
        padding: 2px 8px;
        background: var(--designlibre-accent, #4dabff);
        color: white;
        font-size: 15px;
        font-weight: 600;
        border-radius: 10px;
        text-transform: uppercase;
      `;
      nameEl.appendChild(badge);
    }

    headerRow.appendChild(nameEl);

    // Enable toggle
    const toggle = this.createAIToggle(providerConfig.enabled, (enabled) => {
      configManager.updateProviderConfig(provider, { enabled });
      // Re-render section
      container.innerHTML = '';
      this.renderAISettings(container);
    });
    headerRow.appendChild(toggle);
    row.appendChild(headerRow);

    // Provider details (only if enabled)
    if (providerConfig.enabled) {
      const details = document.createElement('div');
      details.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

      // API Key for cloud providers
      if (provider === 'anthropic' || provider === 'openai') {
        const apiKey = configManager.getApiKey(provider);
        details.appendChild(this.createAPIKeyInput(provider, apiKey, configManager));
      }

      // Endpoint for local providers
      if (provider === 'ollama' || provider === 'llamacpp') {
        const endpoint = providerConfig.endpoint ?? (provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:8080');
        details.appendChild(this.createEndpointInput(provider, endpoint, configManager));
      }

      // Model selection
      if (provider === 'ollama') {
        // Ollama: Dynamic model loading with chat and vision model selectors
        const chatModelContainer = document.createElement('div');
        chatModelContainer.className = 'ollama-chat-model';
        details.appendChild(chatModelContainer);
        this.loadOllamaModels(chatModelContainer, provider, 'chat', providerConfig.defaultModel, configManager);

        const visionModelContainer = document.createElement('div');
        visionModelContainer.className = 'ollama-vision-model';
        details.appendChild(visionModelContainer);
        this.loadOllamaModels(visionModelContainer, provider, 'vision', providerConfig.visionModel ?? 'llava:latest', configManager);
      } else {
        // Other providers: Static model list
        const models = AVAILABLE_MODELS[provider] ?? [];
        if (models.length > 0) {
          const modelRow = document.createElement('div');
          modelRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

          const label = document.createElement('label');
          label.textContent = 'Model';
          label.style.cssText = 'font-size: 18px; font-weight: 500; color: var(--designlibre-text-secondary, #a0a0a0);';
          modelRow.appendChild(label);

          const select = document.createElement('select');
          select.style.cssText = `
            padding: 8px 12px;
            border: 1px solid var(--designlibre-border, #3d3d3d);
            border-radius: 6px;
            background: var(--designlibre-bg-secondary, #2d2d2d);
            color: var(--designlibre-text-primary, #e4e4e4);
            font-size: 15px;
            outline: none;
          `;

          for (const model of models) {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${model.contextWindow.toLocaleString()} tokens)`;
            option.selected = model.id === providerConfig.defaultModel;
            select.appendChild(option);
          }

          select.addEventListener('change', () => {
            configManager.updateProviderConfig(provider, { defaultModel: select.value });
          });

          modelRow.appendChild(select);
          details.appendChild(modelRow);
        }
      }

      // Temperature slider
      const tempRow = document.createElement('div');
      tempRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

      const tempLabel = document.createElement('label');
      tempLabel.textContent = 'Temperature';
      tempLabel.style.cssText = 'font-size: 18px; font-weight: 500; color: var(--designlibre-text-secondary, #a0a0a0);';
      tempRow.appendChild(tempLabel);

      const tempSliderWrapper = document.createElement('div');
      tempSliderWrapper.style.cssText = 'display: flex; align-items: center; gap: 12px;';

      const tempSlider = document.createElement('input');
      tempSlider.type = 'range';
      tempSlider.min = '0';
      tempSlider.max = '1';
      tempSlider.step = '0.05';
      tempSlider.value = String(providerConfig.temperature);
      tempSlider.style.cssText = `
        flex: 1;
        height: 4px;
        -webkit-appearance: none;
        background: #444;
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      `;

      const tempValue = document.createElement('span');
      tempValue.textContent = providerConfig.temperature.toFixed(2);
      tempValue.style.cssText = `
        font-size: 15px;
        color: var(--designlibre-accent, #0d99ff);
        font-weight: 500;
        min-width: 40px;
        text-align: right;
      `;

      tempSlider.addEventListener('input', () => {
        const val = parseFloat(tempSlider.value);
        tempValue.textContent = val.toFixed(2);
        configManager.updateProviderConfig(provider, { temperature: val });
      });

      tempSliderWrapper.appendChild(tempSlider);
      tempSliderWrapper.appendChild(tempValue);
      tempRow.appendChild(tempSliderWrapper);
      details.appendChild(tempRow);

      // Max Tokens input
      const tokensRow = document.createElement('div');
      tokensRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

      const tokensLabel = document.createElement('label');
      tokensLabel.textContent = 'Max Tokens';
      tokensLabel.style.cssText = 'font-size: 18px; font-weight: 500; color: var(--designlibre-text-secondary, #a0a0a0);';
      tokensRow.appendChild(tokensLabel);

      const tokensInput = document.createElement('input');
      tokensInput.type = 'number';
      tokensInput.value = String(providerConfig.maxTokens);
      tokensInput.min = '1';
      tokensInput.max = '128000';
      tokensInput.style.cssText = `
        padding: 8px 12px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 6px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: 15px;
        outline: none;
        width: 120px;
      `;

      tokensInput.addEventListener('blur', () => {
        const val = parseInt(tokensInput.value, 10);
        if (!isNaN(val) && val > 0) {
          configManager.updateProviderConfig(provider, { maxTokens: val });
        }
      });

      tokensRow.appendChild(tokensInput);
      details.appendChild(tokensRow);

      // Test connection button
      const testRow = document.createElement('div');
      testRow.style.cssText = 'display: flex; align-items: center; gap: 12px;';

      const testBtn = document.createElement('button');
      testBtn.innerHTML = `${ICONS['refresh'] ?? ''} Test Connection`;
      testBtn.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: 18px;
        border-radius: 6px;
        cursor: pointer;
      `;

      const statusSpan = document.createElement('span');
      statusSpan.style.cssText = 'font-size: 18px;';

      testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        testBtn.innerHTML = `${ICONS['spinner'] ?? ''} Testing...`;
        statusSpan.textContent = '';

        try {
          // Get full config for testProviderConnection
          const fullConfig = configManager.getConfig().providers[provider];
          const result = await testProviderConnection(provider, fullConfig);
          if (result.success) {
            statusSpan.textContent = 'Connected successfully';
            statusSpan.style.color = 'var(--designlibre-success, #4caf50)';
          } else {
            statusSpan.textContent = result.error ?? 'Connection failed';
            statusSpan.style.color = 'var(--designlibre-error, #f44336)';
          }
        } catch (error) {
          statusSpan.textContent = error instanceof Error ? error.message : 'Connection failed';
          statusSpan.style.color = 'var(--designlibre-error, #f44336)';
        } finally {
          testBtn.disabled = false;
          testBtn.innerHTML = `${ICONS['refresh'] ?? ''} Test Connection`;
        }
      });

      testRow.appendChild(testBtn);
      testRow.appendChild(statusSpan);
      details.appendChild(testRow);

      row.appendChild(details);
    }

    container.appendChild(row);
  }

  private createAIToggle(checked: boolean, onChange: (checked: boolean) => void): HTMLElement {
    const toggle = document.createElement('label');
    toggle.style.cssText = 'position: relative; width: 44px; height: 24px; cursor: pointer;';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.style.cssText = 'opacity: 0; width: 0; height: 0;';
    input.addEventListener('change', () => onChange(input.checked));
    toggle.appendChild(input);

    const slider = document.createElement('span');
    slider.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: ${checked ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-bg-secondary, #3d3d3d)'};
      border-radius: 12px;
      transition: all 0.2s;
    `;

    const knob = document.createElement('span');
    knob.style.cssText = `
      position: absolute;
      width: 18px; height: 18px;
      left: ${checked ? '23px' : '3px'};
      top: 3px;
      background: white;
      border-radius: 50%;
      transition: all 0.2s;
    `;
    slider.appendChild(knob);
    toggle.appendChild(slider);

    input.addEventListener('change', () => {
      slider.style.background = input.checked ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-bg-secondary, #3d3d3d)';
      knob.style.left = input.checked ? '23px' : '3px';
    });

    return toggle;
  }

  private createAPIKeyInput(
    provider: ProviderType,
    apiKey: string,
    configManager: ReturnType<typeof getConfigManager>
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

    const label = document.createElement('label');
    label.textContent = 'API Key';
    label.style.cssText = 'font-size: 18px; font-weight: 500; color: var(--designlibre-text-secondary, #a0a0a0);';
    row.appendChild(label);

    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = 'display: flex; gap: 8px;';

    const input = document.createElement('input');
    input.type = 'password';
    input.value = apiKey;
    input.placeholder = provider === 'anthropic' ? 'sk-ant-...' : 'sk-...';
    input.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 15px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      outline: none;
    `;
    input.addEventListener('blur', () => {
      configManager.setApiKey(provider, input.value);
    });
    inputWrapper.appendChild(input);

    // Toggle visibility button
    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = ICONS['eye'] ?? '';
    toggleBtn.title = 'Show API key';
    toggleBtn.style.cssText = `
      width: 36px; height: 36px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-secondary, #a0a0a0);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    let showKey = false;
    toggleBtn.addEventListener('click', () => {
      showKey = !showKey;
      input.type = showKey ? 'text' : 'password';
      toggleBtn.innerHTML = showKey ? (ICONS['eyeOff'] ?? '') : (ICONS['eye'] ?? '');
      toggleBtn.title = showKey ? 'Hide API key' : 'Show API key';
    });
    inputWrapper.appendChild(toggleBtn);

    row.appendChild(inputWrapper);
    return row;
  }

  private createEndpointInput(
    provider: ProviderType,
    endpoint: string,
    configManager: ReturnType<typeof getConfigManager>
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

    const label = document.createElement('label');
    label.textContent = 'Endpoint';
    label.style.cssText = 'font-size: 18px; font-weight: 500; color: var(--designlibre-text-secondary, #a0a0a0);';
    row.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = endpoint;
    input.style.cssText = `
      padding: 8px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 15px;
      outline: none;
    `;
    input.addEventListener('blur', () => {
      configManager.updateProviderConfig(provider, { endpoint: input.value });
    });
    row.appendChild(input);

    return row;
  }

  /**
   * Load Ollama models dynamically from the server
   */
  private async loadOllamaModels(
    container: HTMLElement,
    provider: ProviderType,
    modelType: 'chat' | 'vision',
    currentModel: string,
    configManager: ReturnType<typeof getConfigManager>
  ): Promise<void> {
    const config = configManager.getConfig();
    const endpoint = config.providers.ollama.endpoint ?? 'http://localhost:11434';
    const isVision = modelType === 'vision';
    const labelText = isVision ? 'Vision Model' : 'Chat Model';
    const configKey = isVision ? 'visionModel' : 'defaultModel';

    container.innerHTML = '';
    container.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

    // Label row with refresh button
    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

    const label = document.createElement('label');
    label.innerHTML = isVision ? `<span style="display: flex; align-items: center; gap: 6px;">${ICONS['eye'] ?? ''} ${labelText}</span>` : labelText;
    label.style.cssText = 'font-size: 18px; font-weight: 500; color: var(--designlibre-text-secondary, #a0a0a0);';
    labelRow.appendChild(label);

    const refreshBtn = document.createElement('button');
    refreshBtn.innerHTML = ICONS['refresh'] ?? '';
    refreshBtn.title = 'Refresh models';
    refreshBtn.style.cssText = `
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-secondary, #a0a0a0);
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    refreshBtn.addEventListener('click', () => {
      this.loadOllamaModels(container, provider, modelType, currentModel, configManager);
    });
    labelRow.appendChild(refreshBtn);
    container.appendChild(labelRow);

    // Select element
    const select = document.createElement('select');
    select.style.cssText = `
      padding: 8px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 15px;
      outline: none;
    `;

    // Show loading state
    const loadingOption = document.createElement('option');
    loadingOption.textContent = 'Loading models...';
    loadingOption.disabled = true;
    select.appendChild(loadingOption);
    select.disabled = true;
    container.appendChild(select);

    try {
      // Fetch models from Ollama server
      const response = await fetch(`${endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json() as { models?: Array<{ name: string; size: number }> };
      const models = data.models ?? [];

      // Clear and populate select
      select.innerHTML = '';
      select.disabled = false;

      if (models.length === 0) {
        const noModelsOption = document.createElement('option');
        noModelsOption.textContent = 'No models found';
        noModelsOption.disabled = true;
        select.appendChild(noModelsOption);
        return;
      }

      // Add a "None" option for vision model (optional)
      if (isVision) {
        const noneOption = document.createElement('option');
        noneOption.value = '';
        noneOption.textContent = '(None)';
        noneOption.selected = !currentModel;
        select.appendChild(noneOption);
      }

      // Add models as options
      for (const model of models) {
        const option = document.createElement('option');
        option.value = model.name;
        const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(1);
        option.textContent = `${model.name} (${sizeGB} GB)`;
        option.selected = model.name === currentModel;
        select.appendChild(option);
      }

      select.addEventListener('change', () => {
        configManager.updateProviderConfig(provider, { [configKey]: select.value });
      });

    } catch (error) {
      // Show error state
      select.innerHTML = '';
      select.disabled = false;

      const errorOption = document.createElement('option');
      errorOption.textContent = error instanceof Error ? error.message : 'Failed to load models';
      errorOption.disabled = true;
      select.appendChild(errorOption);

      // Add manual input fallback
      const manualOption = document.createElement('option');
      manualOption.value = currentModel;
      manualOption.textContent = `Use: ${currentModel}`;
      manualOption.selected = true;
      select.appendChild(manualOption);

      select.addEventListener('change', () => {
        configManager.updateProviderConfig(provider, { [configKey]: select.value });
      });
    }
  }

  private renderPluginsSettings(container: HTMLElement): void {
    this.addSectionHeader(container, 'Core Plugins');

    const corePlugins = [
      { id: 'code-export', name: 'Code Export', description: 'Export designs to React, SwiftUI, Compose', enabled: true },
      { id: 'version-history', name: 'Version History', description: 'Track changes with Git integration', enabled: true },
      { id: 'ai-assistant', name: 'AI Assistant', description: 'AI-powered design suggestions', enabled: false },
    ];

    for (const plugin of corePlugins) {
      this.addSettingRow(container, {
        title: plugin.name,
        description: plugin.description,
        type: 'toggle',
        value: this.getSetting(`plugin-${plugin.id}`, plugin.enabled),
        onChange: (v) => {
          this.setSetting(`plugin-${plugin.id}`, v);
          window.dispatchEvent(new CustomEvent('designlibre-plugin-toggle', {
            detail: { pluginId: plugin.id, enabled: v }
          }));
        },
      });
    }

    this.addSectionHeader(container, 'Community Plugins');

    const placeholder = document.createElement('div');
    placeholder.style.cssText = `
      padding: 24px;
      text-align: center;
      color: var(--designlibre-text-secondary, #888);
      font-size: 15px;
    `;
    placeholder.textContent = 'Community plugins coming soon';
    container.appendChild(placeholder);
  }

  // ============================================================
  // UI Helpers
  // ============================================================

  private addSectionHeader(container: HTMLElement, title: string): void {
    const header = document.createElement('div');
    header.style.cssText = `
      font-size: 15px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
      padding: 16px 0 8px;
      border-bottom: 1px solid var(--designlibre-border, #2d2d2d);
      margin-bottom: 8px;
    `;
    if (container.children.length > 0) {
      header.style.marginTop = '16px';
    }
    header.textContent = title;
    container.appendChild(header);
  }

  private addSettingRow(
    container: HTMLElement,
    options: {
      title: string;
      description: string;
      type: 'toggle' | 'slider' | 'select' | 'info';
      value?: boolean | number | string;
      min?: number;
      max?: number;
      step?: number;
      format?: (v: number) => string;
      options?: Array<{ value: string; label: string }>;
      onChange?: (value: boolean | number | string) => void;
    }
  ): void {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid var(--designlibre-border-light, #252525);
    `;

    const textContainer = document.createElement('div');
    textContainer.style.cssText = 'flex: 1; margin-right: 16px;';

    const titleEl = document.createElement('div');
    titleEl.textContent = options.title;
    titleEl.style.cssText = `
      font-size: 21px;
      font-weight: 500;
      color: var(--designlibre-text-primary, #e4e4e4);
      margin-bottom: 4px;
    `;
    textContainer.appendChild(titleEl);

    const descEl = document.createElement('div');
    descEl.textContent = options.description;
    descEl.style.cssText = `
      font-size: 18px;
      color: var(--designlibre-text-secondary, #888);
    `;
    textContainer.appendChild(descEl);

    row.appendChild(textContainer);

    // Control based on type
    if (options.type === 'toggle' && typeof options.value === 'boolean') {
      row.appendChild(this.createToggle(options.value, options.onChange as (v: boolean) => void));
    } else if (options.type === 'slider' && typeof options.value === 'number') {
      row.appendChild(
        this.createSlider(
          options.value,
          options.min ?? 0,
          options.max ?? 100,
          options.step ?? 1,
          options.format ?? ((v) => String(v)),
          options.onChange as (v: number) => void
        )
      );
    } else if (options.type === 'select' && options.options) {
      row.appendChild(
        this.createSelect(
          options.value as string,
          options.options,
          options.onChange as (v: string) => void
        )
      );
    }

    container.appendChild(row);
  }

  private createToggle(value: boolean, onChange?: (v: boolean) => void): HTMLElement {
    const toggle = document.createElement('button');
    toggle.style.cssText = `
      width: 44px;
      height: 24px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      position: relative;
      transition: background-color 0.2s;
      background: ${value ? 'var(--designlibre-accent, #0d99ff)' : '#444'};
      flex-shrink: 0;
    `;

    const knob = document.createElement('div');
    knob.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      position: absolute;
      top: 2px;
      transition: left 0.2s;
      left: ${value ? '22px' : '2px'};
    `;
    toggle.appendChild(knob);

    let enabled = value;
    toggle.addEventListener('click', () => {
      enabled = !enabled;
      toggle.style.background = enabled ? 'var(--designlibre-accent, #0d99ff)' : '#444';
      knob.style.left = enabled ? '22px' : '2px';
      onChange?.(enabled);
    });

    return toggle;
  }

  private createSlider(
    value: number,
    min: number,
    max: number,
    step: number,
    format: (v: number) => string,
    onChange?: (v: number) => void
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = format(value);
    valueDisplay.style.cssText = `
      font-size: 15px;
      color: var(--designlibre-accent, #0d99ff);
      font-weight: 500;
      min-width: 50px;
      text-align: right;
    `;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.cssText = `
      width: 120px;
      height: 4px;
      -webkit-appearance: none;
      background: #444;
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    `;

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueDisplay.textContent = format(v);
      onChange?.(v);
    });

    wrapper.appendChild(slider);
    wrapper.appendChild(valueDisplay);

    return wrapper;
  }

  private createSelect(
    value: string,
    options: Array<{ value: string; label: string }>,
    onChange?: (v: string) => void
  ): HTMLElement {
    const select = document.createElement('select');
    select.style.cssText = `
      padding: 6px 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 15px;
      cursor: pointer;
      outline: none;
    `;

    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = opt.value === value;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      onChange?.(select.value);
    });

    return select;
  }

  private addHotkeyRow(container: HTMLElement, action: string, shortcut: string): void {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--designlibre-border-light, #252525);
    `;

    const actionEl = document.createElement('span');
    actionEl.textContent = action;
    actionEl.style.cssText = `
      font-size: 15px;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    row.appendChild(actionEl);

    const shortcutEl = document.createElement('kbd');
    shortcutEl.textContent = shortcut;
    shortcutEl.style.cssText = `
      padding: 4px 8px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      font-family: monospace;
      font-size: 18px;
      color: var(--designlibre-text-secondary, #888);
    `;
    row.appendChild(shortcutEl);

    container.appendChild(row);
  }

  // ============================================================
  // Settings Storage
  // ============================================================

  private getSetting<T>(key: string, defaultValue: T): T {
    const stored = localStorage.getItem(`designlibre-${key}`);
    if (stored === null) return defaultValue;

    if (typeof defaultValue === 'boolean') {
      return (stored === 'true') as unknown as T;
    }
    if (typeof defaultValue === 'number') {
      return parseFloat(stored) as unknown as T;
    }
    return stored as unknown as T;
  }

  private setSetting(key: string, value: boolean | number | string): void {
    localStorage.setItem(`designlibre-${key}`, String(value));
  }

  /**
   * Check if modal is open
   */
  isModalOpen(): boolean {
    return this.isOpen;
  }
}

// Singleton instance
let settingsModalInstance: SettingsModal | null = null;

/**
 * Get or create the settings modal instance
 */
export function getSettingsModal(): SettingsModal {
  if (!settingsModalInstance) {
    settingsModalInstance = new SettingsModal();
  }
  return settingsModalInstance;
}

/**
 * Open the settings modal
 */
export function openSettingsModal(initialCategory?: string): void {
  getSettingsModal().open(initialCategory);
}

/**
 * Close the settings modal
 */
export function closeSettingsModal(): void {
  getSettingsModal().close();
}
