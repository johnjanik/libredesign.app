/**
 * Data Retention Manager
 *
 * Manages automatic data cleanup based on retention policies.
 */

import type { LogStorage } from '../audit/log-storage';
import type { ComplianceConfigManager, RetentionPolicy } from './compliance-config';

/**
 * Retention job status
 */
export type RetentionJobStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Retention job result
 */
export interface RetentionJobResult {
  readonly jobId: string;
  readonly dataType: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly status: RetentionJobStatus;
  readonly itemsProcessed: number;
  readonly itemsDeleted: number;
  readonly itemsArchived: number;
  readonly bytesFreed: number;
  readonly errors: string[];
}

/**
 * Retention schedule
 */
export interface RetentionSchedule {
  readonly dataType: string;
  readonly interval: 'hourly' | 'daily' | 'weekly';
  readonly lastRun: number | null;
  readonly nextRun: number;
  readonly enabled: boolean;
}

/**
 * Data archive entry
 */
export interface ArchiveEntry {
  readonly id: string;
  readonly dataType: string;
  readonly pluginId: string | null;
  readonly archivedAt: number;
  readonly expiresAt: number;
  readonly itemCount: number;
  readonly sizeBytes: number;
  readonly checksum: string;
}

/**
 * Data retention callback
 */
export type RetentionCallback = (result: RetentionJobResult) => void;

/**
 * Data retention configuration
 */
export interface DataRetentionConfig {
  /** Enable automatic retention enforcement */
  readonly autoEnforce: boolean;
  /** Default enforcement interval (ms) */
  readonly enforcementInterval: number;
  /** Archive data before deletion */
  readonly archiveBeforeDelete: boolean;
  /** Archive retention period (ms) */
  readonly archiveRetentionPeriod: number;
  /** Maximum batch size for deletion */
  readonly deletionBatchSize: number;
  /** Dry run mode (don't actually delete) */
  readonly dryRun: boolean;
}

/**
 * Default data retention configuration
 */
export const DEFAULT_RETENTION_CONFIG: DataRetentionConfig = {
  autoEnforce: true,
  enforcementInterval: 24 * 60 * 60 * 1000, // 24 hours
  archiveBeforeDelete: true,
  archiveRetentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
  deletionBatchSize: 1000,
  dryRun: false,
};

/**
 * Generate unique job ID
 */
function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `retention_${timestamp}_${random}`;
}

/**
 * Data Retention Manager class
 */
export class DataRetentionManager {
  private readonly config: DataRetentionConfig;
  private readonly complianceConfig: ComplianceConfigManager;
  private readonly logStorage: LogStorage | null;
  private readonly schedules: Map<string, RetentionSchedule>;
  private readonly jobHistory: RetentionJobResult[];
  private readonly archives: Map<string, ArchiveEntry>;
  private readonly callbacks: Set<RetentionCallback>;
  private enforcementTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    complianceConfig: ComplianceConfigManager,
    logStorage: LogStorage | null = null,
    config: DataRetentionConfig = DEFAULT_RETENTION_CONFIG
  ) {
    this.config = config;
    this.complianceConfig = complianceConfig;
    this.logStorage = logStorage;
    this.schedules = new Map();
    this.jobHistory = [];
    this.archives = new Map();
    this.callbacks = new Set();

    // Initialize schedules from retention policies
    this.initializeSchedules();

    // Start automatic enforcement
    if (config.autoEnforce) {
      this.startAutoEnforcement();
    }
  }

  /**
   * Run retention enforcement for all data types
   */
  async enforceAll(): Promise<RetentionJobResult[]> {
    const results: RetentionJobResult[] = [];
    const policies = this.complianceConfig.getAllRetentionPolicies();

    for (const policy of policies) {
      if (policy.autoDelete) {
        const result = await this.enforcePolicy(policy);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Run retention enforcement for a specific data type
   */
  async enforceDataType(dataType: string): Promise<RetentionJobResult> {
    const policy = this.complianceConfig.getRetentionPolicy(dataType);
    if (!policy) {
      return {
        jobId: generateJobId(),
        dataType,
        startTime: Date.now(),
        endTime: Date.now(),
        status: 'failed',
        itemsProcessed: 0,
        itemsDeleted: 0,
        itemsArchived: 0,
        bytesFreed: 0,
        errors: [`No retention policy found for data type: ${dataType}`],
      };
    }

    return this.enforcePolicy(policy);
  }

  /**
   * Enforce a retention policy
   */
  async enforcePolicy(policy: RetentionPolicy): Promise<RetentionJobResult> {
    const jobId = generateJobId();
    const startTime = Date.now();
    const errors: string[] = [];

    let itemsProcessed = 0;
    let itemsDeleted = 0;
    let itemsArchived = 0;
    let bytesFreed = 0;

    try {
      const cutoffDate = Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000;

      // Handle different data types
      switch (policy.dataType) {
        case 'audit_logs':
          if (this.logStorage) {
            // Archive if required
            if (this.config.archiveBeforeDelete && policy.archiveFirst) {
              const archiveResult = await this.archiveAuditLogs(cutoffDate);
              itemsArchived = archiveResult.itemCount;
            }

            // Delete old logs
            if (!this.config.dryRun) {
              itemsDeleted = await this.logStorage.deleteOlderThan(cutoffDate);
            } else {
              // In dry run, just count what would be deleted
              const entries = await this.logStorage.query({
                until: cutoffDate,
              });
              itemsDeleted = entries.length;
            }
            itemsProcessed = itemsDeleted;
          }
          break;

        case 'metrics':
          // Metrics are typically stored in memory, handled by MetricsCollector
          itemsProcessed = 0;
          break;

        case 'plugin_storage':
          // Would need to iterate through plugin storage
          // This is a placeholder - actual implementation depends on storage API
          itemsProcessed = 0;
          break;

        default:
          errors.push(`Unknown data type: ${policy.dataType}`);
      }

      // Update schedule
      this.updateScheduleAfterRun(policy.dataType);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    const result: RetentionJobResult = {
      jobId,
      dataType: policy.dataType,
      startTime,
      endTime: Date.now(),
      status: errors.length > 0 ? 'failed' : 'completed',
      itemsProcessed,
      itemsDeleted,
      itemsArchived,
      bytesFreed,
      errors,
    };

    // Store in history
    this.jobHistory.push(result);

    // Trim history
    while (this.jobHistory.length > 100) {
      this.jobHistory.shift();
    }

    // Notify callbacks
    this.notifyCallbacks(result);

    return result;
  }

  /**
   * Archive audit logs before deletion
   */
  private async archiveAuditLogs(cutoffDate: number): Promise<ArchiveEntry> {
    if (!this.logStorage) {
      throw new Error('Log storage not available');
    }

    const entries = await this.logStorage.query({
      until: cutoffDate,
    });

    const archiveId = `archive_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const archiveData = JSON.stringify(entries);
    const sizeBytes = archiveData.length;

    // Simple checksum (in production, use proper hash)
    const checksum = this.simpleChecksum(archiveData);

    const archive: ArchiveEntry = {
      id: archiveId,
      dataType: 'audit_logs',
      pluginId: null,
      archivedAt: Date.now(),
      expiresAt: Date.now() + this.config.archiveRetentionPeriod,
      itemCount: entries.length,
      sizeBytes,
      checksum,
    };

    // Store archive metadata (actual data would be stored externally)
    this.archives.set(archiveId, archive);

    return archive;
  }

  /**
   * Get retention schedules
   */
  getSchedules(): RetentionSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get schedule for a data type
   */
  getSchedule(dataType: string): RetentionSchedule | null {
    return this.schedules.get(dataType) ?? null;
  }

  /**
   * Update schedule
   */
  updateSchedule(dataType: string, updates: Partial<RetentionSchedule>): void {
    const schedule = this.schedules.get(dataType);
    if (schedule) {
      this.schedules.set(dataType, { ...schedule, ...updates });
    }
  }

  /**
   * Get job history
   */
  getJobHistory(limit: number = 50): RetentionJobResult[] {
    return this.jobHistory.slice(-limit);
  }

  /**
   * Get archives
   */
  getArchives(): ArchiveEntry[] {
    return Array.from(this.archives.values());
  }

  /**
   * Get archive by ID
   */
  getArchive(archiveId: string): ArchiveEntry | null {
    return this.archives.get(archiveId) ?? null;
  }

  /**
   * Delete expired archives
   */
  cleanupExpiredArchives(): number {
    const now = Date.now();
    let deleted = 0;

    for (const [id, archive] of this.archives) {
      if (archive.expiresAt < now) {
        this.archives.delete(id);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Calculate storage usage by data type
   */
  async calculateStorageUsage(): Promise<
    Record<
      string,
      {
        itemCount: number;
        estimatedBytes: number;
        oldestItem: number | null;
        newestItem: number | null;
      }
    >
  > {
    const usage: Record<
      string,
      {
        itemCount: number;
        estimatedBytes: number;
        oldestItem: number | null;
        newestItem: number | null;
      }
    > = {};

    // Audit logs
    if (this.logStorage) {
      const stats = await this.logStorage.getStats();
      usage['audit_logs'] = {
        itemCount: stats.totalEntries,
        estimatedBytes: stats.totalEntries * 500, // Estimate 500 bytes per entry
        oldestItem: stats.oldestEntry,
        newestItem: stats.newestEntry,
      };
    }

    // Archives
    let archiveBytes = 0;
    let archiveCount = 0;
    let oldestArchive: number | null = null;
    let newestArchive: number | null = null;

    for (const archive of this.archives.values()) {
      archiveBytes += archive.sizeBytes;
      archiveCount += archive.itemCount;
      if (!oldestArchive || archive.archivedAt < oldestArchive) {
        oldestArchive = archive.archivedAt;
      }
      if (!newestArchive || archive.archivedAt > newestArchive) {
        newestArchive = archive.archivedAt;
      }
    }

    usage['archives'] = {
      itemCount: archiveCount,
      estimatedBytes: archiveBytes,
      oldestItem: oldestArchive,
      newestItem: newestArchive,
    };

    return usage;
  }

  /**
   * Register retention callback
   */
  onRetention(callback: RetentionCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Stop automatic enforcement
   */
  stopAutoEnforcement(): void {
    if (this.enforcementTimer) {
      clearInterval(this.enforcementTimer);
      this.enforcementTimer = null;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopAutoEnforcement();
    this.schedules.clear();
    this.jobHistory.length = 0;
    this.archives.clear();
    this.callbacks.clear();
  }

  /**
   * Initialize schedules from retention policies
   */
  private initializeSchedules(): void {
    const policies = this.complianceConfig.getAllRetentionPolicies();

    for (const policy of policies) {
      if (policy.autoDelete) {
        // Determine interval based on retention period
        let interval: 'hourly' | 'daily' | 'weekly';
        if (policy.retentionDays <= 1) {
          interval = 'hourly';
        } else if (policy.retentionDays <= 30) {
          interval = 'daily';
        } else {
          interval = 'weekly';
        }

        const nextRun = this.calculateNextRun(interval);

        this.schedules.set(policy.dataType, {
          dataType: policy.dataType,
          interval,
          lastRun: null,
          nextRun,
          enabled: true,
        });
      }
    }
  }

  /**
   * Calculate next run time based on interval
   */
  private calculateNextRun(interval: 'hourly' | 'daily' | 'weekly'): number {
    const now = Date.now();
    switch (interval) {
      case 'hourly':
        return now + 60 * 60 * 1000;
      case 'daily':
        return now + 24 * 60 * 60 * 1000;
      case 'weekly':
        return now + 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Update schedule after a run
   */
  private updateScheduleAfterRun(dataType: string): void {
    const schedule = this.schedules.get(dataType);
    if (schedule) {
      this.schedules.set(dataType, {
        ...schedule,
        lastRun: Date.now(),
        nextRun: this.calculateNextRun(schedule.interval),
      });
    }
  }

  /**
   * Start automatic enforcement timer
   */
  private startAutoEnforcement(): void {
    this.enforcementTimer = setInterval(() => {
      this.checkAndRunSchedules().catch(() => {
        // Ignore errors in auto-enforcement
      });
    }, this.config.enforcementInterval);
  }

  /**
   * Check and run due schedules
   */
  private async checkAndRunSchedules(): Promise<void> {
    const now = Date.now();

    for (const schedule of this.schedules.values()) {
      if (schedule.enabled && schedule.nextRun <= now) {
        await this.enforceDataType(schedule.dataType);
      }
    }

    // Also cleanup expired archives
    this.cleanupExpiredArchives();
  }

  /**
   * Simple checksum for archive verification
   */
  private simpleChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Notify callbacks
   */
  private notifyCallbacks(result: RetentionJobResult): void {
    for (const callback of this.callbacks) {
      try {
        callback(result);
      } catch {
        // Ignore callback errors
      }
    }
  }
}
