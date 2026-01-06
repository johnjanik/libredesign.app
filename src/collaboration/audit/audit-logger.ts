/**
 * Audit Logger
 *
 * Immutable security event logging with:
 * - Tamper-evident log entries (hash chaining)
 * - Structured event format
 * - Log retention policies
 * - Query and export capabilities
 * - Real-time event streaming
 */

import { EventEmitter } from '@core/events/event-emitter';
import { sha256Hex } from '../encryption/crypto-utils';
import type { UserId, DocumentId, CollaborationRole } from '../types';
import type { NodeId } from '@core/types/common';

// =============================================================================
// Types
// =============================================================================

/** Audit event category */
export type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'access'
  | 'modification'
  | 'sharing'
  | 'export'
  | 'administration'
  | 'security'
  | 'compliance';

/** Audit event severity */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/** Audit event outcome */
export type AuditOutcome = 'success' | 'failure' | 'denied' | 'error';

/** Base audit event */
export interface AuditEvent {
  /** Unique event ID */
  readonly id: string;
  /** Event timestamp (ISO 8601) */
  readonly timestamp: string;
  /** Unix timestamp for sorting */
  readonly timestampMs: number;
  /** Event category */
  readonly category: AuditCategory;
  /** Specific action type */
  readonly action: string;
  /** Event severity */
  readonly severity: AuditSeverity;
  /** Action outcome */
  readonly outcome: AuditOutcome;
  /** Actor who performed the action */
  readonly actor: AuditActor;
  /** Target of the action */
  readonly target?: AuditTarget;
  /** Additional context */
  readonly context?: AuditContext;
  /** Event details */
  readonly details?: Record<string, unknown>;
  /** Hash of this event (for integrity) */
  readonly hash: string;
  /** Hash of previous event (for chain integrity) */
  readonly previousHash: string;
  /** Sequence number in the audit chain */
  readonly sequence: number;
}

/** Actor information */
export interface AuditActor {
  readonly userId: UserId;
  readonly email?: string;
  readonly role?: CollaborationRole;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly sessionId?: string;
  /** Acting on behalf of (delegation) */
  readonly onBehalfOf?: UserId;
}

/** Target information */
export interface AuditTarget {
  readonly type: 'document' | 'element' | 'user' | 'permission' | 'share_link' | 'system';
  readonly id: DocumentId | NodeId | UserId | string;
  readonly name?: string;
  readonly previousState?: Record<string, unknown>;
  readonly newState?: Record<string, unknown>;
}

/** Context information */
export interface AuditContext {
  readonly documentId?: DocumentId;
  readonly workspaceId?: string;
  readonly organizationId?: string;
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly source?: 'web' | 'api' | 'cli' | 'system';
}

/** Audit query filters */
export interface AuditQueryOptions {
  /** Filter by category */
  readonly category?: AuditCategory | AuditCategory[];
  /** Filter by action */
  readonly action?: string | string[];
  /** Filter by actor */
  readonly actorId?: UserId;
  /** Filter by target */
  readonly targetId?: string;
  /** Filter by target type */
  readonly targetType?: AuditTarget['type'];
  /** Filter by severity */
  readonly severity?: AuditSeverity | AuditSeverity[];
  /** Filter by outcome */
  readonly outcome?: AuditOutcome | AuditOutcome[];
  /** Filter by document */
  readonly documentId?: DocumentId;
  /** Start time (inclusive) */
  readonly startTime?: number;
  /** End time (exclusive) */
  readonly endTime?: number;
  /** Maximum results */
  readonly limit?: number;
  /** Offset for pagination */
  readonly offset?: number;
  /** Sort order */
  readonly order?: 'asc' | 'desc';
}

/** Audit statistics */
export interface AuditStatistics {
  readonly totalEvents: number;
  readonly byCategory: Record<AuditCategory, number>;
  readonly bySeverity: Record<AuditSeverity, number>;
  readonly byOutcome: Record<AuditOutcome, number>;
  readonly byActor: Array<{ actorId: UserId; count: number }>;
  readonly timeRange: { start: number; end: number };
}

/** Audit logger configuration */
export interface AuditLoggerConfig {
  /** Maximum events to keep in memory */
  readonly maxEvents: number;
  /** Retention period in milliseconds */
  readonly retentionPeriod: number;
  /** Enable real-time streaming */
  readonly enableStreaming: boolean;
  /** Flush interval for batching */
  readonly flushInterval: number;
}

/** Audit logger events */
export interface AuditLoggerEvents {
  'event:logged': { event: AuditEvent };
  'event:batch': { events: AuditEvent[] };
  'chain:verified': { valid: boolean; lastSequence: number };
  'retention:cleaned': { removed: number };
  [key: string]: unknown;
}

// =============================================================================
// Predefined Action Types
// =============================================================================

export const AuditActions = {
  // Authentication
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_MFA_VERIFY: 'auth.mfa_verify',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',
  AUTH_SESSION_CREATED: 'auth.session_created',
  AUTH_SESSION_EXPIRED: 'auth.session_expired',

  // Authorization
  AUTHZ_PERMISSION_CHECK: 'authz.permission_check',
  AUTHZ_ROLE_ASSIGNED: 'authz.role_assigned',
  AUTHZ_ROLE_REVOKED: 'authz.role_revoked',
  AUTHZ_ELEVATION_REQUESTED: 'authz.elevation_requested',
  AUTHZ_ELEVATION_APPROVED: 'authz.elevation_approved',
  AUTHZ_ELEVATION_DENIED: 'authz.elevation_denied',
  AUTHZ_EMERGENCY_ACCESS: 'authz.emergency_access',

  // Access
  ACCESS_DOCUMENT_VIEW: 'access.document_view',
  ACCESS_DOCUMENT_OPEN: 'access.document_open',
  ACCESS_ELEMENT_VIEW: 'access.element_view',
  ACCESS_LINK_USED: 'access.link_used',

  // Modification
  MOD_DOCUMENT_CREATE: 'mod.document_create',
  MOD_DOCUMENT_UPDATE: 'mod.document_update',
  MOD_DOCUMENT_DELETE: 'mod.document_delete',
  MOD_ELEMENT_CREATE: 'mod.element_create',
  MOD_ELEMENT_UPDATE: 'mod.element_update',
  MOD_ELEMENT_DELETE: 'mod.element_delete',

  // Sharing
  SHARE_LINK_CREATED: 'share.link_created',
  SHARE_LINK_REVOKED: 'share.link_revoked',
  SHARE_INVITE_SENT: 'share.invite_sent',
  SHARE_INVITE_ACCEPTED: 'share.invite_accepted',
  SHARE_PERMISSION_CHANGED: 'share.permission_changed',

  // Export
  EXPORT_STARTED: 'export.started',
  EXPORT_COMPLETED: 'export.completed',
  EXPORT_FAILED: 'export.failed',
  EXPORT_WATERMARKED: 'export.watermarked',

  // Administration
  ADMIN_USER_CREATED: 'admin.user_created',
  ADMIN_USER_DELETED: 'admin.user_deleted',
  ADMIN_USER_SUSPENDED: 'admin.user_suspended',
  ADMIN_POLICY_CREATED: 'admin.policy_created',
  ADMIN_POLICY_UPDATED: 'admin.policy_updated',
  ADMIN_SETTINGS_CHANGED: 'admin.settings_changed',

  // Security
  SEC_THREAT_DETECTED: 'sec.threat_detected',
  SEC_ANOMALY_DETECTED: 'sec.anomaly_detected',
  SEC_BRUTE_FORCE: 'sec.brute_force',
  SEC_LOCK_ACQUIRED: 'sec.lock_acquired',
  SEC_LOCK_RELEASED: 'sec.lock_released',

  // Compliance
  COMP_LEGAL_HOLD_SET: 'comp.legal_hold_set',
  COMP_LEGAL_HOLD_RELEASED: 'comp.legal_hold_released',
  COMP_DATA_EXPORT: 'comp.data_export',
  COMP_DATA_DELETION: 'comp.data_deletion',
  COMP_CONSENT_GIVEN: 'comp.consent_given',
  COMP_CONSENT_REVOKED: 'comp.consent_revoked',
} as const;

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: AuditLoggerConfig = {
  maxEvents: 100000,
  retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
  enableStreaming: true,
  flushInterval: 5000, // 5 seconds
};

// =============================================================================
// Audit Logger
// =============================================================================

export class AuditLogger extends EventEmitter<AuditLoggerEvents> {
  private readonly events: AuditEvent[] = [];
  private readonly eventIndex = new Map<string, number>();
  private readonly config: AuditLoggerConfig;
  private sequence = 0;
  private lastHash = 'genesis';
  private pendingEvents: Omit<AuditEvent, 'hash' | 'previousHash' | 'sequence'>[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<AuditLoggerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startFlushTimer();
  }

  // ===========================================================================
  // Public API - Logging
  // ===========================================================================

  /**
   * Log an audit event
   */
  async log(event: {
    category: AuditCategory;
    action: string;
    severity?: AuditSeverity;
    outcome: AuditOutcome;
    actor: AuditActor;
    target?: AuditTarget;
    context?: AuditContext;
    details?: Record<string, unknown>;
  }): Promise<AuditEvent> {
    const now = Date.now();
    const timestamp = new Date(now).toISOString();

    const baseEvent = {
      id: this.generateEventId(),
      timestamp,
      timestampMs: now,
      category: event.category,
      action: event.action,
      severity: event.severity ?? 'info',
      outcome: event.outcome,
      actor: event.actor,
      ...(event.target ? { target: event.target } : {}),
      ...(event.context ? { context: event.context } : {}),
      ...(event.details ? { details: event.details } : {}),
    };

    // Add to pending events (will be hashed and stored on flush)
    this.pendingEvents.push(baseEvent);

    // For immediate events, flush now
    if (event.severity === 'critical' || event.severity === 'error') {
      const flushed = await this.flush();
      const firstEvent = flushed[0];
      if (firstEvent) return firstEvent;
    }

    // Return a temporary event (without hash) for immediate use
    return {
      ...baseEvent,
      hash: 'pending',
      previousHash: this.lastHash,
      sequence: this.sequence + this.pendingEvents.length,
    };
  }

  /**
   * Log a convenience method for common actions
   */
  async logAction(
    action: string,
    actor: AuditActor,
    outcome: AuditOutcome,
    options?: {
      category?: AuditCategory;
      severity?: AuditSeverity;
      target?: AuditTarget;
      context?: AuditContext;
      details?: Record<string, unknown>;
    }
  ): Promise<AuditEvent> {
    const logParams: Parameters<typeof this.log>[0] = {
      category: options?.category ?? this.inferCategory(action),
      action,
      outcome,
      actor,
    };
    if (options?.severity) logParams.severity = options.severity;
    if (options?.target) logParams.target = options.target;
    if (options?.context) logParams.context = options.context;
    if (options?.details) logParams.details = options.details;
    return this.log(logParams);
  }

  /**
   * Flush pending events (hash and store)
   */
  async flush(): Promise<AuditEvent[]> {
    if (this.pendingEvents.length === 0) {
      return [];
    }

    const flushedEvents: AuditEvent[] = [];

    for (const pending of this.pendingEvents) {
      this.sequence++;

      // Calculate hash for integrity
      const eventData = JSON.stringify({
        ...pending,
        sequence: this.sequence,
        previousHash: this.lastHash,
      });
      const hash = await sha256Hex(eventData);

      const event: AuditEvent = {
        ...pending,
        hash,
        previousHash: this.lastHash,
        sequence: this.sequence,
      };

      this.lastHash = hash;
      this.events.push(event);
      this.eventIndex.set(event.id, this.events.length - 1);
      flushedEvents.push(event);

      if (this.config.enableStreaming) {
        this.emit('event:logged', { event });
      }
    }

    this.pendingEvents = [];

    if (flushedEvents.length > 0) {
      this.emit('event:batch', { events: flushedEvents });
    }

    // Check retention
    this.enforceRetention();

    return flushedEvents;
  }

  // ===========================================================================
  // Public API - Query
  // ===========================================================================

  /**
   * Query audit events
   */
  query(options: AuditQueryOptions = {}): AuditEvent[] {
    let results = [...this.events];

    // Apply filters
    if (options.category) {
      const categories = Array.isArray(options.category) ? options.category : [options.category];
      results = results.filter((e) => categories.includes(e.category));
    }

    if (options.action) {
      const actions = Array.isArray(options.action) ? options.action : [options.action];
      results = results.filter((e) => actions.includes(e.action));
    }

    if (options.actorId) {
      results = results.filter((e) => e.actor.userId === options.actorId);
    }

    if (options.targetId) {
      results = results.filter((e) => e.target?.id === options.targetId);
    }

    if (options.targetType) {
      results = results.filter((e) => e.target?.type === options.targetType);
    }

    if (options.severity) {
      const severities = Array.isArray(options.severity) ? options.severity : [options.severity];
      results = results.filter((e) => severities.includes(e.severity));
    }

    if (options.outcome) {
      const outcomes = Array.isArray(options.outcome) ? options.outcome : [options.outcome];
      results = results.filter((e) => outcomes.includes(e.outcome));
    }

    if (options.documentId) {
      results = results.filter((e) => e.context?.documentId === options.documentId);
    }

    if (options.startTime !== undefined) {
      results = results.filter((e) => e.timestampMs >= options.startTime!);
    }

    if (options.endTime !== undefined) {
      results = results.filter((e) => e.timestampMs < options.endTime!);
    }

    // Sort
    const order = options.order ?? 'desc';
    results.sort((a, b) =>
      order === 'desc' ? b.timestampMs - a.timestampMs : a.timestampMs - b.timestampMs
    );

    // Pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): AuditEvent | undefined {
    const index = this.eventIndex.get(eventId);
    return index !== undefined ? this.events[index] : undefined;
  }

  /**
   * Get events for a specific user
   */
  getUserEvents(userId: UserId, limit = 100): AuditEvent[] {
    return this.query({ actorId: userId, limit });
  }

  /**
   * Get events for a specific document
   */
  getDocumentEvents(documentId: DocumentId, limit = 100): AuditEvent[] {
    return this.query({ documentId, limit });
  }

  /**
   * Get statistics
   */
  getStatistics(options?: { startTime?: number; endTime?: number }): AuditStatistics {
    let events = this.events;

    if (options?.startTime !== undefined) {
      events = events.filter((e) => e.timestampMs >= options.startTime!);
    }
    if (options?.endTime !== undefined) {
      events = events.filter((e) => e.timestampMs < options.endTime!);
    }

    const byCategory = {} as Record<AuditCategory, number>;
    const bySeverity = {} as Record<AuditSeverity, number>;
    const byOutcome = {} as Record<AuditOutcome, number>;
    const actorCounts = new Map<UserId, number>();

    for (const event of events) {
      byCategory[event.category] = (byCategory[event.category] ?? 0) + 1;
      bySeverity[event.severity] = (bySeverity[event.severity] ?? 0) + 1;
      byOutcome[event.outcome] = (byOutcome[event.outcome] ?? 0) + 1;
      actorCounts.set(event.actor.userId, (actorCounts.get(event.actor.userId) ?? 0) + 1);
    }

    const byActor = Array.from(actorCounts.entries())
      .map(([actorId, count]) => ({ actorId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];

    return {
      totalEvents: events.length,
      byCategory,
      bySeverity,
      byOutcome,
      byActor,
      timeRange: {
        start: firstEvent?.timestampMs ?? 0,
        end: lastEvent?.timestampMs ?? 0,
      },
    };
  }

  // ===========================================================================
  // Public API - Integrity
  // ===========================================================================

  /**
   * Verify the integrity of the audit chain
   */
  async verifyChain(): Promise<{ valid: boolean; invalidAt?: number; reason?: string }> {
    let previousHash = 'genesis';

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      if (!event) continue;

      // Check sequence
      if (event.sequence !== i + 1) {
        this.emit('chain:verified', { valid: false, lastSequence: i });
        return {
          valid: false,
          invalidAt: i,
          reason: `Sequence mismatch at index ${i}: expected ${i + 1}, got ${event.sequence}`,
        };
      }

      // Check previous hash
      if (event.previousHash !== previousHash) {
        this.emit('chain:verified', { valid: false, lastSequence: i });
        return {
          valid: false,
          invalidAt: i,
          reason: `Previous hash mismatch at index ${i}`,
        };
      }

      // Verify event hash
      const eventData = JSON.stringify({
        id: event.id,
        timestamp: event.timestamp,
        timestampMs: event.timestampMs,
        category: event.category,
        action: event.action,
        severity: event.severity,
        outcome: event.outcome,
        actor: event.actor,
        ...(event.target ? { target: event.target } : {}),
        ...(event.context ? { context: event.context } : {}),
        ...(event.details ? { details: event.details } : {}),
        sequence: event.sequence,
        previousHash: event.previousHash,
      });

      const expectedHash = await sha256Hex(eventData);
      if (event.hash !== expectedHash) {
        this.emit('chain:verified', { valid: false, lastSequence: i });
        return {
          valid: false,
          invalidAt: i,
          reason: `Hash mismatch at index ${i}`,
        };
      }

      previousHash = event.hash;
    }

    this.emit('chain:verified', { valid: true, lastSequence: this.events.length });
    return { valid: true };
  }

  // ===========================================================================
  // Public API - Export
  // ===========================================================================

  /**
   * Export events as JSON
   */
  exportJSON(options?: AuditQueryOptions): string {
    const events = options ? this.query(options) : this.events;
    return JSON.stringify(events, null, 2);
  }

  /**
   * Export events as CSV
   */
  exportCSV(options?: AuditQueryOptions): string {
    const events = options ? this.query(options) : this.events;

    const headers = [
      'id',
      'timestamp',
      'category',
      'action',
      'severity',
      'outcome',
      'actor_id',
      'actor_email',
      'target_type',
      'target_id',
      'document_id',
    ];

    const rows = events.map((e) => [
      e.id,
      e.timestamp,
      e.category,
      e.action,
      e.severity,
      e.outcome,
      e.actor.userId,
      e.actor.email ?? '',
      e.target?.type ?? '',
      e.target?.id ?? '',
      e.context?.documentId ?? '',
    ]);

    return [
      headers.join(','),
      ...rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Get total event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Destroy the logger
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flushInterval);
  }

  private enforceRetention(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    let removed = 0;

    // Also enforce max events
    while (this.events.length > 0) {
      const firstEvent = this.events[0];
      if (!firstEvent || (firstEvent.timestampMs >= cutoff && this.events.length <= this.config.maxEvents)) {
        break;
      }
      const event = this.events.shift()!;
      this.eventIndex.delete(event.id);
      removed++;
    }

    // Rebuild index after removal
    if (removed > 0) {
      this.eventIndex.clear();
      for (let i = 0; i < this.events.length; i++) {
        const evt = this.events[i];
        if (evt) {
          this.eventIndex.set(evt.id, i);
        }
      }
      this.emit('retention:cleaned', { removed });
    }
  }

  private generateEventId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private inferCategory(action: string): AuditCategory {
    const prefix = action.split('.')[0] ?? '';
    const categoryMap: Record<string, AuditCategory> = {
      auth: 'authentication',
      authz: 'authorization',
      access: 'access',
      mod: 'modification',
      share: 'sharing',
      export: 'export',
      admin: 'administration',
      sec: 'security',
      comp: 'compliance',
    };
    return categoryMap[prefix] ?? 'access';
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an audit logger instance
 */
export function createAuditLogger(config?: Partial<AuditLoggerConfig>): AuditLogger {
  return new AuditLogger(config);
}
