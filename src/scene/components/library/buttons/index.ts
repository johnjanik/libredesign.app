/**
 * Button Components
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

// Re-export individual components
export { buttonGroupComponent } from './button-group';
export { splitButtonComponent } from './split-button';
export { fabComponent } from './fab';
export { toggleButtonComponent } from './toggle-button';

/**
 * Button Component
 * Primary interactive button with multiple variants and sizes.
 */
export const buttonComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-button',
  name: 'Button',
  category: 'buttons',
  description: 'Interactive button for triggering actions',
  tags: ['button', 'cta', 'action', 'interactive', 'click'],
  icon: 'lucide:mouse-pointer-click',

  properties: [
    {
      id: 'label',
      name: 'Label',
      type: 'text',
      defaultValue: 'Button',
      description: 'Button text content',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'primary',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
      description: 'Visual style variant',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Button size',
    },
    {
      id: 'fullWidth',
      name: 'Full Width',
      type: 'boolean',
      defaultValue: false,
      description: 'Expand to container width',
    },
    {
      id: 'disabled',
      name: 'Disabled',
      type: 'boolean',
      defaultValue: false,
      description: 'Disable interactions',
    },
  ],

  variants: [
    { id: 'primary', name: 'Primary', propertyValues: { variant: 'primary' }, unoClasses: ['bg-blue-600', 'text-white', 'hover:bg-blue-700'] },
    { id: 'secondary', name: 'Secondary', propertyValues: { variant: 'secondary' }, unoClasses: ['bg-gray-200', 'text-gray-900', 'hover:bg-gray-300'] },
    { id: 'outline', name: 'Outline', propertyValues: { variant: 'outline' }, unoClasses: ['border', 'border-gray-300', 'bg-transparent', 'hover:bg-gray-50'] },
    { id: 'ghost', name: 'Ghost', propertyValues: { variant: 'ghost' }, unoClasses: ['bg-transparent', 'hover:bg-gray-100'] },
    { id: 'destructive', name: 'Destructive', propertyValues: { variant: 'destructive' }, unoClasses: ['bg-red-600', 'text-white', 'hover:bg-red-700'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'Button',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
      cornerRadius: 8,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 8,
      autoLayoutPadding: { top: 10, right: 16, bottom: 10, left: 16 },
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'TEXT',
        name: 'Label',
        properties: {
          characters: 'Button',
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 14,
          textAlignHorizontal: 'CENTER',
          textAlignVertical: 'CENTER',
        },
        propertyBindings: [
          { propertyId: 'label', targetPath: ['characters'] },
        ],
      },
    ],
    unoClasses: ['inline-flex', 'items-center', 'justify-center', 'gap-2', 'rounded-lg', 'font-medium', 'transition-colors', 'focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2'],
  },

  unoClasses: [
    'inline-flex', 'items-center', 'justify-center', 'gap-2',
    'px-4', 'py-2', 'rounded-lg', 'font-medium',
    'transition-colors', 'focus:outline-none', 'focus:ring-2',
  ],

  defaultSize: { width: 100, height: 40 },
});

/**
 * Icon Button Component
 * Square button with icon only.
 */
export const iconButtonComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-icon-button',
  name: 'Icon Button',
  category: 'buttons',
  description: 'Square button with icon only',
  tags: ['button', 'icon', 'action', 'interactive'],
  icon: 'lucide:square',

  properties: [
    {
      id: 'icon',
      name: 'Icon',
      type: 'text',
      defaultValue: 'lucide:plus',
      description: 'Iconify icon name',
    },
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'secondary',
      options: ['primary', 'secondary', 'outline', 'ghost'],
      description: 'Visual style variant',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'md',
      options: ['xs', 'sm', 'md', 'lg'],
      description: 'Button size',
    },
    {
      id: 'rounded',
      name: 'Rounded',
      type: 'enum',
      defaultValue: 'md',
      options: ['md', 'full'],
      description: 'Corner rounding',
    },
  ],

  variants: [
    { id: 'primary', name: 'Primary', propertyValues: { variant: 'primary' }, unoClasses: ['bg-blue-600', 'text-white'] },
    { id: 'secondary', name: 'Secondary', propertyValues: { variant: 'secondary' }, unoClasses: ['bg-gray-200', 'text-gray-700'] },
    { id: 'outline', name: 'Outline', propertyValues: { variant: 'outline' }, unoClasses: ['border', 'border-gray-300', 'bg-transparent'] },
    { id: 'ghost', name: 'Ghost', propertyValues: { variant: 'ghost' }, unoClasses: ['bg-transparent', 'hover:bg-gray-100'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'IconButton',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
      cornerRadius: 8,
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutPadding: { top: 8, right: 8, bottom: 8, left: 8 },
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Icon',
        properties: {
          width: 20,
          height: 20,
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }],
        },
      },
    ],
    unoClasses: ['inline-flex', 'items-center', 'justify-center', 'p-2', 'rounded-lg'],
  },

  unoClasses: ['inline-flex', 'items-center', 'justify-center', 'p-2', 'rounded-lg'],

  defaultSize: { width: 40, height: 40 },
});

// Import all components for export
import { buttonGroupComponent } from './button-group';
import { splitButtonComponent } from './split-button';
import { fabComponent } from './fab';
import { toggleButtonComponent } from './toggle-button';

/**
 * Get all button components
 */
export function getButtonsComponents(): LibraryComponent[] {
  return [
    buttonComponent,
    iconButtonComponent,
    buttonGroupComponent,
    splitButtonComponent,
    fabComponent,
    toggleButtonComponent,
  ];
}
