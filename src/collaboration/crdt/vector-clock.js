/**
 * Vector Clock
 *
 * Tracks causality between operations from multiple clients.
 * Used for detecting concurrent operations and ensuring consistency.
 */
/**
 * Vector clock for tracking causality
 */
export class VectorClock {
    clock = new Map();
    /**
     * Get the counter for a client.
     */
    get(clientId) {
        return this.clock.get(clientId) ?? 0;
    }
    /**
     * Increment the counter for a client.
     */
    increment(clientId) {
        const current = this.get(clientId);
        const next = current + 1;
        this.clock.set(clientId, next);
        return next;
    }
    /**
     * Set the counter for a client (for merging).
     */
    set(clientId, counter) {
        this.clock.set(clientId, counter);
    }
    /**
     * Merge with another vector clock.
     * Takes the maximum of each counter.
     */
    merge(other) {
        for (const [clientId, counter] of other.clock) {
            const current = this.get(clientId);
            if (counter > current) {
                this.clock.set(clientId, counter);
            }
        }
    }
    /**
     * Check if this clock happened before another.
     * Returns true if all counters in this clock are <= the other clock,
     * and at least one is strictly less.
     */
    happenedBefore(other) {
        let hasLess = false;
        for (const [clientId, counter] of this.clock) {
            const otherCounter = other.get(clientId);
            if (counter > otherCounter) {
                return false;
            }
            if (counter < otherCounter) {
                hasLess = true;
            }
        }
        // Check if other has clients we don't have
        for (const clientId of other.clock.keys()) {
            if (!this.clock.has(clientId)) {
                hasLess = true;
                break;
            }
        }
        return hasLess;
    }
    /**
     * Check if this clock is concurrent with another.
     * Two clocks are concurrent if neither happened before the other.
     */
    isConcurrent(other) {
        return !this.happenedBefore(other) && !other.happenedBefore(this);
    }
    /**
     * Check if this clock equals another.
     */
    equals(other) {
        if (this.clock.size !== other.clock.size) {
            return false;
        }
        for (const [clientId, counter] of this.clock) {
            if (other.get(clientId) !== counter) {
                return false;
            }
        }
        return true;
    }
    /**
     * Get all client IDs in this clock.
     */
    getClientIds() {
        return Array.from(this.clock.keys());
    }
    /**
     * Get the state of the clock.
     */
    getState() {
        return new Map(this.clock);
    }
    /**
     * Clone this clock.
     */
    clone() {
        const cloned = new VectorClock();
        for (const [clientId, counter] of this.clock) {
            cloned.set(clientId, counter);
        }
        return cloned;
    }
    /**
     * Clear the clock.
     */
    clear() {
        this.clock.clear();
    }
    /**
     * Export as JSON.
     */
    toJSON() {
        return Object.fromEntries(this.clock);
    }
    /**
     * Import from JSON.
     */
    fromJSON(data) {
        this.clock.clear();
        for (const [clientId, counter] of Object.entries(data)) {
            this.clock.set(clientId, counter);
        }
    }
    /**
     * Create from state.
     */
    static fromState(state) {
        const clock = new VectorClock();
        for (const [clientId, counter] of state) {
            clock.set(clientId, counter);
        }
        return clock;
    }
}
/**
 * Create a new vector clock.
 */
export function createVectorClock() {
    return new VectorClock();
}
//# sourceMappingURL=vector-clock.js.map