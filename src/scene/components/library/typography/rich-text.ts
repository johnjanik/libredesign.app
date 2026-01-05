/**
 * RichText Component
 * Multi-line text with formatting support.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const richTextComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-rich-text',
  name: 'Rich Text',
  category: 'typography',
  description: 'Multi-line text with formatting',
  tags: ['text', 'paragraph', 'content', 'wysiwyg', 'formatted'],
  icon: 'lucide:file-text',

  properties: [
    {
      id: 'content',
      name: 'Content',
      type: 'text',
      defaultValue: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      description: 'Text content',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Text size',
    },
    {
      id: 'lineHeight',
      name: 'Line Height',
      type: 'enum',
      defaultValue: 'normal',
      options: ['tight', 'normal', 'relaxed', 'loose'],
      description: 'Line spacing',
    },
    {
      id: 'align',
      name: 'Alignment',
      type: 'enum',
      defaultValue: 'left',
      options: ['left', 'center', 'right', 'justify'],
      description: 'Text alignment',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: ['text-base', 'leading-normal'] },
    { id: 'small', name: 'Small', propertyValues: { size: 'sm' }, unoClasses: ['text-sm', 'leading-normal'] },
    { id: 'large', name: 'Large', propertyValues: { size: 'lg' }, unoClasses: ['text-lg', 'leading-relaxed'] },
  ],

  slots: [],

  structure: {
    type: 'TEXT',
    name: 'RichText',
    properties: {
      characters: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 16,
      lineHeight: 1.5,
      textAlign: 'LEFT',
    },
    unoClasses: ['text-base', 'text-gray-700', 'leading-relaxed'],
  },

  unoClasses: ['text-base', 'text-gray-700', 'leading-relaxed'],

  defaultSize: { width: 400, height: 100 },
});
