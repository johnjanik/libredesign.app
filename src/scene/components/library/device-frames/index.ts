/**
 * Device Frame Components
 *
 * Pre-built device screen templates for designing within standard device dimensions.
 * Based on modern device specifications (2020-2024).
 */

import { defineLibraryComponent, type LibraryComponent } from '../../library-component-registry';

// =============================================================================
// Helper function to create device frame components
// =============================================================================

function createDeviceFrame(
  id: string,
  name: string,
  description: string,
  tags: string[],
  width: number,
  height: number,
  backgroundColor: { r: number; g: number; b: number; a: number } = { r: 1, g: 1, b: 1, a: 1 }
): LibraryComponent {
  return defineLibraryComponent({
    id,
    name,
    category: 'device-frames',
    description,
    tags: ['device', 'frame', 'screen', 'template', ...tags],
    icon: 'lucide:smartphone',

    properties: [
      {
        id: 'backgroundColor',
        name: 'Background',
        type: 'color',
        defaultValue: '#ffffff',
        description: 'Background color of the device screen',
      },
    ],

    variants: [],
    slots: [
      {
        id: 'content',
        name: 'Content',
        allowMultiple: true,
        placeholder: 'Drop content here',
      },
    ],

    structure: {
      type: 'FRAME',
      name,
      properties: {
        width,
        height,
        fills: [{ type: 'SOLID', color: backgroundColor, visible: true, opacity: 1 }],
        clipsContent: true,
      },
      unoClasses: ['relative', 'overflow-hidden'],
    },

    unoClasses: ['relative', 'overflow-hidden'],
    defaultSize: { width, height },
  });
}

// =============================================================================
// iPhone Device Frames (2020-2024)
// =============================================================================

/** iPhone SE (3rd gen) - 375 × 667 @1x */
export const iPhoneSEComponent = createDeviceFrame(
  'device-iphone-se',
  'iPhone SE',
  'iPhone SE 3rd gen (375 × 667)',
  ['iphone', 'se', 'ios', 'apple', 'compact'],
  375,
  667
);

/** iPhone 12/13 mini - 375 × 812 @1x */
export const iPhoneMiniComponent = createDeviceFrame(
  'device-iphone-mini',
  'iPhone mini',
  'iPhone 12/13 mini (375 × 812)',
  ['iphone', 'mini', 'ios', 'apple', 'compact'],
  375,
  812
);

/** iPhone 12/13/14/15 - 390 × 844 @1x */
export const iPhone14Component = createDeviceFrame(
  'device-iphone-14',
  'iPhone 14',
  'iPhone 12/13/14/15 standard (390 × 844)',
  ['iphone', '14', '15', 'ios', 'apple', 'standard'],
  390,
  844
);

/** iPhone 14/15/16 Pro - 393 × 852 @1x */
export const iPhone15ProComponent = createDeviceFrame(
  'device-iphone-15-pro',
  'iPhone 15 Pro',
  'iPhone 14/15/16 Pro (393 × 852)',
  ['iphone', '15', '16', 'pro', 'ios', 'apple'],
  393,
  852
);

/** iPhone 14/15 Plus/Pro Max - 430 × 932 @1x */
export const iPhone15ProMaxComponent = createDeviceFrame(
  'device-iphone-15-pro-max',
  'iPhone 15 Pro Max',
  'iPhone 14/15 Plus/Pro Max (430 × 932)',
  ['iphone', '15', 'pro', 'max', 'plus', 'ios', 'apple', 'large'],
  430,
  932
);

/** iPhone 16 Pro - 402 × 874 @1x */
export const iPhone16ProComponent = createDeviceFrame(
  'device-iphone-16-pro',
  'iPhone 16 Pro',
  'iPhone 16 Pro (402 × 874)',
  ['iphone', '16', 'pro', 'ios', 'apple'],
  402,
  874
);

/** iPhone 16 Pro Max - 440 × 956 @1x */
export const iPhone16ProMaxComponent = createDeviceFrame(
  'device-iphone-16-pro-max',
  'iPhone 16 Pro Max',
  'iPhone 16 Pro Max (440 × 956)',
  ['iphone', '16', 'pro', 'max', 'ios', 'apple', 'large'],
  440,
  956
);

// =============================================================================
// Samsung Galaxy Device Frames
// =============================================================================

/** Samsung Galaxy S23/S24 - 360 × 780 @1x */
export const galaxyS24Component = createDeviceFrame(
  'device-galaxy-s24',
  'Galaxy S24',
  'Samsung Galaxy S23/S24 (360 × 780)',
  ['samsung', 'galaxy', 's24', 's23', 'android'],
  360,
  780
);

/** Samsung Galaxy S24+ - 384 × 824 @1x */
export const galaxyS24PlusComponent = createDeviceFrame(
  'device-galaxy-s24-plus',
  'Galaxy S24+',
  'Samsung Galaxy S24+ (384 × 824)',
  ['samsung', 'galaxy', 's24', 'plus', 'android', 'large'],
  384,
  824
);

/** Samsung Galaxy S24 Ultra - 412 × 892 @1x */
export const galaxyS24UltraComponent = createDeviceFrame(
  'device-galaxy-s24-ultra',
  'Galaxy S24 Ultra',
  'Samsung Galaxy S24 Ultra (412 × 892)',
  ['samsung', 'galaxy', 's24', 'ultra', 'android', 'large'],
  412,
  892
);

/** Samsung Galaxy Z Fold (Cover) - 375 × 720 @1x */
export const galaxyZFoldCoverComponent = createDeviceFrame(
  'device-galaxy-z-fold-cover',
  'Galaxy Z Fold (Cover)',
  'Galaxy Z Fold 5 cover screen (375 × 720)',
  ['samsung', 'galaxy', 'fold', 'foldable', 'cover', 'android'],
  375,
  720
);

/** Samsung Galaxy Z Fold (Main) - 884 × 906 @1x */
export const galaxyZFoldMainComponent = createDeviceFrame(
  'device-galaxy-z-fold-main',
  'Galaxy Z Fold (Unfolded)',
  'Galaxy Z Fold 5 main screen (884 × 906)',
  ['samsung', 'galaxy', 'fold', 'foldable', 'main', 'tablet', 'android'],
  884,
  906
);

/** Samsung Galaxy Z Flip - 412 × 919 @1x */
export const galaxyZFlipComponent = createDeviceFrame(
  'device-galaxy-z-flip',
  'Galaxy Z Flip',
  'Galaxy Z Flip 5 (412 × 919)',
  ['samsung', 'galaxy', 'flip', 'foldable', 'android'],
  412,
  919
);

// =============================================================================
// Google Pixel Device Frames
// =============================================================================

/** Google Pixel 8 - 412 × 915 @1x */
export const pixel8Component = createDeviceFrame(
  'device-pixel-8',
  'Pixel 8',
  'Google Pixel 8 (412 × 915)',
  ['google', 'pixel', '8', 'android'],
  412,
  915
);

/** Google Pixel 8 Pro - 412 × 892 @1x */
export const pixel8ProComponent = createDeviceFrame(
  'device-pixel-8-pro',
  'Pixel 8 Pro',
  'Google Pixel 8 Pro (412 × 892)',
  ['google', 'pixel', '8', 'pro', 'android'],
  412,
  892
);

/** Google Pixel Fold (Cover) - 360 × 748 @1x */
export const pixelFoldCoverComponent = createDeviceFrame(
  'device-pixel-fold-cover',
  'Pixel Fold (Cover)',
  'Google Pixel Fold cover screen (360 × 748)',
  ['google', 'pixel', 'fold', 'foldable', 'cover', 'android'],
  360,
  748
);

/** Google Pixel Fold (Main) - 920 × 767 @1x */
export const pixelFoldMainComponent = createDeviceFrame(
  'device-pixel-fold-main',
  'Pixel Fold (Unfolded)',
  'Google Pixel Fold main screen (920 × 767)',
  ['google', 'pixel', 'fold', 'foldable', 'main', 'tablet', 'android'],
  920,
  767
);

// =============================================================================
// Other Android Device Frames
// =============================================================================

/** OnePlus 12 - 412 × 919 @1x */
export const onePlus12Component = createDeviceFrame(
  'device-oneplus-12',
  'OnePlus 12',
  'OnePlus 12 (412 × 919)',
  ['oneplus', '12', 'android'],
  412,
  919
);

/** Xiaomi 14 - 400 × 889 @1x */
export const xiaomi14Component = createDeviceFrame(
  'device-xiaomi-14',
  'Xiaomi 14',
  'Xiaomi 14 (400 × 889)',
  ['xiaomi', '14', 'android'],
  400,
  889
);

/** Sony Xperia 1 V - 411 × 960 @1x (21:9) */
export const xperia1VComponent = createDeviceFrame(
  'device-xperia-1v',
  'Xperia 1 V',
  'Sony Xperia 1 V 21:9 (411 × 960)',
  ['sony', 'xperia', 'android', '21:9', 'cinematic'],
  411,
  960
);

// =============================================================================
// Generic & Responsive Frames
// =============================================================================

/** Generic Mobile Small - 320 × 568 */
export const mobileSmallComponent = createDeviceFrame(
  'device-mobile-small',
  'Mobile Small',
  'Generic small mobile (320 × 568)',
  ['mobile', 'small', 'compact', 'responsive'],
  320,
  568
);

/** Generic Mobile - 375 × 667 */
export const mobileComponent = createDeviceFrame(
  'device-mobile',
  'Mobile',
  'Generic mobile (375 × 667)',
  ['mobile', 'standard', 'responsive'],
  375,
  667
);

/** Generic Mobile Large - 414 × 896 */
export const mobileLargeComponent = createDeviceFrame(
  'device-mobile-large',
  'Mobile Large',
  'Generic large mobile (414 × 896)',
  ['mobile', 'large', 'plus', 'max', 'responsive'],
  414,
  896
);

/** Tablet Portrait - 768 × 1024 */
export const tabletPortraitComponent = createDeviceFrame(
  'device-tablet-portrait',
  'Tablet Portrait',
  'Tablet portrait mode (768 × 1024)',
  ['tablet', 'ipad', 'portrait', 'responsive'],
  768,
  1024
);

/** Tablet Landscape - 1024 × 768 */
export const tabletLandscapeComponent = createDeviceFrame(
  'device-tablet-landscape',
  'Tablet Landscape',
  'Tablet landscape mode (1024 × 768)',
  ['tablet', 'ipad', 'landscape', 'responsive'],
  1024,
  768
);

/** iPad Pro 11" - 834 × 1194 */
export const iPadPro11Component = createDeviceFrame(
  'device-ipad-pro-11',
  'iPad Pro 11"',
  'iPad Pro 11 inch (834 × 1194)',
  ['ipad', 'pro', 'tablet', 'ios', 'apple'],
  834,
  1194
);

/** iPad Pro 12.9" - 1024 × 1366 */
export const iPadPro129Component = createDeviceFrame(
  'device-ipad-pro-129',
  'iPad Pro 12.9"',
  'iPad Pro 12.9 inch (1024 × 1366)',
  ['ipad', 'pro', 'tablet', 'ios', 'apple', 'large'],
  1024,
  1366
);

/** Desktop - 1440 × 900 */
export const desktopComponent = createDeviceFrame(
  'device-desktop',
  'Desktop',
  'Desktop screen (1440 × 900)',
  ['desktop', 'laptop', 'web', 'responsive'],
  1440,
  900
);

/** Desktop HD - 1920 × 1080 */
export const desktopHDComponent = createDeviceFrame(
  'device-desktop-hd',
  'Desktop HD',
  'Desktop HD 1080p (1920 × 1080)',
  ['desktop', 'hd', '1080p', 'web', 'responsive'],
  1920,
  1080
);

// =============================================================================
// Export all device frame components
// =============================================================================

export function getDeviceFramesComponents(): LibraryComponent[] {
  return [
    // iPhones
    iPhoneSEComponent,
    iPhoneMiniComponent,
    iPhone14Component,
    iPhone15ProComponent,
    iPhone15ProMaxComponent,
    iPhone16ProComponent,
    iPhone16ProMaxComponent,

    // Samsung Galaxy
    galaxyS24Component,
    galaxyS24PlusComponent,
    galaxyS24UltraComponent,
    galaxyZFoldCoverComponent,
    galaxyZFoldMainComponent,
    galaxyZFlipComponent,

    // Google Pixel
    pixel8Component,
    pixel8ProComponent,
    pixelFoldCoverComponent,
    pixelFoldMainComponent,

    // Other Android
    onePlus12Component,
    xiaomi14Component,
    xperia1VComponent,

    // Generic & Responsive
    mobileSmallComponent,
    mobileComponent,
    mobileLargeComponent,
    tabletPortraitComponent,
    tabletLandscapeComponent,
    iPadPro11Component,
    iPadPro129Component,
    desktopComponent,
    desktopHDComponent,
  ];
}
