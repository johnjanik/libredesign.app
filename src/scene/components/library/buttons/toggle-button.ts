/**
 * ToggleButton Component
 * Button with on/off state.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const toggleButtonComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-toggle-button',
  name: 'Toggle Button',
  category: 'buttons',
  description: 'Button with on/off state',
  tags: ['toggle', 'button', 'switch', 'on', 'off', 'state'],
  icon: 'lucide:toggle-left',

  properties: [
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: 'Toggle',
      description: 'Button label',
    },
    {
      id: 'pressed',
      name: 'Pressed',
      type: 'boolean',
      defaultValue: false,
      description: 'Toggle state',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'outline',
      options: ['outline', 'filled', 'ghost'],
      description: 'Button style',
    },
  ],

  variants: [
    { id: 'off', name: 'Off', propertyValues: { pressed: false }, unoClasses: ['bg-white', 'border', 'border-gray-300'] },
    { id: 'on', name: 'On', propertyValues: { pressed: true }, unoClasses: ['bg-blue-600', 'text-white'] },
    { id: 'ghost', name: 'Ghost', propertyValues: { variant: 'ghost' }, unoClasses: ['bg-transparent', 'hover:bg-gray-100'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'ToggleButton',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
      strokeWeight: 1,
      cornerRadius: 6,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 8,
      autoLayoutPadding: { top: 8, right: 16, bottom: 8, left: 16 },
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
          characters: 'Toggle',
          fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 14,
        },
        propertyBindings: [
          { propertyId: 'label', targetPath: ['characters'] },
        ],
        unoClasses: ['text-sm', 'font-medium'],
      },
    ],
    unoClasses: ['inline-flex', 'items-center', 'gap-2', 'px-4', 'py-2', 'bg-white', 'border', 'border-gray-300', 'rounded-md', 'hover:bg-gray-50', 'cursor-pointer', 'select-none'],
  },

  unoClasses: ['inline-flex', 'items-center', 'px-4', 'py-2', 'border', 'rounded-md', 'cursor-pointer'],

  defaultSize: { width: 100, height: 40 },
});
