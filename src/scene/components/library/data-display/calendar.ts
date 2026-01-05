/**
 * Calendar Component
 * Month calendar view.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const calendarComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-calendar',
  name: 'Calendar',
  category: 'data-display',
  description: 'Month calendar view',
  tags: ['calendar', 'date', 'month', 'schedule', 'picker'],
  icon: 'lucide:calendar',

  properties: [
    {
      id: 'showHeader',
      name: 'Show Header',
      type: 'boolean',
      defaultValue: true,
      description: 'Show month header',
    },
    {
      id: 'showWeekdays',
      name: 'Show Weekdays',
      type: 'boolean',
      defaultValue: true,
      description: 'Show weekday row',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'compact', name: 'Compact', propertyValues: {}, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Calendar',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }],
      strokeWeight: 1,
      cornerRadius: 8,
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 8,
      autoLayoutPadding: { top: 16, right: 16, bottom: 16, left: 16 },
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Header',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'SPACE_BETWEEN',
          counterAxisAlign: 'CENTER',
          primaryAxisSizing: 'FILL',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Prev',
            properties: {
              characters: '◀',
              fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
              fontSize: 12,
            },
            unoClasses: ['text-gray-400', 'cursor-pointer', 'hover:text-gray-600'],
          },
          {
            type: 'TEXT',
            name: 'Month',
            properties: {
              characters: 'January 2024',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 14,
            },
            unoClasses: ['text-sm', 'font-semibold', 'text-gray-900'],
          },
          {
            type: 'TEXT',
            name: 'Next',
            properties: {
              characters: '▶',
              fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
              fontSize: 12,
            },
            unoClasses: ['text-gray-400', 'cursor-pointer', 'hover:text-gray-600'],
          },
        ],
        unoClasses: ['flex', 'justify-between', 'items-center', 'w-full'],
      },
      {
        type: 'FRAME',
        name: 'Weekdays',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 0,
          primaryAxisAlign: 'SPACE_AROUND',
          primaryAxisSizing: 'FILL',
        },
        children: [
          { type: 'TEXT', name: 'D1', properties: { characters: 'Su', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 12 } },
          { type: 'TEXT', name: 'D2', properties: { characters: 'Mo', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 12 } },
          { type: 'TEXT', name: 'D3', properties: { characters: 'Tu', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 12 } },
          { type: 'TEXT', name: 'D4', properties: { characters: 'We', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 12 } },
          { type: 'TEXT', name: 'D5', properties: { characters: 'Th', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 12 } },
          { type: 'TEXT', name: 'D6', properties: { characters: 'Fr', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 12 } },
          { type: 'TEXT', name: 'D7', properties: { characters: 'Sa', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 12 } },
        ],
        unoClasses: ['flex', 'justify-around', 'text-xs', 'text-gray-500', 'font-medium'],
      },
      {
        type: 'FRAME',
        name: 'Week1',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 0,
          primaryAxisAlign: 'SPACE_AROUND',
          primaryAxisSizing: 'FILL',
        },
        children: [
          { type: 'TEXT', name: 'C1', properties: { characters: '1', fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 13 } },
          { type: 'TEXT', name: 'C2', properties: { characters: '2', fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 13 } },
          { type: 'TEXT', name: 'C3', properties: { characters: '3', fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 13 } },
          { type: 'TEXT', name: 'C4', properties: { characters: '4', fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 13 } },
          { type: 'TEXT', name: 'C5', properties: { characters: '5', fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 13 } },
          { type: 'TEXT', name: 'C6', properties: { characters: '6', fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 13 } },
          { type: 'TEXT', name: 'C7', properties: { characters: '7', fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 13 } },
        ],
        unoClasses: ['flex', 'justify-around', 'text-sm'],
      },
    ],
    unoClasses: ['p-4', 'border', 'rounded-lg', 'bg-white'],
  },

  unoClasses: ['p-4', 'border', 'rounded-lg'],

  defaultSize: { width: 280, height: 280 },
});
