/**
 * SplitButton Component
 * Button with dropdown action.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const splitButtonComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-split-button',
  name: 'Split Button',
  category: 'buttons',
  description: 'Button with dropdown action',
  tags: ['button', 'split', 'dropdown', 'menu', 'action'],
  icon: 'lucide:chevron-down-square',

  properties: [
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: 'Save',
      description: 'Button label',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'primary',
      options: ['primary', 'secondary', 'outline'],
      description: 'Button style',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
    },
  ],

  variants: [
    { id: 'primary', name: 'Primary', propertyValues: { variant: 'primary' }, unoClasses: ['bg-blue-600', 'text-white'] },
    { id: 'secondary', name: 'Secondary', propertyValues: { variant: 'secondary' }, unoClasses: ['bg-gray-100', 'text-gray-800'] },
    { id: 'outline', name: 'Outline', propertyValues: { variant: 'outline' }, unoClasses: ['border', 'border-gray-300'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'SplitButton',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 0,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'STRETCH',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'MainButton',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          cornerRadius: 0,
          topLeftRadius: 6,
          bottomLeftRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutPadding: { top: 8, right: 16, bottom: 8, left: 16 },
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Save',
              fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
            propertyBindings: [
              { propertyId: 'label', targetPath: ['characters'] },
            ],
          },
        ],
        unoClasses: ['px-4', 'py-2', 'bg-blue-600', 'text-white', 'rounded-l-md', 'hover:bg-blue-700'],
      },
      {
        type: 'FRAME',
        name: 'Divider',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.18, g: 0.41, b: 0.86, a: 1 }, visible: true, opacity: 1 }],
          width: 1,
        },
        unoClasses: ['w-px', 'bg-blue-700'],
      },
      {
        type: 'FRAME',
        name: 'DropdownButton',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          cornerRadius: 0,
          topRightRadius: 6,
          bottomRightRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutPadding: { top: 8, right: 10, bottom: 8, left: 10 },
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Icon',
            properties: {
              characters: '▼',
              fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontSize: 10,
            },
          },
        ],
        unoClasses: ['px-2.5', 'py-2', 'bg-blue-600', 'text-white', 'rounded-r-md', 'hover:bg-blue-700'],
      },
    ],
    unoClasses: ['inline-flex', 'rounded-md', 'shadow-sm'],
  },

  unoClasses: ['inline-flex', 'rounded-md', 'shadow-sm'],

  defaultSize: { width: 120, height: 40 },
});
