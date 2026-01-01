/**
 * Style Manager - manages reusable design styles
 */
import { EventEmitter } from '@core/events/event-emitter';
import { createColorStyle, createTextStyle, createEffectStyle } from '@core/types/style';
/**
 * Style Manager - stores and manages design styles
 */
export class StyleManager extends EventEmitter {
    styles = new Map();
    constructor() {
        super();
    }
    // =========================================================================
    // Style Access
    // =========================================================================
    /**
     * Get a style by ID.
     */
    getStyle(id) {
        return this.styles.get(id) ?? null;
    }
    /**
     * Get all styles.
     */
    getAllStyles() {
        return Array.from(this.styles.values());
    }
    /**
     * Get styles by type.
     */
    getStylesByType(type) {
        return this.getAllStyles().filter(s => s.type === type);
    }
    /**
     * Get color styles.
     */
    getColorStyles() {
        return this.getStylesByType('COLOR');
    }
    /**
     * Get text styles.
     */
    getTextStyles() {
        return this.getStylesByType('TEXT');
    }
    /**
     * Get effect styles.
     */
    getEffectStyles() {
        return this.getStylesByType('EFFECT');
    }
    /**
     * Check if a style exists.
     */
    hasStyle(id) {
        return this.styles.has(id);
    }
    // =========================================================================
    // Style Creation
    // =========================================================================
    /**
     * Add a style.
     */
    addStyle(style) {
        this.styles.set(style.id, style);
        this.emit('style:created', { style });
    }
    /**
     * Create and add a color style.
     */
    createColorStyle(name, color) {
        const style = createColorStyle(name, color);
        this.addStyle(style);
        return style;
    }
    /**
     * Create and add a text style.
     */
    createTextStyle(name, options) {
        const style = createTextStyle(name, options);
        this.addStyle(style);
        return style;
    }
    /**
     * Create and add an effect style.
     */
    createEffectStyle(name, effects) {
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
    updateStyle(id, updates) {
        const style = this.styles.get(id);
        if (!style)
            return;
        const previousStyle = style;
        const updatedStyle = {
            ...style,
            ...updates,
            id: style.id, // Preserve ID
            type: style.type, // Preserve type
            updatedAt: Date.now(),
        };
        this.styles.set(id, updatedStyle);
        this.emit('style:updated', { style: updatedStyle, previousStyle });
    }
    /**
     * Delete a style.
     */
    deleteStyle(id) {
        const style = this.styles.get(id);
        if (!style)
            return false;
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
    toJSON() {
        return this.getAllStyles();
    }
    /**
     * Import styles from JSON.
     */
    fromJSON(styles) {
        for (const style of styles) {
            this.styles.set(style.id, style);
        }
    }
    /**
     * Clear all styles.
     */
    clear() {
        this.styles.clear();
    }
}
/**
 * Create a style manager.
 */
export function createStyleManager() {
    return new StyleManager();
}
//# sourceMappingURL=style-manager.js.map