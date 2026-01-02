/**
 * Scene graph - main API for managing the document tree
 */
import { EventEmitter } from '@core/events/event-emitter';
import { createDocument, createPage, createFrame, createGroup, createVector, createImage, createText, createComponent, createInstance, createBooleanOperation, createSlice, } from '../nodes/factory';
import { NodeRegistry } from './node-registry';
import { insertNode, deleteNode, moveNode, reorderNode, wouldCreateCycle, isValidParentChild, getNodeDepth, findCommonAncestor, } from './tree-operations';
import { generateFirstIndex } from './fractional-index';
/**
 * Scene graph - the core data structure for the document
 */
export class SceneGraph extends EventEmitter {
    registry = new NodeRegistry();
    constructor() {
        super();
    }
    // =========================================================================
    // Document Lifecycle
    // =========================================================================
    /**
     * Create a new empty document with one page.
     */
    createNewDocument(name) {
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
    clear() {
        this.registry.clear();
        this.emit('document:cleared');
    }
    // =========================================================================
    // Node Access
    // =========================================================================
    /**
     * Get a node by ID.
     */
    getNode(id) {
        return this.registry.getNode(id);
    }
    /**
     * Check if a node exists.
     */
    hasNode(id) {
        return this.registry.hasNode(id);
    }
    /**
     * Get the document node.
     */
    getDocument() {
        return this.registry.getDocument();
    }
    /**
     * Get all pages.
     */
    getPages() {
        return this.registry.getPages();
    }
    /**
     * Get children of a node.
     */
    getChildren(parentId) {
        return this.registry.getChildren(parentId);
    }
    /**
     * Get child IDs of a node.
     */
    getChildIds(parentId) {
        return this.registry.getChildIds(parentId);
    }
    /**
     * Get the parent of a node.
     */
    getParent(id) {
        return this.registry.getParent(id);
    }
    /**
     * Get ancestors of a node.
     */
    getAncestors(id) {
        return this.registry.getAncestors(id);
    }
    /**
     * Get descendants of a node.
     */
    getDescendants(id) {
        return this.registry.getDescendants(id);
    }
    /**
     * Get nodes by type.
     */
    getNodesByType(type) {
        return this.registry.getNodesByType(type)
            .map((id) => this.registry.getNode(id))
            .filter((n) => n !== null);
    }
    /**
     * Find nodes matching a predicate.
     */
    findNodes(predicate) {
        return this.registry.findNodes(predicate);
    }
    /**
     * Get node depth in tree.
     */
    getDepth(id) {
        return getNodeDepth(this.registry, id);
    }
    /**
     * Find common ancestor of nodes.
     */
    getCommonAncestor(ids) {
        return findCommonAncestor(this.registry, ids);
    }
    // =========================================================================
    // Node Creation
    // =========================================================================
    /**
     * Create a node of the specified type.
     */
    createNode(type, parentId, position = -1, options = {}) {
        let node;
        switch (type) {
            case 'DOCUMENT':
                throw new Error('Cannot create document node directly');
            case 'PAGE':
                node = createPage(options);
                break;
            case 'FRAME':
                node = createFrame(options);
                break;
            case 'GROUP':
                node = createGroup(options);
                break;
            case 'VECTOR':
                node = createVector(options);
                break;
            case 'IMAGE':
                if (!('imageRef' in options)) {
                    throw new Error('imageRef required for IMAGE');
                }
                node = createImage(options);
                break;
            case 'TEXT':
                node = createText(options);
                break;
            case 'COMPONENT':
                node = createComponent(options);
                break;
            case 'INSTANCE':
                if (!('componentId' in options)) {
                    throw new Error('componentId required for INSTANCE');
                }
                node = createInstance(options);
                break;
            case 'BOOLEAN_OPERATION':
                node = createBooleanOperation(options);
                break;
            case 'SLICE':
                node = createSlice(options);
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
    createFrame(parentId, options = {}) {
        return this.createNode('FRAME', parentId, -1, options);
    }
    /**
     * Create a vector node.
     */
    createVector(parentId, options = {}) {
        return this.createNode('VECTOR', parentId, -1, options);
    }
    /**
     * Create a text node.
     */
    createText(parentId, options = {}) {
        return this.createNode('TEXT', parentId, -1, options);
    }
    /**
     * Create an image node.
     */
    createImage(parentId, options) {
        return this.createNode('IMAGE', parentId, -1, options);
    }
    // =========================================================================
    // Node Modification
    // =========================================================================
    /**
     * Update a node's properties.
     */
    updateNode(id, updates) {
        const node = this.registry.getNode(id);
        if (!node) {
            throw new Error(`Node ${id} not found`);
        }
        // Track changes for events
        const changes = [];
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id' && key !== 'type') {
                const oldValue = node[key];
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
        }));
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
    setProperty(id, key, value) {
        this.updateNode(id, { [key]: value });
    }
    // =========================================================================
    // Node Operations
    // =========================================================================
    /**
     * Delete a node and its descendants.
     */
    deleteNode(id) {
        const node = this.registry.getNode(id);
        if (!node)
            return;
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
    moveNode(nodeId, newParentId, position = -1) {
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
    reorderNode(nodeId, newPosition) {
        const node = this.registry.getNode(nodeId);
        if (!node?.parentId)
            return;
        reorderNode(this.registry, nodeId, newPosition);
        this.emit('node:childrenReordered', { parentId: node.parentId });
    }
    /**
     * Check if a move would create a cycle.
     */
    wouldCreateCycle(nodeId, newParentId) {
        return wouldCreateCycle(this.registry, nodeId, newParentId);
    }
    /**
     * Check if a node can be a child of another.
     */
    canBeChildOf(childType, parentType) {
        return isValidParentChild(parentType, childType);
    }
    // =========================================================================
    // Traversal
    // =========================================================================
    /**
     * Traverse the tree depth-first.
     */
    traverse(visitor, startId) {
        const start = startId
            ? this.registry.getNode(startId)
            : this.registry.getDocument();
        if (!start)
            return;
        const stack = [
            { node: start, depth: 0 },
        ];
        while (stack.length > 0) {
            const { node, depth } = stack.pop();
            const result = visitor(node, depth);
            if (result === false)
                continue;
            // Add children in reverse order so they're processed in order
            const children = this.registry.getChildren(node.id);
            for (let i = children.length - 1; i >= 0; i--) {
                stack.push({ node: children[i], depth: depth + 1 });
            }
        }
    }
    // =========================================================================
    // Versioning
    // =========================================================================
    /**
     * Get the global version of the scene graph.
     */
    getVersion() {
        return this.registry.getGlobalVersion();
    }
    /**
     * Get the version of a specific node.
     */
    getNodeVersion(id) {
        return this.registry.getNodeVersion(id);
    }
    // =========================================================================
    // Statistics
    // =========================================================================
    /**
     * Get the total number of nodes.
     */
    get nodeCount() {
        return this.registry.size;
    }
    /**
     * Get all node IDs.
     */
    getAllNodeIds() {
        return this.registry.getAllIds();
    }
    // =========================================================================
    // Serialization
    // =========================================================================
    /**
     * Export the scene graph as JSON.
     */
    toJSON() {
        return {
            version: '1.0.0',
            nodes: this.registry.toJSON(),
        };
    }
}
//# sourceMappingURL=scene-graph.js.map