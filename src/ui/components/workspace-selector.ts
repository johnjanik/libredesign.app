/**
 * Workspace Selector
 *
 * Dropdown for selecting and managing workspaces (Trunks).
 */

import type { WorkspaceManager } from '@runtime/workspace-manager';
import type { Trunk } from '@core/types/workspace';
import type { Unsubscribe } from '@core/events/event-emitter';

/**
 * Workspace selector options
 */
export interface WorkspaceSelectorOptions {
  /** Show create button */
  showCreate?: boolean;
  /** Show manage button */
  showManage?: boolean;
}

/**
 * SVG icons
 */
const ICONS = {
  workspace: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>`,
  cloud: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
  </svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,
  settings: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20,6 9,17 4,12"/>
  </svg>`,
  chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6,9 12,15 18,9"/>
  </svg>`,
};

/**
 * Workspace Selector Component
 */
export class WorkspaceSelector {
  private workspaceManager: WorkspaceManager;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private dropdownElement: HTMLElement | null = null;
  private options: Required<WorkspaceSelectorOptions>;
  private isOpen: boolean = false;
  private subscriptions: Unsubscribe[] = [];

  constructor(
    workspaceManager: WorkspaceManager,
    container: HTMLElement,
    options: WorkspaceSelectorOptions = {}
  ) {
    this.workspaceManager = workspaceManager;
    this.container = container;
    this.options = {
      showCreate: options.showCreate ?? true,
      showManage: options.showManage ?? true,
    };

    this.setup();
    this.setupEventListeners();
  }

  private setup(): void {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-workspace-selector';
    this.element.style.cssText = `
      position: relative;
      padding: 8px 12px;
    `;

    this.render();
    this.container.appendChild(this.element);

    // Close on outside click
    document.addEventListener('mousedown', this.handleOutsideClick);
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    if (this.isOpen && this.element && !this.element.contains(e.target as Node)) {
      this.closeDropdown();
    }
  };

  private setupEventListeners(): void {
    // Listen for workspace changes
    const unsub1 = this.workspaceManager.on('workspace:changed', () => {
      this.render();
    });

    const unsub2 = this.workspaceManager.on('workspace:list-changed', () => {
      this.render();
    });

    this.subscriptions.push(unsub1, unsub2);
  }

  private render(): void {
    if (!this.element) return;

    const currentTrunk = this.workspaceManager.getCurrentTrunk();

    this.element.innerHTML = '';

    // Selector button
    const button = document.createElement('button');
    button.className = 'workspace-selector-button';
    button.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-tertiary, #161616);
      color: var(--designlibre-text-primary, #e4e4e4);
      cursor: pointer;
      font-size: 13px;
      text-align: left;
      transition: border-color 0.15s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.borderColor = 'var(--designlibre-border-hover, #555)';
    });

    button.addEventListener('mouseleave', () => {
      if (!this.isOpen) {
        button.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      }
    });

    button.addEventListener('click', () => {
      this.toggleDropdown();
    });

    // Icon
    const icon = document.createElement('span');
    icon.innerHTML = ICONS.workspace;
    icon.style.cssText = 'display: flex; color: var(--designlibre-text-secondary, #888);';
    button.appendChild(icon);

    // Name
    const name = document.createElement('span');
    name.textContent = currentTrunk?.name ?? 'Select Workspace';
    name.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    button.appendChild(name);

    // Chevron
    const chevron = document.createElement('span');
    chevron.innerHTML = ICONS.chevron;
    chevron.style.cssText = `
      display: flex;
      color: var(--designlibre-text-secondary, #888);
      transition: transform 0.15s;
      ${this.isOpen ? 'transform: rotate(180deg);' : ''}
    `;
    button.appendChild(chevron);

    this.element.appendChild(button);

    // Dropdown (if open)
    if (this.isOpen) {
      this.renderDropdown();
    }
  }

  private renderDropdown(): void {
    if (!this.element) return;

    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'workspace-selector-dropdown';
    this.dropdownElement.style.cssText = `
      position: absolute;
      top: 100%;
      left: 12px;
      right: 12px;
      margin-top: 4px;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      max-height: 320px;
      overflow-y: auto;
    `;

    const trunks = this.workspaceManager.getTrunks();
    const currentTrunk = this.workspaceManager.getCurrentTrunk();

    // Workspace list
    if (trunks.length > 0) {
      const label = document.createElement('div');
      label.textContent = 'Workspaces';
      label.style.cssText = `
        padding: 8px 12px 4px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--designlibre-text-muted, #666);
      `;
      this.dropdownElement.appendChild(label);

      for (const trunk of trunks) {
        const item = this.createTrunkItem(trunk, trunk.id === currentTrunk?.id);
        this.dropdownElement.appendChild(item);
      }

      // Divider
      const divider = document.createElement('div');
      divider.style.cssText = `
        height: 1px;
        background: var(--designlibre-border, #3d3d3d);
        margin: 4px 0;
      `;
      this.dropdownElement.appendChild(divider);
    }

    // Actions
    if (this.options.showCreate) {
      const createItem = this.createActionItem(ICONS.plus, 'New Workspace', () => {
        this.createWorkspace();
      });
      this.dropdownElement.appendChild(createItem);
    }

    if (this.options.showManage) {
      const manageItem = this.createActionItem(ICONS.settings, 'Manage Workspaces...', () => {
        this.openWorkspaceManager();
      });
      this.dropdownElement.appendChild(manageItem);
    }

    this.element.appendChild(this.dropdownElement);
  }

  private createTrunkItem(trunk: Trunk, isActive: boolean): HTMLElement {
    const item = document.createElement('button');
    item.className = 'workspace-item';
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: ${isActive ? 'var(--designlibre-accent-light, #1a3a5c)' : 'transparent'};
      color: ${isActive ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-text-primary, #e4e4e4)'};
      cursor: pointer;
      font-size: 13px;
      text-align: left;
      transition: background-color 0.15s;
    `;

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
      this.selectWorkspace(trunk.id);
    });

    // Icon (cloud if synced)
    const icon = document.createElement('span');
    icon.innerHTML = trunk.settings.syncEnabled ? ICONS.cloud : ICONS.workspace;
    icon.style.cssText = 'display: flex;';
    item.appendChild(icon);

    // Name
    const name = document.createElement('span');
    name.textContent = trunk.name;
    name.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    item.appendChild(name);

    // Check if active
    if (isActive) {
      const check = document.createElement('span');
      check.innerHTML = ICONS.check;
      check.style.cssText = 'display: flex;';
      item.appendChild(check);
    }

    return item;
  }

  private createActionItem(
    icon: string,
    label: string,
    onClick: () => void
  ): HTMLElement {
    const item = document.createElement('button');
    item.className = 'workspace-action-item';
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-primary, #e4e4e4);
      cursor: pointer;
      font-size: 13px;
      text-align: left;
      transition: background-color 0.15s;
    `;

    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });

    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });

    item.addEventListener('click', onClick);

    const iconEl = document.createElement('span');
    iconEl.innerHTML = icon;
    iconEl.style.cssText = 'display: flex; color: var(--designlibre-text-secondary, #888);';
    item.appendChild(iconEl);

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    item.appendChild(labelEl);

    return item;
  }

  private toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    this.render();
  }

  private closeDropdown(): void {
    this.isOpen = false;
    this.render();
  }

  private selectWorkspace(trunkId: string): void {
    this.workspaceManager.setCurrentWorkspace(trunkId);
    this.closeDropdown();
  }

  private createWorkspace(): void {
    const name = prompt('Workspace name:');
    if (name?.trim()) {
      const trunk = this.workspaceManager.createWorkspace(name.trim());
      this.workspaceManager.setCurrentWorkspace(trunk.id);
    }
    this.closeDropdown();
  }

  private openWorkspaceManager(): void {
    this.closeDropdown();
    window.dispatchEvent(
      new CustomEvent('designlibre-open-modal', {
        detail: { modal: 'workspace-manager' },
      })
    );
  }

  // ============================================================
  // Public API
  // ============================================================

  /** Get element */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /** Dispose */
  dispose(): void {
    document.removeEventListener('mousedown', this.handleOutsideClick);

    for (const unsub of this.subscriptions) {
      unsub();
    }
    this.subscriptions = [];

    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

/**
 * Create a workspace selector
 */
export function createWorkspaceSelector(
  workspaceManager: WorkspaceManager,
  container: HTMLElement,
  options?: WorkspaceSelectorOptions
): WorkspaceSelector {
  return new WorkspaceSelector(workspaceManager, container, options);
}
