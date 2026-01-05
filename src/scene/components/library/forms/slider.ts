/**
 * Slider Component
 * Range input slider.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const sliderComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-slider',
  name: 'Slider',
  category: 'forms',
  description: 'Range input slider',
  tags: ['slider', 'range', 'input', 'value', 'form'],
  icon: 'lucide:sliders-horizontal',

  properties: [
    {
      id: 'value',
      name: 'Value',
      type: 'number',
      defaultValue: 50,
      min: 0,
      max: 100,
      description: 'Current value',
    },
    {
      id: 'min',
      name: 'Min',
      type: 'number',
      defaultValue: 0,
      description: 'Minimum value',
    },
    {
      id: 'max',
      name: 'Max',
      type: 'number',
      defaultValue: 100,
      description: 'Maximum value',
    },
    {
      id: 'showValue',
      name: 'Show Value',
      type: 'boolean',
      defaultValue: false,
      description: 'Display current value',
    },
    {
      id: 'disabled',
      name: 'Disabled',
      type: 'boolean',
      defaultValue: false,
      description: 'Disabled state',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'withValue', name: 'With Value', propertyValues: { showValue: true }, unoClasses: [] },
    { id: 'disabled', name: 'Disabled', propertyValues: { disabled: true }, unoClasses: ['opacity-50'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Slider',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 0,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
      height: 24,
    },
    children: [
      {
        type: 'FRAME',
        name: 'Track',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
          height: 6,
          cornerRadius: 3,
          layoutGrow: 1,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'FRAME',
            name: 'Fill',
            properties: {
              fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
              width: 100,
              height: 6,
              cornerRadius: 3,
            },
            unoClasses: ['h-1.5', 'bg-blue-600', 'rounded-full'],
          },
          {
            type: 'ELLIPSE',
            name: 'Thumb',
            properties: {
              width: 18,
              height: 18,
              fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
              strokes: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true }],
              strokeWeight: 2,
              effects: [
                { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 1 }, radius: 3, visible: true },
              ],
            },
            unoClasses: ['w-4.5', 'h-4.5', 'rounded-full', 'bg-white', 'border-2', 'border-blue-600', 'shadow', 'cursor-pointer'],
          },
        ],
        unoClasses: ['w-full', 'h-1.5', 'bg-gray-200', 'rounded-full', 'relative'],
      },
    ],
    unoClasses: ['w-full', 'flex', 'items-center'],
  },

  unoClasses: ['w-full', 'flex', 'items-center'],

  defaultSize: { width: 200, height: 24 },
});
