/**
 * Design Token Type Definitions
 *
 * Core types for the design token system.
 */
// ============================================================================
// Type Guards
// ============================================================================
/** Check if token is a color token */
export function isColorToken(token) {
    return token.type === 'color';
}
/** Check if token is a typography token */
export function isTypographyToken(token) {
    return token.type === 'typography';
}
/** Check if token is a spacing token */
export function isSpacingToken(token) {
    return token.type === 'spacing';
}
/** Check if token is a shadow token */
export function isShadowToken(token) {
    return token.type === 'shadow';
}
/** Check if token is a radius token */
export function isRadiusToken(token) {
    return token.type === 'radius';
}
/** Check if token is an opacity token */
export function isOpacityToken(token) {
    return token.type === 'opacity';
}
// ============================================================================
// Factory Functions
// ============================================================================
/** Generate a unique token ID */
export function generateTokenId() {
    return `token_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
/** Create a color token */
export function createColorToken(name, value, options) {
    return {
        id: generateTokenId(),
        name,
        type: 'color',
        value,
        ...(options?.description !== undefined && { description: options.description }),
        ...(options?.group !== undefined && { group: options.group }),
        ...(options?.lightValue !== undefined && { lightValue: options.lightValue }),
        ...(options?.darkValue !== undefined && { darkValue: options.darkValue }),
    };
}
/** Create a typography token */
export function createTypographyToken(name, value, options) {
    return {
        id: generateTokenId(),
        name,
        type: 'typography',
        value,
        ...(options?.description !== undefined && { description: options.description }),
        ...(options?.group !== undefined && { group: options.group }),
    };
}
/** Create a spacing token */
export function createSpacingToken(name, value, options) {
    return {
        id: generateTokenId(),
        name,
        type: 'spacing',
        value,
        ...(options?.description !== undefined && { description: options.description }),
        ...(options?.group !== undefined && { group: options.group }),
    };
}
/** Create a shadow token */
export function createShadowToken(name, value, options) {
    return {
        id: generateTokenId(),
        name,
        type: 'shadow',
        value,
        ...(options?.description !== undefined && { description: options.description }),
        ...(options?.group !== undefined && { group: options.group }),
    };
}
/** Create a radius token */
export function createRadiusToken(name, value, options) {
    return {
        id: generateTokenId(),
        name,
        type: 'radius',
        value,
        ...(options?.description !== undefined && { description: options.description }),
        ...(options?.group !== undefined && { group: options.group }),
    };
}
/** Create an opacity token */
export function createOpacityToken(name, value, options) {
    return {
        id: generateTokenId(),
        name,
        type: 'opacity',
        value,
        ...(options?.description !== undefined && { description: options.description }),
        ...(options?.group !== undefined && { group: options.group }),
    };
}
//# sourceMappingURL=token-types.js.map