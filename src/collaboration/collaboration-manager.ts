/**
 * Collaboration Manager - Main orchestrator for real-time collaboration
 *
 * This is the primary entry point for collaboration features. It coordinates:
 * - WebSocket connection and reconnection (using existing WebSocketAdapter)
 * - Y.js CRDT synchronization
 * - Presence broadcasting (using existing PresenceManager)
 * - Permission checking
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { SelectionManager } from '@scene/selection/selection-manager';
import type { NodeId } from '@core/types/common';

// Use existing collaboration infrastructure
import { WebSocketAdapter, type ConnectionState } from './network/websocket-adapter';
import { PresenceManager as ExistingPresenceManager } from './presence/presence-manager';
import type { CursorPosition, PresenceData } from './presence/presence-types';
import type {
  SyncMessage,
  HelloAckMessage,
  PresenceMessage as ExistingPresenceMessage,
  SyncResponseMessage,
} from './network/message-types';
import {
  createHelloMessage,
  createPresenceMessage,
  createSyncRequestMessage,
} from './network/message-types';

// New components
import type {
  UserId,
  DocumentId,
  CollaborationRole,
  Operation,
} from './types';
import { CRDTBridge } from './realtime/crdt-bridge';
import { PermissionManager } from './permissions/permission-manager';

// =============================================================================
// Types
// =============================================================================

/**
 * WebSocket adapter interface for dependency injection.
 * Both WebSocketAdapter and EncryptedWebSocketAdapter implement this.
 */
export interface WebSocketAdapterInterface {
  getState(): ConnectionState;
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): void;
  send(message: SyncMessage): void | Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void): () => void;
  dispose?(): void;
}

export interface CollaborationManagerOptions {
  /** WebSocket server URL */
  readonly serverUrl: string;
  /** User ID */
  readonly userId: string;
  /** User display name */
  readonly userName: string;
  /** Scene graph instance to synchronize */
  readonly sceneGraph: SceneGraph;
  /** Selection manager for selection sync */
  readonly selectionManager?: SelectionManager;
  /** Document ID to join */
  readonly documentId: string;
  /** Initial role (default: editor) */
  readonly role?: CollaborationRole;
  /** Optional pre-configured WebSocket adapter (for encryption) */
  readonly adapter?: WebSocketAdapterInterface;
}

export interface CollaborationManagerEvents {
  'connection:stateChange': { state: ConnectionState };
  'session:joined': { documentId: DocumentId; role: CollaborationRole };
  'session:left': { documentId: DocumentId };
  'participant:joined': { clientId: string; userName: string };
  'participant:left': { clientId: string };
  'presence:updated': { clientId: string; presence: PresenceData };
  'cursor:moved': { clientId: string; cursor: CursorPosition };
  'selection:changed': { clientId: string; selection: readonly NodeId[] };
  'sync:started': undefined;
  'sync:completed': undefined;
  'operation:applied': Operation;
  'permission:denied': { operation: string; reason: string };
  'error': { code: string; message: string };
  [key: string]: unknown;
}

// =============================================================================
// Collaboration Manager
// =============================================================================

export class CollaborationManager extends EventEmitter<CollaborationManagerEvents> {
  private readonly options: CollaborationManagerOptions;

  // Sub-managers
  private wsAdapter: WebSocketAdapterInterface | null = null;
  private presenceManager: ExistingPresenceManager | null = null;
  private crdtBridge: CRDTBridge | null = null;
  private permissionManager: PermissionManager | null = null;

  // State
  private currentRole: CollaborationRole;
  private isJoined = false;
  private clientId: string;
  private adapterIsExternal = false;

  // Event unsubscribers
  private unsubscribers: Array<() => void> = [];

  constructor(options: CollaborationManagerOptions) {
    super();
    this.options = options;
    this.currentRole = options.role ?? 'editor';
    this.clientId = `${options.userId}-${Date.now()}`;
  }

  // ===========================================================================
  // Public API - Connection
  // ===========================================================================

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.wsAdapter?.getState() ?? 'disconnected';
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.wsAdapter?.isConnected() ?? false;
  }

  /**
   * Check if joined to a document
   */
  isJoinedToDocument(): boolean {
    return this.isJoined;
  }

  /**
   * Get current role
   */
  getCurrentRole(): CollaborationRole {
    return this.currentRole;
  }

  /**
   * Get client ID
   */
  getClientId(): string {
    return this.clientId;
  }

  // ===========================================================================
  // Public API - Session Management
  // ===========================================================================

  /**
   * Connect and join the document
   */
  async connect(): Promise<void> {
    if (this.wsAdapter) {
      throw new Error('Already connected');
    }

    // Use provided adapter or create a new one
    if (this.options.adapter) {
      this.wsAdapter = this.options.adapter;
      this.adapterIsExternal = true;
    } else {
      this.wsAdapter = new WebSocketAdapter({
        url: this.options.serverUrl,
      });
      this.adapterIsExternal = false;
    }

    // Initialize presence manager
    this.presenceManager = new ExistingPresenceManager({
      localClientId: this.clientId,
      localUserName: this.options.userName,
    });

    // Initialize permission manager
    this.permissionManager = new PermissionManager({
      userId: this.options.userId as UserId,
      documentId: this.options.documentId as DocumentId,
      role: this.currentRole,
    });

    // Initialize CRDT bridge
    this.crdtBridge = new CRDTBridge({
      sceneGraph: this.options.sceneGraph,
      documentId: this.options.documentId as DocumentId,
      userId: this.options.userId as UserId,
      onUpdate: (_update) => {
        // Send Y.js update to server when we have sync support
        // For now, operations go through the existing operation log
      },
    });

    // Set up event handlers
    this.setupEventHandlers();

    // Connect to server (wsAdapter is guaranteed to be set above)
    await this.wsAdapter!.connect();

    // Send hello message to join document
    this.wsAdapter!.send(
      createHelloMessage(
        this.clientId,
        this.options.documentId,
        this.options.userName
      )
    );

    this.emit('connection:stateChange', { state: 'connected' });
  }

  /**
   * Disconnect from the collaboration server
   */
  disconnect(): void {
    this.cleanup();

    if (this.wsAdapter) {
      // Only disconnect if we own the adapter
      if (!this.adapterIsExternal) {
        this.wsAdapter.disconnect();
      }
      this.wsAdapter = null;
    }

    this.adapterIsExternal = false;
    this.emit('connection:stateChange', { state: 'disconnected' });
  }

  // ===========================================================================
  // Public API - Presence
  // ===========================================================================

  /**
   * Update cursor position
   */
  updateCursor(cursor: CursorPosition | null): void {
    if (!this.presenceManager || !this.wsAdapter?.isConnected()) return;

    const update = this.presenceManager.updateLocalCursor(cursor);
    this.wsAdapter.send(createPresenceMessage(this.clientId, update));
  }

  /**
   * Update selection
   */
  updateSelection(nodeIds: readonly NodeId[]): void {
    if (!this.presenceManager || !this.wsAdapter?.isConnected()) return;

    const update = this.presenceManager.updateLocalSelection(nodeIds);
    this.wsAdapter.send(createPresenceMessage(this.clientId, update));
  }

  /**
   * Update active tool
   */
  updateActiveTool(tool: string): void {
    if (!this.presenceManager || !this.wsAdapter?.isConnected()) return;

    const update = this.presenceManager.updateLocalTool(tool);
    this.wsAdapter.send(createPresenceMessage(this.clientId, update));
  }

  /**
   * Get all remote cursors for rendering
   */
  getRemoteCursors(): Array<{
    clientId: string;
    cursor: CursorPosition;
    color: string;
    userName: string;
  }> {
    return this.presenceManager?.getActiveCursors() ?? [];
  }

  /**
   * Get all remote selections for rendering
   */
  getRemoteSelections(): Array<{
    clientId: string;
    selection: readonly NodeId[];
    color: string;
  }> {
    return this.presenceManager?.getActiveSelections() ?? [];
  }

  /**
   * Check if a node is selected by another user
   */
  isNodeSelectedByOther(nodeId: NodeId): boolean {
    return this.presenceManager?.isNodeSelectedByRemote(nodeId) ?? false;
  }

  /**
   * Get all remote presences
   */
  getRemotePresences(): PresenceData[] {
    return this.presenceManager?.getAllRemotePresences() ?? [];
  }

  // ===========================================================================
  // Public API - Permissions
  // ===========================================================================

  /**
   * Check if user can edit
   */
  canEdit(): boolean {
    return this.permissionManager?.hasPermission('edit') ?? false;
  }

  /**
   * Check if user can comment
   */
  canComment(): boolean {
    return this.permissionManager?.hasPermission('comment') ?? false;
  }

  /**
   * Check if user can export
   */
  canExport(): boolean {
    return this.permissionManager?.hasPermission('export') ?? false;
  }

  /**
   * Check if user can export code
   */
  canExportCode(): boolean {
    return this.permissionManager?.hasPermission('export_code') ?? false;
  }

  /**
   * Validate if an operation can be performed
   */
  canPerformOperation(operationType: string): boolean {
    const result = this.permissionManager?.canPerformOperation(
      operationType as 'node:create' | 'node:delete' | 'node:update' | 'node:move' | 'node:reorder'
    );
    if (result && !result.allowed) {
      this.emit('permission:denied', {
        operation: operationType,
        reason: result.reason ?? 'Permission denied',
      });
    }
    return result?.allowed ?? false;
  }

  /**
   * Get permission summary
   */
  getPermissions() {
    return this.permissionManager?.getPermissionSummary() ?? null;
  }

  // ===========================================================================
  // Public API - CRDT
  // ===========================================================================

  /**
   * Initialize CRDT from local scene graph
   */
  initializeFromLocal(): void {
    this.crdtBridge?.initializeFromSceneGraph();
  }

  /**
   * Get the Y.js document
   */
  getYDoc() {
    return this.crdtBridge?.getYDoc() ?? null;
  }

  // ===========================================================================
  // Private Methods - Setup
  // ===========================================================================

  private setupEventHandlers(): void {
    if (!this.wsAdapter || !this.presenceManager) return;

    // WebSocket events
    this.unsubscribers.push(
      this.wsAdapter.on('connected', () => {
        this.emit('connection:stateChange', { state: 'connected' });
      })
    );

    this.unsubscribers.push(
      this.wsAdapter.on('disconnected', () => {
        this.isJoined = false;
        this.emit('connection:stateChange', { state: 'disconnected' });
      })
    );

    this.unsubscribers.push(
      this.wsAdapter.on('reconnecting', (_event) => {
        this.emit('connection:stateChange', { state: 'reconnecting' });
      })
    );

    this.unsubscribers.push(
      this.wsAdapter.on('message', ({ message }) => {
        this.handleMessage(message);
      })
    );

    this.unsubscribers.push(
      this.wsAdapter.on('error', ({ error }) => {
        this.emit('error', { code: 'WEBSOCKET_ERROR', message: error.message });
      })
    );

    // Presence events
    this.unsubscribers.push(
      this.presenceManager.on('presenceUpdated', ({ clientId, presence }) => {
        this.emit('presence:updated', { clientId, presence });
      })
    );

    this.unsubscribers.push(
      this.presenceManager.on('cursorMoved', ({ clientId, cursor }) => {
        this.emit('cursor:moved', { clientId, cursor });
      })
    );

    this.unsubscribers.push(
      this.presenceManager.on('selectionChanged', ({ clientId, selection }) => {
        this.emit('selection:changed', { clientId, selection });
      })
    );

    this.unsubscribers.push(
      this.presenceManager.on('presenceRemoved', ({ clientId }) => {
        this.emit('participant:left', { clientId });
      })
    );

    // CRDT events
    if (this.crdtBridge) {
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

      this.unsubscribers.push(
        this.crdtBridge.on('operation:remote', (operation) => {
          this.emit('operation:applied', operation);
        })
      );
    }

    // Permission events
    if (this.permissionManager) {
      this.unsubscribers.push(
        this.permissionManager.on('permission:denied', (event) => {
          this.emit('permission:denied', event);
        })
      );
    }
  }

  private handleMessage(message: SyncMessage): void {
    switch (message.type) {
      case 'HELLO_ACK':
        this.handleHelloAck(message as HelloAckMessage);
        break;
      case 'PRESENCE':
        this.handlePresence(message as ExistingPresenceMessage);
        break;
      case 'SYNC_RESPONSE':
        this.handleSyncResponse(message as SyncResponseMessage);
        break;
      case 'PONG':
        // Handled by WebSocketAdapter
        break;
      case 'ERROR':
        this.emit('error', {
          code: message.code,
          message: message.message,
        });
        break;
    }
  }

  private handleHelloAck(message: HelloAckMessage): void {
    this.isJoined = true;

    // Add existing clients to presence
    for (const client of message.clients) {
      if (client.clientId !== this.clientId) {
        this.presenceManager?.updateRemotePresence(client.clientId, {
          userName: client.userName,
          color: client.color,
        });
        this.emit('participant:joined', {
          clientId: client.clientId,
          userName: client.userName,
        });
      }
    }

    // Request sync
    this.wsAdapter?.send(createSyncRequestMessage(null));

    this.emit('session:joined', {
      documentId: this.options.documentId as DocumentId,
      role: this.currentRole,
    });
  }

  private handlePresence(message: ExistingPresenceMessage): void {
    if (message.clientId === this.clientId) return;

    this.presenceManager?.updateRemotePresence(message.clientId, message.presence);
  }

  private handleSyncResponse(_message: SyncResponseMessage): void {
    // Apply synced operations
    // In a full implementation, this would apply operations to the CRDT
    this.emit('sync:completed');
  }

  // ===========================================================================
  // Private Methods - Cleanup
  // ===========================================================================

  private cleanup(): void {
    // Unsubscribe from events
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    // Dispose managers
    this.presenceManager?.dispose();
    this.presenceManager = null;

    this.crdtBridge?.destroy();
    this.crdtBridge = null;

    this.permissionManager = null;

    this.isJoined = false;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a collaboration manager instance
 */
export function createCollaborationManager(
  options: CollaborationManagerOptions
): CollaborationManager {
  return new CollaborationManager(options);
}
