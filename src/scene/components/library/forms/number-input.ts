/**
 * NumberInput Component
 * Numeric input with controls.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const numberInputComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-number-input',
  name: 'Number Input',
  category: 'forms',
  description: 'Numeric input with controls',
  tags: ['number', 'input', 'numeric', 'stepper', 'form'],
  icon: 'lucide:hash',

  properties: [
    {
      id: 'value',
      name: 'Value',
      type: 'number',
      defaultValue: 0,
      description: 'Current value',
    },
    {
      id: 'min',
      name: 'Min',
      type: 'number',
      defaultValue: 0,
      description: 'Minimum value',
    },
    {
      id: 'max',
      name: 'Max',
      type: 'number',
      defaultValue: 100,
      description: 'Maximum value',
    },
    {
      id: 'step',
      name: 'Step',
      type: 'number',
      defaultValue: 1,
      description: 'Step increment',
    },
    {
      id: 'showControls',
      name: 'Show Controls',
      type: 'boolean',
      defaultValue: true,
      description: 'Show +/- buttons',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'inline', name: 'Inline', propertyValues: {}, unoClasses: [] },
    { id: 'noControls', name: 'No Controls', propertyValues: { showControls: false }, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'NumberInput',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
      strokeWeight: 1,
      cornerRadius: 6,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 0,
      primaryAxisAlign: 'SPACE_BETWEEN',
      counterAxisAlign: 'STRETCH',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'DecrementBtn',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          width: 32,
          height: 40,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Icon',
            properties: {
              characters: '−',
              fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 16,
            },
          },
        ],
        unoClasses: ['w-8', 'h-10', 'flex', 'items-center', 'justify-center', 'bg-gray-100', 'hover:bg-gray-200', 'cursor-pointer'],
      },
      {
        type: 'FRAME',
        name: 'ValueContainer',
        properties: {
          fills: [],
          width: 60,
          height: 40,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Value',
            properties: {
              characters: '0',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
              textAlignHorizontal: 'CENTER',
            },
            unoClasses: ['text-sm', 'font-medium', 'text-center'],
          },
        ],
        unoClasses: ['flex-1', 'flex', 'items-center', 'justify-center'],
      },
      {
        type: 'FRAME',
        name: 'IncrementBtn',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          width: 32,
          height: 40,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Icon',
            properties: {
              characters: '+',
              fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 16,
            },
          },
        ],
        unoClasses: ['w-8', 'h-10', 'flex', 'items-center', 'justify-center', 'bg-gray-100', 'hover:bg-gray-200', 'cursor-pointer'],
      },
    ],
    unoClasses: ['inline-flex', 'items-stretch', 'border', 'rounded-md', 'overflow-hidden'],
  },

  unoClasses: ['inline-flex', 'items-stretch', 'border', 'rounded-md', 'overflow-hidden'],

  defaultSize: { width: 120, height: 40 },
});
