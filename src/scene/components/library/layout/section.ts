/**
 * Section Component
 * Full-width page section with optional header.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const sectionComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-section',
  name: 'Section',
  category: 'layout',
  description: 'Full-width page section with optional header',
  tags: ['section', 'page', 'block', 'content', 'layout'],
  icon: 'lucide:layout',

  properties: [
    {
      id: 'title',
      name: 'Title',
      type: 'text',
      defaultValue: '',
      description: 'Section title',
    },
    {
      id: 'background',
      name: 'Background',
      type: 'enum',
      defaultValue: 'none',
      options: ['none', 'subtle', 'muted', 'accent'],
      description: 'Background style',
    },
    {
      id: 'paddingY',
      name: 'Vertical Padding',
      type: 'enum',
      defaultValue: 'lg',
      options: ['none', 'sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Top and bottom padding',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: ['py-12'] },
    { id: 'subtle', name: 'Subtle BG', propertyValues: { background: 'subtle' }, unoClasses: ['py-12', 'bg-gray-50'] },
    { id: 'hero', name: 'Hero Section', propertyValues: { paddingY: '2xl' }, unoClasses: ['py-24'] },
  ],

  slots: [
    {
      id: 'content',
      name: 'Content',
      allowMultiple: true,
      placeholder: 'Section content here',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'Section',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 24,
      autoLayoutPadding: { top: 48, right: 0, bottom: 48, left: 0 },
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [],
    slotId: 'content',
    unoClasses: ['w-full', 'py-12', 'flex', 'flex-col', 'gap-6'],
  },

  unoClasses: ['w-full', 'py-12'],

  defaultSize: { width: 1200, height: 400 },
});
