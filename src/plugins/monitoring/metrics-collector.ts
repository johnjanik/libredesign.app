/**
 * Metrics Collector
 *
 * Collects and aggregates usage statistics for plugins.
 */

import type { ResourceSnapshot, ResourceType } from './resource-monitor';

/**
 * Time period for aggregation
 */
export type MetricPeriod = 'minute' | 'hour' | 'day' | 'week' | 'month';

/**
 * Aggregated metric data
 */
export interface AggregatedMetric {
  readonly period: MetricPeriod;
  readonly startTime: number;
  readonly endTime: number;
  readonly sampleCount: number;
  readonly min: number;
  readonly max: number;
  readonly sum: number;
  readonly avg: number;
  readonly p50: number;
  readonly p90: number;
  readonly p99: number;
}

/**
 * Plugin metrics summary
 */
export interface PluginMetricsSummary {
  readonly pluginId: string;
  readonly collectionStartTime: number;
  readonly totalSamples: number;
  readonly lastSampleTime: number;
  readonly cpu: {
    readonly totalExecutionTime: AggregatedMetric;
    readonly averageExecutionTime: AggregatedMetric;
    readonly peakExecutionTime: number;
    readonly executionCount: number;
  };
  readonly memory: {
    readonly heapSize: AggregatedMetric;
    readonly peakHeapSize: number;
    readonly allocationCount: number;
  };
  readonly apiCalls: {
    readonly callCount: AggregatedMetric;
    readonly responseTime: AggregatedMetric;
    readonly failureRate: number;
    readonly topMethods: readonly MethodStats[];
  };
  readonly storage: {
    readonly bytesUsed: AggregatedMetric;
    readonly operationCount: number;
  };
  readonly network: {
    readonly requestCount: AggregatedMetric;
    readonly bytesTransferred: AggregatedMetric;
    readonly failureRate: number;
  };
}

/**
 * Method statistics
 */
export interface MethodStats {
  readonly method: string;
  readonly callCount: number;
  readonly percentage: number;
}

/**
 * Raw metric sample
 */
interface MetricSample {
  readonly timestamp: number;
  readonly value: number;
}

/**
 * Plugin metric data
 */
interface PluginMetricData {
  pluginId: string;
  collectionStartTime: number;
  totalSamples: number;

  // CPU samples
  cpuExecutionTimes: MetricSample[];
  peakCpuTime: number;
  totalExecutionCount: number;

  // Memory samples
  memorySamples: MetricSample[];
  peakMemory: number;
  totalAllocations: number;

  // API call samples
  apiCallCounts: MetricSample[];
  apiResponseTimes: MetricSample[];
  totalApiCalls: number;
  failedApiCalls: number;
  methodCalls: Map<string, number>;

  // Storage samples
  storageSamples: MetricSample[];
  totalStorageOps: number;

  // Network samples
  networkRequestCounts: MetricSample[];
  networkBytesSamples: MetricSample[];
  totalNetworkRequests: number;
  failedNetworkRequests: number;
}

/**
 * Metrics collector configuration
 */
export interface MetricsCollectorConfig {
  /** Maximum samples to retain per metric */
  readonly maxSamplesPerMetric: number;
  /** Sample retention period in ms */
  readonly retentionPeriod: number;
  /** Aggregation interval in ms */
  readonly aggregationInterval: number;
}

/**
 * Default metrics collector configuration
 */
export const DEFAULT_METRICS_CONFIG: MetricsCollectorConfig = {
  maxSamplesPerMetric: 1000,
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  aggregationInterval: 60000, // 1 minute
};

/**
 * Period durations in milliseconds
 */
const PERIOD_DURATIONS: Record<MetricPeriod, number> = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

/**
 * Metrics Collector class
 */
export class MetricsCollector {
  private readonly config: MetricsCollectorConfig;
  private readonly plugins: Map<string, PluginMetricData>;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: MetricsCollectorConfig = DEFAULT_METRICS_CONFIG) {
    this.config = config;
    this.plugins = new Map();

    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Register a plugin for metrics collection
   */
  registerPlugin(pluginId: string): void {
    if (this.plugins.has(pluginId)) {
      return;
    }

    const data: PluginMetricData = {
      pluginId,
      collectionStartTime: Date.now(),
      totalSamples: 0,
      cpuExecutionTimes: [],
      peakCpuTime: 0,
      totalExecutionCount: 0,
      memorySamples: [],
      peakMemory: 0,
      totalAllocations: 0,
      apiCallCounts: [],
      apiResponseTimes: [],
      totalApiCalls: 0,
      failedApiCalls: 0,
      methodCalls: new Map(),
      storageSamples: [],
      totalStorageOps: 0,
      networkRequestCounts: [],
      networkBytesSamples: [],
      totalNetworkRequests: 0,
      failedNetworkRequests: 0,
    };

    this.plugins.set(pluginId, data);
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  /**
   * Record a resource snapshot
   */
  recordSnapshot(snapshot: ResourceSnapshot): void {
    const data = this.plugins.get(snapshot.pluginId);
    if (!data) return;

    const timestamp = snapshot.timestamp;
    data.totalSamples++;

    // CPU metrics
    this.addSample(data.cpuExecutionTimes, timestamp, snapshot.cpu.averageExecutionTime);
    data.totalExecutionCount += snapshot.cpu.executionCount;
    if (snapshot.cpu.peakExecutionTime > data.peakCpuTime) {
      data.peakCpuTime = snapshot.cpu.peakExecutionTime;
    }

    // Memory metrics
    this.addSample(data.memorySamples, timestamp, snapshot.memory.heapSize);
    data.totalAllocations += snapshot.memory.allocationCount;
    if (snapshot.memory.peakHeapSize > data.peakMemory) {
      data.peakMemory = snapshot.memory.peakHeapSize;
    }

    // API call metrics
    this.addSample(data.apiCallCounts, timestamp, snapshot.apiCalls.windowCalls);
    this.addSample(data.apiResponseTimes, timestamp, snapshot.apiCalls.averageResponseTime);
    data.totalApiCalls += snapshot.apiCalls.windowCalls;
    data.failedApiCalls += snapshot.apiCalls.failedCalls;

    // Aggregate method calls
    for (const [method, count] of Object.entries(snapshot.apiCalls.callsByMethod)) {
      const currentCount = data.methodCalls.get(method) ?? 0;
      data.methodCalls.set(method, currentCount + count);
    }

    // Storage metrics
    this.addSample(data.storageSamples, timestamp, snapshot.storage.bytesUsed);
    data.totalStorageOps += snapshot.storage.readOps + snapshot.storage.writeOps;

    // Network metrics
    this.addSample(data.networkRequestCounts, timestamp, snapshot.network.windowRequests);
    this.addSample(
      data.networkBytesSamples,
      timestamp,
      snapshot.network.bytesSent + snapshot.network.bytesReceived
    );
    data.totalNetworkRequests += snapshot.network.windowRequests;
    data.failedNetworkRequests += snapshot.network.failedRequests;
  }

  /**
   * Get metrics summary for a plugin
   */
  getSummary(pluginId: string, period: MetricPeriod = 'hour'): PluginMetricsSummary | null {
    const data = this.plugins.get(pluginId);
    if (!data) return null;

    const now = Date.now();
    const periodDuration = PERIOD_DURATIONS[period];
    const startTime = now - periodDuration;

    // Get top methods
    const topMethods = this.getTopMethods(data.methodCalls, 10);

    return {
      pluginId,
      collectionStartTime: data.collectionStartTime,
      totalSamples: data.totalSamples,
      lastSampleTime: this.getLastSampleTime(data),
      cpu: {
        totalExecutionTime: this.aggregateSamples(data.cpuExecutionTimes, startTime, now, period),
        averageExecutionTime: this.aggregateSamples(data.cpuExecutionTimes, startTime, now, period),
        peakExecutionTime: data.peakCpuTime,
        executionCount: data.totalExecutionCount,
      },
      memory: {
        heapSize: this.aggregateSamples(data.memorySamples, startTime, now, period),
        peakHeapSize: data.peakMemory,
        allocationCount: data.totalAllocations,
      },
      apiCalls: {
        callCount: this.aggregateSamples(data.apiCallCounts, startTime, now, period),
        responseTime: this.aggregateSamples(data.apiResponseTimes, startTime, now, period),
        failureRate: data.totalApiCalls > 0 ? data.failedApiCalls / data.totalApiCalls : 0,
        topMethods,
      },
      storage: {
        bytesUsed: this.aggregateSamples(data.storageSamples, startTime, now, period),
        operationCount: data.totalStorageOps,
      },
      network: {
        requestCount: this.aggregateSamples(data.networkRequestCounts, startTime, now, period),
        bytesTransferred: this.aggregateSamples(data.networkBytesSamples, startTime, now, period),
        failureRate:
          data.totalNetworkRequests > 0
            ? data.failedNetworkRequests / data.totalNetworkRequests
            : 0,
      },
    };
  }

  /**
   * Get aggregated metrics for a specific resource type
   */
  getMetrics(
    pluginId: string,
    resourceType: ResourceType,
    period: MetricPeriod = 'hour'
  ): AggregatedMetric | null {
    const data = this.plugins.get(pluginId);
    if (!data) return null;

    const now = Date.now();
    const periodDuration = PERIOD_DURATIONS[period];
    const startTime = now - periodDuration;

    let samples: MetricSample[];
    switch (resourceType) {
      case 'cpu':
        samples = data.cpuExecutionTimes;
        break;
      case 'memory':
        samples = data.memorySamples;
        break;
      case 'apiCalls':
        samples = data.apiCallCounts;
        break;
      case 'storage':
        samples = data.storageSamples;
        break;
      case 'network':
        samples = data.networkRequestCounts;
        break;
      default:
        return null;
    }

    return this.aggregateSamples(samples, startTime, now, period);
  }

  /**
   * Get time series data for a resource
   */
  getTimeSeries(
    pluginId: string,
    resourceType: ResourceType,
    startTime: number,
    endTime: number
  ): MetricSample[] {
    const data = this.plugins.get(pluginId);
    if (!data) return [];

    let samples: MetricSample[];
    switch (resourceType) {
      case 'cpu':
        samples = data.cpuExecutionTimes;
        break;
      case 'memory':
        samples = data.memorySamples;
        break;
      case 'apiCalls':
        samples = data.apiCallCounts;
        break;
      case 'storage':
        samples = data.storageSamples;
        break;
      case 'network':
        samples = data.networkRequestCounts;
        break;
      default:
        return [];
    }

    return samples.filter((s) => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  /**
   * Export all metrics for a plugin
   */
  exportMetrics(pluginId: string): Record<string, unknown> | null {
    const data = this.plugins.get(pluginId);
    if (!data) return null;

    return {
      pluginId,
      exportTime: Date.now(),
      collectionStartTime: data.collectionStartTime,
      totalSamples: data.totalSamples,
      cpu: {
        samples: data.cpuExecutionTimes,
        peakTime: data.peakCpuTime,
        executionCount: data.totalExecutionCount,
      },
      memory: {
        samples: data.memorySamples,
        peakHeapSize: data.peakMemory,
        allocationCount: data.totalAllocations,
      },
      apiCalls: {
        countSamples: data.apiCallCounts,
        responseTimeSamples: data.apiResponseTimes,
        totalCalls: data.totalApiCalls,
        failedCalls: data.failedApiCalls,
        methodCalls: Object.fromEntries(data.methodCalls),
      },
      storage: {
        samples: data.storageSamples,
        totalOps: data.totalStorageOps,
      },
      network: {
        requestSamples: data.networkRequestCounts,
        bytesSamples: data.networkBytesSamples,
        totalRequests: data.totalNetworkRequests,
        failedRequests: data.failedNetworkRequests,
      },
    };
  }

  /**
   * Reset metrics for a plugin
   */
  resetMetrics(pluginId: string): void {
    const existing = this.plugins.get(pluginId);
    if (existing) {
      this.plugins.delete(pluginId);
      this.registerPlugin(pluginId);
    }
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.plugins.clear();
  }

  /**
   * Add a sample to a metric array
   */
  private addSample(samples: MetricSample[], timestamp: number, value: number): void {
    samples.push({ timestamp, value });

    // Trim if over limit
    if (samples.length > this.config.maxSamplesPerMetric) {
      samples.shift();
    }
  }

  /**
   * Aggregate samples for a time period
   */
  private aggregateSamples(
    samples: MetricSample[],
    startTime: number,
    endTime: number,
    period: MetricPeriod
  ): AggregatedMetric {
    const filteredSamples = samples.filter(
      (s) => s.timestamp >= startTime && s.timestamp <= endTime
    );

    if (filteredSamples.length === 0) {
      return {
        period,
        startTime,
        endTime,
        sampleCount: 0,
        min: 0,
        max: 0,
        sum: 0,
        avg: 0,
        p50: 0,
        p90: 0,
        p99: 0,
      };
    }

    const values = filteredSamples.map((s) => s.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      period,
      startTime,
      endTime,
      sampleCount: values.length,
      min: values[0] ?? 0,
      max: values[values.length - 1] ?? 0,
      sum,
      avg: sum / values.length,
      p50: this.percentile(values, 50),
      p90: this.percentile(values, 90),
      p99: this.percentile(values, 99),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)] ?? 0;
  }

  /**
   * Get top methods by call count
   */
  private getTopMethods(methodCalls: Map<string, number>, limit: number): MethodStats[] {
    const total = Array.from(methodCalls.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    return Array.from(methodCalls.entries())
      .map(([method, count]) => ({
        method,
        callCount: count,
        percentage: (count / total) * 100,
      }))
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, limit);
  }

  /**
   * Get last sample time across all metrics
   */
  private getLastSampleTime(data: PluginMetricData): number {
    const allSamples = [
      ...data.cpuExecutionTimes,
      ...data.memorySamples,
      ...data.apiCallCounts,
      ...data.storageSamples,
      ...data.networkRequestCounts,
    ];

    if (allSamples.length === 0) return 0;
    return Math.max(...allSamples.map((s) => s.timestamp));
  }

  /**
   * Start periodic cleanup of old samples
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const cutoffTime = Date.now() - this.config.retentionPeriod;

      for (const data of this.plugins.values()) {
        this.cleanupSamples(data.cpuExecutionTimes, cutoffTime);
        this.cleanupSamples(data.memorySamples, cutoffTime);
        this.cleanupSamples(data.apiCallCounts, cutoffTime);
        this.cleanupSamples(data.apiResponseTimes, cutoffTime);
        this.cleanupSamples(data.storageSamples, cutoffTime);
        this.cleanupSamples(data.networkRequestCounts, cutoffTime);
        this.cleanupSamples(data.networkBytesSamples, cutoffTime);
      }
    }, this.config.aggregationInterval);
  }

  /**
   * Remove samples older than cutoff time
   */
  private cleanupSamples(samples: MetricSample[], cutoffTime: number): void {
    let firstSample = samples[0];
    while (firstSample && firstSample.timestamp < cutoffTime) {
      samples.shift();
      firstSample = samples[0];
    }
  }
}
