/**
 * Behavior Monitor
 *
 * Tracks runtime behavior of plugins to detect anomalous patterns
 * and potential security violations.
 */

import type { ResourceType } from '../monitoring/resource-monitor';

/**
 * Behavior event types
 */
export type BehaviorEventType =
  | 'api_call'
  | 'memory_allocation'
  | 'cpu_usage'
  | 'network_request'
  | 'storage_operation'
  | 'ui_interaction'
  | 'capability_request'
  | 'error';

/**
 * Behavior event
 */
export interface BehaviorEvent {
  readonly timestamp: number;
  readonly pluginId: string;
  readonly type: BehaviorEventType;
  readonly details: Record<string, unknown>;
}

/**
 * Behavior profile for a plugin
 */
export interface BehaviorProfile {
  readonly pluginId: string;
  readonly firstSeen: number;
  readonly lastSeen: number;
  readonly totalEvents: number;
  readonly eventCounts: Record<BehaviorEventType, number>;
  readonly averageEventRate: number;
  readonly peakEventRate: number;
  readonly resourceUsagePatterns: ResourceUsagePattern[];
  readonly apiCallPatterns: ApiCallPattern[];
  readonly anomalyScore: number;
}

/**
 * Resource usage pattern
 */
export interface ResourceUsagePattern {
  readonly resourceType: ResourceType;
  readonly averageUsage: number;
  readonly peakUsage: number;
  readonly variance: number;
  readonly trend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * API call pattern
 */
export interface ApiCallPattern {
  readonly method: string;
  readonly callCount: number;
  readonly averageResponseTime: number;
  readonly errorRate: number;
  readonly lastCalled: number;
}

/**
 * Anomaly types
 */
export type AnomalyType =
  | 'sudden_activity_spike'
  | 'unusual_api_sequence'
  | 'resource_exhaustion_attempt'
  | 'capability_escalation'
  | 'data_exfiltration_pattern'
  | 'timing_attack'
  | 'dormant_activation';

/**
 * Detected anomaly
 */
export interface DetectedAnomaly {
  readonly id: string;
  readonly pluginId: string;
  readonly type: AnomalyType;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly timestamp: number;
  readonly description: string;
  readonly evidence: BehaviorEvent[];
  readonly recommendedAction: 'monitor' | 'warn' | 'throttle' | 'suspend' | 'terminate';
}

/**
 * Anomaly callback
 */
export type AnomalyCallback = (anomaly: DetectedAnomaly) => void;

/**
 * Behavior monitor configuration
 */
export interface BehaviorMonitorConfig {
  /** Time window for rate calculations (ms) */
  readonly rateWindow: number;
  /** Maximum events to retain per plugin */
  readonly maxEventsPerPlugin: number;
  /** Anomaly detection sensitivity (0-1, higher = more sensitive) */
  readonly sensitivity: number;
  /** Enable learning mode (builds baseline without alerts) */
  readonly learningMode: boolean;
  /** Learning period duration (ms) */
  readonly learningPeriod: number;
  /** Minimum events before anomaly detection activates */
  readonly minEventsForDetection: number;
}

/**
 * Default behavior monitor configuration
 */
export const DEFAULT_BEHAVIOR_CONFIG: BehaviorMonitorConfig = {
  rateWindow: 60000, // 1 minute
  maxEventsPerPlugin: 10000,
  sensitivity: 0.7,
  learningMode: true,
  learningPeriod: 300000, // 5 minutes
  minEventsForDetection: 100,
};

/**
 * Internal event buffer
 */
interface EventBuffer {
  events: BehaviorEvent[];
  firstEventTime: number;
  windowCounts: Map<number, number>;
}

/**
 * Generate unique anomaly ID
 */
function generateAnomalyId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `anomaly_${timestamp}_${random}`;
}

/**
 * Behavior Monitor class
 */
export class BehaviorMonitor {
  private readonly config: BehaviorMonitorConfig;
  private readonly eventBuffers: Map<string, EventBuffer>;
  private readonly profiles: Map<string, BehaviorProfile>;
  private readonly anomalies: Map<string, DetectedAnomaly>;
  private readonly callbacks: Set<AnomalyCallback>;
  private readonly pluginStartTimes: Map<string, number>;
  private readonly apiSequences: Map<string, string[]>;

  constructor(config: BehaviorMonitorConfig = DEFAULT_BEHAVIOR_CONFIG) {
    this.config = config;
    this.eventBuffers = new Map();
    this.profiles = new Map();
    this.anomalies = new Map();
    this.callbacks = new Set();
    this.pluginStartTimes = new Map();
    this.apiSequences = new Map();
  }

  /**
   * Record a behavior event
   */
  recordEvent(
    pluginId: string,
    type: BehaviorEventType,
    details: Record<string, unknown> = {}
  ): DetectedAnomaly | null {
    const event: BehaviorEvent = {
      timestamp: Date.now(),
      pluginId,
      type,
      details,
    };

    // Get or create buffer
    let buffer = this.eventBuffers.get(pluginId);
    if (!buffer) {
      buffer = {
        events: [],
        firstEventTime: event.timestamp,
        windowCounts: new Map(),
      };
      this.eventBuffers.set(pluginId, buffer);
      this.pluginStartTimes.set(pluginId, event.timestamp);
    }

    // Add event to buffer
    buffer.events.push(event);

    // Track window counts for rate calculation
    const windowKey = Math.floor(event.timestamp / this.config.rateWindow);
    const currentCount = buffer.windowCounts.get(windowKey) ?? 0;
    buffer.windowCounts.set(windowKey, currentCount + 1);

    // Trim old events
    if (buffer.events.length > this.config.maxEventsPerPlugin) {
      const removed = buffer.events.shift();
      if (removed) {
        const oldWindowKey = Math.floor(removed.timestamp / this.config.rateWindow);
        const oldCount = buffer.windowCounts.get(oldWindowKey);
        if (oldCount !== undefined && oldCount > 0) {
          buffer.windowCounts.set(oldWindowKey, oldCount - 1);
        }
      }
    }

    // Update API sequence tracking
    if (type === 'api_call' && details['method']) {
      this.trackApiSequence(pluginId, String(details['method']));
    }

    // Update profile
    this.updateProfile(pluginId, buffer);

    // Check for anomalies (skip during learning period)
    const startTime = this.pluginStartTimes.get(pluginId) ?? event.timestamp;
    const inLearningPeriod =
      this.config.learningMode && event.timestamp - startTime < this.config.learningPeriod;

    if (!inLearningPeriod && buffer.events.length >= this.config.minEventsForDetection) {
      const anomaly = this.detectAnomalies(pluginId, event, buffer);
      if (anomaly) {
        this.anomalies.set(anomaly.id, anomaly);
        this.notifyCallbacks(anomaly);
        return anomaly;
      }
    }

    return null;
  }

  /**
   * Record an API call event
   */
  recordApiCall(
    pluginId: string,
    method: string,
    responseTime: number,
    success: boolean
  ): DetectedAnomaly | null {
    return this.recordEvent(pluginId, 'api_call', {
      method,
      responseTime,
      success,
    });
  }

  /**
   * Record a memory allocation event
   */
  recordMemoryAllocation(pluginId: string, bytes: number): DetectedAnomaly | null {
    return this.recordEvent(pluginId, 'memory_allocation', { bytes });
  }

  /**
   * Record CPU usage event
   */
  recordCpuUsage(pluginId: string, executionTime: number): DetectedAnomaly | null {
    return this.recordEvent(pluginId, 'cpu_usage', { executionTime });
  }

  /**
   * Record a network request event
   */
  recordNetworkRequest(
    pluginId: string,
    url: string,
    bytesSent: number,
    bytesReceived: number,
    success: boolean
  ): DetectedAnomaly | null {
    return this.recordEvent(pluginId, 'network_request', {
      url,
      bytesSent,
      bytesReceived,
      success,
    });
  }

  /**
   * Record a storage operation event
   */
  recordStorageOperation(
    pluginId: string,
    operation: 'read' | 'write' | 'delete',
    key: string,
    bytes: number
  ): DetectedAnomaly | null {
    return this.recordEvent(pluginId, 'storage_operation', {
      operation,
      key,
      bytes,
    });
  }

  /**
   * Record a capability request event
   */
  recordCapabilityRequest(
    pluginId: string,
    capability: string,
    granted: boolean
  ): DetectedAnomaly | null {
    return this.recordEvent(pluginId, 'capability_request', {
      capability,
      granted,
    });
  }

  /**
   * Record an error event
   */
  recordError(pluginId: string, errorType: string, message: string): DetectedAnomaly | null {
    return this.recordEvent(pluginId, 'error', {
      errorType,
      message,
    });
  }

  /**
   * Get behavior profile for a plugin
   */
  getProfile(pluginId: string): BehaviorProfile | null {
    return this.profiles.get(pluginId) ?? null;
  }

  /**
   * Get all detected anomalies for a plugin
   */
  getAnomalies(pluginId?: string): DetectedAnomaly[] {
    const anomalies = Array.from(this.anomalies.values());
    if (pluginId) {
      return anomalies.filter((a) => a.pluginId === pluginId);
    }
    return anomalies;
  }

  /**
   * Get recent events for a plugin
   */
  getRecentEvents(pluginId: string, limit: number = 100): BehaviorEvent[] {
    const buffer = this.eventBuffers.get(pluginId);
    if (!buffer) return [];
    return buffer.events.slice(-limit);
  }

  /**
   * Register anomaly callback
   */
  onAnomaly(callback: AnomalyCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Clear data for a plugin
   */
  clearPlugin(pluginId: string): void {
    this.eventBuffers.delete(pluginId);
    this.profiles.delete(pluginId);
    this.apiSequences.delete(pluginId);
    this.pluginStartTimes.delete(pluginId);

    // Remove anomalies for this plugin
    for (const [id, anomaly] of this.anomalies) {
      if (anomaly.pluginId === pluginId) {
        this.anomalies.delete(id);
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.eventBuffers.clear();
    this.profiles.clear();
    this.anomalies.clear();
    this.callbacks.clear();
    this.pluginStartTimes.clear();
    this.apiSequences.clear();
  }

  /**
   * Track API call sequence for pattern detection
   */
  private trackApiSequence(pluginId: string, method: string): void {
    let sequence = this.apiSequences.get(pluginId);
    if (!sequence) {
      sequence = [];
      this.apiSequences.set(pluginId, sequence);
    }

    sequence.push(method);

    // Keep only last 50 calls
    if (sequence.length > 50) {
      sequence.shift();
    }
  }

  /**
   * Update behavior profile for a plugin
   */
  private updateProfile(pluginId: string, buffer: EventBuffer): void {
    const events = buffer.events;
    if (events.length === 0) return;

    const now = Date.now();

    // Count events by type
    const eventCounts: Record<BehaviorEventType, number> = {
      api_call: 0,
      memory_allocation: 0,
      cpu_usage: 0,
      network_request: 0,
      storage_operation: 0,
      ui_interaction: 0,
      capability_request: 0,
      error: 0,
    };

    for (const event of events) {
      eventCounts[event.type]++;
    }

    // Calculate event rates
    const windowCounts = Array.from(buffer.windowCounts.values());
    const averageEventRate =
      windowCounts.length > 0 ? windowCounts.reduce((a, b) => a + b, 0) / windowCounts.length : 0;
    const peakEventRate = windowCounts.length > 0 ? Math.max(...windowCounts) : 0;

    // Calculate API call patterns
    const apiCallPatterns = this.calculateApiPatterns(events);

    // Calculate resource usage patterns
    const resourceUsagePatterns = this.calculateResourcePatterns(events);

    // Calculate anomaly score
    const anomalyScore = this.calculateAnomalyScore(
      events,
      averageEventRate,
      peakEventRate,
      apiCallPatterns
    );

    const profile: BehaviorProfile = {
      pluginId,
      firstSeen: buffer.firstEventTime,
      lastSeen: now,
      totalEvents: events.length,
      eventCounts,
      averageEventRate,
      peakEventRate,
      resourceUsagePatterns,
      apiCallPatterns,
      anomalyScore,
    };

    this.profiles.set(pluginId, profile);
  }

  /**
   * Calculate API call patterns
   */
  private calculateApiPatterns(events: BehaviorEvent[]): ApiCallPattern[] {
    const apiCalls = events.filter((e) => e.type === 'api_call');
    const methodStats: Map<
      string,
      {
        count: number;
        totalResponseTime: number;
        errors: number;
        lastCalled: number;
      }
    > = new Map();

    for (const event of apiCalls) {
      const method = String(event.details['method'] ?? 'unknown');
      const responseTime = Number(event.details['responseTime'] ?? 0);
      const success = Boolean(event.details['success']);

      const stats = methodStats.get(method) ?? {
        count: 0,
        totalResponseTime: 0,
        errors: 0,
        lastCalled: 0,
      };

      stats.count++;
      stats.totalResponseTime += responseTime;
      if (!success) stats.errors++;
      stats.lastCalled = event.timestamp;

      methodStats.set(method, stats);
    }

    return Array.from(methodStats.entries()).map(([method, stats]) => ({
      method,
      callCount: stats.count,
      averageResponseTime: stats.count > 0 ? stats.totalResponseTime / stats.count : 0,
      errorRate: stats.count > 0 ? stats.errors / stats.count : 0,
      lastCalled: stats.lastCalled,
    }));
  }

  /**
   * Calculate resource usage patterns
   */
  private calculateResourcePatterns(events: BehaviorEvent[]): ResourceUsagePattern[] {
    const patterns: ResourceUsagePattern[] = [];

    // Memory pattern
    const memoryEvents = events.filter((e) => e.type === 'memory_allocation');
    if (memoryEvents.length > 0) {
      const memoryValues = memoryEvents.map((e) => Number(e.details['bytes'] ?? 0));
      patterns.push(this.createUsagePattern('memory', memoryValues));
    }

    // CPU pattern
    const cpuEvents = events.filter((e) => e.type === 'cpu_usage');
    if (cpuEvents.length > 0) {
      const cpuValues = cpuEvents.map((e) => Number(e.details['executionTime'] ?? 0));
      patterns.push(this.createUsagePattern('cpu', cpuValues));
    }

    // Network pattern
    const networkEvents = events.filter((e) => e.type === 'network_request');
    if (networkEvents.length > 0) {
      const networkValues = networkEvents.map(
        (e) =>
          Number(e.details['bytesSent'] ?? 0) +
          Number(e.details['bytesReceived'] ?? 0)
      );
      patterns.push(this.createUsagePattern('network', networkValues));
    }

    return patterns;
  }

  /**
   * Create a usage pattern from values
   */
  private createUsagePattern(resourceType: ResourceType, values: number[]): ResourceUsagePattern {
    if (values.length === 0) {
      return {
        resourceType,
        averageUsage: 0,
        peakUsage: 0,
        variance: 0,
        trend: 'stable',
      };
    }

    const averageUsage = values.reduce((a, b) => a + b, 0) / values.length;
    const peakUsage = Math.max(...values);

    // Calculate variance
    const squaredDiffs = values.map((v) => Math.pow(v - averageUsage, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

    // Determine trend (compare first half to second half)
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (values.length >= 10) {
      const midpoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midpoint);
      const secondHalf = values.slice(midpoint);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const changePercent = (secondAvg - firstAvg) / (firstAvg || 1);
      if (changePercent > 0.1) trend = 'increasing';
      else if (changePercent < -0.1) trend = 'decreasing';
    }

    return {
      resourceType,
      averageUsage,
      peakUsage,
      variance,
      trend,
    };
  }

  /**
   * Calculate anomaly score (0-1, higher = more anomalous)
   */
  private calculateAnomalyScore(
    events: BehaviorEvent[],
    averageEventRate: number,
    peakEventRate: number,
    apiPatterns: ApiCallPattern[]
  ): number {
    let score = 0;

    // High event rate variance
    if (averageEventRate > 0) {
      const rateVariance = peakEventRate / averageEventRate;
      if (rateVariance > 3) score += 0.2;
      if (rateVariance > 5) score += 0.1;
    }

    // High error rate in API calls
    const totalCalls = apiPatterns.reduce((sum, p) => sum + p.callCount, 0);
    const totalErrors = apiPatterns.reduce(
      (sum, p) => sum + p.callCount * p.errorRate,
      0
    );
    if (totalCalls > 0) {
      const errorRate = totalErrors / totalCalls;
      if (errorRate > 0.3) score += 0.2;
      if (errorRate > 0.5) score += 0.1;
    }

    // Unusual event type distribution
    const eventTypes = new Set(events.map((e) => e.type));
    const typeRatios: Record<BehaviorEventType, number> = {
      api_call: 0,
      memory_allocation: 0,
      cpu_usage: 0,
      network_request: 0,
      storage_operation: 0,
      ui_interaction: 0,
      capability_request: 0,
      error: 0,
    };

    for (const event of events) {
      typeRatios[event.type]++;
    }

    for (const type of Object.keys(typeRatios) as BehaviorEventType[]) {
      typeRatios[type] = events.length > 0 ? typeRatios[type] / events.length : 0;
    }

    // High capability requests relative to other events
    if (typeRatios.capability_request > 0.3) score += 0.2;

    // Many errors relative to other events
    if (typeRatios.error > 0.2) score += 0.15;

    // Only one type of event (unusual)
    if (eventTypes.size === 1 && events.length > 50) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Detect anomalies in behavior
   */
  private detectAnomalies(
    pluginId: string,
    event: BehaviorEvent,
    buffer: EventBuffer
  ): DetectedAnomaly | null {
    const profile = this.profiles.get(pluginId);
    if (!profile) return null;

    // Check for sudden activity spike
    const spikeAnomaly = this.checkActivitySpike(pluginId, event, buffer, profile);
    if (spikeAnomaly) return spikeAnomaly;

    // Check for unusual API sequence
    const sequenceAnomaly = this.checkUnusualSequence(pluginId, event);
    if (sequenceAnomaly) return sequenceAnomaly;

    // Check for resource exhaustion attempt
    const exhaustionAnomaly = this.checkResourceExhaustion(pluginId, event, profile);
    if (exhaustionAnomaly) return exhaustionAnomaly;

    // Check for capability escalation
    const escalationAnomaly = this.checkCapabilityEscalation(pluginId, event, buffer);
    if (escalationAnomaly) return escalationAnomaly;

    // Check for data exfiltration pattern
    const exfilAnomaly = this.checkDataExfiltration(pluginId, event, buffer);
    if (exfilAnomaly) return exfilAnomaly;

    // Check for dormant activation
    const dormantAnomaly = this.checkDormantActivation(pluginId, event, buffer);
    if (dormantAnomaly) return dormantAnomaly;

    return null;
  }

  /**
   * Check for sudden activity spike
   */
  private checkActivitySpike(
    pluginId: string,
    event: BehaviorEvent,
    buffer: EventBuffer,
    profile: BehaviorProfile
  ): DetectedAnomaly | null {
    const currentWindowKey = Math.floor(event.timestamp / this.config.rateWindow);
    const currentCount = buffer.windowCounts.get(currentWindowKey) ?? 0;

    // Spike if current rate is 5x the average
    const threshold = profile.averageEventRate * 5 * this.config.sensitivity;
    if (currentCount > threshold && currentCount > 50) {
      const recentEvents = buffer.events.slice(-20);
      return {
        id: generateAnomalyId(),
        pluginId,
        type: 'sudden_activity_spike',
        severity: currentCount > threshold * 2 ? 'high' : 'medium',
        timestamp: event.timestamp,
        description: `Sudden activity spike detected: ${currentCount} events in current window vs ${profile.averageEventRate.toFixed(1)} average`,
        evidence: recentEvents,
        recommendedAction: currentCount > threshold * 2 ? 'throttle' : 'warn',
      };
    }

    return null;
  }

  /**
   * Check for unusual API call sequence
   */
  private checkUnusualSequence(
    pluginId: string,
    event: BehaviorEvent
  ): DetectedAnomaly | null {
    if (event.type !== 'api_call') return null;

    const sequence = this.apiSequences.get(pluginId);
    if (!sequence || sequence.length < 10) return null;

    // Check for rapid repeated calls to same method
    const lastFive = sequence.slice(-5);
    const allSame = lastFive.every((m) => m === lastFive[0]);

    if (allSame && this.config.sensitivity > 0.5) {
      return {
        id: generateAnomalyId(),
        pluginId,
        type: 'unusual_api_sequence',
        severity: 'low',
        timestamp: event.timestamp,
        description: `Unusual API sequence: ${lastFive[0]} called 5+ times in rapid succession`,
        evidence: [event],
        recommendedAction: 'monitor',
      };
    }

    // Check for suspicious patterns (e.g., enumerate then bulk operation)
    const buffer = this.eventBuffers.get(pluginId);
    const recent = buffer?.events.slice(-20) ?? [];

    // Pattern: many reads followed by bulk network requests
    const reads = recent.filter(
      (e) =>
        e.type === 'api_call' &&
        (String(e.details['method'] ?? '').includes('get') ||
          String(e.details['method'] ?? '').includes('find'))
    );
    const networks = recent.filter((e) => e.type === 'network_request');

    if (reads.length > 10 && networks.length > 3) {
      return {
        id: generateAnomalyId(),
        pluginId,
        type: 'data_exfiltration_pattern',
        severity: 'medium',
        timestamp: event.timestamp,
        description: `Potential data exfiltration: ${reads.length} read operations followed by ${networks.length} network requests`,
        evidence: [...reads.slice(-5), ...networks.slice(-3)],
        recommendedAction: 'warn',
      };
    }

    return null;
  }

  /**
   * Check for resource exhaustion attempt
   */
  private checkResourceExhaustion(
    pluginId: string,
    event: BehaviorEvent,
    profile: BehaviorProfile
  ): DetectedAnomaly | null {
    // Check memory patterns
    const memoryPattern = profile.resourceUsagePatterns.find((p) => p.resourceType === 'memory');
    if (memoryPattern && memoryPattern.trend === 'increasing' && memoryPattern.variance > 1000000) {
      // More than 1MB variance with increasing trend
      return {
        id: generateAnomalyId(),
        pluginId,
        type: 'resource_exhaustion_attempt',
        severity: 'medium',
        timestamp: event.timestamp,
        description: `Memory exhaustion pattern: increasing trend with high variance (${(memoryPattern.variance / 1024 / 1024).toFixed(2)}MB)`,
        evidence: [event],
        recommendedAction: 'throttle',
      };
    }

    // Check CPU patterns
    const cpuPattern = profile.resourceUsagePatterns.find((p) => p.resourceType === 'cpu');
    if (cpuPattern && cpuPattern.peakUsage > 200 && cpuPattern.trend === 'increasing') {
      // Peak over 200ms with increasing trend
      return {
        id: generateAnomalyId(),
        pluginId,
        type: 'resource_exhaustion_attempt',
        severity: 'medium',
        timestamp: event.timestamp,
        description: `CPU exhaustion pattern: peak ${cpuPattern.peakUsage.toFixed(0)}ms with increasing trend`,
        evidence: [event],
        recommendedAction: 'throttle',
      };
    }

    return null;
  }

  /**
   * Check for capability escalation attempts
   */
  private checkCapabilityEscalation(
    pluginId: string,
    event: BehaviorEvent,
    buffer: EventBuffer
  ): DetectedAnomaly | null {
    if (event.type !== 'capability_request') return null;

    // Get recent capability requests
    const recentCapRequests = buffer.events
      .slice(-50)
      .filter((e) => e.type === 'capability_request');

    // Count denied requests
    const deniedRequests = recentCapRequests.filter((e) => !e.details['granted']);

    // Many denied requests is suspicious
    if (deniedRequests.length >= 5) {
      return {
        id: generateAnomalyId(),
        pluginId,
        type: 'capability_escalation',
        severity: deniedRequests.length >= 10 ? 'high' : 'medium',
        timestamp: event.timestamp,
        description: `Capability escalation attempt: ${deniedRequests.length} denied capability requests`,
        evidence: deniedRequests.slice(-5),
        recommendedAction: deniedRequests.length >= 10 ? 'suspend' : 'warn',
      };
    }

    return null;
  }

  /**
   * Check for data exfiltration pattern
   */
  private checkDataExfiltration(
    pluginId: string,
    event: BehaviorEvent,
    buffer: EventBuffer
  ): DetectedAnomaly | null {
    if (event.type !== 'network_request') return null;

    // Check for large outbound data after read operations
    const recentEvents = buffer.events.slice(-30);
    const readEvents = recentEvents.filter(
      (e) =>
        e.type === 'api_call' &&
        String(e.details['method'] ?? '').match(/get|find|list|query/i)
    );
    const networkEvents = recentEvents.filter((e) => e.type === 'network_request');

    // Calculate total bytes sent
    const totalBytesSent = networkEvents.reduce(
      (sum, e) => sum + Number(e.details['bytesSent'] ?? 0),
      0
    );

    // Large data sent after many reads
    if (readEvents.length > 5 && totalBytesSent > 100000) {
      // > 100KB
      return {
        id: generateAnomalyId(),
        pluginId,
        type: 'data_exfiltration_pattern',
        severity: 'high',
        timestamp: event.timestamp,
        description: `Potential data exfiltration: ${(totalBytesSent / 1024).toFixed(1)}KB sent after ${readEvents.length} read operations`,
        evidence: [...readEvents.slice(-3), ...networkEvents.slice(-3)],
        recommendedAction: 'suspend',
      };
    }

    return null;
  }

  /**
   * Check for dormant plugin suddenly activating
   */
  private checkDormantActivation(
    pluginId: string,
    event: BehaviorEvent,
    buffer: EventBuffer
  ): DetectedAnomaly | null {
    if (buffer.events.length < 50) return null;

    // Find time gap before recent activity
    const recentEvents = buffer.events.slice(-20);
    const olderEvents = buffer.events.slice(-50, -20);

    if (olderEvents.length === 0) return null;

    const latestOld = olderEvents[olderEvents.length - 1];
    const firstRecent = recentEvents[0];

    if (!latestOld || !firstRecent) return null;

    const gapMs = firstRecent.timestamp - latestOld.timestamp;

    // If gap > 1 hour and now high activity
    if (gapMs > 3600000) {
      const recentRate = recentEvents.length / ((event.timestamp - firstRecent.timestamp) || 1);
      const firstOld = olderEvents[0];
      const oldRate = firstOld
        ? olderEvents.length / ((latestOld.timestamp - firstOld.timestamp) || 1)
        : 0;

      // Sudden burst of activity after dormancy
      if (recentRate > oldRate * 10) {
        return {
          id: generateAnomalyId(),
          pluginId,
          type: 'dormant_activation',
          severity: 'medium',
          timestamp: event.timestamp,
          description: `Dormant activation: Plugin was inactive for ${(gapMs / 3600000).toFixed(1)} hours then became highly active`,
          evidence: recentEvents.slice(-5),
          recommendedAction: 'warn',
        };
      }
    }

    return null;
  }

  /**
   * Notify callbacks about an anomaly
   */
  private notifyCallbacks(anomaly: DetectedAnomaly): void {
    for (const callback of this.callbacks) {
      try {
        callback(anomaly);
      } catch {
        // Ignore callback errors
      }
    }
  }
}
