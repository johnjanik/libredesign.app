/**
 * Sync Engine
 *
 * Coordinates bidirectional synchronization between DesignLibre and source code.
 * Handles design-to-code and code-to-design change propagation.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { CodeFramework, PropertySource } from '@core/types/code-source-metadata';
import { getCodeSourceMetadata } from '@core/types/code-source-metadata';
import { SourceMappingManager, type PropertyAnchor } from './source-mapping';

// ============================================================================
// Types
// ============================================================================

/**
 * Design change queued for sync
 */
export interface DesignChange {
  readonly nodeId: NodeId;
  readonly propertyPath: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
  readonly timestamp: number;
}

/**
 * Code change detected
 */
export interface CodeChange {
  readonly filePath: string;
  readonly nodeId: NodeId;
  readonly propertyPath: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
  readonly timestamp: number;
}

/**
 * Sync conflict
 */
export interface SyncConflict {
  readonly nodeId: NodeId;
  readonly propertyPath: string;
  readonly designValue: unknown;
  readonly codeValue: unknown;
  readonly designTimestamp: number;
  readonly codeTimestamp: number;
}

/**
 * Sync engine events
 */
export interface SyncEngineEvents extends Record<string, unknown> {
  'change:queued': { change: DesignChange };
  'change:synced': { change: DesignChange; filePath: string };
  'change:failed': { change: DesignChange; error: string };
  'conflict:detected': { conflict: SyncConflict };
  'conflict:resolved': { conflict: SyncConflict; winner: 'design' | 'code' };
  'file:changed': { filePath: string };
  'sync:started': { direction: 'design-to-code' | 'code-to-design' };
  'sync:completed': { direction: 'design-to-code' | 'code-to-design'; changeCount: number };
}

/**
 * Sync engine configuration
 */
export interface SyncEngineConfig {
  /** Delay before syncing design changes to code (ms) */
  designToCodeDelay?: number;
  /** Delay before syncing code changes to design (ms) */
  codeToDesignDelay?: number;
  /** Maximum wait time before forcing sync (ms) */
  maxWaitTime?: number;
  /** Conflict resolution strategy */
  conflictStrategy?: 'design-wins' | 'code-wins' | 'last-writer-wins' | 'prompt';
  /** Enable sync (can be disabled for read-only mode) */
  enabled?: boolean;
}

// ============================================================================
// Sync Engine
// ============================================================================

/**
 * Coordinates bidirectional sync between design and source code
 */
export class SyncEngine extends EventEmitter<SyncEngineEvents> {
  private sceneGraph: SceneGraph;
  private sourceMapper: SourceMappingManager;
  private config: Required<SyncEngineConfig>;

  // Change queues
  private pendingDesignChanges: Map<string, DesignChange[]> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _pendingCodeChanges: Map<string, CodeChange[]> = new Map(); // Future use for code-to-design sync

  // Debounce timers
  private designSyncTimers: Map<string, NodeJS.Timeout> = new Map();
  private codeSyncTimers: Map<string, NodeJS.Timeout> = new Map();
  private firstChangeTime: Map<string, number> = new Map();

  // Sync state
  private isSyncing = false;
  private syncLock = false;

  constructor(sceneGraph: SceneGraph, config: SyncEngineConfig = {}) {
    super();
    this.sceneGraph = sceneGraph;
    this.sourceMapper = new SourceMappingManager(sceneGraph);
    void this._pendingCodeChanges; // Future use for code-to-design sync

    this.config = {
      designToCodeDelay: config.designToCodeDelay ?? 100,
      codeToDesignDelay: config.codeToDesignDelay ?? 150,
      maxWaitTime: config.maxWaitTime ?? 500,
      conflictStrategy: config.conflictStrategy ?? 'last-writer-wins',
      enabled: config.enabled ?? true,
    };

    // Subscribe to scene graph changes
    this.setupSceneGraphListeners();
  }

  /**
   * Initialize sync engine and scan for existing mappings
   */
  initialize(): void {
    this.sourceMapper.scanSceneGraph();
  }

  /**
   * Enable/disable sync
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if sync is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get the source mapping manager
   */
  getSourceMapper(): SourceMappingManager {
    return this.sourceMapper;
  }

  /**
   * Check if a property is editable
   */
  isPropertyEditable(nodeId: NodeId, propertyPath: string): boolean {
    return this.sourceMapper.isPropertyEditable(nodeId, propertyPath);
  }

  /**
   * Queue a design change for sync
   */
  queueDesignChange(change: DesignChange): void {
    if (!this.config.enabled) return;

    // Check if this property is editable
    if (!this.sourceMapper.isPropertyEditable(change.nodeId, change.propertyPath)) {
      console.warn(`Property ${change.propertyPath} is not editable on node ${change.nodeId}`);
      return;
    }

    // Get the file path for this node
    const mapping = this.sourceMapper.getMapping(change.nodeId);
    if (!mapping) return; // Not a synced node

    const key = `${mapping.filePath}:${change.nodeId}`;

    // Track first change time for max wait
    if (!this.firstChangeTime.has(key)) {
      this.firstChangeTime.set(key, Date.now());
    }

    // Add to pending changes
    let changes = this.pendingDesignChanges.get(key);
    if (!changes) {
      changes = [];
      this.pendingDesignChanges.set(key, changes);
    }

    // Merge with existing change for same property
    const existingIndex = changes.findIndex(
      c => c.nodeId === change.nodeId && c.propertyPath === change.propertyPath
    );
    if (existingIndex >= 0) {
      // Keep original oldValue, update newValue
      const original = changes[existingIndex]!;
      changes[existingIndex] = {
        ...change,
        oldValue: original.oldValue,
      };
    } else {
      changes.push(change);
    }

    this.emit('change:queued', { change });

    // Reset debounce timer
    const existingTimer = this.designSyncTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Check if max wait exceeded
    const waitTime = Date.now() - this.firstChangeTime.get(key)!;
    if (waitTime >= this.config.maxWaitTime) {
      this.flushDesignChanges(key);
      return;
    }

    // Set new debounce timer
    this.designSyncTimers.set(key, setTimeout(() => {
      this.flushDesignChanges(key);
    }, this.config.designToCodeDelay));
  }

  /**
   * Handle external code file change
   */
  async handleCodeChange(filePath: string, newContent: string): Promise<void> {
    if (!this.config.enabled) return;

    // Reset debounce timer
    const existingTimer = this.codeSyncTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.codeSyncTimers.set(filePath, setTimeout(() => {
      this.processCodeChange(filePath, newContent);
    }, this.config.codeToDesignDelay));
  }

  /**
   * Force immediate sync of all pending changes
   */
  async flushAll(): Promise<void> {
    // Clear all timers
    for (const timer of this.designSyncTimers.values()) {
      clearTimeout(timer);
    }
    this.designSyncTimers.clear();

    // Sync all pending changes
    const keys = Array.from(this.pendingDesignChanges.keys());
    for (const key of keys) {
      await this.flushDesignChanges(key);
    }
  }

  /**
   * Register a node for sync
   */
  registerNode(
    nodeId: NodeId,
    filePath: string,
    framework: CodeFramework,
    anchor: {
      viewType: string;
      containingScope: string;
      siblingIndex: number;
      structureHash: string;
    },
    propertySources: Record<string, PropertySource>
  ): void {
    this.sourceMapper.registerMapping(nodeId, filePath, framework, anchor, propertySources);
  }

  /**
   * Unregister a node from sync
   */
  unregisterNode(nodeId: NodeId): void {
    this.sourceMapper.removeMapping(nodeId);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Setup scene graph event listeners
   */
  private setupSceneGraphListeners(): void {
    this.sceneGraph.on('node:propertyChanged', (event) => {
      this.handleSceneGraphChange(event);
    });

    this.sceneGraph.on('node:deleted', (event) => {
      this.sourceMapper.removeMapping(event.nodeId);
    });
  }

  /**
   * Handle scene graph property change
   */
  private handleSceneGraphChange(event: {
    nodeId: NodeId;
    path: readonly string[];
    oldValue: unknown;
    newValue: unknown;
  }): void {
    // Ignore changes during sync
    if (this.isSyncing) return;

    // Check if this node is synced
    const node = this.sceneGraph.getNode(event.nodeId);
    if (!node) return;

    const metadata = getCodeSourceMetadata(node.pluginData);
    if (!metadata) return;

    const propertyPath = event.path.join('.');

    // Queue the change
    this.queueDesignChange({
      nodeId: event.nodeId,
      propertyPath,
      oldValue: event.oldValue,
      newValue: event.newValue,
      timestamp: Date.now(),
    });
  }

  /**
   * Flush pending design changes for a key
   */
  private async flushDesignChanges(key: string): Promise<void> {
    const changes = this.pendingDesignChanges.get(key);
    if (!changes || changes.length === 0) return;

    // Clear pending changes
    this.pendingDesignChanges.delete(key);
    this.designSyncTimers.delete(key);
    this.firstChangeTime.delete(key);

    // Get file path from first change
    const mapping = this.sourceMapper.getMapping(changes[0]!.nodeId);
    if (!mapping) return;

    this.emit('sync:started', { direction: 'design-to-code' });

    // Acquire sync lock
    while (this.syncLock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    this.syncLock = true;

    try {
      // Apply changes to code
      await this.applyDesignChangesToCode(mapping.filePath, changes);

      this.emit('sync:completed', { direction: 'design-to-code', changeCount: changes.length });
    } finally {
      this.syncLock = false;
    }
  }

  /**
   * Apply design changes to source code
   */
  private async applyDesignChangesToCode(
    filePath: string,
    changes: DesignChange[]
  ): Promise<void> {
    // This would use the File System Access API to read/write files
    // For now, we just log the changes

    for (const change of changes) {
      const propAnchor = this.sourceMapper.getPropertyAnchor(change.nodeId, change.propertyPath);
      if (!propAnchor) continue;

      // Generate new code expression
      const newExpression = this.generateCodeExpression(
        change.newValue,
        propAnchor,
        this.sourceMapper.getMapping(change.nodeId)?.framework ?? 'swiftui'
      );

      console.log(`Sync: ${filePath}:${propAnchor.lineHint} - ${propAnchor.codeExpression} -> ${newExpression}`);

      this.emit('change:synced', { change, filePath });
    }
  }

  /**
   * Process code change
   */
  private async processCodeChange(filePath: string, _newContent: string): Promise<void> {
    this.emit('sync:started', { direction: 'code-to-design' });
    this.isSyncing = true;

    try {
      const nodeIds = this.sourceMapper.getNodesForFile(filePath);

      // For each mapped node, check if properties changed
      for (const nodeId of nodeIds) {
        // Re-parse the file and compare values
        // This is a simplified version - full implementation would re-parse the file
        console.log(`Code change detected for node ${nodeId}`);
      }

      this.emit('file:changed', { filePath });
      this.emit('sync:completed', { direction: 'code-to-design', changeCount: nodeIds.length });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Generate code expression from value
   */
  private generateCodeExpression(
    value: unknown,
    anchor: PropertyAnchor,
    framework: CodeFramework
  ): string {
    if (framework === 'swiftui') {
      return this.generateSwiftUIExpression(value, anchor);
    } else {
      return this.generateComposeExpression(value, anchor);
    }
  }

  /**
   * Generate SwiftUI expression
   */
  private generateSwiftUIExpression(value: unknown, anchor: PropertyAnchor): string {
    // Determine type from property path
    if (anchor.propertyPath.includes('color') || anchor.propertyPath.includes('fills')) {
      const color = value as { r: number; g: number; b: number; a: number };
      return `Color(red: ${color.r.toFixed(3)}, green: ${color.g.toFixed(3)}, blue: ${color.b.toFixed(3)}, opacity: ${color.a.toFixed(3)})`;
    }

    if (typeof value === 'number') {
      // Check if this is a dimension
      if (anchor.propertyPath.includes('width') || anchor.propertyPath.includes('height') ||
          anchor.propertyPath.includes('padding') || anchor.propertyPath.includes('radius')) {
        return `${value}`;
      }
      return `${value}`;
    }

    if (typeof value === 'string') {
      return `"${value}"`;
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    return String(value);
  }

  /**
   * Generate Compose expression
   */
  private generateComposeExpression(value: unknown, anchor: PropertyAnchor): string {
    if (anchor.propertyPath.includes('color') || anchor.propertyPath.includes('fills')) {
      const color = value as { r: number; g: number; b: number; a: number };
      const a = Math.round(color.a * 255);
      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);
      const hex = ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
      return `Color(0x${hex.toString(16).toUpperCase().padStart(8, '0')})`;
    }

    if (typeof value === 'number') {
      if (anchor.propertyPath.includes('width') || anchor.propertyPath.includes('height') ||
          anchor.propertyPath.includes('padding') || anchor.propertyPath.includes('radius')) {
        return `${value}.dp`;
      }
      if (anchor.propertyPath.includes('fontSize')) {
        return `${value}.sp`;
      }
      return `${value}`;
    }

    if (typeof value === 'string') {
      return `"${value}"`;
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    return String(value);
  }
}

/**
 * Create a sync engine
 */
export function createSyncEngine(
  sceneGraph: SceneGraph,
  config?: SyncEngineConfig
): SyncEngine {
  return new SyncEngine(sceneGraph, config);
}
