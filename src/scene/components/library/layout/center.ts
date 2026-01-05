/**
 * Center Component
 * Centers content horizontally and/or vertically.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const centerComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-center',
  name: 'Center',
  category: 'layout',
  description: 'Centers content horizontally and/or vertically',
  tags: ['center', 'align', 'middle', 'flex', 'centered'],
  icon: 'lucide:align-center',

  properties: [
    {
      id: 'axis',
      name: 'Center Axis',
      type: 'enum',
      defaultValue: 'both',
      options: ['horizontal', 'vertical', 'both'],
      description: 'Centering axis',
    },
    {
      id: 'inline',
      name: 'Inline',
      type: 'boolean',
      defaultValue: false,
      description: 'Inline element',
    },
  ],

  variants: [
    { id: 'both', name: 'Both Axes', propertyValues: { axis: 'both' }, unoClasses: ['flex', 'items-center', 'justify-center'] },
    { id: 'horizontal', name: 'Horizontal Only', propertyValues: { axis: 'horizontal' }, unoClasses: ['flex', 'justify-center'] },
    { id: 'vertical', name: 'Vertical Only', propertyValues: { axis: 'vertical' }, unoClasses: ['flex', 'items-center'] },
  ],

  slots: [
    {
      id: 'content',
      name: 'Content',
      allowMultiple: true,
      placeholder: 'Centered content',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Center',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'FILL',
    },
    children: [],
    slotId: 'content',
    unoClasses: ['flex', 'items-center', 'justify-center'],
  },

  unoClasses: ['flex', 'items-center', 'justify-center'],

  defaultSize: { width: 320, height: 200 },
});
