/**
 * Accordion Component
 * Expandable content sections.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const accordionComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-accordion',
  name: 'Accordion',
  category: 'data-display',
  description: 'Expandable content sections',
  tags: ['accordion', 'collapse', 'expand', 'faq', 'disclosure'],
  icon: 'lucide:chevrons-down-up',

  properties: [
    {
      id: 'multiple',
      name: 'Multiple',
      type: 'boolean',
      defaultValue: false,
      description: 'Allow multiple open',
    },
    {
      id: 'bordered',
      name: 'Bordered',
      type: 'boolean',
      defaultValue: true,
      description: 'Show borders',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: ['border', 'rounded-lg'] },
    { id: 'ghost', name: 'Ghost', propertyValues: { bordered: false }, unoClasses: ['divide-y'] },
  ],

  slots: [
    {
      id: 'items',
      name: 'Items',
      allowMultiple: true,
      placeholder: 'Accordion items',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Accordion',
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
        name: 'Item1',
        properties: {
          fills: [],
          autoLayoutMode: 'VERTICAL',
          autoLayoutGap: 0,
          primaryAxisSizing: 'FILL',
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
              autoLayoutPadding: { top: 16, right: 16, bottom: 16, left: 16 },
              primaryAxisAlign: 'SPACE_BETWEEN',
              counterAxisAlign: 'CENTER',
              primaryAxisSizing: 'FILL',
            },
            children: [
              {
                type: 'TEXT',
                name: 'Title',
                properties: {
                  characters: 'Section Title',
                  fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: 14,
                },
                unoClasses: ['text-sm', 'font-medium', 'text-gray-900'],
              },
              {
                type: 'TEXT',
                name: 'Icon',
                properties: {
                  characters: '▼',
                  fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
                  fontSize: 10,
                },
                unoClasses: ['text-gray-400'],
              },
            ],
            unoClasses: ['flex', 'justify-between', 'items-center', 'px-4', 'py-4', 'cursor-pointer', 'hover:bg-gray-50'],
          },
          {
            type: 'FRAME',
            name: 'Content',
            properties: {
              fills: [],
              autoLayoutMode: 'VERTICAL',
              autoLayoutPadding: { top: 0, right: 16, bottom: 16, left: 16 },
              primaryAxisSizing: 'FILL',
            },
            children: [
              {
                type: 'TEXT',
                name: 'Text',
                properties: {
                  characters: 'Content goes here. This is the expandable section.',
                  fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: 1.5,
                },
                unoClasses: ['text-sm', 'text-gray-600', 'leading-relaxed'],
              },
            ],
            unoClasses: ['px-4', 'pb-4'],
          },
        ],
        unoClasses: ['border-b', 'border-gray-100', 'last:border-b-0'],
      },
    ],
    slotId: 'items',
    unoClasses: ['w-full', 'border', 'rounded-lg', 'divide-y', 'divide-gray-100'],
  },

  unoClasses: ['w-full', 'border', 'rounded-lg', 'divide-y'],

  defaultSize: { width: 400, height: 120 },
});
