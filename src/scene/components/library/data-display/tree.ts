/**
 * Tree Component
 * Hierarchical tree view.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const treeComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-tree',
  name: 'Tree',
  category: 'data-display',
  description: 'Hierarchical tree view',
  tags: ['tree', 'hierarchy', 'nested', 'folder', 'structure'],
  icon: 'lucide:git-branch',

  properties: [
    {
      id: 'selectable',
      name: 'Selectable',
      type: 'boolean',
      defaultValue: true,
      description: 'Allow selection',
    },
    {
      id: 'checkable',
      name: 'Checkable',
      type: 'boolean',
      defaultValue: false,
      description: 'Show checkboxes',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'checkable', name: 'Checkable', propertyValues: { checkable: true }, unoClasses: [] },
  ],

  slots: [
    {
      id: 'items',
      name: 'Items',
      allowMultiple: true,
      placeholder: 'Tree items',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Tree',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 2,
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Item1',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 8,
          autoLayoutPadding: { top: 6, right: 8, bottom: 6, left: 8 },
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Chevron',
            properties: {
              characters: '▶',
              fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
              fontSize: 10,
            },
            unoClasses: ['text-gray-400'],
          },
          {
            type: 'TEXT',
            name: 'Icon',
            properties: {
              characters: '📁',
              fontSize: 14,
            },
          },
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Folder',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
            },
            unoClasses: ['text-sm', 'text-gray-900'],
          },
        ],
        unoClasses: ['flex', 'items-center', 'gap-2', 'px-2', 'py-1.5', 'rounded', 'hover:bg-gray-100', 'cursor-pointer'],
      },
      {
        type: 'FRAME',
        name: 'Item2',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 8,
          autoLayoutPadding: { top: 6, right: 8, bottom: 6, left: 32 },
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Icon',
            properties: {
              characters: '📄',
              fontSize: 14,
            },
          },
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'File.txt',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['flex', 'items-center', 'gap-2', 'px-2', 'py-1.5', 'pl-8', 'rounded', 'hover:bg-gray-100', 'cursor-pointer'],
      },
    ],
    slotId: 'items',
    unoClasses: ['flex', 'flex-col', 'gap-0.5'],
  },

  unoClasses: ['flex', 'flex-col', 'gap-0.5'],

  defaultSize: { width: 250, height: 150 },
});
