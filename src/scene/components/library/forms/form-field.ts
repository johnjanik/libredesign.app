/**
 * FormField Component
 * Form field wrapper with label and error.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const formFieldComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-form-field',
  name: 'Form Field',
  category: 'forms',
  description: 'Form field wrapper with label and error',
  tags: ['form', 'field', 'label', 'input', 'wrapper'],
  icon: 'lucide:form-input',

  properties: [
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: 'Label',
      description: 'Field label',
    },
    {
      id: 'required',
      name: 'Required',
      type: 'boolean',
      defaultValue: false,
      description: 'Required field',
    },
    {
      id: 'helperText',
      name: 'Helper Text',
      type: 'text',
      defaultValue: '',
      description: 'Help text below input',
    },
    {
      id: 'error',
      name: 'Error',
      type: 'text',
      defaultValue: '',
      description: 'Error message',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'required', name: 'Required', propertyValues: { required: true }, unoClasses: [] },
    { id: 'error', name: 'Error', propertyValues: { error: 'This field is required' }, unoClasses: [] },
  ],

  slots: [
    {
      id: 'input',
      name: 'Input',
      allowMultiple: false,
      allowedCategories: ['forms'],
      placeholder: 'Form input',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'FormField',
    properties: {
      fills: [],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 6,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'STRETCH',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'LabelRow',
        properties: {
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 4,
          primaryAxisAlign: 'MIN',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Label',
            properties: {
              characters: 'Label',
              fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
            propertyBindings: [
              { propertyId: 'label', targetPath: ['characters'] },
            ],
            unoClasses: ['text-sm', 'font-medium', 'text-gray-800'],
          },
          {
            type: 'TEXT',
            name: 'Required',
            properties: {
              characters: '*',
              fills: [{ type: 'SOLID', color: { r: 0.87, g: 0.25, b: 0.25, a: 1 }, visible: false, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
            unoClasses: ['text-sm', 'text-red-600'],
          },
        ],
        unoClasses: ['flex', 'items-center', 'gap-1'],
      },
      {
        type: 'FRAME',
        name: 'InputSlot',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
          cornerRadius: 6,
          height: 40,
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutPadding: { top: 10, right: 12, bottom: 10, left: 12 },
          primaryAxisSizing: 'FILL',
          counterAxisSizing: 'FIXED',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Placeholder',
            properties: {
              characters: 'Enter value...',
              fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
            },
          },
        ],
        slotId: 'input',
        unoClasses: ['w-full', 'px-3', 'py-2.5', 'border', 'rounded-md'],
      },
      {
        type: 'TEXT',
        name: 'HelperText',
        properties: {
          characters: 'Helper text goes here',
          fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: false, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 12,
        },
        unoClasses: ['text-xs', 'text-gray-500'],
      },
    ],
    unoClasses: ['flex', 'flex-col', 'gap-1.5', 'w-full'],
  },

  unoClasses: ['flex', 'flex-col', 'gap-1.5', 'w-full'],

  defaultSize: { width: 300, height: 80 },
});
