/**
 * Presence Types
 *
 * Defines presence data for showing remote users' cursors and selections.
 */
/**
 * Create default presence data.
 */
export function createDefaultPresence(clientId, userName, color) {
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
export function generateUserColor() {
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
    return colors[Math.floor(Math.random() * colors.length)];
}
/**
 * Check if presence data has expired.
 */
export function isPresenceExpired(presence, maxAge = 30000) {
    return Date.now() - presence.lastSeen > maxAge;
}
//# sourceMappingURL=presence-types.js.map