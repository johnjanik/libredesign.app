/**
 * AvatarGroup Component
 * Stack of overlapping avatars.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const avatarGroupComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-avatar-group',
  name: 'Avatar Group',
  category: 'data-display',
  description: 'Stack of overlapping avatars',
  tags: ['avatar', 'group', 'users', 'team', 'stack'],
  icon: 'lucide:users',

  properties: [
    {
      id: 'max',
      name: 'Max Visible',
      type: 'number',
      defaultValue: 4,
      min: 2,
      max: 10,
      description: 'Max visible avatars',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Avatar size',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'compact', name: 'Compact', propertyValues: {}, unoClasses: ['-space-x-3'] },
  ],

  slots: [
    {
      id: 'avatars',
      name: 'Avatars',
      allowMultiple: true,
      placeholder: 'Add avatars',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'AvatarGroup',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: -12,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Avatar1',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          width: 40,
          height: 40,
          cornerRadius: 20,
          strokes: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }],
          strokeWeight: 2,
        },
        unoClasses: ['w-10', 'h-10', 'rounded-full', 'bg-blue-600', 'border-2', 'border-white'],
      },
      {
        type: 'FRAME',
        name: 'Avatar2',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.22, g: 0.78, b: 0.55, a: 1 }, visible: true, opacity: 1 }],
          width: 40,
          height: 40,
          cornerRadius: 20,
          strokes: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }],
          strokeWeight: 2,
        },
        unoClasses: ['w-10', 'h-10', 'rounded-full', 'bg-green-500', 'border-2', 'border-white'],
      },
      {
        type: 'FRAME',
        name: 'Avatar3',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.55, b: 0.22, a: 1 }, visible: true, opacity: 1 }],
          width: 40,
          height: 40,
          cornerRadius: 20,
          strokes: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }],
          strokeWeight: 2,
        },
        unoClasses: ['w-10', 'h-10', 'rounded-full', 'bg-orange-500', 'border-2', 'border-white'],
      },
      {
        type: 'FRAME',
        name: 'More',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
          width: 40,
          height: 40,
          cornerRadius: 20,
          strokes: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }],
          strokeWeight: 2,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Count',
            properties: {
              characters: '+3',
              fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 12,
            },
          },
        ],
        unoClasses: ['w-10', 'h-10', 'rounded-full', 'bg-gray-200', 'border-2', 'border-white', 'flex', 'items-center', 'justify-center', 'text-gray-600', 'text-xs', 'font-medium'],
      },
    ],
    slotId: 'avatars',
    unoClasses: ['flex', '-space-x-3'],
  },

  unoClasses: ['flex', '-space-x-3'],

  defaultSize: { width: 140, height: 40 },
});
