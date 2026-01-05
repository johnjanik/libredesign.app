/**
 * Data Display Components
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

/**
 * Card Component
 * Contained content surface.
 */
export const cardComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-card',
  name: 'Card',
  category: 'data-display',
  description: 'Contained content surface',
  tags: ['card', 'container', 'panel', 'surface', 'box'],
  icon: 'lucide:square',

  properties: [
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'elevated',
      options: ['elevated', 'outlined', 'filled', 'interactive'],
      description: 'Card style variant',
    },
    {
      id: 'padding',
      name: 'Padding',
      type: 'enum',
      defaultValue: 'md',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'Internal padding',
    },
    {
      id: 'radius',
      name: 'Radius',
      type: 'enum',
      defaultValue: 'lg',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      description: 'Corner radius',
    },
  ],

  variants: [
    { id: 'elevated', name: 'Elevated', propertyValues: { variant: 'elevated' }, unoClasses: ['bg-white', 'shadow-md', 'border-0'] },
    { id: 'outlined', name: 'Outlined', propertyValues: { variant: 'outlined' }, unoClasses: ['bg-white', 'border', 'border-gray-200', 'shadow-none'] },
    { id: 'filled', name: 'Filled', propertyValues: { variant: 'filled' }, unoClasses: ['bg-gray-50', 'border-0', 'shadow-none'] },
    { id: 'interactive', name: 'Interactive', propertyValues: { variant: 'interactive' }, unoClasses: ['bg-white', 'shadow-md', 'hover:shadow-lg', 'cursor-pointer', 'transition-shadow'] },
  ],

  slots: [
    { id: 'header', name: 'Header', allowMultiple: false, placeholder: 'Card header' },
    { id: 'content', name: 'Content', allowMultiple: true, placeholder: 'Card content' },
    { id: 'footer', name: 'Footer', allowMultiple: false, placeholder: 'Card footer' },
  ],

  structure: {
    type: 'FRAME',
    name: 'Card',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      cornerRadius: 12,
      effects: [
        {
          type: 'DROP_SHADOW',
          visible: true,
          color: { r: 0, g: 0, b: 0, a: 0.1 },
          offset: { x: 0, y: 4 },
          radius: 6,
          spread: -1,
        },
        {
          type: 'DROP_SHADOW',
          visible: true,
          color: { r: 0, g: 0, b: 0, a: 0.1 },
          offset: { x: 0, y: 2 },
          radius: 4,
          spread: -2,
        },
      ],
      autoLayoutMode: 'VERTICAL',
      autoLayoutGap: 0,
      autoLayoutPadding: { top: 0, right: 0, bottom: 0, left: 0 },
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
      clipsContent: true,
    },
    children: [
      {
        type: 'FRAME',
        name: 'CardContent',
        properties: {
          fills: [],
          autoLayoutMode: 'VERTICAL',
          autoLayoutGap: 12,
          autoLayoutPadding: { top: 20, right: 20, bottom: 20, left: 20 },
          primaryAxisSizing: 'AUTO',
          counterAxisSizing: 'FILL',
        },
        slotId: 'content',
        children: [
          {
            type: 'TEXT',
            name: 'CardTitle',
            properties: {
              characters: 'Card Title',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 18,
            },
          },
          {
            type: 'TEXT',
            name: 'CardDescription',
            properties: {
              characters: 'Card description goes here. Add your content to customize this card.',
              fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: 1.5,
            },
          },
        ],
      },
    ],
    unoClasses: ['bg-white', 'rounded-xl', 'shadow-md', 'overflow-hidden'],
  },

  unoClasses: ['bg-white', 'rounded-xl', 'shadow-md', 'overflow-hidden'],

  defaultSize: { width: 320, height: 180 },
});

/**
 * Badge Component
 * Small status indicator or count.
 */
export const badgeComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-badge',
  name: 'Badge',
  category: 'data-display',
  description: 'Small status indicator or count',
  tags: ['badge', 'tag', 'label', 'status', 'indicator', 'pill'],
  icon: 'lucide:tag',

  properties: [
    {
      id: 'text',
      name: 'Text',
      type: 'text',
      defaultValue: 'Badge',
      description: 'Badge text content',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'default',
      options: ['default', 'primary', 'success', 'warning', 'error', 'info'],
      description: 'Badge color variant',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['sm', 'md', 'lg'],
      description: 'Badge size',
    },
    {
      id: 'pill',
      name: 'Pill Shape',
      type: 'boolean',
      defaultValue: true,
      description: 'Fully rounded corners',
    },
    {
      id: 'outline',
      name: 'Outline',
      type: 'boolean',
      defaultValue: false,
      description: 'Outline style (border only)',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: { variant: 'default' }, unoClasses: ['bg-gray-100', 'text-gray-700'] },
    { id: 'primary', name: 'Primary', propertyValues: { variant: 'primary' }, unoClasses: ['bg-blue-100', 'text-blue-700'] },
    { id: 'success', name: 'Success', propertyValues: { variant: 'success' }, unoClasses: ['bg-green-100', 'text-green-700'] },
    { id: 'warning', name: 'Warning', propertyValues: { variant: 'warning' }, unoClasses: ['bg-yellow-100', 'text-yellow-700'] },
    { id: 'error', name: 'Error', propertyValues: { variant: 'error' }, unoClasses: ['bg-red-100', 'text-red-700'] },
    { id: 'info', name: 'Info', propertyValues: { variant: 'info' }, unoClasses: ['bg-cyan-100', 'text-cyan-700'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Badge',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.94, g: 0.94, b: 0.94, a: 1 }, visible: true, opacity: 1 }],
      cornerRadius: 9999,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutPadding: { top: 2, right: 10, bottom: 2, left: 10 },
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'BadgeText',
        properties: {
          characters: 'Badge',
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 12,
        },
        propertyBindings: [
          { propertyId: 'text', targetPath: ['characters'] },
        ],
      },
    ],
    unoClasses: ['inline-flex', 'items-center', 'px-2.5', 'py-0.5', 'rounded-full', 'text-xs', 'font-medium'],
  },

  unoClasses: ['inline-flex', 'items-center', 'px-2.5', 'py-0.5', 'rounded-full', 'text-xs', 'font-medium'],

  defaultSize: { width: 60, height: 22 },
});
