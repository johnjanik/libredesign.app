/**
 * List Component
 * Ordered or unordered list.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const listComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-list',
  name: 'List',
  category: 'typography',
  description: 'Ordered or unordered list',
  tags: ['list', 'ul', 'ol', 'items', 'bullet'],
  icon: 'lucide:list',

  properties: [
    {
      id: 'type',
      name: 'Type',
      type: 'enum',
      defaultValue: 'unordered',
      options: ['unordered', 'ordered', 'none'],
      description: 'List type',
    },
    {
      id: 'spacing',
      name: 'Spacing',
      type: 'enum',
      defaultValue: 'normal',
      options: ['compact', 'normal', 'relaxed'],
      description: 'Item spacing',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Text size',
    },
  ],

  variants: [
    { id: 'bullet', name: 'Bullet', propertyValues: { type: 'unordered' }, unoClasses: ['list-disc'] },
    { id: 'numbered', name: 'Numbered', propertyValues: { type: 'ordered' }, unoClasses: ['list-decimal'] },
    { id: 'plain', name: 'Plain', propertyValues: { type: 'none' }, unoClasses: ['list-none'] },
  ],

  slots: [
    {
      id: 'items',
      name: 'List Items',
      allowMultiple: true,
      placeholder: 'List items',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'List',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 8,
      autoLayoutPadding: { top: 0, right: 0, bottom: 0, left: 20 },
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'STRETCH',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'ListItem1',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'MIN',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Bullet',
            properties: {
              characters: '•',
              fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontSize: 14,
            },
            unoClasses: ['text-gray-500'],
          },
          {
            type: 'TEXT',
            name: 'Text',
            properties: {
              characters: 'First item',
              fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontSize: 14,
            },
            unoClasses: ['text-gray-700'],
          },
        ],
        unoClasses: ['flex', 'gap-2'],
      },
      {
        type: 'FRAME',
        name: 'ListItem2',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'MIN',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Bullet',
            properties: {
              characters: '•',
              fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontSize: 14,
            },
          },
          {
            type: 'TEXT',
            name: 'Text',
            properties: {
              characters: 'Second item',
              fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['flex', 'gap-2'],
      },
      {
        type: 'FRAME',
        name: 'ListItem3',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'MIN',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Bullet',
            properties: {
              characters: '•',
              fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontSize: 14,
            },
          },
          {
            type: 'TEXT',
            name: 'Text',
            properties: {
              characters: 'Third item',
              fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['flex', 'gap-2'],
      },
    ],
    slotId: 'items',
    unoClasses: ['flex', 'flex-col', 'gap-2', 'pl-5', 'list-disc'],
  },

  unoClasses: ['flex', 'flex-col', 'gap-2', 'list-disc', 'pl-5'],

  defaultSize: { width: 300, height: 100 },
});
