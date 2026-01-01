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
export enum DirtyFlag {
  NONE = 0,
  TRANSFORM = 1 << 0,      // x, y, width, height, rotation
  APPEARANCE = 1 << 1,     // fills, strokes, effects, opacity
  GEOMETRY = 1 << 2,       // vectorPaths
  TEXT_CONTENT = 1 << 3,   // characters, textStyles
  LAYOUT = 1 << 4,         // constraints, autoLayout
  STRUCTURE = 1 << 5,      // children, parent
  ALL = 0xFFFF,
}

/**
 * Map property paths to dirty flags
 */
const PROPERTY_FLAGS: Record<string, DirtyFlag> = {
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
export function getDirtyFlagForProperty(path: PropertyPath): DirtyFlag {
  if (path.length === 0) return DirtyFlag.ALL;
  const key = path[0]!;
  return PROPERTY_FLAGS[key] ?? DirtyFlag.ALL;
}

/**
 * Dirty node entry
 */
interface DirtyEntry {
  flags: DirtyFlag;
  properties: Set<string>;
}

/**
 * Change tracker for efficient dirty region tracking
 */
export class ChangeTracker {
  /** Dirty nodes with their flags */
  private dirty = new Map<NodeId, DirtyEntry>();

  /** Whether tracking is enabled */
  private enabled = true;

  /** Frame counter for debugging */
  private frameCount = 0;

  /**
   * Mark a node as dirty.
   */
  markDirty(nodeId: NodeId, flag: DirtyFlag = DirtyFlag.ALL): void {
    if (!this.enabled) return;

    const entry = this.dirty.get(nodeId);
    if (entry) {
      entry.flags |= flag;
    } else {
      this.dirty.set(nodeId, { flags: flag, properties: new Set() });
    }
  }

  /**
   * Mark a specific property as dirty.
   */
  markPropertyDirty(nodeId: NodeId, path: PropertyPath): void {
    if (!this.enabled) return;

    const flag = getDirtyFlagForProperty(path);
    const entry = this.dirty.get(nodeId);

    if (entry) {
      entry.flags |= flag;
      entry.properties.add(path.join('.'));
    } else {
      const properties = new Set<string>();
      properties.add(path.join('.'));
      this.dirty.set(nodeId, { flags: flag, properties });
    }
  }

  /**
   * Check if a node is dirty.
   */
  isDirty(nodeId: NodeId): boolean {
    return this.dirty.has(nodeId);
  }

  /**
   * Check if a node has a specific dirty flag.
   */
  hasDirtyFlag(nodeId: NodeId, flag: DirtyFlag): boolean {
    const entry = this.dirty.get(nodeId);
    return entry ? (entry.flags & flag) !== 0 : false;
  }

  /**
   * Get dirty flags for a node.
   */
  getDirtyFlags(nodeId: NodeId): DirtyFlag {
    return this.dirty.get(nodeId)?.flags ?? DirtyFlag.NONE;
  }

  /**
   * Get dirty properties for a node.
   */
  getDirtyProperties(nodeId: NodeId): string[] {
    const entry = this.dirty.get(nodeId);
    return entry ? Array.from(entry.properties) : [];
  }

  /**
   * Get all dirty node IDs.
   */
  getDirtyNodes(): NodeId[] {
    return Array.from(this.dirty.keys());
  }

  /**
   * Get all dirty nodes with a specific flag.
   */
  getNodesWithFlag(flag: DirtyFlag): NodeId[] {
    const result: NodeId[] = [];
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
  clearNode(nodeId: NodeId): void {
    this.dirty.delete(nodeId);
  }

  /**
   * Clear all dirty state.
   */
  clear(): void {
    this.dirty.clear();
    this.frameCount++;
  }

  /**
   * Get the number of dirty nodes.
   */
  get count(): number {
    return this.dirty.size;
  }

  /**
   * Check if any nodes are dirty.
   */
  get hasDirtyNodes(): boolean {
    return this.dirty.size > 0;
  }

  /**
   * Enable or disable tracking.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if tracking is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get frame count (for debugging).
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Execute a function with tracking disabled.
   */
  withoutTracking<T>(fn: () => T): T {
    const wasEnabled = this.enabled;
    this.enabled = false;
    try {
      return fn();
    } finally {
      this.enabled = wasEnabled;
    }
  }
}

/**
 * Singleton change tracker instance
 */
let globalChangeTracker: ChangeTracker | null = null;

/**
 * Get the global change tracker.
 */
export function getChangeTracker(): ChangeTracker {
  if (!globalChangeTracker) {
    globalChangeTracker = new ChangeTracker();
  }
  return globalChangeTracker;
}

/**
 * Create a new change tracker (for testing).
 */
export function createChangeTracker(): ChangeTracker {
  return new ChangeTracker();
}
