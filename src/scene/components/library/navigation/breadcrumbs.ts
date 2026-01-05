/**
 * Breadcrumbs Component
 * Navigation breadcrumb trail.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const breadcrumbsComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-breadcrumbs',
  name: 'Breadcrumbs',
  category: 'navigation',
  description: 'Navigation breadcrumb trail',
  tags: ['breadcrumb', 'navigation', 'path', 'trail', 'hierarchy'],
  icon: 'lucide:chevron-right',

  properties: [
    {
      id: 'separator',
      name: 'Separator',
      type: 'enum',
      defaultValue: 'chevron',
      options: ['chevron', 'slash', 'arrow', 'dot'],
      description: 'Separator style',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Text size',
    },
  ],

  variants: [
    { id: 'chevron', name: 'Chevron', propertyValues: { separator: 'chevron' }, unoClasses: [] },
    { id: 'slash', name: 'Slash', propertyValues: { separator: 'slash' }, unoClasses: [] },
  ],

  slots: [
    {
      id: 'items',
      name: 'Crumbs',
      allowMultiple: true,
      placeholder: 'Breadcrumb items',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Breadcrumbs',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 8,
      primaryAxisAlign: 'START',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Home',
        properties: {
          characters: 'Home',
          fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 14,
        },
        unoClasses: ['text-gray-500', 'hover:text-gray-700'],
      },
      {
        type: 'TEXT',
        name: 'Separator',
        properties: {
          characters: '/',
          fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontSize: 14,
        },
        unoClasses: ['text-gray-400'],
      },
      {
        type: 'TEXT',
        name: 'Current',
        properties: {
          characters: 'Current Page',
          fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 14,
        },
        unoClasses: ['text-gray-900', 'font-medium'],
      },
    ],
    unoClasses: ['flex', 'items-center', 'gap-2', 'text-sm'],
  },

  unoClasses: ['flex', 'items-center', 'gap-2', 'text-sm'],

  defaultSize: { width: 300, height: 24 },
});
