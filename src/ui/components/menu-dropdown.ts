/**
 * Menu Dropdown Component
 * Renders dropdown menus with submenu support, keyboard navigation, and accessibility
 */

import { MenuItem, MenuPosition } from './menu-types';

export interface MenuDropdownOptions {
  items: MenuItem[];
  position: MenuPosition;
  onClose: () => void;
  onItemClick?: (item: MenuItem) => void;
  parentElement?: HTMLElement;
  submenuDelay?: number;
}

export class MenuDropdown {
  private container: HTMLElement;
  private items: MenuItem[];
  private position: MenuPosition;
  private onCloseCallback: () => void;
  private onItemClickCallback: ((item: MenuItem) => void) | undefined;
  private submenuDelay: number;

  private menuElement: HTMLElement | null = null;
  private activeSubmenu: MenuDropdown | null = null;
  private activeSubmenuIndex: number = -1;
  private focusedIndex: number = -1;
  private submenuTimeout: number | null = null;
  private isClosing: boolean = false;

  constructor(options: MenuDropdownOptions) {
    this.container = document.body;
    this.items = options.items;
    this.position = options.position;
    this.onCloseCallback = options.onClose;
    this.onItemClickCallback = options.onItemClick;
    this.submenuDelay = options.submenuDelay ?? 150;
  }

  show(): HTMLElement {
    this.menuElement = this.render();
    this.container.appendChild(this.menuElement);
    this.positionMenu();
    this.setupEventListeners();

    // Focus the menu for keyboard navigation
    this.menuElement.focus();

    return this.menuElement;
  }

  close(): void {
    if (this.isClosing) return;
    this.isClosing = true;

    this.closeActiveSubmenu();

    if (this.submenuTimeout !== null) {
      clearTimeout(this.submenuTimeout);
      this.submenuTimeout = null;
    }

    if (this.menuElement && this.menuElement.parentNode) {
      this.menuElement.parentNode.removeChild(this.menuElement);
    }

    this.menuElement = null;
    this.onCloseCallback();
  }

  private render(): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'menu-dropdown';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('tabindex', '-1');

    this.items.forEach((item, index) => {
      const itemElement = this.renderItem(item, index);
      menu.appendChild(itemElement);
    });

    return menu;
  }

  private renderItem(item: MenuItem, index: number): HTMLElement {
    if (item.separator) {
      const separator = document.createElement('div');
      separator.className = 'menu-separator';
      separator.setAttribute('role', 'separator');
      return separator;
    }

    const itemElement = document.createElement('div');
    itemElement.className = 'menu-item';
    itemElement.setAttribute('role', 'menuitem');
    itemElement.setAttribute('data-index', String(index));

    if (item.disabled) {
      itemElement.classList.add('disabled');
      itemElement.setAttribute('aria-disabled', 'true');
    }

    if (item.checked !== undefined) {
      itemElement.setAttribute('aria-checked', String(item.checked));
    }

    if (item.submenu) {
      itemElement.setAttribute('aria-haspopup', 'true');
      itemElement.setAttribute('aria-expanded', 'false');
    }

    // Checkbox/radio indicator
    const indicator = document.createElement('span');
    indicator.className = 'menu-item-indicator';
    if (item.checked) {
      indicator.textContent = '✓';
    } else if (item.radioGroup && item.checked) {
      indicator.textContent = '●';
    }
    itemElement.appendChild(indicator);

    // Icon
    if (item.icon) {
      const icon = document.createElement('span');
      icon.className = 'menu-item-icon';
      icon.innerHTML = item.icon;
      itemElement.appendChild(icon);
    } else {
      // Spacer for alignment when no icon
      const spacer = document.createElement('span');
      spacer.className = 'menu-item-icon-spacer';
      itemElement.appendChild(spacer);
    }

    // Label
    const label = document.createElement('span');
    label.className = 'menu-item-label';
    label.textContent = item.label + (item.ellipsis ? '...' : '');
    itemElement.appendChild(label);

    // Accelerator
    if (item.accelerator) {
      const accelerator = document.createElement('span');
      accelerator.className = 'menu-item-accelerator';
      accelerator.textContent = item.accelerator;
      itemElement.appendChild(accelerator);
    }

    // Submenu chevron
    if (item.submenu) {
      const chevron = document.createElement('span');
      chevron.className = 'menu-item-chevron';
      chevron.textContent = '►';
      itemElement.appendChild(chevron);
    }

    // Event handlers
    if (!item.disabled) {
      itemElement.addEventListener('mouseenter', () => this.handleItemHover(item, index, itemElement));
      itemElement.addEventListener('mouseleave', () => this.handleItemLeave(index));
      itemElement.addEventListener('click', (e) => this.handleItemClick(e, item));
    }

    return itemElement;
  }

  private handleItemHover(item: MenuItem, index: number, element: HTMLElement): void {
    // Update focus styling
    this.setFocusedIndex(index);

    // Handle submenu
    if (item.submenu) {
      // Clear any pending submenu timeout
      if (this.submenuTimeout !== null) {
        clearTimeout(this.submenuTimeout);
      }

      // Open submenu after delay
      this.submenuTimeout = window.setTimeout(() => {
        this.openSubmenu(item, index, element);
      }, this.submenuDelay);
    } else {
      // Close any open submenu when hovering non-submenu item
      if (this.submenuTimeout !== null) {
        clearTimeout(this.submenuTimeout);
        this.submenuTimeout = null;
      }
      this.closeActiveSubmenu();
    }
  }

  private handleItemLeave(_index: number): void {
    // Don't immediately close submenu - let hover on submenu keep it open
  }

  private handleItemClick(e: Event, item: MenuItem): void {
    e.stopPropagation();

    if (item.disabled) return;

    // If has submenu, don't close - submenu handles it
    if (item.submenu) return;

    // Execute action
    if (item.action) {
      item.action();
    }

    if (this.onItemClickCallback) {
      this.onItemClickCallback(item);
    }

    // Close entire menu tree
    this.close();
  }

  private openSubmenu(item: MenuItem, index: number, element: HTMLElement): void {
    if (this.activeSubmenuIndex === index) return;

    this.closeActiveSubmenu();

    if (!item.submenu) return;

    const rect = element.getBoundingClientRect();

    const submenuOptions: MenuDropdownOptions = {
      items: item.submenu,
      position: {
        x: rect.right,
        y: rect.top,
      },
      onClose: () => {
        this.activeSubmenu = null;
        this.activeSubmenuIndex = -1;
        element.setAttribute('aria-expanded', 'false');
      },
      submenuDelay: this.submenuDelay,
    };
    if (this.onItemClickCallback) {
      submenuOptions.onItemClick = this.onItemClickCallback;
    }
    this.activeSubmenu = new MenuDropdown(submenuOptions);

    this.activeSubmenu.show();
    this.activeSubmenuIndex = index;
    element.setAttribute('aria-expanded', 'true');
  }

  private closeActiveSubmenu(): void {
    if (this.activeSubmenu) {
      this.activeSubmenu.close();
      this.activeSubmenu = null;
      this.activeSubmenuIndex = -1;
    }
  }

  private positionMenu(): void {
    if (!this.menuElement) return;

    const menu = this.menuElement;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Set initial position
    menu.style.left = `${this.position.x}px`;
    menu.style.top = `${this.position.y}px`;

    // Get menu dimensions after render
    const rect = menu.getBoundingClientRect();

    // Adjust horizontal position if overflowing
    if (rect.right > viewport.width - 8) {
      if (this.position.anchorRight) {
        menu.style.left = `${this.position.x - rect.width}px`;
      } else {
        menu.style.left = `${viewport.width - rect.width - 8}px`;
      }
    }

    // Adjust vertical position if overflowing
    if (rect.bottom > viewport.height - 8) {
      if (this.position.anchorBottom) {
        menu.style.top = `${this.position.y - rect.height}px`;
      } else {
        menu.style.top = `${viewport.height - rect.height - 8}px`;
      }
    }
  }

  private setupEventListeners(): void {
    if (!this.menuElement) return;

    // Keyboard navigation
    this.menuElement.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Close on click outside (with delay to allow click to propagate)
    setTimeout(() => {
      document.addEventListener('mousedown', this.handleClickOutside);
    }, 0);
  }

  private handleClickOutside = (e: MouseEvent): void => {
    if (!this.menuElement) return;

    const target = e.target as HTMLElement;

    // Check if click is inside this menu or any submenu
    if (this.menuElement.contains(target)) return;
    if (this.activeSubmenu?.menuElement?.contains(target)) return;

    document.removeEventListener('mousedown', this.handleClickOutside);
    this.close();
  };

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.moveFocus(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.moveFocus(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.openFocusedSubmenu();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        // Close this menu if it's a submenu
        this.close();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.activateFocusedItem();
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'Home':
        e.preventDefault();
        this.setFocusedIndex(this.findNextFocusableIndex(-1, 1));
        break;
      case 'End':
        e.preventDefault();
        this.setFocusedIndex(this.findNextFocusableIndex(this.items.length, -1));
        break;
    }
  }

  private moveFocus(direction: number): void {
    const nextIndex = this.findNextFocusableIndex(this.focusedIndex, direction);
    if (nextIndex !== -1) {
      this.setFocusedIndex(nextIndex);
    }
  }

  private findNextFocusableIndex(startIndex: number, direction: number): number {
    let index = startIndex + direction;

    while (index >= 0 && index < this.items.length) {
      const item = this.items[index];
      if (item && !item.separator && !item.disabled) {
        return index;
      }
      index += direction;
    }

    // Wrap around
    if (direction > 0) {
      index = 0;
    } else {
      index = this.items.length - 1;
    }

    while (index !== startIndex) {
      const item = this.items[index];
      if (item && !item.separator && !item.disabled) {
        return index;
      }
      index += direction;
      if (index < 0) index = this.items.length - 1;
      if (index >= this.items.length) index = 0;
    }

    return -1;
  }

  private setFocusedIndex(index: number): void {
    if (!this.menuElement) return;

    // Remove focus from previous item
    const prevFocused = this.menuElement.querySelector('.menu-item.focused');
    if (prevFocused) {
      prevFocused.classList.remove('focused');
    }

    this.focusedIndex = index;

    // Add focus to new item
    if (index >= 0) {
      const newFocused = this.menuElement.querySelector(`[data-index="${index}"]`);
      if (newFocused) {
        newFocused.classList.add('focused');
      }
    }
  }

  private openFocusedSubmenu(): void {
    if (this.focusedIndex < 0) return;

    const item = this.items[this.focusedIndex];
    if (!item || !item.submenu) return;

    const element = this.menuElement?.querySelector(`[data-index="${this.focusedIndex}"]`) as HTMLElement;
    if (element) {
      this.openSubmenu(item, this.focusedIndex, element);
      // Focus first item in submenu
      this.activeSubmenu?.moveFocus(1);
    }
  }

  private activateFocusedItem(): void {
    if (this.focusedIndex < 0) return;

    const item = this.items[this.focusedIndex];
    if (!item) return;

    if (item.submenu) {
      this.openFocusedSubmenu();
    } else if (!item.disabled && item.action) {
      item.action();
      if (this.onItemClickCallback) {
        this.onItemClickCallback(item);
      }
      this.close();
    }
  }
}

// Convenience function to show a dropdown menu
export function showDropdownMenu(options: MenuDropdownOptions): MenuDropdown {
  const dropdown = new MenuDropdown(options);
  dropdown.show();
  return dropdown;
}
