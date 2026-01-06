/**
 * Secure Collaboration Manager
 *
 * Wraps the base CollaborationManager with end-to-end encryption.
 * Uses EncryptedWebSocketAdapter for transparent message encryption.
 *
 * Handles:
 * - Automatic key exchange on join
 * - Encrypted message transmission
 * - Key rotation notifications
 * - Transparent encryption/decryption of operations
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { SelectionManager } from '@scene/selection/selection-manager';
import type { NodeId } from '@core/types/common';

import {
  CollaborationManager,
  type CollaborationManagerOptions,
} from '../collaboration-manager';
import type { CollaborationRole, DocumentId } from '../types';
import type { CursorPosition, PresenceData } from '../presence/presence-types';
import type { ConnectionState } from '../network/websocket-adapter';
import {
  EncryptedWebSocketAdapter,
  type EncryptedWebSocketAdapterConfig,
} from '../network/encrypted-websocket-adapter';
import type { KeyManagerConfig } from './key-manager';

// =============================================================================
// Types
// =============================================================================

export interface SecureCollaborationOptions
  extends Omit<CollaborationManagerOptions, 'sceneGraph' | 'adapter'> {
  /** Scene graph instance */
  readonly sceneGraph: SceneGraph;
  /** Selection manager instance */
  readonly selectionManager?: SelectionManager;
  /** User's encryption password (for identity storage) */
  readonly encryptionPassword?: string;
  /** Key manager configuration */
  readonly keyConfig?: KeyManagerConfig;
  /** Maximum message age for replay protection (ms) */
  readonly maxMessageAge?: number;
  /** Enable replay protection (default: true) */
  readonly replayProtection?: boolean;
}

export interface SecureCollaborationEvents {
  // Connection events
  'connection:stateChange': { state: ConnectionState };
  'session:joined': { documentId: DocumentId; role: CollaborationRole; encrypted: boolean };
  'session:left': { documentId: DocumentId };

  // Participant events
  'participant:joined': { clientId: string; userName: string };
  'participant:left': { clientId: string };

  // Presence events
  'presence:updated': { clientId: string; presence: PresenceData };
  'cursor:moved': { clientId: string; cursor: CursorPosition };
  'selection:changed': { clientId: string; selection: readonly NodeId[] };

  // Encryption events
  'encryption:ready': { documentId: string };
  'encryption:keyExchanged': { documentId: string; participantCount: number };
  'encryption:keyRotated': { documentId: string; version: number };
  'encryption:error': { code: string; message: string };

  // Sync events
  'sync:started': undefined;
  'sync:completed': undefined;

  // Error events
  'error': { code: string; message: string };

  [key: string]: unknown;
}

// =============================================================================
// Secure Collaboration Manager
// =============================================================================

export class SecureCollaborationManager extends EventEmitter<SecureCollaborationEvents> {
  private readonly options: SecureCollaborationOptions;

  // Core managers
  private encryptedAdapter: EncryptedWebSocketAdapter | null = null;
  private collaborationManager: CollaborationManager | null = null;

  // State
  private isEncryptionReady = false;
  private unsubscribers: Array<() => void> = [];

  constructor(options: SecureCollaborationOptions) {
    super();
    this.options = options;
  }

  // ===========================================================================
  // Public API - Connection
  // ===========================================================================

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.encryptedAdapter?.getState() ?? 'disconnected';
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.encryptedAdapter?.isConnected() ?? false;
  }

  /**
   * Check if encryption is enabled for current session
   */
  isEncrypted(): boolean {
    return this.isEncryptionReady;
  }

  /**
   * Check if encryption is ready (session key established)
   */
  isEncryptionEstablished(): boolean {
    return this.encryptedAdapter?.isEncryptionReady() ?? false;
  }

  /**
   * Get current user ID
   */
  getUserId(): string {
    return this.options.userId;
  }

  // ===========================================================================
  // Public API - Session Management
  // ===========================================================================

  /**
   * Connect to collaboration server with encryption
   */
  async connect(): Promise<void> {
    if (this.encryptedAdapter) {
      throw new Error('Already connected');
    }

    // Determine if user is owner (for session key creation)
    const isOwner = this.options.role === 'owner';

    // Create encrypted WebSocket adapter config (only include defined values)
    const adapterConfig: EncryptedWebSocketAdapterConfig = {
      url: this.options.serverUrl,
      userId: this.options.userId,
      documentId: this.options.documentId,
      isOwner,
    };
    if (this.options.encryptionPassword !== undefined) {
      (adapterConfig as { encryptionPassword?: string }).encryptionPassword =
        this.options.encryptionPassword;
    }
    if (this.options.keyConfig !== undefined) {
      (adapterConfig as { keyConfig?: KeyManagerConfig }).keyConfig = this.options.keyConfig;
    }
    if (this.options.maxMessageAge !== undefined) {
      (adapterConfig as { maxMessageAge?: number }).maxMessageAge = this.options.maxMessageAge;
    }
    if (this.options.replayProtection !== undefined) {
      (adapterConfig as { replayProtection?: boolean }).replayProtection =
        this.options.replayProtection;
    }

    this.encryptedAdapter = new EncryptedWebSocketAdapter(adapterConfig);

    // Set up encryption event handlers
    this.setupEncryptionEvents();

    // Initialize encryption (load or create identity)
    await this.encryptedAdapter.initializeEncryption();

    // Create collaboration manager with encrypted adapter
    const collabOptions: CollaborationManagerOptions = {
      serverUrl: this.options.serverUrl,
      userId: this.options.userId,
      userName: this.options.userName,
      documentId: this.options.documentId,
      sceneGraph: this.options.sceneGraph,
      adapter: this.encryptedAdapter,
    };

    if (this.options.role) {
      (collabOptions as { role?: CollaborationRole }).role = this.options.role;
    }
    if (this.options.selectionManager) {
      (collabOptions as { selectionManager?: SelectionManager }).selectionManager =
        this.options.selectionManager;
    }

    this.collaborationManager = new CollaborationManager(collabOptions);

    // Set up collaboration event forwarding
    this.setupCollaborationEvents();

    // Connect (this will connect the encrypted adapter and perform key exchange)
    await this.collaborationManager.connect();
  }

  /**
   * Disconnect from collaboration server
   */
  disconnect(): void {
    // Clean up event handlers
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    // Disconnect collaboration manager
    this.collaborationManager?.disconnect();
    this.collaborationManager = null;

    // Disconnect and dispose encrypted adapter
    if (this.encryptedAdapter) {
      this.encryptedAdapter.disconnect();
      this.encryptedAdapter.dispose();
      this.encryptedAdapter = null;
    }

    this.isEncryptionReady = false;
    this.emit('connection:stateChange', { state: 'disconnected' });
  }

  // ===========================================================================
  // Public API - Presence
  // ===========================================================================

  /**
   * Update cursor position (encrypted)
   */
  updateCursor(cursor: CursorPosition | null): void {
    this.collaborationManager?.updateCursor(cursor);
  }

  /**
   * Update selection (encrypted)
   */
  updateSelection(nodeIds: readonly NodeId[]): void {
    this.collaborationManager?.updateSelection(nodeIds);
  }

  /**
   * Get remote cursors
   */
  getRemoteCursors() {
    return this.collaborationManager?.getRemoteCursors() ?? [];
  }

  /**
   * Get remote selections
   */
  getRemoteSelections() {
    return this.collaborationManager?.getRemoteSelections() ?? [];
  }

  /**
   * Get remote presences
   */
  getRemotePresences(): PresenceData[] {
    return this.collaborationManager?.getRemotePresences() ?? [];
  }

  // ===========================================================================
  // Public API - Permissions
  // ===========================================================================

  /**
   * Check if user can edit
   */
  canEdit(): boolean {
    return this.collaborationManager?.canEdit() ?? false;
  }

  /**
   * Check if user can export
   */
  canExport(): boolean {
    return this.collaborationManager?.canExport() ?? false;
  }

  /**
   * Get permission summary
   */
  getPermissions() {
    return this.collaborationManager?.getPermissions() ?? null;
  }

  // ===========================================================================
  // Public API - Key Management
  // ===========================================================================

  /**
   * Manually trigger key rotation
   */
  async rotateSessionKey(): Promise<void> {
    if (!this.encryptedAdapter) {
      throw new Error('Not connected');
    }
    await this.encryptedAdapter.rotateSessionKey();
  }

  /**
   * Export user's public key (for sharing)
   */
  async getPublicKey(): Promise<string | null> {
    return this.encryptedAdapter?.getPublicKey() ?? null;
  }

  /**
   * Add a participant's public key
   */
  async addParticipantKey(participantId: string, publicKeyPem: string): Promise<void> {
    if (!this.encryptedAdapter) {
      throw new Error('Not connected');
    }
    await this.encryptedAdapter.addParticipantKey(participantId, publicKeyPem);
  }

  /**
   * Remove a participant's key (called when they leave)
   */
  removeParticipantKey(participantId: string): void {
    this.encryptedAdapter?.removeParticipantKey(participantId);
  }

  // ===========================================================================
  // Private Methods - Event Setup
  // ===========================================================================

  private setupEncryptionEvents(): void {
    if (!this.encryptedAdapter) return;

    // Encryption ready
    this.unsubscribers.push(
      this.encryptedAdapter.on('encryption:ready', ({ documentId }) => {
        this.isEncryptionReady = true;
        this.emit('encryption:ready', { documentId });
      })
    );

    // Key exchanged
    this.unsubscribers.push(
      this.encryptedAdapter.on('encryption:keyExchanged', (event) => {
        this.isEncryptionReady = true;
        this.emit('encryption:keyExchanged', event);
      })
    );

    // Key rotated
    this.unsubscribers.push(
      this.encryptedAdapter.on('encryption:keyRotated', (event) => {
        this.emit('encryption:keyRotated', event);
      })
    );

    // Encryption error
    this.unsubscribers.push(
      this.encryptedAdapter.on('encryption:error', (event) => {
        this.emit('encryption:error', event);
      })
    );
  }

  private setupCollaborationEvents(): void {
    if (!this.collaborationManager) return;

    // Forward connection events
    this.unsubscribers.push(
      this.collaborationManager.on('connection:stateChange', (event) => {
        this.emit('connection:stateChange', event);
      })
    );

    // Forward session events with encryption status
    this.unsubscribers.push(
      this.collaborationManager.on('session:joined', ({ documentId, role }) => {
        this.emit('session:joined', {
          documentId,
          role,
          encrypted: this.isEncryptionReady,
        });
      })
    );

    this.unsubscribers.push(
      this.collaborationManager.on('session:left', (event) => {
        this.emit('session:left', event);
      })
    );

    // Forward participant events with key management
    this.unsubscribers.push(
      this.collaborationManager.on('participant:joined', ({ clientId, userName }) => {
        this.emit('participant:joined', { clientId, userName });
        // Key exchange is handled automatically by EncryptedWebSocketAdapter
      })
    );

    this.unsubscribers.push(
      this.collaborationManager.on('participant:left', ({ clientId }) => {
        // Clean up participant's key
        this.removeParticipantKey(clientId);
        this.emit('participant:left', { clientId });
      })
    );

    // Forward presence events
    this.unsubscribers.push(
      this.collaborationManager.on('presence:updated', (event) => {
        this.emit('presence:updated', event);
      })
    );

    this.unsubscribers.push(
      this.collaborationManager.on('cursor:moved', (event) => {
        this.emit('cursor:moved', event);
      })
    );

    this.unsubscribers.push(
      this.collaborationManager.on('selection:changed', (event) => {
        this.emit('selection:changed', event);
      })
    );

    // Forward sync events
    this.unsubscribers.push(
      this.collaborationManager.on('sync:started', () => {
        this.emit('sync:started');
      })
    );

    this.unsubscribers.push(
      this.collaborationManager.on('sync:completed', () => {
        this.emit('sync:completed');
      })
    );

    // Forward errors
    this.unsubscribers.push(
      this.collaborationManager.on('error', (event) => {
        this.emit('error', event);
      })
    );
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.disconnect();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a secure collaboration manager instance
 */
export function createSecureCollaborationManager(
  options: SecureCollaborationOptions
): SecureCollaborationManager {
  return new SecureCollaborationManager(options);
}
