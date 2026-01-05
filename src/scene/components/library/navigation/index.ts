/**
 * Navigation Components
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

/**
 * Navbar Component
 * Horizontal navigation bar for page top.
 */
export const navbarComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-navbar',
  name: 'Navbar',
  category: 'navigation',
  description: 'Horizontal navigation bar',
  tags: ['navbar', 'navigation', 'header', 'menu', 'topbar'],
  icon: 'lucide:menu',

  properties: [
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'simple',
      options: ['simple', 'centered', 'split', 'transparent'],
      description: 'Navbar layout variant',
    },
    {
      id: 'sticky',
      name: 'Sticky',
      type: 'boolean',
      defaultValue: false,
      description: 'Stick to top on scroll',
    },
    {
      id: 'bordered',
      name: 'Bottom Border',
      type: 'boolean',
      defaultValue: true,
      description: 'Show bottom border',
    },
  ],

  variants: [
    { id: 'simple', name: 'Simple', propertyValues: { variant: 'simple' }, unoClasses: ['justify-between'] },
    { id: 'centered', name: 'Centered', propertyValues: { variant: 'centered' }, unoClasses: ['justify-center'] },
    { id: 'transparent', name: 'Transparent', propertyValues: { variant: 'transparent' }, unoClasses: ['bg-transparent'] },
  ],

  slots: [
    { id: 'logo', name: 'Logo', allowMultiple: false, placeholder: 'Logo' },
    { id: 'links', name: 'Nav Links', allowMultiple: true, placeholder: 'Navigation links' },
    { id: 'actions', name: 'Actions', allowMultiple: true, placeholder: 'Action buttons' },
  ],

  structure: {
    type: 'FRAME',
    name: 'Navbar',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
      strokeWeight: 1,
      strokeAlign: 'OUTSIDE',
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutPadding: { top: 0, right: 16, bottom: 0, left: 16 },
      primaryAxisAlign: 'SPACE_BETWEEN',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'FILL',
      counterAxisSizing: 'FIXED',
      height: 64,
    },
    children: [
      {
        type: 'FRAME',
        name: 'Logo',
        properties: {
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 8,
          counterAxisAlign: 'CENTER',
        },
        slotId: 'logo',
        children: [
          {
            type: 'TEXT',
            name: 'LogoText',
            properties: {
              characters: 'Logo',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 700,
              fontSize: 20,
            },
          },
        ],
      },
      {
        type: 'FRAME',
        name: 'NavLinks',
        properties: {
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 24,
          counterAxisAlign: 'CENTER',
        },
        slotId: 'links',
        children: [
          {
            type: 'TEXT',
            name: 'Link1',
            properties: {
              characters: 'Home',
              fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
          {
            type: 'TEXT',
            name: 'Link2',
            properties: {
              characters: 'About',
              fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
          {
            type: 'TEXT',
            name: 'Link3',
            properties: {
              characters: 'Contact',
              fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
        ],
      },
      {
        type: 'FRAME',
        name: 'Actions',
        properties: {
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutGap: 12,
          counterAxisAlign: 'CENTER',
        },
        slotId: 'actions',
      },
    ],
    unoClasses: ['flex', 'items-center', 'justify-between', 'px-4', 'h-16', 'bg-white', 'border-b'],
  },

  unoClasses: ['flex', 'items-center', 'justify-between', 'px-4', 'h-16', 'bg-white', 'border-b'],

  defaultSize: { width: 800, height: 64 },
});

/**
 * Tabs Component
 * Horizontal tab navigation.
 */
export const tabsComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-tabs',
  name: 'Tabs',
  category: 'navigation',
  description: 'Horizontal tab navigation',
  tags: ['tabs', 'navigation', 'switch', 'panels'],
  icon: 'lucide:layout-list',

  properties: [
    {
      id: 'variant',
      name: 'Variant',
      type: 'enum',
      defaultValue: 'underline',
      options: ['underline', 'pills', 'boxed'],
      description: 'Tab style variant',
    },
    {
      id: 'activeTab',
      name: 'Active Tab',
      type: 'number',
      defaultValue: 0,
      min: 0,
      description: 'Active tab index',
    },
    {
      id: 'fullWidth',
      name: 'Full Width',
      type: 'boolean',
      defaultValue: false,
      description: 'Expand tabs to fill container',
    },
  ],

  variants: [
    { id: 'underline', name: 'Underline', propertyValues: { variant: 'underline' }, unoClasses: ['border-b'] },
    { id: 'pills', name: 'Pills', propertyValues: { variant: 'pills' }, unoClasses: ['gap-1', 'bg-gray-100', 'rounded-lg', 'p-1'] },
    { id: 'boxed', name: 'Boxed', propertyValues: { variant: 'boxed' }, unoClasses: ['border', 'rounded-lg'] },
  ],

  slots: [
    { id: 'tabs', name: 'Tab Items', allowMultiple: true, placeholder: 'Tab items' },
  ],

  structure: {
    type: 'FRAME',
    name: 'Tabs',
    properties: {
      fills: [],
      strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
      strokeWeight: 1,
      strokeAlign: 'INSIDE',
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 0,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'STRETCH',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Tab1',
        properties: {
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutPadding: { top: 12, right: 16, bottom: 12, left: 16 },
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
          strokes: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
          strokeWeight: 2,
          strokeAlign: 'INSIDE',
        },
        children: [
          {
            type: 'TEXT',
            name: 'TabLabel',
            properties: {
              characters: 'Tab 1',
              fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['px-4', 'py-3', 'border-b-2', 'border-blue-500', 'text-blue-500'],
      },
      {
        type: 'FRAME',
        name: 'Tab2',
        properties: {
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutPadding: { top: 12, right: 16, bottom: 12, left: 16 },
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'TabLabel',
            properties: {
              characters: 'Tab 2',
              fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['px-4', 'py-3', 'border-b-2', 'border-transparent', 'text-gray-500', 'hover:text-gray-700'],
      },
      {
        type: 'FRAME',
        name: 'Tab3',
        properties: {
          autoLayoutMode: 'HORIZONTAL',
          autoLayoutPadding: { top: 12, right: 16, bottom: 12, left: 16 },
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'TabLabel',
            properties: {
              characters: 'Tab 3',
              fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
            },
          },
        ],
        unoClasses: ['px-4', 'py-3', 'border-b-2', 'border-transparent', 'text-gray-500', 'hover:text-gray-700'],
      },
    ],
    slotId: 'tabs',
    unoClasses: ['flex', 'border-b'],
  },

  unoClasses: ['flex', 'border-b'],

  defaultSize: { width: 400, height: 48 },
});
