/**
 * Skeleton Component
 * Loading placeholder.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const skeletonComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-skeleton',
  name: 'Skeleton',
  category: 'data-display',
  description: 'Loading placeholder',
  tags: ['skeleton', 'loading', 'placeholder', 'shimmer', 'loader'],
  icon: 'lucide:loader',

  properties: [
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'text',
      options: ['text', 'circle', 'rectangle', 'card'],
      description: 'Skeleton type',
    },
    {
      id: 'animated',
      name: 'Animated',
      type: 'boolean',
      defaultValue: true,
      description: 'Show shimmer animation',
    },
  ],

  variants: [
    { id: 'text', name: 'Text', propertyValues: { variant: 'text' }, unoClasses: ['h-4', 'rounded'] },
    { id: 'circle', name: 'Circle', propertyValues: { variant: 'circle' }, unoClasses: ['rounded-full'] },
    { id: 'rectangle', name: 'Rectangle', propertyValues: { variant: 'rectangle' }, unoClasses: ['rounded-lg'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Skeleton',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.92, g: 0.92, b: 0.92, a: 1 }, visible: true, opacity: 1 }],
      cornerRadius: 4,
      width: 200,
      height: 16,
    },
    unoClasses: ['bg-gray-200', 'rounded', 'animate-pulse'],
  },

  unoClasses: ['bg-gray-200', 'rounded', 'animate-pulse'],

  defaultSize: { width: 200, height: 16 },
});
