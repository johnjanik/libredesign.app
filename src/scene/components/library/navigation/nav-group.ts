/**
 * NavGroup Component
 * Grouped navigation section with header.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const navGroupComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-nav-group',
  name: 'Nav Group',
  category: 'navigation',
  description: 'Grouped navigation section with header',
  tags: ['group', 'navigation', 'section', 'menu', 'category'],
  icon: 'lucide:folder',

  properties: [
    {
      id: 'title',
      name: 'Title',
      type: 'text',
      defaultValue: 'Section',
      description: 'Group title',
    },
    {
      id: 'collapsible',
      name: 'Collapsible',
      type: 'boolean',
      defaultValue: false,
      description: 'Can collapse',
    },
    {
      id: 'collapsed',
      name: 'Collapsed',
      type: 'boolean',
      defaultValue: false,
      description: 'Initially collapsed',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'collapsible', name: 'Collapsible', propertyValues: { collapsible: true }, unoClasses: [] },
  ],

  slots: [
    {
      id: 'items',
      name: 'Items',
      allowMultiple: true,
      allowedCategories: ['navigation'],
      placeholder: 'Nav items',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'NavGroup',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 4,
      autoLayoutPadding: { top: 8, right: 0, bottom: 8, left: 0 },
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Title',
        properties: {
          characters: 'Section',
          fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 600,
          fontSize: 11,
          textCase: 'UPPER',
          letterSpacing: 0.5,
        },
        propertyBindings: [
          { propertyId: 'title', targetPath: ['characters'] },
        ],
        unoClasses: ['text-xs', 'font-semibold', 'text-gray-500', 'uppercase', 'tracking-wider', 'px-3', 'mb-2'],
      },
    ],
    slotId: 'items',
    unoClasses: ['flex', 'flex-col', 'gap-1'],
  },

  unoClasses: ['flex', 'flex-col', 'gap-1'],

  defaultSize: { width: 200, height: 150 },
});
