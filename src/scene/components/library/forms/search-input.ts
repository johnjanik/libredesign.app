/**
 * SearchInput Component
 * Search input field.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const searchInputComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-search-input',
  name: 'Search Input',
  category: 'forms',
  description: 'Search input field',
  tags: ['search', 'input', 'find', 'query', 'form'],
  icon: 'lucide:search',

  properties: [
    {
      id: 'placeholder',
      name: 'Placeholder',
      type: 'text',
      defaultValue: 'Search...',
      description: 'Placeholder text',
    },
    {
      id: 'value',
      name: 'Value',
      type: 'text',
      defaultValue: '',
      description: 'Search value',
    },
    {
      id: 'showClear',
      name: 'Show Clear',
      type: 'boolean',
      defaultValue: true,
      description: 'Show clear button',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Input size',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'filled', name: 'Filled', propertyValues: {}, unoClasses: ['bg-gray-100', 'border-transparent'] },
    { id: 'rounded', name: 'Rounded', propertyValues: {}, unoClasses: ['rounded-full'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'SearchInput',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
      strokeWeight: 1,
      cornerRadius: 6,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 8,
      autoLayoutPadding: { top: 10, right: 12, bottom: 10, left: 12 },
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'SearchIcon',
        properties: {
          characters: '🔍',
          fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
          fontSize: 14,
        },
        unoClasses: ['text-gray-400'],
      },
      {
        type: 'TEXT',
        name: 'Placeholder',
        properties: {
          characters: 'Search...',
          fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 14,
          layoutGrow: 1,
        },
        propertyBindings: [
          { propertyId: 'placeholder', targetPath: ['characters'] },
        ],
        unoClasses: ['flex-1', 'text-sm', 'text-gray-400'],
      },
    ],
    unoClasses: ['w-full', 'flex', 'items-center', 'gap-2', 'px-3', 'py-2.5', 'border', 'rounded-md', 'bg-white', 'focus-within:ring-2', 'focus-within:ring-blue-500', 'focus-within:border-blue-500'],
  },

  unoClasses: ['w-full', 'flex', 'items-center', 'gap-2', 'px-3', 'py-2.5', 'border', 'rounded-md'],

  defaultSize: { width: 250, height: 40 },
});
