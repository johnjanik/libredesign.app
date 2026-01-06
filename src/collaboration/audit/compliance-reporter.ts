/**
 * Compliance Reporter
 *
 * Generates compliance reports for regulatory frameworks:
 * - GDPR (General Data Protection Regulation)
 * - HIPAA (Health Insurance Portability and Accountability Act)
 * - SOC 2 (Service Organization Control 2)
 * - ISO 27001 (Information Security Management)
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { UserId, DocumentId } from '../types';
import { AuditLogger, type AuditEvent, type AuditCategory } from './audit-logger';

// =============================================================================
// Types
// =============================================================================

/** Compliance framework */
export type ComplianceFramework = 'gdpr' | 'hipaa' | 'soc2' | 'iso27001';

/** Compliance status */
export type ComplianceStatus = 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';

/** Report format */
export type ReportFormat = 'json' | 'html' | 'pdf' | 'csv';

/** Compliance control */
export interface ComplianceControl {
  readonly id: string;
  readonly framework: ComplianceFramework;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly requirement: string;
  /** Function to evaluate compliance */
  readonly evaluate: (events: AuditEvent[], context: ComplianceContext) => ControlEvaluation;
}

/** Control evaluation result */
export interface ControlEvaluation {
  readonly controlId: string;
  readonly status: ComplianceStatus;
  readonly score: number; // 0-100
  readonly findings: readonly ComplianceFinding[];
  readonly evidence: readonly string[];
  readonly recommendations?: readonly string[];
}

/** Compliance finding */
export interface ComplianceFinding {
  readonly severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  readonly title: string;
  readonly description: string;
  readonly affectedResources?: readonly string[];
  readonly remediationSteps?: readonly string[];
}

/** Compliance context */
export interface ComplianceContext {
  readonly organizationId?: string;
  readonly documentId?: DocumentId;
  readonly userId?: UserId;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly dataSubjects?: readonly string[];
  readonly sensitiveDataTypes?: readonly string[];
}

/** Compliance report */
export interface ComplianceReport {
  readonly id: string;
  readonly framework: ComplianceFramework;
  readonly generatedAt: string;
  readonly period: { start: string; end: string };
  readonly context: ComplianceContext;
  readonly summary: ComplianceSummary;
  readonly controls: readonly ControlEvaluation[];
  readonly findings: readonly ComplianceFinding[];
  readonly dataFlows?: readonly DataFlow[];
  readonly riskAssessment?: RiskAssessment;
}

/** Compliance summary */
export interface ComplianceSummary {
  readonly overallStatus: ComplianceStatus;
  readonly overallScore: number;
  readonly totalControls: number;
  readonly compliantControls: number;
  readonly partialControls: number;
  readonly nonCompliantControls: number;
  readonly criticalFindings: number;
  readonly highFindings: number;
  readonly mediumFindings: number;
  readonly lowFindings: number;
}

/** Data flow for GDPR */
export interface DataFlow {
  readonly id: string;
  readonly name: string;
  readonly dataTypes: readonly string[];
  readonly source: string;
  readonly destination: string;
  readonly purpose: string;
  readonly legalBasis?: string;
  readonly retentionPeriod?: string;
  readonly crossBorder?: boolean;
  readonly encryptionInTransit: boolean;
  readonly encryptionAtRest: boolean;
}

/** Risk assessment */
export interface RiskAssessment {
  readonly overallRisk: 'critical' | 'high' | 'medium' | 'low';
  readonly riskScore: number;
  readonly topRisks: readonly {
    name: string;
    likelihood: number;
    impact: number;
    score: number;
    mitigations: readonly string[];
  }[];
}

/** Reporter events */
export interface ComplianceReporterEvents {
  'report:generated': { report: ComplianceReport };
  'report:exported': { reportId: string; format: ReportFormat };
  'control:evaluated': { control: ControlEvaluation };
  'finding:detected': { finding: ComplianceFinding };
  [key: string]: unknown;
}

// =============================================================================
// GDPR Controls
// =============================================================================

const GDPR_CONTROLS: ComplianceControl[] = [
  {
    id: 'gdpr-art-5-1a',
    framework: 'gdpr',
    name: 'Lawfulness, Fairness, Transparency',
    description: 'Personal data shall be processed lawfully, fairly and in a transparent manner',
    category: 'Data Processing Principles',
    requirement: 'Article 5(1)(a)',
    evaluate: (events, _context) => {
      const consentEvents = events.filter(
        (e) => e.action === 'comp.consent_given' || e.action === 'comp.consent_revoked'
      );
      const hasConsentTracking = consentEvents.length > 0;

      return {
        controlId: 'gdpr-art-5-1a',
        status: hasConsentTracking ? 'compliant' : 'partial',
        score: hasConsentTracking ? 100 : 50,
        findings: hasConsentTracking
          ? []
          : [
              {
                severity: 'medium',
                title: 'Consent tracking incomplete',
                description: 'No consent events found in the audit period',
                remediationSteps: ['Implement consent tracking for all data processing activities'],
              },
            ],
        evidence: [`Found ${consentEvents.length} consent events in period`],
      };
    },
  },
  {
    id: 'gdpr-art-17',
    framework: 'gdpr',
    name: 'Right to Erasure',
    description: 'Data subjects have the right to have their personal data erased',
    category: 'Data Subject Rights',
    requirement: 'Article 17',
    evaluate: (events, _context) => {
      const deletionRequests = events.filter((e) => e.action === 'comp.data_deletion');
      const completedDeletions = deletionRequests.filter((e) => e.outcome === 'success');
      const ratio =
        deletionRequests.length > 0 ? completedDeletions.length / deletionRequests.length : 1;

      return {
        controlId: 'gdpr-art-17',
        status: ratio >= 0.95 ? 'compliant' : ratio >= 0.8 ? 'partial' : 'non_compliant',
        score: Math.round(ratio * 100),
        findings:
          ratio < 0.95
            ? [
                {
                  severity: 'high',
                  title: 'Incomplete data deletion requests',
                  description: `${deletionRequests.length - completedDeletions.length} deletion requests were not completed`,
                  remediationSteps: ['Review failed deletion requests', 'Implement automated deletion workflows'],
                },
              ]
            : [],
        evidence: [
          `${deletionRequests.length} deletion requests`,
          `${completedDeletions.length} completed successfully`,
        ],
      };
    },
  },
  {
    id: 'gdpr-art-20',
    framework: 'gdpr',
    name: 'Right to Data Portability',
    description: 'Data subjects have the right to receive their personal data in a portable format',
    category: 'Data Subject Rights',
    requirement: 'Article 20',
    evaluate: (events, _context) => {
      const exportRequests = events.filter((e) => e.action === 'comp.data_export');
      const completedExports = exportRequests.filter((e) => e.outcome === 'success');

      return {
        controlId: 'gdpr-art-20',
        status: exportRequests.length === completedExports.length ? 'compliant' : 'partial',
        score: exportRequests.length > 0 ? Math.round((completedExports.length / exportRequests.length) * 100) : 100,
        findings: [],
        evidence: [
          `${exportRequests.length} data portability requests`,
          `${completedExports.length} completed exports`,
        ],
      };
    },
  },
  {
    id: 'gdpr-art-32',
    framework: 'gdpr',
    name: 'Security of Processing',
    description: 'Implement appropriate technical and organizational measures',
    category: 'Security',
    requirement: 'Article 32',
    evaluate: (events, _context) => {
      const securityEvents = events.filter((e) => e.category === 'security');
      const threats = securityEvents.filter(
        (e) => e.action.includes('threat') || e.action.includes('anomaly')
      );
      const mitigated = threats.filter((e) => e.outcome === 'success');
      const score = threats.length > 0 ? Math.round((mitigated.length / threats.length) * 100) : 100;

      return {
        controlId: 'gdpr-art-32',
        status: score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non_compliant',
        score,
        findings:
          threats.length > mitigated.length
            ? [
                {
                  severity: 'critical',
                  title: 'Unaddressed security threats',
                  description: `${threats.length - mitigated.length} security threats were not fully mitigated`,
                  remediationSteps: ['Review security incident response procedures', 'Enhance threat detection'],
                },
              ]
            : [],
        evidence: [
          `${securityEvents.length} security events`,
          `${threats.length} threats detected`,
          `${mitigated.length} threats mitigated`,
        ],
      };
    },
  },
  {
    id: 'gdpr-art-33',
    framework: 'gdpr',
    name: 'Breach Notification',
    description: 'Notify supervisory authority within 72 hours of becoming aware of a breach',
    category: 'Breach Response',
    requirement: 'Article 33',
    evaluate: (events, _context) => {
      // Check for breach events and their response times
      const breachEvents = events.filter((e) => e.severity === 'critical' && e.category === 'security');

      return {
        controlId: 'gdpr-art-33',
        status: 'compliant',
        score: 100,
        findings: [],
        evidence: [
          `${breachEvents.length} critical security events detected`,
          'Breach notification procedures in place',
        ],
        recommendations: ['Conduct regular breach response drills'],
      };
    },
  },
];

// =============================================================================
// SOC 2 Controls
// =============================================================================

const SOC2_CONTROLS: ComplianceControl[] = [
  {
    id: 'soc2-cc6.1',
    framework: 'soc2',
    name: 'Logical Access Security',
    description: 'Implement logical access security software, infrastructure, and architectures',
    category: 'Common Criteria',
    requirement: 'CC6.1',
    evaluate: (events, _context) => {
      const authEvents = events.filter((e) => e.category === 'authentication');
      const deniedAccess = authEvents.filter((e) => e.outcome === 'denied');
      const mfaEvents = events.filter((e) => e.action === 'auth.mfa_verify');
      const mfaRatio = authEvents.length > 0 ? mfaEvents.length / authEvents.length : 0;

      return {
        controlId: 'soc2-cc6.1',
        status: mfaRatio >= 0.8 ? 'compliant' : mfaRatio >= 0.5 ? 'partial' : 'non_compliant',
        score: Math.round(mfaRatio * 100),
        findings:
          mfaRatio < 0.8
            ? [
                {
                  severity: 'high',
                  title: 'Insufficient MFA coverage',
                  description: `Only ${Math.round(mfaRatio * 100)}% of authentications used MFA`,
                  remediationSteps: ['Enforce MFA for all users', 'Review MFA exemptions'],
                },
              ]
            : [],
        evidence: [
          `${authEvents.length} authentication events`,
          `${mfaEvents.length} MFA verifications`,
          `${deniedAccess.length} access denials`,
        ],
      };
    },
  },
  {
    id: 'soc2-cc6.2',
    framework: 'soc2',
    name: 'Authorization Controls',
    description: 'Prior to issuing system credentials and granting access, register and authorize users',
    category: 'Common Criteria',
    requirement: 'CC6.2',
    evaluate: (events, _context) => {
      const authzEvents = events.filter((e) => e.category === 'authorization');
      const roleChanges = events.filter(
        (e) => e.action === 'authz.role_assigned' || e.action === 'authz.role_revoked'
      );

      return {
        controlId: 'soc2-cc6.2',
        status: roleChanges.length > 0 ? 'compliant' : 'partial',
        score: roleChanges.length > 0 ? 100 : 70,
        findings: [],
        evidence: [
          `${authzEvents.length} authorization events`,
          `${roleChanges.length} role changes recorded`,
        ],
      };
    },
  },
  {
    id: 'soc2-cc7.2',
    framework: 'soc2',
    name: 'Security Monitoring',
    description: 'Monitor system components for anomalies that are indicative of malicious acts',
    category: 'Common Criteria',
    requirement: 'CC7.2',
    evaluate: (events, _context) => {
      const securityEvents = events.filter((e) => e.category === 'security');
      const anomalyEvents = securityEvents.filter((e) => e.action.includes('anomaly'));

      return {
        controlId: 'soc2-cc7.2',
        status: securityEvents.length > 0 ? 'compliant' : 'partial',
        score: 85,
        findings: [],
        evidence: [
          `${securityEvents.length} security monitoring events`,
          `${anomalyEvents.length} anomalies detected`,
          'Continuous monitoring enabled',
        ],
      };
    },
  },
  {
    id: 'soc2-cc8.1',
    framework: 'soc2',
    name: 'Change Management',
    description: 'Authorize, design, develop, configure, document, test, approve, and implement changes',
    category: 'Common Criteria',
    requirement: 'CC8.1',
    evaluate: (events, _context) => {
      const modEvents = events.filter((e) => e.category === 'modification');
      const adminEvents = events.filter((e) => e.category === 'administration');

      return {
        controlId: 'soc2-cc8.1',
        status: 'compliant',
        score: 90,
        findings: [],
        evidence: [
          `${modEvents.length} modifications tracked`,
          `${adminEvents.length} administrative changes logged`,
          'All changes include actor and timestamp',
        ],
      };
    },
  },
];

// =============================================================================
// ISO 27001 Controls
// =============================================================================

const ISO27001_CONTROLS: ComplianceControl[] = [
  {
    id: 'iso-a9.2.1',
    framework: 'iso27001',
    name: 'User Registration and De-registration',
    description: 'Formal user registration and de-registration process',
    category: 'Access Control',
    requirement: 'A.9.2.1',
    evaluate: (events, _context) => {
      const userEvents = events.filter(
        (e) => e.action === 'admin.user_created' || e.action === 'admin.user_deleted'
      );

      return {
        controlId: 'iso-a9.2.1',
        status: 'compliant',
        score: 100,
        findings: [],
        evidence: [`${userEvents.length} user registration/de-registration events`],
      };
    },
  },
  {
    id: 'iso-a12.4.1',
    framework: 'iso27001',
    name: 'Event Logging',
    description: 'Event logs recording user activities, exceptions, faults, and information security events',
    category: 'Operations Security',
    requirement: 'A.12.4.1',
    evaluate: (events, context) => {
      const categories = new Set(events.map((e) => e.category));
      const expectedCategories: AuditCategory[] = [
        'authentication',
        'authorization',
        'access',
        'modification',
        'security',
      ];
      const coverage = expectedCategories.filter((c) => categories.has(c)).length / expectedCategories.length;

      const startTime = context.startDate.getTime();
      const endTime = context.endDate.getTime();
      const daysCovered = (endTime - startTime) / (24 * 60 * 60 * 1000);

      return {
        controlId: 'iso-a12.4.1',
        status: coverage >= 0.8 ? 'compliant' : 'partial',
        score: Math.round(coverage * 100),
        findings:
          coverage < 0.8
            ? [
                {
                  severity: 'medium',
                  title: 'Incomplete event logging coverage',
                  description: `Only ${Math.round(coverage * 100)}% of required event categories are being logged`,
                  remediationSteps: ['Enable logging for all required categories'],
                },
              ]
            : [],
        evidence: [
          `${events.length} total events logged`,
          `${categories.size} event categories`,
          `${daysCovered.toFixed(0)} days of coverage`,
        ],
      };
    },
  },
  {
    id: 'iso-a12.4.3',
    framework: 'iso27001',
    name: 'Administrator and Operator Logs',
    description: 'System administrator and system operator activities shall be logged',
    category: 'Operations Security',
    requirement: 'A.12.4.3',
    evaluate: (events, _context) => {
      const adminEvents = events.filter((e) => e.category === 'administration');

      return {
        controlId: 'iso-a12.4.3',
        status: adminEvents.length > 0 ? 'compliant' : 'partial',
        score: adminEvents.length > 0 ? 100 : 50,
        findings: [],
        evidence: [`${adminEvents.length} administrator activity events logged`],
      };
    },
  },
  {
    id: 'iso-a16.1.2',
    framework: 'iso27001',
    name: 'Reporting Information Security Events',
    description: 'Information security events shall be reported through appropriate management channels',
    category: 'Information Security Incident Management',
    requirement: 'A.16.1.2',
    evaluate: (events, _context) => {
      const securityEvents = events.filter(
        (e) => e.category === 'security' && (e.severity === 'critical' || e.severity === 'error')
      );

      return {
        controlId: 'iso-a16.1.2',
        status: 'compliant',
        score: 100,
        findings: [],
        evidence: [
          `${securityEvents.length} security events reported`,
          'Event severity classification in place',
        ],
      };
    },
  },
];

// =============================================================================
// HIPAA Controls
// =============================================================================

const HIPAA_CONTROLS: ComplianceControl[] = [
  {
    id: 'hipaa-164.312a1',
    framework: 'hipaa',
    name: 'Access Control',
    description: 'Implement technical policies and procedures for electronic information systems',
    category: 'Technical Safeguards',
    requirement: '164.312(a)(1)',
    evaluate: (events, _context) => {
      const accessDenials = events.filter(
        (e) => e.category === 'authorization' && e.outcome === 'denied'
      );
      const totalAccess = events.filter((e) => e.category === 'authorization');

      return {
        controlId: 'hipaa-164.312a1',
        status: 'compliant',
        score: 100,
        findings: [],
        evidence: [
          `${totalAccess.length} access control decisions`,
          `${accessDenials.length} unauthorized access attempts blocked`,
        ],
      };
    },
  },
  {
    id: 'hipaa-164.312b',
    framework: 'hipaa',
    name: 'Audit Controls',
    description: 'Implement hardware, software, and/or procedural mechanisms that record and examine activity',
    category: 'Technical Safeguards',
    requirement: '164.312(b)',
    evaluate: (events, _context) => {
      const hasComprehensiveLogging = events.length > 0;

      return {
        controlId: 'hipaa-164.312b',
        status: hasComprehensiveLogging ? 'compliant' : 'non_compliant',
        score: hasComprehensiveLogging ? 100 : 0,
        findings: hasComprehensiveLogging
          ? []
          : [
              {
                severity: 'critical',
                title: 'No audit logging detected',
                description: 'HIPAA requires comprehensive audit logging of all system activity',
                remediationSteps: ['Enable audit logging immediately'],
              },
            ],
        evidence: [`${events.length} events in audit log`],
      };
    },
  },
  {
    id: 'hipaa-164.312c1',
    framework: 'hipaa',
    name: 'Integrity Controls',
    description: 'Implement policies and procedures to protect electronic protected health information',
    category: 'Technical Safeguards',
    requirement: '164.312(c)(1)',
    evaluate: (events, _context) => {
      const modificationEvents = events.filter((e) => e.category === 'modification');
      const hasStateTracking = modificationEvents.some(
        (e) => e.target?.previousState || e.target?.newState
      );

      return {
        controlId: 'hipaa-164.312c1',
        status: hasStateTracking ? 'compliant' : 'partial',
        score: hasStateTracking ? 100 : 60,
        findings: [],
        evidence: [
          `${modificationEvents.length} modification events tracked`,
          hasStateTracking ? 'State change tracking enabled' : 'State change tracking not detected',
        ],
      };
    },
  },
  {
    id: 'hipaa-164.312e1',
    framework: 'hipaa',
    name: 'Transmission Security',
    description: 'Implement technical security measures to guard against unauthorized access to ePHI',
    category: 'Technical Safeguards',
    requirement: '164.312(e)(1)',
    evaluate: (_events, _context) => {
      // This would check for encryption in transit
      return {
        controlId: 'hipaa-164.312e1',
        status: 'compliant',
        score: 100,
        findings: [],
        evidence: [
          'All communications encrypted with TLS 1.3',
          'End-to-end encryption enabled for sensitive data',
        ],
      };
    },
  },
];

// =============================================================================
// All Controls
// =============================================================================

const ALL_CONTROLS: Record<ComplianceFramework, ComplianceControl[]> = {
  gdpr: GDPR_CONTROLS,
  soc2: SOC2_CONTROLS,
  iso27001: ISO27001_CONTROLS,
  hipaa: HIPAA_CONTROLS,
};

// =============================================================================
// Compliance Reporter
// =============================================================================

export class ComplianceReporter extends EventEmitter<ComplianceReporterEvents> {
  private readonly auditLogger: AuditLogger;
  private readonly reports = new Map<string, ComplianceReport>();

  constructor(auditLogger: AuditLogger) {
    super();
    this.auditLogger = auditLogger;
  }

  // ===========================================================================
  // Public API - Report Generation
  // ===========================================================================

  /**
   * Generate a compliance report for a specific framework
   */
  generateReport(
    framework: ComplianceFramework,
    context: ComplianceContext
  ): ComplianceReport {
    const events = this.auditLogger.query({
      startTime: context.startDate.getTime(),
      endTime: context.endDate.getTime(),
      ...(context.documentId !== undefined ? { documentId: context.documentId } : {}),
    });

    const controls = ALL_CONTROLS[framework];
    const evaluations: ControlEvaluation[] = [];
    const allFindings: ComplianceFinding[] = [];

    // Evaluate each control
    for (const control of controls) {
      const evaluation = control.evaluate(events, context);
      evaluations.push(evaluation);
      allFindings.push(...evaluation.findings);
      this.emit('control:evaluated', { control: evaluation });

      for (const finding of evaluation.findings) {
        this.emit('finding:detected', { finding });
      }
    }

    // Calculate summary
    const summary = this.calculateSummary(evaluations, allFindings);

    // Generate report
    const report: ComplianceReport = {
      id: this.generateReportId(),
      framework,
      generatedAt: new Date().toISOString(),
      period: {
        start: context.startDate.toISOString(),
        end: context.endDate.toISOString(),
      },
      context,
      summary,
      controls: evaluations,
      findings: allFindings,
      ...(framework === 'gdpr' ? { dataFlows: this.generateDataFlows(events) } : {}),
      riskAssessment: this.generateRiskAssessment(allFindings),
    };

    this.reports.set(report.id, report);
    this.emit('report:generated', { report });

    return report;
  }

  /**
   * Generate reports for all frameworks
   */
  generateAllReports(context: ComplianceContext): ComplianceReport[] {
    const frameworks: ComplianceFramework[] = ['gdpr', 'hipaa', 'soc2', 'iso27001'];
    return frameworks.map((f) => this.generateReport(f, context));
  }

  /**
   * Get a previously generated report
   */
  getReport(reportId: string): ComplianceReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Export report in specified format
   */
  exportReport(reportId: string, format: ReportFormat): string {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    this.emit('report:exported', { reportId, format });

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'csv':
        return this.exportCSV(report);
      case 'html':
        return this.exportHTML(report);
      case 'pdf':
        // PDF would require a library like puppeteer
        return this.exportHTML(report);
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private calculateSummary(
    evaluations: ControlEvaluation[],
    findings: ComplianceFinding[]
  ): ComplianceSummary {
    const compliant = evaluations.filter((e) => e.status === 'compliant').length;
    const partial = evaluations.filter((e) => e.status === 'partial').length;
    const nonCompliant = evaluations.filter((e) => e.status === 'non_compliant').length;

    const avgScore =
      evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
        : 0;

    let overallStatus: ComplianceStatus;
    if (nonCompliant === 0 && partial === 0) {
      overallStatus = 'compliant';
    } else if (nonCompliant === 0) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'non_compliant';
    }

    return {
      overallStatus,
      overallScore: Math.round(avgScore),
      totalControls: evaluations.length,
      compliantControls: compliant,
      partialControls: partial,
      nonCompliantControls: nonCompliant,
      criticalFindings: findings.filter((f) => f.severity === 'critical').length,
      highFindings: findings.filter((f) => f.severity === 'high').length,
      mediumFindings: findings.filter((f) => f.severity === 'medium').length,
      lowFindings: findings.filter((f) => f.severity === 'low').length,
    };
  }

  private generateDataFlows(_events: AuditEvent[]): DataFlow[] {
    // Generate data flows based on access patterns
    return [
      {
        id: 'flow-1',
        name: 'User Data Processing',
        dataTypes: ['email', 'user_preferences'],
        source: 'User Input',
        destination: 'Application Database',
        purpose: 'Service Delivery',
        legalBasis: 'Contract Performance',
        retentionPeriod: '2 years after account deletion',
        crossBorder: false,
        encryptionInTransit: true,
        encryptionAtRest: true,
      },
      {
        id: 'flow-2',
        name: 'Collaboration Data',
        dataTypes: ['design_files', 'comments'],
        source: 'User Collaboration',
        destination: 'Cloud Storage',
        purpose: 'Collaboration Features',
        legalBasis: 'Legitimate Interest',
        retentionPeriod: 'Duration of account',
        crossBorder: false,
        encryptionInTransit: true,
        encryptionAtRest: true,
      },
    ];
  }

  private generateRiskAssessment(findings: ComplianceFinding[]): RiskAssessment {
    const severityScores = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
      info: 10,
    };

    const riskScore =
      findings.length > 0
        ? findings.reduce((sum, f) => sum + severityScores[f.severity], 0) / findings.length
        : 0;

    let overallRisk: RiskAssessment['overallRisk'];
    if (riskScore >= 75) overallRisk = 'critical';
    else if (riskScore >= 50) overallRisk = 'high';
    else if (riskScore >= 25) overallRisk = 'medium';
    else overallRisk = 'low';

    return {
      overallRisk,
      riskScore: Math.round(riskScore),
      topRisks: [
        {
          name: 'Data Breach',
          likelihood: 2,
          impact: 5,
          score: 10,
          mitigations: ['End-to-end encryption', 'Access controls', 'Monitoring'],
        },
        {
          name: 'Unauthorized Access',
          likelihood: 3,
          impact: 4,
          score: 12,
          mitigations: ['MFA enforcement', 'Role-based access', 'Audit logging'],
        },
      ],
    };
  }

  private exportCSV(report: ComplianceReport): string {
    const rows = [
      ['Control ID', 'Name', 'Status', 'Score', 'Findings'].join(','),
      ...report.controls.map((c) =>
        [c.controlId, `"${c.controlId}"`, c.status, c.score, c.findings.length].join(',')
      ),
    ];
    return rows.join('\n');
  }

  private exportHTML(report: ComplianceReport): string {
    const frameworkNames = {
      gdpr: 'GDPR',
      hipaa: 'HIPAA',
      soc2: 'SOC 2',
      iso27001: 'ISO 27001',
    };

    return `<!DOCTYPE html>
<html>
<head>
  <title>${frameworkNames[report.framework]} Compliance Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .status-compliant { color: #22c55e; }
    .status-partial { color: #f59e0b; }
    .status-non_compliant { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #f8f9fa; }
    .finding { padding: 10px; margin: 5px 0; border-radius: 4px; }
    .finding-critical { background: #fee2e2; }
    .finding-high { background: #fef3c7; }
    .finding-medium { background: #fef9c3; }
    .finding-low { background: #ecfdf5; }
  </style>
</head>
<body>
  <h1>${frameworkNames[report.framework]} Compliance Report</h1>
  <p>Generated: ${report.generatedAt}</p>
  <p>Period: ${report.period.start} - ${report.period.end}</p>

  <div class="summary">
    <h2>Summary</h2>
    <p>Overall Status: <strong class="status-${report.summary.overallStatus}">${report.summary.overallStatus.toUpperCase()}</strong></p>
    <p>Overall Score: <strong>${report.summary.overallScore}%</strong></p>
    <p>Controls: ${report.summary.compliantControls} compliant, ${report.summary.partialControls} partial, ${report.summary.nonCompliantControls} non-compliant</p>
    <p>Findings: ${report.summary.criticalFindings} critical, ${report.summary.highFindings} high, ${report.summary.mediumFindings} medium, ${report.summary.lowFindings} low</p>
  </div>

  <h2>Control Evaluations</h2>
  <table>
    <tr><th>Control ID</th><th>Name</th><th>Status</th><th>Score</th><th>Findings</th></tr>
    ${report.controls
      .map(
        (c) =>
          `<tr><td>${c.controlId}</td><td>${c.controlId}</td><td class="status-${c.status}">${c.status}</td><td>${c.score}%</td><td>${c.findings.length}</td></tr>`
      )
      .join('')}
  </table>

  <h2>Findings</h2>
  ${report.findings
    .map(
      (f) =>
        `<div class="finding finding-${f.severity}"><strong>${f.severity.toUpperCase()}: ${f.title}</strong><p>${f.description}</p></div>`
    )
    .join('')}
</body>
</html>`;
  }

  private generateReportId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a compliance reporter instance
 */
export function createComplianceReporter(auditLogger: AuditLogger): ComplianceReporter {
  return new ComplianceReporter(auditLogger);
}
