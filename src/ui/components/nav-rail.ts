/**
 * Navigation Rail
 *
 * Vertical icon strip for primary navigation actions.
 * Relocatable - can be positioned left/right/top/bottom.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { Unsubscribe } from '@core/events/event-emitter';
import type { WorkspaceManager } from '@runtime/workspace-manager';
import type { Trunk } from '@core/types/workspace';

/**
 * Nav rail action definition
 */
export interface NavRailAction {
  id: string;
  icon: string;
  tooltip: string;
  shortcut?: string;
  onClick: () => void;
  isActive?: () => boolean;
  badge?: () => string | number | undefined;
}

/**
 * Nav rail options
 */
export interface NavRailOptions {
  /** Position of the rail */
  position?: 'left' | 'right' | 'top' | 'bottom';
  /** Width/height of the rail in pixels */
  size?: number;
  /** Show tooltips */
  showTooltips?: boolean;
  /** Workspace manager for trunk access */
  workspaceManager?: WorkspaceManager;
}

/**
 * SVG icons for nav rail
 */
const ICONS = {
  layers: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12,2 2,7 12,12 22,7 12,2"/>
    <polyline points="2,17 12,22 22,17"/>
    <polyline points="2,12 12,17 22,12"/>
  </svg>`,
  assets: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>`,
  components: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>`,
  history: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 3v5h5"/>
    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
    <path d="M12 7v5l4 2"/>
  </svg>`,
  search: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,
  settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,
  help: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,
  sidebar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
  </svg>`,
  sidebarClose: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
    <polyline points="14,9 11,12 14,15"/>
  </svg>`,
  trunk: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,
  chevronDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,
};

/**
 * Navigation Rail Component
 */
export class NavRail {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private options: Required<Omit<NavRailOptions, 'workspaceManager'>> & { workspaceManager?: WorkspaceManager };
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private activePanel: string = 'layers';
  private sidebarOpen: boolean = true;
  private subscriptions: Unsubscribe[] = [];
  private customActions: NavRailAction[] = [];
  private trunkDropdown: HTMLElement | null = null;
  private trunkDropdownOpen: boolean = false;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: NavRailOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    const baseOptions = {
      position: options.position ?? 'left',
      size: options.size ?? 48,
      showTooltips: options.showTooltips ?? true,
    };
    this.options = options.workspaceManager
      ? { ...baseOptions, workspaceManager: options.workspaceManager }
      : baseOptions;

    this.setup();
    this.setupGlobalClickHandler();
  }

  private setup(): void {
    this.element = document.createElement('nav');
    this.element.className = 'designlibre-nav-rail';
    this.element.setAttribute('role', 'navigation');
    this.element.setAttribute('aria-label', 'Main navigation');
    this.element.style.cssText = this.getRailStyles();

    // Toggle section (sidebar toggle)
    const toggleSection = document.createElement('div');
    toggleSection.className = 'nav-rail-toggle';
    toggleSection.style.cssText = this.getSectionStyles();
    toggleSection.appendChild(
      this.createButton({
        id: 'sidebar-toggle',
        icon: this.sidebarOpen ? ICONS.sidebarClose : ICONS.sidebar,
        tooltip: this.sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar',
        onClick: () => this.toggleSidebar(),
      })
    );
    this.element.appendChild(toggleSection);

    // Top section (main navigation)
    const topSection = document.createElement('div');
    topSection.className = 'nav-rail-top';
    topSection.style.cssText = this.getSectionStyles();

    const mainActions: NavRailAction[] = [
      {
        id: 'layers',
        icon: ICONS.layers,
        tooltip: 'Layers',
        shortcut: 'L',
        onClick: () => this.setActivePanel('layers'),
        isActive: () => this.activePanel === 'layers',
      },
      {
        id: 'assets',
        icon: ICONS.assets,
        tooltip: 'Assets',
        onClick: () => this.setActivePanel('assets'),
        isActive: () => this.activePanel === 'assets',
      },
      {
        id: 'components',
        icon: ICONS.components,
        tooltip: 'Components',
        onClick: () => this.setActivePanel('components'),
        isActive: () => this.activePanel === 'components',
      },
      {
        id: 'history',
        icon: ICONS.history,
        tooltip: 'Version History',
        onClick: () => this.setActivePanel('history'),
        isActive: () => this.activePanel === 'history',
      },
      {
        id: 'search',
        icon: ICONS.search,
        tooltip: 'Search',
        shortcut: 'Ctrl+F',
        onClick: () => this.openSearch(),
      },
    ];

    for (const action of mainActions) {
      topSection.appendChild(this.createButton(action));
    }

    this.element.appendChild(topSection);

    // Spacer
    const spacer = document.createElement('div');
    spacer.className = 'nav-rail-spacer';
    spacer.style.cssText = 'flex: 1;';
    this.element.appendChild(spacer);

    // Bottom section (system actions)
    const bottomSection = document.createElement('div');
    bottomSection.className = 'nav-rail-bottom';
    bottomSection.style.cssText = this.getSectionStyles();

    // Trunk selector (if workspace manager provided)
    if (this.options.workspaceManager) {
      const trunkButton = this.createTrunkButton();
      bottomSection.appendChild(trunkButton);
    }

    const systemActions: NavRailAction[] = [
      {
        id: 'help',
        icon: ICONS.help,
        tooltip: 'Help & Support',
        shortcut: 'F1',
        onClick: () => this.openHelp(),
      },
      {
        id: 'settings',
        icon: ICONS.settings,
        tooltip: 'Settings',
        shortcut: 'Ctrl+,',
        onClick: () => this.openSettings(),
      },
    ];

    for (const action of systemActions) {
      bottomSection.appendChild(this.createButton(action));
    }

    this.element.appendChild(bottomSection);
    this.container.appendChild(this.element);

    // Update active states
    this.updateActiveStates();
  }

  private getRailStyles(): string {
    const isVertical =
      this.options.position === 'left' || this.options.position === 'right';

    const base = `
      display: flex;
      background: var(--designlibre-bg-tertiary, #161616);
      border-${this.options.position === 'left' ? 'right' : this.options.position === 'right' ? 'left' : this.options.position === 'top' ? 'bottom' : 'top'}: 1px solid var(--designlibre-border, #2d2d2d);
      flex-direction: ${isVertical ? 'column' : 'row'};
      ${isVertical ? `width: ${this.options.size}px;` : `height: ${this.options.size}px;`}
      flex-shrink: 0;
      z-index: 100;
    `;

    return base;
  }

  private getSectionStyles(): string {
    const isVertical =
      this.options.position === 'left' || this.options.position === 'right';

    return `
      display: flex;
      flex-direction: ${isVertical ? 'column' : 'row'};
      padding: 8px;
      gap: 4px;
    `;
  }

  private setupGlobalClickHandler(): void {
    const handler = (e: MouseEvent) => {
      if (this.trunkDropdownOpen && this.trunkDropdown) {
        const target = e.target as Node;
        const trunkButton = this.buttons.get('trunk');
        if (!this.trunkDropdown.contains(target) && !trunkButton?.contains(target)) {
          this.closeTrunkDropdown();
        }
      }
    };
    document.addEventListener('click', handler);
    this.subscriptions.push(() => document.removeEventListener('click', handler));
  }

  private createTrunkButton(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'nav-rail-trunk-wrapper';
    wrapper.style.cssText = 'position: relative;';

    const button = document.createElement('button');
    button.className = 'nav-rail-button nav-rail-trunk-button';
    button.dataset['actionId'] = 'trunk';
    button.innerHTML = ICONS.trunk;
    button.title = 'Open or create workspace';
    button.setAttribute('aria-label', 'Open or create workspace');
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'false');

    button.style.cssText = `
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #888);
      transition: all 0.15s ease;
      position: relative;
    `;

    button.addEventListener('mouseenter', () => {
      if (!this.trunkDropdownOpen) {
        button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
        button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!this.trunkDropdownOpen) {
        button.style.backgroundColor = 'transparent';
        button.style.color = 'var(--designlibre-text-secondary, #888)';
      }
    });

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleTrunkDropdown();
    });

    this.buttons.set('trunk', button);
    wrapper.appendChild(button);

    return wrapper;
  }

  private toggleTrunkDropdown(): void {
    if (this.trunkDropdownOpen) {
      this.closeTrunkDropdown();
    } else {
      this.openTrunkDropdown();
    }
  }

  private openTrunkDropdown(): void {
    if (!this.options.workspaceManager) return;

    this.trunkDropdownOpen = true;
    const button = this.buttons.get('trunk');
    if (button) {
      button.setAttribute('aria-expanded', 'true');
      button.style.backgroundColor = 'var(--designlibre-accent-light, #1a3a5c)';
      button.style.color = 'var(--designlibre-accent, #0d99ff)';
    }

    // Create dropdown
    this.trunkDropdown = document.createElement('div');
    this.trunkDropdown.className = 'nav-rail-trunk-dropdown';
    this.trunkDropdown.style.cssText = `
      position: fixed;
      left: ${this.options.size + 8}px;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      min-width: 240px;
      max-height: 320px;
      overflow-y: auto;
      z-index: 1000;
      padding: 4px 0;
    `;

    // Position near the trunk button
    const buttonRect = button?.getBoundingClientRect();
    if (buttonRect) {
      // Position dropdown so it appears near the button, but above it to avoid going off screen
      const dropdownHeight = 320; // max height
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
        this.trunkDropdown.style.top = `${buttonRect.top}px`;
      } else {
        this.trunkDropdown.style.bottom = `${window.innerHeight - buttonRect.bottom}px`;
      }
    }

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--designlibre-text-secondary, #888);
      border-bottom: 1px solid var(--designlibre-border, #2d2d2d);
      margin-bottom: 4px;
    `;
    header.textContent = 'Workspaces';
    this.trunkDropdown.appendChild(header);

    // Get trunks from workspace manager
    const trunks = this.options.workspaceManager.getTrunks();
    const currentTrunk = this.options.workspaceManager.getCurrentTrunk();

    if (trunks.length > 0) {
      for (const trunk of trunks) {
        const item = this.createTrunkMenuItem(trunk, trunk.id === currentTrunk?.id);
        this.trunkDropdown.appendChild(item);
      }
    } else {
      const empty = document.createElement('div');
      empty.style.cssText = `
        padding: 16px 12px;
        text-align: center;
        color: var(--designlibre-text-secondary, #888);
        font-size: 13px;
      `;
      empty.textContent = 'No workspaces yet';
      this.trunkDropdown.appendChild(empty);
    }

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = `
      height: 1px;
      background: var(--designlibre-border, #2d2d2d);
      margin: 4px 0;
    `;
    this.trunkDropdown.appendChild(divider);

    // Create new trunk button
    const createBtn = document.createElement('button');
    createBtn.className = 'trunk-menu-item trunk-menu-create';
    createBtn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--designlibre-accent, #0d99ff);
      font-size: 13px;
      text-align: left;
      transition: background-color 0.15s;
    `;
    createBtn.innerHTML = `${ICONS.plus}<span>Create new workspace</span>`;
    createBtn.addEventListener('mouseenter', () => {
      createBtn.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    createBtn.addEventListener('mouseleave', () => {
      createBtn.style.backgroundColor = 'transparent';
    });
    createBtn.addEventListener('click', () => {
      this.closeTrunkDropdown();
      this.promptCreateTrunk();
    });
    this.trunkDropdown.appendChild(createBtn);

    document.body.appendChild(this.trunkDropdown);
  }

  private createTrunkMenuItem(trunk: Trunk, isActive: boolean): HTMLElement {
    const item = document.createElement('button');
    item.className = 'trunk-menu-item';
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: ${isActive ? 'var(--designlibre-accent-light, #1a3a5c)' : 'transparent'};
      cursor: pointer;
      color: ${isActive ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-text-primary, #e4e4e4)'};
      font-size: 13px;
      text-align: left;
      transition: background-color 0.15s;
    `;

    const icon = document.createElement('span');
    icon.innerHTML = ICONS.trunk;
    icon.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      opacity: 0.7;
    `;

    const label = document.createElement('span');
    label.textContent = trunk.name;
    label.style.cssText = `
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    const projectCount = document.createElement('span');
    projectCount.textContent = `${trunk.trees.length}`;
    projectCount.title = `${trunk.trees.length} project${trunk.trees.length !== 1 ? 's' : ''}`;
    projectCount.style.cssText = `
      font-size: 11px;
      color: var(--designlibre-text-secondary, #888);
      background: var(--designlibre-bg-tertiary, #161616);
      padding: 2px 6px;
      border-radius: 4px;
    `;

    item.appendChild(icon);
    item.appendChild(label);
    item.appendChild(projectCount);

    item.addEventListener('mouseenter', () => {
      if (!isActive) {
        item.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });
    item.addEventListener('mouseleave', () => {
      if (!isActive) {
        item.style.backgroundColor = 'transparent';
      }
    });
    item.addEventListener('click', () => {
      this.closeTrunkDropdown();
      this.options.workspaceManager?.setCurrentWorkspace(trunk.id);
    });

    return item;
  }

  private closeTrunkDropdown(): void {
    this.trunkDropdownOpen = false;
    const button = this.buttons.get('trunk');
    if (button) {
      button.setAttribute('aria-expanded', 'false');
      button.style.backgroundColor = 'transparent';
      button.style.color = 'var(--designlibre-text-secondary, #888)';
    }

    if (this.trunkDropdown) {
      this.trunkDropdown.remove();
      this.trunkDropdown = null;
    }
  }

  private promptCreateTrunk(): void {
    // Emit event to open create workspace modal
    window.dispatchEvent(new CustomEvent('designlibre-open-modal', {
      detail: { modal: 'create-workspace' },
    }));

    // If no external handler, use simple prompt
    const handlePrompt = () => {
      const name = prompt('Enter workspace name:');
      if (name && name.trim() && this.options.workspaceManager) {
        const trunk = this.options.workspaceManager.createWorkspace(name.trim());
        this.options.workspaceManager.setCurrentWorkspace(trunk.id);
      }
    };

    // Listen for whether the modal was handled
    let handled = false;
    const listener = () => { handled = true; };
    window.addEventListener('designlibre-modal-handled', listener, { once: true });

    // Small delay to check if handled
    setTimeout(() => {
      window.removeEventListener('designlibre-modal-handled', listener);
      if (!handled) {
        handlePrompt();
      }
    }, 100);
  }

  private createButton(action: NavRailAction): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'nav-rail-button';
    button.dataset['actionId'] = action.id;
    button.innerHTML = action.icon;

    const tooltipText = action.shortcut
      ? `${action.tooltip} (${action.shortcut})`
      : action.tooltip;
    button.title = tooltipText;
    button.setAttribute('aria-label', tooltipText);

    button.style.cssText = `
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #888);
      transition: all 0.15s ease;
      position: relative;
    `;

    // Hover effects
    button.addEventListener('mouseenter', () => {
      if (!button.classList.contains('active')) {
        button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
        button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('active')) {
        button.style.backgroundColor = 'transparent';
        button.style.color = 'var(--designlibre-text-secondary, #888)';
      }
    });

    // Click handler
    button.addEventListener('click', () => {
      action.onClick();
      this.updateActiveStates();
    });

    this.buttons.set(action.id, button);
    return button;
  }

  private updateActiveStates(): void {
    for (const [id, button] of this.buttons) {
      // Skip non-panel buttons
      if (id === 'sidebar-toggle' || id === 'search' || id === 'help' || id === 'settings') {
        continue;
      }

      const isActive = id === this.activePanel;
      if (isActive) {
        button.classList.add('active');
        button.style.backgroundColor = 'var(--designlibre-accent-light, #1a3a5c)';
        button.style.color = 'var(--designlibre-accent, #0d99ff)';
      } else {
        button.classList.remove('active');
        button.style.backgroundColor = 'transparent';
        button.style.color = 'var(--designlibre-text-secondary, #888)';
      }
    }

    // Update sidebar toggle icon
    const toggleButton = this.buttons.get('sidebar-toggle');
    if (toggleButton) {
      toggleButton.innerHTML = this.sidebarOpen ? ICONS.sidebarClose : ICONS.sidebar;
      toggleButton.title = this.sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar';
    }
  }

  // ============================================================
  // Public API
  // ============================================================

  /** Set the active panel */
  setActivePanel(panelId: string): void {
    this.activePanel = panelId;
    this.updateActiveStates();

    // Emit event
    window.dispatchEvent(
      new CustomEvent('designlibre-panel-changed', {
        detail: { panel: panelId },
      })
    );
  }

  /** Get the active panel */
  getActivePanel(): string {
    return this.activePanel;
  }

  /** Toggle sidebar visibility */
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.updateActiveStates();

    window.dispatchEvent(
      new CustomEvent('designlibre-sidebar-toggle', {
        detail: { open: this.sidebarOpen },
      })
    );
  }

  /** Set sidebar visibility */
  setSidebarOpen(open: boolean): void {
    this.sidebarOpen = open;
    this.updateActiveStates();
  }

  /** Check if sidebar is open */
  isSidebarOpen(): boolean {
    return this.sidebarOpen;
  }

  /** Add a custom action to the nav rail */
  addAction(action: NavRailAction, section: 'top' | 'bottom' = 'top'): Unsubscribe {
    const sectionEl = this.element?.querySelector(`.nav-rail-${section}`);
    if (!sectionEl) {
      console.warn(`Nav rail section not found: ${section}`);
      return () => {};
    }

    const button = this.createButton(action);
    sectionEl.appendChild(button);
    this.customActions.push(action);

    return () => {
      button.remove();
      this.buttons.delete(action.id);
      this.customActions = this.customActions.filter((a) => a.id !== action.id);
    };
  }

  /** Open search (placeholder) */
  private openSearch(): void {
    window.dispatchEvent(new CustomEvent('designlibre-open-search'));
  }

  /** Open help (placeholder) */
  private openHelp(): void {
    window.dispatchEvent(new CustomEvent('designlibre-open-modal', {
      detail: { modal: 'help' },
    }));
  }

  /** Open settings (placeholder) */
  private openSettings(): void {
    window.dispatchEvent(new CustomEvent('designlibre-open-modal', {
      detail: { modal: 'settings' },
    }));
  }

  /** Show the nav rail */
  show(): void {
    if (this.element) {
      this.element.style.display = 'flex';
    }
  }

  /** Hide the nav rail */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /** Get the element */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /** Get the runtime (for plugin access) */
  getRuntime(): DesignLibreRuntime {
    return this.runtime;
  }

  /** Dispose of the nav rail */
  dispose(): void {
    for (const unsub of this.subscriptions) {
      unsub();
    }
    this.subscriptions = [];
    this.buttons.clear();

    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

/**
 * Create a nav rail instance
 */
export function createNavRail(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: NavRailOptions
): NavRail {
  return new NavRail(runtime, container, options);
}
