/**
 * Presence Manager
 *
 * Manages presence state and provides rendering data for remote cursors and selections.
 */
import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';
import type { PresenceData, CursorPosition } from './presence-types';
/**
 * Presence manager events
 */
export type PresenceManagerEvents = {
    'presenceUpdated': {
        clientId: string;
        presence: PresenceData;
    };
    'presenceRemoved': {
        clientId: string;
    };
    'cursorMoved': {
        clientId: string;
        cursor: CursorPosition;
    };
    'selectionChanged': {
        clientId: string;
        selection: readonly NodeId[];
    };
    [key: string]: unknown;
};
/**
 * Presence manager configuration
 */
export interface PresenceManagerConfig {
    /** Local client ID */
    readonly localClientId: string;
    /** Local user name */
    readonly localUserName: string;
    /** Expiration timeout (ms) */
    readonly expirationTimeout?: number;
    /** Cleanup interval (ms) */
    readonly cleanupInterval?: number;
}
/**
 * Presence manager for tracking remote users
 */
export declare class PresenceManager extends EventEmitter<PresenceManagerEvents> {
    private config;
    private presences;
    private localPresence;
    private cleanupTimer;
    constructor(config: PresenceManagerConfig);
    /**
     * Get the local client ID.
     */
    getLocalClientId(): string;
    /**
     * Get local presence.
     */
    getLocalPresence(): PresenceData;
    /**
     * Update local presence.
     * Returns the updated presence data for broadcasting.
     */
    updateLocalPresence(updates: Partial<PresenceData>): Partial<PresenceData>;
    /**
     * Update local cursor position.
     */
    updateLocalCursor(cursor: CursorPosition | null): Partial<PresenceData>;
    /**
     * Update local selection.
     */
    updateLocalSelection(selection: readonly NodeId[]): Partial<PresenceData>;
    /**
     * Update local active tool.
     */
    updateLocalTool(activeTool: string): Partial<PresenceData>;
    /**
     * Update remote presence.
     */
    updateRemotePresence(clientId: string, updates: Partial<PresenceData>): void;
    /**
     * Remove a remote presence.
     */
    removePresence(clientId: string): void;
    /**
     * Get a remote presence.
     */
    getPresence(clientId: string): PresenceData | null;
    /**
     * Get all remote presences.
     */
    getAllRemotePresences(): PresenceData[];
    /**
     * Get all active cursors for rendering.
     */
    getActiveCursors(): Array<{
        clientId: string;
        cursor: CursorPosition;
        color: string;
        userName: string;
    }>;
    /**
     * Get all active selections for rendering.
     */
    getActiveSelections(): Array<{
        clientId: string;
        selection: readonly NodeId[];
        color: string;
    }>;
    /**
     * Check if a node is selected by any remote user.
     */
    isNodeSelectedByRemote(nodeId: NodeId): boolean;
    /**
     * Get clients who have selected a node.
     */
    getClientsSelectingNode(nodeId: NodeId): string[];
    /**
     * Start cleanup timer.
     */
    private startCleanup;
    /**
     * Cleanup expired presences.
     */
    private cleanupExpired;
    /**
     * Clear all remote presences.
     */
    clear(): void;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create a presence manager.
 */
export declare function createPresenceManager(config: PresenceManagerConfig): PresenceManager;
//# sourceMappingURL=presence-manager.d.ts.map