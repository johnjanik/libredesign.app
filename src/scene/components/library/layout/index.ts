/**
 * Layout Components
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

/**
 * Container Component
 * Responsive max-width container for page content.
 */
export const containerComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-container',
  name: 'Container',
  category: 'layout',
  description: 'Responsive max-width container for page content',
  tags: ['container', 'wrapper', 'layout', 'responsive', 'max-width'],
  icon: 'lucide:square-dashed',

  properties: [
    {
      id: 'maxWidth',
      name: 'Max Width',
      type: 'enum',
      defaultValue: 'lg',
      options: ['sm', 'md', 'lg', 'xl', '2xl', 'full'],
      description: 'Maximum width constraint',
    },
    {
      id: 'centered',
      name: 'Centered',
      type: 'boolean',
      defaultValue: true,
      description: 'Center horizontally',
    },
    {
      id: 'padding',
      name: 'Padding',
      type: 'enum',
      defaultValue: 'md',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'Horizontal padding',
    },
  ],

  variants: [
    { id: 'sm', name: 'Small (640px)', propertyValues: { maxWidth: 'sm' }, unoClasses: ['max-w-screen-sm'] },
    { id: 'md', name: 'Medium (768px)', propertyValues: { maxWidth: 'md' }, unoClasses: ['max-w-screen-md'] },
    { id: 'lg', name: 'Large (1024px)', propertyValues: { maxWidth: 'lg' }, unoClasses: ['max-w-screen-lg'] },
    { id: 'xl', name: 'XL (1280px)', propertyValues: { maxWidth: 'xl' }, unoClasses: ['max-w-screen-xl'] },
    { id: '2xl', name: '2XL (1536px)', propertyValues: { maxWidth: '2xl' }, unoClasses: ['max-w-screen-2xl'] },
  ],

  slots: [
    {
      id: 'content',
      name: 'Content',
      allowMultiple: true,
      placeholder: 'Drop content here',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Container',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 0,
      autoLayoutPadding: { top: 0, right: 16, bottom: 0, left: 16 },
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
      minWidth: 320,
      maxWidth: 1024,
    },
    children: [],
    slotId: 'content',
    unoClasses: ['w-full', 'max-w-screen-lg', 'mx-auto', 'px-4'],
  },

  unoClasses: ['w-full', 'mx-auto', 'px-4'],

  defaultSize: { width: 800, height: 200 },
});

/**
 * Grid Component
 * CSS Grid container for two-dimensional layouts.
 */
export const gridComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-grid',
  name: 'Grid',
  category: 'layout',
  description: 'CSS Grid container for layouts',
  tags: ['grid', 'layout', 'columns', 'rows', 'responsive'],
  icon: 'lucide:grid-3x3',

  properties: [
    {
      id: 'columns',
      name: 'Columns',
      type: 'number',
      defaultValue: 3,
      min: 1,
      max: 12,
      description: 'Number of columns',
    },
    {
      id: 'gap',
      name: 'Gap',
      type: 'enum',
      defaultValue: 'md',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      description: 'Gap between items',
    },
    {
      id: 'alignItems',
      name: 'Align Items',
      type: 'enum',
      defaultValue: 'stretch',
      options: ['start', 'center', 'end', 'stretch'],
      description: 'Vertical alignment',
    },
  ],

  variants: [
    { id: '2-col', name: '2 Columns', propertyValues: { columns: 2 }, unoClasses: ['grid-cols-2'] },
    { id: '3-col', name: '3 Columns', propertyValues: { columns: 3 }, unoClasses: ['grid-cols-3'] },
    { id: '4-col', name: '4 Columns', propertyValues: { columns: 4 }, unoClasses: ['grid-cols-4'] },
    { id: '6-col', name: '6 Columns', propertyValues: { columns: 6 }, unoClasses: ['grid-cols-6'] },
  ],

  slots: [
    {
      id: 'items',
      name: 'Grid Items',
      allowMultiple: true,
      placeholder: 'Drop grid items here',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Grid',
    properties: {
      fills: [],
      layoutMode: 'GRID',
      gridColumns: 3,
      gridRows: 1,
      itemSpacing: 16,
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [],
    slotId: 'items',
    unoClasses: ['grid', 'grid-cols-3', 'gap-4'],
  },

  unoClasses: ['grid', 'gap-4'],

  defaultSize: { width: 600, height: 200 },
});
