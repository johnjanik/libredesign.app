/**
 * Highlight Component
 * Highlighted/marked text.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const highlightComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-highlight',
  name: 'Highlight',
  category: 'typography',
  description: 'Highlighted/marked text',
  tags: ['highlight', 'mark', 'emphasis', 'accent', 'attention'],
  icon: 'lucide:highlighter',

  properties: [
    {
      id: 'text',
      name: 'Text',
      type: 'text',
      defaultValue: 'Highlighted text',
      description: 'Text content',
    },
    {
      id: 'color',
      name: 'Color',
      type: 'enum',
      defaultValue: 'yellow',
      options: ['yellow', 'green', 'blue', 'pink', 'orange'],
      description: 'Highlight color',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'fill',
      options: ['fill', 'underline'],
      description: 'Highlight style',
    },
  ],

  variants: [
    { id: 'yellow', name: 'Yellow', propertyValues: { color: 'yellow' }, unoClasses: ['bg-yellow-200'] },
    { id: 'green', name: 'Green', propertyValues: { color: 'green' }, unoClasses: ['bg-green-200'] },
    { id: 'blue', name: 'Blue', propertyValues: { color: 'blue' }, unoClasses: ['bg-blue-200'] },
    { id: 'pink', name: 'Pink', propertyValues: { color: 'pink' }, unoClasses: ['bg-pink-200'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Highlight',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.99, g: 0.95, b: 0.6, a: 1 }, visible: true, opacity: 1 }],
      cornerRadius: 2,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutPadding: { top: 0, right: 4, bottom: 0, left: 4 },
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Text',
        properties: {
          characters: 'Highlighted text',
          fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 14,
        },
        propertyBindings: [
          { propertyId: 'text', targetPath: ['characters'] },
        ],
        unoClasses: ['text-gray-900'],
      },
    ],
    unoClasses: ['inline-flex', 'px-1', 'bg-yellow-200', 'rounded-sm'],
  },

  unoClasses: ['bg-yellow-200', 'px-1', 'rounded-sm'],

  defaultSize: { width: 120, height: 24 },
});
