/**
 * Textarea Component
 * Multi-line text input.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const textareaComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-textarea',
  name: 'Textarea',
  category: 'forms',
  description: 'Multi-line text input',
  tags: ['textarea', 'input', 'text', 'multiline', 'form'],
  icon: 'lucide:align-left',

  properties: [
    {
      id: 'placeholder',
      name: 'Placeholder',
      type: 'text',
      defaultValue: 'Enter text...',
      description: 'Placeholder text',
    },
    {
      id: 'value',
      name: 'Value',
      type: 'text',
      defaultValue: '',
      description: 'Current value',
    },
    {
      id: 'rows',
      name: 'Rows',
      type: 'number',
      defaultValue: 4,
      min: 2,
      max: 20,
      description: 'Number of visible rows',
    },
    {
      id: 'resize',
      name: 'Resize',
      type: 'enum',
      defaultValue: 'vertical',
      options: ['none', 'vertical', 'horizontal', 'both'],
      description: 'Resize behavior',
    },
    {
      id: 'disabled',
      name: 'Disabled',
      type: 'boolean',
      defaultValue: false,
      description: 'Disabled state',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: ['border-gray-300'] },
    { id: 'filled', name: 'Filled', propertyValues: {}, unoClasses: ['bg-gray-100', 'border-transparent'] },
    { id: 'error', name: 'Error', propertyValues: {}, unoClasses: ['border-red-500'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Textarea',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
      strokeWeight: 1,
      cornerRadius: 6,
      autoLayoutMode: 'VERTICAL',
      autoLayoutPadding: { top: 12, right: 12, bottom: 12, left: 12 },
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'FIXED',
      height: 100,
    },
    children: [
      {
        type: 'TEXT',
        name: 'Placeholder',
        properties: {
          characters: 'Enter text...',
          fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 14,
          lineHeight: 1.5,
        },
        propertyBindings: [
          { propertyId: 'placeholder', targetPath: ['characters'] },
        ],
        unoClasses: ['text-gray-400', 'text-sm'],
      },
    ],
    unoClasses: ['w-full', 'px-3', 'py-3', 'border', 'border-gray-300', 'rounded-md', 'text-sm', 'resize-y', 'focus:ring-2', 'focus:ring-blue-500', 'focus:border-blue-500'],
  },

  unoClasses: ['w-full', 'px-3', 'py-3', 'border', 'rounded-md', 'resize-y'],

  defaultSize: { width: 300, height: 100 },
});
