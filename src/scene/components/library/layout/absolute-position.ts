/**
 * AbsolutePosition Component
 * Absolutely positioned container.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const absolutePositionComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-absolute-position',
  name: 'Absolute',
  category: 'layout',
  description: 'Absolutely positioned container',
  tags: ['absolute', 'position', 'overlay', 'fixed', 'relative', 'z-index'],
  icon: 'lucide:move',

  properties: [
    {
      id: 'position',
      name: 'Position',
      type: 'enum',
      defaultValue: 'absolute',
      options: ['absolute', 'fixed', 'sticky'],
      description: 'Position type',
    },
    {
      id: 'anchor',
      name: 'Anchor',
      type: 'enum',
      defaultValue: 'top-left',
      options: ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'],
      description: 'Anchor point',
    },
    {
      id: 'inset',
      name: 'Inset',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 100,
      description: 'Inset from edges',
    },
    {
      id: 'zIndex',
      name: 'Z-Index',
      type: 'number',
      defaultValue: 10,
      min: 0,
      max: 100,
      description: 'Stacking order',
    },
  ],

  variants: [
    { id: 'top-left', name: 'Top Left', propertyValues: { anchor: 'top-left' }, unoClasses: ['absolute', 'top-0', 'left-0'] },
    { id: 'top-right', name: 'Top Right', propertyValues: { anchor: 'top-right' }, unoClasses: ['absolute', 'top-0', 'right-0'] },
    { id: 'bottom-left', name: 'Bottom Left', propertyValues: { anchor: 'bottom-left' }, unoClasses: ['absolute', 'bottom-0', 'left-0'] },
    { id: 'bottom-right', name: 'Bottom Right', propertyValues: { anchor: 'bottom-right' }, unoClasses: ['absolute', 'bottom-0', 'right-0'] },
    { id: 'center', name: 'Center', propertyValues: { anchor: 'center' }, unoClasses: ['absolute', 'top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2'] },
    { id: 'fixed', name: 'Fixed', propertyValues: { position: 'fixed' }, unoClasses: ['fixed', 'top-0', 'left-0'] },
  ],

  slots: [
    {
      id: 'content',
      name: 'Content',
      allowMultiple: true,
      placeholder: 'Positioned content',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Absolute',
    properties: {
      fills: [],
      layoutPositioning: 'ABSOLUTE',
      x: 0,
      y: 0,
    },
    children: [],
    slotId: 'content',
    unoClasses: ['absolute', 'top-0', 'left-0'],
  },

  unoClasses: ['absolute', 'top-0', 'left-0'],

  defaultSize: { width: 200, height: 100 },
});
