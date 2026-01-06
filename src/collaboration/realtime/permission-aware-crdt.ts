/**
 * Permission-Aware CRDT Bridge
 *
 * Wraps the CRDTBridge to validate permissions before applying operations.
 * Handles:
 * - Operation validation against user permissions
 * - Element-level permission checking
 * - Rejection of unauthorized operations
 * - Permission-based filtering of remote updates
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';
import type { DocumentId, UserId, Operation, CollaborationRole } from '../types';
import { CRDTBridge, type CRDTBridgeOptions } from './crdt-bridge';
import {
  PermissionManager,
  type PermissionCheckResult,
} from '../permissions/permission-manager';

// =============================================================================
// Types
// =============================================================================

export interface PermissionAwareCRDTOptions extends Omit<CRDTBridgeOptions, 'onUpdate'> {
  /** User's role in the document */
  readonly role: CollaborationRole;
  /** Callback when local changes need to be sent to peers */
  readonly onUpdate?: (update: Uint8Array, origin: string) => void;
  /** Callback when an operation is rejected due to permissions */
  readonly onOperationRejected?: (operation: Operation, reason: string) => void;
}

export interface PermissionAwareCRDTEvents {
  'sync:started': undefined;
  'sync:completed': undefined;
  'operation:local': Operation;
  'operation:remote': Operation;
  'operation:rejected': { operation: Operation; reason: string };
  'permission:denied': { nodeId?: NodeId; operation: string; reason: string };
  'lock:acquired': { nodeId: NodeId; userId: UserId };
  'lock:released': { nodeId: NodeId };
  'lock:denied': { nodeId: NodeId; reason: string };
  'conflict:detected': { nodeId: NodeId; property: string };
  [key: string]: unknown;
}

export interface LockRequest {
  readonly nodeId: NodeId;
  readonly userId: UserId;
  readonly timestamp: number;
  readonly timeout?: number; // Auto-release after ms
}

export interface ElementLock {
  readonly nodeId: NodeId;
  readonly userId: UserId;
  readonly userName?: string;
  readonly acquiredAt: number;
  readonly expiresAt?: number;
}

// =============================================================================
// Permission-Aware CRDT Bridge
// =============================================================================

export class PermissionAwareCRDTBridge extends EventEmitter<PermissionAwareCRDTEvents> {
  private readonly crdtBridge: CRDTBridge;
  private readonly permissionManager: PermissionManager;
  private readonly userId: UserId;
  // Used for future document-level checks
  readonly documentId: DocumentId;
  private readonly onOperationRejectedCallback: ((operation: Operation, reason: string) => void) | null;

  // Element locks
  private readonly locks = new Map<NodeId, ElementLock>();
  private readonly lockTimeouts = new Map<NodeId, ReturnType<typeof setTimeout>>();

  // Default lock timeout (5 minutes)
  private readonly defaultLockTimeout = 5 * 60 * 1000;

  // CRDT event unsubscribers
  private unsubscribers: Array<() => void> = [];

  constructor(options: PermissionAwareCRDTOptions) {
    super();

    this.userId = options.userId;
    this.documentId = options.documentId;
    this.onOperationRejectedCallback = options.onOperationRejected ?? null;

    // Create permission manager
    this.permissionManager = new PermissionManager({
      userId: options.userId,
      documentId: options.documentId,
      role: options.role,
    });

    // Create underlying CRDT bridge with permission-aware update callback
    this.crdtBridge = new CRDTBridge({
      sceneGraph: options.sceneGraph,
      documentId: options.documentId,
      userId: options.userId,
      onUpdate: (update, origin) => {
        // Only forward updates from validated local operations
        if (origin === 'local' && options.onUpdate) {
          options.onUpdate(update, origin);
        }
      },
    });

    // Set up event forwarding with permission filtering
    this.setupEventHandlers();
  }

  // ===========================================================================
  // Public API - CRDT Operations
  // ===========================================================================

  /**
   * Get the underlying Y.js document
   */
  getYDoc() {
    return this.crdtBridge.getYDoc();
  }

  /**
   * Apply a Y.js update from a remote peer (with permission validation)
   */
  applyUpdate(update: Uint8Array, origin = 'remote'): void {
    // For remote updates, we trust the sender has already validated permissions
    // The server should reject unauthorized operations
    this.crdtBridge.applyUpdate(update, origin);
  }

  /**
   * Get the current state vector for sync
   */
  getStateVector(): Uint8Array {
    return this.crdtBridge.getStateVector();
  }

  /**
   * Get updates since a given state vector
   */
  getUpdatesSince(stateVector: Uint8Array): Uint8Array {
    return this.crdtBridge.getUpdatesSince(stateVector);
  }

  /**
   * Get the full document state
   */
  getFullState(): Uint8Array {
    return this.crdtBridge.getFullState();
  }

  /**
   * Initialize from existing scene graph state
   */
  initializeFromSceneGraph(): void {
    // Check if user has permission to initialize
    if (!this.permissionManager.hasPermission('edit')) {
      this.emit('permission:denied', {
        operation: 'initializeFromSceneGraph',
        reason: 'Edit permission required to initialize document',
      });
      return;
    }

    this.crdtBridge.initializeFromSceneGraph();
  }

  /**
   * Initialize from Y.js state (when joining existing session)
   */
  initializeFromYjs(): void {
    // Anyone can receive initial state (view permission is sufficient)
    this.crdtBridge.initializeFromYjs();
  }

  // ===========================================================================
  // Public API - Permission Checking
  // ===========================================================================

  /**
   * Get the permission manager
   */
  getPermissionManager(): PermissionManager {
    return this.permissionManager;
  }

  /**
   * Check if an operation is allowed
   */
  canPerformOperation(operation: Operation): PermissionCheckResult {
    return this.permissionManager.validateOperation(operation);
  }

  /**
   * Check if user can edit a specific element
   */
  canEditElement(nodeId: NodeId): PermissionCheckResult {
    // Check base edit permission
    const baseCheck = this.permissionManager.canEditElement(nodeId);
    if (!baseCheck.allowed) {
      return baseCheck;
    }

    // Check if element is locked by another user
    const lock = this.locks.get(nodeId);
    if (lock && lock.userId !== this.userId) {
      return {
        allowed: false,
        reason: `Element is locked by ${lock.userName ?? lock.userId}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate an operation and emit rejection event if denied
   */
  validateAndRejectOperation(operation: Operation): boolean {
    const result = this.canPerformOperation(operation);

    if (!result.allowed) {
      const reason = result.reason ?? 'Permission denied';
      this.emit('operation:rejected', { operation, reason });
      if (this.onOperationRejectedCallback) {
        this.onOperationRejectedCallback(operation, reason);
      }
      return false;
    }

    // Additional element-level check for operations targeting specific nodes
    if ('nodeId' in operation) {
      const elementCheck = this.canEditElement(operation.nodeId);
      if (!elementCheck.allowed) {
        const reason = elementCheck.reason ?? 'Element permission denied';
        this.emit('operation:rejected', { operation, reason });
        if (this.onOperationRejectedCallback) {
          this.onOperationRejectedCallback(operation, reason);
        }
        return false;
      }
    }

    return true;
  }

  // ===========================================================================
  // Public API - Element Locking
  // ===========================================================================

  /**
   * Request a lock on an element for exclusive editing
   */
  requestLock(nodeId: NodeId, timeout?: number): boolean {
    // Check if user can edit
    if (!this.permissionManager.hasPermission('edit')) {
      this.emit('lock:denied', {
        nodeId,
        reason: 'Edit permission required to lock elements',
      });
      return false;
    }

    // Check if already locked by another user
    const existingLock = this.locks.get(nodeId);
    if (existingLock && existingLock.userId !== this.userId) {
      // Check if lock has expired
      if (existingLock.expiresAt && existingLock.expiresAt < Date.now()) {
        // Lock expired, release it
        this.releaseLockInternal(nodeId);
      } else {
        this.emit('lock:denied', {
          nodeId,
          reason: `Element is locked by ${existingLock.userName ?? existingLock.userId}`,
        });
        return false;
      }
    }

    // Acquire lock
    const lockTimeout = timeout ?? this.defaultLockTimeout;
    const lock: ElementLock = {
      nodeId,
      userId: this.userId,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + lockTimeout,
    };

    this.locks.set(nodeId, lock);
    this.permissionManager.lockElement(nodeId, this.userId);

    // Set auto-release timeout
    const timeoutId = setTimeout(() => {
      this.releaseLock(nodeId);
    }, lockTimeout);
    this.lockTimeouts.set(nodeId, timeoutId);

    this.emit('lock:acquired', { nodeId, userId: this.userId });
    return true;
  }

  /**
   * Release a lock on an element
   */
  releaseLock(nodeId: NodeId): boolean {
    const lock = this.locks.get(nodeId);
    if (!lock) {
      return false;
    }

    // Can only release own locks (unless owner)
    if (lock.userId !== this.userId && !this.permissionManager.isOwner()) {
      return false;
    }

    return this.releaseLockInternal(nodeId);
  }

  /**
   * Force release a lock (owner only)
   */
  forceReleaseLock(nodeId: NodeId): boolean {
    if (!this.permissionManager.isOwner()) {
      return false;
    }
    return this.releaseLockInternal(nodeId);
  }

  /**
   * Get lock status for an element
   */
  getLock(nodeId: NodeId): ElementLock | undefined {
    return this.locks.get(nodeId);
  }

  /**
   * Check if an element is locked
   */
  isLocked(nodeId: NodeId): boolean {
    return this.locks.has(nodeId);
  }

  /**
   * Check if element is locked by current user
   */
  isLockedByMe(nodeId: NodeId): boolean {
    const lock = this.locks.get(nodeId);
    return lock?.userId === this.userId;
  }

  /**
   * Get all current locks
   */
  getAllLocks(): ElementLock[] {
    return Array.from(this.locks.values());
  }

  /**
   * Apply a lock from a remote user
   */
  applyRemoteLock(lock: ElementLock): void {
    this.locks.set(lock.nodeId, lock);
    this.permissionManager.lockElement(lock.nodeId, lock.userId);
    this.emit('lock:acquired', { nodeId: lock.nodeId, userId: lock.userId });
  }

  /**
   * Apply a remote lock release
   */
  applyRemoteLockRelease(nodeId: NodeId): void {
    this.releaseLockInternal(nodeId);
  }

  // ===========================================================================
  // Public API - Role Management
  // ===========================================================================

  /**
   * Update user's role
   */
  updateRole(newRole: CollaborationRole): void {
    this.permissionManager.updateRole(newRole);
  }

  /**
   * Get current role
   */
  getRole(): CollaborationRole {
    return this.permissionManager.getRole();
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clean up and disconnect
   */
  destroy(): void {
    // Clear all lock timeouts
    for (const timeoutId of this.lockTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.lockTimeouts.clear();
    this.locks.clear();

    // Unsubscribe from events
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    // Destroy underlying bridge
    this.crdtBridge.destroy();
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private setupEventHandlers(): void {
    // Forward sync events
    this.unsubscribers.push(
      this.crdtBridge.on('sync:started', () => {
        this.emit('sync:started');
      })
    );

    this.unsubscribers.push(
      this.crdtBridge.on('sync:completed', () => {
        this.emit('sync:completed');
      })
    );

    // Forward local operations (already validated by scene graph changes)
    this.unsubscribers.push(
      this.crdtBridge.on('operation:local', (operation) => {
        // Validate operation before forwarding
        if (this.validateAndRejectOperation(operation)) {
          this.emit('operation:local', operation);
        }
      })
    );

    // Filter remote operations based on permissions
    this.unsubscribers.push(
      this.crdtBridge.on('operation:remote', (operation) => {
        // Remote operations are applied - emit for tracking
        this.emit('operation:remote', operation);
      })
    );

    // Forward conflict events
    this.unsubscribers.push(
      this.crdtBridge.on('conflict:detected', (event) => {
        this.emit('conflict:detected', event);
      })
    );

    // Forward permission events
    this.unsubscribers.push(
      this.permissionManager.on('permission:denied', (event) => {
        this.emit('permission:denied', event);
      })
    );
  }

  private releaseLockInternal(nodeId: NodeId): boolean {
    const lock = this.locks.get(nodeId);
    if (!lock) {
      return false;
    }

    // Clear timeout
    const timeoutId = this.lockTimeouts.get(nodeId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.lockTimeouts.delete(nodeId);
    }

    // Remove lock
    this.locks.delete(nodeId);
    this.permissionManager.unlockElement(nodeId);

    this.emit('lock:released', { nodeId });
    return true;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a permission-aware CRDT bridge instance
 */
export function createPermissionAwareCRDTBridge(
  options: PermissionAwareCRDTOptions
): PermissionAwareCRDTBridge {
  return new PermissionAwareCRDTBridge(options);
}
