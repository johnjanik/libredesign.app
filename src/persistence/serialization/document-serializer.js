/**
 * Document Serializer
 *
 * Serializes and deserializes scene graphs to/from JSON.
 */
/**
 * Document Serializer
 */
export class DocumentSerializer {
    version;
    constructor(options = {}) {
        this.version = options.version ?? '1.0.0';
    }
    /**
     * Serialize a scene graph to JSON.
     */
    serialize(sceneGraph, options = {}) {
        const doc = sceneGraph.getDocument();
        if (!doc) {
            throw new Error('Cannot serialize: no document in scene graph');
        }
        const nodes = [];
        this.serializeNode(doc.id, null, 0, sceneGraph, nodes);
        const serialized = {
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
    deserialize(json, sceneGraph, options = {}) {
        const data = JSON.parse(json);
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
        const idMap = new Map();
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
                ? idMap.get(serializedNode.id)
                : serializedNode.id;
            const parentId = serializedNode.parentId
                ? (options.generateNewIds
                    ? idMap.get(serializedNode.parentId)
                    : serializedNode.parentId)
                : null;
            // Create or update the node
            this.restoreNode(nodeId, parentId, serializedNode.data, sceneGraph);
        }
    }
    /**
     * Serialize to a blob for download.
     */
    toBlob(sceneGraph, options = {}) {
        const json = this.serialize(sceneGraph, { ...options, prettyPrint: true });
        return new Blob([json], { type: 'application/json' });
    }
    /**
     * Create download URL for the document.
     */
    toDownloadUrl(sceneGraph, options = {}) {
        const blob = this.toBlob(sceneGraph, options);
        return URL.createObjectURL(blob);
    }
    /**
     * Parse and validate JSON without applying to scene graph.
     */
    parse(json) {
        const data = JSON.parse(json);
        this.validateDocument(data);
        return data;
    }
    // =========================================================================
    // Private Methods
    // =========================================================================
    serializeNode(nodeId, parentId, childIndex, sceneGraph, result) {
        const node = sceneGraph.getNode(nodeId);
        if (!node)
            return;
        result.push({
            id: nodeId,
            parentId,
            childIndex,
            data: node,
        });
        // Serialize children
        const childIds = sceneGraph.getChildIds(nodeId);
        for (let i = 0; i < childIds.length; i++) {
            this.serializeNode(childIds[i], nodeId, i, sceneGraph, result);
        }
    }
    sortNodesByDepth(nodes) {
        // Build parent-child map
        const childrenMap = new Map();
        for (const node of nodes) {
            const parentId = node.parentId;
            if (!childrenMap.has(parentId)) {
                childrenMap.set(parentId, []);
            }
            childrenMap.get(parentId).push(node);
        }
        // Sort children by index
        for (const children of childrenMap.values()) {
            children.sort((a, b) => a.childIndex - b.childIndex);
        }
        // Traverse breadth-first
        const result = [];
        const queue = [null];
        while (queue.length > 0) {
            const parentId = queue.shift();
            const children = childrenMap.get(parentId) ?? [];
            for (const child of children) {
                result.push(child);
                queue.push(child.id);
            }
        }
        return result;
    }
    restoreNode(_nodeId, parentId, data, sceneGraph) {
        // Skip document and page nodes as they're created differently
        if (data.type === 'DOCUMENT' || data.type === 'PAGE') {
            return;
        }
        // For nodes that need a parent
        if (!parentId) {
            return;
        }
        // Extract properties excluding type, id, and childIds
        const { type, id: _id, childIds: _childIds, ...options } = data;
        // Create the node with the scene graph's API
        sceneGraph.createNode(type, parentId, -1, options);
    }
    deleteNodeRecursive(nodeId, sceneGraph) {
        const childIds = sceneGraph.getChildIds(nodeId);
        for (const childId of childIds) {
            this.deleteNodeRecursive(childId, sceneGraph);
        }
        sceneGraph.deleteNode(nodeId);
    }
    validateDocument(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid document: not an object');
        }
        const doc = data;
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
    validateNode(node) {
        if (!node || typeof node !== 'object') {
            throw new Error('Invalid node: not an object');
        }
        const n = node;
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
export function createDocumentSerializer(options) {
    return new DocumentSerializer(options);
}
//# sourceMappingURL=document-serializer.js.map