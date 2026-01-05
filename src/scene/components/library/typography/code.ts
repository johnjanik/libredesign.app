/**
 * Code Component
 * Inline or block code display.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const codeComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-code',
  name: 'Code',
  category: 'typography',
  description: 'Inline or block code display',
  tags: ['code', 'pre', 'monospace', 'syntax', 'snippet'],
  icon: 'lucide:code',

  properties: [
    {
      id: 'code',
      name: 'Code',
      type: 'text',
      defaultValue: 'const hello = "world";',
      description: 'Code content',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'inline',
      options: ['inline', 'block'],
      description: 'Display type',
    },
    {
      id: 'language',
      name: 'Language',
      type: 'enum',
      defaultValue: 'javascript',
      options: ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'bash'],
      description: 'Code language',
    },
    {
      id: 'showLineNumbers',
      name: 'Line Numbers',
      type: 'boolean',
      defaultValue: false,
      description: 'Show line numbers',
    },
  ],

  variants: [
    { id: 'inline', name: 'Inline', propertyValues: { variant: 'inline' }, unoClasses: ['px-1', 'py-0.5', 'rounded', 'bg-gray-100'] },
    { id: 'block', name: 'Block', propertyValues: { variant: 'block' }, unoClasses: ['p-4', 'rounded-lg', 'bg-gray-900', 'text-gray-100'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Code',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
      cornerRadius: 4,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutPadding: { top: 2, right: 6, bottom: 2, left: 6 },
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'CodeText',
        properties: {
          characters: 'const hello = "world";',
          fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.2, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'JetBrains Mono',
          fontWeight: 400,
          fontSize: 14,
        },
        propertyBindings: [
          { propertyId: 'code', targetPath: ['characters'] },
        ],
        unoClasses: ['font-mono', 'text-sm', 'text-pink-600'],
      },
    ],
    unoClasses: ['inline-flex', 'px-1.5', 'py-0.5', 'bg-gray-100', 'rounded', 'font-mono'],
  },

  unoClasses: ['font-mono', 'text-sm', 'bg-gray-100', 'px-1.5', 'py-0.5', 'rounded'],

  defaultSize: { width: 200, height: 28 },
});
