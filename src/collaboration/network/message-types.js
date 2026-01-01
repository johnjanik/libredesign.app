/**
 * Message Types
 *
 * Defines the WebSocket protocol messages for synchronization.
 */
/**
 * Serialize a message to JSON.
 */
export function serializeMessage(message) {
    return JSON.stringify(message);
}
/**
 * Deserialize a message from JSON.
 */
export function deserializeMessage(data) {
    return JSON.parse(data);
}
/**
 * Create a HELLO message.
 */
export function createHelloMessage(clientId, documentId, userName, version = '1.0.0') {
    return {
        type: 'HELLO',
        clientId,
        documentId,
        userName,
        version,
    };
}
/**
 * Create an OPERATION message.
 */
export function createOperationMessage(operation) {
    return {
        type: 'OPERATION',
        operation,
    };
}
/**
 * Create a PRESENCE message.
 */
export function createPresenceMessage(clientId, presence) {
    return {
        type: 'PRESENCE',
        clientId,
        presence,
    };
}
/**
 * Create a SYNC_REQUEST message.
 */
export function createSyncRequestMessage(since) {
    return {
        type: 'SYNC_REQUEST',
        since,
    };
}
/**
 * Create an ERROR message.
 */
export function createErrorMessage(code, message, details) {
    return {
        type: 'ERROR',
        code,
        message,
        details,
    };
}
//# sourceMappingURL=message-types.js.map