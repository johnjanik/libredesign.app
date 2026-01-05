/**
 * Banner Component
 * Full-width notification banner.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const bannerComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-banner',
  name: 'Banner',
  category: 'feedback',
  description: 'Full-width notification banner',
  tags: ['banner', 'announcement', 'notification', 'alert', 'header'],
  icon: 'lucide:megaphone',

  properties: [
    {
      id: 'message',
      name: 'Message',
      type: 'text',
      defaultValue: 'This is an important announcement.',
      description: 'Banner message',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'info',
      options: ['info', 'success', 'warning', 'error'],
      description: 'Banner type',
    },
    {
      id: 'dismissible',
      name: 'Dismissible',
      type: 'boolean',
      defaultValue: true,
      description: 'Can be dismissed',
    },
  ],

  variants: [
    { id: 'info', name: 'Info', propertyValues: { variant: 'info' }, unoClasses: ['bg-blue-600', 'text-white'] },
    { id: 'success', name: 'Success', propertyValues: { variant: 'success' }, unoClasses: ['bg-green-600', 'text-white'] },
    { id: 'warning', name: 'Warning', propertyValues: { variant: 'warning' }, unoClasses: ['bg-yellow-500', 'text-white'] },
    { id: 'error', name: 'Error', propertyValues: { variant: 'error' }, unoClasses: ['bg-red-600', 'text-white'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Banner',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 16,
      autoLayoutPadding: { top: 12, right: 16, bottom: 12, left: 16 },
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Message',
        properties: {
          characters: 'This is an important announcement.',
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 14,
          textAlignHorizontal: 'CENTER',
        },
        propertyBindings: [{ propertyId: 'message', targetPath: ['characters'] }],
        unoClasses: ['text-sm', 'font-medium', 'text-white', 'text-center'],
      },
      {
        type: 'TEXT',
        name: 'Close',
        properties: {
          characters: '×',
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.8 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontSize: 18,
        },
        unoClasses: ['text-white/80', 'hover:text-white', 'cursor-pointer'],
      },
    ],
    unoClasses: ['w-full', 'flex', 'items-center', 'justify-center', 'gap-4', 'px-4', 'py-3', 'bg-blue-600', 'text-white'],
  },

  unoClasses: ['w-full', 'flex', 'items-center', 'justify-center', 'px-4', 'py-3'],

  defaultSize: { width: 600, height: 48 },
});
