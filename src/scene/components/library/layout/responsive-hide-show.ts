/**
 * ResponsiveHideShow Component
 * Container that shows/hides based on breakpoint.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const responsiveHideShowComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-responsive-hide-show',
  name: 'Responsive',
  category: 'layout',
  description: 'Container that shows/hides based on breakpoint',
  tags: ['responsive', 'breakpoint', 'mobile', 'desktop', 'hide', 'show', 'adaptive'],
  icon: 'lucide:smartphone',

  properties: [
    {
      id: 'showOn',
      name: 'Show On',
      type: 'enum',
      defaultValue: 'all',
      options: ['all', 'mobile', 'tablet', 'desktop', 'mobile-tablet', 'tablet-desktop'],
      description: 'Visibility breakpoints',
    },
    {
      id: 'hideOn',
      name: 'Hide On',
      type: 'enum',
      defaultValue: 'none',
      options: ['none', 'mobile', 'tablet', 'desktop'],
      description: 'Hidden on breakpoint',
    },
  ],

  variants: [
    { id: 'all', name: 'All Screens', propertyValues: { showOn: 'all' }, unoClasses: [] },
    { id: 'mobile-only', name: 'Mobile Only', propertyValues: { showOn: 'mobile' }, unoClasses: ['md:hidden'] },
    { id: 'desktop-only', name: 'Desktop Only', propertyValues: { showOn: 'desktop' }, unoClasses: ['hidden', 'lg:block'] },
    { id: 'hide-mobile', name: 'Hide on Mobile', propertyValues: { hideOn: 'mobile' }, unoClasses: ['hidden', 'md:block'] },
  ],

  slots: [
    {
      id: 'content',
      name: 'Content',
      allowMultiple: true,
      placeholder: 'Content',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Responsive',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [],
    slotId: 'content',
    unoClasses: [],
  },

  unoClasses: [],

  defaultSize: { width: 320, height: 100 },
});
