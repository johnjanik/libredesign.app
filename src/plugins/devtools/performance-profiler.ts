/**
 * Performance Profiler
 *
 * Profile plugin execution timing, memory usage, and generate flame graphs.
 */

/**
 * Profile entry type
 */
export type ProfileEntryType =
  | 'api_call'
  | 'event_handler'
  | 'timer_callback'
  | 'script_execution'
  | 'render'
  | 'storage'
  | 'network'
  | 'custom';

/**
 * Profile entry
 */
export interface ProfileEntry {
  readonly id: string;
  readonly pluginId: string;
  readonly type: ProfileEntryType;
  readonly name: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly selfTime: number;
  readonly parent: string | null;
  readonly children: string[];
  readonly metadata: Record<string, unknown>;
  readonly memoryBefore: number;
  readonly memoryAfter: number;
  readonly memoryDelta: number;
}

/**
 * Profile span (for building entries)
 */
interface ProfileSpan {
  id: string;
  pluginId: string;
  type: ProfileEntryType;
  name: string;
  startTime: number;
  parent: string | null;
  children: string[];
  metadata: Record<string, unknown>;
  memoryBefore: number;
}

/**
 * Profile session
 */
export interface ProfileSession {
  readonly id: string;
  readonly pluginId: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly entries: readonly ProfileEntry[];
  readonly summary: ProfileSummary;
}

/**
 * Profile summary
 */
export interface ProfileSummary {
  readonly totalTime: number;
  readonly selfTime: number;
  readonly entryCount: number;
  readonly apiCalls: number;
  readonly eventHandlers: number;
  readonly timerCallbacks: number;
  readonly memoryPeak: number;
  readonly memoryDelta: number;
  readonly topByTime: readonly ProfileEntrySummary[];
  readonly topBySelfTime: readonly ProfileEntrySummary[];
  readonly topByMemory: readonly ProfileEntrySummary[];
}

/**
 * Profile entry summary
 */
export interface ProfileEntrySummary {
  readonly name: string;
  readonly type: ProfileEntryType;
  readonly totalTime: number;
  readonly selfTime: number;
  readonly callCount: number;
  readonly avgTime: number;
  readonly memoryDelta: number;
}

/**
 * Flame graph node
 */
export interface FlameGraphNode {
  readonly id: string;
  readonly name: string;
  readonly value: number;
  readonly selfValue: number;
  readonly children: FlameGraphNode[];
  readonly color: string;
}

/**
 * Profiler configuration
 */
export interface ProfilerConfig {
  /** Maximum entries per session */
  readonly maxEntries: number;
  /** Maximum sessions to keep */
  readonly maxSessions: number;
  /** Minimum duration to record (ms) */
  readonly minDuration: number;
  /** Enable memory tracking */
  readonly trackMemory: boolean;
  /** Sample interval for memory (ms) */
  readonly memorySampleInterval: number;
}

/**
 * Default profiler configuration
 */
export const DEFAULT_PROFILER_CONFIG: ProfilerConfig = {
  maxEntries: 10000,
  maxSessions: 10,
  minDuration: 0.1,
  trackMemory: true,
  memorySampleInterval: 100,
};

/**
 * Performance Profiler class
 */
export class PerformanceProfiler {
  private readonly config: ProfilerConfig;
  private readonly sessions: Map<string, ProfileSession>;
  private readonly activeSpans: Map<string, ProfileSpan>;
  private readonly spanStack: Map<string, string[]>;
  private readonly entries: Map<string, ProfileEntry[]>;
  private nextId: number;
  private isRecording: boolean;
  private recordingPluginId: string | null;
  private recordingStartTime: number;

  constructor(config: ProfilerConfig = DEFAULT_PROFILER_CONFIG) {
    this.config = config;
    this.sessions = new Map();
    this.activeSpans = new Map();
    this.spanStack = new Map();
    this.entries = new Map();
    this.nextId = 1;
    this.isRecording = false;
    this.recordingPluginId = null;
    this.recordingStartTime = 0;
  }

  /**
   * Start recording a profile session
   */
  startRecording(pluginId: string): string {
    if (this.isRecording) {
      throw new Error('Already recording a session');
    }

    this.isRecording = true;
    this.recordingPluginId = pluginId;
    this.recordingStartTime = performance.now();
    this.entries.set(pluginId, []);
    this.spanStack.set(pluginId, []);

    return `session-${this.nextId++}`;
  }

  /**
   * Stop recording and create session
   */
  stopRecording(): ProfileSession | null {
    if (!this.isRecording || !this.recordingPluginId) {
      return null;
    }

    const pluginId = this.recordingPluginId;
    const entries = this.entries.get(pluginId) ?? [];
    const endTime = performance.now();

    // Clean up any unclosed spans
    const stack = this.spanStack.get(pluginId);
    if (stack) {
      while (stack.length > 0) {
        const spanId = stack.pop()!;
        const span = this.activeSpans.get(spanId);
        if (span) {
          this.endSpanInternal(spanId, endTime);
        }
      }
    }

    const session: ProfileSession = {
      id: `session-${this.nextId++}`,
      pluginId,
      startTime: this.recordingStartTime,
      endTime,
      entries,
      summary: this.createSummary(entries),
    };

    // Store session
    this.sessions.set(session.id, session);

    // Limit stored sessions
    const sessionIds = Array.from(this.sessions.keys());
    while (sessionIds.length > this.config.maxSessions) {
      const oldestId = sessionIds.shift();
      if (oldestId) {
        this.sessions.delete(oldestId);
      }
    }

    // Reset state
    this.isRecording = false;
    this.recordingPluginId = null;
    this.entries.delete(pluginId);
    this.spanStack.delete(pluginId);

    return session;
  }

  /**
   * Start a profiling span
   */
  startSpan(
    pluginId: string,
    type: ProfileEntryType,
    name: string,
    metadata: Record<string, unknown> = {}
  ): string {
    if (!this.isRecording || pluginId !== this.recordingPluginId) {
      return '';
    }

    const id = `span-${this.nextId++}`;
    const stack = this.spanStack.get(pluginId);
    const parentId = stack && stack.length > 0 ? stack[stack.length - 1]! : null;

    const span: ProfileSpan = {
      id,
      pluginId,
      type,
      name,
      startTime: performance.now(),
      parent: parentId,
      children: [],
      metadata,
      memoryBefore: this.config.trackMemory ? this.getMemoryUsage() : 0,
    };

    this.activeSpans.set(id, span);

    // Add to parent's children
    if (parentId) {
      const parentSpan = this.activeSpans.get(parentId);
      if (parentSpan) {
        parentSpan.children.push(id);
      }
    }

    // Push to stack
    if (stack) {
      stack.push(id);
    }

    return id;
  }

  /**
   * End a profiling span
   */
  endSpan(spanId: string): ProfileEntry | null {
    if (!spanId || !this.activeSpans.has(spanId)) {
      return null;
    }

    return this.endSpanInternal(spanId, performance.now());
  }

  /**
   * Profile a function execution
   */
  async profile<T>(
    pluginId: string,
    type: ProfileEntryType,
    name: string,
    fn: () => T | Promise<T>,
    metadata: Record<string, unknown> = {}
  ): Promise<T> {
    const spanId = this.startSpan(pluginId, type, name, metadata);

    try {
      const result = await fn();
      return result;
    } finally {
      this.endSpan(spanId);
    }
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): ProfileSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Get all sessions for a plugin
   */
  getPluginSessions(pluginId: string): ProfileSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.pluginId === pluginId);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    this.sessions.clear();
  }

  /**
   * Check if recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get recording plugin ID
   */
  getRecordingPluginId(): string | null {
    return this.recordingPluginId;
  }

  /**
   * Generate flame graph from session
   */
  generateFlameGraph(session: ProfileSession): FlameGraphNode {
    // Find root entries (no parent)
    const rootEntries = session.entries.filter((e) => e.parent === null);

    // Build tree
    const entryMap = new Map(session.entries.map((e) => [e.id, e]));

    const buildNode = (entry: ProfileEntry): FlameGraphNode => {
      const children = entry.children
        .map((childId) => entryMap.get(childId))
        .filter((e): e is ProfileEntry => e !== undefined)
        .map(buildNode);

      return {
        id: entry.id,
        name: entry.name,
        value: entry.duration,
        selfValue: entry.selfTime,
        children,
        color: this.getColorForType(entry.type),
      };
    };

    // Create root node
    const rootChildren = rootEntries.map(buildNode);
    const totalDuration = rootEntries.reduce((sum, e) => sum + e.duration, 0);

    return {
      id: 'root',
      name: session.pluginId,
      value: totalDuration,
      selfValue: 0,
      children: rootChildren,
      color: '#4a90d9',
    };
  }

  /**
   * Export session to JSON
   */
  exportSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return JSON.stringify(session, null, 2);
  }

  /**
   * Import session from JSON
   */
  importSession(json: string): ProfileSession | null {
    try {
      const session = JSON.parse(json) as ProfileSession;
      if (!session.id || !session.pluginId || !session.entries) {
        return null;
      }
      this.sessions.set(session.id, session);
      return session;
    } catch {
      return null;
    }
  }

  /**
   * End span internal
   */
  private endSpanInternal(spanId: string, endTime: number): ProfileEntry | null {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      return null;
    }

    const duration = endTime - span.startTime;
    const memoryAfter = this.config.trackMemory ? this.getMemoryUsage() : 0;

    // Calculate self time (duration minus children)
    const childrenDuration = span.children.reduce((sum, childId) => {
      const childEntry = this.entries
        .get(span.pluginId)
        ?.find((e) => e.id === childId);
      return sum + (childEntry?.duration ?? 0);
    }, 0);
    const selfTime = Math.max(0, duration - childrenDuration);

    const entry: ProfileEntry = {
      id: span.id,
      pluginId: span.pluginId,
      type: span.type,
      name: span.name,
      startTime: span.startTime,
      endTime,
      duration,
      selfTime,
      parent: span.parent,
      children: span.children,
      metadata: span.metadata,
      memoryBefore: span.memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - span.memoryBefore,
    };

    // Store entry if above threshold
    if (duration >= this.config.minDuration) {
      const entries = this.entries.get(span.pluginId);
      if (entries) {
        entries.push(entry);

        // Limit entries
        while (entries.length > this.config.maxEntries) {
          entries.shift();
        }
      }
    }

    // Remove from active spans
    this.activeSpans.delete(spanId);

    // Pop from stack
    const stack = this.spanStack.get(span.pluginId);
    if (stack) {
      const index = stack.indexOf(spanId);
      if (index >= 0) {
        stack.splice(index, 1);
      }
    }

    return entry;
  }

  /**
   * Create summary from entries
   */
  private createSummary(entries: ProfileEntry[]): ProfileSummary {
    if (entries.length === 0) {
      return {
        totalTime: 0,
        selfTime: 0,
        entryCount: 0,
        apiCalls: 0,
        eventHandlers: 0,
        timerCallbacks: 0,
        memoryPeak: 0,
        memoryDelta: 0,
        topByTime: [],
        topBySelfTime: [],
        topByMemory: [],
      };
    }

    // Calculate totals
    const rootEntries = entries.filter((e) => e.parent === null);
    const totalTime = rootEntries.reduce((sum, e) => sum + e.duration, 0);
    const selfTime = entries.reduce((sum, e) => sum + e.selfTime, 0);

    const apiCalls = entries.filter((e) => e.type === 'api_call').length;
    const eventHandlers = entries.filter((e) => e.type === 'event_handler').length;
    const timerCallbacks = entries.filter((e) => e.type === 'timer_callback').length;

    // Memory stats
    let memoryPeak = 0;
    for (const entry of entries) {
      memoryPeak = Math.max(memoryPeak, entry.memoryAfter);
    }
    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];
    const memoryDelta = lastEntry && firstEntry
      ? lastEntry.memoryAfter - firstEntry.memoryBefore
      : 0;

    // Aggregate by name
    const byName = new Map<string, ProfileEntrySummary>();
    for (const entry of entries) {
      const key = `${entry.type}:${entry.name}`;
      const existing = byName.get(key);

      if (existing) {
        byName.set(key, {
          name: existing.name,
          type: existing.type,
          totalTime: existing.totalTime + entry.duration,
          selfTime: existing.selfTime + entry.selfTime,
          callCount: existing.callCount + 1,
          avgTime: 0, // Calculated below
          memoryDelta: existing.memoryDelta + entry.memoryDelta,
        });
      } else {
        byName.set(key, {
          name: entry.name,
          type: entry.type,
          totalTime: entry.duration,
          selfTime: entry.selfTime,
          callCount: 1,
          avgTime: 0,
          memoryDelta: entry.memoryDelta,
        });
      }
    }

    // Calculate averages and sort
    const summaries = Array.from(byName.values()).map((s) => ({
      ...s,
      avgTime: s.totalTime / s.callCount,
    }));

    const topByTime = [...summaries]
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10);

    const topBySelfTime = [...summaries]
      .sort((a, b) => b.selfTime - a.selfTime)
      .slice(0, 10);

    const topByMemory = [...summaries]
      .sort((a, b) => Math.abs(b.memoryDelta) - Math.abs(a.memoryDelta))
      .slice(0, 10);

    return {
      totalTime,
      selfTime,
      entryCount: entries.length,
      apiCalls,
      eventHandlers,
      timerCallbacks,
      memoryPeak,
      memoryDelta,
      topByTime,
      topBySelfTime,
      topByMemory,
    };
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    // Use performance.memory if available (Chrome only)
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } })
      .memory;
    if (memory) {
      return memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get color for entry type
   */
  private getColorForType(type: ProfileEntryType): string {
    const colors: Record<ProfileEntryType, string> = {
      api_call: '#4a90d9',
      event_handler: '#50c878',
      timer_callback: '#f5a623',
      script_execution: '#9b59b6',
      render: '#e74c3c',
      storage: '#1abc9c',
      network: '#3498db',
      custom: '#95a5a6',
    };
    return colors[type];
  }
}

/**
 * Create a timing decorator for profiling
 */
export function createTimingDecorator(
  profiler: PerformanceProfiler,
  pluginId: string
): MethodDecorator {
  return function (
    _target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

    descriptor.value = async function (...args: unknown[]) {
      return profiler.profile(
        pluginId,
        'api_call',
        String(propertyKey),
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

/**
 * Simple timing helper
 */
export function timeExecution<T>(
  fn: () => T
): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Async timing helper
 */
export async function timeAsyncExecution<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}
