/**
 * Memory Manager
 *
 * Tracks and enforces memory limits for plugin sandboxes.
 * Provides warnings, throttling, and termination for violations.
 */

import type { QuickJSSandbox } from './quickjs-sandbox';
import type { PluginId } from '../types/plugin-manifest';

/**
 * Memory threshold levels
 */
export enum MemoryThreshold {
  /** Normal operation */
  NORMAL = 'normal',
  /** Warning threshold (75% of limit) */
  WARNING = 'warning',
  /** Critical threshold (90% of limit) */
  CRITICAL = 'critical',
  /** Exceeded limit */
  EXCEEDED = 'exceeded',
}

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  readonly pluginId: PluginId;
  readonly usedBytes: number;
  readonly limitBytes: number;
  readonly usagePercent: number;
  readonly threshold: MemoryThreshold;
  readonly timestamp: number;
}

/**
 * Memory violation event
 */
export interface MemoryViolation {
  readonly pluginId: PluginId;
  readonly threshold: MemoryThreshold;
  readonly usedBytes: number;
  readonly limitBytes: number;
  readonly action: 'warn' | 'throttle' | 'terminate';
  readonly timestamp: number;
}

/**
 * Memory manager configuration
 */
export interface MemoryManagerConfig {
  /** Warning threshold as percentage (default: 75) */
  readonly warningThreshold: number;
  /** Critical threshold as percentage (default: 90) */
  readonly criticalThreshold: number;
  /** Number of consecutive violations before throttling (default: 3) */
  readonly violationsBeforeThrottle: number;
  /** Number of consecutive violations before termination (default: 10) */
  readonly violationsBeforeTerminate: number;
  /** Sampling interval in milliseconds (default: 1000) */
  readonly samplingInterval: number;
  /** History size per plugin (default: 60) */
  readonly historySize: number;
}

/**
 * Default memory manager configuration
 */
export const DEFAULT_MEMORY_CONFIG: MemoryManagerConfig = {
  warningThreshold: 75,
  criticalThreshold: 90,
  violationsBeforeThrottle: 3,
  violationsBeforeTerminate: 10,
  samplingInterval: 1000,
  historySize: 60,
};

/**
 * Plugin memory tracking state
 */
interface PluginMemoryState {
  readonly pluginId: PluginId;
  readonly sandbox: QuickJSSandbox;
  readonly limitBytes: number;
  history: MemorySnapshot[];
  consecutiveViolations: number;
  isThrottled: boolean;
}

/**
 * Memory violation callback
 */
export type MemoryViolationCallback = (violation: MemoryViolation) => void;

/**
 * Memory Manager for plugin sandboxes
 */
export class MemoryManager {
  private config: MemoryManagerConfig;
  private plugins: Map<PluginId, PluginMemoryState> = new Map();
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private violationCallbacks: Set<MemoryViolationCallback> = new Set();

  constructor(config: Partial<MemoryManagerConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }

  /**
   * Register a sandbox for memory monitoring
   */
  register(pluginId: PluginId, sandbox: QuickJSSandbox, limitBytes: number): void {
    this.plugins.set(pluginId, {
      pluginId,
      sandbox,
      limitBytes,
      history: [],
      consecutiveViolations: 0,
      isThrottled: false,
    });
  }

  /**
   * Unregister a sandbox
   */
  unregister(pluginId: PluginId): void {
    this.plugins.delete(pluginId);
  }

  /**
   * Start monitoring all registered sandboxes
   */
  startMonitoring(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(() => {
      this.sampleAll();
    }, this.config.samplingInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Add a violation callback
   */
  onViolation(callback: MemoryViolationCallback): () => void {
    this.violationCallbacks.add(callback);
    return () => this.violationCallbacks.delete(callback);
  }

  /**
   * Sample memory usage for all plugins
   */
  private sampleAll(): void {
    for (const state of this.plugins.values()) {
      this.sample(state);
    }
  }

  /**
   * Sample memory usage for a specific plugin
   */
  private sample(state: PluginMemoryState): void {
    if (state.sandbox.isTerminated()) {
      this.plugins.delete(state.pluginId);
      return;
    }

    const usedBytes = state.sandbox.getMemoryUsage();
    const usagePercent = (usedBytes / state.limitBytes) * 100;
    const threshold = this.getThreshold(usagePercent);
    const timestamp = Date.now();

    const snapshot: MemorySnapshot = {
      pluginId: state.pluginId,
      usedBytes,
      limitBytes: state.limitBytes,
      usagePercent,
      threshold,
      timestamp,
    };

    // Add to history (with size limit)
    state.history.push(snapshot);
    if (state.history.length > this.config.historySize) {
      state.history.shift();
    }

    // Handle threshold violations
    this.handleThreshold(state, snapshot);
  }

  /**
   * Determine threshold level from usage percentage
   */
  private getThreshold(usagePercent: number): MemoryThreshold {
    if (usagePercent >= 100) {
      return MemoryThreshold.EXCEEDED;
    }
    if (usagePercent >= this.config.criticalThreshold) {
      return MemoryThreshold.CRITICAL;
    }
    if (usagePercent >= this.config.warningThreshold) {
      return MemoryThreshold.WARNING;
    }
    return MemoryThreshold.NORMAL;
  }

  /**
   * Handle threshold violations
   */
  private handleThreshold(state: PluginMemoryState, snapshot: MemorySnapshot): void {
    if (snapshot.threshold === MemoryThreshold.NORMAL) {
      // Reset violations on normal
      state.consecutiveViolations = 0;
      state.isThrottled = false;
      return;
    }

    state.consecutiveViolations++;

    let action: 'warn' | 'throttle' | 'terminate';

    if (snapshot.threshold === MemoryThreshold.EXCEEDED ||
        state.consecutiveViolations >= this.config.violationsBeforeTerminate) {
      action = 'terminate';
      state.sandbox.terminate();
      this.plugins.delete(state.pluginId);
    } else if (state.consecutiveViolations >= this.config.violationsBeforeThrottle) {
      action = 'throttle';
      state.isThrottled = true;
    } else {
      action = 'warn';
    }

    const violation: MemoryViolation = {
      pluginId: state.pluginId,
      threshold: snapshot.threshold,
      usedBytes: snapshot.usedBytes,
      limitBytes: snapshot.limitBytes,
      action,
      timestamp: snapshot.timestamp,
    };

    this.emitViolation(violation);
  }

  /**
   * Emit violation to all callbacks
   */
  private emitViolation(violation: MemoryViolation): void {
    for (const callback of this.violationCallbacks) {
      try {
        callback(violation);
      } catch (error) {
        console.error('Memory violation callback error:', error);
      }
    }
  }

  /**
   * Get current memory snapshot for a plugin
   */
  getSnapshot(pluginId: PluginId): MemorySnapshot | null {
    const state = this.plugins.get(pluginId);
    if (!state || state.history.length === 0) {
      return null;
    }
    return state.history[state.history.length - 1]!;
  }

  /**
   * Get memory history for a plugin
   */
  getHistory(pluginId: PluginId): readonly MemorySnapshot[] {
    const state = this.plugins.get(pluginId);
    return state?.history ?? [];
  }

  /**
   * Check if a plugin is throttled
   */
  isThrottled(pluginId: PluginId): boolean {
    const state = this.plugins.get(pluginId);
    return state?.isThrottled ?? false;
  }

  /**
   * Get aggregate statistics
   */
  getStatistics(): MemoryManagerStats {
    let totalUsed = 0;
    let totalLimit = 0;
    const pluginStats: PluginMemoryStats[] = [];

    for (const state of this.plugins.values()) {
      const snapshot = this.getSnapshot(state.pluginId);
      if (snapshot) {
        totalUsed += snapshot.usedBytes;
        totalLimit += snapshot.limitBytes;
        pluginStats.push({
          pluginId: state.pluginId,
          usedBytes: snapshot.usedBytes,
          limitBytes: snapshot.limitBytes,
          usagePercent: snapshot.usagePercent,
          threshold: snapshot.threshold,
          isThrottled: state.isThrottled,
          consecutiveViolations: state.consecutiveViolations,
        });
      }
    }

    return {
      totalPlugins: this.plugins.size,
      totalUsedBytes: totalUsed,
      totalLimitBytes: totalLimit,
      plugins: pluginStats,
    };
  }

  /**
   * Force garbage collection in a sandbox
   */
  forceGC(pluginId: PluginId): void {
    const state = this.plugins.get(pluginId);
    if (!state) return;

    // QuickJS doesn't expose direct GC, but we can try to trigger it
    // by executing a minimal script
    state.sandbox.evaluate('(function() {})()').catch(() => {
      // Ignore errors
    });
  }

  /**
   * Dispose the manager
   */
  dispose(): void {
    this.stopMonitoring();
    this.plugins.clear();
    this.violationCallbacks.clear();
  }
}

/**
 * Per-plugin memory statistics
 */
export interface PluginMemoryStats {
  readonly pluginId: PluginId;
  readonly usedBytes: number;
  readonly limitBytes: number;
  readonly usagePercent: number;
  readonly threshold: MemoryThreshold;
  readonly isThrottled: boolean;
  readonly consecutiveViolations: number;
}

/**
 * Aggregate memory statistics
 */
export interface MemoryManagerStats {
  readonly totalPlugins: number;
  readonly totalUsedBytes: number;
  readonly totalLimitBytes: number;
  readonly plugins: readonly PluginMemoryStats[];
}
