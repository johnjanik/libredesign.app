/**
 * Plugin State Inspector
 *
 * Inspect and debug plugin state, including sandbox variables and API state.
 */

/**
 * Inspected value types
 */
export type InspectedValueType =
  | 'undefined'
  | 'null'
  | 'boolean'
  | 'number'
  | 'string'
  | 'symbol'
  | 'function'
  | 'object'
  | 'array'
  | 'date'
  | 'regexp'
  | 'error'
  | 'map'
  | 'set'
  | 'promise'
  | 'circular'
  | 'unknown';

/**
 * Inspected value node
 */
export interface InspectedValue {
  readonly type: InspectedValueType;
  readonly value: unknown;
  readonly preview: string;
  readonly expandable: boolean;
  readonly children?: Record<string, InspectedValue>;
  readonly size?: number;
  readonly path: string;
}

/**
 * Plugin state snapshot
 */
export interface PluginStateSnapshot {
  readonly pluginId: string;
  readonly timestamp: number;
  readonly globalScope: InspectedValue;
  readonly storageState: InspectedValue;
  readonly registeredListeners: ListenerInfo[];
  readonly activeTimers: TimerInfo[];
  readonly memoryUsage: MemoryInfo;
}

/**
 * Listener information
 */
export interface ListenerInfo {
  readonly id: string;
  readonly event: string;
  readonly registered: number;
  readonly callCount: number;
}

/**
 * Timer information
 */
export interface TimerInfo {
  readonly id: number;
  readonly type: 'timeout' | 'interval';
  readonly delay: number;
  readonly created: number;
  readonly remaining?: number;
}

/**
 * Memory information
 */
export interface MemoryInfo {
  readonly used: number;
  readonly limit: number;
  readonly percentage: number;
}

/**
 * Inspector configuration
 */
export interface InspectorConfig {
  /** Maximum depth for object inspection */
  readonly maxDepth: number;
  /** Maximum array length to inspect */
  readonly maxArrayLength: number;
  /** Maximum object keys to inspect */
  readonly maxObjectKeys: number;
  /** Maximum string preview length */
  readonly maxStringPreview: number;
  /** Track circular references */
  readonly detectCircular: boolean;
}

/**
 * Default inspector configuration
 */
export const DEFAULT_INSPECTOR_CONFIG: InspectorConfig = {
  maxDepth: 10,
  maxArrayLength: 100,
  maxObjectKeys: 100,
  maxStringPreview: 200,
  detectCircular: true,
};

/**
 * State change event
 */
export interface StateChangeEvent {
  readonly pluginId: string;
  readonly path: string;
  readonly oldValue: InspectedValue | null;
  readonly newValue: InspectedValue;
  readonly timestamp: number;
}

/**
 * State change handler
 */
export type StateChangeHandler = (event: StateChangeEvent) => void;

/**
 * Plugin State Inspector class
 */
export class PluginInspector {
  private readonly config: InspectorConfig;
  private readonly snapshots: Map<string, PluginStateSnapshot[]>;
  private readonly watchers: Map<string, Set<string>>;
  private readonly listeners: Set<StateChangeHandler>;
  private readonly maxSnapshots: number;

  constructor(config: InspectorConfig = DEFAULT_INSPECTOR_CONFIG) {
    this.config = config;
    this.snapshots = new Map();
    this.watchers = new Map();
    this.listeners = new Set();
    this.maxSnapshots = 50;
  }

  /**
   * Inspect a value
   */
  inspect(value: unknown, path: string = '$', depth: number = 0): InspectedValue {
    const seen = new Set<unknown>();
    return this.inspectValue(value, path, depth, seen);
  }

  /**
   * Take a state snapshot for a plugin
   */
  takeSnapshot(
    pluginId: string,
    globalScope: unknown,
    storageState: unknown,
    listeners: ListenerInfo[],
    timers: TimerInfo[],
    memory: MemoryInfo
  ): PluginStateSnapshot {
    const snapshot: PluginStateSnapshot = {
      pluginId,
      timestamp: Date.now(),
      globalScope: this.inspect(globalScope, '$global'),
      storageState: this.inspect(storageState, '$storage'),
      registeredListeners: listeners,
      activeTimers: timers,
      memoryUsage: memory,
    };

    // Store snapshot
    if (!this.snapshots.has(pluginId)) {
      this.snapshots.set(pluginId, []);
    }
    const pluginSnapshots = this.snapshots.get(pluginId)!;
    pluginSnapshots.push(snapshot);

    // Limit snapshots
    while (pluginSnapshots.length > this.maxSnapshots) {
      pluginSnapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get snapshots for a plugin
   */
  getSnapshots(pluginId: string): PluginStateSnapshot[] {
    return this.snapshots.get(pluginId) ?? [];
  }

  /**
   * Get latest snapshot for a plugin
   */
  getLatestSnapshot(pluginId: string): PluginStateSnapshot | null {
    const snapshots = this.snapshots.get(pluginId);
    if (!snapshots || snapshots.length === 0) {
      return null;
    }
    return snapshots[snapshots.length - 1] ?? null;
  }

  /**
   * Clear snapshots for a plugin
   */
  clearSnapshots(pluginId: string): void {
    this.snapshots.delete(pluginId);
  }

  /**
   * Add a watcher for a specific path
   */
  watch(pluginId: string, path: string): void {
    if (!this.watchers.has(pluginId)) {
      this.watchers.set(pluginId, new Set());
    }
    this.watchers.get(pluginId)!.add(path);
  }

  /**
   * Remove a watcher
   */
  unwatch(pluginId: string, path: string): void {
    const paths = this.watchers.get(pluginId);
    if (paths) {
      paths.delete(path);
      if (paths.size === 0) {
        this.watchers.delete(pluginId);
      }
    }
  }

  /**
   * Get watched paths for a plugin
   */
  getWatchedPaths(pluginId: string): string[] {
    return Array.from(this.watchers.get(pluginId) ?? []);
  }

  /**
   * Check if a path is watched
   */
  isWatched(pluginId: string, path: string): boolean {
    return this.watchers.get(pluginId)?.has(path) ?? false;
  }

  /**
   * Notify state change
   */
  notifyChange(
    pluginId: string,
    path: string,
    oldValue: unknown,
    newValue: unknown
  ): void {
    // Check if path is watched
    const paths = this.watchers.get(pluginId);
    if (!paths) return;

    // Check for matching watchers (including parent paths)
    let isWatched = false;
    for (const watchedPath of paths) {
      if (path === watchedPath || path.startsWith(watchedPath + '.')) {
        isWatched = true;
        break;
      }
    }

    if (!isWatched) return;

    const event: StateChangeEvent = {
      pluginId,
      path,
      oldValue: oldValue !== undefined ? this.inspect(oldValue, path) : null,
      newValue: this.inspect(newValue, path),
      timestamp: Date.now(),
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Add state change listener
   */
  addListener(handler: StateChangeHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(
    snapshot1: PluginStateSnapshot,
    snapshot2: PluginStateSnapshot
  ): SnapshotDiff {
    const globalDiff = this.diffValues(
      snapshot1.globalScope,
      snapshot2.globalScope,
      '$global'
    );

    const storageDiff = this.diffValues(
      snapshot1.storageState,
      snapshot2.storageState,
      '$storage'
    );

    return {
      pluginId: snapshot1.pluginId,
      timestamp1: snapshot1.timestamp,
      timestamp2: snapshot2.timestamp,
      globalChanges: globalDiff,
      storageChanges: storageDiff,
      listenerChanges: this.diffListeners(
        snapshot1.registeredListeners,
        snapshot2.registeredListeners
      ),
      timerChanges: this.diffTimers(snapshot1.activeTimers, snapshot2.activeTimers),
      memoryDelta: snapshot2.memoryUsage.used - snapshot1.memoryUsage.used,
    };
  }

  /**
   * Get value at path from snapshot
   */
  getValueAtPath(snapshot: PluginStateSnapshot, path: string): InspectedValue | null {
    const parts = path.split('.');
    let current: InspectedValue | undefined;

    if (parts[0] === '$global') {
      current = snapshot.globalScope;
    } else if (parts[0] === '$storage') {
      current = snapshot.storageState;
    } else {
      return null;
    }

    for (let i = 1; i < parts.length; i++) {
      if (!current?.children) {
        return null;
      }
      current = current.children[parts[i]!];
      if (!current) {
        return null;
      }
    }

    return current ?? null;
  }

  /**
   * Inspect a value recursively
   */
  private inspectValue(
    value: unknown,
    path: string,
    depth: number,
    seen: Set<unknown>
  ): InspectedValue {
    // Check depth limit
    if (depth > this.config.maxDepth) {
      return {
        type: 'unknown',
        value: undefined,
        preview: '[Max depth reached]',
        expandable: false,
        path,
      };
    }

    // Handle primitives and special cases
    if (value === undefined) {
      return { type: 'undefined', value, preview: 'undefined', expandable: false, path };
    }

    if (value === null) {
      return { type: 'null', value, preview: 'null', expandable: false, path };
    }

    if (typeof value === 'boolean') {
      return {
        type: 'boolean',
        value,
        preview: String(value),
        expandable: false,
        path,
      };
    }

    if (typeof value === 'number') {
      return {
        type: 'number',
        value,
        preview: this.formatNumber(value),
        expandable: false,
        path,
      };
    }

    if (typeof value === 'string') {
      return {
        type: 'string',
        value,
        preview: this.formatString(value),
        expandable: false,
        size: value.length,
        path,
      };
    }

    if (typeof value === 'symbol') {
      return {
        type: 'symbol',
        value: undefined,
        preview: String(value),
        expandable: false,
        path,
      };
    }

    if (typeof value === 'function') {
      return {
        type: 'function',
        value: undefined,
        preview: this.formatFunction(value as Function),
        expandable: false,
        path,
      };
    }

    // Check circular reference
    if (this.config.detectCircular && seen.has(value)) {
      return {
        type: 'circular',
        value: undefined,
        preview: '[Circular]',
        expandable: false,
        path,
      };
    }

    seen.add(value);

    // Handle objects
    if (value instanceof Date) {
      return {
        type: 'date',
        value: value.toISOString(),
        preview: value.toISOString(),
        expandable: false,
        path,
      };
    }

    if (value instanceof RegExp) {
      return {
        type: 'regexp',
        value: value.toString(),
        preview: value.toString(),
        expandable: false,
        path,
      };
    }

    if (value instanceof Error) {
      return {
        type: 'error',
        value: undefined,
        preview: `${value.name}: ${value.message}`,
        expandable: true,
        children: {
          name: this.inspectValue(value.name, `${path}.name`, depth + 1, seen),
          message: this.inspectValue(value.message, `${path}.message`, depth + 1, seen),
          stack: this.inspectValue(value.stack, `${path}.stack`, depth + 1, seen),
        },
        path,
      };
    }

    if (value instanceof Map) {
      const children: Record<string, InspectedValue> = {};
      let i = 0;
      for (const [k, v] of value) {
        if (i >= this.config.maxObjectKeys) break;
        const keyStr = String(k);
        children[keyStr] = this.inspectValue(v, `${path}.${keyStr}`, depth + 1, seen);
        i++;
      }
      return {
        type: 'map',
        value: undefined,
        preview: `Map(${value.size})`,
        expandable: value.size > 0,
        children,
        size: value.size,
        path,
      };
    }

    if (value instanceof Set) {
      const children: Record<string, InspectedValue> = {};
      let i = 0;
      for (const v of value) {
        if (i >= this.config.maxArrayLength) break;
        children[String(i)] = this.inspectValue(v, `${path}[${i}]`, depth + 1, seen);
        i++;
      }
      return {
        type: 'set',
        value: undefined,
        preview: `Set(${value.size})`,
        expandable: value.size > 0,
        children,
        size: value.size,
        path,
      };
    }

    if (value instanceof Promise) {
      return {
        type: 'promise',
        value: undefined,
        preview: 'Promise { <pending> }',
        expandable: false,
        path,
      };
    }

    if (Array.isArray(value)) {
      const children: Record<string, InspectedValue> = {};
      const len = Math.min(value.length, this.config.maxArrayLength);
      for (let i = 0; i < len; i++) {
        children[String(i)] = this.inspectValue(
          value[i],
          `${path}[${i}]`,
          depth + 1,
          seen
        );
      }
      if (value.length > this.config.maxArrayLength) {
        children['...'] = {
          type: 'unknown',
          value: undefined,
          preview: `... ${value.length - this.config.maxArrayLength} more items`,
          expandable: false,
          path: `${path}[...]`,
        };
      }
      return {
        type: 'array',
        value: undefined,
        preview: `Array(${value.length})`,
        expandable: value.length > 0,
        children,
        size: value.length,
        path,
      };
    }

    // Plain object
    const children: Record<string, InspectedValue> = {};
    const keys = Object.keys(value as object);
    const len = Math.min(keys.length, this.config.maxObjectKeys);

    for (let i = 0; i < len; i++) {
      const key = keys[i]!;
      children[key] = this.inspectValue(
        (value as Record<string, unknown>)[key],
        `${path}.${key}`,
        depth + 1,
        seen
      );
    }

    if (keys.length > this.config.maxObjectKeys) {
      children['...'] = {
        type: 'unknown',
        value: undefined,
        preview: `... ${keys.length - this.config.maxObjectKeys} more properties`,
        expandable: false,
        path: `${path}...`,
      };
    }

    const constructor = (value as object).constructor?.name;
    const preview =
      constructor && constructor !== 'Object' ? `${constructor} {...}` : `{...}`;

    return {
      type: 'object',
      value: undefined,
      preview: `${preview} (${keys.length} keys)`,
      expandable: keys.length > 0,
      children,
      size: keys.length,
      path,
    };
  }

  /**
   * Format number for preview
   */
  private formatNumber(n: number): string {
    if (Number.isNaN(n)) return 'NaN';
    if (!Number.isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity';
    return String(n);
  }

  /**
   * Format string for preview
   */
  private formatString(s: string): string {
    if (s.length <= this.config.maxStringPreview) {
      return JSON.stringify(s);
    }
    return `${JSON.stringify(s.slice(0, this.config.maxStringPreview))}... (${s.length} chars)`;
  }

  /**
   * Format function for preview
   */
  private formatFunction(fn: Function): string {
    const name = fn.name || 'anonymous';
    const fnStr = fn.toString();
    const argsMatch = fnStr.match(/^[^(]*\(([^)]*)\)/);
    const args = argsMatch ? argsMatch[1] : '';
    return `ƒ ${name}(${args})`;
  }

  /**
   * Diff two inspected values
   */
  private diffValues(
    value1: InspectedValue,
    value2: InspectedValue,
    path: string
  ): ValueChange[] {
    const changes: ValueChange[] = [];

    if (value1.type !== value2.type || value1.preview !== value2.preview) {
      changes.push({
        path,
        type: 'modified',
        oldValue: value1,
        newValue: value2,
      });
    }

    // Compare children
    if (value1.children && value2.children) {
      const allKeys = new Set([
        ...Object.keys(value1.children),
        ...Object.keys(value2.children),
      ]);

      for (const key of allKeys) {
        const child1 = value1.children[key];
        const child2 = value2.children[key];
        const childPath = `${path}.${key}`;

        if (!child1 && child2) {
          changes.push({ path: childPath, type: 'added', oldValue: null, newValue: child2 });
        } else if (child1 && !child2) {
          changes.push({
            path: childPath,
            type: 'removed',
            oldValue: child1,
            newValue: null,
          });
        } else if (child1 && child2) {
          changes.push(...this.diffValues(child1, child2, childPath));
        }
      }
    }

    return changes;
  }

  /**
   * Diff listeners
   */
  private diffListeners(
    listeners1: ListenerInfo[],
    listeners2: ListenerInfo[]
  ): ListenerChange[] {
    const changes: ListenerChange[] = [];
    const map1 = new Map(listeners1.map((l) => [l.id, l]));
    const map2 = new Map(listeners2.map((l) => [l.id, l]));

    for (const [id, listener] of map2) {
      if (!map1.has(id)) {
        changes.push({ type: 'added', listener });
      }
    }

    for (const [id, listener] of map1) {
      if (!map2.has(id)) {
        changes.push({ type: 'removed', listener });
      }
    }

    return changes;
  }

  /**
   * Diff timers
   */
  private diffTimers(timers1: TimerInfo[], timers2: TimerInfo[]): TimerChange[] {
    const changes: TimerChange[] = [];
    const map1 = new Map(timers1.map((t) => [t.id, t]));
    const map2 = new Map(timers2.map((t) => [t.id, t]));

    for (const [id, timer] of map2) {
      if (!map1.has(id)) {
        changes.push({ type: 'added', timer });
      }
    }

    for (const [id, timer] of map1) {
      if (!map2.has(id)) {
        changes.push({ type: 'removed', timer });
      }
    }

    return changes;
  }
}

/**
 * Snapshot diff result
 */
export interface SnapshotDiff {
  readonly pluginId: string;
  readonly timestamp1: number;
  readonly timestamp2: number;
  readonly globalChanges: ValueChange[];
  readonly storageChanges: ValueChange[];
  readonly listenerChanges: ListenerChange[];
  readonly timerChanges: TimerChange[];
  readonly memoryDelta: number;
}

/**
 * Value change
 */
export interface ValueChange {
  readonly path: string;
  readonly type: 'added' | 'removed' | 'modified';
  readonly oldValue: InspectedValue | null;
  readonly newValue: InspectedValue | null;
}

/**
 * Listener change
 */
export interface ListenerChange {
  readonly type: 'added' | 'removed';
  readonly listener: ListenerInfo;
}

/**
 * Timer change
 */
export interface TimerChange {
  readonly type: 'added' | 'removed';
  readonly timer: TimerInfo;
}
