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
  project: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 3h18v18H3z"/>
    <path d="M3 9h18"/>
    <path d="M9 21V9"/>
  </svg>`,
  branch: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="6" y1="3" x2="6" y2="15"/>
    <circle cx="18" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M18 9a9 9 0 0 1-9 9"/>
  </svg>`,
  library: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <line x1="8" y1="6" x2="16" y2="6"/>
    <line x1="8" y1="10" x2="14" y2="10"/>
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
  private projectDropdown: HTMLElement | null = null;
  private projectDropdownOpen: boolean = false;
  private settingsDropdown: HTMLElement | null = null;
  private settingsDropdownOpen: boolean = false;

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
        id: 'library',
        icon: ICONS.library,
        tooltip: 'Library',
        onClick: () => this.setActivePanel('library'),
        isActive: () => this.activePanel === 'library',
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

      // Project selector
      const projectButton = this.createProjectButton();
      bottomSection.appendChild(projectButton);
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
      const target = e.target as Node;

      // Close trunk dropdown if clicking outside
      if (this.trunkDropdownOpen && this.trunkDropdown) {
        const trunkButton = this.buttons.get('trunk');
        if (!this.trunkDropdown.contains(target) && !trunkButton?.contains(target)) {
          this.closeTrunkDropdown();
        }
      }

      // Close project dropdown if clicking outside
      if (this.projectDropdownOpen && this.projectDropdown) {
        const projectButton = this.buttons.get('project');
        if (!this.projectDropdown.contains(target) && !projectButton?.contains(target)) {
          this.closeProjectDropdown();
        }
      }

      // Close settings dropdown if clicking outside
      if (this.settingsDropdownOpen && this.settingsDropdown) {
        const settingsButton = this.buttons.get('settings');
        if (!this.settingsDropdown.contains(target) && !settingsButton?.contains(target)) {
          this.closeSettingsDropdown();
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

    // Close project dropdown if open
    if (this.projectDropdownOpen) {
      this.closeProjectDropdown();
    }

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

  // ============================================================
  // Project Dropdown
  // ============================================================

  private createProjectButton(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'nav-rail-project-wrapper';
    wrapper.style.cssText = 'position: relative;';

    const button = document.createElement('button');
    button.className = 'nav-rail-button nav-rail-project-button';
    button.dataset['actionId'] = 'project';
    button.innerHTML = ICONS.project;
    button.title = 'Select project and branch';
    button.setAttribute('aria-label', 'Select project and branch');
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
      if (!this.projectDropdownOpen) {
        button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
        button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!this.projectDropdownOpen) {
        button.style.backgroundColor = 'transparent';
        button.style.color = 'var(--designlibre-text-secondary, #888)';
      }
    });

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleProjectDropdown();
    });

    this.buttons.set('project', button);
    wrapper.appendChild(button);

    return wrapper;
  }

  private toggleProjectDropdown(): void {
    if (this.projectDropdownOpen) {
      this.closeProjectDropdown();
    } else {
      this.openProjectDropdown();
    }
  }

  private openProjectDropdown(): void {
    if (!this.options.workspaceManager) return;

    // Close trunk dropdown if open
    if (this.trunkDropdownOpen) {
      this.closeTrunkDropdown();
    }

    this.projectDropdownOpen = true;
    const button = this.buttons.get('project');
    if (button) {
      button.setAttribute('aria-expanded', 'true');
      button.style.backgroundColor = 'var(--designlibre-accent-light, #1a3a5c)';
      button.style.color = 'var(--designlibre-accent, #0d99ff)';
    }

    // Create dropdown
    this.projectDropdown = document.createElement('div');
    this.projectDropdown.className = 'nav-rail-project-dropdown';
    this.projectDropdown.style.cssText = `
      position: fixed;
      left: ${this.options.size + 8}px;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      min-width: 260px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 1000;
      padding: 4px 0;
    `;

    // Position near the project button
    const buttonRect = button?.getBoundingClientRect();
    if (buttonRect) {
      const dropdownHeight = 400;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
        this.projectDropdown.style.top = `${buttonRect.top}px`;
      } else {
        this.projectDropdown.style.bottom = `${window.innerHeight - buttonRect.bottom}px`;
      }
    }

    const currentTrunk = this.options.workspaceManager.getCurrentTrunk();
    const currentTree = this.options.workspaceManager.getCurrentTree();
    const currentBranch = this.options.workspaceManager.getCurrentBranch();

    // Projects section
    const projectHeader = document.createElement('div');
    projectHeader.style.cssText = `
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--designlibre-text-secondary, #888);
      border-bottom: 1px solid var(--designlibre-border, #2d2d2d);
      margin-bottom: 4px;
    `;
    projectHeader.textContent = 'Projects';
    this.projectDropdown.appendChild(projectHeader);

    // List projects in current workspace
    if (currentTrunk && currentTrunk.trees.length > 0) {
      for (const treeRef of currentTrunk.trees) {
        const tree = this.options.workspaceManager.getTree(treeRef.id);
        if (tree) {
          const item = this.createProjectMenuItem(tree.name, tree.id, tree.id === currentTree?.id);
          this.projectDropdown.appendChild(item);
        }
      }
    } else {
      const empty = document.createElement('div');
      empty.style.cssText = `
        padding: 12px;
        text-align: center;
        color: var(--designlibre-text-secondary, #888);
        font-size: 13px;
      `;
      empty.textContent = 'No projects yet';
      this.projectDropdown.appendChild(empty);
    }

    // Create project button
    const createProjectBtn = document.createElement('button');
    createProjectBtn.className = 'project-menu-item project-menu-create';
    createProjectBtn.style.cssText = `
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
    createProjectBtn.innerHTML = `${ICONS.plus}<span>Create new project</span>`;
    createProjectBtn.addEventListener('mouseenter', () => {
      createProjectBtn.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    createProjectBtn.addEventListener('mouseleave', () => {
      createProjectBtn.style.backgroundColor = 'transparent';
    });
    createProjectBtn.addEventListener('click', () => {
      this.closeProjectDropdown();
      this.promptCreateProject();
    });
    this.projectDropdown.appendChild(createProjectBtn);

    // Branches section (if project selected)
    if (currentTree) {
      const branchDivider = document.createElement('div');
      branchDivider.style.cssText = `
        height: 1px;
        background: var(--designlibre-border, #2d2d2d);
        margin: 8px 0;
      `;
      this.projectDropdown.appendChild(branchDivider);

      const branchHeader = document.createElement('div');
      branchHeader.style.cssText = `
        padding: 8px 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--designlibre-text-secondary, #888);
        border-bottom: 1px solid var(--designlibre-border, #2d2d2d);
        margin-bottom: 4px;
      `;
      branchHeader.textContent = 'Branches';
      this.projectDropdown.appendChild(branchHeader);

      // List branches
      if (currentTree.branches.length > 0) {
        for (const branch of currentTree.branches) {
          const item = this.createBranchMenuItem(branch.name, branch.id, branch.id === currentBranch?.id);
          this.projectDropdown.appendChild(item);
        }
      }

      // Create branch button
      const createBranchBtn = document.createElement('button');
      createBranchBtn.className = 'branch-menu-item branch-menu-create';
      createBranchBtn.style.cssText = `
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
      createBranchBtn.innerHTML = `${ICONS.plus}<span>Create new branch</span>`;
      createBranchBtn.addEventListener('mouseenter', () => {
        createBranchBtn.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      });
      createBranchBtn.addEventListener('mouseleave', () => {
        createBranchBtn.style.backgroundColor = 'transparent';
      });
      createBranchBtn.addEventListener('click', () => {
        this.closeProjectDropdown();
        this.promptCreateBranch();
      });
      this.projectDropdown.appendChild(createBranchBtn);
    }

    document.body.appendChild(this.projectDropdown);
  }

  private createProjectMenuItem(name: string, id: string, isActive: boolean): HTMLElement {
    const item = document.createElement('button');
    item.className = 'project-menu-item';
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
    icon.innerHTML = ICONS.project;
    icon.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      opacity: 0.7;
    `;

    const label = document.createElement('span');
    label.textContent = name;
    label.style.cssText = `
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    item.appendChild(icon);
    item.appendChild(label);

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
      this.closeProjectDropdown();
      this.options.workspaceManager?.openProject(id);
    });

    return item;
  }

  private createBranchMenuItem(name: string, id: string, isActive: boolean): HTMLElement {
    const item = document.createElement('button');
    item.className = 'branch-menu-item';
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
    icon.innerHTML = ICONS.branch;
    icon.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      opacity: 0.7;
    `;

    const label = document.createElement('span');
    label.textContent = name;
    label.style.cssText = `
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    item.appendChild(icon);
    item.appendChild(label);

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
      this.closeProjectDropdown();
      this.options.workspaceManager?.switchBranch(id);
    });

    return item;
  }

  private closeProjectDropdown(): void {
    this.projectDropdownOpen = false;
    const button = this.buttons.get('project');
    if (button) {
      button.setAttribute('aria-expanded', 'false');
      button.style.backgroundColor = 'transparent';
      button.style.color = 'var(--designlibre-text-secondary, #888)';
    }

    if (this.projectDropdown) {
      this.projectDropdown.remove();
      this.projectDropdown = null;
    }
  }

  private promptCreateProject(): void {
    const name = prompt('Enter project name:');
    if (name && name.trim() && this.options.workspaceManager) {
      // Use current directory as default path
      const path = `./${name.trim().toLowerCase().replace(/\s+/g, '-')}`;
      const tree = this.options.workspaceManager.createProject(name.trim(), path);
      this.options.workspaceManager.openProject(tree.id);
    }
  }

  private promptCreateBranch(): void {
    const name = prompt('Enter branch name:');
    if (name && name.trim() && this.options.workspaceManager) {
      const branch = this.options.workspaceManager.createBranch(name.trim());
      this.options.workspaceManager.switchBranch(branch.id);
    }
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

  /** Toggle settings dropdown */
  private openSettings(): void {
    if (this.settingsDropdownOpen) {
      this.closeSettingsDropdown();
    } else {
      this.openSettingsDropdown();
    }
  }

  private openSettingsDropdown(): void {
    // Close other dropdowns
    if (this.trunkDropdownOpen) this.closeTrunkDropdown();
    if (this.projectDropdownOpen) this.closeProjectDropdown();

    this.settingsDropdownOpen = true;
    const button = this.buttons.get('settings');
    if (button) {
      button.style.backgroundColor = 'var(--designlibre-accent-light, #1a3a5c)';
      button.style.color = 'var(--designlibre-accent, #0d99ff)';
    }

    // Create dropdown
    this.settingsDropdown = document.createElement('div');
    this.settingsDropdown.className = 'nav-rail-settings-dropdown';
    this.settingsDropdown.style.cssText = `
      position: fixed;
      left: ${this.options.size + 8}px;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      min-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 1000;
      padding: 8px;
    `;

    // Position near the settings button
    const buttonRect = button?.getBoundingClientRect();
    if (buttonRect) {
      const dropdownHeight = 300;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      if (spaceBelow >= dropdownHeight) {
        this.settingsDropdown.style.top = `${buttonRect.top}px`;
      } else {
        this.settingsDropdown.style.bottom = `${window.innerHeight - buttonRect.bottom}px`;
      }
    }

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      font-weight: 600;
      padding: 4px 8px 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      margin-bottom: 8px;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    header.textContent = 'Settings';
    this.settingsDropdown.appendChild(header);

    // Syntax Highlighting toggle
    const syntaxHighlightSetting = this.createToggleSetting(
      'Syntax Highlighting',
      'Color code in Code view by language',
      this.getSyntaxHighlightingSetting(),
      (enabled) => this.setSyntaxHighlightingSetting(enabled)
    );
    this.settingsDropdown.appendChild(syntaxHighlightSetting);

    // Text Scale slider
    const textScaleSetting = this.createSliderSetting(
      'Text Scale',
      'Adjust text size in sidebars',
      this.getTextScaleSetting(),
      0.5, 2.5, 0.1,
      (value) => `${Math.round(value * 100)}%`,
      (scale) => this.setTextScaleSetting(scale)
    );
    this.settingsDropdown.appendChild(textScaleSetting);

    // Show Origin Crosshair toggle
    const showOriginSetting = this.createToggleSetting(
      'Show Origin Crosshair',
      'Display red crosshair at canvas origin (0,0)',
      this.getShowOriginSetting(),
      (enabled) => this.setShowOriginSetting(enabled)
    );
    this.settingsDropdown.appendChild(showOriginSetting);

    document.body.appendChild(this.settingsDropdown);
  }

  private closeSettingsDropdown(): void {
    this.settingsDropdownOpen = false;
    const button = this.buttons.get('settings');
    if (button) {
      button.style.backgroundColor = 'transparent';
      button.style.color = 'var(--designlibre-text-secondary, #888)';
    }

    if (this.settingsDropdown) {
      this.settingsDropdown.remove();
      this.settingsDropdown = null;
    }
  }

  // Settings helper methods
  private createToggleSetting(
    label: string,
    description: string,
    initialValue: boolean,
    onChange: (enabled: boolean) => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8px;
      border-radius: 4px;
    `;

    const textContainer = document.createElement('div');
    textContainer.style.cssText = 'flex: 1; margin-right: 12px;';

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-weight: 500; margin-bottom: 2px; color: var(--designlibre-text-primary, #e4e4e4);';
    textContainer.appendChild(labelEl);

    const descEl = document.createElement('div');
    descEl.textContent = description;
    descEl.style.cssText = 'font-size: 11px; color: var(--designlibre-text-secondary, #888);';
    textContainer.appendChild(descEl);

    row.appendChild(textContainer);

    // Toggle switch
    const toggle = document.createElement('button');
    toggle.style.cssText = `
      width: 40px;
      height: 22px;
      border-radius: 11px;
      border: none;
      cursor: pointer;
      position: relative;
      transition: background-color 0.2s;
      background: ${initialValue ? 'var(--designlibre-accent, #0d99ff)' : '#444'};
      flex-shrink: 0;
    `;

    const knob = document.createElement('div');
    knob.style.cssText = `
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      position: absolute;
      top: 2px;
      transition: left 0.2s;
      left: ${initialValue ? '20px' : '2px'};
    `;
    toggle.appendChild(knob);

    let enabled = initialValue;
    toggle.addEventListener('click', () => {
      enabled = !enabled;
      toggle.style.background = enabled ? 'var(--designlibre-accent, #0d99ff)' : '#444';
      knob.style.left = enabled ? '20px' : '2px';
      onChange(enabled);
    });

    row.appendChild(toggle);
    return row;
  }

  private createSliderSetting(
    label: string,
    description: string,
    initialValue: number,
    min: number,
    max: number,
    step: number,
    formatValue: (value: number) => string,
    onChange: (value: number) => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'padding: 8px; border-radius: 4px;';

    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';

    const textContainer = document.createElement('div');

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-weight: 500; margin-bottom: 2px; color: var(--designlibre-text-primary, #e4e4e4);';
    textContainer.appendChild(labelEl);

    const descEl = document.createElement('div');
    descEl.textContent = description;
    descEl.style.cssText = 'font-size: 11px; color: var(--designlibre-text-secondary, #888);';
    textContainer.appendChild(descEl);

    headerRow.appendChild(textContainer);

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = formatValue(initialValue);
    valueDisplay.style.cssText = 'font-size: 12px; color: var(--designlibre-accent, #0d99ff); font-weight: 500; min-width: 40px; text-align: right;';
    headerRow.appendChild(valueDisplay);

    row.appendChild(headerRow);

    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(initialValue);
    slider.style.cssText = `
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      background: #444;
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    `;

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      valueDisplay.textContent = formatValue(value);
      onChange(value);
    });

    row.appendChild(slider);
    return row;
  }

  // Settings getters/setters
  private getSyntaxHighlightingSetting(): boolean {
    const stored = localStorage.getItem('designlibre-syntax-highlighting');
    return stored !== 'false';
  }

  private setSyntaxHighlightingSetting(enabled: boolean): void {
    localStorage.setItem('designlibre-syntax-highlighting', String(enabled));
    window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
      detail: { syntaxHighlighting: enabled }
    }));
  }

  private getTextScaleSetting(): number {
    const stored = localStorage.getItem('designlibre-text-scale');
    return stored ? parseFloat(stored) : 1.0;
  }

  private setTextScaleSetting(scale: number): void {
    localStorage.setItem('designlibre-text-scale', String(scale));
    document.documentElement.style.setProperty('--designlibre-text-scale', String(scale));
    window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
      detail: { textScale: scale }
    }));
  }

  private getShowOriginSetting(): boolean {
    const stored = localStorage.getItem('designlibre-show-origin');
    return stored === 'true';
  }

  private setShowOriginSetting(enabled: boolean): void {
    localStorage.setItem('designlibre-show-origin', String(enabled));
    window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
      detail: { showOrigin: enabled }
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
