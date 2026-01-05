/**
 * Tag Component
 * Removable tag/chip.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const tagComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-tag',
  name: 'Tag',
  category: 'data-display',
  description: 'Removable tag/chip',
  tags: ['tag', 'chip', 'label', 'removable', 'filter'],
  icon: 'lucide:tag',

  properties: [
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: 'Tag',
      description: 'Tag text',
    },
    {
      id: 'removable',
      name: 'Removable',
      type: 'boolean',
      defaultValue: true,
      description: 'Show remove button',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'subtle',
      options: ['subtle', 'solid', 'outline'],
      description: 'Tag style',
    },
    {
      id: 'color',
      name: 'Color',
      type: 'enum',
      defaultValue: 'gray',
      options: ['gray', 'blue', 'green', 'red', 'yellow', 'purple'],
      description: 'Tag color',
    },
  ],

  variants: [
    { id: 'subtle', name: 'Subtle', propertyValues: { variant: 'subtle' }, unoClasses: ['bg-gray-100', 'text-gray-700'] },
    { id: 'solid', name: 'Solid', propertyValues: { variant: 'solid' }, unoClasses: ['bg-gray-600', 'text-white'] },
    { id: 'outline', name: 'Outline', propertyValues: { variant: 'outline' }, unoClasses: ['border', 'border-gray-300'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Tag',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true, opacity: 1 }],
      cornerRadius: 4,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 4,
      autoLayoutPadding: { top: 4, right: 8, bottom: 4, left: 8 },
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Label',
        properties: {
          characters: 'Tag',
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 12,
        },
        propertyBindings: [
          { propertyId: 'label', targetPath: ['characters'] },
        ],
        unoClasses: ['text-xs', 'font-medium'],
      },
      {
        type: 'TEXT',
        name: 'Close',
        properties: {
          characters: '×',
          fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontSize: 14,
        },
        unoClasses: ['text-gray-400', 'hover:text-gray-600', 'cursor-pointer'],
      },
    ],
    unoClasses: ['inline-flex', 'items-center', 'gap-1', 'px-2', 'py-1', 'bg-gray-100', 'rounded', 'text-xs', 'font-medium'],
  },

  unoClasses: ['inline-flex', 'items-center', 'gap-1', 'px-2', 'py-1', 'rounded'],

  defaultSize: { width: 60, height: 24 },
});
