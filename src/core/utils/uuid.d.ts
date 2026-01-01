/**
 * UUID v7 generation for DesignLibre
 *
 * UUID v7 provides:
 * - Time-ordered IDs (sortable by creation time)
 * - Globally unique without coordination
 * - 48-bit Unix timestamp (ms precision)
 * - 74 bits of randomness
 */
import type { NodeId, OperationId } from '../types/common';
/**
 * Generate a UUID v7.
 *
 * Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
 * Where:
 * - First 48 bits: Unix timestamp in milliseconds
 * - Version nibble: 7
 * - Next 12 bits: Random
 * - Variant bits: 10xx
 * - Remaining 62 bits: Random
 */
export declare function generateUUID(): string;
/** Generate a NodeId */
export declare function generateNodeId(): NodeId;
/** Generate an OperationId with Lamport timestamp */
export declare function generateOperationId(lamportTimestamp: number, clientId: string): OperationId;
/** Extract timestamp from a UUID v7 (in milliseconds) */
export declare function getTimestampFromUUID(uuid: string): number;
/** Extract timestamp from an OperationId */
export declare function getLamportTimestamp(opId: OperationId): number;
/** Extract client ID from an OperationId */
export declare function getClientId(opId: OperationId): string;
/** Validate UUID format */
export declare function isValidUUID(str: string): boolean;
/** Compare two UUIDs for sorting (lexicographic, works for v7 time ordering) */
export declare function compareUUIDs(a: string, b: string): number;
/** Generate a short random ID (for local-only use) */
export declare function generateShortId(): string;
//# sourceMappingURL=uuid.d.ts.map