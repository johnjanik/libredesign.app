/**
 * Style definitions for reusable design styles
 */
/**
 * Generate a unique style ID
 */
export function generateStyleId() {
    return `style_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Create a color style
 */
export function createColorStyle(name, color) {
    const now = Date.now();
    return {
        id: generateStyleId(),
        type: 'COLOR',
        name,
        color,
        createdAt: now,
        updatedAt: now,
    };
}
/**
 * Create a text style
 */
export function createTextStyle(name, options = {}) {
    const now = Date.now();
    return {
        id: generateStyleId(),
        type: 'TEXT',
        name,
        fontFamily: options.fontFamily ?? 'Inter',
        fontWeight: options.fontWeight ?? 400,
        fontSize: options.fontSize ?? 14,
        lineHeight: options.lineHeight ?? 'AUTO',
        letterSpacing: options.letterSpacing ?? 0,
        textDecoration: options.textDecoration ?? 'NONE',
        textColor: options.textColor ?? { r: 0, g: 0, b: 0, a: 1 },
        createdAt: now,
        updatedAt: now,
    };
}
/**
 * Create an effect style
 */
export function createEffectStyle(name, effects) {
    const now = Date.now();
    return {
        id: generateStyleId(),
        type: 'EFFECT',
        name,
        effects,
        createdAt: now,
        updatedAt: now,
    };
}
//# sourceMappingURL=style.js.map