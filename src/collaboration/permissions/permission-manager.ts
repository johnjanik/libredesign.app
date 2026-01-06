/**
 * Permission Manager for collaboration access control
 *
 * Handles:
 * - Role-based permission checking
 * - Operation validation before execution
 * - Permission caching for performance
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';
import type {
  UserId,
  DocumentId,
  CollaborationRole,
  Permission,
  Operation,
} from '../types';
import { RolePermissions } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface PermissionManagerOptions {
  /** Current user's ID */
  readonly userId: UserId;
  /** Document ID */
  readonly documentId: DocumentId;
  /** User's role in this document */
  readonly role: CollaborationRole;
}

export interface PermissionManagerEvents {
  'permission:denied': {
    operation: string;
    reason: string;
    nodeId?: NodeId;
  };
  'role:changed': {
    oldRole: CollaborationRole;
    newRole: CollaborationRole;
  };
  [key: string]: unknown;
}

/** Result of a permission check */
export interface PermissionCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

/** Operation types that require specific permissions */
export type OperationPermissionMap = {
  'node:create': Permission;
  'node:delete': Permission;
  'node:update': Permission;
  'node:move': Permission;
  'node:reorder': Permission;
  'export:svg': Permission;
  'export:png': Permission;
  'export:code': Permission;
  'comment:create': Permission;
  'comment:delete': Permission;
};

// =============================================================================
// Constants
// =============================================================================

/** Map operations to required permissions */
const OPERATION_PERMISSIONS: OperationPermissionMap = {
  'node:create': 'edit',
  'node:delete': 'edit',
  'node:update': 'edit',
  'node:move': 'edit',
  'node:reorder': 'edit',
  'export:svg': 'export',
  'export:png': 'export',
  'export:code': 'export_code',
  'comment:create': 'comment',
  'comment:delete': 'comment',
} as const;

// =============================================================================
// Permission Manager
// =============================================================================

export class PermissionManager extends EventEmitter<PermissionManagerEvents> {
  private userId: UserId;
  private _documentId: DocumentId;
  private role: CollaborationRole;
  private permissions: Set<Permission>;

  // Element-level permission overrides (for future ABAC support)
  private elementOverrides = new Map<NodeId, Set<Permission>>();
  private elementDenials = new Map<NodeId, Set<Permission>>();

  // Locked elements (being edited by others)
  private lockedElements = new Map<NodeId, UserId>();

  constructor(options: PermissionManagerOptions) {
    super();
    this.userId = options.userId;
    this._documentId = options.documentId;
    this.role = options.role;
    this.permissions = new Set(RolePermissions[options.role]);
  }

  // ===========================================================================
  // Public API - Permission Checks
  // ===========================================================================

  /**
   * Get the current role
   */
  getRole(): CollaborationRole {
    return this.role;
  }

  /**
   * Get the document ID
   */
  getDocumentId(): DocumentId {
    return this._documentId;
  }

  /**
   * Get all permissions for the current role
   */
  getPermissions(): readonly Permission[] {
    return Array.from(this.permissions);
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    return this.permissions.has(permission);
  }

  /**
   * Check if user can perform an operation
   */
  canPerformOperation(operationType: keyof OperationPermissionMap): PermissionCheckResult {
    const requiredPermission = OPERATION_PERMISSIONS[operationType];

    if (!requiredPermission) {
      return { allowed: true };
    }

    if (this.permissions.has(requiredPermission)) {
      return { allowed: true };
    }

    const reason = `Role '${this.role}' does not have '${requiredPermission}' permission required for '${operationType}'`;
    this.emit('permission:denied', { operation: operationType, reason });
    return { allowed: false, reason };
  }

  /**
   * Check if user can edit a specific element
   */
  canEditElement(nodeId: NodeId): PermissionCheckResult {
    // Check base edit permission
    if (!this.permissions.has('edit')) {
      return {
        allowed: false,
        reason: `Role '${this.role}' does not have edit permission`,
      };
    }

    // Check if element is locked by another user
    const lockOwner = this.lockedElements.get(nodeId);
    if (lockOwner && lockOwner !== this.userId) {
      return {
        allowed: false,
        reason: `Element is locked by another user`,
      };
    }

    // Check element-specific denials
    const denials = this.elementDenials.get(nodeId);
    if (denials?.has('edit')) {
      return {
        allowed: false,
        reason: 'Edit permission denied for this element',
      };
    }

    return { allowed: true };
  }

  /**
   * Validate an operation before applying
   */
  validateOperation(operation: Operation): PermissionCheckResult {
    // Check operation type permission
    const opCheck = this.canPerformOperation(operation.type as keyof OperationPermissionMap);
    if (!opCheck.allowed) {
      return opCheck;
    }

    // Check element-specific permissions for operations that target elements
    if ('nodeId' in operation) {
      const elementCheck = this.canEditElement(operation.nodeId);
      if (!elementCheck.allowed) {
        return elementCheck;
      }
    }

    return { allowed: true };
  }

  // ===========================================================================
  // Public API - Role Management
  // ===========================================================================

  /**
   * Update the user's role (called when server notifies of role change)
   */
  updateRole(newRole: CollaborationRole): void {
    if (this.role === newRole) return;

    const oldRole = this.role;
    this.role = newRole;
    this.permissions = new Set(RolePermissions[newRole]);

    this.emit('role:changed', { oldRole, newRole });
  }

  // ===========================================================================
  // Public API - Element Locking
  // ===========================================================================

  /**
   * Lock an element for exclusive editing
   */
  lockElement(nodeId: NodeId, userId: UserId): void {
    this.lockedElements.set(nodeId, userId);
  }

  /**
   * Unlock an element
   */
  unlockElement(nodeId: NodeId): void {
    this.lockedElements.delete(nodeId);
  }

  /**
   * Check if an element is locked
   */
  isElementLocked(nodeId: NodeId): boolean {
    return this.lockedElements.has(nodeId);
  }

  /**
   * Get the user who locked an element
   */
  getElementLockOwner(nodeId: NodeId): UserId | undefined {
    return this.lockedElements.get(nodeId);
  }

  /**
   * Get all locked elements
   */
  getLockedElements(): Map<NodeId, UserId> {
    return new Map(this.lockedElements);
  }

  // ===========================================================================
  // Public API - Element Overrides (for future ABAC)
  // ===========================================================================

  /**
   * Add permission override for an element
   */
  addElementOverride(nodeId: NodeId, permission: Permission): void {
    let overrides = this.elementOverrides.get(nodeId);
    if (!overrides) {
      overrides = new Set();
      this.elementOverrides.set(nodeId, overrides);
    }
    overrides.add(permission);
  }

  /**
   * Remove permission override for an element
   */
  removeElementOverride(nodeId: NodeId, permission: Permission): void {
    const overrides = this.elementOverrides.get(nodeId);
    if (overrides) {
      overrides.delete(permission);
      if (overrides.size === 0) {
        this.elementOverrides.delete(nodeId);
      }
    }
  }

  /**
   * Add permission denial for an element
   */
  addElementDenial(nodeId: NodeId, permission: Permission): void {
    let denials = this.elementDenials.get(nodeId);
    if (!denials) {
      denials = new Set();
      this.elementDenials.set(nodeId, denials);
    }
    denials.add(permission);
  }

  /**
   * Remove permission denial for an element
   */
  removeElementDenial(nodeId: NodeId, permission: Permission): void {
    const denials = this.elementDenials.get(nodeId);
    if (denials) {
      denials.delete(permission);
      if (denials.size === 0) {
        this.elementDenials.delete(nodeId);
      }
    }
  }

  // ===========================================================================
  // Public API - Utility
  // ===========================================================================

  /**
   * Check if user is the owner
   */
  isOwner(): boolean {
    return this.role === 'owner';
  }

  /**
   * Check if user can manage permissions
   */
  canManagePermissions(): boolean {
    return this.permissions.has('manage_permissions');
  }

  /**
   * Check if user can invite others
   */
  canInvite(): boolean {
    return this.permissions.has('invite_users');
  }

  /**
   * Get a summary of permissions for UI display
   */
  getPermissionSummary(): {
    canView: boolean;
    canEdit: boolean;
    canComment: boolean;
    canExport: boolean;
    canExportCode: boolean;
    canManage: boolean;
  } {
    return {
      canView: this.permissions.has('view'),
      canEdit: this.permissions.has('edit'),
      canComment: this.permissions.has('comment'),
      canExport: this.permissions.has('export'),
      canExportCode: this.permissions.has('export_code'),
      canManage: this.permissions.has('manage_permissions'),
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a permission manager instance
 */
export function createPermissionManager(
  options: PermissionManagerOptions
): PermissionManager {
  return new PermissionManager(options);
}
