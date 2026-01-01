/**
 * Fractional indexing for conflict-free child ordering.
 *
 * Fractional indices allow inserting between any two items without
 * requiring reindexing of other items. This is crucial for CRDT-based
 * collaboration where concurrent insertions must not conflict.
 *
 * Uses a string representation where characters represent positions.
 * Example sequence: 'a', 'n', 'z'
 * Insert between 'a' and 'n': 'a' < 'h' < 'n'
 */
import type { Branded } from '@core/types/common';
/** Fractional index type */
export type FractionalIndex = Branded<string, 'FractionalIndex'>;
/**
 * Generate the first fractional index (for inserting at start of empty list)
 */
export declare function generateFirstIndex(): FractionalIndex;
/**
 * Generate an index before all existing indices.
 * If `first` is the smallest existing index, generates something smaller.
 */
export declare function generateIndexBefore(first: FractionalIndex): FractionalIndex;
/**
 * Generate an index after all existing indices.
 * If `last` is the largest existing index, generates something larger.
 */
export declare function generateIndexAfter(last: FractionalIndex): FractionalIndex;
/**
 * Generate an index between two existing indices.
 * Guarantees: before < result < after
 */
export declare function generateIndexBetween(before: FractionalIndex, after: FractionalIndex): FractionalIndex;
/**
 * Generate an index at a specific position in a sorted list.
 *
 * @param sortedIndices - Existing indices in sorted order
 * @param position - Position to insert at (0 = before first, length = after last)
 */
export declare function generateIndexAtPosition(sortedIndices: readonly FractionalIndex[], position: number): FractionalIndex;
/**
 * Compare two fractional indices.
 * Returns negative if a < b, positive if a > b, zero if equal.
 */
export declare function compareFractionalIndices(a: FractionalIndex, b: FractionalIndex): number;
/**
 * Sort an array of items by their fractional indices.
 */
export declare function sortByFractionalIndex<T>(items: readonly T[], getIndex: (item: T) => FractionalIndex): T[];
/**
 * Validate that a fractional index is well-formed.
 */
export declare function isValidFractionalIndex(index: string): index is FractionalIndex;
/**
 * Generate N evenly spaced indices.
 * Useful for initial population of a list.
 */
export declare function generateEvenlySpacedIndices(count: number): FractionalIndex[];
//# sourceMappingURL=fractional-index.d.ts.map