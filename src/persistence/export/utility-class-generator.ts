/**
 * Utility Class Generator
 *
 * Converts DesignLibre node properties to Tailwind/UnoCSS utility classes.
 * This enables "design is code" - the exact classes that style the export.
 */

import type { NodeData, FrameNodeData, TextNodeData, SceneNodeData } from '@scene/nodes/base-node';
import type { RGBA } from '@core/types/color';
import type { Paint, SolidPaint, GradientPaint } from '@core/types/paint';
import type { Effect, DropShadowEffect, BlurEffect } from '@core/types/effect';
import type { AutoLayoutProps } from '@core/types/common';

/**
 * Options for utility class generation
 */
export interface UtilityClassOptions {
  /** Include position classes (absolute positioning) */
  includePosition?: boolean;
  /** Include dimension classes (w-*, h-*) */
  includeDimensions?: boolean;
  /** Use arbitrary values [123px] vs closest scale value */
  useArbitraryValues?: boolean;
  /** Prefix for classes (e.g., 'tw-' for Tailwind prefix) */
  classPrefix?: string;
  /** Include responsive variants */
  includeResponsive?: boolean;
}

const DEFAULT_OPTIONS: UtilityClassOptions = {
  includePosition: true,
  includeDimensions: true,
  useArbitraryValues: true,
  classPrefix: '',
  includeResponsive: false,
};

/**
 * Spacing scale for mapping pixel values to utility classes
 */
const SPACING_SCALE: Record<number, string> = {
  0: '0',
  1: 'px',
  2: '0.5',
  4: '1',
  6: '1.5',
  8: '2',
  10: '2.5',
  12: '3',
  14: '3.5',
  16: '4',
  20: '5',
  24: '6',
  28: '7',
  32: '8',
  36: '9',
  40: '10',
  44: '11',
  48: '12',
  56: '14',
  64: '16',
  80: '20',
  96: '24',
  112: '28',
  128: '32',
  144: '36',
  160: '40',
  176: '44',
  192: '48',
  208: '52',
  224: '56',
  240: '60',
  256: '64',
  288: '72',
  320: '80',
  384: '96',
};

/**
 * Border radius scale
 */
const RADIUS_SCALE: Record<number, string> = {
  0: 'none',
  2: 'sm',
  4: 'DEFAULT',
  6: 'md',
  8: 'lg',
  12: 'xl',
  16: '2xl',
  24: '3xl',
  9999: 'full',
};

/**
 * Font size scale (in px)
 */
const FONT_SIZE_SCALE: Record<number, string> = {
  10: 'xs',
  11: 'xs',
  12: 'sm',
  13: 'sm',
  14: 'base',
  16: 'lg',
  18: 'xl',
  20: '2xl',
  24: '3xl',
  30: '4xl',
  36: '5xl',
  48: '6xl',
  60: '7xl',
  72: '8xl',
  96: '9xl',
};

/**
 * Font weight scale
 */
const FONT_WEIGHT_SCALE: Record<number, string> = {
  100: 'thin',
  200: 'extralight',
  300: 'light',
  400: 'normal',
  500: 'medium',
  600: 'semibold',
  700: 'bold',
  800: 'extrabold',
  900: 'black',
};

/**
 * Opacity scale
 */
const OPACITY_SCALE: Record<number, string> = {
  0: '0',
  5: '5',
  10: '10',
  20: '20',
  25: '25',
  30: '30',
  40: '40',
  50: '50',
  60: '60',
  70: '70',
  75: '75',
  80: '80',
  90: '90',
  95: '95',
  100: '100',
};

/**
 * Shadow scale based on blur radius
 */
const SHADOW_SCALE: Record<number, string> = {
  0: 'none',
  2: 'sm',
  3: 'DEFAULT',
  6: 'md',
  15: 'lg',
  25: 'xl',
  50: '2xl',
};

/**
 * Convert RGBA color to hex string
 */
function rgbaToHex(color: RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Find the closest value in a scale
 */
function findClosestScale(value: number, scale: Record<number, string>): string | null {
  const keys = Object.keys(scale).map(Number).sort((a, b) => a - b);

  // Exact match
  if (scale[value] !== undefined) {
    return scale[value]!;
  }

  // Find closest
  let closest = keys[0]!;
  let minDiff = Math.abs(value - closest);

  for (const key of keys) {
    const diff = Math.abs(value - key);
    if (diff < minDiff) {
      minDiff = diff;
      closest = key;
    }
  }

  // Only use scale value if within 2px tolerance
  if (minDiff <= 2) {
    return scale[closest]!;
  }

  return null;
}

/**
 * Generate spacing class (p-*, m-*, gap-*, w-*, h-*)
 */
function getSpacingClass(prefix: string, value: number, useArbitrary: boolean): string {
  const scaleValue = findClosestScale(Math.round(value), SPACING_SCALE);
  if (scaleValue !== null) {
    return `${prefix}-${scaleValue}`;
  }
  if (useArbitrary) {
    return `${prefix}-[${Math.round(value)}px]`;
  }
  return '';
}

/**
 * Generate color class from RGBA
 */
function getColorClass(prefix: string, color: RGBA, useArbitrary: boolean): string {
  const hex = rgbaToHex(color);

  // Check for common colors
  const commonColors: Record<string, string> = {
    '#ffffff': 'white',
    '#000000': 'black',
    '#f8fafc': 'slate-50',
    '#f1f5f9': 'slate-100',
    '#e2e8f0': 'slate-200',
    '#cbd5e1': 'slate-300',
    '#94a3b8': 'slate-400',
    '#64748b': 'slate-500',
    '#475569': 'slate-600',
    '#334155': 'slate-700',
    '#1e293b': 'slate-800',
    '#0f172a': 'slate-900',
    '#fafafa': 'neutral-50',
    '#f5f5f5': 'neutral-100',
    '#e5e5e5': 'neutral-200',
    '#d4d4d4': 'neutral-300',
    '#a3a3a3': 'neutral-400',
    '#737373': 'neutral-500',
    '#525252': 'neutral-600',
    '#404040': 'neutral-700',
    '#262626': 'neutral-800',
    '#171717': 'neutral-900',
    '#ef4444': 'red-500',
    '#f97316': 'orange-500',
    '#eab308': 'yellow-500',
    '#22c55e': 'green-500',
    '#3b82f6': 'blue-500',
    '#6366f1': 'indigo-500',
    '#8b5cf6': 'violet-500',
    '#a855f7': 'purple-500',
    '#ec4899': 'pink-500',
  };

  const colorName = commonColors[hex.toLowerCase()];
  if (colorName) {
    const opacityClass = color.a < 1 ? `/${Math.round(color.a * 100)}` : '';
    return `${prefix}-${colorName}${opacityClass}`;
  }

  if (useArbitrary) {
    if (color.a < 1) {
      const alpha = Math.round(color.a * 100);
      return `${prefix}-[${hex}/${alpha}]`;
    }
    return `${prefix}-[${hex}]`;
  }

  return '';
}

/**
 * Generate classes from fills
 */
function getFillClasses(fills: readonly Paint[], useArbitrary: boolean): string[] {
  const classes: string[] = [];

  if (fills.length === 0) {
    return classes;
  }

  // Use first visible fill
  const visibleFill = fills.find(f => f.visible !== false);
  if (!visibleFill) {
    return classes;
  }

  if (visibleFill.type === 'SOLID') {
    const solid = visibleFill as SolidPaint;
    const colorClass = getColorClass('bg', solid.color, useArbitrary);
    if (colorClass) {
      classes.push(colorClass);
    }
    if (solid.opacity !== undefined && solid.opacity < 1) {
      const opacityPercent = Math.round(solid.opacity * 100);
      const opacityClass = findClosestScale(opacityPercent, OPACITY_SCALE);
      if (opacityClass) {
        classes.push(`bg-opacity-${opacityClass}`);
      }
    }
  } else if (visibleFill.type === 'GRADIENT_LINEAR') {
    const gradient = visibleFill as GradientPaint;
    if (gradient.gradientStops && gradient.gradientStops.length >= 2) {
      // Simplified gradient - from/to colors
      const fromColor = gradient.gradientStops[0]!.color;
      const toColor = gradient.gradientStops[gradient.gradientStops.length - 1]!.color;
      classes.push('bg-gradient-to-r');
      const fromClass = getColorClass('from', fromColor, useArbitrary);
      const toClass = getColorClass('to', toColor, useArbitrary);
      if (fromClass) classes.push(fromClass);
      if (toClass) classes.push(toClass);
    }
  }

  return classes;
}

/**
 * Generate classes from strokes
 */
function getStrokeClasses(
  strokes: readonly Paint[],
  strokeWeight: number,
  useArbitrary: boolean
): string[] {
  const classes: string[] = [];

  if (strokes.length === 0 || strokeWeight === 0) {
    return classes;
  }

  // Add border width
  if (strokeWeight === 1) {
    classes.push('border');
  } else if (strokeWeight === 2) {
    classes.push('border-2');
  } else if (strokeWeight === 4) {
    classes.push('border-4');
  } else if (strokeWeight === 8) {
    classes.push('border-8');
  } else if (useArbitrary) {
    classes.push(`border-[${strokeWeight}px]`);
  } else {
    classes.push('border');
  }

  // Use first visible stroke for color
  const visibleStroke = strokes.find(s => s.visible !== false);
  if (visibleStroke && visibleStroke.type === 'SOLID') {
    const solid = visibleStroke as SolidPaint;
    const colorClass = getColorClass('border', solid.color, useArbitrary);
    if (colorClass) {
      classes.push(colorClass);
    }
  }

  return classes;
}

/**
 * Generate classes from effects
 */
function getEffectClasses(effects: readonly Effect[], useArbitrary: boolean): string[] {
  const classes: string[] = [];

  for (const effect of effects) {
    if (effect.visible === false) continue;

    if (effect.type === 'DROP_SHADOW') {
      const shadow = effect as DropShadowEffect;
      const blurRadius = shadow.radius ?? 0;
      const shadowClass = findClosestScale(blurRadius, SHADOW_SCALE);
      if (shadowClass === 'DEFAULT') {
        classes.push('shadow');
      } else if (shadowClass) {
        classes.push(`shadow-${shadowClass}`);
      } else if (useArbitrary) {
        const x = shadow.offset?.x ?? 0;
        const y = shadow.offset?.y ?? 0;
        const spread = shadow.spread ?? 0;
        const color = shadow.color ? rgbaToHex(shadow.color) : '#000';
        const alpha = shadow.color?.a ?? 0.25;
        classes.push(`shadow-[${x}px_${y}px_${blurRadius}px_${spread}px_${color}${Math.round(alpha * 100)}]`);
      }
    } else if (effect.type === 'INNER_SHADOW') {
      classes.push('shadow-inner');
    } else if (effect.type === 'BLUR') {
      const blur = effect as BlurEffect;
      const radius = blur.radius ?? 0;
      if (radius <= 4) {
        classes.push('blur-sm');
      } else if (radius <= 8) {
        classes.push('blur');
      } else if (radius <= 12) {
        classes.push('blur-md');
      } else if (radius <= 16) {
        classes.push('blur-lg');
      } else if (radius <= 24) {
        classes.push('blur-xl');
      } else if (radius <= 40) {
        classes.push('blur-2xl');
      } else {
        classes.push('blur-3xl');
      }
    } else if (effect.type === 'BACKGROUND_BLUR') {
      classes.push('backdrop-blur');
    }
  }

  return classes;
}

/**
 * Generate classes from auto layout
 */
function getAutoLayoutClasses(autoLayout: AutoLayoutProps, useArbitrary: boolean): string[] {
  const classes: string[] = [];

  if (autoLayout.mode === 'NONE') {
    return classes;
  }

  // Flex direction
  if (autoLayout.mode === 'HORIZONTAL') {
    classes.push('flex', 'flex-row');
  } else if (autoLayout.mode === 'VERTICAL') {
    classes.push('flex', 'flex-col');
  }

  // Wrap
  if (autoLayout.wrap) {
    classes.push('flex-wrap');
  }

  // Gap
  if (autoLayout.itemSpacing > 0) {
    const gapClass = getSpacingClass('gap', autoLayout.itemSpacing, useArbitrary);
    if (gapClass) {
      classes.push(gapClass);
    }
  }

  // Padding
  const pt = autoLayout.paddingTop ?? 0;
  const pr = autoLayout.paddingRight ?? 0;
  const pb = autoLayout.paddingBottom ?? 0;
  const pl = autoLayout.paddingLeft ?? 0;

  if (pt === pr && pr === pb && pb === pl && pt > 0) {
    // All same - use p-*
    const paddingClass = getSpacingClass('p', pt, useArbitrary);
    if (paddingClass) {
      classes.push(paddingClass);
    }
  } else {
    // Individual paddings
    if (pt === pb && pt > 0) {
      const pyClass = getSpacingClass('py', pt, useArbitrary);
      if (pyClass) classes.push(pyClass);
    } else {
      if (pt > 0) {
        const ptClass = getSpacingClass('pt', pt, useArbitrary);
        if (ptClass) classes.push(ptClass);
      }
      if (pb > 0) {
        const pbClass = getSpacingClass('pb', pb, useArbitrary);
        if (pbClass) classes.push(pbClass);
      }
    }

    if (pr === pl && pr > 0) {
      const pxClass = getSpacingClass('px', pr, useArbitrary);
      if (pxClass) classes.push(pxClass);
    } else {
      if (pr > 0) {
        const prClass = getSpacingClass('pr', pr, useArbitrary);
        if (prClass) classes.push(prClass);
      }
      if (pl > 0) {
        const plClass = getSpacingClass('pl', pl, useArbitrary);
        if (plClass) classes.push(plClass);
      }
    }
  }

  // Primary axis alignment (justify-content)
  switch (autoLayout.primaryAxisAlignItems) {
    case 'MIN':
      classes.push('justify-start');
      break;
    case 'CENTER':
      classes.push('justify-center');
      break;
    case 'MAX':
      classes.push('justify-end');
      break;
    case 'SPACE_BETWEEN':
      classes.push('justify-between');
      break;
  }

  // Counter axis alignment (align-items)
  switch (autoLayout.counterAxisAlignItems) {
    case 'MIN':
      classes.push('items-start');
      break;
    case 'CENTER':
      classes.push('items-center');
      break;
    case 'MAX':
      classes.push('items-end');
      break;
    case 'BASELINE':
      classes.push('items-baseline');
      break;
  }

  return classes;
}

/**
 * Generate classes from text properties
 */
function getTextClasses(node: TextNodeData, useArbitrary: boolean): string[] {
  const classes: string[] = [];

  // Get first text style (primary style)
  const style = node.textStyles && node.textStyles.length > 0 ? node.textStyles[0] : null;

  if (!style) {
    return classes;
  }

  // Font size
  if (style.fontSize) {
    const sizeClass = findClosestScale(style.fontSize, FONT_SIZE_SCALE);
    if (sizeClass) {
      classes.push(`text-${sizeClass}`);
    } else if (useArbitrary) {
      classes.push(`text-[${style.fontSize}px]`);
    }
  }

  // Font weight
  if (style.fontWeight) {
    const weightClass = FONT_WEIGHT_SCALE[style.fontWeight];
    if (weightClass) {
      classes.push(`font-${weightClass}`);
    }
  }

  // Font family
  if (style.fontFamily) {
    const family = style.fontFamily.toLowerCase();
    if (family.includes('mono') || family.includes('code') || family.includes('consolas')) {
      classes.push('font-mono');
    } else if (family.includes('serif') && !family.includes('sans')) {
      classes.push('font-serif');
    }
    // Default is sans, no class needed
  }

  // Text alignment
  switch (node.textAlignHorizontal) {
    case 'LEFT':
      classes.push('text-left');
      break;
    case 'CENTER':
      classes.push('text-center');
      break;
    case 'RIGHT':
      classes.push('text-right');
      break;
    case 'JUSTIFIED':
      classes.push('text-justify');
      break;
  }

  // Line height
  if (style.lineHeight && style.lineHeight !== 'AUTO' && style.fontSize) {
    // Convert to ratio if it's a pixel value
    const ratio = style.fontSize ? style.lineHeight / style.fontSize : 1.5;
    if (ratio <= 1) {
      classes.push('leading-none');
    } else if (ratio <= 1.25) {
      classes.push('leading-tight');
    } else if (ratio <= 1.375) {
      classes.push('leading-snug');
    } else if (ratio <= 1.5) {
      classes.push('leading-normal');
    } else if (ratio <= 1.625) {
      classes.push('leading-relaxed');
    } else {
      classes.push('leading-loose');
    }
  }

  // Letter spacing
  if (style.letterSpacing) {
    if (style.letterSpacing < -0.025) {
      classes.push('tracking-tighter');
    } else if (style.letterSpacing < 0) {
      classes.push('tracking-tight');
    } else if (style.letterSpacing > 0.05) {
      classes.push('tracking-widest');
    } else if (style.letterSpacing > 0.025) {
      classes.push('tracking-wider');
    } else if (style.letterSpacing > 0) {
      classes.push('tracking-wide');
    }
  }

  // Text decoration
  if (style.textDecoration === 'UNDERLINE') {
    classes.push('underline');
  } else if (style.textDecoration === 'STRIKETHROUGH') {
    classes.push('line-through');
  }

  return classes;
}

/**
 * Generate classes from corner radius
 */
function getRadiusClasses(
  cornerRadius: number | undefined,
  useArbitrary: boolean
): string[] {
  const classes: string[] = [];

  // Uniform radius
  if (cornerRadius !== undefined && cornerRadius > 0) {
    const radiusClass = findClosestScale(cornerRadius, RADIUS_SCALE);
    if (radiusClass === 'DEFAULT') {
      classes.push('rounded');
    } else if (radiusClass) {
      classes.push(`rounded-${radiusClass}`);
    } else if (useArbitrary) {
      classes.push(`rounded-[${cornerRadius}px]`);
    }
  }

  return classes;
}

/**
 * Convert a node to utility classes
 */
export function nodeToUtilityClasses(
  node: NodeData,
  options: UtilityClassOptions = {}
): string[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const classes: string[] = [];
  const useArb = opts.useArbitraryValues ?? true;

  // Skip non-visual nodes
  if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
    return classes;
  }

  // Get scene node properties
  const sceneNode = node as SceneNodeData;

  // Dimensions
  if (opts.includeDimensions) {
    if ('width' in sceneNode && sceneNode.width !== undefined) {
      const widthClass = getSpacingClass('w', sceneNode.width, useArb);
      if (widthClass) classes.push(widthClass);
    }
    if ('height' in sceneNode && sceneNode.height !== undefined) {
      const heightClass = getSpacingClass('h', sceneNode.height, useArb);
      if (heightClass) classes.push(heightClass);
    }
  }

  // Opacity
  if (sceneNode.opacity !== undefined && sceneNode.opacity < 1) {
    const opacityPercent = Math.round(sceneNode.opacity * 100);
    const opacityClass = findClosestScale(opacityPercent, OPACITY_SCALE);
    if (opacityClass) {
      classes.push(`opacity-${opacityClass}`);
    } else if (useArb) {
      classes.push(`opacity-[${opacityPercent}%]`);
    }
  }

  // Fills
  if ('fills' in sceneNode && sceneNode.fills) {
    classes.push(...getFillClasses(sceneNode.fills, useArb));
  }

  // Strokes
  if ('strokes' in sceneNode && sceneNode.strokes && 'strokeWeight' in sceneNode) {
    classes.push(...getStrokeClasses(sceneNode.strokes, sceneNode.strokeWeight ?? 0, useArb));
  }

  // Effects
  if ('effects' in sceneNode && sceneNode.effects) {
    classes.push(...getEffectClasses(sceneNode.effects, useArb));
  }

  // Corner radius (for frames)
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const frameNode = node as FrameNodeData;
    classes.push(...getRadiusClasses(frameNode.cornerRadius, useArb));

    // Auto layout
    if (frameNode.autoLayout) {
      classes.push(...getAutoLayoutClasses(frameNode.autoLayout, useArb));
    }

    // Clips content
    if (frameNode.clipsContent) {
      classes.push('overflow-hidden');
    }
  }

  // Text-specific classes
  if (node.type === 'TEXT') {
    const textNode = node as TextNodeData;
    classes.push(...getTextClasses(textNode, useArb));

    // Text color from fills
    if (textNode.fills && textNode.fills.length > 0) {
      const visibleFill = textNode.fills.find(f => f.visible !== false);
      if (visibleFill && visibleFill.type === 'SOLID') {
        const solid = visibleFill as SolidPaint;
        const colorClass = getColorClass('text', solid.color, useArb);
        if (colorClass) {
          classes.push(colorClass);
        }
      }
    }
  }

  // Blend mode (rarely used, but available)
  if (sceneNode.blendMode && sceneNode.blendMode !== 'PASS_THROUGH' && sceneNode.blendMode !== 'NORMAL') {
    const blendModeMap: Record<string, string> = {
      'MULTIPLY': 'mix-blend-multiply',
      'SCREEN': 'mix-blend-screen',
      'OVERLAY': 'mix-blend-overlay',
      'DARKEN': 'mix-blend-darken',
      'LIGHTEN': 'mix-blend-lighten',
      'COLOR_DODGE': 'mix-blend-color-dodge',
      'COLOR_BURN': 'mix-blend-color-burn',
      'HARD_LIGHT': 'mix-blend-hard-light',
      'SOFT_LIGHT': 'mix-blend-soft-light',
      'DIFFERENCE': 'mix-blend-difference',
      'EXCLUSION': 'mix-blend-exclusion',
      'HUE': 'mix-blend-hue',
      'SATURATION': 'mix-blend-saturation',
      'COLOR': 'mix-blend-color',
      'LUMINOSITY': 'mix-blend-luminosity',
    };
    const blendClass = blendModeMap[sceneNode.blendMode];
    if (blendClass) {
      classes.push(blendClass);
    }
  }

  // Add class prefix if specified
  if (opts.classPrefix) {
    return classes.map(c => opts.classPrefix + c);
  }

  return classes;
}

/**
 * Convert classes array to a single class string
 */
export function classesToString(classes: string[]): string {
  return classes.join(' ');
}

/**
 * Group classes by category for display
 */
export function groupClassesByCategory(classes: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    layout: [],
    sizing: [],
    spacing: [],
    typography: [],
    background: [],
    border: [],
    effects: [],
    other: [],
  };

  for (const cls of classes) {
    if (cls.startsWith('flex') || cls.startsWith('grid') || cls.startsWith('justify') ||
        cls.startsWith('items') || cls.startsWith('gap') || cls.startsWith('order')) {
      groups['layout']!.push(cls);
    } else if (cls.startsWith('w-') || cls.startsWith('h-') || cls.startsWith('min-') ||
               cls.startsWith('max-') || cls.startsWith('size-')) {
      groups['sizing']!.push(cls);
    } else if (cls.startsWith('p') || cls.startsWith('m') || cls.startsWith('space-')) {
      groups['spacing']!.push(cls);
    } else if (cls.startsWith('text-') || cls.startsWith('font-') || cls.startsWith('leading-') ||
               cls.startsWith('tracking-') || cls.startsWith('underline') || cls.startsWith('line-through')) {
      groups['typography']!.push(cls);
    } else if (cls.startsWith('bg-') || cls.startsWith('from-') || cls.startsWith('to-') ||
               cls.startsWith('via-')) {
      groups['background']!.push(cls);
    } else if (cls.startsWith('border') || cls.startsWith('rounded')) {
      groups['border']!.push(cls);
    } else if (cls.startsWith('shadow') || cls.startsWith('blur') || cls.startsWith('opacity') ||
               cls.startsWith('backdrop') || cls.startsWith('mix-blend')) {
      groups['effects']!.push(cls);
    } else {
      groups['other']!.push(cls);
    }
  }

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([, arr]) => arr.length > 0)
  );
}

/**
 * Create a UtilityClassGenerator instance for convenience
 */
export class UtilityClassGenerator {
  private options: UtilityClassOptions;

  constructor(options: UtilityClassOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate classes for a node
   */
  generate(node: NodeData): string[] {
    return nodeToUtilityClasses(node, this.options);
  }

  /**
   * Generate class string for a node
   */
  generateString(node: NodeData): string {
    return classesToString(this.generate(node));
  }

  /**
   * Generate grouped classes for a node
   */
  generateGrouped(node: NodeData): Record<string, string[]> {
    return groupClassesByCategory(this.generate(node));
  }
}

/**
 * Factory function
 */
export function createUtilityClassGenerator(options?: UtilityClassOptions): UtilityClassGenerator {
  return new UtilityClassGenerator(options);
}
