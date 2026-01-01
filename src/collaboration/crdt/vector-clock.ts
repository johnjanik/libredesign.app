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
export class VectorClock {
  private clock: Map<string, number> = new Map();

  /**
   * Get the counter for a client.
   */
  get(clientId: string): number {
    return this.clock.get(clientId) ?? 0;
  }

  /**
   * Increment the counter for a client.
   */
  increment(clientId: string): number {
    const current = this.get(clientId);
    const next = current + 1;
    this.clock.set(clientId, next);
    return next;
  }

  /**
   * Set the counter for a client (for merging).
   */
  set(clientId: string, counter: number): void {
    this.clock.set(clientId, counter);
  }

  /**
   * Merge with another vector clock.
   * Takes the maximum of each counter.
   */
  merge(other: VectorClock): void {
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
  happenedBefore(other: VectorClock): boolean {
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
  isConcurrent(other: VectorClock): boolean {
    return !this.happenedBefore(other) && !other.happenedBefore(this);
  }

  /**
   * Check if this clock equals another.
   */
  equals(other: VectorClock): boolean {
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
  getClientIds(): string[] {
    return Array.from(this.clock.keys());
  }

  /**
   * Get the state of the clock.
   */
  getState(): VectorClockState {
    return new Map(this.clock);
  }

  /**
   * Clone this clock.
   */
  clone(): VectorClock {
    const cloned = new VectorClock();
    for (const [clientId, counter] of this.clock) {
      cloned.set(clientId, counter);
    }
    return cloned;
  }

  /**
   * Clear the clock.
   */
  clear(): void {
    this.clock.clear();
  }

  /**
   * Export as JSON.
   */
  toJSON(): Record<string, number> {
    return Object.fromEntries(this.clock);
  }

  /**
   * Import from JSON.
   */
  fromJSON(data: Record<string, number>): void {
    this.clock.clear();
    for (const [clientId, counter] of Object.entries(data)) {
      this.clock.set(clientId, counter);
    }
  }

  /**
   * Create from state.
   */
  static fromState(state: VectorClockState): VectorClock {
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
export function createVectorClock(): VectorClock {
  return new VectorClock();
}
