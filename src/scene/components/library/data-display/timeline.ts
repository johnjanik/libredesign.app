/**
 * Timeline Component
 * Vertical timeline display.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const timelineComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-timeline',
  name: 'Timeline',
  category: 'data-display',
  description: 'Vertical timeline display',
  tags: ['timeline', 'history', 'events', 'activity', 'log'],
  icon: 'lucide:git-branch',

  properties: [
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'default',
      options: ['default', 'alternating', 'compact'],
      description: 'Layout variant',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: { variant: 'default' }, unoClasses: [] },
    { id: 'alternating', name: 'Alternating', propertyValues: { variant: 'alternating' }, unoClasses: [] },
  ],

  slots: [
    {
      id: 'items',
      name: 'Items',
      allowMultiple: true,
      placeholder: 'Timeline items',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Timeline',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 0,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'MIN',
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
          autoLayoutGap: 12,
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'MIN',
          autoLayoutPadding: { top: 0, right: 0, bottom: 24, left: 0 },
        },
        children: [
          {
            type: 'FRAME',
            name: 'Indicator',
            properties: {
              fills: [],
              autoLayoutMode: 'VERTICAL',
              autoLayoutGap: 0,
              primaryAxisAlign: 'MIN',
              counterAxisAlign: 'CENTER',
              width: 24,
            },
            children: [
              {
                type: 'ELLIPSE',
                name: 'Dot',
                properties: {
                  width: 12,
                  height: 12,
                  fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
                },
                unoClasses: ['w-3', 'h-3', 'rounded-full', 'bg-blue-600'],
              },
              {
                type: 'FRAME',
                name: 'Line',
                properties: {
                  fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
                  width: 2,
                  layoutGrow: 1,
                },
                unoClasses: ['w-0.5', 'flex-1', 'bg-gray-200'],
              },
            ],
            unoClasses: ['flex', 'flex-col', 'items-center'],
          },
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
                  characters: 'Event Title',
                  fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: 14,
                },
                unoClasses: ['text-sm', 'font-medium', 'text-gray-900'],
              },
              {
                type: 'TEXT',
                name: 'Description',
                properties: {
                  characters: 'Event description goes here',
                  fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 13,
                },
                unoClasses: ['text-sm', 'text-gray-500'],
              },
              {
                type: 'TEXT',
                name: 'Time',
                properties: {
                  characters: '2 hours ago',
                  fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6, a: 1 }, visible: true, opacity: 1 }],
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 12,
                },
                unoClasses: ['text-xs', 'text-gray-400'],
              },
            ],
            unoClasses: ['flex', 'flex-col', 'gap-1'],
          },
        ],
        unoClasses: ['flex', 'gap-3', 'pb-6'],
      },
    ],
    slotId: 'items',
    unoClasses: ['flex', 'flex-col'],
  },

  unoClasses: ['flex', 'flex-col'],

  defaultSize: { width: 300, height: 200 },
});
