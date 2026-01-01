/**
 * Sync Protocol
 *
 * Implements the synchronization protocol over WebSocket.
 * Handles operation broadcasting, sync requests, and presence updates.
 */
import { EventEmitter } from '@core/events/event-emitter';
import { createTimestamp, incrementTimestamp, mergeTimestamps, generateOperationId } from '../operations/operation-types';
import { createDefaultPresence, generateUserColor } from '../presence/presence-types';
import { WebSocketAdapter } from './websocket-adapter';
import { createHelloMessage, createOperationMessage, createPresenceMessage, createSyncRequestMessage, } from './message-types';
const DEFAULT_SYNC_CONFIG = {
    presenceThrottle: 50,
};
/**
 * Sync protocol for real-time collaboration
 */
export class SyncProtocol extends EventEmitter {
    config;
    adapter;
    clientId;
    localTimestamp;
    presences = new Map();
    pendingAcks = new Map();
    lastPresenceUpdate = 0;
    presenceTimeout = null;
    pendingPresence = null;
    syncing = false;
    syncedTimestamp = null;
    constructor(config) {
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
    getClientId() {
        return this.clientId;
    }
    /**
     * Get the current timestamp.
     */
    getTimestamp() {
        return this.localTimestamp;
    }
    /**
     * Get all presence data.
     */
    getAllPresences() {
        return new Map(this.presences);
    }
    /**
     * Get presence for a specific client.
     */
    getPresence(clientId) {
        return this.presences.get(clientId) ?? null;
    }
    /**
     * Check if syncing.
     */
    isSyncing() {
        return this.syncing;
    }
    /**
     * Connect to the collaboration server.
     */
    async connect() {
        await this.adapter.connect();
    }
    /**
     * Disconnect from the server.
     */
    disconnect() {
        this.adapter.disconnect();
        this.presences.clear();
    }
    /**
     * Broadcast a local operation.
     */
    broadcastOperation(operation) {
        // Update local timestamp
        this.localTimestamp = incrementTimestamp(this.localTimestamp);
        // Send operation
        this.adapter.send(createOperationMessage(operation));
    }
    /**
     * Create and broadcast an operation.
     */
    createOperation(type, data) {
        const operation = {
            id: generateOperationId(this.clientId),
            type,
            timestamp: this.localTimestamp,
            ...data,
        };
        this.broadcastOperation(operation);
        return operation;
    }
    /**
     * Update local presence.
     */
    updatePresence(presence) {
        // Merge with pending update
        this.pendingPresence = this.pendingPresence
            ? { ...this.pendingPresence, ...presence }
            : presence;
        // Throttle updates
        const now = Date.now();
        const elapsed = now - this.lastPresenceUpdate;
        if (elapsed >= this.config.presenceThrottle) {
            this.flushPresence();
        }
        else if (!this.presenceTimeout) {
            this.presenceTimeout = setTimeout(() => {
                this.flushPresence();
            }, this.config.presenceThrottle - elapsed);
        }
    }
    /**
     * Request sync from server.
     */
    requestSync() {
        this.syncing = true;
        this.adapter.send(createSyncRequestMessage(this.syncedTimestamp));
    }
    /**
     * Setup adapter event listeners.
     */
    setupAdapterListeners() {
        this.adapter.on('connected', () => {
            // Send hello message
            this.adapter.send(createHelloMessage(this.clientId, this.config.documentId, this.config.userName));
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
    handleMessage(message) {
        switch (message.type) {
            case 'HELLO_ACK':
                this.handleHelloAck(message);
                break;
            case 'SYNC_RESPONSE':
                this.handleSyncResponse(message);
                break;
            case 'OPERATION':
                this.handleOperation(message);
                break;
            case 'OPERATION_ACK':
                this.handleOperationAck(message.operationId);
                break;
            case 'PRESENCE':
                this.handlePresence(message);
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
    handleHelloAck(message) {
        // Initialize presences from connected clients
        for (const client of message.clients) {
            this.presences.set(client.clientId, createDefaultPresence(client.clientId, client.userName, client.color));
        }
        this.emit('connected', { clients: message.clients });
        // Request initial sync
        this.requestSync();
    }
    /**
     * Handle SYNC_RESPONSE message.
     */
    handleSyncResponse(message) {
        // Process operations
        for (const operation of message.operations) {
            this.handleRemoteOperation(operation);
        }
        if (message.complete) {
            this.syncing = false;
            this.syncedTimestamp = message.nextCursor ?? this.localTimestamp;
            this.emit('syncComplete');
        }
        else if (message.nextCursor) {
            // Request next batch
            this.adapter.send(createSyncRequestMessage(message.nextCursor));
        }
    }
    /**
     * Handle OPERATION message.
     */
    handleOperation(message) {
        this.handleRemoteOperation(message.operation);
    }
    /**
     * Handle a remote operation.
     */
    handleRemoteOperation(operation) {
        // Update local timestamp
        this.localTimestamp = mergeTimestamps(this.localTimestamp, operation.timestamp);
        // Emit for processing
        this.emit('operation', { operation });
    }
    /**
     * Handle OPERATION_ACK message.
     */
    handleOperationAck(operationId) {
        const pending = this.pendingAcks.get(operationId);
        if (pending) {
            pending.resolve();
            this.pendingAcks.delete(operationId);
        }
    }
    /**
     * Handle PRESENCE message.
     */
    handlePresence(message) {
        const existing = this.presences.get(message.clientId);
        const presence = {
            ...(existing ?? createDefaultPresence(message.clientId, message.presence.userName ?? 'Unknown', message.presence.color ?? generateUserColor())),
            ...message.presence,
            lastSeen: Date.now(),
        };
        this.presences.set(message.clientId, presence);
        this.emit('presence', { clientId: message.clientId, presence });
    }
    /**
     * Flush pending presence update.
     */
    flushPresence() {
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
    generateClientId() {
        return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Dispose of resources.
     */
    dispose() {
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
export function createSyncProtocol(config) {
    return new SyncProtocol(config);
}
//# sourceMappingURL=sync-protocol.js.map