/**
 * Link Component
 * Clickable text link.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const linkComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-link',
  name: 'Link',
  category: 'typography',
  description: 'Clickable text link',
  tags: ['link', 'anchor', 'href', 'navigation', 'clickable'],
  icon: 'lucide:link',

  properties: [
    {
      id: 'text',
      name: 'Text',
      type: 'text',
      defaultValue: 'Click here',
      description: 'Link text',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'default',
      options: ['default', 'subtle', 'underline'],
      description: 'Link style',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Text size',
    },
    {
      id: 'external',
      name: 'External',
      type: 'boolean',
      defaultValue: false,
      description: 'Opens in new tab',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: { variant: 'default' }, unoClasses: ['text-blue-600', 'hover:text-blue-700'] },
    { id: 'subtle', name: 'Subtle', propertyValues: { variant: 'subtle' }, unoClasses: ['text-gray-600', 'hover:text-gray-900'] },
    { id: 'underline', name: 'Underline', propertyValues: { variant: 'underline' }, unoClasses: ['text-blue-600', 'underline'] },
  ],

  slots: [],

  structure: {
    type: 'TEXT',
    name: 'Link',
    properties: {
      characters: 'Click here',
      fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
      fontFamily: 'Inter',
      fontWeight: 500,
      fontSize: 14,
      textDecoration: 'NONE',
    },
    propertyBindings: [
      { propertyId: 'text', targetPath: ['characters'] },
    ],
    unoClasses: ['text-blue-600', 'hover:text-blue-700', 'cursor-pointer', 'font-medium'],
  },

  unoClasses: ['text-blue-600', 'hover:text-blue-700', 'cursor-pointer'],

  defaultSize: { width: 80, height: 24 },
});
