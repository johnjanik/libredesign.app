/**
 * Avatar Component
 * User avatar image or initials.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const avatarComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-avatar',
  name: 'Avatar',
  category: 'data-display',
  description: 'User avatar image or initials',
  tags: ['avatar', 'user', 'profile', 'image', 'initials'],
  icon: 'lucide:user-circle',

  properties: [
    {
      id: 'initials',
      name: 'Initials',
      type: 'text',
      defaultValue: 'JD',
      description: 'Fallback initials',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Avatar size',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'circle',
      options: ['circle', 'rounded', 'square'],
      description: 'Shape variant',
    },
    {
      id: 'status',
      name: 'Status',
      type: 'enum',
      defaultValue: 'none',
      options: ['none', 'online', 'offline', 'away', 'busy'],
      description: 'Status indicator',
    },
  ],

  variants: [
    { id: 'circle', name: 'Circle', propertyValues: { variant: 'circle' }, unoClasses: ['rounded-full'] },
    { id: 'rounded', name: 'Rounded', propertyValues: { variant: 'rounded' }, unoClasses: ['rounded-lg'] },
    { id: 'square', name: 'Square', propertyValues: { variant: 'square' }, unoClasses: ['rounded-none'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Avatar',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
      width: 40,
      height: 40,
      cornerRadius: 20,
      autoLayoutMode: 'HORIZONTAL',
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Initials',
        properties: {
          characters: 'JD',
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 600,
          fontSize: 14,
        },
        propertyBindings: [
          { propertyId: 'initials', targetPath: ['characters'] },
        ],
        unoClasses: ['text-sm', 'font-semibold', 'text-white'],
      },
    ],
    unoClasses: ['w-10', 'h-10', 'rounded-full', 'bg-blue-600', 'flex', 'items-center', 'justify-center', 'text-white', 'font-semibold'],
  },

  unoClasses: ['w-10', 'h-10', 'rounded-full', 'flex', 'items-center', 'justify-center'],

  defaultSize: { width: 40, height: 40 },
});
