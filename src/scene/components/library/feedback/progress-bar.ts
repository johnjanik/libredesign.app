/**
 * ProgressBar Component
 * Linear progress indicator.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const progressBarComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-progress-bar',
  name: 'Progress Bar',
  category: 'feedback',
  description: 'Linear progress indicator',
  tags: ['progress', 'bar', 'loading', 'percentage', 'indicator'],
  icon: 'lucide:loader',

  properties: [
    {
      id: 'value',
      name: 'Value',
      type: 'number',
      defaultValue: 60,
      min: 0,
      max: 100,
      description: 'Progress percentage',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Bar height',
    },
    {
      id: 'showLabel',
      name: 'Show Label',
      type: 'boolean',
      defaultValue: false,
      description: 'Show percentage',
    },
    {
      id: 'color',
      name: 'Color',
      type: 'enum',
      defaultValue: 'blue',
      options: ['blue', 'green', 'yellow', 'red', 'purple'],
      description: 'Bar color',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'striped', name: 'Striped', propertyValues: {}, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'ProgressBar',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.93, g: 0.93, b: 0.93, a: 1 }, visible: true, opacity: 1 }],
      height: 8,
      cornerRadius: 4,
      autoLayoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'FIXED',
      clipsContent: true,
    },
    children: [
      {
        type: 'FRAME',
        name: 'Fill',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          width: 150,
          height: 8,
          cornerRadius: 4,
        },
        unoClasses: ['h-full', 'bg-blue-600', 'rounded-full', 'transition-all'],
      },
    ],
    unoClasses: ['w-full', 'h-2', 'bg-gray-200', 'rounded-full', 'overflow-hidden'],
  },

  unoClasses: ['w-full', 'h-2', 'bg-gray-200', 'rounded-full'],

  defaultSize: { width: 250, height: 8 },
});
