/**
 * Multi-Region Infrastructure
 *
 * Manages distributed infrastructure for:
 * - Geo-replication of documents across regions
 * - Automatic failover on region outages
 * - Disaster recovery and backup management
 * - Latency-based routing to nearest region
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { DocumentId, UserId } from '../types';

// =============================================================================
// Types
// =============================================================================

/** Geographic region */
export type Region =
  | 'us-east-1'
  | 'us-west-2'
  | 'eu-west-1'
  | 'eu-central-1'
  | 'ap-northeast-1'
  | 'ap-southeast-1'
  | 'ap-south-1'
  | 'sa-east-1';

/** Region health status */
export type RegionHealth = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/** Replication status */
export type ReplicationStatus =
  | 'synced'
  | 'syncing'
  | 'pending'
  | 'failed'
  | 'conflict';

/** Failover mode */
export type FailoverMode =
  | 'automatic'
  | 'manual'
  | 'dns_based'
  | 'active_active';

/** Region configuration */
export interface RegionConfig {
  readonly region: Region;
  readonly endpoint: string;
  readonly weight: number; // For weighted routing (0-100)
  readonly isPrimary: boolean;
  readonly isReadOnly: boolean;
  readonly maxCapacity: number; // Max documents
  readonly currentLoad: number;
  readonly enabled: boolean;
}

/** Region status */
export interface RegionStatus {
  readonly region: Region;
  readonly health: RegionHealth;
  readonly latencyMs: number;
  readonly lastChecked: number;
  readonly consecutiveFailures: number;
  readonly activeConnections: number;
  readonly replicationLag: number; // Milliseconds behind primary
  readonly availableCapacity: number;
}

/** Document replication state */
export interface DocumentReplication {
  readonly documentId: DocumentId;
  readonly primaryRegion: Region;
  readonly replicas: readonly DocumentReplica[];
  readonly replicationPolicy: ReplicationPolicy;
  readonly lastModified: number;
  readonly version: number;
}

/** Individual replica state */
export interface DocumentReplica {
  readonly region: Region;
  readonly status: ReplicationStatus;
  readonly version: number;
  readonly lastSynced: number;
  readonly syncError?: string;
}

/** Replication policy */
export interface ReplicationPolicy {
  readonly mode: 'sync' | 'async' | 'eventual';
  readonly minReplicas: number;
  readonly maxReplicas: number;
  readonly targetRegions?: readonly Region[];
  readonly excludeRegions?: readonly Region[];
  readonly geoRestriction?: readonly string[]; // Country codes
}

/** Failover event */
export interface FailoverEvent {
  readonly id: string;
  readonly fromRegion: Region;
  readonly toRegion: Region;
  readonly reason: string;
  readonly triggeredAt: number;
  readonly completedAt?: number;
  readonly affectedDocuments: number;
  readonly success: boolean;
  readonly failureReason?: string;
}

/** Backup configuration */
export interface BackupConfig {
  readonly enabled: boolean;
  readonly frequency: 'hourly' | 'daily' | 'weekly';
  readonly retentionDays: number;
  readonly targetRegions: readonly Region[];
  readonly encryption: boolean;
  readonly compression: boolean;
}

/** Backup record */
export interface BackupRecord {
  readonly id: string;
  readonly documentId: DocumentId;
  readonly region: Region;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly encrypted: boolean;
  readonly compressed: boolean;
  readonly version: number;
}

/** Restore request */
export interface RestoreRequest {
  readonly id: string;
  readonly backupId: string;
  readonly documentId: DocumentId;
  readonly targetRegion: Region;
  readonly requestedBy: UserId;
  readonly requestedAt: number;
  readonly status: 'pending' | 'in_progress' | 'completed' | 'failed';
  readonly completedAt?: number;
  readonly error?: string;
}

/** Multi-region events */
export interface MultiRegionEvents {
  'region:healthy': { region: Region };
  'region:degraded': { region: Region; reason: string };
  'region:unhealthy': { region: Region; reason: string };
  'failover:started': { event: FailoverEvent };
  'failover:completed': { event: FailoverEvent };
  'failover:failed': { event: FailoverEvent };
  'replication:started': { documentId: DocumentId; targetRegion: Region };
  'replication:completed': { documentId: DocumentId; targetRegion: Region };
  'replication:failed': { documentId: DocumentId; targetRegion: Region; error: string };
  'backup:created': { backup: BackupRecord };
  'backup:expired': { backupId: string };
  'restore:completed': { request: RestoreRequest };
  [key: string]: unknown;
}

/** Multi-region configuration */
export interface MultiRegionConfig {
  readonly failoverMode: FailoverMode;
  readonly healthCheckInterval: number;
  readonly failoverThreshold: number; // Consecutive failures before failover
  readonly replicationTimeout: number;
  readonly enableAutomaticRecovery: boolean;
  readonly backup: BackupConfig;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: MultiRegionConfig = {
  failoverMode: 'automatic',
  healthCheckInterval: 30000, // 30 seconds
  failoverThreshold: 3,
  replicationTimeout: 10000, // 10 seconds
  enableAutomaticRecovery: true,
  backup: {
    enabled: true,
    frequency: 'daily',
    retentionDays: 30,
    targetRegions: ['us-east-1', 'eu-west-1'],
    encryption: true,
    compression: true,
  },
};

// =============================================================================
// Multi-Region Manager
// =============================================================================

export class MultiRegionManager extends EventEmitter<MultiRegionEvents> {
  private readonly regions = new Map<Region, RegionConfig>();
  private readonly regionStatus = new Map<Region, RegionStatus>();
  private readonly documentReplications = new Map<DocumentId, DocumentReplication>();
  private readonly backups = new Map<string, BackupRecord>();
  private readonly restoreRequests = new Map<string, RestoreRequest>();
  private readonly failoverHistory: FailoverEvent[] = [];

  private readonly config: MultiRegionConfig;
  private primaryRegion: Region;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    primaryRegion: Region,
    config?: Partial<MultiRegionConfig>
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.primaryRegion = primaryRegion;
    this.startHealthChecks();
  }

  // ===========================================================================
  // Public API - Region Management
  // ===========================================================================

  /**
   * Add a region to the cluster
   */
  addRegion(config: RegionConfig): void {
    this.regions.set(config.region, config);
    this.regionStatus.set(config.region, {
      region: config.region,
      health: 'unknown',
      latencyMs: 0,
      lastChecked: 0,
      consecutiveFailures: 0,
      activeConnections: 0,
      replicationLag: 0,
      availableCapacity: config.maxCapacity,
    });
  }

  /**
   * Remove a region from the cluster
   */
  removeRegion(region: Region): boolean {
    if (region === this.primaryRegion) {
      return false; // Cannot remove primary
    }

    this.regions.delete(region);
    this.regionStatus.delete(region);
    return true;
  }

  /**
   * Get all configured regions
   */
  getRegions(): RegionConfig[] {
    return Array.from(this.regions.values());
  }

  /**
   * Get region status
   */
  getRegionStatus(region: Region): RegionStatus | undefined {
    return this.regionStatus.get(region);
  }

  /**
   * Get all region statuses
   */
  getAllRegionStatus(): RegionStatus[] {
    return Array.from(this.regionStatus.values());
  }

  /**
   * Get primary region
   */
  getPrimaryRegion(): Region {
    return this.primaryRegion;
  }

  /**
   * Get healthy regions
   */
  getHealthyRegions(): Region[] {
    return Array.from(this.regionStatus.values())
      .filter((s) => s.health === 'healthy')
      .map((s) => s.region);
  }

  /**
   * Get nearest healthy region based on latency
   */
  getNearestHealthyRegion(): Region | null {
    const healthy = this.getHealthyRegions();
    if (healthy.length === 0) return null;

    const sorted = healthy.sort((a, b) => {
      const statusA = this.regionStatus.get(a);
      const statusB = this.regionStatus.get(b);
      return (statusA?.latencyMs ?? Infinity) - (statusB?.latencyMs ?? Infinity);
    });

    return sorted[0] ?? null;
  }

  // ===========================================================================
  // Public API - Replication
  // ===========================================================================

  /**
   * Set replication policy for a document
   */
  setReplicationPolicy(
    documentId: DocumentId,
    policy: ReplicationPolicy
  ): DocumentReplication {
    const existing = this.documentReplications.get(documentId);

    const replication: DocumentReplication = {
      documentId,
      primaryRegion: this.primaryRegion,
      replicas: existing?.replicas ?? [],
      replicationPolicy: policy,
      lastModified: Date.now(),
      version: (existing?.version ?? 0) + 1,
    };

    this.documentReplications.set(documentId, replication);

    // Trigger initial replication if needed
    this.ensureReplication(documentId);

    return replication;
  }

  /**
   * Get replication status for a document
   */
  getReplicationStatus(documentId: DocumentId): DocumentReplication | undefined {
    return this.documentReplications.get(documentId);
  }

  /**
   * Replicate document to a specific region
   */
  async replicateToRegion(documentId: DocumentId, targetRegion: Region): Promise<boolean> {
    const replication = this.documentReplications.get(documentId);
    if (!replication) return false;

    const regionConfig = this.regions.get(targetRegion);
    if (!regionConfig || !regionConfig.enabled) return false;

    this.emit('replication:started', { documentId, targetRegion });

    try {
      // Simulate replication (in real implementation, this would sync data)
      await this.simulateReplication(documentId, targetRegion);

      // Update replica status
      const existingReplica = replication.replicas.find((r) => r.region === targetRegion);
      const newReplica: DocumentReplica = {
        region: targetRegion,
        status: 'synced',
        version: replication.version,
        lastSynced: Date.now(),
      };

      const updatedReplicas = existingReplica
        ? replication.replicas.map((r) => (r.region === targetRegion ? newReplica : r))
        : [...replication.replicas, newReplica];

      this.documentReplications.set(documentId, {
        ...replication,
        replicas: updatedReplicas,
      });

      this.emit('replication:completed', { documentId, targetRegion });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('replication:failed', { documentId, targetRegion, error: errorMessage });
      return false;
    }
  }

  /**
   * Force sync all replicas for a document
   */
  async syncAllReplicas(documentId: DocumentId): Promise<{ region: Region; success: boolean }[]> {
    const replication = this.documentReplications.get(documentId);
    if (!replication) return [];

    const results: { region: Region; success: boolean }[] = [];

    for (const replica of replication.replicas) {
      const success = await this.replicateToRegion(documentId, replica.region);
      results.push({ region: replica.region, success });
    }

    return results;
  }

  // ===========================================================================
  // Public API - Failover
  // ===========================================================================

  /**
   * Trigger manual failover to a region
   */
  async triggerFailover(
    targetRegion: Region,
    reason: string
  ): Promise<FailoverEvent> {
    const event: FailoverEvent = {
      id: this.generateId('failover'),
      fromRegion: this.primaryRegion,
      toRegion: targetRegion,
      reason,
      triggeredAt: Date.now(),
      affectedDocuments: this.documentReplications.size,
      success: false,
    };

    this.emit('failover:started', { event });

    try {
      // Verify target region is healthy
      const targetStatus = this.regionStatus.get(targetRegion);
      if (!targetStatus || targetStatus.health === 'unhealthy') {
        throw new Error(`Target region ${targetRegion} is not healthy`);
      }

      // Update primary region
      const oldPrimary = this.primaryRegion;
      this.primaryRegion = targetRegion;

      // Update region configs
      const oldConfig = this.regions.get(oldPrimary);
      if (oldConfig) {
        this.regions.set(oldPrimary, { ...oldConfig, isPrimary: false });
      }

      const newConfig = this.regions.get(targetRegion);
      if (newConfig) {
        this.regions.set(targetRegion, { ...newConfig, isPrimary: true });
      }

      // Update document primary regions
      for (const [docId, replication] of this.documentReplications.entries()) {
        this.documentReplications.set(docId, {
          ...replication,
          primaryRegion: targetRegion,
        });
      }

      const completedEvent: FailoverEvent = {
        ...event,
        completedAt: Date.now(),
        success: true,
      };

      this.failoverHistory.push(completedEvent);
      this.emit('failover:completed', { event: completedEvent });

      return completedEvent;
    } catch (error) {
      const failedEvent: FailoverEvent = {
        ...event,
        completedAt: Date.now(),
        success: false,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      };

      this.failoverHistory.push(failedEvent);
      this.emit('failover:failed', { event: failedEvent });

      return failedEvent;
    }
  }

  /**
   * Get failover history
   */
  getFailoverHistory(): FailoverEvent[] {
    return [...this.failoverHistory];
  }

  // ===========================================================================
  // Public API - Backup & Recovery
  // ===========================================================================

  /**
   * Create a backup of a document
   */
  async createBackup(
    documentId: DocumentId,
    data: string,
    targetRegion?: Region
  ): Promise<BackupRecord> {
    const region = targetRegion ?? this.config.backup.targetRegions[0] ?? this.primaryRegion;

    const dataBytes = new TextEncoder().encode(data);
    let size = dataBytes.length;

    // Simulate compression
    if (this.config.backup.compression) {
      size = Math.round(size * 0.3); // ~70% compression
    }

    const checksum = await this.calculateChecksum(data);

    const backup: BackupRecord = {
      id: this.generateId('backup'),
      documentId,
      region,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.backup.retentionDays * 24 * 60 * 60 * 1000,
      sizeBytes: size,
      checksum,
      encrypted: this.config.backup.encryption,
      compressed: this.config.backup.compression,
      version: (this.documentReplications.get(documentId)?.version ?? 0) + 1,
    };

    this.backups.set(backup.id, backup);
    this.emit('backup:created', { backup });

    return backup;
  }

  /**
   * Get backups for a document
   */
  getBackups(documentId: DocumentId): BackupRecord[] {
    return Array.from(this.backups.values())
      .filter((b) => b.documentId === documentId && b.expiresAt > Date.now())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Request a restore from backup
   */
  requestRestore(
    backupId: string,
    targetRegion: Region,
    requestedBy: UserId
  ): RestoreRequest | null {
    const backup = this.backups.get(backupId);
    if (!backup) return null;

    const request: RestoreRequest = {
      id: this.generateId('restore'),
      backupId,
      documentId: backup.documentId,
      targetRegion,
      requestedBy,
      requestedAt: Date.now(),
      status: 'pending',
    };

    this.restoreRequests.set(request.id, request);

    // Start async restore
    this.processRestore(request.id);

    return request;
  }

  /**
   * Get restore request status
   */
  getRestoreRequest(requestId: string): RestoreRequest | undefined {
    return this.restoreRequests.get(requestId);
  }

  // ===========================================================================
  // Public API - Health Monitoring
  // ===========================================================================

  /**
   * Report health check result for a region
   */
  reportHealthCheck(
    region: Region,
    result: {
      healthy: boolean;
      latencyMs: number;
      error?: string;
    }
  ): void {
    const status = this.regionStatus.get(region);
    if (!status) return;

    const newHealth: RegionHealth = result.healthy
      ? 'healthy'
      : status.consecutiveFailures >= this.config.failoverThreshold - 1
        ? 'unhealthy'
        : 'degraded';

    const newStatus: RegionStatus = {
      ...status,
      health: newHealth,
      latencyMs: result.latencyMs,
      lastChecked: Date.now(),
      consecutiveFailures: result.healthy ? 0 : status.consecutiveFailures + 1,
    };

    this.regionStatus.set(region, newStatus);

    // Emit health events
    if (status.health !== newHealth) {
      if (newHealth === 'healthy') {
        this.emit('region:healthy', { region });
      } else if (newHealth === 'degraded') {
        this.emit('region:degraded', { region, reason: result.error ?? 'Unknown' });
      } else if (newHealth === 'unhealthy') {
        this.emit('region:unhealthy', { region, reason: result.error ?? 'Unknown' });

        // Trigger automatic failover if enabled
        if (
          this.config.failoverMode === 'automatic' &&
          region === this.primaryRegion
        ) {
          this.handleAutomaticFailover(region);
        }
      }
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Stop health checks and cleanup
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Clean up expired backups
   */
  cleanupExpiredBackups(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, backup] of this.backups.entries()) {
      if (backup.expiresAt < now) {
        this.backups.delete(id);
        this.emit('backup:expired', { backupId: id });
        cleaned++;
      }
    }

    return cleaned;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      for (const region of this.regions.keys()) {
        this.performHealthCheck(region);
      }
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(region: Region): Promise<void> {
    const config = this.regions.get(region);
    if (!config || !config.enabled) return;

    const startTime = performance.now();

    try {
      // Simulate health check (in real implementation, ping the endpoint)
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

      const latencyMs = performance.now() - startTime;
      this.reportHealthCheck(region, { healthy: true, latencyMs });
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      this.reportHealthCheck(region, {
        healthy: false,
        latencyMs,
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    }
  }

  private async handleAutomaticFailover(failedRegion: Region): Promise<void> {
    // Find best alternative region
    const healthyRegions = this.getHealthyRegions().filter((r) => r !== failedRegion);
    if (healthyRegions.length === 0) {
      console.error('No healthy regions available for failover');
      return;
    }

    // Select region with lowest latency
    const targetRegion = this.getNearestHealthyRegion();
    if (!targetRegion || targetRegion === failedRegion) return;

    await this.triggerFailover(targetRegion, `Automatic failover: ${failedRegion} became unhealthy`);
  }

  private ensureReplication(documentId: DocumentId): void {
    const replication = this.documentReplications.get(documentId);
    if (!replication) return;

    const policy = replication.replicationPolicy;
    const currentReplicas = replication.replicas.length;

    if (currentReplicas < policy.minReplicas) {
      // Find regions to replicate to
      const eligibleRegions = this.getEligibleRegions(policy);
      const existingRegions = new Set(replication.replicas.map((r) => r.region));

      for (const region of eligibleRegions) {
        if (!existingRegions.has(region) && currentReplicas < policy.maxReplicas) {
          this.replicateToRegion(documentId, region);
        }
      }
    }
  }

  private getEligibleRegions(policy: ReplicationPolicy): Region[] {
    let regions = Array.from(this.regions.keys());

    // Filter by target regions if specified
    if (policy.targetRegions && policy.targetRegions.length > 0) {
      regions = regions.filter((r) => policy.targetRegions!.includes(r));
    }

    // Exclude specified regions
    if (policy.excludeRegions && policy.excludeRegions.length > 0) {
      regions = regions.filter((r) => !policy.excludeRegions!.includes(r));
    }

    // Filter healthy regions
    regions = regions.filter((r) => {
      const status = this.regionStatus.get(r);
      return status && status.health !== 'unhealthy';
    });

    return regions;
  }

  private async simulateReplication(
    _documentId: DocumentId,
    _targetRegion: Region
  ): Promise<void> {
    // Simulate network latency
    await new Promise((resolve) =>
      setTimeout(resolve, 100 + Math.random() * 400)
    );
  }

  private async processRestore(requestId: string): Promise<void> {
    const request = this.restoreRequests.get(requestId);
    if (!request) return;

    // Update status to in_progress
    this.restoreRequests.set(requestId, { ...request, status: 'in_progress' });

    try {
      // Simulate restore process
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const completed: RestoreRequest = {
        ...request,
        status: 'completed',
        completedAt: Date.now(),
      };
      this.restoreRequests.set(requestId, completed);
      this.emit('restore:completed', { request: completed });
    } catch (error) {
      const failed: RestoreRequest = {
        ...request,
        status: 'failed',
        completedAt: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this.restoreRequests.set(requestId, failed);
    }
  }

  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a multi-region manager
 */
export function createMultiRegionManager(
  primaryRegion: Region,
  config?: Partial<MultiRegionConfig>
): MultiRegionManager {
  return new MultiRegionManager(primaryRegion, config);
}
