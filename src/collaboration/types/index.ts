/**
 * Collaboration types for real-time multi-user editing
 */

import type { NodeId, NodeType, PropertyPath } from '@core/types/common';
import type { Point } from '@core/types/geometry';

// =============================================================================
// User & Session Types
// =============================================================================

/** Unique user identifier */
export type UserId = string;

/** Unique session identifier */
export type SessionId = string;

/** Unique document identifier for collaboration */
export type DocumentId = string;

/** User information for collaboration */
export interface CollaborationUser {
  readonly id: UserId;
  readonly name: string;
  readonly email?: string;
  readonly avatarUrl?: string;
  readonly color: string; // Assigned color for cursor/selection
}

/** Active collaboration session */
export interface CollaborationSession {
  readonly sessionId: SessionId;
  readonly documentId: DocumentId;
  readonly user: CollaborationUser;
  readonly role: CollaborationRole;
  readonly connectedAt: number;
  readonly lastActivityAt: number;
}

// =============================================================================
// Role & Permission Types
// =============================================================================

/** User roles in a document */
export type CollaborationRole =
  | 'owner'      // Full control including permissions
  | 'editor'     // Can edit, cannot manage permissions
  | 'commenter'  // Can view and comment only
  | 'viewer'     // View only
  | 'developer'; // Export code, inspect, no design edits

/** Granular permissions */
export type Permission =
  | 'view'
  | 'edit'
  | 'comment'
  | 'export'
  | 'export_code'
  | 'inspect'
  | 'manage_permissions'
  | 'delete_document'
  | 'invite_users';

/** Permission mapping for roles */
export const RolePermissions: Record<CollaborationRole, readonly Permission[]> = {
  owner: ['view', 'edit', 'comment', 'export', 'export_code', 'inspect', 'manage_permissions', 'delete_document', 'invite_users'],
  editor: ['view', 'edit', 'comment', 'export', 'export_code', 'inspect'],
  commenter: ['view', 'comment', 'export'],
  viewer: ['view'],
  developer: ['view', 'export_code', 'inspect'],
} as const;

/** Check if a role has a permission */
export function hasPermission(role: CollaborationRole, permission: Permission): boolean {
  return RolePermissions[role].includes(permission);
}

// =============================================================================
// Presence Types
// =============================================================================

/** Cursor position in world coordinates */
export interface CursorPosition {
  readonly x: number;
  readonly y: number;
  readonly pageId: NodeId;
}

/** User presence state */
export interface UserPresence {
  readonly userId: UserId;
  readonly cursor: CursorPosition | null;
  readonly selection: readonly NodeId[];
  readonly viewportCenter: Point;
  readonly viewportZoom: number;
  readonly isActive: boolean;
  readonly lastUpdate: number;
}

/** Presence update message */
export interface PresenceUpdate {
  readonly type: 'presence';
  readonly userId: UserId;
  readonly cursor?: CursorPosition | null;
  readonly selection?: readonly NodeId[];
  readonly viewportCenter?: Point;
  readonly viewportZoom?: number;
}

// =============================================================================
// Operation Types (for CRDT sync)
// =============================================================================

/** Types of operations that can be synced */
export type OperationType =
  | 'node:create'
  | 'node:delete'
  | 'node:update'
  | 'node:move'
  | 'node:reorder';

/** Base operation interface */
export interface BaseOperation {
  readonly id: string;
  readonly type: OperationType;
  readonly userId: UserId;
  readonly timestamp: number;
  readonly documentId: DocumentId;
}

/** Node creation operation */
export interface CreateNodeOperation extends BaseOperation {
  readonly type: 'node:create';
  readonly nodeType: NodeType;
  readonly parentId: NodeId;
  readonly position: number;
  readonly data: Record<string, unknown>;
  readonly nodeId: NodeId; // The ID of the created node
}

/** Node deletion operation */
export interface DeleteNodeOperation extends BaseOperation {
  readonly type: 'node:delete';
  readonly nodeId: NodeId;
}

/** Node property update operation */
export interface UpdateNodeOperation extends BaseOperation {
  readonly type: 'node:update';
  readonly nodeId: NodeId;
  readonly path: PropertyPath;
  readonly oldValue: unknown;
  readonly newValue: unknown;
}

/** Node move operation (change parent) */
export interface MoveNodeOperation extends BaseOperation {
  readonly type: 'node:move';
  readonly nodeId: NodeId;
  readonly oldParentId: NodeId;
  readonly newParentId: NodeId;
  readonly position: number;
}

/** Node reorder operation (change position within parent) */
export interface ReorderNodeOperation extends BaseOperation {
  readonly type: 'node:reorder';
  readonly nodeId: NodeId;
  readonly parentId: NodeId;
  readonly oldPosition: number;
  readonly newPosition: number;
}

/** Union of all operation types */
export type Operation =
  | CreateNodeOperation
  | DeleteNodeOperation
  | UpdateNodeOperation
  | MoveNodeOperation
  | ReorderNodeOperation;

// =============================================================================
// Message Types (WebSocket protocol)
// =============================================================================

/** Message types for WebSocket communication */
export type MessageType =
  | 'auth'
  | 'auth_result'
  | 'join'
  | 'join_result'
  | 'leave'
  | 'presence'
  | 'sync'
  | 'sync_request'
  | 'operation'
  | 'operation_ack'
  | 'error'
  | 'ping'
  | 'pong';

/** Base message interface */
export interface BaseMessage {
  readonly type: MessageType;
  readonly timestamp: number;
  readonly messageId: string;
}

/** Authentication request */
export interface AuthMessage extends BaseMessage {
  readonly type: 'auth';
  readonly token: string;
}

/** Authentication result */
export interface AuthResultMessage extends BaseMessage {
  readonly type: 'auth_result';
  readonly success: boolean;
  readonly user?: CollaborationUser;
  readonly error?: string;
}

/** Join document request */
export interface JoinMessage extends BaseMessage {
  readonly type: 'join';
  readonly documentId: DocumentId;
}

/** Join result with current state */
export interface JoinResultMessage extends BaseMessage {
  readonly type: 'join_result';
  readonly success: boolean;
  readonly documentId: DocumentId;
  readonly role?: CollaborationRole;
  readonly participants?: CollaborationSession[];
  readonly error?: string;
}

/** Leave document notification */
export interface LeaveMessage extends BaseMessage {
  readonly type: 'leave';
  readonly documentId: DocumentId;
  readonly userId: UserId;
}

/** Presence update message */
export interface PresenceMessage extends BaseMessage {
  readonly type: 'presence';
  readonly documentId: DocumentId;
  readonly presence: UserPresence;
}

/** Sync message (Y.js state vector or update) */
export interface SyncMessage extends BaseMessage {
  readonly type: 'sync';
  readonly documentId: DocumentId;
  readonly data: string; // Base64-encoded Y.js update
}

/** Request sync from server */
export interface SyncRequestMessage extends BaseMessage {
  readonly type: 'sync_request';
  readonly documentId: DocumentId;
  readonly stateVector?: string; // Base64-encoded state vector
}

/** Operation message */
export interface OperationMessage extends BaseMessage {
  readonly type: 'operation';
  readonly documentId: DocumentId;
  readonly operation: Operation;
}

/** Operation acknowledgment */
export interface OperationAckMessage extends BaseMessage {
  readonly type: 'operation_ack';
  readonly operationId: string;
  readonly success: boolean;
  readonly error?: string;
}

/** Error message */
export interface ErrorMessage extends BaseMessage {
  readonly type: 'error';
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

/** Ping message for keep-alive */
export interface PingMessage extends BaseMessage {
  readonly type: 'ping';
}

/** Pong response */
export interface PongMessage extends BaseMessage {
  readonly type: 'pong';
}

/** Union of all message types */
export type CollaborationMessage =
  | AuthMessage
  | AuthResultMessage
  | JoinMessage
  | JoinResultMessage
  | LeaveMessage
  | PresenceMessage
  | SyncMessage
  | SyncRequestMessage
  | OperationMessage
  | OperationAckMessage
  | ErrorMessage
  | PingMessage
  | PongMessage;

// =============================================================================
// Connection State
// =============================================================================

/** WebSocket connection state */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'reconnecting'
  | 'error';

/** Connection state change event */
export interface ConnectionStateChange {
  readonly previousState: ConnectionState;
  readonly currentState: ConnectionState;
  readonly error?: Error;
}

// =============================================================================
// Conflict Resolution
// =============================================================================

/** Conflict type when operations collide */
export type ConflictType =
  | 'concurrent_edit'    // Same property edited by multiple users
  | 'delete_edit'        // Node deleted while being edited
  | 'move_conflict'      // Node moved to different parents
  | 'permission_denied'; // User lacks permission for operation

/** Conflict information */
export interface Conflict {
  readonly type: ConflictType;
  readonly localOperation: Operation;
  readonly remoteOperation: Operation;
  readonly resolvedOperation?: Operation;
  readonly autoResolved: boolean;
}

// =============================================================================
// Event Types
// =============================================================================

/** Collaboration event types */
export type CollaborationEventType =
  | 'connection:stateChange'
  | 'session:joined'
  | 'session:left'
  | 'participant:joined'
  | 'participant:left'
  | 'presence:updated'
  | 'operation:received'
  | 'operation:applied'
  | 'conflict:detected'
  | 'sync:started'
  | 'sync:completed'
  | 'error';

/** Collaboration events map */
export interface CollaborationEvents {
  'connection:stateChange': ConnectionStateChange;
  'session:joined': { documentId: DocumentId; role: CollaborationRole };
  'session:left': { documentId: DocumentId };
  'participant:joined': { session: CollaborationSession };
  'participant:left': { userId: UserId; documentId: DocumentId };
  'presence:updated': { userId: UserId; presence: UserPresence };
  'operation:received': { operation: Operation };
  'operation:applied': { operation: Operation };
  'conflict:detected': Conflict;
  'sync:started': { documentId: DocumentId };
  'sync:completed': { documentId: DocumentId };
  'error': { code: string; message: string; details?: unknown };
}
