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
export declare class NodeRegistry {
    /** All nodes indexed by ID */
    private nodes;
    /** Index by node type for fast type-based queries */
    private byType;
    /** Index by parent for fast child queries */
    private byParent;
    /** Component to instances mapping */
    private instancesByComponent;
    /** Global version counter */
    private globalVersion;
    /**
     * Get a node by ID.
     */
    getNode(id: NodeId): NodeData | null;
    /**
     * Get a node entry (including metadata) by ID.
     */
    getEntry(id: NodeId): NodeEntry | null;
    /**
     * Check if a node exists.
     */
    hasNode(id: NodeId): boolean;
    /**
     * Add a node to the registry.
     */
    addNode(node: NodeData, index: FractionalIndex): void;
    /**
     * Update a node's data.
     */
    updateNode(id: NodeId, updater: (node: NodeData) => NodeData): NodeData;
    /**
     * Update a node's fractional index.
     */
    updateIndex(id: NodeId, index: FractionalIndex): void;
    /**
     * Delete a node from the registry.
     */
    deleteNode(id: NodeId): NodeData | null;
    /**
     * Get all nodes of a specific type.
     */
    getNodesByType(type: NodeType): NodeId[];
    /**
     * Get all children of a node.
     */
    getChildIds(parentId: NodeId): NodeId[];
    /**
     * Get all children data of a node.
     */
    getChildren(parentId: NodeId): NodeData[];
    /**
     * Get the parent of a node.
     */
    getParent(id: NodeId): NodeData | null;
    /**
     * Get all ancestors of a node (from parent to root).
     */
    getAncestors(id: NodeId): NodeData[];
    /**
     * Get all descendants of a node (depth-first).
     */
    getDescendants(id: NodeId): NodeData[];
    /**
     * Get all instances of a component.
     */
    getInstancesOfComponent(componentId: NodeId): NodeId[];
    /**
     * Find nodes matching a predicate.
     */
    findNodes(predicate: (node: NodeData) => boolean): NodeData[];
    /**
     * Get the document node (root).
     */
    getDocument(): NodeData | null;
    /**
     * Get all pages.
     */
    getPages(): NodeData[];
    /**
     * Get the global version (incremented on any change).
     */
    getGlobalVersion(): number;
    /**
     * Get the version of a specific node.
     */
    getNodeVersion(id: NodeId): number;
    /**
     * Iterate over all nodes.
     */
    [Symbol.iterator](): IterableIterator<NodeData>;
    /**
     * Get the total number of nodes.
     */
    get size(): number;
    /**
     * Get all node IDs.
     */
    getAllIds(): NodeId[];
    /**
     * Export all nodes as a plain object.
     */
    toJSON(): Record<string, {
        data: NodeData;
        index: string;
    }>;
    /**
     * Clear all nodes.
     */
    clear(): void;
}
//# sourceMappingURL=node-registry.d.ts.map