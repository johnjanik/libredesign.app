/**
 * Compliance Module
 *
 * Exports compliance configuration, data retention, and privacy controls
 * for GDPR, SOC2, and other regulatory requirements.
 */

export {
  ComplianceConfigManager,
  DEFAULT_COMPLIANCE_CONFIG,
  GDPR_COMPLIANCE_CONFIG,
  SOC2_COMPLIANCE_CONFIG,
  type ComplianceStandard,
  type DataClassification,
  type DataPurpose,
  type ConsentStatus,
  type RetentionPolicy,
  type DataInventoryEntry,
  type ComplianceConfig,
} from './compliance-config';

export {
  DataRetentionManager,
  DEFAULT_RETENTION_CONFIG,
  type RetentionJobStatus,
  type RetentionJobResult,
  type RetentionSchedule,
  type ArchiveEntry,
  type RetentionCallback,
  type DataRetentionConfig,
} from './data-retention';

export {
  PrivacyControls,
  DEFAULT_PRIVACY_CONFIG,
  type DataRequestType,
  type DataRequestStatus,
  type DataRequest,
  type DataRequestResponse,
  type UserDataExport,
  type UserDataSection,
  type ConsentRequest,
  type PrivacyCallback,
  type PrivacyControlsConfig,
  type PluginDataHandler,
} from './privacy-controls';
