/**
 * Kbd Component
 * Keyboard key representation.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const kbdComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-kbd',
  name: 'Kbd',
  category: 'typography',
  description: 'Keyboard key representation',
  tags: ['keyboard', 'key', 'shortcut', 'kbd', 'hotkey'],
  icon: 'lucide:keyboard',

  properties: [
    {
      id: 'key',
      name: 'Key',
      type: 'text',
      defaultValue: '⌘',
      description: 'Key text',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Key size',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'default',
      options: ['default', 'outline', 'solid'],
      description: 'Key style',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: { variant: 'default' }, unoClasses: ['bg-gray-100', 'border', 'border-gray-300'] },
    { id: 'outline', name: 'Outline', propertyValues: { variant: 'outline' }, unoClasses: ['border-2', 'border-gray-400'] },
    { id: 'solid', name: 'Solid', propertyValues: { variant: 'solid' }, unoClasses: ['bg-gray-800', 'text-white'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Kbd',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true, opacity: 1 }],
      strokeWeight: 1,
      cornerRadius: 4,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutPadding: { top: 4, right: 8, bottom: 4, left: 8 },
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
      effects: [
        { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 1 }, radius: 0, visible: true },
      ],
    },
    children: [
      {
        type: 'TEXT',
        name: 'Key',
        properties: {
          characters: '⌘',
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 12,
        },
        propertyBindings: [
          { propertyId: 'key', targetPath: ['characters'] },
        ],
        unoClasses: ['text-xs', 'font-medium', 'text-gray-800'],
      },
    ],
    unoClasses: ['inline-flex', 'items-center', 'justify-center', 'px-2', 'py-1', 'bg-gray-100', 'border', 'border-gray-300', 'rounded', 'shadow-sm', 'font-mono', 'text-xs'],
  },

  unoClasses: ['inline-flex', 'items-center', 'px-2', 'py-1', 'bg-gray-100', 'border', 'rounded', 'shadow-sm', 'font-mono'],

  defaultSize: { width: 32, height: 28 },
});
