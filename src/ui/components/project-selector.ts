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
    this.element.className = 'designlibre-project-selector px-3 pb-2 flex flex-col gap-1';

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
      placeholder.className = 'text-content-muted text-xs py-2';
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
    wrapper.className = 'relative';

    const button = document.createElement('button');
    button.className = 'flex items-center gap-1.5 w-full px-2 py-1.5 border border-border rounded bg-transparent text-content cursor-pointer text-xs text-left transition-colors hover:border-border-hover';

    button.addEventListener('click', config.onToggle);

    // Icon
    const icon = document.createElement('span');
    icon.innerHTML = config.icon;
    icon.className = 'flex text-content-secondary';
    button.appendChild(icon);

    // Label
    const label = document.createElement('span');
    label.textContent = config.label;
    label.className = 'flex-1 overflow-hidden text-ellipsis whitespace-nowrap';
    button.appendChild(label);

    // Chevron
    const chevron = document.createElement('span');
    chevron.innerHTML = ICONS.chevron;
    chevron.className = `flex text-content-secondary transition-transform ${config.isOpen ? 'rotate-180' : ''}`;
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
    dropdown.className = 'absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-1000 max-h-60 overflow-y-auto';

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
      divider.className = 'h-px bg-border my-1';
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
    dropdown.className = 'absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-1000 max-h-60 overflow-y-auto';

    for (const branch of branches) {
      const item = this.createBranchItem(branch, branch.id === currentBranch?.id);
      dropdown.appendChild(item);
    }

    const divider = document.createElement('div');
    divider.className = 'h-px bg-border my-1';
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
    item.className = `flex items-center gap-2 w-full px-3 py-2 border-none cursor-pointer text-xs text-left ${config.isActive ? 'bg-accent-light text-accent' : 'bg-transparent text-content hover:bg-surface-secondary'}`;

    item.addEventListener('click', config.onClick);

    const icon = document.createElement('span');
    icon.innerHTML = config.icon;
    icon.className = 'flex';
    item.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = config.label;
    label.className = 'flex-1';
    item.appendChild(label);

    return item;
  }

  private createBranchItem(branch: Branch, isActive: boolean): HTMLElement {
    const item = document.createElement('button');
    item.className = `group flex items-center gap-2 w-full px-3 py-2 border-none cursor-pointer text-xs text-left ${isActive ? 'bg-accent-light text-accent' : 'bg-transparent text-content hover:bg-surface-secondary'}`;

    item.addEventListener('click', () => {
      this.workspaceManager.switchBranch(branch.id);
      this.branchDropdownOpen = false;
      this.render();
    });

    const icon = document.createElement('span');
    icon.innerHTML = ICONS.branch;
    icon.className = 'flex';
    item.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = branch.name;
    label.className = 'flex-1';
    item.appendChild(label);

    if (branch.isProtected) {
      const badge = document.createElement('span');
      badge.innerHTML = ICONS.shield;
      badge.title = 'Protected branch';
      badge.className = 'flex text-content-muted';
      item.appendChild(badge);
    }

    // Delete button (if not protected and not active)
    if (!branch.isProtected && !isActive) {
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = ICONS.trash;
      deleteBtn.title = 'Delete branch';
      deleteBtn.className = 'flex p-1 border-none bg-transparent text-content-muted cursor-pointer rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500';

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
