/**
 * FileUpload Component
 * File upload input.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const fileUploadComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-file-upload',
  name: 'File Upload',
  category: 'forms',
  description: 'File upload input',
  tags: ['file', 'upload', 'input', 'attachment', 'form'],
  icon: 'lucide:upload',

  properties: [
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'dropzone',
      options: ['dropzone', 'button', 'compact'],
      description: 'Upload style',
    },
    {
      id: 'accept',
      name: 'Accept',
      type: 'text',
      defaultValue: '*',
      description: 'Accepted file types',
    },
    {
      id: 'multiple',
      name: 'Multiple',
      type: 'boolean',
      defaultValue: false,
      description: 'Allow multiple files',
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
    { id: 'dropzone', name: 'Dropzone', propertyValues: { variant: 'dropzone' }, unoClasses: ['border-dashed'] },
    { id: 'button', name: 'Button', propertyValues: { variant: 'button' }, unoClasses: [] },
    { id: 'compact', name: 'Compact', propertyValues: { variant: 'compact' }, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'FileUpload',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
      strokeWeight: 2,
      cornerRadius: 8,
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 8,
      autoLayoutPadding: { top: 24, right: 24, bottom: 24, left: 24 },
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Icon',
        properties: {
          characters: '⬆️',
          fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
          fontSize: 32,
        },
        unoClasses: ['text-3xl', 'text-gray-400'],
      },
      {
        type: 'TEXT',
        name: 'Title',
        properties: {
          characters: 'Drop files here or click to upload',
          fills: [{ type: 'SOLID', color: { r: 0.27, g: 0.27, b: 0.27, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 14,
          textAlignHorizontal: 'CENTER',
        },
        unoClasses: ['text-sm', 'font-medium', 'text-gray-700', 'text-center'],
      },
      {
        type: 'TEXT',
        name: 'Hint',
        properties: {
          characters: 'PNG, JPG, PDF up to 10MB',
          fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 12,
          textAlignHorizontal: 'CENTER',
        },
        unoClasses: ['text-xs', 'text-gray-500', 'text-center'],
      },
    ],
    unoClasses: ['w-full', 'flex', 'flex-col', 'items-center', 'gap-2', 'p-6', 'border-2', 'border-dashed', 'border-gray-300', 'rounded-lg', 'bg-gray-50', 'hover:bg-gray-100', 'cursor-pointer', 'transition-colors'],
  },

  unoClasses: ['w-full', 'flex', 'flex-col', 'items-center', 'p-6', 'border-2', 'border-dashed', 'rounded-lg', 'cursor-pointer'],

  defaultSize: { width: 300, height: 150 },
});
