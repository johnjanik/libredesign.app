/**
 * Radio Component
 * Single radio button.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const radioComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-radio',
  name: 'Radio',
  category: 'forms',
  description: 'Single radio button',
  tags: ['radio', 'input', 'option', 'choice', 'form'],
  icon: 'lucide:circle-dot',

  properties: [
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: 'Option',
      description: 'Radio label',
    },
    {
      id: 'checked',
      name: 'Checked',
      type: 'boolean',
      defaultValue: false,
      description: 'Selected state',
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
    { id: 'unchecked', name: 'Unchecked', propertyValues: { checked: false }, unoClasses: [] },
    { id: 'checked', name: 'Checked', propertyValues: { checked: true }, unoClasses: [] },
    { id: 'disabled', name: 'Disabled', propertyValues: { disabled: true }, unoClasses: ['opacity-50'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Radio',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 8,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Circle',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true }],
          strokeWeight: 2,
          width: 18,
          height: 18,
          cornerRadius: 9,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'ELLIPSE',
            name: 'Dot',
            properties: {
              width: 8,
              height: 8,
              fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: false, opacity: 1 }],
            },
            unoClasses: ['w-2', 'h-2', 'rounded-full', 'bg-blue-600'],
          },
        ],
        unoClasses: ['w-4.5', 'h-4.5', 'rounded-full', 'border-2', 'border-gray-400', 'flex', 'items-center', 'justify-center'],
      },
      {
        type: 'TEXT',
        name: 'Label',
        properties: {
          characters: 'Option',
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 14,
        },
        propertyBindings: [
          { propertyId: 'label', targetPath: ['characters'] },
        ],
        unoClasses: ['text-sm', 'text-gray-800'],
      },
    ],
    unoClasses: ['flex', 'items-center', 'gap-2', 'cursor-pointer'],
  },

  unoClasses: ['flex', 'items-center', 'gap-2', 'cursor-pointer'],

  defaultSize: { width: 120, height: 24 },
});
