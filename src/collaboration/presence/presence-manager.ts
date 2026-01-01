/**
 * Presence Manager
 *
 * Manages presence state and provides rendering data for remote cursors and selections.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';
import type { PresenceData, CursorPosition } from './presence-types';
import { createDefaultPresence, isPresenceExpired, generateUserColor } from './presence-types';

/**
 * Presence manager events
 */
export type PresenceManagerEvents = {
  'presenceUpdated': { clientId: string; presence: PresenceData };
  'presenceRemoved': { clientId: string };
  'cursorMoved': { clientId: string; cursor: CursorPosition };
  'selectionChanged': { clientId: string; selection: readonly NodeId[] };
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

const DEFAULT_CONFIG = {
  expirationTimeout: 30000,
  cleanupInterval: 5000,
};

/**
 * Presence manager for tracking remote users
 */
export class PresenceManager extends EventEmitter<PresenceManagerEvents> {
  private config: PresenceManagerConfig & typeof DEFAULT_CONFIG;
  private presences: Map<string, PresenceData> = new Map();
  private localPresence: PresenceData;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: PresenceManagerConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize local presence
    this.localPresence = createDefaultPresence(
      config.localClientId,
      config.localUserName,
      generateUserColor()
    );

    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Get the local client ID.
   */
  getLocalClientId(): string {
    return this.config.localClientId;
  }

  /**
   * Get local presence.
   */
  getLocalPresence(): PresenceData {
    return this.localPresence;
  }

  /**
   * Update local presence.
   * Returns the updated presence data for broadcasting.
   */
  updateLocalPresence(updates: Partial<PresenceData>): Partial<PresenceData> {
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
  updateLocalCursor(cursor: CursorPosition | null): Partial<PresenceData> {
    return this.updateLocalPresence({ cursor });
  }

  /**
   * Update local selection.
   */
  updateLocalSelection(selection: readonly NodeId[]): Partial<PresenceData> {
    return this.updateLocalPresence({ selection });
  }

  /**
   * Update local active tool.
   */
  updateLocalTool(activeTool: string): Partial<PresenceData> {
    return this.updateLocalPresence({ activeTool });
  }

  /**
   * Update remote presence.
   */
  updateRemotePresence(clientId: string, updates: Partial<PresenceData>): void {
    if (clientId === this.config.localClientId) return;

    const existing = this.presences.get(clientId);
    const presence: PresenceData = {
      ...(existing ?? createDefaultPresence(
        clientId,
        updates.userName ?? 'Unknown',
        updates.color ?? generateUserColor()
      )),
      ...updates,
      lastSeen: Date.now(),
    } as PresenceData;

    this.presences.set(clientId, presence);
    this.emit('presenceUpdated', { clientId, presence });

    // Emit specific events
    if (updates.cursor !== undefined) {
      this.emit('cursorMoved', { clientId, cursor: updates.cursor! });
    }
    if (updates.selection !== undefined) {
      this.emit('selectionChanged', { clientId, selection: updates.selection! });
    }
  }

  /**
   * Remove a remote presence.
   */
  removePresence(clientId: string): void {
    if (this.presences.delete(clientId)) {
      this.emit('presenceRemoved', { clientId });
    }
  }

  /**
   * Get a remote presence.
   */
  getPresence(clientId: string): PresenceData | null {
    return this.presences.get(clientId) ?? null;
  }

  /**
   * Get all remote presences.
   */
  getAllRemotePresences(): PresenceData[] {
    return Array.from(this.presences.values());
  }

  /**
   * Get all active cursors for rendering.
   */
  getActiveCursors(): Array<{ clientId: string; cursor: CursorPosition; color: string; userName: string }> {
    const cursors: Array<{ clientId: string; cursor: CursorPosition; color: string; userName: string }> = [];

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
  getActiveSelections(): Array<{ clientId: string; selection: readonly NodeId[]; color: string }> {
    const selections: Array<{ clientId: string; selection: readonly NodeId[]; color: string }> = [];

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
  isNodeSelectedByRemote(nodeId: NodeId): boolean {
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
  getClientsSelectingNode(nodeId: NodeId): string[] {
    const clients: string[] = [];

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
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired presences.
   */
  private cleanupExpired(): void {
    const expired: string[] = [];

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
  clear(): void {
    this.presences.clear();
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
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
export function createPresenceManager(config: PresenceManagerConfig): PresenceManager {
  return new PresenceManager(config);
}
