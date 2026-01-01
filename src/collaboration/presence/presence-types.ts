/**
 * Presence Types
 *
 * Defines presence data for showing remote users' cursors and selections.
 */

import type { NodeId } from '@core/types/common';

/**
 * Cursor position in world coordinates
 */
export interface CursorPosition {
  readonly x: number;
  readonly y: number;
}

/**
 * Presence data for a client
 */
export interface PresenceData {
  /** Client ID */
  readonly clientId: string;
  /** User display name */
  readonly userName: string;
  /** User color (hex string) */
  readonly color: string;
  /** Cursor position (null if not in document) */
  readonly cursor: CursorPosition | null;
  /** Selected node IDs */
  readonly selection: readonly NodeId[];
  /** Currently active tool */
  readonly activeTool: string;
  /** Current viewport center */
  readonly viewportCenter: CursorPosition | null;
  /** Current viewport zoom level */
  readonly viewportZoom: number;
  /** Last activity timestamp */
  readonly lastSeen: number;
  /** Is user currently focused on document */
  readonly isActive: boolean;
}

/**
 * Create default presence data.
 */
export function createDefaultPresence(
  clientId: string,
  userName: string,
  color: string
): PresenceData {
  return {
    clientId,
    userName,
    color,
    cursor: null,
    selection: [],
    activeTool: 'select',
    viewportCenter: null,
    viewportZoom: 1,
    lastSeen: Date.now(),
    isActive: true,
  };
}

/**
 * Generate a random user color.
 */
export function generateUserColor(): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
    '#BB8FCE', // Purple
    '#85C1E9', // Light Blue
  ];
  return colors[Math.floor(Math.random() * colors.length)]!;
}

/**
 * Check if presence data has expired.
 */
export function isPresenceExpired(presence: PresenceData, maxAge: number = 30000): boolean {
  return Date.now() - presence.lastSeen > maxAge;
}
