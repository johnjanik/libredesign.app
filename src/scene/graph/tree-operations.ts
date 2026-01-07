/**
 * Tree operations for the scene graph
 */

import type { NodeId, NodeType } from '@core/types/common';
import type { NodeData } from '../nodes/base-node';
import type { NodeRegistry } from './node-registry';
import {
  generateFirstIndex,
  generateIndexBefore,
  generateIndexAfter,
  generateIndexBetween,
  type FractionalIndex,
} from './fractional-index';

/**
 * Valid parent-child relationships by node type.
 */
const VALID_CHILDREN: Record<NodeType, readonly NodeType[]> = {
  DOCUMENT: ['PAGE'],
  PAGE: ['FRAME', 'GROUP', 'VECTOR', 'IMAGE', 'TEXT', 'COMPONENT', 'INSTANCE', 'BOOLEAN_OPERATION', 'SLICE', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR'],
  FRAME: ['FRAME', 'GROUP', 'VECTOR', 'IMAGE', 'TEXT', 'COMPONENT', 'INSTANCE', 'BOOLEAN_OPERATION', 'SLICE', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR'],
  GROUP: ['FRAME', 'GROUP', 'VECTOR', 'IMAGE', 'TEXT', 'COMPONENT', 'INSTANCE', 'BOOLEAN_OPERATION', 'SLICE', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR'],
  VECTOR: [],
  IMAGE: [],
  TEXT: [],
  COMPONENT: ['FRAME', 'GROUP', 'VECTOR', 'IMAGE', 'TEXT', 'INSTANCE', 'BOOLEAN_OPERATION', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR'],
  INSTANCE: [],
  BOOLEAN_OPERATION: ['VECTOR', 'FRAME', 'GROUP', 'BOOLEAN_OPERATION', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR'],
  SLICE: [],
  RECTANGLE: [],
  ELLIPSE: [],
  LINE: [],
  POLYGON: [],
  STAR: [],
};

/**
 * Check if a node type can be a child of another node type.
 */
export function isValidParentChild(parentType: NodeType, childType: NodeType): boolean {
  const validChildren = VALID_CHILDREN[parentType];
  return validChildren?.includes(childType) ?? false;
}

/**
 * Check if setting a node's parent would create a cycle.
 */
export function wouldCreateCycle(
  registry: NodeRegistry,
  nodeId: NodeId,
  newParentId: NodeId
): boolean {
  // Check if newParentId is a descendant of nodeId
  let current: NodeData | null = registry.getNode(newParentId);

  while (current) {
    if (current.id === nodeId) {
      return true;
    }
    current = current.parentId ? registry.getNode(current.parentId) : null;
  }

  return false;
}

/**
 * Insert a node as a child of another node.
 */
export function insertNode(
  registry: NodeRegistry,
  node: NodeData,
  parentId: NodeId,
  position: number
): NodeData {
  const parent = registry.getNode(parentId);
  if (!parent) {
    throw new Error(`Parent node ${parentId} not found`);
  }

  // Validate parent-child relationship
  if (!isValidParentChild(parent.type, node.type)) {
    throw new Error(
      `Cannot insert ${node.type} as child of ${parent.type}`
    );
  }

  // Get sibling indices
  const siblingIds = registry.getChildIds(parentId);
  const siblingEntries = siblingIds
    .map((id) => registry.getEntry(id))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  siblingEntries.sort((a, b) => a.index.localeCompare(b.index));
  const siblingIndices = siblingEntries.map((e) => e.index);

  // Generate fractional index for the new position
  let newIndex: FractionalIndex;
  if (siblingIndices.length === 0) {
    newIndex = generateFirstIndex();
  } else if (position <= 0) {
    newIndex = generateIndexBefore(siblingIndices[0]!);
  } else if (position >= siblingIndices.length) {
    newIndex = generateIndexAfter(siblingIndices[siblingIndices.length - 1]!);
  } else {
    newIndex = generateIndexBetween(
      siblingIndices[position - 1]!,
      siblingIndices[position]!
    );
  }

  // Create node with parent reference
  const nodeWithParent: NodeData = {
    ...node,
    parentId,
    childIds: node.childIds,
  } as NodeData;

  // Add to registry
  registry.addNode(nodeWithParent, newIndex);

  // Update parent's childIds
  const newChildIds = [...registry.getChildIds(parentId)];
  registry.updateNode(parentId, (p) => ({
    ...p,
    childIds: newChildIds,
  }));

  return nodeWithParent;
}

/**
 * Delete a node and all its descendants.
 */
export function deleteNode(registry: NodeRegistry, nodeId: NodeId): NodeData[] {
  const node = registry.getNode(nodeId);
  if (!node) {
    return [];
  }

  // Collect all nodes to delete (node + descendants)
  const toDelete: NodeData[] = [node, ...registry.getDescendants(nodeId)];

  // Delete in reverse order (children first)
  for (let i = toDelete.length - 1; i >= 0; i--) {
    registry.deleteNode(toDelete[i]!.id);
  }

  // Update parent's childIds
  if (node.parentId) {
    const newChildIds = registry.getChildIds(node.parentId);
    registry.updateNode(node.parentId, (p) => ({
      ...p,
      childIds: newChildIds,
    }));
  }

  return toDelete;
}

/**
 * Move a node to a new parent.
 */
export function moveNode(
  registry: NodeRegistry,
  nodeId: NodeId,
  newParentId: NodeId,
  position: number
): void {
  const node = registry.getNode(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const newParent = registry.getNode(newParentId);
  if (!newParent) {
    throw new Error(`New parent ${newParentId} not found`);
  }

  // Validate parent-child relationship
  if (!isValidParentChild(newParent.type, node.type)) {
    throw new Error(
      `Cannot move ${node.type} to be child of ${newParent.type}`
    );
  }

  // Check for cycles
  if (wouldCreateCycle(registry, nodeId, newParentId)) {
    throw new Error('Cannot move node: would create cycle');
  }

  const oldParentId = node.parentId;

  // Get sibling indices at new location
  const siblingIds = registry.getChildIds(newParentId).filter((id) => id !== nodeId);
  const siblingEntries = siblingIds
    .map((id) => registry.getEntry(id))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  siblingEntries.sort((a, b) => a.index.localeCompare(b.index));
  const siblingIndices = siblingEntries.map((e) => e.index);

  // Generate new fractional index
  let newIndex: FractionalIndex;
  if (siblingIndices.length === 0) {
    newIndex = generateFirstIndex();
  } else if (position <= 0) {
    newIndex = generateIndexBefore(siblingIndices[0]!);
  } else if (position >= siblingIndices.length) {
    newIndex = generateIndexAfter(siblingIndices[siblingIndices.length - 1]!);
  } else {
    newIndex = generateIndexBetween(
      siblingIndices[position - 1]!,
      siblingIndices[position]!
    );
  }

  // Update node with new parent
  registry.updateNode(nodeId, (n) => ({
    ...n,
    parentId: newParentId,
  }));

  // Update fractional index
  registry.updateIndex(nodeId, newIndex);

  // Update old parent's childIds
  if (oldParentId) {
    const oldChildIds = registry.getChildIds(oldParentId);
    registry.updateNode(oldParentId, (p) => ({
      ...p,
      childIds: oldChildIds,
    }));
  }

  // Update new parent's childIds
  const newChildIds = registry.getChildIds(newParentId);
  registry.updateNode(newParentId, (p) => ({
    ...p,
    childIds: newChildIds,
  }));
}

/**
 * Reorder a node within its parent.
 */
export function reorderNode(
  registry: NodeRegistry,
  nodeId: NodeId,
  newPosition: number
): void {
  const node = registry.getNode(nodeId);
  if (!node || !node.parentId) {
    throw new Error(`Node ${nodeId} not found or has no parent`);
  }

  moveNode(registry, nodeId, node.parentId, newPosition);
}

/**
 * Duplicate a node and all its descendants.
 */
export function duplicateNode(
  registry: NodeRegistry,
  nodeId: NodeId,
  idGenerator: () => NodeId
): NodeData | null {
  const original = registry.getNode(nodeId);
  if (!original || !original.parentId) {
    return null;
  }

  // Create a mapping from old IDs to new IDs
  const idMap = new Map<NodeId, NodeId>();

  // Clone the node tree
  function cloneTree(node: NodeData, newParentId: NodeId | null): NodeData {
    const newId = idGenerator();
    idMap.set(node.id, newId);

    // Clone children first
    const newChildIds: NodeId[] = [];
    for (const childId of node.childIds) {
      const child = registry.getNode(childId);
      if (child) {
        const clonedChild = cloneTree(child, newId);
        newChildIds.push(clonedChild.id);
      }
    }

    // Create the cloned node
    const cloned: NodeData = {
      ...node,
      id: newId,
      name: node.name + ' Copy',
      parentId: newParentId,
      childIds: newChildIds,
    } as NodeData;

    return cloned;
  }

  // Clone the tree starting from the original
  const cloned = cloneTree(original, original.parentId);

  // Find the position after the original
  const siblingIds = registry.getChildIds(original.parentId);
  const originalIndex = siblingIds.indexOf(nodeId);
  const insertPosition = originalIndex >= 0 ? originalIndex + 1 : siblingIds.length;

  // Note: This is a simplified implementation that only duplicates the root node.
  // A full implementation would recursively insert all children.
  insertNode(registry, { ...cloned, childIds: [] } as NodeData, original.parentId, insertPosition);

  return cloned;
}

/**
 * Get the depth of a node in the tree (0 = root).
 */
export function getNodeDepth(registry: NodeRegistry, nodeId: NodeId): number {
  let depth = 0;
  let current = registry.getNode(nodeId);

  while (current?.parentId) {
    depth++;
    current = registry.getNode(current.parentId);
  }

  return depth;
}

/**
 * Find the common ancestor of multiple nodes.
 */
export function findCommonAncestor(
  registry: NodeRegistry,
  nodeIds: readonly NodeId[]
): NodeId | null {
  if (nodeIds.length === 0) return null;
  if (nodeIds.length === 1) return nodeIds[0]!;

  // Get ancestors for each node (including the node itself)
  const ancestorSets = nodeIds.map((id) => {
    const ancestors = new Set<NodeId>([id]);
    let current = registry.getNode(id);
    while (current?.parentId) {
      ancestors.add(current.parentId);
      current = registry.getNode(current.parentId);
    }
    return ancestors;
  });

  // Find the first common ancestor (starting from the first node's ancestors)
  const firstAncestors = registry.getAncestors(nodeIds[0]!);
  firstAncestors.unshift(registry.getNode(nodeIds[0]!)!);

  for (const ancestor of firstAncestors) {
    if (ancestorSets.every((set) => set.has(ancestor.id))) {
      return ancestor.id;
    }
  }

  return null;
}
