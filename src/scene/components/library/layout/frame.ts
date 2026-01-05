/**
 * Frame Component
 * Base container with auto-layout support.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const frameComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-frame',
  name: 'Frame',
  category: 'layout',
  description: 'Base container with auto-layout support',
  tags: ['frame', 'container', 'layout', 'auto-layout', 'flexbox'],
  icon: 'lucide:square',

  properties: [
    {
      id: 'direction',
      name: 'Direction',
      type: 'enum',
      defaultValue: 'vertical',
      options: ['horizontal', 'vertical'],
      description: 'Layout direction',
    },
    {
      id: 'gap',
      name: 'Gap',
      type: 'number',
      defaultValue: 16,
      min: 0,
      max: 100,
      description: 'Space between children',
    },
    {
      id: 'padding',
      name: 'Padding',
      type: 'number',
      defaultValue: 16,
      min: 0,
      max: 100,
      description: 'Inner padding',
    },
    {
      id: 'fill',
      name: 'Fill',
      type: 'color',
      defaultValue: '#ffffff',
      description: 'Background color',
    },
    {
      id: 'cornerRadius',
      name: 'Corner Radius',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 100,
      description: 'Corner rounding',
    },
  ],

  variants: [
    { id: 'vertical', name: 'Vertical Stack', propertyValues: { direction: 'vertical' }, unoClasses: ['flex', 'flex-col'] },
    { id: 'horizontal', name: 'Horizontal Stack', propertyValues: { direction: 'horizontal' }, unoClasses: ['flex', 'flex-row'] },
    { id: 'card', name: 'Card', propertyValues: { direction: 'vertical', padding: 24, cornerRadius: 12 }, unoClasses: ['flex', 'flex-col', 'p-6', 'rounded-xl', 'bg-white', 'shadow-md'] },
  ],

  slots: [
    {
      id: 'children',
      name: 'Children',
      allowMultiple: true,
      placeholder: 'Drop content here',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Frame',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 16,
      autoLayoutPadding: { top: 16, right: 16, bottom: 16, left: 16 },
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [],
    slotId: 'children',
    unoClasses: ['flex', 'flex-col', 'gap-4', 'p-4'],
  },

  unoClasses: ['flex', 'flex-col', 'gap-4', 'p-4'],

  defaultSize: { width: 320, height: 200 },
});
