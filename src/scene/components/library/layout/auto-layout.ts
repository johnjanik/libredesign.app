/**
 * AutoLayout (Stack) Component
 * Flexible stack container with alignment options.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const autoLayoutComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-auto-layout',
  name: 'Stack',
  category: 'layout',
  description: 'Flexible stack container with alignment options',
  tags: ['stack', 'flex', 'auto-layout', 'horizontal', 'vertical', 'hstack', 'vstack'],
  icon: 'lucide:rows-3',

  properties: [
    {
      id: 'direction',
      name: 'Direction',
      type: 'enum',
      defaultValue: 'vertical',
      options: ['horizontal', 'vertical'],
      description: 'Stack direction',
    },
    {
      id: 'gap',
      name: 'Gap',
      type: 'enum',
      defaultValue: 'md',
      options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Space between items',
    },
    {
      id: 'align',
      name: 'Align',
      type: 'enum',
      defaultValue: 'stretch',
      options: ['start', 'center', 'end', 'stretch'],
      description: 'Cross-axis alignment',
    },
    {
      id: 'justify',
      name: 'Justify',
      type: 'enum',
      defaultValue: 'start',
      options: ['start', 'center', 'end', 'between', 'around', 'evenly'],
      description: 'Main-axis alignment',
    },
    {
      id: 'wrap',
      name: 'Wrap',
      type: 'boolean',
      defaultValue: false,
      description: 'Allow wrapping',
    },
  ],

  variants: [
    { id: 'vstack', name: 'VStack', propertyValues: { direction: 'vertical' }, unoClasses: ['flex', 'flex-col'] },
    { id: 'hstack', name: 'HStack', propertyValues: { direction: 'horizontal' }, unoClasses: ['flex', 'flex-row'] },
    { id: 'center', name: 'Center Stack', propertyValues: { direction: 'vertical', align: 'center', justify: 'center' }, unoClasses: ['flex', 'flex-col', 'items-center', 'justify-center'] },
  ],

  slots: [
    {
      id: 'items',
      name: 'Items',
      allowMultiple: true,
      placeholder: 'Stack items here',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Stack',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 16,
      primaryAxisAlign: 'START',
      counterAxisAlign: 'STRETCH',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [],
    slotId: 'items',
    unoClasses: ['flex', 'flex-col', 'gap-4'],
  },

  unoClasses: ['flex', 'flex-col', 'gap-4'],

  defaultSize: { width: 320, height: 200 },
});
