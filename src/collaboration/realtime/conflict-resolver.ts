/**
 * Conflict Resolver
 *
 * Handles concurrent edit conflicts with role-based precedence.
 * Implements three-way merge for complex conflicts and determines
 * which operation wins when users edit the same element simultaneously.
 *
 * Resolution strategies:
 * - Role precedence: owner > editor > commenter
 * - Timestamp: later operations win (with role consideration)
 * - Property-level merging: non-conflicting properties are merged
 * - Last-write-wins for truly concurrent conflicts
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId, PropertyPath } from '@core/types/common';
import type {
  Operation,
  CollaborationRole,
  Conflict,
  ConflictType,
  UpdateNodeOperation,
  UserId,
} from '../types';

// =============================================================================
// Types
// =============================================================================

export interface ConflictResolverOptions {
  /** Current user ID */
  readonly userId: UserId;
  /** Current user role */
  readonly role: CollaborationRole;
  /** Strategy for resolving conflicts */
  readonly strategy?: ConflictResolutionStrategy;
  /** Time threshold for considering operations concurrent (ms) */
  readonly concurrencyThreshold?: number;
}

export type ConflictResolutionStrategy =
  | 'role_precedence'   // Higher role wins, then timestamp
  | 'timestamp'         // Later timestamp wins
  | 'merge'             // Attempt to merge non-conflicting changes
  | 'local_wins'        // Local operation always wins
  | 'remote_wins';      // Remote operation always wins

export interface ConflictResolverEvents {
  'conflict:detected': Conflict;
  'conflict:resolved': Conflict;
  'conflict:unresolvable': Conflict;
  [key: string]: unknown;
}

export interface MergeResult {
  readonly success: boolean;
  readonly mergedOperation?: Operation;
  readonly conflict?: Conflict;
}

export interface RolePrecedence {
  readonly role: CollaborationRole;
  readonly priority: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Role priority (higher = more authority) */
const ROLE_PRIORITY: Record<CollaborationRole, number> = {
  owner: 100,
  editor: 50,
  developer: 40,
  commenter: 20,
  viewer: 10,
} as const;

/** Default concurrency threshold (100ms) */
const DEFAULT_CONCURRENCY_THRESHOLD = 100;

// =============================================================================
// Conflict Resolver
// =============================================================================

export class ConflictResolver extends EventEmitter<ConflictResolverEvents> {
  readonly userId: UserId;
  private readonly role: CollaborationRole;
  private readonly strategy: ConflictResolutionStrategy;
  private readonly concurrencyThreshold: number;

  // Operation history for three-way merge
  private readonly operationHistory = new Map<NodeId, Operation[]>();
  private readonly maxHistoryPerNode = 50;

  // Participant roles (updated from collaboration manager)
  private readonly participantRoles = new Map<UserId, CollaborationRole>();

  constructor(options: ConflictResolverOptions) {
    super();
    this.userId = options.userId;
    this.role = options.role;
    this.strategy = options.strategy ?? 'role_precedence';
    this.concurrencyThreshold = options.concurrencyThreshold ?? DEFAULT_CONCURRENCY_THRESHOLD;
    this.participantRoles.set(options.userId, options.role);
  }

  // ===========================================================================
  // Public API - Conflict Resolution
  // ===========================================================================

  /**
   * Process an incoming operation and check for conflicts
   */
  processOperation(
    incomingOp: Operation,
    pendingLocalOps: Operation[]
  ): MergeResult {
    // Check for conflicts with pending local operations
    const conflicts = this.detectConflicts(incomingOp, pendingLocalOps);

    if (conflicts.length === 0) {
      // No conflicts - operation can be applied directly
      return { success: true };
    }

    // Resolve each conflict
    for (const conflict of conflicts) {
      this.emit('conflict:detected', conflict);
      const resolved = this.resolveConflict(conflict);

      if (!resolved.autoResolved) {
        this.emit('conflict:unresolvable', resolved);
        return {
          success: false,
          conflict: resolved,
        };
      }

      this.emit('conflict:resolved', resolved);
    }

    // All conflicts resolved - return merged result
    const lastConflict = conflicts[conflicts.length - 1]!;
    return {
      success: true,
      mergedOperation: lastConflict.resolvedOperation ?? incomingOp,
    };
  }

  /**
   * Detect conflicts between an incoming operation and local operations
   */
  detectConflicts(
    incomingOp: Operation,
    localOps: Operation[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    for (const localOp of localOps) {
      const conflict = this.checkOperationConflict(localOp, incomingOp);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  /**
   * Resolve a conflict using the configured strategy
   */
  resolveConflict(conflict: Conflict): Conflict {
    switch (this.strategy) {
      case 'role_precedence':
        return this.resolveByRolePrecedence(conflict);
      case 'timestamp':
        return this.resolveByTimestamp(conflict);
      case 'merge':
        return this.resolveByMerge(conflict);
      case 'local_wins':
        return this.resolveLocalWins(conflict);
      case 'remote_wins':
        return this.resolveRemoteWins(conflict);
      default:
        return this.resolveByRolePrecedence(conflict);
    }
  }

  /**
   * Perform three-way merge for update operations
   */
  threeWayMerge(
    _baseState: Record<string, unknown>,
    localChanges: UpdateNodeOperation,
    remoteChanges: UpdateNodeOperation
  ): MergeResult {
    // Check if operations affect different properties
    const localPath = localChanges.path.join('.');
    const remotePath = remoteChanges.path.join('.');

    if (localPath !== remotePath) {
      // Non-overlapping changes - can merge both
      const mergedOp: UpdateNodeOperation = {
        ...remoteChanges,
        // Both changes can be applied
      };
      return {
        success: true,
        mergedOperation: mergedOp,
      };
    }

    // Same property - need to determine winner
    const conflict: Conflict = {
      type: 'concurrent_edit',
      localOperation: localChanges,
      remoteOperation: remoteChanges,
      autoResolved: false,
    };

    const resolved = this.resolveConflict(conflict);
    const result: MergeResult = {
      success: resolved.autoResolved,
      conflict: resolved,
    };
    if (resolved.resolvedOperation !== undefined) {
      return { ...result, mergedOperation: resolved.resolvedOperation };
    }
    return result;
  }

  // ===========================================================================
  // Public API - Participant Management
  // ===========================================================================

  /**
   * Update a participant's role
   */
  setParticipantRole(userId: UserId, role: CollaborationRole): void {
    this.participantRoles.set(userId, role);
  }

  /**
   * Remove a participant
   */
  removeParticipant(userId: UserId): void {
    this.participantRoles.delete(userId);
  }

  /**
   * Get a participant's role
   */
  getParticipantRole(userId: UserId): CollaborationRole | undefined {
    return this.participantRoles.get(userId);
  }

  // ===========================================================================
  // Public API - Operation History
  // ===========================================================================

  /**
   * Add operation to history (for conflict resolution context)
   */
  addToHistory(operation: Operation): void {
    if (!('nodeId' in operation)) return;

    const nodeId = operation.nodeId;
    const history = this.operationHistory.get(nodeId) ?? [];
    history.push(operation);

    // Limit history size
    if (history.length > this.maxHistoryPerNode) {
      history.shift();
    }

    this.operationHistory.set(nodeId, history);
  }

  /**
   * Get operation history for a node
   */
  getHistory(nodeId: NodeId): Operation[] {
    return this.operationHistory.get(nodeId) ?? [];
  }

  /**
   * Clear history for a node
   */
  clearHistory(nodeId: NodeId): void {
    this.operationHistory.delete(nodeId);
  }

  // ===========================================================================
  // Private Methods - Conflict Detection
  // ===========================================================================

  private checkOperationConflict(
    localOp: Operation,
    remoteOp: Operation
  ): Conflict | null {
    // Check if operations are concurrent (within threshold)
    const timeDiff = Math.abs(localOp.timestamp - remoteOp.timestamp);
    const isConcurrent = timeDiff < this.concurrencyThreshold;

    // Only concurrent operations can conflict
    if (!isConcurrent) {
      return null;
    }

    // Get conflict type based on operation combination
    const conflictType = this.getConflictType(localOp, remoteOp);
    if (!conflictType) {
      return null;
    }

    return {
      type: conflictType,
      localOperation: localOp,
      remoteOperation: remoteOp,
      autoResolved: false,
    };
  }

  private getConflictType(
    localOp: Operation,
    remoteOp: Operation
  ): ConflictType | null {
    // Same node operations
    if ('nodeId' in localOp && 'nodeId' in remoteOp) {
      if (localOp.nodeId !== remoteOp.nodeId) {
        return null; // Different nodes - no conflict
      }

      // Delete vs any edit
      if (localOp.type === 'node:delete' || remoteOp.type === 'node:delete') {
        return 'delete_edit';
      }

      // Concurrent updates
      if (localOp.type === 'node:update' && remoteOp.type === 'node:update') {
        const localUpdate = localOp as UpdateNodeOperation;
        const remoteUpdate = remoteOp as UpdateNodeOperation;

        // Check if same property
        if (this.pathsOverlap(localUpdate.path, remoteUpdate.path)) {
          return 'concurrent_edit';
        }
        return null; // Different properties - no conflict
      }

      // Move conflicts
      if (localOp.type === 'node:move' && remoteOp.type === 'node:move') {
        return 'move_conflict';
      }
    }

    return null;
  }

  private pathsOverlap(path1: PropertyPath, path2: PropertyPath): boolean {
    const minLength = Math.min(path1.length, path2.length);
    for (let i = 0; i < minLength; i++) {
      if (path1[i] !== path2[i]) {
        return false;
      }
    }
    return true; // One path is prefix of another
  }

  // ===========================================================================
  // Private Methods - Conflict Resolution Strategies
  // ===========================================================================

  private resolveByRolePrecedence(conflict: Conflict): Conflict {
    const localRole = this.role;
    const remoteRole = this.participantRoles.get(conflict.remoteOperation.userId) ?? 'viewer';

    const localPriority = ROLE_PRIORITY[localRole];
    const remotePriority = ROLE_PRIORITY[remoteRole];

    // Higher role wins
    if (localPriority > remotePriority) {
      return {
        ...conflict,
        resolvedOperation: conflict.localOperation,
        autoResolved: true,
      };
    } else if (remotePriority > localPriority) {
      return {
        ...conflict,
        resolvedOperation: conflict.remoteOperation,
        autoResolved: true,
      };
    }

    // Same role - fall back to timestamp
    return this.resolveByTimestamp(conflict);
  }

  private resolveByTimestamp(conflict: Conflict): Conflict {
    // Later timestamp wins
    if (conflict.localOperation.timestamp >= conflict.remoteOperation.timestamp) {
      return {
        ...conflict,
        resolvedOperation: conflict.localOperation,
        autoResolved: true,
      };
    } else {
      return {
        ...conflict,
        resolvedOperation: conflict.remoteOperation,
        autoResolved: true,
      };
    }
  }

  private resolveByMerge(conflict: Conflict): Conflict {
    // For update operations, try property-level merge
    if (
      conflict.localOperation.type === 'node:update' &&
      conflict.remoteOperation.type === 'node:update'
    ) {
      const local = conflict.localOperation as UpdateNodeOperation;
      const remote = conflict.remoteOperation as UpdateNodeOperation;

      // If different properties, both can apply
      if (!this.pathsOverlap(local.path, remote.path)) {
        // Non-conflicting - remote takes precedence chronologically
        return {
          ...conflict,
          resolvedOperation: conflict.remoteOperation,
          autoResolved: true,
        };
      }
    }

    // For true conflicts, fall back to role precedence
    return this.resolveByRolePrecedence(conflict);
  }

  private resolveLocalWins(conflict: Conflict): Conflict {
    return {
      ...conflict,
      resolvedOperation: conflict.localOperation,
      autoResolved: true,
    };
  }

  private resolveRemoteWins(conflict: Conflict): Conflict {
    return {
      ...conflict,
      resolvedOperation: conflict.remoteOperation,
      autoResolved: true,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a conflict resolver instance
 */
export function createConflictResolver(
  options: ConflictResolverOptions
): ConflictResolver {
  return new ConflictResolver(options);
}
