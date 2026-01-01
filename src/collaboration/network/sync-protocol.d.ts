/**
 * Sync Protocol
 *
 * Implements the synchronization protocol over WebSocket.
 * Handles operation broadcasting, sync requests, and presence updates.
 */
import { EventEmitter } from '@core/events/event-emitter';
import type { Operation, LamportTimestamp } from '../operations/operation-types';
import type { PresenceData } from '../presence/presence-types';
import { type WebSocketAdapterConfig } from './websocket-adapter';
import type { ClientInfo } from './message-types';
/**
 * Sync protocol events
 */
export type SyncProtocolEvents = {
    'connected': {
        clients: readonly ClientInfo[];
    };
    'disconnected': undefined;
    'operation': {
        operation: Operation;
    };
    'presence': {
        clientId: string;
        presence: PresenceData;
    };
    'clientJoined': {
        clientId: string;
        userName: string;
    };
    'clientLeft': {
        clientId: string;
    };
    'syncComplete': undefined;
    'error': {
        error: Error;
    };
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
/**
 * Sync protocol for real-time collaboration
 */
export declare class SyncProtocol extends EventEmitter<SyncProtocolEvents> {
    private config;
    private adapter;
    private clientId;
    private localTimestamp;
    private presences;
    private pendingAcks;
    private lastPresenceUpdate;
    private presenceTimeout;
    private pendingPresence;
    private syncing;
    private syncedTimestamp;
    constructor(config: SyncProtocolConfig);
    /**
     * Get the client ID.
     */
    getClientId(): string;
    /**
     * Get the current timestamp.
     */
    getTimestamp(): LamportTimestamp;
    /**
     * Get all presence data.
     */
    getAllPresences(): Map<string, PresenceData>;
    /**
     * Get presence for a specific client.
     */
    getPresence(clientId: string): PresenceData | null;
    /**
     * Check if syncing.
     */
    isSyncing(): boolean;
    /**
     * Connect to the collaboration server.
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the server.
     */
    disconnect(): void;
    /**
     * Broadcast a local operation.
     */
    broadcastOperation(operation: Operation): void;
    /**
     * Create and broadcast an operation.
     */
    createOperation<T extends Operation['type']>(type: T, data: Omit<Extract<Operation, {
        type: T;
    }>, 'id' | 'type' | 'timestamp'>): Operation;
    /**
     * Update local presence.
     */
    updatePresence(presence: Partial<PresenceData>): void;
    /**
     * Request sync from server.
     */
    requestSync(): void;
    /**
     * Setup adapter event listeners.
     */
    private setupAdapterListeners;
    /**
     * Handle incoming message.
     */
    private handleMessage;
    /**
     * Handle HELLO_ACK message.
     */
    private handleHelloAck;
    /**
     * Handle SYNC_RESPONSE message.
     */
    private handleSyncResponse;
    /**
     * Handle OPERATION message.
     */
    private handleOperation;
    /**
     * Handle a remote operation.
     */
    private handleRemoteOperation;
    /**
     * Handle OPERATION_ACK message.
     */
    private handleOperationAck;
    /**
     * Handle PRESENCE message.
     */
    private handlePresence;
    /**
     * Flush pending presence update.
     */
    private flushPresence;
    /**
     * Generate a unique client ID.
     */
    private generateClientId;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create a sync protocol.
 */
export declare function createSyncProtocol(config: SyncProtocolConfig): SyncProtocol;
//# sourceMappingURL=sync-protocol.d.ts.map