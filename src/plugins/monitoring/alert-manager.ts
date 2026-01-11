/**
 * Alert Manager
 *
 * Manages alerts and notifications for resource violations and anomalies.
 */

import type { ResourceViolation, ResourceType } from './resource-monitor';
import type { QuotaEvent } from './quota-manager';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Alert status
 */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';

/**
 * Alert source
 */
export type AlertSource = 'resource' | 'quota' | 'security' | 'behavior' | 'system';

/**
 * Alert definition
 */
export interface Alert {
  readonly id: string;
  readonly pluginId: string;
  readonly source: AlertSource;
  readonly severity: AlertSeverity;
  readonly status: AlertStatus;
  readonly title: string;
  readonly message: string;
  readonly resourceType: ResourceType | null;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly acknowledgedAt: number | null;
  readonly resolvedAt: number | null;
  readonly acknowledgedBy: string | null;
  readonly metadata: Record<string, unknown>;
  readonly relatedAlertIds: readonly string[];
}

/**
 * Alert rule definition
 */
export interface AlertRule {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly source: AlertSource;
  readonly severity: AlertSeverity;
  readonly resourceType: ResourceType | null;
  readonly condition: AlertCondition;
  readonly cooldown: number;
  readonly autoResolve: boolean;
  readonly autoResolveAfter: number;
  readonly suppressDuplicates: boolean;
  readonly aggregateWindow: number;
}

/**
 * Alert condition
 */
export interface AlertCondition {
  readonly type: 'threshold' | 'rate' | 'count' | 'pattern';
  readonly threshold?: number;
  readonly operator?: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  readonly windowMs?: number;
  readonly minOccurrences?: number;
}

/**
 * Alert notification channel
 */
export interface AlertChannel {
  readonly id: string;
  readonly name: string;
  readonly type: 'callback' | 'webhook' | 'email';
  readonly enabled: boolean;
  readonly config: Record<string, unknown>;
  readonly severityFilter: AlertSeverity[];
}

/**
 * Alert callback
 */
export type AlertCallback = (alert: Alert) => void;

/**
 * Alert filter options
 */
export interface AlertFilterOptions {
  readonly pluginId?: string;
  readonly source?: AlertSource;
  readonly severity?: AlertSeverity;
  readonly status?: AlertStatus;
  readonly resourceType?: ResourceType;
  readonly since?: number;
  readonly until?: number;
  readonly limit?: number;
}

/**
 * Alert statistics
 */
export interface AlertStats {
  readonly totalAlerts: number;
  readonly activeAlerts: number;
  readonly alertsBySource: Record<AlertSource, number>;
  readonly alertsBySeverity: Record<AlertSeverity, number>;
  readonly alertsByPlugin: Record<string, number>;
  readonly averageResolutionTime: number;
}

/**
 * Alert manager configuration
 */
export interface AlertManagerConfig {
  /** Maximum alerts to retain */
  readonly maxAlerts: number;
  /** Alert retention period in ms */
  readonly retentionPeriod: number;
  /** Default cooldown between duplicate alerts */
  readonly defaultCooldown: number;
  /** Maximum alerts per plugin */
  readonly maxAlertsPerPlugin: number;
}

/**
 * Default alert manager configuration
 */
export const DEFAULT_ALERT_CONFIG: AlertManagerConfig = {
  maxAlerts: 10000,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  defaultCooldown: 60000, // 1 minute
  maxAlertsPerPlugin: 100,
};

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `alert_${timestamp}_${random}`;
}

/**
 * Alert Manager class
 */
export class AlertManager {
  private readonly config: AlertManagerConfig;
  private readonly alerts: Map<string, Alert>;
  private readonly rules: Map<string, AlertRule>;
  private readonly channels: Map<string, AlertChannel>;
  private readonly callbacks: Set<AlertCallback>;
  private readonly lastAlertTime: Map<string, number>;
  private readonly pluginAlertCounts: Map<string, number>;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: AlertManagerConfig = DEFAULT_ALERT_CONFIG) {
    this.config = config;
    this.alerts = new Map();
    this.rules = new Map();
    this.channels = new Map();
    this.callbacks = new Set();
    this.lastAlertTime = new Map();
    this.pluginAlertCounts = new Map();

    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Create an alert from a resource violation
   */
  createFromViolation(violation: ResourceViolation): Alert | null {
    // Check cooldown
    const cooldownKey = `${violation.pluginId}:${violation.resourceType}`;
    const lastTime = this.lastAlertTime.get(cooldownKey);
    if (lastTime && Date.now() - lastTime < this.config.defaultCooldown) {
      return null;
    }

    // Check per-plugin limit
    const pluginCount = this.pluginAlertCounts.get(violation.pluginId) ?? 0;
    if (pluginCount >= this.config.maxAlertsPerPlugin) {
      // Remove oldest alert for this plugin
      this.removeOldestForPlugin(violation.pluginId);
    }

    const alert = this.createAlert({
      pluginId: violation.pluginId,
      source: 'resource',
      severity: violation.severity === 'critical' ? 'critical' : 'warning',
      title: `Resource violation: ${violation.resourceType}`,
      message: violation.message,
      resourceType: violation.resourceType,
      metadata: {
        currentValue: violation.currentValue,
        limit: violation.limit,
        violationTimestamp: violation.timestamp,
      },
    });

    this.lastAlertTime.set(cooldownKey, Date.now());
    return alert;
  }

  /**
   * Create an alert from a quota event
   */
  createFromQuotaEvent(event: QuotaEvent): Alert | null {
    if (event.type === 'resumed') {
      // Resolve related alerts
      this.resolveAlertsForPlugin(event.pluginId, 'quota');
      return null;
    }

    const severityMap: Record<string, AlertSeverity> = {
      warning: 'warning',
      throttled: 'warning',
      suspended: 'error',
      terminated: 'critical',
    };

    return this.createAlert({
      pluginId: event.pluginId,
      source: 'quota',
      severity: severityMap[event.type] ?? 'warning',
      title: `Quota ${event.type}: ${event.pluginId}`,
      message: event.details,
      resourceType: event.violation?.resourceType ?? null,
      metadata: {
        eventType: event.type,
        violation: event.violation,
      },
    });
  }

  /**
   * Create a custom alert
   */
  createAlert(params: {
    pluginId: string;
    source: AlertSource;
    severity: AlertSeverity;
    title: string;
    message: string;
    resourceType?: ResourceType | null;
    metadata?: Record<string, unknown>;
    relatedAlertIds?: string[];
  }): Alert {
    const now = Date.now();
    const alert: Alert = {
      id: generateAlertId(),
      pluginId: params.pluginId,
      source: params.source,
      severity: params.severity,
      status: 'active',
      title: params.title,
      message: params.message,
      resourceType: params.resourceType ?? null,
      createdAt: now,
      updatedAt: now,
      acknowledgedAt: null,
      resolvedAt: null,
      acknowledgedBy: null,
      metadata: params.metadata ?? {},
      relatedAlertIds: params.relatedAlertIds ?? [],
    };

    // Store alert
    this.alerts.set(alert.id, alert);

    // Update plugin count
    const currentCount = this.pluginAlertCounts.get(params.pluginId) ?? 0;
    this.pluginAlertCounts.set(params.pluginId, currentCount + 1);

    // Enforce max alerts
    if (this.alerts.size > this.config.maxAlerts) {
      this.removeOldestAlert();
    }

    // Notify channels and callbacks
    this.notifyAlert(alert);

    return alert;
  }

  /**
   * Get an alert by ID
   */
  getAlert(alertId: string): Alert | null {
    return this.alerts.get(alertId) ?? null;
  }

  /**
   * Get alerts with optional filtering
   */
  getAlerts(options: AlertFilterOptions = {}): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (options.pluginId) {
      alerts = alerts.filter((a) => a.pluginId === options.pluginId);
    }
    if (options.source) {
      alerts = alerts.filter((a) => a.source === options.source);
    }
    if (options.severity) {
      alerts = alerts.filter((a) => a.severity === options.severity);
    }
    if (options.status) {
      alerts = alerts.filter((a) => a.status === options.status);
    }
    if (options.resourceType) {
      alerts = alerts.filter((a) => a.resourceType === options.resourceType);
    }
    if (options.since) {
      alerts = alerts.filter((a) => a.createdAt >= options.since!);
    }
    if (options.until) {
      alerts = alerts.filter((a) => a.createdAt <= options.until!);
    }

    // Sort by creation time, newest first
    alerts.sort((a, b) => b.createdAt - a.createdAt);

    if (options.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Get active alerts for a plugin
   */
  getActiveAlerts(pluginId: string): Alert[] {
    return this.getAlerts({ pluginId, status: 'active' });
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string = 'user'): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    const updatedAlert: Alert = {
      ...alert,
      status: 'acknowledged',
      acknowledgedAt: Date.now(),
      acknowledgedBy,
      updatedAt: Date.now(),
    };

    this.alerts.set(alertId, updatedAlert);
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status === 'resolved') {
      return false;
    }

    const updatedAlert: Alert = {
      ...alert,
      status: 'resolved',
      resolvedAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.alerts.set(alertId, updatedAlert);
    return true;
  }

  /**
   * Suppress an alert
   */
  suppressAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    const updatedAlert: Alert = {
      ...alert,
      status: 'suppressed',
      updatedAt: Date.now(),
    };

    this.alerts.set(alertId, updatedAlert);
    return true;
  }

  /**
   * Resolve all alerts for a plugin and source
   */
  resolveAlertsForPlugin(pluginId: string, source?: AlertSource): number {
    let resolved = 0;

    for (const [alertId, alert] of this.alerts) {
      if (alert.pluginId === pluginId && alert.status === 'active') {
        if (!source || alert.source === source) {
          this.resolveAlert(alertId);
          resolved++;
        }
      }
    }

    return resolved;
  }

  /**
   * Delete an alert
   */
  deleteAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    this.alerts.delete(alertId);

    // Update plugin count
    const currentCount = this.pluginAlertCounts.get(alert.pluginId) ?? 0;
    if (currentCount > 0) {
      this.pluginAlertCounts.set(alert.pluginId, currentCount - 1);
    }

    return true;
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all alert rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Add a notification channel
   */
  addChannel(channel: AlertChannel): void {
    this.channels.set(channel.id, channel);
  }

  /**
   * Remove a notification channel
   */
  removeChannel(channelId: string): boolean {
    return this.channels.delete(channelId);
  }

  /**
   * Register alert callback
   */
  onAlert(callback: AlertCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get alert statistics
   */
  getStats(): AlertStats {
    const alerts = Array.from(this.alerts.values());

    const alertsBySource: Record<AlertSource, number> = {
      resource: 0,
      quota: 0,
      security: 0,
      behavior: 0,
      system: 0,
    };

    const alertsBySeverity: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    const alertsByPlugin: Record<string, number> = {};
    let activeAlerts = 0;
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const alert of alerts) {
      alertsBySource[alert.source]++;
      alertsBySeverity[alert.severity]++;
      alertsByPlugin[alert.pluginId] = (alertsByPlugin[alert.pluginId] ?? 0) + 1;

      if (alert.status === 'active') {
        activeAlerts++;
      }

      if (alert.resolvedAt) {
        totalResolutionTime += alert.resolvedAt - alert.createdAt;
        resolvedCount++;
      }
    }

    return {
      totalAlerts: alerts.length,
      activeAlerts,
      alertsBySource,
      alertsBySeverity,
      alertsByPlugin,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.alerts.clear();
    this.rules.clear();
    this.channels.clear();
    this.callbacks.clear();
    this.lastAlertTime.clear();
    this.pluginAlertCounts.clear();
  }

  /**
   * Notify all channels and callbacks about an alert
   */
  private notifyAlert(alert: Alert): void {
    // Notify callbacks
    for (const callback of this.callbacks) {
      try {
        callback(alert);
      } catch {
        // Ignore callback errors
      }
    }

    // Notify channels
    for (const channel of this.channels.values()) {
      if (!channel.enabled) continue;
      if (!channel.severityFilter.includes(alert.severity)) continue;

      this.sendToChannel(channel, alert);
    }
  }

  /**
   * Send alert to a channel
   */
  private sendToChannel(channel: AlertChannel, alert: Alert): void {
    switch (channel.type) {
      case 'callback':
        const callback = channel.config['callback'] as AlertCallback | undefined;
        if (typeof callback === 'function') {
          try {
            callback(alert);
          } catch {
            // Ignore
          }
        }
        break;

      case 'webhook':
        // Would send HTTP request to webhook URL
        // Not implemented for client-side
        break;

      case 'email':
        // Would send email
        // Not implemented for client-side
        break;
    }
  }

  /**
   * Remove the oldest alert
   */
  private removeOldestAlert(): void {
    let oldest: Alert | null = null;
    let oldestId: string | null = null;

    for (const [id, alert] of this.alerts) {
      if (!oldest || alert.createdAt < oldest.createdAt) {
        oldest = alert;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.deleteAlert(oldestId);
    }
  }

  /**
   * Remove oldest alert for a specific plugin
   */
  private removeOldestForPlugin(pluginId: string): void {
    let oldest: Alert | null = null;
    let oldestId: string | null = null;

    for (const [id, alert] of this.alerts) {
      if (alert.pluginId === pluginId) {
        if (!oldest || alert.createdAt < oldest.createdAt) {
          oldest = alert;
          oldestId = id;
        }
      }
    }

    if (oldestId) {
      this.deleteAlert(oldestId);
    }
  }

  /**
   * Start periodic cleanup of old alerts
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const cutoffTime = Date.now() - this.config.retentionPeriod;

      for (const [alertId, alert] of this.alerts) {
        // Remove old resolved/suppressed alerts
        if (
          (alert.status === 'resolved' || alert.status === 'suppressed') &&
          alert.updatedAt < cutoffTime
        ) {
          this.deleteAlert(alertId);
        }
      }
    }, 60000); // Check every minute
  }
}
