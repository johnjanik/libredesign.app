/**
 * Document Serializer
 *
 * Serializes and deserializes scene graphs to/from JSON.
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData } from '@scene/nodes/base-node';

/**
 * Serialized document format
 */
export interface SerializedDocument {
  readonly version: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly nodes: readonly SerializedNode[];
  readonly rootId: NodeId;
}

/**
 * Serialized node format
 */
export interface SerializedNode {
  readonly id: NodeId;
  readonly parentId: NodeId | null;
  readonly childIndex: number;
  readonly data: NodeData;
}

/**
 * Serialization options
 */
export interface SerializationOptions {
  /** Include metadata like timestamps */
  includeMetadata?: boolean | undefined;
  /** Pretty print JSON output */
  prettyPrint?: boolean | undefined;
  /** Custom version string */
  version?: string | undefined;
}

/**
 * Deserialization options
 */
export interface DeserializationOptions {
  /** Whether to validate the structure */
  validate?: boolean | undefined;
  /** Whether to generate new IDs */
  generateNewIds?: boolean | undefined;
}

/**
 * Document Serializer
 */
export class DocumentSerializer {
  private version: string;

  constructor(options: { version?: string | undefined } = {}) {
    this.version = options.version ?? '1.0.0';
  }

  /**
   * Serialize a scene graph to JSON.
   */
  serialize(sceneGraph: SceneGraph, options: SerializationOptions = {}): string {
    const doc = sceneGraph.getDocument();
    if (!doc) {
      throw new Error('Cannot serialize: no document in scene graph');
    }

    const nodes: SerializedNode[] = [];
    this.serializeNode(doc.id, null, 0, sceneGraph, nodes);

    const serialized: SerializedDocument = {
      version: options.version ?? this.version,
      name: doc.name,
      createdAt: options.includeMetadata ? new Date().toISOString() : '',
      updatedAt: options.includeMetadata ? new Date().toISOString() : '',
      nodes,
      rootId: doc.id,
    };

    return options.prettyPrint
      ? JSON.stringify(serialized, null, 2)
      : JSON.stringify(serialized);
  }

  /**
   * Deserialize JSON to a scene graph.
   */
  deserialize(
    json: string,
    sceneGraph: SceneGraph,
    options: DeserializationOptions = {}
  ): void {
    const data = JSON.parse(json) as SerializedDocument;

    if (options.validate) {
      this.validateDocument(data);
    }

    // Clear existing scene graph
    const existingDoc = sceneGraph.getDocument();
    if (existingDoc) {
      // Delete all nodes under the document
      const pageIds = sceneGraph.getChildIds(existingDoc.id);
      for (const pageId of pageIds) {
        this.deleteNodeRecursive(pageId, sceneGraph);
      }
    }

    // Build ID mapping if generating new IDs
    const idMap = new Map<NodeId, NodeId>();
    if (options.generateNewIds) {
      for (const node of data.nodes) {
        // For now, keep original IDs since we don't have a uuid generator here
        idMap.set(node.id, node.id);
      }
    }

    // Create nodes in order (parent before children)
    const sortedNodes = this.sortNodesByDepth(data.nodes);

    for (const serializedNode of sortedNodes) {
      const nodeId = options.generateNewIds
        ? idMap.get(serializedNode.id)!
        : serializedNode.id;

      const parentId = serializedNode.parentId
        ? (options.generateNewIds
          ? idMap.get(serializedNode.parentId)!
          : serializedNode.parentId)
        : null;

      // Create or update the node
      this.restoreNode(nodeId, parentId, serializedNode.data, sceneGraph);
    }
  }

  /**
   * Serialize to a blob for download.
   */
  toBlob(sceneGraph: SceneGraph, options: SerializationOptions = {}): Blob {
    const json = this.serialize(sceneGraph, { ...options, prettyPrint: true });
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Create download URL for the document.
   */
  toDownloadUrl(sceneGraph: SceneGraph, options: SerializationOptions = {}): string {
    const blob = this.toBlob(sceneGraph, options);
    return URL.createObjectURL(blob);
  }

  /**
   * Parse and validate JSON without applying to scene graph.
   */
  parse(json: string): SerializedDocument {
    const data = JSON.parse(json) as SerializedDocument;
    this.validateDocument(data);
    return data;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private serializeNode(
    nodeId: NodeId,
    parentId: NodeId | null,
    childIndex: number,
    sceneGraph: SceneGraph,
    result: SerializedNode[]
  ): void {
    const node = sceneGraph.getNode(nodeId);
    if (!node) return;

    result.push({
      id: nodeId,
      parentId,
      childIndex,
      data: node,
    });

    // Serialize children
    const childIds = sceneGraph.getChildIds(nodeId);
    for (let i = 0; i < childIds.length; i++) {
      this.serializeNode(childIds[i]!, nodeId, i, sceneGraph, result);
    }
  }

  private sortNodesByDepth(nodes: readonly SerializedNode[]): SerializedNode[] {
    // Build parent-child map
    const childrenMap = new Map<NodeId | null, SerializedNode[]>();

    for (const node of nodes) {
      const parentId = node.parentId;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(node);
    }

    // Sort children by index
    for (const children of childrenMap.values()) {
      children.sort((a, b) => a.childIndex - b.childIndex);
    }

    // Traverse breadth-first
    const result: SerializedNode[] = [];
    const queue: (NodeId | null)[] = [null];

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = childrenMap.get(parentId) ?? [];

      for (const child of children) {
        result.push(child);
        queue.push(child.id);
      }
    }

    return result;
  }

  private restoreNode(
    _nodeId: NodeId,
    parentId: NodeId | null,
    data: NodeData,
    sceneGraph: SceneGraph
  ): void {
    // Skip document and page nodes as they're created differently
    if (data.type === 'DOCUMENT' || data.type === 'PAGE') {
      return;
    }

    // For nodes that need a parent
    if (!parentId) {
      return;
    }

    // Extract properties excluding type, id, and childIds
    const { type, id: _id, childIds: _childIds, ...options } = data as NodeData & { id: string; childIds: unknown };

    // Create the node with the scene graph's API
    sceneGraph.createNode(type, parentId, -1, options as Record<string, unknown>);
  }

  private deleteNodeRecursive(nodeId: NodeId, sceneGraph: SceneGraph): void {
    const childIds = sceneGraph.getChildIds(nodeId);
    for (const childId of childIds) {
      this.deleteNodeRecursive(childId, sceneGraph);
    }
    sceneGraph.deleteNode(nodeId);
  }

  private validateDocument(data: unknown): asserts data is SerializedDocument {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid document: not an object');
    }

    const doc = data as Record<string, unknown>;

    if (typeof doc['version'] !== 'string') {
      throw new Error('Invalid document: missing version');
    }

    if (!Array.isArray(doc['nodes'])) {
      throw new Error('Invalid document: missing nodes array');
    }

    if (typeof doc['rootId'] !== 'string') {
      throw new Error('Invalid document: missing rootId');
    }

    // Validate each node
    for (const node of doc['nodes']) {
      this.validateNode(node);
    }
  }

  private validateNode(node: unknown): asserts node is SerializedNode {
    if (!node || typeof node !== 'object') {
      throw new Error('Invalid node: not an object');
    }

    const n = node as Record<string, unknown>;

    if (typeof n['id'] !== 'string') {
      throw new Error('Invalid node: missing id');
    }

    if (n['parentId'] !== null && typeof n['parentId'] !== 'string') {
      throw new Error('Invalid node: invalid parentId');
    }

    if (typeof n['childIndex'] !== 'number') {
      throw new Error('Invalid node: missing childIndex');
    }

    if (!n['data'] || typeof n['data'] !== 'object') {
      throw new Error('Invalid node: missing data');
    }
  }
}

/**
 * Create a document serializer.
 */
export function createDocumentSerializer(options?: {
  version?: string | undefined;
}): DocumentSerializer {
  return new DocumentSerializer(options);
}
