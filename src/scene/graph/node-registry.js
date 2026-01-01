/**
 * Node registry - central storage for all nodes
 */
/**
 * Node registry - stores all nodes indexed by ID
 */
export class NodeRegistry {
    /** All nodes indexed by ID */
    nodes = new Map();
    /** Index by node type for fast type-based queries */
    byType = new Map();
    /** Index by parent for fast child queries */
    byParent = new Map();
    /** Component to instances mapping */
    instancesByComponent = new Map();
    /** Global version counter */
    globalVersion = 0;
    // =========================================================================
    // Core CRUD Operations
    // =========================================================================
    /**
     * Get a node by ID.
     */
    getNode(id) {
        return this.nodes.get(id)?.data ?? null;
    }
    /**
     * Get a node entry (including metadata) by ID.
     */
    getEntry(id) {
        return this.nodes.get(id) ?? null;
    }
    /**
     * Check if a node exists.
     */
    hasNode(id) {
        return this.nodes.has(id);
    }
    /**
     * Add a node to the registry.
     */
    addNode(node, index) {
        if (this.nodes.has(node.id)) {
            throw new Error(`Node ${node.id} already exists`);
        }
        const entry = {
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
            const componentId = node.componentId;
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
    updateNode(id, updater) {
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
    updateIndex(id, index) {
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
    deleteNode(id) {
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
            const componentId = node.componentId;
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
    getNodesByType(type) {
        return Array.from(this.byType.get(type) ?? []);
    }
    /**
     * Get all children of a node.
     */
    getChildIds(parentId) {
        const children = this.byParent.get(parentId);
        if (!children || children.size === 0) {
            return [];
        }
        // Sort by fractional index
        const entries = Array.from(children)
            .map((id) => this.nodes.get(id))
            .filter((e) => e !== undefined);
        entries.sort((a, b) => a.index.localeCompare(b.index));
        return entries.map((e) => e.data.id);
    }
    /**
     * Get all children data of a node.
     */
    getChildren(parentId) {
        return this.getChildIds(parentId)
            .map((id) => this.getNode(id))
            .filter((n) => n !== null);
    }
    /**
     * Get the parent of a node.
     */
    getParent(id) {
        const node = this.getNode(id);
        if (!node || !node.parentId) {
            return null;
        }
        return this.getNode(node.parentId);
    }
    /**
     * Get all ancestors of a node (from parent to root).
     */
    getAncestors(id) {
        const ancestors = [];
        let current = this.getNode(id);
        while (current?.parentId) {
            const parent = this.getNode(current.parentId);
            if (!parent)
                break;
            ancestors.push(parent);
            current = parent;
        }
        return ancestors;
    }
    /**
     * Get all descendants of a node (depth-first).
     */
    getDescendants(id) {
        const descendants = [];
        const stack = this.getChildIds(id);
        while (stack.length > 0) {
            const childId = stack.pop();
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
    getInstancesOfComponent(componentId) {
        return Array.from(this.instancesByComponent.get(componentId) ?? []);
    }
    /**
     * Find nodes matching a predicate.
     */
    findNodes(predicate) {
        const results = [];
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
    getDocument() {
        const docs = this.getNodesByType('DOCUMENT');
        return docs.length > 0 ? this.getNode(docs[0]) : null;
    }
    /**
     * Get all pages.
     */
    getPages() {
        return this.getNodesByType('PAGE')
            .map((id) => this.getNode(id))
            .filter((n) => n !== null);
    }
    // =========================================================================
    // Versioning
    // =========================================================================
    /**
     * Get the global version (incremented on any change).
     */
    getGlobalVersion() {
        return this.globalVersion;
    }
    /**
     * Get the version of a specific node.
     */
    getNodeVersion(id) {
        return this.nodes.get(id)?.version ?? -1;
    }
    // =========================================================================
    // Iteration
    // =========================================================================
    /**
     * Iterate over all nodes.
     */
    *[Symbol.iterator]() {
        for (const entry of this.nodes.values()) {
            yield entry.data;
        }
    }
    /**
     * Get the total number of nodes.
     */
    get size() {
        return this.nodes.size;
    }
    /**
     * Get all node IDs.
     */
    getAllIds() {
        return Array.from(this.nodes.keys());
    }
    // =========================================================================
    // Serialization
    // =========================================================================
    /**
     * Export all nodes as a plain object.
     */
    toJSON() {
        const result = {};
        for (const [id, entry] of this.nodes) {
            result[id] = { data: entry.data, index: entry.index };
        }
        return result;
    }
    /**
     * Clear all nodes.
     */
    clear() {
        this.nodes.clear();
        this.byType.clear();
        this.byParent.clear();
        this.instancesByComponent.clear();
        this.globalVersion++;
    }
}
//# sourceMappingURL=node-registry.js.map