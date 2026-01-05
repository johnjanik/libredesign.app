/**
 * Form Component
 * Form container.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const formComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-form',
  name: 'Form',
  category: 'forms',
  description: 'Form container',
  tags: ['form', 'container', 'fields', 'submit', 'wrapper'],
  icon: 'lucide:file-text',

  properties: [
    {
      id: 'layout',
      name: 'Layout',
      type: 'enum',
      defaultValue: 'vertical',
      options: ['vertical', 'horizontal', 'grid'],
      description: 'Form layout',
    },
    {
      id: 'spacing',
      name: 'Spacing',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Field spacing',
    },
  ],

  variants: [
    { id: 'vertical', name: 'Vertical', propertyValues: { layout: 'vertical' }, unoClasses: ['flex-col'] },
    { id: 'horizontal', name: 'Horizontal', propertyValues: { layout: 'horizontal' }, unoClasses: ['flex-row', 'flex-wrap'] },
    { id: 'grid', name: 'Grid', propertyValues: { layout: 'grid' }, unoClasses: ['grid', 'grid-cols-2'] },
  ],

  slots: [
    {
      id: 'fields',
      name: 'Fields',
      allowMultiple: true,
      allowedCategories: ['forms'],
      placeholder: 'Form fields',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Form',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 16,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'STRETCH',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [],
    slotId: 'fields',
    unoClasses: ['flex', 'flex-col', 'gap-4', 'w-full'],
  },

  unoClasses: ['flex', 'flex-col', 'gap-4', 'w-full'],

  defaultSize: { width: 400, height: 300 },
});
