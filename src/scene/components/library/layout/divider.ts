/**
 * Divider Component
 * Visual separator line.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const dividerComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-divider',
  name: 'Divider',
  category: 'layout',
  description: 'Visual separator line',
  tags: ['divider', 'separator', 'line', 'hr', 'border'],
  icon: 'lucide:minus',

  properties: [
    {
      id: 'orientation',
      name: 'Orientation',
      type: 'enum',
      defaultValue: 'horizontal',
      options: ['horizontal', 'vertical'],
      description: 'Divider direction',
    },
    {
      id: 'thickness',
      name: 'Thickness',
      type: 'enum',
      defaultValue: 'thin',
      options: ['thin', 'medium', 'thick'],
      description: 'Line thickness',
    },
    {
      id: 'color',
      name: 'Color',
      type: 'color',
      defaultValue: '#e5e7eb',
      description: 'Divider color',
    },
    {
      id: 'withLabel',
      name: 'With Label',
      type: 'boolean',
      defaultValue: false,
      description: 'Show center label',
    },
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: 'or',
      description: 'Center label text',
    },
  ],

  variants: [
    { id: 'thin', name: 'Thin', propertyValues: { thickness: 'thin' }, unoClasses: ['border-t'] },
    { id: 'medium', name: 'Medium', propertyValues: { thickness: 'medium' }, unoClasses: ['border-t-2'] },
    { id: 'vertical', name: 'Vertical', propertyValues: { orientation: 'vertical' }, unoClasses: ['border-l', 'h-full'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Divider',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91, a: 1 }, visible: true, opacity: 1 }],
      height: 1,
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'FIXED',
    },
    children: [],
    unoClasses: ['w-full', 'h-px', 'bg-gray-200'],
  },

  unoClasses: ['w-full', 'h-px', 'bg-gray-200'],

  defaultSize: { width: 320, height: 1 },
});
