/**
 * RadioGroup Component
 * Group of radio buttons.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const radioGroupComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-radio-group',
  name: 'Radio Group',
  category: 'forms',
  description: 'Group of radio buttons',
  tags: ['radio', 'group', 'options', 'choice', 'form'],
  icon: 'lucide:list',

  properties: [
    {
      id: 'orientation',
      name: 'Orientation',
      type: 'enum',
      defaultValue: 'vertical',
      options: ['vertical', 'horizontal'],
      description: 'Layout direction',
    },
    {
      id: 'selectedIndex',
      name: 'Selected',
      type: 'number',
      defaultValue: 0,
      min: 0,
      description: 'Selected option index',
    },
  ],

  variants: [
    { id: 'vertical', name: 'Vertical', propertyValues: { orientation: 'vertical' }, unoClasses: ['flex-col'] },
    { id: 'horizontal', name: 'Horizontal', propertyValues: { orientation: 'horizontal' }, unoClasses: ['flex-row'] },
  ],

  slots: [
    {
      id: 'options',
      name: 'Options',
      allowMultiple: true,
      placeholder: 'Radio options',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'RadioGroup',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 12,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'MIN',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Option1',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'FRAME',
            name: 'Circle',
            properties: {
              fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
              strokes: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true }],
              strokeWeight: 2,
              width: 18,
              height: 18,
              cornerRadius: 9,
              autoLayoutMode: 'HORIZONTAL',
              primaryAxisAlign: 'CENTER',
              counterAxisAlign: 'CENTER',
            },
            children: [
              {
                type: 'ELLIPSE',
                name: 'Dot',
                properties: {
                  width: 8,
                  height: 8,
                  fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
                },
              },
            ],
          },
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Option 1',
              fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['flex', 'items-center', 'gap-2'],
      },
      {
        type: 'FRAME',
        name: 'Option2',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'FRAME',
            name: 'Circle',
            properties: {
              fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
              strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true }],
              strokeWeight: 2,
              width: 18,
              height: 18,
              cornerRadius: 9,
            },
          },
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Option 2',
              fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['flex', 'items-center', 'gap-2'],
      },
      {
        type: 'FRAME',
        name: 'Option3',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'FRAME',
            name: 'Circle',
            properties: {
              fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
              strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true }],
              strokeWeight: 2,
              width: 18,
              height: 18,
              cornerRadius: 9,
            },
          },
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Option 3',
              fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['flex', 'items-center', 'gap-2'],
      },
    ],
    slotId: 'options',
    unoClasses: ['flex', 'flex-col', 'gap-3'],
  },

  unoClasses: ['flex', 'flex-col', 'gap-3'],

  defaultSize: { width: 200, height: 100 },
});
