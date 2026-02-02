/**
 * Menu Bar Component
 * Horizontal menu bar with dropdown menus for the application
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import { MenuDefinition, separator, menuItem, submenuItem } from './menu-types';
import { MenuDropdown } from './menu-dropdown';
import { getSetting, setSetting } from '@core/settings/app-settings';
import { DesignLibreBundler } from '@persistence/import/designlibre-bundler';
import { ProjectImporter } from '@persistence/import/project';
import { SeedWriter } from '@persistence/seed/seed-writer';
import { SeedReader } from '@persistence/seed/seed-reader';
import { seedToNode } from '@persistence/seed/converters/node-converter';
import type { SeedNode } from '@persistence/seed/seed-types';
import { getRecentFilesManager, type RecentFileEntry } from './recent-files-manager';

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

  // File System Access API handle for current file
  private currentFileHandle: FileSystemFileHandle | null = null;

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

  /**
   * Toggle a view setting (showGrid, showRulers) and dispatch event.
   */
  private toggleViewSetting(key: 'showGrid' | 'showRulers'): void {
    const newValue = !getSetting(key);
    setSetting(key, newValue);
    window.dispatchEvent(new CustomEvent('designlibre-settings-changed', {
      detail: { [key]: newValue },
    }));
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

    // Check if click is inside any dropdown (including submenus)
    const dropdowns = document.querySelectorAll('.menu-dropdown');
    for (const dropdown of dropdowns) {
      if (dropdown.contains(target)) return;
    }

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
        menuItem('open', 'Open', { accelerator: 'Ctrl+O', ellipsis: true, action: () => this.handleOpenFile() }),
        submenuItem('open-recent', 'Open Recent', this.buildRecentFilesSubmenu()),
        separator(),
        menuItem('save', 'Save', { accelerator: 'Ctrl+S', action: () => this.handleSave() }),
        menuItem('save-as', 'Save As', { accelerator: 'Ctrl+Shift+S', ellipsis: true, action: () => this.handleSaveAs() }),
        menuItem('save-copy', 'Save a Copy', { ellipsis: true, action: () => this.handleSaveCopy() }),
        menuItem('save-all', 'Save All', { action: () => this.handleSaveAll() }),
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
          separator(),
          menuItem('import-react-project', 'React Project', { ellipsis: true, action: () => this.handleImportReactProject() }),
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
        menuItem('show-grid', 'Grid', {
          accelerator: "Ctrl+'",
          checked: getSetting('showGrid'),
          action: () => this.toggleViewSetting('showGrid'),
        }),
        menuItem('show-guides', 'Guides', { accelerator: 'Ctrl+;', checked: true }),
        menuItem('show-rulers', 'Rulers', {
          accelerator: 'Ctrl+R',
          checked: getSetting('showRulers'),
          action: () => this.toggleViewSetting('showRulers'),
        }),
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
          menuItem('plugins-manage', 'Manage Plugins', {
            ellipsis: true,
            action: () => {
              // Open the plugins panel in the left sidebar
              window.dispatchEvent(
                new CustomEvent('designlibre-panel-changed', {
                  detail: { panel: 'plugins' },
                })
              );
            },
          }),
          menuItem('plugins-load-local', 'Load Local Plugin', {
            ellipsis: true,
            action: () => {
              // Open the plugins panel in dev mode to load a local plugin
              window.dispatchEvent(
                new CustomEvent('designlibre-panel-changed', {
                  detail: { panel: 'plugins' },
                })
              );
              // Small delay to let panel render, then trigger dev mode
              setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent('designlibre-plugins-dev-mode', {
                    detail: { enabled: true },
                  })
                );
              }, 100);
            },
          }),
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

  // ============================================================================
  // Recent Files
  // ============================================================================

  /**
   * Build the recent files submenu items.
   */
  private buildRecentFilesSubmenu(): ReturnType<typeof menuItem>[] {
    const recentFilesManager = getRecentFilesManager();
    const recentFiles = recentFilesManager.getRecentFiles();

    if (recentFiles.length === 0) {
      return [
        menuItem('recent-none', 'No Recent Files', { disabled: true }),
      ];
    }

    const items: ReturnType<typeof menuItem>[] = [];

    // Add recent file entries
    for (let i = 0; i < recentFiles.length; i++) {
      const entry = recentFiles[i]!;
      items.push(
        menuItem(`recent-${i}`, entry.name, {
          action: () => this.openRecentFile(entry),
        })
      );
    }

    // Add separator and clear option
    items.push(separator());
    items.push(
      menuItem('recent-clear', 'Clear Recent Files', {
        action: () => this.clearRecentFiles(),
      })
    );

    return items;
  }

  /**
   * Open a file from the recent files list.
   */
  private async openRecentFile(entry: RecentFileEntry): Promise<void> {
    try {
      // We need to prompt the user to select the file again
      // since we can't persist file handles across sessions in most browsers
      if ('showOpenFilePicker' in window) {
        const handles = await (window as unknown as { showOpenFilePicker: (options: FilePickerOptions & { multiple?: boolean }) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
          types: [
            {
              description: entry.format === 'seed' ? 'Seed Document' : 'DesignLibre Document',
              accept: entry.format === 'seed'
                ? { 'application/seed': ['.seed'] }
                : { 'application/designlibre': ['.designlibre'] },
            },
          ],
        });

        const handle = handles[0];
        if (!handle) {
          return;
        }

        const file = await handle.getFile();
        await this.loadFile(file);

        // Update recent files and store handle
        this.trackRecentFile(file.name);
        this.currentFileHandle = handle;
        console.log(`Opened recent file: ${file.name}`);
      } else {
        // Fall back to input element
        this.openFileWithInput();
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      console.error('Failed to open recent file:', error);

      // Remove from recent files if it can't be opened
      const recentFilesManager = getRecentFilesManager();
      recentFilesManager.removeRecentFile(entry.name);

      alert(`Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track a file in the recent files list.
   */
  private trackRecentFile(name: string, path?: string): void {
    const recentFilesManager = getRecentFilesManager();
    recentFilesManager.addRecentFile(name, path);
  }

  /**
   * Clear all recent files.
   */
  private clearRecentFiles(): void {
    const recentFilesManager = getRecentFilesManager();
    recentFilesManager.clearRecentFiles();
    console.log('Recent files cleared');
  }

  // ============================================================================
  // File Handlers
  // ============================================================================

  /**
   * Handle File -> Open
   */
  private async handleOpenFile(): Promise<void> {
    try {
      // Check if File System Access API is available
      if ('showOpenFilePicker' in window) {
        const handles = await (window as unknown as { showOpenFilePicker: (options: FilePickerOptions & { multiple?: boolean }) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
          types: [
            {
              description: 'DesignLibre Document',
              accept: { 'application/designlibre': ['.designlibre'] },
            },
            {
              description: 'Seed Document',
              accept: { 'application/seed': ['.seed'] },
            },
          ],
        });

        const handle = handles[0];
        if (!handle) {
          return;
        }

        const file = await handle.getFile();
        await this.loadFile(file);

        // Store the file handle for save operations
        this.currentFileHandle = handle;

        // Track in recent files
        this.trackRecentFile(file.name);
        console.log(`Opened file: ${file.name}`);
      } else {
        // Fall back to input element for browsers without FSAA
        this.openFileWithInput();
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled - not an error
        return;
      }
      console.error('Failed to open file:', error);
      alert(`Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Open file using traditional input element (fallback for browsers without FSAA).
   */
  private openFileWithInput(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.designlibre,.seed';
    input.style.display = 'none';

    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        input.remove();
        return;
      }

      try {
        await this.loadFile(file);

        // Track in recent files
        this.trackRecentFile(file.name);

        // Clear file handle since we used input element
        this.currentFileHandle = null;
        console.log(`Opened file: ${file.name}`);
      } catch (error) {
        console.error('Failed to open file:', error);
        alert(`Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      input.remove();
    });

    document.body.appendChild(input);
    input.click();
  }

  /**
   * Load a file into the scene graph.
   */
  private async loadFile(file: File): Promise<void> {
    const filename = file.name.toLowerCase();
    const sceneGraph = this.runtime.getSceneGraph();

    if (filename.endsWith('.designlibre')) {
      // Use bundler for .designlibre files
      const bundler = new DesignLibreBundler(sceneGraph);
      const result = await bundler.import(file);
      bundler.apply(result);
      console.log(`Loaded ${result.document.nodes.length} nodes from .designlibre file`);
    } else if (filename.endsWith('.seed')) {
      // Use SeedReader for .seed files
      const reader = new SeedReader();
      const archive = await reader.read(file);
      await this.applySeedArchive(archive);
      console.log(`Loaded ${archive.pages.size} pages from .seed file`);
    } else {
      throw new Error(`Unsupported file format: ${file.name}`);
    }
  }

  /**
   * Apply a seed archive to the scene graph.
   */
  private async applySeedArchive(archive: Awaited<ReturnType<SeedReader['read']>>): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();

    // Get or verify document exists
    const doc = sceneGraph.getDocument();
    if (!doc) {
      throw new Error('No document in scene graph to apply archive to');
    }

    // Update document name
    sceneGraph.updateNode(doc.id, { name: archive.document.name });

    // Clear existing pages
    const existingPageIds = sceneGraph.getChildIds(doc.id);
    for (const existingPageId of existingPageIds) {
      sceneGraph.deleteNode(existingPageId);
    }

    // Import pages
    for (const [, page] of archive.pages) {
      // Create page node with correct argument order: (type, parentId, position, options)
      const pageOptions = {
        name: page.name,
        backgroundColor: page.backgroundColor,
      };
      const newPageId = sceneGraph.createNode('PAGE', doc.id, -1, pageOptions as Record<string, unknown>);

      // Import nodes recursively
      if (page.nodes) {
        for (const seedNode of page.nodes) {
          this.importSeedNode(seedNode, newPageId);
        }
      }
    }
  }

  /**
   * Import a seed node into the scene graph.
   */
  private importSeedNode(node: SeedNode, parentId: NodeId): void {
    const sceneGraph = this.runtime.getSceneGraph();

    const nodeData = seedToNode(node);
    const nodeType = (nodeData.type as string) ?? 'FRAME';
    // Create node with correct argument order: (type, parentId, position, options)
    const nodeId = sceneGraph.createNode(
      nodeType as Parameters<typeof sceneGraph.createNode>[0],
      parentId,
      -1,
      nodeData as Record<string, unknown>
    );

    // Import children recursively
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.importSeedNode(child as SeedNode, nodeId);
      }
    }
  }

  /**
   * Handle File -> Import -> React Project
   */
  private handleImportReactProject(): void {
    const input = document.createElement('input');
    input.type = 'file';
    (input as HTMLInputElement & { webkitdirectory: boolean }).webkitdirectory = true;
    input.style.display = 'none';

    input.addEventListener('change', async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) {
        input.remove();
        return;
      }

      try {
        const importer = new ProjectImporter(this.runtime.getSceneGraph());
        const result = await importer.importFromFileList(files);

        if (result.importedFiles.length > 0) {
          // Select the container
          this.runtime.emit('selection:set', { nodeIds: [result.rootId] });

          // Show success message
          console.log(`Imported ${result.importedFiles.length} files (${result.totalNodeCount} nodes)`);
          if (result.warnings.length > 0) {
            console.warn('Import warnings:', result.warnings);
          }
        } else {
          console.warn('No React files found in selected folder');
          alert('No React/JSX files found in the selected folder.');
        }
      } catch (error) {
        console.error('Failed to import project:', error);
        alert(`Failed to import project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      input.remove();
    });

    document.body.appendChild(input);
    input.click();
  }

  // ============================================================================
  // Save Handlers
  // ============================================================================

  /**
   * Handle File -> Save
   * Saves to the current file if one exists, otherwise prompts for a new file.
   */
  private async handleSave(): Promise<void> {
    try {
      // If we have a file handle and the File System Access API is available, save to it
      if (this.currentFileHandle && 'showSaveFilePicker' in window) {
        await this.saveToFileHandle(this.currentFileHandle);
        console.log(`Saved: ${this.currentFileHandle.name}`);
      } else {
        // Fall back to Save As behavior if no current file
        await this.handleSaveAs();
      }

      // Also save to IndexedDB for autosave/recovery
      await this.runtime.saveDocument();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled - not an error
        return;
      }
      console.error('Failed to save file:', error);
      alert(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle File -> Save As
   * Always prompts for a new file location.
   */
  private async handleSaveAs(): Promise<void> {
    try {
      const doc = this.runtime.getSceneGraph().getDocument();
      const docName = doc?.name ?? 'Untitled';
      const suggestedName = `${docName}.designlibre`;

      // Check if File System Access API is available
      if ('showSaveFilePicker' in window) {
        const handle = await (window as unknown as { showSaveFilePicker: (options: FilePickerOptions) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'DesignLibre Document',
              accept: { 'application/designlibre': ['.designlibre'] },
            },
            {
              description: 'Seed Document',
              accept: { 'application/seed': ['.seed'] },
            },
          ],
        });

        await this.saveToFileHandle(handle);

        // Update current file handle
        this.currentFileHandle = handle;

        // Track in recent files
        this.trackRecentFile(handle.name);
        console.log(`Saved as: ${handle.name}`);
      } else {
        // Fall back to download for browsers without File System Access API
        await this.downloadDocument(suggestedName);

        // Track in recent files (using suggested name for downloads)
        this.trackRecentFile(suggestedName);
      }

      // Also save to IndexedDB
      await this.runtime.saveDocument();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled - not an error
        return;
      }
      console.error('Failed to save file:', error);
      alert(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle File -> Save a Copy
   * Saves a copy without changing the current file.
   */
  private async handleSaveCopy(): Promise<void> {
    try {
      const doc = this.runtime.getSceneGraph().getDocument();
      const docName = doc?.name ?? 'Untitled';
      const suggestedName = `${docName} (copy).designlibre`;

      // Check if File System Access API is available
      if ('showSaveFilePicker' in window) {
        const handle = await (window as unknown as { showSaveFilePicker: (options: FilePickerOptions) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'DesignLibre Document',
              accept: { 'application/designlibre': ['.designlibre'] },
            },
            {
              description: 'Seed Document',
              accept: { 'application/seed': ['.seed'] },
            },
          ],
        });

        await this.saveToFileHandle(handle);
        // Note: We don't update currentFileHandle here, that's the "copy" behavior
        console.log(`Saved copy as: ${handle.name}`);
      } else {
        // Fall back to download for browsers without File System Access API
        await this.downloadDocument(suggestedName);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled - not an error
        return;
      }
      console.error('Failed to save copy:', error);
      alert(`Failed to save copy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle File -> Save All
   * Saves all open documents.
   */
  private async handleSaveAll(): Promise<void> {
    try {
      // Save current document to IndexedDB
      await this.runtime.saveDocument();

      // If we have a current file, also save to it
      if (this.currentFileHandle && 'showSaveFilePicker' in window) {
        await this.saveToFileHandle(this.currentFileHandle);
      }

      console.log('All documents saved');
    } catch (error) {
      console.error('Failed to save all:', error);
      alert(`Failed to save all: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save document to a file handle using File System Access API.
   */
  private async saveToFileHandle(handle: FileSystemFileHandle): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const filename = handle.name.toLowerCase();

    let blob: Blob;
    let urlToRevoke: string | null = null;

    if (filename.endsWith('.seed')) {
      // Use SeedWriter for .seed files
      const writer = new SeedWriter(sceneGraph, null);
      blob = await writer.write();
    } else {
      // Use DesignLibreBundler for .designlibre files
      const bundler = new DesignLibreBundler(sceneGraph);
      const doc = sceneGraph.getDocument();
      const result = await bundler.bundle({
        author: 'DesignLibre User',
        description: doc?.name ?? 'DesignLibre Document',
      });
      blob = result.blob;
      urlToRevoke = result.url;
    }

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();

    if (urlToRevoke) {
      URL.revokeObjectURL(urlToRevoke);
    }
  }

  /**
   * Download document using traditional anchor element (fallback for browsers without FSAA).
   */
  private async downloadDocument(filename: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const filenameLower = filename.toLowerCase();

    let blob: Blob;
    let urlToRevoke: string | null = null;

    if (filenameLower.endsWith('.seed')) {
      // Use SeedWriter for .seed files
      const writer = new SeedWriter(sceneGraph, null);
      blob = await writer.write();
    } else {
      // Use DesignLibreBundler for .designlibre files
      const bundler = new DesignLibreBundler(sceneGraph);
      const doc = sceneGraph.getDocument();
      const result = await bundler.bundle({
        author: 'DesignLibre User',
        description: doc?.name ?? 'DesignLibre Document',
      });
      blob = result.blob;
      urlToRevoke = result.url;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    if (urlToRevoke) {
      URL.revokeObjectURL(urlToRevoke);
    }
  }
}

// File picker types for TypeScript
interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface FilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

// Convenience function to show the menu bar
export function showMenuBar(options: MenuBarOptions): MenuBar {
  const menuBar = new MenuBar(options);
  menuBar.show();
  return menuBar;
}
