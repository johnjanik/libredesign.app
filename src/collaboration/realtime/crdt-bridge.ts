/**
 * CRDT Bridge - Connects Y.js CRDT to the SceneGraph
 *
 * This bridge synchronizes the local scene graph with a Y.js document,
 * enabling real-time collaborative editing. It handles:
 * - Bidirectional sync between SceneGraph and Y.js
 * - Conflict resolution through Y.js CRDT semantics
 * - Operation transformation for concurrent edits
 */

import * as Y from 'yjs';
import { EventEmitter } from '@core/events/event-emitter';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData } from '@scene/nodes/base-node';
import type { NodeId, NodeType, PropertyPath } from '@core/types/common';
import type { DocumentId, UserId, Operation } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface CRDTBridgeOptions {
  /** The scene graph to synchronize */
  readonly sceneGraph: SceneGraph;
  /** Document ID for this collaboration session */
  readonly documentId: DocumentId;
  /** Current user ID */
  readonly userId: UserId;
  /** Callback when local changes need to be sent to peers */
  readonly onUpdate?: (update: Uint8Array, origin: string) => void;
}

export interface CRDTBridgeEvents {
  'sync:started': undefined;
  'sync:completed': undefined;
  'operation:local': Operation;
  'operation:remote': Operation;
  'conflict:detected': { nodeId: NodeId; property: string };
  [key: string]: unknown;
}

// =============================================================================
// CRDT Bridge
// =============================================================================

export class CRDTBridge extends EventEmitter<CRDTBridgeEvents> {
  private readonly yDoc: Y.Doc;
  private readonly yNodes: Y.Map<Y.Map<unknown>>;
  private readonly yMeta: Y.Map<unknown>;
  private readonly sceneGraph: SceneGraph;
  private readonly _documentId: DocumentId;
  private readonly userId: UserId;
  private readonly onUpdateCallback: ((update: Uint8Array, origin: string) => void) | undefined;

  // Sync state
  private isApplyingRemote = false;
  private isApplyingLocal = false;

  // Scene graph event unsubscribers
  private unsubscribers: Array<() => void> = [];

  constructor(options: CRDTBridgeOptions) {
    super();
    this.sceneGraph = options.sceneGraph;
    this._documentId = options.documentId;
    this.userId = options.userId;
    this.onUpdateCallback = options.onUpdate ?? undefined;

    // Initialize Y.js document
    this.yDoc = new Y.Doc();
    this.yNodes = this.yDoc.getMap('nodes');
    this.yMeta = this.yDoc.getMap('meta');

    // Set up Y.js update handler
    this.yDoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'local' && this.onUpdateCallback) {
        this.onUpdateCallback(update, String(origin));
      }
    });

    // Set up Y.js observation
    this.observeYChanges();

    // Set up scene graph observation
    this.observeSceneGraph();
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Get the Y.js document for external sync providers
   */
  getYDoc(): Y.Doc {
    return this.yDoc;
  }

  /**
   * Apply a Y.js update from a remote peer
   */
  applyUpdate(update: Uint8Array, origin = 'remote'): void {
    this.isApplyingRemote = true;
    try {
      Y.applyUpdate(this.yDoc, update, origin);
    } finally {
      this.isApplyingRemote = false;
    }
  }

  /**
   * Get the current state vector for sync
   */
  getStateVector(): Uint8Array {
    return Y.encodeStateVector(this.yDoc);
  }

  /**
   * Get updates since a given state vector
   */
  getUpdatesSince(stateVector: Uint8Array): Uint8Array {
    return Y.encodeStateAsUpdate(this.yDoc, stateVector);
  }

  /**
   * Get the full document state
   */
  getFullState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.yDoc);
  }

  /**
   * Initialize from existing scene graph state
   * Call this after loading a document to populate Y.js
   */
  initializeFromSceneGraph(): void {
    this.emit('sync:started');
    this.isApplyingLocal = true;

    try {
      this.yDoc.transact(() => {
        // Clear existing Y.js state
        this.yNodes.clear();

        // Get all nodes from scene graph
        const doc = this.sceneGraph.getDocument();
        if (!doc) return;

        // Recursively add all nodes
        this.addNodeToYjs(doc);
        this.addChildrenToYjs(doc.id);

        // Store document metadata
        this.yMeta.set('documentId', this._documentId);
        this.yMeta.set('lastModified', Date.now());
      }, 'local');
    } finally {
      this.isApplyingLocal = false;
    }

    this.emit('sync:completed');
  }

  /**
   * Initialize from Y.js state (when joining existing session)
   * Call this after receiving initial sync from server
   */
  initializeFromYjs(): void {
    this.emit('sync:started');
    this.isApplyingRemote = true;

    try {
      // Clear scene graph
      this.sceneGraph.clear();

      // Find document node
      let docId: NodeId | null = null;
      this.yNodes.forEach((yNode, id) => {
        const type = yNode.get('type') as string;
        if (type === 'DOCUMENT') {
          docId = id as NodeId;
        }
      });

      if (!docId) {
        console.warn('[CRDTBridge] No document node found in Y.js state');
        return;
      }

      // Recursively build scene graph from Y.js
      this.buildNodeFromYjs(docId, null);
    } finally {
      this.isApplyingRemote = false;
    }

    this.emit('sync:completed');
  }

  /**
   * Clean up and disconnect
   */
  destroy(): void {
    // Unsubscribe from scene graph events
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    // Destroy Y.js document
    this.yDoc.destroy();
  }

  // ===========================================================================
  // Private Methods - Y.js → SceneGraph
  // ===========================================================================

  private observeYChanges(): void {
    this.yNodes.observeDeep((events: Y.YEvent<Y.Map<unknown>>[]) => {
      if (this.isApplyingLocal) return;

      this.isApplyingRemote = true;
      try {
        for (const event of events) {
          this.handleYEvent(event);
        }
      } finally {
        this.isApplyingRemote = false;
      }
    });
  }

  private handleYEvent(event: Y.YEvent<Y.Map<unknown>>): void {
    if (event instanceof Y.YMapEvent) {
      const target = event.target;

      // Check if this is a top-level node addition/deletion
      if (target === this.yNodes) {
        event.changes.keys.forEach((_change, key) => {
          const action = event.changes.keys.get(key)?.action;
          if (action === 'add') {
            this.handleNodeAdded(key as NodeId);
          } else if (action === 'delete') {
            this.handleNodeDeleted(key as NodeId);
          }
        });
      } else {
        // This is a property change on an existing node
        const nodeId = this.findNodeIdForYMap(target as Y.Map<unknown>);
        if (nodeId) {
          event.changes.keys.forEach((_change, key) => {
            if (key !== 'id' && key !== 'type' && key !== 'parentId' && key !== 'index') {
              const newValue = (target as Y.Map<unknown>).get(key);
              this.handlePropertyChanged(nodeId, [key], newValue);
            }
          });
        }
      }
    }
  }

  private handleNodeAdded(nodeId: NodeId): void {
    const yNode = this.yNodes.get(nodeId);
    if (!yNode) return;

    const parentId = yNode.get('parentId') as NodeId | null;
    const nodeType = yNode.get('type') as NodeType;

    if (!parentId) {
      // This is the document node - create new document
      const data = yNode.get('data') as Record<string, unknown> | undefined;
      const name = data?.['name'] as string | undefined;
      this.sceneGraph.createNewDocument(name);
    } else {
      // Create child node
      this.buildNodeFromYjs(nodeId, parentId);
    }

    this.emit('operation:remote', {
      id: `${Date.now()}-${nodeId}`,
      type: 'node:create',
      userId: 'remote',
      timestamp: Date.now(),
      documentId: this._documentId,
      nodeType,
      parentId: parentId ?? ('' as NodeId),
      position: -1,
      data: Object.fromEntries(yNode.entries()),
      nodeId,
    } as Operation);
  }

  private handleNodeDeleted(nodeId: NodeId): void {
    const node = this.sceneGraph.getNode(nodeId);
    if (node) {
      this.sceneGraph.deleteNode(nodeId);

      this.emit('operation:remote', {
        id: `${Date.now()}-${nodeId}`,
        type: 'node:delete',
        userId: 'remote',
        timestamp: Date.now(),
        documentId: this._documentId,
        nodeId,
      } as Operation);
    }
  }

  private handlePropertyChanged(nodeId: NodeId, path: PropertyPath, newValue: unknown): void {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node || path.length === 0) return;

    // Build update object from path
    const update: Record<string, unknown> = {};
    const firstKey = path[0];
    if (firstKey === undefined) return;

    if (path.length === 1) {
      update[firstKey] = newValue;
    } else {
      // Handle nested paths
      let current = update;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (key === undefined) return;
        current[key] = {};
        current = current[key] as Record<string, unknown>;
      }
      const lastKey = path[path.length - 1];
      if (lastKey !== undefined) {
        current[lastKey] = newValue;
      }
    }

    this.sceneGraph.updateNode(nodeId, update);

    const nodeRecord = node as unknown as Record<string, unknown>;
    this.emit('operation:remote', {
      id: `${Date.now()}-${nodeId}-${path.join('.')}`,
      type: 'node:update',
      userId: 'remote',
      timestamp: Date.now(),
      documentId: this._documentId,
      nodeId,
      path,
      oldValue: nodeRecord[firstKey],
      newValue,
    } as Operation);
  }

  private findNodeIdForYMap(yMap: Y.Map<unknown>): NodeId | null {
    for (const [id, node] of this.yNodes.entries()) {
      if (node === yMap) {
        return id as NodeId;
      }
    }
    return null;
  }

  private buildNodeFromYjs(nodeId: NodeId, parentId: NodeId | null): void {
    const yNode = this.yNodes.get(nodeId);
    if (!yNode) return;

    const type = yNode.get('type') as NodeType;
    const data: Record<string, unknown> = {};

    // Extract all data properties
    yNode.forEach((value, key) => {
      if (key !== 'id' && key !== 'type' && key !== 'parentId' && key !== 'index') {
        data[key] = value;
      }
    });

    if (type === 'DOCUMENT') {
      // Document node - already created
      const name = data['name'] as string | undefined;
      this.sceneGraph.createNewDocument(name);
    } else if (parentId) {
      // Create child node
      try {
        this.sceneGraph.createNode(type, parentId, -1, data);
      } catch (error) {
        console.warn(`[CRDTBridge] Failed to create node ${nodeId}:`, error);
      }
    }

    // Recursively build children
    this.yNodes.forEach((childYNode, childId) => {
      if (childYNode.get('parentId') === nodeId) {
        this.buildNodeFromYjs(childId as NodeId, nodeId);
      }
    });
  }

  // ===========================================================================
  // Private Methods - SceneGraph → Y.js
  // ===========================================================================

  private observeSceneGraph(): void {
    // Listen for node creation
    this.unsubscribers.push(
      this.sceneGraph.on('node:created', ({ nodeId, nodeType }) => {
        if (this.isApplyingRemote) return;
        this.handleLocalNodeCreated(nodeId, nodeType);
      })
    );

    // Listen for node deletion
    this.unsubscribers.push(
      this.sceneGraph.on('node:deleted', ({ nodeId }) => {
        if (this.isApplyingRemote) return;
        this.handleLocalNodeDeleted(nodeId);
      })
    );

    // Listen for property changes
    this.unsubscribers.push(
      this.sceneGraph.on('node:propertyChanged', ({ nodeId, path, oldValue, newValue }) => {
        if (this.isApplyingRemote) return;
        this.handleLocalPropertyChanged(nodeId, path, oldValue, newValue);
      })
    );

    // Listen for parent changes
    this.unsubscribers.push(
      this.sceneGraph.on('node:parentChanged', ({ nodeId, oldParentId, newParentId }) => {
        if (this.isApplyingRemote) return;
        this.handleLocalParentChanged(nodeId, oldParentId, newParentId);
      })
    );
  }

  private handleLocalNodeCreated(nodeId: NodeId, nodeType: NodeType): void {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return;

    this.isApplyingLocal = true;
    try {
      this.yDoc.transact(() => {
        this.addNodeToYjs(node);
      }, 'local');
    } finally {
      this.isApplyingLocal = false;
    }

    const parent = this.sceneGraph.getParent(nodeId);
    this.emit('operation:local', {
      id: `${Date.now()}-${nodeId}`,
      type: 'node:create',
      userId: this.userId,
      timestamp: Date.now(),
      documentId: this._documentId,
      nodeType,
      parentId: parent?.id ?? ('' as NodeId),
      position: -1,
      data: node as unknown as Record<string, unknown>,
      nodeId,
    } as Operation);
  }

  private handleLocalNodeDeleted(nodeId: NodeId): void {
    this.isApplyingLocal = true;
    try {
      this.yDoc.transact(() => {
        this.yNodes.delete(nodeId);
      }, 'local');
    } finally {
      this.isApplyingLocal = false;
    }

    this.emit('operation:local', {
      id: `${Date.now()}-${nodeId}`,
      type: 'node:delete',
      userId: this.userId,
      timestamp: Date.now(),
      documentId: this._documentId,
      nodeId,
    } as Operation);
  }

  private handleLocalPropertyChanged(
    nodeId: NodeId,
    path: PropertyPath,
    oldValue: unknown,
    newValue: unknown
  ): void {
    const yNode = this.yNodes.get(nodeId);
    if (!yNode || path.length === 0) return;

    const rootKey = path[0];
    if (rootKey === undefined) return;

    this.isApplyingLocal = true;
    try {
      this.yDoc.transact(() => {
        // Handle simple property path
        if (path.length === 1) {
          yNode.set(String(rootKey), newValue);
        } else {
          // For nested paths, update the entire nested object
          const node = this.sceneGraph.getNode(nodeId);
          if (node) {
            const nodeRecord = node as unknown as Record<string, unknown>;
            yNode.set(String(rootKey), nodeRecord[rootKey]);
          }
        }
      }, 'local');
    } finally {
      this.isApplyingLocal = false;
    }

    this.emit('operation:local', {
      id: `${Date.now()}-${nodeId}-${path.join('.')}`,
      type: 'node:update',
      userId: this.userId,
      timestamp: Date.now(),
      documentId: this._documentId,
      nodeId,
      path,
      oldValue,
      newValue,
    } as Operation);
  }

  private handleLocalParentChanged(
    nodeId: NodeId,
    oldParentId: NodeId | null,
    newParentId: NodeId | null
  ): void {
    const yNode = this.yNodes.get(nodeId);
    if (!yNode) return;

    this.isApplyingLocal = true;
    try {
      this.yDoc.transact(() => {
        yNode.set('parentId', newParentId);
      }, 'local');
    } finally {
      this.isApplyingLocal = false;
    }

    this.emit('operation:local', {
      id: `${Date.now()}-${nodeId}-move`,
      type: 'node:move',
      userId: this.userId,
      timestamp: Date.now(),
      documentId: this._documentId,
      nodeId,
      oldParentId: oldParentId ?? ('' as NodeId),
      newParentId: newParentId ?? ('' as NodeId),
      position: -1,
    } as Operation);
  }

  // ===========================================================================
  // Private Methods - Helpers
  // ===========================================================================

  private addNodeToYjs(node: NodeData): void {
    const yNode = new Y.Map<unknown>();

    // Set core properties
    yNode.set('id', node.id);
    yNode.set('type', node.type);

    // Set parent ID (from registry)
    const parent = this.sceneGraph.getParent(node.id);
    yNode.set('parentId', parent?.id ?? null);

    // Copy all other properties
    for (const [key, value] of Object.entries(node)) {
      if (key !== 'id' && key !== 'type') {
        yNode.set(key, this.serializeValue(value));
      }
    }

    this.yNodes.set(node.id, yNode);
  }

  private addChildrenToYjs(parentId: NodeId): void {
    const children = this.sceneGraph.getChildren(parentId);
    for (const child of children) {
      this.addNodeToYjs(child);
      this.addChildrenToYjs(child.id);
    }
  }

  private serializeValue(value: unknown): unknown {
    // Handle special cases for Y.js compatibility
    if (value === undefined) return null;
    if (Array.isArray(value)) {
      return value.map((v) => this.serializeValue(v));
    }
    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.serializeValue(v);
      }
      return result;
    }
    return value;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a CRDT bridge instance
 */
export function createCRDTBridge(options: CRDTBridgeOptions): CRDTBridge {
  return new CRDTBridge(options);
}
