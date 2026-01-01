/**
 * Style Manager - manages reusable design styles
 */
import { EventEmitter } from '@core/events/event-emitter';
import type { Style, StyleId, StyleType, ColorStyle, TextStyle, EffectStyle } from '@core/types/style';
import type { RGBA } from '@core/types/color';
import type { Effect } from '@core/types/effect';
/**
 * Style manager events
 */
export type StyleManagerEvents = {
    'style:created': {
        style: Style;
    };
    'style:updated': {
        style: Style;
        previousStyle: Style;
    };
    'style:deleted': {
        styleId: StyleId;
        style: Style;
    };
    [key: string]: unknown;
};
/**
 * Style Manager - stores and manages design styles
 */
export declare class StyleManager extends EventEmitter<StyleManagerEvents> {
    private styles;
    constructor();
    /**
     * Get a style by ID.
     */
    getStyle(id: StyleId): Style | null;
    /**
     * Get all styles.
     */
    getAllStyles(): Style[];
    /**
     * Get styles by type.
     */
    getStylesByType<T extends StyleType>(type: T): Style[];
    /**
     * Get color styles.
     */
    getColorStyles(): ColorStyle[];
    /**
     * Get text styles.
     */
    getTextStyles(): TextStyle[];
    /**
     * Get effect styles.
     */
    getEffectStyles(): EffectStyle[];
    /**
     * Check if a style exists.
     */
    hasStyle(id: StyleId): boolean;
    /**
     * Add a style.
     */
    addStyle(style: Style): void;
    /**
     * Create and add a color style.
     */
    createColorStyle(name: string, color: RGBA): ColorStyle;
    /**
     * Create and add a text style.
     */
    createTextStyle(name: string, options?: Partial<Omit<TextStyle, 'id' | 'type' | 'name' | 'createdAt' | 'updatedAt'>>): TextStyle;
    /**
     * Create and add an effect style.
     */
    createEffectStyle(name: string, effects: Effect[]): EffectStyle;
    /**
     * Update a style.
     */
    updateStyle(id: StyleId, updates: Partial<Style>): void;
    /**
     * Delete a style.
     */
    deleteStyle(id: StyleId): boolean;
    /**
     * Export styles as JSON.
     */
    toJSON(): Style[];
    /**
     * Import styles from JSON.
     */
    fromJSON(styles: Style[]): void;
    /**
     * Clear all styles.
     */
    clear(): void;
}
/**
 * Create a style manager.
 */
export declare function createStyleManager(): StyleManager;
//# sourceMappingURL=style-manager.d.ts.map