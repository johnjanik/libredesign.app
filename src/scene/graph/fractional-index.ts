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

/** Minimum character for index */
const MIN_CHAR = 'A';
/** Maximum character for index */
const MAX_CHAR = 'z';
/** Middle character for initial index */
const MID_CHAR = 'a';

/** Character code bounds */
const MIN_CODE = MIN_CHAR.charCodeAt(0);
const MAX_CODE = MAX_CHAR.charCodeAt(0);

/**
 * Generate the first fractional index (for inserting at start of empty list)
 */
export function generateFirstIndex(): FractionalIndex {
  return MID_CHAR as FractionalIndex;
}

/**
 * Generate an index before all existing indices.
 * If `first` is the smallest existing index, generates something smaller.
 */
export function generateIndexBefore(first: FractionalIndex): FractionalIndex {
  const firstCode = first.charCodeAt(0);

  // If first char is not at min, use a char before it
  if (firstCode > MIN_CODE) {
    const midCode = Math.floor((MIN_CODE + firstCode) / 2);
    return String.fromCharCode(midCode) as FractionalIndex;
  }

  // Otherwise, append a middle character
  return (first + MID_CHAR) as FractionalIndex;
}

/**
 * Generate an index after all existing indices.
 * If `last` is the largest existing index, generates something larger.
 */
export function generateIndexAfter(last: FractionalIndex): FractionalIndex {
  const lastCode = last.charCodeAt(0);

  // If last char is not at max, use a char after it
  if (lastCode < MAX_CODE) {
    const midCode = Math.ceil((lastCode + MAX_CODE) / 2);
    return String.fromCharCode(midCode) as FractionalIndex;
  }

  // Otherwise, append a middle character
  return (last + MID_CHAR) as FractionalIndex;
}

/**
 * Generate an index between two existing indices.
 * Guarantees: before < result < after
 */
export function generateIndexBetween(
  before: FractionalIndex,
  after: FractionalIndex
): FractionalIndex {
  // Validate ordering
  if (before >= after) {
    throw new Error(
      `Invalid index ordering: before "${before}" must be less than after "${after}"`
    );
  }

  // Find the common prefix length
  let commonLength = 0;
  while (
    commonLength < before.length &&
    commonLength < after.length &&
    before[commonLength] === after[commonLength]
  ) {
    commonLength++;
  }

  // Get the characters at the divergence point
  const beforeCode =
    commonLength < before.length
      ? before.charCodeAt(commonLength)
      : MIN_CODE;
  const afterCode =
    commonLength < after.length
      ? after.charCodeAt(commonLength)
      : MAX_CODE;

  // If there's room between the characters, use the midpoint
  if (afterCode - beforeCode > 1) {
    const midCode = Math.floor((beforeCode + afterCode) / 2);
    return (
      before.slice(0, commonLength) + String.fromCharCode(midCode)
    ) as FractionalIndex;
  }

  // No room at this level, need to go deeper
  // Use the before string + a middle character
  const prefix = before.slice(0, commonLength + 1);
  const suffixStart =
    commonLength + 1 < before.length
      ? before.charCodeAt(commonLength + 1)
      : MIN_CODE;
  const midSuffix = Math.floor((suffixStart + MAX_CODE) / 2);

  return (prefix + String.fromCharCode(midSuffix)) as FractionalIndex;
}

/**
 * Generate an index at a specific position in a sorted list.
 *
 * @param sortedIndices - Existing indices in sorted order
 * @param position - Position to insert at (0 = before first, length = after last)
 */
export function generateIndexAtPosition(
  sortedIndices: readonly FractionalIndex[],
  position: number
): FractionalIndex {
  if (sortedIndices.length === 0) {
    return generateFirstIndex();
  }

  if (position <= 0) {
    return generateIndexBefore(sortedIndices[0]!);
  }

  if (position >= sortedIndices.length) {
    return generateIndexAfter(sortedIndices[sortedIndices.length - 1]!);
  }

  return generateIndexBetween(
    sortedIndices[position - 1]!,
    sortedIndices[position]!
  );
}

/**
 * Compare two fractional indices.
 * Returns negative if a < b, positive if a > b, zero if equal.
 */
export function compareFractionalIndices(
  a: FractionalIndex,
  b: FractionalIndex
): number {
  return a.localeCompare(b);
}

/**
 * Sort an array of items by their fractional indices.
 */
export function sortByFractionalIndex<T>(
  items: readonly T[],
  getIndex: (item: T) => FractionalIndex
): T[] {
  return [...items].sort((a, b) =>
    compareFractionalIndices(getIndex(a), getIndex(b))
  );
}

/**
 * Validate that a fractional index is well-formed.
 */
export function isValidFractionalIndex(index: string): index is FractionalIndex {
  if (index.length === 0) return false;

  for (let i = 0; i < index.length; i++) {
    const code = index.charCodeAt(i);
    if (code < MIN_CODE || code > MAX_CODE) return false;
  }

  return true;
}

/**
 * Generate N evenly spaced indices.
 * Useful for initial population of a list.
 */
export function generateEvenlySpacedIndices(count: number): FractionalIndex[] {
  if (count === 0) return [];
  if (count === 1) return [generateFirstIndex()];

  const indices: FractionalIndex[] = [];
  const step = (MAX_CODE - MIN_CODE) / (count + 1);

  for (let i = 1; i <= count; i++) {
    const code = Math.floor(MIN_CODE + step * i);
    indices.push(String.fromCharCode(code) as FractionalIndex);
  }

  return indices;
}
