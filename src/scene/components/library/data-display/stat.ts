/**
 * Stat Component
 * Statistic display with label.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const statComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-stat',
  name: 'Stat',
  category: 'data-display',
  description: 'Statistic display with label',
  tags: ['stat', 'metric', 'number', 'kpi', 'dashboard'],
  icon: 'lucide:trending-up',

  properties: [
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: 'Total Users',
      description: 'Stat label',
    },
    {
      id: 'value',
      name: 'Value',
      type: 'text',
      defaultValue: '12,345',
      description: 'Stat value',
    },
    {
      id: 'change',
      name: 'Change',
      type: 'text',
      defaultValue: '+12%',
      description: 'Change indicator',
    },
    {
      id: 'trend',
      name: 'Trend',
      type: 'enum',
      defaultValue: 'up',
      options: ['up', 'down', 'neutral'],
      description: 'Trend direction',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'card', name: 'Card', propertyValues: {}, unoClasses: ['bg-white', 'shadow', 'rounded-lg', 'p-4'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Stat',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 4,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'MIN',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Label',
        properties: {
          characters: 'Total Users',
          fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 13,
        },
        propertyBindings: [
          { propertyId: 'label', targetPath: ['characters'] },
        ],
        unoClasses: ['text-sm', 'text-gray-500', 'font-medium'],
      },
      {
        type: 'FRAME',
        name: 'ValueRow',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'BASELINE',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Value',
            properties: {
              characters: '12,345',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 700,
              fontSize: 28,
            },
            propertyBindings: [
              { propertyId: 'value', targetPath: ['characters'] },
            ],
            unoClasses: ['text-3xl', 'font-bold', 'text-gray-900'],
          },
          {
            type: 'TEXT',
            name: 'Change',
            properties: {
              characters: '+12%',
              fills: [{ type: 'SOLID', color: { r: 0.13, g: 0.73, b: 0.46, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
            propertyBindings: [
              { propertyId: 'change', targetPath: ['characters'] },
            ],
            unoClasses: ['text-sm', 'font-medium', 'text-green-600'],
          },
        ],
        unoClasses: ['flex', 'items-baseline', 'gap-2'],
      },
    ],
    unoClasses: ['flex', 'flex-col', 'gap-1'],
  },

  unoClasses: ['flex', 'flex-col', 'gap-1'],

  defaultSize: { width: 150, height: 70 },
});
