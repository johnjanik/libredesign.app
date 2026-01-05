/**
 * Toast Component
 * Temporary notification message.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const toastComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-toast',
  name: 'Toast',
  category: 'feedback',
  description: 'Temporary notification message',
  tags: ['toast', 'notification', 'snackbar', 'message', 'alert'],
  icon: 'lucide:bell',

  properties: [
    {
      id: 'title',
      name: 'Title',
      type: 'text',
      defaultValue: 'Notification',
      description: 'Toast title',
    },
    {
      id: 'description',
      name: 'Description',
      type: 'text',
      defaultValue: 'This is a notification message.',
      description: 'Toast description',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'default',
      options: ['default', 'success', 'error', 'warning', 'info'],
      description: 'Toast type',
    },
    {
      id: 'closable',
      name: 'Closable',
      type: 'boolean',
      defaultValue: true,
      description: 'Show close button',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: { variant: 'default' }, unoClasses: ['bg-white', 'border'] },
    { id: 'success', name: 'Success', propertyValues: { variant: 'success' }, unoClasses: ['bg-green-50', 'border-green-200'] },
    { id: 'error', name: 'Error', propertyValues: { variant: 'error' }, unoClasses: ['bg-red-50', 'border-red-200'] },
    { id: 'warning', name: 'Warning', propertyValues: { variant: 'warning' }, unoClasses: ['bg-yellow-50', 'border-yellow-200'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Toast',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }],
      strokeWeight: 1,
      cornerRadius: 8,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 12,
      autoLayoutPadding: { top: 12, right: 16, bottom: 12, left: 16 },
      primaryAxisAlign: 'SPACE_BETWEEN',
      counterAxisAlign: 'CENTER',
      effects: [
        { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 12, visible: true },
      ],
    },
    children: [
      {
        type: 'FRAME',
        name: 'Content',
        properties: {
          fills: [],
          autoLayoutMode: 'VERTICAL',
          autoLayoutGap: 4,
          layoutGrow: 1,
        },
        children: [
          {
            type: 'TEXT',
            name: 'Title',
            properties: {
              characters: 'Notification',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 14,
            },
            propertyBindings: [{ propertyId: 'title', targetPath: ['characters'] }],
            unoClasses: ['text-sm', 'font-semibold', 'text-gray-900'],
          },
          {
            type: 'TEXT',
            name: 'Description',
            properties: {
              characters: 'This is a notification message.',
              fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 13,
            },
            propertyBindings: [{ propertyId: 'description', targetPath: ['characters'] }],
            unoClasses: ['text-sm', 'text-gray-500'],
          },
        ],
        unoClasses: ['flex', 'flex-col', 'gap-1', 'flex-1'],
      },
      {
        type: 'TEXT',
        name: 'Close',
        properties: {
          characters: '×',
          fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontSize: 18,
        },
        unoClasses: ['text-gray-400', 'hover:text-gray-600', 'cursor-pointer'],
      },
    ],
    unoClasses: ['flex', 'items-start', 'gap-3', 'p-4', 'bg-white', 'border', 'rounded-lg', 'shadow-lg'],
  },

  unoClasses: ['flex', 'items-start', 'gap-3', 'p-4', 'bg-white', 'border', 'rounded-lg', 'shadow-lg'],

  defaultSize: { width: 350, height: 80 },
});
