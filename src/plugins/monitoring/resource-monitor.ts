/**
 * Resource Monitor
 *
 * Tracks CPU time, memory usage, and API calls per plugin.
 */

/**
 * Resource types that can be monitored
 */
export type ResourceType = 'cpu' | 'memory' | 'apiCalls' | 'storage' | 'network';

/**
 * Resource snapshot at a point in time
 */
export interface ResourceSnapshot {
  readonly timestamp: number;
  readonly pluginId: string;
  readonly cpu: CPUSnapshot;
  readonly memory: MemorySnapshot;
  readonly apiCalls: APICallSnapshot;
  readonly storage: StorageSnapshot;
  readonly network: NetworkSnapshot;
}

/**
 * CPU usage snapshot
 */
export interface CPUSnapshot {
  /** Total execution time in milliseconds */
  readonly totalExecutionTime: number;
  /** Execution time in current window */
  readonly windowExecutionTime: number;
  /** Number of executions */
  readonly executionCount: number;
  /** Average execution time per call */
  readonly averageExecutionTime: number;
  /** Peak execution time */
  readonly peakExecutionTime: number;
}

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  /** Current heap size in bytes */
  readonly heapSize: number;
  /** Peak heap size in bytes */
  readonly peakHeapSize: number;
  /** Number of allocations */
  readonly allocationCount: number;
  /** Estimated retained size */
  readonly retainedSize: number;
}

/**
 * API call snapshot
 */
export interface APICallSnapshot {
  /** Total API calls */
  readonly totalCalls: number;
  /** Calls in current window */
  readonly windowCalls: number;
  /** Calls per API method */
  readonly callsByMethod: Record<string, number>;
  /** Failed calls */
  readonly failedCalls: number;
  /** Average response time */
  readonly averageResponseTime: number;
}

/**
 * Storage usage snapshot
 */
export interface StorageSnapshot {
  /** Bytes used */
  readonly bytesUsed: number;
  /** Number of keys */
  readonly keyCount: number;
  /** Read operations */
  readonly readOps: number;
  /** Write operations */
  readonly writeOps: number;
}

/**
 * Network usage snapshot
 */
export interface NetworkSnapshot {
  /** Total requests made */
  readonly totalRequests: number;
  /** Requests in current window */
  readonly windowRequests: number;
  /** Total bytes sent */
  readonly bytesSent: number;
  /** Total bytes received */
  readonly bytesReceived: number;
  /** Failed requests */
  readonly failedRequests: number;
}

/**
 * Resource limits configuration
 */
export interface ResourceLimits {
  /** Maximum CPU time per tick in milliseconds */
  readonly maxCpuTimePerTick: number;
  /** Maximum total CPU time per minute */
  readonly maxCpuTimePerMinute: number;
  /** Maximum memory in bytes */
  readonly maxMemory: number;
  /** Maximum API calls per minute */
  readonly maxApiCallsPerMinute: number;
  /** Maximum storage in bytes */
  readonly maxStorage: number;
  /** Maximum network requests per minute */
  readonly maxNetworkRequestsPerMinute: number;
  /** Maximum network bytes per minute */
  readonly maxNetworkBytesPerMinute: number;
}

/**
 * Default resource limits
 */
export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxCpuTimePerTick: 50,
  maxCpuTimePerMinute: 5000,
  maxMemory: 64 * 1024 * 1024, // 64MB
  maxApiCallsPerMinute: 1000,
  maxStorage: 10 * 1024 * 1024, // 10MB
  maxNetworkRequestsPerMinute: 60,
  maxNetworkBytesPerMinute: 10 * 1024 * 1024, // 10MB
};

/**
 * Resource violation event
 */
export interface ResourceViolation {
  readonly timestamp: number;
  readonly pluginId: string;
  readonly resourceType: ResourceType;
  readonly currentValue: number;
  readonly limit: number;
  readonly severity: 'warning' | 'critical';
  readonly message: string;
}

/**
 * Violation callback
 */
export type ViolationCallback = (violation: ResourceViolation) => void;

/**
 * Plugin resource state
 */
interface PluginResourceState {
  pluginId: string;
  limits: ResourceLimits;

  // CPU tracking
  totalCpuTime: number;
  windowCpuTime: number;
  executionCount: number;
  peakCpuTime: number;
  cpuTimeHistory: number[];

  // Memory tracking
  currentMemory: number;
  peakMemory: number;
  allocationCount: number;

  // API call tracking
  totalApiCalls: number;
  windowApiCalls: number;
  callsByMethod: Map<string, number>;
  failedApiCalls: number;
  apiResponseTimes: number[];

  // Storage tracking
  storageBytes: number;
  storageKeys: number;
  storageReadOps: number;
  storageWriteOps: number;

  // Network tracking
  totalNetworkRequests: number;
  windowNetworkRequests: number;
  networkBytesSent: number;
  networkBytesReceived: number;
  failedNetworkRequests: number;

  // Window management
  windowStart: number;
  lastSnapshot: ResourceSnapshot | null;
}

/**
 * Resource monitor configuration
 */
export interface ResourceMonitorConfig {
  /** Window size in milliseconds for rate limiting */
  readonly windowSize: number;
  /** How often to take snapshots in milliseconds */
  readonly snapshotInterval: number;
  /** Warning threshold as percentage of limit */
  readonly warningThreshold: number;
  /** Maximum history entries per plugin */
  readonly maxHistoryEntries: number;
}

/**
 * Default resource monitor configuration
 */
export const DEFAULT_MONITOR_CONFIG: ResourceMonitorConfig = {
  windowSize: 60000, // 1 minute
  snapshotInterval: 5000, // 5 seconds
  warningThreshold: 0.8, // 80%
  maxHistoryEntries: 100,
};

/**
 * Resource Monitor class
 */
export class ResourceMonitor {
  private readonly config: ResourceMonitorConfig;
  private readonly defaultLimits: ResourceLimits;
  private readonly plugins: Map<string, PluginResourceState>;
  private readonly violationCallbacks: Set<ViolationCallback>;
  private readonly snapshotHistory: Map<string, ResourceSnapshot[]>;
  private windowCleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    config: ResourceMonitorConfig = DEFAULT_MONITOR_CONFIG,
    defaultLimits: ResourceLimits = DEFAULT_RESOURCE_LIMITS
  ) {
    this.config = config;
    this.defaultLimits = defaultLimits;
    this.plugins = new Map();
    this.violationCallbacks = new Set();
    this.snapshotHistory = new Map();

    // Start window cleanup
    this.startWindowCleanup();
  }

  /**
   * Register a plugin for monitoring
   */
  registerPlugin(pluginId: string, limits?: Partial<ResourceLimits>): void {
    if (this.plugins.has(pluginId)) {
      return;
    }

    const state: PluginResourceState = {
      pluginId,
      limits: { ...this.defaultLimits, ...limits },
      totalCpuTime: 0,
      windowCpuTime: 0,
      executionCount: 0,
      peakCpuTime: 0,
      cpuTimeHistory: [],
      currentMemory: 0,
      peakMemory: 0,
      allocationCount: 0,
      totalApiCalls: 0,
      windowApiCalls: 0,
      callsByMethod: new Map(),
      failedApiCalls: 0,
      apiResponseTimes: [],
      storageBytes: 0,
      storageKeys: 0,
      storageReadOps: 0,
      storageWriteOps: 0,
      totalNetworkRequests: 0,
      windowNetworkRequests: 0,
      networkBytesSent: 0,
      networkBytesReceived: 0,
      failedNetworkRequests: 0,
      windowStart: Date.now(),
      lastSnapshot: null,
    };

    this.plugins.set(pluginId, state);
    this.snapshotHistory.set(pluginId, []);
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.snapshotHistory.delete(pluginId);
  }

  /**
   * Record CPU execution time
   */
  recordCpuTime(pluginId: string, executionTime: number): ResourceViolation | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    state.totalCpuTime += executionTime;
    state.windowCpuTime += executionTime;
    state.executionCount++;
    state.cpuTimeHistory.push(executionTime);

    if (executionTime > state.peakCpuTime) {
      state.peakCpuTime = executionTime;
    }

    // Trim history
    if (state.cpuTimeHistory.length > 100) {
      state.cpuTimeHistory.shift();
    }

    // Check per-tick limit
    if (executionTime > state.limits.maxCpuTimePerTick) {
      return this.emitViolation({
        timestamp: Date.now(),
        pluginId,
        resourceType: 'cpu',
        currentValue: executionTime,
        limit: state.limits.maxCpuTimePerTick,
        severity: 'critical',
        message: `CPU time exceeded per-tick limit: ${executionTime}ms > ${state.limits.maxCpuTimePerTick}ms`,
      });
    }

    // Check per-minute limit
    if (state.windowCpuTime > state.limits.maxCpuTimePerMinute) {
      return this.emitViolation({
        timestamp: Date.now(),
        pluginId,
        resourceType: 'cpu',
        currentValue: state.windowCpuTime,
        limit: state.limits.maxCpuTimePerMinute,
        severity: 'critical',
        message: `CPU time exceeded per-minute limit: ${state.windowCpuTime}ms > ${state.limits.maxCpuTimePerMinute}ms`,
      });
    }

    // Check warning threshold
    if (state.windowCpuTime > state.limits.maxCpuTimePerMinute * this.config.warningThreshold) {
      return this.emitViolation({
        timestamp: Date.now(),
        pluginId,
        resourceType: 'cpu',
        currentValue: state.windowCpuTime,
        limit: state.limits.maxCpuTimePerMinute,
        severity: 'warning',
        message: `CPU time approaching limit: ${state.windowCpuTime}ms / ${state.limits.maxCpuTimePerMinute}ms`,
      });
    }

    return null;
  }

  /**
   * Record memory usage
   */
  recordMemory(pluginId: string, heapSize: number): ResourceViolation | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    state.currentMemory = heapSize;
    state.allocationCount++;

    if (heapSize > state.peakMemory) {
      state.peakMemory = heapSize;
    }

    // Check limit
    if (heapSize > state.limits.maxMemory) {
      return this.emitViolation({
        timestamp: Date.now(),
        pluginId,
        resourceType: 'memory',
        currentValue: heapSize,
        limit: state.limits.maxMemory,
        severity: 'critical',
        message: `Memory exceeded limit: ${(heapSize / 1024 / 1024).toFixed(2)}MB > ${(state.limits.maxMemory / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    // Check warning threshold
    if (heapSize > state.limits.maxMemory * this.config.warningThreshold) {
      return this.emitViolation({
        timestamp: Date.now(),
        pluginId,
        resourceType: 'memory',
        currentValue: heapSize,
        limit: state.limits.maxMemory,
        severity: 'warning',
        message: `Memory approaching limit: ${(heapSize / 1024 / 1024).toFixed(2)}MB / ${(state.limits.maxMemory / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    return null;
  }

  /**
   * Record API call
   */
  recordApiCall(
    pluginId: string,
    method: string,
    responseTime: number,
    success: boolean
  ): ResourceViolation | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    state.totalApiCalls++;
    state.windowApiCalls++;
    state.apiResponseTimes.push(responseTime);

    const currentCount = state.callsByMethod.get(method) ?? 0;
    state.callsByMethod.set(method, currentCount + 1);

    if (!success) {
      state.failedApiCalls++;
    }

    // Trim response time history
    if (state.apiResponseTimes.length > 100) {
      state.apiResponseTimes.shift();
    }

    // Check limit
    if (state.windowApiCalls > state.limits.maxApiCallsPerMinute) {
      return this.emitViolation({
        timestamp: Date.now(),
        pluginId,
        resourceType: 'apiCalls',
        currentValue: state.windowApiCalls,
        limit: state.limits.maxApiCallsPerMinute,
        severity: 'critical',
        message: `API calls exceeded limit: ${state.windowApiCalls} > ${state.limits.maxApiCallsPerMinute}/min`,
      });
    }

    // Check warning threshold
    if (state.windowApiCalls > state.limits.maxApiCallsPerMinute * this.config.warningThreshold) {
      return this.emitViolation({
        timestamp: Date.now(),
        pluginId,
        resourceType: 'apiCalls',
        currentValue: state.windowApiCalls,
        limit: state.limits.maxApiCallsPerMinute,
        severity: 'warning',
        message: `API calls approaching limit: ${state.windowApiCalls} / ${state.limits.maxApiCallsPerMinute}/min`,
      });
    }

    return null;
  }

  /**
   * Record storage operation
   */
  recordStorageOp(
    pluginId: string,
    operation: 'read' | 'write',
    bytesUsed: number,
    keyCount: number
  ): ResourceViolation | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    state.storageBytes = bytesUsed;
    state.storageKeys = keyCount;

    if (operation === 'read') {
      state.storageReadOps++;
    } else {
      state.storageWriteOps++;
    }

    // Check limit
    if (bytesUsed > state.limits.maxStorage) {
      return this.emitViolation({
        timestamp: Date.now(),
        pluginId,
        resourceType: 'storage',
        currentValue: bytesUsed,
        limit: state.limits.maxStorage,
        severity: 'critical',
        message: `Storage exceeded limit: ${(bytesUsed / 1024 / 1024).toFixed(2)}MB > ${(state.limits.maxStorage / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    return null;
  }

  /**
   * Record network request
   */
  recordNetworkRequest(
    pluginId: string,
    bytesSent: number,
    bytesReceived: number,
    success: boolean
  ): ResourceViolation | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    state.totalNetworkRequests++;
    state.windowNetworkRequests++;
    state.networkBytesSent += bytesSent;
    state.networkBytesReceived += bytesReceived;

    if (!success) {
      state.failedNetworkRequests++;
    }

    // Check request limit
    if (state.windowNetworkRequests > state.limits.maxNetworkRequestsPerMinute) {
      return this.emitViolation({
        timestamp: Date.now(),
        pluginId,
        resourceType: 'network',
        currentValue: state.windowNetworkRequests,
        limit: state.limits.maxNetworkRequestsPerMinute,
        severity: 'critical',
        message: `Network requests exceeded limit: ${state.windowNetworkRequests} > ${state.limits.maxNetworkRequestsPerMinute}/min`,
      });
    }

    return null;
  }

  /**
   * Get current snapshot for a plugin
   */
  getSnapshot(pluginId: string): ResourceSnapshot | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    const avgResponseTime =
      state.apiResponseTimes.length > 0
        ? state.apiResponseTimes.reduce((a, b) => a + b, 0) / state.apiResponseTimes.length
        : 0;

    const avgCpuTime =
      state.executionCount > 0 ? state.totalCpuTime / state.executionCount : 0;

    const snapshot: ResourceSnapshot = {
      timestamp: Date.now(),
      pluginId,
      cpu: {
        totalExecutionTime: state.totalCpuTime,
        windowExecutionTime: state.windowCpuTime,
        executionCount: state.executionCount,
        averageExecutionTime: avgCpuTime,
        peakExecutionTime: state.peakCpuTime,
      },
      memory: {
        heapSize: state.currentMemory,
        peakHeapSize: state.peakMemory,
        allocationCount: state.allocationCount,
        retainedSize: state.currentMemory,
      },
      apiCalls: {
        totalCalls: state.totalApiCalls,
        windowCalls: state.windowApiCalls,
        callsByMethod: Object.fromEntries(state.callsByMethod),
        failedCalls: state.failedApiCalls,
        averageResponseTime: avgResponseTime,
      },
      storage: {
        bytesUsed: state.storageBytes,
        keyCount: state.storageKeys,
        readOps: state.storageReadOps,
        writeOps: state.storageWriteOps,
      },
      network: {
        totalRequests: state.totalNetworkRequests,
        windowRequests: state.windowNetworkRequests,
        bytesSent: state.networkBytesSent,
        bytesReceived: state.networkBytesReceived,
        failedRequests: state.failedNetworkRequests,
      },
    };

    state.lastSnapshot = snapshot;
    return snapshot;
  }

  /**
   * Get snapshot history for a plugin
   */
  getSnapshotHistory(pluginId: string): ResourceSnapshot[] {
    return this.snapshotHistory.get(pluginId) ?? [];
  }

  /**
   * Get limits for a plugin
   */
  getLimits(pluginId: string): ResourceLimits | null {
    const state = this.plugins.get(pluginId);
    return state?.limits ?? null;
  }

  /**
   * Update limits for a plugin
   */
  setLimits(pluginId: string, limits: Partial<ResourceLimits>): void {
    const state = this.plugins.get(pluginId);
    if (state) {
      state.limits = { ...state.limits, ...limits };
    }
  }

  /**
   * Register violation callback
   */
  onViolation(callback: ViolationCallback): () => void {
    this.violationCallbacks.add(callback);
    return () => this.violationCallbacks.delete(callback);
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Reset window counters
   */
  resetWindow(pluginId: string): void {
    const state = this.plugins.get(pluginId);
    if (state) {
      state.windowCpuTime = 0;
      state.windowApiCalls = 0;
      state.windowNetworkRequests = 0;
      state.windowStart = Date.now();
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.windowCleanupInterval) {
      clearInterval(this.windowCleanupInterval);
      this.windowCleanupInterval = null;
    }
    this.plugins.clear();
    this.snapshotHistory.clear();
    this.violationCallbacks.clear();
  }

  /**
   * Emit a violation to all callbacks
   */
  private emitViolation(violation: ResourceViolation): ResourceViolation {
    for (const callback of this.violationCallbacks) {
      try {
        callback(violation);
      } catch {
        // Ignore callback errors
      }
    }
    return violation;
  }

  /**
   * Start periodic window cleanup
   */
  private startWindowCleanup(): void {
    this.windowCleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [pluginId, state] of this.plugins) {
        // Reset window if expired
        if (now - state.windowStart >= this.config.windowSize) {
          // Take snapshot before reset
          const snapshot = this.getSnapshot(pluginId);
          if (snapshot) {
            const history = this.snapshotHistory.get(pluginId) ?? [];
            history.push(snapshot);
            if (history.length > this.config.maxHistoryEntries) {
              history.shift();
            }
            this.snapshotHistory.set(pluginId, history);
          }

          this.resetWindow(pluginId);
        }
      }
    }, this.config.snapshotInterval);
  }
}
