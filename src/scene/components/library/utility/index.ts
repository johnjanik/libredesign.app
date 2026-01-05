/**
 * Utility Components
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

/**
 * VisuallyHidden Component
 * Screen reader only content.
 */
export const visuallyHiddenComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-visually-hidden',
  name: 'Visually Hidden',
  category: 'utility',
  description: 'Screen reader only content',
  tags: ['a11y', 'accessibility', 'hidden', 'screen-reader', 'sr-only'],
  icon: 'lucide:eye-off',

  properties: [
    { id: 'text', name: 'Text', type: 'text', defaultValue: 'Screen reader text', description: 'Hidden text content' },
  ],

  variants: [],
  slots: [],

  structure: {
    type: 'FRAME', name: 'VisuallyHidden',
    properties: { fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true, opacity: 1 }], strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true }], strokeWeight: 1, cornerRadius: 4, autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 8, autoLayoutPadding: { top: 8, right: 12, bottom: 8, left: 12 } },
    children: [
      { type: 'TEXT', name: 'Icon', properties: { characters: '👁️‍🗨️', fontSize: 14 } },
      { type: 'TEXT', name: 'Label', properties: { characters: 'Screen reader text', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 12, fontStyle: 'italic' }, propertyBindings: [{ propertyId: 'text', targetPath: ['characters'] }] },
    ],
    unoClasses: ['sr-only'],
  },

  unoClasses: ['sr-only'],
  defaultSize: { width: 200, height: 36 },
});

/**
 * FocusTrap Component
 * Trap keyboard focus.
 */
export const focusTrapComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-focus-trap',
  name: 'Focus Trap',
  category: 'utility',
  description: 'Trap keyboard focus',
  tags: ['focus', 'trap', 'a11y', 'keyboard', 'modal'],
  icon: 'lucide:lock',

  properties: [
    { id: 'active', name: 'Active', type: 'boolean', defaultValue: true, description: 'Trap is active' },
  ],

  variants: [],
  slots: [{ id: 'content', name: 'Content', allowMultiple: true, placeholder: 'Trapped content' }],

  structure: {
    type: 'FRAME', name: 'FocusTrap',
    properties: { fills: [], strokes: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 0.3 }, visible: true }], strokeWeight: 2, cornerRadius: 8, autoLayoutMode: 'VERTICAL', autoLayoutPadding: { top: 16, right: 16, bottom: 16, left: 16 } },
    children: [
      { type: 'TEXT', name: 'Label', properties: { characters: 'Focus Trap Zone', fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 0.6 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 11, textCase: 'UPPER' }, unoClasses: ['text-xs', 'text-blue-400', 'uppercase', 'mb-2'] },
    ],
    slotId: 'content',
    unoClasses: ['border-2', 'border-dashed', 'border-blue-300/50', 'rounded-lg', 'p-4'],
  },

  unoClasses: ['border-2', 'border-dashed', 'rounded-lg', 'p-4'],
  defaultSize: { width: 300, height: 150 },
});

/**
 * ClickOutside Component
 * Detect clicks outside.
 */
export const clickOutsideComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-click-outside',
  name: 'Click Outside',
  category: 'utility',
  description: 'Detect clicks outside',
  tags: ['click', 'outside', 'dismiss', 'close', 'overlay'],
  icon: 'lucide:pointer',

  properties: [
    { id: 'enabled', name: 'Enabled', type: 'boolean', defaultValue: true, description: 'Detection enabled' },
  ],

  variants: [],
  slots: [{ id: 'content', name: 'Content', allowMultiple: true, placeholder: 'Content' }],

  structure: {
    type: 'FRAME', name: 'ClickOutside',
    properties: { fills: [], strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.4, b: 0.8, a: 0.3 }, visible: true }], strokeWeight: 2, cornerRadius: 8, autoLayoutMode: 'VERTICAL', autoLayoutPadding: { top: 16, right: 16, bottom: 16, left: 16 } },
    children: [
      { type: 'TEXT', name: 'Label', properties: { characters: 'Click Outside Zone', fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.3, b: 0.6, a: 0.6 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 11, textCase: 'UPPER' } },
    ],
    slotId: 'content',
    unoClasses: ['border-2', 'border-dashed', 'border-purple-300/50', 'rounded-lg', 'p-4'],
  },

  unoClasses: ['border-2', 'border-dashed', 'rounded-lg', 'p-4'],
  defaultSize: { width: 300, height: 150 },
});

/**
 * Portal Component
 * Render in different location.
 */
export const portalComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-portal',
  name: 'Portal',
  category: 'utility',
  description: 'Render in different location',
  tags: ['portal', 'teleport', 'render', 'dom', 'mount'],
  icon: 'lucide:external-link',

  properties: [
    { id: 'target', name: 'Target', type: 'text', defaultValue: 'body', description: 'Mount target selector' },
  ],

  variants: [],
  slots: [{ id: 'content', name: 'Content', allowMultiple: true, placeholder: 'Portal content' }],

  structure: {
    type: 'FRAME', name: 'Portal',
    properties: { fills: [], strokes: [{ type: 'SOLID', color: { r: 0.13, g: 0.73, b: 0.46, a: 0.3 }, visible: true }], strokeWeight: 2, cornerRadius: 8, autoLayoutMode: 'VERTICAL', autoLayoutPadding: { top: 16, right: 16, bottom: 16, left: 16 } },
    children: [
      { type: 'TEXT', name: 'Label', properties: { characters: 'Portal → body', fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.6, b: 0.4, a: 0.6 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 11, textCase: 'UPPER' } },
    ],
    slotId: 'content',
    unoClasses: ['border-2', 'border-dashed', 'border-green-300/50', 'rounded-lg', 'p-4'],
  },

  unoClasses: ['border-2', 'border-dashed', 'rounded-lg', 'p-4'],
  defaultSize: { width: 300, height: 150 },
});

/**
 * Transition Component
 * Animation wrapper.
 */
export const transitionComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-transition',
  name: 'Transition',
  category: 'utility',
  description: 'Animation wrapper',
  tags: ['transition', 'animation', 'enter', 'leave', 'fade'],
  icon: 'lucide:sparkles',

  properties: [
    { id: 'type', name: 'Type', type: 'enum', defaultValue: 'fade', options: ['fade', 'slide', 'scale', 'collapse'], description: 'Animation type' },
    { id: 'duration', name: 'Duration', type: 'number', defaultValue: 200, min: 0, max: 1000, description: 'Duration in ms' },
  ],

  variants: [
    { id: 'fade', name: 'Fade', propertyValues: { type: 'fade' }, unoClasses: ['transition-opacity'] },
    { id: 'slide', name: 'Slide', propertyValues: { type: 'slide' }, unoClasses: ['transition-transform'] },
    { id: 'scale', name: 'Scale', propertyValues: { type: 'scale' }, unoClasses: ['transition-transform'] },
  ],

  slots: [{ id: 'content', name: 'Content', allowMultiple: true, placeholder: 'Animated content' }],

  structure: {
    type: 'FRAME', name: 'Transition',
    properties: { fills: [], strokes: [{ type: 'SOLID', color: { r: 0.98, g: 0.76, b: 0.18, a: 0.3 }, visible: true }], strokeWeight: 2, cornerRadius: 8, autoLayoutMode: 'VERTICAL', autoLayoutPadding: { top: 16, right: 16, bottom: 16, left: 16 } },
    children: [
      { type: 'TEXT', name: 'Label', properties: { characters: 'Transition: fade', fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.6, b: 0.1, a: 0.6 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 11, textCase: 'UPPER' } },
    ],
    slotId: 'content',
    unoClasses: ['transition-all', 'duration-200'],
  },

  unoClasses: ['transition-all'],
  defaultSize: { width: 300, height: 150 },
});

/**
 * ScrollLock Component
 * Prevent body scroll.
 */
export const scrollLockComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-scroll-lock',
  name: 'Scroll Lock',
  category: 'utility',
  description: 'Prevent body scroll',
  tags: ['scroll', 'lock', 'body', 'modal', 'overflow'],
  icon: 'lucide:lock',

  properties: [
    { id: 'active', name: 'Active', type: 'boolean', defaultValue: true, description: 'Lock is active' },
  ],

  variants: [],
  slots: [],

  structure: {
    type: 'FRAME', name: 'ScrollLock',
    properties: { fills: [{ type: 'SOLID', color: { r: 0.87, g: 0.25, b: 0.25, a: 0.1 }, visible: true, opacity: 1 }], strokes: [{ type: 'SOLID', color: { r: 0.87, g: 0.25, b: 0.25, a: 0.3 }, visible: true }], strokeWeight: 2, cornerRadius: 8, autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 8, autoLayoutPadding: { top: 12, right: 16, bottom: 12, left: 16 }, primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' },
    children: [
      { type: 'TEXT', name: 'Icon', properties: { characters: '🔒', fontSize: 16 } },
      { type: 'TEXT', name: 'Label', properties: { characters: 'Scroll Lock Active', fills: [{ type: 'SOLID', color: { r: 0.87, g: 0.25, b: 0.25, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 12 } },
    ],
    unoClasses: ['inline-flex', 'items-center', 'gap-2', 'px-4', 'py-3', 'bg-red-50', 'border-2', 'border-dashed', 'border-red-300/50', 'rounded-lg'],
  },

  unoClasses: ['inline-flex', 'items-center'],
  defaultSize: { width: 180, height: 48 },
});

/**
 * CopyButton Component
 * Copy to clipboard.
 */
export const copyButtonComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-copy-button',
  name: 'Copy Button',
  category: 'utility',
  description: 'Copy to clipboard',
  tags: ['copy', 'clipboard', 'button', 'text', 'code'],
  icon: 'lucide:copy',

  properties: [
    { id: 'text', name: 'Text', type: 'text', defaultValue: 'Copy', description: 'Button text' },
    { id: 'copiedText', name: 'Copied Text', type: 'text', defaultValue: 'Copied!', description: 'Text after copy' },
    { id: 'variant', name: 'Variant', type: 'enum', defaultValue: 'icon', options: ['icon', 'text', 'both'], description: 'Button style' },
  ],

  variants: [
    { id: 'icon', name: 'Icon Only', propertyValues: { variant: 'icon' }, unoClasses: [] },
    { id: 'text', name: 'Text', propertyValues: { variant: 'text' }, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME', name: 'CopyButton',
    properties: { fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96, a: 1 }, visible: true, opacity: 1 }], strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }], strokeWeight: 1, cornerRadius: 6, autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 6, autoLayoutPadding: { top: 8, right: 12, bottom: 8, left: 12 }, primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' },
    children: [
      { type: 'TEXT', name: 'Icon', properties: { characters: '📋', fontSize: 14 } },
      { type: 'TEXT', name: 'Label', properties: { characters: 'Copy', fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 13 }, propertyBindings: [{ propertyId: 'text', targetPath: ['characters'] }] },
    ],
    unoClasses: ['inline-flex', 'items-center', 'gap-1.5', 'px-3', 'py-2', 'bg-gray-100', 'border', 'rounded-md', 'hover:bg-gray-200', 'cursor-pointer'],
  },

  unoClasses: ['inline-flex', 'items-center', 'gap-1.5', 'px-3', 'py-2', 'rounded-md', 'cursor-pointer'],
  defaultSize: { width: 90, height: 36 },
});

/**
 * QRCode Component
 * QR code display.
 */
export const qrCodeComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-qr-code',
  name: 'QR Code',
  category: 'utility',
  description: 'QR code display',
  tags: ['qr', 'code', 'barcode', 'scan', 'link'],
  icon: 'lucide:qr-code',

  properties: [
    { id: 'value', name: 'Value', type: 'text', defaultValue: 'https://example.com', description: 'QR code data' },
    { id: 'size', name: 'Size', type: 'number', defaultValue: 128, min: 64, max: 256, description: 'QR code size' },
  ],

  variants: [],
  slots: [],

  structure: {
    type: 'FRAME', name: 'QRCode',
    properties: { fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], width: 128, height: 128, cornerRadius: 8, autoLayoutMode: 'HORIZONTAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER', strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }], strokeWeight: 1 },
    children: [
      { type: 'FRAME', name: 'Pattern', properties: { fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }], width: 100, height: 100 }, children: [{ type: 'TEXT', name: 'Placeholder', properties: { characters: '▦', fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }], fontSize: 80 } }], unoClasses: ['flex', 'items-center', 'justify-center'] },
    ],
    unoClasses: ['bg-white', 'p-3', 'border', 'rounded-lg', 'flex', 'items-center', 'justify-center'],
  },

  unoClasses: ['bg-white', 'p-3', 'border', 'rounded-lg'],
  defaultSize: { width: 128, height: 128 },
});

/**
 * Get all utility components
 */
export function getUtilityComponents(): LibraryComponent[] {
  return [
    visuallyHiddenComponent,
    focusTrapComponent,
    clickOutsideComponent,
    portalComponent,
    transitionComponent,
    scrollLockComponent,
    copyButtonComponent,
    qrCodeComponent,
  ];
}
