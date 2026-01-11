/**
 * Audit Logger
 *
 * Logs all plugin actions for security auditing and compliance.
 */

import type { ResourceType } from '../monitoring/resource-monitor';

/**
 * Action categories
 */
export type ActionCategory =
  | 'api'
  | 'capability'
  | 'resource'
  | 'network'
  | 'storage'
  | 'ui'
  | 'lifecycle'
  | 'security';

/**
 * Action result
 */
export type ActionResult = 'success' | 'denied' | 'error' | 'throttled';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly pluginId: string;
  readonly category: ActionCategory;
  readonly action: string;
  readonly resource?: string;
  readonly parameters?: Record<string, unknown>;
  readonly result: ActionResult;
  readonly error?: string;
  readonly duration: number;
  readonly capabilitiesUsed: readonly string[];
  readonly resourceUsage: {
    readonly memoryDelta: number;
    readonly cpuTime: number;
  };
  readonly metadata?: Record<string, unknown>;
}

/**
 * Audit log filter options
 */
export interface AuditLogFilter {
  readonly pluginId?: string;
  readonly category?: ActionCategory;
  readonly action?: string;
  readonly result?: ActionResult;
  readonly since?: number;
  readonly until?: number;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Audit log statistics
 */
export interface AuditLogStats {
  readonly totalEntries: number;
  readonly entriesByCategory: Record<ActionCategory, number>;
  readonly entriesByResult: Record<ActionResult, number>;
  readonly entriesByPlugin: Record<string, number>;
  readonly averageDuration: number;
  readonly totalCpuTime: number;
  readonly errorRate: number;
  readonly deniedRate: number;
}

/**
 * Audit log callback
 */
export type AuditLogCallback = (entry: AuditLogEntry) => void;

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  /** Maximum entries to retain */
  readonly maxEntries: number;
  /** Enable detailed parameter logging */
  readonly logParameters: boolean;
  /** Sanitize sensitive data in parameters */
  readonly sanitizeSensitive: boolean;
  /** Categories to log (empty = all) */
  readonly enabledCategories: ActionCategory[];
  /** Log level threshold */
  readonly minResultLevel: ActionResult[];
  /** Maximum parameter size in bytes */
  readonly maxParameterSize: number;
}

/**
 * Default audit logger configuration
 */
export const DEFAULT_AUDIT_CONFIG: AuditLoggerConfig = {
  maxEntries: 10000,
  logParameters: true,
  sanitizeSensitive: true,
  enabledCategories: [],
  minResultLevel: ['success', 'denied', 'error', 'throttled'],
  maxParameterSize: 10000,
};

/**
 * Sensitive parameter keys to sanitize
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'key',
  'apiKey',
  'api_key',
  'authorization',
  'auth',
  'credential',
  'credentials',
  'private',
  'privateKey',
  'private_key',
]);

/**
 * Generate unique log entry ID
 */
function generateEntryId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `log_${timestamp}_${random}`;
}

/**
 * Audit Logger class
 */
export class AuditLogger {
  private readonly config: AuditLoggerConfig;
  private readonly entries: AuditLogEntry[];
  private readonly callbacks: Set<AuditLogCallback>;
  private readonly pluginIndexes: Map<string, number[]>;

  constructor(config: AuditLoggerConfig = DEFAULT_AUDIT_CONFIG) {
    this.config = config;
    this.entries = [];
    this.callbacks = new Set();
    this.pluginIndexes = new Map();
  }

  /**
   * Log an action
   */
  log(params: {
    pluginId: string;
    category: ActionCategory;
    action: string;
    resource?: string;
    parameters?: Record<string, unknown>;
    result: ActionResult;
    error?: string;
    duration: number;
    capabilitiesUsed?: string[];
    resourceUsage?: {
      memoryDelta?: number;
      cpuTime?: number;
    };
    metadata?: Record<string, unknown>;
  }): AuditLogEntry {
    // Check if category is enabled
    if (
      this.config.enabledCategories.length > 0 &&
      !this.config.enabledCategories.includes(params.category)
    ) {
      // Create entry but don't store
      return this.createEntry(params);
    }

    // Check result level
    if (!this.config.minResultLevel.includes(params.result)) {
      return this.createEntry(params);
    }

    const entry = this.createEntry(params);

    // Store entry
    const index = this.entries.length;
    this.entries.push(entry);

    // Update plugin index
    let pluginIndex = this.pluginIndexes.get(params.pluginId);
    if (!pluginIndex) {
      pluginIndex = [];
      this.pluginIndexes.set(params.pluginId, pluginIndex);
    }
    pluginIndex.push(index);

    // Enforce max entries
    if (this.entries.length > this.config.maxEntries) {
      this.trimEntries();
    }

    // Notify callbacks
    this.notifyCallbacks(entry);

    return entry;
  }

  /**
   * Log an API call
   */
  logApiCall(params: {
    pluginId: string;
    method: string;
    parameters?: Record<string, unknown>;
    result: ActionResult;
    error?: string;
    duration: number;
    capabilitiesUsed?: string[];
  }): AuditLogEntry {
    const logParams: Parameters<typeof this.log>[0] = {
      pluginId: params.pluginId,
      category: 'api',
      action: params.method,
      result: params.result,
      duration: params.duration,
    };
    if (params.parameters !== undefined) logParams.parameters = params.parameters;
    if (params.error !== undefined) logParams.error = params.error;
    if (params.capabilitiesUsed !== undefined) logParams.capabilitiesUsed = params.capabilitiesUsed;
    return this.log(logParams);
  }

  /**
   * Log a capability request
   */
  logCapabilityRequest(params: {
    pluginId: string;
    capability: string;
    granted: boolean;
    reason?: string;
  }): AuditLogEntry {
    const logParams: Parameters<typeof this.log>[0] = {
      pluginId: params.pluginId,
      category: 'capability',
      action: 'request',
      resource: params.capability,
      result: params.granted ? 'success' : 'denied',
      duration: 0,
    };
    if (!params.granted && params.reason !== undefined) logParams.error = params.reason;
    return this.log(logParams);
  }

  /**
   * Log a resource operation
   */
  logResourceOperation(params: {
    pluginId: string;
    resourceType: ResourceType;
    operation: string;
    result: ActionResult;
    resourceUsage?: {
      memoryDelta?: number;
      cpuTime?: number;
    };
  }): AuditLogEntry {
    const logParams: Parameters<typeof this.log>[0] = {
      pluginId: params.pluginId,
      category: 'resource',
      action: params.operation,
      resource: params.resourceType,
      result: params.result,
      duration: 0,
    };
    if (params.resourceUsage !== undefined) logParams.resourceUsage = params.resourceUsage;
    return this.log(logParams);
  }

  /**
   * Log a network request
   */
  logNetworkRequest(params: {
    pluginId: string;
    url: string;
    method: string;
    result: ActionResult;
    error?: string;
    duration: number;
    bytesTransferred?: number;
  }): AuditLogEntry {
    const logParams: Parameters<typeof this.log>[0] = {
      pluginId: params.pluginId,
      category: 'network',
      action: params.method,
      resource: this.sanitizeUrl(params.url),
      result: params.result,
      duration: params.duration,
    };
    if (params.error !== undefined) logParams.error = params.error;
    if (params.bytesTransferred !== undefined) {
      logParams.metadata = { bytesTransferred: params.bytesTransferred };
    }
    return this.log(logParams);
  }

  /**
   * Log a storage operation
   */
  logStorageOperation(params: {
    pluginId: string;
    operation: 'get' | 'set' | 'delete' | 'list' | 'clear';
    key?: string;
    result: ActionResult;
    error?: string;
    duration: number;
    bytesAffected?: number;
  }): AuditLogEntry {
    const logParams: Parameters<typeof this.log>[0] = {
      pluginId: params.pluginId,
      category: 'storage',
      action: params.operation,
      result: params.result,
      duration: params.duration,
    };
    if (params.key !== undefined) logParams.resource = params.key;
    if (params.error !== undefined) logParams.error = params.error;
    if (params.bytesAffected !== undefined) {
      logParams.metadata = { bytesAffected: params.bytesAffected };
    }
    return this.log(logParams);
  }

  /**
   * Log a UI operation
   */
  logUiOperation(params: {
    pluginId: string;
    operation: string;
    elementId?: string;
    result: ActionResult;
    duration: number;
  }): AuditLogEntry {
    const logParams: Parameters<typeof this.log>[0] = {
      pluginId: params.pluginId,
      category: 'ui',
      action: params.operation,
      result: params.result,
      duration: params.duration,
    };
    if (params.elementId !== undefined) logParams.resource = params.elementId;
    return this.log(logParams);
  }

  /**
   * Log a lifecycle event
   */
  logLifecycleEvent(params: {
    pluginId: string;
    event: 'load' | 'activate' | 'deactivate' | 'unload' | 'error' | 'suspend' | 'resume';
    result: ActionResult;
    error?: string;
    duration: number;
  }): AuditLogEntry {
    const logParams: Parameters<typeof this.log>[0] = {
      pluginId: params.pluginId,
      category: 'lifecycle',
      action: params.event,
      result: params.result,
      duration: params.duration,
    };
    if (params.error !== undefined) logParams.error = params.error;
    return this.log(logParams);
  }

  /**
   * Log a security event
   */
  logSecurityEvent(params: {
    pluginId: string;
    event: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    details?: string;
    result: ActionResult;
  }): AuditLogEntry {
    const logParams: Parameters<typeof this.log>[0] = {
      pluginId: params.pluginId,
      category: 'security',
      action: params.event,
      result: params.result,
      duration: 0,
      metadata: { severity: params.severity },
    };
    if (params.details !== undefined) logParams.error = params.details;
    return this.log(logParams);
  }

  /**
   * Get log entries with filtering
   */
  getEntries(filter: AuditLogFilter = {}): AuditLogEntry[] {
    let results: AuditLogEntry[];

    // Use plugin index for faster filtering
    if (filter.pluginId) {
      const indexes = this.pluginIndexes.get(filter.pluginId) ?? [];
      results = indexes.map((i) => this.entries[i]).filter((e) => e !== undefined);
    } else {
      results = [...this.entries];
    }

    // Apply filters
    if (filter.category) {
      results = results.filter((e) => e.category === filter.category);
    }
    if (filter.action) {
      results = results.filter((e) => e.action === filter.action);
    }
    if (filter.result) {
      results = results.filter((e) => e.result === filter.result);
    }
    if (filter.since !== undefined) {
      results = results.filter((e) => e.timestamp >= filter.since!);
    }
    if (filter.until !== undefined) {
      results = results.filter((e) => e.timestamp <= filter.until!);
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    if (filter.offset !== undefined) {
      results = results.slice(filter.offset);
    }
    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): AuditLogEntry | null {
    return this.entries.find((e) => e.id === id) ?? null;
  }

  /**
   * Get statistics
   */
  getStats(filter: AuditLogFilter = {}): AuditLogStats {
    // Create a filter without limit/offset for stats calculation
    const statsFilter: AuditLogFilter = {
      ...(filter.pluginId !== undefined && { pluginId: filter.pluginId }),
      ...(filter.category !== undefined && { category: filter.category }),
      ...(filter.action !== undefined && { action: filter.action }),
      ...(filter.result !== undefined && { result: filter.result }),
      ...(filter.since !== undefined && { since: filter.since }),
      ...(filter.until !== undefined && { until: filter.until }),
    };
    const entries = this.getEntries(statsFilter);

    const entriesByCategory: Record<ActionCategory, number> = {
      api: 0,
      capability: 0,
      resource: 0,
      network: 0,
      storage: 0,
      ui: 0,
      lifecycle: 0,
      security: 0,
    };

    const entriesByResult: Record<ActionResult, number> = {
      success: 0,
      denied: 0,
      error: 0,
      throttled: 0,
    };

    const entriesByPlugin: Record<string, number> = {};

    let totalDuration = 0;
    let totalCpuTime = 0;
    let errorCount = 0;
    let deniedCount = 0;

    for (const entry of entries) {
      entriesByCategory[entry.category]++;
      entriesByResult[entry.result]++;
      entriesByPlugin[entry.pluginId] = (entriesByPlugin[entry.pluginId] ?? 0) + 1;

      totalDuration += entry.duration;
      totalCpuTime += entry.resourceUsage.cpuTime;

      if (entry.result === 'error') errorCount++;
      if (entry.result === 'denied') deniedCount++;
    }

    return {
      totalEntries: entries.length,
      entriesByCategory,
      entriesByResult,
      entriesByPlugin,
      averageDuration: entries.length > 0 ? totalDuration / entries.length : 0,
      totalCpuTime,
      errorRate: entries.length > 0 ? errorCount / entries.length : 0,
      deniedRate: entries.length > 0 ? deniedCount / entries.length : 0,
    };
  }

  /**
   * Export logs to JSON
   */
  exportToJson(filter: AuditLogFilter = {}): string {
    const entries = this.getEntries(filter);
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Export logs to CSV
   */
  exportToCsv(filter: AuditLogFilter = {}): string {
    const entries = this.getEntries(filter);
    const headers = [
      'id',
      'timestamp',
      'pluginId',
      'category',
      'action',
      'resource',
      'result',
      'error',
      'duration',
      'cpuTime',
      'memoryDelta',
    ];

    const rows = entries.map((e) => [
      e.id,
      new Date(e.timestamp).toISOString(),
      e.pluginId,
      e.category,
      e.action,
      e.resource ?? '',
      e.result,
      e.error ?? '',
      e.duration.toString(),
      e.resourceUsage.cpuTime.toString(),
      e.resourceUsage.memoryDelta.toString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.map(this.escapeCsv).join(','))].join('\n');
  }

  /**
   * Register log callback
   */
  onLog(callback: AuditLogCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Clear logs for a plugin
   */
  clearPlugin(pluginId: string): number {
    const indexes = this.pluginIndexes.get(pluginId) ?? [];
    let cleared = 0;

    // Mark entries as cleared (we can't remove from array without reindexing)
    for (const index of indexes) {
      if (this.entries[index]) {
        // We'll remove these during the next trim
        cleared++;
      }
    }

    this.pluginIndexes.delete(pluginId);
    return cleared;
  }

  /**
   * Clear all logs
   */
  clearAll(): void {
    this.entries.length = 0;
    this.pluginIndexes.clear();
  }

  /**
   * Get entry count
   */
  getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.entries.length = 0;
    this.callbacks.clear();
    this.pluginIndexes.clear();
  }

  /**
   * Create an audit log entry
   */
  private createEntry(params: {
    pluginId: string;
    category: ActionCategory;
    action: string;
    resource?: string;
    parameters?: Record<string, unknown>;
    result: ActionResult;
    error?: string;
    duration: number;
    capabilitiesUsed?: string[];
    resourceUsage?: {
      memoryDelta?: number;
      cpuTime?: number;
    };
    metadata?: Record<string, unknown>;
  }): AuditLogEntry {
    let sanitizedParams: Record<string, unknown> | undefined;

    if (this.config.logParameters && params.parameters) {
      sanitizedParams = this.config.sanitizeSensitive
        ? this.sanitizeParameters(params.parameters)
        : params.parameters;

      // Truncate if too large
      const paramStr = JSON.stringify(sanitizedParams);
      if (paramStr.length > this.config.maxParameterSize) {
        sanitizedParams = { _truncated: true, _size: paramStr.length };
      }
    }

    // Build entry with only defined optional properties
    const entry: AuditLogEntry = {
      id: generateEntryId(),
      timestamp: Date.now(),
      pluginId: params.pluginId,
      category: params.category,
      action: params.action,
      result: params.result,
      duration: params.duration,
      capabilitiesUsed: params.capabilitiesUsed ?? [],
      resourceUsage: {
        memoryDelta: params.resourceUsage?.memoryDelta ?? 0,
        cpuTime: params.resourceUsage?.cpuTime ?? 0,
      },
    };

    // Conditionally add optional properties
    if (params.resource !== undefined) {
      (entry as { resource: string }).resource = params.resource;
    }
    if (sanitizedParams !== undefined) {
      (entry as { parameters: Record<string, unknown> }).parameters = sanitizedParams;
    }
    if (params.error !== undefined) {
      (entry as { error: string }).error = params.error;
    }
    if (params.metadata !== undefined) {
      (entry as { metadata: Record<string, unknown> }).metadata = params.metadata;
    }

    return entry;
  }

  /**
   * Sanitize parameters to remove sensitive data
   */
  private sanitizeParameters(params: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.sanitizeParameters(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Sanitize URL to remove sensitive query parameters
   */
  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Remove sensitive query parameters
      for (const key of SENSITIVE_KEYS) {
        parsed.searchParams.delete(key);
      }

      // Also handle common auth params
      parsed.searchParams.delete('access_token');
      parsed.searchParams.delete('refresh_token');

      return parsed.toString();
    } catch {
      // If URL parsing fails, just return the original
      return url;
    }
  }

  /**
   * Trim entries to stay within limit
   */
  private trimEntries(): void {
    const toRemove = this.entries.length - this.config.maxEntries;
    if (toRemove <= 0) return;

    // Remove oldest entries
    this.entries.splice(0, toRemove);

    // Rebuild plugin indexes
    this.pluginIndexes.clear();
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (!entry) continue;
      let index = this.pluginIndexes.get(entry.pluginId);
      if (!index) {
        index = [];
        this.pluginIndexes.set(entry.pluginId, index);
      }
      index.push(i);
    }
  }

  /**
   * Escape value for CSV
   */
  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Notify callbacks
   */
  private notifyCallbacks(entry: AuditLogEntry): void {
    for (const callback of this.callbacks) {
      try {
        callback(entry);
      } catch {
        // Ignore callback errors
      }
    }
  }
}
