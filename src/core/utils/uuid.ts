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
export function generateUUID(): string {
  const timestamp = Date.now();
  const random = crypto.getRandomValues(new Uint8Array(10));

  // Timestamp bytes (big-endian, 48 bits = 6 bytes)
  const timestampHex =
    timestamp.toString(16).padStart(12, '0').slice(-12);

  // Random bytes
  const r0 = random[0]!;
  const r1 = random[1]!;
  const r2 = random[2]!;
  const r3 = random[3]!;
  const r4 = random[4]!;
  const r5 = random[5]!;
  const r6 = random[6]!;
  const r7 = random[7]!;
  const r8 = random[8]!;
  const r9 = random[9]!;

  // Build UUID parts
  // xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
  const part1 = timestampHex.slice(0, 8);
  const part2 = timestampHex.slice(8, 12);
  const part3 =
    '7' +
    ((r0 & 0x0f) << 8 | r1).toString(16).padStart(3, '0');
  const part4 =
    (0x80 | (r2 & 0x3f)).toString(16).padStart(2, '0') +
    r3.toString(16).padStart(2, '0');
  const part5 =
    r4.toString(16).padStart(2, '0') +
    r5.toString(16).padStart(2, '0') +
    r6.toString(16).padStart(2, '0') +
    r7.toString(16).padStart(2, '0') +
    r8.toString(16).padStart(2, '0') +
    r9.toString(16).padStart(2, '0');

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

/** Generate a NodeId */
export function generateNodeId(): NodeId {
  return generateUUID() as NodeId;
}

/** Generate an OperationId with Lamport timestamp */
export function generateOperationId(
  lamportTimestamp: number,
  clientId: string
): OperationId {
  // Format: timestamp_clientId_uuid
  const uuid = generateUUID();
  return `${lamportTimestamp}_${clientId}_${uuid}` as OperationId;
}

/** Extract timestamp from a UUID v7 (in milliseconds) */
export function getTimestampFromUUID(uuid: string): number {
  // Remove hyphens and get first 12 hex chars (48 bits)
  const hex = uuid.replace(/-/g, '').slice(0, 12);
  return parseInt(hex, 16);
}

/** Extract timestamp from an OperationId */
export function getLamportTimestamp(opId: OperationId): number {
  const parts = opId.split('_');
  return parseInt(parts[0]!, 10);
}

/** Extract client ID from an OperationId */
export function getClientId(opId: OperationId): string {
  const parts = opId.split('_');
  return parts[1]!;
}

/** Validate UUID format */
export function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/** Compare two UUIDs for sorting (lexicographic, works for v7 time ordering) */
export function compareUUIDs(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Generate a short random ID (for local-only use) */
export function generateShortId(): string {
  const random = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(random)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
