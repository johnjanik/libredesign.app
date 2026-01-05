/**
 * Callout Component
 * Highlighted content block.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const calloutComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-callout',
  name: 'Callout',
  category: 'feedback',
  description: 'Highlighted content block',
  tags: ['callout', 'note', 'tip', 'highlight', 'aside'],
  icon: 'lucide:info',

  properties: [
    {
      id: 'title',
      name: 'Title',
      type: 'text',
      defaultValue: 'Note',
      description: 'Callout title',
    },
    {
      id: 'content',
      name: 'Content',
      type: 'text',
      defaultValue: 'This is important information that you should pay attention to.',
      description: 'Callout content',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'info',
      options: ['info', 'tip', 'warning', 'danger'],
      description: 'Callout type',
    },
  ],

  variants: [
    { id: 'info', name: 'Info', propertyValues: { variant: 'info' }, unoClasses: ['border-blue-200', 'bg-blue-50'] },
    { id: 'tip', name: 'Tip', propertyValues: { variant: 'tip' }, unoClasses: ['border-green-200', 'bg-green-50'] },
    { id: 'warning', name: 'Warning', propertyValues: { variant: 'warning' }, unoClasses: ['border-yellow-200', 'bg-yellow-50'] },
    { id: 'danger', name: 'Danger', propertyValues: { variant: 'danger' }, unoClasses: ['border-red-200', 'bg-red-50'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Callout',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.94, g: 0.97, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.78, g: 0.88, b: 0.98, a: 1 }, visible: true }],
      strokeWeight: 1,
      cornerRadius: 8,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 12,
      autoLayoutPadding: { top: 16, right: 16, bottom: 16, left: 16 },
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'MIN',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Icon',
        properties: {
          characters: 'ℹ️',
          fontSize: 18,
        },
      },
      {
        type: 'FRAME',
        name: 'Content',
        properties: {
          fills: [],
          autoLayoutMode: 'VERTICAL',
          autoLayoutGap: 4,
          layoutGrow: 1,
        },
        children: [
          {
            type: 'TEXT',
            name: 'Title',
            properties: {
              characters: 'Note',
              fills: [{ type: 'SOLID', color: { r: 0.17, g: 0.40, b: 0.76, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 14,
            },
            propertyBindings: [{ propertyId: 'title', targetPath: ['characters'] }],
            unoClasses: ['text-sm', 'font-semibold', 'text-blue-700'],
          },
          {
            type: 'TEXT',
            name: 'Text',
            properties: {
              characters: 'This is important information that you should pay attention to.',
              fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.45, b: 0.74, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: 1.5,
            },
            propertyBindings: [{ propertyId: 'content', targetPath: ['characters'] }],
            unoClasses: ['text-sm', 'text-blue-600', 'leading-relaxed'],
          },
        ],
        unoClasses: ['flex', 'flex-col', 'gap-1', 'flex-1'],
      },
    ],
    unoClasses: ['flex', 'gap-3', 'p-4', 'bg-blue-50', 'border', 'border-blue-200', 'rounded-lg'],
  },

  unoClasses: ['flex', 'gap-3', 'p-4', 'border', 'rounded-lg'],

  defaultSize: { width: 400, height: 100 },
});
