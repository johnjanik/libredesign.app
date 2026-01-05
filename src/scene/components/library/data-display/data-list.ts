/**
 * DataList Component
 * Key-value data list.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const dataListComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-data-list',
  name: 'Data List',
  category: 'data-display',
  description: 'Key-value data list',
  tags: ['data', 'list', 'key-value', 'details', 'description'],
  icon: 'lucide:list',

  properties: [
    {
      id: 'orientation',
      name: 'Orientation',
      type: 'enum',
      defaultValue: 'horizontal',
      options: ['horizontal', 'vertical'],
      description: 'Layout direction',
    },
    {
      id: 'dividers',
      name: 'Dividers',
      type: 'boolean',
      defaultValue: true,
      description: 'Show dividers',
    },
  ],

  variants: [
    { id: 'horizontal', name: 'Horizontal', propertyValues: { orientation: 'horizontal' }, unoClasses: [] },
    { id: 'vertical', name: 'Vertical', propertyValues: { orientation: 'vertical' }, unoClasses: ['flex-col'] },
  ],

  slots: [
    {
      id: 'items',
      name: 'Items',
      allowMultiple: true,
      placeholder: 'Data items',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'DataList',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 0,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'STRETCH',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Item1',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 16,
          autoLayoutPadding: { top: 12, right: 0, bottom: 12, left: 0 },
          primaryAxisAlign: 'SPACE_BETWEEN',
          counterAxisAlign: 'CENTER',
          strokes: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true }],
          strokeWeight: 1,
          strokeAlign: 'INSIDE',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Name',
              fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
            unoClasses: ['text-sm', 'font-medium', 'text-gray-500'],
          },
          {
            type: 'TEXT',
            name: 'Value',
            properties: {
              characters: 'John Doe',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
            },
            unoClasses: ['text-sm', 'text-gray-900'],
          },
        ],
        unoClasses: ['flex', 'justify-between', 'py-3', 'border-b', 'border-gray-100'],
      },
      {
        type: 'FRAME',
        name: 'Item2',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 16,
          autoLayoutPadding: { top: 12, right: 0, bottom: 12, left: 0 },
          primaryAxisAlign: 'SPACE_BETWEEN',
          counterAxisAlign: 'CENTER',
          strokes: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true }],
          strokeWeight: 1,
          strokeAlign: 'INSIDE',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Email',
              fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
          {
            type: 'TEXT',
            name: 'Value',
            properties: {
              characters: 'john@example.com',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['flex', 'justify-between', 'py-3', 'border-b', 'border-gray-100'],
      },
    ],
    slotId: 'items',
    unoClasses: ['w-full', 'divide-y', 'divide-gray-100'],
  },

  unoClasses: ['w-full', 'divide-y'],

  defaultSize: { width: 300, height: 100 },
});
