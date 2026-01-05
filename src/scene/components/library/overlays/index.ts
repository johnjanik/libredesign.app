/**
 * Overlay Components
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

/**
 * Modal Component
 * Dialog overlay.
 */
export const modalComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-modal',
  name: 'Modal',
  category: 'overlays',
  description: 'Dialog overlay',
  tags: ['modal', 'dialog', 'popup', 'overlay', 'window'],
  icon: 'lucide:square',

  properties: [
    { id: 'title', name: 'Title', type: 'text', defaultValue: 'Modal Title', description: 'Modal title' },
    { id: 'size', name: 'Size', type: 'enum', defaultValue: 'md', options: ['sm', 'md', 'lg', 'xl', 'full'], description: 'Modal width' },
    { id: 'closable', name: 'Closable', type: 'boolean', defaultValue: true, description: 'Show close button' },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'centered', name: 'Centered', propertyValues: {}, unoClasses: ['items-center'] },
  ],

  slots: [
    { id: 'content', name: 'Content', allowMultiple: true, placeholder: 'Modal content' },
    { id: 'footer', name: 'Footer', allowMultiple: true, placeholder: 'Modal actions' },
  ],

  structure: {
    type: 'FRAME',
    name: 'Modal',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      cornerRadius: 12,
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 0,
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
      effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 25 }, radius: 50, visible: true }],
    },
    children: [
      {
        type: 'FRAME', name: 'Header',
        properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutPadding: { top: 20, right: 24, bottom: 16, left: 24 }, primaryAxisAlign: 'SPACE_BETWEEN', counterAxisAlign: 'CENTER', primaryAxisSizing: 'FILL' },
        children: [
          { type: 'TEXT', name: 'Title', properties: { characters: 'Modal Title', fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 600, fontSize: 18 }, propertyBindings: [{ propertyId: 'title', targetPath: ['characters'] }], unoClasses: ['text-lg', 'font-semibold'] },
          { type: 'TEXT', name: 'Close', properties: { characters: '×', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontSize: 24 }, unoClasses: ['text-gray-400', 'cursor-pointer', 'hover:text-gray-600'] },
        ],
        unoClasses: ['flex', 'justify-between', 'items-center', 'px-6', 'pt-5', 'pb-4'],
      },
      { type: 'FRAME', name: 'Content', properties: { fills: [], autoLayoutMode: 'VERTICAL', autoLayoutPadding: { top: 0, right: 24, bottom: 20, left: 24 }, primaryAxisSizing: 'FILL', counterAxisSizing: 'AUTO' }, slotId: 'content', unoClasses: ['px-6', 'pb-5'] },
      { type: 'FRAME', name: 'Footer', properties: { fills: [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98, a: 1 }, visible: true, opacity: 1 }], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 12, autoLayoutPadding: { top: 16, right: 24, bottom: 16, left: 24 }, primaryAxisAlign: 'MAX', counterAxisAlign: 'CENTER', primaryAxisSizing: 'FILL' }, slotId: 'footer', unoClasses: ['flex', 'justify-end', 'gap-3', 'px-6', 'py-4', 'bg-gray-50', 'rounded-b-xl'] },
    ],
    unoClasses: ['bg-white', 'rounded-xl', 'shadow-2xl', 'max-w-lg', 'w-full'],
  },

  unoClasses: ['bg-white', 'rounded-xl', 'shadow-2xl'],
  defaultSize: { width: 480, height: 300 },
});

/**
 * Drawer Component
 * Slide-out panel.
 */
export const drawerComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-drawer',
  name: 'Drawer',
  category: 'overlays',
  description: 'Slide-out panel',
  tags: ['drawer', 'sidebar', 'panel', 'slide', 'overlay'],
  icon: 'lucide:panel-left',

  properties: [
    { id: 'title', name: 'Title', type: 'text', defaultValue: 'Drawer', description: 'Drawer title' },
    { id: 'position', name: 'Position', type: 'enum', defaultValue: 'right', options: ['left', 'right', 'top', 'bottom'], description: 'Slide from' },
    { id: 'size', name: 'Size', type: 'enum', defaultValue: 'md', options: ['sm', 'md', 'lg', 'xl'], description: 'Drawer width/height' },
  ],

  variants: [
    { id: 'right', name: 'Right', propertyValues: { position: 'right' }, unoClasses: [] },
    { id: 'left', name: 'Left', propertyValues: { position: 'left' }, unoClasses: [] },
  ],

  slots: [{ id: 'content', name: 'Content', allowMultiple: true, placeholder: 'Drawer content' }],

  structure: {
    type: 'FRAME', name: 'Drawer',
    properties: { fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], width: 400, autoLayoutMode: 'VERTICAL', autoLayoutGap: 0, primaryAxisSizing: 'FILL', counterAxisSizing: 'FIXED', effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: -4, y: 0 }, radius: 20, visible: true }] },
    children: [
      { type: 'FRAME', name: 'Header', properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutPadding: { top: 20, right: 20, bottom: 20, left: 20 }, primaryAxisAlign: 'SPACE_BETWEEN', counterAxisAlign: 'CENTER', primaryAxisSizing: 'FILL', strokes: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true }], strokeWeight: 1 },
        children: [
          { type: 'TEXT', name: 'Title', properties: { characters: 'Drawer', fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 600, fontSize: 16 }, propertyBindings: [{ propertyId: 'title', targetPath: ['characters'] }] },
          { type: 'TEXT', name: 'Close', properties: { characters: '×', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontSize: 20 } },
        ],
        unoClasses: ['flex', 'justify-between', 'items-center', 'p-5', 'border-b'] },
      { type: 'FRAME', name: 'Content', properties: { fills: [], autoLayoutMode: 'VERTICAL', autoLayoutPadding: { top: 20, right: 20, bottom: 20, left: 20 }, layoutGrow: 1 }, slotId: 'content', unoClasses: ['flex-1', 'p-5', 'overflow-auto'] },
    ],
    unoClasses: ['bg-white', 'h-full', 'shadow-xl'],
  },

  unoClasses: ['bg-white', 'h-full', 'shadow-xl'],
  defaultSize: { width: 400, height: 600 },
});

/**
 * Popover Component
 * Floating content panel.
 */
export const popoverComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-popover',
  name: 'Popover',
  category: 'overlays',
  description: 'Floating content panel',
  tags: ['popover', 'popup', 'floating', 'dropdown', 'panel'],
  icon: 'lucide:message-square',

  properties: [
    { id: 'position', name: 'Position', type: 'enum', defaultValue: 'bottom', options: ['top', 'bottom', 'left', 'right'], description: 'Popover position' },
    { id: 'arrow', name: 'Arrow', type: 'boolean', defaultValue: true, description: 'Show arrow' },
  ],

  variants: [
    { id: 'bottom', name: 'Bottom', propertyValues: { position: 'bottom' }, unoClasses: [] },
    { id: 'top', name: 'Top', propertyValues: { position: 'top' }, unoClasses: [] },
  ],

  slots: [{ id: 'content', name: 'Content', allowMultiple: true, placeholder: 'Popover content' }],

  structure: {
    type: 'FRAME', name: 'Popover',
    properties: { fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], cornerRadius: 8, autoLayoutMode: 'VERTICAL', autoLayoutPadding: { top: 12, right: 16, bottom: 12, left: 16 }, primaryAxisSizing: 'AUTO', counterAxisSizing: 'AUTO', strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }], strokeWeight: 1, effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 12, visible: true }] },
    children: [{ type: 'TEXT', name: 'Content', properties: { characters: 'Popover content goes here.', fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 14 } }],
    slotId: 'content',
    unoClasses: ['bg-white', 'rounded-lg', 'border', 'shadow-lg', 'p-4'],
  },

  unoClasses: ['bg-white', 'rounded-lg', 'border', 'shadow-lg'],
  defaultSize: { width: 240, height: 80 },
});

/**
 * Tooltip Component
 * Hover hint.
 */
export const tooltipComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-tooltip',
  name: 'Tooltip',
  category: 'overlays',
  description: 'Hover hint',
  tags: ['tooltip', 'hint', 'tip', 'hover', 'help'],
  icon: 'lucide:help-circle',

  properties: [
    { id: 'text', name: 'Text', type: 'text', defaultValue: 'Tooltip text', description: 'Tooltip content' },
    { id: 'position', name: 'Position', type: 'enum', defaultValue: 'top', options: ['top', 'bottom', 'left', 'right'], description: 'Tooltip position' },
  ],

  variants: [
    { id: 'dark', name: 'Dark', propertyValues: {}, unoClasses: ['bg-gray-900', 'text-white'] },
    { id: 'light', name: 'Light', propertyValues: {}, unoClasses: ['bg-white', 'text-gray-900', 'border'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME', name: 'Tooltip',
    properties: { fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }], cornerRadius: 4, autoLayoutMode: 'HORIZONTAL', autoLayoutPadding: { top: 6, right: 10, bottom: 6, left: 10 }, primaryAxisSizing: 'AUTO', counterAxisSizing: 'AUTO' },
    children: [{ type: 'TEXT', name: 'Text', properties: { characters: 'Tooltip text', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 12 }, propertyBindings: [{ propertyId: 'text', targetPath: ['characters'] }] }],
    unoClasses: ['px-2.5', 'py-1.5', 'bg-gray-900', 'text-white', 'text-xs', 'font-medium', 'rounded'],
  },

  unoClasses: ['px-2.5', 'py-1.5', 'bg-gray-900', 'text-white', 'text-xs', 'rounded'],
  defaultSize: { width: 100, height: 28 },
});

/**
 * DropdownMenu Component
 * Action menu.
 */
export const dropdownMenuComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-dropdown-menu',
  name: 'Dropdown Menu',
  category: 'overlays',
  description: 'Action menu',
  tags: ['dropdown', 'menu', 'actions', 'list', 'options'],
  icon: 'lucide:chevron-down',

  properties: [
    { id: 'width', name: 'Width', type: 'enum', defaultValue: 'auto', options: ['auto', 'sm', 'md', 'lg'], description: 'Menu width' },
  ],

  variants: [],

  slots: [{ id: 'items', name: 'Items', allowMultiple: true, placeholder: 'Menu items' }],

  structure: {
    type: 'FRAME', name: 'DropdownMenu',
    properties: { fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], cornerRadius: 8, autoLayoutMode: 'VERTICAL', autoLayoutGap: 2, autoLayoutPadding: { top: 6, right: 6, bottom: 6, left: 6 }, primaryAxisSizing: 'AUTO', counterAxisSizing: 'AUTO', strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }], strokeWeight: 1, effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 12, visible: true }] },
    children: [
      { type: 'FRAME', name: 'Item1', properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 8, autoLayoutPadding: { top: 8, right: 12, bottom: 8, left: 12 }, primaryAxisSizing: 'FILL', counterAxisAlign: 'CENTER', cornerRadius: 4 }, children: [{ type: 'TEXT', name: 'Label', properties: { characters: 'Action 1', fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 14 } }], unoClasses: ['flex', 'items-center', 'gap-2', 'px-3', 'py-2', 'rounded', 'hover:bg-gray-100', 'cursor-pointer'] },
      { type: 'FRAME', name: 'Item2', properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 8, autoLayoutPadding: { top: 8, right: 12, bottom: 8, left: 12 }, primaryAxisSizing: 'FILL', counterAxisAlign: 'CENTER', cornerRadius: 4 }, children: [{ type: 'TEXT', name: 'Label', properties: { characters: 'Action 2', fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 14 } }], unoClasses: ['flex', 'items-center', 'gap-2', 'px-3', 'py-2', 'rounded', 'hover:bg-gray-100', 'cursor-pointer'] },
      { type: 'FRAME', name: 'Divider', properties: { fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true, opacity: 1 }], height: 1, autoLayoutPadding: { top: 4, right: 0, bottom: 4, left: 0 } }, unoClasses: ['h-px', 'bg-gray-100', 'my-1'] },
      { type: 'FRAME', name: 'Item3', properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 8, autoLayoutPadding: { top: 8, right: 12, bottom: 8, left: 12 }, primaryAxisSizing: 'FILL', counterAxisAlign: 'CENTER', cornerRadius: 4 }, children: [{ type: 'TEXT', name: 'Label', properties: { characters: 'Delete', fills: [{ type: 'SOLID', color: { r: 0.87, g: 0.25, b: 0.25, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 14 } }], unoClasses: ['flex', 'items-center', 'gap-2', 'px-3', 'py-2', 'rounded', 'hover:bg-red-50', 'cursor-pointer', 'text-red-600'] },
    ],
    slotId: 'items',
    unoClasses: ['bg-white', 'rounded-lg', 'border', 'shadow-lg', 'p-1.5', 'min-w-40'],
  },

  unoClasses: ['bg-white', 'rounded-lg', 'border', 'shadow-lg'],
  defaultSize: { width: 180, height: 150 },
});

/**
 * ContextMenu Component
 * Right-click menu.
 */
export const contextMenuComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-context-menu',
  name: 'Context Menu',
  category: 'overlays',
  description: 'Right-click menu',
  tags: ['context', 'menu', 'right-click', 'actions'],
  icon: 'lucide:mouse-pointer',

  properties: [],
  variants: [],
  slots: [{ id: 'items', name: 'Items', allowMultiple: true, placeholder: 'Menu items' }],

  structure: {
    type: 'FRAME', name: 'ContextMenu',
    properties: { fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], cornerRadius: 6, autoLayoutMode: 'VERTICAL', autoLayoutGap: 1, autoLayoutPadding: { top: 4, right: 4, bottom: 4, left: 4 }, primaryAxisSizing: 'AUTO', counterAxisSizing: 'AUTO', strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }], strokeWeight: 1, effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 2 }, radius: 8, visible: true }] },
    children: [
      { type: 'FRAME', name: 'Item1', properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 8, autoLayoutPadding: { top: 6, right: 8, bottom: 6, left: 8 }, primaryAxisAlign: 'SPACE_BETWEEN', counterAxisAlign: 'CENTER', cornerRadius: 4, primaryAxisSizing: 'FILL' }, children: [{ type: 'TEXT', name: 'Label', properties: { characters: 'Cut', fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 13 } }, { type: 'TEXT', name: 'Shortcut', properties: { characters: '⌘X', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 12 } }], unoClasses: ['flex', 'justify-between', 'items-center', 'px-2', 'py-1.5', 'rounded', 'hover:bg-gray-100', 'cursor-pointer'] },
      { type: 'FRAME', name: 'Item2', properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 8, autoLayoutPadding: { top: 6, right: 8, bottom: 6, left: 8 }, primaryAxisAlign: 'SPACE_BETWEEN', counterAxisAlign: 'CENTER', cornerRadius: 4, primaryAxisSizing: 'FILL' }, children: [{ type: 'TEXT', name: 'Label', properties: { characters: 'Copy', fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 13 } }, { type: 'TEXT', name: 'Shortcut', properties: { characters: '⌘C', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 12 } }], unoClasses: ['flex', 'justify-between', 'items-center', 'px-2', 'py-1.5', 'rounded', 'hover:bg-gray-100', 'cursor-pointer'] },
      { type: 'FRAME', name: 'Item3', properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 8, autoLayoutPadding: { top: 6, right: 8, bottom: 6, left: 8 }, primaryAxisAlign: 'SPACE_BETWEEN', counterAxisAlign: 'CENTER', cornerRadius: 4, primaryAxisSizing: 'FILL' }, children: [{ type: 'TEXT', name: 'Label', properties: { characters: 'Paste', fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 13 } }, { type: 'TEXT', name: 'Shortcut', properties: { characters: '⌘V', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 12 } }], unoClasses: ['flex', 'justify-between', 'items-center', 'px-2', 'py-1.5', 'rounded', 'hover:bg-gray-100', 'cursor-pointer'] },
    ],
    slotId: 'items',
    unoClasses: ['bg-white', 'rounded-md', 'border', 'shadow-lg', 'p-1', 'min-w-44'],
  },

  unoClasses: ['bg-white', 'rounded-md', 'border', 'shadow-lg'],
  defaultSize: { width: 180, height: 110 },
});

/**
 * CommandPalette Component
 * Keyboard-driven command menu.
 */
export const commandPaletteComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-command-palette',
  name: 'Command Palette',
  category: 'overlays',
  description: 'Keyboard-driven command menu',
  tags: ['command', 'palette', 'search', 'actions', 'keyboard'],
  icon: 'lucide:command',

  properties: [
    { id: 'placeholder', name: 'Placeholder', type: 'text', defaultValue: 'Type a command or search...', description: 'Search placeholder' },
  ],

  variants: [],
  slots: [{ id: 'results', name: 'Results', allowMultiple: true, placeholder: 'Command results' }],

  structure: {
    type: 'FRAME', name: 'CommandPalette',
    properties: { fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], cornerRadius: 12, autoLayoutMode: 'VERTICAL', autoLayoutGap: 0, primaryAxisSizing: 'AUTO', counterAxisSizing: 'AUTO', strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }], strokeWeight: 1, effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 16 }, radius: 32, visible: true }], clipsContent: true },
    children: [
      { type: 'FRAME', name: 'Search', properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 12, autoLayoutPadding: { top: 16, right: 16, bottom: 16, left: 16 }, primaryAxisAlign: 'MIN', counterAxisAlign: 'CENTER', primaryAxisSizing: 'FILL', strokes: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true }], strokeWeight: 1 },
        children: [
          { type: 'TEXT', name: 'Icon', properties: { characters: '🔍', fontSize: 16 } },
          { type: 'TEXT', name: 'Input', properties: { characters: 'Type a command or search...', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 15, layoutGrow: 1 }, propertyBindings: [{ propertyId: 'placeholder', targetPath: ['characters'] }] },
        ],
        unoClasses: ['flex', 'items-center', 'gap-3', 'px-4', 'py-4', 'border-b'] },
      { type: 'FRAME', name: 'Results', properties: { fills: [], autoLayoutMode: 'VERTICAL', autoLayoutGap: 2, autoLayoutPadding: { top: 8, right: 8, bottom: 8, left: 8 }, primaryAxisSizing: 'FILL' },
        children: [
          { type: 'TEXT', name: 'Group', properties: { characters: 'Suggestions', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 11, textCase: 'UPPER' }, unoClasses: ['text-xs', 'text-gray-500', 'font-medium', 'uppercase', 'px-2', 'py-2'] },
          { type: 'FRAME', name: 'Item1', properties: { fills: [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97, a: 1 }, visible: true, opacity: 1 }], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 12, autoLayoutPadding: { top: 10, right: 12, bottom: 10, left: 12 }, primaryAxisAlign: 'MIN', counterAxisAlign: 'CENTER', cornerRadius: 6, primaryAxisSizing: 'FILL' }, children: [{ type: 'TEXT', name: 'Label', properties: { characters: 'Create new file', fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 14 } }], unoClasses: ['flex', 'items-center', 'gap-3', 'px-3', 'py-2.5', 'rounded-md', 'bg-gray-100'] },
          { type: 'FRAME', name: 'Item2', properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 12, autoLayoutPadding: { top: 10, right: 12, bottom: 10, left: 12 }, primaryAxisAlign: 'MIN', counterAxisAlign: 'CENTER', cornerRadius: 6, primaryAxisSizing: 'FILL' }, children: [{ type: 'TEXT', name: 'Label', properties: { characters: 'Open settings', fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 14 } }], unoClasses: ['flex', 'items-center', 'gap-3', 'px-3', 'py-2.5', 'rounded-md', 'hover:bg-gray-100', 'cursor-pointer'] },
        ],
        slotId: 'results',
        unoClasses: ['p-2'] },
    ],
    unoClasses: ['bg-white', 'rounded-xl', 'border', 'shadow-2xl', 'w-full', 'max-w-xl'],
  },

  unoClasses: ['bg-white', 'rounded-xl', 'border', 'shadow-2xl'],
  defaultSize: { width: 560, height: 300 },
});

/**
 * Get all overlay components
 */
export function getOverlaysComponents(): LibraryComponent[] {
  return [
    modalComponent,
    drawerComponent,
    popoverComponent,
    tooltipComponent,
    dropdownMenuComponent,
    contextMenuComponent,
    commandPaletteComponent,
  ];
}
