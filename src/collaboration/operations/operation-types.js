/**
 * Operation Types
 *
 * Defines the operations that can be performed on the document.
 * Operations are the unit of change for CRDT synchronization.
 */
/**
 * Compare Lamport timestamps.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareTimestamps(a, b) {
    if (a.counter !== b.counter) {
        return a.counter - b.counter;
    }
    return a.clientId.localeCompare(b.clientId);
}
/**
 * Create a new Lamport timestamp.
 */
export function createTimestamp(counter, clientId) {
    return { counter, clientId };
}
/**
 * Increment a Lamport timestamp.
 */
export function incrementTimestamp(ts) {
    return { counter: ts.counter + 1, clientId: ts.clientId };
}
/**
 * Merge timestamps (for receiving remote operations).
 */
export function mergeTimestamps(local, remote) {
    return {
        counter: Math.max(local.counter, remote.counter) + 1,
        clientId: local.clientId,
    };
}
/**
 * Generate a unique operation ID.
 */
export function generateOperationId(clientId) {
    return `${clientId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
//# sourceMappingURL=operation-types.js.map