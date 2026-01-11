/**
 * Audit Module
 *
 * Exports audit logging and storage components for plugin actions.
 */

export {
  AuditLogger,
  DEFAULT_AUDIT_CONFIG,
  type ActionCategory,
  type ActionResult,
  type AuditLogEntry,
  type AuditLogFilter,
  type AuditLogStats,
  type AuditLogCallback,
  type AuditLoggerConfig,
} from './audit-logger';

export {
  LogStorage,
  IndexedDBBackend,
  MemoryBackend,
  DEFAULT_STORAGE_CONFIG,
  type StorageBackend,
  type LogStorageConfig,
} from './log-storage';
