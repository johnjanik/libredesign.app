/**
 * Switch Component
 * Toggle switch control.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const switchComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-switch',
  name: 'Switch',
  category: 'forms',
  description: 'Toggle switch control',
  tags: ['switch', 'toggle', 'on', 'off', 'form'],
  icon: 'lucide:toggle-right',

  properties: [
    {
      id: 'checked',
      name: 'Checked',
      type: 'boolean',
      defaultValue: false,
      description: 'Switch state',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Switch size',
    },
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: '',
      description: 'Optional label',
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
    { id: 'off', name: 'Off', propertyValues: { checked: false }, unoClasses: ['bg-gray-300'] },
    { id: 'on', name: 'On', propertyValues: { checked: true }, unoClasses: ['bg-blue-600'] },
    { id: 'disabled', name: 'Disabled', propertyValues: { disabled: true }, unoClasses: ['opacity-50'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Switch',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true, opacity: 1 }],
      width: 44,
      height: 24,
      cornerRadius: 12,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'CENTER',
    },
    children: [
      {
        type: 'ELLIPSE',
        name: 'Thumb',
        properties: {
          width: 20,
          height: 20,
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          effects: [
            { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 1 }, radius: 2, visible: true },
          ],
        },
        unoClasses: ['w-5', 'h-5', 'rounded-full', 'bg-white', 'shadow'],
      },
    ],
    unoClasses: ['w-11', 'h-6', 'bg-gray-300', 'rounded-full', 'p-0.5', 'cursor-pointer', 'transition-colors'],
  },

  unoClasses: ['w-11', 'h-6', 'rounded-full', 'cursor-pointer'],

  defaultSize: { width: 44, height: 24 },
});
