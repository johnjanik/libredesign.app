/**
 * ColorPicker Component
 * Color selection input.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const colorPickerComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-color-picker',
  name: 'Color Picker',
  category: 'forms',
  description: 'Color selection input',
  tags: ['color', 'picker', 'input', 'swatch', 'form'],
  icon: 'lucide:palette',

  properties: [
    {
      id: 'value',
      name: 'Value',
      type: 'text',
      defaultValue: '#3B82F6',
      description: 'Current color',
    },
    {
      id: 'showInput',
      name: 'Show Input',
      type: 'boolean',
      defaultValue: true,
      description: 'Show hex input',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Picker size',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'swatchOnly', name: 'Swatch Only', propertyValues: { showInput: false }, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'ColorPicker',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
      strokeWeight: 1,
      cornerRadius: 6,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 8,
      autoLayoutPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Swatch',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          width: 24,
          height: 24,
          cornerRadius: 4,
          strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true }],
          strokeWeight: 1,
        },
        unoClasses: ['w-6', 'h-6', 'rounded', 'border', 'cursor-pointer'],
      },
      {
        type: 'TEXT',
        name: 'Value',
        properties: {
          characters: '#3B82F6',
          fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'JetBrains Mono',
          fontWeight: 400,
          fontSize: 13,
        },
        propertyBindings: [
          { propertyId: 'value', targetPath: ['characters'] },
        ],
        unoClasses: ['font-mono', 'text-sm', 'text-gray-700'],
      },
    ],
    unoClasses: ['inline-flex', 'items-center', 'gap-2', 'px-2', 'py-1.5', 'border', 'rounded-md', 'bg-white'],
  },

  unoClasses: ['inline-flex', 'items-center', 'gap-2', 'px-2', 'py-1.5', 'border', 'rounded-md'],

  defaultSize: { width: 130, height: 36 },
});
