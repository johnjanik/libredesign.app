/**
 * Element-Level Permissions
 *
 * Granular permission control at the element level with:
 * - Permission inheritance from parent elements
 * - Override support for specific elements
 * - Permission propagation to children
 * - Efficient permission resolution with caching
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';
import type { UserId, Permission, CollaborationRole } from '../types';

// =============================================================================
// Types
// =============================================================================

/** Element permission entry */
export interface ElementPermission {
  /** The element this permission applies to */
  readonly elementId: NodeId;
  /** User or role this permission applies to */
  readonly principalId: UserId | CollaborationRole;
  /** Type of principal */
  readonly principalType: 'user' | 'role';
  /** The permission being granted/denied */
  readonly permission: Permission;
  /** Whether this is a grant or denial */
  readonly effect: 'grant' | 'deny';
  /** Whether this permission propagates to children */
  readonly inheritable: boolean;
  /** When this permission was set */
  readonly setAt: number;
  /** Who set this permission */
  readonly setBy: UserId;
  /** Optional expiration */
  readonly expiresAt?: number;
}

/** Resolved permission state for an element */
export interface ResolvedPermissions {
  readonly elementId: NodeId;
  /** Granted permissions */
  readonly grants: Set<Permission>;
  /** Denied permissions */
  readonly denials: Set<Permission>;
  /** Inherited permissions (from parent) */
  readonly inherited: Set<Permission>;
  /** Explicitly set permissions (on this element) */
  readonly explicit: Set<Permission>;
}

/** Permission inheritance mode */
export type InheritanceMode =
  | 'inherit'       // Inherit from parent (default)
  | 'override'      // Ignore parent, use only explicit
  | 'additive'      // Add to parent permissions
  | 'restrictive';  // Intersect with parent permissions

/** Element permission configuration */
export interface ElementPermissionConfig {
  readonly elementId: NodeId;
  readonly inheritanceMode: InheritanceMode;
  /** If true, this element's permissions do NOT propagate to children */
  readonly blockInheritance: boolean;
}

/** Events emitted by the permission manager */
export interface ElementPermissionEvents {
  'permission:granted': { elementId: NodeId; permission: ElementPermission };
  'permission:revoked': { elementId: NodeId; principalId: string; permission: Permission };
  'permission:expired': { elementId: NodeId; permission: ElementPermission };
  'inheritance:changed': { elementId: NodeId; mode: InheritanceMode };
  [key: string]: unknown;
}

/** Options for the element permission manager */
export interface ElementPermissionManagerOptions {
  /** Function to get parent element ID */
  readonly getParentId: (elementId: NodeId) => NodeId | null;
  /** Function to get children element IDs */
  readonly getChildrenIds: (elementId: NodeId) => NodeId[];
  /** Cache TTL in milliseconds */
  readonly cacheTtl?: number;
}

// =============================================================================
// Element Permission Manager
// =============================================================================

export class ElementPermissionManager extends EventEmitter<ElementPermissionEvents> {
  private readonly permissions = new Map<string, ElementPermission>();
  private readonly elementConfigs = new Map<NodeId, ElementPermissionConfig>();
  private readonly resolvedCache = new Map<string, { resolved: ResolvedPermissions; expiresAt: number }>();

  private readonly getParentId: (elementId: NodeId) => NodeId | null;
  private readonly getChildrenIds: (elementId: NodeId) => NodeId[];
  private readonly cacheTtl: number;

  constructor(options: ElementPermissionManagerOptions) {
    super();
    this.getParentId = options.getParentId;
    this.getChildrenIds = options.getChildrenIds;
    this.cacheTtl = options.cacheTtl ?? 30000; // 30 seconds default
  }

  // ===========================================================================
  // Public API - Permission Management
  // ===========================================================================

  /**
   * Grant a permission on an element
   */
  grantPermission(
    elementId: NodeId,
    principalId: UserId | CollaborationRole,
    principalType: 'user' | 'role',
    permission: Permission,
    options?: {
      inheritable?: boolean;
      setBy: UserId;
      expiresAt?: number;
    }
  ): void {
    const key = this.getPermissionKey(elementId, principalId, permission);

    const entry: ElementPermission = {
      elementId,
      principalId,
      principalType,
      permission,
      effect: 'grant',
      inheritable: options?.inheritable ?? true,
      setAt: Date.now(),
      setBy: options?.setBy ?? 'system',
      ...(options?.expiresAt !== undefined ? { expiresAt: options.expiresAt } : {}),
    };

    this.permissions.set(key, entry);
    this.invalidateCache(elementId);
    this.emit('permission:granted', { elementId, permission: entry });
  }

  /**
   * Deny a permission on an element
   */
  denyPermission(
    elementId: NodeId,
    principalId: UserId | CollaborationRole,
    principalType: 'user' | 'role',
    permission: Permission,
    options?: {
      inheritable?: boolean;
      setBy: UserId;
      expiresAt?: number;
    }
  ): void {
    const key = this.getPermissionKey(elementId, principalId, permission);

    const entry: ElementPermission = {
      elementId,
      principalId,
      principalType,
      permission,
      effect: 'deny',
      inheritable: options?.inheritable ?? true,
      setAt: Date.now(),
      setBy: options?.setBy ?? 'system',
      ...(options?.expiresAt !== undefined ? { expiresAt: options.expiresAt } : {}),
    };

    this.permissions.set(key, entry);
    this.invalidateCache(elementId);
    this.emit('permission:granted', { elementId, permission: entry });
  }

  /**
   * Revoke a permission (remove grant or denial)
   */
  revokePermission(
    elementId: NodeId,
    principalId: UserId | CollaborationRole,
    permission: Permission
  ): boolean {
    const key = this.getPermissionKey(elementId, principalId, permission);
    const removed = this.permissions.delete(key);

    if (removed) {
      this.invalidateCache(elementId);
      this.emit('permission:revoked', { elementId, principalId, permission });
    }

    return removed;
  }

  /**
   * Get all permissions for an element
   */
  getElementPermissions(elementId: NodeId): ElementPermission[] {
    const result: ElementPermission[] = [];

    for (const perm of this.permissions.values()) {
      if (perm.elementId === elementId) {
        // Check expiration
        if (perm.expiresAt && Date.now() > perm.expiresAt) {
          this.handleExpiredPermission(perm);
          continue;
        }
        result.push(perm);
      }
    }

    return result;
  }

  /**
   * Get all permissions for a principal across all elements
   */
  getPrincipalPermissions(principalId: UserId | CollaborationRole): ElementPermission[] {
    const result: ElementPermission[] = [];

    for (const perm of this.permissions.values()) {
      if (perm.principalId === principalId) {
        // Check expiration
        if (perm.expiresAt && Date.now() > perm.expiresAt) {
          this.handleExpiredPermission(perm);
          continue;
        }
        result.push(perm);
      }
    }

    return result;
  }

  // ===========================================================================
  // Public API - Permission Resolution
  // ===========================================================================

  /**
   * Resolve all effective permissions for a user on an element
   */
  resolvePermissions(
    elementId: NodeId,
    userId: UserId,
    userRole: CollaborationRole
  ): ResolvedPermissions {
    // Check cache
    const cacheKey = `${elementId}:${userId}:${userRole}`;
    const cached = this.resolvedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.resolved;
    }

    const grants = new Set<Permission>();
    const denials = new Set<Permission>();
    const inherited = new Set<Permission>();
    const explicit = new Set<Permission>();

    // Get explicit permissions on this element
    const explicitPerms = this.getElementPermissions(elementId);
    for (const perm of explicitPerms) {
      if (this.permissionAppliesToPrincipal(perm, userId, userRole)) {
        explicit.add(perm.permission);
        if (perm.effect === 'grant') {
          grants.add(perm.permission);
        } else {
          denials.add(perm.permission);
        }
      }
    }

    // Get inherited permissions
    const config = this.elementConfigs.get(elementId);
    const inheritanceMode = config?.inheritanceMode ?? 'inherit';

    if (inheritanceMode !== 'override') {
      const inheritedPerms = this.getInheritedPermissions(elementId, userId, userRole);
      for (const perm of inheritedPerms) {
        inherited.add(perm.permission);

        // Apply based on inheritance mode
        if (inheritanceMode === 'inherit') {
          // Explicit overrides inherited
          if (!explicit.has(perm.permission)) {
            if (perm.effect === 'grant') {
              grants.add(perm.permission);
            } else {
              denials.add(perm.permission);
            }
          }
        } else if (inheritanceMode === 'additive') {
          // Add inherited grants, explicit denials override
          if (perm.effect === 'grant' && !denials.has(perm.permission)) {
            grants.add(perm.permission);
          }
        } else if (inheritanceMode === 'restrictive') {
          // Only keep permissions that exist in both
          if (perm.effect === 'grant' && grants.has(perm.permission)) {
            // Keep it
          } else if (perm.effect === 'deny') {
            denials.add(perm.permission);
            grants.delete(perm.permission);
          }
        }
      }
    }

    const resolved: ResolvedPermissions = {
      elementId,
      grants,
      denials,
      inherited,
      explicit,
    };

    // Cache the result
    this.resolvedCache.set(cacheKey, {
      resolved,
      expiresAt: Date.now() + this.cacheTtl,
    });

    return resolved;
  }

  /**
   * Check if a user has a specific permission on an element
   */
  hasPermission(
    elementId: NodeId,
    userId: UserId,
    userRole: CollaborationRole,
    permission: Permission
  ): boolean {
    const resolved = this.resolvePermissions(elementId, userId, userRole);

    // Denials take precedence
    if (resolved.denials.has(permission)) {
      return false;
    }

    return resolved.grants.has(permission);
  }

  /**
   * Check if a user can edit an element
   */
  canEdit(elementId: NodeId, userId: UserId, userRole: CollaborationRole): boolean {
    return this.hasPermission(elementId, userId, userRole, 'edit');
  }

  // ===========================================================================
  // Public API - Inheritance Configuration
  // ===========================================================================

  /**
   * Set inheritance mode for an element
   */
  setInheritanceMode(elementId: NodeId, mode: InheritanceMode): void {
    const existing = this.elementConfigs.get(elementId);
    this.elementConfigs.set(elementId, {
      elementId,
      inheritanceMode: mode,
      blockInheritance: existing?.blockInheritance ?? false,
    });
    this.invalidateCache(elementId);
    this.emit('inheritance:changed', { elementId, mode });
  }

  /**
   * Set whether an element blocks inheritance to children
   */
  setBlockInheritance(elementId: NodeId, block: boolean): void {
    const existing = this.elementConfigs.get(elementId);
    this.elementConfigs.set(elementId, {
      elementId,
      inheritanceMode: existing?.inheritanceMode ?? 'inherit',
      blockInheritance: block,
    });
    this.invalidateCacheForChildren(elementId);
  }

  /**
   * Get inheritance mode for an element
   */
  getInheritanceMode(elementId: NodeId): InheritanceMode {
    return this.elementConfigs.get(elementId)?.inheritanceMode ?? 'inherit';
  }

  // ===========================================================================
  // Public API - Bulk Operations
  // ===========================================================================

  /**
   * Copy permissions from one element to another
   */
  copyPermissions(sourceId: NodeId, targetId: NodeId, setBy: UserId): void {
    const sourcePerms = this.getElementPermissions(sourceId);

    for (const perm of sourcePerms) {
      const options = {
        inheritable: perm.inheritable,
        setBy,
        ...(perm.expiresAt !== undefined ? { expiresAt: perm.expiresAt } : {}),
      };
      if (perm.effect === 'grant') {
        this.grantPermission(targetId, perm.principalId, perm.principalType, perm.permission, options);
      } else {
        this.denyPermission(targetId, perm.principalId, perm.principalType, perm.permission, options);
      }
    }
  }

  /**
   * Clear all permissions for an element
   */
  clearElementPermissions(elementId: NodeId): number {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, perm] of this.permissions.entries()) {
      if (perm.elementId === elementId) {
        keysToDelete.push(key);
        count++;
      }
    }

    for (const key of keysToDelete) {
      this.permissions.delete(key);
    }

    if (count > 0) {
      this.invalidateCache(elementId);
    }

    return count;
  }

  /**
   * Clean up expired permissions
   */
  cleanupExpired(): number {
    const now = Date.now();
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, perm] of this.permissions.entries()) {
      if (perm.expiresAt && perm.expiresAt < now) {
        keysToDelete.push(key);
        this.emit('permission:expired', { elementId: perm.elementId, permission: perm });
        count++;
      }
    }

    for (const key of keysToDelete) {
      this.permissions.delete(key);
    }

    return count;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private getPermissionKey(
    elementId: NodeId,
    principalId: UserId | CollaborationRole,
    permission: Permission
  ): string {
    return `${elementId}:${principalId}:${permission}`;
  }

  private permissionAppliesToPrincipal(
    perm: ElementPermission,
    userId: UserId,
    userRole: CollaborationRole
  ): boolean {
    if (perm.principalType === 'user') {
      return perm.principalId === userId;
    } else {
      return perm.principalId === userRole;
    }
  }

  private getInheritedPermissions(
    elementId: NodeId,
    userId: UserId,
    userRole: CollaborationRole
  ): ElementPermission[] {
    const result: ElementPermission[] = [];
    let currentId: NodeId | null = this.getParentId(elementId);

    while (currentId !== null) {
      // Check if this parent blocks inheritance
      const config = this.elementConfigs.get(currentId);
      if (config?.blockInheritance) {
        break;
      }

      // Get inheritable permissions from this parent
      const parentPerms = this.getElementPermissions(currentId);
      for (const perm of parentPerms) {
        if (perm.inheritable && this.permissionAppliesToPrincipal(perm, userId, userRole)) {
          result.push(perm);
        }
      }

      currentId = this.getParentId(currentId);
    }

    return result;
  }

  private handleExpiredPermission(perm: ElementPermission): void {
    const key = this.getPermissionKey(perm.elementId, perm.principalId, perm.permission);
    this.permissions.delete(key);
    this.invalidateCache(perm.elementId);
    this.emit('permission:expired', { elementId: perm.elementId, permission: perm });
  }

  private invalidateCache(elementId: NodeId): void {
    // Invalidate this element's cache
    for (const key of this.resolvedCache.keys()) {
      if (key.startsWith(`${elementId}:`)) {
        this.resolvedCache.delete(key);
      }
    }

    // Invalidate children's cache (they may inherit from this element)
    this.invalidateCacheForChildren(elementId);
  }

  private invalidateCacheForChildren(elementId: NodeId): void {
    const children = this.getChildrenIds(elementId);
    for (const childId of children) {
      for (const key of this.resolvedCache.keys()) {
        if (key.startsWith(`${childId}:`)) {
          this.resolvedCache.delete(key);
        }
      }
      // Recursively invalidate grandchildren
      this.invalidateCacheForChildren(childId);
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an element permission manager
 */
export function createElementPermissionManager(
  options: ElementPermissionManagerOptions
): ElementPermissionManager {
  return new ElementPermissionManager(options);
}
