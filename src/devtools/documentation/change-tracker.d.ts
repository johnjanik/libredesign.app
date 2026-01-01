/**
 * Change Tracker
 *
 * Tracks changes between document versions (session-only).
 */
import type { NodeId } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
import type { SceneGraph } from '@scene/graph/scene-graph';
/** A snapshot of the document state */
export interface Snapshot {
    readonly id: string;
    readonly label: string;
    readonly timestamp: Date;
    readonly nodes: ReadonlyMap<string, NodeData>;
}
/** A change to a single property */
export interface PropertyChange {
    readonly path: string;
    readonly oldValue: unknown;
    readonly newValue: unknown;
}
/** Changes to a single node */
export interface NodeChange {
    readonly nodeId: string;
    readonly nodeName: string;
    readonly changes: readonly PropertyChange[];
}
/** Set of changes between snapshots */
export interface ChangeSet {
    readonly fromSnapshot: string;
    readonly toSnapshot: string;
    readonly added: readonly NodeId[];
    readonly deleted: readonly NodeId[];
    readonly modified: readonly NodeChange[];
}
/** Human-readable change report */
export interface ChangeReport {
    readonly summary: string;
    readonly addedCount: number;
    readonly deletedCount: number;
    readonly modifiedCount: number;
    readonly details: readonly string[];
}
/**
 * Change Tracker
 *
 * Tracks changes between document versions within a session.
 */
export declare class ChangeTracker {
    private readonly sceneGraph;
    private snapshots;
    private snapshotOrder;
    constructor(sceneGraph: SceneGraph);
    /**
     * Create a snapshot of the current document state.
     */
    createSnapshot(label: string): Snapshot;
    /**
     * Get all snapshots.
     */
    getSnapshots(): Snapshot[];
    /**
     * Get a snapshot by ID.
     */
    getSnapshot(id: string): Snapshot | undefined;
    /**
     * Delete a snapshot.
     */
    deleteSnapshot(id: string): boolean;
    /**
     * Clear all snapshots.
     */
    clearSnapshots(): void;
    /**
     * Compare two snapshots and return the changes.
     */
    compareSnapshots(beforeId: string, afterId: string): ChangeSet | null;
    /**
     * Compare current state to a snapshot.
     */
    compareToSnapshot(snapshotId: string): ChangeSet | null;
    /**
     * Generate a human-readable change report.
     */
    generateChangeReport(changeSet: ChangeSet): ChangeReport;
    private captureAllNodes;
    private cloneNode;
    private compareNodes;
    private deepEqual;
    private formatValue;
}
/**
 * Create a change tracker.
 */
export declare function createChangeTracker(sceneGraph: SceneGraph): ChangeTracker;
//# sourceMappingURL=change-tracker.d.ts.map