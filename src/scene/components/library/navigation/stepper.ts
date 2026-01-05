/**
 * Stepper Component
 * Multi-step progress indicator.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const stepperComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-stepper',
  name: 'Stepper',
  category: 'navigation',
  description: 'Multi-step progress indicator',
  tags: ['stepper', 'steps', 'wizard', 'progress', 'multi-step'],
  icon: 'lucide:git-commit',

  properties: [
    {
      id: 'steps',
      name: 'Steps',
      type: 'number',
      defaultValue: 4,
      min: 2,
      max: 10,
      description: 'Number of steps',
    },
    {
      id: 'currentStep',
      name: 'Current Step',
      type: 'number',
      defaultValue: 2,
      min: 1,
      description: 'Current step number',
    },
    {
      id: 'orientation',
      name: 'Orientation',
      type: 'enum',
      defaultValue: 'horizontal',
      options: ['horizontal', 'vertical'],
      description: 'Layout direction',
    },
    {
      id: 'showLabels',
      name: 'Show Labels',
      type: 'boolean',
      defaultValue: true,
      description: 'Show step labels',
    },
  ],

  variants: [
    { id: 'horizontal', name: 'Horizontal', propertyValues: { orientation: 'horizontal' }, unoClasses: ['flex-row'] },
    { id: 'vertical', name: 'Vertical', propertyValues: { orientation: 'vertical' }, unoClasses: ['flex-col'] },
    { id: 'numbers', name: 'Numbers Only', propertyValues: { showLabels: false }, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Stepper',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 0,
      primaryAxisAlign: 'SPACE_BETWEEN',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Step1',
        properties: {
          fills: [],
          autoLayoutMode: 'VERTICAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'ELLIPSE',
            name: 'Circle',
            properties: {
              width: 32,
              height: 32,
              fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
            },
            unoClasses: ['w-8', 'h-8', 'rounded-full', 'bg-blue-600', 'flex', 'items-center', 'justify-center', 'text-white'],
          },
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Step 1',
              fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 12,
            },
            unoClasses: ['text-sm', 'font-medium', 'text-gray-700'],
          },
        ],
        unoClasses: ['flex', 'flex-col', 'items-center', 'gap-2'],
      },
      {
        type: 'FRAME',
        name: 'Connector',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          height: 2,
          layoutGrow: 1,
        },
        unoClasses: ['flex-1', 'h-0.5', 'bg-blue-600'],
      },
      {
        type: 'FRAME',
        name: 'Step2',
        properties: {
          fills: [],
          autoLayoutMode: 'VERTICAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'ELLIPSE',
            name: 'Circle',
            properties: {
              width: 32,
              height: 32,
              fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
            },
          },
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Step 2',
              fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 12,
            },
          },
        ],
        unoClasses: ['flex', 'flex-col', 'items-center', 'gap-2'],
      },
      {
        type: 'FRAME',
        name: 'Connector2',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true, opacity: 1 }],
          height: 2,
          layoutGrow: 1,
        },
        unoClasses: ['flex-1', 'h-0.5', 'bg-gray-300'],
      },
      {
        type: 'FRAME',
        name: 'Step3',
        properties: {
          fills: [],
          autoLayoutMode: 'VERTICAL',
          autoLayoutGap: 8,
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'ELLIPSE',
            name: 'Circle',
            properties: {
              width: 32,
              height: 32,
              fills: [],
              strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
              strokeWeight: 2,
            },
          },
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Step 3',
              fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 12,
            },
          },
        ],
        unoClasses: ['flex', 'flex-col', 'items-center', 'gap-2'],
      },
    ],
    unoClasses: ['flex', 'items-center', 'justify-between', 'w-full'],
  },

  unoClasses: ['flex', 'items-center', 'w-full'],

  defaultSize: { width: 500, height: 80 },
});
