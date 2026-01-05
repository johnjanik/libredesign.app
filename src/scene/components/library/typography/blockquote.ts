/**
 * Blockquote Component
 * Styled quotation block.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const blockquoteComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-blockquote',
  name: 'Blockquote',
  category: 'typography',
  description: 'Styled quotation block',
  tags: ['quote', 'blockquote', 'citation', 'pullquote', 'testimonial'],
  icon: 'lucide:quote',

  properties: [
    {
      id: 'text',
      name: 'Quote',
      type: 'text',
      defaultValue: 'The only way to do great work is to love what you do.',
      description: 'Quote text',
    },
    {
      id: 'author',
      name: 'Author',
      type: 'text',
      defaultValue: 'Steve Jobs',
      description: 'Quote author',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'border',
      options: ['border', 'icon', 'filled'],
      description: 'Quote style',
    },
  ],

  variants: [
    { id: 'border', name: 'Border', propertyValues: { variant: 'border' }, unoClasses: ['border-l-4', 'border-gray-300'] },
    { id: 'icon', name: 'Icon', propertyValues: { variant: 'icon' }, unoClasses: [] },
    { id: 'filled', name: 'Filled', propertyValues: { variant: 'filled' }, unoClasses: ['bg-gray-100', 'rounded-lg'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Blockquote',
    properties: {
      fills: [],
      strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true, opacity: 1 }],
      strokeWeight: 4,
      strokeAlign: 'INSIDE',
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 12,
      autoLayoutPadding: { top: 16, right: 16, bottom: 16, left: 24 },
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'STRETCH',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Quote',
        properties: {
          characters: 'The only way to do great work is to love what you do.',
          fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 18,
          fontStyle: 'italic',
          lineHeight: 1.6,
        },
        propertyBindings: [
          { propertyId: 'text', targetPath: ['characters'] },
        ],
        unoClasses: ['text-lg', 'italic', 'text-gray-700', 'leading-relaxed'],
      },
      {
        type: 'TEXT',
        name: 'Author',
        properties: {
          characters: '— Steve Jobs',
          fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 14,
        },
        unoClasses: ['text-sm', 'font-medium', 'text-gray-500'],
      },
    ],
    unoClasses: ['border-l-4', 'border-gray-300', 'pl-6', 'py-4', 'flex', 'flex-col', 'gap-3'],
  },

  unoClasses: ['border-l-4', 'border-gray-300', 'pl-6', 'py-4'],

  defaultSize: { width: 400, height: 120 },
});
