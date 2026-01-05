/**
 * State Restoration Service
 *
 * Captures and restores state snapshots for time-travel functionality.
 */

import type { NodeId, NodeType } from '@core/types/common';
import type { StateSnapshot } from '@core/types/history';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { SelectionManager } from '@scene/selection/selection-manager';
import type { Viewport } from '@renderer/core/viewport';

/**
 * State restoration service options
 */
export interface StateRestorationOptions {
  /** Interval between automatic snapshots (in operations) */
  snapshotInterval?: number;
}

/**
 * State Restoration Service
 *
 * Handles capturing and restoring full state snapshots.
 */
export class StateRestorationService {
  private sceneGraph: SceneGraph;
  private selectionManager: SelectionManager;
  private viewport: Viewport | null = null;
  private snapshotInterval: number;
  private operationCount = 0;
  private snapshots: Map<string, StateSnapshot> = new Map();

  constructor(
    sceneGraph: SceneGraph,
    selectionManager: SelectionManager,
    options: StateRestorationOptions = {}
  ) {
    this.sceneGraph = sceneGraph;
    this.selectionManager = selectionManager;
    this.snapshotInterval = options.snapshotInterval ?? 10;
  }

  /**
   * Set the viewport for capturing viewport state
   */
  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
  }

  /**
   * Capture a full state snapshot
   */
  captureSnapshot(): StateSnapshot {
    const offset = this.viewport?.getOffset();
    return {
      sceneGraphState: this.sceneGraph.toJSON(),
      selectionState: [...this.selectionManager.getSelectedNodeIds()],
      viewportState: this.viewport && offset
        ? {
            x: offset.x,
            y: offset.y,
            zoom: this.viewport.getZoom(),
          }
        : { x: 0, y: 0, zoom: 1 },
    };
  }

  /**
   * Store a snapshot with an ID
   */
  storeSnapshot(id: string, snapshot: StateSnapshot): void {
    this.snapshots.set(id, snapshot);
  }

  /**
   * Get a stored snapshot
   */
  getSnapshot(id: string): StateSnapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(id: string): boolean {
    return this.snapshots.delete(id);
  }

  /**
   * Check if we should capture a snapshot based on operation count
   */
  shouldCaptureSnapshot(): boolean {
    this.operationCount++;
    if (this.operationCount >= this.snapshotInterval) {
      this.operationCount = 0;
      return true;
    }
    return false;
  }

  /**
   * Reset operation count (call after manual snapshot)
   */
  resetOperationCount(): void {
    this.operationCount = 0;
  }

  /**
   * Restore state from a snapshot
   */
  restoreSnapshot(snapshot: StateSnapshot): void {
    // Restore scene graph state
    this.restoreSceneGraph(snapshot.sceneGraphState);

    // Restore selection
    this.selectionManager.select(snapshot.selectionState, 'replace');

    // Restore viewport
    if (this.viewport && snapshot.viewportState) {
      this.viewport.setOffset(snapshot.viewportState.x, snapshot.viewportState.y);
      this.viewport.setZoom(snapshot.viewportState.zoom);
    }
  }

  /**
   * Restore scene graph from serialized state
   */
  private restoreSceneGraph(state: unknown): void {
    const data = state as { nodes?: Record<string, unknown> };
    if (!data.nodes) return;

    // Clear existing nodes except document
    const doc = this.sceneGraph.getDocument();
    if (doc) {
      const children = this.sceneGraph.getChildIds(doc.id);
      for (const childId of children) {
        this.sceneGraph.deleteNode(childId);
      }
    }

    // Rebuild from snapshot
    // This is a simplified restoration - full implementation would need
    // to properly deserialize all node types
    const nodes = data.nodes as Record<string, Record<string, unknown>>;
    const sortedIds = Object.keys(nodes).sort((a, b) => {
      const depthA = (nodes[a]?.['depth'] as number) ?? 0;
      const depthB = (nodes[b]?.['depth'] as number) ?? 0;
      return depthA - depthB;
    });

    for (const nodeId of sortedIds) {
      const nodeData = nodes[nodeId];
      if (!nodeData) continue;

      const type = nodeData['type'] as string;
      if (type === 'DOCUMENT') continue; // Skip document, already exists

      const parentId = nodeData['parentId'] as NodeId;
      if (!parentId) continue;

      // Check if node already exists
      if (this.sceneGraph.getNode(nodeId as NodeId)) continue;

      // Create node (cast type to NodeType)
      this.sceneGraph.createNode(
        type as NodeType,
        parentId,
        -1,
        nodeData as Record<string, unknown>
      );
    }
  }

  /**
   * Get all stored snapshot IDs
   */
  getSnapshotIds(): string[] {
    return Array.from(this.snapshots.keys());
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots.clear();
    this.operationCount = 0;
  }

  /**
   * Get snapshot count
   */
  getSnapshotCount(): number {
    return this.snapshots.size;
  }

  /**
   * Prune old snapshots, keeping only the most recent N
   */
  pruneSnapshots(keepCount: number): void {
    if (this.snapshots.size <= keepCount) return;

    const ids = Array.from(this.snapshots.keys());
    const toRemove = ids.slice(0, ids.length - keepCount);
    for (const id of toRemove) {
      this.snapshots.delete(id);
    }
  }
}

/**
 * Create a state restoration service
 */
export function createStateRestorationService(
  sceneGraph: SceneGraph,
  selectionManager: SelectionManager,
  options?: StateRestorationOptions
): StateRestorationService {
  return new StateRestorationService(sceneGraph, selectionManager, options);
}
