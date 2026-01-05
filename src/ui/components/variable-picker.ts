/**
 * Variable Picker
 *
 * A dropdown component for selecting variables in prototype interactions.
 * Shows a searchable list of defined variables grouped by type.
 */

import type { VariableManager, VariableDefinition, VariableType } from '@prototype/variable-manager';

/**
 * Variable picker options
 */
export interface VariablePickerOptions {
  /** Variable manager instance */
  variableManager: VariableManager;
  /** Currently selected variable ID */
  selectedVariableId?: string | null;
  /** Callback when variable is selected */
  onSelect: (variableId: string) => void;
  /** Filter by variable types */
  filterTypes?: VariableType[];
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Variable Picker component
 */
export class VariablePicker {
  private options: VariablePickerOptions;
  private element: HTMLElement | null = null;
  private dropdown: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private isOpen = false;
  private variables: VariableDefinition[] = [];
  private filteredVariables: VariableDefinition[] = [];
  private selectedIndex = -1;
  private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;

  constructor(options: VariablePickerOptions) {
    this.options = options;
    this.loadVariables();
  }

  /**
   * Load variables from the manager
   */
  private loadVariables(): void {
    const allVariables = this.options.variableManager.getAllDefinitions();

    // Filter by type if specified
    if (this.options.filterTypes && this.options.filterTypes.length > 0) {
      this.variables = allVariables.filter(v =>
        this.options.filterTypes!.includes(v.type)
      );
    } else {
      this.variables = allVariables;
    }

    // Sort by group then name
    this.variables.sort((a, b) => {
      const groupA = a.group ?? 'Ungrouped';
      const groupB = b.group ?? 'Ungrouped';
      if (groupA !== groupB) return groupA.localeCompare(groupB);
      return a.name.localeCompare(b.name);
    });

    this.filteredVariables = [...this.variables];
  }

  /**
   * Create the picker element
   */
  createElement(): HTMLElement {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-variable-picker';
    this.element.style.cssText = `
      position: relative;
      width: 100%;
    `;

    // Create trigger button
    const trigger = document.createElement('button');
    trigger.className = 'designlibre-variable-picker-trigger';
    trigger.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: var(--designlibre-input-bg, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      color: var(--designlibre-text, #ffffff);
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    `;

    this.updateTriggerText(trigger);

    // Dropdown arrow
    const arrow = document.createElement('span');
    arrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>`;
    arrow.style.cssText = `opacity: 0.6; flex-shrink: 0;`;
    trigger.appendChild(arrow);

    trigger.addEventListener('click', () => this.toggle());

    this.element.appendChild(trigger);

    return this.element;
  }

  /**
   * Update the trigger button text
   */
  private updateTriggerText(trigger?: HTMLElement): void {
    const btn = trigger ?? this.element?.querySelector('.designlibre-variable-picker-trigger');
    if (!btn) return;

    const textSpan = btn.querySelector('.picker-text') ?? document.createElement('span');
    textSpan.className = 'picker-text';
    (textSpan as HTMLElement).style.cssText = `
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
    `;

    if (this.options.selectedVariableId) {
      const variable = this.variables.find(v => v.id === this.options.selectedVariableId);
      if (variable) {
        const typeIcon = this.getTypeIcon(variable.type);
        textSpan.innerHTML = `${typeIcon}<span>${variable.name}</span>`;
        (textSpan as HTMLElement).style.color = 'var(--designlibre-text, #ffffff)';
      } else {
        textSpan.textContent = this.options.placeholder ?? 'Select variable...';
        (textSpan as HTMLElement).style.color = 'var(--designlibre-text-muted, #888888)';
      }
    } else {
      textSpan.textContent = this.options.placeholder ?? 'Select variable...';
      (textSpan as HTMLElement).style.color = 'var(--designlibre-text-muted, #888888)';
    }

    if (!btn.contains(textSpan)) {
      btn.insertBefore(textSpan, btn.firstChild);
    }
  }

  /**
   * Get icon for variable type
   */
  private getTypeIcon(type: VariableType): string {
    const icons: Record<VariableType, string> = {
      boolean: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect>
        <circle cx="16" cy="12" r="3"></circle>
      </svg>`,
      number: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <text x="4" y="17" font-size="14" font-weight="bold">#</text>
      </svg>`,
      string: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <text x="4" y="17" font-size="14">T</text>
      </svg>`,
      color: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="4" fill="currentColor"></circle>
      </svg>`,
    };
    return icons[type] ?? '';
  }

  /**
   * Toggle dropdown
   */
  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open dropdown
   */
  private open(): void {
    if (this.isOpen || !this.element) return;

    this.isOpen = true;
    this.selectedIndex = -1;
    this.filteredVariables = [...this.variables];

    // Create dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'designlibre-variable-picker-dropdown';
    this.dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: var(--designlibre-panel-bg, #252525);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      max-height: 300px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search variables...';
    this.searchInput.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      color: var(--designlibre-text, #ffffff);
      font-size: 13px;
      outline: none;
    `;

    this.searchInput.addEventListener('input', () => this.filterVariables());
    this.searchInput.addEventListener('keydown', (e) => this.handleKeyDown(e));

    this.dropdown.appendChild(this.searchInput);

    // Variable list
    const list = document.createElement('div');
    list.className = 'designlibre-variable-picker-list';
    list.style.cssText = `
      overflow-y: auto;
      flex: 1;
    `;

    this.renderVariableList(list);
    this.dropdown.appendChild(list);

    this.element.appendChild(this.dropdown);

    // Focus search
    setTimeout(() => this.searchInput?.focus(), 0);

    // Click outside handler
    this.clickOutsideHandler = (e: MouseEvent) => {
      if (!this.element?.contains(e.target as Node)) {
        this.close();
      }
    };
    document.addEventListener('click', this.clickOutsideHandler);
  }

  /**
   * Close dropdown
   */
  private close(): void {
    if (!this.isOpen) return;

    this.isOpen = false;

    if (this.dropdown) {
      this.dropdown.remove();
      this.dropdown = null;
    }

    if (this.clickOutsideHandler) {
      document.removeEventListener('click', this.clickOutsideHandler);
      this.clickOutsideHandler = null;
    }
  }

  /**
   * Filter variables by search query
   */
  private filterVariables(): void {
    const query = this.searchInput?.value.toLowerCase().trim() ?? '';

    if (!query) {
      this.filteredVariables = [...this.variables];
    } else {
      this.filteredVariables = this.variables.filter(v =>
        v.name.toLowerCase().includes(query) ||
        v.type.toLowerCase().includes(query) ||
        (v.group?.toLowerCase().includes(query) ?? false)
      );
    }

    this.selectedIndex = -1;
    const list = this.dropdown?.querySelector('.designlibre-variable-picker-list');
    if (list) {
      this.renderVariableList(list as HTMLElement);
    }
  }

  /**
   * Render the variable list
   */
  private renderVariableList(container: HTMLElement): void {
    container.innerHTML = '';

    if (this.filteredVariables.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `
        padding: 20px;
        text-align: center;
        color: var(--designlibre-text-muted, #888888);
        font-size: 13px;
      `;
      empty.textContent = this.variables.length === 0
        ? 'No variables defined'
        : 'No matching variables';
      container.appendChild(empty);
      return;
    }

    // Group variables
    const groups = new Map<string, VariableDefinition[]>();
    for (const variable of this.filteredVariables) {
      const group = variable.group ?? 'Ungrouped';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(variable);
    }

    let globalIndex = 0;

    for (const [groupName, groupVariables] of groups) {
      // Group header
      if (groups.size > 1 || groupName !== 'Ungrouped') {
        const header = document.createElement('div');
        header.style.cssText = `
          padding: 6px 12px;
          font-size: 10px;
          font-weight: 600;
          color: var(--designlibre-text-muted, #666666);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--designlibre-bg-tertiary, #1a1a1a);
        `;
        header.textContent = groupName;
        container.appendChild(header);
      }

      // Variables in group
      for (const variable of groupVariables) {
        const index = globalIndex++;
        const item = document.createElement('button');
        item.className = 'designlibre-variable-picker-item';
        item.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          background: ${index === this.selectedIndex ? 'var(--designlibre-selection, #3b82f6)' : 'transparent'};
          border: none;
          color: var(--designlibre-text, #ffffff);
          cursor: pointer;
          text-align: left;
        `;

        // Type icon
        const iconSpan = document.createElement('span');
        iconSpan.innerHTML = this.getTypeIcon(variable.type);
        iconSpan.style.cssText = `opacity: 0.7; flex-shrink: 0;`;
        item.appendChild(iconSpan);

        // Name and type
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = `flex: 1; min-width: 0;`;

        const name = document.createElement('div');
        name.textContent = variable.name;
        name.style.cssText = `font-size: 13px;`;
        infoDiv.appendChild(name);

        const type = document.createElement('div');
        type.textContent = variable.type;
        type.style.cssText = `
          font-size: 10px;
          color: var(--designlibre-text-muted, #888888);
        `;
        infoDiv.appendChild(type);

        item.appendChild(infoDiv);

        // Current value preview
        const value = this.options.variableManager.getValue(variable.id);
        if (value !== undefined) {
          const valueSpan = document.createElement('span');
          valueSpan.style.cssText = `
            font-size: 11px;
            color: var(--designlibre-text-muted, #666666);
            max-width: 60px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `;
          valueSpan.textContent = this.formatValue(value, variable.type);
          item.appendChild(valueSpan);
        }

        const currentIndex = index;
        item.addEventListener('click', () => this.selectVariable(variable.id));
        item.addEventListener('mouseenter', () => {
          this.selectedIndex = currentIndex;
          this.updateSelection();
        });

        container.appendChild(item);
      }
    }
  }

  /**
   * Format a value for display
   */
  private formatValue(value: unknown, type: VariableType): string {
    if (type === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (type === 'color') {
      return String(value);
    }
    return String(value);
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(
          this.selectedIndex + 1,
          this.filteredVariables.length - 1
        );
        this.updateSelection();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
        break;

      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredVariables.length) {
          const selectedVariable = this.filteredVariables[this.selectedIndex];
          if (selectedVariable) {
            this.selectVariable(selectedVariable.id);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  /**
   * Update selection highlighting
   */
  private updateSelection(): void {
    const items = this.dropdown?.querySelectorAll('.designlibre-variable-picker-item');
    if (!items) return;

    items.forEach((item, i) => {
      (item as HTMLElement).style.background = i === this.selectedIndex
        ? 'var(--designlibre-selection, #3b82f6)'
        : 'transparent';
    });

    // Scroll into view
    if (this.selectedIndex >= 0) {
      items[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * Select a variable
   */
  private selectVariable(variableId: string): void {
    this.options.selectedVariableId = variableId;
    this.options.onSelect(variableId);
    this.updateTriggerText();
    this.close();
  }

  /**
   * Refresh the variable list
   */
  refresh(): void {
    this.loadVariables();
    this.updateTriggerText();
  }

  /**
   * Set selected variable
   */
  setSelected(variableId: string | null): void {
    this.options.selectedVariableId = variableId;
    this.updateTriggerText();
  }

  /**
   * Dispose the picker
   */
  dispose(): void {
    this.close();
    this.element?.remove();
  }
}

/**
 * Create a variable picker
 */
export function createVariablePicker(options: VariablePickerOptions): VariablePicker {
  return new VariablePicker(options);
}
