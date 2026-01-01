/**
 * Transition Types
 *
 * Defines transitions between states for prototyping.
 */
/**
 * Create a prototype link.
 */
export function createPrototypeLink(sourceNodeId, targetNodeId, options = {}) {
    const link = {
        id: generateLinkId(),
        sourceNodeId,
        targetNodeId,
        trigger: options.trigger ?? 'ON_CLICK',
        transition: options.transition ?? 'INSTANT',
        duration: options.duration ?? 300,
        easing: options.easing ?? 'ease-out',
    };
    if (options.direction !== undefined) {
        link.direction = options.direction;
    }
    if (options.delay !== undefined) {
        link.delay = options.delay;
    }
    return link;
}
/**
 * Generate a unique link ID.
 */
function generateLinkId() {
    return `link_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
//# sourceMappingURL=transition.js.map