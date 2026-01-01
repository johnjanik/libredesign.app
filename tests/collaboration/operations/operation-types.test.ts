/**
 * Operation types tests
 */

import { describe, it, expect } from 'vitest';
import {
  compareTimestamps,
  createTimestamp,
  incrementTimestamp,
  mergeTimestamps,
  generateOperationId,
} from '@collaboration/operations/operation-types';

describe('LamportTimestamp', () => {
  describe('createTimestamp', () => {
    it('creates a timestamp with given counter and clientId', () => {
      const ts = createTimestamp(5, 'client-1');

      expect(ts.counter).toBe(5);
      expect(ts.clientId).toBe('client-1');
    });

    it('creates timestamps with zero counter', () => {
      const ts = createTimestamp(0, 'client-1');

      expect(ts.counter).toBe(0);
    });
  });

  describe('incrementTimestamp', () => {
    it('increments the counter by one', () => {
      const ts = createTimestamp(5, 'client-1');
      const incremented = incrementTimestamp(ts);

      expect(incremented.counter).toBe(6);
      expect(incremented.clientId).toBe('client-1');
    });

    it('does not mutate the original timestamp', () => {
      const ts = createTimestamp(5, 'client-1');
      incrementTimestamp(ts);

      expect(ts.counter).toBe(5);
    });
  });

  describe('mergeTimestamps', () => {
    it('takes max of both counters plus one', () => {
      const local = createTimestamp(5, 'local');
      const remote = createTimestamp(10, 'remote');

      const merged = mergeTimestamps(local, remote);

      expect(merged.counter).toBe(11); // max(5, 10) + 1
      expect(merged.clientId).toBe('local');
    });

    it('works when local is higher', () => {
      const local = createTimestamp(15, 'local');
      const remote = createTimestamp(10, 'remote');

      const merged = mergeTimestamps(local, remote);

      expect(merged.counter).toBe(16); // max(15, 10) + 1
    });

    it('preserves local clientId', () => {
      const local = createTimestamp(5, 'my-client');
      const remote = createTimestamp(10, 'their-client');

      const merged = mergeTimestamps(local, remote);

      expect(merged.clientId).toBe('my-client');
    });
  });

  describe('compareTimestamps', () => {
    it('returns negative when a < b by counter', () => {
      const a = createTimestamp(5, 'client-1');
      const b = createTimestamp(10, 'client-1');

      expect(compareTimestamps(a, b)).toBeLessThan(0);
    });

    it('returns positive when a > b by counter', () => {
      const a = createTimestamp(10, 'client-1');
      const b = createTimestamp(5, 'client-1');

      expect(compareTimestamps(a, b)).toBeGreaterThan(0);
    });

    it('uses clientId for tie-breaking when counters are equal', () => {
      const a = createTimestamp(5, 'aaa');
      const b = createTimestamp(5, 'bbb');

      expect(compareTimestamps(a, b)).toBeLessThan(0);
      expect(compareTimestamps(b, a)).toBeGreaterThan(0);
    });

    it('returns 0 when timestamps are equal', () => {
      const a = createTimestamp(5, 'client-1');
      const b = createTimestamp(5, 'client-1');

      expect(compareTimestamps(a, b)).toBe(0);
    });
  });
});

describe('generateOperationId', () => {
  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateOperationId('client-1'));
    }

    expect(ids.size).toBe(100);
  });

  it('includes clientId in the ID', () => {
    const id = generateOperationId('my-client');

    expect(id).toContain('my-client');
  });

  it('generates string IDs', () => {
    const id = generateOperationId('client-1');

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});
