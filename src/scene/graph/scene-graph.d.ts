/**
 * Scene graph - main API for managing the document tree
 */
import type { NodeId, NodeType, PropertyPath } from '@core/types/common';
import { EventEmitter } from '@core/events/event-emitter';
import type { NodeData } from '../nodes/base-node';
import { createFrame, createVector, createImage, createText } from '../nodes/factory';
/**
 * Scene graph events
 */
export type SceneGraphEvents = {
    'node:created': {
        nodeId: NodeId;
        nodeType: NodeType;
    };
    'node:deleted': {
        nodeId: NodeId;
        nodeType: NodeType;
        parentId: NodeId | null;
    };
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
    'node:childrenReordered': {
        parentId: NodeId;
    };
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
export declare class SceneGraph extends EventEmitter<SceneGraphEvents> {
    private registry;
    constructor();
    /**
     * Create a new empty document with one page.
     */
    createNewDocument(name?: string): NodeId;
    /**
     * Clear all nodes.
     */
    clear(): void;
    /**
     * Get a node by ID.
     */
    getNode(id: NodeId): NodeData | null;
    /**
     * Check if a node exists.
     */
    hasNode(id: NodeId): boolean;
    /**
     * Get the document node.
     */
    getDocument(): NodeData | null;
    /**
     * Get all pages.
     */
    getPages(): NodeData[];
    /**
     * Get children of a node.
     */
    getChildren(parentId: NodeId): NodeData[];
    /**
     * Get child IDs of a node.
     */
    getChildIds(parentId: NodeId): NodeId[];
    /**
     * Get the parent of a node.
     */
    getParent(id: NodeId): NodeData | null;
    /**
     * Get ancestors of a node.
     */
    getAncestors(id: NodeId): NodeData[];
    /**
     * Get descendants of a node.
     */
    getDescendants(id: NodeId): NodeData[];
    /**
     * Get nodes by type.
     */
    getNodesByType(type: NodeType): NodeData[];
    /**
     * Find nodes matching a predicate.
     */
    findNodes(predicate: (node: NodeData) => boolean): NodeData[];
    /**
     * Get node depth in tree.
     */
    getDepth(id: NodeId): number;
    /**
     * Find common ancestor of nodes.
     */
    getCommonAncestor(ids: readonly NodeId[]): NodeId | null;
    /**
     * Create a node of the specified type.
     */
    createNode(type: NodeType, parentId: NodeId, position?: number, options?: CreateNodeOptions): NodeId;
    /**
     * Create a frame node.
     */
    createFrame(parentId: NodeId, options?: Parameters<typeof createFrame>[0]): NodeId;
    /**
     * Create a vector node.
     */
    createVector(parentId: NodeId, options?: Parameters<typeof createVector>[0]): NodeId;
    /**
     * Create a text node.
     */
    createText(parentId: NodeId, options?: Parameters<typeof createText>[0]): NodeId;
    /**
     * Create an image node.
     */
    createImage(parentId: NodeId, options: Parameters<typeof createImage>[0]): NodeId;
    /**
     * Update a node's properties.
     */
    updateNode(id: NodeId, updates: Partial<NodeData>): void;
    /**
     * Set a specific property on a node.
     */
    setProperty<K extends keyof NodeData>(id: NodeId, key: K, value: NodeData[K]): void;
    /**
     * Delete a node and its descendants.
     */
    deleteNode(id: NodeId): void;
    /**
     * Move a node to a new parent.
     */
    moveNode(nodeId: NodeId, newParentId: NodeId, position?: number): void;
    /**
     * Reorder a node within its parent.
     */
    reorderNode(nodeId: NodeId, newPosition: number): void;
    /**
     * Check if a move would create a cycle.
     */
    wouldCreateCycle(nodeId: NodeId, newParentId: NodeId): boolean;
    /**
     * Check if a node can be a child of another.
     */
    canBeChildOf(childType: NodeType, parentType: NodeType): boolean;
    /**
     * Traverse the tree depth-first.
     */
    traverse(visitor: (node: NodeData, depth: number) => boolean | void, startId?: NodeId): void;
    /**
     * Get the global version of the scene graph.
     */
    getVersion(): number;
    /**
     * Get the version of a specific node.
     */
    getNodeVersion(id: NodeId): number;
    /**
     * Get the total number of nodes.
     */
    get nodeCount(): number;
    /**
     * Get all node IDs.
     */
    getAllNodeIds(): NodeId[];
    /**
     * Export the scene graph as JSON.
     */
    toJSON(): Record<string, unknown>;
}
//# sourceMappingURL=scene-graph.d.ts.map