/**
 * Presence Manager
 *
 * Manages presence state and provides rendering data for remote cursors and selections.
 */
import { EventEmitter } from '@core/events/event-emitter';
import { createDefaultPresence, isPresenceExpired, generateUserColor } from './presence-types';
const DEFAULT_CONFIG = {
    expirationTimeout: 30000,
    cleanupInterval: 5000,
};
/**
 * Presence manager for tracking remote users
 */
export class PresenceManager extends EventEmitter {
    config;
    presences = new Map();
    localPresence;
    cleanupTimer = null;
    constructor(config) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        // Initialize local presence
        this.localPresence = createDefaultPresence(config.localClientId, config.localUserName, generateUserColor());
        // Start cleanup timer
        this.startCleanup();
    }
    /**
     * Get the local client ID.
     */
    getLocalClientId() {
        return this.config.localClientId;
    }
    /**
     * Get local presence.
     */
    getLocalPresence() {
        return this.localPresence;
    }
    /**
     * Update local presence.
     * Returns the updated presence data for broadcasting.
     */
    updateLocalPresence(updates) {
        this.localPresence = {
            ...this.localPresence,
            ...updates,
            lastSeen: Date.now(),
        };
        return updates;
    }
    /**
     * Update local cursor position.
     */
    updateLocalCursor(cursor) {
        return this.updateLocalPresence({ cursor });
    }
    /**
     * Update local selection.
     */
    updateLocalSelection(selection) {
        return this.updateLocalPresence({ selection });
    }
    /**
     * Update local active tool.
     */
    updateLocalTool(activeTool) {
        return this.updateLocalPresence({ activeTool });
    }
    /**
     * Update remote presence.
     */
    updateRemotePresence(clientId, updates) {
        if (clientId === this.config.localClientId)
            return;
        const existing = this.presences.get(clientId);
        const presence = {
            ...(existing ?? createDefaultPresence(clientId, updates.userName ?? 'Unknown', updates.color ?? generateUserColor())),
            ...updates,
            lastSeen: Date.now(),
        };
        this.presences.set(clientId, presence);
        this.emit('presenceUpdated', { clientId, presence });
        // Emit specific events
        if (updates.cursor !== undefined) {
            this.emit('cursorMoved', { clientId, cursor: updates.cursor });
        }
        if (updates.selection !== undefined) {
            this.emit('selectionChanged', { clientId, selection: updates.selection });
        }
    }
    /**
     * Remove a remote presence.
     */
    removePresence(clientId) {
        if (this.presences.delete(clientId)) {
            this.emit('presenceRemoved', { clientId });
        }
    }
    /**
     * Get a remote presence.
     */
    getPresence(clientId) {
        return this.presences.get(clientId) ?? null;
    }
    /**
     * Get all remote presences.
     */
    getAllRemotePresences() {
        return Array.from(this.presences.values());
    }
    /**
     * Get all active cursors for rendering.
     */
    getActiveCursors() {
        const cursors = [];
        for (const presence of this.presences.values()) {
            if (presence.cursor && presence.isActive && !isPresenceExpired(presence, this.config.expirationTimeout)) {
                cursors.push({
                    clientId: presence.clientId,
                    cursor: presence.cursor,
                    color: presence.color,
                    userName: presence.userName,
                });
            }
        }
        return cursors;
    }
    /**
     * Get all active selections for rendering.
     */
    getActiveSelections() {
        const selections = [];
        for (const presence of this.presences.values()) {
            if (presence.selection.length > 0 && !isPresenceExpired(presence, this.config.expirationTimeout)) {
                selections.push({
                    clientId: presence.clientId,
                    selection: presence.selection,
                    color: presence.color,
                });
            }
        }
        return selections;
    }
    /**
     * Check if a node is selected by any remote user.
     */
    isNodeSelectedByRemote(nodeId) {
        for (const presence of this.presences.values()) {
            if (presence.selection.includes(nodeId)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get clients who have selected a node.
     */
    getClientsSelectingNode(nodeId) {
        const clients = [];
        for (const presence of this.presences.values()) {
            if (presence.selection.includes(nodeId)) {
                clients.push(presence.clientId);
            }
        }
        return clients;
    }
    /**
     * Start cleanup timer.
     */
    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpired();
        }, this.config.cleanupInterval);
    }
    /**
     * Cleanup expired presences.
     */
    cleanupExpired() {
        const expired = [];
        for (const [clientId, presence] of this.presences) {
            if (isPresenceExpired(presence, this.config.expirationTimeout)) {
                expired.push(clientId);
            }
        }
        for (const clientId of expired) {
            this.removePresence(clientId);
        }
    }
    /**
     * Clear all remote presences.
     */
    clear() {
        this.presences.clear();
    }
    /**
     * Dispose of resources.
     */
    dispose() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.presences.clear();
        super.clear();
    }
}
/**
 * Create a presence manager.
 */
export function createPresenceManager(config) {
    return new PresenceManager(config);
}
//# sourceMappingURL=presence-manager.js.map