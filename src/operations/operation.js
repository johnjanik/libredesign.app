/**
 * CRDT-ready operation types for DesignLibre
 *
 * Operations represent atomic changes to the document that can be:
 * - Applied locally
 * - Sent to collaborators
 * - Reversed (undo)
 * - Reapplied (redo)
 */
import { generateOperationId } from '@core/utils/uuid';
/**
 * Create a set property operation
 */
export function createSetPropertyOperation(ctx, nodeId, path, oldValue, newValue) {
    return {
        id: generateOperationId(ctx.lamportClock, ctx.clientId),
        type: 'SET_PROPERTY',
        timestamp: ctx.lamportClock,
        clientId: ctx.clientId,
        nodeId,
        path,
        oldValue,
        newValue,
    };
}
/**
 * Create an insert node operation
 */
export function createInsertNodeOperation(ctx, node, parentId, index) {
    return {
        id: generateOperationId(ctx.lamportClock, ctx.clientId),
        type: 'INSERT_NODE',
        timestamp: ctx.lamportClock,
        clientId: ctx.clientId,
        nodeId: node.id,
        node,
        parentId,
        index,
    };
}
/**
 * Create a delete node operation
 */
export function createDeleteNodeOperation(ctx, nodeId, deletedNodes) {
    return {
        id: generateOperationId(ctx.lamportClock, ctx.clientId),
        type: 'DELETE_NODE',
        timestamp: ctx.lamportClock,
        clientId: ctx.clientId,
        nodeId,
        deletedNodes,
    };
}
/**
 * Create a move node operation
 */
export function createMoveNodeOperation(ctx, nodeId, oldParentId, newParentId, oldIndex, newIndex) {
    return {
        id: generateOperationId(ctx.lamportClock, ctx.clientId),
        type: 'MOVE_NODE',
        timestamp: ctx.lamportClock,
        clientId: ctx.clientId,
        nodeId,
        oldParentId,
        newParentId,
        oldIndex,
        newIndex,
    };
}
/**
 * Create a reorder children operation
 */
export function createReorderChildrenOperation(ctx, nodeId, parentId, oldIndex, newIndex) {
    return {
        id: generateOperationId(ctx.lamportClock, ctx.clientId),
        type: 'REORDER_CHILDREN',
        timestamp: ctx.lamportClock,
        clientId: ctx.clientId,
        nodeId,
        parentId,
        oldIndex,
        newIndex,
    };
}
// ============================================================================
// Operation Utilities
// ============================================================================
/**
 * Check if an operation is reversible
 */
export function isReversible(_op) {
    // All operations are reversible
    return true;
}
/**
 * Get a human-readable description of an operation
 */
export function describeOperation(op) {
    switch (op.type) {
        case 'SET_PROPERTY':
            return `Set ${op.path.join('.')} on ${op.nodeId}`;
        case 'INSERT_NODE':
            return `Insert ${op.node.type} "${op.node.name}"`;
        case 'DELETE_NODE':
            return `Delete ${op.deletedNodes.length} node(s)`;
        case 'MOVE_NODE':
            return `Move node to ${op.newParentId}`;
        case 'REORDER_CHILDREN':
            return `Reorder ${op.nodeId} from ${op.oldIndex} to ${op.newIndex}`;
    }
}
//# sourceMappingURL=operation.js.map