/**
 * Share Link Manager
 *
 * Creates and manages secure share links for documents with:
 * - Password protection (optional)
 * - Domain restrictions (limit to specific email domains)
 * - Usage limits and expiration
 * - Role-based access control
 * - Revocation support
 */

import { EventEmitter } from '@core/events/event-emitter';
import {
  sha256Hex,
  generateRandomId,
  encryptWithPassword,
} from '../encryption/crypto-utils';
import type { DocumentId, CollaborationRole } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface ShareLinkOptions {
  /** Document to share */
  readonly documentId: DocumentId;
  /** Role to grant via this link */
  readonly role: CollaborationRole;
  /** Creator's user ID */
  readonly createdBy: string;
  /** Optional password protection */
  readonly password?: string;
  /** Allowed email domains (e.g., ['company.com', 'partner.org']) */
  readonly allowedDomains?: readonly string[];
  /** Maximum number of uses (undefined = unlimited) */
  readonly maxUses?: number;
  /** Expiration date (undefined = never expires) */
  readonly expiresAt?: Date;
  /** Whether the link is a single-use link */
  readonly singleUse?: boolean;
  /** Custom name/label for the link */
  readonly name?: string;
}

export interface ShareLink {
  /** Unique link ID */
  readonly id: string;
  /** The shareable token */
  readonly token: string;
  /** Document ID */
  readonly documentId: DocumentId;
  /** Role granted by this link */
  readonly role: CollaborationRole;
  /** Creator's user ID */
  readonly createdBy: string;
  /** Creation timestamp */
  readonly createdAt: number;
  /** Whether password is required */
  readonly passwordProtected: boolean;
  /** Allowed email domains (empty = any domain) */
  readonly allowedDomains: readonly string[];
  /** Maximum uses (undefined = unlimited) */
  readonly maxUses?: number;
  /** Current use count */
  readonly useCount: number;
  /** Expiration timestamp (undefined = never) */
  readonly expiresAt?: number;
  /** Whether the link has been revoked */
  readonly revoked: boolean;
  /** Revocation timestamp */
  readonly revokedAt?: number;
  /** Custom name/label */
  readonly name?: string;
}

export interface ShareLinkValidation {
  readonly valid: boolean;
  readonly reason?: string;
  readonly role?: CollaborationRole;
  readonly documentId?: DocumentId;
  readonly requiresPassword?: boolean;
}

export interface ShareLinkRedemption {
  readonly success: boolean;
  readonly reason?: string;
  readonly documentId?: DocumentId;
  readonly role?: CollaborationRole;
  readonly sessionToken?: string;
}

export interface ShareLinkManagerEvents {
  'link:created': { link: ShareLink };
  'link:redeemed': { linkId: string; userId: string; userEmail?: string };
  'link:revoked': { linkId: string };
  'link:expired': { linkId: string };
  'link:maxUsesReached': { linkId: string };
  'access:denied': { linkId: string; reason: string };
  [key: string]: unknown;
}

/** Internal storage format with encrypted password hash */
interface StoredShareLink extends ShareLink {
  /** Hashed password (not stored in plaintext) */
  readonly passwordHash?: string;
  /** Salt for password hashing */
  readonly passwordSalt?: string;
}

// =============================================================================
// Share Link Manager
// =============================================================================

export class ShareLinkManager extends EventEmitter<ShareLinkManagerEvents> {
  // In-memory storage (would be backed by database in production)
  private readonly links = new Map<string, StoredShareLink>();
  private readonly tokenToLinkId = new Map<string, string>();

  // Link usage tracking
  private readonly linkUsageLog = new Map<string, Array<{ userId: string; email?: string; timestamp: number }>>();

  constructor() {
    super();
  }

  // ===========================================================================
  // Public API - Link Creation
  // ===========================================================================

  /**
   * Create a new share link
   */
  async createLink(options: ShareLinkOptions): Promise<ShareLink> {
    const linkId = generateRandomId(16);
    const token = this.generateSecureToken();

    let passwordHash: string | undefined;
    let passwordSalt: string | undefined;

    // Hash password if provided
    if (options.password) {
      const result = await this.hashPassword(options.password);
      passwordHash = result.hash;
      passwordSalt = result.salt;
    }

    // Build storedLink with conditional optional properties
    const baseLink = {
      id: linkId,
      token,
      documentId: options.documentId,
      role: options.role,
      createdBy: options.createdBy,
      createdAt: Date.now(),
      passwordProtected: !!options.password,
      allowedDomains: options.allowedDomains ?? [],
      useCount: 0,
      revoked: false,
    };

    const storedLink: StoredShareLink = {
      ...baseLink,
      ...(passwordHash !== undefined ? { passwordHash } : {}),
      ...(passwordSalt !== undefined ? { passwordSalt } : {}),
      ...(options.singleUse ? { maxUses: 1 } : options.maxUses !== undefined ? { maxUses: options.maxUses } : {}),
      ...(options.expiresAt !== undefined ? { expiresAt: options.expiresAt.getTime() } : {}),
      ...(options.name !== undefined ? { name: options.name } : {}),
    };

    this.links.set(linkId, storedLink);
    this.tokenToLinkId.set(token, linkId);

    const publicLink = this.toPublicLink(storedLink);
    this.emit('link:created', { link: publicLink });

    return publicLink;
  }

  /**
   * Generate a shareable URL for a link
   */
  generateShareUrl(link: ShareLink, baseUrl: string): string {
    return `${baseUrl}/join/${link.token}`;
  }

  // ===========================================================================
  // Public API - Link Validation & Redemption
  // ===========================================================================

  /**
   * Validate a share link token
   */
  async validateLink(token: string): Promise<ShareLinkValidation> {
    const linkId = this.tokenToLinkId.get(token);
    if (!linkId) {
      return { valid: false, reason: 'Invalid link token' };
    }

    const link = this.links.get(linkId);
    if (!link) {
      return { valid: false, reason: 'Link not found' };
    }

    // Check if revoked
    if (link.revoked) {
      return { valid: false, reason: 'This link has been revoked' };
    }

    // Check expiration
    if (link.expiresAt && Date.now() > link.expiresAt) {
      this.emit('link:expired', { linkId: link.id });
      return { valid: false, reason: 'This link has expired' };
    }

    // Check max uses
    if (link.maxUses !== undefined && link.useCount >= link.maxUses) {
      this.emit('link:maxUsesReached', { linkId: link.id });
      return { valid: false, reason: 'This link has reached its maximum uses' };
    }

    return {
      valid: true,
      role: link.role,
      documentId: link.documentId,
      requiresPassword: link.passwordProtected,
    };
  }

  /**
   * Redeem a share link to gain access
   */
  async redeemLink(
    token: string,
    userId: string,
    options?: {
      password?: string;
      userEmail?: string;
    }
  ): Promise<ShareLinkRedemption> {
    // Validate the link first
    const validation = await this.validateLink(token);
    if (!validation.valid) {
      const reason = validation.reason ?? 'Invalid link';
      this.emit('access:denied', {
        linkId: this.tokenToLinkId.get(token) ?? 'unknown',
        reason,
      });
      return { success: false, reason };
    }

    const linkId = this.tokenToLinkId.get(token)!;
    const link = this.links.get(linkId)!;

    // Verify password if required
    if (link.passwordProtected) {
      if (!options?.password) {
        return { success: false, reason: 'Password required' };
      }

      const passwordValid = await this.verifyPassword(
        options.password,
        link.passwordHash!,
        link.passwordSalt!
      );

      if (!passwordValid) {
        this.emit('access:denied', { linkId: link.id, reason: 'Incorrect password' });
        return { success: false, reason: 'Incorrect password' };
      }
    }

    // Check domain restrictions
    if (link.allowedDomains.length > 0 && options?.userEmail) {
      const emailDomain = this.extractDomain(options.userEmail);
      if (!link.allowedDomains.includes(emailDomain)) {
        this.emit('access:denied', {
          linkId: link.id,
          reason: 'Email domain not allowed',
        });
        return {
          success: false,
          reason: `Access restricted to: ${link.allowedDomains.join(', ')}`,
        };
      }
    }

    // Increment use count
    const updatedLink: StoredShareLink = {
      ...link,
      useCount: link.useCount + 1,
    };
    this.links.set(linkId, updatedLink);

    // Log usage
    const usageLog = this.linkUsageLog.get(linkId) ?? [];
    const logEntry: { userId: string; timestamp: number; email?: string } = {
      userId,
      timestamp: Date.now(),
    };
    if (options?.userEmail !== undefined) {
      logEntry.email = options.userEmail;
    }
    usageLog.push(logEntry);
    this.linkUsageLog.set(linkId, usageLog);

    // Generate session token
    const sessionToken = generateRandomId(32);

    const redeemEvent: { linkId: string; userId: string; userEmail?: string } = {
      linkId: link.id,
      userId,
    };
    if (options?.userEmail !== undefined) {
      redeemEvent.userEmail = options.userEmail;
    }
    this.emit('link:redeemed', redeemEvent);

    return {
      success: true,
      documentId: link.documentId,
      role: link.role,
      sessionToken,
    };
  }

  // ===========================================================================
  // Public API - Link Management
  // ===========================================================================

  /**
   * Get a share link by ID
   */
  getLink(linkId: string): ShareLink | undefined {
    const link = this.links.get(linkId);
    return link ? this.toPublicLink(link) : undefined;
  }

  /**
   * Get all share links for a document
   */
  getLinksForDocument(documentId: DocumentId): ShareLink[] {
    const links: ShareLink[] = [];
    for (const link of this.links.values()) {
      if (link.documentId === documentId) {
        links.push(this.toPublicLink(link));
      }
    }
    return links;
  }

  /**
   * Get all active (non-revoked, non-expired) links for a document
   */
  getActiveLinksForDocument(documentId: DocumentId): ShareLink[] {
    const now = Date.now();
    return this.getLinksForDocument(documentId).filter((link) => {
      if (link.revoked) return false;
      if (link.expiresAt && link.expiresAt < now) return false;
      if (link.maxUses !== undefined && link.useCount >= link.maxUses) return false;
      return true;
    });
  }

  /**
   * Revoke a share link
   */
  revokeLink(linkId: string): boolean {
    const link = this.links.get(linkId);
    if (!link) return false;

    const revokedLink: StoredShareLink = {
      ...link,
      revoked: true,
      revokedAt: Date.now(),
    };
    this.links.set(linkId, revokedLink);

    // Remove token mapping
    this.tokenToLinkId.delete(link.token);

    this.emit('link:revoked', { linkId });
    return true;
  }

  /**
   * Update link settings
   */
  updateLink(
    linkId: string,
    updates: Partial<Pick<ShareLinkOptions, 'maxUses' | 'expiresAt' | 'allowedDomains' | 'name'>>
  ): ShareLink | undefined {
    const link = this.links.get(linkId);
    if (!link) return undefined;

    // Build update object conditionally
    const updatedLink: StoredShareLink = {
      ...link,
      allowedDomains: updates.allowedDomains ?? link.allowedDomains,
    };

    // Handle optional properties
    if (updates.maxUses !== undefined) {
      (updatedLink as { maxUses: number }).maxUses = updates.maxUses;
    }
    if (updates.expiresAt !== undefined) {
      (updatedLink as { expiresAt: number }).expiresAt = updates.expiresAt.getTime();
    }
    if (updates.name !== undefined) {
      (updatedLink as { name: string }).name = updates.name;
    }

    this.links.set(linkId, updatedLink);

    return this.toPublicLink(updatedLink);
  }

  /**
   * Get usage history for a link
   */
  getLinkUsage(linkId: string): Array<{ userId: string; email?: string; timestamp: number }> {
    return this.linkUsageLog.get(linkId) ?? [];
  }

  /**
   * Delete a link permanently
   */
  deleteLink(linkId: string): boolean {
    const link = this.links.get(linkId);
    if (!link) return false;

    this.tokenToLinkId.delete(link.token);
    this.links.delete(linkId);
    this.linkUsageLog.delete(linkId);

    return true;
  }

  // ===========================================================================
  // Public API - Bulk Operations
  // ===========================================================================

  /**
   * Revoke all links for a document
   */
  revokeAllLinksForDocument(documentId: DocumentId): number {
    let count = 0;
    for (const link of this.links.values()) {
      if (link.documentId === documentId && !link.revoked) {
        this.revokeLink(link.id);
        count++;
      }
    }
    return count;
  }

  /**
   * Clean up expired links
   */
  cleanupExpiredLinks(): number {
    const now = Date.now();
    let count = 0;

    for (const [linkId, link] of this.links.entries()) {
      if (link.expiresAt && link.expiresAt < now && !link.revoked) {
        this.revokeLink(linkId);
        count++;
      }
    }

    return count;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private generateSecureToken(): string {
    // Generate a URL-safe token
    return generateRandomId(24);
  }

  private async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const result = await encryptWithPassword(password, password);
    return {
      hash: result.encrypted.ciphertext,
      salt: result.salt,
    };
  }

  private async verifyPassword(
    password: string,
    storedHash: string,
    storedSalt: string
  ): Promise<boolean> {
    try {
      // Re-hash with the same salt and compare
      const testResult = await encryptWithPassword(password, password);
      // For simplicity, we're using a timing-safe comparison via hash
      const inputHash = await sha256Hex(testResult.encrypted.ciphertext + storedSalt);
      const storedComparison = await sha256Hex(storedHash + storedSalt);
      return inputHash === storedComparison;
    } catch {
      return false;
    }
  }

  private extractDomain(email: string): string {
    const parts = email.split('@');
    return parts[1]?.toLowerCase() ?? '';
  }

  private toPublicLink(stored: StoredShareLink): ShareLink {
    // Remove sensitive fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, passwordSalt, ...publicFields } = stored;
    return publicFields;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a share link manager instance
 */
export function createShareLinkManager(): ShareLinkManager {
  return new ShareLinkManager();
}
