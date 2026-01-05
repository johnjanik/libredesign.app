/**
 * EmptyState Component
 * Empty content placeholder.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const emptyStateComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-empty-state',
  name: 'Empty State',
  category: 'data-display',
  description: 'Empty content placeholder',
  tags: ['empty', 'state', 'placeholder', 'no-data', 'blank'],
  icon: 'lucide:inbox',

  properties: [
    {
      id: 'title',
      name: 'Title',
      type: 'text',
      defaultValue: 'No items found',
      description: 'Title text',
    },
    {
      id: 'description',
      name: 'Description',
      type: 'text',
      defaultValue: 'Get started by creating a new item.',
      description: 'Description text',
    },
    {
      id: 'showAction',
      name: 'Show Action',
      type: 'boolean',
      defaultValue: true,
      description: 'Show action button',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'compact', name: 'Compact', propertyValues: {}, unoClasses: [] },
  ],

  slots: [
    {
      id: 'action',
      name: 'Action',
      allowMultiple: false,
      allowedCategories: ['buttons'],
      placeholder: 'Action button',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'EmptyState',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 16,
      autoLayoutPadding: { top: 40, right: 24, bottom: 40, left: 24 },
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'IconWrapper',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true, opacity: 1 }],
          width: 64,
          height: 64,
          cornerRadius: 32,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Icon',
            properties: {
              characters: '📭',
              fontSize: 28,
            },
          },
        ],
        unoClasses: ['w-16', 'h-16', 'rounded-full', 'bg-gray-100', 'flex', 'items-center', 'justify-center'],
      },
      {
        type: 'FRAME',
        name: 'Content',
        properties: {
          fills: [],
          autoLayoutMode: 'VERTICAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Title',
            properties: {
              characters: 'No items found',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 16,
              textAlignHorizontal: 'CENTER',
            },
            propertyBindings: [
              { propertyId: 'title', targetPath: ['characters'] },
            ],
            unoClasses: ['text-base', 'font-semibold', 'text-gray-900', 'text-center'],
          },
          {
            type: 'TEXT',
            name: 'Description',
            properties: {
              characters: 'Get started by creating a new item.',
              fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
              textAlignHorizontal: 'CENTER',
            },
            propertyBindings: [
              { propertyId: 'description', targetPath: ['characters'] },
            ],
            unoClasses: ['text-sm', 'text-gray-500', 'text-center'],
          },
        ],
        unoClasses: ['flex', 'flex-col', 'gap-2', 'text-center'],
      },
      {
        type: 'FRAME',
        name: 'ActionButton',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          cornerRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutPadding: { top: 10, right: 16, bottom: 10, left: 16 },
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Create New',
              fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
        ],
        slotId: 'action',
        unoClasses: ['px-4', 'py-2.5', 'bg-blue-600', 'text-white', 'rounded-md', 'font-medium', 'hover:bg-blue-700'],
      },
    ],
    unoClasses: ['flex', 'flex-col', 'items-center', 'justify-center', 'gap-4', 'py-10', 'px-6'],
  },

  unoClasses: ['flex', 'flex-col', 'items-center', 'justify-center', 'gap-4', 'py-10'],

  defaultSize: { width: 320, height: 280 },
});
