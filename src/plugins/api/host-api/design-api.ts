/**
 * Design API
 *
 * Host API for reading and writing design nodes.
 * Provides the core design manipulation functionality for plugins.
 */

import type { SerializableValue } from '../../types/serialization';
import type {
  SerializedNode,
  NodeQuery,
  CreateNodeOptions,
  NodeChanges,
  Bounds,
  Transform,
} from '../../types/api-types';

/**
 * Scene graph interface for design operations
 */
export interface SceneGraphAdapter {
  /** Get node by ID */
  getNode(id: string): unknown | null;
  /** Get child IDs of a node */
  getChildIds(nodeId: string): string[];
  /** Get parent ID of a node */
  getParentId(nodeId: string): string | null;
  /** Get currently selected node IDs */
  getSelectedIds(): string[];
  /** Find nodes matching query */
  findNodes(query: NodeQuery): string[];
  /** Create a new node */
  createNode(parentId: string, type: string, properties: Record<string, unknown>): string;
  /** Update node properties */
  updateNode(nodeId: string, changes: Record<string, unknown>): void;
  /** Delete a node */
  deleteNode(nodeId: string): void;
  /** Duplicate a node */
  duplicateNode(nodeId: string): string;
  /** Group nodes */
  groupNodes(nodeIds: string[]): string;
  /** Ungroup a node */
  ungroupNode(nodeId: string): string[];
  /** Get node bounds */
  getNodeBounds(nodeId: string): Bounds | null;
  /** Get node transform */
  getNodeTransform(nodeId: string): Transform | null;
}

/**
 * Serialize a node for plugin consumption
 */
function serializeNode(adapter: SceneGraphAdapter, nodeId: string): SerializedNode | null {
  const node = adapter.getNode(nodeId);
  if (!node) return null;

  const nodeObj = node as Record<string, unknown>;
  const bounds = adapter.getNodeBounds(nodeId) ?? { x: 0, y: 0, width: 0, height: 0 };
  const transform = adapter.getNodeTransform(nodeId) ?? { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

  return {
    id: nodeId,
    type: (nodeObj['type'] as string) ?? 'UNKNOWN',
    name: (nodeObj['name'] as string) ?? '',
    visible: (nodeObj['visible'] as boolean) ?? true,
    locked: (nodeObj['locked'] as boolean) ?? false,
    opacity: (nodeObj['opacity'] as number) ?? 1,
    bounds,
    transform,
    parentId: adapter.getParentId(nodeId),
    childIds: adapter.getChildIds(nodeId),
    properties: extractProperties(nodeObj),
  };
}

/**
 * Extract serializable properties from a node
 */
function extractProperties(node: Record<string, unknown>): Record<string, SerializableValue> {
  const props: Record<string, SerializableValue> = {};
  const skipKeys = new Set(['id', 'type', 'name', 'visible', 'locked', 'opacity', 'children', 'parent']);

  for (const [key, value] of Object.entries(node)) {
    if (skipKeys.has(key)) continue;
    if (typeof value === 'function') continue;
    if (value === undefined) continue;

    // Only include serializable values
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      Array.isArray(value) ||
      (typeof value === 'object' && value !== null)
    ) {
      props[key] = value as SerializableValue;
    }
  }

  return props;
}

/**
 * Create the Design API handlers
 */
export function createDesignAPI(adapter: SceneGraphAdapter) {
  return {
    /**
     * Get currently selected nodes
     */
    'design.getSelection': async (): Promise<SerializedNode[]> => {
      const ids = adapter.getSelectedIds();
      const nodes: SerializedNode[] = [];
      for (const id of ids) {
        const node = serializeNode(adapter, id);
        if (node) nodes.push(node);
      }
      return nodes;
    },

    /**
     * Get a node by ID
     */
    'design.getNode': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<SerializedNode | null> => {
      const id = args[0];
      if (typeof id !== 'string') {
        throw new Error('Invalid node ID');
      }
      return serializeNode(adapter, id);
    },

    /**
     * Get children of a node
     */
    'design.getChildren': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<SerializedNode[]> => {
      const id = args[0];
      if (typeof id !== 'string') {
        throw new Error('Invalid node ID');
      }
      const childIds = adapter.getChildIds(id);
      const nodes: SerializedNode[] = [];
      for (const childId of childIds) {
        const node = serializeNode(adapter, childId);
        if (node) nodes.push(node);
      }
      return nodes;
    },

    /**
     * Get parent of a node
     */
    'design.getParent': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<SerializedNode | null> => {
      const id = args[0];
      if (typeof id !== 'string') {
        throw new Error('Invalid node ID');
      }
      const parentId = adapter.getParentId(id);
      if (!parentId) return null;
      return serializeNode(adapter, parentId);
    },

    /**
     * Find nodes matching a query
     */
    'design.findNodes': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<SerializedNode[]> => {
      const query = args[0] as NodeQuery;
      if (typeof query !== 'object' || query === null) {
        throw new Error('Invalid query');
      }
      const ids = adapter.findNodes(query);
      const nodes: SerializedNode[] = [];
      for (const id of ids) {
        const node = serializeNode(adapter, id);
        if (node) nodes.push(node);
      }
      return nodes;
    },

    /**
     * Create a new node
     */
    'design.createNode': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<string> => {
      const optionsArg = args[0];
      if (typeof optionsArg !== 'object' || optionsArg === null) {
        throw new Error('Invalid options');
      }
      const options = optionsArg as unknown as CreateNodeOptions;

      const parentId = args[1] as string | undefined;
      if (parentId !== undefined && typeof parentId !== 'string') {
        throw new Error('Invalid parent ID');
      }

      const properties: Record<string, unknown> = {
        ...options.properties,
      };

      if (options.name) {
        properties['name'] = options.name;
      }

      if (options.bounds) {
        if (options.bounds.x !== undefined) properties['x'] = options.bounds.x;
        if (options.bounds.y !== undefined) properties['y'] = options.bounds.y;
        if (options.bounds.width !== undefined) properties['width'] = options.bounds.width;
        if (options.bounds.height !== undefined) properties['height'] = options.bounds.height;
      }

      return adapter.createNode(parentId ?? 'root', options.type, properties);
    },

    /**
     * Update a node
     */
    'design.updateNode': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const id = args[0];
      const changes = args[1] as NodeChanges;

      if (typeof id !== 'string') {
        throw new Error('Invalid node ID');
      }
      if (typeof changes !== 'object' || changes === null) {
        throw new Error('Invalid changes');
      }

      const updates: Record<string, unknown> = {};

      if (changes.name !== undefined) updates['name'] = changes.name;
      if (changes.visible !== undefined) updates['visible'] = changes.visible;
      if (changes.locked !== undefined) updates['locked'] = changes.locked;
      if (changes.opacity !== undefined) updates['opacity'] = changes.opacity;

      if (changes.bounds) {
        if (changes.bounds.x !== undefined) updates['x'] = changes.bounds.x;
        if (changes.bounds.y !== undefined) updates['y'] = changes.bounds.y;
        if (changes.bounds.width !== undefined) updates['width'] = changes.bounds.width;
        if (changes.bounds.height !== undefined) updates['height'] = changes.bounds.height;
      }

      if (changes.properties) {
        Object.assign(updates, changes.properties);
      }

      adapter.updateNode(id, updates);
    },

    /**
     * Delete a node
     */
    'design.deleteNode': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const id = args[0];
      if (typeof id !== 'string') {
        throw new Error('Invalid node ID');
      }
      adapter.deleteNode(id);
    },

    /**
     * Duplicate a node
     */
    'design.duplicateNode': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<string> => {
      const id = args[0];
      if (typeof id !== 'string') {
        throw new Error('Invalid node ID');
      }
      return adapter.duplicateNode(id);
    },

    /**
     * Group nodes
     */
    'design.groupNodes': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<string> => {
      const ids = args[0];
      if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
        throw new Error('Invalid node IDs');
      }
      return adapter.groupNodes(ids as string[]);
    },

    /**
     * Ungroup a node
     */
    'design.ungroupNode': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<string[]> => {
      const id = args[0];
      if (typeof id !== 'string') {
        throw new Error('Invalid node ID');
      }
      return adapter.ungroupNode(id);
    },
  };
}

export type DesignAPIHandlers = ReturnType<typeof createDesignAPI>;
