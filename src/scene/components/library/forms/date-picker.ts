/**
 * DatePicker Component
 * Date selection input.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const datePickerComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-date-picker',
  name: 'Date Picker',
  category: 'forms',
  description: 'Date selection input',
  tags: ['date', 'picker', 'calendar', 'input', 'form'],
  icon: 'lucide:calendar',

  properties: [
    {
      id: 'value',
      name: 'Value',
      type: 'text',
      defaultValue: '',
      description: 'Selected date',
    },
    {
      id: 'placeholder',
      name: 'Placeholder',
      type: 'text',
      defaultValue: 'Select date',
      description: 'Placeholder text',
    },
    {
      id: 'format',
      name: 'Format',
      type: 'enum',
      defaultValue: 'MM/DD/YYYY',
      options: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      description: 'Date format',
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
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'withValue', name: 'With Value', propertyValues: { value: '01/15/2024' }, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'DatePicker',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
      strokeWeight: 1,
      cornerRadius: 6,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 8,
      autoLayoutPadding: { top: 10, right: 12, bottom: 10, left: 12 },
      primaryAxisAlign: 'SPACE_BETWEEN',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Value',
        properties: {
          characters: 'Select date',
          fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 14,
        },
        propertyBindings: [
          { propertyId: 'placeholder', targetPath: ['characters'] },
        ],
        unoClasses: ['text-sm', 'text-gray-400'],
      },
      {
        type: 'TEXT',
        name: 'Icon',
        properties: {
          characters: '📅',
          fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
          fontSize: 16,
        },
        unoClasses: ['text-gray-400'],
      },
    ],
    unoClasses: ['w-full', 'flex', 'items-center', 'justify-between', 'px-3', 'py-2.5', 'border', 'rounded-md', 'bg-white', 'cursor-pointer', 'hover:border-gray-400'],
  },

  unoClasses: ['w-full', 'flex', 'items-center', 'px-3', 'py-2.5', 'border', 'rounded-md', 'cursor-pointer'],

  defaultSize: { width: 200, height: 40 },
});
