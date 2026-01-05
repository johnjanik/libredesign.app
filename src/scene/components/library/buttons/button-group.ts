/**
 * ButtonGroup Component
 * Group of related buttons.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const buttonGroupComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-button-group',
  name: 'Button Group',
  category: 'buttons',
  description: 'Group of related buttons',
  tags: ['button', 'group', 'toolbar', 'actions', 'segmented'],
  icon: 'lucide:square-split-horizontal',

  properties: [
    {
      id: 'orientation',
      name: 'Orientation',
      type: 'enum',
      defaultValue: 'horizontal',
      options: ['horizontal', 'vertical'],
      description: 'Layout direction',
    },
    {
      id: 'attached',
      name: 'Attached',
      type: 'boolean',
      defaultValue: true,
      description: 'Buttons are visually connected',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
    },
  ],

  variants: [
    { id: 'horizontal', name: 'Horizontal', propertyValues: { orientation: 'horizontal' }, unoClasses: ['flex-row'] },
    { id: 'vertical', name: 'Vertical', propertyValues: { orientation: 'vertical' }, unoClasses: ['flex-col'] },
    { id: 'spaced', name: 'Spaced', propertyValues: { attached: false }, unoClasses: ['gap-2'] },
  ],

  slots: [
    {
      id: 'buttons',
      name: 'Buttons',
      allowMultiple: true,
      allowedCategories: ['buttons'],
      placeholder: 'Add buttons',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'ButtonGroup',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 0,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'STRETCH',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Button1',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
          cornerRadius: 0,
          topLeftRadius: 6,
          bottomLeftRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutPadding: { top: 8, right: 16, bottom: 8, left: 16 },
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Left',
              fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['px-4', 'py-2', 'bg-gray-100', 'border', 'border-gray-300', 'rounded-l-md', 'hover:bg-gray-200'],
      },
      {
        type: 'FRAME',
        name: 'Button2',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
          cornerRadius: 0,
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutPadding: { top: 8, right: 16, bottom: 8, left: 16 },
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Center',
              fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['px-4', 'py-2', 'bg-gray-100', 'border-y', 'border-gray-300', 'hover:bg-gray-200'],
      },
      {
        type: 'FRAME',
        name: 'Button3',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
          cornerRadius: 0,
          topRightRadius: 6,
          bottomRightRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutPadding: { top: 8, right: 16, bottom: 8, left: 16 },
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Right',
              fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['px-4', 'py-2', 'bg-gray-100', 'border', 'border-gray-300', 'rounded-r-md', 'hover:bg-gray-200'],
      },
    ],
    slotId: 'buttons',
    unoClasses: ['inline-flex'],
  },

  unoClasses: ['inline-flex'],

  defaultSize: { width: 250, height: 40 },
});
