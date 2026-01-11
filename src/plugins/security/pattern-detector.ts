/**
 * Pattern Detector
 *
 * Detects dangerous runtime patterns and behaviors.
 */

/**
 * Pattern types that can be detected
 */
export type PatternType =
  | 'rapid-api-calls'
  | 'memory-spike'
  | 'cpu-spike'
  | 'data-hoarding'
  | 'network-burst'
  | 'error-storm'
  | 'unusual-timing'
  | 'resource-exhaustion'
  | 'evasion-attempt';

/**
 * Pattern severity
 */
export type PatternSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Detected pattern
 */
export interface DetectedPattern {
  readonly id: string;
  readonly pluginId: string;
  readonly type: PatternType;
  readonly severity: PatternSeverity;
  readonly confidence: number;
  readonly description: string;
  readonly detectedAt: number;
  readonly evidence: PatternEvidence;
  readonly suggestedAction: string;
}

/**
 * Pattern evidence
 */
export interface PatternEvidence {
  readonly samples: readonly EvidenceSample[];
  readonly windowStart: number;
  readonly windowEnd: number;
  readonly baseline: number | null;
  readonly current: number;
  readonly threshold: number;
  readonly deviation: number;
}

/**
 * Evidence sample
 */
export interface EvidenceSample {
  readonly timestamp: number;
  readonly value: number;
  readonly label?: string;
}

/**
 * Pattern rule definition
 */
export interface PatternRule {
  readonly id: string;
  readonly type: PatternType;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly windowMs: number;
  readonly threshold: number;
  readonly minSamples: number;
  readonly severity: PatternSeverity;
  readonly cooldownMs: number;
}

/**
 * Plugin detection state
 */
interface PluginDetectionState {
  pluginId: string;

  // API call tracking
  apiCallTimestamps: number[];
  apiCallMethods: Map<string, number[]>;

  // Memory tracking
  memorySamples: EvidenceSample[];
  baselineMemory: number | null;

  // CPU tracking
  cpuSamples: EvidenceSample[];
  baselineCpu: number | null;

  // Network tracking
  networkTimestamps: number[];
  networkBytes: EvidenceSample[];

  // Error tracking
  errorTimestamps: number[];
  errorTypes: Map<string, number>;

  // Timing tracking
  operationTimings: Map<string, number[]>;

  // Cooldowns
  lastPatternDetection: Map<PatternType, number>;

  // Baseline learning
  isLearning: boolean;
  learningStartTime: number;
}

/**
 * Pattern detector configuration
 */
export interface PatternDetectorConfig {
  /** Learning period for establishing baselines (ms) */
  readonly learningPeriod: number;
  /** Default detection window (ms) */
  readonly defaultWindow: number;
  /** Maximum samples to retain */
  readonly maxSamples: number;
  /** Minimum confidence to report */
  readonly minConfidence: number;
}

/**
 * Default pattern detector configuration
 */
export const DEFAULT_PATTERN_CONFIG: PatternDetectorConfig = {
  learningPeriod: 60000, // 1 minute
  defaultWindow: 10000, // 10 seconds
  maxSamples: 1000,
  minConfidence: 0.7,
};

/**
 * Default pattern rules
 */
const DEFAULT_RULES: PatternRule[] = [
  {
    id: 'rapid-api-calls',
    type: 'rapid-api-calls',
    name: 'Rapid API Calls',
    description: 'Unusually high rate of API calls',
    enabled: true,
    windowMs: 5000,
    threshold: 100, // calls per window
    minSamples: 10,
    severity: 'medium',
    cooldownMs: 30000,
  },
  {
    id: 'memory-spike',
    type: 'memory-spike',
    name: 'Memory Spike',
    description: 'Sudden increase in memory usage',
    enabled: true,
    windowMs: 10000,
    threshold: 2.0, // 2x baseline
    minSamples: 5,
    severity: 'high',
    cooldownMs: 60000,
  },
  {
    id: 'cpu-spike',
    type: 'cpu-spike',
    name: 'CPU Spike',
    description: 'Sudden increase in CPU usage',
    enabled: true,
    windowMs: 5000,
    threshold: 3.0, // 3x baseline
    minSamples: 3,
    severity: 'high',
    cooldownMs: 30000,
  },
  {
    id: 'data-hoarding',
    type: 'data-hoarding',
    name: 'Data Hoarding',
    description: 'Excessive data collection',
    enabled: true,
    windowMs: 60000,
    threshold: 50, // unique data accesses
    minSamples: 20,
    severity: 'medium',
    cooldownMs: 120000,
  },
  {
    id: 'network-burst',
    type: 'network-burst',
    name: 'Network Burst',
    description: 'High volume of network requests',
    enabled: true,
    windowMs: 10000,
    threshold: 20, // requests per window
    minSamples: 5,
    severity: 'medium',
    cooldownMs: 60000,
  },
  {
    id: 'error-storm',
    type: 'error-storm',
    name: 'Error Storm',
    description: 'High rate of errors',
    enabled: true,
    windowMs: 30000,
    threshold: 50, // errors per window
    minSamples: 10,
    severity: 'high',
    cooldownMs: 60000,
  },
];

/**
 * Generate pattern ID
 */
function generatePatternId(): string {
  return `pattern_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Pattern Detector class
 */
export class PatternDetector {
  private readonly config: PatternDetectorConfig;
  private readonly rules: Map<string, PatternRule>;
  private readonly plugins: Map<string, PluginDetectionState>;
  private readonly callbacks: Set<(pattern: DetectedPattern) => void>;

  constructor(config: PatternDetectorConfig = DEFAULT_PATTERN_CONFIG) {
    this.config = config;
    this.rules = new Map();
    this.plugins = new Map();
    this.callbacks = new Set();

    // Add default rules
    for (const rule of DEFAULT_RULES) {
      this.rules.set(rule.id, rule);
    }
  }

  /**
   * Register a plugin for pattern detection
   */
  registerPlugin(pluginId: string): void {
    if (this.plugins.has(pluginId)) {
      return;
    }

    const state: PluginDetectionState = {
      pluginId,
      apiCallTimestamps: [],
      apiCallMethods: new Map(),
      memorySamples: [],
      baselineMemory: null,
      cpuSamples: [],
      baselineCpu: null,
      networkTimestamps: [],
      networkBytes: [],
      errorTimestamps: [],
      errorTypes: new Map(),
      operationTimings: new Map(),
      lastPatternDetection: new Map(),
      isLearning: true,
      learningStartTime: Date.now(),
    };

    this.plugins.set(pluginId, state);
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  /**
   * Record an API call
   */
  recordApiCall(pluginId: string, method: string): DetectedPattern | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    const now = Date.now();
    state.apiCallTimestamps.push(now);

    // Track by method
    let methodTimestamps = state.apiCallMethods.get(method);
    if (!methodTimestamps) {
      methodTimestamps = [];
      state.apiCallMethods.set(method, methodTimestamps);
    }
    methodTimestamps.push(now);

    // Cleanup old timestamps
    this.cleanupTimestamps(state.apiCallTimestamps);
    this.cleanupTimestamps(methodTimestamps);

    // Check for rapid API calls pattern
    return this.checkRapidApiCalls(state);
  }

  /**
   * Record memory sample
   */
  recordMemory(pluginId: string, bytes: number): DetectedPattern | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    const now = Date.now();
    state.memorySamples.push({ timestamp: now, value: bytes });

    // Update baseline during learning
    if (state.isLearning) {
      this.updateLearning(state, now);
      if (state.baselineMemory === null) {
        state.baselineMemory = bytes;
      } else {
        state.baselineMemory = (state.baselineMemory * 0.9) + (bytes * 0.1);
      }
    }

    // Cleanup old samples
    this.cleanupSamples(state.memorySamples);

    // Check for memory spike
    return this.checkMemorySpike(state);
  }

  /**
   * Record CPU sample
   */
  recordCpu(pluginId: string, executionTime: number): DetectedPattern | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    const now = Date.now();
    state.cpuSamples.push({ timestamp: now, value: executionTime });

    // Update baseline during learning
    if (state.isLearning) {
      this.updateLearning(state, now);
      if (state.baselineCpu === null) {
        state.baselineCpu = executionTime;
      } else {
        state.baselineCpu = (state.baselineCpu * 0.9) + (executionTime * 0.1);
      }
    }

    // Cleanup old samples
    this.cleanupSamples(state.cpuSamples);

    // Check for CPU spike
    return this.checkCpuSpike(state);
  }

  /**
   * Record network request
   */
  recordNetworkRequest(pluginId: string, bytes: number): DetectedPattern | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    const now = Date.now();
    state.networkTimestamps.push(now);
    state.networkBytes.push({ timestamp: now, value: bytes });

    // Cleanup
    this.cleanupTimestamps(state.networkTimestamps);
    this.cleanupSamples(state.networkBytes);

    // Check for network burst
    return this.checkNetworkBurst(state);
  }

  /**
   * Record error
   */
  recordError(pluginId: string, errorType: string): DetectedPattern | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    const now = Date.now();
    state.errorTimestamps.push(now);

    const currentCount = state.errorTypes.get(errorType) ?? 0;
    state.errorTypes.set(errorType, currentCount + 1);

    // Cleanup
    this.cleanupTimestamps(state.errorTimestamps);

    // Check for error storm
    return this.checkErrorStorm(state);
  }

  /**
   * Add a custom pattern rule
   */
  addRule(rule: PatternRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.set(ruleId, { ...rule, enabled });
      return true;
    }
    return false;
  }

  /**
   * Register pattern callback
   */
  onPattern(callback: (pattern: DetectedPattern) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get detection state for a plugin
   */
  getState(pluginId: string): PluginDetectionState | null {
    return this.plugins.get(pluginId) ?? null;
  }

  /**
   * Reset learning for a plugin
   */
  resetLearning(pluginId: string): void {
    const state = this.plugins.get(pluginId);
    if (state) {
      state.isLearning = true;
      state.learningStartTime = Date.now();
      state.baselineMemory = null;
      state.baselineCpu = null;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.plugins.clear();
    this.rules.clear();
    this.callbacks.clear();
  }

  /**
   * Check for rapid API calls pattern
   */
  private checkRapidApiCalls(state: PluginDetectionState): DetectedPattern | null {
    const rule = this.rules.get('rapid-api-calls');
    if (!rule?.enabled) return null;

    // Check cooldown
    if (this.isInCooldown(state, rule)) return null;

    const now = Date.now();
    const windowStart = now - rule.windowMs;
    const recentCalls = state.apiCallTimestamps.filter((t) => t >= windowStart);

    if (recentCalls.length < rule.minSamples) return null;

    if (recentCalls.length >= rule.threshold) {
      const pattern = this.createPattern(state, rule, {
        samples: recentCalls.map((t) => ({ timestamp: t, value: 1 })),
        windowStart,
        windowEnd: now,
        baseline: null,
        current: recentCalls.length,
        threshold: rule.threshold,
        deviation: recentCalls.length / rule.threshold,
      });

      state.lastPatternDetection.set(rule.type, now);
      this.notifyCallbacks(pattern);
      return pattern;
    }

    return null;
  }

  /**
   * Check for memory spike pattern
   */
  private checkMemorySpike(state: PluginDetectionState): DetectedPattern | null {
    if (state.isLearning) return null;

    const rule = this.rules.get('memory-spike');
    if (!rule?.enabled) return null;

    // Check cooldown
    if (this.isInCooldown(state, rule)) return null;

    const now = Date.now();
    const windowStart = now - rule.windowMs;
    const recentSamples = state.memorySamples.filter((s) => s.timestamp >= windowStart);

    if (recentSamples.length < rule.minSamples) return null;
    if (state.baselineMemory === null) return null;

    const lastSample = recentSamples[recentSamples.length - 1];
    if (!lastSample) return null;
    const currentMemory = lastSample.value;
    const ratio = currentMemory / state.baselineMemory;

    if (ratio >= rule.threshold) {
      const pattern = this.createPattern(state, rule, {
        samples: recentSamples,
        windowStart,
        windowEnd: now,
        baseline: state.baselineMemory,
        current: currentMemory,
        threshold: state.baselineMemory * rule.threshold,
        deviation: ratio,
      });

      state.lastPatternDetection.set(rule.type, now);
      this.notifyCallbacks(pattern);
      return pattern;
    }

    return null;
  }

  /**
   * Check for CPU spike pattern
   */
  private checkCpuSpike(state: PluginDetectionState): DetectedPattern | null {
    if (state.isLearning) return null;

    const rule = this.rules.get('cpu-spike');
    if (!rule?.enabled) return null;

    // Check cooldown
    if (this.isInCooldown(state, rule)) return null;

    const now = Date.now();
    const windowStart = now - rule.windowMs;
    const recentSamples = state.cpuSamples.filter((s) => s.timestamp >= windowStart);

    if (recentSamples.length < rule.minSamples) return null;
    if (state.baselineCpu === null) return null;

    const lastCpuSample = recentSamples[recentSamples.length - 1];
    if (!lastCpuSample) return null;
    const currentCpu = lastCpuSample.value;
    const ratio = currentCpu / state.baselineCpu;

    if (ratio >= rule.threshold) {
      const pattern = this.createPattern(state, rule, {
        samples: recentSamples,
        windowStart,
        windowEnd: now,
        baseline: state.baselineCpu,
        current: currentCpu,
        threshold: state.baselineCpu * rule.threshold,
        deviation: ratio,
      });

      state.lastPatternDetection.set(rule.type, now);
      this.notifyCallbacks(pattern);
      return pattern;
    }

    return null;
  }

  /**
   * Check for network burst pattern
   */
  private checkNetworkBurst(state: PluginDetectionState): DetectedPattern | null {
    const rule = this.rules.get('network-burst');
    if (!rule?.enabled) return null;

    // Check cooldown
    if (this.isInCooldown(state, rule)) return null;

    const now = Date.now();
    const windowStart = now - rule.windowMs;
    const recentRequests = state.networkTimestamps.filter((t) => t >= windowStart);

    if (recentRequests.length < rule.minSamples) return null;

    if (recentRequests.length >= rule.threshold) {
      const pattern = this.createPattern(state, rule, {
        samples: recentRequests.map((t) => ({ timestamp: t, value: 1 })),
        windowStart,
        windowEnd: now,
        baseline: null,
        current: recentRequests.length,
        threshold: rule.threshold,
        deviation: recentRequests.length / rule.threshold,
      });

      state.lastPatternDetection.set(rule.type, now);
      this.notifyCallbacks(pattern);
      return pattern;
    }

    return null;
  }

  /**
   * Check for error storm pattern
   */
  private checkErrorStorm(state: PluginDetectionState): DetectedPattern | null {
    const rule = this.rules.get('error-storm');
    if (!rule?.enabled) return null;

    // Check cooldown
    if (this.isInCooldown(state, rule)) return null;

    const now = Date.now();
    const windowStart = now - rule.windowMs;
    const recentErrors = state.errorTimestamps.filter((t) => t >= windowStart);

    if (recentErrors.length < rule.minSamples) return null;

    if (recentErrors.length >= rule.threshold) {
      const pattern = this.createPattern(state, rule, {
        samples: recentErrors.map((t) => ({ timestamp: t, value: 1 })),
        windowStart,
        windowEnd: now,
        baseline: null,
        current: recentErrors.length,
        threshold: rule.threshold,
        deviation: recentErrors.length / rule.threshold,
      });

      state.lastPatternDetection.set(rule.type, now);
      this.notifyCallbacks(pattern);
      return pattern;
    }

    return null;
  }

  /**
   * Create a detected pattern
   */
  private createPattern(
    state: PluginDetectionState,
    rule: PatternRule,
    evidence: PatternEvidence
  ): DetectedPattern {
    const confidence = Math.min(1, evidence.deviation / rule.threshold);

    return {
      id: generatePatternId(),
      pluginId: state.pluginId,
      type: rule.type,
      severity: rule.severity,
      confidence,
      description: rule.description,
      detectedAt: Date.now(),
      evidence,
      suggestedAction: this.getSuggestedAction(rule),
    };
  }

  /**
   * Get suggested action for a rule
   */
  private getSuggestedAction(rule: PatternRule): string {
    switch (rule.severity) {
      case 'critical':
        return 'Consider terminating the plugin';
      case 'high':
        return 'Consider suspending the plugin';
      case 'medium':
        return 'Consider throttling the plugin';
      case 'low':
        return 'Monitor the plugin behavior';
    }
  }

  /**
   * Check if rule is in cooldown
   */
  private isInCooldown(state: PluginDetectionState, rule: PatternRule): boolean {
    const lastDetection = state.lastPatternDetection.get(rule.type);
    if (!lastDetection) return false;
    return Date.now() - lastDetection < rule.cooldownMs;
  }

  /**
   * Update learning state
   */
  private updateLearning(state: PluginDetectionState, now: number): void {
    if (now - state.learningStartTime >= this.config.learningPeriod) {
      state.isLearning = false;
    }
  }

  /**
   * Cleanup old timestamps
   */
  private cleanupTimestamps(timestamps: number[]): void {
    const cutoff = Date.now() - this.config.defaultWindow * 10;
    let first = timestamps[0];
    while (first !== undefined && first < cutoff) {
      timestamps.shift();
      first = timestamps[0];
    }
    while (timestamps.length > this.config.maxSamples) {
      timestamps.shift();
    }
  }

  /**
   * Cleanup old samples
   */
  private cleanupSamples(samples: EvidenceSample[]): void {
    const cutoff = Date.now() - this.config.defaultWindow * 10;
    let firstSample = samples[0];
    while (firstSample && firstSample.timestamp < cutoff) {
      samples.shift();
      firstSample = samples[0];
    }
    while (samples.length > this.config.maxSamples) {
      samples.shift();
    }
  }

  /**
   * Notify callbacks of detected pattern
   */
  private notifyCallbacks(pattern: DetectedPattern): void {
    for (const callback of this.callbacks) {
      try {
        callback(pattern);
      } catch {
        // Ignore callback errors
      }
    }
  }
}
