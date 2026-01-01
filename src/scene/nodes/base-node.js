/**
 * Base node types for the scene graph
 */
/**
 * Type guard for scene nodes (have transform and appearance)
 */
export function isSceneNode(node) {
    return (node.type !== 'DOCUMENT' &&
        node.type !== 'PAGE' &&
        node.type !== 'SLICE');
}
/**
 * Type guard for container nodes (can have children rendered)
 */
export function isContainerNode(node) {
    return (node.type === 'FRAME' ||
        node.type === 'GROUP' ||
        node.type === 'COMPONENT' ||
        node.type === 'BOOLEAN_OPERATION');
}
/**
 * Check if a node type can have children
 */
export function canHaveChildren(type) {
    return (type === 'DOCUMENT' ||
        type === 'PAGE' ||
        type === 'FRAME' ||
        type === 'GROUP' ||
        type === 'COMPONENT' ||
        type === 'BOOLEAN_OPERATION');
}
//# sourceMappingURL=base-node.js.map