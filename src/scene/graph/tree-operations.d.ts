/**
 * Tree operations for the scene graph
 */
import type { NodeId, NodeType } from '@core/types/common';
import type { NodeData } from '../nodes/base-node';
import type { NodeRegistry } from './node-registry';
/**
 * Check if a node type can be a child of another node type.
 */
export declare function isValidParentChild(parentType: NodeType, childType: NodeType): boolean;
/**
 * Check if setting a node's parent would create a cycle.
 */
export declare function wouldCreateCycle(registry: NodeRegistry, nodeId: NodeId, newParentId: NodeId): boolean;
/**
 * Insert a node as a child of another node.
 */
export declare function insertNode(registry: NodeRegistry, node: NodeData, parentId: NodeId, position: number): NodeData;
/**
 * Delete a node and all its descendants.
 */
export declare function deleteNode(registry: NodeRegistry, nodeId: NodeId): NodeData[];
/**
 * Move a node to a new parent.
 */
export declare function moveNode(registry: NodeRegistry, nodeId: NodeId, newParentId: NodeId, position: number): void;
/**
 * Reorder a node within its parent.
 */
export declare function reorderNode(registry: NodeRegistry, nodeId: NodeId, newPosition: number): void;
/**
 * Duplicate a node and all its descendants.
 */
export declare function duplicateNode(registry: NodeRegistry, nodeId: NodeId, idGenerator: () => NodeId): NodeData | null;
/**
 * Get the depth of a node in the tree (0 = root).
 */
export declare function getNodeDepth(registry: NodeRegistry, nodeId: NodeId): number;
/**
 * Find the common ancestor of multiple nodes.
 */
export declare function findCommonAncestor(registry: NodeRegistry, nodeIds: readonly NodeId[]): NodeId | null;
//# sourceMappingURL=tree-operations.d.ts.map