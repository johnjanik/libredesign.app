/**
 * Sidebar Component
 * Vertical navigation sidebar.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const sidebarComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-sidebar',
  name: 'Sidebar',
  category: 'navigation',
  description: 'Vertical navigation sidebar',
  tags: ['sidebar', 'navigation', 'menu', 'aside', 'drawer'],
  icon: 'lucide:panel-left',

  properties: [
    {
      id: 'width',
      name: 'Width',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg', 'collapsed'],
      description: 'Sidebar width',
    },
    {
      id: 'position',
      name: 'Position',
      type: 'enum',
      defaultValue: 'left',
      options: ['left', 'right'],
      description: 'Sidebar position',
    },
    {
      id: 'collapsible',
      name: 'Collapsible',
      type: 'boolean',
      defaultValue: true,
      description: 'Can collapse to icons',
    },
    {
      id: 'bordered',
      name: 'Bordered',
      type: 'boolean',
      defaultValue: true,
      description: 'Show border',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: ['w-64', 'border-r'] },
    { id: 'collapsed', name: 'Collapsed', propertyValues: { width: 'collapsed' }, unoClasses: ['w-16', 'border-r'] },
    { id: 'wide', name: 'Wide', propertyValues: { width: 'lg' }, unoClasses: ['w-80', 'border-r'] },
  ],

  slots: [
    {
      id: 'header',
      name: 'Header',
      allowMultiple: false,
      placeholder: 'Logo/header',
    },
    {
      id: 'nav',
      name: 'Navigation',
      allowMultiple: true,
      allowedCategories: ['navigation'],
      placeholder: 'Nav items',
    },
    {
      id: 'footer',
      name: 'Footer',
      allowMultiple: false,
      placeholder: 'Footer content',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Sidebar',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      width: 256,
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 8,
      autoLayoutPadding: { top: 16, right: 16, bottom: 16, left: 16 },
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FILL',
      strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }],
      strokeAlign: 'INSIDE',
      strokeWeight: 1,
    },
    children: [],
    slotId: 'nav',
    unoClasses: ['flex', 'flex-col', 'w-64', 'h-full', 'bg-white', 'border-r', 'border-gray-200'],
  },

  unoClasses: ['flex', 'flex-col', 'h-full', 'bg-white', 'border-r', 'border-gray-200'],

  defaultSize: { width: 256, height: 600 },
});
