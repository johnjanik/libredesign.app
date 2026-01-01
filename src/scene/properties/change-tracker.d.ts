/**
 * Change tracker for dirty region tracking
 *
 * Tracks which nodes and properties have changed since last render,
 * enabling efficient incremental updates.
 */
import type { NodeId, PropertyPath } from '@core/types/common';
/**
 * Dirty flags for different types of changes
 */
export declare enum DirtyFlag {
    NONE = 0,
    TRANSFORM = 1,// x, y, width, height, rotation
    APPEARANCE = 2,// fills, strokes, effects, opacity
    GEOMETRY = 4,// vectorPaths
    TEXT_CONTENT = 8,// characters, textStyles
    LAYOUT = 16,// constraints, autoLayout
    STRUCTURE = 32,// children, parent
    ALL = 65535
}
/**
 * Get dirty flag for a property path
 */
export declare function getDirtyFlagForProperty(path: PropertyPath): DirtyFlag;
/**
 * Change tracker for efficient dirty region tracking
 */
export declare class ChangeTracker {
    /** Dirty nodes with their flags */
    private dirty;
    /** Whether tracking is enabled */
    private enabled;
    /** Frame counter for debugging */
    private frameCount;
    /**
     * Mark a node as dirty.
     */
    markDirty(nodeId: NodeId, flag?: DirtyFlag): void;
    /**
     * Mark a specific property as dirty.
     */
    markPropertyDirty(nodeId: NodeId, path: PropertyPath): void;
    /**
     * Check if a node is dirty.
     */
    isDirty(nodeId: NodeId): boolean;
    /**
     * Check if a node has a specific dirty flag.
     */
    hasDirtyFlag(nodeId: NodeId, flag: DirtyFlag): boolean;
    /**
     * Get dirty flags for a node.
     */
    getDirtyFlags(nodeId: NodeId): DirtyFlag;
    /**
     * Get dirty properties for a node.
     */
    getDirtyProperties(nodeId: NodeId): string[];
    /**
     * Get all dirty node IDs.
     */
    getDirtyNodes(): NodeId[];
    /**
     * Get all dirty nodes with a specific flag.
     */
    getNodesWithFlag(flag: DirtyFlag): NodeId[];
    /**
     * Clear a specific node's dirty state.
     */
    clearNode(nodeId: NodeId): void;
    /**
     * Clear all dirty state.
     */
    clear(): void;
    /**
     * Get the number of dirty nodes.
     */
    get count(): number;
    /**
     * Check if any nodes are dirty.
     */
    get hasDirtyNodes(): boolean;
    /**
     * Enable or disable tracking.
     */
    setEnabled(enabled: boolean): void;
    /**
     * Check if tracking is enabled.
     */
    isEnabled(): boolean;
    /**
     * Get frame count (for debugging).
     */
    getFrameCount(): number;
    /**
     * Execute a function with tracking disabled.
     */
    withoutTracking<T>(fn: () => T): T;
}
/**
 * Get the global change tracker.
 */
export declare function getChangeTracker(): ChangeTracker;
/**
 * Create a new change tracker (for testing).
 */
export declare function createChangeTracker(): ChangeTracker;
//# sourceMappingURL=change-tracker.d.ts.map