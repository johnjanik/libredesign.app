/**
 * Change Tracker
 *
 * Tracks changes between document versions (session-only).
 */
/**
 * Change Tracker
 *
 * Tracks changes between document versions within a session.
 */
export class ChangeTracker {
    sceneGraph;
    snapshots = new Map();
    snapshotOrder = [];
    constructor(sceneGraph) {
        this.sceneGraph = sceneGraph;
    }
    /**
     * Create a snapshot of the current document state.
     */
    createSnapshot(label) {
        const id = `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const nodes = this.captureAllNodes();
        const snapshot = {
            id,
            label,
            timestamp: new Date(),
            nodes,
        };
        this.snapshots.set(id, snapshot);
        this.snapshotOrder.push(id);
        return snapshot;
    }
    /**
     * Get all snapshots.
     */
    getSnapshots() {
        return this.snapshotOrder.map(id => this.snapshots.get(id)).filter(Boolean);
    }
    /**
     * Get a snapshot by ID.
     */
    getSnapshot(id) {
        return this.snapshots.get(id);
    }
    /**
     * Delete a snapshot.
     */
    deleteSnapshot(id) {
        if (this.snapshots.delete(id)) {
            const index = this.snapshotOrder.indexOf(id);
            if (index > -1) {
                this.snapshotOrder.splice(index, 1);
            }
            return true;
        }
        return false;
    }
    /**
     * Clear all snapshots.
     */
    clearSnapshots() {
        this.snapshots.clear();
        this.snapshotOrder = [];
    }
    /**
     * Compare two snapshots and return the changes.
     */
    compareSnapshots(beforeId, afterId) {
        const before = this.snapshots.get(beforeId);
        const after = this.snapshots.get(afterId);
        if (!before || !after) {
            return null;
        }
        const added = [];
        const deleted = [];
        const modified = [];
        // Find added and modified nodes
        for (const [nodeId, afterNode] of after.nodes) {
            const beforeNode = before.nodes.get(nodeId);
            if (!beforeNode) {
                // Node was added
                added.push(nodeId);
            }
            else {
                // Check for modifications
                const changes = this.compareNodes(beforeNode, afterNode);
                if (changes.length > 0) {
                    modified.push({
                        nodeId,
                        nodeName: afterNode.name,
                        changes,
                    });
                }
            }
        }
        // Find deleted nodes
        for (const [nodeId] of before.nodes) {
            if (!after.nodes.has(nodeId)) {
                deleted.push(nodeId);
            }
        }
        return {
            fromSnapshot: beforeId,
            toSnapshot: afterId,
            added,
            deleted,
            modified,
        };
    }
    /**
     * Compare current state to a snapshot.
     */
    compareToSnapshot(snapshotId) {
        // Create temporary snapshot of current state
        const currentNodes = this.captureAllNodes();
        const tempId = '__current__';
        const tempSnapshot = {
            id: tempId,
            label: 'Current',
            timestamp: new Date(),
            nodes: currentNodes,
        };
        this.snapshots.set(tempId, tempSnapshot);
        const result = this.compareSnapshots(snapshotId, tempId);
        this.snapshots.delete(tempId);
        return result;
    }
    /**
     * Generate a human-readable change report.
     */
    generateChangeReport(changeSet) {
        const details = [];
        // Added nodes
        for (const nodeId of changeSet.added) {
            details.push(`+ Added: ${nodeId}`);
        }
        // Deleted nodes
        for (const nodeId of changeSet.deleted) {
            details.push(`- Deleted: ${nodeId}`);
        }
        // Modified nodes
        for (const nodeChange of changeSet.modified) {
            details.push(`~ Modified: ${nodeChange.nodeName}`);
            for (const change of nodeChange.changes) {
                const oldVal = this.formatValue(change.oldValue);
                const newVal = this.formatValue(change.newValue);
                details.push(`    ${change.path}: ${oldVal} → ${newVal}`);
            }
        }
        const totalChanges = changeSet.added.length + changeSet.deleted.length + changeSet.modified.length;
        let summary;
        if (totalChanges === 0) {
            summary = 'No changes detected.';
        }
        else {
            const parts = [];
            if (changeSet.added.length > 0) {
                parts.push(`${changeSet.added.length} added`);
            }
            if (changeSet.deleted.length > 0) {
                parts.push(`${changeSet.deleted.length} deleted`);
            }
            if (changeSet.modified.length > 0) {
                parts.push(`${changeSet.modified.length} modified`);
            }
            summary = `${totalChanges} changes: ${parts.join(', ')}.`;
        }
        return {
            summary,
            addedCount: changeSet.added.length,
            deletedCount: changeSet.deleted.length,
            modifiedCount: changeSet.modified.length,
            details,
        };
    }
    // ===========================================================================
    // Private Helpers
    // ===========================================================================
    captureAllNodes() {
        const nodes = new Map();
        const doc = this.sceneGraph.getDocument();
        if (!doc)
            return nodes;
        const captureNode = (nodeId) => {
            const node = this.sceneGraph.getNode(nodeId);
            if (!node)
                return;
            // Deep clone the node to capture current state
            nodes.set(nodeId, this.cloneNode(node));
            const childIds = this.sceneGraph.getChildIds(nodeId);
            for (const childId of childIds) {
                captureNode(childId);
            }
        };
        captureNode(doc.id);
        return nodes;
    }
    cloneNode(node) {
        // Deep clone using JSON (simple but effective for serializable data)
        return JSON.parse(JSON.stringify(node));
    }
    compareNodes(before, after) {
        const changes = [];
        // Compare all properties
        const allKeys = new Set([
            ...Object.keys(before),
            ...Object.keys(after),
        ]);
        for (const key of allKeys) {
            // Skip internal/identity properties
            if (key === 'id' || key === 'childIds' || key === 'parentId') {
                continue;
            }
            const beforeValue = before[key];
            const afterValue = after[key];
            if (!this.deepEqual(beforeValue, afterValue)) {
                changes.push({
                    path: key,
                    oldValue: beforeValue,
                    newValue: afterValue,
                });
            }
        }
        return changes;
    }
    deepEqual(a, b) {
        if (a === b)
            return true;
        if (typeof a !== typeof b)
            return false;
        if (a === null || b === null)
            return a === b;
        if (typeof a !== 'object')
            return a === b;
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length)
                return false;
            for (let i = 0; i < a.length; i++) {
                if (!this.deepEqual(a[i], b[i]))
                    return false;
            }
            return true;
        }
        if (Array.isArray(a) || Array.isArray(b))
            return false;
        const aObj = a;
        const bObj = b;
        const aKeys = Object.keys(aObj);
        const bKeys = Object.keys(bObj);
        if (aKeys.length !== bKeys.length)
            return false;
        for (const key of aKeys) {
            if (!bKeys.includes(key))
                return false;
            if (!this.deepEqual(aObj[key], bObj[key]))
                return false;
        }
        return true;
    }
    formatValue(value) {
        if (value === undefined)
            return 'undefined';
        if (value === null)
            return 'null';
        if (typeof value === 'string')
            return `"${value}"`;
        if (typeof value === 'number' || typeof value === 'boolean')
            return String(value);
        if (Array.isArray(value))
            return `[${value.length} items]`;
        if (typeof value === 'object')
            return `{object}`;
        return String(value);
    }
}
/**
 * Create a change tracker.
 */
export function createChangeTracker(sceneGraph) {
    return new ChangeTracker(sceneGraph);
}
//# sourceMappingURL=change-tracker.js.map