/**
 * Label Component
 * Form field label.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const labelComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-label',
  name: 'Label',
  category: 'typography',
  description: 'Form field label',
  tags: ['label', 'form', 'field', 'input', 'caption'],
  icon: 'lucide:tag',

  properties: [
    {
      id: 'text',
      name: 'Text',
      type: 'text',
      defaultValue: 'Label',
      description: 'Label text',
    },
    {
      id: 'required',
      name: 'Required',
      type: 'boolean',
      defaultValue: false,
      description: 'Show required indicator',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Label size',
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
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: ['text-sm', 'font-medium'] },
    { id: 'required', name: 'Required', propertyValues: { required: true }, unoClasses: ['text-sm', 'font-medium'] },
    { id: 'disabled', name: 'Disabled', propertyValues: { disabled: true }, unoClasses: ['text-sm', 'font-medium', 'text-gray-400'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Label',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 4,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Text',
        properties: {
          characters: 'Label',
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 14,
        },
        propertyBindings: [
          { propertyId: 'text', targetPath: ['characters'] },
        ],
        unoClasses: ['text-sm', 'font-medium', 'text-gray-800'],
      },
      {
        type: 'TEXT',
        name: 'Required',
        properties: {
          characters: '*',
          fills: [{ type: 'SOLID', color: { r: 0.87, g: 0.25, b: 0.25, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 14,
        },
        unoClasses: ['text-sm', 'text-red-600'],
      },
    ],
    unoClasses: ['flex', 'items-center', 'gap-1'],
  },

  unoClasses: ['text-sm', 'font-medium', 'text-gray-800'],

  defaultSize: { width: 100, height: 20 },
});
