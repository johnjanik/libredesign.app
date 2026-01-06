/**
 * Elevation Manager
 *
 * Handles temporary permission elevation and emergency (break-glass) access:
 * - Time-limited permission grants
 * - MFA-gated elevation requests
 * - Emergency access with full audit trail
 * - Automatic expiration and cleanup
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';
import type { UserId, DocumentId, Permission, CollaborationRole } from '../types';

// =============================================================================
// Types
// =============================================================================

/** Elevation request status */
export type ElevationStatus =
  | 'pending'      // Awaiting approval
  | 'approved'     // Approved and active
  | 'denied'       // Denied by approver
  | 'expired'      // Time limit reached
  | 'revoked'      // Manually revoked
  | 'completed';   // Used and finished

/** Elevation type */
export type ElevationType =
  | 'temporary'    // Standard time-limited elevation
  | 'emergency'    // Break-glass emergency access
  | 'scheduled';   // Pre-approved scheduled access

/** MFA verification status */
export interface MfaVerification {
  readonly verified: boolean;
  readonly method: 'totp' | 'webauthn' | 'sms' | 'email';
  readonly verifiedAt: number;
  readonly expiresAt: number;
}

/** Elevation request */
export interface ElevationRequest {
  readonly id: string;
  readonly type: ElevationType;
  readonly requesterId: UserId;
  readonly requesterEmail?: string;
  /** Target document or element */
  readonly targetId: DocumentId | NodeId;
  readonly targetType: 'document' | 'element';
  /** Requested permissions */
  readonly permissions: readonly Permission[];
  /** Requested role (alternative to permissions) */
  readonly requestedRole?: CollaborationRole;
  /** Business justification */
  readonly justification: string;
  /** Ticket/issue reference */
  readonly ticketReference?: string;
  /** Request timestamp */
  readonly requestedAt: number;
  /** Desired duration in milliseconds */
  readonly requestedDuration: number;
  /** Status */
  status: ElevationStatus;
  /** Approver ID (if approved/denied) */
  approverId?: UserId;
  /** Approval/denial timestamp */
  processedAt?: number;
  /** Denial reason */
  denialReason?: string;
  /** When elevation starts (may be in future for scheduled) */
  startsAt?: number;
  /** When elevation expires */
  expiresAt?: number;
  /** MFA verification */
  mfaVerification?: MfaVerification;
}

/** Active elevation grant */
export interface ElevationGrant {
  readonly id: string;
  readonly requestId: string;
  readonly userId: UserId;
  readonly targetId: DocumentId | NodeId;
  readonly targetType: 'document' | 'element';
  readonly permissions: Set<Permission>;
  readonly elevatedRole?: CollaborationRole;
  readonly type: ElevationType;
  readonly grantedAt: number;
  readonly expiresAt: number;
  readonly grantedBy: UserId;
  readonly justification: string;
}

/** Emergency access record */
export interface EmergencyAccess {
  readonly id: string;
  readonly userId: UserId;
  readonly userEmail?: string;
  readonly targetId: DocumentId | NodeId;
  readonly targetType: 'document' | 'element';
  /** Incident reference */
  readonly incidentId?: string;
  /** Severity level */
  readonly severity: 'critical' | 'high' | 'medium';
  /** Reason for emergency access */
  readonly reason: string;
  /** Timestamp of access */
  readonly accessedAt: number;
  /** Auto-expires */
  readonly expiresAt: number;
  /** Actions taken during emergency access */
  readonly actionsLog: Array<{ action: string; timestamp: number }>;
  /** Was reviewed by security team */
  reviewed: boolean;
  reviewedBy?: UserId;
  reviewedAt?: number;
  reviewNotes?: string;
}

/** Elevation manager configuration */
export interface ElevationManagerConfig {
  /** Maximum temporary elevation duration (ms) */
  readonly maxTempDuration: number;
  /** Maximum emergency access duration (ms) */
  readonly maxEmergencyDuration: number;
  /** Require MFA for all elevations */
  readonly requireMfa: boolean;
  /** Require MFA for emergency access */
  readonly requireMfaForEmergency: boolean;
  /** Minimum approvers for emergency access */
  readonly emergencyApprovers: number;
  /** Cool-down period between elevation requests (ms) */
  readonly cooldownPeriod: number;
  /** Auto-cleanup interval (ms) */
  readonly cleanupInterval: number;
}

/** Elevation manager events */
export interface ElevationManagerEvents {
  'request:created': { request: ElevationRequest };
  'request:approved': { request: ElevationRequest; approverId: UserId };
  'request:denied': { request: ElevationRequest; approverId: UserId; reason: string };
  'grant:activated': { grant: ElevationGrant };
  'grant:expired': { grant: ElevationGrant };
  'grant:revoked': { grant: ElevationGrant; revokedBy: UserId };
  'emergency:accessed': { access: EmergencyAccess };
  'emergency:expired': { access: EmergencyAccess };
  'emergency:reviewed': { access: EmergencyAccess };
  'mfa:required': { requestId: string; userId: UserId };
  'mfa:verified': { requestId: string; userId: UserId };
  [key: string]: unknown;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: ElevationManagerConfig = {
  maxTempDuration: 4 * 60 * 60 * 1000, // 4 hours
  maxEmergencyDuration: 1 * 60 * 60 * 1000, // 1 hour
  requireMfa: true,
  requireMfaForEmergency: true,
  emergencyApprovers: 0, // 0 = self-approval for emergency
  cooldownPeriod: 15 * 60 * 1000, // 15 minutes
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
};

// =============================================================================
// Elevation Manager
// =============================================================================

export class ElevationManager extends EventEmitter<ElevationManagerEvents> {
  private readonly requests = new Map<string, ElevationRequest>();
  private readonly grants = new Map<string, ElevationGrant>();
  private readonly emergencyAccess = new Map<string, EmergencyAccess>();
  private readonly userLastRequest = new Map<UserId, number>();

  private readonly config: ElevationManagerConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<ElevationManagerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  // ===========================================================================
  // Public API - Elevation Requests
  // ===========================================================================

  /**
   * Request temporary permission elevation
   */
  requestElevation(options: {
    type: ElevationType;
    requesterId: UserId;
    requesterEmail?: string;
    targetId: DocumentId | NodeId;
    targetType: 'document' | 'element';
    permissions?: readonly Permission[];
    requestedRole?: CollaborationRole;
    justification: string;
    ticketReference?: string;
    durationMs: number;
    scheduledStart?: number;
  }): ElevationRequest | { error: string } {
    // Check cooldown
    const lastRequest = this.userLastRequest.get(options.requesterId);
    if (lastRequest && Date.now() - lastRequest < this.config.cooldownPeriod) {
      const waitTime = Math.ceil(
        (this.config.cooldownPeriod - (Date.now() - lastRequest)) / 1000 / 60
      );
      return { error: `Please wait ${waitTime} minutes before requesting another elevation` };
    }

    // Validate duration
    const maxDuration =
      options.type === 'emergency'
        ? this.config.maxEmergencyDuration
        : this.config.maxTempDuration;

    if (options.durationMs > maxDuration) {
      return {
        error: `Requested duration exceeds maximum of ${maxDuration / 60000} minutes`,
      };
    }

    // Create request
    const requestId = this.generateId();
    const now = Date.now();

    const request: ElevationRequest = {
      id: requestId,
      type: options.type,
      requesterId: options.requesterId,
      ...(options.requesterEmail ? { requesterEmail: options.requesterEmail } : {}),
      targetId: options.targetId,
      targetType: options.targetType,
      permissions: options.permissions ?? [],
      ...(options.requestedRole ? { requestedRole: options.requestedRole } : {}),
      justification: options.justification,
      ...(options.ticketReference ? { ticketReference: options.ticketReference } : {}),
      requestedAt: now,
      requestedDuration: options.durationMs,
      status: 'pending',
      ...(options.scheduledStart ? { startsAt: options.scheduledStart } : {}),
    };

    this.requests.set(requestId, request);
    this.userLastRequest.set(options.requesterId, now);
    this.emit('request:created', { request });

    // Check if MFA is required
    if (this.config.requireMfa) {
      this.emit('mfa:required', { requestId, userId: options.requesterId });
    }

    return request;
  }

  /**
   * Verify MFA for an elevation request
   */
  verifyMfa(
    requestId: string,
    verification: MfaVerification
  ): boolean {
    const request = this.requests.get(requestId);
    if (!request) return false;

    if (request.status !== 'pending') return false;

    // Update request with MFA verification
    const updated: ElevationRequest = {
      ...request,
      mfaVerification: verification,
    };
    this.requests.set(requestId, updated);

    this.emit('mfa:verified', { requestId, userId: request.requesterId });
    return true;
  }

  /**
   * Approve an elevation request
   */
  approveRequest(
    requestId: string,
    approverId: UserId
  ): ElevationGrant | { error: string } {
    const request = this.requests.get(requestId);
    if (!request) {
      return { error: 'Request not found' };
    }

    if (request.status !== 'pending') {
      return { error: `Request is ${request.status}, cannot approve` };
    }

    // Check MFA requirement
    if (this.config.requireMfa && !request.mfaVerification?.verified) {
      return { error: 'MFA verification required before approval' };
    }

    const now = Date.now();
    const startsAt = request.startsAt ?? now;
    const expiresAt = startsAt + request.requestedDuration;

    // Update request status
    const approvedRequest: ElevationRequest = {
      ...request,
      status: 'approved',
      approverId,
      processedAt: now,
      startsAt,
      expiresAt,
    };
    this.requests.set(requestId, approvedRequest);

    // Create grant
    const grant: ElevationGrant = {
      id: this.generateId(),
      requestId,
      userId: request.requesterId,
      targetId: request.targetId,
      targetType: request.targetType,
      permissions: new Set(request.permissions),
      ...(request.requestedRole ? { elevatedRole: request.requestedRole } : {}),
      type: request.type,
      grantedAt: now,
      expiresAt,
      grantedBy: approverId,
      justification: request.justification,
    };

    this.grants.set(grant.id, grant);
    this.emit('request:approved', { request: approvedRequest, approverId });
    this.emit('grant:activated', { grant });

    return grant;
  }

  /**
   * Deny an elevation request
   */
  denyRequest(
    requestId: string,
    approverId: UserId,
    reason: string
  ): boolean {
    const request = this.requests.get(requestId);
    if (!request) return false;

    if (request.status !== 'pending') return false;

    const deniedRequest: ElevationRequest = {
      ...request,
      status: 'denied',
      approverId,
      processedAt: Date.now(),
      denialReason: reason,
    };
    this.requests.set(requestId, deniedRequest);

    this.emit('request:denied', { request: deniedRequest, approverId, reason });
    return true;
  }

  /**
   * Revoke an active elevation grant
   */
  revokeGrant(grantId: string, revokedBy: UserId): boolean {
    const grant = this.grants.get(grantId);
    if (!grant) return false;

    this.grants.delete(grantId);

    // Update corresponding request
    const request = this.requests.get(grant.requestId);
    if (request) {
      const revokedRequest: ElevationRequest = {
        ...request,
        status: 'revoked',
      };
      this.requests.set(grant.requestId, revokedRequest);
    }

    this.emit('grant:revoked', { grant, revokedBy });
    return true;
  }

  // ===========================================================================
  // Public API - Emergency Access
  // ===========================================================================

  /**
   * Request emergency (break-glass) access
   *
   * Emergency access is typically self-approved but creates a full audit trail
   * and requires post-incident review.
   */
  requestEmergencyAccess(options: {
    userId: UserId;
    userEmail?: string;
    targetId: DocumentId | NodeId;
    targetType: 'document' | 'element';
    incidentId?: string;
    severity: 'critical' | 'high' | 'medium';
    reason: string;
    mfaVerification?: MfaVerification;
  }): EmergencyAccess | { error: string } {
    // Check MFA for emergency access
    if (this.config.requireMfaForEmergency && !options.mfaVerification?.verified) {
      return { error: 'MFA verification required for emergency access' };
    }

    const now = Date.now();
    const expiresAt = now + this.config.maxEmergencyDuration;

    const access: EmergencyAccess = {
      id: this.generateId(),
      userId: options.userId,
      ...(options.userEmail ? { userEmail: options.userEmail } : {}),
      targetId: options.targetId,
      targetType: options.targetType,
      ...(options.incidentId ? { incidentId: options.incidentId } : {}),
      severity: options.severity,
      reason: options.reason,
      accessedAt: now,
      expiresAt,
      actionsLog: [],
      reviewed: false,
    };

    this.emergencyAccess.set(access.id, access);
    this.emit('emergency:accessed', { access });

    return access;
  }

  /**
   * Log an action taken during emergency access
   */
  logEmergencyAction(accessId: string, action: string): boolean {
    const access = this.emergencyAccess.get(accessId);
    if (!access) return false;

    // Check if access has expired
    if (Date.now() > access.expiresAt) {
      return false;
    }

    access.actionsLog.push({ action, timestamp: Date.now() });
    return true;
  }

  /**
   * Mark emergency access as reviewed
   */
  reviewEmergencyAccess(
    accessId: string,
    reviewedBy: UserId,
    notes?: string
  ): boolean {
    const access = this.emergencyAccess.get(accessId);
    if (!access) return false;

    const reviewed: EmergencyAccess = {
      ...access,
      reviewed: true,
      reviewedBy,
      reviewedAt: Date.now(),
      ...(notes ? { reviewNotes: notes } : {}),
    };
    this.emergencyAccess.set(accessId, reviewed);

    this.emit('emergency:reviewed', { access: reviewed });
    return true;
  }

  /**
   * Get all pending review emergency accesses
   */
  getPendingReviews(): EmergencyAccess[] {
    return Array.from(this.emergencyAccess.values()).filter(
      (a) => !a.reviewed && Date.now() > a.expiresAt
    );
  }

  // ===========================================================================
  // Public API - Query
  // ===========================================================================

  /**
   * Get active grants for a user
   */
  getActiveGrants(userId: UserId): ElevationGrant[] {
    const now = Date.now();
    return Array.from(this.grants.values()).filter(
      (g) => g.userId === userId && g.expiresAt > now
    );
  }

  /**
   * Get active grants for a target
   */
  getGrantsForTarget(targetId: DocumentId | NodeId): ElevationGrant[] {
    const now = Date.now();
    return Array.from(this.grants.values()).filter(
      (g) => g.targetId === targetId && g.expiresAt > now
    );
  }

  /**
   * Check if user has elevated access to a target
   */
  hasElevatedAccess(
    userId: UserId,
    targetId: DocumentId | NodeId,
    permission?: Permission
  ): boolean {
    const now = Date.now();

    // Check elevation grants
    for (const grant of this.grants.values()) {
      if (
        grant.userId === userId &&
        grant.targetId === targetId &&
        grant.expiresAt > now
      ) {
        if (!permission || grant.permissions.has(permission)) {
          return true;
        }
      }
    }

    // Check emergency access
    for (const access of this.emergencyAccess.values()) {
      if (
        access.userId === userId &&
        access.targetId === targetId &&
        access.expiresAt > now
      ) {
        return true; // Emergency access grants all permissions
      }
    }

    return false;
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): ElevationRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.status === 'pending');
  }

  /**
   * Get request history for a user
   */
  getRequestHistory(userId: UserId): ElevationRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.requesterId === userId
    );
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clean up expired grants and emergency access
   */
  cleanup(): { expiredGrants: number; expiredEmergency: number } {
    const now = Date.now();
    let expiredGrants = 0;
    let expiredEmergency = 0;

    // Expire grants
    for (const [id, grant] of this.grants.entries()) {
      if (grant.expiresAt <= now) {
        this.grants.delete(id);
        expiredGrants++;
        this.emit('grant:expired', { grant });

        // Update request status
        const request = this.requests.get(grant.requestId);
        if (request && request.status === 'approved') {
          const expiredRequest: ElevationRequest = {
            ...request,
            status: 'expired',
          };
          this.requests.set(grant.requestId, expiredRequest);
        }
      }
    }

    // Expire emergency access
    for (const [_id, access] of this.emergencyAccess.entries()) {
      if (access.expiresAt <= now && !access.reviewed) {
        expiredEmergency++;
        this.emit('emergency:expired', { access });
        // Don't delete - keep for audit trail
      }
    }

    return { expiredGrants, expiredEmergency };
  }

  /**
   * Destroy the manager and stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private generateId(): string {
    return `elev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an elevation manager instance
 */
export function createElevationManager(
  config?: Partial<ElevationManagerConfig>
): ElevationManager {
  return new ElevationManager(config);
}
