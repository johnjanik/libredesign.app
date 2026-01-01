/**
 * Scene graph - main API for managing the document tree
 */

import type { NodeId, NodeType, PropertyPath } from '@core/types/common';
import { EventEmitter } from '@core/events/event-emitter';
import type { NodeData } from '../nodes/base-node';
import {
  createDocument,
  createPage,
  createFrame,
  createGroup,
  createVector,
  createText,
  createComponent,
  createInstance,
  createBooleanOperation,
  createSlice,
} from '../nodes/factory';
import { NodeRegistry } from './node-registry';
import {
  insertNode,
  deleteNode,
  moveNode,
  reorderNode,
  wouldCreateCycle,
  isValidParentChild,
  getNodeDepth,
  findCommonAncestor,
} from './tree-operations';
import { generateFirstIndex } from './fractional-index';

/**
 * Scene graph events
 */
export type SceneGraphEvents = {
  'node:created': { nodeId: NodeId; nodeType: NodeType };
  'node:deleted': { nodeId: NodeId; nodeType: NodeType; parentId: NodeId | null };
  'node:propertyChanged': {
    nodeId: NodeId;
    path: PropertyPath;
    oldValue: unknown;
    newValue: unknown;
  };
  'node:parentChanged': {
    nodeId: NodeId;
    oldParentId: NodeId | null;
    newParentId: NodeId | null;
  };
  'node:childrenReordered': { parentId: NodeId };
  'document:loaded': undefined;
  'document:cleared': undefined;
  [key: string]: unknown;
};

/**
 * Options for creating nodes
 */
export type CreateNodeOptions = Partial<Omit<NodeData, 'id' | 'type'>>;

/**
 * Scene graph - the core data structure for the document
 */
export class SceneGraph extends EventEmitter<SceneGraphEvents> {
  private registry = new NodeRegistry();

  constructor() {
    super();
  }

  // =========================================================================
  // Document Lifecycle
  // =========================================================================

  /**
   * Create a new empty document with one page.
   */
  createNewDocument(name?: string): NodeId {
    this.clear();

    // Create document
    const doc = createDocument(name ? { name } : {});
    this.registry.addNode(doc, generateFirstIndex());

    // Create first page (called "Leaf" in the UI)
    const page = createPage({ name: 'Leaf 1' });
    insertNode(this.registry, page, doc.id, 0);

    this.emit('node:created', { nodeId: doc.id, nodeType: 'DOCUMENT' });
    this.emit('node:created', { nodeId: page.id, nodeType: 'PAGE' });
    this.emit('document:loaded');

    return doc.id;
  }

  /**
   * Clear all nodes.
   */
  clear(): void {
    this.registry.clear();
    this.emit('document:cleared');
  }

  // =========================================================================
  // Node Access
  // =========================================================================

  /**
   * Get a node by ID.
   */
  getNode(id: NodeId): NodeData | null {
    return this.registry.getNode(id);
  }

  /**
   * Check if a node exists.
   */
  hasNode(id: NodeId): boolean {
    return this.registry.hasNode(id);
  }

  /**
   * Get the document node.
   */
  getDocument(): NodeData | null {
    return this.registry.getDocument();
  }

  /**
   * Get all pages.
   */
  getPages(): NodeData[] {
    return this.registry.getPages();
  }

  /**
   * Get children of a node.
   */
  getChildren(parentId: NodeId): NodeData[] {
    return this.registry.getChildren(parentId);
  }

  /**
   * Get child IDs of a node.
   */
  getChildIds(parentId: NodeId): NodeId[] {
    return this.registry.getChildIds(parentId);
  }

  /**
   * Get the parent of a node.
   */
  getParent(id: NodeId): NodeData | null {
    return this.registry.getParent(id);
  }

  /**
   * Get ancestors of a node.
   */
  getAncestors(id: NodeId): NodeData[] {
    return this.registry.getAncestors(id);
  }

  /**
   * Get descendants of a node.
   */
  getDescendants(id: NodeId): NodeData[] {
    return this.registry.getDescendants(id);
  }

  /**
   * Get nodes by type.
   */
  getNodesByType(type: NodeType): NodeData[] {
    return this.registry.getNodesByType(type)
      .map((id) => this.registry.getNode(id))
      .filter((n): n is NodeData => n !== null);
  }

  /**
   * Find nodes matching a predicate.
   */
  findNodes(predicate: (node: NodeData) => boolean): NodeData[] {
    return this.registry.findNodes(predicate);
  }

  /**
   * Get node depth in tree.
   */
  getDepth(id: NodeId): number {
    return getNodeDepth(this.registry, id);
  }

  /**
   * Find common ancestor of nodes.
   */
  getCommonAncestor(ids: readonly NodeId[]): NodeId | null {
    return findCommonAncestor(this.registry, ids);
  }

  // =========================================================================
  // Node Creation
  // =========================================================================

  /**
   * Create a node of the specified type.
   */
  createNode(
    type: NodeType,
    parentId: NodeId,
    position: number = -1,
    options: CreateNodeOptions = {}
  ): NodeId {
    let node: NodeData;

    switch (type) {
      case 'DOCUMENT':
        throw new Error('Cannot create document node directly');
      case 'PAGE':
        node = createPage(options as Parameters<typeof createPage>[0]);
        break;
      case 'FRAME':
        node = createFrame(options as Parameters<typeof createFrame>[0]);
        break;
      case 'GROUP':
        node = createGroup(options as Parameters<typeof createGroup>[0]);
        break;
      case 'VECTOR':
        node = createVector(options as Parameters<typeof createVector>[0]);
        break;
      case 'TEXT':
        node = createText(options as Parameters<typeof createText>[0]);
        break;
      case 'COMPONENT':
        node = createComponent(options as Parameters<typeof createComponent>[0]);
        break;
      case 'INSTANCE':
        if (!('componentId' in options)) {
          throw new Error('componentId required for INSTANCE');
        }
        node = createInstance(options as Parameters<typeof createInstance>[0]);
        break;
      case 'BOOLEAN_OPERATION':
        node = createBooleanOperation(
          options as Parameters<typeof createBooleanOperation>[0]
        );
        break;
      case 'SLICE':
        node = createSlice(options as Parameters<typeof createSlice>[0]);
        break;
      default:
        throw new Error(`Unknown node type: ${type}`);
    }

    const actualPosition = position < 0
      ? this.registry.getChildIds(parentId).length
      : position;

    insertNode(this.registry, node, parentId, actualPosition);

    this.emit('node:created', { nodeId: node.id, nodeType: type });

    return node.id;
  }

  /**
   * Create a frame node.
   */
  createFrame(
    parentId: NodeId,
    options: Parameters<typeof createFrame>[0] = {}
  ): NodeId {
    return this.createNode('FRAME', parentId, -1, options);
  }

  /**
   * Create a vector node.
   */
  createVector(
    parentId: NodeId,
    options: Parameters<typeof createVector>[0] = {}
  ): NodeId {
    return this.createNode('VECTOR', parentId, -1, options);
  }

  /**
   * Create a text node.
   */
  createText(
    parentId: NodeId,
    options: Parameters<typeof createText>[0] = {}
  ): NodeId {
    return this.createNode('TEXT', parentId, -1, options);
  }

  // =========================================================================
  // Node Modification
  // =========================================================================

  /**
   * Update a node's properties.
   */
  updateNode(id: NodeId, updates: Partial<NodeData>): void {
    const node = this.registry.getNode(id);
    if (!node) {
      throw new Error(`Node ${id} not found`);
    }

    // Track changes for events
    const changes: Array<{ path: PropertyPath; oldValue: unknown; newValue: unknown }> = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'type') {
        const oldValue = (node as unknown as Record<string, unknown>)[key];
        if (oldValue !== value) {
          changes.push({ path: [key], oldValue, newValue: value });
        }
      }
    }

    // Apply updates
    this.registry.updateNode(id, (n) => ({
      ...n,
      ...updates,
      id: n.id, // Preserve id
      type: n.type, // Preserve type
    }) as NodeData);

    // Emit events
    for (const change of changes) {
      this.emit('node:propertyChanged', {
        nodeId: id,
        path: change.path,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }
  }

  /**
   * Set a specific property on a node.
   */
  setProperty<K extends keyof NodeData>(
    id: NodeId,
    key: K,
    value: NodeData[K]
  ): void {
    this.updateNode(id, { [key]: value } as Partial<NodeData>);
  }

  // =========================================================================
  // Node Operations
  // =========================================================================

  /**
   * Delete a node and its descendants.
   */
  deleteNode(id: NodeId): void {
    const node = this.registry.getNode(id);
    if (!node) return;

    const deleted = deleteNode(this.registry, id);

    for (const n of deleted) {
      this.emit('node:deleted', {
        nodeId: n.id,
        nodeType: n.type,
        parentId: n.parentId,
      });
    }
  }

  /**
   * Move a node to a new parent.
   */
  moveNode(nodeId: NodeId, newParentId: NodeId, position: number = -1): void {
    const node = this.registry.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const oldParentId = node.parentId;
    const actualPosition = position < 0
      ? this.registry.getChildIds(newParentId).length
      : position;

    moveNode(this.registry, nodeId, newParentId, actualPosition);

    this.emit('node:parentChanged', {
      nodeId,
      oldParentId,
      newParentId,
    });
  }

  /**
   * Reorder a node within its parent.
   */
  reorderNode(nodeId: NodeId, newPosition: number): void {
    const node = this.registry.getNode(nodeId);
    if (!node?.parentId) return;

    reorderNode(this.registry, nodeId, newPosition);

    this.emit('node:childrenReordered', { parentId: node.parentId });
  }

  /**
   * Check if a move would create a cycle.
   */
  wouldCreateCycle(nodeId: NodeId, newParentId: NodeId): boolean {
    return wouldCreateCycle(this.registry, nodeId, newParentId);
  }

  /**
   * Check if a node can be a child of another.
   */
  canBeChildOf(childType: NodeType, parentType: NodeType): boolean {
    return isValidParentChild(parentType, childType);
  }

  // =========================================================================
  // Traversal
  // =========================================================================

  /**
   * Traverse the tree depth-first.
   */
  traverse(
    visitor: (node: NodeData, depth: number) => boolean | void,
    startId?: NodeId
  ): void {
    const start = startId
      ? this.registry.getNode(startId)
      : this.registry.getDocument();

    if (!start) return;

    const stack: Array<{ node: NodeData; depth: number }> = [
      { node: start, depth: 0 },
    ];

    while (stack.length > 0) {
      const { node, depth } = stack.pop()!;

      const result = visitor(node, depth);
      if (result === false) continue;

      // Add children in reverse order so they're processed in order
      const children = this.registry.getChildren(node.id);
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ node: children[i]!, depth: depth + 1 });
      }
    }
  }

  // =========================================================================
  // Versioning
  // =========================================================================

  /**
   * Get the global version of the scene graph.
   */
  getVersion(): number {
    return this.registry.getGlobalVersion();
  }

  /**
   * Get the version of a specific node.
   */
  getNodeVersion(id: NodeId): number {
    return this.registry.getNodeVersion(id);
  }

  // =========================================================================
  // Statistics
  // =========================================================================

  /**
   * Get the total number of nodes.
   */
  get nodeCount(): number {
    return this.registry.size;
  }

  /**
   * Get all node IDs.
   */
  getAllNodeIds(): NodeId[] {
    return this.registry.getAllIds();
  }

  // =========================================================================
  // Serialization
  // =========================================================================

  /**
   * Export the scene graph as JSON.
   */
  toJSON(): Record<string, unknown> {
    return {
      version: '1.0.0',
      nodes: this.registry.toJSON(),
    };
  }
}
