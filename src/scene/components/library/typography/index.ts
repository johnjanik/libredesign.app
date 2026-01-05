/**
 * Typography Components
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

// Re-export individual components
export { richTextComponent } from './rich-text';
export { linkComponent } from './link';
export { labelComponent } from './label';
export { listComponent } from './list';
export { blockquoteComponent } from './blockquote';
export { codeComponent } from './code';
export { kbdComponent } from './kbd';
export { highlightComponent } from './highlight';

/**
 * Heading Component
 * Page and section headings.
 */
export const headingComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-heading',
  name: 'Heading',
  category: 'typography',
  description: 'Page and section headings',
  tags: ['heading', 'title', 'text', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  icon: 'lucide:heading',

  properties: [
    {
      id: 'text',
      name: 'Text',
      type: 'text',
      defaultValue: 'Heading',
      description: 'Heading text content',
    },
    {
      id: 'level',
      name: 'Level',
      type: 'enum',
      defaultValue: 'h1',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'display'],
      description: 'Heading level',
    },
    {
      id: 'align',
      name: 'Alignment',
      type: 'enum',
      defaultValue: 'left',
      options: ['left', 'center', 'right'],
      description: 'Text alignment',
    },
  ],

  variants: [
    { id: 'h1', name: 'H1', propertyValues: { level: 'h1' }, unoClasses: ['text-4xl', 'md:text-5xl', 'font-bold'] },
    { id: 'h2', name: 'H2', propertyValues: { level: 'h2' }, unoClasses: ['text-3xl', 'md:text-4xl', 'font-bold'] },
    { id: 'h3', name: 'H3', propertyValues: { level: 'h3' }, unoClasses: ['text-2xl', 'md:text-3xl', 'font-semibold'] },
    { id: 'h4', name: 'H4', propertyValues: { level: 'h4' }, unoClasses: ['text-xl', 'md:text-2xl', 'font-semibold'] },
    { id: 'h5', name: 'H5', propertyValues: { level: 'h5' }, unoClasses: ['text-lg', 'font-medium'] },
    { id: 'h6', name: 'H6', propertyValues: { level: 'h6' }, unoClasses: ['text-base', 'font-medium'] },
    { id: 'display', name: 'Display', propertyValues: { level: 'display' }, unoClasses: ['text-5xl', 'md:text-7xl', 'font-black'] },
  ],

  slots: [],

  structure: {
    type: 'TEXT',
    name: 'Heading',
    properties: {
      characters: 'Heading',
      fills: [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.07, a: 1 }, visible: true, opacity: 1 }],
      fontFamily: 'Inter',
      fontWeight: 700,
      fontSize: 36,
      textAlignHorizontal: 'LEFT',
      textAutoResize: 'WIDTH_AND_HEIGHT',
    },
    propertyBindings: [
      { propertyId: 'text', targetPath: ['characters'] },
    ],
    unoClasses: ['text-4xl', 'font-bold', 'text-gray-900'],
  },

  unoClasses: ['font-bold', 'text-gray-900'],

  defaultSize: { width: 200, height: 44 },
});

/**
 * Text Component
 * Body text and paragraphs.
 */
export const textComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-text',
  name: 'Text',
  category: 'typography',
  description: 'Body text and paragraphs',
  tags: ['text', 'paragraph', 'body', 'content', 'prose'],
  icon: 'lucide:text',

  properties: [
    {
      id: 'text',
      name: 'Text',
      type: 'text',
      defaultValue: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      description: 'Text content',
    },
    {
      id: 'size',
      name: 'Size',
      type: 'enum',
      defaultValue: 'base',
      options: ['xs', 'sm', 'base', 'lg', 'xl'],
      description: 'Text size',
    },
    {
      id: 'weight',
      name: 'Weight',
      type: 'enum',
      defaultValue: 'normal',
      options: ['normal', 'medium', 'semibold', 'bold'],
      description: 'Font weight',
    },
    {
      id: 'color',
      name: 'Color',
      type: 'enum',
      defaultValue: 'default',
      options: ['default', 'muted', 'primary', 'success', 'warning', 'error'],
      description: 'Text color',
    },
    {
      id: 'align',
      name: 'Alignment',
      type: 'enum',
      defaultValue: 'left',
      options: ['left', 'center', 'right', 'justify'],
      description: 'Text alignment',
    },
  ],

  variants: [
    { id: 'xs', name: 'Extra Small', propertyValues: { size: 'xs' }, unoClasses: ['text-xs'] },
    { id: 'sm', name: 'Small', propertyValues: { size: 'sm' }, unoClasses: ['text-sm'] },
    { id: 'base', name: 'Base', propertyValues: { size: 'base' }, unoClasses: ['text-base'] },
    { id: 'lg', name: 'Large', propertyValues: { size: 'lg' }, unoClasses: ['text-lg'] },
    { id: 'xl', name: 'Extra Large', propertyValues: { size: 'xl' }, unoClasses: ['text-xl'] },
  ],

  slots: [],

  structure: {
    type: 'TEXT',
    name: 'Text',
    properties: {
      characters: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }],
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 16,
      lineHeight: 1.5,
      textAlignHorizontal: 'LEFT',
      textAutoResize: 'WIDTH_AND_HEIGHT',
    },
    propertyBindings: [
      { propertyId: 'text', targetPath: ['characters'] },
    ],
    unoClasses: ['text-base', 'text-gray-600', 'leading-relaxed'],
  },

  unoClasses: ['text-gray-600', 'leading-relaxed'],

  defaultSize: { width: 400, height: 24 },
});

// Import all components for export
import { richTextComponent } from './rich-text';
import { linkComponent } from './link';
import { labelComponent } from './label';
import { listComponent } from './list';
import { blockquoteComponent } from './blockquote';
import { codeComponent } from './code';
import { kbdComponent } from './kbd';
import { highlightComponent } from './highlight';

/**
 * Get all typography components
 */
export function getTypographyComponents(): LibraryComponent[] {
  return [
    headingComponent,
    textComponent,
    richTextComponent,
    linkComponent,
    labelComponent,
    listComponent,
    blockquoteComponent,
    codeComponent,
    kbdComponent,
    highlightComponent,
  ];
}
