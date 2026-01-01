/**
 * Node registry - central storage for all nodes
 */

import type { NodeId, NodeType } from '@core/types/common';
import type { NodeData } from '../nodes/base-node';
import type { FractionalIndex } from './fractional-index';

/**
 * Internal node entry with metadata
 */
export interface NodeEntry {
  /** The node data */
  data: NodeData;
  /** Fractional index for ordering within parent */
  index: FractionalIndex;
  /** Version number (incremented on each change) */
  version: number;
}

/**
 * Node registry - stores all nodes indexed by ID
 */
export class NodeRegistry {
  /** All nodes indexed by ID */
  private nodes = new Map<NodeId, NodeEntry>();

  /** Index by node type for fast type-based queries */
  private byType = new Map<NodeType, Set<NodeId>>();

  /** Index by parent for fast child queries */
  private byParent = new Map<NodeId | null, Set<NodeId>>();

  /** Component to instances mapping */
  private instancesByComponent = new Map<NodeId, Set<NodeId>>();

  /** Global version counter */
  private globalVersion = 0;

  // =========================================================================
  // Core CRUD Operations
  // =========================================================================

  /**
   * Get a node by ID.
   */
  getNode(id: NodeId): NodeData | null {
    return this.nodes.get(id)?.data ?? null;
  }

  /**
   * Get a node entry (including metadata) by ID.
   */
  getEntry(id: NodeId): NodeEntry | null {
    return this.nodes.get(id) ?? null;
  }

  /**
   * Check if a node exists.
   */
  hasNode(id: NodeId): boolean {
    return this.nodes.has(id);
  }

  /**
   * Add a node to the registry.
   */
  addNode(node: NodeData, index: FractionalIndex): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node ${node.id} already exists`);
    }

    const entry: NodeEntry = {
      data: node,
      index,
      version: 0,
    };

    this.nodes.set(node.id, entry);
    this.globalVersion++;

    // Update type index
    let typeSet = this.byType.get(node.type);
    if (!typeSet) {
      typeSet = new Set();
      this.byType.set(node.type, typeSet);
    }
    typeSet.add(node.id);

    // Update parent index
    let parentSet = this.byParent.get(node.parentId);
    if (!parentSet) {
      parentSet = new Set();
      this.byParent.set(node.parentId, parentSet);
    }
    parentSet.add(node.id);

    // Update component-instance index
    if (node.type === 'INSTANCE') {
      const componentId = (node as { componentId: NodeId }).componentId;
      let instanceSet = this.instancesByComponent.get(componentId);
      if (!instanceSet) {
        instanceSet = new Set();
        this.instancesByComponent.set(componentId, instanceSet);
      }
      instanceSet.add(node.id);
    }
  }

  /**
   * Update a node's data.
   */
  updateNode(id: NodeId, updater: (node: NodeData) => NodeData): NodeData {
    const entry = this.nodes.get(id);
    if (!entry) {
      throw new Error(`Node ${id} not found`);
    }

    const oldData = entry.data;
    const newData = updater(oldData);

    // Update entry
    entry.data = newData;
    entry.version++;
    this.globalVersion++;

    // Update parent index if parent changed
    if (oldData.parentId !== newData.parentId) {
      // Remove from old parent
      this.byParent.get(oldData.parentId)?.delete(id);

      // Add to new parent
      let parentSet = this.byParent.get(newData.parentId);
      if (!parentSet) {
        parentSet = new Set();
        this.byParent.set(newData.parentId, parentSet);
      }
      parentSet.add(id);
    }

    return newData;
  }

  /**
   * Update a node's fractional index.
   */
  updateIndex(id: NodeId, index: FractionalIndex): void {
    const entry = this.nodes.get(id);
    if (!entry) {
      throw new Error(`Node ${id} not found`);
    }

    entry.index = index;
    entry.version++;
    this.globalVersion++;
  }

  /**
   * Delete a node from the registry.
   */
  deleteNode(id: NodeId): NodeData | null {
    const entry = this.nodes.get(id);
    if (!entry) {
      return null;
    }

    const node = entry.data;

    // Remove from nodes map
    this.nodes.delete(id);
    this.globalVersion++;

    // Remove from type index
    this.byType.get(node.type)?.delete(id);

    // Remove from parent index
    this.byParent.get(node.parentId)?.delete(id);

    // Remove from component-instance index
    if (node.type === 'INSTANCE') {
      const componentId = (node as { componentId: NodeId }).componentId;
      this.instancesByComponent.get(componentId)?.delete(id);
    }

    return node;
  }

  // =========================================================================
  // Query Operations
  // =========================================================================

  /**
   * Get all nodes of a specific type.
   */
  getNodesByType(type: NodeType): NodeId[] {
    return Array.from(this.byType.get(type) ?? []);
  }

  /**
   * Get all children of a node.
   */
  getChildIds(parentId: NodeId): NodeId[] {
    const children = this.byParent.get(parentId);
    if (!children || children.size === 0) {
      return [];
    }

    // Sort by fractional index
    const entries = Array.from(children)
      .map((id) => this.nodes.get(id))
      .filter((e): e is NodeEntry => e !== undefined);

    entries.sort((a, b) => a.index.localeCompare(b.index));

    return entries.map((e) => e.data.id);
  }

  /**
   * Get all children data of a node.
   */
  getChildren(parentId: NodeId): NodeData[] {
    return this.getChildIds(parentId)
      .map((id) => this.getNode(id))
      .filter((n): n is NodeData => n !== null);
  }

  /**
   * Get the parent of a node.
   */
  getParent(id: NodeId): NodeData | null {
    const node = this.getNode(id);
    if (!node || !node.parentId) {
      return null;
    }
    return this.getNode(node.parentId);
  }

  /**
   * Get all ancestors of a node (from parent to root).
   */
  getAncestors(id: NodeId): NodeData[] {
    const ancestors: NodeData[] = [];
    let current = this.getNode(id);

    while (current?.parentId) {
      const parent = this.getNode(current.parentId);
      if (!parent) break;
      ancestors.push(parent);
      current = parent;
    }

    return ancestors;
  }

  /**
   * Get all descendants of a node (depth-first).
   */
  getDescendants(id: NodeId): NodeData[] {
    const descendants: NodeData[] = [];
    const stack = this.getChildIds(id);

    while (stack.length > 0) {
      const childId = stack.pop()!;
      const child = this.getNode(childId);
      if (child) {
        descendants.push(child);
        stack.push(...this.getChildIds(childId));
      }
    }

    return descendants;
  }

  /**
   * Get all instances of a component.
   */
  getInstancesOfComponent(componentId: NodeId): NodeId[] {
    return Array.from(this.instancesByComponent.get(componentId) ?? []);
  }

  /**
   * Find nodes matching a predicate.
   */
  findNodes(predicate: (node: NodeData) => boolean): NodeData[] {
    const results: NodeData[] = [];
    for (const entry of this.nodes.values()) {
      if (predicate(entry.data)) {
        results.push(entry.data);
      }
    }
    return results;
  }

  /**
   * Get the document node (root).
   */
  getDocument(): NodeData | null {
    const docs = this.getNodesByType('DOCUMENT');
    return docs.length > 0 ? this.getNode(docs[0]!) : null;
  }

  /**
   * Get all pages.
   */
  getPages(): NodeData[] {
    return this.getNodesByType('PAGE')
      .map((id) => this.getNode(id))
      .filter((n): n is NodeData => n !== null);
  }

  // =========================================================================
  // Versioning
  // =========================================================================

  /**
   * Get the global version (incremented on any change).
   */
  getGlobalVersion(): number {
    return this.globalVersion;
  }

  /**
   * Get the version of a specific node.
   */
  getNodeVersion(id: NodeId): number {
    return this.nodes.get(id)?.version ?? -1;
  }

  // =========================================================================
  // Iteration
  // =========================================================================

  /**
   * Iterate over all nodes.
   */
  *[Symbol.iterator](): IterableIterator<NodeData> {
    for (const entry of this.nodes.values()) {
      yield entry.data;
    }
  }

  /**
   * Get the total number of nodes.
   */
  get size(): number {
    return this.nodes.size;
  }

  /**
   * Get all node IDs.
   */
  getAllIds(): NodeId[] {
    return Array.from(this.nodes.keys());
  }

  // =========================================================================
  // Serialization
  // =========================================================================

  /**
   * Export all nodes as a plain object.
   */
  toJSON(): Record<string, { data: NodeData; index: string }> {
    const result: Record<string, { data: NodeData; index: string }> = {};
    for (const [id, entry] of this.nodes) {
      result[id] = { data: entry.data, index: entry.index };
    }
    return result;
  }

  /**
   * Clear all nodes.
   */
  clear(): void {
    this.nodes.clear();
    this.byType.clear();
    this.byParent.clear();
    this.instancesByComponent.clear();
    this.globalVersion++;
  }
}
