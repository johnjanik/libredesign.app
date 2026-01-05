/**
 * Project Selector
 *
 * Dropdowns for selecting Tree (project) and Branch.
 */

import type { WorkspaceManager } from '@runtime/workspace-manager';
import type { Tree, Branch } from '@core/types/project';
import type { TreeReference } from '@core/types/workspace';
import type { Unsubscribe } from '@core/events/event-emitter';

/**
 * Project selector options
 */
export interface ProjectSelectorOptions {
  /** Show create project button */
  showCreateProject?: boolean;
  /** Show create branch button */
  showCreateBranch?: boolean;
}

/**
 * SVG icons
 */
const ICONS = {
  tree: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 22V8"/>
    <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
    <path d="M12 2a5 5 0 0 0-5 5v2h10V7a5 5 0 0 0-5-5z"/>
  </svg>`,
  branch: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="6" y1="3" x2="6" y2="15"/>
    <circle cx="18" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M18 9a9 9 0 0 1-9 9"/>
  </svg>`,
  plus: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,
  merge: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="18" cy="18" r="3"/>
    <circle cx="6" cy="6" r="3"/>
    <path d="M6 21V9a9 9 0 0 0 9 9"/>
  </svg>`,
  trash: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`,
  chevron: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6,9 12,15 18,9"/>
  </svg>`,
  shield: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>`,
};

/**
 * Project Selector Component
 */
export class ProjectSelector {
  private workspaceManager: WorkspaceManager;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private options: Required<ProjectSelectorOptions>;
  private subscriptions: Unsubscribe[] = [];

  private treeDropdownOpen: boolean = false;
  private branchDropdownOpen: boolean = false;

  constructor(
    workspaceManager: WorkspaceManager,
    container: HTMLElement,
    options: ProjectSelectorOptions = {}
  ) {
    this.workspaceManager = workspaceManager;
    this.container = container;
    this.options = {
      showCreateProject: options.showCreateProject ?? true,
      showCreateBranch: options.showCreateBranch ?? true,
    };

    this.setup();
    this.setupEventListeners();
  }

  private setup(): void {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-project-selector';
    this.element.style.cssText = `
      padding: 0 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    this.render();
    this.container.appendChild(this.element);

    // Close on outside click
    document.addEventListener('mousedown', this.handleOutsideClick);
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    if (this.element && !this.element.contains(e.target as Node)) {
      if (this.treeDropdownOpen || this.branchDropdownOpen) {
        this.treeDropdownOpen = false;
        this.branchDropdownOpen = false;
        this.render();
      }
    }
  };

  private setupEventListeners(): void {
    const unsub1 = this.workspaceManager.on('workspace:changed', () => {
      this.render();
    });

    const unsub2 = this.workspaceManager.on('project:opened', () => {
      this.render();
    });

    const unsub3 = this.workspaceManager.on('project:closed', () => {
      this.render();
    });

    const unsub4 = this.workspaceManager.on('branch:switched', () => {
      this.render();
    });

    this.subscriptions.push(unsub1, unsub2, unsub3, unsub4);
  }

  private render(): void {
    if (!this.element) return;

    const currentTrunk = this.workspaceManager.getCurrentTrunk();
    const currentTree = this.workspaceManager.getCurrentTree();
    const currentBranch = this.workspaceManager.getCurrentBranch();

    this.element.innerHTML = '';

    if (!currentTrunk) {
      const placeholder = document.createElement('div');
      placeholder.textContent = 'Select a workspace first';
      placeholder.style.cssText = `
        color: var(--designlibre-text-muted, #666);
        font-size: 12px;
        padding: 8px 0;
      `;
      this.element.appendChild(placeholder);
      return;
    }

    // Tree selector
    const treeSelector = this.createSelector({
      icon: ICONS.tree,
      label: currentTree?.name ?? 'Select Project',
      isOpen: this.treeDropdownOpen,
      onToggle: () => {
        this.treeDropdownOpen = !this.treeDropdownOpen;
        this.branchDropdownOpen = false;
        this.render();
      },
      renderDropdown: () => this.renderTreeDropdown(currentTrunk.trees, currentTree),
    });
    this.element.appendChild(treeSelector);

    // Branch selector (only if tree is selected)
    if (currentTree) {
      const branchSelector = this.createSelector({
        icon: ICONS.branch,
        label: currentBranch?.name ?? 'Select Branch',
        isOpen: this.branchDropdownOpen,
        onToggle: () => {
          this.branchDropdownOpen = !this.branchDropdownOpen;
          this.treeDropdownOpen = false;
          this.render();
        },
        renderDropdown: () => this.renderBranchDropdown(currentTree.branches, currentBranch),
      });
      this.element.appendChild(branchSelector);
    }
  }

  private createSelector(config: {
    icon: string;
    label: string;
    isOpen: boolean;
    onToggle: () => void;
    renderDropdown: () => HTMLElement;
  }): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative;';

    const button = document.createElement('button');
    button.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: transparent;
      color: var(--designlibre-text-primary, #e4e4e4);
      cursor: pointer;
      font-size: 12px;
      text-align: left;
      transition: border-color 0.15s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.borderColor = 'var(--designlibre-border-hover, #555)';
    });

    button.addEventListener('mouseleave', () => {
      if (!config.isOpen) {
        button.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      }
    });

    button.addEventListener('click', config.onToggle);

    // Icon
    const icon = document.createElement('span');
    icon.innerHTML = config.icon;
    icon.style.cssText = 'display: flex; color: var(--designlibre-text-secondary, #888);';
    button.appendChild(icon);

    // Label
    const label = document.createElement('span');
    label.textContent = config.label;
    label.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    button.appendChild(label);

    // Chevron
    const chevron = document.createElement('span');
    chevron.innerHTML = ICONS.chevron;
    chevron.style.cssText = `
      display: flex;
      color: var(--designlibre-text-secondary, #888);
      transition: transform 0.15s;
      ${config.isOpen ? 'transform: rotate(180deg);' : ''}
    `;
    button.appendChild(chevron);

    wrapper.appendChild(button);

    if (config.isOpen) {
      wrapper.appendChild(config.renderDropdown());
    }

    return wrapper;
  }

  private renderTreeDropdown(
    trees: TreeReference[],
    currentTree: Tree | undefined
  ): HTMLElement {
    const dropdown = document.createElement('div');
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      max-height: 240px;
      overflow-y: auto;
    `;

    if (trees.length > 0) {
      for (const tree of trees) {
        const item = this.createDropdownItem({
          icon: ICONS.tree,
          label: tree.name,
          isActive: tree.id === currentTree?.id,
          onClick: () => {
            this.workspaceManager.openProject(tree.id);
            this.treeDropdownOpen = false;
            this.render();
          },
        });
        dropdown.appendChild(item);
      }

      const divider = document.createElement('div');
      divider.style.cssText = 'height: 1px; background: var(--designlibre-border, #3d3d3d); margin: 4px 0;';
      dropdown.appendChild(divider);
    }

    if (this.options.showCreateProject) {
      const createItem = this.createDropdownItem({
        icon: ICONS.plus,
        label: 'New Project',
        onClick: () => {
          this.createProject();
        },
      });
      dropdown.appendChild(createItem);
    }

    return dropdown;
  }

  private renderBranchDropdown(
    branches: Branch[],
    currentBranch: Branch | undefined
  ): HTMLElement {
    const dropdown = document.createElement('div');
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      max-height: 240px;
      overflow-y: auto;
    `;

    for (const branch of branches) {
      const item = this.createBranchItem(branch, branch.id === currentBranch?.id);
      dropdown.appendChild(item);
    }

    const divider = document.createElement('div');
    divider.style.cssText = 'height: 1px; background: var(--designlibre-border, #3d3d3d); margin: 4px 0;';
    dropdown.appendChild(divider);

    if (this.options.showCreateBranch) {
      const createItem = this.createDropdownItem({
        icon: ICONS.plus,
        label: 'New Branch',
        onClick: () => {
          this.createBranch();
        },
      });
      dropdown.appendChild(createItem);
    }

    const mergeItem = this.createDropdownItem({
      icon: ICONS.merge,
      label: 'Merge Branches...',
      onClick: () => {
        this.openBranchManager();
      },
    });
    dropdown.appendChild(mergeItem);

    return dropdown;
  }

  private createDropdownItem(config: {
    icon: string;
    label: string;
    isActive?: boolean;
    onClick: () => void;
  }): HTMLElement {
    const item = document.createElement('button');
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: ${config.isActive ? 'var(--designlibre-accent-light, #1a3a5c)' : 'transparent'};
      color: ${config.isActive ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-text-primary, #e4e4e4)'};
      cursor: pointer;
      font-size: 12px;
      text-align: left;
    `;

    item.addEventListener('mouseenter', () => {
      if (!config.isActive) {
        item.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    item.addEventListener('mouseleave', () => {
      if (!config.isActive) {
        item.style.backgroundColor = 'transparent';
      }
    });

    item.addEventListener('click', config.onClick);

    const icon = document.createElement('span');
    icon.innerHTML = config.icon;
    icon.style.cssText = 'display: flex;';
    item.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = config.label;
    label.style.cssText = 'flex: 1;';
    item.appendChild(label);

    return item;
  }

  private createBranchItem(branch: Branch, isActive: boolean): HTMLElement {
    const item = document.createElement('button');
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
      font-size: 12px;
      text-align: left;
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
      this.workspaceManager.switchBranch(branch.id);
      this.branchDropdownOpen = false;
      this.render();
    });

    const icon = document.createElement('span');
    icon.innerHTML = ICONS.branch;
    icon.style.cssText = 'display: flex;';
    item.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = branch.name;
    label.style.cssText = 'flex: 1;';
    item.appendChild(label);

    if (branch.isProtected) {
      const badge = document.createElement('span');
      badge.innerHTML = ICONS.shield;
      badge.title = 'Protected branch';
      badge.style.cssText = 'display: flex; color: var(--designlibre-text-muted, #666);';
      item.appendChild(badge);
    }

    // Delete button (if not protected and not active)
    if (!branch.isProtected && !isActive) {
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = ICONS.trash;
      deleteBtn.title = 'Delete branch';
      deleteBtn.style.cssText = `
        display: flex;
        padding: 4px;
        border: none;
        background: transparent;
        color: var(--designlibre-text-muted, #666);
        cursor: pointer;
        border-radius: 4px;
        opacity: 0;
        transition: opacity 0.15s;
      `;

      item.addEventListener('mouseenter', () => {
        deleteBtn.style.opacity = '1';
      });

      item.addEventListener('mouseleave', () => {
        deleteBtn.style.opacity = '0';
      });

      deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.color = 'var(--designlibre-error, #ff6b6b)';
      });

      deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.color = 'var(--designlibre-text-muted, #666)';
      });

      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteBranch(branch);
      });

      item.appendChild(deleteBtn);
    }

    return item;
  }

  private createProject(): void {
    const name = prompt('Project name:');
    if (name?.trim()) {
      const tree = this.workspaceManager.createProject(name.trim(), `./${name.trim().toLowerCase().replace(/\s+/g, '-')}`);
      this.workspaceManager.openProject(tree.id);
    }
    this.treeDropdownOpen = false;
    this.render();
  }

  private createBranch(): void {
    const name = prompt('Branch name:');
    if (name?.trim()) {
      const branch = this.workspaceManager.createBranch(name.trim());
      this.workspaceManager.switchBranch(branch.id);
    }
    this.branchDropdownOpen = false;
    this.render();
  }

  private deleteBranch(branch: Branch): void {
    if (confirm(`Delete branch "${branch.name}"?`)) {
      try {
        this.workspaceManager.deleteBranch(branch.id);
      } catch (error) {
        alert((error as Error).message);
      }
    }
    this.render();
  }

  private openBranchManager(): void {
    this.branchDropdownOpen = false;
    this.render();
    window.dispatchEvent(
      new CustomEvent('designlibre-open-modal', {
        detail: { modal: 'branch-manager' },
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
 * Create a project selector
 */
export function createProjectSelector(
  workspaceManager: WorkspaceManager,
  container: HTMLElement,
  options?: ProjectSelectorOptions
): ProjectSelector {
  return new ProjectSelector(workspaceManager, container, options);
}
