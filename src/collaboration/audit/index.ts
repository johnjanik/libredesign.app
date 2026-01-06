/**
 * Audit Module
 *
 * Provides enterprise compliance and audit capabilities:
 * - Immutable audit logging with hash chaining
 * - Compliance reporting (GDPR, HIPAA, SOC 2, ISO 27001)
 * - Legal hold management for e-discovery
 */

// Audit Logger
export {
  AuditLogger,
  createAuditLogger,
  AuditActions,
  type AuditCategory,
  type AuditSeverity,
  type AuditOutcome,
  type AuditEvent,
  type AuditActor,
  type AuditTarget,
  type AuditContext,
  type AuditQueryOptions,
  type AuditStatistics,
  type AuditLoggerConfig,
  type AuditLoggerEvents,
} from './audit-logger';

// Compliance Reporter
export {
  ComplianceReporter,
  createComplianceReporter,
  type ComplianceFramework,
  type ComplianceStatus,
  type ReportFormat,
  type ComplianceControl,
  type ControlEvaluation,
  type ComplianceFinding,
  type ComplianceContext,
  type ComplianceReport,
  type ComplianceSummary,
  type DataFlow,
  type RiskAssessment,
  type ComplianceReporterEvents,
} from './compliance-reporter';

// Legal Hold Manager
export {
  LegalHoldManager,
  createLegalHoldManager,
  type LegalHoldStatus,
  type HoldScope,
  type LegalMatter,
  type Custodian,
  type LegalHold,
  type HoldNotification,
  type PreservedItem,
  type DiscoveryExport,
  type LegalHoldManagerEvents,
  type LegalHoldManagerConfig,
} from './legal-hold-manager';
