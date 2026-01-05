/**
 * AspectRatio Component
 * Container that maintains aspect ratio.
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

export const aspectRatioComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-aspect-ratio',
  name: 'Aspect Ratio',
  category: 'layout',
  description: 'Container that maintains aspect ratio',
  tags: ['aspect', 'ratio', 'image', 'video', 'responsive', '16:9', '4:3', 'square'],
  icon: 'lucide:maximize-2',

  properties: [
    {
      id: 'ratio',
      name: 'Ratio',
      type: 'enum',
      defaultValue: '16:9',
      options: ['1:1', '4:3', '16:9', '21:9', '3:4', '9:16'],
      description: 'Aspect ratio',
    },
  ],

  variants: [
    { id: 'square', name: 'Square (1:1)', propertyValues: { ratio: '1:1' }, unoClasses: ['aspect-square'] },
    { id: 'video', name: 'Video (16:9)', propertyValues: { ratio: '16:9' }, unoClasses: ['aspect-video'] },
    { id: 'photo', name: 'Photo (4:3)', propertyValues: { ratio: '4:3' }, unoClasses: ['aspect-4/3'] },
    { id: 'portrait', name: 'Portrait (3:4)', propertyValues: { ratio: '3:4' }, unoClasses: ['aspect-3/4'] },
  ],

  slots: [
    {
      id: 'content',
      name: 'Content',
      allowMultiple: false,
      placeholder: 'Content',
    },
  ],

  structure: {
    type: 'FRAME',
    name: 'AspectRatio',
    properties: {
      fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true, opacity: 1 }],
      constraintProportions: true,
      aspectRatio: 1.778,
    },
    children: [],
    slotId: 'content',
    unoClasses: ['relative', 'aspect-video', 'overflow-hidden'],
  },

  unoClasses: ['relative', 'aspect-video', 'overflow-hidden'],

  defaultSize: { width: 320, height: 180 },
});
