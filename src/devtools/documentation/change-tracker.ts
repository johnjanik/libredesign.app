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
export class ChangeTracker {
  private snapshots: Map<string, Snapshot> = new Map();
  private snapshotOrder: string[] = [];

  constructor(private readonly sceneGraph: SceneGraph) {}

  /**
   * Create a snapshot of the current document state.
   */
  createSnapshot(label: string): Snapshot {
    const id = `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nodes = this.captureAllNodes();

    const snapshot: Snapshot = {
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
  getSnapshots(): Snapshot[] {
    return this.snapshotOrder.map(id => this.snapshots.get(id)!).filter(Boolean);
  }

  /**
   * Get a snapshot by ID.
   */
  getSnapshot(id: string): Snapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Delete a snapshot.
   */
  deleteSnapshot(id: string): boolean {
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
  clearSnapshots(): void {
    this.snapshots.clear();
    this.snapshotOrder = [];
  }

  /**
   * Compare two snapshots and return the changes.
   */
  compareSnapshots(beforeId: string, afterId: string): ChangeSet | null {
    const before = this.snapshots.get(beforeId);
    const after = this.snapshots.get(afterId);

    if (!before || !after) {
      return null;
    }

    const added: NodeId[] = [];
    const deleted: NodeId[] = [];
    const modified: NodeChange[] = [];

    // Find added and modified nodes
    for (const [nodeId, afterNode] of after.nodes) {
      const beforeNode = before.nodes.get(nodeId);

      if (!beforeNode) {
        // Node was added
        added.push(nodeId as NodeId);
      } else {
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
        deleted.push(nodeId as NodeId);
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
  compareToSnapshot(snapshotId: string): ChangeSet | null {
    // Create temporary snapshot of current state
    const currentNodes = this.captureAllNodes();
    const tempId = '__current__';

    const tempSnapshot: Snapshot = {
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
  generateChangeReport(changeSet: ChangeSet): ChangeReport {
    const details: string[] = [];

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

    let summary: string;
    if (totalChanges === 0) {
      summary = 'No changes detected.';
    } else {
      const parts: string[] = [];
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

  private captureAllNodes(): Map<string, NodeData> {
    const nodes = new Map<string, NodeData>();

    const doc = this.sceneGraph.getDocument();
    if (!doc) return nodes;

    const captureNode = (nodeId: NodeId): void => {
      const node = this.sceneGraph.getNode(nodeId);
      if (!node) return;

      // Deep clone the node to capture current state
      nodes.set(nodeId as string, this.cloneNode(node));

      const childIds = this.sceneGraph.getChildIds(nodeId);
      for (const childId of childIds) {
        captureNode(childId);
      }
    };

    captureNode(doc.id);

    return nodes;
  }

  private cloneNode(node: NodeData): NodeData {
    // Deep clone using JSON (simple but effective for serializable data)
    return JSON.parse(JSON.stringify(node));
  }

  private compareNodes(before: NodeData, after: NodeData): PropertyChange[] {
    const changes: PropertyChange[] = [];

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

      const beforeValue = (before as unknown as Record<string, unknown>)[key];
      const afterValue = (after as unknown as Record<string, unknown>)[key];

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

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    if (typeof a !== typeof b) return false;

    if (a === null || b === null) return a === b;

    if (typeof a !== 'object') return a === b;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    if (Array.isArray(a) || Array.isArray(b)) return false;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false;
      if (!this.deepEqual(aObj[key], bObj[key])) return false;
    }

    return true;
  }

  private formatValue(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return `{object}`;
    return String(value);
  }
}

/**
 * Create a change tracker.
 */
export function createChangeTracker(sceneGraph: SceneGraph): ChangeTracker {
  return new ChangeTracker(sceneGraph);
}
