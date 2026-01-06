/**
 * Infrastructure Module
 *
 * Provides multi-region infrastructure management:
 * - Geo-replication across regions
 * - Automatic failover
 * - Disaster recovery
 * - Backup management
 */

export {
  MultiRegionManager,
  createMultiRegionManager,
  type Region,
  type RegionHealth,
  type ReplicationStatus,
  type FailoverMode,
  type RegionConfig,
  type RegionStatus,
  type DocumentReplication,
  type DocumentReplica,
  type ReplicationPolicy,
  type FailoverEvent,
  type BackupConfig,
  type BackupRecord,
  type RestoreRequest,
  type MultiRegionEvents,
  type MultiRegionConfig,
} from './multi-region';
