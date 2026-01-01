/**
 * Change tracker for dirty region tracking
 *
 * Tracks which nodes and properties have changed since last render,
 * enabling efficient incremental updates.
 */
/**
 * Dirty flags for different types of changes
 */
export var DirtyFlag;
(function (DirtyFlag) {
    DirtyFlag[DirtyFlag["NONE"] = 0] = "NONE";
    DirtyFlag[DirtyFlag["TRANSFORM"] = 1] = "TRANSFORM";
    DirtyFlag[DirtyFlag["APPEARANCE"] = 2] = "APPEARANCE";
    DirtyFlag[DirtyFlag["GEOMETRY"] = 4] = "GEOMETRY";
    DirtyFlag[DirtyFlag["TEXT_CONTENT"] = 8] = "TEXT_CONTENT";
    DirtyFlag[DirtyFlag["LAYOUT"] = 16] = "LAYOUT";
    DirtyFlag[DirtyFlag["STRUCTURE"] = 32] = "STRUCTURE";
    DirtyFlag[DirtyFlag["ALL"] = 65535] = "ALL";
})(DirtyFlag || (DirtyFlag = {}));
/**
 * Map property paths to dirty flags
 */
const PROPERTY_FLAGS = {
    x: DirtyFlag.TRANSFORM,
    y: DirtyFlag.TRANSFORM,
    width: DirtyFlag.TRANSFORM,
    height: DirtyFlag.TRANSFORM,
    rotation: DirtyFlag.TRANSFORM,
    opacity: DirtyFlag.APPEARANCE,
    blendMode: DirtyFlag.APPEARANCE,
    fills: DirtyFlag.APPEARANCE,
    strokes: DirtyFlag.APPEARANCE,
    strokeWeight: DirtyFlag.APPEARANCE,
    strokeAlign: DirtyFlag.APPEARANCE,
    strokeCap: DirtyFlag.APPEARANCE,
    strokeJoin: DirtyFlag.APPEARANCE,
    effects: DirtyFlag.APPEARANCE,
    vectorPaths: DirtyFlag.GEOMETRY,
    characters: DirtyFlag.TEXT_CONTENT,
    textStyles: DirtyFlag.TEXT_CONTENT,
    textAutoResize: DirtyFlag.TEXT_CONTENT,
    textAlignHorizontal: DirtyFlag.TEXT_CONTENT,
    textAlignVertical: DirtyFlag.TEXT_CONTENT,
    constraints: DirtyFlag.LAYOUT,
    autoLayout: DirtyFlag.LAYOUT,
    childIds: DirtyFlag.STRUCTURE,
    parentId: DirtyFlag.STRUCTURE,
    visible: DirtyFlag.APPEARANCE,
    locked: DirtyFlag.NONE,
    name: DirtyFlag.NONE,
};
/**
 * Get dirty flag for a property path
 */
export function getDirtyFlagForProperty(path) {
    if (path.length === 0)
        return DirtyFlag.ALL;
    const key = path[0];
    return PROPERTY_FLAGS[key] ?? DirtyFlag.ALL;
}
/**
 * Change tracker for efficient dirty region tracking
 */
export class ChangeTracker {
    /** Dirty nodes with their flags */
    dirty = new Map();
    /** Whether tracking is enabled */
    enabled = true;
    /** Frame counter for debugging */
    frameCount = 0;
    /**
     * Mark a node as dirty.
     */
    markDirty(nodeId, flag = DirtyFlag.ALL) {
        if (!this.enabled)
            return;
        const entry = this.dirty.get(nodeId);
        if (entry) {
            entry.flags |= flag;
        }
        else {
            this.dirty.set(nodeId, { flags: flag, properties: new Set() });
        }
    }
    /**
     * Mark a specific property as dirty.
     */
    markPropertyDirty(nodeId, path) {
        if (!this.enabled)
            return;
        const flag = getDirtyFlagForProperty(path);
        const entry = this.dirty.get(nodeId);
        if (entry) {
            entry.flags |= flag;
            entry.properties.add(path.join('.'));
        }
        else {
            const properties = new Set();
            properties.add(path.join('.'));
            this.dirty.set(nodeId, { flags: flag, properties });
        }
    }
    /**
     * Check if a node is dirty.
     */
    isDirty(nodeId) {
        return this.dirty.has(nodeId);
    }
    /**
     * Check if a node has a specific dirty flag.
     */
    hasDirtyFlag(nodeId, flag) {
        const entry = this.dirty.get(nodeId);
        return entry ? (entry.flags & flag) !== 0 : false;
    }
    /**
     * Get dirty flags for a node.
     */
    getDirtyFlags(nodeId) {
        return this.dirty.get(nodeId)?.flags ?? DirtyFlag.NONE;
    }
    /**
     * Get dirty properties for a node.
     */
    getDirtyProperties(nodeId) {
        const entry = this.dirty.get(nodeId);
        return entry ? Array.from(entry.properties) : [];
    }
    /**
     * Get all dirty node IDs.
     */
    getDirtyNodes() {
        return Array.from(this.dirty.keys());
    }
    /**
     * Get all dirty nodes with a specific flag.
     */
    getNodesWithFlag(flag) {
        const result = [];
        for (const [nodeId, entry] of this.dirty) {
            if ((entry.flags & flag) !== 0) {
                result.push(nodeId);
            }
        }
        return result;
    }
    /**
     * Clear a specific node's dirty state.
     */
    clearNode(nodeId) {
        this.dirty.delete(nodeId);
    }
    /**
     * Clear all dirty state.
     */
    clear() {
        this.dirty.clear();
        this.frameCount++;
    }
    /**
     * Get the number of dirty nodes.
     */
    get count() {
        return this.dirty.size;
    }
    /**
     * Check if any nodes are dirty.
     */
    get hasDirtyNodes() {
        return this.dirty.size > 0;
    }
    /**
     * Enable or disable tracking.
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * Check if tracking is enabled.
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Get frame count (for debugging).
     */
    getFrameCount() {
        return this.frameCount;
    }
    /**
     * Execute a function with tracking disabled.
     */
    withoutTracking(fn) {
        const wasEnabled = this.enabled;
        this.enabled = false;
        try {
            return fn();
        }
        finally {
            this.enabled = wasEnabled;
        }
    }
}
/**
 * Singleton change tracker instance
 */
let globalChangeTracker = null;
/**
 * Get the global change tracker.
 */
export function getChangeTracker() {
    if (!globalChangeTracker) {
        globalChangeTracker = new ChangeTracker();
    }
    return globalChangeTracker;
}
/**
 * Create a new change tracker (for testing).
 */
export function createChangeTracker() {
    return new ChangeTracker();
}
//# sourceMappingURL=change-tracker.js.map