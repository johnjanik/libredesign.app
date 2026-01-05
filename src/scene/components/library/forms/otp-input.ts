/**
 * OTPInput Component
 * One-time password input.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const otpInputComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-otp-input',
  name: 'OTP Input',
  category: 'forms',
  description: 'One-time password input',
  tags: ['otp', 'code', 'verification', 'pin', 'form'],
  icon: 'lucide:key',

  properties: [
    {
      id: 'length',
      name: 'Length',
      type: 'number',
      defaultValue: 6,
      min: 4,
      max: 8,
      description: 'Number of digits',
    },
    {
      id: 'type',
      name: 'Type',
      type: 'enum',
      defaultValue: 'number',
      options: ['number', 'alphanumeric'],
      description: 'Input type',
    },
    {
      id: 'masked',
      name: 'Masked',
      type: 'boolean',
      defaultValue: false,
      description: 'Hide entered values',
    },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'separated', name: 'Separated', propertyValues: {}, unoClasses: ['gap-3'] },
    { id: 'masked', name: 'Masked', propertyValues: { masked: true }, unoClasses: [] },
  ],

  slots: [],

  structure: {
    type: 'FRAME',
    name: 'OTPInput',
    properties: {
      fills: [],
      autoLayoutMode: 'HORIZONTAL',
      autoLayoutGap: 8,
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      primaryAxisSizing: 'AUTO',
      counterAxisSizing: 'AUTO',
    },
    children: [
      {
        type: 'FRAME',
        name: 'Digit1',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
          width: 40,
          height: 48,
          cornerRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Value',
            properties: {
              characters: '',
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 20,
            },
          },
        ],
        unoClasses: ['w-10', 'h-12', 'flex', 'items-center', 'justify-center', 'border', 'rounded-md', 'text-xl', 'font-semibold', 'focus-within:border-blue-500', 'focus-within:ring-2', 'focus-within:ring-blue-500'],
      },
      {
        type: 'FRAME',
        name: 'Digit2',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
          width: 40,
          height: 48,
          cornerRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        unoClasses: ['w-10', 'h-12', 'flex', 'items-center', 'justify-center', 'border', 'rounded-md'],
      },
      {
        type: 'FRAME',
        name: 'Digit3',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
          width: 40,
          height: 48,
          cornerRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        unoClasses: ['w-10', 'h-12', 'flex', 'items-center', 'justify-center', 'border', 'rounded-md'],
      },
      {
        type: 'FRAME',
        name: 'Digit4',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
          width: 40,
          height: 48,
          cornerRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        unoClasses: ['w-10', 'h-12', 'flex', 'items-center', 'justify-center', 'border', 'rounded-md'],
      },
      {
        type: 'FRAME',
        name: 'Digit5',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
          width: 40,
          height: 48,
          cornerRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        unoClasses: ['w-10', 'h-12', 'flex', 'items-center', 'justify-center', 'border', 'rounded-md'],
      },
      {
        type: 'FRAME',
        name: 'Digit6',
        properties: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
          strokes: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true }],
          strokeWeight: 1,
          width: 40,
          height: 48,
          cornerRadius: 6,
          autoLayoutMode: 'HORIZONTAL',
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
        },
        unoClasses: ['w-10', 'h-12', 'flex', 'items-center', 'justify-center', 'border', 'rounded-md'],
      },
    ],
    unoClasses: ['flex', 'items-center', 'gap-2'],
  },

  unoClasses: ['flex', 'items-center', 'gap-2'],

  defaultSize: { width: 280, height: 48 },
});
