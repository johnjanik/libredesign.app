/**
 * Presence Manager for real-time collaboration
 *
 * Handles:
 * - Cursor position broadcasting
 * - Selection state sharing
 * - User online/offline status
 * - Throttled updates to reduce network traffic
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import type {
  UserId,
  DocumentId,
  UserPresence,
  CursorPosition,
  PresenceMessage,
} from '../types';

// =============================================================================
// Types
// =============================================================================

export interface PresenceManagerOptions {
  /** Throttle interval for cursor updates in ms (default: 50) */
  readonly cursorThrottleMs?: number;
  /** Throttle interval for selection updates in ms (default: 100) */
  readonly selectionThrottleMs?: number;
  /** Idle timeout before marking user as inactive in ms (default: 60000) */
  readonly idleTimeoutMs?: number;
  /** Cleanup interval for stale presence data in ms (default: 30000) */
  readonly cleanupIntervalMs?: number;
}

export interface PresenceManagerEvents {
  'presence:updated': { userId: UserId; presence: UserPresence };
  'presence:removed': { userId: UserId };
  'user:active': { userId: UserId };
  'user:idle': { userId: UserId };
  [key: string]: unknown;
}

/** Callback for sending presence updates */
export type SendPresenceCallback = (message: Omit<PresenceMessage, 'timestamp' | 'messageId'>) => void;

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OPTIONS = {
  cursorThrottleMs: 50,
  selectionThrottleMs: 100,
  idleTimeoutMs: 60000,
  cleanupIntervalMs: 30000,
} as const;

// User colors for presence indicators (distinct, colorblind-friendly)
const USER_COLORS = [
  '#E63946', // Red
  '#457B9D', // Steel Blue
  '#2A9D8F', // Teal
  '#E9C46A', // Yellow
  '#F4A261', // Orange
  '#9B5DE5', // Purple
  '#00BBF9', // Cyan
  '#00F5D4', // Mint
  '#FEE440', // Bright Yellow
  '#F15BB5', // Pink
] as const;

// =============================================================================
// Presence Manager
// =============================================================================

export class PresenceManager extends EventEmitter<PresenceManagerEvents> {
  private readonly options: Required<PresenceManagerOptions>;
  private readonly presenceMap = new Map<UserId, UserPresence>();
  private readonly userColors = new Map<UserId, string>();

  // Current user state
  private currentUserId: UserId | null = null;
  private currentDocumentId: DocumentId | null = null;
  private localPresence: UserPresence | null = null;

  // Throttling state
  private pendingCursorUpdate: CursorPosition | null = null;
  private pendingSelectionUpdate: readonly NodeId[] | null = null;
  private cursorThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private selectionThrottleTimer: ReturnType<typeof setTimeout> | null = null;

  // Activity tracking
  private _lastActivityTime = Date.now();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // Send callback
  private sendCallback: SendPresenceCallback | null = null;

  constructor(options: PresenceManagerOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Initialize presence for a user in a document
   */
  initialize(
    userId: UserId,
    documentId: DocumentId,
    sendCallback: SendPresenceCallback
  ): void {
    this.currentUserId = userId;
    this.currentDocumentId = documentId;
    this.sendCallback = sendCallback;

    // Initialize local presence
    this.localPresence = {
      userId,
      cursor: null,
      selection: [],
      viewportCenter: { x: 0, y: 0 },
      viewportZoom: 1,
      isActive: true,
      lastUpdate: Date.now(),
    };

    // Add self to presence map
    this.presenceMap.set(userId, this.localPresence);
    this.assignUserColor(userId);

    // Start cleanup interval
    this.startCleanupInterval();

    // Start idle detection
    this.resetIdleTimer();
  }

  /**
   * Clean up and stop presence tracking
   */
  destroy(): void {
    this.stopThrottleTimers();
    this.stopIdleTimer();
    this.stopCleanupInterval();
    this.presenceMap.clear();
    this.userColors.clear();
    this.currentUserId = null;
    this.currentDocumentId = null;
    this.localPresence = null;
    this.sendCallback = null;
  }

  /**
   * Get presence for a specific user
   */
  getPresence(userId: UserId): UserPresence | undefined {
    return this.presenceMap.get(userId);
  }

  /**
   * Get all active presences (excluding current user)
   */
  getOtherPresences(): UserPresence[] {
    const presences: UserPresence[] = [];
    for (const [userId, presence] of this.presenceMap) {
      if (userId !== this.currentUserId) {
        presences.push(presence);
      }
    }
    return presences;
  }

  /**
   * Get all presences including current user
   */
  getAllPresences(): UserPresence[] {
    return Array.from(this.presenceMap.values());
  }

  /**
   * Get the timestamp of the last user activity
   */
  getLastActivityTime(): number {
    return this._lastActivityTime;
  }

  /**
   * Get assigned color for a user
   */
  getUserColor(userId: UserId): string {
    return this.userColors.get(userId) ?? USER_COLORS[0];
  }

  /**
   * Update local cursor position
   */
  updateCursor(position: CursorPosition | null): void {
    if (!this.localPresence || !this.currentDocumentId) return;

    this.recordActivity();
    this.pendingCursorUpdate = position;

    // Throttle cursor updates
    if (!this.cursorThrottleTimer) {
      this.cursorThrottleTimer = setTimeout(() => {
        this.flushCursorUpdate();
        this.cursorThrottleTimer = null;
      }, this.options.cursorThrottleMs);
    }
  }

  /**
   * Update local selection
   */
  updateSelection(nodeIds: readonly NodeId[]): void {
    if (!this.localPresence || !this.currentDocumentId) return;

    this.recordActivity();
    this.pendingSelectionUpdate = nodeIds;

    // Throttle selection updates
    if (!this.selectionThrottleTimer) {
      this.selectionThrottleTimer = setTimeout(() => {
        this.flushSelectionUpdate();
        this.selectionThrottleTimer = null;
      }, this.options.selectionThrottleMs);
    }
  }

  /**
   * Update local viewport
   */
  updateViewport(center: Point, zoom: number): void {
    if (!this.localPresence || !this.currentDocumentId) return;

    this.recordActivity();

    this.localPresence = {
      ...this.localPresence,
      viewportCenter: center,
      viewportZoom: zoom,
      lastUpdate: Date.now(),
    };

    this.broadcastPresence();
  }

  /**
   * Handle incoming presence update from another user
   */
  handleRemotePresence(message: PresenceMessage): void {
    if (message.documentId !== this.currentDocumentId) return;

    const { presence } = message;
    if (presence.userId === this.currentUserId) return; // Ignore own echo

    // Assign color if new user
    if (!this.userColors.has(presence.userId)) {
      this.assignUserColor(presence.userId);
    }

    // Update presence map
    this.presenceMap.set(presence.userId, presence);

    // Check activity state change
    const wasActive = this.presenceMap.get(presence.userId)?.isActive ?? false;
    if (!wasActive && presence.isActive) {
      this.emit('user:active', { userId: presence.userId });
    } else if (wasActive && !presence.isActive) {
      this.emit('user:idle', { userId: presence.userId });
    }

    this.emit('presence:updated', { userId: presence.userId, presence });
  }

  /**
   * Remove a user's presence (when they leave)
   */
  removePresence(userId: UserId): void {
    if (this.presenceMap.has(userId)) {
      this.presenceMap.delete(userId);
      this.userColors.delete(userId);
      this.emit('presence:removed', { userId });
    }
  }

  // ===========================================================================
  // Private Methods - Updates
  // ===========================================================================

  private flushCursorUpdate(): void {
    if (!this.localPresence || this.pendingCursorUpdate === undefined) return;

    this.localPresence = {
      ...this.localPresence,
      cursor: this.pendingCursorUpdate,
      lastUpdate: Date.now(),
    };

    this.pendingCursorUpdate = null;
    this.broadcastPresence();
  }

  private flushSelectionUpdate(): void {
    if (!this.localPresence || this.pendingSelectionUpdate === null) return;

    this.localPresence = {
      ...this.localPresence,
      selection: this.pendingSelectionUpdate,
      lastUpdate: Date.now(),
    };

    this.pendingSelectionUpdate = null;
    this.broadcastPresence();
  }

  private broadcastPresence(): void {
    if (!this.localPresence || !this.currentDocumentId || !this.sendCallback) return;

    // Update local presence map
    this.presenceMap.set(this.currentUserId!, this.localPresence);

    // Send to server
    this.sendCallback({
      type: 'presence',
      documentId: this.currentDocumentId,
      presence: this.localPresence,
    });

    this.emit('presence:updated', {
      userId: this.currentUserId!,
      presence: this.localPresence,
    });
  }

  // ===========================================================================
  // Private Methods - Color Assignment
  // ===========================================================================

  private assignUserColor(userId: UserId): void {
    // Find unused color or cycle
    const usedColors = new Set(this.userColors.values());
    let color: string | undefined = USER_COLORS.find((c) => !usedColors.has(c));

    if (!color) {
      // All colors used, assign based on user count
      const index = this.userColors.size % USER_COLORS.length;
      color = USER_COLORS[index] ?? USER_COLORS[0];
    }

    this.userColors.set(userId, color);
  }

  // ===========================================================================
  // Private Methods - Activity & Idle Detection
  // ===========================================================================

  private recordActivity(): void {
    this._lastActivityTime = Date.now();

    // If was idle, mark as active
    if (this.localPresence && !this.localPresence.isActive) {
      this.localPresence = {
        ...this.localPresence,
        isActive: true,
        lastUpdate: Date.now(),
      };
      this.emit('user:active', { userId: this.currentUserId! });
      this.broadcastPresence();
    }

    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    this.stopIdleTimer();

    this.idleTimer = setTimeout(() => {
      this.markAsIdle();
    }, this.options.idleTimeoutMs);
  }

  private stopIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private markAsIdle(): void {
    if (!this.localPresence) return;

    this.localPresence = {
      ...this.localPresence,
      isActive: false,
      lastUpdate: Date.now(),
    };

    this.emit('user:idle', { userId: this.currentUserId! });
    this.broadcastPresence();
  }

  // ===========================================================================
  // Private Methods - Cleanup
  // ===========================================================================

  private startCleanupInterval(): void {
    this.stopCleanupInterval();

    this.cleanupTimer = setInterval(() => {
      this.cleanupStalePresences();
    }, this.options.cleanupIntervalMs);
  }

  private stopCleanupInterval(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private cleanupStalePresences(): void {
    const now = Date.now();
    const staleThreshold = this.options.idleTimeoutMs * 2; // 2x idle timeout

    for (const [userId, presence] of this.presenceMap) {
      if (userId === this.currentUserId) continue;

      if (now - presence.lastUpdate > staleThreshold) {
        this.removePresence(userId);
      }
    }
  }

  // ===========================================================================
  // Private Methods - Throttle Cleanup
  // ===========================================================================

  private stopThrottleTimers(): void {
    if (this.cursorThrottleTimer) {
      clearTimeout(this.cursorThrottleTimer);
      this.cursorThrottleTimer = null;
    }
    if (this.selectionThrottleTimer) {
      clearTimeout(this.selectionThrottleTimer);
      this.selectionThrottleTimer = null;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a presence manager instance
 */
export function createPresenceManager(
  options?: PresenceManagerOptions
): PresenceManager {
  return new PresenceManager(options);
}
