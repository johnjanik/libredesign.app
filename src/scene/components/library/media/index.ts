/**
 * Media Components
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

/**
 * Image Component
 * Image display.
 */
export const imageComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-image',
  name: 'Image',
  category: 'media',
  description: 'Image display',
  tags: ['image', 'photo', 'picture', 'media', 'img'],
  icon: 'lucide:image',

  properties: [
    { id: 'alt', name: 'Alt Text', type: 'text', defaultValue: 'Image', description: 'Alternative text' },
    { id: 'fit', name: 'Object Fit', type: 'enum', defaultValue: 'cover', options: ['cover', 'contain', 'fill', 'none'], description: 'Image fitting' },
    { id: 'radius', name: 'Radius', type: 'enum', defaultValue: 'none', options: ['none', 'sm', 'md', 'lg', 'full'], description: 'Corner radius' },
  ],

  variants: [
    { id: 'default', name: 'Default', propertyValues: {}, unoClasses: [] },
    { id: 'rounded', name: 'Rounded', propertyValues: { radius: 'lg' }, unoClasses: ['rounded-lg'] },
    { id: 'circle', name: 'Circle', propertyValues: { radius: 'full' }, unoClasses: ['rounded-full'] },
  ],

  slots: [],

  structure: {
    type: 'FRAME', name: 'Image',
    properties: { fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true, opacity: 1 }], cornerRadius: 0, autoLayoutMode: 'HORIZONTAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' },
    children: [{ type: 'TEXT', name: 'Placeholder', properties: { characters: '🖼️', fontSize: 32 } }],
    unoClasses: ['bg-gray-100', 'flex', 'items-center', 'justify-center'],
  },

  unoClasses: ['bg-gray-100'],
  defaultSize: { width: 300, height: 200 },
});

/**
 * Video Component
 * Video player.
 */
export const videoComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-video',
  name: 'Video',
  category: 'media',
  description: 'Video player',
  tags: ['video', 'player', 'media', 'movie', 'clip'],
  icon: 'lucide:video',

  properties: [
    { id: 'controls', name: 'Controls', type: 'boolean', defaultValue: true, description: 'Show controls' },
    { id: 'autoplay', name: 'Autoplay', type: 'boolean', defaultValue: false, description: 'Auto play' },
    { id: 'loop', name: 'Loop', type: 'boolean', defaultValue: false, description: 'Loop video' },
  ],

  variants: [],
  slots: [],

  structure: {
    type: 'FRAME', name: 'Video',
    properties: { fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }], cornerRadius: 8, autoLayoutMode: 'VERTICAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' },
    children: [
      { type: 'TEXT', name: 'PlayIcon', properties: { characters: '▶️', fontSize: 48 } },
      { type: 'FRAME', name: 'Controls', properties: { fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 0.8 }, visible: true, opacity: 1 }], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 16, autoLayoutPadding: { top: 12, right: 16, bottom: 12, left: 16 }, primaryAxisAlign: 'SPACE_BETWEEN', counterAxisAlign: 'CENTER', primaryAxisSizing: 'FILL', cornerRadius: 0 },
        children: [
          { type: 'TEXT', name: 'Time', properties: { characters: '0:00 / 3:24', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 12 } },
          { type: 'TEXT', name: 'Fullscreen', properties: { characters: '⛶', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], fontSize: 16 } },
        ],
        unoClasses: ['absolute', 'bottom-0', 'left-0', 'right-0', 'flex', 'justify-between', 'items-center', 'px-4', 'py-3', 'bg-black/60'] },
    ],
    unoClasses: ['bg-black', 'rounded-lg', 'relative', 'flex', 'items-center', 'justify-center'],
  },

  unoClasses: ['bg-black', 'rounded-lg', 'relative'],
  defaultSize: { width: 480, height: 270 },
});

/**
 * Audio Component
 * Audio player.
 */
export const audioComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-audio',
  name: 'Audio',
  category: 'media',
  description: 'Audio player',
  tags: ['audio', 'player', 'music', 'sound', 'podcast'],
  icon: 'lucide:music',

  properties: [
    { id: 'title', name: 'Title', type: 'text', defaultValue: 'Audio Track', description: 'Track title' },
    { id: 'controls', name: 'Controls', type: 'boolean', defaultValue: true, description: 'Show controls' },
  ],

  variants: [],
  slots: [],

  structure: {
    type: 'FRAME', name: 'Audio',
    properties: { fills: [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98, a: 1 }, visible: true, opacity: 1 }], strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }], strokeWeight: 1, cornerRadius: 8, autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 12, autoLayoutPadding: { top: 12, right: 16, bottom: 12, left: 16 }, primaryAxisAlign: 'MIN', counterAxisAlign: 'CENTER', primaryAxisSizing: 'FILL' },
    children: [
      { type: 'FRAME', name: 'PlayBtn', properties: { fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }], width: 40, height: 40, cornerRadius: 20, autoLayoutMode: 'HORIZONTAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' }, children: [{ type: 'TEXT', name: 'Icon', properties: { characters: '▶', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], fontSize: 14 } }], unoClasses: ['w-10', 'h-10', 'rounded-full', 'bg-blue-600', 'flex', 'items-center', 'justify-center', 'text-white'] },
      { type: 'FRAME', name: 'Info', properties: { fills: [], autoLayoutMode: 'VERTICAL', autoLayoutGap: 4, layoutGrow: 1 },
        children: [
          { type: 'TEXT', name: 'Title', properties: { characters: 'Audio Track', fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontWeight: 500, fontSize: 14 }, propertyBindings: [{ propertyId: 'title', targetPath: ['characters'] }] },
          { type: 'FRAME', name: 'Progress', properties: { fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true, opacity: 1 }], height: 4, cornerRadius: 2, layoutGrow: 1 }, children: [{ type: 'FRAME', name: 'Fill', properties: { fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }], width: 80, height: 4, cornerRadius: 2 } }], unoClasses: ['w-full', 'h-1', 'bg-gray-200', 'rounded-full'] },
        ],
        unoClasses: ['flex-1', 'flex', 'flex-col', 'gap-1'] },
      { type: 'TEXT', name: 'Duration', properties: { characters: '2:34', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 12 } },
    ],
    unoClasses: ['flex', 'items-center', 'gap-3', 'p-4', 'bg-gray-50', 'border', 'rounded-lg'],
  },

  unoClasses: ['flex', 'items-center', 'gap-3', 'p-4', 'border', 'rounded-lg'],
  defaultSize: { width: 350, height: 64 },
});

/**
 * Carousel Component
 * Image carousel/slider.
 */
export const carouselComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-carousel',
  name: 'Carousel',
  category: 'media',
  description: 'Image carousel/slider',
  tags: ['carousel', 'slider', 'gallery', 'slideshow', 'images'],
  icon: 'lucide:images',

  properties: [
    { id: 'autoplay', name: 'Autoplay', type: 'boolean', defaultValue: false, description: 'Auto advance slides' },
    { id: 'showDots', name: 'Show Dots', type: 'boolean', defaultValue: true, description: 'Show pagination dots' },
    { id: 'showArrows', name: 'Show Arrows', type: 'boolean', defaultValue: true, description: 'Show navigation arrows' },
  ],

  variants: [],
  slots: [{ id: 'slides', name: 'Slides', allowMultiple: true, placeholder: 'Carousel slides' }],

  structure: {
    type: 'FRAME', name: 'Carousel',
    properties: { fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true, opacity: 1 }], cornerRadius: 12, autoLayoutMode: 'VERTICAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER', clipsContent: true },
    children: [
      { type: 'FRAME', name: 'Slide', properties: { fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true, opacity: 1 }], autoLayoutMode: 'HORIZONTAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER', primaryAxisSizing: 'FILL', counterAxisSizing: 'FILL' }, children: [{ type: 'TEXT', name: 'Placeholder', properties: { characters: 'Slide 1', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 24 } }], slotId: 'slides', unoClasses: ['w-full', 'h-full', 'flex', 'items-center', 'justify-center', 'bg-gray-200'] },
      { type: 'FRAME', name: 'PrevArrow', properties: { fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.9 }, visible: true, opacity: 1 }], width: 40, height: 40, cornerRadius: 20, autoLayoutMode: 'HORIZONTAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' }, children: [{ type: 'TEXT', name: 'Icon', properties: { characters: '◀', fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], fontSize: 14 } }], unoClasses: ['absolute', 'left-4', 'top-1/2', '-translate-y-1/2', 'w-10', 'h-10', 'rounded-full', 'bg-white/90', 'flex', 'items-center', 'justify-center', 'shadow', 'cursor-pointer'] },
      { type: 'FRAME', name: 'NextArrow', properties: { fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.9 }, visible: true, opacity: 1 }], width: 40, height: 40, cornerRadius: 20, autoLayoutMode: 'HORIZONTAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' }, children: [{ type: 'TEXT', name: 'Icon', properties: { characters: '▶', fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, visible: true, opacity: 1 }], fontSize: 14 } }], unoClasses: ['absolute', 'right-4', 'top-1/2', '-translate-y-1/2', 'w-10', 'h-10', 'rounded-full', 'bg-white/90', 'flex', 'items-center', 'justify-center', 'shadow', 'cursor-pointer'] },
      { type: 'FRAME', name: 'Dots', properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 8, autoLayoutPadding: { top: 12, right: 0, bottom: 12, left: 0 }, primaryAxisAlign: 'CENTER' },
        children: [
          { type: 'ELLIPSE', name: 'Dot1', properties: { width: 8, height: 8, fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, visible: true, opacity: 1 }] }, unoClasses: ['w-2', 'h-2', 'rounded-full', 'bg-blue-600'] },
          { type: 'ELLIPSE', name: 'Dot2', properties: { width: 8, height: 8, fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true, opacity: 1 }] }, unoClasses: ['w-2', 'h-2', 'rounded-full', 'bg-gray-300'] },
          { type: 'ELLIPSE', name: 'Dot3', properties: { width: 8, height: 8, fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true, opacity: 1 }] }, unoClasses: ['w-2', 'h-2', 'rounded-full', 'bg-gray-300'] },
        ],
        unoClasses: ['absolute', 'bottom-4', 'left-1/2', '-translate-x-1/2', 'flex', 'gap-2'] },
    ],
    unoClasses: ['relative', 'rounded-xl', 'overflow-hidden', 'bg-gray-100'],
  },

  unoClasses: ['relative', 'rounded-xl', 'overflow-hidden'],
  defaultSize: { width: 600, height: 400 },
});

/**
 * Lightbox Component
 * Full-screen image viewer.
 */
export const lightboxComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-lightbox',
  name: 'Lightbox',
  category: 'media',
  description: 'Full-screen image viewer',
  tags: ['lightbox', 'viewer', 'fullscreen', 'zoom', 'gallery'],
  icon: 'lucide:maximize',

  properties: [
    { id: 'showCaption', name: 'Show Caption', type: 'boolean', defaultValue: true, description: 'Show image caption' },
    { id: 'showCounter', name: 'Show Counter', type: 'boolean', defaultValue: true, description: 'Show image counter' },
  ],

  variants: [],
  slots: [],

  structure: {
    type: 'FRAME', name: 'Lightbox',
    properties: { fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 0.95 }, visible: true, opacity: 1 }], autoLayoutMode: 'VERTICAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER', autoLayoutGap: 16, autoLayoutPadding: { top: 48, right: 48, bottom: 48, left: 48 } },
    children: [
      { type: 'TEXT', name: 'Close', properties: { characters: '×', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], fontSize: 32 }, unoClasses: ['absolute', 'top-4', 'right-4', 'text-white', 'text-3xl', 'cursor-pointer'] },
      { type: 'TEXT', name: 'Counter', properties: { characters: '1 / 5', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 14 }, unoClasses: ['absolute', 'top-4', 'left-4', 'text-white', 'text-sm'] },
      { type: 'FRAME', name: 'Image', properties: { fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }], width: 700, height: 400, cornerRadius: 4, autoLayoutMode: 'HORIZONTAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' }, children: [{ type: 'TEXT', name: 'Placeholder', properties: { characters: '🖼️', fontSize: 64 } }], unoClasses: ['bg-gray-800', 'rounded', 'flex', 'items-center', 'justify-center'] },
      { type: 'TEXT', name: 'Caption', properties: { characters: 'Image caption goes here', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.8 }, visible: true, opacity: 1 }], fontFamily: 'Inter', fontSize: 14, textAlignHorizontal: 'CENTER' }, unoClasses: ['text-white/80', 'text-sm', 'text-center'] },
    ],
    unoClasses: ['fixed', 'inset-0', 'bg-black/95', 'flex', 'flex-col', 'items-center', 'justify-center', 'p-12'],
  },

  unoClasses: ['fixed', 'inset-0', 'bg-black/95', 'flex', 'items-center', 'justify-center'],
  defaultSize: { width: 800, height: 600 },
});

/**
 * Gallery Component
 * Image grid gallery.
 */
export const galleryComponent: LibraryComponent = defineLibraryComponent({
  id: 'lib-gallery',
  name: 'Gallery',
  category: 'media',
  description: 'Image grid gallery',
  tags: ['gallery', 'grid', 'images', 'photos', 'collection'],
  icon: 'lucide:layout-grid',

  properties: [
    { id: 'columns', name: 'Columns', type: 'number', defaultValue: 3, min: 2, max: 6, description: 'Grid columns' },
    { id: 'gap', name: 'Gap', type: 'enum', defaultValue: 'md', options: ['sm', 'md', 'lg'], description: 'Grid gap' },
  ],

  variants: [
    { id: 'grid', name: 'Grid', propertyValues: {}, unoClasses: ['grid', 'grid-cols-3'] },
    { id: 'masonry', name: 'Masonry', propertyValues: {}, unoClasses: ['columns-3'] },
  ],

  slots: [{ id: 'images', name: 'Images', allowMultiple: true, placeholder: 'Gallery images' }],

  structure: {
    type: 'FRAME', name: 'Gallery',
    properties: { fills: [], autoLayoutMode: 'HORIZONTAL', autoLayoutGap: 16, primaryAxisAlign: 'MIN', counterAxisAlign: 'MIN', primaryAxisSizing: 'FILL', counterAxisSizing: 'AUTO' },
    children: [
      { type: 'FRAME', name: 'Image1', properties: { fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true, opacity: 1 }], width: 150, height: 150, cornerRadius: 8, autoLayoutMode: 'HORIZONTAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' }, children: [{ type: 'TEXT', name: 'Icon', properties: { characters: '🖼️', fontSize: 24 } }], unoClasses: ['bg-gray-100', 'rounded-lg', 'aspect-square', 'flex', 'items-center', 'justify-center'] },
      { type: 'FRAME', name: 'Image2', properties: { fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true, opacity: 1 }], width: 150, height: 150, cornerRadius: 8, autoLayoutMode: 'HORIZONTAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' }, children: [{ type: 'TEXT', name: 'Icon', properties: { characters: '🖼️', fontSize: 24 } }], unoClasses: ['bg-gray-100', 'rounded-lg', 'aspect-square', 'flex', 'items-center', 'justify-center'] },
      { type: 'FRAME', name: 'Image3', properties: { fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, visible: true, opacity: 1 }], width: 150, height: 150, cornerRadius: 8, autoLayoutMode: 'HORIZONTAL', primaryAxisAlign: 'CENTER', counterAxisAlign: 'CENTER' }, children: [{ type: 'TEXT', name: 'Icon', properties: { characters: '🖼️', fontSize: 24 } }], unoClasses: ['bg-gray-100', 'rounded-lg', 'aspect-square', 'flex', 'items-center', 'justify-center'] },
    ],
    slotId: 'images',
    unoClasses: ['grid', 'grid-cols-3', 'gap-4'],
  },

  unoClasses: ['grid', 'gap-4'],
  defaultSize: { width: 500, height: 180 },
});

/**
 * Get all media components
 */
export function getMediaComponents(): LibraryComponent[] {
  return [
    imageComponent,
    videoComponent,
    audioComponent,
    carouselComponent,
    lightboxComponent,
    galleryComponent,
  ];
}
