/**
 * Pagination Component
 * Page navigation controls.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const paginationComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-pagination',
  name: 'Pagination',
  category: 'navigation',
  description: 'Page navigation controls',
  tags: ['pagination', 'pages', 'navigation', 'pager', 'numbers'],
  icon: 'lucide:chevrons-left-right',

  properties: [
    {
      id: 'totalPages',
      name: 'Total Pages',
      type: 'number',
      defaultValue: 10,
      min: 1,
      max: 100,
      description: 'Total number of pages',
    },
    {
      id: 'currentPage',
      name: 'Current Page',
      type: 'number',
      defaultValue: 1,
      min: 1,
      description: 'Current page number',
    },
    {
      id: 'showEdges',
      name: 'Show Edges',
      type: 'boolean',
      defaultValue: true,
      description: 'Show first/last buttons',
    },
    {
      id: 'compact',
      name: 'Compact',
      type: 'boolean',
      defaultValue: false,
      description: 'Compact mode',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'compact', name: 'Compact', propertyValues: { compact: true }, unoClasses: [] },
    { id: 'simple', name: 'Simple', propertyValues: { showEdges: false }, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Pagination',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 4,
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'PrevBtn',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          cornerRadius: 6,
          width: 32,
          height: 32,
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
        },
        unoClasses: ['w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'border', 'rounded-md', 'hover:bg-gray-50'],
      },
      {
        type: 'FRAME',
        name: 'Page1',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          cornerRadius: 6,
          width: 32,
          height: 32,
        },
        children: [
          {
            type: 'TEXT',
            name: 'Num',
            properties: {
              characters: '1',
              fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'bg-blue-600', 'text-white', 'rounded-md'],
      },
      {
        type: 'FRAME',
        name: 'Page2',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          cornerRadius: 6,
          width: 32,
          height: 32,
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
        },
        children: [
          {
            type: 'TEXT',
            name: 'Num',
            properties: {
              characters: '2',
              fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'border', 'rounded-md', 'hover:bg-gray-50'],
      },
      {
        type: 'FRAME',
        name: 'NextBtn',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          cornerRadius: 6,
          width: 32,
          height: 32,
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
        },
        unoClasses: ['w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'border', 'rounded-md', 'hover:bg-gray-50'],
      },
    ],
    unoClasses: ['flex', 'items-center', 'gap-1'],
  },

  unoClasses: ['flex', 'items-center', 'gap-1'],

  defaultSize: { width: 300, height: 40 },
});
