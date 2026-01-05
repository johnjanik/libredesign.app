/**
 * Form Components
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

/**
 * Input Component
 * Single-line text input.
 */
export const inputComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-input',
  name: 'Input',
  category: 'forms',
  description: 'Single-line text input field',
  tags: ['input', 'text', 'form', 'field', 'textbox'],
  icon: 'lucide:text-cursor-input',

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
      description: 'Input value',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'default',
      options: ['default', 'filled', 'underline'],
      description: 'Input style variant',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Input size',
    },
    {
      id: 'disabled',
      name: 'Disabled',
      type: 'boolean',
      defaultValue: false,
      description: 'Disable input',
    },
    {
      id: 'error',
      name: 'Error',
      type: 'boolean',
      defaultValue: false,
      description: 'Show error state',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: { variant: 'default' }, unoClasses: ['border', 'border-gray-300', 'bg-white'] },
    { id: 'filled', name: 'Filled', propertyValues: { variant: 'filled' }, unoClasses: ['border-0', 'bg-gray-100'] },
    { id: 'underline', name: 'Underline', propertyValues: { variant: 'underline' }, unoClasses: ['border-0', 'border-b-2', 'border-gray-300', 'bg-transparent', 'rounded-none'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Input',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.82, g: 0.82, b: 0.82, a: 1 }, visible: true, opacity: 1 }],
      strokeWeight: 1,
      cornerRadius: 8,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutPadding: { top: 10, right: 14, bottom: 10, left: 14 },
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'AUTO',
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
        },
        propertyBindings: [
          { propertyId: 'placeholder', targetPath: ['characters'] },
        ],
      },
    ],
    unoClasses: ['w-full', 'px-4', 'py-2', 'border', 'border-gray-300', 'rounded-lg', 'focus:ring-2', 'focus:ring-blue-500', 'focus:border-transparent', 'outline-none', 'transition'],
  },

  unoClasses: ['w-full', 'px-4', 'py-2', 'border', 'border-gray-300', 'rounded-lg', 'focus:ring-2', 'focus:ring-blue-500'],

  defaultSize: { width: 280, height: 42 },
});

/**
 * Checkbox Component
 * Boolean toggle with label.
 */
export const checkboxComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-checkbox',
  name: 'Checkbox',
  category: 'forms',
  description: 'Boolean toggle with label',
  tags: ['checkbox', 'toggle', 'form', 'boolean', 'check'],
  icon: 'lucide:check-square',

  properties: [
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: 'Checkbox label',
      description: 'Checkbox label text',
    },
    {
      id: 'checked',
      name: 'Checked',
      type: 'boolean',
      defaultValue: false,
      description: 'Checked state',
    },
    {
      id: 'disabled',
      name: 'Disabled',
      type: 'boolean',
      defaultValue: false,
      description: 'Disable checkbox',
    },
  ],

  variants: [
    { id: 'unchecked', name: 'Unchecked', propertyValues: { checked: false }, unoClasses: ['bg-white', 'border-gray-300'] },
    { id: 'checked', name: 'Checked', propertyValues: { checked: true }, unoClasses: ['bg-blue-600', 'border-blue-600'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Checkbox',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 8,
      autoLayoutPadding: { top: 0, right: 0, bottom: 0, left: 0 },
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'CENTER',
    },
    children: [
      {
        type: 'FRAME',
        name: 'CheckboxBox',
        properties: {
          width: 20,
          height: 20,
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.82, g: 0.82, b: 0.82, a: 1 }, visible: true, opacity: 1 }],
          strokeWeight: 2,
          cornerRadius: 4,
        },
        unoClasses: ['w-5', 'h-5', 'rounded', 'border-2', 'border-gray-300'],
      },
      {
        type: 'TEXT',
        name: 'Label',
        properties: {
          characters: 'Checkbox label',
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 14,
        },
        propertyBindings: [
          { propertyId: 'label', targetPath: ['characters'] },
        ],
      },
    ],
    unoClasses: ['flex', 'items-center', 'gap-2', 'cursor-pointer'],
  },

  unoClasses: ['flex', 'items-center', 'gap-2'],

  defaultSize: { width: 160, height: 24 },
});

/**
 * Select Component
 * Dropdown selection input.
 */
export const selectComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-select',
  name: 'Select',
  category: 'forms',
  description: 'Dropdown selection input',
  tags: ['select', 'dropdown', 'form', 'choice', 'picker'],
  icon: 'lucide:chevron-down',

  properties: [
    {
      id: 'placeholder',
      name: 'Placeholder',
      type: 'text',
      defaultValue: 'Select option...',
      description: 'Placeholder text',
    },
    {
      id: 'value',
      name: 'Selected Value',
      type: 'text',
      defaultValue: '',
      description: 'Currently selected value',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Select size',
    },
    {
      id: 'disabled',
      name: 'Disabled',
      type: 'boolean',
      defaultValue: false,
      description: 'Disable select',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: ['border', 'border-gray-300', 'bg-white'] },
    { id: 'open', name: 'Open', propertyValues: {}, unoClasses: ['border', 'border-blue-500', 'ring-2', 'ring-blue-200'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Select',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.82, g: 0.82, b: 0.82, a: 1 }, visible: true, opacity: 1 }],
      strokeWeight: 1,
      cornerRadius: 8,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutPadding: { top: 10, right: 14, bottom: 10, left: 14 },
      primaryAxisAlign: 'SPACE_BETWEEN',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'FILL',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Value',
        properties: {
          characters: 'Select option...',
          fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 14,
        },
        propertyBindings: [
          { propertyId: 'placeholder', targetPath: ['characters'] },
        ],
      },
      {
        type: 'FRAME',
        name: 'ChevronIcon',
        properties: {
          width: 16,
          height: 16,
          fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
        },
        unoClasses: ['w-4', 'h-4', 'text-gray-500'],
      },
    ],
    unoClasses: ['w-full', 'px-4', 'py-2', 'border', 'border-gray-300', 'rounded-lg', 'bg-white', 'cursor-pointer'],
  },

  unoClasses: ['w-full', 'px-4', 'py-2', 'border', 'border-gray-300', 'rounded-lg', 'bg-white'],

  defaultSize: { width: 280, height: 42 },
});
