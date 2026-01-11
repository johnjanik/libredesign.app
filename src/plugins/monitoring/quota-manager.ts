/**
 * Quota Manager
 *
 * Enforces resource limits and quotas for plugins with
 * configurable enforcement actions.
 */

import type {
  ResourceLimits,
  ResourceViolation,
  ResourceType,
} from './resource-monitor';
import { DEFAULT_RESOURCE_LIMITS } from './resource-monitor';

/**
 * Enforcement action to take when quota is exceeded
 */
export type EnforcementAction = 'warn' | 'throttle' | 'suspend' | 'terminate';

/**
 * Enforcement policy configuration
 */
export interface EnforcementPolicy {
  /** Action to take on warning (80% threshold) */
  readonly onWarning: EnforcementAction;
  /** Action to take on critical violation */
  readonly onCritical: EnforcementAction;
  /** Number of warnings before escalating */
  readonly warningsBeforeEscalation: number;
  /** Cooldown period after throttling in ms */
  readonly throttleCooldown: number;
  /** Suspend duration in ms */
  readonly suspendDuration: number;
  /** Whether to auto-resume after suspend */
  readonly autoResume: boolean;
}

/**
 * Default enforcement policy
 */
export const DEFAULT_ENFORCEMENT_POLICY: EnforcementPolicy = {
  onWarning: 'warn',
  onCritical: 'throttle',
  warningsBeforeEscalation: 3,
  throttleCooldown: 5000,
  suspendDuration: 30000,
  autoResume: true,
};

/**
 * Plugin quota state
 */
export type PluginQuotaStatus = 'active' | 'throttled' | 'suspended' | 'terminated';

/**
 * Plugin quota information
 */
export interface PluginQuota {
  readonly pluginId: string;
  readonly limits: ResourceLimits;
  readonly policy: EnforcementPolicy;
  readonly status: PluginQuotaStatus;
  readonly warningCount: number;
  readonly violationCount: number;
  readonly lastViolation: ResourceViolation | null;
  readonly throttledUntil: number | null;
  readonly suspendedUntil: number | null;
}

/**
 * Quota check result
 */
export interface QuotaCheckResult {
  readonly allowed: boolean;
  readonly action: EnforcementAction | null;
  readonly reason: string | null;
  readonly retryAfter: number | null;
}

/**
 * Quota event types
 */
export type QuotaEventType =
  | 'warning'
  | 'throttled'
  | 'suspended'
  | 'terminated'
  | 'resumed';

/**
 * Quota event
 */
export interface QuotaEvent {
  readonly type: QuotaEventType;
  readonly pluginId: string;
  readonly timestamp: number;
  readonly violation: ResourceViolation | null;
  readonly details: string;
}

/**
 * Quota event callback
 */
export type QuotaEventCallback = (event: QuotaEvent) => void;

/**
 * Plugin quota state
 */
interface PluginQuotaState {
  pluginId: string;
  limits: ResourceLimits;
  policy: EnforcementPolicy;
  status: PluginQuotaStatus;
  warningCount: number;
  violationCount: number;
  lastViolation: ResourceViolation | null;
  throttledUntil: number | null;
  suspendedUntil: number | null;
  lastResetTime: number;
}

/**
 * Quota Manager class
 */
export class QuotaManager {
  private readonly defaultLimits: ResourceLimits;
  private readonly defaultPolicy: EnforcementPolicy;
  private readonly plugins: Map<string, PluginQuotaState>;
  private readonly eventCallbacks: Set<QuotaEventCallback>;
  private resumeTimers: Map<string, ReturnType<typeof setTimeout>>;

  constructor(
    defaultLimits: ResourceLimits = DEFAULT_RESOURCE_LIMITS,
    defaultPolicy: EnforcementPolicy = DEFAULT_ENFORCEMENT_POLICY
  ) {
    this.defaultLimits = defaultLimits;
    this.defaultPolicy = defaultPolicy;
    this.plugins = new Map();
    this.eventCallbacks = new Set();
    this.resumeTimers = new Map();
  }

  /**
   * Register a plugin with optional custom limits and policy
   */
  registerPlugin(
    pluginId: string,
    limits?: Partial<ResourceLimits>,
    policy?: Partial<EnforcementPolicy>
  ): void {
    if (this.plugins.has(pluginId)) {
      return;
    }

    const state: PluginQuotaState = {
      pluginId,
      limits: { ...this.defaultLimits, ...limits },
      policy: { ...this.defaultPolicy, ...policy },
      status: 'active',
      warningCount: 0,
      violationCount: 0,
      lastViolation: null,
      throttledUntil: null,
      suspendedUntil: null,
      lastResetTime: Date.now(),
    };

    this.plugins.set(pluginId, state);
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): void {
    // Clear any pending resume timer
    const timer = this.resumeTimers.get(pluginId);
    if (timer) {
      clearTimeout(timer);
      this.resumeTimers.delete(pluginId);
    }

    this.plugins.delete(pluginId);
  }

  /**
   * Check if an operation is allowed for a plugin
   */
  checkQuota(pluginId: string, resourceType: ResourceType): QuotaCheckResult {
    const state = this.plugins.get(pluginId);
    if (!state) {
      return {
        allowed: false,
        action: null,
        reason: 'Plugin not registered',
        retryAfter: null,
      };
    }

    const now = Date.now();

    // Check if terminated
    if (state.status === 'terminated') {
      return {
        allowed: false,
        action: 'terminate',
        reason: 'Plugin has been terminated due to quota violations',
        retryAfter: null,
      };
    }

    // Check if suspended
    if (state.status === 'suspended' && state.suspendedUntil) {
      if (now < state.suspendedUntil) {
        return {
          allowed: false,
          action: 'suspend',
          reason: 'Plugin is suspended',
          retryAfter: state.suspendedUntil - now,
        };
      } else {
        // Resume automatically
        this.resumePlugin(pluginId);
      }
    }

    // Check if throttled
    if (state.status === 'throttled' && state.throttledUntil) {
      if (now < state.throttledUntil) {
        return {
          allowed: false,
          action: 'throttle',
          reason: `Plugin is throttled for ${resourceType}`,
          retryAfter: state.throttledUntil - now,
        };
      } else {
        // Remove throttle
        state.status = 'active';
        state.throttledUntil = null;
      }
    }

    return {
      allowed: true,
      action: null,
      reason: null,
      retryAfter: null,
    };
  }

  /**
   * Handle a resource violation
   */
  handleViolation(violation: ResourceViolation): EnforcementAction {
    const state = this.plugins.get(violation.pluginId);
    if (!state) {
      return 'warn';
    }

    state.lastViolation = violation;
    state.violationCount++;

    let action: EnforcementAction;

    if (violation.severity === 'warning') {
      state.warningCount++;
      action = state.policy.onWarning;

      // Escalate if too many warnings
      if (state.warningCount >= state.policy.warningsBeforeEscalation) {
        action = this.escalateAction(action);
      }
    } else {
      action = state.policy.onCritical;
    }

    // Apply the enforcement action
    this.applyAction(violation.pluginId, action, violation);

    return action;
  }

  /**
   * Get quota information for a plugin
   */
  getQuota(pluginId: string): PluginQuota | null {
    const state = this.plugins.get(pluginId);
    if (!state) {
      return null;
    }

    return {
      pluginId: state.pluginId,
      limits: state.limits,
      policy: state.policy,
      status: state.status,
      warningCount: state.warningCount,
      violationCount: state.violationCount,
      lastViolation: state.lastViolation,
      throttledUntil: state.throttledUntil,
      suspendedUntil: state.suspendedUntil,
    };
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
   * Update policy for a plugin
   */
  setPolicy(pluginId: string, policy: Partial<EnforcementPolicy>): void {
    const state = this.plugins.get(pluginId);
    if (state) {
      state.policy = { ...state.policy, ...policy };
    }
  }

  /**
   * Manually resume a plugin
   */
  resumePlugin(pluginId: string): boolean {
    const state = this.plugins.get(pluginId);
    if (!state) {
      return false;
    }

    if (state.status === 'terminated') {
      return false; // Cannot resume terminated plugins
    }

    const wasNotActive = state.status !== 'active';
    state.status = 'active';
    state.throttledUntil = null;
    state.suspendedUntil = null;

    // Clear resume timer
    const timer = this.resumeTimers.get(pluginId);
    if (timer) {
      clearTimeout(timer);
      this.resumeTimers.delete(pluginId);
    }

    if (wasNotActive) {
      this.emitEvent({
        type: 'resumed',
        pluginId,
        timestamp: Date.now(),
        violation: null,
        details: 'Plugin resumed',
      });
    }

    return true;
  }

  /**
   * Manually suspend a plugin
   */
  suspendPlugin(pluginId: string, duration?: number): boolean {
    const state = this.plugins.get(pluginId);
    if (!state) {
      return false;
    }

    const suspendDuration = duration ?? state.policy.suspendDuration;
    state.status = 'suspended';
    state.suspendedUntil = Date.now() + suspendDuration;

    this.emitEvent({
      type: 'suspended',
      pluginId,
      timestamp: Date.now(),
      violation: state.lastViolation,
      details: `Plugin suspended for ${suspendDuration}ms`,
    });

    // Set up auto-resume if enabled
    if (state.policy.autoResume) {
      this.scheduleResume(pluginId, suspendDuration);
    }

    return true;
  }

  /**
   * Terminate a plugin (cannot be resumed)
   */
  terminatePlugin(pluginId: string): boolean {
    const state = this.plugins.get(pluginId);
    if (!state) {
      return false;
    }

    state.status = 'terminated';
    state.throttledUntil = null;
    state.suspendedUntil = null;

    // Clear resume timer
    const timer = this.resumeTimers.get(pluginId);
    if (timer) {
      clearTimeout(timer);
      this.resumeTimers.delete(pluginId);
    }

    this.emitEvent({
      type: 'terminated',
      pluginId,
      timestamp: Date.now(),
      violation: state.lastViolation,
      details: 'Plugin terminated due to repeated violations',
    });

    return true;
  }

  /**
   * Reset warning and violation counts
   */
  resetCounts(pluginId: string): void {
    const state = this.plugins.get(pluginId);
    if (state) {
      state.warningCount = 0;
      state.violationCount = 0;
      state.lastResetTime = Date.now();
    }
  }

  /**
   * Register event callback
   */
  onEvent(callback: QuotaEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get plugins by status
   */
  getPluginsByStatus(status: PluginQuotaStatus): string[] {
    const result: string[] = [];
    for (const [pluginId, state] of this.plugins) {
      if (state.status === status) {
        result.push(pluginId);
      }
    }
    return result;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Clear all resume timers
    for (const timer of this.resumeTimers.values()) {
      clearTimeout(timer);
    }
    this.resumeTimers.clear();
    this.plugins.clear();
    this.eventCallbacks.clear();
  }

  /**
   * Escalate an action to the next level
   */
  private escalateAction(action: EnforcementAction): EnforcementAction {
    switch (action) {
      case 'warn':
        return 'throttle';
      case 'throttle':
        return 'suspend';
      case 'suspend':
        return 'terminate';
      case 'terminate':
        return 'terminate';
    }
  }

  /**
   * Apply an enforcement action
   */
  private applyAction(
    pluginId: string,
    action: EnforcementAction,
    violation: ResourceViolation
  ): void {
    const state = this.plugins.get(pluginId);
    if (!state) return;

    switch (action) {
      case 'warn':
        this.emitEvent({
          type: 'warning',
          pluginId,
          timestamp: Date.now(),
          violation,
          details: violation.message,
        });
        break;

      case 'throttle':
        state.status = 'throttled';
        state.throttledUntil = Date.now() + state.policy.throttleCooldown;
        this.emitEvent({
          type: 'throttled',
          pluginId,
          timestamp: Date.now(),
          violation,
          details: `Throttled for ${state.policy.throttleCooldown}ms`,
        });
        break;

      case 'suspend':
        this.suspendPlugin(pluginId);
        break;

      case 'terminate':
        this.terminatePlugin(pluginId);
        break;
    }
  }

  /**
   * Schedule automatic resume
   */
  private scheduleResume(pluginId: string, delay: number): void {
    // Clear existing timer
    const existingTimer = this.resumeTimers.get(pluginId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.resumeTimers.delete(pluginId);
      this.resumePlugin(pluginId);
    }, delay);

    this.resumeTimers.set(pluginId, timer);
  }

  /**
   * Emit an event to all callbacks
   */
  private emitEvent(event: QuotaEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}
