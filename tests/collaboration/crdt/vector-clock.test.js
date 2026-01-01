/**
 * Vector clock tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { VectorClock, createVectorClock } from '@collaboration/crdt/vector-clock';
describe('VectorClock', () => {
    let clock;
    beforeEach(() => {
        clock = createVectorClock();
    });
    describe('get', () => {
        it('returns 0 for unknown client', () => {
            expect(clock.get('unknown')).toBe(0);
        });
        it('returns stored counter for known client', () => {
            clock.set('client-1', 5);
            expect(clock.get('client-1')).toBe(5);
        });
    });
    describe('set', () => {
        it('stores counter for a client', () => {
            clock.set('client-1', 10);
            expect(clock.get('client-1')).toBe(10);
        });
        it('overwrites previous value', () => {
            clock.set('client-1', 5);
            clock.set('client-1', 15);
            expect(clock.get('client-1')).toBe(15);
        });
    });
    describe('increment', () => {
        it('increments counter for a client', () => {
            clock.set('client-1', 5);
            const newValue = clock.increment('client-1');
            expect(newValue).toBe(6);
            expect(clock.get('client-1')).toBe(6);
        });
        it('starts from 0 for new client', () => {
            const newValue = clock.increment('new-client');
            expect(newValue).toBe(1);
        });
        it('returns the new counter value', () => {
            clock.increment('client-1');
            const second = clock.increment('client-1');
            const third = clock.increment('client-1');
            expect(second).toBe(2);
            expect(third).toBe(3);
        });
    });
    describe('merge', () => {
        it('takes maximum of each counter', () => {
            clock.set('client-1', 5);
            clock.set('client-2', 10);
            const other = createVectorClock();
            other.set('client-1', 8);
            other.set('client-2', 3);
            clock.merge(other);
            expect(clock.get('client-1')).toBe(8); // max(5, 8)
            expect(clock.get('client-2')).toBe(10); // max(10, 3)
        });
        it('adds new clients from other clock', () => {
            clock.set('client-1', 5);
            const other = createVectorClock();
            other.set('client-2', 10);
            clock.merge(other);
            expect(clock.get('client-1')).toBe(5);
            expect(clock.get('client-2')).toBe(10);
        });
        it('does not modify the other clock', () => {
            clock.set('client-1', 10);
            const other = createVectorClock();
            other.set('client-1', 5);
            clock.merge(other);
            expect(other.get('client-1')).toBe(5);
        });
    });
    describe('happenedBefore', () => {
        it('returns true when this clock is strictly before other', () => {
            clock.set('client-1', 5);
            const other = createVectorClock();
            other.set('client-1', 10);
            expect(clock.happenedBefore(other)).toBe(true);
        });
        it('returns false when this clock is after other', () => {
            clock.set('client-1', 10);
            const other = createVectorClock();
            other.set('client-1', 5);
            expect(clock.happenedBefore(other)).toBe(false);
        });
        it('returns false for concurrent clocks', () => {
            clock.set('client-1', 5);
            clock.set('client-2', 10);
            const other = createVectorClock();
            other.set('client-1', 10);
            other.set('client-2', 5);
            expect(clock.happenedBefore(other)).toBe(false);
            expect(other.happenedBefore(clock)).toBe(false);
        });
        it('returns false for equal clocks', () => {
            clock.set('client-1', 5);
            const other = createVectorClock();
            other.set('client-1', 5);
            expect(clock.happenedBefore(other)).toBe(false);
        });
        it('considers new clients in other clock', () => {
            clock.set('client-1', 5);
            const other = createVectorClock();
            other.set('client-1', 5);
            other.set('client-2', 1);
            expect(clock.happenedBefore(other)).toBe(true);
        });
    });
    describe('isConcurrent', () => {
        it('returns true for concurrent clocks', () => {
            clock.set('client-1', 5);
            clock.set('client-2', 10);
            const other = createVectorClock();
            other.set('client-1', 10);
            other.set('client-2', 5);
            expect(clock.isConcurrent(other)).toBe(true);
        });
        it('returns false when one happened before the other', () => {
            clock.set('client-1', 5);
            const other = createVectorClock();
            other.set('client-1', 10);
            expect(clock.isConcurrent(other)).toBe(false);
        });
        it('returns true for equal clocks (neither happened before the other)', () => {
            clock.set('client-1', 5);
            const other = createVectorClock();
            other.set('client-1', 5);
            // Equal clocks are considered concurrent since neither happened before the other
            expect(clock.isConcurrent(other)).toBe(true);
        });
    });
    describe('equals', () => {
        it('returns true for equal clocks', () => {
            clock.set('client-1', 5);
            clock.set('client-2', 10);
            const other = createVectorClock();
            other.set('client-1', 5);
            other.set('client-2', 10);
            expect(clock.equals(other)).toBe(true);
        });
        it('returns false for different counters', () => {
            clock.set('client-1', 5);
            const other = createVectorClock();
            other.set('client-1', 6);
            expect(clock.equals(other)).toBe(false);
        });
        it('returns false for different clients', () => {
            clock.set('client-1', 5);
            const other = createVectorClock();
            other.set('client-2', 5);
            expect(clock.equals(other)).toBe(false);
        });
        it('returns false for different number of clients', () => {
            clock.set('client-1', 5);
            clock.set('client-2', 10);
            const other = createVectorClock();
            other.set('client-1', 5);
            expect(clock.equals(other)).toBe(false);
        });
    });
    describe('getClientIds', () => {
        it('returns all client IDs', () => {
            clock.set('client-1', 5);
            clock.set('client-2', 10);
            clock.set('client-3', 15);
            const ids = clock.getClientIds();
            expect(ids).toContain('client-1');
            expect(ids).toContain('client-2');
            expect(ids).toContain('client-3');
            expect(ids.length).toBe(3);
        });
        it('returns empty array for empty clock', () => {
            expect(clock.getClientIds()).toEqual([]);
        });
    });
    describe('getState', () => {
        it('returns a Map of all counters', () => {
            clock.set('client-1', 5);
            clock.set('client-2', 10);
            const state = clock.getState();
            expect(state.get('client-1')).toBe(5);
            expect(state.get('client-2')).toBe(10);
        });
        it('returns a copy (not affected by changes)', () => {
            clock.set('client-1', 5);
            const state = clock.getState();
            clock.set('client-1', 100);
            expect(state.get('client-1')).toBe(5);
        });
    });
    describe('clone', () => {
        it('creates an independent copy', () => {
            clock.set('client-1', 5);
            clock.set('client-2', 10);
            const cloned = clock.clone();
            expect(cloned.get('client-1')).toBe(5);
            expect(cloned.get('client-2')).toBe(10);
            // Modify original
            clock.set('client-1', 100);
            // Clone should be unaffected
            expect(cloned.get('client-1')).toBe(5);
        });
    });
    describe('clear', () => {
        it('removes all entries', () => {
            clock.set('client-1', 5);
            clock.set('client-2', 10);
            clock.clear();
            expect(clock.get('client-1')).toBe(0);
            expect(clock.get('client-2')).toBe(0);
            expect(clock.getClientIds()).toEqual([]);
        });
    });
    describe('toJSON and fromJSON', () => {
        it('serializes and deserializes correctly', () => {
            clock.set('client-1', 5);
            clock.set('client-2', 10);
            const json = clock.toJSON();
            const newClock = createVectorClock();
            newClock.fromJSON(json);
            expect(newClock.get('client-1')).toBe(5);
            expect(newClock.get('client-2')).toBe(10);
        });
        it('toJSON returns a plain object', () => {
            clock.set('client-1', 5);
            const json = clock.toJSON();
            expect(typeof json).toBe('object');
            expect(json['client-1']).toBe(5);
        });
    });
    describe('fromState', () => {
        it('creates clock from state map', () => {
            const state = new Map();
            state.set('client-1', 5);
            state.set('client-2', 10);
            const clock = VectorClock.fromState(state);
            expect(clock.get('client-1')).toBe(5);
            expect(clock.get('client-2')).toBe(10);
        });
    });
});
//# sourceMappingURL=vector-clock.test.js.map