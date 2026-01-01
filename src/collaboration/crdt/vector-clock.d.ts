/**
 * Vector Clock
 *
 * Tracks causality between operations from multiple clients.
 * Used for detecting concurrent operations and ensuring consistency.
 */
/**
 * Vector clock state
 */
export type VectorClockState = ReadonlyMap<string, number>;
/**
 * Vector clock for tracking causality
 */
export declare class VectorClock {
    private clock;
    /**
     * Get the counter for a client.
     */
    get(clientId: string): number;
    /**
     * Increment the counter for a client.
     */
    increment(clientId: string): number;
    /**
     * Set the counter for a client (for merging).
     */
    set(clientId: string, counter: number): void;
    /**
     * Merge with another vector clock.
     * Takes the maximum of each counter.
     */
    merge(other: VectorClock): void;
    /**
     * Check if this clock happened before another.
     * Returns true if all counters in this clock are <= the other clock,
     * and at least one is strictly less.
     */
    happenedBefore(other: VectorClock): boolean;
    /**
     * Check if this clock is concurrent with another.
     * Two clocks are concurrent if neither happened before the other.
     */
    isConcurrent(other: VectorClock): boolean;
    /**
     * Check if this clock equals another.
     */
    equals(other: VectorClock): boolean;
    /**
     * Get all client IDs in this clock.
     */
    getClientIds(): string[];
    /**
     * Get the state of the clock.
     */
    getState(): VectorClockState;
    /**
     * Clone this clock.
     */
    clone(): VectorClock;
    /**
     * Clear the clock.
     */
    clear(): void;
    /**
     * Export as JSON.
     */
    toJSON(): Record<string, number>;
    /**
     * Import from JSON.
     */
    fromJSON(data: Record<string, number>): void;
    /**
     * Create from state.
     */
    static fromState(state: VectorClockState): VectorClock;
}
/**
 * Create a new vector clock.
 */
export declare function createVectorClock(): VectorClock;
//# sourceMappingURL=vector-clock.d.ts.map