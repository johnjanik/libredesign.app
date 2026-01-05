/**
 * NavLink Component
 * Navigation link item.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const navLinkComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-nav-link',
  name: 'Nav Link',
  category: 'navigation',
  description: 'Navigation link item',
  tags: ['link', 'navigation', 'menu', 'item', 'anchor'],
  icon: 'lucide:link',

  properties: [
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: 'Nav Item',
      description: 'Link text',
    },
    {
      id: 'icon',
      name: 'Icon',
      type: 'text',
      defaultValue: '',
      description: 'Icon name',
    },
    {
      id: 'active',
      name: 'Active',
      type: 'boolean',
      defaultValue: false,
      description: 'Currently active',
    },
    {
      id: 'disabled',
      name: 'Disabled',
      type: 'boolean',
      defaultValue: false,
      description: 'Disabled state',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: ['text-gray-700', 'hover:bg-gray-100'] },
    { id: 'active', name: 'Active', propertyValues: { active: true }, unoClasses: ['text-blue-600', 'bg-blue-50'] },
    { id: 'with-icon', name: 'With Icon', propertyValues: { icon: 'lucide:home' }, unoClasses: ['text-gray-700'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'NavLink',
    properties: {
      fills: [],
      cornerRadius: 6,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 12,
      autoLayoutPadding: { top: 10, right: 12, bottom: 10, left: 12 },
      primaryAxisAlign: 'START',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Label',
        properties: {
          characters: 'Nav Item',
          fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 14,
        },
        propertyBindings: [
          { propertyId: 'label', targetPath: ['characters'] },
        ],
      },
    ],
    unoClasses: ['flex', 'items-center', 'gap-3', 'px-3', 'py-2', 'rounded-md', 'text-gray-700', 'hover:bg-gray-100', 'transition-colors'],
  },

  unoClasses: ['flex', 'items-center', 'gap-3', 'px-3', 'py-2', 'rounded-md', 'transition-colors'],

  defaultSize: { width: 200, height: 40 },
});
