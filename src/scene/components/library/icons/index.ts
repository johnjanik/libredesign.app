/**
 * Icon Components
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

/**
 * Icon Component
 * Single icon display.
 */
export const iconComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-icon',
  name: 'Icon',
  category: 'icons',
  description: 'Single icon display',
  tags: ['icon', 'symbol', 'glyph', 'svg', 'lucide'],
  icon: 'lucide:star',

  properties: [
    { id: 'icon', name: 'Icon', type: 'text', defaultValue: 'lucide:star', description: 'Iconify icon name' },
    { id: 'size', name: 'Size', type: 'enum', defaultValue: 'md', options: ['xs', 'sm', 'md', 'lg', 'xl'], description: 'Icon size' },
    { id: 'color', name: 'Color', type: 'enum', defaultValue: 'current', options: ['current', 'primary', 'secondary', 'success', 'warning', 'error'], description: 'Icon color' },
  ],

  variants: [
    { id: 'xs', name: 'Extra Small', propertyValues: { size: 'xs' }, unoClasses: ['w-3', 'h-3'] },
    { id: 'sm', name: 'Small', propertyValues: { size: 'sm' }, unoClasses: ['w-4', 'h-4'] },
    { id: 'md', name: 'Medium', propertyValues: { size: 'md' }, unoClasses: ['w-5', 'h-5'] },
    { id: 'lg', name: 'Large', propertyValues: { size: 'lg' }, unoClasses: ['w-6', 'h-6'] },
    { id: 'xl', name: 'Extra Large', propertyValues: { size: 'xl' }, unoClasses: ['w-8', 'h-8'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME', name: 'Icon',
    properties: { fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], width: 20, height: 20, cornerRadius: 0 },
    children: [],
    unoClasses: ['w-5', 'h-5', 'text-current'],
  },

  unoClasses: ['w-5', 'h-5'],
  defaultSize: { width: 20, height: 20 },
});

/**
 * AnimatedIcon Component
 * Icon with animation.
 */
export const animatedIconComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-animated-icon',
  name: 'Animated Icon',
  category: 'icons',
  description: 'Icon with animation',
  tags: ['icon', 'animated', 'motion', 'spinner', 'loading'],
  icon: 'lucide:loader-2',

  properties: [
    { id: 'icon', name: 'Icon', type: 'text', defaultValue: 'lucide:loader-2', description: 'Iconify icon name' },
    { id: 'animation', name: 'Animation', type: 'enum', defaultValue: 'spin', options: ['spin', 'pulse', 'bounce', 'ping'], description: 'Animation type' },
    { id: 'size', name: 'Size', type: 'enum', defaultValue: 'md', options: ['sm', 'md', 'lg', 'xl'], description: 'Icon size' },
  ],

  variants: [
    { id: 'spin', name: 'Spin', propertyValues: { animation: 'spin' }, unoClasses: ['animate-spin'] },
    { id: 'pulse', name: 'Pulse', propertyValues: { animation: 'pulse' }, unoClasses: ['animate-pulse'] },
    { id: 'bounce', name: 'Bounce', propertyValues: { animation: 'bounce' }, unoClasses: ['animate-bounce'] },
    { id: 'ping', name: 'Ping', propertyValues: { animation: 'ping' }, unoClasses: ['animate-ping'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME', name: 'AnimatedIcon',
    properties: { fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }], width: 24, height: 24, cornerRadius: 0 },
    children: [],
    unoClasses: ['w-6', 'h-6', 'animate-spin', 'text-blue-600'],
  },

  unoClasses: ['w-6', 'h-6', 'animate-spin'],
  defaultSize: { width: 24, height: 24 },
});

/**
 * IconStack Component
 * Layered icons.
 */
export const iconStackComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-icon-stack',
  name: 'Icon Stack',
  category: 'icons',
  description: 'Layered icons',
  tags: ['icon', 'stack', 'layer', 'composite', 'badge'],
  icon: 'lucide:layers',

  properties: [
    { id: 'baseIcon', name: 'Base Icon', type: 'text', defaultValue: 'lucide:folder', description: 'Base icon' },
    { id: 'overlayIcon', name: 'Overlay Icon', type: 'text', defaultValue: 'lucide:plus', description: 'Overlay icon' },
    { id: 'size', name: 'Size', type: 'enum', defaultValue: 'md', options: ['sm', 'md', 'lg'], description: 'Stack size' },
  ],

  variants: [],
  slots: [],

  structure: {
    type: 'FRAME', name: 'IconStack',
    properties: { fills: [], width: 32, height: 32, autoLayoutMode: 'HORIZONTAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' },
    children: [
      { type: 'FRAME', name: 'Base', properties: { fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }], width: 24, height: 24 }, unoClasses: ['text-gray-600'] },
      { type: 'FRAME', name: 'Overlay', properties: { fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }], width: 12, height: 12 }, unoClasses: ['absolute', 'bottom-0', 'right-0', 'text-blue-600'] },
    ],
    unoClasses: ['relative', 'inline-flex'],
  },

  unoClasses: ['relative', 'inline-flex'],
  defaultSize: { width: 32, height: 32 },
});

/**
 * Get all icon components
 */
export function getIconsComponents(): LibraryComponent[] {
  return [
    iconComponent,
    animatedIconComponent,
    iconStackComponent,
  ];
}
