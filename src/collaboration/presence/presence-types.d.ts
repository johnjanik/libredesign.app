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
export declare function createDefaultPresence(clientId: string, userName: string, color: string): PresenceData;
/**
 * Generate a random user color.
 */
export declare function generateUserColor(): string;
/**
 * Check if presence data has expired.
 */
export declare function isPresenceExpired(presence: PresenceData, maxAge?: number): boolean;
//# sourceMappingURL=presence-types.d.ts.map