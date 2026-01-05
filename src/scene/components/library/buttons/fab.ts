/**
 * FAB Component
 * Floating Action Button.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const fabComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-fab',
  name: 'FAB',
  category: 'buttons',
  description: 'Floating Action Button',
  tags: ['fab', 'floating', 'action', 'button', 'primary'],
  icon: 'lucide:plus-circle',

  properties: [
    {
      id: 'icon',
      name: 'Icon',
      type: 'text',
      defaultValue: '+',
      description: 'Button icon',
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
      defaultValue: 'primary',
      options: ['primary', 'secondary', 'accent'],
      description: 'Color variant',
    },
    {
      id: 'extended',
      name: 'Extended',
      type: 'boolean',
      defaultValue: false,
      description: 'Show label text',
    },
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: 'Create',
      description: 'Extended label',
    },
  ],

  variants: [
    { id: 'primary', name: 'Primary', propertyValues: { variant: 'primary' }, unoClasses: ['bg-blue-600', 'text-white'] },
    { id: 'secondary', name: 'Secondary', propertyValues: { variant: 'secondary' }, unoClasses: ['bg-gray-600', 'text-white'] },
    { id: 'accent', name: 'Accent', propertyValues: { variant: 'accent' }, unoClasses: ['bg-pink-500', 'text-white'] },
    { id: 'small', name: 'Small', propertyValues: { size: 'sm' }, unoClasses: ['w-10', 'h-10'] },
    { id: 'large', name: 'Large', propertyValues: { size: 'lg' }, unoClasses: ['w-16', 'h-16'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'FAB',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
      width: 56,
      height: 56,
      cornerRadius: 28,
      autoLayoutMode: 'HORIZONTAL',
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      effects: [
        { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 4 }, radius: 8, visible: true },
        { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 4, visible: true },
      ],
    },
    children: [
      {
        type: 'TEXT',
        name: 'Icon',
        properties: {
          characters: '+',
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 300,
          fontSize: 28,
        },
        propertyBindings: [
          { propertyId: 'icon', targetPath: ['characters'] },
        ],
        unoClasses: ['text-3xl', 'text-white', 'font-light'],
      },
    ],
    unoClasses: ['w-14', 'h-14', 'rounded-full', 'bg-blue-600', 'text-white', 'flex', 'items-center', 'justify-center', 'shadow-lg', 'hover:bg-blue-700', 'transition-colors'],
  },

  unoClasses: ['w-14', 'h-14', 'rounded-full', 'bg-blue-600', 'shadow-lg', 'flex', 'items-center', 'justify-center'],

  defaultSize: { width: 56, height: 56 },
});
