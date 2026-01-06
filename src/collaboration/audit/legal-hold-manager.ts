/**
 * Legal Hold Manager
 *
 * Manages legal holds for e-discovery and litigation support:
 * - Hold placement and release
 * - Document preservation
 * - Custodian management
 * - Hold notifications
 * - Audit trail for all hold activities
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { UserId, DocumentId } from '../types';
import type { NodeId } from '@core/types/common';
import { AuditLogger, AuditActions } from './audit-logger';

// =============================================================================
// Types
// =============================================================================

/** Legal hold status */
export type LegalHoldStatus = 'active' | 'released' | 'expired' | 'pending_approval';

/** Hold scope */
export type HoldScope = 'full' | 'partial';

/** Legal matter information */
export interface LegalMatter {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly matterNumber?: string;
  readonly type: 'litigation' | 'investigation' | 'regulatory' | 'audit' | 'other';
  readonly createdAt: number;
  readonly createdBy: UserId;
  readonly status: 'active' | 'closed';
  readonly closedAt?: number;
  readonly closedBy?: UserId;
}

/** Custodian - person responsible for preserved data */
export interface Custodian {
  readonly id: string;
  readonly userId: UserId;
  readonly email?: string;
  readonly name: string;
  readonly department?: string;
  readonly holdIds: string[];
  readonly acknowledgedHolds: string[];
  readonly addedAt: number;
  readonly addedBy: UserId;
}

/** Legal hold */
export interface LegalHold {
  readonly id: string;
  readonly matterId: string;
  readonly name: string;
  readonly description?: string;
  readonly scope: HoldScope;
  readonly status: LegalHoldStatus;
  /** Documents under hold */
  readonly documentIds: readonly DocumentId[];
  /** Specific elements under hold (for partial scope) */
  readonly elementIds?: readonly NodeId[];
  /** Users whose data is under hold */
  readonly custodianIds: readonly string[];
  /** Keywords for identifying relevant content */
  readonly keywords?: readonly string[];
  /** Date range for relevant content */
  readonly dateRange?: {
    readonly start: number;
    readonly end: number;
  };
  /** When hold was created */
  readonly createdAt: number;
  readonly createdBy: UserId;
  /** When hold becomes effective */
  readonly effectiveFrom: number;
  /** When hold expires (if applicable) */
  readonly expiresAt?: number;
  /** When hold was released */
  readonly releasedAt?: number;
  readonly releasedBy?: UserId;
  readonly releaseReason?: string;
  /** Approval information */
  readonly approvedAt?: number;
  readonly approvedBy?: UserId;
  /** Notification tracking */
  readonly notificationsSent: number;
  readonly lastNotificationAt?: number;
}

/** Hold notification */
export interface HoldNotification {
  readonly id: string;
  readonly holdId: string;
  readonly custodianId: string;
  readonly type: 'initial' | 'reminder' | 'release' | 'update';
  readonly sentAt: number;
  readonly acknowledged: boolean;
  readonly acknowledgedAt?: number;
}

/** Preserved item */
export interface PreservedItem {
  readonly id: string;
  readonly holdId: string;
  readonly documentId: DocumentId;
  readonly elementId?: NodeId;
  readonly preservedAt: number;
  readonly snapshot: string; // JSON snapshot of the item
  readonly metadata: {
    readonly name?: string;
    readonly type?: string;
    readonly size?: number;
    readonly createdAt?: number;
    readonly modifiedAt?: number;
    readonly createdBy?: UserId;
    readonly modifiedBy?: UserId;
  };
}

/** E-discovery export */
export interface DiscoveryExport {
  readonly id: string;
  readonly matterId: string;
  readonly holdIds: readonly string[];
  readonly exportedAt: number;
  readonly exportedBy: UserId;
  readonly format: 'native' | 'pdf' | 'tiff' | 'json';
  readonly itemCount: number;
  readonly totalSize: number;
  readonly checksum: string;
  readonly metadata: {
    readonly startDate?: number;
    readonly endDate?: number;
    readonly keywords?: readonly string[];
    readonly custodianIds?: readonly string[];
  };
}

/** Legal hold manager events */
export interface LegalHoldManagerEvents {
  'matter:created': { matter: LegalMatter };
  'matter:closed': { matter: LegalMatter };
  'hold:created': { hold: LegalHold };
  'hold:approved': { hold: LegalHold };
  'hold:released': { hold: LegalHold };
  'hold:expired': { hold: LegalHold };
  'custodian:added': { custodian: Custodian; holdId: string };
  'custodian:removed': { custodianId: string; holdId: string };
  'notification:sent': { notification: HoldNotification };
  'notification:acknowledged': { notification: HoldNotification };
  'item:preserved': { item: PreservedItem };
  'export:created': { export: DiscoveryExport };
  'deletion:blocked': { documentId: DocumentId; holdId: string };
  [key: string]: unknown;
}

/** Legal hold manager configuration */
export interface LegalHoldManagerConfig {
  /** Require approval for new holds */
  readonly requireApproval: boolean;
  /** Auto-send reminder notifications (days) */
  readonly reminderIntervalDays: number;
  /** Max custodians per hold */
  readonly maxCustodiansPerHold: number;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: LegalHoldManagerConfig = {
  requireApproval: true,
  reminderIntervalDays: 30,
  maxCustodiansPerHold: 1000,
};

// =============================================================================
// Legal Hold Manager
// =============================================================================

export class LegalHoldManager extends EventEmitter<LegalHoldManagerEvents> {
  private readonly matters = new Map<string, LegalMatter>();
  private readonly holds = new Map<string, LegalHold>();
  private readonly custodians = new Map<string, Custodian>();
  private readonly notifications = new Map<string, HoldNotification>();
  private readonly preservedItems = new Map<string, PreservedItem>();
  private readonly exports = new Map<string, DiscoveryExport>();

  private readonly config: LegalHoldManagerConfig;
  private readonly auditLogger: AuditLogger;

  constructor(auditLogger: AuditLogger, config?: Partial<LegalHoldManagerConfig>) {
    super();
    this.auditLogger = auditLogger;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // Public API - Legal Matters
  // ===========================================================================

  /**
   * Create a new legal matter
   */
  createMatter(options: {
    name: string;
    description?: string;
    matterNumber?: string;
    type: LegalMatter['type'];
    createdBy: UserId;
  }): LegalMatter {
    const matter: LegalMatter = {
      id: this.generateId('matter'),
      name: options.name,
      ...(options.description ? { description: options.description } : {}),
      ...(options.matterNumber ? { matterNumber: options.matterNumber } : {}),
      type: options.type,
      createdAt: Date.now(),
      createdBy: options.createdBy,
      status: 'active',
    };

    this.matters.set(matter.id, matter);
    this.emit('matter:created', { matter });

    this.auditLogger.logAction(AuditActions.COMP_LEGAL_HOLD_SET, {
      userId: options.createdBy,
    }, 'success', {
      category: 'compliance',
      details: { matterId: matter.id, matterName: matter.name },
    });

    return matter;
  }

  /**
   * Close a legal matter
   */
  closeMatter(matterId: string, closedBy: UserId): boolean {
    const matter = this.matters.get(matterId);
    if (!matter) return false;

    // Check if any holds are still active
    const activeHolds = Array.from(this.holds.values()).filter(
      (h) => h.matterId === matterId && h.status === 'active'
    );

    if (activeHolds.length > 0) {
      return false; // Cannot close matter with active holds
    }

    const closedMatter: LegalMatter = {
      ...matter,
      status: 'closed',
      closedAt: Date.now(),
      closedBy,
    };

    this.matters.set(matterId, closedMatter);
    this.emit('matter:closed', { matter: closedMatter });

    return true;
  }

  /**
   * Get a matter by ID
   */
  getMatter(matterId: string): LegalMatter | undefined {
    return this.matters.get(matterId);
  }

  /**
   * Get all active matters
   */
  getActiveMatters(): LegalMatter[] {
    return Array.from(this.matters.values()).filter((m) => m.status === 'active');
  }

  // ===========================================================================
  // Public API - Legal Holds
  // ===========================================================================

  /**
   * Create a new legal hold
   */
  createHold(options: {
    matterId: string;
    name: string;
    description?: string;
    scope: HoldScope;
    documentIds: readonly DocumentId[];
    elementIds?: readonly NodeId[];
    keywords?: readonly string[];
    dateRange?: { start: number; end: number };
    expiresAt?: number;
    createdBy: UserId;
  }): LegalHold | { error: string } {
    const matter = this.matters.get(options.matterId);
    if (!matter) {
      return { error: 'Legal matter not found' };
    }

    if (matter.status !== 'active') {
      return { error: 'Cannot create hold on closed matter' };
    }

    const now = Date.now();
    const hold: LegalHold = {
      id: this.generateId('hold'),
      matterId: options.matterId,
      name: options.name,
      ...(options.description ? { description: options.description } : {}),
      scope: options.scope,
      status: this.config.requireApproval ? 'pending_approval' : 'active',
      documentIds: options.documentIds,
      ...(options.elementIds ? { elementIds: options.elementIds } : {}),
      custodianIds: [],
      ...(options.keywords ? { keywords: options.keywords } : {}),
      ...(options.dateRange ? { dateRange: options.dateRange } : {}),
      createdAt: now,
      createdBy: options.createdBy,
      effectiveFrom: now,
      ...(options.expiresAt ? { expiresAt: options.expiresAt } : {}),
      notificationsSent: 0,
    };

    this.holds.set(hold.id, hold);
    this.emit('hold:created', { hold });

    this.auditLogger.logAction(AuditActions.COMP_LEGAL_HOLD_SET, {
      userId: options.createdBy,
    }, 'success', {
      category: 'compliance',
      details: {
        holdId: hold.id,
        holdName: hold.name,
        matterId: options.matterId,
        documentCount: options.documentIds.length,
      },
    });

    return hold;
  }

  /**
   * Approve a pending hold
   */
  approveHold(holdId: string, approvedBy: UserId): boolean {
    const hold = this.holds.get(holdId);
    if (!hold) return false;

    if (hold.status !== 'pending_approval') return false;

    const approvedHold: LegalHold = {
      ...hold,
      status: 'active',
      approvedAt: Date.now(),
      approvedBy,
    };

    this.holds.set(holdId, approvedHold);
    this.emit('hold:approved', { hold: approvedHold });

    return true;
  }

  /**
   * Release a legal hold
   */
  releaseHold(holdId: string, releasedBy: UserId, reason: string): boolean {
    const hold = this.holds.get(holdId);
    if (!hold) return false;

    if (hold.status !== 'active') return false;

    const releasedHold: LegalHold = {
      ...hold,
      status: 'released',
      releasedAt: Date.now(),
      releasedBy,
      releaseReason: reason,
    };

    this.holds.set(holdId, releasedHold);
    this.emit('hold:released', { hold: releasedHold });

    this.auditLogger.logAction(AuditActions.COMP_LEGAL_HOLD_RELEASED, {
      userId: releasedBy,
    }, 'success', {
      category: 'compliance',
      details: {
        holdId,
        reason,
      },
    });

    // Notify custodians of release
    for (const custodianId of hold.custodianIds) {
      this.sendNotification(holdId, custodianId, 'release');
    }

    return true;
  }

  /**
   * Get a hold by ID
   */
  getHold(holdId: string): LegalHold | undefined {
    return this.holds.get(holdId);
  }

  /**
   * Get all holds for a matter
   */
  getHoldsForMatter(matterId: string): LegalHold[] {
    return Array.from(this.holds.values()).filter((h) => h.matterId === matterId);
  }

  /**
   * Get all active holds
   */
  getActiveHolds(): LegalHold[] {
    return Array.from(this.holds.values()).filter((h) => h.status === 'active');
  }

  /**
   * Check if a document is under legal hold
   */
  isDocumentUnderHold(documentId: DocumentId): boolean {
    for (const hold of this.holds.values()) {
      if (hold.status === 'active' && hold.documentIds.includes(documentId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all holds affecting a document
   */
  getHoldsForDocument(documentId: DocumentId): LegalHold[] {
    return Array.from(this.holds.values()).filter(
      (h) => h.status === 'active' && h.documentIds.includes(documentId)
    );
  }

  /**
   * Block deletion if document is under hold
   */
  canDeleteDocument(documentId: DocumentId): { allowed: boolean; holdId?: string } {
    for (const hold of this.holds.values()) {
      if (hold.status === 'active' && hold.documentIds.includes(documentId)) {
        this.emit('deletion:blocked', { documentId, holdId: hold.id });
        return { allowed: false, holdId: hold.id };
      }
    }
    return { allowed: true };
  }

  // ===========================================================================
  // Public API - Custodians
  // ===========================================================================

  /**
   * Add a custodian
   */
  addCustodian(options: {
    userId: UserId;
    email?: string;
    name: string;
    department?: string;
    addedBy: UserId;
  }): Custodian {
    const existing = Array.from(this.custodians.values()).find(
      (c) => c.userId === options.userId
    );

    if (existing) {
      return existing;
    }

    const custodian: Custodian = {
      id: this.generateId('custodian'),
      userId: options.userId,
      ...(options.email ? { email: options.email } : {}),
      name: options.name,
      ...(options.department ? { department: options.department } : {}),
      holdIds: [],
      acknowledgedHolds: [],
      addedAt: Date.now(),
      addedBy: options.addedBy,
    };

    this.custodians.set(custodian.id, custodian);
    return custodian;
  }

  /**
   * Add custodian to a hold
   */
  addCustodianToHold(
    holdId: string,
    custodianId: string,
    sendNotification = true
  ): boolean {
    const hold = this.holds.get(holdId);
    const custodian = this.custodians.get(custodianId);

    if (!hold || !custodian) return false;
    if (hold.status !== 'active') return false;
    if (hold.custodianIds.length >= this.config.maxCustodiansPerHold) return false;

    // Update hold
    const updatedHold: LegalHold = {
      ...hold,
      custodianIds: [...hold.custodianIds, custodianId],
    };
    this.holds.set(holdId, updatedHold);

    // Update custodian
    const updatedCustodian: Custodian = {
      ...custodian,
      holdIds: [...custodian.holdIds, holdId],
    };
    this.custodians.set(custodianId, updatedCustodian);

    this.emit('custodian:added', { custodian: updatedCustodian, holdId });

    if (sendNotification) {
      this.sendNotification(holdId, custodianId, 'initial');
    }

    return true;
  }

  /**
   * Remove custodian from a hold
   */
  removeCustodianFromHold(holdId: string, custodianId: string): boolean {
    const hold = this.holds.get(holdId);
    const custodian = this.custodians.get(custodianId);

    if (!hold || !custodian) return false;

    // Update hold
    const updatedHold: LegalHold = {
      ...hold,
      custodianIds: hold.custodianIds.filter((id) => id !== custodianId),
    };
    this.holds.set(holdId, updatedHold);

    // Update custodian
    const updatedCustodian: Custodian = {
      ...custodian,
      holdIds: custodian.holdIds.filter((id) => id !== holdId),
    };
    this.custodians.set(custodianId, updatedCustodian);

    this.emit('custodian:removed', { custodianId, holdId });
    return true;
  }

  /**
   * Get custodians for a hold
   */
  getCustodiansForHold(holdId: string): Custodian[] {
    const hold = this.holds.get(holdId);
    if (!hold) return [];

    return hold.custodianIds
      .map((id) => this.custodians.get(id))
      .filter((c): c is Custodian => c !== undefined);
  }

  // ===========================================================================
  // Public API - Notifications
  // ===========================================================================

  /**
   * Send a hold notification
   */
  sendNotification(
    holdId: string,
    custodianId: string,
    type: HoldNotification['type']
  ): HoldNotification | null {
    const hold = this.holds.get(holdId);
    const custodian = this.custodians.get(custodianId);

    if (!hold || !custodian) return null;

    const notification: HoldNotification = {
      id: this.generateId('notif'),
      holdId,
      custodianId,
      type,
      sentAt: Date.now(),
      acknowledged: false,
    };

    this.notifications.set(notification.id, notification);

    // Update hold notification count
    const updatedHold: LegalHold = {
      ...hold,
      notificationsSent: hold.notificationsSent + 1,
      lastNotificationAt: notification.sentAt,
    };
    this.holds.set(holdId, updatedHold);

    this.emit('notification:sent', { notification });
    return notification;
  }

  /**
   * Acknowledge a notification
   */
  acknowledgeNotification(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    const acknowledged: HoldNotification = {
      ...notification,
      acknowledged: true,
      acknowledgedAt: Date.now(),
    };
    this.notifications.set(notificationId, acknowledged);

    // Update custodian acknowledged holds
    const custodian = this.custodians.get(notification.custodianId);
    if (custodian && !custodian.acknowledgedHolds.includes(notification.holdId)) {
      const updatedCustodian: Custodian = {
        ...custodian,
        acknowledgedHolds: [...custodian.acknowledgedHolds, notification.holdId],
      };
      this.custodians.set(custodian.id, updatedCustodian);
    }

    this.emit('notification:acknowledged', { notification: acknowledged });
    return true;
  }

  /**
   * Get pending acknowledgments for a custodian
   */
  getPendingAcknowledgments(custodianId: string): HoldNotification[] {
    return Array.from(this.notifications.values()).filter(
      (n) => n.custodianId === custodianId && !n.acknowledged
    );
  }

  // ===========================================================================
  // Public API - Preservation
  // ===========================================================================

  /**
   * Preserve an item snapshot
   */
  preserveItem(options: {
    holdId: string;
    documentId: DocumentId;
    elementId?: NodeId;
    snapshot: string;
    metadata: PreservedItem['metadata'];
  }): PreservedItem | null {
    const hold = this.holds.get(options.holdId);
    if (!hold || hold.status !== 'active') return null;

    const item: PreservedItem = {
      id: this.generateId('preserved'),
      holdId: options.holdId,
      documentId: options.documentId,
      ...(options.elementId ? { elementId: options.elementId } : {}),
      preservedAt: Date.now(),
      snapshot: options.snapshot,
      metadata: options.metadata,
    };

    this.preservedItems.set(item.id, item);
    this.emit('item:preserved', { item });

    return item;
  }

  /**
   * Get preserved items for a hold
   */
  getPreservedItems(holdId: string): PreservedItem[] {
    return Array.from(this.preservedItems.values()).filter((i) => i.holdId === holdId);
  }

  // ===========================================================================
  // Public API - E-Discovery Export
  // ===========================================================================

  /**
   * Create an e-discovery export
   */
  createExport(options: {
    matterId: string;
    holdIds: readonly string[];
    format: DiscoveryExport['format'];
    exportedBy: UserId;
    metadata?: DiscoveryExport['metadata'];
  }): DiscoveryExport {
    // Gather all preserved items for the holds
    const items: PreservedItem[] = [];
    for (const holdId of options.holdIds) {
      items.push(...this.getPreservedItems(holdId));
    }

    const totalSize = items.reduce(
      (sum, item) => sum + (item.metadata.size ?? item.snapshot.length),
      0
    );

    const exportRecord: DiscoveryExport = {
      id: this.generateId('export'),
      matterId: options.matterId,
      holdIds: options.holdIds,
      exportedAt: Date.now(),
      exportedBy: options.exportedBy,
      format: options.format,
      itemCount: items.length,
      totalSize,
      checksum: this.calculateChecksum(items),
      metadata: options.metadata ?? {},
    };

    this.exports.set(exportRecord.id, exportRecord);
    this.emit('export:created', { export: exportRecord });

    this.auditLogger.logAction(AuditActions.COMP_DATA_EXPORT, {
      userId: options.exportedBy,
    }, 'success', {
      category: 'compliance',
      details: {
        exportId: exportRecord.id,
        matterId: options.matterId,
        itemCount: items.length,
        format: options.format,
      },
    });

    return exportRecord;
  }

  /**
   * Get exports for a matter
   */
  getExportsForMatter(matterId: string): DiscoveryExport[] {
    return Array.from(this.exports.values()).filter((e) => e.matterId === matterId);
  }

  // ===========================================================================
  // Public API - Maintenance
  // ===========================================================================

  /**
   * Check and expire holds
   */
  checkExpiredHolds(): number {
    const now = Date.now();
    let expired = 0;

    for (const [id, hold] of this.holds.entries()) {
      if (hold.status === 'active' && hold.expiresAt && hold.expiresAt <= now) {
        const expiredHold: LegalHold = {
          ...hold,
          status: 'expired',
        };
        this.holds.set(id, expiredHold);
        this.emit('hold:expired', { hold: expiredHold });
        expired++;
      }
    }

    return expired;
  }

  /**
   * Send reminder notifications for holds
   */
  sendReminderNotifications(): number {
    const now = Date.now();
    const reminderThreshold = this.config.reminderIntervalDays * 24 * 60 * 60 * 1000;
    let sent = 0;

    for (const hold of this.holds.values()) {
      if (hold.status !== 'active') continue;

      const lastNotification = hold.lastNotificationAt ?? hold.createdAt;
      if (now - lastNotification >= reminderThreshold) {
        for (const custodianId of hold.custodianIds) {
          this.sendNotification(hold.id, custodianId, 'reminder');
          sent++;
        }
      }
    }

    return sent;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateChecksum(items: PreservedItem[]): string {
    // Simple checksum for demo - in production use SHA-256
    const data = items.map((i) => i.snapshot).join('');
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a legal hold manager instance
 */
export function createLegalHoldManager(
  auditLogger: AuditLogger,
  config?: Partial<LegalHoldManagerConfig>
): LegalHoldManager {
  return new LegalHoldManager(auditLogger, config);
}
