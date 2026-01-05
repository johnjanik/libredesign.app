/**
 * Feedback Components
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

/**
 * Alert Component
 * Inline status message.
 */
export const alertComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-alert',
  name: 'Alert',
  category: 'feedback',
  description: 'Inline status message',
  tags: ['alert', 'message', 'notification', 'status', 'info', 'warning', 'error', 'success'],
  icon: 'lucide:alert-circle',

  properties: [
    {
      id: 'title',
      name: 'Title',
      type: 'text',
      defaultValue: 'Alert Title',
      description: 'Alert title text',
    },
    {
      id: 'description',
      name: 'Description',
      type: 'text',
      defaultValue: 'This is an alert message with more details.',
      description: 'Alert description text',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'info',
      options: ['info', 'success', 'warning', 'error'],
      description: 'Alert type/color',
    },
    {
      id: 'dismissible',
      name: 'Dismissible',
      type: 'boolean',
      defaultValue: true,
      description: 'Show close button',
    },
  ],

  variants: [
    { id: 'info', name: 'Info', propertyValues: { variant: 'info' }, unoClasses: ['bg-blue-50', 'border-blue-200', 'text-blue-800'] },
    { id: 'success', name: 'Success', propertyValues: { variant: 'success' }, unoClasses: ['bg-green-50', 'border-green-200', 'text-green-800'] },
    { id: 'warning', name: 'Warning', propertyValues: { variant: 'warning' }, unoClasses: ['bg-yellow-50', 'border-yellow-200', 'text-yellow-800'] },
    { id: 'error', name: 'Error', propertyValues: { variant: 'error' }, unoClasses: ['bg-red-50', 'border-red-200', 'text-red-800'] },
  ],

  slots: [
    { id: 'actions', name: 'Actions', allowMultiple: true, placeholder: 'Action buttons' },
  ],

  structure: {
    type: 'FRAME',
    name: 'Alert',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.94, g: 0.97, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.76, g: 0.85, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
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
        type: 'FRAME',
        name: 'Icon',
        properties: {
          width: 20,
          height: 20,
          fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
        },
        unoClasses: ['w-5', 'h-5', 'flex-shrink-0'],
      },
      {
        type: 'FRAME',
        name: 'Content',
        properties: {
          fills: [],
          autoLayoutMode: 'VERTICAL',
          autoLayoutGap: 4,
          primaryAxisSizing: 'FILL',
          counterAxisSizing: 'AUTO',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Title',
            properties: {
              characters: 'Alert Title',
              fills: [{ type: 'SOLID', color: { r: 0.12, g: 0.31, b: 0.59, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 14,
            },
            propertyBindings: [
              { propertyId: 'title', targetPath: ['characters'] },
            ],
          },
          {
            type: 'TEXT',
            name: 'Description',
            properties: {
              characters: 'This is an alert message with more details.',
              fills: [{ type: 'SOLID', color: { r: 0.18, g: 0.4, b: 0.73, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: 1.4,
            },
            propertyBindings: [
              { propertyId: 'description', targetPath: ['characters'] },
            ],
          },
        ],
      },
      {
        type: 'FRAME',
        name: 'CloseButton',
        properties: {
          width: 20,
          height: 20,
          fills: [],
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'CloseIcon',
            properties: {
              characters: '×',
              fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.5, b: 0.8, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 18,
            },
          },
        ],
        unoClasses: ['w-5', 'h-5', 'cursor-pointer', 'hover:opacity-70'],
      },
    ],
    unoClasses: ['flex', 'gap-3', 'p-4', 'rounded-lg', 'border'],
  },

  unoClasses: ['flex', 'gap-3', 'p-4', 'rounded-lg', 'border'],

  defaultSize: { width: 400, height: 80 },
});

/**
 * Spinner Component
 * Loading spinner animation.
 */
export const spinnerComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-spinner',
  name: 'Spinner',
  category: 'feedback',
  description: 'Loading spinner animation',
  tags: ['spinner', 'loading', 'loader', 'progress', 'wait'],
  icon: 'lucide:loader-2',

  properties: [
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Spinner size',
    },
    {
      id: 'color',
      name: 'Color',
      type: 'enum',
      defaultValue: 'primary',
      options: ['primary', 'secondary', 'white', 'current'],
      description: 'Spinner color',
    },
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: '',
      description: 'Optional loading text',
    },
  ],

  variants: [
    { id: 'xs', name: 'Extra Small', propertyValues: { size: 'xs' }, unoClasses: ['w-4', 'h-4'] },
    { id: 'sm', name: 'Small', propertyValues: { size: 'sm' }, unoClasses: ['w-5', 'h-5'] },
    { id: 'md', name: 'Medium', propertyValues: { size: 'md' }, unoClasses: ['w-6', 'h-6'] },
    { id: 'lg', name: 'Large', propertyValues: { size: 'lg' }, unoClasses: ['w-8', 'h-8'] },
    { id: 'xl', name: 'Extra Large', propertyValues: { size: 'xl' }, unoClasses: ['w-12', 'h-12'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Spinner',
    properties: {
      width: 24,
      height: 24,
      fills: [],
      strokes: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
      strokeWeight: 2,
      strokeCap: 'ROUND',
      cornerRadius: 9999,
    },
    children: [],
    unoClasses: ['animate-spin', 'w-6', 'h-6', 'border-2', 'border-blue-500', 'border-t-transparent', 'rounded-full'],
  },

  unoClasses: ['animate-spin', 'border-2', 'border-t-transparent', 'rounded-full'],

  defaultSize: { width: 24, height: 24 },
});
