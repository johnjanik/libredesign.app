/**
 * Menu Bar Component
 * Horizontal menu bar with dropdown menus for the application
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import { MenuDefinition, separator, menuItem, submenuItem } from './menu-types';
import { MenuDropdown } from './menu-dropdown';

export interface MenuBarOptions {
  runtime: DesignLibreRuntime;
  container: HTMLElement;
  onClose?: () => void;
}

export class MenuBar {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private onCloseCallback: (() => void) | undefined;

  private menuBarElement: HTMLElement | null = null;
  private activeDropdown: MenuDropdown | null = null;
  private activeMenuId: string | null = null;
  private menuDefinitions: MenuDefinition[] = [];

  constructor(options: MenuBarOptions) {
    this.runtime = options.runtime;
    this.container = options.container;
    this.onCloseCallback = options.onClose;
    this.menuDefinitions = this.buildMenuDefinitions();
  }

  show(): HTMLElement {
    this.menuBarElement = this.render();
    this.container.appendChild(this.menuBarElement);
    this.setupEventListeners();
    return this.menuBarElement;
  }

  close(): void {
    this.closeActiveDropdown();

    if (this.menuBarElement && this.menuBarElement.parentNode) {
      this.menuBarElement.parentNode.removeChild(this.menuBarElement);
    }

    this.menuBarElement = null;
    this.onCloseCallback?.();
  }

  private render(): HTMLElement {
    const menuBar = document.createElement('div');
    menuBar.className = 'menu-bar';
    menuBar.setAttribute('role', 'menubar');

    this.menuDefinitions.forEach((menu) => {
      const menuButton = document.createElement('button');
      menuButton.className = 'menu-bar-item';
      menuButton.setAttribute('role', 'menuitem');
      menuButton.setAttribute('aria-haspopup', 'true');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('data-menu-id', menu.id);
      menuButton.textContent = menu.label;

      menuButton.addEventListener('click', (e) => this.handleMenuClick(e, menu));
      menuButton.addEventListener('mouseenter', () => this.handleMenuHover(menu, menuButton));

      menuBar.appendChild(menuButton);
    });

    return menuBar;
  }

  private handleMenuClick(e: Event, menu: MenuDefinition): void {
    e.stopPropagation();

    const button = e.currentTarget as HTMLElement;

    if (this.activeMenuId === menu.id) {
      // Toggle off
      this.closeActiveDropdown();
    } else {
      // Open this menu
      this.openMenu(menu, button);
    }
  }

  private handleMenuHover(menu: MenuDefinition, button: HTMLElement): void {
    // Only switch on hover if a menu is already open
    if (this.activeMenuId && this.activeMenuId !== menu.id) {
      this.openMenu(menu, button);
    }
  }

  private openMenu(menu: MenuDefinition, button: HTMLElement): void {
    this.closeActiveDropdown();

    const rect = button.getBoundingClientRect();

    // Update button states
    this.menuBarElement?.querySelectorAll('.menu-bar-item').forEach((btn) => {
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    });
    button.classList.add('active');
    button.setAttribute('aria-expanded', 'true');

    this.activeDropdown = new MenuDropdown({
      items: menu.items,
      position: {
        x: rect.right,
        y: rect.top,
      },
      onClose: () => {
        this.activeDropdown = null;
        this.activeMenuId = null;
        button.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
      },
    });

    this.activeDropdown.show();
    this.activeMenuId = menu.id;
  }

  private closeActiveDropdown(): void {
    if (this.activeDropdown) {
      this.activeDropdown.close();
      this.activeDropdown = null;
      this.activeMenuId = null;
    }
  }

  private setupEventListeners(): void {
    // Close on click outside
    setTimeout(() => {
      document.addEventListener('mousedown', this.handleClickOutside);
    }, 0);

    // Keyboard navigation
    this.menuBarElement?.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  private handleClickOutside = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;

    // Check if click is inside menu bar
    if (this.menuBarElement?.contains(target)) return;

    // Check if click is inside dropdown (dropdown handles its own clicks)
    const dropdown = document.querySelector('.menu-dropdown');
    if (dropdown?.contains(target)) return;

    document.removeEventListener('mousedown', this.handleClickOutside);
    this.close();
  };

  private handleKeyDown(e: KeyboardEvent): void {
    const buttons = Array.from(
      this.menuBarElement?.querySelectorAll('.menu-bar-item') || []
    ) as HTMLElement[];
    const currentIndex = buttons.findIndex((btn) => btn.classList.contains('active'));

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (currentIndex > 0) {
          const prevButton = buttons[currentIndex - 1];
          const prevMenu = this.menuDefinitions[currentIndex - 1];
          if (prevButton && prevMenu) {
            this.openMenu(prevMenu, prevButton);
            prevButton.focus();
          }
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (currentIndex < buttons.length - 1) {
          const nextButton = buttons[currentIndex + 1];
          const nextMenu = this.menuDefinitions[currentIndex + 1];
          if (nextButton && nextMenu) {
            this.openMenu(nextMenu, nextButton);
            nextButton.focus();
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  // ============================================
  // Menu Definitions
  // ============================================

  private buildMenuDefinitions(): MenuDefinition[] {
    return [
      this.buildFileMenu(),
      this.buildEditMenu(),
      this.buildViewMenu(),
      this.buildInsertMenu(),
      this.buildObjectMenu(),
      this.buildFormatMenu(),
      this.buildToolsMenu(),
      this.buildHelpMenu(),
    ];
  }

  private buildFileMenu(): MenuDefinition {
    return {
      id: 'file',
      label: 'File',
      items: [
        menuItem('new', 'New', { accelerator: 'Ctrl+N', action: () => this.runtime.createDocument?.() }),
        submenuItem('new-from-template', 'New From Template', [
          menuItem('template-mobile', 'Mobile App'),
          menuItem('template-web', 'Website'),
          menuItem('template-presentation', 'Presentation'),
          menuItem('template-social', 'Social Media'),
        ]),
        menuItem('open', 'Open', { accelerator: 'Ctrl+O', ellipsis: true }),
        submenuItem('open-recent', 'Open Recent', [
          menuItem('recent-none', 'No Recent Files', { disabled: true }),
        ]),
        separator(),
        menuItem('save', 'Save', { accelerator: 'Ctrl+S', action: () => this.runtime.saveDocument() }),
        menuItem('save-as', 'Save As', { accelerator: 'Ctrl+Shift+S', ellipsis: true }),
        menuItem('save-copy', 'Save a Copy', { ellipsis: true }),
        menuItem('save-all', 'Save All'),
        separator(),
        menuItem('revert', 'Revert', { disabled: true }),
        submenuItem('version-history', 'Version History', [
          menuItem('show-history', 'Show Version History', { accelerator: 'Ctrl+Alt+H' }),
          separator(),
          menuItem('save-version', 'Save Named Version', { ellipsis: true }),
        ]),
        separator(),
        submenuItem('import', 'Import', [
          menuItem('import-svg', 'SVG'),
          menuItem('import-image', 'Image'),
          menuItem('import-figma', 'Figma File', { ellipsis: true }),
          menuItem('import-sketch', 'Sketch File', { ellipsis: true }),
        ]),
        submenuItem('export', 'Export', [
          menuItem('export-png', 'PNG', { accelerator: 'Ctrl+Shift+E' }),
          menuItem('export-svg', 'SVG'),
          menuItem('export-pdf', 'PDF'),
          separator(),
          menuItem('export-code', 'Export Code', { ellipsis: true }),
          menuItem('export-tokens', 'Export Design Tokens', { ellipsis: true }),
        ]),
        separator(),
        menuItem('print', 'Print', { accelerator: 'Ctrl+P', ellipsis: true }),
        separator(),
        menuItem('close', 'Close', { accelerator: 'Ctrl+W' }),
        menuItem('exit', 'Exit', { accelerator: 'Alt+F4' }),
      ],
    };
  }

  private buildEditMenu(): MenuDefinition {
    return {
      id: 'edit',
      label: 'Edit',
      items: [
        menuItem('undo', 'Undo', { accelerator: 'Ctrl+Z', action: () => this.runtime.undo() }),
        menuItem('redo', 'Redo', { accelerator: 'Ctrl+Y', action: () => this.runtime.redo() }),
        menuItem('history', 'History', { accelerator: 'Ctrl+Alt+H', ellipsis: true }),
        separator(),
        menuItem('cut', 'Cut', { accelerator: 'Ctrl+X' }),
        menuItem('copy', 'Copy', { accelerator: 'Ctrl+C' }),
        submenuItem('copy-as', 'Copy As', [
          menuItem('copy-svg', 'SVG'),
          menuItem('copy-png', 'PNG'),
          menuItem('copy-css', 'CSS'),
          menuItem('copy-json', 'JSON'),
        ]),
        menuItem('paste', 'Paste', { accelerator: 'Ctrl+V' }),
        menuItem('paste-in-place', 'Paste in Place', { accelerator: 'Ctrl+Shift+V' }),
        menuItem('delete', 'Delete', { accelerator: 'Delete' }),
        separator(),
        menuItem('duplicate', 'Duplicate', { accelerator: 'Ctrl+D' }),
        separator(),
        menuItem('select-all', 'Select All', { accelerator: 'Ctrl+A' }),
        menuItem('select-none', 'Select None', { accelerator: 'Escape' }),
        menuItem('select-inverse', 'Select Inverse'),
        submenuItem('select', 'Select', [
          menuItem('select-children', 'Select Children'),
          menuItem('select-parent', 'Select Parent'),
          menuItem('select-siblings', 'Select Siblings'),
          separator(),
          menuItem('select-same-fill', 'Same Fill'),
          menuItem('select-same-stroke', 'Same Stroke'),
          menuItem('select-same-style', 'Same Style'),
        ]),
        separator(),
        menuItem('find-replace', 'Find and Replace', { accelerator: 'Ctrl+F', ellipsis: true }),
        separator(),
        menuItem('preferences', 'Preferences', { accelerator: 'Ctrl+,', ellipsis: true }),
      ],
    };
  }

  private buildViewMenu(): MenuDefinition {
    return {
      id: 'view',
      label: 'View',
      items: [
        menuItem('zoom-in', 'Zoom In', { accelerator: 'Ctrl++' }),
        menuItem('zoom-out', 'Zoom Out', { accelerator: 'Ctrl+-' }),
        menuItem('zoom-fit', 'Zoom to Fit', { accelerator: 'Ctrl+1' }),
        menuItem('zoom-selection', 'Zoom to Selection', { accelerator: 'Ctrl+2' }),
        menuItem('zoom-100', 'Actual Size (100%)', { accelerator: 'Ctrl+0' }),
        separator(),
        menuItem('pan-mode', 'Pan Mode', { accelerator: 'H' }),
        separator(),
        submenuItem('pixel-preview', 'Pixel Preview', [
          menuItem('pixel-1x', '1x', { radioGroup: 'pixel-preview' }),
          menuItem('pixel-2x', '2x', { radioGroup: 'pixel-preview' }),
          menuItem('pixel-3x', '3x', { radioGroup: 'pixel-preview' }),
        ]),
        separator(),
        menuItem('show-grid', 'Grid', { accelerator: "Ctrl+'", checked: false }),
        menuItem('show-guides', 'Guides', { accelerator: 'Ctrl+;', checked: true }),
        menuItem('show-rulers', 'Rulers', { accelerator: 'Ctrl+R', checked: true }),
        menuItem('show-artboard-bounds', 'Artboard Bounds', { checked: true }),
        menuItem('show-pixel-grid', 'Pixel Grid (Zoom > 800%)', { checked: false }),
        separator(),
        submenuItem('snap-to', 'Snap To', [
          menuItem('snap-grid', 'Grid', { checked: true }),
          menuItem('snap-guides', 'Guides', { checked: true }),
          menuItem('snap-objects', 'Objects', { checked: true }),
          menuItem('snap-pixels', 'Pixels', { checked: false }),
        ]),
        separator(),
        menuItem('outline-mode', 'Outline Mode', { accelerator: 'Ctrl+Y' }),
        separator(),
        submenuItem('panels', 'Panels', [
          menuItem('panel-layers', 'Layers', { accelerator: 'F7', checked: true }),
          menuItem('panel-inspector', 'Inspector', { checked: true }),
          menuItem('panel-assets', 'Assets', { checked: false }),
          menuItem('panel-components', 'Components', { checked: false }),
          separator(),
          menuItem('panels-reset', 'Reset Panel Layout'),
        ]),
        separator(),
        menuItem('fullscreen', 'Full Screen', { accelerator: 'F11' }),
      ],
    };
  }

  private buildInsertMenu(): MenuDefinition {
    return {
      id: 'insert',
      label: 'Insert',
      items: [
        menuItem('insert-rectangle', 'Rectangle', { accelerator: 'R', action: () => this.runtime.setTool('rectangle') }),
        menuItem('insert-ellipse', 'Ellipse', { accelerator: 'O', action: () => this.runtime.setTool('ellipse') }),
        menuItem('insert-polygon', 'Polygon'),
        menuItem('insert-star', 'Star'),
        menuItem('insert-line', 'Line', { accelerator: 'L', action: () => this.runtime.setTool('line') }),
        menuItem('insert-arrow', 'Arrow'),
        separator(),
        menuItem('insert-pen', 'Pen Tool', { accelerator: 'P', action: () => this.runtime.setTool('pen') }),
        menuItem('insert-pencil', 'Pencil Tool', { accelerator: 'Shift+P' }),
        separator(),
        menuItem('insert-text', 'Text', { accelerator: 'T', action: () => this.runtime.setTool('text') }),
        separator(),
        menuItem('insert-image', 'Image', { accelerator: 'Ctrl+Shift+K', ellipsis: true }),
        separator(),
        menuItem('insert-artboard', 'Artboard', { accelerator: 'A' }),
        menuItem('insert-frame', 'Frame', { accelerator: 'F', action: () => this.runtime.setTool('frame') }),
        separator(),
        submenuItem('insert-component', 'Component', [
          menuItem('component-button', 'Button'),
          menuItem('component-input', 'Input Field'),
          menuItem('component-card', 'Card'),
          menuItem('component-navbar', 'Navigation Bar'),
          separator(),
          menuItem('component-browse', 'Browse Library', { ellipsis: true }),
        ]),
        separator(),
        menuItem('insert-slice', 'Slice', { accelerator: 'S' }),
        menuItem('insert-hotspot', 'Hotspot'),
      ],
    };
  }

  private buildObjectMenu(): MenuDefinition {
    return {
      id: 'object',
      label: 'Object',
      items: [
        menuItem('group', 'Group', { accelerator: 'Ctrl+G' }),
        menuItem('ungroup', 'Ungroup', { accelerator: 'Ctrl+Shift+G' }),
        separator(),
        menuItem('create-component', 'Create Component', { accelerator: 'Ctrl+Alt+K' }),
        menuItem('detach-instance', 'Detach Instance'),
        separator(),
        menuItem('bring-front', 'Bring to Front', { accelerator: 'Ctrl+Shift+]' }),
        menuItem('bring-forward', 'Bring Forward', { accelerator: 'Ctrl+]' }),
        menuItem('send-backward', 'Send Backward', { accelerator: 'Ctrl+[' }),
        menuItem('send-back', 'Send to Back', { accelerator: 'Ctrl+Shift+[' }),
        separator(),
        submenuItem('align', 'Align', [
          menuItem('align-left', 'Left', { accelerator: 'Alt+A' }),
          menuItem('align-center-h', 'Center Horizontally', { accelerator: 'Alt+H' }),
          menuItem('align-right', 'Right', { accelerator: 'Alt+D' }),
          separator(),
          menuItem('align-top', 'Top', { accelerator: 'Alt+W' }),
          menuItem('align-center-v', 'Center Vertically', { accelerator: 'Alt+V' }),
          menuItem('align-bottom', 'Bottom', { accelerator: 'Alt+S' }),
        ]),
        submenuItem('distribute', 'Distribute', [
          menuItem('distribute-h', 'Horizontally', { accelerator: 'Ctrl+Alt+H' }),
          menuItem('distribute-v', 'Vertically', { accelerator: 'Ctrl+Alt+V' }),
          separator(),
          menuItem('distribute-spacing-h', 'Horizontal Spacing'),
          menuItem('distribute-spacing-v', 'Vertical Spacing'),
        ]),
        separator(),
        menuItem('flip-h', 'Flip Horizontal', { accelerator: 'Shift+H' }),
        menuItem('flip-v', 'Flip Vertical', { accelerator: 'Shift+V' }),
        menuItem('rotate-cw', 'Rotate 90° CW'),
        menuItem('rotate-ccw', 'Rotate 90° CCW'),
        separator(),
        submenuItem('transform', 'Transform', [
          menuItem('transform-move', 'Move', { ellipsis: true }),
          menuItem('transform-scale', 'Scale', { ellipsis: true }),
          menuItem('transform-rotate', 'Rotate', { ellipsis: true }),
          separator(),
          menuItem('transform-reset', 'Reset Transformations'),
        ]),
        separator(),
        submenuItem('path', 'Path', [
          menuItem('path-outline-stroke', 'Outline Stroke', { accelerator: 'Ctrl+Shift+O' }),
          menuItem('path-flatten', 'Flatten'),
          menuItem('path-simplify', 'Simplify', { ellipsis: true }),
          separator(),
          menuItem('path-reverse', 'Reverse Direction'),
          menuItem('path-join', 'Join Paths', { accelerator: 'Ctrl+J' }),
          menuItem('path-break', 'Break Path'),
        ]),
        submenuItem('boolean', 'Boolean Operations', [
          menuItem('bool-union', 'Union', { accelerator: 'Ctrl+Alt+U' }),
          menuItem('bool-subtract', 'Subtract', { accelerator: 'Ctrl+Alt+S' }),
          menuItem('bool-intersect', 'Intersect', { accelerator: 'Ctrl+Alt+I' }),
          menuItem('bool-exclude', 'Exclude', { accelerator: 'Ctrl+Alt+X' }),
          separator(),
          menuItem('bool-flatten', 'Flatten Boolean'),
        ]),
        separator(),
        menuItem('flatten', 'Flatten Selection'),
        menuItem('rasterize', 'Rasterize', { ellipsis: true }),
        separator(),
        menuItem('lock', 'Lock', { accelerator: 'Ctrl+Shift+L' }),
        menuItem('unlock-all', 'Unlock All'),
        menuItem('hide', 'Hide', { accelerator: 'Ctrl+Shift+H' }),
        menuItem('show-all', 'Show All'),
      ],
    };
  }

  private buildFormatMenu(): MenuDefinition {
    return {
      id: 'format',
      label: 'Format',
      items: [
        menuItem('format-fill', 'Fill', { ellipsis: true }),
        menuItem('format-stroke', 'Stroke', { ellipsis: true }),
        menuItem('format-effects', 'Effects', { ellipsis: true }),
        separator(),
        submenuItem('text', 'Text', [
          menuItem('text-bold', 'Bold', { accelerator: 'Ctrl+B' }),
          menuItem('text-italic', 'Italic', { accelerator: 'Ctrl+I' }),
          menuItem('text-underline', 'Underline', { accelerator: 'Ctrl+U' }),
          menuItem('text-strikethrough', 'Strikethrough'),
          separator(),
          menuItem('text-align-left', 'Align Left', { accelerator: 'Ctrl+Shift+L' }),
          menuItem('text-align-center', 'Align Center', { accelerator: 'Ctrl+Shift+E' }),
          menuItem('text-align-right', 'Align Right', { accelerator: 'Ctrl+Shift+R' }),
          menuItem('text-align-justify', 'Justify', { accelerator: 'Ctrl+Shift+J' }),
          separator(),
          submenuItem('text-case', 'Change Case', [
            menuItem('case-upper', 'UPPERCASE'),
            menuItem('case-lower', 'lowercase'),
            menuItem('case-title', 'Title Case'),
          ]),
        ]),
        separator(),
        menuItem('copy-style', 'Copy Style', { accelerator: 'Ctrl+Alt+C' }),
        menuItem('paste-style', 'Paste Style', { accelerator: 'Ctrl+Alt+V' }),
        separator(),
        menuItem('create-style', 'Create Style', { ellipsis: true }),
        submenuItem('styles', 'Styles', [
          menuItem('styles-manage', 'Manage Styles', { ellipsis: true }),
          separator(),
          menuItem('style-none', 'No Styles', { disabled: true }),
        ]),
      ],
    };
  }

  private buildToolsMenu(): MenuDefinition {
    return {
      id: 'tools',
      label: 'Tools',
      items: [
        menuItem('spelling', 'Check Spelling', { ellipsis: true }),
        separator(),
        menuItem('color-picker', 'Color Picker', { accelerator: 'I' }),
        menuItem('eyedropper', 'Eyedropper', { accelerator: 'I' }),
        menuItem('measure', 'Measure', { accelerator: 'M' }),
        separator(),
        submenuItem('guides', 'Guides', [
          menuItem('guide-add-h', 'Add Horizontal Guide'),
          menuItem('guide-add-v', 'Add Vertical Guide'),
          separator(),
          menuItem('guides-lock', 'Lock Guides'),
          menuItem('guides-clear', 'Clear All Guides'),
        ]),
        menuItem('grids-layouts', 'Grids & Layouts', { ellipsis: true }),
        separator(),
        submenuItem('plugins', 'Plugins', [
          menuItem('plugins-manage', 'Manage Plugins', { ellipsis: true }),
          separator(),
          menuItem('plugins-none', 'No Plugins Installed', { disabled: true }),
        ]),
        submenuItem('scripting', 'Scripting', [
          menuItem('script-run', 'Run Script', { ellipsis: true }),
          menuItem('script-console', 'Developer Console', { accelerator: 'F12' }),
        ]),
        separator(),
        menuItem('keyboard-shortcuts', 'Keyboard Shortcuts', { accelerator: 'Ctrl+/', ellipsis: true }),
      ],
    };
  }

  private buildHelpMenu(): MenuDefinition {
    return {
      id: 'help',
      label: 'Help',
      items: [
        menuItem('welcome', 'Welcome'),
        submenuItem('documentation', 'Documentation', [
          menuItem('docs-getting-started', 'Getting Started'),
          menuItem('docs-tutorials', 'Tutorials'),
          menuItem('docs-api', 'API Reference'),
          separator(),
          menuItem('docs-online', 'Online Documentation'),
        ]),
        submenuItem('tutorials', 'Tutorials', [
          menuItem('tutorial-basics', 'Design Basics'),
          menuItem('tutorial-components', 'Working with Components'),
          menuItem('tutorial-prototyping', 'Prototyping'),
          menuItem('tutorial-export', 'Exporting Code'),
        ]),
        separator(),
        menuItem('shortcuts-help', 'Keyboard Shortcuts', { accelerator: 'Ctrl+/' }),
        separator(),
        menuItem('whats-new', "What's New"),
        menuItem('release-notes', 'Release Notes'),
        separator(),
        menuItem('report-bug', 'Report a Bug', { ellipsis: true }),
        menuItem('send-feedback', 'Send Feedback', { ellipsis: true }),
        separator(),
        menuItem('check-updates', 'Check for Updates'),
        separator(),
        menuItem('about', 'About DesignLibre'),
      ],
    };
  }
}

// Convenience function to show the menu bar
export function showMenuBar(options: MenuBarOptions): MenuBar {
  const menuBar = new MenuBar(options);
  menuBar.show();
  return menuBar;
}
