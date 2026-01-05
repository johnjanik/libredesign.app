/**
 * Spacer Component
 * Flexible space for layouts.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const spacerComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-spacer',
  name: 'Spacer',
  category: 'layout',
  description: 'Flexible space for layouts',
  tags: ['spacer', 'space', 'gap', 'flex', 'grow'],
  icon: 'lucide:move-horizontal',

  properties: [
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'flex',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'flex'],
      description: 'Fixed size or flexible',
    },
    {
      id: 'direction',
      name: 'Direction',
      type: 'enum',
      defaultValue: 'auto',
      options: ['auto', 'horizontal', 'vertical'],
      description: 'Growth direction',
    },
  ],

  variants: [
    { id: 'flex', name: 'Flexible', propertyValues: { size: 'flex' }, unoClasses: ['flex-1'] },
    { id: 'fixed-sm', name: 'Small (8px)', propertyValues: { size: 'sm' }, unoClasses: ['h-2', 'w-2'] },
    { id: 'fixed-md', name: 'Medium (16px)', propertyValues: { size: 'md' }, unoClasses: ['h-4', 'w-4'] },
    { id: 'fixed-lg', name: 'Large (32px)', propertyValues: { size: 'lg' }, unoClasses: ['h-8', 'w-8'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Spacer',
    properties: {
      fills: [],
      layoutGrow: 1,
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'FILL',
    },
    children: [],
    unoClasses: ['flex-1'],
  },

  unoClasses: ['flex-1'],

  defaultSize: { width: 16, height: 16 },
});
