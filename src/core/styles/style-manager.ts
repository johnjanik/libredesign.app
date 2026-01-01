/**
 * Style Manager - manages reusable design styles
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { Style, StyleId, StyleType, ColorStyle, TextStyle, EffectStyle } from '@core/types/style';
import type { RGBA } from '@core/types/color';
import { createColorStyle, createTextStyle, createEffectStyle } from '@core/types/style';
import type { Effect } from '@core/types/effect';

/**
 * Style manager events
 */
export type StyleManagerEvents = {
  'style:created': { style: Style };
  'style:updated': { style: Style; previousStyle: Style };
  'style:deleted': { styleId: StyleId; style: Style };
  [key: string]: unknown;
};

/**
 * Style Manager - stores and manages design styles
 */
export class StyleManager extends EventEmitter<StyleManagerEvents> {
  private styles: Map<StyleId, Style> = new Map();

  constructor() {
    super();
  }

  // =========================================================================
  // Style Access
  // =========================================================================

  /**
   * Get a style by ID.
   */
  getStyle(id: StyleId): Style | null {
    return this.styles.get(id) ?? null;
  }

  /**
   * Get all styles.
   */
  getAllStyles(): Style[] {
    return Array.from(this.styles.values());
  }

  /**
   * Get styles by type.
   */
  getStylesByType<T extends StyleType>(type: T): Style[] {
    return this.getAllStyles().filter(s => s.type === type);
  }

  /**
   * Get color styles.
   */
  getColorStyles(): ColorStyle[] {
    return this.getStylesByType('COLOR') as ColorStyle[];
  }

  /**
   * Get text styles.
   */
  getTextStyles(): TextStyle[] {
    return this.getStylesByType('TEXT') as TextStyle[];
  }

  /**
   * Get effect styles.
   */
  getEffectStyles(): EffectStyle[] {
    return this.getStylesByType('EFFECT') as EffectStyle[];
  }

  /**
   * Check if a style exists.
   */
  hasStyle(id: StyleId): boolean {
    return this.styles.has(id);
  }

  // =========================================================================
  // Style Creation
  // =========================================================================

  /**
   * Add a style.
   */
  addStyle(style: Style): void {
    this.styles.set(style.id, style);
    this.emit('style:created', { style });
  }

  /**
   * Create and add a color style.
   */
  createColorStyle(name: string, color: RGBA): ColorStyle {
    const style = createColorStyle(name, color);
    this.addStyle(style);
    return style;
  }

  /**
   * Create and add a text style.
   */
  createTextStyle(
    name: string,
    options?: Partial<Omit<TextStyle, 'id' | 'type' | 'name' | 'createdAt' | 'updatedAt'>>
  ): TextStyle {
    const style = createTextStyle(name, options);
    this.addStyle(style);
    return style;
  }

  /**
   * Create and add an effect style.
   */
  createEffectStyle(name: string, effects: Effect[]): EffectStyle {
    const style = createEffectStyle(name, effects);
    this.addStyle(style);
    return style;
  }

  // =========================================================================
  // Style Modification
  // =========================================================================

  /**
   * Update a style.
   */
  updateStyle(id: StyleId, updates: Partial<Style>): void {
    const style = this.styles.get(id);
    if (!style) return;

    const previousStyle = style;
    const updatedStyle = {
      ...style,
      ...updates,
      id: style.id, // Preserve ID
      type: style.type, // Preserve type
      updatedAt: Date.now(),
    } as Style;

    this.styles.set(id, updatedStyle);
    this.emit('style:updated', { style: updatedStyle, previousStyle });
  }

  /**
   * Delete a style.
   */
  deleteStyle(id: StyleId): boolean {
    const style = this.styles.get(id);
    if (!style) return false;

    this.styles.delete(id);
    this.emit('style:deleted', { styleId: id, style });
    return true;
  }

  // =========================================================================
  // Serialization
  // =========================================================================

  /**
   * Export styles as JSON.
   */
  toJSON(): Style[] {
    return this.getAllStyles();
  }

  /**
   * Import styles from JSON.
   */
  fromJSON(styles: Style[]): void {
    for (const style of styles) {
      this.styles.set(style.id, style);
    }
  }

  /**
   * Clear all styles.
   */
  clear(): void {
    this.styles.clear();
  }
}

/**
 * Create a style manager.
 */
export function createStyleManager(): StyleManager {
  return new StyleManager();
}
