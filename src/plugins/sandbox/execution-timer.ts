/**
 * Execution Timer
 *
 * Tracks and enforces CPU time limits for plugin execution.
 * Provides timing statistics and timeout enforcement.
 */

import type { PluginId } from '../types/plugin-manifest';

/**
 * Execution timing record
 */
export interface ExecutionTiming {
  readonly pluginId: PluginId;
  readonly operationId: string;
  readonly operationType: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly timedOut: boolean;
}

/**
 * Execution budget for a time window
 */
export interface ExecutionBudget {
  /** Total CPU time allowed in the window (ms) */
  readonly budgetMs: number;
  /** Time window duration (ms) */
  readonly windowMs: number;
  /** CPU time used in current window (ms) */
  usedMs: number;
  /** Window start timestamp */
  windowStart: number;
}

/**
 * Execution timer configuration
 */
export interface ExecutionTimerConfig {
  /** Default timeout per operation (ms) */
  readonly defaultTimeout: number;
  /** Budget period for rate limiting (ms) */
  readonly budgetWindow: number;
  /** CPU budget per window (ms) */
  readonly cpuBudget: number;
  /** History size per plugin */
  readonly historySize: number;
}

/**
 * Default timer configuration
 */
export const DEFAULT_TIMER_CONFIG: ExecutionTimerConfig = {
  defaultTimeout: 50,
  budgetWindow: 60000, // 1 minute
  cpuBudget: 5000, // 5 seconds per minute
  historySize: 100,
};

/**
 * Plugin execution state
 */
interface PluginExecutionState {
  readonly pluginId: PluginId;
  history: ExecutionTiming[];
  budget: ExecutionBudget;
  activeOperations: Map<string, { startTime: number; timeout: number }>;
  operationCounter: number;
}

/**
 * Execution timeout callback
 */
export type TimeoutCallback = (pluginId: PluginId, operationId: string, duration: number) => void;

/**
 * Execution Timer for plugin sandboxes
 */
export class ExecutionTimer {
  private config: ExecutionTimerConfig;
  private plugins: Map<PluginId, PluginExecutionState> = new Map();
  private timeoutCallbacks: Set<TimeoutCallback> = new Set();

  constructor(config: Partial<ExecutionTimerConfig> = {}) {
    this.config = { ...DEFAULT_TIMER_CONFIG, ...config };
  }

  /**
   * Register a plugin for timing
   */
  register(pluginId: PluginId, cpuBudget?: number): void {
    const now = Date.now();
    this.plugins.set(pluginId, {
      pluginId,
      history: [],
      budget: {
        budgetMs: cpuBudget ?? this.config.cpuBudget,
        windowMs: this.config.budgetWindow,
        usedMs: 0,
        windowStart: now,
      },
      activeOperations: new Map(),
      operationCounter: 0,
    });
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: PluginId): void {
    this.plugins.delete(pluginId);
  }

  /**
   * Add a timeout callback
   */
  onTimeout(callback: TimeoutCallback): () => void {
    this.timeoutCallbacks.add(callback);
    return () => this.timeoutCallbacks.delete(callback);
  }

  /**
   * Start timing an operation
   * Returns operation ID for tracking
   */
  startOperation(pluginId: PluginId, _operationType: string, timeout?: number): string | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    // Check budget
    this.refreshBudget(state);
    if (state.budget.usedMs >= state.budget.budgetMs) {
      return null; // Budget exhausted
    }

    const operationId = `op_${++state.operationCounter}`;
    const effectiveTimeout = timeout ?? this.config.defaultTimeout;

    state.activeOperations.set(operationId, {
      startTime: Date.now(),
      timeout: effectiveTimeout,
    });

    return operationId;
  }

  /**
   * End timing an operation
   */
  endOperation(pluginId: PluginId, operationId: string): ExecutionTiming | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    const operation = state.activeOperations.get(operationId);
    if (!operation) return null;

    state.activeOperations.delete(operationId);

    const endTime = Date.now();
    const duration = endTime - operation.startTime;
    const timedOut = duration > operation.timeout;

    const timing: ExecutionTiming = {
      pluginId,
      operationId,
      operationType: 'unknown', // Could be enhanced to track this
      startTime: operation.startTime,
      endTime,
      duration,
      timedOut,
    };

    // Add to history
    state.history.push(timing);
    if (state.history.length > this.config.historySize) {
      state.history.shift();
    }

    // Update budget
    state.budget.usedMs += duration;

    // Emit timeout if exceeded
    if (timedOut) {
      this.emitTimeout(pluginId, operationId, duration);
    }

    return timing;
  }

  /**
   * Check if an operation has timed out
   */
  isOperationTimedOut(pluginId: PluginId, operationId: string): boolean {
    const state = this.plugins.get(pluginId);
    if (!state) return false;

    const operation = state.activeOperations.get(operationId);
    if (!operation) return false;

    const elapsed = Date.now() - operation.startTime;
    return elapsed > operation.timeout;
  }

  /**
   * Get remaining time for an operation
   */
  getRemainingTime(pluginId: PluginId, operationId: string): number {
    const state = this.plugins.get(pluginId);
    if (!state) return 0;

    const operation = state.activeOperations.get(operationId);
    if (!operation) return 0;

    const elapsed = Date.now() - operation.startTime;
    return Math.max(0, operation.timeout - elapsed);
  }

  /**
   * Check if plugin has CPU budget remaining
   */
  hasBudget(pluginId: PluginId): boolean {
    const state = this.plugins.get(pluginId);
    if (!state) return false;

    this.refreshBudget(state);
    return state.budget.usedMs < state.budget.budgetMs;
  }

  /**
   * Get remaining budget in milliseconds
   */
  getRemainingBudget(pluginId: PluginId): number {
    const state = this.plugins.get(pluginId);
    if (!state) return 0;

    this.refreshBudget(state);
    return Math.max(0, state.budget.budgetMs - state.budget.usedMs);
  }

  /**
   * Refresh budget window if expired
   */
  private refreshBudget(state: PluginExecutionState): void {
    const now = Date.now();
    if (now - state.budget.windowStart >= state.budget.windowMs) {
      state.budget.usedMs = 0;
      state.budget.windowStart = now;
    }
  }

  /**
   * Emit timeout event
   */
  private emitTimeout(pluginId: PluginId, operationId: string, duration: number): void {
    for (const callback of this.timeoutCallbacks) {
      try {
        callback(pluginId, operationId, duration);
      } catch (error) {
        console.error('Timeout callback error:', error);
      }
    }
  }

  /**
   * Get execution history for a plugin
   */
  getHistory(pluginId: PluginId): readonly ExecutionTiming[] {
    const state = this.plugins.get(pluginId);
    return state?.history ?? [];
  }

  /**
   * Get execution statistics for a plugin
   */
  getStatistics(pluginId: PluginId): PluginExecutionStats | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    this.refreshBudget(state);

    const history = state.history;
    if (history.length === 0) {
      return {
        pluginId,
        totalOperations: 0,
        totalDuration: 0,
        averageDuration: 0,
        maxDuration: 0,
        timeouts: 0,
        budgetUsed: state.budget.usedMs,
        budgetRemaining: state.budget.budgetMs - state.budget.usedMs,
        activeOperations: state.activeOperations.size,
      };
    }

    let totalDuration = 0;
    let maxDuration = 0;
    let timeouts = 0;

    for (const timing of history) {
      totalDuration += timing.duration;
      maxDuration = Math.max(maxDuration, timing.duration);
      if (timing.timedOut) timeouts++;
    }

    return {
      pluginId,
      totalOperations: history.length,
      totalDuration,
      averageDuration: totalDuration / history.length,
      maxDuration,
      timeouts,
      budgetUsed: state.budget.usedMs,
      budgetRemaining: state.budget.budgetMs - state.budget.usedMs,
      activeOperations: state.activeOperations.size,
    };
  }

  /**
   * Get aggregate statistics for all plugins
   */
  getAggregateStatistics(): ExecutionTimerStats {
    const pluginStats: PluginExecutionStats[] = [];
    let totalOperations = 0;
    let totalDuration = 0;
    let totalTimeouts = 0;

    for (const [pluginId] of this.plugins) {
      const stats = this.getStatistics(pluginId);
      if (stats) {
        pluginStats.push(stats);
        totalOperations += stats.totalOperations;
        totalDuration += stats.totalDuration;
        totalTimeouts += stats.timeouts;
      }
    }

    return {
      totalPlugins: this.plugins.size,
      totalOperations,
      totalDuration,
      totalTimeouts,
      plugins: pluginStats,
    };
  }

  /**
   * Cancel all active operations for a plugin
   */
  cancelAllOperations(pluginId: PluginId): void {
    const state = this.plugins.get(pluginId);
    if (!state) return;

    for (const operationId of state.activeOperations.keys()) {
      this.endOperation(pluginId, operationId);
    }
  }

  /**
   * Dispose the timer
   */
  dispose(): void {
    // Cancel all operations
    for (const pluginId of this.plugins.keys()) {
      this.cancelAllOperations(pluginId);
    }
    this.plugins.clear();
    this.timeoutCallbacks.clear();
  }
}

/**
 * Per-plugin execution statistics
 */
export interface PluginExecutionStats {
  readonly pluginId: PluginId;
  readonly totalOperations: number;
  readonly totalDuration: number;
  readonly averageDuration: number;
  readonly maxDuration: number;
  readonly timeouts: number;
  readonly budgetUsed: number;
  readonly budgetRemaining: number;
  readonly activeOperations: number;
}

/**
 * Aggregate execution statistics
 */
export interface ExecutionTimerStats {
  readonly totalPlugins: number;
  readonly totalOperations: number;
  readonly totalDuration: number;
  readonly totalTimeouts: number;
  readonly plugins: readonly PluginExecutionStats[];
}
