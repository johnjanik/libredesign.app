/**
 * Sync Protocol
 *
 * Implements the synchronization protocol over WebSocket.
 * Handles operation broadcasting, sync requests, and presence updates.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { Operation, LamportTimestamp } from '../operations/operation-types';
import { createTimestamp, incrementTimestamp, mergeTimestamps, generateOperationId } from '../operations/operation-types';
import type { PresenceData } from '../presence/presence-types';
import { createDefaultPresence, generateUserColor } from '../presence/presence-types';
import { WebSocketAdapter, type WebSocketAdapterConfig } from './websocket-adapter';
import type {
  SyncMessage,
  HelloAckMessage,
  SyncResponseMessage,
  OperationMessage,
  PresenceMessage,
  ClientInfo,
} from './message-types';
import {
  createHelloMessage,
  createOperationMessage,
  createPresenceMessage,
  createSyncRequestMessage,
} from './message-types';

/**
 * Sync protocol events
 */
export type SyncProtocolEvents = {
  'connected': { clients: readonly ClientInfo[] };
  'disconnected': undefined;
  'operation': { operation: Operation };
  'presence': { clientId: string; presence: PresenceData };
  'clientJoined': { clientId: string; userName: string };
  'clientLeft': { clientId: string };
  'syncComplete': undefined;
  'error': { error: Error };
  [key: string]: unknown;
};

/**
 * Sync protocol configuration
 */
export interface SyncProtocolConfig extends WebSocketAdapterConfig {
  /** Client ID (auto-generated if not provided) */
  readonly clientId?: string;
  /** User name */
  readonly userName: string;
  /** Document ID */
  readonly documentId: string;
  /** Presence update throttle (ms) */
  readonly presenceThrottle?: number;
}

const DEFAULT_SYNC_CONFIG = {
  presenceThrottle: 50,
};

/**
 * Sync protocol for real-time collaboration
 */
export class SyncProtocol extends EventEmitter<SyncProtocolEvents> {
  private config: SyncProtocolConfig & typeof DEFAULT_SYNC_CONFIG;
  private adapter: WebSocketAdapter;
  private clientId: string;
  private localTimestamp: LamportTimestamp;
  private presences: Map<string, PresenceData> = new Map();
  private pendingAcks: Map<string, { resolve: () => void; reject: (error: Error) => void }> = new Map();
  private lastPresenceUpdate = 0;
  private presenceTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingPresence: Partial<PresenceData> | null = null;
  private syncing = false;
  private syncedTimestamp: LamportTimestamp | null = null;

  constructor(config: SyncProtocolConfig) {
    super();
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.clientId = config.clientId ?? this.generateClientId();
    this.localTimestamp = createTimestamp(0, this.clientId);
    this.adapter = new WebSocketAdapter(config);

    this.setupAdapterListeners();
  }

  /**
   * Get the client ID.
   */
  getClientId(): string {
    return this.clientId;
  }

  /**
   * Get the current timestamp.
   */
  getTimestamp(): LamportTimestamp {
    return this.localTimestamp;
  }

  /**
   * Get all presence data.
   */
  getAllPresences(): Map<string, PresenceData> {
    return new Map(this.presences);
  }

  /**
   * Get presence for a specific client.
   */
  getPresence(clientId: string): PresenceData | null {
    return this.presences.get(clientId) ?? null;
  }

  /**
   * Check if syncing.
   */
  isSyncing(): boolean {
    return this.syncing;
  }

  /**
   * Connect to the collaboration server.
   */
  async connect(): Promise<void> {
    await this.adapter.connect();
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    this.adapter.disconnect();
    this.presences.clear();
  }

  /**
   * Broadcast a local operation.
   */
  broadcastOperation(operation: Operation): void {
    // Update local timestamp
    this.localTimestamp = incrementTimestamp(this.localTimestamp);

    // Send operation
    this.adapter.send(createOperationMessage(operation));
  }

  /**
   * Create and broadcast an operation.
   */
  createOperation<T extends Operation['type']>(
    type: T,
    data: Omit<Extract<Operation, { type: T }>, 'id' | 'type' | 'timestamp'>
  ): Operation {
    const operation = {
      id: generateOperationId(this.clientId),
      type,
      timestamp: this.localTimestamp,
      ...data,
    } as Operation;

    this.broadcastOperation(operation);
    return operation;
  }

  /**
   * Update local presence.
   */
  updatePresence(presence: Partial<PresenceData>): void {
    // Merge with pending update
    this.pendingPresence = this.pendingPresence
      ? { ...this.pendingPresence, ...presence }
      : presence;

    // Throttle updates
    const now = Date.now();
    const elapsed = now - this.lastPresenceUpdate;

    if (elapsed >= this.config.presenceThrottle) {
      this.flushPresence();
    } else if (!this.presenceTimeout) {
      this.presenceTimeout = setTimeout(() => {
        this.flushPresence();
      }, this.config.presenceThrottle - elapsed);
    }
  }

  /**
   * Request sync from server.
   */
  requestSync(): void {
    this.syncing = true;
    this.adapter.send(createSyncRequestMessage(this.syncedTimestamp));
  }

  /**
   * Setup adapter event listeners.
   */
  private setupAdapterListeners(): void {
    this.adapter.on('connected', () => {
      // Send hello message
      this.adapter.send(createHelloMessage(
        this.clientId,
        this.config.documentId,
        this.config.userName
      ));
    });

    this.adapter.on('disconnected', () => {
      this.presences.clear();
      this.emit('disconnected');
    });

    this.adapter.on('message', ({ message }) => {
      this.handleMessage(message);
    });

    this.adapter.on('error', ({ error }) => {
      this.emit('error', { error });
    });
  }

  /**
   * Handle incoming message.
   */
  private handleMessage(message: SyncMessage): void {
    switch (message.type) {
      case 'HELLO_ACK':
        this.handleHelloAck(message as HelloAckMessage);
        break;

      case 'SYNC_RESPONSE':
        this.handleSyncResponse(message as SyncResponseMessage);
        break;

      case 'OPERATION':
        this.handleOperation(message as OperationMessage);
        break;

      case 'OPERATION_ACK':
        this.handleOperationAck(message.operationId);
        break;

      case 'PRESENCE':
        this.handlePresence(message as PresenceMessage);
        break;

      case 'PONG':
        // Ping/pong handled by adapter
        break;

      case 'ERROR':
        this.emit('error', { error: new Error(message.message) });
        break;
    }
  }

  /**
   * Handle HELLO_ACK message.
   */
  private handleHelloAck(message: HelloAckMessage): void {
    // Initialize presences from connected clients
    for (const client of message.clients) {
      this.presences.set(client.clientId, createDefaultPresence(
        client.clientId,
        client.userName,
        client.color
      ));
    }

    this.emit('connected', { clients: message.clients });

    // Request initial sync
    this.requestSync();
  }

  /**
   * Handle SYNC_RESPONSE message.
   */
  private handleSyncResponse(message: SyncResponseMessage): void {
    // Process operations
    for (const operation of message.operations) {
      this.handleRemoteOperation(operation);
    }

    if (message.complete) {
      this.syncing = false;
      this.syncedTimestamp = message.nextCursor ?? this.localTimestamp;
      this.emit('syncComplete');
    } else if (message.nextCursor) {
      // Request next batch
      this.adapter.send(createSyncRequestMessage(message.nextCursor));
    }
  }

  /**
   * Handle OPERATION message.
   */
  private handleOperation(message: OperationMessage): void {
    this.handleRemoteOperation(message.operation);
  }

  /**
   * Handle a remote operation.
   */
  private handleRemoteOperation(operation: Operation): void {
    // Update local timestamp
    this.localTimestamp = mergeTimestamps(this.localTimestamp, operation.timestamp);

    // Emit for processing
    this.emit('operation', { operation });
  }

  /**
   * Handle OPERATION_ACK message.
   */
  private handleOperationAck(operationId: string): void {
    const pending = this.pendingAcks.get(operationId);
    if (pending) {
      pending.resolve();
      this.pendingAcks.delete(operationId);
    }
  }

  /**
   * Handle PRESENCE message.
   */
  private handlePresence(message: PresenceMessage): void {
    const existing = this.presences.get(message.clientId);

    const presence: PresenceData = {
      ...(existing ?? createDefaultPresence(
        message.clientId,
        message.presence.userName ?? 'Unknown',
        message.presence.color ?? generateUserColor()
      )),
      ...message.presence,
      lastSeen: Date.now(),
    } as PresenceData;

    this.presences.set(message.clientId, presence);
    this.emit('presence', { clientId: message.clientId, presence });
  }

  /**
   * Flush pending presence update.
   */
  private flushPresence(): void {
    if (this.presenceTimeout) {
      clearTimeout(this.presenceTimeout);
      this.presenceTimeout = null;
    }

    if (this.pendingPresence && this.adapter.isConnected()) {
      this.adapter.send(createPresenceMessage(this.clientId, this.pendingPresence));
      this.pendingPresence = null;
      this.lastPresenceUpdate = Date.now();
    }
  }

  /**
   * Generate a unique client ID.
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    if (this.presenceTimeout) {
      clearTimeout(this.presenceTimeout);
    }
    this.adapter.dispose();
    this.clear();
  }
}

/**
 * Create a sync protocol.
 */
export function createSyncProtocol(config: SyncProtocolConfig): SyncProtocol {
  return new SyncProtocol(config);
}
