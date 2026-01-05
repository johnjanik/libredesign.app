/**
 * Meter Component
 * Value gauge/meter display.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const meterComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-meter',
  name: 'Meter',
  category: 'feedback',
  description: 'Value gauge/meter display',
  tags: ['meter', 'gauge', 'value', 'range', 'indicator'],
  icon: 'lucide:gauge',

  properties: [
    {
      id: 'value',
      name: 'Value',
      type: 'number',
      defaultValue: 70,
      min: 0,
      max: 100,
      description: 'Current value',
    },
    {
      id: 'low',
      name: 'Low',
      type: 'number',
      defaultValue: 30,
      description: 'Low threshold',
    },
    {
      id: 'high',
      name: 'High',
      type: 'number',
      defaultValue: 70,
      description: 'High threshold',
    },
    {
      id: 'showValue',
      name: 'Show Value',
      type: 'boolean',
      defaultValue: true,
      description: 'Display value',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'segments', name: 'Segments', propertyValues: {}, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Meter',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 4,
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Bar',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
          height: 12,
          cornerRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisSizing: 'FILL',
          clipsContent: true,
        },
        children: [
          {
            type: 'FRAME',
            name: 'Fill',
            properties: {
              fills: [{ type: 'SOLID', color: { r: 0.13, g: 0.73, b: 0.46, a: 1 }, visible: true, opacity: 1 }],
              width: 175,
              height: 12,
              cornerRadius: 6,
            },
            unoClasses: ['h-full', 'bg-green-500', 'rounded-full'],
          },
        ],
        unoClasses: ['w-full', 'h-3', 'bg-gray-200', 'rounded-full', 'overflow-hidden'],
      },
      {
        type: 'FRAME',
        name: 'Labels',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'SPACE_BETWEEN',
          primaryAxisSizing: 'FILL',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Min',
            properties: {
              characters: '0',
              fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontSize: 12,
            },
            unoClasses: ['text-xs', 'text-gray-500'],
          },
          {
            type: 'TEXT',
            name: 'Value',
            properties: {
              characters: '70',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 12,
            },
            unoClasses: ['text-xs', 'font-semibold', 'text-gray-900'],
          },
          {
            type: 'TEXT',
            name: 'Max',
            properties: {
              characters: '100',
              fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontSize: 12,
            },
            unoClasses: ['text-xs', 'text-gray-500'],
          },
        ],
        unoClasses: ['flex', 'justify-between', 'w-full'],
      },
    ],
    unoClasses: ['flex', 'flex-col', 'gap-1', 'w-full'],
  },

  unoClasses: ['flex', 'flex-col', 'gap-1', 'w-full'],

  defaultSize: { width: 250, height: 36 },
});
