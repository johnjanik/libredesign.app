/**
 * Monitoring Module
 *
 * Exports resource monitoring, quota management, metrics collection,
 * and alert management components.
 */

export {
  ResourceMonitor,
  DEFAULT_RESOURCE_LIMITS,
  DEFAULT_MONITOR_CONFIG,
  type ResourceType,
  type ResourceSnapshot,
  type CPUSnapshot,
  type MemorySnapshot,
  type APICallSnapshot,
  type StorageSnapshot,
  type NetworkSnapshot,
  type ResourceLimits,
  type ResourceViolation,
  type ViolationCallback,
  type ResourceMonitorConfig,
} from './resource-monitor';

export {
  QuotaManager,
  DEFAULT_ENFORCEMENT_POLICY,
  type EnforcementAction,
  type EnforcementPolicy,
  type PluginQuotaStatus,
  type PluginQuota,
  type QuotaCheckResult,
  type QuotaEventType,
  type QuotaEvent,
  type QuotaEventCallback,
} from './quota-manager';

export {
  MetricsCollector,
  DEFAULT_METRICS_CONFIG,
  type MetricPeriod,
  type AggregatedMetric,
  type PluginMetricsSummary,
  type MethodStats,
  type MetricsCollectorConfig,
} from './metrics-collector';

export {
  AlertManager,
  DEFAULT_ALERT_CONFIG,
  type AlertSeverity,
  type AlertStatus,
  type AlertSource,
  type Alert,
  type AlertRule,
  type AlertCondition,
  type AlertChannel,
  type AlertCallback,
  type AlertFilterOptions,
  type AlertStats,
  type AlertManagerConfig,
} from './alert-manager';
