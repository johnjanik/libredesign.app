/**
 * Rating Component
 * Star rating display/input.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const ratingComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-rating',
  name: 'Rating',
  category: 'feedback',
  description: 'Star rating display/input',
  tags: ['rating', 'stars', 'score', 'review', 'feedback'],
  icon: 'lucide:star',

  properties: [
    {
      id: 'value',
      name: 'Value',
      type: 'number',
      defaultValue: 3,
      min: 0,
      max: 5,
      description: 'Rating value',
    },
    {
      id: 'max',
      name: 'Max',
      type: 'number',
      defaultValue: 5,
      min: 3,
      max: 10,
      description: 'Maximum stars',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Star size',
    },
    {
      id: 'readonly',
      name: 'Read Only',
      type: 'boolean',
      defaultValue: false,
      description: 'Disable interaction',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'small', name: 'Small', propertyValues: { size: 'sm' }, unoClasses: [] },
    { id: 'large', name: 'Large', propertyValues: { size: 'lg' }, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Rating',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 4,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Star1',
        properties: {
          characters: '★',
          fills: [{ type: 'SOLID', color: { r: 0.98, g: 0.76, b: 0.18, a: 1 }, visible: true, opacity: 1 }],
          fontSize: 20,
        },
        unoClasses: ['text-xl', 'text-yellow-400'],
      },
      {
        type: 'TEXT',
        name: 'Star2',
        properties: {
          characters: '★',
          fills: [{ type: 'SOLID', color: { r: 0.98, g: 0.76, b: 0.18, a: 1 }, visible: true, opacity: 1 }],
          fontSize: 20,
        },
        unoClasses: ['text-xl', 'text-yellow-400'],
      },
      {
        type: 'TEXT',
        name: 'Star3',
        properties: {
          characters: '★',
          fills: [{ type: 'SOLID', color: { r: 0.98, g: 0.76, b: 0.18, a: 1 }, visible: true, opacity: 1 }],
          fontSize: 20,
        },
        unoClasses: ['text-xl', 'text-yellow-400'],
      },
      {
        type: 'TEXT',
        name: 'Star4',
        properties: {
          characters: '☆',
          fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true, opacity: 1 }],
          fontSize: 20,
        },
        unoClasses: ['text-xl', 'text-gray-300'],
      },
      {
        type: 'TEXT',
        name: 'Star5',
        properties: {
          characters: '☆',
          fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true, opacity: 1 }],
          fontSize: 20,
        },
        unoClasses: ['text-xl', 'text-gray-300'],
      },
    ],
    unoClasses: ['flex', 'items-center', 'gap-1'],
  },

  unoClasses: ['flex', 'items-center', 'gap-1'],

  defaultSize: { width: 120, height: 24 },
});
