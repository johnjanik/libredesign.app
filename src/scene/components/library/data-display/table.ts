/**
 * Table Component
 * Data table display.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const tableComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-table',
  name: 'Table',
  category: 'data-display',
  description: 'Data table display',
  tags: ['table', 'data', 'grid', 'list', 'rows'],
  icon: 'lucide:table',

  properties: [
    {
      id: 'striped',
      name: 'Striped',
      type: 'boolean',
      defaultValue: false,
      description: 'Alternating row colors',
    },
    {
      id: 'bordered',
      name: 'Bordered',
      type: 'boolean',
      defaultValue: false,
      description: 'Show borders',
    },
    {
      id: 'hoverable',
      name: 'Hoverable',
      type: 'boolean',
      defaultValue: true,
      description: 'Row hover effect',
    },
    {
      id: 'compact',
      name: 'Compact',
      type: 'boolean',
      defaultValue: false,
      description: 'Compact spacing',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'striped', name: 'Striped', propertyValues: { striped: true }, unoClasses: [] },
    { id: 'bordered', name: 'Bordered', propertyValues: { bordered: true }, unoClasses: ['border'] },
  ],

  slots: [
    {
      id: 'rows',
      name: 'Rows',
      allowMultiple: true,
      placeholder: 'Table rows',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Table',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }],
      strokeWeight: 1,
      cornerRadius: 8,
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 0,
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
      clipsContent: true,
    },
    children: [
      {
        type: 'FRAME',
        name: 'Header',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98, a: 1 }, visible: true, opacity: 1 }],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 0,
          autoLayoutPadding: { top: 12, right: 16, bottom: 12, left: 16 },
          primaryAxisSizing: 'FILL',
          counterAxisSizing: 'AUTO',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Col1',
            properties: {
              characters: 'Name',
              fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 12,
              textCase: 'UPPER',
              layoutGrow: 1,
            },
            unoClasses: ['flex-1', 'text-xs', 'font-semibold', 'text-gray-500', 'uppercase'],
          },
          {
            type: 'TEXT',
            name: 'Col2',
            properties: {
              characters: 'Status',
              fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 12,
              textCase: 'UPPER',
              width: 80,
            },
            unoClasses: ['w-20', 'text-xs', 'font-semibold', 'text-gray-500', 'uppercase'],
          },
        ],
        unoClasses: ['flex', 'px-4', 'py-3', 'bg-gray-50', 'border-b'],
      },
      {
        type: 'FRAME',
        name: 'Row1',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 0,
          autoLayoutPadding: { top: 12, right: 16, bottom: 12, left: 16 },
          primaryAxisSizing: 'FILL',
          counterAxisSizing: 'AUTO',
          strokes: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true }],
          strokeWeight: 1,
          strokeAlign: 'INSIDE',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Cell1',
            properties: {
              characters: 'John Doe',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
              layoutGrow: 1,
            },
            unoClasses: ['flex-1', 'text-sm', 'text-gray-900'],
          },
          {
            type: 'TEXT',
            name: 'Cell2',
            properties: {
              characters: 'Active',
              fills: [{ type: 'SOLID', color: { r: 0.13, g: 0.73, b: 0.46, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
              width: 80,
            },
            unoClasses: ['w-20', 'text-sm', 'text-green-600'],
          },
        ],
        unoClasses: ['flex', 'px-4', 'py-3', 'border-b', 'border-gray-100', 'hover:bg-gray-50'],
      },
    ],
    slotId: 'rows',
    unoClasses: ['w-full', 'border', 'rounded-lg', 'overflow-hidden'],
  },

  unoClasses: ['w-full', 'border', 'rounded-lg', 'overflow-hidden'],

  defaultSize: { width: 400, height: 150 },
});
