/**
 * ProgressCircle Component
 * Circular progress indicator.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const progressCircleComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-progress-circle',
  name: 'Progress Circle',
  category: 'feedback',
  description: 'Circular progress indicator',
  tags: ['progress', 'circle', 'ring', 'percentage', 'donut'],
  icon: 'lucide:circle',

  properties: [
    {
      id: 'value',
      name: 'Value',
      type: 'number',
      defaultValue: 75,
      min: 0,
      max: 100,
      description: 'Progress percentage',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Circle size',
    },
    {
      id: 'showValue',
      name: 'Show Value',
      type: 'boolean',
      defaultValue: true,
      description: 'Show percentage in center',
    },
    {
      id: 'thickness',
      name: 'Thickness',
      type: 'enum',
      defaultValue: 'md',
      options: ['thin', 'md', 'thick'],
      description: 'Stroke thickness',
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
    name: 'ProgressCircle',
    properties: {
      fills: [],
      width: 80,
      height: 80,
      autoLayoutMode: 'HORIZONTAL',
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
    },
    children: [
      {
        type: 'ELLIPSE',
        name: 'Track',
        properties: {
          width: 80,
          height: 80,
          fills: [],
          strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }],
          strokeWeight: 8,
        },
        unoClasses: ['absolute'],
      },
      {
        type: 'ELLIPSE',
        name: 'Progress',
        properties: {
          width: 80,
          height: 80,
          fills: [],
          strokes: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true }],
          strokeWeight: 8,
        },
        unoClasses: ['absolute'],
      },
      {
        type: 'TEXT',
        name: 'Value',
        properties: {
          characters: '75%',
          fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 600,
          fontSize: 18,
        },
        unoClasses: ['text-lg', 'font-semibold', 'text-gray-900'],
      },
    ],
    unoClasses: ['relative', 'flex', 'items-center', 'justify-center'],
  },

  unoClasses: ['relative', 'flex', 'items-center', 'justify-center'],

  defaultSize: { width: 80, height: 80 },
});
