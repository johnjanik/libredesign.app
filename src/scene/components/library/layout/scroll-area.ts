/**
 * ScrollArea Component
 * Scrollable container with customizable scrollbars.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const scrollAreaComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-scroll-area',
  name: 'Scroll Area',
  category: 'layout',
  description: 'Scrollable container with customizable scrollbars',
  tags: ['scroll', 'overflow', 'scrollbar', 'container', 'scrollable'],
  icon: 'lucide:scroll',

  properties: [
    {
      id: 'direction',
      name: 'Scroll Direction',
      type: 'enum',
      defaultValue: 'vertical',
      options: ['vertical', 'horizontal', 'both'],
      description: 'Scroll direction',
    },
    {
      id: 'maxHeight',
      name: 'Max Height',
      type: 'number',
      defaultValue: 400,
      min: 100,
      max: 2000,
      description: 'Maximum height before scrolling',
    },
    {
      id: 'showScrollbar',
      name: 'Show Scrollbar',
      type: 'enum',
      defaultValue: 'auto',
      options: ['auto', 'always', 'hover', 'never'],
      description: 'Scrollbar visibility',
    },
  ],

  variants: [
    { id: 'vertical', name: 'Vertical', propertyValues: { direction: 'vertical' }, unoClasses: ['overflow-y-auto', 'overflow-x-hidden'] },
    { id: 'horizontal', name: 'Horizontal', propertyValues: { direction: 'horizontal' }, unoClasses: ['overflow-x-auto', 'overflow-y-hidden'] },
    { id: 'both', name: 'Both', propertyValues: { direction: 'both' }, unoClasses: ['overflow-auto'] },
  ],

  slots: [
    {
      id: 'content',
      name: 'Content',
      allowMultiple: true,
      placeholder: 'Scrollable content',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'ScrollArea',
    properties: {
      fills: [],
      overflow: 'SCROLL',
      maxHeight: 400,
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 0,
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'FIXED',
    },
    children: [],
    slotId: 'content',
    unoClasses: ['overflow-auto', 'max-h-96'],
  },

  unoClasses: ['overflow-auto', 'max-h-96'],

  defaultSize: { width: 320, height: 400 },
});
